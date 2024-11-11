const express = require('express');
const path = require('path'); // Add this line to import the path module
// Load environment variables from .env file
require('dotenv').config();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const flash = require('connect-flash');
const session = require('express-session');
const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Response</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .message {
                    text-align: center;
                    font-size: 36px;
                }
            </style>
        </head>
        <body>
            <div class="message">
                Thanks for Submitting!
            </div>
        </body>
        </html>
    `;
const app = express();
// const PORT = 3088;
const PORT = process.env.PORT;
const crypto = require('crypto');

// Define the new base path
const basePath = '/patientsurveys';
app.locals.basePath = basePath;

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// // Set up express-session middleware
// app.use(session({
//   secret: 'your_secret_key', // Replace with your own secret key
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false } // Set to true if using HTTPS
// }));
// Set up express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use session secret from .env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


// Initialize flash messages
app.use(flash());


// Connection URI
const uri = 'mongodb://admin:klmnqwaszx@10.154.0.3:27017'; // Change this URI according to your MongoDB setup

// app.use(express.static(path.join(__dirname, 'public')));

app.use(basePath, express.static(path.join(__dirname, 'public')));

// Database Name
const dbName = 'Data_Entry_Incoming'; // Change this to your actual database name

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Add more options as needed
};

// Function to connect to the MongoDB database
async function connectToDatabase() {
  let client;
  try {
    // Create a new MongoClient
    client = new MongoClient(uri, options);

    // Connect the client to the server
    await client.connect();

    console.log("Connected successfully to MongoDB server");

    // Specify the database you want to use
    const db = client.db(dbName);

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// const uri1 = 'mongodb://localhost:27017/Data_Entry_Incoming';
// const uri3 = 'mongodb://localhost:27017/manage_doctors';
// MongoDB Connection URIs
const uri1 = process.env.DB_URI1; // Use URI1 from .env
const uri3 = process.env.DB_URI3; // Use URI3 from .env

let db1, db2, db3;

    // // Connect to the first database
    // const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
    // client1.connect();
    // db1 = client1.db('Data_Entry_Incoming');
    // console.log('Connected to Data_Entry_Incoming database');

    // Connect to the first database
const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
client1.connect();
db1 = client1.db(process.env.DB_NAME);  // Use DB_NAME from .env
console.log('Connected to Data_Entry_Incoming database');


     // Connect to the third database
     const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
     client3.connect();
     db3 = client3.db('manage_doctors');
     console.log('Connected to manage_doctors database');


    //  async function connectToThirdDatabase() {
    //   let client;
    //   try {
    //     // Create a new MongoClient
    //     client = new MongoClient(uri3, options);
    
    //     // Connect the client to the server
    //     await client.connect();
    
    //     console.log("Connected successfully to third database");
    
    //     // Specify the database you want to use
    //     const db = client.db('manage_doctors');
    
    //     return db;
    //   } catch (error) {
    //     console.error("Error connecting to third database:", error);
    //     throw error;
    //   }
    // }

  
// Function to connect to the MongoDB database
async function connectToThirdDatabase() {
  let client;
  try {
      // Create a new MongoClient
      client = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });

      // Connect the client to the server
      await client.connect();

      console.log("Connected successfully to third database");

      // Specify the database you want to use
      const db = client.db('manage_doctors');

      return db;
  } catch (error) {
      console.error("Error connecting to third database:", error);
      throw error;
  }
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Create an Express Router
const router = express.Router();

router.get('/', (req, res) => {
  const flashMessage = req.flash('error'); // Retrieve flash messages
  res.render('search', { flashMessage }); // Pass the flash message to the view
});





// router.get('/search', async (req, res) => {
//   const { identifier } = req.query;
//   const flashMessage = req.flash('error'); // Retrieve flash messages

//   try {
//       const db = await connectToDatabase(); // Establish connection to the MongoDB database
//       const collection = db.collection('patient_data');

//       // Attempt to find the patient by either hashed or plain MR number or phone number
//       const hashedIdentifier = hashMrNo(identifier);
//       const patient = await collection.findOne({
//           $or: [
//               { Mr_no: identifier }, 
//               { phoneNumber: identifier },
//               { hashedMrNo: identifier }, 
//               { hashedMrNo: hashedIdentifier }
//           ]
//       });

//       if (!patient) {
//           req.flash('error', 'Patient not found'); // Set flash message
//           return res.redirect(basePath+'/'); // Redirect to the search page
//       }

//       // Check if appointmentFinished is present or absent
//       const showTerms = !patient.appointmentFinished; // If appointmentFinished is absent, show terms
//       const appointmentFinished = patient.appointmentFinished; // Add the appointmentFinished value

//       // Render the dob-validation view with the patient's MR number, DOB, and showTerms flag
//       res.render('dob-validation', { Mr_no: patient.Mr_no, DOB: patient.DOB, showTerms, appointmentFinished });
//   } catch (error) {
//       console.error(error);
//       req.flash('error', 'Internal server error'); // Set flash message
//       res.redirect(basePath+'/'); // Redirect to the search page
//   }
// });



// router.get('/details', async (req, res) => {
//   const { Mr_no, DOB, lang = 'en' } = req.query; // Add lang parameter with a default value of 'en'

//   // Function to validate DOB format (MM/DD/YYYY)
//   const isValidDOB = (dob) => {
//     const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;
//     return dobRegex.test(dob);
//   };

//   // Validate DOB format
//   if (!isValidDOB(DOB)) {
//     return res.status(400).send('Invalid DOB format. Please enter DOB in MM/DD/YYYY format.');
//   }

//   try {
//     // Connect to the first database (patient_data)
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');
    
//     // Find patient data based on Mr_no
//     const patient = await collection.findOne({ Mr_no });

//     if (!patient || patient.DOB !== DOB) {
//       return res.status(404).send('Patient not found');
//     }

//     // Set appointmentFinished to 1, creating the field if it doesn't exist
//     await collection.updateOne(
//       { Mr_no },
//       { $set: { appointmentFinished: 1 } }
//     );

//     // Clear all survey completion times if surveyStatus is 'Completed'
//     if (patient.surveyStatus === 'Completed') {
//       const updates = {};
//       ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ_UI_SF', 'EPDS'].forEach(survey => {
//         updates[`${survey}_completionDate`] = "";
//       });

//       // Remove customSurveyTimeCompletion field as well
//       updates['customSurveyTimeCompletion'] = "";

//       await collection.updateOne(
//         { Mr_no },
//         { $unset: updates }
//       );
//     }

//     // Fetch survey data from the third database based on patient's specialty, hospital_code, and site_code
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     // Use the custom array from the third database, or handle if surveyData is null
//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Check survey completion dates for the surveys in the custom array
//     const today = new Date();
//     const completedSurveys = {};

//     customSurveyNames.forEach(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       if (patient[completionDateField]) {
//         const completionDate = new Date(patient[completionDateField]);
//         const daysDifference = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
//         completedSurveys[survey] = daysDifference <= 30; // Completed if within 30 days
//       }
//     });

//     // Render the details view regardless of the presence of custom surveys
//     res.render('details', { 
//       Mr_no, 
//       patient, 
//       surveyName: customSurveyNames, // Pass custom survey names to the view
//       completedSurveys, 
//       currentLang: lang // Pass current language to the view for multi-language support
//     });
    
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send('Internal server error');
//   }
// });


// const getSurveyUrls = async (patient, lang) => {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // If no survey names are found, redirect to port 8080
//   if (customSurveyNames.length === 0) {
//       return [`http://localhost:8080?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Generate survey URLs in the order specified in `custom`
//   return customSurveyNames
//       .filter(survey => {
//           if (survey === 'PROMIS-10_d') {
//               return !patient['PROMIS-10_completionDate'];
//           }
//           return !patient[`${survey}_completionDate`];
//       })
//       .map(survey => `${basePath}/${survey}?Mr_no=${patient.Mr_no}&lang=${lang}`);
// };

