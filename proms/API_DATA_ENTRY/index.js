// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');


// Add session management dependencies
const session = require('express-session');
const MongoStore = require('connect-mongo');

require('dotenv').config();


// Import Twilio SDK
const twilio = require('twilio');
const crypto = require('crypto');
const flash = require('connect-flash');
// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// Add this after express-session middleware





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


app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secret key from environment variables
    resave: false,
    saveUninitialized: false, // Ensure sessions are only saved when modified
    store: MongoStore.create({ mongoUrl: manageDoctorsUri }),
    cookie: { secure: false, maxAge: 60000 * 30 } // Set appropriate cookie options
}));



// Log function
function writeLog(logFile, logData) {
    fs.appendFile(path.join(__dirname, 'logs', logFile), logData + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}





function formatTo12Hour(datetime) {
    const date = new Date(datetime);
    if (isNaN(date)) {
        return "Invalid Date";
    }
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}




app.use(flash());

// Ensure flash messages are available in all templates
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));



// app.use((req, res, next) => {
//     res.on('finish', () => {
//         const { username, hospital } = req.session;
//         const timestamp = new Date().toISOString();
//         let Mr_no;

//         if (req.method === 'POST' && req.path === '/api/data') {
//             Mr_no = req.body.Mr_no;
//             const { datetime, speciality } = req.body;
//             const action = 'creation';
//             const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital: ${hospital}, datetime: ${datetime}, speciality: ${speciality}`;
//             writeLog('appointment_logs.txt', logData);
//         }

//         if (req.method === 'POST' && req.path === '/api-edit') {
//             Mr_no = req.body.mrNo;  // Ensure mrNo is captured correctly here
//             const { datetime, speciality } = req.body;
//             const action = 'modification';
//             const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital: ${hospital}, datetime: ${datetime}, speciality: ${speciality}`;
//             writeLog('appointment_logs.txt', logData);
//         }
//     });
//     next();
// });

app.use((req, res, next) => {
    res.on('finish', () => {
        if (req.session && req.session.username && req.session.hospital) {
            const { username, hospital } = req.session;
            const timestamp = new Date().toISOString();
            let Mr_no;

            if (req.method === 'POST' && req.path === '/api/data') {
                Mr_no = req.body.Mr_no;
                const { datetime, speciality } = req.body;
                const action = 'creation';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital: ${hospital}, datetime: ${datetime}, speciality: ${speciality}`;
                writeLog('appointment_logs.txt', logData);
            }

            if (req.method === 'POST' && req.path === '/api-edit') {
                Mr_no = req.body.mrNo;  // Ensure mrNo is captured correctly here
                const { datetime, speciality } = req.body;
                const action = 'modification';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital: ${hospital}, datetime: ${datetime}, speciality: ${speciality}`;
                writeLog('appointment_logs.txt', logData);
            }
        }
    });
    next();
});


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
        res.status(500).send('Internal Server Error');
    }
});







// app.post('/login', async (req, res) => {
//     const doctorsDB = req.manageDoctorsDB.collection('staffs');
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
    const doctorsDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body;

    try {
        const doctor = await doctorsDB.findOne({ username });
        if (!doctor || doctor.password !== password) {
            return res.render('login', { errorMessage: 'Invalid username or password' });
        }

        // Initialize the session with user data
        req.session.hospital = doctor.hospital;
        req.session.username = doctor.username; // Optionally store the username or other info
        req.session.loginTime = new Date().toISOString();

        // Log the login activity
        const loginLogData = `username: ${doctor.username}, timestamp: ${req.session.loginTime}, hospital: ${doctor.hospital}, action: login`;
        writeLog('user_activity_logs.txt', loginLogData);

        // Login successful, redirect to blank page
        res.redirect('/blank-page');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).render('login', { errorMessage: 'Internal server error' });
    }
});


app.get('/logout', (req, res) => {
    if (req.session && req.session.username && req.session.hospital && req.session.loginTime) {
        const { username, hospital, loginTime } = req.session;
        const logoutTime = new Date();

        // Ensure loginTime is a valid date
        const loginTimestamp = new Date(loginTime);
        const sessionDuration = (logoutTime - loginTimestamp) / 1000; // Duration in seconds

        // Log the logout activity and session duration
        const logoutLogData = `username: ${username}, timestamp: ${logoutTime.toISOString()}, hospital: ${hospital}, action: logout, session_duration: ${sessionDuration} seconds`;
        writeLog('user_activity_logs.txt', logoutLogData);
    }

    // Destroy the session and redirect to login page
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});





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



