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

// // require('dotenv').config();
// require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded

require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
const IV_LENGTH = 16; // AES block size for CBC mode



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
const basePath = '/staff'; // Base path for routes
app.locals.basePath = basePath;
// const PORT = process.env.PORT || 3051;
// const PORT = 3051;
const PORT = process.env.API_DATA_ENTRY_PORT; 

// AES-256 encryption function
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);  // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV + encrypted text
}

// Helper function to decrypt the password (AES-256)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}


app.use(bodyParser.json());

// Create a router for the staff base path
const staffRouter = express.Router();

// index.js

// // Connection URIs
// const dataEntryUri = 'mongodb://localhost:27017/Data_Entry_Incoming';
// const manageDoctorsUri = 'mongodb://localhost:27017/manage_doctors';

const dataEntryUri = process.env.DATA_ENTRY_MONGO_URL;  // Use environment variable
const manageDoctorsUri = process.env.MANAGE_DOCTORS_MONGO_URL;  // Use environment variable

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
staffRouter.use((req, res, next) => {
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
staffRouter.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(basePath, express.static(path.join(__dirname, 'public'))); // Serve static files under the base path

staffRouter.use((req, res, next) => {
    res.on('finish', () => {
        if (req.session && req.session.username && req.session.hospital_code) {
            const { username, hospital_code } = req.session;
            const timestamp = new Date().toISOString();
            let Mr_no;

            if (req.method === 'POST' && req.path === '/api/data') {
                Mr_no = req.body.Mr_no;
                const { datetime, speciality } = req.body;
                const action = 'creation';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
                writeLog('appointment_logs.txt', logData);
            }

            if (req.method === 'POST' && req.path === '/api-edit') {
                Mr_no = req.body.mrNo;  // Ensure mrNo is captured correctly here
                const { datetime, speciality } = req.body;
                const action = 'modification';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
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
staffRouter.get('/', (req, res) => {
    res.render('login');
});



staffRouter.get('/blank-page', async (req, res) => {
    try {
        const hospital_code = req.session.hospital_code; 
        const site_code = req.session.site_code;
        const username = req.session.username; // Assuming username is stored in session
        
        if (!hospital_code || !site_code || !username) {
            return res.redirect(basePath); 
        }

        // Get the doctor information
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        if (!doctor) {
            return res.status(404).send('Doctor not found');
        }

        // Get patients data from the database filtered by hospital_code and site_code
        const patients = await req.dataEntryDB.collection('patient_data').find({ hospital_code, site_code }).toArray();

        // Render the blank-page template with patient data and doctor details
        res.render('blank-page', { 
            patients, 
            doctor // Pass doctor details to the template 
        });
    } catch (error) {
        console.error('Error fetching patients data:', error);
        res.status(500).send('Internal Server Error');
    }
});





staffRouter.post('/login', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body; // This is the input password

    try {
        const doctor = await doctorsDB.findOne({ username });
        if (!doctor) {
            req.flash('errorMessage', 'Invalid username. Please try again.');
            return res.redirect(basePath);
        }

        // Decrypt the stored password and compare with the input password
        const decryptedPassword = decrypt(doctor.password);
        if (decryptedPassword !== password) {
            req.flash('errorMessage', 'Incorrect password. Please try again.');
            return res.redirect(basePath);
        }

        // Check if loginCounter is 0, then redirect to reset password page
        if (doctor.loginCounter === 0) {
            req.session.username = doctor.username; // Store necessary details in session
            req.session.hospital_code = doctor.hospital_code;
            req.session.site_code = doctor.site_code;

            return res.redirect(basePath+'/reset-password'); // Redirect to reset password page
        }

        // Increment loginCounter after successful login
        await doctorsDB.updateOne(
            { username },
            { $inc: { loginCounter: 1 } }  // Increment loginCounter by 1
        );

        req.session.hospital_code = doctor.hospital_code;
        req.session.site_code = doctor.site_code;  // Store site_code in session
        req.session.username = doctor.username;
        req.session.loginTime = new Date().toISOString();

        const loginLogData = `username: ${doctor.username}, timestamp: ${req.session.loginTime}, hospital_code: ${doctor.hospital_code}, site_code: ${doctor.site_code}, action: login`;
        writeLog('user_activity_logs.txt', loginLogData);

        res.redirect(basePath+'/blank-page');
    } catch (error) {
        console.error('Error logging in:', error);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        res.redirect(basePath);
    }
});



staffRouter.get('/logout', (req, res) => {
    if (req.session && req.session.username && req.session.hospital_code && req.session.loginTime) {
        const { username, hospital_code, loginTime } = req.session;
        const logoutTime = new Date();

        // Ensure loginTime is a valid date
        const loginTimestamp = new Date(loginTime);
        const sessionDuration = (logoutTime - loginTimestamp) / 1000; // Duration in seconds

        // Log the logout activity and session duration
        const logoutLogData = `username: ${username}, timestamp: ${logoutTime.toISOString()}, hospital_code: ${hospital_code}, action: logout, session_duration: ${sessionDuration} seconds`;
        writeLog('user_activity_logs.txt', logoutLogData);
    }

    // Destroy the session and redirect to login page
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect(basePath);
    });
});


staffRouter.get('/reset-password', (req, res) => {
    // Check if the user is logged in and has a valid session
    if (!req.session.username) {
        req.flash('errorMessage', 'You must be logged in to reset your password.');
        return res.redirect(basePath);
    }

    // Render the reset password page
    res.render('reset-password', {
        success_msg: req.flash('successMessage'),
        error_msg: req.flash('errorMessage')
    });
});
staffRouter.post('/reset-password', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('staffs');
    const { newPassword, confirmPassword } = req.body;

    // Validate that passwords match
    if (newPassword !== confirmPassword) {
        req.flash('errorMessage', 'Passwords do not match.');
        return res.redirect(basePath+'/reset-password');
    }

    // Encrypt the new password
    const encryptedPassword = encrypt(newPassword);

    try {
        // Update password and reset loginCounter to 1
        await doctorsDB.updateOne(
            { username: req.session.username },
            { 
                $set: { password: encryptedPassword, loginCounter: 1 }  // Set loginCounter to 1 after password reset
            }
        );
        
        req.flash('successMessage', 'Password updated successfully.');
        res.redirect(basePath+'/blank-page');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        res.redirect(basePath+'/reset-password');
    }
});


staffRouter.get('/data-entry', async (req, res) => {
    try {
        const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username: req.session.username });
        
        res.render('data-entry', {
            specialities: specialities.filter(speciality => speciality !== 'STAFF'), 
            hospital_code: req.session.hospital_code,
            site_code: req.session.site_code,
            doctor // Ensure doctor data is passed to the template
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', {
            specialities: [], 
            hospital_code: req.session.hospital_code,
            site_code: req.session.site_code,
            doctor: null // Pass null if there's an error
        });
    }
});



staffRouter.get('/edit-appointment', async (req, res) => {
    const { Mr_no } = req.query;
    try {
        // Fetch patient data from the database using MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ Mr_no });
        if (patient) {
            // Render the edit-appointment view with the patient data
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



staffRouter.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
        const hospital_code = req.session.hospital_code; // Get hospital_code from session

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format with AM/PM
        const formattedDatetime = formatTo12Hour(datetime);

        // Log mrNo and req.body for debugging
        console.log('mrNo:', mrNo);
        console.log('req.body:', req.body);

        // Update the patient details
        const result = await collection.updateOne(
            { Mr_no: mrNo },
            {
                $set: {
                    firstName,
                    middleName,
                    lastName,
                    DOB,
                    datetime: formattedDatetime,
                    speciality, // Update speciality without timestamp
                    phoneNumber,
                    hospital_code // Add hospital_code to the document
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error('Patient with MR Number ' + mrNo + ' does not exist.');
        }

        // Fetch the updated patient data from the database
        const updatedPatient = await collection.findOne({ Mr_no: mrNo });

        if (!updatedPatient) {
            throw new Error('Failed to fetch updated patient data.');
        }

        // Prepare the updated patient data for rendering
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
            },
            successMessage: 'Patient data updated successfully.'
        });

    } catch (error) {
        const { username, hospital_code } = req.session;
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital_code: ${hospital_code}`;
        writeLog('error_logs.txt', errorData);

        console.error('Error:', error);
        if (error.message.includes('does not exist')) {
            res.status(400).json({ error: 'Patient does not exist.' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});




staffRouter.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber } = req.body;  
        const hospital_code = req.session.hospital_code;
        const site_code = req.session.site_code; // Get site_code from session

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctorId) {
            req.flash('errorMessage', 'Appointment date & time, and speciality & doctor selection are required.');
            return res.redirect(basePath+'/data-entry');
        }

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();

        let smsMessage;
        const hashedMrNo = hashMrNo(Mr_no.toString());

        if (patient) {
            // Check if the last appointment is more than or equal to 30 days ago
            const lastAppointmentDate = new Date(patient.datetime);
            const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);

            let updatedSurveyStatus = patient.surveyStatus;

            // Check if the speciality is different from the existing one
            const isSpecialityChanged = patient.speciality !== speciality;

            // If more than 30 days, set surveyStatus to "Not Completed"
            if (daysDifference >= 30 || isSpecialityChanged) {
                updatedSurveyStatus = "Not Completed";
            }

            // Update existing patient data
            let updatedSpecialities = patient.specialities || [];
            
            // Check if the speciality already exists in the array
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);

            if (specialityIndex !== -1) {
                updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(datetime);  // Use formatTo12Hour here
                if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                    updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                }
            } else {
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),  // Apply the same format
                    doctor_ids: [doctorId]
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
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        hospital_code,
                        site_code, // Add site_code to the update
                        surveyStatus: updatedSurveyStatus // Set surveyStatus based on 30-day check or speciality change
                    },
                    $unset: {
                        aiMessage: "", // Remove aiMessage field
                        aiMessageGeneratedAt: "" // Remove aiMessageGeneratedAt field
                    },
                    $push: {
                        smsLogs: {
                            type: "appointment creation",
                            speciality: speciality,
                            timestamp: currentTimestamp
                        }
                    }
                }
            );

            // Modify the SMS message to omit the survey link if surveyStatus is not "Not Completed"
            if (updatedSurveyStatus === "Not Completed") {
                const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
            } else {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
            }

        } else {
            // Insert new patient data
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),  // Use formatTo12Hour for timestamp
                    doctor_ids: [doctorId]
                }],
                speciality,
                phoneNumber,
                hospital_code,
                site_code,
                surveyStatus: "Not Completed", // For new patients, set surveyStatus to "Not Completed"
                hashedMrNo,
                smsLogs: [{
                    type: "appointment creation",
                    speciality: speciality,
                    timestamp: formatTo12Hour(datetime)  // Apply format here as well
                }]
            });

            // Always include the survey link for new patients
            const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
            smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
        }

        try {
            // Send SMS to the patient
            await sendSMS(phoneNumber, smsMessage);
            req.flash('successMessage', 'Patient added. SMS sent.');
            res.redirect(basePath+'/data-entry');
        } catch (error) {
            console.error('Error sending SMS:', error);
            req.flash('successMessage', 'Patient added, but SMS not sent.');
            res.redirect(basePath+'/data-entry');
        }
    } catch (error) {
        const { username, hospital_code, site_code } = req.session;
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital_code: ${hospital_code}, site_code: ${site_code}`;
        writeLog('error_logs.txt', errorData);

        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect(basePath+'/data-entry');
    }
});



// Endpoint to get patient data based on Mr_no
staffRouter.get('/api/patient/:mrNo', async (req, res) => {
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
staffRouter.get('/api/specialties', async (req, res) => {
    try {
        const specialties = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.json({ success: true, specialties });
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// // Endpoint to get doctors based on speciality and hospital_code


// Endpoint to get doctors based on speciality, hospital_code, and site_code
staffRouter.get('/api/doctors', async (req, res) => {
    const { speciality, hospital_code, site_code } = req.query;

    try {
        const doctors = await req.manageDoctorsDB.collection('doctors').find({
            speciality,
            hospital_code,
            site_code // Filter by site_code as well
        }).toArray();

        if (doctors.length > 0) {
            res.json({ success: true, doctors });
        } else {
            res.json({ success: false, message: 'No doctors found for this speciality, hospital_code, and site_code.' });
        }
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});





staffRouter.get('/api/specialties-doctors', async (req, res) => {
    const hospital_code = req.query.hospital_code;
    const site_code = req.query.site_code; // Get site_code from the query parameters

    try {
        const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const result = [];

        for (let speciality of specialties) {
            const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital_code, site_code }).toArray();
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



staffRouter.post('/send-reminder', async (req, res) => {
    const { Mr_no } = req.body;
    const db = req.dataEntryDB;
    try {
        // Retrieve patient data based on Mr_no
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });

        if (!patient) {
            return res.status(400).json({ error: 'Phone Number not found' });
        }

        // Get the latest speciality from the specialities array
        const latestSpeciality = patient.specialities.reduce((latest, speciality) => {
            return new Date(speciality.timestamp) > new Date(latest.timestamp) ? speciality : latest;
        }, patient.specialities[0]);

        const surveyLink = `http://localhost:3088/search?identifier=${patient.hashedMrNo}`;
        const formattedDatetime = formatTo12Hour(patient.datetime);

        // Construct the reminder message
        const reminderMessage = `Friendly reminder! Your appointment for ${latestSpeciality.name} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;

        // Send SMS using your existing sendSMS function
        await sendSMS(patient.phoneNumber, reminderMessage);

        // Log the reminder SMS in the smsLogs array
        await collection.updateOne(
            { Mr_no },
            {
                $push: {
                    smsLogs: {
                        type: "reminder",
                        speciality: latestSpeciality.name,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.redirect(basePath+'/blank-page');
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


staffRouter.post('/api/data-with-hospital_code', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, hospital_code } = req.body;  // hospital_code now taken from the body

        // Extract speciality and doctor from the combined field
        const [speciality, doctor] = req.body['speciality-doctor'].split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctor || !hospital_code) { // Ensure hospital_code is not null
            req.flash('errorMessage', 'Appointment date & time, speciality, doctor, and hospital_code are required.');
            return res.redirect(basePath+'/data-entry');
        }

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        if (patient) {
            // Update existing patient data
            let updatedSpecialities = patient.specialities || [];
            
            // Check if the speciality already exists in the array
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                // If the speciality exists, update the timestamp and add the doctor
                updatedSpecialities[specialityIndex].timestamp = currentTimestamp;
                if (!updatedSpecialities[specialityIndex].doctors.includes(doctor)) {
                    updatedSpecialities[specialityIndex].doctors.push(doctor);
                }
            } else {
                // If speciality does not exist, add a new object
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: currentTimestamp,
                    doctors: [doctor]
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
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        hospital_code,  // Now using the hospital_code from the form data
                        surveyStatus: "Not Completed"
                    },
                    $push: {
                        smsLogs: {
                            type: "appointment creation",
                            speciality: speciality,
                            timestamp: currentTimestamp
                        }
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
                    doctors: [doctor]
                }],
                speciality,
                phoneNumber,
                hospital_code,  // Now using the hospital_code from the form data
                surveyStatus: "Not Completed",
                hashedMrNo,
                smsLogs: [{
                    type: "appointment creation",
                    speciality: speciality,
                    timestamp: new Date()
                }]
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
            res.redirect(basePath+'/data-entry');
        } catch (error) {
            console.error('Error sending SMS:', error);
            req.flash('successMessage', 'Patient added, but SMS not sent.');
            res.redirect(basePath+'/data-entry');
        }
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect(basePath+'/data-entry');
    }
});






// Mount the staff router at the base path
app.use(basePath, staffRouter);


function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on http://localhost${basePath}`);
    });
}



module.exports = startServer;