// router.get('/details', async (req, res) => {
//   // let { Mr_no, DOB, lang = 'en' } = req.query; // Add lang parameter with a default value of 'en'
//   let { Mr_no, lang = 'en' } = req.query;

//   // Function to validate DOB format (MM/DD/YYYY)
//   const isValidDOB = (dob) => {
//     const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;
//     return dobRegex.test(dob);
//   };

//   // Validate DOB format
//   if (!isValidDOB(DOB)) {
//     return res.status(400).send('Invalid DOB format. Please enter DOB in MM/DD/YYYY format.');
//   }

//   try {
//     // Connect to the first database (patient_data)
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');

//     // Find patient data based on Mr_no or hashedMrNo
//     const patient = await collection.findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient || patient.DOB !== DOB) {
//       return res.status(404).send('Patient not found');
//     }

//     // Set appointmentFinished to 1, creating the field if it doesn't exist
//     await collection.updateOne(
//       { Mr_no: patient.Mr_no },
//       { $set: { appointmentFinished: 1 } }
//     );

//     // Clear all survey completion times if surveyStatus is 'Completed'
//     if (patient.surveyStatus === 'Completed') {
//       const updates = {};
//       ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ_UI_SF', 'EPDS'].forEach(survey => {
//         updates[`${survey}_completionDate`] = "";
//       });

//       // Remove customSurveyTimeCompletion field as well
//       updates['customSurveyTimeCompletion'] = "";

//       await collection.updateOne(
//         { Mr_no: patient.Mr_no },
//         { $unset: updates }
//       );
//     }

//     // Fetch survey data from the third database based on patient's specialty, hospital_code, and site_code
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     // Use the custom array from the third database, or handle if surveyData is null
//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Check survey completion dates for the surveys in the custom array
//     const today = new Date();
//     const completedSurveys = {};

//     customSurveyNames.forEach(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       if (patient[completionDateField]) {
//         const completionDate = new Date(patient[completionDateField]);
//         const daysDifference = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
//         completedSurveys[survey] = daysDifference <= 30; // Completed if within 30 days
//       }
//     });

//     // Determine the MR number to use in the URL
//     const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

//     // Render the details view regardless of the presence of custom surveys
//     res.render('details', {
//       Mr_no: mrNoToUse, // Use masked Mr_no if available
//       patient,
//       surveyName: customSurveyNames, // Pass custom survey names to the view
//       completedSurveys,
//       currentLang: lang // Pass current language to the view for multi-language support
//     });

//   } catch (error) {
//     console.error('Error fetching patient data or survey data:', error);
//     return res.status(500).send('Internal server error');
//   }
// });


router.get('/search', async (req, res) => {
  const { identifier } = req.query;
  const flashMessage = req.flash('error'); // Retrieve flash messages

  try {
      const db = await connectToDatabase(); // Establish connection to the MongoDB database
      const collection = db.collection('patient_data');

      // Find the patient by plain MR number or phone number
      const patient = await collection.findOne({
          $or: [
              { Mr_no: identifier },
              { phoneNumber: identifier }
          ]
      });

      if (!patient) {
          req.flash('error', 'Patient not found'); // Set flash message
          return res.redirect(basePath + '/'); // Redirect to the search page
      }

      // Use hashedMrNo for all further references
      const hashedMrNo = patient.hashedMrNo;

      // Check if appointmentFinished is present or absent
      const showTerms = !patient.appointmentFinished; // If appointmentFinished is absent, show terms
      const appointmentFinished = patient.appointmentFinished; // Add the appointmentFinished value

      // Redirect to `dob-validation` page with `hashMrNo` in the URL
      res.redirect(`${basePath}/dob-validation?identifier=${hashedMrNo}`);
  } catch (error) {
      console.error(error);
      req.flash('error', 'Internal server error'); // Set flash message
      res.redirect(basePath + '/'); // Redirect to the search page
  }
});

router.get('/dob-validation', async (req, res) => {
  const { identifier } = req.query; // `identifier` now holds `hashMrNo`
  const flashMessage = req.flash('error'); // Retrieve flash messages

  try {
      const db = await connectToDatabase();
      const collection = db.collection('patient_data');

      // Retrieve patient using `hashMrNo`
      const patient = await collection.findOne({ hashedMrNo: identifier });

      if (!patient) {
          req.flash('error', 'Patient not found'); // Set flash message
          return res.redirect(basePath + '/'); // Redirect to the search page
      }

      // Check if appointmentFinished is present or absent
      const showTerms = !patient.appointmentFinished;
      const appointmentFinished = patient.appointmentFinished;

      // Render the dob-validation view with the patient's data
      res.render('dob-validation', {
          Mr_no: patient.Mr_no,
          DOB: patient.DOB,
          showTerms,
          appointmentFinished
      });
  } catch (error) {
      console.error(error);
      req.flash('error', 'Internal server error'); // Set flash message
      res.redirect(basePath + '/'); // Redirect to the search page
  }
});


