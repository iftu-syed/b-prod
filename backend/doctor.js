// backend/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const { MongoClient } = require('mongodb');
const fs = require('fs');
const csv = require('csv-parser');
const router = express.Router();


// Main DB
const client = new MongoClient(process.env.DATA_ENTRY_MONGO_URL);
let db, patientDataCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('Data_Entry_Incoming');
        patientDataCollection = db.collection('patient_data');
        console.log('Connected to MongoDB successfully! for SurveyData pull');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}
connectDB();

// Doctor DB
const client3 = new MongoClient(process.env.MANAGE_DOCTORS_MONGO_URL);
let db3;

async function connectDB3() {
    try {
        await client3.connect();
        db3 = client3.db('manage_doctors');
        doctorsCollection = db3.collection('doctors');
        console.log('Connected to manage_doctors database');
    } catch (error) {
        console.error('Failed to connect to manage_doctors database', error);
    }
}
connectDB3();

const surveyRanges = {}; // e.g. { "Global-Health Physical": { min: 16, max: 68 } }

// CSV loader
function loadSeverityLevels() {
  const filePath = path.join(__dirname, './SeverityLevels.csv');
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const scale = row['Scale'];
      const min = parseFloat(row['Chart_Range_Min']);
      const max = parseFloat(row['Chart_Range_Max']);
      if (scale && !isNaN(min) && !isNaN(max)) {
        surveyRanges[scale] = { min, max };
      }
    })
    .on('end', () => {
      console.log('Loaded SeverityLevels:', surveyRanges);
    });
}

function getSurveyRange(surveyName) {
  return surveyRanges[surveyName] || { min: null, max: null };
}

// Load CSV at server start
loadSeverityLevels();

const doctorIdCache = new Map();   // { rawValue -> resolvedId|null }

async function resolveDoctorId(raw) {
  if (!raw || raw === 'all') return null;

  if (doctorIdCache.has(raw)) return doctorIdCache.get(raw);

  // 1️⃣  Is it already a real doctor_id?
  const direct = await doctorsCollection.findOne(
    { doctor_id: raw },
    { projection: { _id: 0, doctor_id: 1 } }
  );
  if (direct) {
    doctorIdCache.set(raw, raw);
    return raw;
  }

  // 2️⃣  Otherwise look by hashedusername
  const byHash = await doctorsCollection.findOne(
    { hashedusername: raw },
    { projection: { _id: 0, doctor_id: 1 } }
  );

  const resolved = byHash ? byHash.doctor_id : null;
  doctorIdCache.set(raw, resolved);   // cache even null → avoids repeat queries
  return resolved;
}


