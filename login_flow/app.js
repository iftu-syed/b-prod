const express = require('express');
const path = require('path'); // Add this line to import the path module
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
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
const PORT = 3088;
const crypto = require('crypto');

// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}


// Connection URI
const uri = 'mongodb://localhost:27017'; // Change this URI according to your MongoDB setup

app.use(express.static(path.join(__dirname, 'public')));

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

const uri1 = 'mongodb://localhost:27017/Data_Entry_Incoming';
const uri3 = 'mongodb://localhost:27017/manage_doctors';
let db1, db2, db3;

    // Connect to the first database
    const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
    client1.connect();
    db1 = client1.db('Data_Entry_Incoming');
    console.log('Connected to Data_Entry_Incoming database');

     // Connect to the third database
     const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
     client3.connect();
     db3 = client3.db('manage_doctors');
     console.log('Connected to manage_doctors database');


     async function connectToThirdDatabase() {
      let client;
      try {
        // Create a new MongoClient
        client = new MongoClient(uri3, options);
    
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

// Define root route
app.get('/', (req, res) => {
  res.render('search');
});


app.get('/search', async (req, res) => {
  const { identifier } = req.query;
  try {
      const db = await connectToDatabase(); // Establish connection to the MongoDB database
      const collection = db.collection('patient_data');

      // Attempt to find the patient by either hashed or plain MR number or phone number
      const hashedIdentifier = hashMrNo(identifier);
      const patient = await collection.findOne({
          $or: [
              { Mr_no: identifier }, 
              { phoneNumber: identifier },
              { hashedMrNo: identifier }, 
              { hashedMrNo: hashedIdentifier }
          ]
      });

      if (!patient) {
          return res.status(404).send('Patient not found');
      }

      // Render the dob-validation view with the patient's MR number and DOB
      res.render('dob-validation', { Mr_no: patient.Mr_no, DOB: patient.DOB });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});



app.get('/details', async (req, res) => {
  const { Mr_no, DOB, lang = 'en' } = req.query; // Add lang parameter with a default value of 'en'

  // Function to validate DOB format (MM/DD/YYYY)
  const isValidDOB = (dob) => {
    const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    return dobRegex.test(dob);
  };

  // Validate DOB format
  if (!isValidDOB(DOB)) {
    return res.status(400).send('Invalid DOB format. Please enter DOB in MM/DD/YYYY format.');
  }

  try {
    const db = await connectToDatabase(); // Establish connection to the MongoDB database
    const collection = db.collection('patient_data');
    const patient = await collection.findOne({ Mr_no }); // Query based only on Mr_no

    if (!patient || patient.DOB !== DOB) {
      return res.status(404).send('Patient not found');
    }

    // Set appointmentFinished to 1, creating the field if it doesn't exist
    await collection.updateOne(
      { Mr_no },
      { $set: { appointmentFinished: 1 } }
    );

    // Clear all survey completion times if surveyStatus is 'Completed'
    if (patient.surveyStatus === 'Completed') {
      const updates = {};
      ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ-UI_SF', 'EPDS'].forEach(survey => {
        updates[`${survey}_completionDate`] = "";
      });

      await collection.updateOne(
        { Mr_no },
        { $unset: updates }
      );
    }

    // Fetch surveyName and surveyOrder from the third database based on patient's specialty, hospital_code, and site_code
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    const surveyNames = surveyData ? surveyData.surveyName : [];
    const surveyOrder = surveyNames.length > 0 ? surveyNames : ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ-UI_SF', 'EPDS']; // Fallback to default

    // Check survey completion dates
    const today = new Date();
    const completedSurveys = {};
    surveyOrder.forEach(survey => {
      const completionDateField = `${survey}_completionDate`;
      if (patient[completionDateField]) {
        const completionDate = new Date(patient[completionDateField]);
        const daysDifference = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
        completedSurveys[survey] = daysDifference <= 30;
      }
    });

    // Patient found, render details
    res.render('details', { 
      Mr_no, 
      patient, 
      surveyName: surveyNames, 
      completedSurveys, 
      currentLang: lang // Pass currentLang to the details.ejs view
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


const getSurveyUrls = async (patient, lang) => {
  // Pull survey details from the `surveys` collection based on `speciality`, `hospital_code`, and `site_code`
  const db3 = await connectToThirdDatabase();
  const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
  });

  const surveyNames = surveyData ? surveyData.surveyName : [];

  // If no survey names are found, return an empty array
  if (surveyNames.length === 0) {
      return [];
  }

  // Generate survey URLs in the order specified in `surveyNames`
  return surveyNames
      .filter(survey => {
          if (survey === 'PROMIS-10_d') {
              return !patient['PROMIS-10_completionDate'];
          }
          return !patient[`${survey}_completionDate`];
      })
      .map(survey => `/${survey}?Mr_no=${patient.Mr_no}&lang=${lang}`);
};




app.get('/start-surveys', async (req, res) => {
  const { Mr_no, DOB, lang } = req.query;
  try {
      const db = await connectToDatabase();
      const collection = db.collection('patient_data');
      const patient = await collection.findOne({ Mr_no });

      if (!patient) {
          return res.status(404).send('Patient not found');
      }

      if (patient.surveyStatus === 'Completed') {
          return res.redirect(`/details?Mr_no=${Mr_no}&DOB=${DOB}&lang=${lang}`);
      }

      // Skip the logic for Orthopaedic Surgery specialty
      if (patient.speciality === 'Orthopaedic Surgery') {
          return res.redirect(`http://localhost:8080?mr_no=${Mr_no}&lang=${lang}`);
      }

      // Get the survey URLs based on the patient's data
      const surveyUrls = await getSurveyUrls(patient, lang);

      if (surveyUrls.length > 0) {
          res.redirect(surveyUrls[0]);
      } else {
          await db1.collection('patient_data').findOneAndUpdate(
              { Mr_no },
              { $set: { surveyStatus: 'Completed' } }
          );
          res.redirect(`/details?Mr_no=${Mr_no}&DOB=${DOB}&lang=${lang}`);
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
  }
});






const handleSurveySubmission = async (req, res, collectionName) => {
  const formData = req.body;
  const { Mr_no, lang } = formData;

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

      // Set pre_post_indicator to default value
      let prePostIndicator = 'pre_operative';

      // Check if any event in Events has the same month/year and is before the surveyTime
      if (patientData.Events && patientData.Events.length > 0) {
        const surveyTime = new Date(completionDate);

        patientData.Events.forEach(event => {
          const eventTime = new Date(event.date);

          if (
            eventTime.getMonth() === surveyTime.getMonth() &&
            eventTime.getFullYear() === surveyTime.getFullYear() &&
            eventTime < surveyTime
          ) {
            prePostIndicator = 'post_operative';
          }
        });
      }

      // Prepare surveyEvents array
      const surveyEvents = [];

      // Find the appointment creation event
      const appointmentLog = patientData.smsLogs.find(
        log => log.type === 'appointment creation' && log.speciality === patientData.speciality
      );
      const reminderLog = patientData.smsLogs.find(
        log => log.type === 'reminder' && log.speciality === patientData.speciality
      );

      if (appointmentLog) {
        surveyEvents.push({
          surveyStatus: 'sent',
          surveyTime: appointmentLog.timestamp
        });
      } else {
        surveyEvents.push({
          surveyStatus: 'sent',
          surveyTime: null
        });
      }

      if (reminderLog) {
        surveyEvents.push({
          surveyStatus: 'sent_reminder',
          surveyTime: reminderLog.timestamp
        });
      } else {
        surveyEvents.push({
          surveyStatus: 'sent_reminder',
          surveyTime: null
        });
      }

      // Add the final received event
      surveyEvents.push({
        surveyStatus: 'received',
        surveyTime: completionDate,
        surveyResult: formData // This will contain the full survey questions and answers
      });

      // Create the surveyEvent object with surveyEvents array
      const surveyEvent = {
        survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
        survey_name: collectionName,
        site_code: patientData.site_code || 'default_site_code',
        doctor_id: patientData.specialities && patientData.specialities.length > 0
          ? patientData.specialities[0].doctor_ids && patientData.specialities[0].doctor_ids.length > 0
            ? patientData.specialities[0].doctor_ids[0]
            : 'default_doctor_id'
          : 'default_doctor_id',
        pre_post_indicator: prePostIndicator, // Use calculated pre_post_indicator
        surveyEvents: surveyEvents // Add the surveyEvents array
      };

      // Update the patient document with the new survey data and SurveyEntry
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        {
          $set: {
            [`${storageKey}.${newKey}`]: formData,
            [completionDateField]: completionDate,
            surveyStatus: 'Not Completed',
            [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent // Updated to SurveyEntry
          }
        }
      );

      // Retrieve the survey order and determine the next survey
      const db3 = await connectToThirdDatabase();
      const surveyData = await db3.collection('surveys').findOne({
        specialty: patientData.speciality,
        hospital_code: patientData.hospital_code,
        site_code: patientData.site_code
      });

      const surveyNames = surveyData ? surveyData.surveyName : [];
      const surveyOrder = surveyNames.length > 0 ? surveyNames : ['PROMIS-10', 'PAID', 'PROMIS-10_d', 'Wexner', 'ICIQ-UI_SF', 'EPDS']; // Fallback to default

      const surveyUrls = await getSurveyUrls(patientData, lang);  // Modified to directly use the `getSurveyUrls` function

      const currentSurveyIndex = surveyOrder.indexOf(collectionName);
      let nextSurveyUrl = null;

      for (let i = currentSurveyIndex + 1; i < surveyOrder.length; i++) {
        const nextSurvey = surveyOrder[i];
        if (surveyUrls.some(url => url.includes(nextSurvey))) {
          nextSurveyUrl = surveyUrls.find(url => url.includes(nextSurvey));
          break;
        }
      }

      // Redirect to the next survey or to the details page if all surveys are completed
      if (nextSurveyUrl) {
        return res.redirect(nextSurveyUrl);
      } else {
        await db1.collection('patient_data').findOneAndUpdate(
          { Mr_no },
          { $set: { surveyStatus: 'Completed' } }
        );
        res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}&lang=${lang}`);
      }
    } else {
      console.log('No matching document found for Mr_no:', Mr_no);
      return res.status(404).send('No matching document found');
    }
  } catch (error) {
    console.error('Error updating form data:', error);
    res.status(500).send('Internal server error');
  }
};




app.post('/submit_Wexner', (req, res) => handleSurveySubmission(req, res, 'Wexner'));
app.post('/submit_ICIQ-UI_SF', (req, res) => handleSurveySubmission(req, res, 'ICIQ-UI_SF'));
app.post('/submitEPDS', (req, res) => handleSurveySubmission(req, res, 'EPDS'));
app.post('/submitPAID', (req, res) => handleSurveySubmission(req, res, 'PAID'));
app.post('/submitPROMIS-10', (req, res) => handleSurveySubmission(req, res, 'PROMIS-10'));
app.post('/submitPROMIS-10_d', (req, res) => handleSurveySubmission(req, res, 'PROMIS-10_d'));



app.get('/Wexner', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query; // Default to 'en' if no lang is provided
  res.render('form', { Mr_no, currentLang: lang });
});

app.get('/ICIQ-UI_SF', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  res.render('ICIQ_UI_SF', { Mr_no, currentLang: lang });
});

app.get('/EPDS', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  res.render('EDPS', { Mr_no, currentLang: lang });
});

app.get('/PAID', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  res.render('PAID', { Mr_no, currentLang: lang });
});

app.get('/PROMIS-10', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  res.render('PROMIS-10', { Mr_no, currentLang: lang });
});

app.get('/PROMIS-10_d', (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  res.render('PROMIS-10_d', { Mr_no, currentLang: lang });
});


app.post('/submit', async (req, res) => {
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

app.post('/submit_Wexner', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new Wexner object
          let newIndex = 0;
          if (patientData['Wexner']) {
              newIndex = Object.keys(patientData['Wexner']).length;
          }

          // Construct the new Wexner object key with the calculated index
          const newICIQ_UI_SFKey = `Wexner_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new Wexner object with the calculated key and form data
          const newICIQ_UI_SF = { [newICIQ_UI_SFKey]: formData };

          // Update the document with the new Wexner object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`Wexner.${newICIQ_UI_SFKey}`]: formData } }
          );

          // Send success response
          res.status(200).send(htmlContent);
      } else {
          // If no document found for the given Mr_no
          console.log('No matching document found for Mr_no:', Mr_no);
          return res.status(404).send('No matching document found');
      }
  } catch (error) {
      console.error('Error updating Wexner form data:', error);
      return res.status(500).send('Error updating Wexner form data');
  }
});

app.post('/submit_ICIQ-UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new ICIQ-UI SF object
          let newIndex = 0;
          if (patientData['ICIQ-UI_SF']) {
              newIndex = Object.keys(patientData['ICIQ-UI_SF']).length;
          }

          // Construct the new ICIQ-UI SF object key with the calculated index
          const newICIQ_UI_SFKey = `ICIQ_UI_SF_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new ICIQ-UI SF object with the calculated key and form data
          const newICIQ_UI_SF = { [newICIQ_UI_SFKey]: formData };

          // Update the document with the new ICIQ-UI SF object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`ICIQ-UI_SF.${newICIQ_UI_SFKey}`]: formData } }
          );

          // Send success response
          res.status(200).send(htmlContent);
      } else {
          // If no document found for the given Mr_no
          console.log('No matching document found for Mr_no:', Mr_no);
          return res.status(404).send('No matching document found');
      }
  } catch (error) {
      console.error('Error updating ICIQ-UI SF form data:', error);
      return res.status(500).send('Error updating ICIQ-UI SF form data');
  }
});



app.post('/submitEPDS', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new EPDS object
          let newIndex = 0;
          if (patientData.EPDS) {
              newIndex = Object.keys(patientData.EPDS).length;
          }

          // Construct the new EPDS object key with the calculated index
          const newEPDSKey = `EPDS_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new EPDS object with the calculated key and form data
          const newEPDS = { [newEPDSKey]: formData };

          // Update the document with the new EPDS object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`EPDS.${newEPDSKey}`]: formData } }
          );

          // Send success response
          // return res.status(200).send('EPDS object created successfully');
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


// Handle POST request to submit the PAID form data
app.post('/submitPAID', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new PAID object
          let newIndex = 0;
          if (patientData.PAID) {
              newIndex = Object.keys(patientData.PAID).length;
          }

          // Construct the new PAID object key with the calculated index
          const newPAIDKey = `PAID_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new PAID object with the calculated key and form data
          const newPAID = { [newPAIDKey]: formData };

          // Update the document with the new PAID object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`PAID.${newPAIDKey}`]: formData } }
          );

          // Send success response
          res.status(200).send(htmlContent);
      } else {
          // If no document found for the given Mr_no
          console.log('No matching document found for Mr_no:', Mr_no);
          return res.status(404).send('No matching document found');
      }
  } catch (error) {
      console.error('Error updating PAID form data:', error);
      return res.status(500).send('Error updating PAID form data');
  }
});


app.post('/submitPROMIS-10', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
    // Find the document in patient_data collection that matches Mr_no
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate the index for the new PROMIS-10 object
      let newIndex = 0;
      if (patientData['PROMIS-10']) {
        newIndex = Object.keys(patientData['PROMIS-10']).length;
      }

      // Construct the new PROMIS-10 object key with the calculated index
      const newPROMIS10Key = `PROMIS-10_${newIndex}`;

      // Get the current date and time
      const currentDate = new Date();
      const timestamp = currentDate.toISOString(); // Convert to ISO string format

      // Add timestamp to the form data
      formData.timestamp = timestamp;

      // Construct the new PROMIS-10 object with the calculated key and form data
      const newPROMIS10 = { [newPROMIS10Key]: formData };

      // Update the document with the new PROMIS-10 object
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`PROMIS-10.${newPROMIS10Key}`]: formData } }
      );

      // Send success response
      res.status(200).send(htmlContent);
    } else {
      // If no document found for the given Mr_no
      console.log('No matching document found for Mr_no:', Mr_no);
      return res.status(404).send('No matching document found');
    }
  } catch (error) {
    console.error('Error updating PROMIS-10 form data:', error);
    return res.status(500).send('Error updating PROMIS-10 form data');
  }
});

app.post('/submitPROMIS-10_d', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
    // Find the document in patient_data collection that matches Mr_no
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate the index for the new PROMIS-10_d object
      let newIndex = 0;
      if (patientData['PROMIS-10_d']) {
        newIndex = Object.keys(patientData['PROMIS-10_d']).length;
      }

      // Construct the new PROMIS-10_d object key with the calculated index
      const newPROMIS10_dKey = `PROMIS-10_d_${newIndex}`;

      // Get the current date and time
      const currentDate = new Date();
      const timestamp = currentDate.toISOString(); // Convert to ISO string format

      // Add timestamp to the form data
      formData.timestamp = timestamp;

      // Construct the new PROMIS-10_d object with the calculated key and form data
      const newPROMIS10_d = { [newPROMIS10_dKey]: formData };

      // Update the document with the new PROMIS-10_d object
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`PROMIS-10_d.${newPROMIS10_dKey}`]: formData } }
      );

      // Send success response
      res.status(200).send(htmlContent);
    } else {
      // If no document found for the given Mr_no
      console.log('No matching document found for Mr_no:', Mr_no);
      return res.status(404).send('No matching document found');
    }
  } catch (error) {
    console.error('Error updating PROMIS-10_d form data:', error);
    return res.status(500).send('Error updating PROMIS-10_d form data');
  }
});






app.listen(PORT, () => {
  console.log(`The patient surveys flow is running at http://localhost:${PORT}`);
});