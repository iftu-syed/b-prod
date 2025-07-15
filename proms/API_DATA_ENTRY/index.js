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
// const upload = multer({ dest: "uploads/" });
const sgMail = require('@sendgrid/mail');
const { ObjectId } = require('mongodb');

const ExcelJS = require('exceljs');

const axios = require('axios');


const cron = require('node-cron');
const XLSX = require('xlsx');

// Configure multer for both CSV and Excel files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 2) Map each type to its own file
const logFiles = {
  access: path.join(logsDir, 'access.log'),
  audit:  path.join(logsDir, 'audit.log'),
  error:  path.join(logsDir, 'error.log'),
};

function writeDbLog(type, data) {
  const timestamp = new Date().toISOString();
  const entry     = { ...data, timestamp };
  const filePath  = logFiles[type];

  if (!filePath) {
    return Promise.reject(new Error(`Unknown log type: ${type}`));
  }

  // Append a JSON line to the appropriate log file
  const line = JSON.stringify(entry) + '\n';
  return fs.promises.appendFile(filePath, line);
}
// Enhanced file filter for CSV and Excel
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// ===== START: Bupa/GOQii API Configuration =====
// const BUPA_API_BASE_URL = 'https://goqiiv1uat.bupa.com.sa'; //
// const BUPA_API_CLIENT_ID = '8f3b9d7a46e04a92b7d81c3f5fdb912a'; // Replace with actual clientId from Bupa/GOQii
// const BUPA_API_SECRET = 'd1f0e5b79c2e43e4a1c9f0a3b7d2c5e8';   // Replace with actual secret from Bupa/GOQii


const BUPA_API_BASE_URL = 'https://goqiiv1.bupa.com.sa'; //
const BUPA_API_CLIENT_ID = '8741f9c2f50zb2bf53cd9ec98743e'; // Replace with actual clientId from Bupa/GOQii
const BUPA_API_SECRET = '1d52680yf970186d74a3e48b2b';   // Replace with actual secret from Bupa/GOQii


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


//3rd API usage as per the bupa new v1.2 API version