router.get('/registered-patients', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    console.log("doctor_id",doctor_id);
    const filter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) filter.hospital_code = hospital_code;
    if (site_code) filter.site_code = site_code;

    // ✅ Correctly filter inside 'specialities' array
    if (speciality || (doctor_id && doctor_id !== 'all')) {
      filter.specialities = { $elemMatch: {} };
      if (speciality) {
        filter.specialities.$elemMatch.name = speciality;
      }
      if (doctor_id && doctor_id !== 'all') {
        filter.specialities.$elemMatch.doctor_ids = doctor_id;
      }
    }

    const result = await patientDataCollection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          uniquePatients: { $addToSet: "$Mr_no" }
        }
      },
      {
        $project: {
          _id: 0,
          mrNumbers: "$uniquePatients"
        }
      }
    ]).toArray();

    const mrNumbers = result[0]?.mrNumbers || [];

    res.json({ totalRegisteredPatients: mrNumbers.length });

  } catch (error) {
    console.error('❌ Error fetching registered patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/surveys-sent', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);

    const filter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) filter.hospital_code = hospital_code;
    if (site_code) filter.site_code = site_code;
    if (speciality) filter.speciality = speciality;

    if (doctor_id && doctor_id !== 'all') {
      filter['specialities.doctor_ids'] = doctor_id;
    }

    const result = await patientDataCollection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          uniquePatients: { $addToSet: "$Mr_no" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRegisteredPatients: { $size: "$uniquePatients" }
        }
      }
    ]).toArray();

    res.json(result[0] || { totalRegisteredPatients: 0 });

  } catch (error) {
    console.error('Error fetching registered patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/surveys-completed', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);

    /** same outer-patient filter **/
    const match = { Mr_no: { $exists: true, $ne: null } };
    if (hospital_code) match.hospital_code        = hospital_code;
    if (site_code)     match.site_code            = site_code;
    if (speciality)    match['specialities.name'] = speciality;
    if (doctor_id && doctor_id !== 'all')
      match['specialities.doctor_ids'] = doctor_id;

    const pipeline = [
      { $match: match },
      { $project: { Mr_no: 1, specs: { $objectToArray: '$appointment_tracker' } } },
      { $unwind: '$specs' },
      ...(speciality ? [{ $match: { 'specs.k': speciality } }] : []),
      { $unwind: '$specs.v' },

      /* only rows that are actually completed */
      { $match: { 'specs.v.surveyStatus': 'Completed' } },

      { $group: { _id: '$Mr_no' } },
      { $count: 'totalCompletedSurveys' }
    ];

    const [{ totalCompletedSurveys = 0 } = {}] =
      await patientDataCollection.aggregate(pipeline).toArray();

    res.json({ totalCompletedSurveys });
  } catch (err) {
    console.error('❌ /surveys-completed failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/heatmap-data', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);
    const maxDiagnoses = 5;

    // Build filter
    const match = {};
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code     = site_code;
    if (speciality)    match.speciality    = speciality;
    if (doctor_id && doctor_id !== 'all') {
      match['specialities.doctor_ids'] = doctor_id;
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: match },

      // 1) unwind Events
      { $unwind: '$Events' },

      // 2) sort so that latest Events come first
      { $sort: { '_id': 1, 'Events.date': -1 } },

      // 3) group back to pick the first (latest) Event per document
      {
        $group: {
          _id: '$_id',
          doc: { $first: '$$ROOT' },
          latestEvent: { $first: '$Events' }
        }
      },

      // 4) replace root so we have top‐level latestEvent plus original fields
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$doc', { latestEvent: '$latestEvent' }]
          }
        }
      },

      // 5) unwind the Codes array
      { $unwind: '$Codes' },

      // 6) final grouping: diagnosis × treatmentPlan counts
      {
        $group: {
          _id: {
            diagnosis:     '$Codes.description',
            treatmentPlan: '$latestEvent.treatment_plan'
          },
          count: { $sum: 1 }
        }
      }
    ];

    const raw = await patientDataCollection.aggregate(pipeline).toArray();

    // If no results, return empty payload
    if (!raw.length) {
      return res.json({ diagnoses: [], treatments: [], matrix: [] });
    }

    // Compute total by diagnosis
    const diagCounts = raw.reduce((acc, { _id: { diagnosis }, count }) => {
      acc[diagnosis] = (acc[diagnosis] || 0) + count;
      return acc;
    }, {});

    // Top N diagnoses
    const selectedDiags = Object.entries(diagCounts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, maxDiagnoses)
      .map(([d]) => d);

    // Fixed treatment list
    const treatmentsSet = [
      'Surgery',
      'Lifestyle Modifications',
      'Medication',
      'Physical Therapy',
      'No Plan'
    ];

    // Build full matrix
    const matrix = [];
    selectedDiags.forEach((diag, i) => {
      treatmentsSet.forEach((treat, j) => {
        const found = raw.find(r =>
          r._id.diagnosis     === diag &&
          r._id.treatmentPlan === treat
        );
        matrix.push({
          diagnosisIndex:  i,
          treatmentIndex:  j,
          count:           found ? found.count : 0
        });
      });
    });

    // Return it
    res.json({
      diagnoses:  selectedDiags,
      treatments: treatmentsSet,
      matrix
    });

  } catch (err) {
    console.error('Heatmap-data error:', err);
    res.status(500).json({ error: 'Heatmap-data failed' });
  }
});



