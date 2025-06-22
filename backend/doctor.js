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


// ===== Routes =====
router.get('/filtered-doctors', async (req, res) => {
  const { hospital_code, site_code, speciality, all } = req.query;
  const loggedInDoctorId = req.session?.doctor_id;  // adjust if your session structure differs

  // If "all" param is truthy, return all doctors matching filters
  // Otherwise, return only the logged-in doctor

  try {
    let doctors;

    if (all === 'true') {
      // Return all doctors as before (filtered by hospital, site, speciality)
      const filter = {};
      if (hospital_code) filter.hospital_code = hospital_code;
      if (site_code) filter.site_code = site_code;
      if (speciality) filter.speciality = speciality;

      doctors = await doctorsCollection.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              doctor_id: "$doctor_id",
              firstName: "$firstName",
              lastName: "$lastName"
            }
          }
        },
        {
          $project: {
            _id: 0,
            doctor_id: "$_id.doctor_id",
            doctorName: {
              $concat: ["$_id.firstName", " ", "$_id.lastName"]
            }
          }
        }
      ]).toArray();
    } else {
      // Return only the logged-in doctor
      if (!loggedInDoctorId) {
        return res.status(401).json({ error: "Not logged in" });
      }

      const doctor = await doctorsCollection.aggregate([
        { $match: { doctor_id: loggedInDoctorId } },
        {
          $group: {
            _id: {
              doctor_id: "$doctor_id",
              firstName: "$firstName",
              lastName: "$lastName"
            }
          }
        },
        {
          $project: {
            _id: 0,
            doctor_id: "$_id.doctor_id",
            doctorName: {
              $concat: ["$_id.firstName", " ", "$_id.lastName"]
            }
          }
        }
      ]).toArray();

      doctors = doctor;
    }

    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// router.get('/filtered-doctors', async (req, res) => {
//   const { hospital_code, site_code, speciality } = req.query;

//   //console.log('Received query params:', { hospital_code, site_code, speciality });

//   const filter = {};
//   if (hospital_code) filter.hospital_code = hospital_code;
//   if (site_code) filter.site_code = site_code;
//   if (speciality) filter.speciality = speciality;

//   //console.log('MongoDB filter constructed:', filter);

//   try {
//     const doctors = await doctorsCollection.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: {
//             doctor_id: "$doctor_id",
//             firstName: "$firstName",
//             lastName: "$lastName"
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           doctor_id: "$_id.doctor_id",
//           doctorName: {
//             $concat: ["$_id.firstName", " ", "$_id.lastName"]
//           }
//         }
//       }
//     ]).toArray();

//     //console.log('Doctors found:', doctors);
//     res.json(doctors);
//   } catch (err) {
//     console.error('Error fetching doctors:', err);
//     res.status(500).json({ error: 'Failed to fetch doctors' });
//   }
// });