// app.get('/edit-appointment', async (req, res) => {
//     const { Mr_no } = req.query;
//     try {
//         // Fetch patient data from the database using MR number
//         const patient = await req.dataEntryDB.collection('patient_data').findOne({ Mr_no });
//         if (patient) {
//             // Render the edit-appointment view with the patient data
//             res.render('edit-appointment', {
//                 patient: {
//                     mrNo: patient.Mr_no,
//                     firstName: patient.firstName || '',
//                     middleName: patient.middleName || '',
//                     lastName: patient.lastName || '',
//                     DOB: patient.DOB,
//                     phoneNumber: patient.phoneNumber,
//                     datetime: patient.datetime,
//                     speciality: patient.speciality,
//                 },
//                 successMessage: req.flash('successMessage'),
//                 errorMessage: req.flash('errorMessage')
//             });
//         } else {
//             res.status(404).send('Patient not found');
//         }
//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });
// app.get('/edit-appointment', async (req, res) => {
//     const { Mr_no } = req.query;  // Assuming MR number is passed as a query parameter
//     const db = req.dataEntryDB;
//     try {
//         // Fetch patient data from the database using MR number
//         const patient = await db.collection('patient_data').findOne({ Mr_no });
//         if (!patient) {
//             return res.status(404).send('Patient not found');
//         }

//         // Fetch all specialities and their respective doctors for the hospital
//         const hospital = patient.hospital;
//         const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const specialtyDoctorData = [];

//         for (let speciality of specialties) {
//             const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital }).toArray();
//             if (doctors.length > 0) {
//                 specialtyDoctorData.push({ name: speciality, doctors });
//             }
//         }

//         // Render the edit-appointment view with the patient data and available specialties-doctors
//         res.render('edit-appointment', {
//             patient: {
//                 mrNo: patient.Mr_no,
//                 firstName: patient.firstName || '',
//                 middleName: patient.middleName || '',
//                 lastName: patient.lastName || '',
//                 DOB: patient.DOB,
//                 phoneNumber: patient.phoneNumber,
//                 datetime: patient.datetime,
//                 speciality: patient.speciality || '',  // Assuming we still need to keep the current speciality for reference
//                 doctor: patient.specialities?.find(s => s.name === patient.speciality)?.doctors?.[0] || '', // Fetch the first doctor for the current speciality
//                 hospital: patient.hospital
//             },
//             specialtyDoctorData,
//             successMessage: req.flash('successMessage'),
//             errorMessage: req.flash('errorMessage')
//         });
//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// app.post('/api-edit', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, doctor, phoneNumber } = req.body;
//         const hospital = req.session.hospital;

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Update the patient details
//         const patient = await collection.findOne({ Mr_no: mrNo });
//         if (patient) {
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();
            
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 const specialityObject = updatedSpecialties[specialityIndex];
                
//                 specialityObject.doctors = specialityObject.doctors || [];
                
//                 if (!specialityObject.doctors.includes(doctor)) {
//                     specialityObject.doctors.push(doctor);
//                 }
                
//                 specialityObject.timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp,
//                     doctors: [doctor]
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no: mrNo },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         phoneNumber,
//                         hospital
//                     }
//                 }
//             );

//             const updatedPatient = await collection.findOne({ Mr_no: mrNo });
//             res.render('edit-appointment', {
//                 patient: {
//                     mrNo: updatedPatient.Mr_no,
//                     firstName: updatedPatient.firstName,
//                     middleName: updatedPatient.middleName,
//                     lastName: updatedPatient.lastName,
//                     DOB: updatedPatient.DOB,
//                     phoneNumber: updatedPatient.phoneNumber,
//                     datetime: updatedPatient.datetime,
//                     speciality: updatedPatient.speciality,
//                 },
//                 successMessage: 'Patient data updated successfully.'
//             });
//         } else {
//             res.status(404).send('Patient not found');
//         }
//     } catch (error) {
//         const { username, hospital } = req.session;
//         const timestamp = new Date().toISOString();
//         const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
//         writeLog('error_logs.txt', errorData);

//         console.error('Error:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// app.get('/edit-appointment', async (req, res) => {
//     const { Mr_no } = req.query;  // Assuming MR number is passed as a query parameter
//     const db = req.dataEntryDB;
//     try {
//         // Fetch patient data from the database using MR number
//         const patient = await db.collection('patient_data').findOne({ Mr_no });
//         if (!patient) {
//             return res.status(404).send('Patient not found');
//         }