router.get('/sheatmap-data', async (req, res) => {
  try {
    const { speciality = '', doctor_id = '' } = req.query;
    const maxDiagnoses = 5;

    // 1) Build filter
    const match = {};
    if (speciality)  match.speciality  = speciality;
    if (doctor_id && doctor_id !== 'all') match.doctor_id = doctor_id;

    // 2) Aggregate: pick only the latest Event
    const agg = [
      { $match: match },
      // ❯ Add a field `latestEvent` = the single Events entry with the greatest date
      { 
        $addFields: {
          latestEvent: {
            $arrayElemAt: [
              { 
                $sortArray: {
                  input: "$Events", 
                  sortBy: { date: -1 }      // descending by date
                }
              },
              0                          // take first element
            ]
          }
        }
      },
      // 3) Unwind all diagnosis codes
      { $unwind: "$Codes" },
      // 4) Group by each code + that one latest treatmentPlan
      {
        $group: {
          _id: {
            diagnosis:     "$Codes.description",
            treatmentPlan: "$latestEvent.treatment_plan"
          },
          count: { $sum: 1 }
        }
      }
    ];

    const raw = await patientDataCollection.aggregate(agg).toArray();

    // Handle no‐data case
    if (!raw.length) {
      return res.json({ diagnoses: [], treatments: [], matrix: [] });
    }

    // 5) Pick top N diagnoses
    const diagCounts = raw.reduce((acc, d) => {
      acc[d._id.diagnosis] = (acc[d._id.diagnosis]||0) + d.count;
      return acc;
    }, {});
    const selectedDiags = Object.entries(diagCounts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, maxDiagnoses)
      .map(([d]) => d);

    // 6) Use your fixed treatment list
    const treatmentsSet = [
      'No Plan',
      'Surgery',
      'Lifestyle Modifications',
      'Medication',
      'Physical Therapy'
    ];

    // 7) Build a full matrix (zero‐fill)
    const matrix = [];
    selectedDiags.forEach((diag, i) => {
      treatmentsSet.forEach((treat, j) => {
        const found = raw.find(r =>
          r._id.diagnosis     === diag &&
          r._id.treatmentPlan === treat
        );
        matrix.push({
          diagnosisIndex:  i,
          treatmentIndex:  j,
          count:           found ? found.count : 0
        });
      });
    });

    // 8) Return everything
    res.json({
      diagnoses: selectedDiags,
      treatments: treatmentsSet,
      matrix
    });

  } catch (err) {
    console.error('Heatmap-data failed:', err);
    res.status(500).json({ error: 'Heatmap-data failed' });
  }
});


router.get('/surveys', async (req, res) => {
  const { hospital_code, site_code, speciality } = req.query;
  const match = {};
  if (hospital_code) match.hospital_code = hospital_code;
  if (site_code)     match.site_code     = site_code;
  if (speciality)    match.speciality    = speciality;

  const pipeline = [
    { $match: match },
    { $unwind: `$appointment_tracker.${speciality}` },
    { $match: { [`appointment_tracker.${speciality}.surveyStatus`]: 'Completed' } },
    { $unwind: `$appointment_tracker.${speciality}.survey_name` },
    { $group: { _id: `$appointment_tracker.${speciality}.survey_name` } },
    { $sort: { _id: 1 } }
  ];

  const results = await patientDataCollection.aggregate(pipeline).toArray();
    const expandedResults = results.flatMap(r => {
    if (r._id === 'Global-Health') {
      return ['Global-Health Physical', 'Global-Health Mental'];
    }
    return r._id;
  });

  res.json(expandedResults);
});

// router.get('/generated-surveys', async (req, res) => {
//   try {
//     const { hospital_code, site_code, speciality, doctor_id } = req.query;

//     //console.log('🔍 Incoming query params:', { hospital_code, site_code, speciality, doctor_id });

//     const matchFilter = {
//       Mr_no: { $exists: true, $ne: null }
//     };

