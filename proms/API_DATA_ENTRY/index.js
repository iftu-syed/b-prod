// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const fsPromises = require('fs').promises;
const app = express();
const i18nextMiddleware = require('i18next-http-middleware');
const i18next = require('i18next');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');
const upload = multer({ dest: "uploads/" });
const sgMail = require('@sendgrid/mail');
const { ObjectId } = require('mongodb');

const ExcelJS = require('exceljs');

const axios = require('axios');



// 2. Configuration for the Mock Auth Server
// const MOCK_AUTH_SERVER_BASE_URL = 'https://app.wehealthify.org:3006'; // URL of your mock_auth_server.js
// const MOCK_AUTH_CLIENT_ID = 'test_client_id_123';         // Client ID for mock server
// const MOCK_AUTH_CLIENT_SECRET = 'super_secret_key_shhh';  // Client Secret for mock server

// ===== START: Bupa/GOQii API Configuration =====
const BUPA_API_BASE_URL = 'https://app.wehealthify.org:3006'; //
const BUPA_API_CLIENT_ID = 'clientexample'; // Replace with actual clientId from Bupa/GOQii
const BUPA_API_SECRET = 'secretexample';   // Replace with actual secret from Bupa/GOQii


app.use('/stafflogin/locales', express.static(path.join(__dirname, 'views/locales')));;
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, 'views/locales/{{lng}}/translation.json'),
    },
    fallbackLng: 'en',
    preload: ['en', 'ar'], // Supported languages
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });
  app.use(i18nextMiddleware.handle(i18next));

// Add session management dependencies
const session = require('express-session');
const MongoStore = require('connect-mongo');

// // require('dotenv').config();
// require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded

require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
const IV_LENGTH = 16; // AES block size for CBC mode

app.use(express.urlencoded({ extended: true }));

// Import Twilio SDK
const twilio = require('twilio');
const crypto = require('crypto');
const flash = require('connect-flash');
// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// Add this after express-session middleware





const basePath = '/stafflogin'; // Base path for routes
app.locals.basePath = basePath;

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

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
// const apiUri = process.env.API_URL;
const adminUserUri = process.env.ADMIN_USER_URL;

// Create new MongoClient instances for both databases
const dataEntryClient = new MongoClient(dataEntryUri);
const manageDoctorsClient = new MongoClient(manageDoctorsUri);
// const apiClient = new MongoClient(apiUri);
const adminUserClient = new MongoClient(adminUserUri);

// Connect to both MongoDB databases
async function connectToMongoDB() {
    try {
        await Promise.all([
            dataEntryClient.connect(),
            manageDoctorsClient.connect(),
            // apiClient.connect(),
            adminUserClient.connect()
        ]);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();


// Access databases and collections in the routes as needed
staffRouter.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    
    req.dataEntryDB = dataEntryClient.db();
    req.manageDoctorsDB = manageDoctorsClient.db();
    // req.apiDB = apiClient.db();
    req.adminUserDB = adminUserClient.db();
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

function getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 25px;
                font-size: 24px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .cta-button {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                background-color: #3b82f6;
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: background-color 0.3s;
            }
            .cta-button:hover {
                background-color: #2563eb;
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  Appointment Confirmation
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> kindly requests that you complete a short questionnaire ahead of your appointment on <strong>${formattedDatetime}</strong>. This information will help us understand your current health state and provide you with the most effective care possible.</p><br>
                  <p>Please select the link below to begin the questionnaire:</p><br>
                  <a href="https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="cta-button">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
}


function getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reminder</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif !important;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .survey-link {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff !important;
                background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: transform 0.3s ease;
            }
            .survey-link:hover {
                background: linear-gradient(90deg, #0053d4, #009fd1);
                transform: translateY(-2px);
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  <h1>Reminder</h1>
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Your appointment for <strong>${speciality}</strong> is approaching. Don't forget to complete your survey beforehand. </p>
                  <p>If already completed, ignore. </p> <br>
                  
                  <a href="https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
  }
  
  function getFollowUpHtml(firstName, doctorName, hashedMrNo) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Follow Up</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif !important;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .survey-link {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff !important;
                background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: transform 0.3s ease;
            }
            .survey-link:hover {
                background: linear-gradient(90deg, #0053d4, #009fd1);
                transform: translateY(-2px);
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  <h1>Follow Up</h1>
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> once again kindly requests that you complete a short questionnaire to assess how your health has changed as a result of your treatment.</p><br>
                  <p>Please select the link below to begin.</p><br>
                  <a href="https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
}


sgMail.setApiKey(process.env.SENDGRID_API_KEY);
async function sendEmail(to, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName ) {
    console.log("Sending email to:", to);
    console.log("Email Type:", emailType);
    console.log("Speciality:", speciality);
    console.log("Formatted Datetime:", formattedDatetime);
    console.log("Hashed MR No:", hashedMrNo);
    console.log("First Name:", firstName);
    console.log("Doctor Name:", doctorName);
    let htmlBody;
  
    // Choose the appropriate template based on the emailType
    switch (emailType) {
      case 'appointmentConfirmation':
        htmlBody = getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to);
        break;
      case 'appointmentReminder':
        htmlBody = getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to);
        break;
      case 'postAppointmentFeedback':
        htmlBody = getFollowUpHtml(firstName, doctorName, hashedMrNo);
        break;
      default:
        throw new Error("Invalid email type");
    }
    //console.log("HTML Body generated:", htmlBody);
    const msg = {
        to: to, 
        from: 'sara@giftysolutions.com', // Change to your verified sender
        subject: 'Help Us Improve Your Care: Complete Your Health Survey',
        html: htmlBody,
    }
    try {
            console.log("In sendEmail");
            await sgMail.send(msg);
            console.log('Email sent successfully');
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
}
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
    res.render('login', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});




function formatTo12Hour(dateInput) {
    // This is just an example formatTo12Hour. 
    // In your actual code, you might already have a different/better implementation.
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
        // If invalid date, just return whatever was passed
        return dateInput;
    }
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
}


// staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
//     const validateOnly = req.body.validate_only === "true"; // If true, only validate

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;

//     // --- Database Connections (Ensure these are correctly passed via req) ---
//     // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // --- Session Data (Ensure session middleware is used) ---
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//          console.error("Upload Error: Missing hospital_code or site_code in session.");
//          await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//          return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//     try {
//         // --- Initialization ---
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = []; // To store rows passing validation + their parsed date object

//         // --- Header Mapping ---
//         const headerMapping = {
//              'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
//              'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
//              'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//              'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
//              'Email': 'email', 'Gender': 'gender'
//         };

//         // --- Regex Patterns ---
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;

//         // --- Read CSV Data ---
//         const csvData = await new Promise((resolve, reject) => {
//              const records = [];
//              fs.createReadStream(filePath)
//                  .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
//                  .on('data', (data) => records.push(data))
//                  .on('end', () => resolve(records))
//                  .on('error', reject);
//         });

//        // --- Pre-fetch Doctors & Patients ---
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//        // --- Fetch Site Settings ---
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";
//         console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

//         // ==============================================================
//         // --- Loop 1: VALIDATION ---
//         // ==============================================================
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                  speciality, // Defined with 'i'
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             // 1. Missing Required Fields
//             const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
//             const missingFields = requiredFields.filter(field => !record[field]);
//             if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

//             // 2. Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

//             // 3. Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             // Ensure 'speciality' (with i) variable is used for the check
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                  validationErrors.push(`Specialty not found`);
//             }

//             // 4. Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                  try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                      if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
//                      else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
//                         // Check exact duplicate
//                         const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true; validationErrors.push('Appointment already exists');
//                         } else if (existingPatient) {
//                             // Check same-day duplicate
//                              const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
//                              const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
//                                  const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
//                                  return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
//                              });
//                              if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate appointment on the same day for this specialty'); }
//                          }
//                      }
//                  } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
//             }

//             // --- Categorize Errors OR Store Valid Row ---
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
//                 else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
//             } else {
//                 // Row passed validation, store it for processing phase
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         } // =================== End of Validation Loop ===================


//         // ==============================================================
//         // --- Handle validateOnly or skip flags (Early Return) ---
//         // This block executes AFTER the loop if EITHER flag is true
//         // ==============================================================
//         if (validateOnly || skip) {
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             // Return the validation summary using the structure from the old logic request
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed", // Static message as requested
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData, // Use key from old structure request
//                     duplicates: duplicates,            // Contains only non-skipped duplicates found
//                     invalidEntries: invalidEntries    // Use key from old structure request
//                 }
//             });
//         }


//         // ==============================================================
//         // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
//         // This block only runs if validateOnly = false AND skip = false
//         // ==============================================================
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB,
//                  speciality, // Use 'speciality' (with i) consistently
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             const existingPatient = existingPatients.get(Mr_no);
//             const doctor = doctorsCache.get(doctorId);

//             // ----- Start: Data Processing Logic -----
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(Mr_no);
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
//             const patientFullName = `${firstName} ${lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build Appointment Tracker
//             let appointment_tracker = {};
//             try {
//                  // Ensure 'speciality' (with i) is used in the query key and assignment key
//                  const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
//                   if (specialitySurveys?.surveys?.length > 0) {
//                       let sortedSurveys = {};
//                       specialitySurveys.surveys.forEach(survey => { if (Array.isArray(survey.selected_months)) { survey.selected_months.forEach(month => { if (!sortedSurveys[month]) sortedSurveys[month] = []; sortedSurveys[month].push(survey.survey_name); }); } });
//                       let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                       let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
//                       let firstAppointmentTime = new Date(appointmentDateObj);
//                       let lastAppointmentTime = new Date(firstAppointmentTime);
//                       // Ensure 'speciality' (with i) is used as the key here
//                       appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                           let trackerAppointmentTime;
//                           if (index === 0) { trackerAppointmentTime = new Date(firstAppointmentTime); }
//                           else {
//                               let previousMonth = parseInt(sortedMonths[index - 1]); let currentMonth = parseInt(month);
//                               if (!isNaN(previousMonth) && !isNaN(currentMonth)) { let monthDifference = currentMonth - previousMonth; trackerAppointmentTime = new Date(lastAppointmentTime); trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference); lastAppointmentTime = new Date(trackerAppointmentTime); }
//                               else { trackerAppointmentTime = new Date(lastAppointmentTime); }
//                           }
//                           const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
//                           return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed" };
//                       });
//                   }
//             } catch (trackerError) { console.error(`Tracker Error Row ${rowNumber}:`, trackerError); }

//             // Database Operation
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     // Determine survey status...
//                     const lastApptDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
//                     if (lastApptDate && !isNaN(lastApptDate.getTime())) { const daysDiff = (currentTimestamp - lastApptDate) / (1000*3600*24); if (daysDiff >= 30 || existingPatient.speciality !== speciality) updatedSurveyStatus = "Not Completed"; }
//                     else { updatedSurveyStatus = "Not Completed"; }

//                     // Prepare update... Ensure 'speciality' (with i) is used
//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
//                     if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
//                     else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }

//                     await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     // Ensure 'speciality' (with i) is used
//                     const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                  console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
//                  // Add to invalidEntries for final report if DB fails post-validation
//                  invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                  continue; // Skip notification attempts if DB failed
//             }

//             // Conditional Notification Logic
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') { /* Log skip */ }
//                 else if (prefLower === 'third_party_api') { /* Log placeholders */ notificationSent = true; }
//                 else if (notificationPreference) {
//                     let smsMessage; let emailType = null;
//                     let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
//                     if (shouldSendSurveyLink) { /* Construct messages with link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else { /* Construct messages without link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // --- Attempt SMS ---
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                         catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
//                     }
//                     // --- Attempt Email ---
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                        try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                        catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
//                    }
//                    // --- Attempt WhatsApp ---
//                    if (prefLower === 'whatsapp' || prefLower === 'both') {
//                        const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
//                        if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
//                            try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                            catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
//                        } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
//                    }
//                 } else { /* Log invalid/missing preference */ }

//                 // Track Final Status
//                 if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
//                 else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
//             }
//             // ----- End: Data Processing Logic -----

//         } // --- End of Processing Loop ---


//         // --- Final Response (only if !validateOnly && !skip) ---
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

//         // Recalculate total issues based on arrays populated during validation
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues; // All validation issues are skipped records
//         const totalRecords = csvData.length;
        
//         const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
//         }
//         const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed Patients');

//         // Define headers
//         sheet.columns = [
//         { header: 'Row #', key: 'rowNumber', width: 10 },
//         { header: 'MR Number', key: 'Mr_no', width: 15 },
//         { header: 'First Name', key: 'firstName', width: 15 },
//         { header: 'Last Name', key: 'lastName', width: 15 },
//         { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//         { header: 'Survey Link', key: 'surveyLink', width: 50 },
//         { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//         const patient = csvData[row.rowNumber - 2]; // original CSV record
//         sheet.addRow({
//             rowNumber: row.rowNumber,
//             Mr_no: row.Mr_no,
//             firstName: patient.firstName,
//             lastName: patient.lastName,
//             phoneNumber: patient.phoneNumber,
//             surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//             operationType: row.operationType,
//             notificationSent: row.notificationSent ? 'Yes' : 'No',
//         });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,  // Match frontend expectation
//             skippedRecords: skippedRecords,  // Match frontend expectation
//             totalRecords: totalRecords,  // Match frontend expectation
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctorsOrSpecialty: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidFormatOrData: invalidEntries
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Error processing CSV upload:", error);
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error:", err));
//         return res.status(500).json({
//             success: false,
//             error: "Error processing CSV upload.",
//             details: error.message
//         });
//     }
// });

// staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
//     const validateOnly = req.body.validate_only === "true"; // If true, only validate

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;

//     // --- Database Connections (Ensure these are correctly passed via req) ---
//     // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // --- Session Data (Ensure session middleware is used) ---
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//          console.error("Upload Error: Missing hospital_code or site_code in session.");
//          await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//          return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//     try {
//         // --- Initialization ---
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = []; // To store rows passing validation + their parsed date object

//         // --- Header Mapping ---
//         const headerMapping = {
//              'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
//              'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
//              'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//              'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
//              'Email': 'email', 'Gender': 'gender','Diagnosis':'codes',
//         };

//         // --- Regex Patterns ---
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;

//         // --- Read CSV Data ---
//         const csvData = await new Promise((resolve, reject) => {
//              const records = [];
//              fs.createReadStream(filePath)
//                  .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
//                  .on('data', (data) => records.push(data))
//                  .on('end', () => resolve(records))
//                  .on('error', reject);
//         });

//        // --- Pre-fetch Doctors & Patients ---
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//        // --- Fetch Site Settings ---
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";
//         console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

//         // ==============================================================
//         // --- Loop 1: VALIDATION ---
//         // ==============================================================
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                  speciality, // Defined with 'i'
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             // 1. Missing Required Fields
//             const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
//             const missingFields = requiredFields.filter(field => !record[field]);
//             if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

//             // 2. Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

//             // ICD Code Validation
//             const code = record.codes?.trim();

//             let codeDetail = {};
//             if (code) {
//                 codeDetail = codesData.find(item => item.code === code);
//                 if (!codeDetail) {
//                     validationErrors.push(`Invalid ICD Code - ${code}`);
//                 }
//             }



//             // 3. Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             // Ensure 'speciality' (with i) variable is used for the check
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                  validationErrors.push(`Specialty not found`);
//             }

//             // 4. Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                  try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                      if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
//                      else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
//                         // Check exact duplicate
//                         const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true; validationErrors.push('Appointment already exists');
//                         } else if (existingPatient) {
//                             // Check same-day duplicate
//                              const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
//                              const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
//                                  const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
//                                  return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
//                              });
//                              if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate appointment on the same day for this specialty'); }
//                          }
//                      }
//                  } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
//             }

//             // --- Categorize Errors OR Store Valid Row ---
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
//                 else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
//             } else {
//                 // Row passed validation, store it for processing phase
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         } // =================== End of Validation Loop ===================


//         // ==============================================================
//         // --- Handle validateOnly or skip flags (Early Return) ---
//         // This block executes AFTER the loop if EITHER flag is true
//         // ==============================================================
//         if (validateOnly || skip) {
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             // Return the validation summary using the structure from the old logic request
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed", // Static message as requested
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData, // Use key from old structure request
//                     duplicates: duplicates,            // Contains only non-skipped duplicates found
//                     invalidEntries: invalidEntries    // Use key from old structure request
//                 }
//             });
//         }


//         // ==============================================================
//         // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
//         // This block only runs if validateOnly = false AND skip = false
//         // ==============================================================
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB,
//                  speciality, // Use 'speciality' (with i) consistently
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             const existingPatient = existingPatients.get(Mr_no);
//             const doctor = doctorsCache.get(doctorId);

//             // ----- Start: Data Processing Logic -----
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(Mr_no);
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
//             const patientFullName = `${firstName} ${lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build Appointment Tracker
//             let appointment_tracker = {};
//             try {
//                  // Ensure 'speciality' (with i) is used in the query key and assignment key
//                  const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
//                   if (specialitySurveys?.surveys?.length > 0) {
//                       let sortedSurveys = {};
//                       specialitySurveys.surveys.forEach(survey => { if (Array.isArray(survey.selected_months)) { survey.selected_months.forEach(month => { if (!sortedSurveys[month]) sortedSurveys[month] = []; sortedSurveys[month].push(survey.survey_name); }); } });
//                       let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                       let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
//                       let firstAppointmentTime = new Date(appointmentDateObj);
//                       let lastAppointmentTime = new Date(firstAppointmentTime);
//                       // Ensure 'speciality' (with i) is used as the key here
//                       appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                           let trackerAppointmentTime;
//                           if (index === 0) { trackerAppointmentTime = new Date(firstAppointmentTime); }
//                           else {
//                               let previousMonth = parseInt(sortedMonths[index - 1]); let currentMonth = parseInt(month);
//                               if (!isNaN(previousMonth) && !isNaN(currentMonth)) { let monthDifference = currentMonth - previousMonth; trackerAppointmentTime = new Date(lastAppointmentTime); trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference); lastAppointmentTime = new Date(trackerAppointmentTime); }
//                               else { trackerAppointmentTime = new Date(lastAppointmentTime); }
//                           }
//                           const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
//                           return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed" };
//                       });
//                   }
//             } catch (trackerError) { console.error(`Tracker Error Row ${rowNumber}:`, trackerError); }

//             // Database Operation
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     // Determine survey status...
//                     const lastApptDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
//                     if (lastApptDate && !isNaN(lastApptDate.getTime())) { const daysDiff = (currentTimestamp - lastApptDate) / (1000*3600*24); if (daysDiff >= 30 || existingPatient.speciality !== speciality) updatedSurveyStatus = "Not Completed"; }
//                     else { updatedSurveyStatus = "Not Completed"; }

//                     // Prepare update... Ensure 'speciality' (with i) is used
                    
//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
//                     if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
//                     else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
//                     if (codes) {
//                         const codes = record.codes?.trim();
//                         const codeDetail = codesData.find(cd => cd.code === codes);
//                         if (codeDetail?.description){
//                         updatedDiagnosis.push({ code: codes, description: codeDetail.description, date: formattedDatetimeStr });}
         
//                     }
//                     await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink, Codes: updatedDiagnosis, }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     // Ensure 'speciality' (with i) is used
//                     const codes = record.codes?.trim();
//                     const codeDetail = codesData.find(cd => cd.code === codes);
//                     let newDiagnosis = code && codeDetail?.description ? [{ code, description: codeDetail.description, date: formattedDatetimeStr }] : [];
//                     const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber,Codes: newDiagnosis, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                  console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
//                  // Add to invalidEntries for final report if DB fails post-validation
//                  invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                  continue; // Skip notification attempts if DB failed
//             }

//             // Conditional Notification Logic
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') { /* Log skip */ }
//                 else if (prefLower === 'third_party_api') { /* Log placeholders */ notificationSent = true; }
//                 else if (notificationPreference) {
//                     let smsMessage; let emailType = null;
//                     let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
//                     if (shouldSendSurveyLink) { /* Construct messages with link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else { /* Construct messages without link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // --- Attempt SMS ---
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                         catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
//                     }
//                     // --- Attempt Email ---
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                        try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                        catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
//                    }
//                    // --- Attempt WhatsApp ---
//                    if (prefLower === 'whatsapp' || prefLower === 'both') {
//                        const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
//                        if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
//                            try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                            catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
//                        } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
//                    }
//                 } else { /* Log invalid/missing preference */ }

//                 // Track Final Status
//                 if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
//                 else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
//             }
//             // ----- End: Data Processing Logic -----

//         } // --- End of Processing Loop ---


//         // --- Final Response (only if !validateOnly && !skip) ---
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

//         // Recalculate total issues based on arrays populated during validation
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues; // All validation issues are skipped records
//         const totalRecords = csvData.length;
        
//         const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
//         }
//         const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed Patients');

//         // Define headers
//         sheet.columns = [
//         { header: 'Row #', key: 'rowNumber', width: 10 },
//         { header: 'MR Number', key: 'Mr_no', width: 15 },
//         { header: 'First Name', key: 'firstName', width: 15 },
//         { header: 'Last Name', key: 'lastName', width: 15 },
//         { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//         { header: 'Survey Link', key: 'surveyLink', width: 50 },
//         { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//         const patient = csvData[row.rowNumber - 2]; // original CSV record
//         sheet.addRow({
//             rowNumber: row.rowNumber,
//             Mr_no: row.Mr_no,
//             firstName: patient.firstName,
//             lastName: patient.lastName,
//             phoneNumber: patient.phoneNumber,
//             surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//             operationType: row.operationType,
//             notificationSent: row.notificationSent ? 'Yes' : 'No',
//         });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,  // Match frontend expectation
//             skippedRecords: skippedRecords,  // Match frontend expectation
//             totalRecords: totalRecords,  // Match frontend expectation
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctorsOrSpecialty: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidFormatOrData: invalidEntries
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Error processing CSV upload:", error);
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error:", err));
//         return res.status(500).json({
//             success: false,
//             error: "Error processing CSV upload.",
//             details: error.message
//         });
//     }
// });


// staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
//     const validateOnly = req.body.validate_only === "true"; // If true, only validate

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;

//     // --- Database Connections (Ensure these are correctly passed via req) ---
//     // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // --- Session Data (Ensure session middleware is used) ---
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//          console.error("Upload Error: Missing hospital_code or site_code in session.");
//          await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//          return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//     try {
//         // --- Initialization ---
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = []; // To store rows passing validation + their parsed date object

//         // --- Header Mapping ---
//         const headerMapping = {
//              'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
//              'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
//              'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//              'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
//              'Email': 'email', 'Gender': 'gender','Diagnosis':'icd',
//         };

//         // --- Regex Patterns ---
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        
//         const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;


//         // --- Read CSV Data ---
//         const csvData = await new Promise((resolve, reject) => {
//              const records = [];
//              fs.createReadStream(filePath)
//                  .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
//                  .on('data', (data) => records.push(data))
//                  .on('end', () => resolve(records))
//                  .on('error', reject);
//         });

//        // --- Pre-fetch Doctors & Patients ---
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//        // --- Fetch Site Settings ---
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";
//         console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

//         // ==============================================================
//         // --- Loop 1: VALIDATION ---
//         // ==============================================================
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                  speciality, // Defined with 'i'
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;
//             console.log(record,record);

//             // 1. Missing Required Fields
//             const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
//             const missingFields = requiredFields.filter(field => !record[field]);
//             if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

//             // 2. Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

//             // ICD Code Validation
//             const icd = record.icd?.trim();

//             let codeDetail = {};
//             if (icd) {
//                 codeDetail = codesData.find(item => item.code === icd);
//                 if (!codeDetail) {
//                     validationErrors.push(`Invalid ICD Code - ${icd}`);
//                 }
//             }



//             // 3. Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             // Ensure 'speciality' (with i) variable is used for the check
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                  validationErrors.push(`Specialty not found`);
//             }

//             // 4. Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                  try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                      if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
//                      else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
//                         // Check exact duplicate
//                         const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true; validationErrors.push('Appointment already exists');
//                         } else if (existingPatient) {
//                             // Check same-day duplicate
//                              const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
//                              const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
//                                  const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
//                                  return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
//                              });
//                              if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate appointment on the same day for this specialty'); }
//                          }
//                      }
//                  } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
//             }

//             // --- Categorize Errors OR Store Valid Row ---
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
//                 else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
//             } else {
//                 // Row passed validation, store it for processing phase
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         } // =================== End of Validation Loop ===================


//         // ==============================================================
//         // --- Handle validateOnly or skip flags (Early Return) ---
//         // This block executes AFTER the loop if EITHER flag is true
//         // ==============================================================
//         if (validateOnly || skip) {
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             // Return the validation summary using the structure from the old logic request
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed", // Static message as requested
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData, // Use key from old structure request
//                     duplicates: duplicates,            // Contains only non-skipped duplicates found
//                     invalidEntries: invalidEntries    // Use key from old structure request
//                 }
//             });
//         }


//         // ==============================================================
//         // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
//         // This block only runs if validateOnly = false AND skip = false
//         // ==============================================================
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB,
//                  speciality, // Use 'speciality' (with i) consistently
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             const existingPatient = existingPatients.get(Mr_no);
//             const doctor = doctorsCache.get(doctorId);

//             // ----- Start: Data Processing Logic -----
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(Mr_no);
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
//             const patientFullName = `${firstName} ${lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build Appointment Tracker
//             let appointment_tracker = {};
//             try {
//                  // Ensure 'speciality' (with i) is used in the query key and assignment key
//                  const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
//                   if (specialitySurveys?.surveys?.length > 0) {
//                       let sortedSurveys = {};
//                       specialitySurveys.surveys.forEach(survey => { if (Array.isArray(survey.selected_months)) { survey.selected_months.forEach(month => { if (!sortedSurveys[month]) sortedSurveys[month] = []; sortedSurveys[month].push(survey.survey_name); }); } });
//                       let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                       let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
//                       let firstAppointmentTime = new Date(appointmentDateObj);
//                       let lastAppointmentTime = new Date(firstAppointmentTime);
//                       // Ensure 'speciality' (with i) is used as the key here
//                       appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                           let trackerAppointmentTime;
//                           if (index === 0) { trackerAppointmentTime = new Date(firstAppointmentTime); }
//                           else {
//                               let previousMonth = parseInt(sortedMonths[index - 1]); let currentMonth = parseInt(month);
//                               if (!isNaN(previousMonth) && !isNaN(currentMonth)) { let monthDifference = currentMonth - previousMonth; trackerAppointmentTime = new Date(lastAppointmentTime); trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference); lastAppointmentTime = new Date(trackerAppointmentTime); }
//                               else { trackerAppointmentTime = new Date(lastAppointmentTime); }
//                           }
//                           const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
//                           return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed" };
//                       });
//                   }
//             } catch (trackerError) { console.error(`Tracker Error Row ${rowNumber}:`, trackerError); }

//             // Database Operation
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     // Determine survey status...
//                     const lastApptDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
//                     if (lastApptDate && !isNaN(lastApptDate.getTime())) { const daysDiff = (currentTimestamp - lastApptDate) / (1000*3600*24); if (daysDiff >= 30 || existingPatient.speciality !== speciality) updatedSurveyStatus = "Not Completed"; }
//                     else { updatedSurveyStatus = "Not Completed"; }

//                     // Prepare update... Ensure 'speciality' (with i) is used
                    
//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
//                     if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
//                     else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
//                     const icd = record.icd?.trim();
//                     let updatedDiagnosis = [];
//                     if (icd) {
                        
//                         const codeDetail = codesData.find(cd => cd.code === icd);
//                         if (codeDetail?.description){
                            
//                         updatedDiagnosis.push({ code: icd, description: codeDetail.description, date: formattedDatetimeStr });}
         
//                     }
//                     await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink, Codes: updatedDiagnosis }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     // Ensure 'speciality' (with i) is used
//                     const icd = record.icd?.trim();
//                     const codeDetail = codesData.find(cd => cd.code === icd);
//                     let newDiagnosis = icd && codeDetail?.description ? [{ icd, description: codeDetail.description, date: formattedDatetimeStr }] : [];
//                     const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber,Codes: newDiagnosis, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                  console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
//                  // Add to invalidEntries for final report if DB fails post-validation
//                  invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                  continue; // Skip notification attempts if DB failed
//             }

//             // Conditional Notification Logic
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') { /* Log skip */ }
//                 else if (prefLower === 'third_party_api') { /* Log placeholders */ notificationSent = true; }
//                 else if (notificationPreference) {
//                     let smsMessage; let emailType = null;
//                     let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
//                     if (shouldSendSurveyLink) { /* Construct messages with link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else { /* Construct messages without link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // --- Attempt SMS ---
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                         catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
//                     }
//                     // --- Attempt Email ---
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                        try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                        catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
//                    }
//                    // --- Attempt WhatsApp ---
//                    if (prefLower === 'whatsapp' || prefLower === 'both') {
//                        const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
//                        if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
//                            try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                            catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
//                        } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
//                    }
//                 } else { /* Log invalid/missing preference */ }

//                 // Track Final Status
//                 if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
//                 else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
//             }
//             // ----- End: Data Processing Logic -----

//         } // --- End of Processing Loop ---


//         // --- Final Response (only if !validateOnly && !skip) ---
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

//         // Recalculate total issues based on arrays populated during validation
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues; // All validation issues are skipped records
//         const totalRecords = csvData.length;
        
//         const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
//         }
//         const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed Patients');

