// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');

// Add session management dependencies
const session = require('express-session');
const MongoStore = require('connect-mongo');

require('dotenv').config();


// Import Twilio SDK
const twilio = require('twilio');
const crypto = require('crypto');

// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}



const app = express();
const PORT = process.env.PORT || 3051;

function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on http://localhost:${PORT}`);
    });
}



module.exports = startServer;

app.use(bodyParser.json());

// index.js

// Connection URIs
const dataEntryUri = 'mongodb://localhost:27017/Data_Entry_Incoming';
const manageDoctorsUri = 'mongodb://localhost:27017/manage_doctors';

// Create new MongoClient instances for both databases
const dataEntryClient = new MongoClient(dataEntryUri);
const manageDoctorsClient = new MongoClient(manageDoctorsUri);

// Connect to both MongoDB databases
async function connectToMongoDB() {
    try {
        await Promise.all([
            dataEntryClient.connect(),
            manageDoctorsClient.connect()
        ]);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();


// const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded.' });
//     }

//     const filePath = req.file.path;
//     const db = req.dataEntryDB;
//     const results = [];

//     fs.createReadStream(filePath)
//         .pipe(csvParser())
//         .on('data', (data) => results.push(data))
//         .on('end', async () => {
//             try {
//                 await db.collection('patient_data').insertMany(results);
//                 fs.unlinkSync(filePath);
//                 const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//                 res.render('data-entry', { successMessage: 'CSV file uploaded and data inserted successfully.', specialities });
//             } catch (error) {
//                 console.error('Error inserting CSV data into MongoDB:', error);
//                 res.status(500).json({ error: 'Internal server error' });
//             }
//         });
// });


// Access databases and collections in the routes as needed
app.use((req, res, next) => {
    req.dataEntryDB = dataEntryClient.db();
    req.manageDoctorsDB = manageDoctorsClient.db();
    next();
});

// Configure session middleware
app.use(session({
    secret: 'your_secret_key', // Replace with your own secret key
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: manageDoctorsUri })
}));

// Utility function to format date and time to 12-hour format with AM/PM
function formatTo12Hour(datetime) {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}




app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


const accountSid = 'AC67f36ac44b4203d21bb5f7ddfc9ea3ad';  // Replace with your Account SID
const authToken = '2831644b0d889a5d26b6ba2f507db929';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+17077223196';  // Replace with your Twilio Phone Number

// Twilio client initialization
const client = require('twilio')(accountSid, authToken);

// Function to send SMS
function sendSMS(to, message) {
    return client.messages.create({
        body: message,
        from: twilioPhoneNumber,  // Your Twilio phone number
        to: to                    // Recipient's phone number
    });
}

// Login route
app.get('/', (req, res) => {
    res.render('login');
});

// Blank page route (after login)
// app.get('/blank-page', (req, res) => {
//     res.render('blank-page');
// });

// app.get('/blank-page', async (req, res) => {
//     try {
//       // Get patients data from the database (replace with your actual query)
//       const patients = await req.dataEntryDB.collection('patient_data').find().toArray();
  
//       // Log total number of patients
//       console.log(`Fetched ${patients.length} patients from database.`);
  
//       // Prepare data for the table (optional)
//       const formattedPatients = patients.map(patient => ({
//         mrNo: patient.mrNo, // Hash MR number for privacy
//         name: patient.name,
//         speciality: patient.speciality,
//         phoneNumber: patient.phoneNumber,
//         datetime: patient.datetime,
//         surveyStatus: patient.surveyStatus,
//       }));
    
//       // Render the blank-page template with patient data
//       res.render('blank-page', { patients });
//     } catch (error) {
//       console.error('Error fetching patients data:', error);
//       // Handle errors appropriately (e.g., display an error message to the user)
//     }
//   });


app.get('/blank-page', async (req, res) => {
    try {
        const hospital = req.session.hospital; // Get the hospital from the session
        if (!hospital) {
            return res.redirect('/'); // Redirect to login if no hospital is found in session
        }

        // Get patients data from the database filtered by hospital
        const patients = await req.dataEntryDB.collection('patient_data').find({ hospital }).toArray();

        // Log total number of patients
        console.log(`Fetched ${patients.length} patients from database for hospital: ${hospital}`);

        // Render the blank-page template with patient data
        res.render('blank-page', { patients });
    } catch (error) {
        console.error('Error fetching patients data:', error);
        // Handle errors appropriately (e.g., display an error message to the user)
    }
});