router.get('/details', async (req, res) => {
  let { Mr_no, lang = 'en' } = req.query; // Only keep Mr_no and lang

  try {
    // Connect to the first database (patient_data)
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Find patient data based on Mr_no or hashedMrNo
    const patient = await collection.findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Set appointmentFinished to 1, creating the field if it doesn't exist
    await collection.updateOne(
      { Mr_no: patient.Mr_no },
      { $set: { appointmentFinished: 1 } }
    );

    // Clear all survey completion times if surveyStatus is 'Completed'
    if (patient.surveyStatus === 'Completed') {
      const updates = {};
      ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ_UI_SF', 'EPDS'].forEach(survey => {
        updates[`${survey}_completionDate`] = "";
      });

      // Remove customSurveyTimeCompletion field as well
      updates['customSurveyTimeCompletion'] = "";

      await collection.updateOne(
        { Mr_no: patient.Mr_no },
        { $unset: updates }
      );
    }

    // Fetch survey data from the third database based on patient's specialty, hospital_code, and site_code
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    // Use the custom array from the third database, or handle if surveyData is null
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Check survey completion dates for the surveys in the custom array
    const today = new Date();
    const completedSurveys = {};

    customSurveyNames.forEach(survey => {
      const completionDateField = `${survey}_completionDate`;
      if (patient[completionDateField]) {
        const completionDate = new Date(patient[completionDateField]);
        const daysDifference = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
        completedSurveys[survey] = daysDifference <= 30; // Completed if within 30 days
      }
    });

    // Determine the MR number to use in the URL
    const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

    // Render the details view regardless of the presence of custom surveys
    res.render('details', {
      Mr_no: mrNoToUse, // Use masked Mr_no if available
      patient,
      surveyName: customSurveyNames, // Pass custom survey names to the view
      completedSurveys,
      currentLang: lang // Pass current language to the view for multi-language support
    });

  } catch (error) {
    console.error('Error fetching patient data or survey data:', error);
    return res.status(500).send('Internal server error');
  }
});


// const getSurveyUrls = async (patient, lang) => {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // If no survey names are found, redirect to port 8080 with hashedMrNo if it exists
//   if (customSurveyNames.length === 0) {
//       const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
//       return [`http://localhost:8080?mr_no=${mrNoToUse}&lang=${lang}`];
//   }

//   // Generate survey URLs in the order specified in `custom`
//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no; // Use hashedMrNo if available

//   return customSurveyNames
//       .filter(survey => {
//           if (survey === 'PROMIS-10_d') {
//               return !patient['PROMIS-10_completionDate'];
//           }
//           return !patient[`${survey}_completionDate`];
//       })
//       .map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
// };



// router.get('/start-surveys', async (req, res) => {
//   const { Mr_no, DOB, lang } = req.query;
//   try {
//       const db = await connectToDatabase();
//       const collection = db.collection('patient_data');
//       const patient = await collection.findOne({ Mr_no });

//       if (!patient) {
//           return res.status(404).send('Patient not found');
//       }

//       if (patient.surveyStatus === 'Completed') {
//           return res.redirect(basePath+`/details?Mr_no=${Mr_no}&DOB=${DOB}&lang=${lang}`);
//       }

//       // Check if custom surveys are already completed and customSurveyTimeCompletion exists
//       if (patient.customSurveyTimeCompletion) {
//         // Redirect to API survey if API exists
//         const db3 = await connectToThirdDatabase();
//         const surveyData = await db3.collection('surveys').findOne({
//           specialty: patient.speciality,
//           hospital_code: patient.hospital_code,
//           site_code: patient.site_code
//         });

//         const apiSurvey = surveyData ? surveyData.API : [];
//         if (apiSurvey && apiSurvey.length > 0) {
//           return res.redirect(basePath+`http://localhost:8080?mr_no=${Mr_no}&lang=${lang}`);
//         }
//       }

//       // Get the survey URLs based on the patient's data
//       const surveyUrls = await getSurveyUrls(patient, lang);

//       if (surveyUrls.length > 0) {
//           res.redirect(surveyUrls[0]);
//       } else {
//           await db1.collection('patient_data').findOneAndUpdate(
//               { Mr_no },
//               { $set: { surveyStatus: 'Completed' } }
//           );
//           res.redirect(basePath+`/details?Mr_no=${Mr_no}&DOB=${DOB}&lang=${lang}`);
//       }
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('Internal server error');
//   }
// });

const getSurveyUrls = async (patient, lang) => {
  const db3 = await connectToThirdDatabase();
  const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
  });

  const customSurveyNames = surveyData ? surveyData.custom : [];

  // If no survey names are found, redirect to port 8080 with plain Mr_no
  if (customSurveyNames.length === 0) {
      return [`http://proms-2.giftysolutions.com:8080?mr_no=${patient.Mr_no}&lang=${lang}`];
  }

  // Generate survey URLs in the order specified in `custom`
  const mrNoToUse = patient.hashedMrNo || patient.Mr_no; // Use hashedMrNo if available for survey URLs

  return customSurveyNames
      .filter(survey => {
          if (survey === 'PROMIS-10_d') {
              return !patient['PROMIS-10_completionDate'];
          }
          return !patient[`${survey}_completionDate`];
      })
      .map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
};