//         // Define headers
//         sheet.columns = [
//         { header: 'Row #', key: 'rowNumber', width: 10 },
//         { header: 'MR Number', key: 'Mr_no', width: 15 },
//         { header: 'First Name', key: 'firstName', width: 15 },
//         { header: 'Last Name', key: 'lastName', width: 15 },
//         { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//         { header: 'Survey Link', key: 'surveyLink', width: 50 },
//         { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//         const patient = csvData[row.rowNumber - 2]; // original CSV record
//         sheet.addRow({
//             rowNumber: row.rowNumber,
//             Mr_no: row.Mr_no,
//             firstName: patient.firstName,
//             lastName: patient.lastName,
//             phoneNumber: patient.phoneNumber,
//             surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//             operationType: row.operationType,
//             notificationSent: row.notificationSent ? 'Yes' : 'No',
//         });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,  // Match frontend expectation
//             skippedRecords: skippedRecords,  // Match frontend expectation
//             totalRecords: totalRecords,  // Match frontend expectation
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctorsOrSpecialty: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidFormatOrData: invalidEntries
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Error processing CSV upload:", error);
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error:", err));
//         return res.status(500).json({
//             success: false,
//             error: "Error processing CSV upload.",
//             details: error.message
//         });
//     }
// });


// staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
//     const validateOnly = req.body.validate_only === "true"; // If true, only validate

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;
//     const originalFilename = req.file.originalname; // Original name of the uploaded file


//         // --- Define Storage Paths ---
//     const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
//     const successfulDir = path.join(batchUploadStorageDir, 'successful');
//     const failedDir = path.join(batchUploadStorageDir, 'failed');
//     // --- End Storage Paths ---

//     // --- Database Connections (Ensure these are correctly passed via req) ---
//     // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // --- Session Data (Ensure session middleware is used) ---
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//          console.error("Upload Error: Missing hospital_code or site_code in session.");
//          await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//          return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//         // --- Declare variables outside try for catch block access ---
//     let targetDirForFile = failedDir; // Default to failed, change on success
//     let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name

//     try {
//         // --- Initialization ---
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = []; // To store rows passing validation + their parsed date object

//         // --- Header Mapping ---
//         const headerMapping = {
//              'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
//              'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
//              'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//              'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
//              'Email': 'email', 'Gender': 'gender','Diagnosis':'icd',
//         };

//         // --- Regex Patterns ---
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        
//         // const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
//                const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;



//         // --- Read CSV Data ---
//         const csvData = await new Promise((resolve, reject) => {
//              const records = [];
//              fs.createReadStream(filePath)
//                  .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
//                  .on('data', (data) => records.push(data))
//                  .on('end', () => resolve(records))
//                  .on('error', reject);
//         });

//        // --- Pre-fetch Doctors & Patients ---
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//        // --- Fetch Site Settings ---
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";
//         console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

//         // ==============================================================
//         // --- Loop 1: VALIDATION ---
//         // ==============================================================
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                  speciality, // Defined with 'i'
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;
//             console.log(record,record);

//             // 1. Missing Required Fields
//             const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
//             const missingFields = requiredFields.filter(field => !record[field]);
//             if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

//             // 2. Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

//             // ICD Code Validation
//             const icd = record.icd?.trim();

//             let codeDetail = {};
//             if (icd) {
//                 codeDetail = codesData.find(item => item.code === icd);
//                 if (!codeDetail) {
//                     validationErrors.push(`Invalid ICD Code - ${icd}`);
//                 }
//             }



//             // 3. Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             // Ensure 'speciality' (with i) variable is used for the check
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                  validationErrors.push(`Specialty not found`);
//             }

//             // 4. Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                  try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                      if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
//                      else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
//                         // Check exact duplicate
//                         const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true; validationErrors.push('Appointment already exists');
//                         } else if (existingPatient) {
//                             // Check same-day duplicate
//                              const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
//                              const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
//                                  const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
//                                  return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
//                              });
//                              if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate Appointment'); }
//                          }
//                      }
//                  } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
//             }

//             // --- Categorize Errors OR Store Valid Row ---
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
//                 else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
//             } else {
//                 // Row passed validation, store it for processing phase
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         } // =================== End of Validation Loop ===================


//         // ==============================================================
//         // --- Handle validateOnly or skip flags (Early Return) ---
//         // This block executes AFTER the loop if EITHER flag is true
//         // ==============================================================
//         if (validateOnly || skip) {
//                  targetDirForFile = successfulDir; // Mark as successful for file moving
//             finalFileName = `validation_${Date.now()}_${originalFilename}`;
//             const validationDestPath = path.join(targetDirForFile, finalFileName);
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             // Return the validation summary using the structure from the old logic request
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed", // Static message as requested
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData, // Use key from old structure request
//                     duplicates: duplicates,            // Contains only non-skipped duplicates found
//                     invalidEntries: invalidEntries    // Use key from old structure request
//                 }
//             });
//         }


//         // ==============================================================
//         // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
//         // This block only runs if validateOnly = false AND skip = false
//         // ==============================================================
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
//             const {
//                  Mr_no, firstName, middleName = '', lastName, DOB,
//                  speciality, // Use 'speciality' (with i) consistently
//                  doctorId, phoneNumber, email = '', gender = ''
//             } = record;

//             const existingPatient = existingPatients.get(Mr_no);
//             const doctor = doctorsCache.get(doctorId);

//             // ----- Start: Data Processing Logic -----
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(Mr_no);
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
//             const patientFullName = `${firstName} ${lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build Appointment Tracker
//             let appointment_tracker = {};
//             try {
//                  // Ensure 'speciality' (with i) is used in the query key and assignment key
//                  const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
//                   if (specialitySurveys?.surveys?.length > 0) {
//                       let sortedSurveys = {};
//                       specialitySurveys.surveys.forEach(survey => { if (Array.isArray(survey.selected_months)) { survey.selected_months.forEach(month => { if (!sortedSurveys[month]) sortedSurveys[month] = []; sortedSurveys[month].push(survey.survey_name); }); } });
//                       let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                       let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
//                       let firstAppointmentTime = new Date(appointmentDateObj);
//                       let lastAppointmentTime = new Date(firstAppointmentTime);
//                       // Ensure 'speciality' (with i) is used as the key here
//                       appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                           let trackerAppointmentTime;
//                           if (index === 0) { trackerAppointmentTime = new Date(firstAppointmentTime); }
//                           else {
//                               let previousMonth = parseInt(sortedMonths[index - 1]); let currentMonth = parseInt(month);
//                               if (!isNaN(previousMonth) && !isNaN(currentMonth)) { let monthDifference = currentMonth - previousMonth; trackerAppointmentTime = new Date(lastAppointmentTime); trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference); lastAppointmentTime = new Date(trackerAppointmentTime); }
//                               else { trackerAppointmentTime = new Date(lastAppointmentTime); }
//                           }
//                           const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
//                           return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed" };
//                       });
//                   }
//             } catch (trackerError) { console.error(`Tracker Error Row ${rowNumber}:`, trackerError); }

//             // Database Operation
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     // Determine survey status...
//                     const lastApptDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
//                     if (lastApptDate && !isNaN(lastApptDate.getTime())) { const daysDiff = (currentTimestamp - lastApptDate) / (1000*3600*24); if (daysDiff >= 30 || existingPatient.speciality !== speciality) updatedSurveyStatus = "Not Completed"; }
//                     else { updatedSurveyStatus = "Not Completed"; }

//                     // Prepare update... Ensure 'speciality' (with i) is used
                    
//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
//                     if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
//                     else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
//                     const icd = record.icd?.trim();
//                     let updatedDiagnosis = [];
//                     if (icd) {
                        
//                         const codeDetail = codesData.find(cd => cd.code === icd);
//                         if (codeDetail?.description){
                            
//                         updatedDiagnosis.push({ code: icd, description: codeDetail.description, date: formattedDatetimeStr });}
         
//                     }
//                     await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink, Codes: updatedDiagnosis }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     // Ensure 'speciality' (with i) is used
//                     const icd = record.icd?.trim();
//                     const codeDetail = codesData.find(cd => cd.code === icd);
//                     let newDiagnosis = icd && codeDetail?.description ? [{ icd, description: codeDetail.description, date: formattedDatetimeStr }] : [];
//                     const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber,Codes: newDiagnosis, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                  console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
//                  // Add to invalidEntries for final report if DB fails post-validation
//                  invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                  continue; // Skip notification attempts if DB failed
//             }

//             // Conditional Notification Logic
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') { /* Log skip */ }
//                 else if (prefLower === 'third_party_api') { /* Log placeholders */ notificationSent = true; }
//                 else if (notificationPreference) {
//                     let smsMessage; let emailType = null;
//                     let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
//                     if (shouldSendSurveyLink) { /* Construct messages with link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else { /* Construct messages without link */
//                         smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // --- Attempt SMS ---
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                         catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
//                     }
//                     // --- Attempt Email ---
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                        try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                        catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
//                    }
//                    // --- Attempt WhatsApp ---
//                    if (prefLower === 'whatsapp' || prefLower === 'both') {
//                        const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
//                        if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
//                            try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
//                            catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
//                        } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
//                    }
//                 } else { /* Log invalid/missing preference */ }

//                 // Track Final Status
//                 if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
//                 else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
//             }
//             // ----- End: Data Processing Logic -----

//         } // --- End of Processing Loop ---


//         // --- Final Response (only if !validateOnly && !skip) ---
//         // await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));
//                 // --- MOVE FILE on Success ---
//         targetDirForFile = successfulDir; // Mark as successful for file moving
//         finalFileName = `success_${Date.now()}_${originalFilename}`;
//         const successDestPath = path.join(targetDirForFile, finalFileName);
//         try {
//             await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
//             await fsPromises.rename(filePath, successDestPath); // Move the file
//             console.log(`CSV Upload (Success): Moved temp file to ${successDestPath}`);
//         } catch (moveError) {
//             console.error(`CSV Upload (Success): Error moving temp file ${filePath} to ${successDestPath}:`, moveError);
//             // If move fails, attempt to delete the original temp file as a fallback cleanup
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on success:", err));
//         }
//         // --- End MOVE FILE ---

//         // Recalculate total issues based on arrays populated during validation
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues; // All validation issues are skipped records
//         const totalRecords = csvData.length;
        
//         const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
//         }
//         const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed Patients');

//         // Define headers
//         sheet.columns = [
//         { header: 'Row #', key: 'rowNumber', width: 10 },
//         { header: 'MR Number', key: 'Mr_no', width: 15 },
//         { header: 'First Name', key: 'firstName', width: 15 },
//         { header: 'Last Name', key: 'lastName', width: 15 },
//         { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//         { header: 'Survey Link', key: 'surveyLink', width: 50 },
//         { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//         const patient = csvData[row.rowNumber - 2]; // original CSV record
//         sheet.addRow({
//             rowNumber: row.rowNumber,
//             Mr_no: row.Mr_no,
//             firstName: patient.firstName,
//             lastName: patient.lastName,
//             phoneNumber: patient.phoneNumber,
//             surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//             operationType: row.operationType,
//             notificationSent: row.notificationSent ? 'Yes' : 'No',
//         });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,  // Match frontend expectation
//             skippedRecords: skippedRecords,  // Match frontend expectation
//             totalRecords: totalRecords,  // Match frontend expectation
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctorsOrSpecialty: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidFormatOrData: invalidEntries
//                 }
//             }
//         });
//     } catch (error) { // --- Catch Block (Overall Failure) ---
//         console.error("Error processing CSV upload:", error); // Log the actual error

//         // --- MOVE FILE on Failure --- (targetDirForFile is already 'failedDir' by default)
//         const failedDestPath = path.join(targetDirForFile, finalFileName); // Use default name/path

//         if (filePath && originalFilename) { // Check if filePath was determined before error
//              try {
//                  await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
//                  await fsPromises.rename(filePath, failedDestPath); // Move the file
//                  console.log(`CSV Upload (Failure): Moved temp file to ${failedDestPath}`);
//              } catch (moveError) {
//                  console.error(`CSV Upload (Failure): Error moving temp file ${filePath} to ${failedDestPath}:`, moveError);
//                  // Attempt deletion of temp file if move fails
//                  await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on main error:", err));
//              }
//         } else {
//              console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
//              // Try to delete if filePath exists but move wasn't attempted (e.g., error before filePath assigned)
//              if (filePath) {
//                  await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error (no move attempted):", err));
//              }
//         }
//         // --- End MOVE FILE ---

//         return res.status(500).json({
//             success: false,
//             error: "An unexpected error occurred during CSV processing.", // Generic error for client
//             details: error.message // Log details server-side, maybe hide from client in prod
//         });
//     }
// });


staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
    // Flags from request body
    const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
    const validateOnly = req.body.validate_only === "true"; // If true, only validate

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded!" });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname; // Original name of the uploaded file


        // --- Define Storage Paths ---
    const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
    const successfulDir = path.join(batchUploadStorageDir, 'successful');
    const failedDir = path.join(batchUploadStorageDir, 'failed');
    // --- End Storage Paths ---

    // --- Database Connections (Ensure these are correctly passed via req) ---
    // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
    if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
        console.error("Upload Error: Database connections not found on request object.");
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
        return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
    }
    const patientDB = req.dataEntryDB.collection("patient_data");
    const docDBCollection = req.manageDoctorsDB.collection("doctors");
    const surveysCollection = req.manageDoctorsDB.collection("surveys");
    const hospitalsCollection = req.adminUserDB.collection("hospitals");

    // --- Session Data (Ensure session middleware is used) ---
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;

    if (!hospital_code || !site_code) {
         console.error("Upload Error: Missing hospital_code or site_code in session.");
         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
         return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
    }

        // --- Declare variables outside try for catch block access ---
    let targetDirForFile = failedDir; // Default to failed, change on success
    let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name

    try {
        // --- Initialization ---
        const duplicates = [];
        const invalidEntries = [];
        const invalidDoctorsData = [];
        const missingDataRows = [];
        const successfullyProcessed = [];
        const recordsWithNotificationErrors = [];
        const doctorsCache = new Map();
        const validationPassedRows = []; // To store rows passing validation + their parsed date object

        // --- Header Mapping ---
        const headerMapping = {
             'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
             'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
             'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
             'Email': 'email', 'Gender': 'gender','Diagnosis':'icd',
        };

        // --- Regex Patterns ---
        const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        
        // const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
               const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;



        // --- Read CSV Data ---
        const csvData = await new Promise((resolve, reject) => {
             const records = [];
             fs.createReadStream(filePath)
                 .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
                 .on('data', (data) => records.push(data))
                 .on('end', () => resolve(records))
                 .on('error', reject);
        });

       // --- Pre-fetch Doctors & Patients ---
        const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
        const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
        doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

        const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
        const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
        const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

       // --- Fetch Site Settings ---
        const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const hospitalName = siteSettings?.hospital_name || "Your Clinic";
        console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

        // ==============================================================
        // --- Loop 1: VALIDATION ---
        // ==============================================================
        for (const [index, record] of csvData.entries()) {
            const rowNumber = index + 2;
            const validationErrors = [];

            const {
                 Mr_no, firstName, middleName = '', lastName, DOB, datetime,
                 speciality, // Defined with 'i'
                 doctorId, phoneNumber, email = '', gender = ''
            } = record;
            console.log(record,record);

            // 1. Missing Required Fields
            const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
            const missingFields = requiredFields.filter(field => !record[field]);
            if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

            // 2. Format Validation
            if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
            if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
            if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

            // ICD Code Validation
            const icd = record.icd?.trim();

            let codeDetail = {};
            if (icd) {
                codeDetail = codesData.find(item => item.code === icd);
                if (!codeDetail) {
                    validationErrors.push(`Invalid ICD Code - ${icd}`);
                }
            }



            // 3. Cross-Reference Validation
            const existingPatient = existingPatients.get(Mr_no);
            if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

            const doctor = doctorsCache.get(doctorId);
            if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
            // Ensure 'speciality' (with i) variable is used for the check
            if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
                 validationErrors.push(`Specialty not found`);
            }

            // 4. Duplicate Appointment Check
            let appointmentDateObj = null;
            let formattedDatetimeStr = datetime;
            let isDuplicate = false;
            if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
                 try {
                    const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                    const tempDate = new Date(correctedDatetime);
                     if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
                     else {
                        appointmentDateObj = tempDate;
                        formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
                        // Check exact duplicate
                        const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
                        if (exactDuplicateCheck) {
                            isDuplicate = true; validationErrors.push('Appointment already exists');
                        } else if (existingPatient) {
                            // Check same-day duplicate
                             const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
                             const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
                                 const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
                                 return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
                             });
                             if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate Appointment'); }
                         }
                     }
                 } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
            }

            // --- Categorize Errors OR Store Valid Row ---
            if (validationErrors.length > 0) {
                const validationRow = { rowNumber, ...record, validationErrors };
                if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
                else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
                else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
                else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
            } else {
                // Row passed validation, store it for processing phase
                validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
            }
        } // =================== End of Validation Loop ===================


        // ==============================================================
        // --- Handle validateOnly or skip flags (Early Return) ---
        // This block executes AFTER the loop if EITHER flag is true
        // ==============================================================
        if (validateOnly || skip) {
                 targetDirForFile = successfulDir; // Mark as successful for file moving
            finalFileName = `validation_${Date.now()}_${originalFilename}`;
            const validationDestPath = path.join(targetDirForFile, finalFileName);
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
            // Return the validation summary using the structure from the old logic request
            return res.status(200).json({
                success: true,
                message: "Validation completed", // Static message as requested
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctors: invalidDoctorsData, // Use key from old structure request
                    duplicates: duplicates,            // Contains only non-skipped duplicates found
                    invalidEntries: invalidEntries    // Use key from old structure request
                }
            });
        }


        // ==============================================================
        // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
        // This block only runs if validateOnly = false AND skip = false
        // ==============================================================
        for (const validRow of validationPassedRows) {
            const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
            const {
                 Mr_no, firstName, middleName = '', lastName, DOB,
                 speciality, // Use 'speciality' (with i) consistently
                 doctorId, phoneNumber, email = '', gender = ''
            } = record;

            const existingPatient = existingPatients.get(Mr_no);
            const doctor = doctorsCache.get(doctorId);

            // ----- Start: Data Processing Logic -----
            const currentTimestamp = new Date();
            const hashedMrNo = hashMrNo(Mr_no);
            const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
            const patientFullName = `${firstName} ${lastName}`.trim();
            const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

            let updatedSurveyStatus = "Not Completed";
            let isNewPatient = !existingPatient;

            // Build Appointment Tracker
            let appointment_tracker = {};
            try {
                 // Ensure 'speciality' (with i) is used in the query key and assignment key
                 const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
                  if (specialitySurveys?.surveys?.length > 0) {
                      let sortedSurveys = {};
                      specialitySurveys.surveys.forEach(survey => { if (Array.isArray(survey.selected_months)) { survey.selected_months.forEach(month => { if (!sortedSurveys[month]) sortedSurveys[month] = []; sortedSurveys[month].push(survey.survey_name); }); } });
                      let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                      let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
                      let firstAppointmentTime = new Date(appointmentDateObj);
                      let lastAppointmentTime = new Date(firstAppointmentTime);
                      // Ensure 'speciality' (with i) is used as the key here
                      appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                          let trackerAppointmentTime;
                          if (index === 0) { trackerAppointmentTime = new Date(firstAppointmentTime); }
                          else {
                              let previousMonth = parseInt(sortedMonths[index - 1]); let currentMonth = parseInt(month);
                              if (!isNaN(previousMonth) && !isNaN(currentMonth)) { let monthDifference = currentMonth - previousMonth; trackerAppointmentTime = new Date(lastAppointmentTime); trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference); lastAppointmentTime = new Date(trackerAppointmentTime); }
                              else { trackerAppointmentTime = new Date(lastAppointmentTime); }
                          }
                          const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
                          return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed" };
                      });
                  }
            } catch (trackerError) { console.error(`Tracker Error Row ${rowNumber}:`, trackerError); }

            // Database Operation
            let operationType = '';
            let notificationSent = false;
            let recordDataForNotification = null;

            const batch_code_date = new Date().toISOString().split('T')[0];
            try {
                if (existingPatient) {
                    operationType = 'update';
                    // Determine survey status...
                    const lastApptDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
                    updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
                    if (lastApptDate && !isNaN(lastApptDate.getTime())) { const daysDiff = (currentTimestamp - lastApptDate) / (1000*3600*24); if (daysDiff >= 30 || existingPatient.speciality !== speciality) updatedSurveyStatus = "Not Completed"; }
                    else { updatedSurveyStatus = "Not Completed"; }

                    // Prepare update... Ensure 'speciality' (with i) is used
                    
                    let updatedSpecialities = existingPatient.specialities || [];
                    const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
                    if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
                    else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
                    const icd = record.icd?.trim();
                    let updatedDiagnosis = [];
                    if (icd) {
                        
                        const codeDetail = codesData.find(cd => cd.code === icd);
                        if (codeDetail?.description){
                            
                        updatedDiagnosis.push({ code: icd, description: codeDetail.description, date: batch_code_date, _id: new ObjectId() });}
                        
         
                    }
                    await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink, Codes: updatedDiagnosis }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
                    recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
                } else {
                    operationType = 'insert';
                    updatedSurveyStatus = "Not Completed";
                    // Ensure 'speciality' (with i) is used
                    const icd = record.icd?.trim();
                    const codeDetail = codesData.find(cd => cd.code === icd);
                    let newDiagnosis = icd && codeDetail?.description ? [{ code: icd, description: codeDetail.description, date: batch_code_date, _id: new ObjectId()  }] : [];
                    const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber,Codes: newDiagnosis, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
                    await patientDB.insertOne(newRecord);
                    recordDataForNotification = newRecord;
                }
                console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
            } catch (err) {
                 console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
                 // Add to invalidEntries for final report if DB fails post-validation
                 invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
                 continue; // Skip notification attempts if DB failed
            }

            // Conditional Notification Logic
            if (recordDataForNotification) {
                let notificationErrorOccurred = false;
                const prefLower = notificationPreference?.toLowerCase();

                if (prefLower === 'none') { /* Log skip */ }
                else if (prefLower === 'third_party_api') { /* Log placeholders */ notificationSent = true; }
                else if (notificationPreference) {
                    let smsMessage; let emailType = null;
                    let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
                    if (shouldSendSurveyLink) { /* Construct messages with link */
                        smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                        emailType = 'appointmentConfirmation';
                    } else { /* Construct messages without link */
                        smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
                    }

                    // --- Attempt SMS ---
                    if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
                        try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                        catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
                    }
                    // --- Attempt Email ---
                    if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
                       try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                       catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
                   }
                   // --- Attempt WhatsApp ---
                   if (prefLower === 'whatsapp' || prefLower === 'both') {
                       const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
                       if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
                           try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                           catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
                       } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
                   }
                } else { /* Log invalid/missing preference */ }

                // Track Final Status
                if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
                else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
            }
            // ----- End: Data Processing Logic -----

        } // --- End of Processing Loop ---


        // --- Final Response (only if !validateOnly && !skip) ---
        // await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));
                // --- MOVE FILE on Success ---
        targetDirForFile = successfulDir; // Mark as successful for file moving
        finalFileName = `success_${Date.now()}_${originalFilename}`;
        const successDestPath = path.join(targetDirForFile, finalFileName);
        try {
            await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
            await fsPromises.rename(filePath, successDestPath); // Move the file
            console.log(`CSV Upload (Success): Moved temp file to ${successDestPath}`);
        } catch (moveError) {
            console.error(`CSV Upload (Success): Error moving temp file ${filePath} to ${successDestPath}:`, moveError);
            // If move fails, attempt to delete the original temp file as a fallback cleanup
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on success:", err));
        }
        // --- End MOVE FILE ---

        // Recalculate total issues based on arrays populated during validation
        const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
        const uploadedCount = successfullyProcessed.length;
        const skippedRecords = totalValidationIssues; // All validation issues are skipped records
        const totalRecords = csvData.length;
        
        const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
        }
        const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
        const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Processed Patients');

        // Define headers
        sheet.columns = [
        { header: 'Row #', key: 'rowNumber', width: 10 },
        { header: 'MR Number', key: 'Mr_no', width: 15 },
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Phone Number', key: 'phoneNumber', width: 15 },
        { header: 'Survey Link', key: 'surveyLink', width: 50 },
        { header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        // Populate rows
        for (const row of successfullyProcessed) {
        const patient = csvData[row.rowNumber - 2]; // original CSV record
        sheet.addRow({
            rowNumber: row.rowNumber,
            Mr_no: row.Mr_no,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phoneNumber: patient.phoneNumber,
            surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
            operationType: row.operationType,
            notificationSent: row.notificationSent ? 'Yes' : 'No',
        });
        }

        // Write file to disk
        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = outputFileName;

        return res.status(200).json({
            success: true,
            message: responseMessage,
            uploadedCount: uploadedCount,  // Match frontend expectation
            skippedRecords: skippedRecords,  // Match frontend expectation
            totalRecords: totalRecords,  // Match frontend expectation
            notificationErrorsCount: recordsWithNotificationErrors.length,
            downloadUrl: `/data-entry/download-latest`,
            details: {
                processed: successfullyProcessed,
                notificationErrors: recordsWithNotificationErrors,
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctorsOrSpecialty: invalidDoctorsData,
                    duplicates: duplicates,
                    invalidFormatOrData: invalidEntries
                }
            }
        });
    } catch (error) { // --- Catch Block (Overall Failure) ---
        console.error("Error processing CSV upload:", error); // Log the actual error

        // --- MOVE FILE on Failure --- (targetDirForFile is already 'failedDir' by default)
        const failedDestPath = path.join(targetDirForFile, finalFileName); // Use default name/path

        if (filePath && originalFilename) { // Check if filePath was determined before error
             try {
                 await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
                 await fsPromises.rename(filePath, failedDestPath); // Move the file
                 console.log(`CSV Upload (Failure): Moved temp file to ${failedDestPath}`);
             } catch (moveError) {
                 console.error(`CSV Upload (Failure): Error moving temp file ${filePath} to ${failedDestPath}:`, moveError);
                 // Attempt deletion of temp file if move fails
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on main error:", err));
             }
        } else {
             console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
             // Try to delete if filePath exists but move wasn't attempted (e.g., error before filePath assigned)
             if (filePath) {
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error (no move attempted):", err));
             }
        }
        // --- End MOVE FILE ---

        return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during CSV processing.", // Generic error for client
            details: error.message // Log details server-side, maybe hide from client in prod
        });
    }
});


staffRouter.get('/data-entry/download-latest', (req, res) => {
    const fileName = req.session.processedExcelFile;
    if (!fileName) return res.status(404).send("No processed file available.");
    const filePath = path.join(__dirname, '../public/uploads/', fileName);
    res.download(filePath, fileName);
});


let codesData = [];
const codesFilePath = path.join(__dirname, 'public','codes.json');
try {
  const fileData = fs.readFileSync(codesFilePath, 'utf-8');
  codesData = JSON.parse(fileData);
} catch (error) {
  console.error("Error reading codes JSON file:", error);
}

// staffRouter.get('/codes', (req, res) => {
//     const { page = 1, limit = 50, searchTerm = '' } = req.query;
  
//     try {
//       let filteredCodes;
  
//       // If there's no searchTerm or it's shorter than 3 characters, show ALL codes
//       if (!searchTerm || searchTerm.length < 3) {
//         filteredCodes = codesData;
//       } else {
//         // Otherwise, filter based on case-insensitive match of the description
//         filteredCodes = codesData.filter(item =>
//           item.description.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//       }
  
//       // Paginate the results
//       const startIndex = (page - 1) * limit;
//       const paginatedCodes = filteredCodes.slice(startIndex, startIndex + Number(limit));
  
//       res.json(paginatedCodes);
//     } catch (error) {
//       console.error('Error fetching codes:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });

staffRouter.get('/codes', (req, res) => {
    const { page = 1, limit = 50, searchTerm = '' } = req.query;
  
    try {
      let filteredCodes;
  
      if (!searchTerm || searchTerm.length < 3) {
        filteredCodes = codesData;
      } else {
        const lowerTerm = searchTerm.toLowerCase();
        filteredCodes = codesData.filter(item =>
          item.code.toLowerCase().includes(lowerTerm) ||
          item.description.toLowerCase().includes(lowerTerm)
        );
      }
  
      const startIndex = (page - 1) * limit;
      const paginatedCodes = filteredCodes.slice(startIndex, startIndex + Number(limit));
  
      res.json(paginatedCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
      res.status(500).send('Internal Server Error');
    }
  });

staffRouter.post('/whatsapp-status-callback', (req, res) => {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

    console.log('WhatsApp message status update:');
    console.log('Message SID:', MessageSid);
    console.log('Status:', MessageStatus);
    console.log('To:', To);
    console.log('From:', From);
    if (ErrorCode) {
        console.error('Error Code:', ErrorCode);
        console.error('Error Message:', ErrorMessage);
    }

    // Optional: Save this info to your DB for tracking
    
    res.sendStatus(200);
});


// Redirect from blank-page to home
staffRouter.get('/blank-page', (req, res) => {
    // Use a 301 redirect for permanent redirection
    res.redirect(301, basePath + '/home');
});


staffRouter.get('/home', async (req, res) => {
    try {
        const hospital_code = req.session.hospital_code; 
        const site_code = req.session.site_code;
        const username = req.session.username; // Assuming username is stored in session
        const basePath = req.baseUrl || '/staff'; // Define basePath here
        
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

        const siteSettings = await req.adminUserDB.collection('hospitals').findOne(
            { "sites.site_code": site_code },
            { projection: { "sites.$": 1 } }
        );

        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase() || 'none';

        res.render('home', {
            patients,
            doctor,
            notificationPreference,
            lng: res.locals.lng,
            dir: res.locals.dir,
            basePath: basePath  // Pass basePath to template
        });


    } catch (error) {
        console.error('Error fetching patients data:', error);
        res.status(500).send('Internal Server Error');
    }
});


staffRouter.post('/delete-appointment', async (req, res) => {
    const db = req.dataEntryDB;
    const { Mr_no } = req.body;
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;
    const basePath = req.baseUrl || '/staff'; // Use req.baseUrl for the base path
    
    try {
        const query = { 
            Mr_no,
            hospital_code,
            site_code 
        };
        
        const result = await db.collection('patient_data').deleteOne(query);
        
        if (result.deletedCount === 1) {
            req.flash('successMessage', `Patient with MR No. ${Mr_no} deleted successfully.`);
        } else {
            req.flash('errorMessage', `Patient with MR No. ${Mr_no} not found or already deleted.`);
        }
        
        return res.redirect(`${basePath}/home`);
    } catch (error) {
        console.error('Error during delete operation:', error);
        req.flash('errorMessage', 'An internal error occurred while deleting the patient record.');
        return res.redirect(`${basePath}/home`);
    }
});



staffRouter.post('/login', async (req, res) => {
    const staffDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body;

    try {
        const staff = await staffDB.findOne({ username });

        if (!staff) {
            req.flash('errorMessage', 'Invalid username or password');
            return res.redirect(basePath);
        }

        // Check if account is locked first
        if (staff.isLocked) {
            req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
            return res.redirect(basePath);
        }

        // Decrypt and compare password
        const decryptedPassword = decrypt(staff.password);
        
        if (decryptedPassword === password) {
            // Successful login
            if (staff.loginCounter === 0 || staff.passwordChangedByAdmin) {
                // Store minimal user info in session
                req.session.username = staff.username;
                req.session.hospital_code = staff.hospital_code;
                req.session.site_code = staff.site_code;
                
                // Update login counter and reset failed attempts
                await staffDB.updateOne(
                    { username },
                    { 
                        $set: { 
                            failedLogins: 0,
                            lastLogin: new Date()
                        },
                        $inc: { loginCounter: 1 }
                    }
                );

                return res.redirect(basePath + '/reset-password');
            }

            // Regular successful login
            await staffDB.updateOne(
                { username },
                { 
                    $set: { 
                        failedLogins: 0,
                        lastLogin: new Date()
                    },
                    $inc: { loginCounter: 1 }
                }
            );

            // Set session data
            req.session.username = staff.username;
            req.session.hospital_code = staff.hospital_code;
            req.session.site_code = staff.site_code;
            req.session.loginTime = new Date().toISOString();

            // Log the login activity
            const loginLogData = `username: ${staff.username}, timestamp: ${req.session.loginTime}, hospital_code: ${staff.hospital_code}, site_code: ${staff.site_code}, action: login`;
            writeLog('user_activity_logs.txt', loginLogData);

            return res.redirect(basePath + '/home');
        } else {
            // Failed login attempt
            const currentFailedLogins = (staff.failedLogins || 0) + 1;
            const updateData = {
                $set: { failedLogins: currentFailedLogins }
            };

            if (currentFailedLogins >= 3) {
                updateData.$set.isLocked = true;
                await staffDB.updateOne({ username }, updateData);
                req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
            } else {
                await staffDB.updateOne({ username }, updateData);
                req.flash('errorMessage', `Invalid password. ${3 - currentFailedLogins} attempt(s) left.`);
            }

            return res.redirect(basePath);
        }

    } catch (error) {
        console.error('Error during login:', error);
        const logError = `Error during login for username ${username}: ${error.message}`;
        writeLog('error.log', logError);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        return res.redirect(basePath);
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
        error_msg: req.flash('errorMessage'),
        lng: res.locals.lng,
        dir: res.locals.dir,
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
                $set: { password: encryptedPassword, loginCounter: 1,passwordChangedByAdmin:false }  // Set loginCounter to 1 after password reset
            }
        );
        
        req.flash('successMessage', 'Password updated successfully.');
        res.redirect(basePath+'/home');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        res.redirect(basePath+'/reset-password');
    }
});


staffRouter.get('/data-entry', async (req, res) => {
    // Check if required session variables are set; if not, redirect to basePath
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;

    if (!hospital_code || !site_code || !username) {
        return res.redirect(basePath); // Redirect to basePath if any session variable is missing
    }

    try {
        // Retrieve specialties and doctor information
        const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        res.render('data-entry', {
            specialities: specialities.filter(speciality => speciality !== 'STAFF'),
            hospital_code,
            site_code,
            doctor,
            lng: res.locals.lng,
            dir: res.locals.dir,
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', {
            specialities: [],
            hospital_code,
            site_code,
            doctor: null,
            lng: res.locals.lng,
            dir: res.locals.dir,
        });
    }
});
function validateSession(req, res, next) {
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;

    if (!hospital_code || !site_code || !username) {
        return res.redirect(basePath); // Redirect to basePath if any session variable is missing
    }

    // Attach session variables to res.locals for easy access in views and route handlers
    res.locals.hospital_code = hospital_code;
    res.locals.site_code = site_code;
    res.locals.username = username;

    next(); // Proceed to the next middleware or route handler
}

module.exports = validateSession;




staffRouter.get('/edit-appointment', validateSession, async (req, res) => {
    const hashedMrNo = req.query.Mr_no;

    const hospital_code = req.session.hospital_code; 
        const site_code = req.session.site_code;
        const username = req.session.username; 
        if (!hospital_code || !site_code || !username) {
            return res.redirect(basePath); // Redirect to basePath if any session variable is missing
        }

    try {
        // Fetch patient data from the database using MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ hashedMrNo:hashedMrNo });

        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        // Fetch doctor information from the 'staffs' collection
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        if (!doctor) {
            console.warn(`Doctor with username "${username}" not found.`);
        }

        // Format datetime for datetime-local input if needed
        let formattedDatetime = patient.datetime;
        if (patient.datetime) {
            try {
                const date = new Date(patient.datetime);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    
                    formattedDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            } catch (error) {
                console.warn('Error formatting datetime:', error);
            }
        }

        // Extract doctor information from specialities array if available
        let doctorName = '';
        if (patient.specialities && patient.specialities.length > 0) {
            const firstSpecialty = patient.specialities[0];
            if (firstSpecialty.doctor_ids && firstSpecialty.doctor_ids.length > 0) {
                doctorName = firstSpecialty.doctor_ids[0];
            }
        }

        // Render the edit-appointment view with the patient and doctor data
        res.render('edit-appointment', {
            patient: {
                mrNo: patient.Mr_no,
                hashedMrNo: patient.hashedMrNo, // Add this for form submission
                firstName: patient.firstName || '',
                middleName: patient.middleName || '',
                lastName: patient.lastName || '',
                DOB: patient.DOB,
                phoneNumber: patient.phoneNumber,
                datetime: formattedDatetime, // Use formatted datetime for the form
                speciality: patient.speciality,
                doctor: doctorName, // Add extracted doctor name
            },
            doctor, // Pass the doctor data to the view
            successMessage: req.flash('successMessage'),
            errorMessage: req.flash('errorMessage'),
            lng: res.locals.lng,
            dir: res.locals.dir,
            hospital_code: res.locals.hospital_code, // If needed in the view
            site_code: res.locals.site_code,
            username: res.locals.username,
            basePath: basePath || ''
        });
    } catch (error) {
        console.error('Error fetching patient or doctor data:', error);
        res.status(500).send('Internal Server Error');
    }
});


staffRouter.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    const manageDoctorsDB = req.manageDoctorsDB; // Get manageDoctorsDB from req

    // Get necessary data from request body and session first
    const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
    const hospital_code = req.session.hospital_code;
    const username = req.session.username; // Needed to fetch doctor info if re-rendering

    // --- START: SERVER-SIDE VALIDATION ---
    if (!DOB) { // Check if DOB is empty or missing
        console.error(`Validation Error: DOB is empty for MRN ${mrNo}`);
        req.flash('errorMessage', 'Date of Birth cannot be empty.');

        // Need to fetch patient and doctor data again to re-render the form correctly
        try {
            const patientData = await db.collection('patient_data').findOne({ Mr_no: mrNo });
            const doctorFromForm = await manageDoctorsDB.collection('staffs').findOne({ username });

            if (!patientData) {
                 // If patient not found during re-render attempt, send a generic error
                 req.flash('errorMessage', 'Patient not found. Cannot reload edit form.');
                 return res.redirect(basePath + '/home'); // Or another suitable page
            }

            return res.render('edit-appointment', {
                patient: { // Map data back to the structure expected by the EJS template
                    mrNo: patientData.Mr_no,
                    firstName: patientData.firstName,
                    middleName: patientData.middleName,
                    lastName: patientData.lastName,
                    DOB: patientData.DOB, // Use original DOB
                    phoneNumber: patientData.phoneNumber,
                    datetime: patientData.datetime, // Use original datetime
                    speciality: patientData.speciality // Use original speciality
                },
                doctor: doctorFromForm,
                successMessage: '', // No success message
                errorMessage: req.flash('errorMessage'), // Show the specific error
                lng: res.locals.lng,
                dir: res.locals.dir,
                hospital_code: hospital_code,
                site_code: req.session.site_code, // Get site_code from session
                username: username,
                basePath: basePath // Pass basePath if needed in template links
            });
        } catch (renderError) {
            console.error("Error fetching data for re-rendering edit form:", renderError);
            req.flash('errorMessage', 'An error occurred while reloading the form.');
            return res.redirect(basePath + '/home'); // Redirect to a safe page on error
        }
    }
    // --- END: SERVER-SIDE VALIDATION ---

    // If DOB validation passed, proceed with the update logic
    try {
        const collection = db.collection('patient_data');
        
        // ===== FETCH CURRENT PATIENT DATA FIRST =====
        const currentPatient = await collection.findOne({ Mr_no: mrNo });
         const doctorFromForm = await manageDoctorsDB.collection('staffs').findOne({ username });
        
        if (!currentPatient) {
            req.flash('errorMessage', 'Patient with MR Number ' + mrNo + ' not found.');
            console.error(`Update Error: Patient ${mrNo} not found.`);
            return res.redirect(basePath + '/home');
        }

        // ===== FORMAT DATETIME =====
        const formattedDatetime = formatTo12Hour(datetime);

        console.log('mrNo:', mrNo);
        console.log('req.body (validated):', req.body);

        // ===== CHECK IF DATETIME CHANGED =====
        const currentDatetime = currentPatient.datetime;
        const newDatetime = formattedDatetime;
        
        console.log('Checking datetime change:', {
            current: currentDatetime,
            new: newDatetime,
            changed: currentDatetime !== newDatetime
        });

        // Build the update object
        const updateData = {
            firstName,
            middleName,
            lastName,
            DOB,
            datetime: formattedDatetime, // This becomes the new baseline appointment
            speciality,
            phoneNumber,
            hospital_code
        };


        // ===== UPDATE SPECIALITIES TIMESTAMP =====
        if (doctorFromForm && doctorFromForm.username && doctorFromForm.username.trim()) {
    updateData.specialities = [{
        name: speciality || '',
        timestamp: formattedDatetime,
        doctor_ids: [doctorFromForm.username.trim()]
    }];


            console.log(`✅ Updated specialities timestamp to: ${formattedDatetime}`);
        } else if (currentPatient.specialities && currentDatetime !== newDatetime) {
            // If no doctor provided but datetime changed, update existing specialities timestamp
            const updatedSpecialities = currentPatient.specialities.map(spec => ({
                ...spec,
                timestamp: formattedDatetime // Update timestamp to new datetime
            }));
            updateData.specialities = updatedSpecialities;
            console.log(`✅ Updated existing specialities timestamp to: ${formattedDatetime}`);
        }
// The key issue is in the appointment tracker update section
// We need to calculate follow-ups based on the increment between appointments

// === UPDATED SECTION: Appointment Tracker Calculation ===
if (currentDatetime !== newDatetime) {
    console.log('DateTime changed - recalculating follow-up appointments based on new baseline');
    
    const appointmentTracker = currentPatient.appointment_tracker || {};
    const newBaselineDate = new Date(newDatetime);
    
    // Helper function to calculate follow-up appointment time based on previous date and month indicator
    function calculateFollowUpDate(previousDate, previousMonthIndicator, currentMonthIndicator) {
        const followUpDate = new Date(previousDate);
        
        // Extract the numeric values from the month indicators
        const prevMonthMatch = previousMonthIndicator.match(/(\d+)/);
        const currMonthMatch = currentMonthIndicator.match(/(\d+)/);
        
        const prevMonths = prevMonthMatch ? parseInt(prevMonthMatch[0]) : 0;
        const currMonths = currMonthMatch ? parseInt(currMonthMatch[0]) : 0;
        
        // Calculate the increment (difference between current and previous month indicators)
        const monthsToAdd = currMonths - prevMonths;
        
        // Add the appropriate number of months
        followUpDate.setMonth(followUpDate.getMonth() + monthsToAdd);
        
        // Format back to the same format as your database
        const options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return followUpDate.toLocaleString('en-US', options);
    }
    
    // Update appointment tracker entries
    Object.keys(appointmentTracker).forEach(key => {
        if (appointmentTracker[key] && Array.isArray(appointmentTracker[key])) {
            // First, sort entries by their time sequence if they have month indicators
            appointmentTracker[key].sort((a, b) => {
                // Extract numeric month values for comparison
                const getMonthValue = (entry) => {
                    if (!entry.month || entry.surveyType === 'Baseline') return 0;
                    const match = entry.month.match(/(\d+)/);
                    return match ? parseInt(match[0]) : 999; // Default high for unknown
                };
                
                return getMonthValue(a) - getMonthValue(b);
            });
            
            // Process each entry in sequence
            let previousEntry = null;
            
            appointmentTracker[key].forEach((entry, index) => {
                const monthIndicator = entry.month || '';
                console.log(`Processing tracker[${key}][${index}] with month indicator: "${monthIndicator}"`);
                
                // Identify if this is a baseline or follow-up
                const isBaseline = monthIndicator.toLowerCase().includes('baseline') || 
                                 entry.surveyType === 'Baseline' ||
                                 monthIndicator === '' || 
                                 index === 0;
                
                if (isBaseline) {
                    // For baseline: appointment_time should match the main datetime
                    const oldTime = entry.appointment_time;
                    entry.appointment_time = newDatetime;
                    previousEntry = entry;
                    console.log(`✅ Updated BASELINE appointment_time from "${oldTime}" to "${newDatetime}"`);
                    
                    // Update survey_name array for baseline
                    if (entry.survey_name && Array.isArray(entry.survey_name)) {
                        entry.survey_name.forEach(survey => {
                            if (survey.appointment_time) {
                                const oldSurveyTime = survey.appointment_time;
                                survey.appointment_time = newDatetime;
                                console.log(`✅ Updated baseline survey appointment_time from "${oldSurveyTime}" to "${newDatetime}"`);
                            }
                        });
                    }
                } else if (previousEntry) {
                    // For follow-ups: calculate based on previous appointment
                    const prevMonthIndicator = previousEntry.month || '';
                    const newFollowUpTime = calculateFollowUpDate(
                        previousEntry.appointment_time, 
                        prevMonthIndicator,
                        monthIndicator
                    );
                    
                    const oldTime = entry.appointment_time;
                    entry.appointment_time = newFollowUpTime;
                    previousEntry = entry;
                    console.log(`✅ Updated FOLLOW-UP appointment_time from "${oldTime}" to "${newFollowUpTime}" (increment from previous appointment)`);
                    
                    // Update survey_name array for follow-ups
                    if (entry.survey_name && Array.isArray(entry.survey_name)) {
                        entry.survey_name.forEach(survey => {
                            if (survey.appointment_time) {
                                const oldSurveyTime = survey.appointment_time;
                                survey.appointment_time = newFollowUpTime;
                                console.log(`✅ Updated follow-up survey appointment_time from "${oldSurveyTime}" to "${newFollowUpTime}"`);
                            }
                        });
                    }
                }
            });
        }
    });
    
    // Add the updated appointment_tracker to the update data
    updateData.appointment_tracker = appointmentTracker;
}
        // ===== PERFORM THE DATABASE UPDATE =====
        const result = await collection.updateOne(
            { Mr_no: mrNo },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            // This case should ideally not happen if the user came from the edit page,
            // but handle it just in case.
            req.flash('errorMessage', 'Patient with MR Number ' + mrNo + ' not found during update.');
            console.error(`Update Error: Patient ${mrNo} not found.`);
             // Redirect to a page where the user can see the error
            return res.redirect(basePath + '/home');
        }

        // Fetch data needed to render the page *after* successful update
        const updatedPatient = await collection.findOne({ Mr_no: mrNo });

        if (!updatedPatient) {
            req.flash('errorMessage', 'Failed to fetch updated patient data.');
            return res.redirect(basePath + '/home');
        }

        // Set success flash message with additional info if datetime was updated
        if (currentDatetime !== newDatetime) {
            req.flash('successMessage', 'Patient data updated successfully. Baseline appointment and follow-ups recalculated.');
            console.log(`✅ Baseline appointment updated from "${currentDatetime}" to "${newDatetime}"`);
            console.log(`✅ Follow-up appointments recalculated based on new baseline`);
            console.log(`✅ Specialities timestamp updated`);
        } else {
            req.flash('successMessage', 'Patient data updated successfully.');
        }

        return res.redirect(`${basePath}/edit-appointment?Mr_no=${updatedPatient.hashedMrNo}`);
        
    } catch (error) { // Catch errors during the database update or subsequent fetches
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital_code: ${hospital_code}, mrNo: ${mrNo}`;
        writeLog('error_logs.txt', errorData); // Log the error

        console.error('Error during API edit process:', error);
        req.flash('errorMessage', 'An internal server error occurred while updating patient data.');
         // Redirect to a page where the user can see the error
        return res.redirect(basePath + '/edit-appointment?Mr_no=' + hashMrNo(mrNo)); // Redirect back to edit page with error
    }
});






// staffRouter.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender } = req.body;
//         const hospital_code = req.session.hospital_code;
//         const site_code = req.session.site_code;

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

//         // --- Start: Input Validation ---
//         if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
//             let missingFields = [];
//             if (!Mr_no) missingFields.push('MR Number');
//             if (!firstName) missingFields.push('First Name');
//             if (!lastName) missingFields.push('Last Name');
//             if (!DOB) missingFields.push('Date of Birth');
//             if (!datetime) missingFields.push('Appointment Date & Time');
//             if (!phoneNumber) missingFields.push('Phone Number');
//             if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');

//             req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
//             console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
//             return res.redirect(basePath + '/data-entry');
//         }
//          // Validate datetime format more strictly if needed before creating Date object
//         const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
//         if (isNaN(appointmentDateObj.getTime())) {
//             req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
//             console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
//             return res.redirect(basePath + '/data-entry');
//         }
//         // --- End: Input Validation ---


//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor, ensure they belong to the session's hospital/site
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
//         if (!doctor) {
//              req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
//              console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
//              return res.redirect(basePath + '/data-entry');
//         }
//         // Prepare doctor name string safely
//         const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

//         // Format the datetime for display
//         const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

//         // Fetch survey details and build appointment_tracker
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality, hospital_code: hospital_code, site_code: site_code
//         });
//         let appointment_tracker = {};
//          if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//             try {
//                 // --- Build appointment_tracker logic ---
//                  let sortedSurveys = {};
//                  specialitySurveys.surveys.forEach(survey => {
//                      if (Array.isArray(survey.selected_months)) {
//                          survey.selected_months.forEach(month => {
//                              if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                              sortedSurveys[month].push(survey.survey_name);
//                          });
//                      }
//                  });
//                  let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                  let surveyTypeLabels = ["Baseline"];
//                  for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//                  let firstAppointmentTime = new Date(appointmentDateObj);
//                  let lastAppointmentTime = new Date(firstAppointmentTime);

//                  appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                      let appointmentTime;
//                      if (index === 0) {
//                          appointmentTime = new Date(firstAppointmentTime);
//                      } else {
//                          let previousMonth = parseInt(sortedMonths[index - 1]);
//                          let currentMonth = parseInt(month);
//                          if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                              let monthDifference = currentMonth - previousMonth;
//                              appointmentTime = new Date(lastAppointmentTime);
//                              appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                              lastAppointmentTime = new Date(appointmentTime);
//                          } else {
//                               console.warn(`API Data: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
//                               appointmentTime = new Date(lastAppointmentTime);
//                           }
//                      }
//                      const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//                      return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//                  });
//                  // --- End build appointment_tracker logic ---
//              } catch(trackerError) {
//                  console.error("API Data: Error building appointment tracker:", trackerError);
//                  // Continue processing even if tracker fails, log the error
//              }
//          }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

//         // Fetch Notification Preference and Hospital Name
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
//         console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

//         const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         let updatedSurveyStatus = "Not Completed"; // Default for new or reset
//         let isNewPatient = false;
//         const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

//         // --- Start: DB Upsert Logic ---
//         if (patient) {
//             // Existing Patient Update
//              isNewPatient = false;
//              console.log(`API Data: Patient ${Mr_no} found, updating.`);
//              // Determine survey status
//             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//              updatedSurveyStatus = patient.surveyStatus;
//              if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                  const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                  const isSpecialityChanged = patient.speciality !== speciality;
//                  if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//              } else { updatedSurveyStatus = "Not Completed"; }

//              // Update specialities array
//              let updatedSpecialities = patient.specialities || [];
//              const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//              if (specialityIndex !== -1) {
//                  updatedSpecialities[specialityIndex].timestamp = appointmentDateObj; // Use Date object
//                  if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                      updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                  }
//              } else {
//                  updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] });
//              }

//              // Perform Update
//              await collection.updateOne({ Mr_no }, {
//                  $set: {
//                      firstName, middleName, lastName, gender, DOB,
//                      datetime: formattedDatetime, // Store formatted string
//                      specialities: updatedSpecialities, // Store array with Date objects
//                      speciality, phoneNumber, email,
//                      hospital_code, site_code,
//                      surveyStatus: updatedSurveyStatus,
//                      appointment_tracker
//                  },
//                  $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//              });

//         } else {
//             // New Patient Insert
//              isNewPatient = true;
//              console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
//              updatedSurveyStatus = "Not Completed";
//              await collection.insertOne({
//                  Mr_no, firstName, middleName, lastName, gender, DOB,
//                  datetime: formattedDatetime, // Store formatted string
//                  specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], // Store Date object
//                  speciality, phoneNumber, email,
//                  hospital_code, site_code,
//                  surveyStatus: updatedSurveyStatus,
//                  hashedMrNo, surveyLink,
//                  appointment_tracker,
//                  SurveySent: 0, // Initialize count
//                  smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
//              });
//         }
//         // --- End: DB Upsert Logic ---


//         // ***** START: Conditional Notification Logic *****
//         //  let finalMessage = 'Appointment created successfully'; // Base success message
//         // With this dynamic version:
// const userLang = req.cookies.lng || req.query.lng || 'en';

// let finalMessage = userLang === 'ar' 
//     ? 'تم إنشاء الموعد بنجاح' // Arabic success message
//     : 'Appointment created successfully'; // English success message (default)

//          if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
//              console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
//             //  finalMessage += ' Notifications skipped as per site preference.';
//              // No SurveySent increment

//          } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
//              // --- Handle Third Party API Case ---
//              console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
//              const placeholders = {
//                  patientMrNo: Mr_no, // 0: Added MRN for clarity
//                  patientFullName: patientFullName, // 1
//                  doctorFullName: doctorName,      // 2
//                  appointmentDatetime: formattedDatetime, // 3
//                  hospitalName: hospitalName,      // 4
//                  hashedMrNo: hashedMrNo,          // 5
//                  surveyLink: surveyLink,          // 6: Added survey link
//                  speciality: speciality           // 7: Added specialty
//              };
//              // Log the placeholders to the console
//              console.log("--- Third-Party API Placeholders ---");
//              console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
//              console.log("--- End Placeholders ---");

//             //  finalMessage += ' Third-party API placeholders logged.';
//              // No SurveySent increment as no message was sent externally

//          } else if (notificationPreference) {
//             // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
//              console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
//             //  finalMessage += ' Notifications attempted (check logs for status).';

//              let smsMessage;
//              let emailType = null;

//              // Determine message content based on survey status
//              if (updatedSurveyStatus === "Not Completed") {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                  emailType = 'appointmentConfirmation';
//              } else {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
//                  console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
//              }

//              // --- Attempt to Send SMS ---
//              if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
//                  try {
//                      const smsResult = await sendSMS(phoneNumber, smsMessage);
//                      console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
//              }

//              // --- Attempt to Send Email ---
//              if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
//                  try {
//                      await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
//                      console.log(`API Data: Email sent successfully for ${Mr_no}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
//              }

//              // --- Attempt to Send WhatsApp Template ---
//              if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
//                  try {
//                      const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                      const authToken = process.env.TWILIO_AUTH_TOKEN;
//                      if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                          const client = twilio(accountSid, authToken);
//                          const placeholders = {
//                               1: patientFullName, 2: doctorName, 3: formattedDatetime,
//                               4: hospitalName, 5: hashedMrNo
//                           };
//                          let formattedPhoneNumber = phoneNumber;
//                          if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

//                          if (formattedPhoneNumber) {
//                               const message = await client.messages.create({
//                                   from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                   to: formattedPhoneNumber,
//                                   contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                   contentVariables: JSON.stringify(placeholders),
//                                   statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
//                               });
//                               console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
//                               await collection.updateOne({ Mr_no }, {
//                                   $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
//                                   $inc: { SurveySent: 1 }
//                               });
//                          } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
//                      } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
//                  } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
//              }

//          } else {
//              // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
//              console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
//             //  finalMessage += ' Notifications not sent (preference not configured for sending).';
//              // No SurveySent increment
//          }
//         // ***** END: Conditional Notification Logic *****

//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
      

//         const timestamp = Date.now();
//         const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

//         const outputFilePath = path.join(uploadsDir, singleUploadFile);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Single Upload');

//         sheet.columns = [
//             { header: 'MR Number', key: 'Mr_no', width: 15 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 18 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         sheet.addRow({
//             Mr_no,
//             firstName,
//             lastName,
//             phoneNumber,
//             surveyLink,
//             notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
//         });

//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = singleUploadFile;


//         // --- Final Response ---
//         req.flash('successMessage', finalMessage); // Use the dynamically set message
//         res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

//     } catch (error) {
//         console.error('Error processing /api/data request:', error);
//         const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
//         writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
//         req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
//         res.redirect(basePath + '/data-entry'); // Redirect on error as well
//     }
// });



// staffRouter.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender } = req.body;
//         const hospital_code = req.session.hospital_code;
//         const site_code = req.session.site_code;

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

//         // --- Start: Input Validation ---
//         if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
//             let missingFields = [];
//             if (!Mr_no) missingFields.push('MR Number');
//             if (!firstName) missingFields.push('First Name');
//             if (!lastName) missingFields.push('Last Name');
//             if (!DOB) missingFields.push('Date of Birth');
//             if (!datetime) missingFields.push('Appointment Date & Time');
//             if (!phoneNumber) missingFields.push('Phone Number');
//             if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');

//             req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
//             console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
//             return res.redirect(basePath + '/data-entry');
//         }
//          // Validate datetime format more strictly if needed before creating Date object
//         const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
//         if (isNaN(appointmentDateObj.getTime())) {
//             req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
//             console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
//             return res.redirect(basePath + '/data-entry');
//         }
//         // --- End: Input Validation ---


//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor, ensure they belong to the session's hospital/site
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
//         if (!doctor) {
//              req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
//              console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
//              return res.redirect(basePath + '/data-entry');
//         }
//         // Prepare doctor name string safely
//         const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

//         // Format the datetime for display
//         const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

//         // Fetch survey details and build appointment_tracker
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality, hospital_code: hospital_code, site_code: site_code
//         });
//         let appointment_tracker = {};
//          if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//             try {
//                 // --- Build appointment_tracker logic ---
//                  let sortedSurveys = {};
//                  specialitySurveys.surveys.forEach(survey => {
//                      if (Array.isArray(survey.selected_months)) {
//                          survey.selected_months.forEach(month => {
//                              if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                              sortedSurveys[month].push(survey.survey_name);
//                          });
//                      }
//                  });
//                  let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                  let surveyTypeLabels = ["Baseline"];
//                  for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//                  let firstAppointmentTime = new Date(appointmentDateObj);
//                  let lastAppointmentTime = new Date(firstAppointmentTime);

//                  appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                      let appointmentTime;
//                      if (index === 0) {
//                          appointmentTime = new Date(firstAppointmentTime);
//                      } else {
//                          let previousMonth = parseInt(sortedMonths[index - 1]);
//                          let currentMonth = parseInt(month);
//                          if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                              let monthDifference = currentMonth - previousMonth;
//                              appointmentTime = new Date(lastAppointmentTime);
//                              appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                              lastAppointmentTime = new Date(appointmentTime);
//                          } else {
//                               console.warn(`API Data: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
//                               appointmentTime = new Date(lastAppointmentTime);
//                           }
//                      }
//                      const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//                      return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//                  });
//                  // --- End build appointment_tracker logic ---
//              } catch(trackerError) {
//                  console.error("API Data: Error building appointment tracker:", trackerError);
//                  // Continue processing even if tracker fails, log the error
//              }
//          }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

//         // Fetch Notification Preference and Hospital Name
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
//         console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

//         const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         let updatedSurveyStatus = "Not Completed"; // Default for new or reset
//         let isNewPatient = false;
//         const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

//         // --- Start: DB Upsert Logic ---
//         if (patient) {
//             // Existing Patient Update
//              isNewPatient = false;
//              console.log(`API Data: Patient ${Mr_no} found, updating.`);
//              // Determine survey status
//             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//              updatedSurveyStatus = patient.surveyStatus;
//              if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                  const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                  const isSpecialityChanged = patient.speciality !== speciality;
//                  if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//              } else { updatedSurveyStatus = "Not Completed"; }

//              // Update specialities array
//              let updatedSpecialities = patient.specialities || [];
//              const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//              if (specialityIndex !== -1) {
//                  updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
//                  if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                      updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                  }
//              } else {
//                  updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
//              }

//              // Perform Update
//              await collection.updateOne({ Mr_no }, {
//                  $set: {
//                      firstName, middleName, lastName, gender, DOB,
//                      datetime: formattedDatetime, // Store formatted string
//                      specialities: updatedSpecialities, // Store array with Date objects
//                      speciality, phoneNumber, email,
//                      hospital_code, site_code,
//                      surveyStatus: updatedSurveyStatus,
//                      appointment_tracker
//                  },
//                  $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//              });

//         } else {
//             // New Patient Insert
//              isNewPatient = true;
//              console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
//              updatedSurveyStatus = "Not Completed";
//              await collection.insertOne({
//                  Mr_no, firstName, middleName, lastName, gender, DOB,
//                  datetime: formattedDatetime, // Store formatted string
//                  specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
//                  speciality, phoneNumber, email,
//                  hospital_code, site_code,
//                  surveyStatus: updatedSurveyStatus,
//                  hashedMrNo, surveyLink,
//                  appointment_tracker,
//                  SurveySent: 0, // Initialize count
//                  smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
//              });
//         }
//         // --- End: DB Upsert Logic ---


//         // ***** START: Conditional Notification Logic *****
//         //  let finalMessage = 'Appointment created successfully'; // Base success message
//         // With this dynamic version:
// const userLang = req.cookies.lng || req.query.lng || 'en';

// let finalMessage = userLang === 'ar' 
//     ? 'تم إنشاء الموعد بنجاح' // Arabic success message
//     : 'Appointment created successfully'; // English success message (default)

//          if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
//              console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
//             //  finalMessage += ' Notifications skipped as per site preference.';
//              // No SurveySent increment

            

//          } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
//              // --- Handle Third Party API Case ---
//              console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
//              const placeholders = {
//                  patientMrNo: Mr_no, // 0: Added MRN for clarity
//                  patientFullName: patientFullName, // 1
//                  doctorFullName: doctorName,      // 2
//                  appointmentDatetime: formattedDatetime, // 3
//                  hospitalName: hospitalName,      // 4
//                  hashedMrNo: hashedMrNo,          // 5
//                  surveyLink: surveyLink,          // 6: Added survey link
//                  speciality: speciality           // 7: Added specialty
//              };
//              // Log the placeholders to the console
//              console.log("--- Third-Party API Placeholders ---");
//              console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
//              console.log("--- End Placeholders ---");

//             //  finalMessage += ' Third-party API placeholders logged.';
//              // No SurveySent increment as no message was sent externally

//          } else if (notificationPreference) {
//             // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
//              console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
//             //  finalMessage += ' Notifications attempted (check logs for status).';

//              let smsMessage;
//              let emailType = null;

//              // Determine message content based on survey status
//              if (updatedSurveyStatus === "Not Completed") {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                  emailType = 'appointmentConfirmation';
//              } else {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
//                  console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
//              }

//              // --- Attempt to Send SMS ---
//              if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
//                  try {
//                      const smsResult = await sendSMS(phoneNumber, smsMessage);
//                      console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
//              }

//              // --- Attempt to Send Email ---
//              if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
//                  try {
//                      await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
//                      console.log(`API Data: Email sent successfully for ${Mr_no}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
//              }

//              // --- Attempt to Send WhatsApp Template ---
//              if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
//                  try {
//                      const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                      const authToken = process.env.TWILIO_AUTH_TOKEN;
//                      if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                          const client = twilio(accountSid, authToken);
//                          const placeholders = {
//                               1: patientFullName, 2: doctorName, 3: formattedDatetime,
//                               4: hospitalName, 5: hashedMrNo
//                           };
//                          let formattedPhoneNumber = phoneNumber;
//                          if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

//                          if (formattedPhoneNumber) {
//                               const message = await client.messages.create({
//                                   from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                   to: formattedPhoneNumber,
//                                   contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                   contentVariables: JSON.stringify(placeholders),
//                                   statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
//                               });
//                               console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
//                               await collection.updateOne({ Mr_no }, {
//                                   $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
//                                   $inc: { SurveySent: 1 }
//                               });
//                          } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
//                      } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
//                  } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
//              }

//          } else {
//              // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
//              console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
//             //  finalMessage += ' Notifications not sent (preference not configured for sending).';
//              // No SurveySent increment
//          }
//         // ***** END: Conditional Notification Logic *****

//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
      

//         const timestamp = Date.now();
//         const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

//         const outputFilePath = path.join(uploadsDir, singleUploadFile);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Single Upload');

//         sheet.columns = [
//             { header: 'MR Number', key: 'Mr_no', width: 15 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 18 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         sheet.addRow({
//             Mr_no,
//             firstName,
//             lastName,
//             phoneNumber,
//             surveyLink,
//             notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
//         });

//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = singleUploadFile;



//         // --- Final Response ---
//         req.flash('successMessage', finalMessage); // Use the dynamically set message
//         res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

//     } catch (error) {
//         console.error('Error processing /api/data request:', error);
//         const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
//         writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
//         req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
//         res.redirect(basePath + '/data-entry'); // Redirect on error as well
//     }
// });




// staffRouter.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender,codes } = req.body;
//         const hospital_code = req.session.hospital_code;
//         const site_code = req.session.site_code;

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

//         // --- Start: Input Validation ---
//         if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
//             let missingFields = [];
//             if (!Mr_no) missingFields.push('MR Number');
//             if (!firstName) missingFields.push('First Name');
//             if (!lastName) missingFields.push('Last Name');
//             if (!DOB) missingFields.push('Date of Birth');
//             if (!datetime) missingFields.push('Appointment Date & Time');
//             if (!phoneNumber) missingFields.push('Phone Number');
//             if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');

//             req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
//             console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
//             return res.redirect(basePath + '/data-entry');
//         }
//          // Validate datetime format more strictly if needed before creating Date object
//         const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
//         if (isNaN(appointmentDateObj.getTime())) {
//             req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
//             console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
//             return res.redirect(basePath + '/data-entry');
//         }
//         // --- End: Input Validation ---


//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor, ensure they belong to the session's hospital/site
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
//         if (!doctor) {
//              req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
//              console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
//              return res.redirect(basePath + '/data-entry');
//         }
//         // Prepare doctor name string safely
//         const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

//         // Format the datetime for display
//         const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

//                 if (codes && !codesData.find((item) => item.code === codes)) {
//                     req.flash('errorMessage', `ICD Code ${codes} not found`);
//                     console.error('Validation Error:', `ICD Code ${codes} not found: ${codes}`);
//                     return res.redirect(basePath + '/data-entry');
//                 }
        
//                 const codeDetail = codesData.find((item) => item.code === codes);

//         // Fetch survey details and build appointment_tracker
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality, hospital_code: hospital_code, site_code: site_code
//         });
//         let appointment_tracker = {};
//          if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//             try {
//                 // --- Build appointment_tracker logic ---
//                  let sortedSurveys = {};
//                  specialitySurveys.surveys.forEach(survey => {
//                      if (Array.isArray(survey.selected_months)) {
//                          survey.selected_months.forEach(month => {
//                              if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                              sortedSurveys[month].push(survey.survey_name);
//                          });
//                      }
//                  });
//                  let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                  let surveyTypeLabels = ["Baseline"];
//                  for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//                  let firstAppointmentTime = new Date(appointmentDateObj);
//                  let lastAppointmentTime = new Date(firstAppointmentTime);

//                  appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                      let appointmentTime;
//                      if (index === 0) {
//                          appointmentTime = new Date(firstAppointmentTime);
//                      } else {
//                          let previousMonth = parseInt(sortedMonths[index - 1]);
//                          let currentMonth = parseInt(month);
//                          if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                              let monthDifference = currentMonth - previousMonth;
//                              appointmentTime = new Date(lastAppointmentTime);
//                              appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                              lastAppointmentTime = new Date(appointmentTime);
//                          } else {
//                               console.warn(`API Data: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
//                               appointmentTime = new Date(lastAppointmentTime);
//                           }
//                      }
//                      const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//                      return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//                  });
//                  // --- End build appointment_tracker logic ---
//              } catch(trackerError) {
//                  console.error("API Data: Error building appointment tracker:", trackerError);
//                  // Continue processing even if tracker fails, log the error
//              }
//          }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

//         // Fetch Notification Preference and Hospital Name
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
//         console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

//         const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         let updatedSurveyStatus = "Not Completed"; // Default for new or reset
//         let isNewPatient = false;
//         const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

//         // --- Start: DB Upsert Logic ---
//         if (patient) {
//             // Existing Patient Update
//              isNewPatient = false;
//              let updatedDiagnosis = patient.codes || [];
//             if (codes) {
//                 updatedDiagnosis.push({ code: codes, description: codeDetail.description, date: formattedDatetime });
//                 console.log("in here");
//             }
//              console.log(`API Data: Patient ${Mr_no} found, updating.`);
//              // Determine survey status
//             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//              updatedSurveyStatus = patient.surveyStatus;
//              if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                  const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                  const isSpecialityChanged = patient.speciality !== speciality;
//                  if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//              } else { updatedSurveyStatus = "Not Completed"; }

//              // Update specialities array
//              let updatedSpecialities = patient.specialities || [];
//              const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//              if (specialityIndex !== -1) {
//                  updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
//                  if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                      updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                  }
//              } else {
//                  updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
//              }

//              // Perform Update
//              await collection.updateOne({ Mr_no }, {
//                  $set: {
//                      firstName, middleName, lastName, gender, DOB,
//                      datetime: formattedDatetime, // Store formatted string
//                      specialities: updatedSpecialities, // Store array with Date objects
//                      speciality, phoneNumber, email,
//                      hospital_code, site_code,
//                      surveyStatus: updatedSurveyStatus,
//                      appointment_tracker,
//                      Codes: updatedDiagnosis,
//                  },
//                  $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//              });

//         } else {
//             // New Patient Insert
//              isNewPatient = true;
//              console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
//              let newDiagnosis = codes ? [{ code: codes, description: codeDetail.description, date: formattedDatetime }] : [];
//              updatedSurveyStatus = "Not Completed";
//              await collection.insertOne({
//                  Mr_no, firstName, middleName, lastName, gender, DOB,
//                  datetime: formattedDatetime, // Store formatted string
//                  specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
//                  speciality, phoneNumber, email,
//                  hospital_code, site_code,
//                  surveyStatus: updatedSurveyStatus,
//                  hashedMrNo, surveyLink,
//                  Codes: newDiagnosis,
//                  appointment_tracker,
//                  SurveySent: 0, // Initialize count
//                  smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
//              });
//         }
//         // --- End: DB Upsert Logic ---


//         // ***** START: Conditional Notification Logic *****
//         //  let finalMessage = 'Appointment created successfully'; // Base success message
//         // With this dynamic version:
// const userLang = req.cookies.lng || req.query.lng || 'en';

// let finalMessage = userLang === 'ar' 
//     ? 'تم إنشاء الموعد بنجاح' // Arabic success message
//     : 'Appointment created successfully'; // English success message (default)

//          if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
//              console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
//             //  finalMessage += ' Notifications skipped as per site preference.';
//              // No SurveySent increment

            

//          } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
//              // --- Handle Third Party API Case ---
//              console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
//              const placeholders = {
//                  patientMrNo: Mr_no, // 0: Added MRN for clarity
//                  patientFullName: patientFullName, // 1
//                  doctorFullName: doctorName,      // 2
//                  appointmentDatetime: formattedDatetime, // 3
//                  hospitalName: hospitalName,      // 4
//                  hashedMrNo: hashedMrNo,          // 5
//                  surveyLink: surveyLink,          // 6: Added survey link
//                  speciality: speciality           // 7: Added specialty
//              };
//              // Log the placeholders to the console
//              console.log("--- Third-Party API Placeholders ---");
//              console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
//              console.log("--- End Placeholders ---");

//             //  finalMessage += ' Third-party API placeholders logged.';
//              // No SurveySent increment as no message was sent externally

//          } else if (notificationPreference) {
//             // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
//              console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
//             //  finalMessage += ' Notifications attempted (check logs for status).';

//              let smsMessage;
//              let emailType = null;

//              // Determine message content based on survey status
//              if (updatedSurveyStatus === "Not Completed") {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                  emailType = 'appointmentConfirmation';
//              } else {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
//                  console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
//              }

//              // --- Attempt to Send SMS ---
//              if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
//                  try {
//                      const smsResult = await sendSMS(phoneNumber, smsMessage);
//                      console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
//              }

//              // --- Attempt to Send Email ---
//              if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
//                  try {
//                      await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
//                      console.log(`API Data: Email sent successfully for ${Mr_no}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
//              }

//              // --- Attempt to Send WhatsApp Template ---
//              if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
//                  try {
//                      const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                      const authToken = process.env.TWILIO_AUTH_TOKEN;
//                      if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                          const client = twilio(accountSid, authToken);
//                          const placeholders = {
//                               1: patientFullName, 2: doctorName, 3: formattedDatetime,
//                               4: hospitalName, 5: hashedMrNo
//                           };
//                          let formattedPhoneNumber = phoneNumber;
//                          if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

//                          if (formattedPhoneNumber) {
//                               const message = await client.messages.create({
//                                   from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                   to: formattedPhoneNumber,
//                                   contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                   contentVariables: JSON.stringify(placeholders),
//                                   statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
//                               });
//                               console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
//                               await collection.updateOne({ Mr_no }, {
//                                   $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
//                                   $inc: { SurveySent: 1 }
//                               });
//                          } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
//                      } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
//                  } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
//              }

//          } else {
//              // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
//              console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
//             //  finalMessage += ' Notifications not sent (preference not configured for sending).';
//              // No SurveySent increment
//          }
//         // ***** END: Conditional Notification Logic *****

//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
      

//         const timestamp = Date.now();
//         const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

//         const outputFilePath = path.join(uploadsDir, singleUploadFile);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Single Upload');

//         sheet.columns = [
//             { header: 'MR Number', key: 'Mr_no', width: 15 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 18 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         sheet.addRow({
//             Mr_no,
//             firstName,
//             lastName,
//             phoneNumber,
//             surveyLink,
//             notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
//         });

//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = singleUploadFile;



//         // --- Final Response ---
//         req.flash('successMessage', finalMessage); // Use the dynamically set message
//         res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

//     } catch (error) {
//         console.error('Error processing /api/data request:', error);
//         const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
//         writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
//         req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
//         res.redirect(basePath + '/data-entry'); // Redirect on error as well
//     }
// });

//bupa api

// 2. Token Management Variables for Bupa API
let bupaAccessToken = null;
let bupaAccessTokenExpiresAt = 0;

// 3. Helper Function: Fetch JWT Token from Bupa/GOQii API
async function fetchBupaAccessToken() {
    console.log('[BupaAPIComm] Attempting to fetch JWT token from Bupa/GOQii API...');
    try {
        const response = await axios.get(`${BUPA_API_BASE_URL}/services/wh_fetch_token`, { // [cite: 11]
            headers: {
                'clientId': BUPA_API_CLIENT_ID, // [cite: 12]
                'secret': BUPA_API_SECRET       // [cite: 12]
            }
        });

        if (response.data.code === 200 && response.data.data && response.data.data.access_token) {
            bupaAccessToken = response.data.data.access_token;
            const expiresInSeconds = parseInt(response.data.data.access_token_expires_in, 10); // e.g., "900" [cite: 12]
            bupaAccessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000);
            console.log('[BupaAPIComm] Successfully fetched Bupa access token.');
            return true;
        } else {
            console.error('[BupaAPIComm] Failed to fetch Bupa access token:', response.data.message || response.data);
            bupaAccessToken = null; // Clear invalid token
            bupaAccessTokenExpiresAt = 0;
            return false;
        }
    } catch (error) {
        console.error('[BupaAPIComm] Error fetching Bupa access token:', error.response ? error.response.data : error.message);
        bupaAccessToken = null; // Clear token on error
        bupaAccessTokenExpiresAt = 0;
        return false;
    }
}