// Login form submission
// app.post('/login', async (req, res) => {
//     const doctorsDB = req.manageDoctorsDB.collection('doctors');
//     const { username, password } = req.body;

//     try {
//         const doctor = await doctorsDB.findOne({ username });
//         if (!doctor || doctor.password !== password) {
//             return res.render('login', { errorMessage: 'Invalid username or password' });
//         }

//         // Login successful, redirect to data entry
//         res.redirect('/data-entry');
//     } catch (error) {
//         console.error('Error logging in:', error);
//         res.status(500).render('login', { errorMessage: 'Internal server error' });
//     }
// });

// Login form submission
// app.post('/login', async (req, res) => {
//     const doctorsDB = req.manageDoctorsDB.collection('doctors');
//     const { username, password } = req.body;

//     try {
//         const doctor = await doctorsDB.findOne({ username });
//         if (!doctor || doctor.password !== password) {
//             return res.render('login', { errorMessage: 'Invalid username or password' });
//         }

//         // Login successful, redirect to blank page
//         res.redirect('/blank-page');
//     } catch (error) {
//         console.error('Error logging in:', error);
//         res.status(500).render('login', { errorMessage: 'Internal server error' });
//     }
// });


// Login form submission
// app.post('/login', async (req, res) => {
//     const doctorsDB = req.manageDoctorsDB.collection('doctors');
//     const { username, password } = req.body;

//     try {
//         const doctor = await doctorsDB.findOne({ username });
//         if (!doctor || doctor.password !== password) {
//             return res.render('login', { errorMessage: 'Invalid username or password' });
//         }

//         // Store the hospital in the session
//         req.session.hospital = doctor.hospital;
//         req.session.username = doctor.username; // Optionally store the username or other info

//         // Login successful, redirect to blank page
//         res.redirect('/blank-page');
//     } catch (error) {
//         console.error('Error logging in:', error);
//         res.status(500).render('login', { errorMessage: 'Internal server error' });
//     }
// });

app.post('/login', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('doctors');
    const { username, password } = req.body;

    try {
        const doctor = await doctorsDB.findOne({ username });
        if (!doctor || doctor.password !== password) {
            return res.render('login', { errorMessage: 'Invalid username or password' });
        }

        // Store the hospital in the session
        req.session.hospital = doctor.hospital;
        req.session.username = doctor.username; // Optionally store the username or other info

        // Login successful, redirect to blank page
        res.redirect('/blank-page');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).render('login', { errorMessage: 'Internal server error' });
    }
});


// // Data entry route (protected by login)
// app.get('/data-entry', async (req, res) => {

//     try {
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { specialities });
//     } catch (error) {
//         console.error('Error:', error);
//         res.render('data-entry', { specialities: [] });
//     }
// });

// Data entry route (protected by login)
// app.get('/data-entry', async (req, res) => {
//     try {
//         // Fetch distinct specialties from the database
//         let specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         // Filter out the 'STAFF' specialty
//         specialities = specialities.filter(speciality => speciality !== 'STAFF');

//         // Render the data-entry page with the filtered specialties
//         res.render('data-entry', { specialities });
//     } catch (error) {
//         console.error('Error:', error);
//         res.render('data-entry', { specialities: [] });
//     }
// });

// app.get('/data-entry', async (req, res) => {
//     try {
//         // Fetch distinct specialties from the database
//         let specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         // Filter out the 'STAFF' specialty
//         specialities = specialities.filter(speciality => speciality !== 'STAFF');

//         // Render the data-entry page with the filtered specialties
//         res.render('data-entry', { specialities, hospital: req.session.hospital });
//     } catch (error) {
//         console.error('Error:', error);
//         res.render('data-entry', { specialities: [], hospital: req.session.hospital });
//     }
// });