async function fetchBupaAnalytics(date, page = 1) {
    console.log(`[BupaAnalytics] Fetching analytics for date: ${date}, page: ${page}`);

    const hasValidToken = await ensureValidBupaToken();
    if (!hasValidToken || !bupaAccessToken) {
        console.error('[BupaAnalytics] No valid Bupa access token. Aborting analytics fetch.');
        throw new Error('Could not secure a valid Bupa access token.');
    }

    try {
        const response = await axios.post(
            `${BUPA_API_BASE_URL}/services/wh_fetch_member_analytics?date=${date}&page=${page}`,
            {}, // The API requires a POST request, but the body is empty as per docs
            {
                headers: {
                    // Note: The docs specify "Bearer <token>" for this endpoint
                    'Authorization': `Bearer ${bupaAccessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.code === 200 && response.data.data) {
            console.log(`[BupaAnalytics] Successfully fetched analytics data for ${date}, page ${page}.`);
            return response.data.data;
        } else {
            console.error('[BupaAnalytics] API returned an error:', response.data.message || response.data);
            throw new Error(response.data.message || 'Failed to fetch analytics from Bupa API.');
        }
    } catch (error) {
        console.error('[BupaAnalytics] Error calling Bupa analytics API:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) {
            bupaAccessToken = null; // Invalidate token on authorization failure
            bupaAccessTokenExpiresAt = 0;
            console.log('[BupaAnalytics] Bupa token cleared due to 401 error.');
        }
        throw error; // Re-throw the error to be handled by the calling route
    }
}


function getSurveyDetails(patient) {
  // Return a default dash if data is missing
  if (!patient || !patient.speciality || !patient.appointment_tracker) {
    return '-';
  }

  const trackerForSpecialty = patient.appointment_tracker[patient.speciality];

  // Return a default dash if the tracker for this specialty doesn't exist
  if (!trackerForSpecialty || !Array.isArray(trackerForSpecialty) || trackerForSpecialty.length === 0) {
    return '-';
  }

  let targetSession = null;

  // Case 1: Main surveyStatus is 'Completed'
  if (patient.surveyStatus === 'Completed') {
    // Find the LAST session in the array that is also marked 'Completed'
    targetSession = trackerForSpecialty.filter(s => s.surveyStatus === 'Completed').pop();
  }
  // Case 2: Main surveyStatus is 'Not Completed'
  else {
    // Find the FIRST session in the array that is marked 'Not Completed'
    targetSession = trackerForSpecialty.find(s => s.surveyStatus === 'Not Completed');
  }

  // If a relevant session was found, format its details
  if (targetSession) {
    const surveyType = targetSession.surveyType || 'Survey';
    const completionData = targetSession.completed_in_appointment;

    let completedCount = 0;
    let totalCount = 0;

    // Safely count completed surveys within the session
    if (completionData && typeof completionData === 'object') {
      const values = Object.values(completionData);
      totalCount = values.length;
      completedCount = values.filter(v => v === true).length;
    }

    return `${surveyType}: ${completedCount}/${totalCount}`;
  }

  // Fallback if no relevant session is found
  return '-';
}



function getDayWithOrdinalSuffix(day) {
    if (day > 3 && day < 21) return day + 'th'; // for 11th, 12th, 13th
    switch (day % 10) {
        case 1:  return day + "st";
        case 2:  return day + "nd";
        case 3:  return day + "rd";
        default: return day + "th";
    }
}


function getLatestLog(patient) {
  // Combine all logs from different sources into a single array, adding a 'source' field
  const allLogs = [];
  if (patient.whatsappLogs) {
    patient.whatsappLogs.forEach(log => allLogs.push({ ...log, source: 'WhatsApp' }));
  }
  if (patient.emailLogs) {
    patient.emailLogs.forEach(log => allLogs.push({ ...log, source: 'Email' }));
  }
  if (patient.smsLogs) {
    patient.smsLogs.forEach(log => allLogs.push({ ...log, source: 'SMS' }));
  }

  // If there are no logs, return a default message
  if (allLogs.length === 0) {
    return '<span style="font-size: 11px; color: #888;">No communication logs</span>';
  }

  // Sort logs by timestamp in descending order to find the latest one
  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const latestLog = allLogs[0];
  const logSource = latestLog.source;
  const logDate = new Date(latestLog.timestamp);

  // --- MODIFIED SECTION START ---

  // Get the day with its correct ordinal suffix (e.g., "13th")
  const dayWithSuffix = getDayWithOrdinalSuffix(logDate.getDate());

  // Get the full month name (e.g., "June")
  const month = logDate.toLocaleString('en-US', { month: 'long' });
  
  // Get the time
  const time = logDate.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Construct the final date string in "13th June, 07:31 PM" format
  const formattedDate = `${dayWithSuffix} ${month}, ${time}`;

  // --- MODIFIED SECTION END ---


  // Assign an icon based on the log source
  let icon = '';
  switch (logSource) {
    case 'WhatsApp':
      icon = '<i class="bx bxl-whatsapp" style="color: #25D366; vertical-align: middle;"></i>';
      break;
    case 'Email':
      icon = '<i class="bx bxs-envelope" style="color: #DB4437; vertical-align: middle;"></i>';
      break;
    case 'SMS':
      icon = '<i class="bx bxs-message-rounded-dots" style="color: #4285F4; vertical-align: middle;"></i>';
      break;
  }

  return `<span style="font-size: 11px; white-space: nowrap;">Last Sent : ${icon} ${formattedDate}</span>`;
}




function getAppointmentStatus(patient) {
    if (!patient || !Array.isArray(patient.Appointment_History) || patient.Appointment_History.length === 0) {
        return 'no-show'; // Default to 'no-show' if no history exists
    }

    // Sort the history by date in descending order to get the latest one
    const sortedHistory = [...patient.Appointment_History].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // Return the status of the most recent entry
    return sortedHistory[0].appointment || 'no-show';
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
      writeDbLog('access', {
    action: 'view_staff_login',
    ip:     req.ip,
  });
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
        const ip            = req.ip;
          await writeDbLog('access', {
    action:        'staff_home_view',
    username,
    hospital_code,
    site_code,
    ip
  });
        
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
            basePath: basePath,
            getSurveyDetails,
            getLatestLog,
            getAppointmentStatus
        });


    } catch (error) {
        console.error('Error fetching patients data:', error);
     await writeDbLog('error', {
      action:        'staff_home_view_error',
      username,
      hospital_code,
      site_code,
      message:       error.message,
      stack:         error.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});


// staffRouter.post('/delete-appointment', async (req, res) => {
//     const db = req.dataEntryDB;
//     const { Mr_no } = req.body;
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;
//     const username = req.session.username;
//     const basePath = req.baseUrl || '/staff'; // Use req.baseUrl for the base path
    
//     try {
//         const query = { 
//             Mr_no,
//             hospital_code,
//             site_code 
//         };
        
//         const result = await db.collection('patient_data').deleteOne(query);
//      if (result.deletedCount === 1) {
//             req.flash('successMessage', `Patient with MR No. ${Mr_no} deleted successfully.`);
//             console.log("PATIENT DELETED",`Patient with National ID ${Mr_no} deleted successfully.`)
//         }
//         else {
//             req.flash('errorMessage', `Patient with MR No. ${Mr_no} not found or already deleted.`);
//         }
        
//         return res.redirect(`${basePath}/home`);
//     } catch (error) {
//         console.error('Error during delete operation:', error);
//         req.flash('errorMessage', 'An internal error occurred while deleting the patient record.');
//         return res.redirect(`${basePath}/home`);
//     }
// });


staffRouter.post('/delete-appointment', async (req, res) => {
    const db = req.dataEntryDB;
    const { Mr_no } = req.body;
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;
    const ip            = req.ip;
    const basePath = req.baseUrl || '/staff'; 

      await writeDbLog('access', {
    action:        'delete_appointment_attempt',
    username,
    hospital_code,
    site_code,
    Mr_no,
    ip
  });
    
    try {
        const query = { 
            Mr_no,
            hospital_code,
            site_code 
        };

        // 1. Find the patient document to be archived
        const patientToArchive = await db.collection('patient_data').findOne(query);

        if (patientToArchive) {
            // 2. Add the new 'deletion_history' field with an audit trail
            patientToArchive.deletion_history = [{
                username: username,
                timestamp: new Date() // Creates a UTC timestamp by default
            }];

            // 3. Insert the complete, modified record into the new 'deleted_patients' collection
            const deletedPatientsCollection = db.collection('deleted_patients');
            await deletedPatientsCollection.insertOne(patientToArchive);
            
            // 4. If the insert was successful, now delete the record from the original collection
            await db.collection('patient_data').deleteOne(query);
	                  await writeDbLog('audit', {
        action:        'delete_appointment_success',
        username,
        hospital_code,
        site_code,
        Mr_no,
        ip
});
            // req.flash('successMessage', `Patient with MR No. ${Mr_no} was successfully archived.`);
            console.log("PATIENT ARCHIVED", `Patient with National ID ${Mr_no} was archived by ${username}.`);
        
        } else {
                  await writeDbLog('error', {
        action:        'delete_appointment_not_found',
        username,
        hospital_code,
        site_code,
        Mr_no,
        ip
      });
            req.flash('errorMessage', `Patient with MR No. ${Mr_no} not found or already archived.`);
        }
        
        return res.redirect(`${basePath}/home`);

    } catch (error) {
        console.error('Error during patient archive operation:', error);
            await writeDbLog('error', {
      action:        'delete_appointment_error',
      username,
      hospital_code,
      site_code,
      Mr_no,
      message:       error.message,
      stack:         error.stack,
      ip
    });
        req.flash('errorMessage', 'An internal error occurred while archiving the patient record.');
        return res.redirect(`${basePath}/home`);
    }
});


staffRouter.post('/login', async (req, res) => {
    const staffDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body;
      const ip = req.ip;
        await writeDbLog('access', {
    action:   'staff_login_attempt',
    username,
    ip
  });

    try {
        const staff = await staffDB.findOne({ username });

        if (!staff) {
        await writeDbLog('access', {
        action:   'login_failed_user_not_found',
        username,
        ip
      });
            req.flash('errorMessage', 'Invalid username or password');
            return res.redirect(basePath);
        }

        // Check if account is locked first
        if (staff.isLocked) {
        await writeDbLog('access', {
        action:   'login_locked',
        username,
        ip
      });
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
    await writeDbLog('access', {
      action:        'login_success',
      username,
      hospital_code: staff.hospital_code,
      site_code:     staff.site_code,
      ip
    });

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
            await writeDbLog('error', {
      action:   'login_exception',
      username,
      message:  error.message,
      stack:    error.stack,
      ip
    });
        const logError = `Error during login for username ${username}: ${error.message}`;
        writeLog('error.log', logError);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        return res.redirect(basePath);
    }
});

staffRouter.get('/logout', async (req, res) => {
    const ip = req.ip;
    if (req.session && req.session.username && req.session.hospital_code && req.session.loginTime) {
        const { username, hospital_code, loginTime } = req.session;
        const logoutTime = new Date();

        // Ensure loginTime is a valid date
        const loginTimestamp = new Date(loginTime);
        const sessionDuration = (logoutTime - loginTimestamp) / 1000; // Duration in seconds

    await writeDbLog('access', {
      action:            'logout',
      username,
      hospital_code,
      sessionDuration,
      ip
    });
    }

    // Destroy the session and redirect to login page
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        writeDbLog('error', {
        action:   'logout_destroy_error',
        message:  err.message,
        stack:    err.stack,
        ip
      });
        }
        res.redirect(basePath);
    });
});


staffRouter.get('/reset-password', async(req, res) => {
      const ip = req.ip;
  const username = req.session.username;
  const hospital_code = req.session.hospital_code;
  const site_code = req.session.site_code;
    // Check if the user is logged in and has a valid session
    if (!req.session.username) {
    await writeDbLog('error', {
      action:       'reset_password_unauthenticated',
      ip
    });
        req.flash('errorMessage', 'You must be logged in to reset your password.');
        return res.redirect(basePath);
    }
  await writeDbLog('access', {
    action:        'view_reset_password',
    username,
    hospital_code,
    site_code,
    ip
  });
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
      const ip            = req.ip;
  const username      = req.session.username;
  const hospital_code = req.session.hospital_code;
  const site_code     = req.session.site_code;

  // 1️⃣ Log the reset-password attempt
  await writeDbLog('access', {
    action:        'staff_reset_password_attempt',
    username,
    hospital_code,
    site_code,
    ip
  });

    // Validate that passwords match
    if (newPassword !== confirmPassword) {
      await writeDbLog('error', {
      action:        'staff_reset_password_mismatch',
      username,
      hospital_code,
      site_code,
      ip
    });
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
            await writeDbLog('audit', {
      action:        'staff_reset_password_success',
      username,
      hospital_code,
      site_code,
      ip
    });
        req.flash('successMessage', 'Password updated successfully.');
        res.redirect(basePath+'/home');
    } catch (error) {
        console.error('Error resetting password:', error);
            await writeDbLog('error', {
      action:        'staff_reset_password_error',
      username,
      hospital_code,
      site_code,
      message:       error.message,
      stack:         error.stack,
      ip
    });
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
    const ip            = req.ip;
        await writeDbLog('access', {
      action:        'staff_view_edit_appointment',
      username,
      hospital_code,
      site_code,
      hashedMrNo,
      ip
    });
    
    if (!hospital_code || !site_code || !username) {
              await writeDbLog('error', {
        action:        'staff_view_edit_appointment_unauthorized',
        username:      username || 'n/a',
        hospital_code: hospital_code || 'n/a',
        site_code:     site_code || 'n/a',
        hashedMrNo,
        ip
      });
        return res.redirect(basePath);
    }

    try {
        // Fetch patient data from the database using hashed MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ hashedMrNo: hashedMrNo });

        if (!patient) {
          await writeDbLog('error', {
          action:        'staff_edit_appointment_patient_not_found',
          username,
          hospital_code,
          site_code,
          hashedMrNo,
          ip
        });
            return res.status(404).send('Patient not found');
        }

        // Fetch doctor information from the 'staffs' collection
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        if (!doctor) {
          await writeDbLog('error', {
          action:        'staff_edit_appointment_doctor_not_found',
          username,
          hospital_code,
          site_code,
          hashedMrNo,
          ip
        });
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

        // Extract additionalFields object for easier access
        const additionalFields = patient.additionalFields || {};
        
        // Enhanced doctor and specialty extraction
        let doctorName = '';
        let specialtyName = '';
        
        if (patient.specialities && patient.specialities.length > 0) {
            const firstSpecialty = patient.specialities[0];
            specialtyName = firstSpecialty.name || '';
            if (firstSpecialty.doctor_ids && firstSpecialty.doctor_ids.length > 0) {
                doctorName = firstSpecialty.doctor_ids[0];
            }
        }
        
        // Fallback: check if doctor is stored directly in patient object
        if (!doctorName && patient.doctor) {
            doctorName = patient.doctor;
        }
        
        // Fallback: check if specialty is stored directly
        if (!specialtyName && patient.speciality) {
            specialtyName = patient.speciality;
        }
        
        // Fallback: check additionalFields for doctor information
        if (!doctorName && additionalFields.primary_doctor) {
            doctorName = additionalFields.primary_doctor;
        }
        
        console.log('🔍 Doctor and Specialty extraction result:', {
            fromSpecialities: {
                specialty: patient.specialities?.[0]?.name || 'none',
                doctor: patient.specialities?.[0]?.doctor_ids?.[0] || 'none'
            },
            fromPatientDirect: {
                specialty: patient.speciality || 'none',
                doctor: patient.doctor || 'none'
            },
            fromAdditionalFields: additionalFields.primary_doctor || 'none',
            finalResult: {
                specialty: specialtyName || 'none',
                doctor: doctorName || 'none'
            }
        });

        // Create combined doctor display value for readonly field
        const combinedDoctorDisplay = specialtyName && doctorName 
            ? `${specialtyName} - ${doctorName}` 
            : (doctorName || specialtyName || '');

        // Comprehensive patient data mapping including BUPA fields
        const patientData = {
            // Basic identification
            mrNo: patient.Mr_no || '',
            hashedMrNo: patient.hashedMrNo || '',
            
            // Personal information
            fullName: patient.fullName || '',
            // middleName: patient.middleName || '',
            // lastName: patient.lastName || '',
            DOB: patient.DOB || '',
            gender: patient.gender || '',
            
            // Contact information
            phoneNumber: patient.phoneNumber || '',
            email: patient.email || '',
            city: additionalFields.city || '',
            
            // BUPA Insurance information
            bupa_membership_number: additionalFields.bupa_membership_number || '',
            member_type: additionalFields.member_type || '',
            
            // Provider information
            primary_provider_name: additionalFields.primary_provider_name || '',
            primary_provider_code: additionalFields.primary_provider_code || '',
            secondary_provider_name: additionalFields.secondary_provider_name || '',
            secondary_provider_code: additionalFields.secondary_provider_code || '',
            
            // Medical information - Enhanced for readonly display
            speciality: patient.speciality || '', // Individual specialty
            doctor: doctorName, // Individual doctor name
            'speciality-doctor': patient.speciality || '', // Combined for readonly display
            secondary_doctors_name: additionalFields.secondary_doctors_name || '',
            primary_diagnosis: additionalFields.primary_diagnosis || '',
            confirmed_pathway: additionalFields.confirmed_pathway || '',
            care_navigator_name: additionalFields.care_navigator_name || '',
            
            // Contract information
            contract_no: additionalFields.contract_no || '',
            contract_name: additionalFields.contract_name || '',
            
            // Policy information
            policy_status: additionalFields.policy_status || '',
            policy_end_date: additionalFields.policy_end_date || '',
            
            // Appointment information
            datetime: formattedDatetime,
            
            // System information
            surveyStatus: patient.surveyStatus || 'Not Completed',
            hospital_code: patient.hospital_code || hospital_code,
            site_code: patient.site_code || site_code
        };

        // Debug logging for development
        console.log('📋 Patient data with BUPA fields loaded:', {
            mrNo: patientData.mrNo,
            specialty: patientData.speciality,
            doctor: patientData.doctor,
            'speciality-doctor': patientData['speciality-doctor'],
            bupa_membership_number: patientData.bupa_membership_number,
            member_type: patientData.member_type,
            policy_status: patientData.policy_status
        });
      await writeDbLog('audit', {
        action:        'staff_render_edit_appointment_form',
        username,
        hospital_code,
        site_code,
        hashedMrNo,
        ip
      });
        // Render the edit-appointment view with comprehensive patient data
        res.render('edit-appointment', {
            patient: patientData,
            doctor,
            successMessage: req.flash('successMessage'),
            errorMessage: req.flash('errorMessage'),
            lng: res.locals.lng,
            dir: res.locals.dir,
            hospital_code: res.locals.hospital_code,
            site_code: res.locals.site_code,
            username: res.locals.username,
            basePath: basePath || ''
        });
    } catch (error) {
        console.error('Error fetching patient or doctor data:', error);
        await writeDbLog('error', {
        action:        'staff_edit_appointment_error',
        username,
        hospital_code,
        site_code,
        hashedMrNo,
        message:       error.message,
        stack:         error.stack,
        ip
      });
        res.status(500).send('Internal Server Error');
    }
});


staffRouter.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    const manageDoctorsDB = req.manageDoctorsDB; // Get manageDoctorsDB from req
    const ip             = req.ip;

    // Get necessary data from request body and session first
    const { mrNo, fullName, DOB, datetime, speciality, phoneNumber } = req.body;
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;
   
    await writeDbLog('access', {
      action:        'staff_edit_appointment_attempt',
      username,
      hospital_code,
      site_code,
      mrNo,
      ip
    });
        console.log("RAW DOB",DOB);
        const formattedDob = normalizeToNoPadding(DOB)
        console.log("NORMALIZED DOB",formattedDob);

    if (!hospital_code || !site_code || !username) {
        await writeDbLog('error', {
        action:        'staff_edit_appointment_unauthorized',
        username:      username || 'n/a',
        hospital_code: hospital_code || 'n/a',
        site_code:     site_code || 'n/a',
        mrNo:          mrNoBody,
        ip
      });
        return res.redirect(basePath);
    }

    try {
        const {
            mrNo,
            fullName,
            // middleName,
            // lastName,
            DOB,
            phoneNumber,
            datetime,
            speciality, // This might be empty from readonly field
            doctor, // This might be empty from readonly field
            'speciality-doctor': specialityDoctor, // Combined readonly field
            gender,
            email,
            // BUPA and additional fields
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
            care_navigator_name,
            surveyStatus
        } = req.body;

        // ===== FETCH CURRENT PATIENT DATA FIRST =====
        const currentPatient = await req.dataEntryDB.collection('patient_data').findOne({ 
            Mr_no: mrNo.toString().trim(),
            hospital_code: hospital_code,
            site_code: site_code
        });
        
        if (!currentPatient) {
        await writeDbLog('error', {
          action:        'staff_edit_appointment_patient_not_found',
          username,
          hospital_code,
          site_code,
          mrNo,
          ip
        });
            req.flash('errorMessage', 'Patient with MR Number ' + mrNo + ' not found.');
            console.error(`Update Error: Patient ${mrNo} not found.`);
            return res.redirect(`${basePath}/home`);
        }

        console.log('🔍 Current patient specialty data:', {
            directSpecialty: currentPatient.speciality,
            specialitiesArray: currentPatient.specialities,
            fromForm: {
                speciality: speciality,
                doctor: doctor,
                'speciality-doctor': specialityDoctor
            }
        });

        // Enhanced validation for required fields (excluding readonly fields)
        const requiredFields = {
            mrNo: 'National ID',
            fullName: 'Full Name',
            // lastName: 'Last Name',
            DOB: 'Date of Birth',
            phoneNumber: 'Phone Number',
            datetime: 'Appointment Date & Time',
            gender: 'Gender',
            // BUPA required fields
            bupa_membership_number: 'BUPA Membership Number',
            member_type: 'Member Type',
            city: 'City',
            primary_provider_name: 'Primary Provider Name',
            primary_provider_code: 'Primary Provider Code',
            contract_no: 'Contract Number',
            contract_name: 'Contract Name',
            policy_status: 'Policy Status',
            policy_end_date: 'Policy End Date',
            primary_diagnosis: 'Primary Diagnosis'
        };

        // Check for missing required fields
        const missingFields = [];
        for (const [field, label] of Object.entries(requiredFields)) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                missingFields.push(label);
            }
        }

        if (missingFields.length > 0) {
            req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}`);
            // return res.redirect(`${basePath}/edit-appointment?Mr_no=${req.body.hashedMrNo || mrNo}`);
             return res.redirect(`${basePath}/home`);
        }

        // ===== DATETIME FORMAT PRESERVATION =====
        let formattedDatetime = datetime ? datetime.toString().trim() : '';
        
        if (datetime && datetime.toString().trim()) {
            try {
                const date = new Date(datetime.toString().trim());
                if (!isNaN(date.getTime())) {
                    const options = {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    };
                    formattedDatetime = date.toLocaleString('en-US', options);
                    console.log(`DateTime formatted from "${datetime}" to "${formattedDatetime}"`);
                } else {
                    console.warn('Invalid datetime received:', datetime);
                }
            } catch (error) {
                console.warn('Error formatting datetime:', error);
                formattedDatetime = datetime.toString().trim();
            }
        }

        // ===== CHECK IF DATETIME CHANGED =====
        const currentDatetime = currentPatient.datetime;
        const newDatetime = formattedDatetime;
        
        console.log('Checking datetime change:', {
            current: currentDatetime,
            new: newDatetime,
            changed: currentDatetime !== newDatetime
        });

        // ===== PRESERVE SPECIALTY AND DOCTOR DATA =====
        // Extract existing specialty and doctor information
        let preservedSpecialty = '';
        let preservedDoctor = '';

        // Priority 1: From specialities array
        if (currentPatient.specialities && currentPatient.specialities.length > 0) {
            const firstSpecialty = currentPatient.specialities[0];
            preservedSpecialty = firstSpecialty.name || '';
            if (firstSpecialty.doctor_ids && firstSpecialty.doctor_ids.length > 0) {
                preservedDoctor = firstSpecialty.doctor_ids[0] || '';
            }
        }

        // Priority 2: From direct fields if not found in specialities
        if (!preservedSpecialty && currentPatient.speciality) {
            preservedSpecialty = currentPatient.speciality;
        }
        if (!preservedDoctor && currentPatient.doctor) {
            preservedDoctor = currentPatient.doctor;
        }

        console.log('🔐 Preserving specialty data:', {
            specialty: preservedSpecialty,
            doctor: preservedDoctor
        });

        // Build the main update object with preserved specialty/doctor
        const updateData = {
            fullName: fullName.toString().trim(),
            // middleName: middleName ? middleName.toString().trim() : '',
            // lastName: lastName.toString().trim(),
            DOB: formattedDob.toString().trim(),
            phoneNumber: phoneNumber.toString().trim(),
            datetime: formattedDatetime,
           speciality: preservedSpecialty,
            gender: gender.toString().trim(),
            email: email ? email.toString().trim() : '',
            surveyStatus: surveyStatus || 'Not Completed',
            hospital_code: hospital_code,
            site_code: site_code
        };

        // Build the additionalFields object with BUPA fields
        const additionalFieldsUpdate = {
            bupa_membership_number: bupa_membership_number ? bupa_membership_number.toString().trim() : '',
            member_type: member_type ? member_type.toString().trim() : '',
            city: city ? city.toString().trim() : '',
            primary_provider_name: primary_provider_name ? primary_provider_name.toString().trim() : '',
            primary_provider_code: primary_provider_code ? primary_provider_code.toString().trim() : '',
            secondary_provider_name: secondary_provider_name ? secondary_provider_name.toString().trim() : '',
            secondary_provider_code: secondary_provider_code ? secondary_provider_code.toString().trim() : '',
            secondary_doctors_name: secondary_doctors_name ? secondary_doctors_name.toString().trim() : '',
            primary_diagnosis: primary_diagnosis ? primary_diagnosis.toString().trim() : '',
            confirmed_pathway: confirmed_pathway ? confirmed_pathway.toString().trim() : '',
            care_navigator_name: care_navigator_name ? care_navigator_name.toString().trim() : '',
            contract_no: contract_no ? contract_no.toString().trim() : '',
            contract_name: contract_name ? contract_name.toString().trim() : '',
            policy_status: policy_status ? policy_status.toString().trim() : '',
            policy_end_date: policy_end_date ? policy_end_date.toString().trim() : ''
        };

        // Merge additionalFields with existing ones
        const existingAdditionalFields = currentPatient.additionalFields || {};
        const mergedAdditionalFields = {
            ...existingAdditionalFields,
            ...additionalFieldsUpdate
        };

        updateData.additionalFields = mergedAdditionalFields;

        // ===== PRESERVE EXISTING SPECIALITIES ARRAY =====
        if (currentPatient.specialities) {
            if (currentDatetime !== newDatetime) {
                // Update timestamps if datetime changed
                const updatedSpecialities = currentPatient.specialities.map(spec => ({
                    ...spec,
                    timestamp: formattedDatetime
                }));
                updateData.specialities = updatedSpecialities;
                console.log(`✅ Updated specialities timestamp to: ${formattedDatetime}`);
            } else {
                // Keep existing specialities unchanged
                updateData.specialities = currentPatient.specialities;
                console.log(`✅ Preserved existing specialities without changes`);
            }
        }
const changedFields = Object.entries(updateData)
  .filter(([key, newVal]) => {
    const oldVal = currentPatient[key];
    // simple deep‐equality check
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  })
  .map(([key]) => key);
  console.log("EDITED FIELDS",changedFields);
        // ===== PERFORM THE DATABASE UPDATE =====
        const result = await req.dataEntryDB.collection('patient_data').updateOne(
            { 
                Mr_no: mrNo.toString().trim(),
                hospital_code: hospital_code,
                site_code: site_code
            },
            { $set: updateData }
        );
      await writeDbLog('audit', {
        action:        'staff_edit_appointment_success',
        username,
        hospital_code,
        site_code,
        mrNo,
        changedFields,
        ip
      });
        if (result.matchedCount === 0) {
            // This case should ideally not happen if the user came from the edit page,
            // but handle it just in case.
            req.flash('errorMessage', 'Patient with MR Number ' + mrNo + ' not found during update.');
            console.error(`Update Error: Patient ${mrNo} not found.`);
             // Redirect to a page where the user can see the error
            return res.redirect(basePath + '/home');
        }

        // Set success messages
        if (result.modifiedCount === 0) {
            req.flash('successMessage', 'No changes were made to the patient record');
        } else {
            if (currentDatetime !== newDatetime) {
                req.flash('successMessage', 'Patient data updated successfully.');
                console.log(`✅ Patient ${mrNo} updated with BUPA fields - Baseline: "${currentDatetime}" → "${newDatetime}"`);
            } else {
                req.flash('successMessage', 'Patient data updated successfully');
            }
            console.log(`✅ Patient ${mrNo} updated successfully by user ${username} with BUPA fields`);
        }

        // Redirect back to the dashboard
        res.redirect(`${basePath}/home`);

    } catch (error) {
        const timestamp = new Date().toISOString();
        console.error('Error updating patient with BUPA fields:', error);
              await writeDbLog('error', {
        action:        'staff_api_edit_error',
        username,
        hospital_code,
        site_code,
        mrNo,
        message:       error.message,
        stack:         error.stack,
        ip
      });
        req.flash('errorMessage', 'An error occurred while updating the patient information');
        res.redirect(`${basePath}/home`);
    }
});


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

