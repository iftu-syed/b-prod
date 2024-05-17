// const express = require('express');
// const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
// const app = express();

// // Function to connect to MongoDB using connection name
// const connectToMongoDB = (connectionName) => {
//   const uri = `mongodb://localhost:27017/${connectionName}`;
//   return mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// };

// // Define database connection names and their respective database names
// const connections = {
//   doctors: 'manage_doctors',
//   // Add more connections here in the future if needed
// };

// // Object to store database connections
// const dbConnections = {};

// // Connect to MongoDB for each connection
// for (const [connectionName, dbName] of Object.entries(connections)) {
//   dbConnections[connectionName] = connectToMongoDB(dbName);
// }

// // Load Doctor model using the 'doctors' connection
// const Doctor = dbConnections.doctors.model('doctors', {
//   name: String,
//   username: String,
//   password: String,
//   speciality: String
// });

// // Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));

// // Set view engine
// app.set('view engine', 'ejs');

// // Routes
// app.get('/', (req, res) => {
//   res.render('login');
// });

// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const doctor = await Doctor.findOne({ username, password });
//     if (doctor) {
//       res.render('home', { doctor });
//     } else {
//       res.send('Invalid username or password');
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// const express = require('express');
// const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
// const app = express();

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/manage_doctors', { useNewUrlParser: true, useUnifiedTopology: true });

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/Data_Entry_Incoming', { useNewUrlParser: true, useUnifiedTopology: true });

// // Define Patient model
// const Patient = mongoose.model('Patient', {
//   Mr_no: String,
//   Name: String,
//   DOB: String,
//   datetime: String,
//   speciality: String,
//   dateOfSurgery: String,
//   phoneNumber: String,
//   password: String
// });


// // Define Doctor model
// const Doctor = mongoose.model('doctors', {
//   name: String,
//   username: String,
//   password: String,
//   speciality: String
// });

// // Define Survey model
// const Survey = mongoose.model('surveys', {
//   surveyName: [String],
//   specialty: String
// });

// // Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));
// app.set('view engine', 'ejs');

// // Routes
// app.get('/', (req, res) => {
//   res.render('login');
// });

// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     // Find the doctor based on username and password
//     const doctor = await Doctor.findOne({ username, password });
//     if (doctor) {
//       // Find surveys based on doctor's speciality
//       const surveys = await Survey.findOne({ specialty: doctor.speciality });
//       if (surveys) {
//         res.render('home', { doctor, surveys });
//       } else {
//         res.send('No surveys found for this speciality');
//       }
//     } else {
//       res.send('Invalid username or password');
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });


// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query;
//     try {
//       // Find patient based on Mr_no
//       const patient = await Patient.findOne({ Mr_no });
//       if (patient) {
//         res.render('patient-details', { patient });
//       } else {
//         res.send('Patient not found');
//       }
//     } catch (error) {
//       console.error(error);
//       res.status(500).send('Server Error');
//     }
//   });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// Function to check if the datetime is the current date
function isCurrentDate(datetime) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    return datetime.split('T')[0] === currentDate; // Compare with the date part of the datetime
  }





const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const app = express();
const { exec } = require('child_process');
// const PORT = 3003;

// MongoDB connection URLs
const doctorsSurveysURL = 'mongodb://localhost:27017/manage_doctors';
const patientDataURL = 'mongodb://localhost:27017/Data_Entry_Incoming';