// 4. Helper Function: Ensure a valid Bupa token is available
// Since Bupa's token API spec doesn't show a refresh token, "refreshing" means re-fetching.
async function ensureValidBupaToken() {
    const bufferTime = 60 * 1000; // 60 seconds buffer before actual expiry to proactively fetch
    if (!bupaAccessToken || bupaAccessTokenExpiresAt < (Date.now() + bufferTime)) {
        console.log('[BupaAPIComm] Bupa access token missing, expired, or nearing expiry. Fetching new token.');
        return await fetchBupaAccessToken();
    }
    // console.log('[BupaAPIComm] Existing Bupa access token is still valid.');
    return true; // Token is still valid
}

// 5. Main Function to Send WhatsApp Data to Bupa/GOQii Provider
// This function now targets the Bupa WhatsApp endpoint.
// The 'appointmentData' parameter here should be an array of records for the 'data' field of Bupa's API.
// The actual transformation into Bupa's {"template": "...", "data": "[{...},{...}]"} structure,
// including chunking and potential encryption, should happen before calling this, or this function
// needs to be expanded to handle it (as discussed in the broader review).
// For now, this focuses on the API call itself.
async function sendWhatsAppDataToBupaProvider(payloadForBupaApi) {
    // payloadForBupaApi is expected to be: { template: "template_name", data: "stringified_json_array_of_records" }
    console.log('[BupaAPIComm] Preparing to send WhatsApp data to Bupa provider...');

    if (!payloadForBupaApi || !payloadForBupaApi.template || !payloadForBupaApi.data) {
        console.error('[BupaAPIComm] Invalid payload: template and data fields are required.');
        return;
    }

    const hasValidToken = await ensureValidBupaToken();
    if (!hasValidToken || !bupaAccessToken) {
        console.error('[BupaAPIComm] No valid Bupa access token. Aborting data send.');
        return;
    }

    try {
        const response = await axios.post(
            `${BUPA_API_BASE_URL}/services/wh_send_whatsapp_messages`, // [cite: 13]
            payloadForBupaApi, // This should be { template: "...", data: "stringified_and_maybe_encrypted_json_array" }
            {
                headers: {
                    'Authorization': `${bupaAccessToken}`, // As per PDF for this endpoint [cite: 13]
                                                          // Confirm if "Bearer " prefix is needed.
                                                          // Analytics endpoint uses "Bearer ".
                    'Content-Type': 'application/json',    // [cite: 13]
                },
            }
        );
        console.log('[BupaAPIComm] Successfully sent data to Bupa. Response:', response.data);
        // According to Bupa Docs, a 200 response means "queued" [cite: 20]
        if (response.data.code === 200 && response.data.status === "queued") {
            // Handle success (e.g., for chunking logic, this indicates the chunk was accepted)
        } else {
            // Handle cases where HTTP status is 200 but Bupa API indicates an issue
            console.warn('[BupaAPIComm] Data sent to Bupa, but API response indicates an issue:', response.data);
        }
    } catch (error) {
        console.error('[BupaAPIComm] Error sending data to Bupa:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) { // Unauthorized or invalid token [cite: 20, 21]
            bupaAccessToken = null; // Force re-auth on next attempt
            bupaAccessTokenExpiresAt = 0;
            console.log('[BupaAPIComm] Bupa token seems invalid due to 401, cleared for re-fetch.');
        }
        // Rethrow or handle error as needed for calling functions (e.g., for chunking logic)
        throw error;
    }
}

staffRouter.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender,codes,code_date } = req.body;
        console.log("code_date",code_date);
        const hospital_code = req.session.hospital_code;
        const site_code = req.session.site_code;

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

        // --- Start: Input Validation ---
        if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
            let missingFields = [];
            if (!Mr_no) missingFields.push('MR Number');
            if (!firstName) missingFields.push('First Name');
            if (!lastName) missingFields.push('Last Name');
            if (!DOB) missingFields.push('Date of Birth');
            if (!datetime) missingFields.push('Appointment Date & Time');
            if (!phoneNumber) missingFields.push('Phone Number');
            if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');

            req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
            console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
            return res.redirect(basePath + '/data-entry');
        }
         // Validate datetime format more strictly if needed before creating Date object
        const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        if (isNaN(appointmentDateObj.getTime())) {
            req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
            console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
            return res.redirect(basePath + '/data-entry');
        }
        // --- End: Input Validation ---


        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor, ensure they belong to the session's hospital/site
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
        if (!doctor) {
             req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
             console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
             return res.redirect(basePath + '/data-entry');
        }
        // Prepare doctor name string safely
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

        // Format the datetime for display
        const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

                if (codes && !codesData.find((item) => item.code === codes)) {
                    req.flash('errorMessage', `ICD Code ${codes} not found`);
                    console.error('Validation Error:', `ICD Code ${codes} not found: ${codes}`);
                    return res.redirect(basePath + '/data-entry');
                }
        
                const codeDetail = codesData.find((item) => item.code === codes);

        // Fetch survey details and build appointment_tracker
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({
            specialty: speciality, hospital_code: hospital_code, site_code: site_code
        });
        let appointment_tracker = {};
         if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
            try {
                // --- Build appointment_tracker logic ---
                 let sortedSurveys = {};
                 specialitySurveys.surveys.forEach(survey => {
                     if (Array.isArray(survey.selected_months)) {
                         survey.selected_months.forEach(month => {
                             if (!sortedSurveys[month]) sortedSurveys[month] = [];
                             sortedSurveys[month].push(survey.survey_name);
                         });
                     }
                 });
                 let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                 let surveyTypeLabels = ["Baseline"];
                 for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

                 let firstAppointmentTime = new Date(appointmentDateObj);
                 let lastAppointmentTime = new Date(firstAppointmentTime);

                 appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                     let appointmentTime;
                     if (index === 0) {
                         appointmentTime = new Date(firstAppointmentTime);
                     } else {
                         let previousMonth = parseInt(sortedMonths[index - 1]);
                         let currentMonth = parseInt(month);
                         if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                             let monthDifference = currentMonth - previousMonth;
                             appointmentTime = new Date(lastAppointmentTime);
                             appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                             lastAppointmentTime = new Date(appointmentTime);
                         } else {
                              console.warn(`API Data: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
                              appointmentTime = new Date(lastAppointmentTime);
                          }
                     }
                     const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
                     return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
                 });
                 // --- End build appointment_tracker logic ---
             } catch(trackerError) {
                 console.error("API Data: Error building appointment tracker:", trackerError);
                 // Continue processing even if tracker fails, log the error
             }
         }

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

        // Fetch Notification Preference and Hospital Name
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
        console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        let updatedSurveyStatus = "Not Completed"; // Default for new or reset
        let isNewPatient = false;
        const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

        // --- Start: DB Upsert Logic ---
        if (patient) {
            // Existing Patient Update
             isNewPatient = false;
             let updatedDiagnosis = patient.codes || [];
            if (codes) {
                updatedDiagnosis.push({ code: codes, description: codeDetail.description, date: code_date, _id: new ObjectId() });
                console.log("diagnosis",updatedDiagnosis);
            }
             console.log(`API Data: Patient ${Mr_no} found, updating.`);
             // Determine survey status
            const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
             updatedSurveyStatus = patient.surveyStatus;
             if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                 const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                 const isSpecialityChanged = patient.speciality !== speciality;
                 if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
             } else { updatedSurveyStatus = "Not Completed"; }

             // Update specialities array
             let updatedSpecialities = patient.specialities || [];
             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
             if (specialityIndex !== -1) {
                 updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
                 if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                     updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                 }
             } else {
                 updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
             }

             // Perform Update
             await collection.updateOne({ Mr_no }, {
                 $set: {
                     firstName, middleName, lastName, gender, DOB,
                     datetime: formattedDatetime, // Store formatted string
                     specialities: updatedSpecialities, // Store array with Date objects
                     speciality, phoneNumber, email,
                     hospital_code, site_code,
                     surveyStatus: updatedSurveyStatus,
                     appointment_tracker,
                     Codes: updatedDiagnosis,
                 },
                 $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
             });

        } else {
            // New Patient Insert
             isNewPatient = true;
             console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
             let newDiagnosis = codes ? [{ code: codes, description: codeDetail.description, date: code_date, _id: new ObjectId() }] : [];

             updatedSurveyStatus = "Not Completed";
             await collection.insertOne({
                 Mr_no, firstName, middleName, lastName, gender, DOB,
                 datetime: formattedDatetime, // Store formatted string
                 specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
                 speciality, phoneNumber, email,
                 hospital_code, site_code,
                 surveyStatus: updatedSurveyStatus,
                 hashedMrNo, surveyLink,
                 Codes: newDiagnosis,
                 appointment_tracker,
                 SurveySent: 0, // Initialize count
                 smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
             });
        }
        // --- End: DB Upsert Logic ---


        // ***** START: Conditional Notification Logic *****
        //  let finalMessage = 'Appointment created successfully'; // Base success message
        // With this dynamic version:
const userLang = req.cookies.lng || req.query.lng || 'en';

let finalMessage = userLang === 'ar' 
    ? 'تم إنشاء الموعد بنجاح' // Arabic success message
    : 'Appointment created successfully'; // English success message (default)

         if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
             console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
            //  finalMessage += ' Notifications skipped as per site preference.';
             // No SurveySent increment

            

         } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
             // --- Handle Third Party API Case ---
             console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
            //  const placeholders = {
            //      patientMrNo: Mr_no, // 0: Added MRN for clarity
            //      patientFullName: patientFullName, // 1
            //      doctorFullName: doctorName,      // 2
            //      appointmentDatetime: formattedDatetime, // 3
            //      hospitalName: hospitalName,      // 4
            //      hashedMrNo: hashedMrNo,          // 5
            //      surveyLink: surveyLink,          // 6: Added survey link
            //      speciality: speciality           // 7: Added specialty
            //  };
            //  // Log the placeholders to the console
            //  console.log("--- Third-Party API Placeholders ---");
            //  console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
            //  console.log("--- End Placeholders ---");

            const payloadForMockServer = {
            patientMrNo: Mr_no,
            patientFullName: patientFullName, // You should have this defined (firstName + lastName)
            doctorFullName: doctorName,       // You should have this defined
            appointmentDatetime: formattedDatetime, // You have this
            hospitalName: hospitalName,     // You have this
            hashedMrNo: hashedMrNo,         // You have this
            surveyLink: surveyLink,         // You have this
            speciality: speciality,         // You have this from req.body
            phoneNumber: phoneNumber,       // From req.body
            email: email,                   // From req.body
            gender: gender,                 // From req.body
            // Add any other relevant fields
            sourceSystemRecordId: null, // If you have a unique ID from your DB for the appointment record
            isNewPatient: isNewPatient, // You determined this earlier
            notificationPreferenceUsed: notificationPreference // The preference that was actioned
        };

        // Call the function to send data to the mock server
        // This can be called asynchronously (don't await if you don't want to block response)
        // or awaited if you need to ensure it's attempted before responding.
        // For external non-critical calls, fire-and-forget is often fine.
        sendAppointmentDataToMockServer(payloadForMockServer).catch(err => {
            // Log error from the async call if it's not awaited and you want to catch promise rejections
            console.error('[MockAuthComm] Background send error:', err);
        });

    }
 else if (notificationPreference) {
            // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
             console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
            //  finalMessage += ' Notifications attempted (check logs for status).';

             let smsMessage;
             let emailType = null;

             // Determine message content based on survey status
             if (updatedSurveyStatus === "Not Completed") {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                 emailType = 'appointmentConfirmation';
             } else {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                 console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
             }

             // --- Attempt to Send SMS ---
             if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
                 try {
                     const smsResult = await sendSMS(phoneNumber, smsMessage);
                     console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
             }

             // --- Attempt to Send Email ---
             if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
                 try {
                     await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                     console.log(`API Data: Email sent successfully for ${Mr_no}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
             }

             // --- Attempt to Send WhatsApp Template ---
             if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
                 try {
                     const accountSid = process.env.TWILIO_ACCOUNT_SID;
                     const authToken = process.env.TWILIO_AUTH_TOKEN;
                     if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                         const client = twilio(accountSid, authToken);
                         const placeholders = {
                              1: patientFullName, 2: doctorName, 3: formattedDatetime,
                              4: hospitalName, 5: hashedMrNo
                          };
                         let formattedPhoneNumber = phoneNumber;
                         if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

                         if (formattedPhoneNumber) {
                              const message = await client.messages.create({
                                  from: process.env.TWILIO_WHATSAPP_NUMBER,
                                  to: formattedPhoneNumber,
                                  contentSid: process.env.TWILIO_TEMPLATE_SID,
                                  contentVariables: JSON.stringify(placeholders),
                                  statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
                              });
                              console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                              await collection.updateOne({ Mr_no }, {
                                  $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
                                  $inc: { SurveySent: 1 }
                              });
                         } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
                     } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
                 } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
             }

         } else {
             // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
             console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
            //  finalMessage += ' Notifications not sent (preference not configured for sending).';
             // No SurveySent increment
         }
        // ***** END: Conditional Notification Logic *****

        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
      

        const timestamp = Date.now();
        const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

        const outputFilePath = path.join(uploadsDir, singleUploadFile);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Single Upload');

        sheet.columns = [
            { header: 'MR Number', key: 'Mr_no', width: 15 },
            { header: 'First Name', key: 'firstName', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 18 },
            { header: 'Survey Link', key: 'surveyLink', width: 50 },
            //{ header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        sheet.addRow({
            Mr_no,
            firstName,
            lastName,
            phoneNumber,
            surveyLink,
            //notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
        });

        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = singleUploadFile;



        // --- Final Response ---
        req.flash('successMessage', finalMessage); // Use the dynamically set message
        res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

    } catch (error) {
        console.error('Error processing /api/data request:', error);
        const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
        writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
        req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
        res.redirect(basePath + '/data-entry'); // Redirect on error as well
    }
});