function normalizeToNoPadding(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;     // not in expected format
  const [mo, da, yr] = parts;
  // parseInt will strip any leading zeros
  const m = parseInt(mo, 10);
  const d = parseInt(da, 10);
  return `${m}/${d}/${yr}`;
}

// staffRouter.post('/bupa/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const { Mr_no, fullName,  DOB, datetime, phoneNumber, email, gender,bupa_membership_number,member_type,
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
//         const username = req.session.username;
//         console.log("RAW DOB",DOB);

//           const formattedDob = normalizeToNoPadding(DOB)
//           console.log("NORMALIZED DOB",formattedDob);

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = req.body['speciality-doctor'].split('||');


//         // --- Start: Input Validation ---
//         if (!Mr_no || !fullName || !formattedDob || !datetime || !phoneNumber || !speciality || !doctorId) {
//             let missingFields = [];
//             if (!Mr_no) missingFields.push('National ID');
//             if (!fullName) missingFields.push('Full Name');
//             if (!formattedDob) missingFields.push('Date of Birth');
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
//         const saudiTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Riyadh"}));
//         const creationDetails = {
//             created_at: saudiTime,
//             created_by: username 
//         };

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
//         const patient = await collection.findOne({ Mr_no });

//             // Fix: Load existing appointment tracker
//             let existingAppointmentTracker = patient?.appointment_tracker || {};
//             let appointment_tracker = { ...existingAppointmentTracker };

//             try {
//                 const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });

//                 if (specialitySurveys?.surveys?.length > 0) {

//                     // Skip if this speciality already exists for the patient
//                     if (!appointment_tracker[speciality]) {
//                         let sortedSurveys = {};
//                         specialitySurveys.surveys.forEach(survey => {
//                             if (Array.isArray(survey.selected_months)) {
//                                 survey.selected_months.forEach(month => {
//                                     if (!sortedSurveys[month]) sortedSurveys[month] = [];
//                                     sortedSurveys[month].push(survey.survey_name);
//                                 });
//                             }
//                         });

//                         let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
//                         let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
//                         let firstAppointmentTime = new Date(appointmentDateObj);
//                         let lastAppointmentTime = new Date(firstAppointmentTime);

//                         appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                             let trackerAppointmentTime;

//                             if (index === 0) {
//                                 trackerAppointmentTime = new Date(firstAppointmentTime);
//                             } else {
//                                 let previousMonth = parseInt(sortedMonths[index - 1]);
//                                 let currentMonth = parseInt(month);
//                                 if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
//                                     let monthDifference = currentMonth - previousMonth;
//                                     trackerAppointmentTime = new Date(lastAppointmentTime);
//                                     trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
//                                     lastAppointmentTime = new Date(trackerAppointmentTime);
//                                 } else {
//                                     trackerAppointmentTime = new Date(lastAppointmentTime);
//                                 }
//                             }

//                             const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);

//                             const completed_in_appointment = {};
//                             if (Array.isArray(sortedSurveys[month])) {
//                                 sortedSurveys[month].forEach(surveyName => {
//                                     completed_in_appointment[surveyName] = false;
//                                 });
//                             }

//                             return {
//                                 month,
//                                 survey_name: sortedSurveys[month],
//                                 surveyType: surveyTypeLabels[index],
//                                 appointment_time: formattedTrackerTime,
//                                 surveyStatus: "Not Completed",
//                                 completed_in_appointment
//                             };
//                         });
//                     } else {
//                         console.log(`Specialty "${speciality}" already exists, skipping appointment_time update.`);
//                     }
//                 }
//             } catch (trackerError) {
//                 console.error(`Tracker Error Row ${rowNumber}:`, trackerError);
//             }

//         // Find existing patient data
//         //const patient = await collection.findOne({ Mr_no });
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
//         const patientFullName = `${fullName}`.trim(); // Prepare patient name string

//         // --- Start: DB Upsert Logic ---
//         if (patient) {
//             // Existing Patient Update
//              isNewPatient = false;
             
//              console.log(`API Data: Patient ${Mr_no} found, updating.`);
//              // Determine survey status
//             // const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
//             //  updatedSurveyStatus = patient.surveyStatus;
//             //  if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
//             //      const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
//             //      const isSpecialityChanged = patient.speciality !== speciality;
//             //      if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
//             //  } else { updatedSurveyStatus = "Not Completed"; }
//             const trackerEntries = patient?.appointment_tracker?.[speciality] || [];
//             const dateTimeFromFormInput = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')); // datetime from form input

//             let followupDueSoonOrPassed = false;
//             trackerEntries.forEach(entry => {
//                 if (!entry.surveyType || !entry.appointment_time) return;
//                 if (entry.surveyType.toLowerCase().includes("baseline")) return;

//                 const apptTime = new Date(entry.appointment_time.replace(/(\d)([APap][Mm])$/, '$1 $2'));
//                 if (isNaN(apptTime)) return;

//                 const sevenDaysBefore = new Date(apptTime);
//                 sevenDaysBefore.setDate(apptTime.getDate() - 7);

//                 if (dateTimeFromFormInput >= sevenDaysBefore) {
//                     console.log(`📌 Follow-up '${entry.surveyType}' scheduled for ${apptTime}, comparing with CSV time ${dateTimeFromFormInput} ✅`);
//                     followupDueSoonOrPassed = true;
//                 }
//             });
//             updatedSurveyStatus = patient.surveyStatus; // start with existing status
//             // Case 1: Check if follow-up is due soon or passed
//             if (followupDueSoonOrPassed) {
//                 updatedSurveyStatus = "Not Completed";
//                 console.log(`✅ Updating surveyStatus to 'Not Completed' because follow-up is due soon or has passed.`);
//             }

//             // Case 2: Check if specialty has changed
//             if (patient.speciality !== speciality) {
//                 updatedSurveyStatus = "Not Completed";
//                 console.log(`✅ Updating surveyStatus to 'Not Completed' because specialty changed from "${patient.speciality}" to "${speciality}".`);
//             }

//             else {
//                 console.log(`🛑 No change to surveyStatus: ${patient.surveyStatus}`);
//             }

//              // Update specialities array
//              let updatedSpecialities = patient.specialities || [];
//              const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//              if (specialityIndex !== -1) {
//                  updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
//                  if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                      updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                  }
//              } else {
//                  updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId], creation_details: creationDetails });
//              }

//              // Perform Update
//              await collection.updateOne({ Mr_no }, {
//                  $set: {
//                      fullName, gender, DOB:formattedDob,
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
//                  Mr_no, fullName, gender, DOB:formattedDob,
//                  datetime: formattedDatetime, // Store formatted string
//                  specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId], creation_details: creationDetails }], // Store Date object
//                  speciality, phoneNumber, email,
//                  hospital_code, site_code,additionalFields,
//                  surveyStatus: updatedSurveyStatus,
//                  hashedMrNo, surveyLink,
//                  appointment_tracker,
//                  creation_details: creationDetails,
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

            

//      } else if (notificationPreference?.toLowerCase() === 'third_party_api') {
//   console.log(`[BupaIntegration] third_party_api for ${Mr_no} — sending to Bupa…`);

// // 1. Construct the patient data payload for Bupa.
//                 const patientDataForBupaApi = [{
//                 "nationalId": Mr_no,
//                 "name": fullName,
//                 "phoneNumber": phoneNumber,
//                 "surveyLink": surveyLink
//                 }];
//             console.log("SINGLE UPLOAD PAYLOAD SENT TO BUPA:",patientDataForBupaApi);



//             const bupaTemplateName = isNewPatient ? 'wh_baseline' : 'wh_follow-up';
//             const payload = { template: bupaTemplateName, data: patientDataForBupaApi };

//             try {
//                 // send to Bupa
//                 await sendWhatsAppDataToBupaProvider(payload);
//                 console.log(`[BupaIntegration] queued for ${Mr_no} with template ${bupaTemplateName}`);

//                 // now record it in whatsappLogs so the dashboard will show “Last Sent”
//                 await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $push: {
//                     whatsappLogs: {
//                         type:'api_creation',
//                         speciality,
//                         appointment_time: formattedDatetime,
//                         timestamp:        new Date()
//                     }
//                     },
//                     // optionally bump your counter
//                     $inc: { SurveySent: 1 }
//                 }
//                 );
//                 console.log(`[BupaIntegration] log written to whatsappLogs for ${Mr_no}`);
//             } catch (err) {
//                 console.error(`[BupaIntegration] error sending/logging for ${Mr_no}:`, err);
//             }
//             }
//  else if (notificationPreference) {
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
//                      await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, fullName, doctorName);
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
//             { header: 'Full Name', key: 'fullName', width: 15 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 18 },
//             { header: 'Survey Link', key: 'surveyLink', width: 50 },
//             //{ header: 'Notification Sent', key: 'notificationSent', width: 18 },
//         ];

//         sheet.addRow({
//             Mr_no,
//             fullName,
//             phoneNumber,
//             surveyLink,
//             //notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
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