app.get('/data-entry', async (req, res) => {
    try {
        // Fetch distinct specialties from the database
        let specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        // Filter out the 'STAFF' specialty
        specialities = specialities.filter(speciality => speciality !== 'STAFF');

        // Render the data-entry page with the filtered specialties and hospital from session
        res.render('data-entry', { specialities, hospital: req.session.hospital });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', { specialities: [], hospital: req.session.hospital });
    }
});



app.get('/', async (req, res) => {
    try {

        // Fetch distinct specialities from surveys collection
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        res.render('data-entry', { specialities }); // Render the data-entry.ejs template with specialities
    } catch (error) {
        console.error('Error:', error);
        // If there's an error, pass an empty array as specialities
        res.render('data-entry', { specialities: [] });
    }
});







//this the new code that can handle the multiple appointments and multiple speciality to maintain the historical data of the patient


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, datetime, speciality, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         const patient = await collection.findOne({ Mr_no });

//         // Hash the MR number for security
//         const hashedMrNo = hashMrNo(Mr_no.toString());

//         if (!patient) {
//             // If MR number does not exist, insert the submitted data along with the hashed MR number
//             await collection.insertOne({ ...req.body, hashedMrNo });
//         } else {
//             // If MR number exists, check the specialty
//             const updatedSpecialties = patient.specialities || [];
//             if (!updatedSpecialties.includes(speciality)) {
//                 updatedSpecialties.push(speciality);
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         datetime,
//                         specialities: updatedSpecialties,
//                         hashedMrNo // Update the hashed MR number as well
//                     }
//                 }
//             );
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// this section required code optimization

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, datetime, speciality, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         const patient = await collection.findOne({ Mr_no });

//         // Hash the MR number for security
//         const hashedMrNo = hashMrNo(Mr_no.toString());

//         if (!patient) {
//             // If MR number does not exist, insert the submitted data along with the hashed MR number
//             await collection.insertOne({ ...req.body, hashedMrNo, specialities: [speciality] });
//         } else {
//             // If MR number exists, override the specialities array with the new speciality if it's not already included
//             let updatedSpecialties = patient.specialities || [];

//             if (!updatedSpecialties.includes(speciality)) {
//                 updatedSpecialties.push(speciality);
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         datetime,
//                         specialities: updatedSpecialties,  // Override existing specialities with the updated array
//                         hashedMrNo // Update the hashed MR number as well
//                     }
//                 }
//             );
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];

//             // Add the new speciality to the array if it's not already included
//             if (!updatedSpecialties.includes(speciality)) {
//                 updatedSpecialties.push(speciality);
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime,
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 hashedMrNo,
//                 specialities: [speciality]
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];

//             // Add the new speciality with timestamp if it's not already included
//             const existingSpeciality = updatedSpecialties.find(s => s.name === speciality);
//             if (!existingSpeciality) {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime,
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }]
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime,
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }]
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime, // Use the formatted datetime
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime, // Use the formatted datetime
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }]
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

//old code of the twillo
// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime, // Use the formatted datetime
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital // Add hospital to the document
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime, // Use the formatted datetime
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }],
//                 hospital // Add hospital to the document
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime, // Use the formatted datetime
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital // Add hospital to the document
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime, // Use the formatted datetime
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }],
//                 hospital // Add hospital to the document
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities, hospital });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });

//                 // Set surveyStatus to "Not Completed" since a new specialty is added
//                 patient.surveyStatus = "Not Completed";
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime, // Use the formatted datetime
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital, // Add hospital to the document
//                         surveyStatus: patient.surveyStatus // Update surveyStatus
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime, // Use the formatted datetime
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }],
//                 hospital, // Add hospital to the document
//                 surveyStatus: "Not Completed" // Set surveyStatus to "Not Completed"
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities, hospital });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Check if the patient already exists
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // If the patient exists, update their details with the new data except Mr_no
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If speciality exists, update the timestamp
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 // If speciality does not exist, add it with the current timestamp
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             // Set surveyStatus to "Not Completed" for any new appointment
//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime, // Use the formatted datetime
//                         specialities: updatedSpecialties,
//                         speciality, // update with the current speciality
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital, // Add hospital to the document
//                         surveyStatus: "Not Completed" // Always set surveyStatus to "Not Completed"
//                     }
//                 }
//             );