//     if (hospital_code) matchFilter.hospital_code = hospital_code;
//     if (site_code) matchFilter.site_code = site_code;
//     if (speciality) matchFilter.speciality = speciality;
//     if (doctor_id && doctor_id !== 'all') {
//       matchFilter['specialities.doctor_ids'] = doctor_id;
//     }

//     //console.log('🧩 MongoDB match filter:', matchFilter);

//     const today = new Date();
//     const maxDate = new Date();
//     maxDate.setDate(today.getDate() + 7);

//     //console.log('📅 Today:', today.toISOString());
//     //console.log('📅 Max date (today + 7):', maxDate.toISOString());

//     const pipeline = [
//       { $match: matchFilter },
//       {
//         $project: {
//           Mr_no: 1,
//           appointment_arrays: {
//             $reduce: {
//               input: { $objectToArray: "$appointment_tracker" },
//               initialValue: [],
//               in: { $concatArrays: ["$$value", "$$this.v"] }
//             }
//           }
//         }
//       },
//       { $unwind: "$appointment_arrays" },
//       {
//         $match: {
//           $or: [
//             { "appointment_arrays.surveyType": /baseline/i },
//             {
//               $and: [
//                 { "appointment_arrays.surveyType": /followup/i },
//                 {
//                   $expr: {
//                     $and: [
//                       {
//                         $gte: [
//                           { $toDate: "$appointment_arrays.appointment_time" },
//                           today
//                         ]
//                       },
//                       {
//                         $lte: [
//                           { $toDate: "$appointment_arrays.appointment_time" },
//                           maxDate
//                         ]
//                       }
//                     ]
//                   }
//                 }
//               ]
//             }
//           ]
//         }
//       },
//       {
//         $group: {
//           _id: "$Mr_no"
//         }
//       }
//     ];

//     //console.log('📊 MongoDB aggregation pipeline:', JSON.stringify(pipeline, null, 2));

//     const result = await patientDataCollection.aggregate(pipeline).toArray();

//     const mrNumbers = result.map(doc => doc._id);
//     //console.log('📋 Matched MR numbers:', mrNumbers);
//     //console.log('📋 Matched MR numbers:', JSON.stringify(mrNumbers, null, 2));


//     res.json({
//       totalGeneratedSurveys: mrNumbers.length,
//       mrNumbers
//     });