// Connect to MongoDB for doctors and surveys connection
const doctorsSurveysDB = mongoose.createConnection(doctorsSurveysURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB for patient_data connection
const patientDataDB = mongoose.createConnection(patientDataURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Doctor model for manage_doctors database
const Doctor = doctorsSurveysDB.model('doctors', {
    name: String,
    username: String,
    password: String,
    speciality: String
});

// Define Survey model
const Survey = doctorsSurveysDB.model('surveys', {
    surveyName: [String],
    specialty: String
});

// Define Patient schema for Data_Entry_Incoming database
const patientSchema = new mongoose.Schema({
    Mr_no: String,
    Name: String,
    DOB: String,
    datetime: String,
    speciality: String,
    dateOfSurgery: String,
    phoneNumber: String,
    password: String
});

// Define Patient model
const Patient = patientDataDB.model('Patient', patientSchema, 'patient_data');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const uri3 = 'mongodb://localhost:27017/manage_doctors';
let db3;

const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
client3.connect().then(() => {
    db3 = client3.db('manage_doctors');
    console.log('Connected to manage_doctors database');
}).catch(error => {
    console.error('Failed to connect to manage_doctors database', error);
});





// Routes
app.get('/', (req, res) => {
    res.render('login');
});

// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         // Find the doctor based on username and password
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             // Find surveys based on doctor's speciality
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 res.render('home', { doctor, surveys });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });



// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         // Find the doctor based on username and password
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             // Find surveys based on doctor's speciality
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             // Fetch all patient details
//             const patients = await Patient.find({});
//             if (surveys) {
//                 res.render('home', { doctor, surveys, patients }); // Pass patients to home.ejs
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });



// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         // Find the doctor based on username and password
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             // Find surveys based on doctor's speciality
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 // Find patients based on doctor's speciality
//                 const patients = await Patient.find({ speciality: doctor.speciality });
//                 res.render('home', { doctor, surveys, patients });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });


app.get('/execute', async (req, res) => {
    const { Mr_no} = req.query;

    console.log(Mr_no);
    // Validate Mr_no and password
    if (!Mr_no) {
        return res.status(400).send('Missing Mr_no');
    }
    // res.status(200);
    res.set('Connection', 'close').status(200);

    try {
        // Execute Python script with Mr_no and password as arguments
        exec(`python3 python_scripts/script.py ${Mr_no}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect to the login page with Mr_no and password parameters
            // res.redirect(`/login?Mr_no=${Mr_no}&password=${password}`);
            // res.send('Hello');

            // res.status(200).end();
            
        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/generateGraph', async (req, res) => {
    const { Mr_no, surveyType } = req.body;

    console.log(`Generating graph for Mr_no: ${Mr_no}, Survey Type: ${surveyType}`);
    // Validate Mr_no and surveyType
    if (!Mr_no || !surveyType) {
        return res.status(400).send('Missing Mr_no or surveyType');
    }

    try {
        // Execute Python script with Mr_no and surveyType as arguments
        exec(`python3 python_scripts/script1.py ${Mr_no} ${surveyType}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect back to patient details page
            res.redirect(`/search?mrNo=${Mr_no}`);
        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});





app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Find the doctor based on username and password
        const doctor = await Doctor.findOne({ username, password });
        if (doctor) {
            // Find surveys based on doctor's speciality
            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                // Fetch patients based on doctor and patient's speciality
                const patients = await Patient.find({ speciality: doctor.speciality });
                // Map patients to add the isCurrentDate field
                const patientsWithDateStatus = patients.map(patient => ({
                    ...patient.toObject(),
                    isCurrentDate: isCurrentDate(patient.datetime)
                }));
                res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
            } else {
                res.send('No surveys found for this speciality');
            }
        } else {
            res.send('Invalid username or password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});



// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query;
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no });
//         if (patient) {
//             res.render('patient-details', { patient });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });
//17th May 2024 
// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             res.render('patient-details', { patient });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

app.get('/search', async (req, res) => {
    const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
    try {
        // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
        const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
        if (patient) {
            // Fetch surveyName from the third database based on speciality
            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];

            res.render('patient-details', { patient, surveyNames });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             res.render('home', { doctor, surveys, patient });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// Route to handle patient search by Mr_no


// // Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Doctor Login Server is running on http://localhost:${PORT}`);
//     });
// }


// module.exports = startServer;