router.get('/start-surveys', async (req, res) => {
  // const { Mr_no, DOB, lang } = req.query;
  const { hashedMrNo: Mr_no, DOB, lang } = req.query;
  try {
      const db = await connectToDatabase();
      const collection = db.collection('patient_data');

      // Find the patient using Mr_no or hashedMrNo
      const patient = await collection.findOne({
          $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
      });

      if (!patient) {
          return res.status(404).send('Patient not found');
      }

      // Determine the Mr_no to use for URL masking
      const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

      if (patient.surveyStatus === 'Completed') {
          // return res.redirect(basePath + `/details?Mr_no=${mrNoToUse}&DOB=${DOB}&lang=${lang}`);
          return res.redirect(basePath + `/details?Mr_no=${mrNoToUse}&lang=${lang}`);
      }

      // Check if custom surveys are already completed and customSurveyTimeCompletion exists
      if (patient.customSurveyTimeCompletion) {
          // Existing redirection to API survey remains untouched
          const db3 = await connectToThirdDatabase();
          const surveyData = await db3.collection('surveys').findOne({
              specialty: patient.speciality,
              hospital_code: patient.hospital_code,
              site_code: patient.site_code
          });

          const apiSurvey = surveyData ? surveyData.API : [];
          if (apiSurvey && apiSurvey.length > 0) {
              return res.redirect(basePath + `http://proms-2.giftysolutions.com:8080?mr_no=${Mr_no}&lang=${lang}`);
          }
      }

      // Get the survey URLs based on the patient's data
      const surveyUrls = await getSurveyUrls(patient, lang);

      if (surveyUrls.length > 0) {
          // Masked redirection for the survey URLs
          const maskedSurveyUrl = surveyUrls[0].replace(`Mr_no=${patient.Mr_no}`, `Mr_no=${mrNoToUse}`);
          res.redirect(maskedSurveyUrl);
      } else {
          await db1.collection('patient_data').findOneAndUpdate(
              { Mr_no: patient.Mr_no },
              { $set: { surveyStatus: 'Completed' } }
          );
          res.redirect(basePath + `/details?Mr_no=${mrNoToUse}&DOB=${DOB}&lang=${lang}`);
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});




const handleSurveySubmission = async (req, res, collectionName) => {
  const formData = req.body;
  const { Mr_no, lang } = formData; // Capture the lang from formData

  const storageKey = collectionName === 'PROMIS-10_d' ? 'PROMIS-10' : collectionName;

  try {
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      let newIndex = 0;
      if (patientData[storageKey]) {
        newIndex = Object.keys(patientData[storageKey]).length;
      }

      const newKey = `${storageKey}_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      const completionDateField = `${storageKey}_completionDate`;
      const completionDate = new Date().toISOString();

      // Set pre_post_indicator (assuming you already have this logic)
      let prePostIndicator = 'pre_operative';
      if (patientData.Events && patientData.Events.length > 0) {
        const surveyTime = new Date(completionDate);
        patientData.Events.forEach(event => {
          const eventTime = new Date(event.date);
          if (eventTime.getMonth() === surveyTime.getMonth() &&
              eventTime.getFullYear() === surveyTime.getFullYear() &&
              eventTime < surveyTime) {
            prePostIndicator = 'post_operative';
          }
        });
      }

      // Prepare surveyEvents array and update the patient document with the new survey data
      const surveyEvents = [{ surveyStatus: 'received', surveyTime: completionDate, surveyResult: formData }];
      const surveyEvent = {
        survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
        survey_name: collectionName,
        site_code: patientData.site_code || 'default_site_code',
        pre_post_indicator: prePostIndicator,
        surveyEvents: surveyEvents
      };

      await db1.collection('patient_data').updateOne(
        { Mr_no },
        {
          $set: {
            [`${storageKey}.${newKey}`]: formData,
            [completionDateField]: completionDate,
            [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent
          }
        }
      );

      // Redirect to the next survey with lang parameter
      await handleNextSurvey(Mr_no, collectionName, lang, res);
    } else {
      console.log('No matching document found for Mr_no:', Mr_no);
      return res.status(404).send('No matching document found');
    }
  } catch (error) {
    console.error('Error updating form data:', error);
    res.status(500).send('Internal server error');
  }
};


router.post('/submit_Wexner', (req, res) => handleSurveySubmission(req, res, 'Wexner'));
router.post('/submit_ICIQ_UI_SF', (req, res) => handleSurveySubmission(req, res, 'ICIQ_UI_SF'));
router.post('/submitEPDS', (req, res) => handleSurveySubmission(req, res, 'EPDS'));
router.post('/submitPAID', (req, res) => handleSurveySubmission(req, res, 'PAID'));
router.post('/submitPROMIS-10', (req, res) => handleSurveySubmission(req, res, 'PROMIS-10'));
router.post('/submitPROMIS-10_d', (req, res) => handleSurveySubmission(req, res, 'PROMIS-10_d'));





// router.get('/Wexner', async (req, res) => {
//   let { Mr_no, lang } = req.query;
  
//   // If lang is undefined, set it to 'en' by default
//   if (!lang || lang === 'undefined') {
//     lang = 'en';
//   }

//   // Fetch patient data
//   const patient = await db1.collection('patient_data').findOne({ Mr_no });
  
//   // Fetch the custom survey names from the third database
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // Create an object to track the survey status for each survey
//   const surveyStatus = customSurveyNames.map(survey => {
//     const completionDateField = `${survey}_completionDate`;
//     return {
//       name: survey,
//       completed: Boolean(patient[completionDateField]), // true if completed
//       active: survey === 'Wexner' // Set to true for the current survey
//     };
//   });

//   // Render form.ejs with the surveyStatus list and currentLang
//   res.render('form', { Mr_no, surveyStatus, currentLang: lang });
// });


router.get('/Wexner', async (req, res) => {
  let { Mr_no, lang } = req.query;

  // If lang is undefined, set it to 'en' by default
  if (!lang || lang === 'undefined') {
    lang = 'en';
  }

  try {
    // Fetch patient data using Mr_no or hashedMrNo
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Fetch the custom survey names from the third database
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Create an object to track the survey status for each survey
    const surveyStatus = customSurveyNames.map(survey => {
      const completionDateField = `${survey}_completionDate`;
      return {
        name: survey,
        completed: Boolean(patient[completionDateField]), // true if completed
        active: survey === 'Wexner' // Set to true for the current survey
      };
    });

    // Render form.ejs with the surveyStatus list and currentLang
    res.render('form', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
  } catch (error) {
    console.error('Error fetching data for Wexner survey:', error);
    res.status(500).send('Internal server error');
  }
});




// router.get('/ICIQ_UI_SF', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   try {
//     // Fetch patient data
//     const patient = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch the custom survey names from the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create an object to track the survey status for each survey
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]),
//         active: survey === 'ICIQ_UI_SF'
//       };
//     });

//     // Render ICIQ-UI_SF.ejs with the surveyStatus and currentLang
//     res.render('ICIQ_UI_SF', { Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for ICIQ_UI SF:', error);
//     res.status(500).send('Error fetching data');
//   }
// });



// router.get('/EPDS', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   const patient = await db1.collection('patient_data').findOne({ Mr_no });
  
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   const surveyStatus = customSurveyNames.map(survey => {
//     const completionDateField = `${survey}_completionDate`;
//     return {
//       name: survey,
//       completed: Boolean(patient[completionDateField]), 
//       active: survey === 'EPDS'
//     };
//   });

//   // Pass lang to the EJS view
//   res.render('EDPS', { Mr_no, surveyStatus, currentLang: lang });
// });


router.get('/ICIQ_UI_SF', async (req, res) => {
  let { Mr_no, lang } = req.query;

  // If lang is undefined, set it to 'en' by default
  if (!lang || lang === 'undefined') {
    lang = 'en';
  }

  try {
    // Fetch patient data using Mr_no or hashedMrNo
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Fetch the custom survey names from the third database
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Create an object to track the survey status for each survey
    const surveyStatus = customSurveyNames.map(survey => {
      const completionDateField = `${survey}_completionDate`;
      return {
        name: survey,
        completed: Boolean(patient[completionDateField]), // true if completed
        active: survey === 'ICIQ_UI_SF' // Set to true for the current survey
      };
    });

    // Render ICIQ-UI_SF.ejs with the surveyStatus and currentLang
    res.render('ICIQ_UI_SF', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
  } catch (error) {
    console.error('Error fetching data for ICIQ_UI SF:', error);
    res.status(500).send('Error fetching data');
  }
});


router.get('/EPDS', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;

  try {
    // Check if Mr_no is a hashed value and fetch the corresponding original Mr_no if necessary
    let patient;
    if (Mr_no.length === 64) { // Assuming SHA-256 hash length
      patient = await db1.collection('patient_data').findOne({ hashedMrNo: Mr_no });
    } else {
      patient = await db1.collection('patient_data').findOne({ Mr_no });
    }

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Now use the original Mr_no for subsequent operations
    const originalMrNo = patient.Mr_no;

    // Connect to the third database and fetch survey data
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Create the survey status array
    const surveyStatus = customSurveyNames.map(survey => {
      const completionDateField = `${survey}_completionDate`;
      return {
        name: survey,
        completed: Boolean(patient[completionDateField]), 
        active: survey === 'EPDS'
      };
    });

    // Render the EDPS EJS view with the original Mr_no, surveyStatus, and current language
    res.render('EDPS', { Mr_no: originalMrNo, surveyStatus, currentLang: lang });
  } catch (error) {
    console.error('Error fetching patient data or survey data:', error);
    res.status(500).send('Internal server error');
  }
});






// router.get('/PAID', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;
  
//   try {
//     // Fetch patient data from patient_data collection
//     const patient = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch custom survey data from the manage_doctors database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create a survey status object to track the survey's status
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'PAID' // Set to true for the current survey
//       };
//     });

//     // Render the PAID form with survey status and language preferences
//     res.render('PAID', { Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for PAID survey:', error);
//     res.status(500).send('Internal server error');
//   }
// });

router.get('/PAID', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;

  try {
    // Find patient using Mr_no or hashedMrNo
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Fetch custom survey data from the manage_doctors database
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Create a survey status object to track the survey's status
    const surveyStatus = customSurveyNames.map(survey => {
      const completionDateField = `${survey}_completionDate`;
      return {
        name: survey,
        completed: Boolean(patient[completionDateField]), // true if completed
        active: survey === 'PAID' // Set to true for the current survey
      };
    });

    // Render the PAID form with survey status and language preferences
    res.render('PAID', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
  } catch (error) {
    console.error('Error fetching data for PAID survey:', error);
    res.status(500).send('Internal server error');
  }
});


// router.get('/PROMIS-10', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query; // Default lang to 'en'

//   try {
//     // Fetch patient data from the primary database (db1)
//     const patient = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch the custom survey names from the third database (db3)
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create an object to track the survey status for each survey
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'PROMIS-10' // Set to true for the current survey
//       };
//     });

//     // Render the PROMIS-10.ejs view with the surveyStatus and currentLang
//     res.render('PROMIS-10', { Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching patient or survey data:', error);
//     return res.status(500).send('Error fetching patient or survey data');
//   }
// });


router.get('/PROMIS-10', async (req, res) => {
  let { Mr_no, lang } = req.query; // Default lang to 'en'

  // Ensure lang is set to 'en' if undefined
  if (!lang || lang === 'undefined') {
    lang = 'en';
  }

  try {
    // Fetch patient data from the primary database (db1) using Mr_no or hashedMrNo
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Fetch the custom survey names from the third database (db3)
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Create an object to track the survey status for each survey
    const surveyStatus = customSurveyNames.map(survey => {
      const completionDateField = `${survey}_completionDate`;
      return {
        name: survey,
        completed: Boolean(patient[completionDateField]), // true if completed
        active: survey === 'PROMIS-10' // Set to true for the current survey
      };
    });

    // Render the PROMIS-10.ejs view with the surveyStatus and currentLang
    res.render('PROMIS-10', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
  } catch (error) {
    console.error('Error fetching patient or survey data:', error);
    return res.status(500).send('Error fetching patient or survey data');
  }
});



router.get('/PROMIS-10_d', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  
  // Fetch patient data
  const patient = await db1.collection('patient_data').findOne({ Mr_no });
  
  // Fetch the custom survey names from the third database
  const db3 = await connectToThirdDatabase();
  const surveyData = await db3.collection('surveys').findOne({
    specialty: patient.speciality,
    hospital_code: patient.hospital_code,
    site_code: patient.site_code
  });

  const customSurveyNames = surveyData ? surveyData.custom : [];

  // Create an object to track the survey status for each survey
  const surveyStatus = customSurveyNames.map(survey => {
    const completionDateField = `${survey}_completionDate`;
    return {
      name: survey,
      completed: Boolean(patient[completionDateField]), // true if completed
      active: survey === 'PROMIS-10_d' // Set to true for the current survey
    };
  });

  // Render PROMIS-10_d.ejs with the surveyStatus list and currentLang
  res.render('PROMIS-10_d', { Mr_no, surveyStatus, currentLang: lang });
});


router.post('/submit', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new CCFFIS object
          let newIndex = 0;
          if (patientData.CCFFIS) {
              newIndex = Object.keys(patientData.CCFFIS).length;
          }

          // Construct the new CCFFIS object key with the calculated index
          const newCCFFISKey = `CCFFIS_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new CCFFIS object with the calculated key and form data
          const newCCFFIS = { [newCCFFISKey]: formData };

          // Update the document with the new CCFFIS object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`CCFFIS.${newCCFFISKey}`]: formData } }
          );

          // Send success response
          // return res.status(200).send('CCFFIS object created successfully');

  // Send the HTML content as the response
  res.status(200).send(htmlContent);


      } else {
          // If no document found for the given Mr_no
          console.log('No matching document found for Mr_no:', Mr_no);
          return res.status(404).send('No matching document found');
      }
  } catch (error) {
      console.error('Error updating form data:', error);
      return res.status(500).send('Error updating form data');
  }
});





