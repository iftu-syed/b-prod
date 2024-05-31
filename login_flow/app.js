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

// Route to handle search form submission
// app.post('/', async (req, res) => {
//   const { Mr_no } = req.body;
//   try {
//     const db = await connectToDatabase(); // Establish connection to the MongoDB database
//     const collection = db.collection('patient_data');
//     const patient = await collection.findOne({ Mr_no });
//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }
//     res.render('dob-validation', { Mr_no: patient.Mr_no});
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal server error');
//   }
// });

// Route to handle search form submission
// app.post('/', async (req, res) => {
//   const { Mr_no } = req.body;
//   try {
//     const db = await connectToDatabase(); // Establish connection to the MongoDB database
//     const collection = db.collection('patient_data');
//     const patient = await collection.findOne({ Mr_no });
//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }
//     res.render('dob-validation', { Mr_no: patient.Mr_no, DOB: patient.DOB });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal server error');
//   }
// });

app.get('/search', async (req, res) => {
  const { Mr_no } = req.query;
  try {
    const db = await connectToDatabase(); // Establish connection to the MongoDB database
    const collection = db.collection('patient_data');
    const patient = await collection.findOne({ Mr_no });
    if (!patient) {
      return res.status(404).send('Patient not found');
    }
    res.render('dob-validation', { Mr_no: patient.Mr_no, DOB: patient.DOB });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Route to handle details form submission
app.get('/details', async (req, res) => {
  const { Mr_no, DOB } = req.query;

  // Function to validate DOB format (YYYY-MM-DD)
  const isValidDOB = (dob) => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dobRegex.test(dob);
  };

  // Validate DOB format
  if (!isValidDOB(DOB)) {
    return res.status(400).send('Invalid DOB format. Please enter DOB in YYYY-MM-DD format.');
  }

  try {
    const db = await connectToDatabase(); // Establish connection to the MongoDB database
    const collection = db.collection('patient_data');
    const patient = await collection.findOne({ Mr_no, DOB }); // Query based on Mr_no and DOB
    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Fetch surveyName from the third database based on patient's specialty
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });

    // Patient found, render details
    res.render('details', { Mr_no, DOB, patient, surveyName: surveyData ? surveyData.surveyName : [] }); // Pass patient data and surveyName to details.ejs
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


//this is the new code for survey start
const surveyOrder = ['ICIQ-UI_SF', 'EPDS', 'PROMIS-10', 'PAID'];

// Helper function to get survey URLs in the correct order
const getSurveyUrls = (patient, surveyNames) => {
    return surveyOrder
        .filter(survey => surveyNames.includes(survey))
        .map(survey => `/${survey}?Mr_no=${patient.Mr_no}`);
};

// Route to start the surveys
app.get('/start-surveys', async (req, res) => {
  const { Mr_no } = req.query;
  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');
    const patient = await collection.findOne({ Mr_no });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
    const surveyUrls = getSurveyUrls(patient, surveyData ? surveyData.surveyName : []);
    console.log(surveyData);
    console.log(surveyOrder);

    if (surveyUrls.length > 0) {
      res.redirect(surveyUrls[0]);
    } else {
      res.status(404).send('No surveys available for this speciality.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});
app.get('/Wexner', (req, res) => {
  const { Mr_no, DOB } = req.query;
  // Directly redirect to details page
  res.redirect(`/details?Mr_no=${Mr_no}&DOB=${DOB}`);
});


// Function to handle form submission and redirect to the next survey
// const handleSurveySubmission = async (req, res, collectionName) => {
//   const formData = req.body;
//   const { Mr_no } = formData;

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData[collectionName]) {
//         newIndex = Object.keys(patientData[collectionName]).length;
//       }

//       const newKey = `${collectionName}_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`${collectionName}.${newKey}`]: formData } }
//       );

//       const db3 = await connectToThirdDatabase();
//       const surveyData = await db3.collection('surveys').findOne({ specialty: patientData.speciality });
//       const surveyUrls = getSurveyUrls(patientData, surveyData ? surveyData.surveyName : []);
//       const currentSurveyIndex = surveyUrls.indexOf(req.originalUrl.split('?')[0] + `?Mr_no=${Mr_no}`);
//       const nextSurveyIndex = currentSurveyIndex + 1;

//       if (nextSurveyIndex < surveyUrls.length) {
//         res.redirect(surveyUrls[nextSurveyIndex]);
//       } else {
//         res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
//       }
//     } else {
//       console.log('No matching document found for Mr_no:', Mr_no);
//       return res.status(404).send('No matching document found');
//     }
//   } catch (error) {
//     console.error('Error updating form data:', error);
//     return res.status(500).send('Error updating form data');
//   }
// };
// const handleSurveySubmission = async (req, res, collectionName) => {
//   const formData = req.body;
//   const { Mr_no } = formData;

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData[collectionName]) {
//         newIndex = Object.keys(patientData[collectionName]).length;
//       }

//       const newKey = `${collectionName}_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`${collectionName}.${newKey}`]: formData } }
//       );

//       const db3 = await connectToThirdDatabase();
//       const surveyData = await db3.collection('surveys').findOne({ specialty: patientData.speciality });
//       const surveyUrls = getSurveyUrls(patientData, surveyData ? surveyData.surveyName : []);
//       const currentSurveyIndex = surveyOrder.indexOf(collectionName);
//       const nextSurveyIndex = currentSurveyIndex + 1;

//       if (nextSurveyIndex < surveyOrder.length) {
//         const nextSurveyName = surveyOrder[nextSurveyIndex];
//         if (surveyData.surveyName.includes(nextSurveyName)) {
//           res.redirect(`/${nextSurveyName}?Mr_no=${Mr_no}`);
//         } else {
//           res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
//         }
//       } else {
//         res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
//       }
//     } else {
//       console.log('No matching document found for Mr_no:', Mr_no);
//       return res.status(404).send('No matching document found');
//     }
//   } catch (error) {
//     console.error('Error updating form data:', error);
//     return res.status(500).send('Error updating form data');
//   }
// };
// const handleSurveySubmission = async (req, res, collectionName) => {
//   const formData = req.body;
//   const { Mr_no } = formData;

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData[collectionName]) {
//         newIndex = Object.keys(patientData[collectionName]).length;
//       }

//       const newKey = `${collectionName}_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`${collectionName}.${newKey}`]: formData } }
//       );

//       const db3 = await connectToThirdDatabase();
//       const surveyData = await db3.collection('surveys').findOne({ specialty: patientData.speciality });
//       const surveyUrls = getSurveyUrls(patientData, surveyData ? surveyData.surveyName : []);
//       const currentSurveyIndex = surveyOrder.indexOf(collectionName);
//       const nextSurveyIndex = currentSurveyIndex + 1;

//       // Find the next available survey in the patient's survey list
//       while (nextSurveyIndex < surveyOrder.length) {
//         const nextSurveyName = surveyOrder[nextSurveyIndex];
//         if (surveyData.surveyName.includes(nextSurveyName)) {
//           return res.redirect(`/${nextSurveyName}?Mr_no=${Mr_no}`);
//         }
//         nextSurveyIndex++;
//       }

//       // If no more surveys are available, redirect to the details page
//       res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
//     } else {
//       console.log('No matching document found for Mr_no:', Mr_no);
//       return res.status(404).send('No matching document found');
//     }
//   } catch (error) {
//     console.error('Error updating form data:', error);
//     return res.status(500).send('Error updating form data');
//   }
// };
//this is the new code

// const handleSurveySubmission = async (req, res, collectionName) => {
//   const formData = req.body;
//   const { Mr_no } = formData;

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData[collectionName]) {
//         newIndex = Object.keys(patientData[collectionName]).length;
//       }

//       const newKey = `${collectionName}_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { [`${collectionName}.${newKey}`]: formData } }
//       );

//       const db3 = await connectToThirdDatabase();
//       const surveyData = await db3.collection('surveys').findOne({ specialty: patientData.speciality });
//       const surveyUrls = getSurveyUrls(patientData, surveyData ? surveyData.surveyName : []);
//       const currentSurveyIndex = surveyOrder.indexOf(collectionName);
//       let nextSurveyIndex = currentSurveyIndex + 1;

//       // Find the next available survey in the patient's survey list
//       while (nextSurveyIndex < surveyOrder.length) {
//         const nextSurveyName = surveyOrder[nextSurveyIndex];
//         if (surveyData.surveyName.includes(nextSurveyName)) {
//           return res.redirect(`/${nextSurveyName}?Mr_no=${Mr_no}`);
//         }
//         nextSurveyIndex++;
//       }

//       // If no more surveys are available, redirect to the details page
//       res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
//     } else {
//       console.log('No matching document found for Mr_no:', Mr_no);
//       return res.status(404).send('No matching document found');
//     }
//   } catch (error) {
//     console.error('Error updating form data:', error);
//     return res.status(500).send('Error updating form data');
//   }
// };
//this is new code

const handleSurveySubmission = async (req, res, collectionName) => {
  const formData = req.body;
  const { Mr_no } = formData;

  try {
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      let newIndex = 0;
      if (patientData[collectionName]) {
        newIndex = Object.keys(patientData[collectionName]).length;
      }

      const newKey = `${collectionName}_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`${collectionName}.${newKey}`]: formData } }
      );

      const db3 = await connectToThirdDatabase();
      const surveyData = await db3.collection('surveys').findOne({ specialty: patientData.speciality });
      const surveyUrls = getSurveyUrls(patientData, surveyData ? surveyData.surveyName : []);
      const currentSurveyIndex = surveyOrder.indexOf(collectionName);
      let nextSurveyIndex = currentSurveyIndex + 1;

      // Find the next available survey in the patient's survey list
      while (nextSurveyIndex < surveyOrder.length) {
        const nextSurveyName = surveyOrder[nextSurveyIndex];
        if (surveyData.surveyName.includes(nextSurveyName)) {
          // Check if the survey route exists
          if (surveyUrls.some(url => url.includes(nextSurveyName))) {
            return res.redirect(`/${nextSurveyName}?Mr_no=${Mr_no}`);
          }
        }
        nextSurveyIndex++;
      }

      // If no more surveys are available, redirect to the details page
      res.redirect(`/details?Mr_no=${Mr_no}&DOB=${patientData.DOB}`);
    } else {
      console.log('No matching document found for Mr_no:', Mr_no);
      return res.status(404).send('No matching document found');
    }
  } catch (error) {
    console.error('Error updating form data:', error);
    return res.status(500).send('Error updating form data');
  }
};
//this new code for wexner fix





// Update form submission handlers to call the handleSurveySubmission function
app.post('/submitICIQ-UI_SF', (req, res) => handleSurveySubmission(req, res, 'ICIQ-UI_SF'));
app.post('/submitEPDS', (req, res) => handleSurveySubmission(req, res, 'EPDS'));
app.post('/submitPAID', (req, res) => handleSurveySubmission(req, res, 'PAID'));
app.post('/submitPROMIS-10', (req, res) => handleSurveySubmission(req, res, 'PROMIS-10'));




// ... (other routes remain the same)

// app.post('/details', async (req, res) => {
//   const { Mr_no, DOB } = req.body;

//   // Function to validate DOB format (YYYY-MM-DD)
//   const isValidDOB = (dob) => {
//     const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
//     return dobRegex.test(dob);
//   };

//   // Validate DOB format
//   if (!isValidDOB(DOB)) {
//     return res.status(400).send('Invalid DOB format. Please enter DOB in YYYY-MM-DD format.');
//   }

//   try {
//     const db = await connectToDatabase(); // Establish connection to the MongoDB database
//     const collection = db.collection('patient_data');
//     const patient = await collection.findOne({ Mr_no, DOB }); // Query based on Mr_no and DOB
//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch surveyName from the third database based on patient's specialty
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });

//     // Patient found, render details
//     res.render('details', { Mr_no, DOB, patient, surveyName: surveyData ? surveyData.surveyName : [] }); // Pass patient data and surveyName to details.ejs
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal server error');
//   }
// });



// app.post('/details', async (req, res) => {
//   const { Mr_no, DOB } = req.body;

//   // Function to validate DOB format (YYYY-MM-DD)
//   const isValidDOB = (dob) => {
//     const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
//     return dobRegex.test(dob);
//   };

//   // Validate DOB format
//   if (!isValidDOB(DOB)) {
//     return res.status(400).send('Invalid DOB format. Please enter DOB in YYYY-MM-DD format.');
//   }

//   try {
//     const db = await connectToDatabase(); // Establish connection to the MongoDB database
//     const collection = db.collection('patient_data');
//     const patient = await collection.findOne({ Mr_no, DOB }); // Query based on Mr_no and DOB
//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch surveyName from the third database based on patient's specialty
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });

//     // Patient found, render details
//     res.render('details', { Mr_no, DOB, patient, surveyName: surveyData ? surveyData.surveyName : [] }); // Pass patient data and surveyName to details.ejs
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal server error');
//   }
// });

// Add this route specifically for /Wexner to redirect to details.ejs



//this is new code
// Handle GET request to display the ICIQ-UI_SF form
app.get('/ICIQ-UI_SF', (req, res) => {
  const { Mr_no } = req.query; // Get Mr_no from query parameters

  // Render the form template and pass the Mr_no value
  res.render('form', { Mr_no });
});

// Handle GET request to display the EPDS form
app.get('/EPDS', (req, res) => {
  const { Mr_no } = req.query; // Get Mr_no from query parameters

  // Render the EPDS form template and pass the Mr_no value
  res.render('EDPS', { Mr_no });
});

// Handle GET request to display the PAID form
app.get('/PAID', (req, res) => {
  const { Mr_no } = req.query; // Get Mr_no from query parameters

  // Render the PAID form template and pass the Mr_no value
  res.render('PAID', { Mr_no });
});

// Handle GET request to display the PROMIS-10 form
app.get('/PROMIS-10', (req, res) => {
  const { Mr_no } = req.query; // Get Mr_no from query parameters

  // Render the PROMIS-10 form template and pass the Mr_no value
  res.render('PROMIS-10', { Mr_no });
});


// // Handle GET request to display the ICIQ-UI_SF form
// app.get('/ICIQ-UI_SF', (req, res) => {
//   const {Mr_no} = req.query; // Get Mr_no from query parameters

//   // Render the form template and pass the Mr_no value
//   res.render('form', {Mr_no});
// });

// // Handle GET request to display the EPDS form
// app.get('/EPDS', (req, res) => {
//   const { Mr_no } = req.query; // Get Mr_no from query parameters

//   // Render the EPDS form template and pass the Mr_no value
//   res.render('EDPS', { Mr_no });
// });

// // Handle GET request to display the PAID form
// app.get('/PAID', (req, res) => {
//   const { Mr_no } = req.query; // Get Mr_no from query parameters

//   // Render the PAID form template and pass the Mr_no value
//   res.render('PAID', { Mr_no });
// });

// // Handle GET request to display the PROMS-10 form
// app.get('/PROMIS-10', (req, res) => {
//   const { Mr_no } = req.query; // Get Mr_no from query parameters

//   // Render the PROMS-10 form template and pass the Mr_no value
//   res.render('PROMIS-10', { Mr_no });
// });



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

app.post('/submitICIQ-UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new ICIQ-UI_SF object
          let newIndex = 0;
          if (patientData['ICIQ-UI_SF']) {
              newIndex = Object.keys(patientData['ICIQ-UI_SF']).length;
          }

          // Construct the new ICIQ-UI_SF object key with the calculated index
          const newICIQ_UI_SFKey = `ICIQ-UI_SF_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new ICIQ-UI_SF object with the calculated key and form data
          const newICIQ_UI_SF = { [newICIQ_UI_SFKey]: formData };

          // Update the document with the new ICIQ-UI_SF object
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
      console.error('Error updating ICIQ-UI_SF form data:', error);
      return res.status(500).send('Error updating ICIQ-UI_SF form data');
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


// app.post('/submitPROMIS-10', async (req, res) => {
//   const formData = req.body;
//   const { Mr_no } = formData; // Mr_no passed from the form

//   try {
//       // Find the document in patient_data collection that matches Mr_no
//       const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//       if (patientData) {
//           // Calculate the index for the new PROMS-10 object
//           let newIndex = 0;
//           if (patientData.PROMIS-10) {
//               newIndex = Object.keys(patientData.PROMIS-10).length;
//           }

//           // Construct the new PROMS-10 object key with the calculated index
//           const newPROMS10Key = `PROMIS-10_${newIndex}`;

//           // Get the current date and time
//           const currentDate = new Date();
//           const timestamp = currentDate.toISOString(); // Convert to ISO string format

//           // Add timestamp to the form data
//           formData.timestamp = timestamp;

//           // Construct the new PROMS-10 object with the calculated key and form data
//           const newPROMS10 = { [newPROMS10Key]: formData };

//           // Update the document with the new PROMS-10 object
//           await db1.collection('patient_data').updateOne(
//               { Mr_no },
//               { $set: { [`PROMIS-10.${newPROMS10Key}`]: formData } }
//           );

//           // Send success response
//           res.status(200).send(htmlContent);
//       } else {
//           // If no document found for the given Mr_no
//           console.log('No matching document found for Mr_no:', Mr_no);
//           return res.status(404).send('No matching document found');
//       }
//   } catch (error) {
//       console.error('Error updating PROMIS-10 form data:', error);
//       return res.status(500).send('Error updating PROMIS-10 form data');
//   }
// });

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





app.listen(PORT, () => {
  console.log(`The patient surveys flow is running at http://localhost:${PORT}`);
});