// staffRouter.post('/bupa/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender,bupa_membership_number,member_type,
//             city,
//             primary_provider_name,
//             primary_provider_code,
//             secondary_provider_name,
//             secondary_provider_code, secondary_doctors_name,
//             contract_no,
//             contract_name,
//             policy_status,
//             policy_end_date,
//             primary_diagnosis,
//             confirmed_pathway,
//             care_navigator_name} = req.body;
//         const hospital_code = req.session.hospital_code;
//         const site_code = req.session.site_code;

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = req.body['speciality-doctor'].split('||');


//         // --- Start: Input Validation ---
//         if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
//             let missingFields = [];
//             if (!Mr_no) missingFields.push('National ID');
//             if (!firstName) missingFields.push('First Name');
//             if (!lastName) missingFields.push('Last Name');
//             if (!DOB) missingFields.push('Date of Birth');
//             if (!datetime) missingFields.push('Appointment Date & Time');
//             if (!phoneNumber) missingFields.push('Phone Number');
//             if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');
//             if (!gender) missingFields.push('Gender');
//             if (!bupa_membership_number) missingFields.push('Bupa Membership Number');
//             if (!member_type) missingFields.push('Member Type');
//             if (!city) missingFields.push('City');
//             if (!primary_provider_name) missingFields.push('Primary Provider Name');
//             if (!primary_provider_code) missingFields.push('Primary Provider Code');
//             if (!contract_no) missingFields.push('Contract Number');
//             if (!contract_name) missingFields.push('Contract Name');
//             if (!policy_status) missingFields.push('Policy Status');
//             if (!policy_end_date) missingFields.push('Policy End Date');
//             if (!primary_diagnosis) missingFields.push('Primary Diagnosis');

//             req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
//             console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
//             return res.redirect(basePath + '/data-entry');
//         }
//          // Validate datetime format more strictly if needed before creating Date object
//         const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
//         if (isNaN(appointmentDateObj.getTime())) {
//             req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
//             console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
//             return res.redirect(basePath + '/data-entry');
//         }
//         // --- End: Input Validation ---


//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor, ensure they belong to the session's hospital/site
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
//         if (!doctor) {
//              req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
//              console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
//              return res.redirect(basePath + '/data-entry');
//         }
//         // Prepare doctor name string safely
//         const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

//         // Format the datetime for display
//         const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

//         const additionalFields = {
//             bupa_membership_number,
//             member_type,
//             city,
//             primary_provider_name,
//             primary_provider_code,
//             secondary_provider_name,
//             secondary_provider_code,
//             secondary_doctors_name,
//             contract_no,
//             contract_name,
//             policy_status,
//             policy_end_date,
//             primary_diagnosis,
//             confirmed_pathway,
//             care_navigator_name
//         };

//         // Fetch survey details and build appointment_tracker
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality, hospital_code: hospital_code, site_code: site_code
//         });
//         let appointment_tracker = {};
//          if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//             try {
//                 // --- Build appointment_tracker logic ---
//                  let sortedSurveys = {};
//                  specialitySurveys.surveys.forEach(survey => {
//                      if (Array.isArray(survey.selected_months)) {
//                          survey.selected_months.forEach(month => {
//                              if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                              sortedSurveys[month].push(survey.survey_name);
//                          });
//                      }
//                  });
//                  let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                  let surveyTypeLabels = ["Baseline"];
//                  for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//                  let firstAppointmentTime = new Date(appointmentDateObj);
//                  let lastAppointmentTime = new Date(firstAppointmentTime);

//                  appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                      let appointmentTime;
//                      if (index === 0) {
//                          appointmentTime = new Date(firstAppointmentTime);
//                      } else {
//                          let previousMonth = parseInt(sortedMonths[index - 1]);
//                          let currentMonth = parseInt(month);
//                          if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                              let monthDifference = currentMonth - previousMonth;
//                              appointmentTime = new Date(lastAppointmentTime);
//                              appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                              lastAppointmentTime = new Date(appointmentTime);
//                          } else {
//                               console.warn(`API Data: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
//                               appointmentTime = new Date(lastAppointmentTime);
//                           }
//                      }
//                      const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//                      return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//                  });
//                  // --- End build appointment_tracker logic ---
//              } catch(trackerError) {
//                  console.error("API Data: Error building appointment tracker:", trackerError);
//                  // Continue processing even if tracker fails, log the error
//              }
//          }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

//         // Fetch Notification Preference and Hospital Name
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
//         console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

//         const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         let updatedSurveyStatus = "Not Completed"; // Default for new or reset
//         let isNewPatient = false;
//         const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

//         // --- Start: DB Upsert Logic ---
//         if (patient) {
//             // Existing Patient Update
//              isNewPatient = false;
             
//              console.log(`API Data: Patient ${Mr_no} found, updating.`);
//              // Determine survey status
//             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//              updatedSurveyStatus = patient.surveyStatus;
//              if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                  const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                  const isSpecialityChanged = patient.speciality !== speciality;
//                  if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//              } else { updatedSurveyStatus = "Not Completed"; }

//              // Update specialities array
//              let updatedSpecialities = patient.specialities || [];
//              const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//              if (specialityIndex !== -1) {
//                  updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
//                  if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                      updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                  }
//              } else {
//                  updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
//              }

//              // Perform Update
//              await collection.updateOne({ Mr_no }, {
//                  $set: {
//                      firstName, middleName, lastName, gender, DOB,
//                      datetime: formattedDatetime, // Store formatted string
//                      specialities: updatedSpecialities, // Store array with Date objects
//                      speciality, phoneNumber, email,
//                      hospital_code, site_code,additionalFields,
//                      surveyStatus: updatedSurveyStatus,
//                      appointment_tracker,
//                  },
//                  $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//              });

//         } else {
//             // New Patient Insert
//              isNewPatient = true;
//              console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
//              updatedSurveyStatus = "Not Completed";
//              await collection.insertOne({
//                  Mr_no, firstName, middleName, lastName, gender, DOB,
//                  datetime: formattedDatetime, // Store formatted string
//                  specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
//                  speciality, phoneNumber, email,
//                  hospital_code, site_code,additionalFields,
//                  surveyStatus: updatedSurveyStatus,
//                  hashedMrNo, surveyLink,
//                  appointment_tracker,
//                  SurveySent: 0, // Initialize count
//                  smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
//              });
//         }
//         // --- End: DB Upsert Logic ---


//         // ***** START: Conditional Notification Logic *****
//         //  let finalMessage = 'Appointment created successfully'; // Base success message
//         // With this dynamic version:
// const userLang = req.cookies.lng || req.query.lng || 'en';

// let finalMessage = userLang === 'ar' 
//     ? 'تم إنشاء الموعد بنجاح' // Arabic success message
//     : 'Appointment created successfully'; // English success message (default)

//          if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
//              console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
//             //  finalMessage += ' Notifications skipped as per site preference.';
//              // No SurveySent increment

            

//          } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
//              // --- Handle Third Party API Case ---
//              console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
//              const placeholders = {
//                  patientMrNo: Mr_no, // 0: Added MRN for clarity
//                  patientFullName: patientFullName, // 1
//                  doctorFullName: doctorName,      // 2
//                  appointmentDatetime: formattedDatetime, // 3
//                  hospitalName: hospitalName,      // 4
//                  hashedMrNo: hashedMrNo,          // 5
//                  surveyLink: surveyLink,          // 6: Added survey link
//                  speciality: speciality           // 7: Added specialty
//              };
//              // Log the placeholders to the console
//              console.log("--- Third-Party API Placeholders ---");
//              console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
//              console.log("--- End Placeholders ---");

//             //  finalMessage += ' Third-party API placeholders logged.';
//              // No SurveySent increment as no message was sent externally

//          } else if (notificationPreference) {
//             // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
//              console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
//             //  finalMessage += ' Notifications attempted (check logs for status).';

//              let smsMessage;
//              let emailType = null;

//              // Determine message content based on survey status
//              if (updatedSurveyStatus === "Not Completed") {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                  emailType = 'appointmentConfirmation';
//              } else {
//                  smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
//                  console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
//              }

//              // --- Attempt to Send SMS ---
//              if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
//                  try {
//                      const smsResult = await sendSMS(phoneNumber, smsMessage);
//                      console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
//              }

//              // --- Attempt to Send Email ---
//              if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
//                  try {
//                      await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
//                      console.log(`API Data: Email sent successfully for ${Mr_no}`);
//                      await collection.updateOne({ Mr_no }, {
//                          $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
//                          $inc: { SurveySent: 1 }
//                      });
//                  } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
//              }

//              // --- Attempt to Send WhatsApp Template ---
//              if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
//                  try {
//                      const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                      const authToken = process.env.TWILIO_AUTH_TOKEN;
//                      if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                          const client = twilio(accountSid, authToken);
//                          const placeholders = {
//                               1: patientFullName, 2: doctorName, 3: formattedDatetime,
//                               4: hospitalName, 5: hashedMrNo
//                           };
//                          let formattedPhoneNumber = phoneNumber;
//                          if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

//                          if (formattedPhoneNumber) {
//                               const message = await client.messages.create({
//                                   from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                   to: formattedPhoneNumber,
//                                   contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                   contentVariables: JSON.stringify(placeholders),
//                                   statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
//                               });
//                               console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
//                               await collection.updateOne({ Mr_no }, {
//                                   $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
//                                   $inc: { SurveySent: 1 }
//                               });
//                          } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
//                      } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
//                  } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
//              }

//          } else {
//              // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
//              console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
//             //  finalMessage += ' Notifications not sent (preference not configured for sending).';
//              // No SurveySent increment
//          }
//         // ***** END: Conditional Notification Logic *****

//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
      

//         const timestamp = Date.now();
//         const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

//         const outputFilePath = path.join(uploadsDir, singleUploadFile);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Single Upload');

//         sheet.columns = [
//             { header: 'National ID', key: 'Mr_no', width: 15 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 18 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         sheet.addRow({
//             Mr_no,
//             firstName,
//             lastName,
//             phoneNumber,
//             surveyLink,
//             notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
//         });

//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = singleUploadFile;



//         // --- Final Response ---
//         req.flash('successMessage', finalMessage); // Use the dynamically set message
//         res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

//     } catch (error) {
//         console.error('Error processing /api/data request:', error);
//         const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
//         writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
//         req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
//         res.redirect(basePath + '/data-entry'); // Redirect on error as well
//     }
// });


//Survey Continuity


staffRouter.post('/bupa/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender,bupa_membership_number,member_type,
            city,
            primary_provider_name,
            primary_provider_code,
            secondary_provider_name,
            secondary_provider_code, secondary_doctors_name,
            contract_no,
            contract_name,
            policy_status,
            policy_end_date,
            primary_diagnosis,
            confirmed_pathway,
            care_navigator_name} = req.body;
        const hospital_code = req.session.hospital_code;
        const site_code = req.session.site_code;

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');


        // --- Start: Input Validation ---
        if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
            let missingFields = [];
            if (!Mr_no) missingFields.push('National ID');
            if (!firstName) missingFields.push('First Name');
            if (!lastName) missingFields.push('Last Name');
            if (!DOB) missingFields.push('Date of Birth');
            if (!datetime) missingFields.push('Appointment Date & Time');
            if (!phoneNumber) missingFields.push('Phone Number');
            if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');
            if (!gender) missingFields.push('Gender');
            if (!bupa_membership_number) missingFields.push('Bupa Membership Number');
            if (!member_type) missingFields.push('Member Type');
            if (!city) missingFields.push('City');
            if (!primary_provider_name) missingFields.push('Primary Provider Name');
            if (!primary_provider_code) missingFields.push('Primary Provider Code');
            if (!contract_no) missingFields.push('Contract Number');
            if (!contract_name) missingFields.push('Contract Name');
            if (!policy_status) missingFields.push('Policy Status');
            if (!policy_end_date) missingFields.push('Policy End Date');
            if (!primary_diagnosis) missingFields.push('Primary Diagnosis');

            req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
            console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
            return res.redirect(basePath + '/data-entry');
        }
         // Validate datetime format more strictly if needed before creating Date object
        const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        if (isNaN(appointmentDateObj.getTime())) {
            req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
            console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
            return res.redirect(basePath + '/data-entry');
        }
        // --- End: Input Validation ---


        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor, ensure they belong to the session's hospital/site
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
        if (!doctor) {
             req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
             console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
             return res.redirect(basePath + '/data-entry');
        }
        // Prepare doctor name string safely
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

        // Format the datetime for display
        const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

        const additionalFields = {
            bupa_membership_number,
            member_type,
            city,
            primary_provider_name,
            primary_provider_code,
            secondary_provider_name,
            secondary_provider_code,
            secondary_doctors_name,
            contract_no,
            contract_name,
            policy_status,
            policy_end_date,
            primary_diagnosis,
            confirmed_pathway,
            care_navigator_name
        };

        // Fetch survey details and build appointment_tracker
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({
            specialty: speciality, hospital_code: hospital_code, site_code: site_code
        });
        const patient = await collection.findOne({ Mr_no });

            // Fix: Load existing appointment tracker
            let existingAppointmentTracker = patient?.appointment_tracker || {};
            let appointment_tracker = { ...existingAppointmentTracker };

            try {
                const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });

                if (specialitySurveys?.surveys?.length > 0) {

                    // Skip if this speciality already exists for the patient
                    if (!appointment_tracker[speciality]) {
                        let sortedSurveys = {};
                        specialitySurveys.surveys.forEach(survey => {
                            if (Array.isArray(survey.selected_months)) {
                                survey.selected_months.forEach(month => {
                                    if (!sortedSurveys[month]) sortedSurveys[month] = [];
                                    sortedSurveys[month].push(survey.survey_name);
                                });
                            }
                        });

                        let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                        let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
                        let firstAppointmentTime = new Date(appointmentDateObj);
                        let lastAppointmentTime = new Date(firstAppointmentTime);

                        appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                            let trackerAppointmentTime;

                            if (index === 0) {
                                trackerAppointmentTime = new Date(firstAppointmentTime);
                            } else {
                                let previousMonth = parseInt(sortedMonths[index - 1]);
                                let currentMonth = parseInt(month);
                                if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                                    let monthDifference = currentMonth - previousMonth;
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                    trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                                    lastAppointmentTime = new Date(trackerAppointmentTime);
                                } else {
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                }
                            }

                            const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);

                            const completed_in_appointment = {};
                            if (Array.isArray(sortedSurveys[month])) {
                                sortedSurveys[month].forEach(surveyName => {
                                    completed_in_appointment[surveyName] = false;
                                });
                            }

                            return {
                                month,
                                survey_name: sortedSurveys[month],
                                surveyType: surveyTypeLabels[index],
                                appointment_time: formattedTrackerTime,
                                surveyStatus: "Not Completed",
                                completed_in_appointment
                            };
                        });
                    } else {
                        console.log(`Specialty "${speciality}" already exists, skipping appointment_time update.`);
                    }
                }
            } catch (trackerError) {
                console.error(`Tracker Error Row ${rowNumber}:`, trackerError);
            }

        // Find existing patient data
        //const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

        // Fetch Notification Preference and Hospital Name
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
        console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        let updatedSurveyStatus = "Not Completed"; // Default for new or reset
        let isNewPatient = false;
        const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

        // --- Start: DB Upsert Logic ---
        if (patient) {
            // Existing Patient Update
             isNewPatient = false;
             
             console.log(`API Data: Patient ${Mr_no} found, updating.`);
             // Determine survey status
            const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
             updatedSurveyStatus = patient.surveyStatus;
             if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                 const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                 const isSpecialityChanged = patient.speciality !== speciality;
                 if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
             } else { updatedSurveyStatus = "Not Completed"; }

             // Update specialities array
             let updatedSpecialities = patient.specialities || [];
             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
             if (specialityIndex !== -1) {
                 updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
                 if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                     updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                 }
             } else {
                 updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
             }

             // Perform Update
             await collection.updateOne({ Mr_no }, {
                 $set: {
                     firstName, middleName, lastName, gender, DOB,
                     datetime: formattedDatetime, // Store formatted string
                     specialities: updatedSpecialities, // Store array with Date objects
                     speciality, phoneNumber, email,
                     hospital_code, site_code,additionalFields,
                     surveyStatus: updatedSurveyStatus,
                     appointment_tracker,
                 },
                 $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
             });

        } else {
            // New Patient Insert
             isNewPatient = true;
             console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
             updatedSurveyStatus = "Not Completed";
             await collection.insertOne({
                 Mr_no, firstName, middleName, lastName, gender, DOB,
                 datetime: formattedDatetime, // Store formatted string
                 specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
                 speciality, phoneNumber, email,
                 hospital_code, site_code,additionalFields,
                 surveyStatus: updatedSurveyStatus,
                 hashedMrNo, surveyLink,
                 appointment_tracker,
                 SurveySent: 0, // Initialize count
                 smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
             });
        }
        // --- End: DB Upsert Logic ---


        // ***** START: Conditional Notification Logic *****
        //  let finalMessage = 'Appointment created successfully'; // Base success message
        // With this dynamic version:
const userLang = req.cookies.lng || req.query.lng || 'en';