staffRouter.post('/bupa/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const { Mr_no, fullName,  DOB, datetime, phoneNumber, email, gender,bupa_membership_number,member_type,
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
        const username = req.session.username;
        const ip            = req.ip;
          await writeDbLog('access', {
    action:        'bupa_data_entry_attempt',
    username,
    hospital_code,
    site_code,
    Mr_no,
    ip
  });
        console.log("RAW DOB",DOB);

          const formattedDob = normalizeToNoPadding(DOB)
          console.log("NORMALIZED DOB",formattedDob);

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');


        // --- Start: Input Validation ---
        if (!Mr_no || !fullName || !formattedDob || !datetime || !phoneNumber || !speciality || !doctorId) {
            let missingFields = [];
            if (!Mr_no) missingFields.push('National ID');
            if (!fullName) missingFields.push('Full Name');
            if (!formattedDob) missingFields.push('Date of Birth');
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
      await writeDbLog('error', {
        action:        'bupa_data_entry_validation_error',
        username,
        hospital_code,
        site_code,
        Mr_no,
        missingFields: missing,
        ip
      });
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
        const saudiTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Riyadh"}));
        const creationDetails = {
            created_at: saudiTime,
            created_by: username 
        };

        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor, ensure they belong to the session's hospital/site
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
        if (!doctor) {
             req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
             console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
                   await writeDbLog('error', {
        action:        'bupa_data_entry_doctor_not_found',
        username,
        hospital_code,
        site_code,
        Mr_no,
        ip
      });
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
            }
            catch (trackerError) {
                // ** FIXED: Removed reference to non-existent 'rowNumber' variable **
                console.error(`Tracker Error for MRN ${Mr_no}:`, trackerError);
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

        // const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        // const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        // let updatedSurveyStatus = "Not Completed"; // Default for new or reset
        // let isNewPatient = false;
        // const patientFullName = `${fullName}`.trim(); // Prepare patient name string


        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        // ** NEW: Create the Appointment_History object to be used in both insert and update cases **
        const appointmentHistoryObject = {
            Mr_no,
            speciality,
            appointment: 'no-show', // Default value
            appointment_time: formattedDatetime,
            created_by: username,
            created_at: new Date() // UTC timestamp
        };

        const patientFullName = `${fullName}`.trim(); // Prepare patient name string
        let isNewPatient = !patient; // Note: moved patient query up
        let triggerBupaNotification = false; // ** NEW: Flag to control notification **

        let updatedSurveyStatus; // ** NEW: Declare the variable here **


        // // --- Start: DB Upsert Logic ---
        // if (patient) {
        //     // Existing Patient Update
        //      isNewPatient = false;
             
        //      console.log(`API Data: Patient ${Mr_no} found, updating.`);
        //      // Determine survey status
        //     // const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
        //     //  updatedSurveyStatus = patient.surveyStatus;
        //     //  if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
        //     //      const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
        //     //      const isSpecialityChanged = patient.speciality !== speciality;
        //     //      if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
        //     //  } else { updatedSurveyStatus = "Not Completed"; }
        //     const trackerEntries = patient?.appointment_tracker?.[speciality] || [];
        //     const dateTimeFromFormInput = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')); // datetime from form input

        //     let followupDueSoonOrPassed = false;
        //     trackerEntries.forEach(entry => {
        //         if (!entry.surveyType || !entry.appointment_time) return;
        //         if (entry.surveyType.toLowerCase().includes("baseline")) return;

        //         const apptTime = new Date(entry.appointment_time.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        //         if (isNaN(apptTime)) return;

        //         const sevenDaysBefore = new Date(apptTime);
        //         sevenDaysBefore.setDate(apptTime.getDate() - 7);

        //         if (dateTimeFromFormInput >= sevenDaysBefore) {
        //             console.log(`📌 Follow-up '${entry.surveyType}' scheduled for ${apptTime}, comparing with CSV time ${dateTimeFromFormInput} ✅`);
        //             followupDueSoonOrPassed = true;
        //         }
        //     });
        //     updatedSurveyStatus = patient.surveyStatus; // start with existing status
        //     // Case 1: Check if follow-up is due soon or passed
        //     if (followupDueSoonOrPassed) {
        //         updatedSurveyStatus = "Not Completed";
        //         console.log(`✅ Updating surveyStatus to 'Not Completed' because follow-up is due soon or has passed.`);
        //     }

        //     // Case 2: Check if specialty has changed
        //     if (patient.speciality !== speciality) {
        //         updatedSurveyStatus = "Not Completed";
        //         console.log(`✅ Updating surveyStatus to 'Not Completed' because specialty changed from "${patient.speciality}" to "${speciality}".`);
        //     }

        //     else {
        //         console.log(`🛑 No change to surveyStatus: ${patient.surveyStatus}`);
        //     }

        //      // Update specialities array
        //      let updatedSpecialities = patient.specialities || [];
        //      const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
        //      if (specialityIndex !== -1) {
        //          updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
        //          if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
        //              updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
        //          }
        //      } else {
        //          updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId], creation_details: creationDetails });
        //      }

        //      // Perform Update
        //      await collection.updateOne({ Mr_no }, {
        //          $set: {
        //              fullName, gender, DOB:formattedDob,
        //              datetime: formattedDatetime, // Store formatted string
        //              specialities: updatedSpecialities, // Store array with Date objects
        //              speciality, phoneNumber, email,
        //              hospital_code, site_code,additionalFields,
        //              surveyStatus: updatedSurveyStatus,
        //              appointment_tracker,
        //          },
        //          $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
        //      });

        // }

        if (patient) {
            // ========== START: EXISTING PATIENT (UPDATE) LOGIC ==========
            isNewPatient = false;
            let appointment_tracker = patient.appointment_tracker || {}; // Start with existing tracker

            // ** CHANGED: Check if the specialty is new for this patient **
            if (!appointment_tracker[speciality]) {
                console.log(`[BUPA API] New specialty ('${speciality}') detected for existing patient ${Mr_no}. Adding new appointment tracker.`);
                triggerBupaNotification = true; // ** Trigger notification for new specialty **

                // Calculate and add the tracker ONLY for the new specialty
                // const specialitySurveys = await surveysCollection.findOne({ specialty, hospital_code, site_code });
                const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
                if (specialitySurveys?.surveys?.length > 0) {
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
                            let monthDifference = currentMonth - previousMonth;
                            trackerAppointmentTime = new Date(lastAppointmentTime);
                            trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                            lastAppointmentTime = new Date(trackerAppointmentTime);
                        }
                        const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
                        const completed_in_appointment = {};
                        if (Array.isArray(sortedSurveys[month])) {
                            sortedSurveys[month].forEach(surveyName => {
                                completed_in_appointment[surveyName] = false;
                            });
                        }
                        return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed", completed_in_appointment };
                    });
                }
            } else {
                 console.log(`[BUPA API] Existing specialty ('${speciality}') for patient ${Mr_no}. NOT modifying appointment tracker or sending notification.`);
            }

            // ** CHANGED: surveyStatus is now preserved, not recalculated **
            // const updatedSurveyStatus = patient.surveyStatus;
            updatedSurveyStatus = patient.surveyStatus;

            let updatedSpecialities = patient.specialities || [];
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                updatedSpecialities[specialityIndex].timestamp = formattedDatetime;
                if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                    updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                }
            } else {
                updatedSpecialities.push({ name: speciality, timestamp: formattedDatetime, doctor_ids: [doctorId], creation_details: creationDetails });
            }

            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        fullName, gender, DOB: formattedDob,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality, phoneNumber, email,
                        hospital_code, site_code, additionalFields,
                        surveyStatus: updatedSurveyStatus, // Preserved status
                        appointment_tracker, // Updated only if specialty was new
                    },
                    // ** NEW: Always push to the appointment history **
                    $push: {
                        Appointment_History: appointmentHistoryObject
                    },
                    $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
                }
            );
            // ========== END: EXISTING PATIENT (UPDATE) LOGIC ==========
        }

        
        // else {
        //     // New Patient Insert
        //      isNewPatient = true;
        //      console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
        //      updatedSurveyStatus = "Not Completed";
        //      await collection.insertOne({
        //          Mr_no, fullName, gender, DOB:formattedDob,
        //          datetime: formattedDatetime, // Store formatted string
        //          specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId], creation_details: creationDetails }], // Store Date object
        //          speciality, phoneNumber, email,
        //          hospital_code, site_code,additionalFields,
        //          surveyStatus: updatedSurveyStatus,
        //          hashedMrNo, surveyLink,
        //          appointment_tracker,
        //          creation_details: creationDetails,
        //          SurveySent: 0, // Initialize count
        //          smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
        //      });
        // }

        else {
            // ========== START: NEW PATIENT (INSERT) LOGIC ==========
            isNewPatient = true;
            triggerBupaNotification = true; // ** NEW: Trigger notification for new patient **
            
            // const updatedSurveyStatus = "Not Completed";
            updatedSurveyStatus = "Not Completed";

            console.log(`[BUPA API] Patient ${Mr_no} not found, inserting.`);
            let appointment_tracker = {};
            const surveysCollection = docDB.collection('surveys');
            // const specialitySurveys = await surveysCollection.findOne({ specialty, hospital_code, site_code });
            const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });
            if (specialitySurveys?.surveys?.length > 0) {
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
                            let monthDifference = currentMonth - previousMonth;
                            trackerAppointmentTime = new Date(lastAppointmentTime);
                            trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                            lastAppointmentTime = new Date(trackerAppointmentTime);
                        }
                        const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
                        const completed_in_appointment = {};
                        if (Array.isArray(sortedSurveys[month])) {
                            sortedSurveys[month].forEach(surveyName => {
                                completed_in_appointment[surveyName] = false;
                            });
                        }
                        return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed", completed_in_appointment };
                    });
            }

            await collection.insertOne({
                Mr_no, fullName, gender, DOB:formattedDob,
                datetime: formattedDatetime,
                specialities: [{ name: speciality, timestamp: formattedDatetime, doctor_ids: [doctorId], creation_details: creationDetails }],
                speciality, phoneNumber, email,
                hospital_code, site_code, additionalFields,
                surveyStatus: "Not Completed",
                hashedMrNo, surveyLink,
                appointment_tracker,
                creation_details: creationDetails,
                // ** NEW: Initialize the appointment history array **
                Appointment_History: [appointmentHistoryObject],
                SurveySent: 0,
                smsLogs: [], emailLogs: [], whatsappLogs: []
            });
	    // ========== END: NEW PATIENT (INSERT) LOGIC ==========
                           await writeDbLog('audit', {
        action:        'bupa_data_entry_insert_success',
        username,
        hospital_code,
        site_code,
        Mr_no,
        ip
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

            

     } 
//      else if (notificationPreference?.toLowerCase() === 'third_party_api') {
//   console.log(`[BupaIntegration] third_party_api for ${Mr_no} — sending to Bupa…`);

// // 1. Construct the patient data payload for Bupa.
//                 const patientDataForBupaApi = [{
//                 "nationalId": Mr_no,
//                 "name": fullName,
//                 "phoneNumber": phoneNumber,
//                 "surveyLink": surveyLink
//                 }];
//             console.log("SINGLE UPLOAD PAYLOAD SENT TO BUPA:",patientDataForBupaApi);



//             const bupaTemplateName = isNewPatient ? 'wh_baseline' : 'wh_follow-up';
//             const payload = { template: bupaTemplateName, data: patientDataForBupaApi };

//             try {
//                 // send to Bupa
//                 await sendWhatsAppDataToBupaProvider(payload);
//                 console.log(`[BupaIntegration] queued for ${Mr_no} with template ${bupaTemplateName}`);

//                 // now record it in whatsappLogs so the dashboard will show “Last Sent”
//                 await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $push: {
//                     whatsappLogs: {
//                         type:'api_creation',
//                         speciality,
//                         appointment_time: formattedDatetime,
//                         timestamp:        new Date()
//                     }
//                     },
//                     // optionally bump your counter
//                     $inc: { SurveySent: 1 }
//                 }
//                 );
//                 console.log(`[BupaIntegration] log written to whatsappLogs for ${Mr_no}`);
//             } catch (err) {
//                 console.error(`[BupaIntegration] error sending/logging for ${Mr_no}:`, err);
//             }
//             }

 else if (notificationPreference?.toLowerCase() === 'third_party_api') {
            // ** CHANGED: Notification is now conditional **
            if (triggerBupaNotification) {
                console.log(`[BUPA API] Triggering Bupa notification for ${Mr_no}. Reason: ${isNewPatient ? 'New Patient' : 'New Specialty'}`);
                
                // ** The template is ALWAYS baseline now for this trigger **
                const bupaTemplateName = 'wh_baseline';
                
                const patientDataForBupaApi = [{
                    "nationalId": Mr_no,
                    "name": fullName,
                    "phoneNumber": phoneNumber,
                    "surveyLink": surveyLink
                }];
            console.log("SINGLE UPLOAD PAYLOAD SENT TO BUPA:",patientDataForBupaApi);

                const payload = { template: bupaTemplateName, data: patientDataForBupaApi };

                try {
                    await sendWhatsAppDataToBupaProvider(payload);
                    await collection.updateOne({ Mr_no }, {
                        $push: { whatsappLogs: { type: 'manual-entry', speciality, appointment_time: formattedDatetime, timestamp: new Date() } },
                        $inc: { SurveySent: 1 }
                    });
                    console.log(`[Bupa API] Log written to whatsappLogs for ${Mr_no}`);
                } catch (err) {
                    console.error(`[BUPA API] Error sending/logging notification for ${Mr_no}:`, err);
                }
            } else {
                 console.log(`[BUPA API] Notification SKIPPED for existing patient/specialty combo for MRN: ${Mr_no}`);
            }
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
                         $push: { smsLogs: { type: "manual-entry", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
             }

             // --- Attempt to Send Email ---
             if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
                 try {
                     await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, fullName, doctorName);
                     console.log(`API Data: Email sent successfully for ${Mr_no}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { emailLogs: { type: "manual-entry", speciality: speciality, timestamp: new Date() } },
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
                                //   statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
                                statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
                              });
                              console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                              await collection.updateOne({ Mr_no }, {
                                  $push: { whatsappLogs: { type: "manual-entry", speciality: speciality, timestamp: new Date(), sid: message.sid } },
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
            { header: 'Full Name', key: 'fullName', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 18 },
            { header: 'Survey Link', key: 'surveyLink', width: 50 },
            //{ header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        sheet.addRow({
            Mr_no,
            fullName,
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
    await writeDbLog('error', {
      action:        'bupa_data_entry_error',
      username,
      hospital_code,
      site_code,
      Mr_no: req.body.Mr_no,
      message:       error.message,
      stack:         error.stack,
      ip
    });
        req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
        res.redirect(basePath + '/data-entry'); // Redirect on error as well
    }
});



function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return phoneNumber;
    
    // Convert to string and remove any non-digit characters
    let cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    // Handle different scenarios:
    if (cleaned.length === 9) {
        // 9 digits - add leading zero
        return '0' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
        // 10 digits starting with 0 - already correct
        return cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('966')) {
        // International format (966xxxxxxxxx) - convert to local
        return '0' + cleaned.substring(3);
    } else if (cleaned.length === 13 && cleaned.startsWith('+966')) {
        // International format with + - convert to local
        return '0' + cleaned.substring(4);
    }
    
    // Return original if none of the above patterns match
    return phoneNumber;
}

function normalizeDOB(dob) {
    if (!dob) return dob;
    
    let dobString = dob.toString().trim();
    const dobRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dobString.match(dobRegex);
    
    if (match) {
        const [, month, day, year] = match;
        // Remove leading zeros by converting to number then back to string
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    
    return dob;
}

function validateBupaFields(record) {
    const errors = [];
    
    // Normalize DOB before validation
    if (record.DOB) {
        record.DOB = normalizeDOB(record.DOB);
    }

    // Validate BUPA Membership Number
    if (record.bupaMembershipNumber && !/^\d{7,8}$/.test(record.bupaMembershipNumber)) {
    errors.push('Invalid BUPA Membership Number (must be 7 or 8 digits)');
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
    if (record.policyStatus && !['Active', 'Terminated','active','terminated'].includes(record.policyStatus)) {
        errors.push('Invalid Policy Status (must be Active or Terminated)');
    }
    
    // Auto-correct and validate phone number
    if (record.phoneNumber) {
        const originalPhone = record.phoneNumber;
        record.phoneNumber = normalizePhoneNumber(record.phoneNumber);
        
        if (originalPhone !== record.phoneNumber) {
            console.log(`Auto-corrected phone number: ${originalPhone} -> ${record.phoneNumber}`);
        }
        
        // Validate the normalized phone number
        if (!/^0\d{9}$/.test(record.phoneNumber)) {
            errors.push('Invalid phone number format (must be 10 digits starting with 0)');
        }
    }
    
    
    // Validate text fields (alphabets only)
    const textFields = ['member_type', 'city', 'primaryProviderName', 'secondaryProviderName', 'secondaryDoctorsName', 'contractName', 'primary_diagnosis', 'confirmedPathway', 'careNavigatorName','fullName'];
    
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

  // 1) Only run if both fields are present
  const endDateStr = record.policy_end_date;
  const status    = record.policy_status;

  if (endDateStr && status) {
    // 2) Enforce MM/DD/YYYY
    const mmddyyyyRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!mmddyyyyRegex.test(endDateStr)) {
      errors.push('Invalid Policy End Date Format');
    } else {
      // 3) Parse safely
      const [mm, dd, yyyy] = endDateStr.split('/').map(s => parseInt(s, 10));
      const endDate = new Date(yyyy, mm - 1, dd);
      const today   = new Date();

      // 4) Compare against status
    //   const lowerStatus = status.toLowerCase();
    //   if (endDate < today && lowerStatus === 'active') {
    //     errors.push('Policy shows Active but end date has already passed');
    //   }
    //   if (endDate > today && lowerStatus === 'terminated') {
    //     errors.push('Policy shows Terminated but end date is in the future');
    //   }
    }
  }

  // 5) Secondary provider consistency
  if (record.secondary_provider_code && !record.secondary_provider_name) {
    errors.push('Secondary Provider Code provided without a Name');
  }
  if (record.secondary_provider_name && !record.secondary_provider_code) {
    errors.push('Secondary Provider Name provided without a Code');
  }

  return errors;
}


function isValidProvider(name, code, providers) {
    return providers.some(provider => 
        String(provider.primary_provider_name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase() &&
        String(provider.primary_provider_code || '').trim() === String(code || '').trim()
    );
}

// function normalizeDateTime(datetimeStr) {
//     if (!datetimeStr) return datetimeStr;
    
//     // Remove any existing comma and extra spaces, then add comma in the correct position
//     const cleaned = datetimeStr.replace(/\s*,\s*/, ' ').trim();
    
//     // Split by space to separate date and time parts
//     const parts = cleaned.split(/\s+/);
//     if (parts.length >= 3) {
//         // Reconstruct with comma: "mm/dd/yyyy , hh:mm AM/PM"
//         const date = parts[0];
//         const time = parts[1];
//         const period = parts[2];
//         return `${date} , ${time} ${period}`;
//     }
    
//     return datetimeStr; // Return original if parsing fails
// }

// Add this helper function at the top of your route handler (after headerMapping)
function generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function generateTimestampedFileName(prefix, originalName) {
    const timestamp = generateTimestamp();
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    
    return `${prefix}_${timestamp}_${baseName}${fileExtension}`;
}

// Add this helper function near your other helper functions
async function createFilteredCSV(successfullyProcessed, csvData, originalHeaders, targetPath) {
    try {
        // Get the original CSV headers
        const headers = originalHeaders || Object.keys(csvData[0] || {});
        
        // Filter only successfully processed records
        const successfulRecords = successfullyProcessed.map(item => {
            const rowIndex = item.rowNumber - 2; // Convert back to array index
            return csvData[rowIndex];
        });

        // Create CSV content
        const csvContent = [
            headers.join(','), // Header row
            ...successfulRecords.map(record => {
                return headers.map(header => {
                    const value = record[header] || '';
                    // Escape values that contain commas or quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',');
            })
        ].join('\n');

        // Write the filtered CSV
        await fsPromises.writeFile(targetPath, csvContent, 'utf8');
        
        console.log(`Created filtered CSV with ${successfulRecords.length} successful records at: ${targetPath}`);
        return { success: true, recordCount: successfulRecords.length };
    } catch (error) {
        console.error('Error creating filtered CSV:', error);
        return { success: false, error: error.message };
    }
}

// Add these timezone helper functions near your other helper functions

function getSaudiTimestamp() {
    const now = new Date();
    // Saudi Arabia is GMT+3 (AST - Arabia Standard Time)
    const saudiTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    
    const year = saudiTime.getUTCFullYear();
    const month = String(saudiTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(saudiTime.getUTCDate()).padStart(2, '0');
    const hours = String(saudiTime.getUTCHours()).padStart(2, '0');
    const minutes = String(saudiTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(saudiTime.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} AST (GMT+3)`;
}

function getIndianTimestamp() {
    const now = new Date();
    // India is GMT+5:30 (IST - Indian Standard Time)
    const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const year = indianTime.getUTCFullYear();
    const month = String(indianTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(indianTime.getUTCDate()).padStart(2, '0');
    const hours = String(indianTime.getUTCHours()).padStart(2, '0');
    const minutes = String(indianTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(indianTime.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} IST (GMT+5:30)`;
}

function getUTCTimestamp() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

// Add this helper function at the top of your route handler (after headerMapping)
async function moveFileToStorage(sourcePath, targetDir, fileName, operation = 'unknown', metadata = {}, successfullyProcessed = null, csvData = null, originalHeaders = null) {
    try {
        // Ensure target directory exists
        await fsPromises.mkdir(targetDir, { recursive: true });
        
        const targetPath = path.join(targetDir, fileName);
        
        // For successful operations, create filtered CSV with only processed records
        if (operation === 'success' && successfullyProcessed && successfullyProcessed.length > 0 && csvData) {
            console.log(`Creating filtered CSV for ${successfullyProcessed.length} successful records...`);
            const filterResult = await createFilteredCSV(successfullyProcessed, csvData, originalHeaders, targetPath);
            
            if (!filterResult.success) {
                // Fallback to original file if filtering fails
                console.warn('Filtered CSV creation failed, using original file');
                await fsPromises.rename(sourcePath, targetPath);
            } else {
                // Delete the original temp file since we created a new filtered one
                await fsPromises.unlink(sourcePath).catch(err => 
                    console.warn('Could not delete temp file after filtering:', err.message)
                );
            }
        } else {
            // For validation, skip, or error operations, move the original file
            await fsPromises.rename(sourcePath, targetPath);
        }
        
        // Create metadata file with timestamp and processing info
        const metadataFileName = fileName.replace(path.extname(fileName), '_metadata.json');
        const metadataPath = path.join(targetDir, metadataFileName);
        
        const fileMetadata = {
            originalFileName: metadata.originalFileName || fileName,
            uploadedAt: {
                utc: getUTCTimestamp(),
                saudi: getSaudiTimestamp(),
                indian: getIndianTimestamp()
            },
            processedAt: {
                utc: getUTCTimestamp(),
                saudi: getSaudiTimestamp(),
                indian: getIndianTimestamp()
            },
            operation: operation,
            status: 'success',
            hospitalCode: metadata.hospitalCode || null,
            siteCode: metadata.siteCode || null,
            totalRecords: metadata.totalRecords || 0,
            processedRecords: metadata.processedRecords || 0,
            failedRecords: metadata.failedRecords || 0,
            recordsInStoredFile: operation === 'success' && successfullyProcessed ? successfullyProcessed.length : metadata.totalRecords,
            filePath: targetPath,
            fileSize: null // Will be populated after file stats
        };
        
        try {
            const stats = await fsPromises.stat(targetPath);
            fileMetadata.fileSize = stats.size;
        } catch (statError) {
            console.warn(`Could not get file stats for ${targetPath}:`, statError.message);
        }
        
        // Write metadata file
        await fsPromises.writeFile(metadataPath, JSON.stringify(fileMetadata, null, 2));
        
        console.log(`CSV Upload (${operation}): Successfully ${operation === 'success' ? 'created filtered file' : 'moved file'} to ${targetPath} with metadata`);
        return { 
            success: true, 
            path: targetPath, 
            metadataPath: metadataPath,
            metadata: fileMetadata 
        };
    } catch (moveError) {
        console.error(`CSV Upload (${operation}): Error processing file from ${sourcePath} to ${targetDir}/${fileName}:`, moveError);
        
        // Fallback: try to copy and then delete
        try {
            await fsPromises.mkdir(targetDir, { recursive: true });
            const targetPath = path.join(targetDir, fileName);
            await fsPromises.copyFile(sourcePath, targetPath);
            await fsPromises.unlink(sourcePath);
            
            // Create metadata for fallback case
            const metadataFileName = fileName.replace(path.extname(fileName), '_metadata.json');
            const metadataPath = path.join(targetDir, metadataFileName);
            
            const fileMetadata = {
                ...metadata,
                originalFileName: metadata.originalFileName || fileName,
                uploadedAt: {
                    utc: getUTCTimestamp(),
                    saudi: getSaudiTimestamp(),
                    indian: getIndianTimestamp()
                },
                processedAt: {
                    utc: getUTCTimestamp(),
                    saudi: getSaudiTimestamp(),
                    indian: getIndianTimestamp()
                },
                operation: operation,
                status: 'success_fallback',
                note: 'File moved using copy+delete fallback method',
                filePath: targetPath
            };
            
            await fsPromises.writeFile(metadataPath, JSON.stringify(fileMetadata, null, 2));
            
            console.log(`CSV Upload (${operation}): Successfully copied and deleted original file to ${targetPath}`);
            return { 
                success: true, 
                path: targetPath, 
                metadataPath: metadataPath,
                metadata: fileMetadata 
            };
        } catch (fallbackError) {
            console.error(`CSV Upload (${operation}): Fallback copy/delete also failed:`, fallbackError);
            
            // Last resort: try to delete the original file
            await fsPromises.unlink(sourcePath).catch(err => 
                console.error(`CSV Upload (${operation}): Failed to delete original file:`, err)
            );
            return { success: false, error: fallbackError.message };
        }
    }
}

// Global DateTime Handler - Handles all date and time field conversions
function processDateTimeField(value, fieldType, rowNumber = null) {
    // Return empty string for null/undefined values
    if (value === null || value === undefined || value === '') {
        return '';
    }
    
    const debugLog = (message) => {
        if (rowNumber && rowNumber <= 5) {
            console.log(`Row ${rowNumber} ${fieldType}: ${message}`);
        }
    };
    
    try {
        switch (fieldType.toLowerCase()) {
            case 'date':
            case 'dob':
            case 'consultationdate':
            case 'policy_end_date':
                return processDateField(value, fieldType, debugLog);
                
            case 'time':
            case 'consultationtime':
                return processTimeField(value, fieldType, debugLog);
                
            case 'datetime':
            case 'combined':
                return processDateTimeField(value, fieldType, debugLog);
                
            default:
                debugLog(`Unknown field type, treating as string`);
                return String(value).trim();
        }
    } catch (error) {
        console.error(`Error processing ${fieldType} field:`, error);
        return String(value); // Fallback to string conversion
    }
}

// Helper function for date fields
function processDateField(value, fieldType, debugLog) {
    // If it's already a properly formatted string, normalize it
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
            const normalized = normalizeDOB(trimmed);
            debugLog(`String date normalized: ${trimmed} -> ${normalized}`);
            return normalized;
        }
        debugLog(`String date needs validation: ${trimmed}`);
        return normalizeDOB(trimmed);
    }
    
    // Handle Excel serial numbers
    if (typeof value === 'number') {
        // Excel serial dates are typically between 1 and ~50000 for reasonable date ranges
        if (value > 0 && value < 100000) {
            try {
                const dateComponents = convertExcelSerialToDate(value);
                // Remove leading zeros from month and day
                const month = dateComponents.month;
                const day = dateComponents.day;
                const formattedDate = `${month}/${day}/${dateComponents.year}`;
                debugLog(`Converted Excel serial ${value} to ${formattedDate}`);
                return formattedDate;
            } catch (error) {
                debugLog(`Failed to convert Excel serial ${value}: ${error.message}`);
                return String(value);
            }
        }
    }
    
    // Handle JavaScript Date objects
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            debugLog(`Invalid Date object`);
            return '';
        }
        // Remove leading zeros from month and day
        const month = value.getUTCMonth() + 1;
        const day = value.getUTCDate();
        const formattedDate = `${month}/${day}/${value.getUTCFullYear()}`;
        debugLog(`Converted Date object to ${formattedDate}`);
        return formattedDate;
    }
    
    // Fallback
    debugLog(`Unknown date format, attempting normalization`);
    return normalizeDOB(String(value).trim());
}

// Helper function for time fields
function processTimeField(value, fieldType, debugLog) {
    // If it's already a properly formatted string, return as-is
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/i.test(trimmed)) {
            debugLog(`String time already in correct format: ${trimmed}`);
            return trimmed.replace(/\s*(am|pm)/gi, (match, period) => ' ' + period.toUpperCase());
        }
        debugLog(`String time needs validation: ${trimmed}`);
        return trimmed;
    }
    
    // Handle Excel time fractions (0.5 = 12:00 PM)
    if (typeof value === 'number' && value >= 0 && value < 1) {
        try {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
            const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
            debugLog(`Converted Excel time fraction ${value} to ${formattedTime}`);
            return formattedTime;
        } catch (error) {
            debugLog(`Failed to convert Excel time ${value}: ${error.message}`);
            return String(value);
        }
    }
    
    // Handle JavaScript Date objects (extract time portion)
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            debugLog(`Invalid Date object for time`);
            return '';
        }
        const hours = value.getUTCHours();
        const minutes = value.getUTCMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        debugLog(`Converted Date object to time ${formattedTime}`);
        return formattedTime;
    }
    
    // Fallback
    debugLog(`Unknown time format, converting to string`);
    return String(value).trim();
}

// Helper function to convert Excel serial numbers to dates
function convertExcelSerialToDate(serial) {
    if (typeof serial !== 'number' || serial <= 0 || serial > 100000) {
        throw new Error(`Invalid Excel serial date: ${serial}`);
    }
    
    // Excel uses 1900-01-01 as day 1, but incorrectly treats 1900 as a leap year
    const excelEpoch = new Date(1900, 0, 1);
    let daysToAdd = serial - 1;
    
    // Account for Excel's leap year bug
    if (serial > 59) {
        daysToAdd = daysToAdd - 1;
    }
    
    const resultDate = new Date(excelEpoch);
    resultDate.setDate(resultDate.getDate() + daysToAdd);
    
    return {
        month: resultDate.getMonth() + 1,
        day: resultDate.getDate(),
        year: resultDate.getFullYear()
    };
}

// Enhanced normalize function for combined datetime strings
function normalizeDateTime(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
        return '';
    }

    try {
        let cleanDateTime = dateTimeString.trim();
        
        // Handle various separators
        cleanDateTime = cleanDateTime.replace(/[;|]/g, ',');
        
        // Ensure comma between date and time if missing
        if (!cleanDateTime.includes(',')) {
            const timePattern = /(\d{1,2}:\d{2}\s*(AM|PM|am|pm))/;
            const timeMatch = cleanDateTime.match(timePattern);
            if (timeMatch) {
                const timeStart = timeMatch.index;
                const datePart = cleanDateTime.substring(0, timeStart).trim();
                const timePart = cleanDateTime.substring(timeStart).trim();
                cleanDateTime = `${datePart}, ${timePart}`;
            }
        }
        
        // Ensure proper spacing around AM/PM
        cleanDateTime = cleanDateTime.replace(/(\d)([APap][Mm])/g, '$1 $2');
        cleanDateTime = cleanDateTime.replace(/\s*(am|pm)/gi, (match, period) => ' ' + period.toUpperCase());
        cleanDateTime = cleanDateTime.replace(/\s+/g, ' ');
        
        return cleanDateTime;
    } catch (error) {
        console.error('Error normalizing datetime:', error);
        return dateTimeString;
    }
}
// Helper function to parse CSV files (existing logic)
const parseCSVFile = (filePath, headerMapping) => {
    return new Promise((resolve, reject) => {
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
};


const parseExcelFile = (filePath, headerMapping) => {
    try {
        const workbook = XLSX.readFile(filePath, {
            cellDates: false,    // Keep raw values for manual processing
            cellNF: false,       
            cellText: false,     
            raw: true
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false,
            raw: true
        });
        
        if (rawData.length === 0) {
            throw new Error('Excel file is empty');
        }
        
        const headers = rawData[0];
        const dataRows = rawData.slice(1);
        
        console.log('Excel headers found:', headers);
        
        // Define which fields are datetime-related
        const dateTimeFields = {
            'consultationDate': 'date',
            'consultationTime': 'time', 
            'DOB': 'date',
            'policy_end_date': 'date'
        };
        
        // Define numeric fields that should be converted to strings
        const numericToStringFields = [
            'bupa_membership_number', 
            'primary_provider_code', 
            'secondary_provider_code', 
            'contract_no'
        ];
        
        const mappedData = dataRows.map((row, rowIndex) => {
            const record = {};
            const currentRowNumber = rowIndex + 2; // For debugging
            
            headers.forEach((header, index) => {
                const mappedHeader = headerMapping[header] || header;
                let cellValue = row[index];
                
                if (cellValue !== undefined && cellValue !== null) {
                    // Handle datetime fields using global function
                    if (dateTimeFields[mappedHeader]) {
                        const fieldType = dateTimeFields[mappedHeader];
                        cellValue = processDateTimeField(cellValue, fieldType, currentRowNumber);
                    }
                    // Handle numeric fields that should be strings
                    else if (numericToStringFields.includes(mappedHeader)) {
                        if (typeof cellValue === 'number') {
                            cellValue = Math.round(cellValue).toString();
                        } else {
                            cellValue = String(cellValue).trim();
                        }
                    }
                    // Handle all other fields as strings
                    else {
                        if (cellValue instanceof Date) {
                            // Convert unexpected Date objects to string
                            cellValue = cellValue.toLocaleDateString();
                        } else {
                            cellValue = String(cellValue).trim();
                        }
                    }
                } else {
                    cellValue = '';
                }
                
                record[mappedHeader] = cellValue;
            });
            
            // Debug log for first few rows
            if (rowIndex < 3) {
                console.log(`=== Excel Row ${currentRowNumber} Parsed ===`);
                console.log(`DOB: "${record.DOB}"`);
                console.log(`Consultation Date: "${record.consultationDate}"`);
                console.log(`Consultation Time: "${record.consultationTime}"`);
                console.log(`Policy End Date: "${record.policy_end_date}"`);
                console.log(`Mr_no: "${record.Mr_no}"`);
                console.log('==================================');
            }
            
            return record;
        });
        
        return mappedData;
    } catch (error) {
        throw new Error(`Error parsing Excel file: ${error.message}`);
    }
};


// Main function to determine file type and parse
const parseUploadedFile = async (file, headerMapping) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    try {
        let parsedData;
        
        if (fileExtension === '.csv') {
            parsedData = await parseCSVFile(file.path, headerMapping);
        } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
            parsedData = parseExcelFile(file.path, headerMapping);
        } else {
            throw new Error('Unsupported file format');
        }
        
        return parsedData;
    } catch (error) {
        throw new Error(`File parsing failed: ${error.message}`);
    }
};


//updated route with duplicate national id check
staffRouter.post('/bupa/data-entry/upload', upload.single("dataFile"), async (req, res) => {
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const skip = req.body.skip === "true";
    const validateOnly = req.body.validate_only === "true";
    const ip            = req.ip;
      await writeDbLog('access', {
    action:        'bupa_batch_upload_attempt',
    username,
    hospital_code,
    site_code,
    filename:      originalFilename,
    skip,
    validateOnly,
    ip
  });

    if (!req.file) {
      await writeDbLog('error', {
      action:   'bupa_upload_no_file',
      username,
      hospital_code,
      site_code,
      ip
    });
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

    await writeDbLog('access', {
      action:        'bupa_upload_file_received',
      username,
      hospital_code,
      site_code,
      filename:      originalFilename,
      ip
    });


        // --- Define Storage Paths ---
    const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
    const successfulDir = path.join(batchUploadStorageDir, 'successful');
    const failedDir = path.join(batchUploadStorageDir, 'failed');
    // --- End Storage Paths ---

    // --- Database Connections (Ensure these are correctly passed via req) ---
    // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
    if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
        console.error("BUPA Upload Error: Database connections not found on request object.");
              await writeDbLog('error', {
        action:   'bupa_upload_missing_db_conns',
        username,
        hospital_code,
        site_code,
        ip
      });
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
        return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
    }

    // Use same collection as single entry
    const patientDB = req.dataEntryDB.collection("patient_data");
    const docDBCollection = req.manageDoctorsDB.collection("doctors");
    const surveysCollection = req.manageDoctorsDB.collection("surveys");
    const hospitalsCollection = req.adminUserDB.collection("hospitals");



    if (!hospital_code || !site_code || !username) {
        console.error("BUPA Upload Error: Missing hospital_code, site_code or username in session.");
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
        return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
    }

        // --- Declare variables outside try for catch block access ---
    let targetDirForFile = failedDir; // Default to failed, change on success
    let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name
    // const seenInThisBatch = new Set();

    // try {
     const seenInThisBatch = new Set();

    let csvData; // ** NEW: Declare csvData here **
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
            'National Id': 'Mr_no', //mandatory
            'Patient Name': 'fullName', //mandatory
            'DOB': 'DOB', //mandatory 
            'Consultation Date': 'consultationDate',//mandatory
            'Consultation Time': 'consultationTime', //mandatory            
            'Doctor Speciality': 'speciality', //mandatory
            'Phone Number': 'phoneNumber', //mandatory
            'Email(Optional)': 'email',
            'Gender': 'gender', //mandatory
            'BUPA Membership Number': 'bupa_membership_number', //mandatory
            'Membership Type': 'member_type', //mandatory
            'City': 'city', //mandatory
            'Primary Provider Name': 'primary_provider_name', //mandatory
            'Primary Provider Code': 'primary_provider_code', //mandatory
            'Secondary Provider Name': 'secondary_provider_name',
            'Secondary Provider Code': 'secondary_provider_code',
            'Secondary Doctors\' Name': 'secondary_doctors_name',
            'Doctor Name':'doctorId', //mandatory
            'Contract Number': 'contract_no', //mandatory
            'Contract Name': 'contract_name', //mandatory
            'Contract Status': 'policy_status', //mandatory
            'Policy EndDate': 'policy_end_date', //mandatory
            'Primary Diagnosis': 'primary_diagnosis', //mandatory
            'Confirmed Pathway': 'confirmed_pathway',
            'Care Navigator Name': 'care_navigator_name'
        };

        // Validation patterns
        // const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,?\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
        const phoneRegex = /^0\d{9}$/; // 10 digits starting with 0
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // const nationalIdRegex = /^\d{10}$/; Numeric  with a total length of exactly 10 characters
        const nationalIdRegex = /^[A-Za-z0-9]{10}$/; // Aplha numeric  with a total length of exactly 10 characters
        const bupaNumberRegex = /^\d{7,8}$/;
        const providerCodeRegex = /^\d{5}$/;
        const contractNoRegex = /^\d{1,8}$/;

        // Parse the uploaded file (CSV or Excel)
        console.log(`Parsing ${path.extname(originalFilename).toLowerCase()} file: ${originalFilename}`);
        // const csvData = await parseUploadedFile(req.file, headerMapping);
        csvData = await parseUploadedFile(req.file, headerMapping);
        
        console.log('Sample mapped record:', csvData[0]);
        console.log(`Successfully parsed ${csvData.length} records from ${originalFilename}`);

        // Continue with your existing logic...
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

        // Continue with your existing validation and processing logic...
        // (Keep all your existing validation loop, processing logic, etc.)
        
        // Validation Loop
for (const [index, record] of csvData.entries()) {
    const rowNumber = index + 2;
    
    // Process all datetime fields using the global function
    const processedConsultationDate = processDateTimeField(record.consultationDate, 'consultationdate', rowNumber);
    const processedConsultationTime = processDateTimeField(record.consultationTime, 'consultationtime', rowNumber);
    const processedDOB = processDateTimeField(record.DOB, 'dob', rowNumber);
    const processedPolicyEndDate = processDateTimeField(record.policy_end_date, 'policy_end_date', rowNumber);
    
    // Update the record with processed values
    record.consultationDate = processedConsultationDate;
    record.consultationTime = processedConsultationTime;
    record.DOB = processedDOB;
    record.policy_end_date = processedPolicyEndDate;
    
    // Create combined datetime string for appointment
    const rawDatetime = `${processedConsultationDate}, ${processedConsultationTime}`;
    const datetime = normalizeDateTime(rawDatetime);
    record.datetime = datetime;
    
    // Log processing results for first few rows
    if (rowNumber <= 3) {
        console.log(`=== Row ${rowNumber} Processing Results ===`);
        console.log(`DOB: "${record.DOB}"`);
        console.log(`Consultation Date: "${processedConsultationDate}"`);
        console.log(`Consultation Time: "${processedConsultationTime}"`);
        console.log(`Combined DateTime: "${datetime}"`);
        console.log(`Policy End Date: "${processedPolicyEndDate}"`);
        console.log('=====================================');
    }
    
    const validationErrors = [];
    
    // Normalize MR_No with safe string conversion
    const rawMr = record.Mr_no != null ? String(record.Mr_no).trim() : '';
    const mrLower = rawMr.toLowerCase();
    
    // Extract all other fields (keep your existing extraction logic)
    const {
        Mr_no, fullName, speciality, doctorId, phoneNumber, 
        bupa_membership_number, member_type, city, primary_provider_name, primary_provider_code,
        secondary_provider_name = '', secondary_provider_code = '', secondary_doctors_name = '',
        contract_no, contract_name, policy_status,
        primary_diagnosis, confirmed_pathway = '', care_navigator_name = ''
    } = record;
    
    // Use processed datetime fields
    const DOB = processedDOB;
    const policy_end_date = processedPolicyEndDate;
    
    // Safe string conversion for other fields
    const email = record.email != null ? String(record.email).trim() : '';
    const gender = record.gender != null ? String(record.gender).trim() : '';

    // Batch duplicate check
    if (seenInThisBatch.has(mrLower)) {
        duplicates.push({
            rowNumber,
            ...record,
            validationErrors: ['Duplicate National Id in same upload']
        });
        continue;
    }
    seenInThisBatch.add(mrLower);
            

            // Normalize the datetime to ensure comma format
            // const datetime = normalizeDateTime(rawDatetime);

            // Update the record object with normalized datetime for further processing
            record.datetime = datetime;

            console.log("Original datetime:", rawDatetime);
            console.log("Normalized datetime:", datetime);
            console.log("record",record);

            // Required fields validation
            const requiredFields = [
                { field: 'Mr_no', value: Mr_no, display: 'National Id' },
                { field: 'fullName', value: fullName, display: 'Full Name' },
                { field: 'DOB', value: DOB, display: 'Date of Birth' },
                { field: 'datetime', value: datetime, display: 'Appointment Date & Time' },
                { field: 'speciality', value: speciality, display: 'Speciality' },
                { field: 'doctorId', value: doctorId, display: 'Doctor ID' },
                { field: 'phoneNumber', value: phoneNumber, display: 'Phone Number' },
                { field: 'gender', value: gender, display: 'Gender' },
                { field: 'bupa_membership_number', value: bupa_membership_number, display: 'BUPA Membership Number' },
                { field: 'member_type', value: member_type, display: 'Membership Type' },
                { field: 'city', value: city, display: 'City' },
                { field: 'primary_provider_name', value: primary_provider_name, display: 'Primary Provider Name' },
                { field: 'primary_provider_code', value: primary_provider_code, display: 'Primary Provider Code' },
                { field: 'contract_no', value: contract_no, display: 'Contract Number' },
                { field: 'contract_name', value: contract_name, display: 'Contract Name' },
                { field: 'policy_status', value: policy_status, display: 'Contract Status' },
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
            if (gender && !['Male', 'Female','male','female'].includes(gender)) validationErrors.push('Invalid gender value (must be Male or Female)');
            // if (phoneNumber && !phoneRegex.test(phoneNumber)) validationErrors.push('Invalid phone number format (must be 10 digits starting with 0)');
            if (email && !emailRegex.test(email)) validationErrors.push('Invalid email format');
            if (bupa_membership_number && !bupaNumberRegex.test(bupa_membership_number)) validationErrors.push('Invalid BUPA Membership Number format (must be 7-8 digits)');
            if (Mr_no && !nationalIdRegex.test(Mr_no)) validationErrors.push('Invalid National Id format');
            // if (primary_provider_code && !providerCodeRegex.test(primary_provider_code)) validationErrors.push('Invalid Primary Provider Code format (must be 5 digits)');
            if (record.primary_provider_name && record.primary_provider_code) {
                const validProvider = isValidProvider(record.primary_provider_name, record.primary_provider_code, providerList);
                if (!validProvider) {
                    validationErrors.push("Primary Provider Name and Code do not match any valid provider");
                }
            }

            if (secondary_provider_code && secondary_provider_code !== '' && !providerCodeRegex.test(secondary_provider_code)) validationErrors.push('Invalid Secondary Provider Code format (must be 5 digits)');
            if (contract_no && !contractNoRegex.test(contract_no)) validationErrors.push('Invalid Contract Number format (max 8 digits)');
            if (member_type && !/^[a-zA-Z\s]+$/.test(member_type)) validationErrors.push('Invalid Membership Type (text only)');
            if (policy_status && !['Active', 'Terminated','active','terminated'].includes(policy_status)) validationErrors.push('Invalid Contract Status');

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
                    // The datetime should already have proper comma format now
                    // But still handle both cases for safety
                    const correctedDatetime = datetime.includes(',') 
                        ? datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')
                        : datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                        
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
                    await writeDbLog('error', {
      action:       'bupa_upload_row_validation',
      username,                                
      hospital_code,                           
      site_code,                               
      row:          rowNumber,
      errors:       validationErrors,
      record:       { Mr_no: record.Mr_no },   
      ip:           req.ip
    });
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
     finalFileName = generateTimestampedFileName('validation', originalFilename);

         // Prepare metadata for validation/skip
    const metadata = {
        originalFileName: originalFilename,
        hospitalCode: hospital_code,
        siteCode: site_code,
        totalRecords: csvData.length,
        processedRecords: 0,
        failedRecords: missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length,
        operationType: validateOnly ? 'validation-only' : 'skip-duplicates'
    };
    
    // Move file to storage
    const moveResult = await moveFileToStorage(filePath, targetDirForFile, finalFileName, 'validation',metadata);
    
    return res.status(200).json({
        success: true,
        message: "Validation completed",
        storedFile: moveResult.success ? moveResult.path : null,
        metadata: moveResult.success ? moveResult.metadata : null,
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

            // // Data Processing Logic
            // const currentTimestamp = new Date();
            // const hashedMrNo = hashMrNo(record.Mr_no.toString());
            // const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
            //  const patientFullName = `${record.fullName}`.trim();
            // const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

            // let updatedSurveyStatus = "Not Completed";
            // let isNewPatient = !existingPatient;

// Data Processing Logic
            const currentTimestamp = new Date();
            const hashedMrNo = hashMrNo(record.Mr_no.toString());
            const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
            const patientFullName = `${record.fullName}`.trim();
            const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

            // ** NEW: Declare variables for new logic **
            let isNewPatient = !existingPatient;
            let triggerBupaNotification = false; 
            let updatedSurveyStatus; 

            // ** NEW: Create the Appointment_History object for this row **
            const appointmentHistoryObject = {
                Mr_no: record.Mr_no,
                speciality: record.speciality,
                appointment: 'no-show',
                appointment_time: formattedDatetimeStr,
                created_by: username,
                created_at: new Date()
            };


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
        const saudiTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Riyadh"}));
           const creationDetails = {
            created_at: saudiTime,
            created_by: username
            };
            // Database Operation (same structure as single entry)
            let operationType = '';
            let notificationSent = false;
            let recordDataForNotification = null;

            try {
                // if (existingPatient) {
                //     operationType = 'update';
                //     const lastAppointmentDate = existingPatient.datetime ? new Date(existingPatient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
                //     updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";
                    
                //     // if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                //     //     const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                //     //     const isSpecialityChanged = existingPatient.speciality !== record.speciality;
                //     //     if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
                //     // } else { updatedSurveyStatus = "Not Completed"; }


                //     const trackerKey = (existingPatient.speciality || "").trim();
                //     const allTrackerKeys = Object.keys(existingPatient?.appointment_tracker || {});
                //     console.log(`🩺 Speciality being checked: "${trackerKey}"`);
                //     console.log("📂 All tracker keys:", allTrackerKeys);

                //     const trackerEntries = existingPatient?.appointment_tracker?.[trackerKey] || [];
                //     const csvDatetime = appointmentDateObj; // already parsed from CSV

                //     let followupDueSoonOrPassed = false;

                //     for (const entry of trackerEntries) {
                //         if (!entry.surveyType || !entry.appointment_time) continue;
                //         if (entry.surveyType.toLowerCase().includes("baseline")) continue;

                //         const apptTime = new Date(entry.appointment_time.replace(/(\d)([APap][Mm])$/, '$1 $2'));
                //         if (isNaN(apptTime.getTime())) continue;

                //         const sevenDaysBefore = new Date(apptTime);
                //         sevenDaysBefore.setDate(apptTime.getDate() - 7);

                //         console.log(`📅 Follow-up '${entry.surveyType}' scheduled on: ${apptTime}`);
                //         console.log(`⏳ 7 days before: ${sevenDaysBefore}`);
                //         console.log(`📌 Comparing CSV date: ${csvDatetime} >= ${sevenDaysBefore}`);

                //         if (csvDatetime >= sevenDaysBefore) {
                //             followupDueSoonOrPassed = true;
                //             break;
                //         }
                //     }

                //     // ✅ Split into two conditions
                //     if (followupDueSoonOrPassed) {
                //         updatedSurveyStatus = "Not Completed";
                //         console.log(`✅ Updating surveyStatus to 'Not Completed' due to follow-up timing.`);
                //     }

                //     if (existingPatient.speciality !== trackerKey) {
                //         updatedSurveyStatus = "Not Completed";
                //         console.log(`✅ Updating surveyStatus to 'Not Completed' due to specialty mismatch (existing: "${existingPatient.speciality}", incoming: "${trackerKey}").`);
                //     }

                //     let updatedSpecialities = existingPatient.specialities || [];
                //     const specialityIndex = updatedSpecialities.findIndex(s => s.name === record.speciality);
                //     if (specialityIndex !== -1) {
                //         updatedSpecialities[specialityIndex].timestamp = formattedDatetimeStr;
                //         if (!updatedSpecialities[specialityIndex].doctor_ids.includes(record.doctorId)) {
                //             updatedSpecialities[specialityIndex].doctor_ids.push(record.doctorId);
                //         }
                //     } else {
                //         updatedSpecialities.push({ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId], creation_details: creationDetails });
                //     }

                //     await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                //         $set: {
                //             fullName: record.fullName,
                //             gender: record.gender,
                //             DOB: record.DOB,
                //             datetime: formattedDatetimeStr,
                //             specialities: updatedSpecialities,
                //             speciality: record.speciality,
                //             phoneNumber: record.phoneNumber,
                //             email: record.email,
                //             hospital_code,
                //             site_code,
                //             additionalFields,
                //             surveyStatus: updatedSurveyStatus,
                //             appointment_tracker,
                //         },
                //         $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
                //     });
                //     recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality: record.speciality, datetime: formattedDatetimeStr, appointment_tracker };
                // } 
                

                                if (existingPatient) {
                    // ========== START: BATCH - EXISTING PATIENT (UPDATE) LOGIC ==========
                    operationType = 'update';
                    let appointment_tracker = existingPatient.appointment_tracker || {};

                    // ** CHANGED: Check if the specialty is new for this patient **
                    if (!appointment_tracker[record.speciality]) {
                        console.log(`[BUPA Upload] New specialty ('${record.speciality}') for existing patient ${record.Mr_no}.`);
                        triggerBupaNotification = true; // Trigger notification for new specialty
                        
                        // Logic to calculate and add new tracker
                        const specialitySurveys = await surveysCollection.findOne({ specialty: record.speciality, hospital_code, site_code });
                        if (specialitySurveys?.surveys?.length > 0) {
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
                                    let monthDifference = currentMonth - previousMonth;
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                    trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                                    lastAppointmentTime = new Date(trackerAppointmentTime);
                                }
                                const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);
                                const completed_in_appointment = {};
                                if (Array.isArray(sortedSurveys[month])) {
                                    sortedSurveys[month].forEach(surveyName => {
                                        completed_in_appointment[surveyName] = false;
                                    });
                                }
                                return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedTrackerTime, surveyStatus: "Not Completed", completed_in_appointment };
                            });
                        }
                    } else {
                         console.log(`[BUPA Upload] Existing specialty ('${record.speciality}') for patient ${record.Mr_no}. NOT sending notification.`);
                    }

                    // ** CHANGED: surveyStatus is now preserved, not recalculated **
                    updatedSurveyStatus = existingPatient.surveyStatus;

                    let updatedSpecialities = existingPatient.specialities || [];
                    const specialityIndex = updatedSpecialities.findIndex(s => s.name === record.speciality);
                    if (specialityIndex !== -1) {
                        updatedSpecialities[specialityIndex].timestamp = formattedDatetimeStr;
                        if (!updatedSpecialities[specialityIndex].doctor_ids.includes(record.doctorId)) {
                            updatedSpecialities[specialityIndex].doctor_ids.push(record.doctorId);
                        }
                    } else {
                        updatedSpecialities.push({ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId], creation_details: creationDetails });
                    }

                    await patientDB.updateOne({ Mr_no: record.Mr_no }, {
                        $set: {
                            fullName: record.fullName,
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
                            surveyStatus: updatedSurveyStatus, // Preserved status
                            appointment_tracker, // Updated only if specialty was new
                        },
                        // ** NEW: Always push to the appointment history **
                        $push: {
                            Appointment_History: appointmentHistoryObject
                        },
                        $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
                    });
                      await writeDbLog('audit', {
                    action:        'patient_record_update',
                    mrNo:          record.Mr_no,
                    operationType : 'update',
                    username,                       
                    hospital_code,
                    site_code,
                    row:            rowNumber
                });
                    recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality: record.speciality, datetime: formattedDatetimeStr, appointment_tracker };
                    // ========== END: BATCH - EXISTING PATIENT (UPDATE) LOGIC ==========
                }

                
                // else {
                //     operationType = 'insert';
                //     updatedSurveyStatus = "Not Completed";
                //     const newRecord = {
                //         Mr_no: record.Mr_no,
                //         fullName: record.fullName,
                //         gender: record.gender,
                //         DOB: record.DOB,
                //         datetime: formattedDatetimeStr,
                //         specialities: [{ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId], creation_details: creationDetails }],
                //         speciality: record.speciality,
                //         phoneNumber: record.phoneNumber,
                //         email: record.email || '',
                //         hospital_code,
                //         site_code,
                //         additionalFields,
                //         surveyStatus: updatedSurveyStatus,
                //         hashedMrNo,
                //         surveyLink,
                //         appointment_tracker,
                //         creation_details: creationDetails,
                //         SurveySent: 0,
                //         smsLogs: [],
                //         emailLogs: [],
                //         whatsappLogs: []
                //     };
                //     await patientDB.insertOne(newRecord);
                //     recordDataForNotification = newRecord;
                // }
                else {
                    // ========== START: BATCH - NEW PATIENT (INSERT) LOGIC ==========
                    operationType = 'insert';
                    triggerBupaNotification = true; // ** NEW: Trigger notification for new patient **
                    updatedSurveyStatus = "Not Completed"; // Set status for notification logic

                    const newRecord = {
                        Mr_no: record.Mr_no,
                        fullName: record.fullName,
                        gender: record.gender,
                        DOB: record.DOB,
                        datetime: formattedDatetimeStr,
                        specialities: [{ name: record.speciality, timestamp: formattedDatetimeStr, doctor_ids: [record.doctorId], creation_details: creationDetails }],
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
                        creation_details: creationDetails,
                        Appointment_History: [appointmentHistoryObject], // ** NEW: Initialize history array **
                        SurveySent: 0,
                        smsLogs: [],
                        emailLogs: [],
                        whatsappLogs: []
                    };
                    await patientDB.insertOne(newRecord);
                      await writeDbLog('audit', {
                    action:        'patient_record_insert',
                    mrNo:          record.Mr_no,
                    operationType,
                    username,
                    hospital_code,
                    site_code,
                    row:            rowNumber
                });
                    recordDataForNotification = newRecord;
                    // ========== END: BATCH - NEW PATIENT (INSERT) LOGIC ==========
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
            } 
            // else if (prefLower === 'third_party_api') {
            // console.log(`[BupaIntegration] third_party_api for ${record.Mr_no} — sending to Bupa…`);

            // const patientDataForBupaApi = [{
            //     nationalId:   record.Mr_no,
            //     name:         record.fullName,
            //     phoneNumber:  record.phoneNumber,
            //     surveyLink:   surveyLink
            // }];
            // console.log("BATCH UPLOAD PAYLOAD SENT TO BUPA:",patientDataForBupaApi);

            // // decide baseline vs follow-up
            // const bupaTemplateName = isNewPatient ? 'wh_baseline' : 'wh_follow-up';
            // const payload = { template: bupaTemplateName, data: patientDataForBupaApi };

            // try {
            //     // 1) send to Bupa
            //     await sendWhatsAppDataToBupaProvider(payload);
            //     console.log(`[BupaIntegration] queued for ${record.Mr_no} with template ${bupaTemplateName}`);

            //     // 2) push a log entry into whatsappLogs
            //     await patientDB.updateOne(
            //     { Mr_no: record.Mr_no },
            //     {
            //         $push: {
            //         whatsappLogs: {
            //             type:             'upload_creation',
            //             speciality:       record.speciality,
            //             appointment_time: formattedDatetimeStr,
            //             timestamp:        new Date()
            //         }
            //         },
            //         $inc: { SurveySent: 1 }
            //     }
            //     );
            //     notificationSent = true;
            //     console.log(`[BupaIntegration] log written for ${record.Mr_no}`);
            // } catch (err) {
            //     console.error(`[BupaIntegration] error sending/logging for ${record.Mr_no}:`, err);
            //     notificationErrorOccurred = true;
            // }
            // }


            else if (prefLower === 'third_party_api') {
                // ** CHANGED: Notification is now conditional **
                if (triggerBupaNotification) {
                    console.log(`[BUPA Upload] Triggering Bupa notification for ${record.Mr_no}. Reason: ${isNewPatient ? 'New Patient' : 'New Specialty'}`);
                    
                    const patientDataForBupaApi = [{
                        nationalId:   record.Mr_no,
                        name:         record.fullName,
                        phoneNumber:  record.phoneNumber,
                        surveyLink:   surveyLink
                    }];
            console.log("BATCH UPLOAD PAYLOAD SENT TO BUPA:",patientDataForBupaApi);
                    
                    const bupaTemplateName = 'wh_baseline'; // ** Always baseline now **
                    const payload = { template: bupaTemplateName, data: patientDataForBupaApi };

                    try {
                        await sendWhatsAppDataToBupaProvider(payload);
                        await patientDB.updateOne( { Mr_no: record.Mr_no }, {
                            $push: { whatsappLogs: { type: 'upload_creation', speciality: record.speciality, appointment_time: formattedDatetimeStr, timestamp: new Date() } },
                            $inc: { SurveySent: 1 }
                        });
                        notificationSent = true;
                        console.log(`[BupaIntegration] Log written for ${record.Mr_no}`);
                    } catch (err) {
                        console.error(`[BupaIntegration] Error sending/logging for ${record.Mr_no}:`, err);
                        notificationErrorOccurred = true;
                    }
                } else {
                    console.log(`[BUPA Upload] Notification SKIPPED for existing patient/specialty combo for MRN: ${record.Mr_no}`);
                }
            }
            else if (notificationPreference) {
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
                                        await sendEmail(recordDataForNotification.email, emailType, record.speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.fullName, doctorName);
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
                                                    // statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
                                                    statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback' // Use actual URL
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
targetDirForFile = successfulDir;
finalFileName = `success_${Date.now()}_${originalFilename}`;
finalFileName = generateTimestampedFileName('success', originalFilename);

// Prepare metadata for successful processing
const metadata = {
    originalFileName: originalFilename,
    hospitalCode: hospital_code,
    siteCode: site_code,
    totalRecords: csvData.length,
    processedRecords: successfullyProcessed.length,
    failedRecords: missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length,
    notificationErrors: recordsWithNotificationErrors.length,
    operationType: 'full-processing'
};

// Move file to storage
// const successMoveResult = await moveFileToStorage(filePath, targetDirForFile, finalFileName, 'success',metadata);
const successMoveResult = await moveFileToStorage(
    filePath, 
    targetDirForFile, 
    finalFileName, 
    'success', 
    metadata,
    successfullyProcessed,  // Pass successful records
    csvData,               // Pass original CSV data
    Object.keys(csvData[0] || {}) // Pass original headers
);

// Calculate totals (keep your existing calculation code)
const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
const uploadedCount = successfullyProcessed.length;
const skippedRecords = totalValidationIssues;
const totalRecords = csvData.length;

const responseMessage = `BUPA Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;

// Create Excel report (keep your existing Excel creation code)
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
    { header: 'National Id', key: 'Mr_no', width: 20 },
    { header: 'Full Name', key: 'fullName', width: 15 },
    { header: 'Phone Number', key: 'phoneNumber', width: 15 },
    { header: 'Survey Link', key: 'surveyLink', width: 50 },
];

// Populate rows
for (const row of successfullyProcessed) {
    const patient = csvData[row.rowNumber - 2]; // original CSV record
    sheet.addRow({
        rowNumber: row.rowNumber,
        Mr_no: row.Mr_no,
        fullName: patient.fullName,
        phoneNumber: patient.phoneNumber,
        surveyLink: `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
        operationType: row.operationType,
    });
}

// Write file to disk
await workbook.xlsx.writeFile(outputFilePath);
req.session.processedExcelFile = outputFileName;
    await writeDbLog('audit', {
      action:           'bupa_upload_batch_processed',
      username,
      hospital_code,
      site_code,
      totalRows:        csvData.length,
      processed:        successfullyProcessed.length,
      validationErrors: missingDataRows.length + invalidEntries.length + invalidDoctorsData.length + duplicates.length,
      notificationsFailed: recordsWithNotificationErrors.length,
      filename:         originalFilename,
      ip
    });
return res.status(200).json({
    success: true,
    message: responseMessage,
    uploadedCount: uploadedCount,
    skippedRecords: skippedRecords,
    totalRecords: totalRecords,
    notificationErrorsCount: recordsWithNotificationErrors.length,
    downloadUrl: `/bupa/data-entry/download-latest`,
    storedFile: successMoveResult.success ? successMoveResult.path : null,
    metadata: successMoveResult.success ? successMoveResult.metadata : null,
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

// 3. For error handling in catch block (replace your existing catch block):
} catch (error) { 
    console.error("Error processing CSV upload:", error);
        await writeDbLog('error', {
      action:   'bupa_upload_processing_error',
      username,
      hospital_code,
      site_code,
      filename: originalFilename,
      message:  error.message,
      stack:    error.stack,
      ip
    });

    // --- MOVE FILE on Failure ---
    targetDirForFile = failedDir; // Ensure we use failed directory
    finalFileName = `failed_${Date.now()}_${originalFilename}`;
    finalFileName = generateTimestampedFileName('failed', originalFilename);

    let storedFilePath = null;
      let storedMetadata = null;
    if (filePath && originalFilename) {
                const failureMetadata = {
            originalFileName: originalFilename,
            hospitalCode: hospital_code,
            siteCode: site_code,
            totalRecords: csvData ? csvData.length : 0,
            processedRecords: 0,
            failedRecords: csvData ? csvData.length : 0,
            errorMessage: error.message,
            errorStack: error.stack,
            operationType: 'failed-processing'
        };
        const failedMoveResult = await moveFileToStorage(filePath, targetDirForFile, finalFileName, 'failure');
        storedFilePath = failedMoveResult.success ? failedMoveResult.path : null;
    } else {
        console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
        // Try to delete if filePath exists
        if (filePath) {
            await fsPromises.unlink(filePath).catch(err => 
                console.error("Error deleting temp file on main error:", err)
            );
        }
    }

    return res.status(500).json({
        success: false,
        error: "Error processing BUPA CSV upload.",
        details: error.message,
        storedFile: storedFilePath,
        metadata: storedMetadata,
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
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain
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
      const username      = req.session.username;
  const hospital_code = req.session.hospital_code;
  const site_code     = req.session.site_code;
  const ip            = req.ip;

    await writeDbLog('access', {
    action:        'send_reminder_attempt',
    mrNo:          Mr_no,
    username,
    hospital_code,
    site_code,
    ip
  });

    try {
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });

        if (!patient) {
                  await writeDbLog('error', {
        action:   'send_reminder_fail_no_patient',
        mrNo:     Mr_no,
        username,
        hospital_code,
        site_code,
        ip
      });
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
        await writeDbLog('access', {
        action:        'send_reminder_skipped',
        reason:        'notifications_disabled',
        mrNo:          Mr_no,
        username,
        hospital_code,
        site_code,
        ip
      });
            console.log("Reminder skipped - Notification disabled");
            
            return res.redirect(basePath + '/home');
        }

        if (notificationPreference === 'third_party_api') {
        await writeDbLog('audit', {
        action:                   'send_reminder_third_party_api',
        mrNo:                     Mr_no,
        username,
        hospital_code,
        site_code,
        notificationPreference,
        ip
      });
   
            // const payloadForMockServer = {
            //     patientMrNo: patient.Mr_no,
            //     patientFullName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            //     doctorFullName: patient.doctorName || 'Not Assigned', // You can improve this with actual lookup
            //     appointmentDatetime: formattedDatetime,
            //     hospitalName: siteSettings?.sites?.[0]?.hospital_name || "Hospital",
            //     hashedMrNo: patient.hashedMrNo,
            //     surveyLink: surveyLink,
            //     speciality: latestSpecialityName,
            //     phoneNumber: patient.phoneNumber,
            //     email: patient.email,
            //     gender: patient.gender,
            //     isNewPatient: false, // Since this is a reminder, the patient already exists
            //     sourceSystemRecordId: null,
            //     uploadSource: 'send_reminder',
            //     notificationPreferenceUsed: notificationPreference
            // };
            //  try {
            //     await sendAppointmentDataToMockServer(payloadForMockServer); // You must have this function defined
                console.log(`[Reminder] Third-party API Send Reminder success`);
            // } catch (err) {
            //     console.error(`[Reminder] Third-party API error for MRN ${Mr_no}:`, err.message);
            // }
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
      await writeDbLog('error', {
      action:        'send_reminder_error',
      mrNo:          Mr_no,
      message:       error.message,
      stack:         error.stack,
      username,
      hospital_code,
      site_code,
      ip
    });
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



function normalizeAppointmentTimeToUTC(dateString) {
    if (!dateString) return null;

    // This regex captures the parts of a date like "8/21/2025, 10:00 AM"
    const regex = /(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const parts = dateString.match(regex);

    if (!parts) {
        console.warn(`[Date Norm] Could not parse date string: ${dateString}`);
        return null; // Parsing failed
    }

    let [, month, day, year, hour, minute, ampm] = parts;
    let hourInt = parseInt(hour, 10);

    // Convert to 24-hour format
    if (ampm.toUpperCase() === 'PM' && hourInt < 12) {
        hourInt += 12;
    }
    if (ampm.toUpperCase() === 'AM' && hourInt === 12) { // Midnight case
        hourInt = 0;
    }

    // Pad with leading zeros to create a valid ISO-8601-like string
    const isoMonth = month.padStart(2, '0');
    const isoDay = day.padStart(2, '0');
    const isoHour = String(hourInt).padStart(2, '0');

    // Create a date string that EXPLICITLY includes the Saudi Arabia (UTC+3) offset.
    // This forces new Date() to interpret it correctly, regardless of server location.
    const isoStringWithOffset = `${year}-${isoMonth}-${isoDay}T${isoHour}:${minute}:00+03:00`;

    const dateObj = new Date(isoStringWithOffset);
    if (isNaN(dateObj.getTime())) {
        console.warn(`[Date Norm] Created invalid date from ISO string: ${isoStringWithOffset}`);
        return null;
    }

    return dateObj;
}


async function checkAndSendAutomatedReminders(dataEntryDB, adminUserDB) {
    console.log('[Cron Job] Starting automated reminder check...');
    const patientCollection = dataEntryDB.collection('patient_data');

    try {
        const patients = await patientCollection.find({}).toArray();
        const now = new Date(); // Current time in UTC, from the server
        let remindersSentCount = 0;

        const reminderCases = [
            { value: 14, unit: 'days', type: '2-weeks-before' },
            { value: 1, unit: 'days', type: '1-day-before' },
            { value: -1, unit: 'hours', type: '1-hour-after' },
            { value: -7, unit: 'days', type: '1-week-after' }
        ];

        for (const patient of patients) {
            if (!patient.appointment_tracker) continue;

            const patientFullName = `${patient.fullName || ''}`.trim();

            for (const speciality in patient.appointment_tracker) {
                const appointments = patient.appointment_tracker[speciality];

                for (const appointment of appointments) {
                    if (appointment.surveyStatus === 'Not Completed') {
                        // NORMALIZATION: Convert the DB string to a proper UTC Date object
                        const appointmentTime = normalizeAppointmentTimeToUTC(appointment.appointment_time);
                        if (!appointmentTime || isNaN(appointmentTime.getTime())) continue;

                        const timeDiff = appointmentTime.getTime() - now.getTime();

                        for (const reminderCase of reminderCases) {
                            let diff;
                            if (reminderCase.unit === 'days') {
                                diff = timeDiff / (1000 * 3600 * 24);
                            } else { // Assumes 'hours'
                                diff = timeDiff / (1000 * 3600);
                            }

                            // ACCURATE CHECK: Use Math.floor for hourly cron to create a precise 1-unit window
                            if (Math.floor(diff) === reminderCase.value) {

                                    // reset the top-level surveyStatus for 14d or 1d reminders
                                    if (reminderCase.unit === 'days' && (reminderCase.value === 14 || reminderCase.value === 1 || reminderCase.value === -1 || reminderCase.value === -7)) {
                                    await patientCollection.updateOne(
                                        { _id: patient._id },
                                        { $set: { surveyStatus: 'Not Completed' } }
                                    );
                                    }
                                const reminderType = `automated-${reminderCase.type}`;

                                const hasBeenSent = (patient.smsLogs || []).some(log => log.type === reminderType && log.appointment_time === appointment.appointment_time) ||
                                    (patient.emailLogs || []).some(log => log.type === reminderType && log.appointment_time === appointment.appointment_time) ||
                                    (patient.whatsappLogs || []).some(log => log.type === reminderType && log.appointment_time === appointment.appointment_time);

                                if (!hasBeenSent) {
                                    const siteSettings = await adminUserDB.collection('hospitals').findOne(
                                        { "sites.site_code": patient.site_code },
                                        { projection: { "sites.$": 1, "hospital_name": 1 } }
                                    );

                                    const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase();
                                    const hospitalName = siteSettings?.hospital_name || 'Your Clinic';
                                    const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
                                    const doctorName = 'Your Doctor';

                                    console.log(`[Cron Job] Sending '${reminderType}' to ${patient.Mr_no} for appointment on ${appointment.appointment_time}`);

                                    if (notificationPreference === 'third_party_api') {
                                        const bupaTemplateName = appointment.surveyType === 'Baseline' ? "wh_baseline" : "wh_follow-up";
                                        const payloadToSend = {
                                            template: bupaTemplateName,
                                            data: [{ "nationalId": patient.Mr_no, "name": patientFullName, "phoneNumber": patient.phoneNumber, "surveyLink": surveyLink }]
                                        };
                                        await sendWhatsAppDataToBupaProvider(payloadToSend);
                                        await patientCollection.updateOne({ _id: patient._id }, { $push: { whatsappLogs: { type: reminderType, speciality, appointment_time: appointment.appointment_time, timestamp: new Date() } } });
                                        remindersSentCount++;
                                    } else {
                                        const reminderMessage = `Friendly reminder for your upcoming appointment for ${speciality}. Please complete your health survey: ${surveyLink}`;

                                        if (notificationPreference === 'sms' || notificationPreference === 'both') {
                                            await sendSMS(patient.phoneNumber, reminderMessage);
                                            await patientCollection.updateOne({ _id: patient._id }, { $push: { smsLogs: { type: reminderType, speciality, appointment_time: appointment.appointment_time, timestamp: new Date() } } });
                                            remindersSentCount++;
                                        }
                                        if (notificationPreference === 'email' || notificationPreference === 'both') {
                                            if (patient.email) {
                                                await sendEmail(patient.email, 'appointmentReminder', speciality, appointment.appointment_time, patient.hashedMrNo, patient.firstName, doctorName);
                                                await patientCollection.updateOne({ _id: patient._id }, { $push: { emailLogs: { type: reminderType, speciality, appointment_time: appointment.appointment_time, timestamp: new Date() } } });
                                                remindersSentCount++;
                                            }
                                        }
                                        if (notificationPreference === 'whatsapp' || notificationPreference === 'both') {
                                            const accountSid = process.env.TWILIO_ACCOUNT_SID;
                                            const authToken = process.env.TWILIO_AUTH_TOKEN;
                                            const client = twilio(accountSid, authToken);
                                            let formattedPhoneNumber = patient.phoneNumber && !patient.phoneNumber.startsWith('whatsapp:') ? `whatsapp:${patient.phoneNumber}` : patient.phoneNumber;
                                            const placeholders = { 1: patientFullName, 2: doctorName, 3: appointment.appointment_time, 4: hospitalName, 5: patient.hashedMrNo };

                                            await client.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: formattedPhoneNumber, contentSid: process.env.TWILIO_TEMPLATE_SID, contentVariables: JSON.stringify(placeholders) });
                                            await patientCollection.updateOne({ _id: patient._id }, { $push: { whatsappLogs: { type: reminderType, speciality, appointment_time: appointment.appointment_time, timestamp: new Date() } } });
                                            remindersSentCount++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log(`[Cron Job] Finished check. Sent ${remindersSentCount} reminders.`);
    } catch (error) {
        console.error('[Cron Job] Error during automated reminder execution:', error);
    }
}

// UPDATED CRON SCHEDULE
// Runs at the start of every hour from 7 AM to 8 PM (20:00).
cron.schedule('0 7-20 * * *', () => {
    console.log('Triggering the hourly automated reminder job as per schedule (7AM-8PM Saudi Time).');
    const dataEntryDB = dataEntryClient.db();
    const adminUserDB = adminUserClient.db();
    
    checkAndSendAutomatedReminders(dataEntryDB, adminUserDB)
      .catch(error => console.error('A critical error occurred in the automated reminder cron job:', error));
}, {
    scheduled: true,
    timezone: "Asia/Riyadh" // Set to Saudi Arabia timezone
});


async function sendSinglePatientReminder(dataEntryDB, adminUserDB, mrNo, targetSpeciality) {
    console.log(`[Manual Trigger] Initiating targeted manual reminder for patient: ${mrNo}, specialty: ${targetSpeciality}`);
    const patientCollection = dataEntryDB.collection('patient_data');
    const reminderType = 'manual-reminder';

    try {
        const patient = await patientCollection.findOne({ Mr_no: mrNo });

        if (!patient) {
            return { success: false, count: 0, message: `Patient ${mrNo} not found.` };
        }
        
        // Directly access the appointments for the target specialty
        const appointmentsInSpecialty = patient.appointment_tracker?.[targetSpeciality];

        if (!appointmentsInSpecialty || appointmentsInSpecialty.length === 0) {
            return { success: true, count: 0, message: `No appointments found for specialty '${targetSpeciality}'.` };
        }

        // Find all incomplete appointments WITHIN that specialty
        const incompleteAppointments = appointmentsInSpecialty.filter(
            appointment => appointment.surveyStatus === 'Not Completed'
        );

        if (incompleteAppointments.length === 0) {
            return { success: true, count: 0, message: `No incomplete surveys for specialty '${targetSpeciality}'.` };
        }

        // Sort them by date to get the soonest one
        incompleteAppointments.sort((a, b) => {
            const dateA = normalizeAppointmentTimeToUTC(a.appointment_time);
            const dateB = normalizeAppointmentTimeToUTC(b.appointment_time);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
        });

        // Target only the first appointment in the sorted list
        const targetAppointment = incompleteAppointments[0];
        
        // --- Send the single, targeted reminder ---
        const patientFullName = `${patient.fullName || ''}`.trim();
        const siteSettings = await adminUserDB.collection('hospitals').findOne(
            { "sites.site_code": patient.site_code },
            { projection: { "sites.$": 1, "hospital_name": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase();
        const hospitalName = siteSettings?.hospital_name || 'Your Clinic';
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
        const doctorName = 'Your Doctor';

        console.log(`[Manual Trigger] Sending '${reminderType}' to ${patient.Mr_no} for appointment in ${targetSpeciality} on ${targetAppointment.appointment_time}`);
        
        const reminderMessage = `Friendly reminder for your upcoming appointment for ${targetSpeciality}. Please complete your health survey: ${surveyLink}`;

        if (notificationPreference === 'third_party_api') {
            const bupaTemplateName = targetAppointment.surveyType === 'Baseline' ? "wh_baseline" : "wh_follow-up";
            const payloadToSend = {
                template: bupaTemplateName,
                data: [{ "nationalId": patient.Mr_no, "name": patientFullName, "phoneNumber": patient.phoneNumber, "surveyLink": surveyLink }]
            };
            await sendWhatsAppDataToBupaProvider(payloadToSend);
            await patientCollection.updateOne({ _id: patient._id }, { $push: { whatsappLogs: { type: reminderType, speciality: targetSpeciality, appointment_time: targetAppointment.appointment_time, timestamp: new Date() } } });
        } else {
            if (notificationPreference === 'sms' || notificationPreference === 'both') {
                await sendSMS(patient.phoneNumber, reminderMessage);
                await patientCollection.updateOne({ _id: patient._id }, { $push: { smsLogs: { type: reminderType, speciality: targetSpeciality, appointment_time: targetAppointment.appointment_time, timestamp: new Date() } } });
            }
            if (notificationPreference === 'email' || notificationPreference === 'both') {
                if (patient.email) {
                    await sendEmail(patient.email, 'appointmentReminder', targetSpeciality, targetAppointment.appointment_time, patient.hashedMrNo, patient.firstName, doctorName);
                    await patientCollection.updateOne({ _id: patient._id }, { $push: { emailLogs: { type: reminderType, speciality: targetSpeciality, appointment_time: targetAppointment.appointment_time, timestamp: new Date() } } });
                }
            }
            if (notificationPreference === 'whatsapp' || notificationPreference === 'both') {
                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                const client = twilio(accountSid, authToken);
                let formattedPhoneNumber = patient.phoneNumber && !patient.phoneNumber.startsWith('whatsapp:') ? `whatsapp:${patient.phoneNumber}` : patient.phoneNumber;
                const placeholders = { 1: patientFullName, 2: doctorName, 3: targetAppointment.appointment_time, 4: hospitalName, 5: patient.hashedMrNo };

                await client.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: formattedPhoneNumber, contentSid: process.env.TWILIO_TEMPLATE_SID, contentVariables: JSON.stringify(placeholders) });
                await patientCollection.updateOne({ _id: patient._id }, { $push: { whatsappLogs: { type: reminderType, speciality: targetSpeciality, appointment_time: targetAppointment.appointment_time, timestamp: new Date() } } });
            }
        }

        console.log(`[Manual Trigger] Finished for ${mrNo}. Sent 1 targeted reminder.`);
        return { success: true, count: 1, message: `Reminder sent for appointment on ${targetAppointment.appointment_time}.` };

    } catch (error) {
        console.error(`[Manual Trigger] Error during manual reminder for ${mrNo}:`, error);
        throw error;
    }
}



//Updated route with send-reminder popup
staffRouter.post('/automated-reminders', async (req, res) => {
    const { Mr_no, speciality } = req.body;
    console.log("{MR NO}",Mr_no);
    console.log("{speciality}",speciality);
  const username      = req.session.username;
  const hospital_code = req.session.hospital_code;
  const site_code     = req.session.site_code;
  const ip            = req.ip;
    await writeDbLog('access', {
    action:    'automated_reminder_attempt',
    mrNo:      Mr_no,
    speciality,
    username,
    hospital_code,
    site_code,
    ip
  });

    
    console.log(`[REMINDER] Route hit - Received request for Mr_no: ${Mr_no}, speciality: ${speciality}`);

    if (!Mr_no || !speciality) {
            await writeDbLog('error', {
      action:    'automated_reminder_validation_failed',
      mrNo:      Mr_no,
      speciality,
      reason:    'missing_parameters',
      username,
      hospital_code,
      site_code,
      ip
    });
        console.log(`[REMINDER] Missing parameters - Mr_no: ${Mr_no}, speciality: ${speciality}`);
        return res.status(400).json({
            success: false,
            message: 'Could not send reminder: Patient MR Number or Specialty was missing.'
        });
    }

    console.log(`[REMINDER] Manual reminder trigger received for patient: ${Mr_no}, specialty: ${speciality}.`);

    try {
        console.log(`[REMINDER] Calling sendSinglePatientReminder function...`);
        const result = await sendSinglePatientReminder(req.dataEntryDB, req.adminUserDB, Mr_no, speciality);
        console.log(`[REMINDER] sendSinglePatientReminder result:`, result);
        
        if (result.success && result.count > 0) {
        await writeDbLog('audit', {
        action:      'automated_reminder_sent',
        mrNo:        Mr_no,
        speciality,
        username,
        hospital_code,
        site_code,
        ip
      });
            // Actually sent a reminder
            console.log(`[REMINDER] SUCCESS - Reminder sent. Count: ${result.count}`);
            return res.status(200).json({
                success: true,
                message: `Reminder sent successfully to patient ${Mr_no} for ${speciality}.`,
                reminderSent: true
            });
        } else {
                  await writeDbLog('access', {
        action:      'automated_reminder_skipped',
        mrNo:        Mr_no,
        speciality,
        username,
        hospital_code,
        site_code,
        ip
      });
            // No reminder needed/sent (e.g., surveys already completed, no incomplete surveys, etc.)
            console.log(`[REMINDER] NO REMINDER SENT - Reason: ${result.message || 'Unknown reason'}`);
            console.log(`[REMINDER] Result details - success: ${result.success}, count: ${result.count}`);
            return res.status(200).json({
                success: true,
                message: result.message || `No reminder needed for patient ${Mr_no} in ${speciality}.`,
                reminderSent: false
            });
        }
    } catch (error) {
        console.error(`[REMINDER] ERROR - Manual reminder trigger failed for ${Mr_no}:`, error);
        console.error(`[REMINDER] Error stack:`, error.stack);
            await writeDbLog('error', {
      action:    'automated_reminder_error',
      mrNo:        Mr_no,
      speciality,
      message:   error.message,
      stack:     error.stack,
      username,
      hospital_code,
      site_code,
      ip
    });
        return res.status(500).json({
            success: false,
            message: 'An internal error occurred while sending the reminder.'
        });
    }
});




staffRouter.post('/update-appointment-status', async (req, res) => {
    const { mrNo, speciality, status } = req.body;
    const username = req.session.username; // Get the logged-in user

    if (!mrNo || !speciality || !status) {
        return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    if (!['show', 'no-show'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    try {
        const patientCollection = req.dataEntryDB.collection('patient_data');
        
        // Create the new history object to push
        const newHistoryEntry = {
            Mr_no: mrNo,
            speciality: speciality,
            appointment: status, // 'show' or 'no-show'
            created_by: username,
            created_at: new Date()
        };

        // Find the patient and push the new entry to their history
        const result = await patientCollection.updateOne(
            { Mr_no: mrNo },
            { $push: { Appointment_History: newHistoryEntry } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found.' });
        }

        console.log(`[Status Update] Successfully updated patient ${mrNo} to '${status}' for specialty '${speciality}' by ${username}.`);
        res.status(200).json({ success: true, message: 'Status updated successfully.' });

    } catch (error) {
        console.error('[Status Update] Error updating appointment status:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});



app.use(basePath, staffRouter);


function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on `);
    });
}



module.exports = startServer;