//         // Fetch all specialities and their respective doctors for the hospital
//         const hospital = patient.hospital;
//         const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const specialtyDoctorData = [];

//         for (let speciality of specialties) {
//             const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital }).toArray();
//             if (doctors.length > 0) {
//                 specialtyDoctorData.push({ name: speciality, doctors });
//             }
//         }

//         // Render the edit-appointment view with the patient data and available specialties-doctors
//         res.render('edit-appointment', {
//             patient: {
//                 mrNo: patient.Mr_no,
//                 firstName: patient.firstName || '',
//                 middleName: patient.middleName || '',
//                 lastName: patient.lastName || '',
//                 DOB: patient.DOB,
//                 phoneNumber: patient.phoneNumber,
//                 datetime: patient.datetime,
//                 speciality: patient.speciality || '',  // Assuming we still need to keep the current speciality for reference
//                 doctor: patient.specialities?.find(s => s.name === patient.speciality)?.doctors?.[0] || '', // Fetch the first doctor for the current speciality
//                 hospital: patient.hospital
//             },
//             specialtyDoctorData,
//             successMessage: req.flash('successMessage'),
//             errorMessage: req.flash('errorMessage')
//         });
//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


// app.get('/edit-appointment', async (req, res) => {
//     const { Mr_no } = req.query;
//     const hospital = req.session.hospital; // Get the hospital from the session

//     try {
//         // Fetch patient data from the database using MR number
//         const patient = await req.dataEntryDB.collection('patient_data').findOne({ Mr_no });

//         if (!patient) {
//             return res.status(404).send('Patient not found');
//         }

//         // Fetch all specialities and their respective doctors
//         const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const specialtyDoctorData = [];

//         for (let speciality of specialities) {
//             const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital }).toArray();
//             if (doctors.length > 0) {
//                 specialtyDoctorData.push({ name: speciality, doctors });
//             }
//         }

//         // Render the edit-appointment view with patient data and speciality-doctor data
//         res.render('edit-appointment', {
//             patient: {
//                 mrNo: patient.Mr_no,
//                 firstName: patient.firstName || '',
//                 middleName: patient.middleName || '',
//                 lastName: patient.lastName || '',
//                 DOB: patient.DOB,
//                 phoneNumber: patient.phoneNumber,
//                 datetime: patient.datetime,
//                 speciality: patient.speciality,
//                 doctor: patient.specialities.find(s => s.name === patient.speciality)?.doctors[0] || ''
//             },
//             specialtyDoctorData, // Pass the speciality and doctor data to the view
//             successMessage: req.flash('successMessage'),
//             errorMessage: req.flash('errorMessage')
//         });