let finalMessage = userLang === 'ar' 
    ? 'تم إنشاء الموعد بنجاح' // Arabic success message
    : 'Appointment created successfully'; // English success message (default)

         if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
             console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
            //  finalMessage += ' Notifications skipped as per site preference.';
             // No SurveySent increment

            

         }  else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
             // --- Handle Third Party API Case ---
                        console.log(`[BupaIntegration /bupa/api/data] 'third_party_api' preference detected for National ID ${Mr_no}. Preparing to send to Bupa WhatsApp API.`);

            // 1. Construct the patient data payload for Bupa.
            //    The Bupa API's 'data' field expects an array of objects.
            //    Each object must contain fields as per Bupa's decrypted data specification. [cite: 16, 17]
            const patientDataForBupaApi = [{
                "National ID": Mr_no, // Assuming Mr_no from your form is the National ID
                "First Name": firstName,
                "Last Name": lastName,
                "Phone Number": phoneNumber,
                "Survey Link": surveyLink // Ensure this 'surveyLink' is correctly generated and accessible here
                // Add any other placeholder fields if your specific Bupa template requires them.
            }];

            // 2. Determine the Bupa WhatsApp Template Name.
            // This MUST be the exact name provided by the Bupa team. [cite: 6, 7, 14]
            const bupaTemplateName = "YOUR_BUPA_WHATSAPP_TEMPLATE_NAME_FOR_THIS_ROUTE"; // <--- IMPORTANT: Replace this placeholder

            if (!bupaTemplateName || bupaTemplateName === "YOUR_BUPA_WHATSAPP_TEMPLATE_NAME_FOR_THIS_ROUTE") {
                 console.warn(`[BupaIntegration /bupa/api/data] Bupa template name is not configured for National ID ${Mr_no}. Skipping Bupa send.`);
                 //finalMessage += ' Bupa WhatsApp not sent (template name missing).'; // Optional: Inform user
            } else {
                // 3. Prepare the final payload for the sendWhatsAppDataToBupaProvider function.
                let dataFieldPayload = JSON.stringify(patientDataForBupaApi);

                // OPTIONAL: Implement AES-256-GCM encryption for dataFieldPayload if required [cite: 18]
                // if (SHOULD_ENCRYPT_BUPA_PAYLOAD) { // This would be a configuration flag
                //     try {
                //         dataFieldPayload = await encryptBupaPayloadWithGCM(dataFieldPayload); // Your AES-256-GCM encryption function
                //     } catch (encryptionError) {
                //         console.error(`[BupaIntegration /bupa/api/data] Failed to encrypt payload for Bupa for National ID ${Mr_no}:`, encryptionError);
                //         // Decide: send unencrypted, or skip sending to Bupa for this record?
                //         // For now, we'll assume it would skip or be handled inside encryptBupaPayloadWithGCM
                //     }
                // }

                const payloadToSendToBupa = {
                    template: bupaTemplateName,
                    data: dataFieldPayload
                };

                // 4. Asynchronously send data to Bupa provider via the updated function
                sendWhatsAppDataToBupaProvider(payloadToSendToBupa)
                    .then(success => {
                        if (success) { // Assuming sendWhatsAppDataToBupaProvider returns true on successful queueing by Bupa
                            console.log(`[BupaIntegration /bupa/api/data] Data for National ID ${Mr_no} successfully queued with Bupa WhatsApp API.`);
                            // Optionally update your DB to log this specific Bupa API call success
                        } else {
                            console.error(`[BupaIntegration /bupa/api/data] Failed to queue data for National ID ${Mr_no} with Bupa WhatsApp API (send function indicated failure).`);
                        }
                    })
                    .catch(err => {
                        // This catch is for errors in the sendWhatsAppDataToBupaProvider call itself (e.g., network issues, token errors caught and rethrown)
                        console.error(`[BupaIntegration /bupa/api/data] Error calling sendWhatsAppDataToBupaProvider for National ID ${Mr_no}:`, err.message);
                    });
                
                //finalMessage += ' Attempted to send data to Bupa (check logs for status).'; // Update user message
            }

         } else if (notificationPreference) {
            // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
             console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
            //  finalMessage += ' Notifications attempted (check logs for status).';

             let smsMessage;
             let emailType = null;

             // Determine message content based on survey status
             if (updatedSurveyStatus === "Not Completed") {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                 emailType = 'appointmentConfirmation';
             } else {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                 console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
             }

             // --- Attempt to Send SMS ---
             if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
                 try {
                     const smsResult = await sendSMS(phoneNumber, smsMessage);
                     console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
             }

             // --- Attempt to Send Email ---
             if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
                 try {
                     await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                     console.log(`API Data: Email sent successfully for ${Mr_no}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
             }

             // --- Attempt to Send WhatsApp Template ---
             if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
                 try {
                     const accountSid = process.env.TWILIO_ACCOUNT_SID;
                     const authToken = process.env.TWILIO_AUTH_TOKEN;
                     if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                         const client = twilio(accountSid, authToken);
                         const placeholders = {
                              1: patientFullName, 2: doctorName, 3: formattedDatetime,
                              4: hospitalName, 5: hashedMrNo
                          };
                         let formattedPhoneNumber = phoneNumber;
                         if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

                         if (formattedPhoneNumber) {
                              const message = await client.messages.create({
                                  from: process.env.TWILIO_WHATSAPP_NUMBER,
                                  to: formattedPhoneNumber,
                                  contentSid: process.env.TWILIO_TEMPLATE_SID,
                                  contentVariables: JSON.stringify(placeholders),
                                  statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
                              });
                              console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                              await collection.updateOne({ Mr_no }, {
                                  $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
                                  $inc: { SurveySent: 1 }
                              });
                         } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
                     } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
                 } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
             }

         } else {
             // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
             console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
            //  finalMessage += ' Notifications not sent (preference not configured for sending).';
             // No SurveySent increment
         }
        // ***** END: Conditional Notification Logic *****

        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
      

        const timestamp = Date.now();
        const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

        const outputFilePath = path.join(uploadsDir, singleUploadFile);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Single Upload');

        sheet.columns = [
            { header: 'National ID', key: 'Mr_no', width: 15 },
            { header: 'First Name', key: 'firstName', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 18 },
            { header: 'Survey Link', key: 'surveyLink', width: 50 },
            //{ header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        sheet.addRow({
            Mr_no,
            firstName,
            lastName,
            phoneNumber,
            surveyLink,
            //notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
        });

        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = singleUploadFile;



        // --- Final Response ---
        req.flash('successMessage', finalMessage); // Use the dynamically set message
        res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

    } catch (error) {
        console.error('Error processing /api/data request:', error);
        const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
        writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
        req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
        res.redirect(basePath + '/data-entry'); // Redirect on error as well
    }
});

// function validateBupaFields(record) {
//     const errors = [];
    
//     // Validate BUPA Membership Number
//     if (record.bupaMembershipNumber && !/^\d{10}$/.test(record.bupaMembershipNumber)) {
//         errors.push('Invalid BUPA Membership Number (must be 10 digits)');
//     }
    
//     // Validate National ID
//     if (record.nationalId && !/^\d{10}$/.test(record.nationalId)) {
//         errors.push('Invalid National ID (must be 10 digits)');
//     }
    
//     // Validate Provider Codes
//     if (record.primaryProviderCode && !/^\d{5}$/.test(record.primaryProviderCode)) {
//         errors.push('Invalid Primary Provider Code (must be 5 digits)');
//     }
    
//     if (record.secondaryProviderCode && record.secondaryProviderCode !== '' && !/^\d{5}$/.test(record.secondaryProviderCode)) {
//         errors.push('Invalid Secondary Provider Code (must be 5 digits)');
//     }
    
//     // Validate Contract Number
//     if (record.contractNo && !/^\d{1,8}$/.test(record.contractNo)) {
//         errors.push('Invalid Contract Number (max 8 digits)');
//     }
    
//     // Validate Policy Status
//     if (record.policyStatus && !['Active', 'Terminated'].includes(record.policyStatus)) {
//         errors.push('Invalid Policy Status (must be Active or Terminated)');
//     }
    
//     // Validate Phone Number (10 digits starting with 0)
//     if (record.phoneNumber && !/^0\d{9}$/.test(record.phoneNumber)) {
//         errors.push('Invalid phone number (must be 10 digits starting with 0)');
//     }
    
//     // Validate text fields (alphabets only)
//     const textFields = ['memberType', 'city', 'primaryProviderName', 'secondaryProviderName', 'secondaryDoctorsName', 'contractName', 'primaryDiagnosis', 'confirmedPathway', 'careNavigatorName'];
    
//     textFields.forEach(field => {
//         if (record[field] && !/^[a-zA-Z\s]+$/.test(record[field])) {
//             errors.push(`Invalid ${field} (alphabets only)`);
//         }
//     });
    
//     return errors;
// }

// Check for cross-references in BUPA data
function validateBupaFields(record) {
    const errors = [];
    
    // Validate BUPA Membership Number
    if (record.bupaMembershipNumber && !/^\d{10}$/.test(record.bupaMembershipNumber)) {
        errors.push('Invalid BUPA Membership Number (must be 10 digits)');
    }
    
    // Validate National ID
    if (record.nationalId && !/^\d{10}$/.test(record.nationalId)) {
        errors.push('Invalid National ID (must be 10 digits)');
    }
    
    // Validate Provider Codes
    if (record.primaryProviderCode && !/^\d{5}$/.test(record.primaryProviderCode)) {
        errors.push('Invalid Primary Provider Code (must be 5 digits)');
    }
    
    if (record.secondaryProviderCode && record.secondaryProviderCode !== '' && !/^\d{5}$/.test(record.secondaryProviderCode)) {
        errors.push('Invalid Secondary Provider Code (must be 5 digits)');
    }
    
    // Validate Contract Number
    if (record.contractNo && !/^\d{1,8}$/.test(record.contractNo)) {
        errors.push('Invalid Contract Number (max 8 digits)');
    }
    
    // Validate Policy Status
    if (record.policyStatus && !['Active', 'Terminated'].includes(record.policyStatus)) {
        errors.push('Invalid Policy Status (must be Active or Terminated)');
    }
    
    // Validate Phone Number (10 digits starting with 0)
    if (record.phoneNumber && !/^0\d{9}$/.test(record.phoneNumber)) {
        errors.push('Invalid phone number (must be 10 digits starting with 0)');
    }
    
    // Validate text fields (alphabets only)
    const textFields = ['memberType', 'city', 'primaryProviderName', 'secondaryProviderName', 'secondaryDoctorsName', 'contractName', 'primary_diagnosis', 'confirmedPathway', 'careNavigatorName','firstName','lastName'];
    
    textFields.forEach(field => {
        if (record[field] && !/^[a-zA-Z\s]+$/.test(record[field])) {
            errors.push(`Invalid ${field} (alphabets only)`);
        }
    });
    
    return errors;
}

async function validateBupaCrossReferences(record, doctorsCache, existingPatients) {
    const errors = [];
    
    // Check for DOB mismatch with existing records
    const existingPatient = existingPatients.get(record.bupaMembershipNumber);
    if (record.DOB && existingPatient && existingPatient.DOB !== record.DOB) {
        errors.push('DOB mismatch with existing record');
    }
    
    return errors;
}

// BUPA specific business logic validation
function validateBupaBusinessLogic(record) {
    const errors = [];
    
    // Check if policy end date makes sense with status
    if (record.policyEndDate && record.policyStatus) {
        try {
            const endDate = new Date(record.policyEndDate);
            const currentDate = new Date();
            
            if (endDate < currentDate && record.policyStatus === 'Active') {
                errors.push('Policy shows Active but end date has passed');
            }
            
            if (endDate > currentDate && record.policyStatus === 'Terminated') {
                errors.push('Policy shows Terminated but end date is in future');
            }
        } catch (dateError) {
            errors.push('Invalid policy end date format');
        }
    }
    
    // Validate secondary provider fields consistency
    if (record.secondaryProviderCode && !record.secondaryProviderName) {
        errors.push('Secondary Provider Code provided without Secondary Provider Name');
    }
    
    if (record.secondaryProviderName && !record.secondaryProviderCode) {
        errors.push('Secondary Provider Name provided without Secondary Provider Code');
    }
    
    return errors;
}

// staffRouter.post('/bupa/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true";
//     const validateOnly = req.body.validate_only === "true";

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;

//     // Database Connections
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("BUPA Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }

//     // Use same collection as single entry
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // Session Data
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//         console.error("BUPA Upload Error: Missing hospital_code or site_code in session.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//         return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//     try {
//         // Initialization
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = [];

//         // Header Mapping for BUPA CSV to match single entry field names
//         const headerMapping = {
//             'National ID': 'Mr_no', //mandatory
//             'First Name': 'firstName', //mandatory
//             'Family Name': 'lastName', //mandatory
//             'Date of Birth (mm/dd/yyyy)': 'DOB', //mandatory 
//             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime', //mandatory
//             'Doctors Specialty': 'speciality', //mandatory
//             'Phone Number': 'phoneNumber', //mandatory
//             'Email(Optional)': 'email',
//             'Gender': 'gender', //mandatory
//             'BUPA Membership Number': 'bupa_membership_number', //mandatory
//             'Member Type': 'member_type', //mandatory
//             'City': 'city', //mandatory
//             'Primary Provider Name': 'primary_provider_name', //mandatory
//             'Primary Provider Code': 'primary_provider_code', //mandatory
//             'Secondary Provider Name': 'secondary_provider_name',
//             'Secondary Provider Code': 'secondary_provider_code',
//             'Secondary Doctors\' Name': 'secondary_doctors_name',
//             'Primary Doctor\'s Name':'doctorId', //mandatory
//             'Contract Number': 'contract_no', //mandatory
//             'Contract Name': 'contract_name', //mandatory
//             'Policy Status': 'policy_status', //mandatory
//             'Policy End Date': 'policy_end_date', //mandatory
//             'Primary Diagnosis': 'primary_diagnosis', //mandatory
//             'Confirmed Pathway': 'confirmed_pathway',
//             'Care Navigator Name': 'care_navigator_name'
//         };

//         // Validation patterns
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
//         const phoneRegex = /^0\d{9}$/; // 10 digits starting with 0
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         // const nationalIdRegex = /^\d{10}$/; Numeric  with a total length of exactly 10 characters
//         const nationalIdRegex = /^[A-Za-z0-9]{10}$/; // Aplha numeric  with a total length of exactly 10 characters
//         const bupaNumberRegex = /^\d{10}$/;
//         const providerCodeRegex = /^\d{5}$/;
//         const contractNoRegex = /^\d{1,8}$/;

//         // Read CSV Data
//         const csvData = await new Promise((resolve, reject) => {
//             const records = [];
//             fs.createReadStream(filePath)
//                 .pipe(csvParser({
//                     mapHeaders: ({ header }) => {
//                         return headerMapping[header] || header;
//                     },
//                     skipEmptyLines: true
//                 }))
//                 .on('data', (data) => records.push(data))
//                 .on('end', () => resolve(records))
//                 .on('error', reject);
//         });

//         console.log('Sample mapped record:', csvData[0]);

//         // Pre-fetch Doctors & Patients
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//         // Fetch Site Settings
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";

//         // Validation Loop
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             // Extract fields from record
//             const {
//                 Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                 speciality, doctorId, phoneNumber, email = '', gender = '',
//                 bupa_membership_number, member_type, city, primary_provider_name, primary_provider_code,
//                 secondary_provider_name = '', secondary_provider_code = '', secondary_doctors_name = '',
//                 contract_no, contract_name, policy_status, policy_end_date,
//                 primary_diagnosis, confirmed_pathway = '', care_navigator_name = ''
//             } = record;

//             console.log("record",record);

//             // Required fields validation
//             const requiredFields = [
//                 { field: 'Mr_no', value: Mr_no, display: 'National ID' },
//                 { field: 'firstName', value: firstName, display: 'First Name' },
//                 { field: 'lastName', value: lastName, display: 'Last Name' },
//                 { field: 'DOB', value: DOB, display: 'Date of Birth' },
//                 { field: 'datetime', value: datetime, display: 'Appointment Date & Time' },
//                 { field: 'speciality', value: speciality, display: 'Speciality' },
//                 { field: 'doctorId', value: doctorId, display: 'Doctor ID' },
//                 { field: 'phoneNumber', value: phoneNumber, display: 'Phone Number' },
//                 { field: 'gender', value: gender, display: 'Gender' },
//                 { field: 'bupa_membership_number', value: bupa_membership_number, display: 'BUPA Membership Number' },
//                 { field: 'member_type', value: member_type, display: 'Member Type' },
//                 { field: 'city', value: city, display: 'City' },
//                 { field: 'primary_provider_name', value: primary_provider_name, display: 'Primary Provider Name' },
//                 { field: 'primary_provider_code', value: primary_provider_code, display: 'Primary Provider Code' },
//                 { field: 'contract_no', value: contract_no, display: 'Contract Number' },
//                 { field: 'contract_name', value: contract_name, display: 'Contract Name' },
//                 { field: 'policy_status', value: policy_status, display: 'Policy Status' },
//                 { field: 'policy_end_date', value: policy_end_date, display: 'Policy End Date' },
//                 { field: 'primary_diagnosis', value: primary_diagnosis, display: 'Primary Diagnosis' }
//             ];

//             const missingFields = [];
//             requiredFields.forEach(({ field, value, display }) => {
//                 if (!value || value.toString().trim() === '') {
//                     missingFields.push(display);
//                 }
//             });

//             if (missingFields.length > 0) {
//                 validationErrors.push(`Missing: ${missingFields.join(', ')}`);
//             }

//             // Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female'].includes(gender)) validationErrors.push('Invalid gender value (must be Male or Female)');
//             // if (phoneNumber && !phoneRegex.test(phoneNumber)) validationErrors.push('Invalid phone number format (must be 10 digits starting with 0)');
//             if (email && !emailRegex.test(email)) validationErrors.push('Invalid email format');
//             if (bupa_membership_number && !bupaNumberRegex.test(bupa_membership_number)) validationErrors.push('Invalid BUPA Membership Number format (must be 10 digits)');
//             if (Mr_no && !nationalIdRegex.test(Mr_no)) validationErrors.push('Invalid National ID format');
//             if (primary_provider_code && !providerCodeRegex.test(primary_provider_code)) validationErrors.push('Invalid Primary Provider Code format (must be 5 digits)');
//             if (secondary_provider_code && secondary_provider_code !== '' && !providerCodeRegex.test(secondary_provider_code)) validationErrors.push('Invalid Secondary Provider Code format (must be 5 digits)');
//             if (contract_no && !contractNoRegex.test(contract_no)) validationErrors.push('Invalid Contract Number format (max 8 digits)');
//             if (member_type && !/^[a-zA-Z\s]+$/.test(member_type)) validationErrors.push('Invalid Member Type (text only)');
//             if (policy_status && !['Active', 'Terminated'].includes(policy_status)) validationErrors.push('Invalid Policy Status (must be Active or Terminated)');

//             // Modular validation calls
//             validationErrors.push(...validateBupaFields(record));
//             validationErrors.push(...await validateBupaCrossReferences(record, doctorsCache, existingPatients));
//             validationErrors.push(...validateBupaBusinessLogic(record));


//             // Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch with existing record');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                 validationErrors.push(`Specialty not found`);
//             }

//             // Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                 try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                     if (isNaN(tempDate.getTime())) {
//                         validationErrors.push('Invalid datetime value');
//                     } else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
                        
//                         const exactDuplicateCheck = await patientDB.findOne({
//                             Mr_no,
//                             "specialities": {
//                                 $elemMatch: {
//                                     name: speciality,
//                                     timestamp: formattedDatetimeStr,
//                                     doctor_ids: doctorId
//                                 }
//                             }
//                         });
                        
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true;
//                             validationErrors.push('Appointment already exists');
//                         }
//                     }
//                 } catch (dateError) {
//                     console.error(`Date Check Error Row ${rowNumber}:`, dateError);
//                     validationErrors.push('Error processing datetime');
//                 }
//             }

//             // Categorize Errors OR Store Valid Row
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } }
//                 else invalidEntries.push(validationRow);
//             } else {
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         }

//         // Handle validateOnly or skip flags
//         if (validateOnly || skip) {
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed",
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidEntries: invalidEntries
//                 }
//             });
//         }

//         // Process Valid Records (same logic as single entry)
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
            
//             const existingPatient = existingPatients.get(record.Mr_no);
//             const doctor = doctorsCache.get(record.doctorId);

//             // Data Processing Logic
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(record.Mr_no.toString());
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//             const patientFullName = `${record.firstName} ${record.lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build additionalFields (BUPA specific data)
//             const additionalFields = {
//                 bupa_membership_number: record.bupa_membership_number,
//                 member_type: record.member_type,
//                 city: record.city,
//                 primary_provider_name: record.primary_provider_name,
//                 primary_provider_code: record.primary_provider_code,
//                 secondary_provider_name: record.secondary_provider_name || '',
//                 secondary_provider_code: record.secondary_provider_code || '',
//                 secondary_doctors_name: record.secondary_doctors_name || '',
//                 contract_no: record.contract_no,
//                 contract_name: record.contract_name,
//                 policy_status: record.policy_status,
//                 policy_end_date: record.policy_end_date,
//                 primary_diagnosis: record.primary_diagnosis,
//                 confirmed_pathway: record.confirmed_pathway || '',
//                 care_navigator_name: record.care_navigator_name || ''
//             };

//             // Build Appointment Tracker (same logic as single entry)
//             let appointment_tracker = {};
//             try {
//                 const specialitySurveys = await surveysCollection.findOne({
//                     specialty: record.speciality, hospital_code: hospital_code, site_code: site_code
//                 });
//                 if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//                     let sortedSurveys = {};
//                     specialitySurveys.surveys.forEach(survey => {
//                         if (Array.isArray(survey.selected_months)) {
//                             survey.selected_months.forEach(month => {
//                                 if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                                 sortedSurveys[month].push(survey.survey_name);
//                             });
//                         }
//                     });
//                     let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                     let surveyTypeLabels = ["Baseline"];
//                     for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//                     let firstAppointmentTime = new Date(appointmentDateObj);
//                     let lastAppointmentTime = new Date(firstAppointmentTime);

//                     appointment_tracker[record.speciality] = sortedMonths.map((month, index) => {
//                         let appointmentTime;
//                         if (index === 0) {
//                             appointmentTime = new Date(firstAppointmentTime);
//                         } else {
//                             let previousMonth = parseInt(sortedMonths[index - 1]);
//                             let currentMonth = parseInt(month);
//                             if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                                 let monthDifference = currentMonth - previousMonth;
//                                 appointmentTime = new Date(lastAppointmentTime);
//                                 appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                                 lastAppointmentTime = new Date(appointmentTime);
//                             } else {
//                                 appointmentTime = new Date(lastAppointmentTime);
//                             }
//                         }
//                         const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//                         return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//                     });
//                 }
//             } catch (trackerError) {
//                 console.error(`BUPA Tracker Error Row ${rowNumber}:`, trackerError);
//             }

//             // Database Operation (same structure as single entry)
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     const lastAppointmentDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus;
//                     if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                         const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                         const isSpecialityChanged = existingPatient.speciality !== record.speciality;
//                         if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//                     } else { updatedSurveyStatus = "Not Completed"; }

//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specialityIndex = updatedSpecialities.findIndex(s => s.name === record.speciality);
//                     if (specialityIndex !== -1) {
//                         updatedSpecialities[specialityIndex].timestamp = formattedDatetimeStr;
//                         if (!updatedSpecialities[specialityIndex].doctor_ids.includes(record.doctorId)) {
//                             updatedSpecialities[specialityIndex].doctor_ids.push(record.doctorId);
//                         }
//                     } else {
//                         updatedSpecialities.push({ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] });
//                     }

//                     await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                         $set: {
//                             firstName: record.firstName,
//                             middleName: record.middleName,
//                             lastName: record.lastName,
//                             gender: record.gender,
//                             DOB: record.DOB,
//                             datetime: formattedDatetimeStr,
//                             specialities: updatedSpecialities,
//                             speciality: record.speciality,
//                             phoneNumber: record.phoneNumber,
//                             email: record.email,
//                             hospital_code,
//                             site_code,
//                             additionalFields,
//                             surveyStatus: updatedSurveyStatus,
//                             appointment_tracker,
//                         },
//                         $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//                     });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality: record.speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     const newRecord = {
//                         Mr_no: record.Mr_no,
//                         firstName: record.firstName,
//                         middleName: record.middleName || '',
//                         lastName: record.lastName,
//                         gender: record.gender,
//                         DOB: record.DOB,
//                         datetime: formattedDatetimeStr,
//                         specialities: [{ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] }],
//                         speciality: record.speciality,
//                         phoneNumber: record.phoneNumber,
//                         email: record.email || '',
//                         hospital_code,
//                         site_code,
//                         additionalFields,
//                         surveyStatus: updatedSurveyStatus,
//                         hashedMrNo,
//                         surveyLink,
//                         appointment_tracker,
//                         SurveySent: 0,
//                         smsLogs: [],
//                         emailLogs: [],
//                         whatsappLogs: []
//                     };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`BUPA CSV Upload (Process): DB ${operationType} success for ${record.Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                 console.error(`BUPA CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (BUPA#: ${record.Mr_no}):`, err);
//                 invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                 continue;
//             }

//             // Conditional Notification Logic (same as single entry)
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') {
//                     console.log(`BUPA Upload: Notifications skipped for ${record.Mr_no} due to site preference: 'none'.`);
//                 } else if (prefLower === 'third_party_api') {
//                     console.log(`BUPA Upload: Notification preference 'third_party_api' detected for ${record.Mr_no}. Logging placeholders only.`);
//                     const placeholders = {
//                         patientMrNo: record.Mr_no,
//                         patientFullName: patientFullName,
//                         doctorFullName: doctorName,
//                         appointmentDatetime: formattedDatetimeStr,
//                         hospitalName: hospitalName,
//                         hashedMrNo: hashedMrNo,
//                         surveyLink: surveyLink,
//                         speciality: record.speciality
//                     };
//                     console.log("--- Third-Party API Placeholders ---");
//                     console.log(JSON.stringify(placeholders, null, 2));
//                     console.log("--- End Placeholders ---");
//                 } else if (notificationPreference) {
//                     console.log(`BUPA Upload: Notifications enabled (${notificationPreference}) for ${record.Mr_no}. Preparing to send.`);

//                     let smsMessage;
//                     let emailType = null;

//                     if (updatedSurveyStatus === "Not Completed") {
//                         smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else {
//                         smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // Send SMS
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try {
//                             const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage);
//                             console.log(`BUPA Upload: SMS sent successfully for ${record.Mr_no}, SID: ${smsResult.sid}`);
//                             await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                 $push: { smsLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: smsResult.sid } },
//                                 $inc: { SurveySent: 1 }
//                             });
//                             notificationSent = true;
//                         } catch (smsError) {
//                             console.error(`BUPA Upload: Error sending SMS for ${record.Mr_no}:`, smsError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }

//                     // Send Email
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                         try {
//                             await sendEmail(recordDataForNotification.email, emailType, record.speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName);
//                             console.log(`BUPA Upload: Email sent successfully for ${record.Mr_no}`);
//                             await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                 $push: { emailLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date() } },
//                                 $inc: { SurveySent: 1 }
//                             });
//                             notificationSent = true;
//                         } catch (emailError) {
//                             console.error(`BUPA Upload: Error sending Email for ${record.Mr_no}:`, emailError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }

//                     // Send WhatsApp Template
//                     if (prefLower === 'whatsapp' || prefLower === 'both') {
//                         try {
//                             const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                             const authToken = process.env.TWILIO_AUTH_TOKEN;
//                             if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                                 const client = twilio(accountSid, authToken);
//                                 const placeholders = {
//                                     1: patientFullName, 2: doctorName, 3: formattedDatetimeStr,
//                                     4: hospitalName, 5: hashedMrNo
//                                 };
//                                 let formattedPhoneNumber = recordDataForNotification.phoneNumber;
//                                 if (recordDataForNotification.phoneNumber && !recordDataForNotification.phoneNumber.startsWith('whatsapp:'))
//                                     formattedPhoneNumber = `whatsapp:${recordDataForNotification.phoneNumber}`;

//                                 if (formattedPhoneNumber) {
//                                     const message = await client.messages.create({
//                                         from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                         to: formattedPhoneNumber,
//                                         contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                         contentVariables: JSON.stringify(placeholders),
//                                         statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
//                                     });
//                                     console.log(`BUPA Upload: Template WhatsApp message sent for ${record.Mr_no}, SID: ${message.sid}`);
//                                     await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                         $push: { whatsappLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: message.sid } },
//                                         $inc: { SurveySent: 1 }
//                                     });
//                                     notificationSent = true;
//                                 } else {
//                                     console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no}: Invalid phone format.`);
//                                 }
//                             } else {
//                                 console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no} due to missing Twilio config.`);
//                             }
//                         } catch (twilioError) {
//                             console.error(`BUPA Upload: Error sending Twilio WhatsApp template for ${record.Mr_no}:`, twilioError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }
//                 } else {
//                     console.log(`BUPA Upload: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${record.Mr_no}.`);
//                 }

//                 // Track Final Status
//                 if (notificationErrorOccurred) {
//                     recordsWithNotificationErrors.push({ rowNumber, Mr_no: record.Mr_no, operationType, error: "Notification failed" });
//                 } else {
//                     successfullyProcessed.push({ rowNumber, Mr_no: record.Mr_no, operationType, notificationSent });
//                 }
//             }
//         }

//         // Final Response
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

//         // Calculate totals
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues;
//         const totalRecords = csvData.length;
        
//         const responseMessage = `BUPA Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         // Create Excel output
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
//         const outputFileName = `bupa_batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed BUPA Patients');

//         // Define headers for BUPA
//         sheet.columns = [
//             { header: 'Row #', key: 'rowNumber', width: 10 },
//             { header: 'National ID', key: 'Mr_no', width: 20 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//             const patient = csvData[row.rowNumber - 2]; // original CSV record
//             sheet.addRow({
//                 rowNumber: row.rowNumber,
//                 Mr_no: row.Mr_no,
//                 firstName: patient.firstName,
//                 lastName: patient.lastName,
//                 phoneNumber: patient.phoneNumber,
//                 surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//                 operationType: row.operationType,
//                 notificationSent: row.notificationSent ? 'Yes' : 'No',
//             });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,
//             skippedRecords: skippedRecords,
//             totalRecords: totalRecords,
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/bupa/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidEntries: invalidEntries
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Error processing BUPA CSV upload:", error);
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error:", err));
//         return res.status(500).json({
//             success: false,
//             error: "Error processing BUPA CSV upload.",
//             details: error.message
//         });
//     }
// });

function isValidProvider(name, code, providers) {
    return providers.some(provider => 
        String(provider.primary_provider_name || '').trim() === String(name || '').trim() &&
        String(provider.primary_provider_code || '').trim() === String(code || '').trim()
    );
}

//survey continuity
// staffRouter.post('/bupa/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     // Flags from request body
//     const skip = req.body.skip === "true";
//     const validateOnly = req.body.validate_only === "true";

//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;
//     const originalFilename = req.file.originalname; // Original name of the uploaded file


//         // --- Define Storage Paths ---
//     const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
//     const successfulDir = path.join(batchUploadStorageDir, 'successful');
//     const failedDir = path.join(batchUploadStorageDir, 'failed');
//     // --- End Storage Paths ---

//     // --- Database Connections (Ensure these are correctly passed via req) ---
//     // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
//     if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
//         console.error("BUPA Upload Error: Database connections not found on request object.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
//         return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
//     }

//     // Use same collection as single entry
//     const patientDB = req.dataEntryDB.collection("patient_data");
//     const docDBCollection = req.manageDoctorsDB.collection("doctors");
//     const surveysCollection = req.manageDoctorsDB.collection("surveys");
//     const hospitalsCollection = req.adminUserDB.collection("hospitals");

//     // Session Data
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     if (!hospital_code || !site_code) {
//         console.error("BUPA Upload Error: Missing hospital_code or site_code in session.");
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
//         return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
//     }

//         // --- Declare variables outside try for catch block access ---
//     let targetDirForFile = failedDir; // Default to failed, change on success
//     let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name

//     try {
//         // Initialization
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const successfullyProcessed = [];
//         const recordsWithNotificationErrors = [];
//         const doctorsCache = new Map();
//         const validationPassedRows = [];

//         // Header Mapping for BUPA CSV to match single entry field names
//         const headerMapping = {
//             'National ID': 'Mr_no', //mandatory
//             'First Name': 'firstName', //mandatory
//             'Family Name': 'lastName', //mandatory
//             'Date of Birth (mm/dd/yyyy)': 'DOB', //mandatory 
//             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime', //mandatory
//             'Doctors Specialty': 'speciality', //mandatory
//             'Phone Number': 'phoneNumber', //mandatory
//             'Email(Optional)': 'email',
//             'Gender': 'gender', //mandatory
//             'BUPA Membership Number': 'bupa_membership_number', //mandatory
//             'Member Type': 'member_type', //mandatory
//             'City': 'city', //mandatory
//             'Primary Provider Name': 'primary_provider_name', //mandatory
//             'Primary Provider Code': 'primary_provider_code', //mandatory
//             'Secondary Provider Name': 'secondary_provider_name',
//             'Secondary Provider Code': 'secondary_provider_code',
//             'Secondary Doctors\' Name': 'secondary_doctors_name',
//             'Primary Doctor\'s Name':'doctorId', //mandatory
//             'Contract Number': 'contract_no', //mandatory
//             'Contract Name': 'contract_name', //mandatory
//             'Policy Status': 'policy_status', //mandatory
//             'Policy End Date': 'policy_end_date', //mandatory
//             'Primary Diagnosis': 'primary_diagnosis', //mandatory
//             'Confirmed Pathway': 'confirmed_pathway',
//             'Care Navigator Name': 'care_navigator_name'
//         };

//         // Validation patterns
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
//         const phoneRegex = /^0\d{9}$/; // 10 digits starting with 0
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         // const nationalIdRegex = /^\d{10}$/; Numeric  with a total length of exactly 10 characters
//         const nationalIdRegex = /^[A-Za-z0-9]{10}$/; // Aplha numeric  with a total length of exactly 10 characters
//         const bupaNumberRegex = /^\d{10}$/;
//         const providerCodeRegex = /^\d{5}$/;
//         const contractNoRegex = /^\d{1,8}$/;

//         // Read CSV Data
//         const csvData = await new Promise((resolve, reject) => {
//             const records = [];
//             fs.createReadStream(filePath)
//                 .pipe(csvParser({
//                     mapHeaders: ({ header }) => {
//                         return headerMapping[header] || header;
//                     },
//                     skipEmptyLines: true
//                 }))
//                 .on('data', (data) => records.push(data))
//                 .on('end', () => resolve(records))
//                 .on('error', reject);
//         });

//         console.log('Sample mapped record:', csvData[0]);

//         // Pre-fetch Doctors & Patients
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
//         const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

//         // Fetch Site Settings
//         const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const hospitalName = siteSettings?.hospital_name || "Your Clinic";

//         // Validation Loop
//         for (const [index, record] of csvData.entries()) {
//             const rowNumber = index + 2;
//             const validationErrors = [];

//             // Extract fields from record
//             const {
//                 Mr_no, firstName, middleName = '', lastName, DOB, datetime,
//                 speciality, doctorId, phoneNumber, email = '', gender = '',
//                 bupa_membership_number, member_type, city, primary_provider_name, primary_provider_code,
//                 secondary_provider_name = '', secondary_provider_code = '', secondary_doctors_name = '',
//                 contract_no, contract_name, policy_status, policy_end_date,
//                 primary_diagnosis, confirmed_pathway = '', care_navigator_name = ''
//             } = record;

//             console.log("record",record);

//             // Required fields validation
//             const requiredFields = [
//                 { field: 'Mr_no', value: Mr_no, display: 'National ID' },
//                 { field: 'firstName', value: firstName, display: 'First Name' },
//                 { field: 'lastName', value: lastName, display: 'Last Name' },
//                 { field: 'DOB', value: DOB, display: 'Date of Birth' },
//                 { field: 'datetime', value: datetime, display: 'Appointment Date & Time' },
//                 { field: 'speciality', value: speciality, display: 'Speciality' },
//                 { field: 'doctorId', value: doctorId, display: 'Doctor ID' },
//                 { field: 'phoneNumber', value: phoneNumber, display: 'Phone Number' },
//                 { field: 'gender', value: gender, display: 'Gender' },
//                 { field: 'bupa_membership_number', value: bupa_membership_number, display: 'BUPA Membership Number' },
//                 { field: 'member_type', value: member_type, display: 'Member Type' },
//                 { field: 'city', value: city, display: 'City' },
//                 { field: 'primary_provider_name', value: primary_provider_name, display: 'Primary Provider Name' },
//                 { field: 'primary_provider_code', value: primary_provider_code, display: 'Primary Provider Code' },
//                 { field: 'contract_no', value: contract_no, display: 'Contract Number' },
//                 { field: 'contract_name', value: contract_name, display: 'Contract Name' },
//                 { field: 'policy_status', value: policy_status, display: 'Policy Status' },
//                 { field: 'policy_end_date', value: policy_end_date, display: 'Policy End Date' },
//                 { field: 'primary_diagnosis', value: primary_diagnosis, display: 'Primary Diagnosis' }
//             ];

//             const missingFields = [];
//             requiredFields.forEach(({ field, value, display }) => {
//                 if (!value || value.toString().trim() === '') {
//                     missingFields.push(display);
//                 }
//             });

//             if (missingFields.length > 0) {
//                 validationErrors.push(`Missing: ${missingFields.join(', ')}`);
//             }

//             // Format Validation
//             if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
//             if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
//             if (gender && !['Male', 'Female'].includes(gender)) validationErrors.push('Invalid gender value (must be Male or Female)');
//             // if (phoneNumber && !phoneRegex.test(phoneNumber)) validationErrors.push('Invalid phone number format (must be 10 digits starting with 0)');
//             if (email && !emailRegex.test(email)) validationErrors.push('Invalid email format');
//             if (bupa_membership_number && !bupaNumberRegex.test(bupa_membership_number)) validationErrors.push('Invalid BUPA Membership Number format (must be 10 digits)');
//             if (Mr_no && !nationalIdRegex.test(Mr_no)) validationErrors.push('Invalid National ID format');
//             if (primary_provider_code && !providerCodeRegex.test(primary_provider_code)) validationErrors.push('Invalid Primary Provider Code format (must be 5 digits)');
//             if (secondary_provider_code && secondary_provider_code !== '' && !providerCodeRegex.test(secondary_provider_code)) validationErrors.push('Invalid Secondary Provider Code format (must be 5 digits)');
//             if (contract_no && !contractNoRegex.test(contract_no)) validationErrors.push('Invalid Contract Number format (max 8 digits)');
//             if (member_type && !/^[a-zA-Z\s]+$/.test(member_type)) validationErrors.push('Invalid Member Type (text only)');
//             if (policy_status && !['Active', 'Terminated'].includes(policy_status)) validationErrors.push('Invalid Policy Status (must be Active or Terminated)');

//             // Modular validation calls
//             validationErrors.push(...validateBupaFields(record));
//             validationErrors.push(...await validateBupaCrossReferences(record, doctorsCache, existingPatients));
//             validationErrors.push(...validateBupaBusinessLogic(record));


//             // Cross-Reference Validation
//             const existingPatient = existingPatients.get(Mr_no);
//             if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch with existing record');

//             const doctor = doctorsCache.get(doctorId);
//             if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
//             if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
//                 validationErrors.push(`Specialty not found`);
//             }

//             // Duplicate Appointment Check
//             let appointmentDateObj = null;
//             let formattedDatetimeStr = datetime;
//             let isDuplicate = false;
//             if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
//                 try {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const tempDate = new Date(correctedDatetime);
//                     if (isNaN(tempDate.getTime())) {
//                         validationErrors.push('Invalid datetime value');
//                     } else {
//                         appointmentDateObj = tempDate;
//                         formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
                        
//                         const exactDuplicateCheck = await patientDB.findOne({
//                             Mr_no,
//                             "specialities": {
//                                 $elemMatch: {
//                                     name: speciality,
//                                     timestamp: formattedDatetimeStr,
//                                     doctor_ids: doctorId
//                                 }
//                             }
//                         });
                        
//                         if (exactDuplicateCheck) {
//                             isDuplicate = true;
//                             validationErrors.push('Appointment already exists');
//                         }
//                     }
//                 } catch (dateError) {
//                     console.error(`Date Check Error Row ${rowNumber}:`, dateError);
//                     validationErrors.push('Error processing datetime');
//                 }
//             }

//             // Categorize Errors OR Store Valid Row
//             if (validationErrors.length > 0) {
//                 const validationRow = { rowNumber, ...record, validationErrors };
//                 if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
//                 else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
//                 else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } }
//                 else invalidEntries.push(validationRow);
//             } else {
//                 validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
//             }
//         }

//         // Handle validateOnly or skip flags
//         if (validateOnly || skip) {
//                  targetDirForFile = successfulDir; // Mark as successful for file moving
//             finalFileName = `validation_${Date.now()}_${originalFilename}`;
//             const validationDestPath = path.join(targetDirForFile, finalFileName);
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed",
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidEntries: invalidEntries
//                 }
//             });
//         }

//         // Process Valid Records (same logic as single entry)
//         for (const validRow of validationPassedRows) {
//             const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
            
//             const existingPatient = existingPatients.get(record.Mr_no);
//             const doctor = doctorsCache.get(record.doctorId);

//             // Data Processing Logic
//             const currentTimestamp = new Date();
//             const hashedMrNo = hashMrNo(record.Mr_no.toString());
//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//             const patientFullName = `${record.firstName} ${record.lastName}`.trim();
//             const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

//             let updatedSurveyStatus = "Not Completed";
//             let isNewPatient = !existingPatient;

//             // Build additionalFields (BUPA specific data)
//             const additionalFields = {
//                 bupa_membership_number: record.bupa_membership_number,
//                 member_type: record.member_type,
//                 city: record.city,
//                 primary_provider_name: record.primary_provider_name,
//                 primary_provider_code: record.primary_provider_code,
//                 secondary_provider_name: record.secondary_provider_name || '',
//                 secondary_provider_code: record.secondary_provider_code || '',
//                 secondary_doctors_name: record.secondary_doctors_name || '',
//                 contract_no: record.contract_no,
//                 contract_name: record.contract_name,
//                 policy_status: record.policy_status,
//                 policy_end_date: record.policy_end_date,
//                 primary_diagnosis: record.primary_diagnosis,
//                 confirmed_pathway: record.confirmed_pathway || '',
//                 care_navigator_name: record.care_navigator_name || ''
//             };

//             // Build Appointment Tracker (same logic as single entry)
//             // let appointment_tracker = {};
//             // try {
//             //     const specialitySurveys = await surveysCollection.findOne({
//             //         specialty: record.speciality, hospital_code: hospital_code, site_code: site_code
//             //     });
//             //     if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//             //         let sortedSurveys = {};
//             //         specialitySurveys.surveys.forEach(survey => {
//             //             if (Array.isArray(survey.selected_months)) {
//             //                 survey.selected_months.forEach(month => {
//             //                     if (!sortedSurveys[month]) sortedSurveys[month] = [];
//             //                     sortedSurveys[month].push(survey.survey_name);
//             //                 });
//             //             }
//             //         });
//             //         let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//             //         let surveyTypeLabels = ["Baseline"];
//             //         for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

//             //         let firstAppointmentTime = new Date(appointmentDateObj);
//             //         let lastAppointmentTime = new Date(firstAppointmentTime);

//             //         appointment_tracker[record.speciality] = sortedMonths.map((month, index) => {
//             //             let appointmentTime;
//             //             if (index === 0) {
//             //                 appointmentTime = new Date(firstAppointmentTime);
//             //             } else {
//             //                 let previousMonth = parseInt(sortedMonths[index - 1]);
//             //                 let currentMonth = parseInt(month);
//             //                 if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//             //                     let monthDifference = currentMonth - previousMonth;
//             //                     appointmentTime = new Date(lastAppointmentTime);
//             //                     appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//             //                     lastAppointmentTime = new Date(appointmentTime);
//             //                 } else {
//             //                     appointmentTime = new Date(lastAppointmentTime);
//             //                 }
//             //             }
//             //             const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
//             //             // return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
//             //               // Create the completed_in_appointment object
//             //                 const completed_in_appointment = {};
//             //                 if (Array.isArray(sortedSurveys[month])) {
//             //                     sortedSurveys[month].forEach(surveyName => {
//             //                         completed_in_appointment[surveyName] = false;
//             //                     });
//             //                 }

//             //                 return {
//             //                     month,
//             //                     survey_name: sortedSurveys[month],
//             //                     surveyType: surveyTypeLabels[index],
//             //                     appointment_time: formattedTrackerTime,
//             //                     surveyStatus: "Not Completed",
//             //                     completed_in_appointment // Add the new object here
//             //                 };
//             //         });
//             //     }
//             // } catch (trackerError) {
//             //     console.error(`BUPA Tracker Error Row ${rowNumber}:`, trackerError);
//             // }


//             // Enhanced Appointment Tracker with Completion Status
// // Replace the existing appointment tracker section in your BUPA route with this code

// // Build Appointment Tracker
// let appointment_tracker = {};
// try {
//     const specialitySurveys = await surveysCollection.findOne({
//         specialty: record.speciality, 
//         hospital_code: hospital_code, 
//         site_code: site_code
//     });
    
//     if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
//         let sortedSurveys = {};
        
//         // Group surveys by months
//         specialitySurveys.surveys.forEach(survey => {
//             if (Array.isArray(survey.selected_months)) {
//                 survey.selected_months.forEach(month => {
//                     if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                     sortedSurveys[month].push(survey.survey_name);
//                 });
//             }
//         });
        
//         // Sort months numerically
//         let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
        
//         // Create survey type labels
//         let surveyTypeLabels = ["Baseline"];
//         for (let i = 1; i < sortedMonths.length; i++) {
//             surveyTypeLabels.push(`Followup - ${i}`);
//         }

//         let firstAppointmentTime = new Date(appointmentDateObj);
//         let lastAppointmentTime = new Date(firstAppointmentTime);

//         // Build enhanced tracker with completion status
//         appointment_tracker[record.speciality] = sortedMonths.map((month, index) => {
//             let appointmentTime;
            
//             if (index === 0) {
//                 appointmentTime = new Date(firstAppointmentTime);
//             } else {
//                 let previousMonth = parseInt(sortedMonths[index - 1]);
//                 let currentMonth = parseInt(month);
                
//                 if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                     let monthDifference = currentMonth - previousMonth;
//                     appointmentTime = new Date(lastAppointmentTime);
//                     appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                     lastAppointmentTime = new Date(appointmentTime);
//                 } else {
//                     appointmentTime = new Date(lastAppointmentTime);
//                 }
//             }
            
//             const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? 
//                 formatTo12Hour(appointmentTime) : "Invalid Date";

//             // Create the completed_in_appointment object for tracking individual survey completion
//             const completed_in_appointment = {};
//             if (Array.isArray(sortedSurveys[month])) {
//                 sortedSurveys[month].forEach(surveyName => {
//                     completed_in_appointment[surveyName] = false; // Initialize as not completed
//                 });
//             }

//             return {
//                 month,
//                 survey_name: sortedSurveys[month],
//                 surveyType: surveyTypeLabels[index],
//                 appointment_time: formattedAppointmentTime,
//                 surveyStatus: "Not Completed",
//                 completed_in_appointment // Enhanced feature for tracking individual survey completion
//             };
//         });
//     }
// } catch (trackerError) {
//     console.error(`BUPA Tracker Error Row ${rowNumber}:`, trackerError);
// }
//             // Database Operation (same structure as single entry)
//             let operationType = '';
//             let notificationSent = false;
//             let recordDataForNotification = null;

//             try {
//                 if (existingPatient) {
//                     operationType = 'update';
//                     const lastAppointmentDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//                     updatedSurveyStatus = existingPatient.surveyStatus;
//                     if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//                         const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//                         const isSpecialityChanged = existingPatient.speciality !== record.speciality;
//                         if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//                     } else { updatedSurveyStatus = "Not Completed"; }

//                     let updatedSpecialities = existingPatient.specialities || [];
//                     const specialityIndex = updatedSpecialities.findIndex(s => s.name === record.speciality);
//                     if (specialityIndex !== -1) {
//                         updatedSpecialities[specialityIndex].timestamp = formattedDatetimeStr;
//                         if (!updatedSpecialities[specialityIndex].doctor_ids.includes(record.doctorId)) {
//                             updatedSpecialities[specialityIndex].doctor_ids.push(record.doctorId);
//                         }
//                     } else {
//                         updatedSpecialities.push({ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] });
//                     }

//                     await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                         $set: {
//                             firstName: record.firstName,
//                             middleName: record.middleName,
//                             lastName: record.lastName,
//                             gender: record.gender,
//                             DOB: record.DOB,
//                             datetime: formattedDatetimeStr,
//                             specialities: updatedSpecialities,
//                             speciality: record.speciality,
//                             phoneNumber: record.phoneNumber,
//                             email: record.email,
//                             hospital_code,
//                             site_code,
//                             additionalFields,
//                             surveyStatus: updatedSurveyStatus,
//                             appointment_tracker,
//                         },
//                         $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
//                     });
//                     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality: record.speciality, datetime: formattedDatetimeStr, appointment_tracker };
//                 } else {
//                     operationType = 'insert';
//                     updatedSurveyStatus = "Not Completed";
//                     const newRecord = {
//                         Mr_no: record.Mr_no,
//                         firstName: record.firstName,
//                         middleName: record.middleName || '',
//                         lastName: record.lastName,
//                         gender: record.gender,
//                         DOB: record.DOB,
//                         datetime: formattedDatetimeStr,
//                         specialities: [{ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] }],
//                         speciality: record.speciality,
//                         phoneNumber: record.phoneNumber,
//                         email: record.email || '',
//                         hospital_code,
//                         site_code,
//                         additionalFields,
//                         surveyStatus: updatedSurveyStatus,
//                         hashedMrNo,
//                         surveyLink,
//                         appointment_tracker,
//                         SurveySent: 0,
//                         smsLogs: [],
//                         emailLogs: [],
//                         whatsappLogs: []
//                     };
//                     await patientDB.insertOne(newRecord);
//                     recordDataForNotification = newRecord;
//                 }
//                 console.log(`BUPA CSV Upload (Process): DB ${operationType} success for ${record.Mr_no} (Row ${rowNumber})`);
//             } catch (err) {
//                 console.error(`BUPA CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (BUPA#: ${record.Mr_no}):`, err);
//                 invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
//                 continue;
//             }

//             // Conditional Notification Logic (same as single entry)
//             if (recordDataForNotification) {
//                 let notificationErrorOccurred = false;
//                 const prefLower = notificationPreference?.toLowerCase();

//                 if (prefLower === 'none') {
//                     console.log(`BUPA Upload: Notifications skipped for ${record.Mr_no} due to site preference: 'none'.`);
//                 } else if (prefLower === 'third_party_api') {
//                     console.log(`BUPA Upload: Notification preference 'third_party_api' detected for ${record.Mr_no}. Logging placeholders only.`);
//                     const placeholders = {
//                         patientMrNo: record.Mr_no,
//                         patientFullName: patientFullName,
//                         doctorFullName: doctorName,
//                         appointmentDatetime: formattedDatetimeStr,
//                         hospitalName: hospitalName,
//                         hashedMrNo: hashedMrNo,
//                         surveyLink: surveyLink,
//                         speciality: record.speciality
//                     };
//                     console.log("--- Third-Party API Placeholders ---");
//                     console.log(JSON.stringify(placeholders, null, 2));
//                     console.log("--- End Placeholders ---");
//                 } else if (notificationPreference) {
//                     console.log(`BUPA Upload: Notifications enabled (${notificationPreference}) for ${record.Mr_no}. Preparing to send.`);

//                     let smsMessage;
//                     let emailType = null;

//                     if (updatedSurveyStatus === "Not Completed") {
//                         smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                         emailType = 'appointmentConfirmation';
//                     } else {
//                         smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded.`;
//                     }

//                     // Send SMS
//                     if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
//                         try {
//                             const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage);
//                             console.log(`BUPA Upload: SMS sent successfully for ${record.Mr_no}, SID: ${smsResult.sid}`);
//                             await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                 $push: { smsLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: smsResult.sid } },
//                                 $inc: { SurveySent: 1 }
//                             });
//                             notificationSent = true;
//                         } catch (smsError) {
//                             console.error(`BUPA Upload: Error sending SMS for ${record.Mr_no}:`, smsError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }

//                     // Send Email
//                     if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
//                         try {
//                             await sendEmail(recordDataForNotification.email, emailType, record.speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName);
//                             console.log(`BUPA Upload: Email sent successfully for ${record.Mr_no}`);
//                             await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                 $push: { emailLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date() } },
//                                 $inc: { SurveySent: 1 }
//                             });
//                             notificationSent = true;
//                         } catch (emailError) {
//                             console.error(`BUPA Upload: Error sending Email for ${record.Mr_no}:`, emailError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }

//                     // Send WhatsApp Template
//                     if (prefLower === 'whatsapp' || prefLower === 'both') {
//                         try {
//                             const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                             const authToken = process.env.TWILIO_AUTH_TOKEN;
//                             if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
//                                 const client = twilio(accountSid, authToken);
//                                 const placeholders = {
//                                     1: patientFullName, 2: doctorName, 3: formattedDatetimeStr,
//                                     4: hospitalName, 5: hashedMrNo
//                                 };
//                                 let formattedPhoneNumber = recordDataForNotification.phoneNumber;
//                                 if (recordDataForNotification.phoneNumber && !recordDataForNotification.phoneNumber.startsWith('whatsapp:'))
//                                     formattedPhoneNumber = `whatsapp:${recordDataForNotification.phoneNumber}`;

//                                 if (formattedPhoneNumber) {
//                                     const message = await client.messages.create({
//                                         from: process.env.TWILIO_WHATSAPP_NUMBER,
//                                         to: formattedPhoneNumber,
//                                         contentSid: process.env.TWILIO_TEMPLATE_SID,
//                                         contentVariables: JSON.stringify(placeholders),
//                                         statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
//                                     });
//                                     console.log(`BUPA Upload: Template WhatsApp message sent for ${record.Mr_no}, SID: ${message.sid}`);
//                                     await patientDB.updateOne({ Mr_no: record.Mr_no }, {
//                                         $push: { whatsappLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: message.sid } },
//                                         $inc: { SurveySent: 1 }
//                                     });
//                                     notificationSent = true;
//                                 } else {
//                                     console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no}: Invalid phone format.`);
//                                 }
//                             } else {
//                                 console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no} due to missing Twilio config.`);
//                             }
//                         } catch (twilioError) {
//                             console.error(`BUPA Upload: Error sending Twilio WhatsApp template for ${record.Mr_no}:`, twilioError.message);
//                             notificationErrorOccurred = true;
//                         }
//                     }
//                 } else {
//                     console.log(`BUPA Upload: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${record.Mr_no}.`);
//                 }

//                 // Track Final Status
//                 if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
//                 else { successfullyProcessed.push({ rowNumber, Mr_no:record.Mr_no, operationType, notificationSent }); }
//             }
//             // ----- End: Data Processing Logic -----

//         } // --- End of Processing Loop ---


//         // --- Final Response (only if !validateOnly && !skip) ---
//         // await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));
//                 // --- MOVE FILE on Success ---
//         targetDirForFile = successfulDir; // Mark as successful for file moving
//         finalFileName = `success_${Date.now()}_${originalFilename}`;
//         const successDestPath = path.join(targetDirForFile, finalFileName);
//         try {
//             await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
//             await fsPromises.rename(filePath, successDestPath); // Move the file
//             console.log(`CSV Upload (Success): Moved temp file to ${successDestPath}`);
//         } catch (moveError) {
//             console.error(`CSV Upload (Success): Error moving temp file ${filePath} to ${successDestPath}:`, moveError);
//             // If move fails, attempt to delete the original temp file as a fallback cleanup
//             await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on success:", err));
//         }

//         // Final Response
//         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

//         // Calculate totals
//         const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
//         const uploadedCount = successfullyProcessed.length;
//         const skippedRecords = totalValidationIssues;
//         const totalRecords = csvData.length;
        
//         const responseMessage = `BUPA Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
//         const uploadsDir = path.join(__dirname, '../public/uploads');
//         if (!fs.existsSync(uploadsDir)) {
//             fs.mkdirSync(uploadsDir, { recursive: true });
//         }
//         const outputFileName = `bupa_batch_upload_results_${Date.now()}.xlsx`;
//         const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName);

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet('Processed BUPA Patients');

//         // Define headers for BUPA
//         sheet.columns = [
//             { header: 'Row #', key: 'rowNumber', width: 10 },
//             { header: 'National ID', key: 'Mr_no', width: 20 },
//             { header: 'First Name', key: 'firstName', width: 15 },
//             { header: 'Last Name', key: 'lastName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 15 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             { header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         // Populate rows
//         for (const row of successfullyProcessed) {
//             const patient = csvData[row.rowNumber - 2]; // original CSV record
//             sheet.addRow({
//                 rowNumber: row.rowNumber,
//                 Mr_no: row.Mr_no,
//                 firstName: patient.firstName,
//                 lastName: patient.lastName,
//                 phoneNumber: patient.phoneNumber,
//                 surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
//                 operationType: row.operationType,
//                 notificationSent: row.notificationSent ? 'Yes' : 'No',
//             });
//         }

//         // Write file to disk
//         await workbook.xlsx.writeFile(outputFilePath);
//         req.session.processedExcelFile = outputFileName;

//         return res.status(200).json({
//             success: true,
//             message: responseMessage,
//             uploadedCount: uploadedCount,
//             skippedRecords: skippedRecords,
//             totalRecords: totalRecords,
//             notificationErrorsCount: recordsWithNotificationErrors.length,
//             downloadUrl: `/bupa/data-entry/download-latest`,
//             details: {
//                 processed: successfullyProcessed,
//                 notificationErrors: recordsWithNotificationErrors,
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates: duplicates,
//                     invalidEntries: invalidEntries
//                 }
//             }
//         });
//     } catch (error) { // --- Catch Block (Overall Failure) ---
//         console.error("Error processing CSV upload:", error); // Log the actual error

//         // --- MOVE FILE on Failure --- (targetDirForFile is already 'failedDir' by default)
//         const failedDestPath = path.join(targetDirForFile, finalFileName); // Use default name/path

//         if (filePath && originalFilename) { // Check if filePath was determined before error
//              try {
//                  await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
//                  await fsPromises.rename(filePath, failedDestPath); // Move the file
//                  console.log(`CSV Upload (Failure): Moved temp file to ${failedDestPath}`);
//              } catch (moveError) {
//                  console.error(`CSV Upload (Failure): Error moving temp file ${filePath} to ${failedDestPath}:`, moveError);
//                  // Attempt deletion of temp file if move fails
//                  await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on main error:", err));
//              }
//         } else {
//              console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
//              // Try to delete if filePath exists but move wasn't attempted (e.g., error before filePath assigned)
//              if (filePath) {
//                  await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error (no move attempted):", err));
//              }
//         }
//         // --- End MOVE FILE ---

//         return res.status(500).json({
//             success: false,
//             error: "Error processing BUPA CSV upload.",
//             details: error.message
//         });
//     }
// });

staffRouter.post('/bupa/data-entry/upload', upload.single("csvFile"), async (req, res) => {
    // Flags from request body
    const skip = req.body.skip === "true";
    const validateOnly = req.body.validate_only === "true";

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded!" });
    }

        const providersPath = path.join(__dirname, '/public/providers.json');
        let providerList = [];
        try {
            const providerData = await fsPromises.readFile(providersPath, 'utf-8');
            providerList = JSON.parse(providerData);
        } catch (err) {
            console.error("Error reading providers.json:", err);
            return res.status(500).json({
                success: false,
                error: "Failed to load provider list for validation."
            });
        }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname; // Original name of the uploaded file


        // --- Define Storage Paths ---
    const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
    const successfulDir = path.join(batchUploadStorageDir, 'successful');
    const failedDir = path.join(batchUploadStorageDir, 'failed');
    // --- End Storage Paths ---

    // --- Database Connections (Ensure these are correctly passed via req) ---
    // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
    if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
        console.error("BUPA Upload Error: Database connections not found on request object.");
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
        return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
    }

    // Use same collection as single entry
    const patientDB = req.dataEntryDB.collection("patient_data");
    const docDBCollection = req.manageDoctorsDB.collection("doctors");
    const surveysCollection = req.manageDoctorsDB.collection("surveys");
    const hospitalsCollection = req.adminUserDB.collection("hospitals");

    // Session Data
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;

    if (!hospital_code || !site_code) {
        console.error("BUPA Upload Error: Missing hospital_code or site_code in session.");
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
        return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
    }

        // --- Declare variables outside try for catch block access ---
    let targetDirForFile = failedDir; // Default to failed, change on success
    let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name

    try {
        // Initialization
        const duplicates = [];
        const invalidEntries = [];
        const invalidDoctorsData = [];
        const missingDataRows = [];
        const successfullyProcessed = [];
        const recordsWithNotificationErrors = [];
        const doctorsCache = new Map();
        const validationPassedRows = [];

        // Header Mapping for BUPA CSV to match single entry field names
        const headerMapping = {
            'National ID': 'Mr_no', //mandatory
            'First Name': 'firstName', //mandatory
            'Family Name': 'lastName', //mandatory
            'Date of Birth (mm/dd/yyyy)': 'DOB', //mandatory 
            'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime', //mandatory
            'Doctors Specialty': 'speciality', //mandatory
            'Phone Number': 'phoneNumber', //mandatory
            'Email(Optional)': 'email',
            'Gender': 'gender', //mandatory
            'BUPA Membership Number': 'bupa_membership_number', //mandatory
            'Member Type': 'member_type', //mandatory
            'City': 'city', //mandatory
            'Primary Provider Name': 'primary_provider_name', //mandatory
            'Primary Provider Code': 'primary_provider_code', //mandatory
            'Secondary Provider Name': 'secondary_provider_name',
            'Secondary Provider Code': 'secondary_provider_code',
            'Secondary Doctors\' Name': 'secondary_doctors_name',
            'Primary Doctor\'s Name':'doctorId', //mandatory
            'Contract Number': 'contract_no', //mandatory
            'Contract Name': 'contract_name', //mandatory
            'Policy Status': 'policy_status', //mandatory
            'Policy End Date': 'policy_end_date', //mandatory
            'Primary Diagnosis': 'primary_diagnosis', //mandatory
            'Confirmed Pathway': 'confirmed_pathway',
            'Care Navigator Name': 'care_navigator_name'
        };

        // Validation patterns
        const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
        const phoneRegex = /^0\d{9}$/; // 10 digits starting with 0
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // const nationalIdRegex = /^\d{10}$/; Numeric  with a total length of exactly 10 characters
        const nationalIdRegex = /^[A-Za-z0-9]{10}$/; // Aplha numeric  with a total length of exactly 10 characters
        const bupaNumberRegex = /^\d{10}$/;
        const providerCodeRegex = /^\d{5}$/;
        const contractNoRegex = /^\d{1,8}$/;

        // Read CSV Data
        const csvData = await new Promise((resolve, reject) => {
            const records = [];
            fs.createReadStream(filePath)
                .pipe(csvParser({
                    mapHeaders: ({ header }) => {
                        return headerMapping[header] || header;
                    },
                    skipEmptyLines: true
                }))
                .on('data', (data) => records.push(data))
                .on('end', () => resolve(records))
                .on('error', reject);
        });

        console.log('Sample mapped record:', csvData[0]);

        // Pre-fetch Doctors & Patients
        const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
        const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
        doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

        const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
        const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
        const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

        // Fetch Site Settings
        const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const hospitalName = siteSettings?.hospital_name || "Your Clinic";

        // Validation Loop
        for (const [index, record] of csvData.entries()) {
            const rowNumber = index + 2;
            const validationErrors = [];

            // Extract fields from record
            const {
                Mr_no, firstName, middleName = '', lastName, DOB, datetime,
                speciality, doctorId, phoneNumber, email = '', gender = '',
                bupa_membership_number, member_type, city, primary_provider_name, primary_provider_code,
                secondary_provider_name = '', secondary_provider_code = '', secondary_doctors_name = '',
                contract_no, contract_name, policy_status, policy_end_date,
                primary_diagnosis, confirmed_pathway = '', care_navigator_name = ''
            } = record;

            console.log("record",record);

            // Required fields validation
            const requiredFields = [
                { field: 'Mr_no', value: Mr_no, display: 'National ID' },
                { field: 'firstName', value: firstName, display: 'First Name' },
                { field: 'lastName', value: lastName, display: 'Last Name' },
                { field: 'DOB', value: DOB, display: 'Date of Birth' },
                { field: 'datetime', value: datetime, display: 'Appointment Date & Time' },
                { field: 'speciality', value: speciality, display: 'Speciality' },
                { field: 'doctorId', value: doctorId, display: 'Doctor ID' },
                { field: 'phoneNumber', value: phoneNumber, display: 'Phone Number' },
                { field: 'gender', value: gender, display: 'Gender' },
                { field: 'bupa_membership_number', value: bupa_membership_number, display: 'BUPA Membership Number' },
                { field: 'member_type', value: member_type, display: 'Member Type' },
                { field: 'city', value: city, display: 'City' },
                { field: 'primary_provider_name', value: primary_provider_name, display: 'Primary Provider Name' },
                { field: 'primary_provider_code', value: primary_provider_code, display: 'Primary Provider Code' },
                { field: 'contract_no', value: contract_no, display: 'Contract Number' },
                { field: 'contract_name', value: contract_name, display: 'Contract Name' },
                { field: 'policy_status', value: policy_status, display: 'Policy Status' },
                { field: 'policy_end_date', value: policy_end_date, display: 'Policy End Date' },
                { field: 'primary_diagnosis', value: primary_diagnosis, display: 'Primary Diagnosis' }
            ];

            const missingFields = [];
            requiredFields.forEach(({ field, value, display }) => {
                if (!value || value.toString().trim() === '') {
                    missingFields.push(display);
                }
            });

            if (missingFields.length > 0) {
                validationErrors.push(`Missing: ${missingFields.join(', ')}`);
            }

            // Format Validation
            if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
            if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
            if (gender && !['Male', 'Female'].includes(gender)) validationErrors.push('Invalid gender value (must be Male or Female)');
            // if (phoneNumber && !phoneRegex.test(phoneNumber)) validationErrors.push('Invalid phone number format (must be 10 digits starting with 0)');
            if (email && !emailRegex.test(email)) validationErrors.push('Invalid email format');
            if (bupa_membership_number && !bupaNumberRegex.test(bupa_membership_number)) validationErrors.push('Invalid BUPA Membership Number format (must be 10 digits)');
            if (Mr_no && !nationalIdRegex.test(Mr_no)) validationErrors.push('Invalid National ID format');
            // if (primary_provider_code && !providerCodeRegex.test(primary_provider_code)) validationErrors.push('Invalid Primary Provider Code format (must be 5 digits)');
            if (record.primary_provider_name && record.primary_provider_code) {
                const validProvider = isValidProvider(record.primary_provider_name, record.primary_provider_code, providerList);
                if (!validProvider) {
                    validationErrors.push("Primary Provider Name and Code do not match any valid provider");
                }
            }

            if (secondary_provider_code && secondary_provider_code !== '' && !providerCodeRegex.test(secondary_provider_code)) validationErrors.push('Invalid Secondary Provider Code format (must be 5 digits)');
            if (contract_no && !contractNoRegex.test(contract_no)) validationErrors.push('Invalid Contract Number format (max 8 digits)');
            if (member_type && !/^[a-zA-Z\s]+$/.test(member_type)) validationErrors.push('Invalid Member Type (text only)');
            if (policy_status && !['Active', 'Terminated'].includes(policy_status)) validationErrors.push('Invalid Policy Status (must be Active or Terminated)');

            // Modular validation calls
            validationErrors.push(...validateBupaFields(record));
            validationErrors.push(...await validateBupaCrossReferences(record, doctorsCache, existingPatients));
            validationErrors.push(...validateBupaBusinessLogic(record));


            // Cross-Reference Validation
            const existingPatient = existingPatients.get(Mr_no);
            if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch with existing record');

            const doctor = doctorsCache.get(doctorId);
            if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
            if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
                validationErrors.push(`Specialty not found`);
            }

            // Duplicate Appointment Check
            let appointmentDateObj = null;
            let formattedDatetimeStr = datetime;
            let isDuplicate = false;
            if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
                try {
                    const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                    const tempDate = new Date(correctedDatetime);
                    if (isNaN(tempDate.getTime())) {
                        validationErrors.push('Invalid datetime value');
                    } else {
                        appointmentDateObj = tempDate;
                        formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
                        
                        const exactDuplicateCheck = await patientDB.findOne({
                            Mr_no,
                            "specialities": {
                                $elemMatch: {
                                    name: speciality,
                                    timestamp: formattedDatetimeStr,
                                    doctor_ids: doctorId
                                }
                            }
                        });
                        
                        if (exactDuplicateCheck) {
                            isDuplicate = true;
                            validationErrors.push('Appointment already exists');
                        }
                    }
                } catch (dateError) {
                    console.error(`Date Check Error Row ${rowNumber}:`, dateError);
                    validationErrors.push('Error processing datetime');
                }
            }

            // Categorize Errors OR Store Valid Row
            if (validationErrors.length > 0) {
                const validationRow = { rowNumber, ...record, validationErrors };
                if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
                else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
                else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } }
                else invalidEntries.push(validationRow);
            } else {
                validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
            }
        }

        // Handle validateOnly or skip flags
        if (validateOnly || skip) {
                 targetDirForFile = successfulDir; // Mark as successful for file moving
            finalFileName = `validation_${Date.now()}_${originalFilename}`;
            const validationDestPath = path.join(targetDirForFile, finalFileName);
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
            return res.status(200).json({
                success: true,
                message: "Validation completed",
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctors: invalidDoctorsData,
                    duplicates: duplicates,
                    invalidEntries: invalidEntries
                }
            });
        }

        // Process Valid Records (same logic as single entry)
        for (const validRow of validationPassedRows) {
            const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
            
            const existingPatient = existingPatients.get(record.Mr_no);
            const doctor = doctorsCache.get(record.doctorId);

            // Data Processing Logic
            const currentTimestamp = new Date();
            const hashedMrNo = hashMrNo(record.Mr_no.toString());
            const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
            const patientFullName = `${record.firstName} ${record.lastName}`.trim();
            const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

            let updatedSurveyStatus = "Not Completed";
            let isNewPatient = !existingPatient;

            // Build additionalFields (BUPA specific data)
            const additionalFields = {
                bupa_membership_number: record.bupa_membership_number,
                member_type: record.member_type,
                city: record.city,
                primary_provider_name: record.primary_provider_name,
                primary_provider_code: record.primary_provider_code,
                secondary_provider_name: record.secondary_provider_name || '',
                secondary_provider_code: record.secondary_provider_code || '',
                secondary_doctors_name: record.secondary_doctors_name || '',
                contract_no: record.contract_no,
                contract_name: record.contract_name,
                policy_status: record.policy_status,
                policy_end_date: record.policy_end_date,
                primary_diagnosis: record.primary_diagnosis,
                confirmed_pathway: record.confirmed_pathway || '',
                care_navigator_name: record.care_navigator_name || ''
            };

            
            let existingAppointmentTracker = existingPatient?.appointment_tracker || {};
            let appointment_tracker = { ...existingAppointmentTracker };

            try {
                const specialitySurveys = await surveysCollection.findOne({ specialty: record.speciality, hospital_code, site_code });

                if (specialitySurveys?.surveys?.length > 0) {
                    // Skip if this speciality already exists for the patient
                    if (!appointment_tracker[record.speciality]) {
                        let sortedSurveys = {};
                        specialitySurveys.surveys.forEach(survey => {
                            if (Array.isArray(survey.selected_months)) {
                                survey.selected_months.forEach(month => {
                                    if (!sortedSurveys[month]) sortedSurveys[month] = [];
                                    sortedSurveys[month].push(survey.survey_name);
                                });
                            }
                        });

                        let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                        let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
                        let firstAppointmentTime = new Date(appointmentDateObj);
                        let lastAppointmentTime = new Date(firstAppointmentTime);

                        appointment_tracker[record.speciality] = sortedMonths.map((month, index) => {
                            let trackerAppointmentTime;

                            if (index === 0) {
                                trackerAppointmentTime = new Date(firstAppointmentTime);
                            } else {
                                let previousMonth = parseInt(sortedMonths[index - 1]);
                                let currentMonth = parseInt(month);
                                if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                                    let monthDifference = currentMonth - previousMonth;
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                    trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                                    lastAppointmentTime = new Date(trackerAppointmentTime);
                                } else {
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                }
                            }

                            const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);

                            const completed_in_appointment = {};
                            if (Array.isArray(sortedSurveys[month])) {
                                sortedSurveys[month].forEach(surveyName => {
                                    completed_in_appointment[surveyName] = false;
                                });
                            }

                            return {
                                month,
                                survey_name: sortedSurveys[month],
                                surveyType: surveyTypeLabels[index],
                                appointment_time: formattedTrackerTime,
                                surveyStatus: "Not Completed",
                                completed_in_appointment
                            };
                        });
                    } else {
                        console.log(`Specialty "${record.speciality}" already exists, skipping appointment_time update.`);
                    }
                }
            } catch (trackerError) {
                console.error(`Tracker Error Row ${rowNumber}:`, trackerError);
            }

            // Database Operation (same structure as single entry)
            let operationType = '';
            let notificationSent = false;
            let recordDataForNotification = null;

            try {
                if (existingPatient) {
                    operationType = 'update';
                    const lastAppointmentDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
                    updatedSurveyStatus = existingPatient.surveyStatus;
                    if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                        const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                        const isSpecialityChanged = existingPatient.speciality !== record.speciality;
                        if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
                    } else { updatedSurveyStatus = "Not Completed"; }

                    let updatedSpecialities = existingPatient.specialities || [];
                    const specialityIndex = updatedSpecialities.findIndex(s => s.name === record.speciality);
                    if (specialityIndex !== -1) {
                        updatedSpecialities[specialityIndex].timestamp = formattedDatetimeStr;
                        if (!updatedSpecialities[specialityIndex].doctor_ids.includes(record.doctorId)) {
                            updatedSpecialities[specialityIndex].doctor_ids.push(record.doctorId);
                        }
                    } else {
                        updatedSpecialities.push({ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] });
                    }

                    await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                        $set: {
                            firstName: record.firstName,
                            middleName: record.middleName,
                            lastName: record.lastName,
                            gender: record.gender,
                            DOB: record.DOB,
                            datetime: formattedDatetimeStr,
                            specialities: updatedSpecialities,
                            speciality: record.speciality,
                            phoneNumber: record.phoneNumber,
                            email: record.email,
                            hospital_code,
                            site_code,
                            additionalFields,
                            surveyStatus: updatedSurveyStatus,
                            appointment_tracker,
                        },
                        $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
                    });
                    recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality: record.speciality, datetime: formattedDatetimeStr, appointment_tracker };
                } else {
                    operationType = 'insert';
                    updatedSurveyStatus = "Not Completed";
                    const newRecord = {
                        Mr_no: record.Mr_no,
                        firstName: record.firstName,
                        middleName: record.middleName || '',
                        lastName: record.lastName,
                        gender: record.gender,
                        DOB: record.DOB,
                        datetime: formattedDatetimeStr,
                        specialities: [{ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId] }],
                        speciality: record.speciality,
                        phoneNumber: record.phoneNumber,
                        email: record.email || '',
                        hospital_code,
                        site_code,
                        additionalFields,
                        surveyStatus: updatedSurveyStatus,
                        hashedMrNo,
                        surveyLink,
                        appointment_tracker,
                        SurveySent: 0,
                        smsLogs: [],
                        emailLogs: [],
                        whatsappLogs: []
                    };
                    await patientDB.insertOne(newRecord);
                    recordDataForNotification = newRecord;
                }
                console.log(`BUPA CSV Upload (Process): DB ${operationType} success for ${record.Mr_no} (Row ${rowNumber})`);
            } catch (err) {
                console.error(`BUPA CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (BUPA#: ${record.Mr_no}):`, err);
                invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
                continue;
            }

            // Conditional Notification Logic (same as single entry)
            if (recordDataForNotification) {
                let notificationErrorOccurred = false;
                const prefLower = notificationPreference?.toLowerCase();

                if (prefLower === 'none') {
                    console.log(`BUPA Upload: Notifications skipped for ${record.Mr_no} due to site preference: 'none'.`);
                } else if (prefLower === 'third_party_api') {
                    const patientDataForBupaApi = [{
                "National ID": recordDataForNotification.Mr_no || Mr_no, // Assuming Mr_no from your form is the National ID
                "First Name": recordDataForNotification.firstName || firstName,
                "Last Name": recordDataForNotification.lastName || lastName,
                "Phone Number": recordDataForNotification.phoneNumber || phoneNumber,
                "Survey Link": recordDataForNotification.surveyLink || surveyLink, // Ensure this 'surveyLink' is correctly generated and accessible here
                // Add any other placeholder fields if your specific Bupa template requires them.
            }];
            const bupaTemplateName = "wh_appointment_confirmation";
            if (!bupaTemplateName  === "wh_appointment_confirmation") {
                 console.warn(`[BupaIntegration /bupa/api/data] Bupa template name is not configured for National ID ${recordDataForNotification.Mr_no}. Skipping Bupa send.`);
                 //finalMessage += ' Bupa WhatsApp not sent (template name missing).'; // Optional: Inform user
            } else {
                // 3. Prepare the final payload for the sendWhatsAppDataToBupaProvider function.
                let dataFieldPayload = JSON.stringify(patientDataForBupaApi);
                const payloadToSendToBupa = {
                    template: bupaTemplateName,
                    data: dataFieldPayload
                };

                // 4. Asynchronously send data to Bupa provider via the updated function
                sendWhatsAppDataToBupaProvider(payloadToSendToBupa)
                    .then(success => {
                        if (success) { // Assuming sendWhatsAppDataToBupaProvider returns true on successful queueing by Bupa
                            console.log(`[BupaIntegration /bupa/api/data] Data for National ID ${recordDataForNotification.Mr_no} successfully queued with Bupa WhatsApp API.`);
                            // Optionally update your DB to log this specific Bupa API call success
                        } else {
                            console.error(`[BupaIntegration /bupa/api/data] Failed to queue data for National ID ${recordDataForNotification.Mr_no} with Bupa WhatsApp API (send function indicated failure).`);
                        }
                    })
                    .catch(err => {
                        // This catch is for errors in the sendWhatsAppDataToBupaProvider call itself (e.g., network issues, token errors caught and rethrown)
                        console.error(`[BupaIntegration /bupa/api/data] Error calling sendWhatsAppDataToBupaProvider for National ID ${recordDataForNotification.Mr_no}:`, err.message);
                    }); 
                }
                } else if (notificationPreference) {
                    console.log(`BUPA Upload: Notifications enabled (${notificationPreference}) for ${record.Mr_no}. Preparing to send.`);

                    let smsMessage;
                    let emailType = null;

                    if (updatedSurveyStatus === "Not Completed") {
                        smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                        emailType = 'appointmentConfirmation';
                    } else {
                        smsMessage = `Dear patient, your appointment for ${record.speciality} on ${formattedDatetimeStr} has been recorded.`;
                    }

                    // Send SMS
                    if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
                        try {
                            const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage);
                            console.log(`BUPA Upload: SMS sent successfully for ${record.Mr_no}, SID: ${smsResult.sid}`);
                            await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                                $push: { smsLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: smsResult.sid } },
                                $inc: { SurveySent: 1 }
                            });
                            notificationSent = true;
                        } catch (smsError) {
                            console.error(`BUPA Upload: Error sending SMS for ${record.Mr_no}:`, smsError.message);
                            notificationErrorOccurred = true;
                        }
                    }

                    // Send Email
                    if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
                        try {
                            await sendEmail(recordDataForNotification.email, emailType, record.speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName);
                            console.log(`BUPA Upload: Email sent successfully for ${record.Mr_no}`);
                            await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                                $push: { emailLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date() } },
                                $inc: { SurveySent: 1 }
                            });
                            notificationSent = true;
                        } catch (emailError) {
                            console.error(`BUPA Upload: Error sending Email for ${record.Mr_no}:`, emailError.message);
                            notificationErrorOccurred = true;
                        }
                    }

                    // Send WhatsApp Template
                    if (prefLower === 'whatsapp' || prefLower === 'both') {
                        try {
                            const accountSid = process.env.TWILIO_ACCOUNT_SID;
                            const authToken = process.env.TWILIO_AUTH_TOKEN;
                            if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                                const client = twilio(accountSid, authToken);
                                const placeholders = {
                                    1: patientFullName, 2: doctorName, 3: formattedDatetimeStr,
                                    4: hospitalName, 5: hashedMrNo
                                };
                                let formattedPhoneNumber = recordDataForNotification.phoneNumber;
                                if (recordDataForNotification.phoneNumber && !recordDataForNotification.phoneNumber.startsWith('whatsapp:'))
                                    formattedPhoneNumber = `whatsapp:${recordDataForNotification.phoneNumber}`;

                                if (formattedPhoneNumber) {
                                    const message = await client.messages.create({
                                        from: process.env.TWILIO_WHATSAPP_NUMBER,
                                        to: formattedPhoneNumber,
                                        contentSid: process.env.TWILIO_TEMPLATE_SID,
                                        contentVariables: JSON.stringify(placeholders),
                                        statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
                                    });
                                    console.log(`BUPA Upload: Template WhatsApp message sent for ${record.Mr_no}, SID: ${message.sid}`);
                                    await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                                        $push: { whatsappLogs: { type: "upload_creation", speciality: record.speciality, timestamp: new Date(), sid: message.sid } },
                                        $inc: { SurveySent: 1 }
                                    });
                                    notificationSent = true;
                                } else {
                                    console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no}: Invalid phone format.`);
                                }
                            } else {
                                console.warn(`BUPA Upload: Skipping WhatsApp for ${record.Mr_no} due to missing Twilio config.`);
                            }
                        } catch (twilioError) {
                            console.error(`BUPA Upload: Error sending Twilio WhatsApp template for ${record.Mr_no}:`, twilioError.message);
                            notificationErrorOccurred = true;
                        }
                    }
                } else {
                    console.log(`BUPA Upload: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${record.Mr_no}.`);
                }

                // Track Final Status
                if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
                else { successfullyProcessed.push({ rowNumber, Mr_no:record.Mr_no, operationType, notificationSent }); }
            }
            // ----- End: Data Processing Logic -----

        } // --- End of Processing Loop ---


        // --- Final Response (only if !validateOnly && !skip) ---
        // await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));
                // --- MOVE FILE on Success ---
        targetDirForFile = successfulDir; // Mark as successful for file moving
        finalFileName = `success_${Date.now()}_${originalFilename}`;
        const successDestPath = path.join(targetDirForFile, finalFileName);
        try {
            await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
            await fsPromises.rename(filePath, successDestPath); // Move the file
            console.log(`CSV Upload (Success): Moved temp file to ${successDestPath}`);
        } catch (moveError) {
            console.error(`CSV Upload (Success): Error moving temp file ${filePath} to ${successDestPath}:`, moveError);
            // If move fails, attempt to delete the original temp file as a fallback cleanup
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on success:", err));
        }

        // Final Response
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));

        // Calculate totals
        const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
        const uploadedCount = successfullyProcessed.length;
        const skippedRecords = totalValidationIssues;
        const totalRecords = csvData.length;
        
        const responseMessage = `BUPA Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const outputFileName = `bupa_batch_upload_results_${Date.now()}.xlsx`;
        const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Processed BUPA Patients');

        // Define headers for BUPA
        sheet.columns = [
            { header: 'Row #', key: 'rowNumber', width: 10 },
            { header: 'National ID', key: 'Mr_no', width: 20 },
            { header: 'First Name', key: 'firstName', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 15 },
            { header: 'Survey Link', key: 'surveyLink', width: 50 },
            //{ header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        // Populate rows
        for (const row of successfullyProcessed) {
            const patient = csvData[row.rowNumber - 2]; // original CSV record
            sheet.addRow({
                rowNumber: row.rowNumber,
                Mr_no: row.Mr_no,
                firstName: patient.firstName,
                lastName: patient.lastName,
                phoneNumber: patient.phoneNumber,
                surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
                operationType: row.operationType,
                //notificationSent: row.notificationSent ? 'Yes' : 'No',
            });
        }

        // Write file to disk
        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = outputFileName;

        return res.status(200).json({
            success: true,
            message: responseMessage,
            uploadedCount: uploadedCount,
            skippedRecords: skippedRecords,
            totalRecords: totalRecords,
            notificationErrorsCount: recordsWithNotificationErrors.length,
            downloadUrl: `/bupa/data-entry/download-latest`,
            details: {
                processed: successfullyProcessed,
                notificationErrors: recordsWithNotificationErrors,
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctors: invalidDoctorsData,
                    duplicates: duplicates,
                    invalidEntries: invalidEntries
                }
            }
        });
    } catch (error) { // --- Catch Block (Overall Failure) ---
        console.error("Error processing CSV upload:", error); // Log the actual error

        // --- MOVE FILE on Failure --- (targetDirForFile is already 'failedDir' by default)
        const failedDestPath = path.join(targetDirForFile, finalFileName); // Use default name/path

        if (filePath && originalFilename) { // Check if filePath was determined before error
             try {
                 await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
                 await fsPromises.rename(filePath, failedDestPath); // Move the file
                 console.log(`CSV Upload (Failure): Moved temp file to ${failedDestPath}`);
             } catch (moveError) {
                 console.error(`CSV Upload (Failure): Error moving temp file ${filePath} to ${failedDestPath}:`, moveError);
                 // Attempt deletion of temp file if move fails
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on main error:", err));
             }
        } else {
             console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
             // Try to delete if filePath exists but move wasn't attempted (e.g., error before filePath assigned)
             if (filePath) {
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error (no move attempted):", err));
             }
        }
        // --- End MOVE FILE ---

        return res.status(500).json({
            success: false,
            error: "Error processing BUPA CSV upload.",
            details: error.message
        });
    }
});