//         } else {
//             // If MR number does not exist, insert the new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime, // Use the formatted datetime
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()  // Add current timestamp
//                 }],
//                 hospital, // Add hospital to the document
//                 surveyStatus: "Not Completed" // Set surveyStatus to "Not Completed"
//             });
//         }

//         // Create the survey link with the hashed Mr_no as a query parameter
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

//         // Construct the SMS message
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         // Send SMS to the patient
//         await sendSMS(phoneNumber, smsMessage);

//         // Redirect to data-entry.ejs with success message
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities, hospital });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB or sending SMS:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

app.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
        const hospital = req.session.hospital; // Get hospital from session

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format with AM/PM
        const formattedDatetime = formatTo12Hour(datetime);

        // Check if the patient already exists
        const patient = await collection.findOne({ Mr_no });

        if (patient) {
            // If the patient exists, update their details with the new data except Mr_no
            let updatedSpecialties = patient.specialities || [];
            const currentTimestamp = new Date();

            // Check if the speciality already exists in the array
            const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                // If speciality exists, update the timestamp
                updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
            } else {
                // If speciality does not exist, add it with the current timestamp
                updatedSpecialties.push({
                    name: speciality,
                    timestamp: currentTimestamp
                });
            }

            // Set surveyStatus to "Not Completed" for any new appointment
            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        Name,
                        DOB,
                        datetime: formattedDatetime, // Use the formatted datetime
                        specialities: updatedSpecialties,
                        speciality, // update with the current speciality
                        dateOfSurgery,
                        phoneNumber,
                        hospital, // Add hospital to the document
                        surveyStatus: "Not Completed" // Always set surveyStatus to "Not Completed"
                    }
                }
            );

        } else {
            // If MR number does not exist, insert the new patient data
            const hashedMrNo = hashMrNo(Mr_no.toString());
            await collection.insertOne({
                ...req.body,
                datetime: formattedDatetime, // Use the formatted datetime
                hashedMrNo,
                specialities: [{
                    name: speciality,
                    timestamp: new Date()  // Add current timestamp
                }],
                hospital, // Add hospital to the document
                surveyStatus: "Not Completed" // Set surveyStatus to "Not Completed"
            });
        }

        // Create the survey link with the hashed Mr_no as a query parameter
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

        // Construct the SMS message
        const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

        // Send SMS to the patient
        await sendSMS(phoneNumber, smsMessage);

        // Redirect to data-entry.ejs with success message
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities, hospital });

    } catch (error) {
        console.error('Error inserting data into MongoDB or sending SMS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Endpoint to get patient data based on Mr_no
app.get('/api/patient/:mrNo', async (req, res) => {
    const mrNo = req.params.mrNo;
    const db = req.dataEntryDB;

    try {
        const patient = await db.collection('patient_data').findOne({ Mr_no: mrNo });

        if (patient) {
            res.json({ success: true, patient });
        } else {
            res.json({ success: false, message: 'Patient not found' });
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// Endpoint to get all available specialties
app.get('/api/specialties', async (req, res) => {
    try {
        const specialties = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.json({ success: true, specialties });
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


app.post('/send-reminder', async (req, res) => {
    const { Mr_no,speciality, } = req.body;
    const db = req.dataEntryDB;
    try {
        console.log(Mr_no);
      // Retrieve patient data based on Mr_no
    
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });
      if (!patient) {
        return res.status(400).json({ error: 'Phone Number not found' });
      }
      console.log(patient.phoneNumber);
      const surveyLink = `http://localhost:3088/search?identifier=${patient.hashedMrNo}`;
  
      // Format the datetime to 12-hour format with AM/PM (assuming same logic as before)
      const formattedDatetime = formatTo12Hour(patient.datetime);
  
      // Construct the reminder message
      const reminderMessage = `Friendly reminder! Your appointment for ${patient.speciality} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;
      
      const PatientNumber = patient.phoneNumber
      // Send SMS using your existing sendSMS function
      await sendSMS(PatientNumber, reminderMessage);
  
    //   res.json({ message: 'Reminder sent successfully' });
    res.redirect('/blank-page');
    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });