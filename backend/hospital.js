// backend/index.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const { parse, isValid, differenceInYears } = require('date-fns');


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
        staffCollection = db3.collection('staffs');
        SurveysCollection = db3.collection('surveys');
        console.log('Connected to manage_doctors database');
    } catch (error) {
        console.error('Failed to connect to manage_doctors database', error);
    }
}
connectDB3();


router.get('/specialties', async (req, res) => {
    console.log("in here");
  const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    // Fetch all specialty docs for the hospital/site, projecting needed fields
    const docs = await SurveysCollection.find(
      { hospital_code, site_code },
      { projection: { specialty: 1, surveys: 1, _id: 0 } }
    ).toArray();

    // Prepare response array with specialty name, surveys count and survey names
    const specialties = docs.map(doc => ({
      specialty: doc.specialty,
      surveysCount: doc.surveys ? doc.surveys.length : 0,
      surveyNames: doc.surveys ? doc.surveys.map(s => s.survey_name) : []
    }));

    res.json({
      count: specialties.length, // total specialties found (including duplicates)
      specialties
    });
  } catch (err) {
    console.error('Error fetching specialties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/doctors', async (req, res) => {
  const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const count = await doctorsCollection.countDocuments({
      hospital_code,
      site_code
    });

    res.json({ count });
  } catch (err) {
    console.error('Error counting doctors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/staff', async (req, res) => {
  const { hospital_code, site_code } = req.query;
  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const count = await staffCollection.countDocuments({
      hospital_code,
      site_code
    });

    res.json({ count });
  } catch (err) {
    console.error('Error counting doctors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/patients', async (req, res) => {
   const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const count = await patientDataCollection.countDocuments({
      hospital_code,
      site_code
    });

    res.json({ count });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// router.get('/surveys-sent', async (req, res) => {
//   try {
//     console.log("o",req.query);
//     const { hospital_code, site_code, speciality, doctor_id } = req.query;

//     const filter = {
//       Mr_no: { $exists: true, $ne: null }
//     };

//     if (hospital_code) filter.hospital_code = hospital_code;
//     if (site_code) filter.site_code = site_code;
//     if (speciality) filter.speciality = speciality;

//     if (doctor_id && doctor_id !== 'all') {
//       filter['specialities.doctor_ids'] = doctor_id;
//     }

//     const result = await patientDataCollection.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: null,
//           uniquePatients: { $addToSet: "$Mr_no" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           count: { $size: "$uniquePatients" }
//         }
//       }
//     ]).toArray();

//     res.json(result[0] || { count: 0 });

//   } catch (error) {
//     console.error('Error fetching registered patients:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


router.get('/surveys-sent', async (req, res) => {
  try {
    const { hospital_code, site_code, speciality, doctor_id } = req.query;

    const matchFilter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) matchFilter.hospital_code = hospital_code;
    if (site_code) matchFilter.site_code = site_code;
    if (speciality) matchFilter.speciality = speciality;
    if (doctor_id && doctor_id !== 'all') {
      matchFilter['specialities.doctor_ids'] = doctor_id;
    }

    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);

    const result = await patientDataCollection.aggregate([
      { $match: matchFilter },
      {
        $project: {
          appointment_arrays: {
            $reduce: {
              input: { $objectToArray: "$appointment_tracker" },
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this.v"] }
            }
          }
        }
      },
      { $unwind: "$appointment_arrays" },
      {
        $match: {
          $or: [
            { "appointment_arrays.surveyType": /baseline/i },
            {
              $and: [
                { "appointment_arrays.surveyType": /followup/i },
                { $expr: { $lte: [{ $toDate: "$appointment_arrays.appointment_time" }, maxDate] } }
              ]
            }
          ]
        }
      },
      { $count: "totalSent" }
    ]).toArray();

    res.json({ count: result[0]?.totalSent || 0 });

  } catch (error) {
    console.error('❌ Error fetching survey stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//before optimization
// router.get('/surveys-sent', async (req, res) => {
//   try {
//     //console.log("Query Params:", req.query);
//     const { hospital_code, site_code, speciality, doctor_id } = req.query;

//     const filter = {
//       Mr_no: { $exists: true, $ne: null }
//     };

//     if (hospital_code) filter.hospital_code = hospital_code;
//     if (site_code) filter.site_code = site_code;
//     if (speciality) filter.speciality = speciality;
//     if (doctor_id && doctor_id !== 'all') {
//       filter['specialities.doctor_ids'] = doctor_id;
//     }

//     const now = new Date();
//     const maxDate = new Date();
//     maxDate.setDate(now.getDate() + 7);
//     //console.log(`🕒 Now: ${now.toISOString()}`);
//     //console.log(`📅 Max allowed appointment date (today + 7): ${maxDate.toISOString()}`);

//     const patients = await patientDataCollection.find(filter).toArray();
//     //console.log(`👥 Patients matched: ${patients.length}`);

//     let baselineCount = patients.length;
//     let followupCount = 0;

//     patients.forEach((p, idx) => {
//       const appointmentsBySpeciality = p.appointment_tracker || {};
//       for (const spec in appointmentsBySpeciality) {
//         const appointments = appointmentsBySpeciality[spec];
//         appointments.forEach(appt => {
//           const apptTime = new Date(appt.appointment_time);
//           if (isNaN(apptTime)) return;

//           const surveyType = (appt.surveyType || '').toLowerCase();
//           if (surveyType.includes('followup') && apptTime <= maxDate) {
//             followupCount++;
//             //console.log(`✅ Follow-up counted for Patient ${idx + 1} on ${apptTime.toISOString()}`);
//           }
//         });
//       }
//     });

//     const total = baselineCount + followupCount;
//     //console.log(`📊 Final survey count: ${total}`);

//     res.json({ count: total });

//   } catch (error) {
//     console.error('❌ Error fetching survey stats:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });





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
  { $unwind: "$appointment_tracker" }
];

if (speciality) {
  pipeline.push({ $match: { "appointment_tracker.k": speciality } });
}

pipeline.push(
  { $unwind: "$appointment_tracker.v" },
  { $match: { "appointment_tracker.v.surveyStatus": "Completed" } },
  {
    $group: {
      _id: null,
      totalCompletedSurveys: { $sum: 1 }
    }
  },
  { $project: { _id: 0, totalCompletedSurveys: 1 } }
);



    const result = await patientDataCollection.aggregate(pipeline).toArray();

    //res.json(result[0] || { totalCompletedSurveys: 0 });
    res.json({ count: result[0]?.totalCompletedSurveys || 0 });


  } catch (error) {
    console.error('Error fetching surveys completed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// router.get('/surveys/response-rate', async (req, res) => {
//   const { hospital_code, site_code, speciality, doctor_id } = req.query;

//   console.log('📥 Incoming Query:', req.query);

//   try {
//     // Step 1: Get total registered patients
//     const patientFilter = {
//       Mr_no: { $exists: true, $ne: null }
//     };

//     if (hospital_code) patientFilter.hospital_code = hospital_code;
//     if (site_code)     patientFilter.site_code     = site_code;
//     if (speciality)    patientFilter.speciality    = speciality;
//     if (doctor_id && doctor_id !== 'all') {
//       patientFilter['specialities.doctor_ids'] = doctor_id;
//     }

//     console.log('🔍 Patient Filter for Registered Patients:', JSON.stringify(patientFilter, null, 2));

//     const registeredPatientsResult = await patientDataCollection.aggregate([
//       { $match: patientFilter },
//       {
//         $group: {
//           _id: null,
//           uniquePatients: { $addToSet: "$Mr_no" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           totalRegisteredPatients: { $size: "$uniquePatients" }
//         }
//       }
//     ]).toArray();

//     const totalRegisteredPatients = registeredPatientsResult[0]?.totalRegisteredPatients || 0;
//     console.log('👥 Total Registered Patients:', totalRegisteredPatients);

//     // Step 2: Get completed surveys
//     const match = {};
//     if (hospital_code) match.hospital_code = hospital_code;
//     if (site_code)     match.site_code     = site_code;
//     if (speciality)    match.speciality    = speciality;
//     if (doctor_id && doctor_id !== 'all') {
//       match['specialities.doctor_ids'] = doctor_id;
//     }

//     console.log('🔍 Match Filter for Survey Completion:', JSON.stringify(match, null, 2));

//     const surveyPipeline = [
//       { $match: match },
//       { $project: { appointment_tracker: 1 } }
//     ];

//     const patients = await patientDataCollection.aggregate(surveyPipeline).toArray();
//     console.log('📄 Total Patients Fetched for Survey Check:', patients.length);

//     let completedSurveys = 0;

//     patients.forEach(patient => {
//     const trackers = patient.appointment_tracker || {};
    
//     if (speciality) {
//         // Count only this speciality's appointments
//         const tracker = trackers[speciality] || [];
//         tracker.forEach(appt => {
//         if (appt.surveyStatus === 'Completed') completedSurveys++;
//         });
//     } else {
//         // Count all specialties
//         Object.values(trackers).forEach(trackerArray => {
//         trackerArray.forEach(appt => {
//             if (appt.surveyStatus === 'Completed') completedSurveys++;
//         });
//         });
//     }
//     });


//     console.log('✅ Total Completed Surveys:', completedSurveys);

//     // Step 3: Calculate response rate
//     const responseRate = totalRegisteredPatients > 0
//       ? (completedSurveys / totalRegisteredPatients) * 100
//       : 0;

//     console.log('📊 Calculated Response Rate:', responseRate.toFixed(2), '%');

//     // Final response
//     res.json({
//       responseRate: typeof responseRate === 'number' ? parseFloat(responseRate.toFixed(2)) : 0
//     });

//   } catch (err) {
//     console.error('❌ Error in /survey-response-rate:', err);
//     res.status(500).json({ error: 'Error calculating survey response rate' });
//   }
// });

router.get('/surveys/response-rate', async (req, res) => {
  const { hospital_code, site_code, speciality, doctor_id } = req.query;
  //console.log('📥 Incoming Query:', req.query);

  try {
    const filter = {
      Mr_no: { $exists: true, $ne: null }
    };

    if (hospital_code) filter.hospital_code = hospital_code;
    if (site_code) filter.site_code = site_code;
    if (speciality) filter.speciality = speciality;
    if (doctor_id && doctor_id !== 'all') {
      filter['specialities.doctor_ids'] = doctor_id;
    }

    //console.log('🔍 Patient Filter:', JSON.stringify(filter, null, 2));

    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);
    //console.log(`🕒 Now: ${now.toISOString()}`);
    //console.log(`📅 Max allowed appointment date (today + 7): ${maxDate.toISOString()}`);

    const patients = await patientDataCollection.find(filter).toArray();
    //console.log(`👥 Total Matched Patients: ${patients.length}`);

    let totalSent = 0;
    let completedSurveys = 0;

    patients.forEach((patient, idx) => {
      const trackers = patient.appointment_tracker || {};
      const specKeys = speciality ? [speciality] : Object.keys(trackers);

      specKeys.forEach(spec => {
        const appointments = trackers[spec] || [];

        appointments.forEach(appt => {
          const apptTime = new Date(appt.appointment_time);
          const type = (appt.surveyType || '').toLowerCase();
          const status = appt.surveyStatus;

          // Count completed surveys regardless of type or date
          if (status === 'Completed') {
            completedSurveys++;
            //console.log(`✅ Survey Completed - Patient ${idx + 1}`);
          }

          // Count sent surveys according to your original logic
          if (type.includes('baseline')) {
            totalSent++;
          } else if (type.includes('followup') && apptTime <= maxDate) {
            totalSent++;
          }
        });
      });
    });

    const responseRate = totalSent > 0 ? (completedSurveys / totalSent) * 100 : 0;

    //console.log(`📦 Total Surveys Sent: ${totalSent}`);
    //console.log(`✅ Surveys Completed: ${completedSurveys}`);
    //console.log(`📊 Final Response Rate: ${responseRate.toFixed(2)}%`);

    res.json({
      responseRate: parseFloat(responseRate.toFixed(2))
    });

  } catch (err) {
    console.error('❌ Error calculating response rate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get(
  '/surveys/response-rate-by-specialty',
  async (req, res) => {
    const { hospital_code, site_code } = req.query;

    if (!hospital_code || !site_code) {
      return res
        .status(400)
        .json({ error: 'hospital_code and site_code are required' });
    }

    try {
      // 1) Fetch all specialties for this hospital/site from SurveysCollection
      //    (each doc has: { hospital_code, site_code, specialty, surveys: [...] })
      const specialsCursor = SurveysCollection.find(
        { hospital_code, site_code },
        { projection: { specialty: 1, _id: 0 } }
      );
      const specialsDocs = await specialsCursor.toArray();

      // Extract unique specialty names
      const specialties = [
        ...new Set(specialsDocs.map((doc) => doc.specialty)),
      ];

      // 2) Fetch all patients matching hospital_code & site_code
      //    Only need Mr_no, speciality, appointment_tracker fields
      const patientsCursor = patientDataCollection.find(
        { hospital_code, site_code },
        {
          projection: {
            Mr_no: 1,
            speciality: 1,
            appointment_tracker: 1,
            _id: 0,
          },
        }
      );
      const allPatients = await patientsCursor.toArray();

      // 3) For each specialty, count registered patients and completed surveys
      const results = specialties.map((specName) => {
        // Use a Set to dedupe registered patient MR numbers
        const registeredSet = new Set();
        let completedSurveys = 0;

        allPatients.forEach((patient) => {
          // A) Count this patient as "registered" if patient.speciality === specName
          if (patient.speciality === specName && patient.Mr_no) {
            registeredSet.add(patient.Mr_no);
          }

          // B) Count completed surveys under appointment_tracker[specName]
          //    appointment_tracker is an object where keys = specialty names,
          //    and values = array of appointment objects, e.g. { surveyStatus: 'Completed', ... }
          const trackers = patient.appointment_tracker || {};
          const arr = Array.isArray(trackers[specName])
            ? trackers[specName]
            : [];

          arr.forEach((appt) => {
            if (appt.surveyStatus === 'Completed') {
              completedSurveys++;
            }
          });
        });

        const totalRegistered = registeredSet.size;
        const responseRate =
          totalRegistered > 0
            ? (completedSurveys / totalRegistered) * 100
            : 0;

        return {
          label: specName,
          surveysSent: totalRegistered,
          surveysCompleted: completedSurveys,
          responseRate: parseFloat(responseRate.toFixed(2)),
        };
      });

      return res.json(results);
    } catch (err) {
      console.error(
        '❌ Error in /surveys/response-rate-by-specialty:',
        err
      );
      return res
        .status(500)
        .json({ error: 'Internal server error fetching by-specialty data' });
    }
  }
);


// router.get('/doctor-engagement', async (req, res) => {
//   try {
//     const { hospital_code, site_code } = req.query;

//     if (!hospital_code || !site_code) {
//       return res.status(400).json({ error: 'hospital_code and site_code are required' });
//     }

//     const doctors = await doctorsCollection.find({
//       hospital_code,
//       site_code
//     }).project({
//       doctor_id: 1,
//       fullName: 1,
//       loginTimestamps: 1,
//       viewMoreTimestamps: 1
//     }).toArray();

//     const engagementScores = doctors.map(doc => {
//       const loginCount = doc.loginTimestamps?.length || 0;
//       const viewMoreCount = doc.viewMoreTimestamps?.length || 0;
//       const engagementScore = loginCount + 0.5 * viewMoreCount;
//       return {
//         doctor_id: doc.doctor_id,
//         fullName: doc.fullName,
//         loginCount,
//         viewMoreCount,
//         engagementScore
//       };
//     });

//     const sorted = [...engagementScores].sort((a, b) => b.engagementScore - a.engagementScore);
//     const top5 = sorted.slice(0, 5);
//     const bottom5 = sorted.slice(-5);

//     res.json({ top5, bottom5 });
//   } catch (err) {
//     console.error('Error fetching doctor engagement:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

//before optimization
router.get('/doctor-engagement', async (req, res) => {
  const { hospital_code, site_code } = req.query;

  // Log the received query parameters
  console.log('Received query parameters:', { hospital_code, site_code });

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const doctors = await doctorsCollection
      .find({ hospital_code, site_code })
      .project({ doctor_id: 1, firstName: 1, lastName: 1, loginTimestamps: 1, viewMoreTimestamps: 1, createdAt: 1, _id: 1 })
      .toArray();

    // Log the number of doctors found
    console.log(`Found ${doctors.length} doctors for the given hospital and site codes.`);

    const now = new Date();
    const enriched = doctors.map(doc => {
      const loginCount = doc.loginTimestamps?.length || 0;
      const viewMoreCount = doc.viewMoreTimestamps?.length || 0;

      // Log login and viewMore counts
      console.log(`Doctor: ${doc.firstName} ${doc.lastName}`);
      console.log(`  loginCount: ${loginCount}, viewMoreCount: ${viewMoreCount}`);

      // Use createdAt if available, else fallback to ObjectId timestamp
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : doc._id.getTimestamp();
      console.log(`  created at: ${createdAt}`);
      const monthsActive = Math.max((now - createdAt) / (1000 * 60 * 60 * 24 * 30), 1); // Minimum 1 month

      const rawScore = loginCount + 0.5 * viewMoreCount;
      const engagementScore = rawScore / monthsActive;

      // Log the raw and engagement score for the doctor
      console.log(`  rawScore: ${rawScore}, engagementScore: ${engagementScore.toFixed(2)}`);

      return {
        name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
        loginCount,
        viewMoreCount,
        rawScore,
        engagementScore: Number(engagementScore.toFixed(2)),
        monthsActive: Number(monthsActive.toFixed(1)),
      };
    });

    // Sort doctors by engagement score in descending order
    const sorted = enriched.sort((a, b) => b.engagementScore - a.engagementScore);

    // Calculate percentiles
    const totalDoctors = sorted.length;
    const doctorsWithPercentiles = sorted.map((doc, index) => {
      //const percentile = ((index + 1) / totalDoctors) * 100;
      const percentile = 100 - (((index + 1) / totalDoctors) * 100)

      // Log percentile calculation for each doctor
      console.log(`Doctor: ${doc.name}, Percentile: ${percentile.toFixed(2)}`);
      return {
        ...doc,
        percentile: percentile.toFixed(2), // Percentile rank
      };
    });

    // Log the top 5 and bottom 5 doctors
    const top5 = doctorsWithPercentiles.slice(0, 5);
    const bottom5 = doctorsWithPercentiles.slice(-5);
    console.log('Top 5 doctors:', top5);
    console.log('Bottom 5 doctors:', bottom5);

    res.json({ top5, bottom5 });

  } catch (err) {
    console.error('❌ Error computing doctor engagement:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//after optimization
// router.get('/doctor-engagement', async (req, res) => {
//   const { hospital_code, site_code } = req.query;

//   // Log the received query parameters
//   console.log('Received query parameters:', { hospital_code, site_code });

//   if (!hospital_code || !site_code) {
//     return res.status(400).json({ error: 'hospital_code and site_code are required' });
//   }

//   try {
//     const doctors = await doctorsCollection
//       .find({ hospital_code, site_code })
//       .project({ doctor_id: 1, firstName: 1, lastName: 1, loginTimestamps: 1, viewMoreTimestamps: 1, createdAt: 1, _id: 1 })
//       .toArray();

//     // Log the number of doctors found
//     console.log(`Found ${doctors.length} doctors for the given hospital and site codes.`);

//     const now = new Date();
//     const enriched = doctors.map(doc => {
//       const loginCount = doc.loginTimestamps?.length || 0;
//       const viewMoreCount = doc.viewMoreTimestamps?.length || 0;

//       // Log login and viewMore counts
//       console.log(`Doctor: ${doc.firstName} ${doc.lastName}`);
//       console.log(`  loginCount: ${loginCount}, viewMoreCount: ${viewMoreCount}`);

//       // Use createdAt if available, else fallback to ObjectId timestamp
//       const createdAt = doc.createdAt ? new Date(doc.createdAt) : doc._id.getTimestamp();
//       console.log(`  created at: ${createdAt}`);
//       const monthsActive = Math.max((now - createdAt) / (1000 * 60 * 60 * 24 * 30), 1); // Minimum 1 month

//       const rawScore = loginCount + 0.5 * viewMoreCount;
//       const engagementScore = rawScore / monthsActive;

//       // Log the raw and engagement score for the doctor
//       console.log(`  rawScore: ${rawScore}, engagementScore: ${engagementScore.toFixed(2)}`);

//       return {
//         name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
//         loginCount,
//         viewMoreCount,
//         rawScore,
//         engagementScore: Number(engagementScore.toFixed(2)),
//         monthsActive: Number(monthsActive.toFixed(1)),
//       };
//     });

//     // Sort doctors by engagement score in descending order
//     const sorted = enriched.sort((a, b) => b.engagementScore - a.engagementScore);

//     // Calculate percentiles
//     const totalDoctors = sorted.length;
//     const doctorsWithPercentiles = sorted.map((doc, index) => {
//       //const percentile = ((index + 1) / totalDoctors) * 100;
//       const percentile = 100 - (((index + 1) / totalDoctors) * 100)

//       // Log percentile calculation for each doctor
//       console.log(`Doctor: ${doc.name}, Percentile: ${percentile.toFixed(2)}`);
//       return {
//         ...doc,
//         percentile: percentile.toFixed(2), // Percentile rank
//       };
//     });

//     // Log the top 5 and bottom 5 doctors
//     const top5 = doctorsWithPercentiles.slice(0, 5);
//     const bottom5 = doctorsWithPercentiles.slice(-5);
//     console.log('Top 5 doctors:', top5);
//     console.log('Bottom 5 doctors:', bottom5);

//     res.json({ top5, bottom5 });

//   } catch (err) {
//     console.error('❌ Error computing doctor engagement:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// router.get('/doctor-engagement', async (req, res) => {
//   const { hospital_code, site_code } = req.query;

//   if (!hospital_code || !site_code) {
//     return res.status(400).json({ error: 'hospital_code and site_code are required' });
//   }

//   try {
//     const doctors = await doctorsCollection
//       .find({ hospital_code, site_code })
//       .project({ doctor_id: 1, firstName: 1, lastName: 1, loginTimestamps: 1, viewMoreTimestamps: 1, createdAt: 1, _id: 1 })
//       .toArray();

//     const now = new Date();
//     const enriched = doctors.map(doc => {
//       const loginCount = doc.loginTimestamps?.length || 0;
//       const viewMoreCount = doc.viewMoreTimestamps?.length || 0;

//       // Use createdAt if available, else fallback to ObjectId timestamp
//       const createdAt = doc.createdAt ? new Date(doc.createdAt) : doc._id.getTimestamp();
//       const monthsActive = Math.max((now - createdAt) / (1000 * 60 * 60 * 24 * 30), 1); // Minimum 1 month

//       const rawScore = loginCount + 0.5 * viewMoreCount;
//       const engagementScore = rawScore / monthsActive;

//       return {
//         name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
//         loginCount,
//         viewMoreCount,
//         rawScore,
//         engagementScore: Number(engagementScore.toFixed(2)),
//         monthsActive: Number(monthsActive.toFixed(1)),
//       };
//     });

//     const sorted = enriched.sort((a, b) => b.engagementScore - a.engagementScore);
//     const top5 = sorted.slice(0, 5);
//     const bottom5 = sorted.slice(-5);

//     res.json({ top5, bottom5 });

//   } catch (err) {
//     console.error('❌ Error computing doctor engagement:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


router.get('/', (req, res) => {
  res.send('Hello from backend!');
});


router.get('/patient-gender-stats', async (req, res) => {
  const { hospital_code, site_code } = req.query;
  if (!hospital_code || !site_code) {
    console.warn('Missing required parameters: hospital_code or site_code');
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {

    const result = await patientDataCollection.aggregate([
  {
    $match: {
      hospital_code: hospital_code,
      site_code: site_code
    }
  },
  {
    $group: {
      _id: { $toLower: "$gender" },  // Normalize to lowercase
      count: { $sum: 1 }
    }
  }
]).toArray();


    const genderCounts = {
      male: 0,
      female: 0,
      unknown: 0
    };

    result.forEach(entry => {
      const gender = (entry._id || '').toLowerCase();

      if (gender === 'male') {
        genderCounts.male = entry.count;
      } else if (gender === 'female') {
        genderCounts.female = entry.count;
      } else {
        genderCounts.unknown += entry.count;
      }
    });

    res.json(genderCounts);
  } catch (error) {
    console.error('Error fetching gender data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//before optimization
// router.get('/patient-age-stats', async (req, res) => {
//   const { hospital_code, site_code } = req.query;
//   if (!hospital_code || !site_code) {
//     console.warn('Missing hospital_code or site_code in query');
//     return res.status(400).json({ error: 'hospital_code and site_code are required' });
//   }

//   try {
//     const now = new Date();

//     const patients = await patientDataCollection.find({
//       hospital_code,
//       site_code,
//       DOB: { $exists: true, $ne: null }
//     }, {
//       projection: { DOB: 1 }
//     }).toArray();

//     const ageBuckets = {
//       '0-18': 0,
//       '19-30': 0,
//       '31-45': 0,
//       '46-60': 0,
//       '61+': 0
//     };

//     patients.forEach(p => {
//       const dob = new Date(p.DOB);
//       if (isNaN(dob)) {
//         console.warn(`Invalid DOB found for patient:`, p);
//         return;
//       }

//       let age = now.getFullYear() - dob.getFullYear();
//       const m = now.getMonth() - dob.getMonth();
//       if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
//         age--;
//       }


//       if (age <= 18) ageBuckets['0-18']++;
//       else if (age <= 30) ageBuckets['19-30']++;
//       else if (age <= 45) ageBuckets['31-45']++;
//       else if (age <= 60) ageBuckets['46-60']++;
//       else ageBuckets['61+']++;
//     });

//     res.json(ageBuckets);
//   } catch (err) {
//     console.error('Error generating age distribution:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/patient-age-stats', async (req, res) => {
  const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const result = await patientDataCollection.aggregate([
      {
        $match: {
          hospital_code,
          site_code,
          DOB: { $exists: true, $ne: null }
        }
      },
      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: { $toDate: "$DOB" },
              endDate: "$$NOW",
              unit: "year"
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 19, 31, 46, 61, 200],
          default: "Unknown",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]).toArray();

    // Transform result into readable age groups
    const ageStats = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61+': 0
    };

    result.forEach(bucket => {
      switch (bucket._id) {
        case 0:
          ageStats['0-18'] = bucket.count;
          break;
        case 19:
          ageStats['19-30'] = bucket.count;
          break;
        case 31:
          ageStats['31-45'] = bucket.count;
          break;
        case 46:
          ageStats['46-60'] = bucket.count;
          break;
        case 61:
          ageStats['61+'] = bucket.count;
          break;
        default:
          break;
      }
    });

    res.json(ageStats);

  } catch (err) {
    console.error('Error generating age distribution:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/patient-city-stats', async (req, res) => {
  const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const result = await patientDataCollection.aggregate([
      {
        $match: {
          hospital_code,
          site_code,
          "additionalFields.city": { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$additionalFields.city",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const cityStats = result.map(entry => ({
      city: entry._id,
      count: entry.count
    }));

    res.json(cityStats);
  } catch (err) {
    console.error('Error fetching city stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/surveys/response-rate-by-age', async (req, res) => {
  const { hospital_code, site_code } = req.query;
  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);

    const ageBuckets = {
      '0 - 18': { sent: 0, completed: 0 },
      '19 - 30': { sent: 0, completed: 0 },
      '31 - 45': { sent: 0, completed: 0 },
      '46 - 60': { sent: 0, completed: 0 },
      '61+': { sent: 0, completed: 0 }
    };

    const patients = await patientDataCollection.find({
      hospital_code,
      site_code,
      DOB: { $exists: true, $ne: null }
    }).toArray();

    patients.forEach(p => {
      // Attempt parsing DOB in MM/dd/yyyy format (adjust if your format differs)
      const dob = parse(p.DOB, 'M/d/yyyy', new Date());
      if (!isValid(dob)) return;

      const age = differenceInYears(now, dob);

      const bucket = age <= 18 ? '0 - 18'
                  : age <= 30 ? '19 - 30'
                  : age <= 45 ? '31 - 45'
                  : age <= 60 ? '46 - 60'
                  : '61+';

      const appointments = Object.values(p.appointment_tracker || {}).flat();

      appointments.forEach(appt => {
        const surveyType = (appt.surveyType || '').toLowerCase();
        const apptTime = new Date(appt.appointment_time);

        if (surveyType.includes('baseline')) {
          // Count all baseline surveys
          ageBuckets[bucket].sent++;
          if (appt.surveyStatus === 'Completed') {
            ageBuckets[bucket].completed++;
          }
        } else if (surveyType.includes('followup')) {
          // Count followups only if appointment_time is within today + 7 days
          if (apptTime <= maxDate && apptTime >= now) {
            ageBuckets[bucket].sent++;
            if (appt.surveyStatus === 'Completed') {
              ageBuckets[bucket].completed++;
            }
          }
        }
      });
    });

    const result = Object.entries(ageBuckets).map(([range, { sent, completed }]) => ({
      label: range,
      responseRate: sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0
    }));
       console.log('Final response rate by age:', result);

    res.json(result);
  } catch (err) {
    console.error('Error calculating age-based response rate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/surveys/response-rate-by-provider', async (req, res) => {
  const { hospital_code, site_code, doctor_id } = req.query;
  if (!hospital_code || !site_code) {
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);

    // Build filter with optional doctor_id
    const filter = {
      hospital_code,
      site_code,
      "additionalFields.primary_provider_name": { $exists: true, $ne: "" }
    };
    if (doctor_id && doctor_id !== 'all') {
      filter['specialities.doctor_ids'] = doctor_id;
    }

    const patients = await patientDataCollection.find(filter).toArray();

    const providerMap = {};

    patients.forEach(p => {
      let providerRaw = p.additionalFields?.primary_provider_name || 'Unknown';
      // Normalize provider name
      const provider = providerRaw.trim().toLowerCase();

      if (!providerMap[provider]) {
        providerMap[provider] = { sent: 0, completed: 0 };
      }

      const appointments = Object.values(p.appointment_tracker || {}).flat();

      appointments.forEach(appt => {
        const surveyType = (appt.surveyType || '').toLowerCase();
        const apptTime = new Date(appt.appointment_time);

        if (surveyType.includes('baseline')) {
          // Baseline always counted
          providerMap[provider].sent++;
          if (appt.surveyStatus === 'Completed') {
            providerMap[provider].completed++;
          }
        } else if (surveyType.includes('followup')) {
          // Followup only counted if appointment_time between now and maxDate
          if (apptTime >= now && apptTime <= maxDate) {
            providerMap[provider].sent++;
            if (appt.surveyStatus === 'Completed') {
              providerMap[provider].completed++;
            }
          }
        }
      });
    });

    // Capitalize provider names for response (optional)
    const result = Object.entries(providerMap).map(([provider, { sent, completed }]) => ({
      provider: provider.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      responseRate: sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0
    }));

    res.json(result);

  } catch (err) {
    console.error('Error calculating provider response rate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/surveys/response-rate-by-survey', async (req, res) => {
  const { hospital_code, site_code } = req.query;

  if (!hospital_code || !site_code) {
    console.warn('❌ Missing required query params: hospital_code or site_code');
    return res.status(400).json({ error: 'hospital_code and site_code are required' });
  }

  try {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);

    console.log(`📍 Survey Response Rate by Survey`);
    console.log(`📅 Now: ${now.toISOString()}, +7 Day Limit: ${maxDate.toISOString()}`);
    console.log(`🔍 Filter: { hospital_code: ${hospital_code}, site_code: ${site_code} }`);

    const patients = await patientDataCollection.find({
      hospital_code,
      site_code
    }).toArray();

    console.log(`👥 Total Patients Fetched: ${patients.length}`);

    const surveyMap = {};

    patients.forEach((p, i) => {
      const appointments = Object.values(p.appointment_tracker || {}).flat();

      appointments.forEach(appt => {
        const apptTime = new Date(appt.appointment_time);
        const surveyType = (appt.surveyType || '').toLowerCase();
        const surveyStatus = appt.surveyStatus;
        const patientLogPrefix = `👤 Patient ${i + 1}`;

        const isBaseline = surveyType.includes('baseline');
        const isFollowupInRange = surveyType.includes('followup') && apptTime <= maxDate;

        if (isBaseline || isFollowupInRange) {
          const surveyNames = Array.isArray(appt.survey_name) ? appt.survey_name : [appt.survey_name];

          surveyNames.forEach(name => {
            if (!name) return;

            if (!surveyMap[name]) {
              surveyMap[name] = { sent: 0, completed: 0 };
            }

            surveyMap[name].sent++;
            if (surveyStatus === 'Completed') {
              surveyMap[name].completed++;
              console.log(`${patientLogPrefix} ➕ Completed Survey "${name}" [${surveyType}]`);
            } else {
              console.log(`${patientLogPrefix} ➖ Sent Survey "${name}" [${surveyType}]`);
            }
          });
        }
      });
    });

    const result = Object.entries(surveyMap).map(([surveyName, { sent, completed }]) => {
      const rate = sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0;
      console.log(`📊 Survey: "${surveyName}" | Sent: ${sent}, Completed: ${completed}, Response Rate: ${rate}%`);
      return { label: surveyName, responseRate: rate };
    });

    console.log('✅ Final Survey Response Rate by Survey:', result);

    res.json(result);
  } catch (err) {
    console.error('❌ Error calculating survey response rate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//before optimization
// router.get('/response-rate', async (req, res) => {
//   const { hospital_code, site_code, filter_by, doctor_id } = req.query;

//   console.log('📥 Incoming request:', { hospital_code, site_code, filter_by, doctor_id });

//   if (!hospital_code || !site_code || !filter_by) {
//     console.warn('⚠️ Missing required query parameters');
//     return res.status(400).json({
//       error: 'hospital_code, site_code and filter_by are required',
//     });
//   }

//   try {
//     const now = new Date();
//     const maxDate = new Date();
//     maxDate.setDate(now.getDate() + 7);

//     console.log('🕒 Time range:', { now, maxDate });

//     const patients = await patientDataCollection.find({
//       hospital_code,
//       site_code,
//     }).toArray();

//     console.log(`🧾 Fetched ${patients.length} patients`);

//     if (filter_by === 'survey') {
//       const surveyMap = {};
//       console.log('🔍 Filtering by survey');

//       patients.forEach((p, i) => {
//         const appointments = Object.values(p.appointment_tracker || {}).flat();
//         appointments.forEach(appt => {
//           const apptTime = new Date(appt.appointment_time);
//           const surveyType = (appt.surveyType || '').toLowerCase();
//           const surveyStatus = appt.surveyStatus;
//           const isBaseline = surveyType.includes('baseline');
//           const isFollowupInRange = surveyType.includes('followup') && apptTime <= maxDate;

//           if (isBaseline || isFollowupInRange) {
//             const surveyNames = Array.isArray(appt.survey_name) ? appt.survey_name : [appt.survey_name];

//             surveyNames.forEach(name => {
//               if (!name) return;
//               if (!surveyMap[name]) surveyMap[name] = { sent: 0, completed: 0 };

//               surveyMap[name].sent++;
//               if (surveyStatus === 'Completed') surveyMap[name].completed++;
//             });
//           }
//         });
//       });

//       console.log('📊 Survey Map:', surveyMap);

//       const result = Object.entries(surveyMap).map(([surveyName, { sent, completed }]) => ({
//         label: surveyName,
//         responseRate: sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0
//       }));

//       console.log('✅ Survey filter result:', result);
//       return res.json(result);
//     }

//     else if (filter_by === 'age') {
//       console.log('🔍 Filtering by age');
//       const { parse, isValid, differenceInYears } = require('date-fns');
//       const ageBuckets = {
//         '0 - 18': { sent: 0, completed: 0 },
//         '19 - 30': { sent: 0, completed: 0 },
//         '31 - 45': { sent: 0, completed: 0 },
//         '46 - 60': { sent: 0, completed: 0 },
//         '61+': { sent: 0, completed: 0 }
//       };

//       patients.forEach(p => {
//         const dob = parse(p.DOB, 'M/d/yyyy', new Date());
//         if (!isValid(dob)) return;

//         const age = differenceInYears(now, dob);
//         const bucket = age <= 18 ? '0 - 18' : age <= 30 ? '19 - 30' : age <= 45 ? '31 - 45' : age <= 60 ? '46 - 60' : '61+';

//         const appointments = Object.values(p.appointment_tracker || {}).flat();
//         appointments.forEach(appt => {
//           const surveyType = (appt.surveyType || '').toLowerCase();
//           const apptTime = new Date(appt.appointment_time);
//           if (surveyType.includes('baseline') || (surveyType.includes('followup') && apptTime <= maxDate && apptTime >= now)) {
//             ageBuckets[bucket].sent++;
//             if (appt.surveyStatus === 'Completed') ageBuckets[bucket].completed++;
//           }
//         });
//       });

//       console.log('📊 Age Buckets:', ageBuckets);

//       const result = Object.entries(ageBuckets).map(([range, { sent, completed }]) => ({
//         label: range,
//         responseRate: sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0
//       }));

//       console.log('✅ Age filter result:', result);
//       return res.json(result);
//     }

//     else if (filter_by === 'provider') {
//       console.log('🔍 Filtering by provider');

//       const providerMap = {};
//       const filteredPatients = doctor_id && doctor_id !== 'all'
//         ? patients.filter(p => p.specialities?.doctor_ids?.includes(doctor_id))
//         : patients;

//       console.log(`👨‍⚕️ Provider filter applied. Patients after filter: ${filteredPatients.length}`);

//       filteredPatients.forEach(p => {
//         const providerRaw = p.additionalFields?.primary_provider_name || 'Unknown';
//         const provider = providerRaw.trim().toLowerCase();

//         if (!providerMap[provider]) providerMap[provider] = { sent: 0, completed: 0 };

//         const appointments = Object.values(p.appointment_tracker || {}).flat();
//         appointments.forEach(appt => {
//           const surveyType = (appt.surveyType || '').toLowerCase();
//           const apptTime = new Date(appt.appointment_time);

//           if (surveyType.includes('baseline') || (surveyType.includes('followup') && apptTime >= now && apptTime <= maxDate)) {
//             providerMap[provider].sent++;
//             if (appt.surveyStatus === 'Completed') providerMap[provider].completed++;
//           }
//         });
//       });

//       console.log('📊 Provider Map:', providerMap);

//       const result = Object.entries(providerMap).map(([provider, { sent, completed }]) => ({
//         label: provider.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
//         responseRate: sent > 0 ? parseFloat(((completed / sent) * 100).toFixed(2)) : 0
//       }));

//       console.log('✅ Provider filter result:', result);
//       return res.json(result);
//     }

//     else if (filter_by === 'specialty') {
//       console.log('🔍 Filtering by specialty');

//       const specialtyDocs = await SurveysCollection.find(
//         { hospital_code, site_code },
//         { projection: { specialty: 1, _id: 0 } }
//       ).toArray();

//       const specialties = [...new Set(specialtyDocs.map(doc => doc.specialty))];

//       console.log('📚 Specialties found:', specialties);

//       const results = specialties.map((specName) => {
//         const registeredSet = new Set();
//         let completedSurveys = 0;

//         patients.forEach(patient => {
//           if (patient.speciality === specName && patient.Mr_no) {
//             registeredSet.add(patient.Mr_no);
//           }

//           const trackers = patient.appointment_tracker || {};
//           const arr = Array.isArray(trackers[specName]) ? trackers[specName] : [];
//           arr.forEach(appt => {
//             if (appt.surveyStatus === 'Completed') completedSurveys++;
//           });
//         });

//         const totalRegistered = registeredSet.size;
//         const responseRate = totalRegistered > 0 ? (completedSurveys / totalRegistered) * 100 : 0;

//         return {
//           label: specName,
//           responseRate: parseFloat(responseRate.toFixed(2))
//         };
//       });

//       console.log('✅ Specialty filter result:', results);
//       return res.json(results);
//     }

//     console.warn('⚠️ Invalid filter_by value');
//     return res.status(400).json({ error: 'Invalid filter_by value' });

//   } catch (err) {
//     console.error('❌ Error in unified response-rate route:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });


router.get('/response-rate', async (req, res) => {
  const { hospital_code, site_code, filter_by, doctor_id } = req.query;

  if (!hospital_code || !site_code || !filter_by)
    return res.status(400).json({ error: 'hospital_code, site_code and filter_by are required' });

  // Base $match used by every pipeline
  const matchStage = {
    $match: {
      hospital_code,
      site_code,
      ...(doctor_id && doctor_id !== 'all'
        ? { 'specialities.doctor_ids': doctor_id }
        : {})
    }
  };

  // Helper to flatten appointment_tracker -> 1 array
  const flattenAppointments = {
    $project: {
      appointments: {
        $reduce: {
          input: { $objectToArray: '$appointment_tracker' },
          initialValue: [],
          in: { $concatArrays: ['$$value', '$$this.v'] }
        }
      },
      DOB: 1,
      additionalFields: 1,
      speciality: 1
    }
  };

  const now    = new Date();
  const max7d  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  /** ----------  PIPELINES PER FILTER  ---------- **/

  /** 1) By survey name */
  const pipelineSurvey = [
    matchStage,
    flattenAppointments,
    { $unwind: '$appointments' },
    {
      $set: {
        surveyName : { $ifNull: [ '$appointments.survey_name', 'Unknown' ] },
        surveyType : { $toLower: '$appointments.surveyType' },
        apptTime   : { $toDate: '$appointments.appointment_time' },
        completed  : { $eq: [ '$appointments.surveyStatus', 'Completed' ] }
      }
    },
    {
      $match: {
        $or: [
          { surveyType: /baseline/ },
          { $and: [ { surveyType: /followup/ }, { apptTime: { $lte: max7d } } ] }
        ]
      }
    },
    {
      $group: {
        _id: '$surveyName',
        sent      : { $sum: 1 },
        completed : { $sum: { $cond: [ '$completed', 1, 0 ] } }
      }
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        responseRate: {
          $cond: [
            { $gt: ['$sent', 0] },
            { $round: [{ $multiply: [{ $divide: ['$completed', '$sent'] }, 100] }, 2] },
            0
          ]
        }
      }
    }
  ];

  /** 2) By age bucket */
  const pipelineAge = [
    matchStage,
    flattenAppointments,
    { $unwind: '$appointments' },
    {
      $set: {
        age: {
          $dateDiff: { startDate: { $toDate: '$DOB' }, endDate: '$$NOW', unit: 'year' }
        },
        surveyType: { $toLower: '$appointments.surveyType' },
        apptTime  : { $toDate: '$appointments.appointment_time' },
        completed : { $eq: [ '$appointments.surveyStatus', 'Completed' ] }
      }
    },
    {
      $match: {
        $or: [
          { surveyType: /baseline/ },
          {
            $and: [ { surveyType: /followup/ }, { apptTime: { $gte: now, $lte: max7d } } ]
          }
        ]
      }
    },
    {
      $bucket: {
        groupBy   : '$age',
        boundaries: [0, 19, 31, 46, 61, 200],
        default   : 'Unknown',
        output    : {
          sent      : { $sum: 1 },
          completed : { $sum: { $cond: [ '$completed', 1, 0 ] } }
        },
        labels    : ['0 - 18', '19 - 30', '31 - 45', '46 - 60', '61+']
      }
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        responseRate: {
          $cond: [
            { $gt: ['$sent', 0] },
            { $round: [{ $multiply: [{ $divide: ['$completed', '$sent'] }, 100] }, 2] },
            0
          ]
        }
      }
    }
  ];

  /** 3) By provider */
  const pipelineProvider = [
    matchStage,
    flattenAppointments,
    { $unwind: '$appointments' },
    {
      $set: {
        provider  : {
          $toLower: {
            $trim: { input: '$additionalFields.primary_provider_name', chars: ' ' }
          }
        },
        surveyType: { $toLower: '$appointments.surveyType' },
        apptTime  : { $toDate: '$appointments.appointment_time' },
        completed : { $eq: [ '$appointments.surveyStatus', 'Completed' ] }
      }
    },
    {
      $match: {
        $or: [
          { surveyType: /baseline/ },
          {
            $and: [ { surveyType: /followup/ }, { apptTime: { $gte: now, $lte: max7d } } ]
          }
        ]
      }
    },
    {
      $group: {
        _id       : '$provider',
        sent      : { $sum: 1 },
        completed : { $sum: { $cond: [ '$completed', 1, 0 ] } }
      }
    },
    {
      $project: {
        _id: 0,
        label: {
          $cond: [
            { $eq: ['$_id', ''] },
            'Unknown',
            { $toTitleCase: '$_id' } // helper—see below
          ]
        },
        responseRate: {
          $cond: [
            { $gt: ['$sent', 0] },
            { $round: [{ $multiply: [{ $divide: ['$completed', '$sent'] }, 100] }, 2] },
            0
          ]
        }
      }
    }
  ];

  /** 4) By specialty */
  const specialtyDocs   = await SurveysCollection
    .find({ hospital_code, site_code }, { projection: { specialty: 1, _id: 0 } })
    .toArray();
  const specialtiesList = [...new Set(specialtyDocs.map(d => d.specialty))];

  const pipelineSpecialty = [
    matchStage,
    flattenAppointments,
    { $match: { speciality: { $in: specialtiesList } } },
    {
      $addFields: {
        completedCount: {
          $size: {
            $filter: {
              input: '$appointments',
              as: 'appt',
              cond: { $eq: ['$$appt.surveyStatus', 'Completed'] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id      : '$speciality',
        registered: { $addToSet: '$Mr_no' },
        completed : { $sum: '$completedCount' }
      }
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        responseRate: {
          $cond: [
            { $gt: [{ $size: '$registered' }, 0] },
            {
              $round: [
                { $multiply: [{ $divide: ['$completed', { $size: '$registered' }] }, 100] },
                2
              ]
            },
            0
          ]
        }
      }
    }
  ];

  /** ----------  EXECUTE CORRECT PIPELINE  ---------- **/

  const pipelineMap = {
    survey   : pipelineSurvey,
    age      : pipelineAge,
    provider : pipelineProvider,
    specialty: pipelineSpecialty
  };

  const pipeline = pipelineMap[filter_by];
  if (!pipeline) return res.status(400).json({ error: 'Invalid filter_by value' });

  try {
    const data = await patientDataCollection.aggregate(pipeline).toArray();
    return res.json(data);
  } catch (err) {
    console.error('❌ Response-rate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;