//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.get('/edit-appointment', async (req, res) => {
    const { Mr_no } = req.query;
    try {
        // Fetch patient data from the database using MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ Mr_no });
        
        if (patient) {
            // Fetch all specialities and their respective doctors
            const hospital = req.session.hospital;
            const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
            const specialtyDoctorPairs = [];

            for (let speciality of specialties) {
                const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital }).toArray();
                if (doctors.length > 0) {
                    doctors.forEach(doctor => {
                        specialtyDoctorPairs.push({
                            speciality,
                            doctor: doctor.name
                        });
                    });
                }
            }

            // Render the edit-appointment view with the patient data and specialties
            res.render('edit-appointment', {
                patient: {
                    mrNo: patient.Mr_no,
                    firstName: patient.firstName || '',
                    middleName: patient.middleName || '',
                    lastName: patient.lastName || '',
                    DOB: patient.DOB,
                    phoneNumber: patient.phoneNumber,
                    datetime: patient.datetime,
                    speciality: patient.speciality,
                },
                specialtyDoctorPairs,
                successMessage: req.flash('successMessage'),
                errorMessage: req.flash('errorMessage')
            });
        } else {
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// app.post('/api-edit', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Log mrNo and req.body for debugging
//         console.log('mrNo:', mrNo);
//         console.log('req.body:', req.body);

//         // Update the patient details
//         const result = await collection.updateOne(
//             { Mr_no: mrNo },
//             {
//                 $set: {
//                     firstName,
//                     middleName,
//                     lastName,
//                     DOB,
//                     datetime: formattedDatetime,
//                     speciality, // Update speciality without timestamp
//                     phoneNumber,
//                     hospital // Add hospital to the document
//                 }
//             }
//         );

//         if (result.matchedCount === 0) {
//             throw new Error('Patient with MR Number ' + mrNo + ' does not exist.');
//         }

//         // Fetch the updated patient data from the database
//         const updatedPatient = await collection.findOne({ Mr_no: mrNo });

//         if (!updatedPatient) {
//             throw new Error('Failed to fetch updated patient data.');
//         }

//         // Prepare the updated patient data for rendering
//         res.render('edit-appointment', {
//             patient: {
//                 mrNo: updatedPatient.Mr_no,
//                 firstName: updatedPatient.firstName,
//                 middleName: updatedPatient.middleName,
//                 lastName: updatedPatient.lastName,
//                 DOB: updatedPatient.DOB,
//                 phoneNumber: updatedPatient.phoneNumber,
//                 datetime: updatedPatient.datetime,
//                 speciality: updatedPatient.speciality,
//             },
//             successMessage: 'Patient data updated successfully.'
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         if (error.message.includes('does not exist')) {
//             res.status(400).json({ error: 'Patient does not exist.' });
//         } else {
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     }
// });


// app.post('/api-edit', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format with AM/PM
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Log mrNo and req.body for debugging
//         console.log('mrNo:', mrNo);
//         console.log('req.body:', req.body);

//         // Update the patient details
//         const result = await collection.updateOne(
//             { Mr_no: mrNo },
//             {
//                 $set: {
//                     firstName,
//                     middleName,
//                     lastName,
//                     DOB,
//                     datetime: formattedDatetime,
//                     speciality, // Update speciality without timestamp
//                     phoneNumber,
//                     hospital // Add hospital to the document
//                 }
//             }
//         );

//         if (result.matchedCount === 0) {
//             throw new Error('Patient with MR Number ' + mrNo + ' does not exist.');
//         }

//         // Fetch the updated patient data from the database
//         const updatedPatient = await collection.findOne({ Mr_no: mrNo });

//         if (!updatedPatient) {
//             throw new Error('Failed to fetch updated patient data.');
//         }

//         // Prepare the updated patient data for rendering
//         res.render('edit-appointment', {
//             patient: {
//                 mrNo: updatedPatient.Mr_no,
//                 firstName: updatedPatient.firstName,
//                 middleName: updatedPatient.middleName,
//                 lastName: updatedPatient.lastName,
//                 DOB: updatedPatient.DOB,
//                 phoneNumber: updatedPatient.phoneNumber,
//                 datetime: updatedPatient.datetime,
//                 speciality: updatedPatient.speciality,
//             },
//             successMessage: 'Patient data updated successfully.'
//         });

//     } catch (error) {
//         const { username, hospital } = req.session;
//         const timestamp = new Date().toISOString();
//         const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
//         writeLog('error_logs.txt', errorData);

//         console.error('Error:', error);
//         if (error.message.includes('does not exist')) {
//             res.status(400).json({ error: 'Patient does not exist.' });
//         } else {
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     }
// });




// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital = req.session.hospital;

//         // Validate required fields
//         if (!datetime || !speciality) {
//             req.flash('errorMessage', 'Appointment date & time and speciality are required.');
//             return res.redirect('/data-entry');
//         }

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         if (patient) {
//             // Update existing patient data
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();
        
//             // Update the timestamp for the existing speciality or add a new speciality
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }
        
//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality, // Ensure the speciality field is updated
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );
//         } else {
//             // Insert new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 Mr_no,
//                 firstName,
//                 middleName,
//                 lastName,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()
//                 }],
//                 speciality, // Ensure the speciality field is included
//                 phoneNumber,
//                 hospital,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo
//             });
//         }
        
//         // Generate the survey link and SMS message
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             // Send SMS to the patient
//             await sendSMS(phoneNumber, smsMessage);
//             req.flash('successMessage', 'Patient added. SMS sent.');
//             res.redirect('/data-entry');
//         } catch (error) {
//             console.error('Error sending SMS:', error);
//             req.flash('successMessage', 'Patient added, but SMS not sent.');
//             res.redirect('/data-entry');
//         }
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         req.flash('errorMessage', 'Internal server error.');
//         res.redirect('/data-entry');
//     }
// });


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital = req.session.hospital;

//         // Validate required fields
//         if (!datetime || !speciality) {
//             req.flash('errorMessage', 'Appointment date & time and speciality are required.');
//             return res.redirect('/data-entry');
//         }

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         if (patient) {
//             // Update existing patient data
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();
        
//             // Update the timestamp for the existing speciality or add a new speciality
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }
        