// const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
//   try {
//     // Retrieve the patient data from patient_data
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Retrieve the custom surveys list from the surveys collection in the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patientData.speciality,
//       hospital_code: patientData.hospital_code,
//       site_code: patientData.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];
//     const apiSurvey = surveyData ? surveyData.API : [];

//     if (customSurveyNames.length === 0) {
//       return res.status(404).send('No custom surveys found.');
//     }

//     // Find the index of the current survey in the custom array
//     const currentSurveyIndex = customSurveyNames.indexOf(currentSurvey);

//     // If the current survey is the last one, mark the custom surveys as completed
//     if (currentSurveyIndex === customSurveyNames.length - 1) {
//       // Record the custom survey completion time
//       const completionTime = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime } }
//       );

//       // If API surveys exist, and custom surveys are done, redirect to the API survey
//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(basePath+`http://localhost:8080?mr_no=${Mr_no}&lang=${lang}`);
//       } else {
//         // Otherwise, mark the survey as completed
//         await db1.collection('patient_data').updateOne(
//           { Mr_no },
//           { $set: { surveyStatus: 'Completed' } }
//         );
//         // Redirect to the details page with lang parameter
//         return res.redirect(basePath+`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}&lang=${lang}`);
//       }
//     }

//     // Get the next survey in the custom array
//     const nextSurvey = customSurveyNames[currentSurveyIndex + 1];
//     const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${Mr_no}&lang=${lang}`;