router.get('/registered-patients', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, doctor_id } = req.query;

    const filter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) {
      filter.hospital_code = hospital_code;
    }

    if (site_code) {
      filter.site_code = site_code;
    }

    if (speciality) {
      filter.speciality = speciality;
    }

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
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/surveys-sent', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, doctor_id } = req.query;

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
    const { hospital_code, site_code, speciality, doctor_id } = req.query;

    const matchFilter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) {
      matchFilter.hospital_code = hospital_code;
    }
    if (site_code) {
      matchFilter.site_code = site_code;
    }
    if (speciality) {
      matchFilter.speciality = speciality;
    }
    if (doctor_id && doctor_id !== 'all') {
      matchFilter['specialities.doctor_ids'] = doctor_id;
    }


    const pipeline = [
      { $match: matchFilter },

      {
        $project: {
          appointment_tracker: { $objectToArray: "$appointment_tracker" }
        }
      },

      { $unwind: "$appointment_tracker" },

      { $match: { "appointment_tracker.k": speciality } },

      { $unwind: "$appointment_tracker.v" },

      { $match: { "appointment_tracker.v.surveyStatus": "Completed" } },

      {
        $group: {
          _id: null,
          totalCompletedSurveys: { $sum: 1 }
        }
      },

      { $project: { _id: 0, totalCompletedSurveys: 1 } }
    ];


    const result = await patientDataCollection.aggregate(pipeline).toArray();

    res.json(result[0] || { totalCompletedSurveys: 0 });

  } catch (error) {
    console.error('Error fetching surveys completed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/heatmap-data', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, doctor_id } = req.query;
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

router.get('/me', (req, res) => {
  const loggedInDoctorId = req.session?.doctor_id;
  
  if (!loggedInDoctorId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  // You can also query the DB for more details if you want
  res.json({ doctor_id: loggedInDoctorId });
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
//   const { hospital_code, site_code, speciality, doctor_id } = req.query;

//   try {
//     const match = {};
//     if (hospital_code) match.hospital_code = hospital_code;
//     if (site_code)     match.site_code     = site_code;
//     if (speciality)    match.speciality    = speciality;
//     if (doctor_id && doctor_id !== 'all') {
//       match['specialities.doctor_ids'] = doctor_id;
//     }

//     const pipeline = [
//       { $match: match },
//       { $project: { appointment_tracker: 1 } }
//     ];

//     const patients = await patientDataCollection.aggregate(pipeline).toArray();

//     let surveysScheduledToDate = 0;
//     const today = new Date();

//     patients.forEach(patient => {
//       const tracker = patient.appointment_tracker || {};

//       // If a specific speciality is selected
//       if (speciality) {
//         const appts = tracker[speciality] || [];
//         appts.forEach(appt => {
//           const apptTime = new Date(appt.appointment_time);
//           if (apptTime <= today) {
//             surveysScheduledToDate++;
//           }
//         });
//       } else {
//         // Count across all specialities
//         for (const spec in tracker) {
//           const appts = tracker[spec] || [];
//           appts.forEach(appt => {
//             const apptTime = new Date(appt.appointment_time);
//             if (apptTime <= today) {
//               surveysScheduledToDate++;
//             }
//           });
//         }
//       }
//     });

//     res.json({
//       totalGeneratedSurveys: surveysScheduledToDate
//     });

//   } catch (err) {
//     console.error('Error in /generated-surveys:', err);
//     res.status(500).json({ error: 'Error generating survey stats' });
//   }
// });

router.get('/generated-surveys', async (req, res) => {
  const { hospital_code, site_code, speciality, doctor_id } = req.query;

  try {
    const match = {};
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code     = site_code;
    if (speciality)    match.speciality    = speciality;
    if (doctor_id && doctor_id !== 'all') {
      match['specialities.doctor_ids'] = doctor_id;
    }

    const pipeline = [
      { $match: match },
      { $project: { appointment_tracker: 1 } }
    ];

    const patients = await patientDataCollection.aggregate(pipeline).toArray();

    let surveysScheduledToDate = 0;
    const today = new Date();

    patients.forEach(patient => {
      const tracker = patient.appointment_tracker || {};

      // If a specific speciality is selected
      if (speciality) {
        const appts = tracker[speciality] || [];
        appts.forEach(appt => {
          const apptTime = new Date(appt.appointment_time);
          if (apptTime <= today) {
            surveysScheduledToDate++;
          }
        });
      } else {
        // Count across all specialities
        for (const spec in tracker) {
          const appts = tracker[spec] || [];
          appts.forEach(appt => {
            const apptTime = new Date(appt.appointment_time);
            if (apptTime <= today) {
              surveysScheduledToDate++;
            }
          });
        }
      }
    });

    res.json({
      totalGeneratedSurveys: surveysScheduledToDate
    });

  } catch (err) {
    console.error('Error in /generated-surveys:', err);
    res.status(500).json({ error: 'Error generating survey stats' });
  }
});

router.get('/survey-response-rate', async (req, res) => {
const { hospital_code, site_code, speciality, doctor_id } = req.query;

  try {
    // Step 1: Get total registered patients
    const patientFilter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) patientFilter.hospital_code = hospital_code;
    if (site_code)     patientFilter.site_code = site_code;
    if (speciality)    patientFilter.speciality = speciality;
    if (doctor_id && doctor_id !== 'all') {
      patientFilter['specialities.doctor_ids'] = doctor_id;
    }

    const registeredPatientsResult = await patientDataCollection.aggregate([
      { $match: patientFilter },
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

    const totalRegisteredPatients = registeredPatientsResult[0]?.totalRegisteredPatients || 0;

    // Step 2: Get patients and their survey information
    const match = {};
    if (hospital_code) match.hospital_code = hospital_code;
    if (site_code)     match.site_code = site_code;
    if (speciality)    match.speciality = speciality;
    if (doctor_id && doctor_id !== 'all') {
      match['specialities.doctor_ids'] = doctor_id;
    }

    const surveyPipeline = [
      { $match: match },
      { $project: { appointment_tracker: 1 } }
    ];

    const patients = await patientDataCollection.aggregate(surveyPipeline).toArray();

    let totalSent = 0;
    let completedSurveys = 0;

    // Get the current date and 7 days ahead for follow-ups
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7); // Follow-ups within the next 7 days

    patients.forEach((patient, index) => {
      const tracker = patient.appointment_tracker?.[speciality] || [];

      tracker.forEach((appt, idx) => {
        const apptTime = new Date(appt.appointment_time);
        const type = (appt.surveyType || '').toLowerCase();
        const status = appt.surveyStatus;

        // Count completed surveys
        if (status === 'Completed') {
          completedSurveys++;
        }

        // Count surveys sent
        if (type.includes('baseline')) {
          totalSent++; // Count baseline surveys as sent
        } else if (type.includes('followup') && apptTime <= maxDate) {
          totalSent++; // Count follow-up surveys sent within the next 7 days
        }
      });
    });

    // Step 3: Calculate response rate
    const responseRate = totalSent > 0
      ? (completedSurveys / totalSent) * 100
      : 0;

    // Final response
    res.json({
      responseRate: parseFloat(responseRate.toFixed(2)) // percentage
    });

  } catch (err) {
    console.error('❌ Error in /survey-response-rate:', err);
    res.status(500).json({ error: 'Error calculating survey response rate' });
  }
});



router.get('/treatments', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, doctor_id } = req.query;

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
    const { hospital_code, site_code, speciality, doctor_id } = req.query;
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


// router.get('/mean-scores', async (req, res) => {
//   const {
//     hospital_code, site_code, speciality,
//     doctor_id, intervention, treatment_plan, survey
//   } = req.query;

//   //console.log("Received query parameters:", req.query);

//   const match = {
//     hospital_code,
//     site_code,
//     speciality,
//   };

//   if (doctor_id) match['specialities.doctor_ids'] = doctor_id;
//   if (intervention) match['Events.event'] = intervention;
//   if (treatment_plan) match['Events.treatment_plan'] = treatment_plan;

//   //console.log("MongoDB match object:", JSON.stringify(match, null, 2));

//   try {
//     const pipeline = [
//       { $match: match },
//       { $project: { mr_no: 1, SurveyData: 1, appointment_tracker: 1 } }
//     ];

//     //console.log("Aggregation pipeline:", JSON.stringify(pipeline, null, 2));

//     const patients = await patientDataCollection.aggregate(pipeline).toArray();
//     //console.log("Matched patient records:", patients.length);

//     const stageMap = {}; // { Baseline: [score, score], ... }
//     const rangeMap = {}; // { surveyTitle: { min, max } }

//     patients.forEach((patient, index) => {
//       const tracker = patient.appointment_tracker?.[speciality] || [];
//       //console.log(`Processing patient ${index + 1}, appointments:`, tracker.length);

//       tracker.forEach((appt, i) => {
//         if (appt.surveyStatus !== 'Completed') return;
//         const stage = appt.surveyType;

//         appt.survey_name?.forEach(surveyName => {
//           if (
//             survey === 'All' ||
//             surveyName === survey || 
//             (survey === 'Global-Health Physical' && surveyName === 'Global-Health') ||
//             (survey === 'Global-Health Mental' && surveyName === 'Global-Health')
//           ){
//             //console.log(survey,surveyName,"here");
//             if (surveyName === 'Global-Health') {
//               const physicalEntries = patient.SurveyData?.physical_health || [];
//               const mentalEntries = patient.SurveyData?.mental_health || [];

//               //console.log("Checking Global-Health surveys for patient...");
//               //console.log("Appointment Date:", new Date(appt.appointment_time).toDateString());
//               //console.log("Physical Entries:", physicalEntries.length);
//               //console.log("Mental Entries:", mentalEntries.length);

//               // Process physical health entries
//               physicalEntries.forEach(entry => {
//               const apptDate = new Date(appt.appointment_time).toDateString();
//               const surveyDate = new Date(entry.dates).toDateString();
//               console.log(`-- Comparing Physical Survey Date: ${surveyDate} with Appt Date: ${apptDate}`);

//               const apptTime = new Date(appt.appointment_time);
//               const surveyTime = new Date(entry.dates);

//               const lowerBound = new Date(apptTime);
//               lowerBound.setMonth(lowerBound.getMonth() - 1);

//               const upperBound = new Date(apptTime);
//               upperBound.setMonth(upperBound.getMonth() + 1);

//               if (surveyTime >= lowerBound && surveyTime <= upperBound) {

//                   const title = 'Global-Health Physical';
//                   if (!stageMap[stage]) stageMap[stage] = [];
//                   stageMap[stage].push({ title, score: entry.scores });
//                   rangeMap[title] = { min: entry.ymin, max: entry.ymax };

//                   //console.log(`-- Matched PHYSICAL survey. Title: ${title}, Score: ${entry.scores}`);
//                 }
//               });

//               // Process mental health entries
//               mentalEntries.forEach(entry => {
//                 const apptDate = new Date(appt.appointment_time).toDateString();
//                 const surveyDate = new Date(entry.dates).toDateString();
//                 //console.log(`-- Comparing Mental Survey Date: ${surveyDate} with Appt Date: ${apptDate}`);

//                 const apptTime = new Date(appt.appointment_time);
//                 const surveyTime = new Date(entry.dates);

//                 const lowerBound = new Date(apptTime);
//                 lowerBound.setMonth(lowerBound.getMonth() - 1);

//                 const upperBound = new Date(apptTime);
//                 upperBound.setMonth(upperBound.getMonth() + 1);

//                 if (surveyTime >= lowerBound && surveyTime <= upperBound) {

//                     const title = 'Global-Health Mental';
//                     if (!stageMap[stage]) stageMap[stage] = [];
//                     stageMap[stage].push({ title, score: entry.scores });
//                     rangeMap[title] = { min: entry.ymin, max: entry.ymax };

//                     //console.log(`-- Matched MENTAL survey. Title: ${title}, Score: ${entry.scores}`);
//                   }
//                 });


//                 } else {
//                   const surveyEntries = patient.SurveyData?.[surveyName] || [];
//                   surveyEntries.forEach(entry => {
//                     const apptDate = new Date(appt.appointment_time).toDateString();
//                     const surveyDate = new Date(entry.dates).toDateString();
//                     const apptTime = new Date(appt.appointment_time);
//                     const surveyTime = new Date(entry.dates);

//                     const lowerBound = new Date(apptTime);
//                     lowerBound.setMonth(lowerBound.getMonth() - 1);

//                     const upperBound = new Date(apptTime);
//                     upperBound.setMonth(upperBound.getMonth() + 1);

//                 if (surveyTime >= lowerBound && surveyTime <= upperBound) {

//                                   const title = surveyName;
//                                   if (!stageMap[stage]) stageMap[stage] = [];
//                                   stageMap[stage].push({ title, score: entry.scores });
//                                   rangeMap[title] = { min: entry.ymin, max: entry.ymax };
//                                 }
//                               });
//                             }
//                           }
//                         });
//                       });
//                     });

//                     //console.log("Stage map:", JSON.stringify(stageMap, null, 2));
//                     //console.log("Range map:", JSON.stringify(rangeMap, null, 2));

//                     const resultMap = {}; // { title: [{ stage, score }] }
//                     Object.entries(stageMap).forEach(([stage, entries]) => {
//                       entries.forEach(({ title, score }) => {
//                         if (!resultMap[title]) resultMap[title] = [];
//                         resultMap[title].push({ stage, score });
//                       });
//                     });

//                     //console.log("Intermediate result map:", JSON.stringify(resultMap, null, 2));

//                     const results = Object.entries(resultMap).map(([title, entries]) => {
//                       const grouped = {};
//                       entries.forEach(({ stage, score }) => {
//                         if (!grouped[stage]) grouped[stage] = [];
//                         grouped[stage].push(score);
//                       });

//                       const range = getSurveyRange(title);

//                       const groupedMeans = Object.entries(grouped).map(([stage, scores]) => ({
//                         stage,
//                         mean: scores.reduce((a, b) => a + b, 0) / scores.length,
//                         min: range.min,
//                         max: range.max
//                       }));

//                       const order = ['Baseline', 'Followup - 1', 'Followup - 2', 'Followup - 3'];
//                       groupedMeans.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));

//                       return { survey: title, results: groupedMeans };
//                     });

//                     //console.log("Final grouped mean scores:", JSON.stringify(results, null, 2));
//                     res.json(results);

//     } catch (err) {
//       console.error("Error in /mean-scores:", err);
//       res.status(500).json({ error: 'Error processing mean scores' });
//     }
//   });

// router.get('/score-trend', async (req, res) => {
//   const {
//     hospital_code, site_code, speciality,
//     doctor_id, intervention, treatment_plan, survey
//   } = req.query;

//   //console.log("Received query parameters:", req.query);

//   const match = { hospital_code, site_code, speciality };
//   if (doctor_id) match['specialities.doctor_ids'] = doctor_id;
//   if (intervention) match['Events.event'] = intervention;
//   if (treatment_plan) match['Events.treatment_plan'] = treatment_plan;

//   //console.log("MongoDB match object:", JSON.stringify(match, null, 2));

//   try {
//     const pipeline = [
//       { $match: match },
//       { $project: { Mr_no: 1, SurveyData: 1, appointment_tracker: 1 } }
//     ];

//     const patients = await patientDataCollection.aggregate(pipeline).toArray();

//     const trend = [];

//     patients.forEach(patient => {
//       const mr = patient.Mr_no;
//       const tracker = patient.appointment_tracker?.[speciality] || [];

//       tracker.forEach(appt => {
//         if (appt.surveyStatus !== 'Completed') return;

//         const stage = appt.surveyType;
//         const apptTime = new Date(appt.appointment_time);

//         let surveyEntries = [];

//         if (survey === 'Global-Health Physical') {
//           surveyEntries = patient.SurveyData?.physical_health || [];
//         } else if (survey === 'Global-Health Mental') {
//           surveyEntries = patient.SurveyData?.mental_health || [];
//         } 
//         else if (survey === 'All') {
//           // concatenate all surveys in SurveyData
//           surveyEntries = [
//             ...(patient.SurveyData?.physical_health   || []),
//             ...(patient.SurveyData?.mental_health     || []),
//             // for any other surveys, e.g. if you have SurveyData.Global-Health, etc.
//             ...Object.entries(patient.SurveyData || {})
//               .filter(([key]) => !['physical_health','mental_health'].includes(key))
//               .flatMap(([_, arr]) => Array.isArray(arr) ? arr : [])
//           ];
//         }else {
//           surveyEntries = patient.SurveyData?.[survey] || [];
//         }

//         surveyEntries.forEach(entry => {
//           const surveyDate = new Date(entry.dates);
//           const daysDiff = Math.abs(surveyDate - apptTime) / (1000 * 60 * 60 * 24);

//           if (daysDiff <= 31) {
//             const scores = entry.scores;
//             let meanScore;

//             if (Array.isArray(scores)) {
//               const total = scores.reduce((sum, val) => sum + val, 0);
//               meanScore = Number((total / scores.length).toFixed(2));
//             } else if (typeof scores === "number") {
//               meanScore = scores;
//             } else {
//               return; // skip if scores is not a number or array
//             }

//             trend.push({
//               mr_no: mr,
//               stage,
//               score: meanScore
//             });
//           }
//         });
//       });
//     });

//     //console.log("Final trend data:", JSON.stringify(trend, null, 2));
//     res.json(trend); // ✅ send flat array directly

//   } catch (err) {
//     console.error("Error fetching score trend:", err);
//     res.status(500).json({ error: 'Error fetching score trend' });
//   }
// });

router.get('/mean-scores', async (req, res) => {
  const {
    hospital_code, site_code, speciality,
    doctor_id, intervention, treatment_plan, survey
  } = req.query;

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
    doctor_id, intervention, treatment_plan, survey
  } = req.query;

  //console.log("Received query parameters:", req.query);

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