//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality, // Ensure the speciality field is updated
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );
//         } else {
//             // Insert new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 Mr_no,
//                 firstName,
//                 middleName,
//                 lastName,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()
//                 }],
//                 speciality, // Ensure the speciality field is included
//                 phoneNumber,
//                 hospital,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo
//             });
//         }
        
//         // Generate the survey link and SMS message
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             // Send SMS to the patient
//             await sendSMS(phoneNumber, smsMessage);
//             req.flash('successMessage', 'Patient added. SMS sent.');
//             res.redirect('/data-entry');
//         } catch (error) {
//             console.error('Error sending SMS:', error);
//             req.flash('successMessage', 'Patient added, but SMS not sent.');
//             res.redirect('/data-entry');
//         }
//     } catch (error) {
//         const { username, hospital } = req.session;
//         const timestamp = new Date().toISOString();
//         const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
//         writeLog('error_logs.txt', errorData);

//         console.error('Error inserting data into MongoDB:', error);
//         req.flash('errorMessage', 'Internal server error.');
//         res.redirect('/data-entry');
//     }
// });

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, speciality, doctor, phoneNumber } = req.body;  // Include doctor
//         const hospital = req.session.hospital;

//         // Validate required fields
//         if (!datetime || !speciality || !doctor) {  // Add doctor to validation
//             req.flash('errorMessage', 'Appointment date & time, speciality, and doctor are required.');
//             return res.redirect('/data-entry');
//         }

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         if (patient) {
//             // Update existing patient data
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();
        
//             // Update the timestamp and doctor for the existing speciality or add a new speciality
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If the speciality already exists, update the doctor array
//                 const specialityObject = updatedSpecialties[specialityIndex];
                
//                 // Ensure the doctors field is an array and add the new doctor if not already present
//                 specialityObject.doctors = specialityObject.doctors || [];
                
//                 if (!specialityObject.doctors.includes(doctor)) {
//                     specialityObject.doctors.push(doctor);
//                 }
                
//                 specialityObject.timestamp = currentTimestamp;
//             } else {
//                 // If it's a new speciality, create a new object with the doctor
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp,
//                     doctors: [doctor]  // Add the doctor in an array
//                 });
//             }
        
//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality,  // Ensure the speciality field is updated
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );
//         } else {
//             // Insert new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 Mr_no,
//                 firstName,
//                 middleName,
//                 lastName,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date(),
//                     doctors: [doctor]  // Store the doctor name in an array
//                 }],
//                 speciality,  // Ensure the speciality field is included
//                 phoneNumber,
//                 hospital,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo
//             });
//         }
        
//         // Generate the survey link and SMS message
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             // Send SMS to the patient
//             await sendSMS(phoneNumber, smsMessage);
//             req.flash('successMessage', 'Patient added. SMS sent.');
//             res.redirect('/data-entry');
//         } catch (error) {
//             console.error('Error sending SMS:', error);
//             req.flash('successMessage', 'Patient added, but SMS not sent.');
//             res.redirect('/data-entry');
//         }
//     } catch (error) {
//         const { username, hospital } = req.session;
//         const timestamp = new Date().toISOString();
//         const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
//         writeLog('error_logs.txt', errorData);

//         console.error('Error inserting data into MongoDB:', error);
//         req.flash('errorMessage', 'Internal server error.');
//         res.redirect('/data-entry');
//     }
// });