//     // Redirect to the next survey with lang parameter
//     res.redirect(nextSurveyUrl);
//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     res.status(500).send('Internal server error');
//   }
// };


// router.post('/submit_Wexner', async (req, res) => {
//   const formData = req.body;
//   const { Mr_no, lang = 'en' } = formData; // Default lang to 'en' if not provided

//   try {
//     // Process form data and save it
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData.Wexner) {
//         newIndex = Object.keys(patientData.Wexner).length;
//       }

//       const newWexnerKey = `Wexner_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`Wexner.${newWexnerKey}`]: formData, 'Wexner_completionDate': formData.timestamp } }
//       );

//       // Redirect to the next survey or mark surveys as completed
//       await handleNextSurvey(Mr_no, 'Wexner', lang, res);  // Use the lang when redirecting
//     } else {
//       return res.status(404).send('Patient not found');
//     }
//   } catch (error) {
//     console.error('Error updating Wexner form data:', error);
//     return res.status(500).send('Error updating Wexner form data');
//   }
// });

// const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
//   try {
//     // Retrieve the patient data from patient_data
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Retrieve the custom surveys list from the surveys collection in the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patientData.speciality,
//       hospital_code: patientData.hospital_code,
//       site_code: patientData.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];
//     const apiSurvey = surveyData ? surveyData.API : [];

//     if (customSurveyNames.length === 0) {
//       return res.status(404).send('No custom surveys found.');
//     }

//     // Find the index of the current survey in the custom array
//     const currentSurveyIndex = customSurveyNames.indexOf(currentSurvey);

//     // If the current survey is the last one, mark the custom surveys as completed
//     if (currentSurveyIndex === customSurveyNames.length - 1) {
//       // Record the custom survey completion time
//       const completionTime = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime } }
//       );

//       // If API surveys exist, and custom surveys are done, redirect to the API survey
//       if (apiSurvey && apiSurvey.length > 0) {
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         return res.redirect(`http://localhost:8080?mr_no=${mrNoToUse}&lang=${lang}`);
//       } else {
//         // Otherwise, mark the survey as completed
//         await db1.collection('patient_data').updateOne(
//           { Mr_no },
//           { $set: { surveyStatus: 'Completed' } }
//         );
//         // Redirect to the details page with lang parameter
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&DOB=${patientData.DOB}&lang=${lang}`);
//       }
//     }

//     // Get the next survey in the custom array
//     const nextSurvey = customSurveyNames[currentSurveyIndex + 1];
//     const mrNoToUse = patientData.hashedMrNo || Mr_no; // Use hashedMrNo if available

//     // Construct the URL for the next survey and include lang parameter
//     const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`;

//     // Redirect to the next survey
//     res.redirect(nextSurveyUrl);
//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     res.status(500).send('Internal server error');
//   }
// };

// const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
//   try {
//     // Retrieve the patient data from patient_data
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Retrieve the custom surveys list from the surveys collection in the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patientData.speciality,
//       hospital_code: patientData.hospital_code,
//       site_code: patientData.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];
//     const apiSurvey = surveyData ? surveyData.API : [];

//     if (customSurveyNames.length === 0) {
//       return res.status(404).send('No custom surveys found.');
//     }

//     // Find the index of the current survey in the custom array
//     const currentSurveyIndex = customSurveyNames.indexOf(currentSurvey);

//     // If the current survey is the last one, mark the custom surveys as completed
//     if (currentSurveyIndex === customSurveyNames.length - 1) {
//       // Record the custom survey completion time
//       const completionTime = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime } }
//       );

//       // If API surveys exist and custom surveys are done, redirect to the API survey using plain Mr_no
//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(`http://localhost:8080?mr_no=${Mr_no}&lang=${lang}`);
//       } else {
//         // Otherwise, mark the survey as completed
//         await db1.collection('patient_data').updateOne(
//           { Mr_no },
//           { $set: { surveyStatus: 'Completed' } }
//         );

//         // Redirect to the details page with lang parameter and use masked Mr_no if available
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         // return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&DOB=${patientData.DOB}&lang=${lang}`);
//         res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     // Get the next survey in the custom array and construct the URL with masked Mr_no if available
//     const nextSurvey = customSurveyNames[currentSurveyIndex + 1];
//     const mrNoToUse = patientData.hashedMrNo || Mr_no; // Use hashedMrNo if available
//     const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`;

//     // Redirect to the next survey
//     res.redirect(nextSurveyUrl);
//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     res.status(500).send('Internal server error');
//   }
// };

const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
  try {
    // Retrieve the patient data from patient_data
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });
    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Retrieve the custom surveys list from the surveys collection in the third database
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patientData.speciality,
      hospital_code: patientData.hospital_code,
      site_code: patientData.site_code
    });

    const customSurveyNames = surveyData ? surveyData.custom : [];
    const apiSurvey = surveyData ? surveyData.API : [];

    if (customSurveyNames.length === 0) {
      return res.status(404).send('No custom surveys found.');
    }

    // Find the index of the current survey in the custom array
    const currentSurveyIndex = customSurveyNames.indexOf(currentSurvey);

    // If the current survey is the last one, mark the custom surveys as completed
    if (currentSurveyIndex === customSurveyNames.length - 1) {
      // Record the custom survey completion time
      const completionTime = new Date().toISOString();

      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { customSurveyTimeCompletion: completionTime } }
      );

      // If API surveys exist and custom surveys are done, redirect to the API survey using plain Mr_no
      if (apiSurvey && apiSurvey.length > 0) {
        return res.redirect(`http://proms-2.giftysolutions.com:8080?mr_no=${Mr_no}&lang=${lang}`);
      } else {
        // Otherwise, mark the survey as completed
        await db1.collection('patient_data').updateOne(
          { Mr_no },
          { $set: { surveyStatus: 'Completed' } }
        );

        // Redirect to the details page with lang parameter and use masked Mr_no if available
        const mrNoToUse = patientData.hashedMrNo || Mr_no;
        return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
      }
    }

    // Get the next survey in the custom array and construct the URL with masked Mr_no if available
    const nextSurvey = customSurveyNames[currentSurveyIndex + 1];
    const mrNoToUse = patientData.hashedMrNo || Mr_no; // Use hashedMrNo if available
    const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`;

    // Redirect to the next survey
    return res.redirect(nextSurveyUrl);
  } catch (error) {
    console.error('Error determining the next survey:', error);
    return res.status(500).send('Internal server error');
  }
};


router.post('/submit_Wexner', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Default lang to 'en' if not provided

  try {
    // Fetch the patient document using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine the next index for Wexner entries
    let newIndex = 0;
    if (patientData.Wexner) {
      newIndex = Object.keys(patientData.Wexner).length;
    }

    // Create a new key for this Wexner entry
    const newWexnerKey = `Wexner_${newIndex}`;

    // Add a timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new Wexner data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`Wexner.${newWexnerKey}`]: formData,
          'Wexner_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'Wexner', lang, res);  // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error updating Wexner form data:', error);
    return res.status(500).send('Error updating Wexner form data');
  }
});


router.post('/submit_ICIQ_UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;  // Default lang to 'en' if not provided

  try {
    // Process form data and find the patient
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate new index for ICIQ-UI SF form submissions
      let newIndex = 0;
      if (patientData.ICIQ_UI_SF) {
        newIndex = Object.keys(patientData.ICIQ_UI_SF).length;
      }

      // Create new key for the ICIQ-UI SF submission
      const newICIQKey = `ICIQ_UI_SF_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      // Update patient document with the new ICIQ-UI SF data and timestamp
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`ICIQ_UI_SF.${newICIQKey}`]: formData, 'ICIQ_UI_SF_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed
      await handleNextSurvey(Mr_no, 'ICIQ_UI_SF', lang, res);  // Use the lang when redirecting
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating ICIQ_UI SF form data:', error);
    return res.status(500).send('Error updating ICIQ_UI SF form data');
  }
});