//   } catch (error) {
//     console.error('❌ Error fetching survey stats:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// ─── Sent / generated surveys ───
router.get('/generated-surveys', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);

    /** filter by site / doctor first **/
    const match = { Mr_no: { $exists: true, $ne: null } };
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code     = site_code;
    if (speciality)    match['specialities.name'] = speciality;   // fallback
    if (doctor_id && doctor_id !== 'all')
      match['specialities.doctor_ids'] = doctor_id;

    /* dates for the “next 7 days” window */
    const today   = new Date();           // 2025-06-24 in your timezone
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7); // 2025-07-01

    const pipeline = [
      { $match: match },

      /* turn { Orthopedics: […], Diabetes: […] } ➜
         [ {k:"Orthopedics", v:[…]}, {k:"Diabetes", v:[…]} ] */
      { $project: { Mr_no: 1, specs: { $objectToArray: '$appointment_tracker' } } },
      { $unwind: '$specs' },

      /* keep only the speciality we were asked for (if any) */
      ...(speciality ? [{ $match: { 'specs.k': speciality } }] : []),

      /* each individual appointment on its own row */
      { $unwind: '$specs.v' },

      /* parse the date once so we can compare it */
      { $addFields: {
          apptDate: { $toDate: '$specs.v.appointment_time' }
      } },

      /* baseline OR follow-up in next 7 days */
      { $match: {
          $expr: {
            $or: [
              { $regexMatch: { input: '$specs.v.surveyType', regex: /baseline/i } },
              { $and: [
                  { $regexMatch: { input: '$specs.v.surveyType', regex: /followup/i } },
                  { $gte: [ '$apptDate', today   ] },
                  { $lte: [ '$apptDate', in7Days ] }
              ] }
            ]
          }
      } },

      /* one patient = one count */
      { $group: { _id: '$Mr_no' } },
      { $count: 'totalGeneratedSurveys' }
    ];

    const [{ totalGeneratedSurveys = 0 } = {}] =
      await patientDataCollection.aggregate(pipeline).toArray();

    res.json({ totalGeneratedSurveys });
  } catch (err) {
    console.error('❌ /generated-surveys failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Response-rate (Completed ÷ Sent) ───
router.get('/survey-response-rate', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);

    /* 1. patient-level filter that applies to both facets */
    const patientMatch = { Mr_no: { $exists: true, $ne: null } };
    if (hospital_code) patientMatch.hospital_code          = hospital_code;
    if (site_code)     patientMatch.site_code              = site_code;
    if (doctor_id && doctor_id !== 'all')
      patientMatch['specialities.doctor_ids'] = doctor_id;

    /* 2. compute the date window for follow-ups */
    const today   = new Date();           // e.g., 2025-06-24
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7); // 2025-07-01

    /* 3. one aggregation, two facets */
    const pipeline = [
      { $match: patientMatch },

      /* explode { Diabetes:[…], Orthopedics:[…] } ➜ [{k,v}, …] */
      {
        $project: {
          Mr_no: 1,
          specs: { $objectToArray: '$appointment_tracker' }
        }
      },
      { $unwind: '$specs' },
      ...(speciality ? [{ $match: { 'specs.k': speciality } }] : []),
      { $unwind: '$specs.v' },

      /* pre-compute the appointment date once */
      { $addFields: {
          apptDate: { $toDate: '$specs.v.appointment_time' }
      } },

      /* run *two* parallel sub-pipelines on that stream */
      {
        $facet: {
          sent: [
            /* baseline OR follow-up ≤ 7 days */
            { $match: {
                $expr: {
                  $or: [
                    { $regexMatch:
                        { input: '$specs.v.surveyType', regex: /baseline/i } },
                    { $and: [
                        { $regexMatch:
                            { input: '$specs.v.surveyType', regex: /followup/i } },
                        { $gte: [ '$apptDate', today   ] },
                        { $lte: [ '$apptDate', in7Days ] }
                    ] }
                  ]
                }
            }},
            { $group: { _id: '$Mr_no' } }   // unique patients
          ],

          completed: [
            { $match: { 'specs.v.surveyStatus': 'Completed' } },
            { $group: { _id: '$Mr_no' } }   // unique patients
          ]
        }
      },

      /* 4. project just the sizes we need */
      {
        $project: {
          sentCount:      { $size: '$sent' },
          completedCount: { $size: '$completed' }
        }
      }
    ];

    const [{ sentCount = 0, completedCount = 0 } = {}] =
      await patientDataCollection.aggregate(pipeline).toArray();

    const responseRate = sentCount
      ? +( (completedCount / sentCount) * 100 ).toFixed(2)
      : 0;

    res.json({ responseRate }); // e.g., 37.57
  } catch (err) {
    console.error('❌ /survey-response-rate failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/treatments', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);

    const match = {};
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code     = site_code;
    if (speciality)    match.speciality    = speciality;
    if (doctor_id && doctor_id !== 'all') {
      match['specialities.doctor_ids'] = doctor_id;
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$Events" },
      { $group: {
          _id: "$Events.treatment_plan",
          count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ];

    const raw = await patientDataCollection.aggregate(pipeline).toArray();

    const treatments = raw
      .map(r => r._id)
      .filter(t => t && t.trim() !== "");

    res.json(treatments);
  } catch (err) {
    console.error("Error fetching treatments:", err);
    res.status(500).json({ error: "Failed to fetch treatment plans" });
  }
});