app.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { mrNo, firstName, middleName, lastName, DOB, datetime, specialityDoctor, phoneNumber } = req.body;
        const hospital = req.session.hospital;

        const [speciality, doctor] = specialityDoctor.split('||');

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format with AM/PM
        const formattedDatetime = formatTo12Hour(datetime);

        // Update the patient details
        const patient = await collection.findOne({ Mr_no: mrNo });
        if (patient) {
            let updatedSpecialties = patient.specialities || [];
            const currentTimestamp = new Date();

            const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                const specialityObject = updatedSpecialties[specialityIndex];
                
                specialityObject.doctors = specialityObject.doctors || [];
                
                if (!specialityObject.doctors.includes(doctor)) {
                    specialityObject.doctors.push(doctor);
                }
                
                specialityObject.timestamp = currentTimestamp;
            } else {
                updatedSpecialties.push({
                    name: speciality,
                    timestamp: currentTimestamp,
                    doctors: [doctor]
                });
            }

            await collection.updateOne(
                { Mr_no: mrNo },
                {
                    $set: {
                        firstName,
                        middleName,
                        lastName,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialties,
                        speciality,  // Update the speciality field
                        phoneNumber,
                        hospital
                    }
                }
            );

            const updatedPatient = await collection.findOne({ Mr_no: mrNo });
            res.render('edit-appointment', {
                patient: {
                    mrNo: updatedPatient.Mr_no,
                    firstName: updatedPatient.firstName,
                    middleName: updatedPatient.middleName,
                    lastName: updatedPatient.lastName,
                    DOB: updatedPatient.DOB,
                    phoneNumber: updatedPatient.phoneNumber,
                    datetime: updatedPatient.datetime,
                    speciality: updatedPatient.speciality,
                    doctor: doctor, // Save selected doctor
                },
                successMessage: 'Patient data updated successfully.'
            });
        } else {
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        const { username, hospital } = req.session;
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
        writeLog('error_logs.txt', errorData);

        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber } = req.body;  // Removed speciality and doctor from here
        const hospital = req.session.hospital;

        // Extract speciality and doctor from the combined field
        const [speciality, doctor] = req.body['speciality-doctor'].split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctor) {
            req.flash('errorMessage', 'Appointment date & time, and speciality & doctor selection are required.');
            return res.redirect('/data-entry');
        }

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        if (patient) {
            // Update existing patient data
            let updatedSpecialties = patient.specialities || [];
            const currentTimestamp = new Date();
        
            // Update the timestamp and doctor for the existing speciality or add a new speciality
            const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                // If the speciality already exists, update the doctor array
                const specialityObject = updatedSpecialties[specialityIndex];
                
                // Ensure the doctors field is an array and add the new doctor if not already present
                specialityObject.doctors = specialityObject.doctors || [];
                
                if (!specialityObject.doctors.includes(doctor)) {
                    specialityObject.doctors.push(doctor);
                }
                
                specialityObject.timestamp = currentTimestamp;
            } else {
                // If it's a new speciality, create a new object with the doctor
                updatedSpecialties.push({
                    name: speciality,
                    timestamp: currentTimestamp,
                    doctors: [doctor]  // Add the doctor in an array
                });
            }
        
            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        firstName,
                        middleName,
                        lastName,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialties,
                        speciality,  // Ensure the speciality field is updated
                        phoneNumber,
                        hospital,
                        surveyStatus: "Not Completed"
                    }
                }
            );
        } else {
            // Insert new patient data
            const hashedMrNo = hashMrNo(Mr_no.toString());
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: new Date(),
                    doctors: [doctor]  // Store the doctor name in an array
                }],
                speciality,  // Ensure the speciality field is included
                phoneNumber,
                hospital,
                surveyStatus: "Not Completed",
                hashedMrNo
            });
        }
        
        // Generate the survey link and SMS message
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
        const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

        try {
            // Send SMS to the patient
            await sendSMS(phoneNumber, smsMessage);
            req.flash('successMessage', 'Patient added. SMS sent.');
            res.redirect('/data-entry');
        } catch (error) {
            console.error('Error sending SMS:', error);
            req.flash('successMessage', 'Patient added, but SMS not sent.');
            res.redirect('/data-entry');
        }
    } catch (error) {
        const { username, hospital } = req.session;
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital: ${hospital}`;
        writeLog('error_logs.txt', errorData);

        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect('/data-entry');
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

// Endpoint to get doctors based on speciality and hospital
app.get('/api/doctors', async (req, res) => {
    const { speciality, hospital } = req.query;

    try {
        const doctors = await req.manageDoctorsDB.collection('doctors').find({
            speciality,
            hospital
        }).toArray();

        if (doctors.length > 0) {
            res.json({ success: true, doctors });
        } else {
            res.json({ success: false, message: 'No doctors found for this speciality and hospital.' });
        }
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Endpoint to get all specialities and their respective doctors for the given hospital
app.get('/api/specialties-doctors', async (req, res) => {
    const hospital = req.query.hospital;

    try {
        const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const result = [];

        for (let speciality of specialties) {
            const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital }).toArray();
            if (doctors.length > 0) {
                result.push({ name: speciality, doctors });
            }
        }

        if (result.length > 0) {
            res.json({ success: true, specialties: result });
        } else {
            res.json({ success: false, message: 'No specialities or doctors found.' });
        }
    } catch (error) {
        console.error('Error fetching specialties and doctors:', error);
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