router.post('/submit_ICIQ_UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;  // Default lang to 'en' if not provided

  try {
    // Process form data and find the patient using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Calculate new index for ICIQ-UI SF form submissions
    let newIndex = 0;
    if (patientData.ICIQ_UI_SF) {
      newIndex = Object.keys(patientData.ICIQ_UI_SF).length;
    }

    // Create new key for the ICIQ-UI SF submission
    const newICIQKey = `ICIQ_UI_SF_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    // Update patient document with the new ICIQ-UI SF data and timestamp
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`ICIQ_UI_SF.${newICIQKey}`]: formData,
          'ICIQ_UI_SF_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'ICIQ_UI_SF', lang, res);  // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error updating ICIQ_UI SF form data:', error);
    return res.status(500).send('Error updating ICIQ_UI SF form data');
  }
});



// router.post('/submitEPDS', async (req, res) => {
//   const formData = req.body;
//   const { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData.EPDS) {
//         newIndex = Object.keys(patientData.EPDS).length;
//       }

//       const newEPDSKey = `EPDS_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`EPDS.${newEPDSKey}`]: formData, 'EPDS_completionDate': formData.timestamp } }
//       );

//       // Redirect to the next survey or mark surveys as completed with the lang parameter
//       await handleNextSurvey(Mr_no, 'EPDS', lang, res);
//     } else {
//       return res.status(404).send('Patient not found');
//     }
//   } catch (error) {
//     console.error('Error updating EPDS form data:', error);
//     return res.status(500).send('Error updating EPDS form data');
//   }
// });


