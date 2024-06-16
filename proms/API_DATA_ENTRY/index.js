// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module

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

// Access databases and collections in the routes as needed
app.use((req, res, next) => {
    req.dataEntryDB = dataEntryClient.db();
    req.manageDoctorsDB = manageDoctorsClient.db();
    next();
});




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

// Login form submission
app.post('/login', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('doctors');
    const { username, password } = req.body;

    try {
        const doctor = await doctorsDB.findOne({ username });
        if (!doctor || doctor.password !== password) {
            return res.render('login', { errorMessage: 'Invalid username or password' });
        }

        // Login successful, redirect to data entry
        res.redirect('/data-entry');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).render('login', { errorMessage: 'Internal server error' });
    }
});

// Data entry route (protected by login)
app.get('/data-entry', async (req, res) => {

    try {
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.render('data-entry', { specialities });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', { specialities: [] });
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
//     const db = req.dataEntryDB; // Access the Data_Entry_Incoming database from the request object
//     try {
//         const { Mr_no, datetime, speciality } = req.body;

//         // Access a collection within the database
//         const collection = db.collection('patient_data');
//         // Fetch distinct specialities from surveys collection
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         // Check if MR number exists in the database
//         const patient = await collection.findOne({ Mr_no });

//         if (!patient) {
//             // If MR number does not exist, insert the submitted data into the collection
//             await collection.insertOne(req.body);
//         } else {
//             // If MR number exists, check the specialty
//             if (patient.speciality === speciality) {
//                 // If specialty is the same, update the datetime field
//                 await collection.updateOne(
//                     { Mr_no },
//                     { $set: { datetime } }
//                 );
//             } else {
//                 // If specialty is different, update the datetime field and add specialty to an array
//                 const updatedSpecialties = patient.specialities || [];
//                 if (!updatedSpecialties.includes(speciality)) {
//                     updatedSpecialties.push(speciality);
//                 }

//                 await collection.updateOne(
//                     { Mr_no },
//                     { $set: { datetime, specialities: updatedSpecialties } }
//                 );
//             }
//         }

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true, specialities });

//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });





// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, datetime, speciality, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         const patient = await collection.findOne({ Mr_no });

//         if (!patient) {
//             await collection.insertOne(req.body);
//         } else {
//             const updatedSpecialties = patient.specialities || [];
//             if (!updatedSpecialties.includes(speciality)) {
//                 updatedSpecialties.push(speciality);
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 { $set: { datetime, specialities: updatedSpecialties } }
//             );
//         }

//         // Create the survey link with Mr_no as a query parameter
//         const surveyLink = `http://localhost:3088/search?identifier=${Mr_no}`;

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
//         const { Mr_no, datetime, speciality, phoneNumber } = req.body;

//         const collection = db.collection('patient_data');
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         const patient = await collection.findOne({ Mr_no });

//         if (!patient) {
//             await collection.insertOne(req.body);
//         } else {
//             const updatedSpecialties = patient.specialities || [];
//             if (!updatedSpecialties.includes(speciality)) {
//                 updatedSpecialties.push(speciality);
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 { $set: { datetime, specialities: updatedSpecialties } }
//             );
//         }

//         // Hash the MR number for security
//         const hashedMrNo = hashMrNo(Mr_no.toString());

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





app.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, datetime, speciality, phoneNumber } = req.body;

        const collection = db.collection('patient_data');
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        const patient = await collection.findOne({ Mr_no });

        // Hash the MR number for security
        const hashedMrNo = hashMrNo(Mr_no.toString());

        if (!patient) {
            // If MR number does not exist, insert the submitted data along with the hashed MR number
            await collection.insertOne({ ...req.body, hashedMrNo });
        } else {
            // If MR number exists, check the specialty
            const updatedSpecialties = patient.specialities || [];
            if (!updatedSpecialties.includes(speciality)) {
                updatedSpecialties.push(speciality);
            }

            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        datetime,
                        specialities: updatedSpecialties,
                        hashedMrNo // Update the hashed MR number as well
                    }
                }
            );
        }

        // Create the survey link with the hashed Mr_no as a query parameter
        const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;

        // Construct the SMS message
        const smsMessage = `Dear patient, your appointment for ${speciality} on ${datetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

        // Send SMS to the patient
        await sendSMS(phoneNumber, smsMessage);

        // Redirect to data-entry.ejs with success message
        res.render('data-entry', { successMessage: 'Data entry is done. SMS sent.', redirect: true, specialities });

    } catch (error) {
        console.error('Error inserting data into MongoDB or sending SMS:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});