// /diagnoses route
router.get('/diagnoses', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, hashedusername } = req.query;
    const doctor_id = await resolveDoctorId(hashedusername);
    const maxDiagnoses = 10;

    const match = {};
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code     = site_code;
    if (speciality)    match.speciality    = speciality;
    if (doctor_id && doctor_id !== 'all') {
      match['specialities.doctor_ids'] = doctor_id;
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$Codes" },
      { $group: {
          _id: "$Codes.description",
          count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: maxDiagnoses }
    ];

    const raw = await patientDataCollection.aggregate(pipeline).toArray();

    const diagnoses = raw
      .map(r => r._id)
      .filter(d => d && d.trim() !== "");

    res.json(diagnoses);
  } catch (err) {
    console.error("Error fetching diagnoses:", err);
    res.status(500).json({ error: "Failed to fetch diagnoses" });
  }
});


router.get('/mean-scores', async (req, res) => {
  const {
    hospital_code, site_code, speciality,
    hashedusername, intervention, treatment_plan, survey
  } = req.query;
  const doctor_id = await resolveDoctorId(hashedusername);

  const match = { hospital_code, site_code, speciality };

  if (doctor_id) match['specialities.doctor_ids'] = doctor_id;
  if (intervention) match['Events.event'] = intervention;
  if (treatment_plan) {
    match['Events.treatment_plan'] = { $regex: treatment_plan, $options: 'i' };
  }

  try {
    const pipeline = [
      { $match: match },
      { $project: { mr_no: 1, SurveyData: 1, appointment_tracker: 1 } }
    ];

    const patients = await patientDataCollection.aggregate(pipeline).toArray();

    const stageMap = {}; // e.g. { Baseline: [ { title, score }, ... ] }
    const rangeMap = {}; // e.g. { 'Survey Title': { min, max } }

    patients.forEach(patient => {
      const tracker = patient.appointment_tracker?.[speciality] || [];

      tracker.forEach(appt => {
        if (appt.surveyStatus !== 'Completed') return;
        const stage = appt.surveyType;
        const apptTime = new Date(appt.appointment_time);
        const lowerBound = new Date(apptTime);
        const upperBound = new Date(apptTime);
        lowerBound.setMonth(lowerBound.getMonth() - 1);
        upperBound.setMonth(upperBound.getMonth() + 1);

        appt.survey_name?.forEach(surveyName => {
          const isAll = !survey || survey === 'All';
          const isPhysicalMatch = survey === 'Global-Health Physical' && surveyName === 'Global-Health';
          const isMentalMatch = survey === 'Global-Health Mental' && surveyName === 'Global-Health';
          const isExactMatch = surveyName === survey;

          if (isAll || isExactMatch || isPhysicalMatch || isMentalMatch) {
            if (surveyName === 'Global-Health') {
              const physicalEntries = patient.SurveyData?.physical_health || [];
              const mentalEntries = patient.SurveyData?.mental_health || [];

              physicalEntries.forEach(entry => {
                const surveyTime = new Date(entry.dates);
                if (surveyTime >= lowerBound && surveyTime <= upperBound) {
                  const title = 'Global-Health Physical';
                  if (!stageMap[stage]) stageMap[stage] = [];
                  stageMap[stage].push({ title, score: entry.scores });
                  rangeMap[title] = { min: entry.ymin, max: entry.ymax };
                }
              });

              mentalEntries.forEach(entry => {
                const surveyTime = new Date(entry.dates);
                if (surveyTime >= lowerBound && surveyTime <= upperBound) {
                  const title = 'Global-Health Mental';
                  if (!stageMap[stage]) stageMap[stage] = [];
                  stageMap[stage].push({ title, score: entry.scores });
                  rangeMap[title] = { min: entry.ymin, max: entry.ymax };
                }
              });

            } else {
              const surveyEntries = patient.SurveyData?.[surveyName] || [];
              surveyEntries.forEach(entry => {
                const surveyTime = new Date(entry.dates);
                if (surveyTime >= lowerBound && surveyTime <= upperBound) {
                  const title = surveyName;
                  if (!stageMap[stage]) stageMap[stage] = [];
                  stageMap[stage].push({ title, score: entry.scores });
                  rangeMap[title] = { min: entry.ymin, max: entry.ymax };
                }
              });
            }
          }
        });
      });
    });

    // Aggregate into mean scores grouped by stage
    const resultMap = {}; // e.g. { 'Survey Title': [ { stage, mean }, ... ] }
    Object.entries(stageMap).forEach(([stage, entries]) => {
      entries.forEach(({ title, score }) => {
        if (!resultMap[title]) resultMap[title] = [];
        resultMap[title].push({ stage, score });
      });
    });

    const results = Object.entries(resultMap).map(([title, entries]) => {
      const grouped = {};
      entries.forEach(({ stage, score }) => {
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push(score);
      });

      const range = getSurveyRange(title);

      const groupedMeans = Object.entries(grouped).map(([stage, scores]) => ({
        stage,
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        min: range.min,
        max: range.max
      }));

      const order = ['Baseline', 'Followup - 1', 'Followup - 2', 'Followup - 3'];
      groupedMeans.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));

      return { survey: title, results: groupedMeans };
    });

    res.json(results);

  } catch (err) {
    console.error("Error in /mean-scores:", err);
    res.status(500).json({ error: 'Error processing mean scores' });
  }
});

router.get('/score-trend', async (req, res) => {
  const {
    hospital_code, site_code, speciality,
    hashedusername, intervention, treatment_plan, survey
  } = req.query;

  //console.log("Received query parameters:", req.query);
const doctor_id = await resolveDoctorId(hashedusername);
  const match = { hospital_code, site_code, speciality };
  if (doctor_id) match['specialities.doctor_ids'] = doctor_id;
  if (intervention) match['Events.event'] = intervention;
  if (treatment_plan) {
  match['Events.treatment_plan'] = { $regex: treatment_plan, $options: 'i' };
}

  //console.log("MongoDB match object:", JSON.stringify(match, null, 2));

  try {
    const pipeline = [
      { $match: match },
      { $project: { Mr_no: 1, SurveyData: 1, appointment_tracker: 1 } }
    ];

    const patients = await patientDataCollection.aggregate(pipeline).toArray();

    const trend = [];

    patients.forEach(patient => {
      const mr = patient.Mr_no;
      const tracker = patient.appointment_tracker?.[speciality] || [];

      tracker.forEach(appt => {
        if (appt.surveyStatus !== 'Completed') return;

        const stage = appt.surveyType;
        const apptTime = new Date(appt.appointment_time);

        let surveyEntries = [];

        if (survey === 'Global-Health Physical') {
          surveyEntries = patient.SurveyData?.physical_health || [];
        } else if (survey === 'Global-Health Mental') {
          surveyEntries = patient.SurveyData?.mental_health || [];
        } 
        else if (!survey || survey=== 'All') {
          // concatenate all surveys in SurveyData
          surveyEntries = [
            ...(patient.SurveyData?.physical_health   || []),
            ...(patient.SurveyData?.mental_health     || []),
            // for any other surveys, e.g. if you have SurveyData.Global-Health, etc.
            ...Object.entries(patient.SurveyData || {})
              .filter(([key]) => !['physical_health','mental_health'].includes(key))
              .flatMap(([_, arr]) => Array.isArray(arr) ? arr : [])
          ];
        }else {
          surveyEntries = patient.SurveyData?.[survey] || [];
        }

        surveyEntries.forEach(entry => {
          const surveyDate = new Date(entry.dates);
          const daysDiff = Math.abs(surveyDate - apptTime) / (1000 * 60 * 60 * 24);

          if (daysDiff <= 31) {
            const scores = entry.scores;
            let meanScore;

            if (Array.isArray(scores)) {
              const total = scores.reduce((sum, val) => sum + val, 0);
              meanScore = Number((total / scores.length).toFixed(2));
            } else if (typeof scores === "number") {
              meanScore = scores;
            } else {
              return; // skip if scores is not a number or array
            }

            trend.push({
              mr_no: mr,
              stage,
              score: meanScore
            });
          }
        });
      });
    });

    //console.log("Final trend data:", JSON.stringify(trend, null, 2));
    res.json(trend); // ✅ send flat array directly

  } catch (err) {
    console.error("Error fetching score trend:", err);
    res.status(500).json({ error: 'Error fetching score trend' });
  }
});


module.exports = router;