router.post('/submitEPDS', async (req, res) => {
  const formData = req.body;
  let { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

  try {
    // Check if Mr_no is a hashed value and map it to the original Mr_no if necessary
    let patientData;
    if (Mr_no.length === 64) { // Assuming SHA-256 hash length
      patientData = await db1.collection('patient_data').findOne({ hashedMrNo: Mr_no });
      if (patientData) {
        Mr_no = patientData.Mr_no; // Update Mr_no to the original value
      }
    } else {
      patientData = await db1.collection('patient_data').findOne({ Mr_no });
    }

    if (patientData) {
      // Determine the new index for EPDS entries
      let newIndex = 0;
      if (patientData.EPDS) {
        newIndex = Object.keys(patientData.EPDS).length;
      }

      // Create a new key for the EPDS entry and add a timestamp
      const newEPDSKey = `EPDS_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      // Update the patient document with the new EPDS entry and completion date
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`EPDS.${newEPDSKey}`]: formData, 'EPDS_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed with the lang parameter
      await handleNextSurvey(Mr_no, 'EPDS', lang, res);
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating EPDS form data:', error);
    return res.status(500).send('Error updating EPDS form data');
  }
});






// router.post('/submitPAID', async (req, res) => {
//   const formData = req.body;
//   const { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

//   try {
//     // Fetch the patient document from the patient_data collection
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Determine the next index for PAID entries
//     let newIndex = 0;
//     if (patientData.PAID) {
//       newIndex = Object.keys(patientData.PAID).length;
//     }

//     // Create a new key for this PAID entry
//     const newPAIDKey = `PAID_${newIndex}`;

//     // Add a timestamp to the form data
//     formData.timestamp = new Date().toISOString();

//     // Update the patient document with the new PAID data
//     await db1.collection('patient_data').updateOne(
//       { Mr_no },
//       { 
//         $set: { 
//           [`PAID.${newPAIDKey}`]: formData, 
//           'PAID_completionDate': formData.timestamp 
//         } 
//       }
//     );

//     // Handle the next survey or complete the process
//     await handleNextSurvey(Mr_no, 'PAID', lang, res); // Use the lang parameter when redirecting
//   } catch (error) {
//     console.error('Error submitting PAID form data:', error);
//     return res.status(500).send('Error submitting PAID form data');
//   }
// });


router.post('/submitPAID', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

  try {
    // Find the patient document using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine the next index for PAID entries
    let newIndex = 0;
    if (patientData.PAID) {
      newIndex = Object.keys(patientData.PAID).length;
    }

    // Create a new key for this PAID entry
    const newPAIDKey = `PAID_${newIndex}`;

    // Add a timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new PAID data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`PAID.${newPAIDKey}`]: formData,
          'PAID_completionDate': formData.timestamp
        }
      }
    );

    // Handle the next survey or complete the process
    await handleNextSurvey(patientData.Mr_no, 'PAID', lang, res); // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error submitting PAID form data:', error);
    return res.status(500).send('Error submitting PAID form data');
  }
});



// router.post('/submitPROMIS-10', async (req, res) => {
//   const formData = req.body;
//   const { Mr_no, lang = 'en' } = formData; // Ensure lang is passed and default to 'en' if missing

//   try {
//     // Find the patient document in the patient_data collection
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Calculate the new index for the PROMIS-10 data
//     let newIndex = 0;
//     if (patientData['PROMIS-10']) {
//       newIndex = Object.keys(patientData['PROMIS-10']).length;
//     }

//     // Construct the new PROMIS-10 object key
//     const newPROMIS10Key = `PROMIS-10_${newIndex}`;

//     // Add timestamp to the form data
//     formData.timestamp = new Date().toISOString();

//     // Update the patient document with the new PROMIS-10 data
//     await db1.collection('patient_data').updateOne(
//       { Mr_no },
//       { $set: { [`PROMIS-10.${newPROMIS10Key}`]: formData, 'PROMIS-10_completionDate': formData.timestamp } }
//     );

//     // Redirect to the next survey or mark surveys as completed
//     await handleNextSurvey(Mr_no, 'PROMIS-10', lang, res);
//   } catch (error) {
//     console.error('Error updating PROMIS-10 form data:', error);
//     return res.status(500).send('Error updating PROMIS-10 form data');
//   }
// });

router.post('/submitPROMIS-10', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Ensure lang is passed and default to 'en' if missing

  try {
    // Find the patient document in the patient_data collection using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Calculate the new index for the PROMIS-10 data
    let newIndex = 0;
    if (patientData['PROMIS-10']) {
      newIndex = Object.keys(patientData['PROMIS-10']).length;
    }

    // Construct the new PROMIS-10 object key
    const newPROMIS10Key = `PROMIS-10_${newIndex}`;

    // Add timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new PROMIS-10 data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`PROMIS-10.${newPROMIS10Key}`]: formData,
          'PROMIS-10_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'PROMIS-10', lang, res);
  } catch (error) {
    console.error('Error updating PROMIS-10 form data:', error);
    return res.status(500).send('Error updating PROMIS-10 form data');
  }
});



router.post('/submitPROMIS-10_d', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
    // Find the patient document in the patient_data collection that matches Mr_no
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate the index for the new PROMIS-10_d object
      let newIndex = 0;
      if (patientData['PROMIS-10_d']) {
        newIndex = Object.keys(patientData['PROMIS-10_d']).length;
      }

      // Construct the new PROMIS-10_d object key with the calculated index
      const newPROMIS10_dKey = `PROMIS-10_d_${newIndex}`;

      // Add timestamp to the form data
      formData.timestamp = new Date().toISOString();

      // Update the patient document with the new PROMIS-10_d data
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`PROMIS-10_d.${newPROMIS10_dKey}`]: formData, 'PROMIS-10_d_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed
      await handleNextSurvey(Mr_no, 'PROMIS-10_d', formData.lang, res);
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating PROMIS-10_d form data:', error);
    return res.status(500).send('Error updating PROMIS-10_d form data');
  }
});



// Mount the router at the base path
app.use(basePath, router);


app.listen(PORT, () => {
  console.log(`The patient surveys flow is running at https://proms-2.giftysolutions.com${basePath}`);
});