staffRouter.post('/api/json-patient-data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        // --- Extract and Validate Input Data ---
        const {
            Mr_no, firstName, middleName, lastName, DOB, datetime,
            phoneNumber, email, gender,
            'speciality-doctor': specialityDoctor
        } = req.body;

        if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !specialityDoctor) {
            let missing = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'phoneNumber', 'speciality-doctor']
                          .filter(field => !req.body[field] && field !== 'speciality-doctor' || (field === 'speciality-doctor' && !specialityDoctor));
            return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
        }

        const hospital_code = req.session?.hospital_code;
        const site_code = req.session?.site_code;

        if (!hospital_code || !site_code) {
            console.warn("JSON API Error: Missing hospital_code or site_code in session.");
            return res.status(401).json({ success: false, message: 'User session not found or invalid. Please login again.' });
        }

        const [speciality, doctorId] = (specialityDoctor || '').split('||');
        if (!speciality || !doctorId) {
            return res.status(400).json({ success: false, message: 'Invalid speciality-doctor format. Expected "SpecialtyName||DoctorID".' });
        }

        const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        if (isNaN(appointmentDateObj.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid appointment datetime format provided.' });
        }
        const formattedDatetime = formatTo12Hour(appointmentDateObj);
        // --- End Validation ---

        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find Doctor
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code, site_code });
        if (!doctor) {
            return res.status(404).json({ success: false, message: `Doctor with ID ${doctorId} not found for hospital ${hospital_code} / site ${site_code}.` });
        }
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

        // Fetch Survey Details & Build Tracker
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({ specialty, hospital_code, site_code });
        let appointment_tracker = {};
        if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
             try {
                 // --- Build appointment_tracker logic ---
                 let sortedSurveys = {};
                 specialitySurveys.surveys.forEach(survey => {
                     if (Array.isArray(survey.selected_months)) {
                         survey.selected_months.forEach(month => {
                             if (!sortedSurveys[month]) sortedSurveys[month] = [];
                             sortedSurveys[month].push(survey.survey_name);
                         });
                     }
                 });
                 let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                 let surveyTypeLabels = ["Baseline"];
                 for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

                 let firstAppointmentTime = new Date(appointmentDateObj);
                 let lastAppointmentTime = new Date(firstAppointmentTime);

                 appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                     let appointmentTime;
                     if (index === 0) {
                         appointmentTime = new Date(firstAppointmentTime);
                     } else {
                         let previousMonth = parseInt(sortedMonths[index - 1]);
                         let currentMonth = parseInt(month);
                         if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                             let monthDifference = currentMonth - previousMonth;
                             appointmentTime = new Date(lastAppointmentTime);
                             appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                             lastAppointmentTime = new Date(appointmentTime);
                         } else {
                              console.warn(`JSON API: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
                              appointmentTime = new Date(lastAppointmentTime); // Fallback
                          }
                     }
                     const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
                     return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
                 });
                 // --- End build appointment_tracker logic ---
             } catch(trackerError) {
                 console.error("JSON API: Error building appointment tracker:", trackerError);
             }
        }

        // Find existing patient data & Prepare Common Vars
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain
        const patientFullName = `${firstName} ${lastName}`.trim();

        let updatedSurveyStatus = "Not Completed";
        let isNewPatient = !patient;

        // --- Start: DB Upsert Logic ---
        if (patient) {
             // Update Existing Patient...
             console.log(`JSON API: Patient ${Mr_no} found, updating.`);
             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
             updatedSurveyStatus = patient.surveyStatus;
             if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                 const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                 if (daysDifference >= 30 || patient.speciality !== speciality) updatedSurveyStatus = "Not Completed";
             } else { updatedSurveyStatus = "Not Completed"; }
             let updatedSpecialities = patient.specialities || [];
             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
             if (specialityIndex !== -1) { /* ... update existing specialty entry ... */ }
             else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
             await collection.updateOne({ Mr_no }, { $set: { /* ... fields ... */ surveyStatus: updatedSurveyStatus, appointment_tracker }, $unset: { /* ... */ } });
        } else {
             // Insert New Patient...
             console.log(`JSON API: Patient ${Mr_no} not found, inserting.`);
             updatedSurveyStatus = "Not Completed";
             await collection.insertOne({ /* ... fields ... */ SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] });
        }
        // --- End: DB Upsert Logic ---

        // --- Start: Fetch Notification Settings (Post-DB Op) ---
        const siteSettings = await adminDB.collection('hospitals').findOne(
             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";
        console.log(`JSON API: Post-DB Op. Notification preference for site ${site_code}: ${notificationPreference}`);
        // --- End: Fetch Notification Settings ---

        // ***** START: Conditional Notification Logic *****
        let finalMessage = 'Appointment created successfully'; // Base success message

        const prefLower = notificationPreference?.toLowerCase(); // Handle undefined safely

        if (prefLower === 'none') {
            console.log(`JSON API: Notifications skipped for ${Mr_no} due to preference 'none'.`);
            finalMessage += ' Notifications skipped as per site preference.';
            // No SurveySent increment

        } else if (prefLower === 'third_party_api') {
            // --- Handle Third Party API Case ---
            console.log(`JSON API: Preference 'third_party_api' detected for ${Mr_no}. Logging placeholders.`);
            const placeholders = {
                patientMrNo: Mr_no,
                patientFullName: patientFullName,
                doctorFullName: doctorName,
                appointmentDatetime: formattedDatetime, // Use formatted string for consistency
                hospitalName: hospitalName,
                hashedMrNo: hashedMrNo,
                surveyLink: surveyLink,
                speciality: speciality,
                phoneNumber: phoneNumber,
                email: email
            };
            // Log the placeholders clearly to the console
            console.log(`--- JSON API: Third-Party Placeholders for MRN: ${Mr_no} ---`);
            console.log(JSON.stringify(placeholders, null, 2));
            console.log(`--- End Placeholders ---`);

            finalMessage += ' Third-party API placeholders logged.';
            // No SurveySent increment

        } else if (notificationPreference) { // Handles 'sms', 'email', 'both', 'whatsapp', etc.
            // --- Handle Actual Sending ---
            console.log(`JSON API: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
            finalMessage += ' Notifications attempted (check logs for status).';

            let smsMessage;
            let emailType = null;

            if (updatedSurveyStatus === "Not Completed") {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                emailType = 'appointmentConfirmation';
            } else {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                console.log(`JSON API: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
            }

            // --- Attempt to Send SMS ---
            if ((prefLower === 'sms' || prefLower === 'both') && smsMessage) {
                try {
                    const smsResult = await sendSMS(phoneNumber, smsMessage);
                    console.log(`JSON API: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
                    await collection.updateOne({ Mr_no }, {
                        $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                        $inc: { SurveySent: 1 }
                    });
                } catch (smsError) { console.error(`JSON API: Error sending SMS for ${Mr_no}:`, smsError.message); }
            }

            // --- Attempt to Send Email ---
            if ((prefLower === 'email' || prefLower === 'both') && email && emailType) {
                try {
                    await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                    console.log(`JSON API: Email sent successfully for ${Mr_no}`);
                    await collection.updateOne({ Mr_no }, {
                        $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
                        $inc: { SurveySent: 1 }
                    });
                } catch (emailError) { console.error(`JSON API: Error sending Email for ${Mr_no}:`, emailError.message); }
            }

            // --- Attempt to Send WhatsApp Template ---
            if (prefLower === 'whatsapp' || prefLower === 'both') {
                try {
                    const accountSid = process.env.TWILIO_ACCOUNT_SID;
                    const authToken = process.env.TWILIO_AUTH_TOKEN;
                    if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                        const client = twilio(accountSid, authToken);
                        const placeholders = { 1: patientFullName, 2: doctorName, 3: formattedDatetime, 4: hospitalName, 5: hashedMrNo };
                        let formattedPhoneNumber = phoneNumber;
                        if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

                        if (formattedPhoneNumber) {
                             const message = await client.messages.create({
                                 from: process.env.TWILIO_WHATSAPP_NUMBER, to: formattedPhoneNumber,
                                 contentSid: process.env.TWILIO_TEMPLATE_SID, contentVariables: JSON.stringify(placeholders),
                                 statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
                             });
                             console.log(`JSON API: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                             await collection.updateOne({ Mr_no }, {
                                 $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
                                 $inc: { SurveySent: 1 }
                             });
                        } else { console.warn(`JSON API: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
                    } else { console.warn(`JSON API: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
                } catch (twilioError) { console.error(`JSON API: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
            }

        } else {
            // Handle null/undefined or unrecognized preference
            console.log(`JSON API: Notification preference '${notificationPreference}' is not set or invalid for site ${site_code}. No notifications sent for ${Mr_no}.`);
            finalMessage += ' Notification preference not set/invalid; none sent.';
            // No SurveySent increment
        }
        // ***** END: Conditional Notification Logic *****


        // --- Final JSON Response ---
        return res.status(200).json({
            success: true,
            message: finalMessage,
            patientMrNo: Mr_no
        });

    } catch (error) {
        console.error('Error processing /api/json-patient-data request:', error);
        const logErrorData = `Error in /api/json-patient-data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
        // Ensure writeLog exists and handles errors gracefully
        typeof writeLog === 'function' ? writeLog('error_logs.txt', logErrorData) : console.error("writeLog function not available for error logging.");

        return res.status(500).json({
            success: false,
            message: 'Internal server error processing patient data.',
            error: error.message // Send error message back for API debugging
        });
    }
});



staffRouter.get('/api/patient/:mrNo', async (req, res) => {
    const mrNo = req.params.mrNo;
    const db = req.dataEntryDB;
    const userHospitalCode = req.session.hospital_code; // Get hospital_code from the logged-in user's session

    // Validate if userHospitalCode exists in the session
    if (!userHospitalCode) {
        console.error('API Error: hospital_code not found in session for /api/patient/:mrNo');
        // Return a generic error, as the issue is with the session, not the patient data itself
        return res.status(401).json({ success: false, message: 'Session invalid or expired. Please log in again.' });
    }

    try {
        // Modify the query to find the patient matching BOTH Mr_no AND the user's hospital_code
        const patient = await db.collection('patient_data').findOne({
            Mr_no: mrNo,
            hospital_code: userHospitalCode // Add this condition
        });

        if (patient) {
            // Patient found AND belongs to the correct hospital
            res.json({ success: true, patient });
        } else {
            // Check if a patient with this MRN exists at all (but maybe in a different hospital)
            const patientExistsElsewhere = await db.collection('patient_data').findOne({ Mr_no: mrNo });
            if (patientExistsElsewhere) {
                 // Patient exists, but not in the user's hospital
                res.json({ success: false, message: 'Patient found, but does not belong to your hospital.' });
            } else {
                 // Patient with this MRN not found anywhere
                res.json({ success: false, message: 'Patient not found.' });
            }
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching patient data.' });
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
    const adminDB = req.adminUserDB;

    try {
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });

        if (!patient) {
            return res.status(400).json({ error: 'MR No not found' });
        }

        const latestSpeciality = patient.specialities.reduce((latest, spec) =>
            new Date(spec.timestamp) > new Date(latest.timestamp) ? spec : latest,
            patient.specialities[0]
        );

        const latestSpecialityName = latestSpeciality.name;
        const formattedDatetime = formatTo12Hour(patient.datetime);
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;

        const reminderMessage = `Friendly reminder! Your appointment for ${latestSpecialityName} on ${formattedDatetime} is approaching. Don't forget to complete your survey: ${surveyLink}`;

        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": patient.site_code },
            { projection: { "sites.$": 1 } }
        );

        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase();

        // ======= Send based on preference =======
        if (notificationPreference === 'none') {
            console.log("Reminder skipped - Notification disabled");
            
            return res.redirect(basePath + '/home');
        }

        if (notificationPreference === 'third_party_api') {
   
            const payloadForMockServer = {
                patientMrNo: patient.Mr_no,
                patientFullName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
                doctorFullName: patient.doctorName || 'Not Assigned', // You can improve this with actual lookup
                appointmentDatetime: formattedDatetime,
                hospitalName: siteSettings?.sites?.[0]?.hospital_name || "Hospital",
                hashedMrNo: patient.hashedMrNo,
                surveyLink: surveyLink,
                speciality: latestSpecialityName,
                phoneNumber: patient.phoneNumber,
                email: patient.email,
                gender: patient.gender,
                isNewPatient: false, // Since this is a reminder, the patient already exists
                sourceSystemRecordId: null,
                uploadSource: 'send_reminder',
                notificationPreferenceUsed: notificationPreference
            };
             try {
                await sendAppointmentDataToMockServer(payloadForMockServer); // You must have this function defined
                console.log(`[Reminder] Third-party API success for MRN ${Mr_no}`);
            } catch (err) {
                console.error(`[Reminder] Third-party API error for MRN ${Mr_no}:`, err.message);
            }
        }
        // Send SMS
        if (notificationPreference === 'sms' || notificationPreference === 'both') {
            try {
                await sendSMS(patient.phoneNumber, reminderMessage);
                await collection.updateOne(
                    { Mr_no },
                    { $push: { smsLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date() } } }
                );
               
            } catch (err) {
                console.warn("SMS failed:", err.message);
            }
        }
        // Send Email
        if ((notificationPreference === 'email' || notificationPreference === 'both') && patient.email) {
            try {
                const emailType = 'appointmentReminder';
                console.log("in send reminder");
                await sendEmail(patient.email, emailType, latestSpecialityName, formattedDatetime, patient.hashedMrNo, patient.firstName);
                await collection.updateOne(
                    { Mr_no },
                    { $push: { emailLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date() } } }
                );
                
            } catch (err) {
                console.warn("Email failed:", err.message);
            }
        }
        // Send WhatsApp (if supported)
        if (notificationPreference === 'whatsapp') {
            try {
                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                    const client = twilio(accountSid, authToken);
                    const whatsappMessage = {
                        1: `${patient.firstName} ${patient.lastName || ''}`,
                        2: latestSpecialityName,
                        3: formattedDatetime,
                        4: siteSettings?.sites?.[0]?.hospital_name || "Hospital",
                        5: patient.hashedMrNo
                    };
                    const message = await client.messages.create({
                        from: process.env.TWILIO_WHATSAPP_NUMBER,
                        to: `whatsapp:${patient.phoneNumber}`,
                        contentSid: process.env.TWILIO_TEMPLATE_SID,
                        contentVariables: JSON.stringify(whatsappMessage),
                        statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
                    });

                    await collection.updateOne(
                        { Mr_no },
                        { $push: { whatsappLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date(), sid: message.sid } } }
                    );
                    console.log("Whatsapp sent");
                } else {
                    console.warn("Twilio WhatsApp not configured properly.");
                }
                
            } catch (err) {
                console.warn("WhatsApp failed:", err.message);
            }
        }
        return res.redirect(basePath + '/home');
    } catch (error) {
        console.error('Send Reminder error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });

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
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
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

// Route to serve the Privacy Policy page
staffRouter.get('/privacy-policy', (req, res) => {
    res.render('privacy'); // Renders 'views/privacy.ejs'
});


// Mount the staff router at the base path
app.use(basePath, staffRouter);


function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on `);
    });
}



module.exports = startServer;
