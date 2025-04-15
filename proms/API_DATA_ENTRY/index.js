// // index.js

// const express = require('express');
// const bodyParser = require('body-parser');
// const { MongoClient } = require('mongodb');
// const path = require('path');
// const ejs = require('ejs'); // Require EJS module
// const multer = require('multer');
// const csvParser = require('csv-parser');
// const fs = require('fs');
// const app = express();
// const i18nextMiddleware = require('i18next-http-middleware');
// const i18next = require('i18next');
// const cookieParser = require('cookie-parser');
// app.use(cookieParser());
// const Backend = require('i18next-fs-backend');
// const upload = multer({ dest: "uploads/" });
// const sgMail = require('@sendgrid/mail')


// app.use('/stafflogin/locales', express.static(path.join(__dirname, 'views/locales')));;
// i18next
//   .use(Backend)
//   .use(i18nextMiddleware.LanguageDetector)
//   .init({
//     backend: {
//       loadPath: path.join(__dirname, 'views/locales/{{lng}}/translation.json'),
//     },
//     fallbackLng: 'en',
//     preload: ['en', 'ar'], // Supported languages
//     detection: {
//       order: ['querystring', 'cookie', 'header'],
//       caches: ['cookie'],
//     },
//   });
//   app.use(i18nextMiddleware.handle(i18next));

// // Add session management dependencies
// const session = require('express-session');
// const MongoStore = require('connect-mongo');

// // // require('dotenv').config();
// // require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded

// require('dotenv').config();

// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
// const IV_LENGTH = 16; // AES block size for CBC mode

// app.use(express.urlencoded({ extended: true }));

// // Import Twilio SDK
// const twilio = require('twilio');
// const crypto = require('crypto');
// const flash = require('connect-flash');
// // Function to hash the MR number
// function hashMrNo(mrNo) {
//     return crypto.createHash('sha256').update(mrNo).digest('hex');
// }

// // Add this after express-session middleware





// const basePath = '/stafflogin'; // Base path for routes
// app.locals.basePath = basePath;

// // Make BASE_URL available in all EJS templates
// app.locals.BASE_URL = process.env.BASE_URL;

// // const PORT = process.env.PORT || 3051;
// // const PORT = 3051;
// const PORT = process.env.API_DATA_ENTRY_PORT; 

// // AES-256 encryption function
// function encrypt(text) {
//     const iv = crypto.randomBytes(IV_LENGTH);  // Generate a random IV
//     const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//     let encrypted = cipher.update(text);

//     encrypted = Buffer.concat([encrypted, cipher.final()]);

//     return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV + encrypted text
// }

// // Helper function to decrypt the password (AES-256)
// function decrypt(text) {
//     let textParts = text.split(':');
//     let iv = Buffer.from(textParts.shift(), 'hex');
//     let encryptedText = Buffer.from(textParts.join(':'), 'hex');
//     let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//     let decrypted = decipher.update(encryptedText);

//     decrypted = Buffer.concat([decrypted, decipher.final()]);

//     return decrypted.toString();
// }


// app.use(bodyParser.json());

// // Create a router for the staff base path
// const staffRouter = express.Router();

// // index.js

// // // Connection URIs
// // const dataEntryUri = 'mongodb://localhost:27017/Data_Entry_Incoming';
// // const manageDoctorsUri = 'mongodb://localhost:27017/manage_doctors';

// const dataEntryUri = process.env.DATA_ENTRY_MONGO_URL;  // Use environment variable
// const manageDoctorsUri = process.env.MANAGE_DOCTORS_MONGO_URL;  // Use environment variable
// // const apiUri = process.env.API_URL;
// const adminUserUri = process.env.ADMIN_USER_URL;

// // Create new MongoClient instances for both databases
// const dataEntryClient = new MongoClient(dataEntryUri);
// const manageDoctorsClient = new MongoClient(manageDoctorsUri);
// // const apiClient = new MongoClient(apiUri);
// const adminUserClient = new MongoClient(adminUserUri);

// // Connect to both MongoDB databases
// async function connectToMongoDB() {
//     try {
//         await Promise.all([
//             dataEntryClient.connect(),
//             manageDoctorsClient.connect(),
//             // apiClient.connect(),
//             adminUserClient.connect()
//         ]);
//         console.log('Connected to MongoDB');
//     } catch (error) {
//         console.error('Error connecting to MongoDB:', error);
//     }
// }

// connectToMongoDB();


// // Access databases and collections in the routes as needed
// staffRouter.use((req, res, next) => {
//     const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
//     const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

//     res.locals.lng = currentLanguage; // Set the language for EJS templates
//     res.locals.dir = dir;             // Set the direction for EJS templates

//     res.cookie('lng', currentLanguage); // Persist language in cookies
//     req.language = currentLanguage;
//     req.dir = dir;
    
//     req.dataEntryDB = dataEntryClient.db();
//     req.manageDoctorsDB = manageDoctorsClient.db();
//     // req.apiDB = apiClient.db();
//     req.adminUserDB = adminUserClient.db();
//     next();
// });


// app.use(session({
//     secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secret key from environment variables
//     resave: false,
//     saveUninitialized: false, // Ensure sessions are only saved when modified
//     store: MongoStore.create({ mongoUrl: manageDoctorsUri }),
//     cookie: { secure: false, maxAge: 60000 * 30 } // Set appropriate cookie options
// }));



// // Log function
// function writeLog(logFile, logData) {
//     fs.appendFile(path.join(__dirname, 'logs', logFile), logData + '\n', (err) => {
//         if (err) {
//             console.error('Error writing to log file:', err);
//         }
//     });
// }





// function formatTo12Hour(datetime) {
//     const date = new Date(datetime);
//     if (isNaN(date)) {
//         return "Invalid Date";
//     }
//     return date.toLocaleString('en-US', {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true
//     });
// }




// app.use(flash());

// // Ensure flash messages are available in all templates
// staffRouter.use((req, res, next) => {
//     res.locals.successMessage = req.flash('successMessage');
//     res.locals.errorMessage = req.flash('errorMessage');
//     next();
// });
// app.set('view engine', 'ejs'); // Set EJS as the view engine
// app.set('views', path.join(__dirname, 'views')); // Set views directory
// // Serve static files (including index.html)
// app.use(bodyParser.urlencoded({ extended: true }));
// // app.use(express.static(path.join(__dirname, 'public')));

// app.use(basePath, express.static(path.join(__dirname, 'public'))); // Serve static files under the base path

// staffRouter.use((req, res, next) => {
//     res.on('finish', () => {
//         if (req.session && req.session.username && req.session.hospital_code) {
//             const { username, hospital_code } = req.session;
//             const timestamp = new Date().toISOString();
//             let Mr_no;

//             if (req.method === 'POST' && req.path === '/api/data') {
//                 Mr_no = req.body.Mr_no;
//                 const { datetime, speciality } = req.body;
//                 const action = 'creation';
//                 const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
//                 writeLog('appointment_logs.txt', logData);
//             }

//             if (req.method === 'POST' && req.path === '/api-edit') {
//                 Mr_no = req.body.mrNo;  // Ensure mrNo is captured correctly here
//                 const { datetime, speciality } = req.body;
//                 const action = 'modification';
//                 const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
//                 writeLog('appointment_logs.txt', logData);
//             }
//         }
//     });
//     next();
// });

// function getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to) {
//     return `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <style>
//             @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

//             body {
//                 margin: 0;
//                 padding: 0;
//                 font-family: 'Urbanist', sans-serif;
//                 background-color: #f7f9fc;
//             }
//             .email-container {
//                 max-width: 650px;
//                 margin: 40px auto;
//                 background: #ffffff;
//                 border-radius: 12px;
//                 box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//                 overflow: hidden;
//                 border: 1px solid #e2e8f0;
//             }
//             .email-header {
//                 background-color: #eaf3fc;
//                 color: #3b82f6;
//                 text-align: center;
//                 padding: 25px;
//                 font-size: 24px;
//                 font-weight: 600;
//             }
//             .email-body {
//                 padding: 25px 30px;
//                 color: #4a5568;
//                 font-size: 16px;
//                 line-height: 1.8;
//             }
//             .email-body h2 {
//                 color: #3b82f6;
//                 font-size: 20px;
//                 margin-bottom: 15px;
//             }
//             .email-body p {
//                 margin: 10px 0;
//             }
//             .cta-button {
//                 display: inline-block;
//                 margin: 20px auto;
//                 padding: 12px 30px;
//                 font-size: 16px;
//                 font-weight: 600;
//                 color: #ffffff;
//                 background-color: #3b82f6;
//                 border-radius: 8px;
//                 text-decoration: none;
//                 text-align: center;
//                 transition: background-color 0.3s;
//             }
//             .cta-button:hover {
//                 background-color: #2563eb;
//             }
//             .email-footer {
//                 background-color: #f1f5f9;
//                 padding: 20px;
//                 text-align: center;
//                 font-size: 14px;
//                 color: #6b7280;
//                 border-top: 1px solid #e2e8f0;
//             }
//             .email-footer a {
//                 color: #3b82f6;
//                 text-decoration: none;
//             }
//             .email-footer a:hover {
//                 text-decoration: underline;
//             }

//             /* Additional Styles Removed */
//           </style>
//       </head>
//       <body>
//           <div class="email-container">
//               <!-- Header -->
//               <div class="email-header">
//                   Appointment Confirmation
//               </div>

//               <!-- Body -->
//               <div class="email-body">
//                   <p>Dear <strong>${firstName}</strong>,</p><br>
//                   <p>Dr. <strong>${doctorName}</strong> kindly requests that you complete a short questionnaire ahead of your appointment on <strong>${formattedDatetime}</strong>. This information will help us understand your current health state and provide you with the most effective care possible.</p><br>
//                   <p>Please select the link below to begin the questionnaire:</p><br>
//                   <a href="https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="cta-button">Complete the Survey</a>
//               </div>

//               <!-- Footer -->
//               <div class="email-footer">
//                   If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
//                   &copy; 2024 Your Clinic. All rights reserved.
//                   <div class="footer-links">
//                       <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
//                   </div>
//               </div>
//           </div>
//       </body>
//       </html>
//     `;
// }


// function getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to) {
//     return `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Reminder</title>
//           <style>
//             @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

//             body {
//                 margin: 0;
//                 padding: 0;
//                 font-family: 'Urbanist', sans-serif !important;
//                 background-color: #f7f9fc;
//             }
//             .email-container {
//                 max-width: 650px;
//                 margin: 40px auto;
//                 background: #ffffff;
//                 border-radius: 12px;
//                 box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//                 overflow: hidden;
//                 border: 1px solid #e2e8f0;
//             }
//             .email-header {
//                 background-color: #eaf3fc;
//                 color: #3b82f6;
//                 text-align: center;
//                 padding: 12px;
//                 font-size: 12px;
//                 font-weight: 600;
//             }
//             .email-body {
//                 padding: 25px 30px;
//                 color: #4a5568;
//                 font-size: 16px;
//                 line-height: 1.8;
//             }
//             .email-body h2 {
//                 color: #3b82f6;
//                 font-size: 20px;
//                 margin-bottom: 15px;
//             }
//             .email-body p {
//                 margin: 10px 0;
//             }
//             .survey-link {
//                 display: inline-block;
//                 margin: 20px auto;
//                 padding: 12px 30px;
//                 font-size: 16px;
//                 font-weight: 600;
//                 color: #ffffff !important;
//                 background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
//                 border-radius: 8px;
//                 text-decoration: none;
//                 text-align: center;
//                 transition: transform 0.3s ease;
//             }
//             .survey-link:hover {
//                 background: linear-gradient(90deg, #0053d4, #009fd1);
//                 transform: translateY(-2px);
//             }
//             .email-footer {
//                 background-color: #f1f5f9;
//                 padding: 20px;
//                 text-align: center;
//                 font-size: 14px;
//                 color: #6b7280;
//                 border-top: 1px solid #e2e8f0;
//             }
//             .email-footer a {
//                 color: #3b82f6;
//                 text-decoration: none;
//             }
//             .email-footer a:hover {
//                 text-decoration: underline;
//             }

//             /* Additional Styles Removed */
//           </style>
//       </head>
//       <body>
//           <div class="email-container">
//               <!-- Header -->
//               <div class="email-header">
//                   <h1>Reminder</h1>
//               </div>

//               <!-- Body -->
//               <div class="email-body">
//                   <p>Dear <strong>${firstName}</strong>,</p><br>
//                   <p>Your appointment for <strong>${speciality}</strong> is approaching. Don't forget to complete your survey beforehand. </p>
//                   <p>If already completed, ignore. </p> <br>
                  
//                   <a href="http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
//               </div>

//               <!-- Footer -->
//               <div class="email-footer">
//                   If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
//                   &copy; 2024 Your Clinic. All rights reserved.
//                   <div class="footer-links">
//                       <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
//                   </div>
//               </div>
//           </div>
//       </body>
//       </html>
//     `;
//   }
  
//   function getFollowUpHtml(firstName, doctorName, hashedMrNo) {
//     return `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Follow Up</title>
//           <style>
//             @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

//             body {
//                 margin: 0;
//                 padding: 0;
//                 font-family: 'Urbanist', sans-serif !important;
//                 background-color: #f7f9fc;
//             }
//             .email-container {
//                 max-width: 650px;
//                 margin: 40px auto;
//                 background: #ffffff;
//                 border-radius: 12px;
//                 box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//                 overflow: hidden;
//                 border: 1px solid #e2e8f0;
//             }
//             .email-header {
//                 background-color: #eaf3fc;
//                 color: #3b82f6;
//                 text-align: center;
//                 padding: 12px;
//                 font-size: 12px;
//                 font-weight: 600;
//             }
//             .email-body {
//                 padding: 25px 30px;
//                 color: #4a5568;
//                 font-size: 16px;
//                 line-height: 1.8;
//             }
//             .email-body h2 {
//                 color: #3b82f6;
//                 font-size: 20px;
//                 margin-bottom: 15px;
//             }
//             .email-body p {
//                 margin: 10px 0;
//             }
//             .survey-link {
//                 display: inline-block;
//                 margin: 20px auto;
//                 padding: 12px 30px;
//                 font-size: 16px;
//                 font-weight: 600;
//                 color: #ffffff !important;
//                 background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
//                 border-radius: 8px;
//                 text-decoration: none;
//                 text-align: center;
//                 transition: transform 0.3s ease;
//             }
//             .survey-link:hover {
//                 background: linear-gradient(90deg, #0053d4, #009fd1);
//                 transform: translateY(-2px);
//             }
//             .email-footer {
//                 background-color: #f1f5f9;
//                 padding: 20px;
//                 text-align: center;
//                 font-size: 14px;
//                 color: #6b7280;
//                 border-top: 1px solid #e2e8f0;
//             }
//             .email-footer a {
//                 color: #3b82f6;
//                 text-decoration: none;
//             }
//             .email-footer a:hover {
//                 text-decoration: underline;
//             }

//             /* Additional Styles Removed */
//           </style>
//       </head>
//       <body>
//           <div class="email-container">
//               <!-- Header -->
//               <div class="email-header">
//                   <h1>Follow Up</h1>
//               </div>

//               <!-- Body -->
//               <div class="email-body">
//                   <p>Dear <strong>${firstName}</strong>,</p><br>
//                   <p>Dr. <strong>${doctorName}</strong> once again kindly requests that you complete a short questionnaire to assess how your health has changed as a result of your treatment.</p><br>
//                   <p>Please select the link below to begin.</p><br>
//                   <a href="http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
//               </div>

//               <!-- Footer -->
//               <div class="email-footer">
//                   If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
//                   &copy; 2024 Your Clinic. All rights reserved.
//                   <div class="footer-links">
//                       <p><a href="https://app.wehealthify.org/privacy-policy" target="_blank">Privacy Policy</a></p>
//                   </div>
//               </div>
//           </div>
//       </body>
//       </html>
//     `;
// }


// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// async function sendEmail(to, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName ) {
//     console.log("Sending email to:", to);
//     console.log("Email Type:", emailType);
//     console.log("Speciality:", speciality);
//     console.log("Formatted Datetime:", formattedDatetime);
//     console.log("Hashed MR No:", hashedMrNo);
//     console.log("First Name:", firstName);
//     console.log("Doctor Name:", doctorName);
//     let htmlBody;
  
//     // Choose the appropriate template based on the emailType
//     switch (emailType) {
//       case 'appointmentConfirmation':
//         htmlBody = getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to);
//         break;
//       case 'appointmentReminder':
//         htmlBody = getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to);
//         break;
//       case 'postAppointmentFeedback':
//         htmlBody = getFollowUpHtml(firstName, doctorName, hashedMrNo);
//         break;
//       default:
//         throw new Error("Invalid email type");
//     }
//     //console.log("HTML Body generated:", htmlBody);
//     const msg = {
//         to: to, 
//         from: 'sara@giftysolutions.com', // Change to your verified sender
//         subject: 'Help Us Improve Your Care: Complete Your Health Survey',
//         html: htmlBody,
//     }
//     try {
//             console.log("In sendEmail");
//             await sgMail.send(msg);
//             console.log('Email sent successfully');
//         } catch (error) {
//             console.error("Error sending email:", error);
//             throw error;
//         }
// }
// const accountSid = 'AC67f36ac44b4203d21bb5f7ddfc9ea3ad';  // Replace with your Account SID
// const authToken = '2831644b0d889a5d26b6ba2f507db929';
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+17077223196';  // Replace with your Twilio Phone Number

// // Twilio client initialization
// const client = require('twilio')(accountSid, authToken);

// // Function to send SMS
// function sendSMS(to, message) {
//     return client.messages.create({
//         body: message,
//         from: twilioPhoneNumber,  // Your Twilio phone number
//         to: to                    // Recipient's phone number
//     });
// }

// // Login route
// staffRouter.get('/', (req, res) => {
//     res.render('login', {
//         lng: res.locals.lng,
//         dir: res.locals.dir,
//     });
// });




// function formatTo12Hour(dateInput) {
//     // This is just an example formatTo12Hour. 
//     // In your actual code, you might already have a different/better implementation.
//     const date = new Date(dateInput);
//     if (isNaN(date.getTime())) {
//         // If invalid date, just return whatever was passed
//         return dateInput;
//     }
//     let hours = date.getHours();
//     let minutes = date.getMinutes();
//     const ampm = hours >= 12 ? 'PM' : 'AM';
//     hours = hours % 12 || 12;
//     const minutesStr = minutes < 10 ? '0' + minutes : minutes;
//     const month = date.getMonth() + 1;
//     const day = date.getDate();
//     const year = date.getFullYear();
//     return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
// }

// staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
//     const skip = req.body.skip === "true";
//     const validateOnly = req.body.validate_only === "true";
//     const finalUpload = req.body.final_upload === "true";
    
//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;
//     const db = req.dataEntryDB.collection("patient_data");
//     const doctorDB = req.manageDoctorsDB.collection("doctors");
//     // We also need to read from `surveys` for appointment_tracker:
//     const docDB = req.manageDoctorsDB;
//     const surveysCollection = docDB.collection('surveys');

//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     try {
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const processedRecords = new Map();
//         const doctorsCache = new Map();
        
//         // Header mapping configuration
//         const headerMapping = {
//             'MR Number': 'Mr_no',
//             'First Name': 'firstName',
//             'MiddleName (Optional)': 'middleName',
//             'Last Name': 'lastName',
//             'Date of Birth (mm/dd/yyyy)': 'DOB',
//             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//             'Specialty': 'speciality',
//             'Doctor ID': 'doctorId',
//             'Phone Number': 'phoneNumber',
//             'Email': 'email',
//             'Gender': 'gender'
//         };

//         // Compile regex patterns once
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;

//         // Read CSV data with optimized streaming
//         const csvData = await new Promise((resolve, reject) => {
//             const records = [];
//             fs.createReadStream(filePath)
//                 .pipe(csvParser({
//                     mapHeaders: ({ header }) => headerMapping[header] || header,
//                     skipEmptyLines: true
//                 }))
//                 .on('data', (data) => records.push(data))
//                 .on('end', () => resolve(records))
//                 .on('error', reject);
//         });

//         // Batch fetch all required doctors upfront
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await doctorDB.find({ 
//             doctor_id: { $in: Array.from(uniqueDoctorIds) },
//             hospital_code 
//         }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         // Batch fetch existing patients
//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await db.find(
//             { Mr_no: { $in: Array.from(uniqueMrNumbers) } }
//         ).toArray();
        
//         const existingPatients = new Map(
//             existingPatientsArray.map(patient => [patient.Mr_no, patient])
//         );

//         // Helper function to strip date part from "MM/DD/YYYY, HH:MM AM/PM"
//         const getDateFromDatetime = (datetime) => {
//             const [date] = datetime.split(',');
//             return date.trim();
//         };

//         const BATCH_SIZE = 100;

//         for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
//             const batch = csvData.slice(i, i + BATCH_SIZE);
            
//             for (const [batchIndex, record] of batch.entries()) {
//                 const rowNumber = i + batchIndex + 2;
//                 const validationErrors = [];

//                 // Check missing required fields
//                 [
//                     'Mr_no', 'DOB', 'speciality',
//                     'firstName', 'lastName',
//                     'datetime', 'doctorId', 'phoneNumber'
//                 ].forEach(field => {
//                     if (!record[field]) {
//                         validationErrors.push('Missing');
//                     }
//                 });

//                 const {
//                     Mr_no, DOB, speciality, gender,
//                     firstName, middleName, lastName, datetime,
//                     doctorId, phoneNumber, email
//                 } = record;

//                 // Validate formats
//                 if (datetime && !datetimeRegex.test(datetime)) {
//                     validationErrors.push('Invalid date/time format');
//                 }

//                 if (DOB && !dobRegex.test(DOB)) {
//                     validationErrors.push('Invalid date of birth format');
//                 }

//                 // Check DOB mismatch
//                 const existingPatient = existingPatients.get(Mr_no);
//                 if (existingPatient && existingPatient.DOB !== DOB) {
//                     validationErrors.push('Date of birth does not match');
//                 }

//                 // Validate doctor and specialty
//                 if (doctorId) {
//                     const doctor = doctorsCache.get(doctorId);
//                     if (!doctor) {
//                         validationErrors.push('No Doctor ID found');
//                     } 
//                 }
//                 if (speciality) {
//                     const specialtyExists = doctors.some(doc => doc.speciality === speciality);
//                     if (!specialtyExists) {
//                         validationErrors.push('Specialty not found');
//                     }
//                 }

//                 // If no major validation errors so far, check for duplicates
//                 if (validationErrors.length === 0) {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const formattedDatetimeObj = new Date(correctedDatetime);
//                     const dateOnly = getDateFromDatetime(datetime);

//                     // Check if exact appointment duplicate
//                     const exactDuplicateCheck = await db.findOne({
//                         Mr_no,
//                         "specialities": {
//                             $elemMatch: {
//                                 name: speciality,
//                                 // We must check the stored date/time format carefully. 
//                                 // If you're storing it as a Date, you'll compare differently.
//                                 timestamp: formattedDatetimeObj,
//                                 doctor_ids: doctorId
//                             }
//                         }
//                     });

//                     if (exactDuplicateCheck) {
//                         if (!skip) {
//                             duplicates.push({
//                                 rowNumber,
//                                 ...record,
//                                 validationErrors: ['Appointment already exists']
//                             });
//                         }
//                         continue;
//                     }

//                     // Check for duplicate appointments on same date
//                     if (existingPatient) {
//                         const hasExistingAppointment = existingPatient.specialities?.some(spec =>
//                             spec.name === speciality &&
//                             getDateFromDatetime(spec.timestamp?.toString() ?? '') === dateOnly
//                         );

//                         if (hasExistingAppointment) {
//                             validationErrors.push('Duplicate appointment');
//                         }
//                     }
//                 }

//                 // Categorize validation errors
//                 if (validationErrors.length > 0) {
//                     const validationRow = {
//                         rowNumber,
//                         ...record,
//                         validationErrors
//                     };

//                     // Force LTR for date/time cells in case of Excel alignment quirks
//                     if (validationRow.datetime) {
//                         validationRow.datetime = "\u200E" + validationRow.datetime;
//                     }

//                     if (validationErrors.some(error => error.startsWith('Missing'))) {
//                         missingDataRows.push(validationRow);
//                     } else if (validationErrors.some(error => error.includes('Doctor'))) {
//                         invalidDoctorsData.push(validationRow);
//                     } else if (validationErrors.some(error => error.includes('Duplicate'))) {
//                         duplicates.push(validationRow);
//                     } else {
//                         invalidEntries.push(validationRow);
//                     }
//                     continue;
//                 }

//                 // ---------------
//                 // Build appointment_tracker from the Surveys
//                 // ---------------
//                 let appointment_tracker = {};
//                 try {
//                     const specialitySurveys = await surveysCollection.findOne({
//                         specialty: speciality,
//                         hospital_code: hospital_code,
//                         site_code: site_code
//                     });

//                     if (specialitySurveys) {
//                         // 1) Group each survey by the months selected
//                         let sortedSurveys = {};
//                         specialitySurveys.surveys.forEach(survey => {
//                             survey.selected_months.forEach(month => {
//                                 if (!sortedSurveys[month]) {
//                                     sortedSurveys[month] = [];
//                                 }
//                                 sortedSurveys[month].push(survey.survey_name);
//                             });
//                         });

//                         // 2) Sort the months numerically
//                         let sortedMonths = Object.keys(sortedSurveys)
//                             .sort((a, b) => parseInt(a) - parseInt(b));

//                         // 3) Create 'Baseline' + Followup labels
//                         let surveyTypeLabels = ["Baseline"];
//                         for (let idx = 1; idx < sortedMonths.length; idx++) {
//                             surveyTypeLabels.push(`Followup - ${idx}`);
//                         }

//                         // 4) Build the array of appointment-tracker items
//                         const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                         let firstAppointmentTime = new Date(correctedDatetime);
//                         let lastAppointmentTime = new Date(firstAppointmentTime);

//                         appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                             let appointmentTime;
//                             if (index === 0) {
//                                 appointmentTime = new Date(firstAppointmentTime);
//                             } else {
//                                 let previousMonth = parseInt(sortedMonths[index - 1]);
//                                 let currentMonth = parseInt(month);
//                                 let monthDifference = currentMonth - previousMonth;
//                                 appointmentTime = new Date(lastAppointmentTime);
//                                 appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                             }
//                             lastAppointmentTime = new Date(appointmentTime);

//                             return {
//                                 month: month,
//                                 survey_name: sortedSurveys[month],
//                                 surveyType: surveyTypeLabels[index],
//                                 appointment_time: formatTo12Hour(appointmentTime),
//                                 surveyStatus: "Not Completed"
//                             };
//                         });
//                     }
//                 } catch (err) {
//                     console.error('Error building appointment_tracker:', err);
//                     // We won't block the user if there's an error fetching the survey.
//                     // You can decide if you want to push an error or skip, etc.
//                 }
//                 // ---------------

//                 // Process valid record => either update existing patient or create a new record
//                 const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                 const formattedDatetimeObj = new Date(correctedDatetime);

//                 if (existingPatient) {
//                     // We do a partial update + push new specialty 
//                     await db.updateOne(
//                         { Mr_no },
//                         {
//                             $set: {
//                                 firstName,
//                                 middleName,
//                                 lastName,
//                                 phoneNumber,
//                                 email,
//                                 gender,
//                                 datetime,  // or you can store final formatted string
//                                 surveyStatus: "Not Completed",
//                                 appointment_tracker // <--- Storing the new appointment_tracker
//                             },
//                             $push: {
//                                 specialities: {
//                                     name: speciality,
//                                     timestamp: formattedDatetimeObj,
//                                     doctor_ids: [doctorId]
//                                 },
//                                 smsLogs: {
//                                     type: "appointment creation",
//                                     speciality,
//                                     timestamp: formattedDatetimeObj
//                                 }
//                             }
//                         }
//                     );

//                 } else {
//                     // Create brand new patient record
//                     const newRecord = {
//                         Mr_no,
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime, // raw or final format as needed
//                         specialities: [{
//                             name: speciality,
//                             timestamp: formattedDatetimeObj,
//                             doctor_ids: [doctorId]
//                         }],
//                         speciality,
//                         phoneNumber,
//                         email,
//                         hospital_code,
//                         site_code,
//                         surveyStatus: "Not Completed",
//                         hashedMrNo: hashMrNo(Mr_no.toString()),
//                         smsLogs: [{
//                             type: "appointment creation",
//                             speciality,
//                             timestamp: formattedDatetimeObj
//                         }],
//                         gender,
//                         appointment_tracker // <--- Storing the new appointment_tracker
//                     };
//                     processedRecords.set(Mr_no, newRecord);
//                 }
//             }
//         }

//         // If only validating or skipping duplicates
//         if (validateOnly || skip) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed",
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates,
//                     invalidEntries
//                 }
//             });
//         }

//         // Bulk insert new records (if any)
//         if (processedRecords.size > 0) {
//             const newRecords = Array.from(processedRecords.values());
//             await db.insertMany(newRecords, { ordered: false });

//             // Send SMS messages asynchronously
//             setImmediate(() => {
//                 newRecords.forEach(record => {
//                     const smsMessage = `Dear patient, your appointments have been recorded. Please fill out these survey questions prior to your appointments: http://localhost/patientsurveys/dob-validation?identifier=${record.hashedMrNo}`;
//                     sendSMS(record.phoneNumber, smsMessage)
//                         .catch(error => console.error('SMS error:', error));
//                 });
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Upload completed",
//             uploadedCount: processedRecords.size,
//             skippedRecords: missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length,
//             totalRecords: csvData.length
//         });

//     } catch (error) {
//         console.error("Error processing batch upload:", error);
//         return res.status(500).json({
//             error: "Error processing batch upload.",
//             details: error.message
//         });
//     }
// });



// staffRouter.get('/blank-page', async (req, res) => {
//     try {
//         const hospital_code = req.session.hospital_code; 
//         const site_code = req.session.site_code;
//         const username = req.session.username; // Assuming username is stored in session
        
//         if (!hospital_code || !site_code || !username) {
//             return res.redirect(basePath); 
//         }

//         // Get the doctor information
//         const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

//         if (!doctor) {
//             return res.status(404).send('Doctor not found');
//         }

//         // Get patients data from the database filtered by hospital_code and site_code
//         const patients = await req.dataEntryDB.collection('patient_data').find({ hospital_code, site_code }).toArray();

//         res.render('blank-page', {
//             patients,
//             doctor,
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//         });
//     } catch (error) {
//         console.error('Error fetching patients data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });




// staffRouter.post('/login', async (req, res) => {
//     const staffDB = req.manageDoctorsDB.collection('staffs');
//     const { username, password } = req.body;

//     try {
//         const staff = await staffDB.findOne({ username });

//         if (!staff) {
//             req.flash('errorMessage', 'Invalid username or password');
//             return res.redirect(basePath);
//         }

//         // Check if account is locked first
//         if (staff.isLocked) {
//             req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
//             return res.redirect(basePath);
//         }

//         // Decrypt and compare password
//         const decryptedPassword = decrypt(staff.password);
        
//         if (decryptedPassword === password) {
//             // Successful login
//             if (staff.loginCounter === 0 || staff.passwordChangedByAdmin) {
//                 // Store minimal user info in session
//                 req.session.username = staff.username;
//                 req.session.hospital_code = staff.hospital_code;
//                 req.session.site_code = staff.site_code;
                
//                 // Update login counter and reset failed attempts
//                 await staffDB.updateOne(
//                     { username },
//                     { 
//                         $set: { 
//                             failedLogins: 0,
//                             lastLogin: new Date()
//                         },
//                         $inc: { loginCounter: 1 }
//                     }
//                 );

//                 return res.redirect(basePath + '/reset-password');
//             }

//             // Regular successful login
//             await staffDB.updateOne(
//                 { username },
//                 { 
//                     $set: { 
//                         failedLogins: 0,
//                         lastLogin: new Date()
//                     },
//                     $inc: { loginCounter: 1 }
//                 }
//             );

//             // Set session data
//             req.session.username = staff.username;
//             req.session.hospital_code = staff.hospital_code;
//             req.session.site_code = staff.site_code;
//             req.session.loginTime = new Date().toISOString();

//             // Log the login activity
//             const loginLogData = `username: ${staff.username}, timestamp: ${req.session.loginTime}, hospital_code: ${staff.hospital_code}, site_code: ${staff.site_code}, action: login`;
//             writeLog('user_activity_logs.txt', loginLogData);

//             return res.redirect(basePath + '/blank-page');
//         } else {
//             // Failed login attempt
//             const currentFailedLogins = (staff.failedLogins || 0) + 1;
//             const updateData = {
//                 $set: { failedLogins: currentFailedLogins }
//             };

//             if (currentFailedLogins >= 3) {
//                 updateData.$set.isLocked = true;
//                 await staffDB.updateOne({ username }, updateData);
//                 req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
//             } else {
//                 await staffDB.updateOne({ username }, updateData);
//                 req.flash('errorMessage', `Invalid password. ${3 - currentFailedLogins} attempt(s) left.`);
//             }

//             return res.redirect(basePath);
//         }

//     } catch (error) {
//         console.error('Error during login:', error);
//         const logError = `Error during login for username ${username}: ${error.message}`;
//         writeLog('error.log', logError);
//         req.flash('errorMessage', 'Internal server error. Please try again later.');
//         return res.redirect(basePath);
//     }
// });

// staffRouter.get('/logout', (req, res) => {
//     if (req.session && req.session.username && req.session.hospital_code && req.session.loginTime) {
//         const { username, hospital_code, loginTime } = req.session;
//         const logoutTime = new Date();

//         // Ensure loginTime is a valid date
//         const loginTimestamp = new Date(loginTime);
//         const sessionDuration = (logoutTime - loginTimestamp) / 1000; // Duration in seconds

//         // Log the logout activity and session duration
//         const logoutLogData = `username: ${username}, timestamp: ${logoutTime.toISOString()}, hospital_code: ${hospital_code}, action: logout, session_duration: ${sessionDuration} seconds`;
//         writeLog('user_activity_logs.txt', logoutLogData);
//     }

//     // Destroy the session and redirect to login page
//     req.session.destroy((err) => {
//         if (err) {
//             console.error('Error destroying session:', err);
//         }
//         res.redirect(basePath);
//     });
// });


// staffRouter.get('/reset-password', (req, res) => {
//     // Check if the user is logged in and has a valid session
//     if (!req.session.username) {
//         req.flash('errorMessage', 'You must be logged in to reset your password.');
//         return res.redirect(basePath);
//     }

//     // Render the reset password page
//     res.render('reset-password', {
//         success_msg: req.flash('successMessage'),
//         error_msg: req.flash('errorMessage'),
//         lng: res.locals.lng,
//         dir: res.locals.dir,
//     });
// });
// staffRouter.post('/reset-password', async (req, res) => {
//     const doctorsDB = req.manageDoctorsDB.collection('staffs');
//     const { newPassword, confirmPassword } = req.body;

//     // Validate that passwords match
//     if (newPassword !== confirmPassword) {
//         req.flash('errorMessage', 'Passwords do not match.');
//         return res.redirect(basePath+'/reset-password');
//     }

//     // Encrypt the new password
//     const encryptedPassword = encrypt(newPassword);

//     try {
//         // Update password and reset loginCounter to 1
//         await doctorsDB.updateOne(
//             { username: req.session.username },
//             { 
//                 $set: { password: encryptedPassword, loginCounter: 1,passwordChangedByAdmin:false }  // Set loginCounter to 1 after password reset
//             }
//         );
        
//         req.flash('successMessage', 'Password updated successfully.');
//         res.redirect(basePath+'/blank-page');
//     } catch (error) {
//         console.error('Error resetting password:', error);
//         req.flash('errorMessage', 'Internal server error. Please try again later.');
//         res.redirect(basePath+'/reset-password');
//     }
// });




// staffRouter.get('/data-entry', async (req, res) => {
//     // Check if required session variables are set; if not, redirect to basePath
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;
//     const username = req.session.username;

//     if (!hospital_code || !site_code || !username) {
//         return res.redirect(basePath); // Redirect to basePath if any session variable is missing
//     }

//     try {
//         // Retrieve specialties and doctor information
//         const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

//         res.render('data-entry', {
//             specialities: specialities.filter(speciality => speciality !== 'STAFF'),
//             hospital_code,
//             site_code,
//             doctor,
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.render('data-entry', {
//             specialities: [],
//             hospital_code,
//             site_code,
//             doctor: null,
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//         });
//     }
// });
// function validateSession(req, res, next) {
//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;
//     const username = req.session.username;

//     if (!hospital_code || !site_code || !username) {
//         return res.redirect(basePath); // Redirect to basePath if any session variable is missing
//     }

//     // Attach session variables to res.locals for easy access in views and route handlers
//     res.locals.hospital_code = hospital_code;
//     res.locals.site_code = site_code;
//     res.locals.username = username;

//     next(); // Proceed to the next middleware or route handler
// }

// module.exports = validateSession;




// staffRouter.get('/edit-appointment', validateSession, async (req, res) => {
//     const hashedMrNo = req.query.Mr_no;

//     const hospital_code = req.session.hospital_code; 
//         const site_code = req.session.site_code;
//         const username = req.session.username; 
//         if (!hospital_code || !site_code || !username) {
//             return res.redirect(basePath); // Redirect to basePath if any session variable is missing
//         }

//     try {
//         // Fetch patient data from the database using MR number
//         const patient = await req.dataEntryDB.collection('patient_data').findOne({ hashedMrNo:hashedMrNo });

//         if (!patient) {
//             return res.status(404).send('Patient not found');
//         }

//         // Fetch doctor information from the 'staffs' collection
//         const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

//         if (!doctor) {
//             console.warn(`Doctor with username "${username}" not found.`);
//             // Depending on your application's requirements, you might:
//             // - Redirect to an error page
//             // - Render the view without doctor information
//             // - Throw an error
//             // Here, we'll proceed without the doctor information
//         }

//         // Render the edit-appointment view with the patient and doctor data
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
//             },
//             doctor, // Pass the doctor data to the view
//             successMessage: req.flash('successMessage'),
//             errorMessage: req.flash('errorMessage'),
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//             hospital_code: res.locals.hospital_code, // If needed in the view
//             site_code: res.locals.site_code,
//             username: res.locals.username,
//         });
//     } catch (error) {
//         console.error('Error fetching patient or doctor data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


// staffRouter.post('/api-edit', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital_code = req.session.hospital_code; // Get hospital_code from session
//         const username = req.session.username; // Get username from session

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
//                     hospital_code // Add hospital_code to the document
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

//         // Fetch doctor information for rendering
//         const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

//         if (!doctor) {
//             console.warn(`Doctor with username "${username}" not found.`);
//             // Handle missing doctor case (optional)
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
//             doctor, // Include doctor data in the render function
//             successMessage: 'Patient data updated successfully.',
//             errorMessage: '',
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//         });

//     } catch (error) {
//         const { username, hospital_code } = req.session;
//         const timestamp = new Date().toISOString();
//         const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital_code: ${hospital_code}`;
//         writeLog('error_logs.txt', errorData);

//         console.error('Error:', error);
//         if (error.message.includes('does not exist')) {
//             res.status(400).json({ error: 'Patient does not exist.' });
//         } else {
//             res.status(500).json({ error: 'Internal server error' });
//         }
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

//         // Validate required fields
//         if (!datetime || !speciality || !doctorId) {
//             req.flash('errorMessage', 'Appointment date & time, and speciality & doctor selection are required.');
//             return res.redirect(basePath + '/data-entry');
//         }

//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId });
//         console.log(doctor);  // Extra logging from old code
//         const doctorName = doctor.firstName;

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Fetch survey details from the surveys collection
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality,
//             hospital_code: hospital_code,
//             site_code: site_code
//         });

//         // Structure appointment_tracker with sorting logic, surveyType & appointment_time
//         let appointment_tracker = {};
//         if (specialitySurveys) {
//             let sortedSurveys = {};

//             // Group surveys by month
//             specialitySurveys.surveys.forEach(survey => {
//                 survey.selected_months.forEach(month => {
//                     if (!sortedSurveys[month]) {
//                         sortedSurveys[month] = [];
//                     }
//                     sortedSurveys[month].push(survey.survey_name);
//                 });
//             });

//             // Sort the months numerically
//             let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));

//             // Create survey type labels
//             let surveyTypeLabels = ["Baseline"];
//             for (let i = 1; i < sortedMonths.length; i++) {
//                 surveyTypeLabels.push(`Followup - ${i}`);
//             }

//             let firstAppointmentTime = new Date(datetime);
//             let lastAppointmentTime = new Date(firstAppointmentTime);

//             appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                 let appointmentTime;
                
//                 if (index === 0) {
//                     appointmentTime = new Date(firstAppointmentTime);
//                 } else {
//                     // For the new approach, calculate how many months to add
//                     let previousMonth = parseInt(sortedMonths[index - 1]);
//                     let currentMonth = parseInt(month);
//                     let monthDifference = currentMonth - previousMonth;
//                     appointmentTime = new Date(lastAppointmentTime);
//                     appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                 }
                
//                 lastAppointmentTime = new Date(appointmentTime);

//                 return {
//                     month: month,
//                     survey_name: sortedSurveys[month],
//                     surveyType: surveyTypeLabels[index],
//                     appointment_time: formatTo12Hour(appointmentTime),
//                     surveyStatus: "Not Completed"
//                 };
//             });
//         }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();

//         // Prepare placeholders for old-code fields
//         let smsMessage;
//         let emailType;
//         const hashedMrNo = hashMrNo(Mr_no.toString());

//         // Fetch the notification preference for the site
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code },
//             { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;

//         // -----------------------
//         // If patient exists
//         // -----------------------
//         if (patient) {
//             const lastAppointmentDate = new Date(patient.datetime);
//             const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);

//             let updatedSurveyStatus = patient.surveyStatus;
//             const isSpecialityChanged = patient.speciality !== speciality;

//             // Reset surveyStatus if more than 30 days or if speciality changes
//             if (daysDifference >= 30 || isSpecialityChanged) {
//                 updatedSurveyStatus = "Not Completed";
//             }

//             // Update the specialities array
//             let updatedSpecialities = patient.specialities || [];
//             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);

//             if (specialityIndex !== -1) {
//                 updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(datetime);
//                 if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                     updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                 }
//             } else {
//                 updatedSpecialities.push({
//                     name: speciality,
//                     timestamp: formatTo12Hour(datetime),
//                     doctor_ids: [doctorId]
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         gender,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialities,
//                         speciality,
//                         phoneNumber,
//                         email,
//                         hospital_code,
//                         site_code,
//                         surveyStatus: updatedSurveyStatus,
//                         appointment_tracker
//                     },
//                     $unset: {
//                         aiMessage: "",
//                         aiMessageGeneratedAt: ""
//                     }
//                 }
//             );

//             // Prepare messages based on notification preference & updatedSurveyStatus
//             if (updatedSurveyStatus === "Not Completed") {
//                 const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                 emailType = 'appointmentConfirmation';
//             } else {
//                 console.log("Patient has already completed their surveys.");
//             }

//         // -----------------------
//         // If patient does NOT exist
//         // -----------------------
//         } else {
//             // Insert new patient data
//             await collection.insertOne({
//                 Mr_no,
//                 firstName,
//                 middleName,
//                 lastName,
//                 gender,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: formatTo12Hour(datetime),
//                     doctor_ids: [doctorId]
//                 }],
//                 speciality,
//                 phoneNumber,
//                 email,
//                 hospital_code,
//                 site_code,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo,
//                 appointment_tracker
//             });

//             const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//             smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//             emailType = 'appointmentConfirmation';    
//         }

//         // (Optional) You could use `notificationPreference` to conditionally send SMS/email here.
//         // e.g., if (notificationPreference === 'both') { // send both SMS & email ... }

//         req.flash('successMessage', 'Patient added. Notifications sent.');
//         res.redirect(basePath + '/data-entry');

//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         req.flash('errorMessage', 'Internal server error.');
//         res.redirect(basePath + '/data-entry');
//     }
// });



// // Endpoint to get patient data based on Mr_no
// staffRouter.get('/api/patient/:mrNo', async (req, res) => {
//     const mrNo = req.params.mrNo;
//     const db = req.dataEntryDB;

//     try {
//         const patient = await db.collection('patient_data').findOne({ Mr_no: mrNo });

//         if (patient) {
//             res.json({ success: true, patient });
//         } else {
//             res.json({ success: false, message: 'Patient not found' });
//         }
//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });


// // Endpoint to get all available specialties
// staffRouter.get('/api/specialties', async (req, res) => {
//     try {
//         const specialties = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.json({ success: true, specialties });
//     } catch (error) {
//         console.error('Error fetching specialties:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });

// // // Endpoint to get doctors based on speciality and hospital_code


// // Endpoint to get doctors based on speciality, hospital_code, and site_code
// staffRouter.get('/api/doctors', async (req, res) => {
//     const { speciality, hospital_code, site_code } = req.query;

//     try {
//         const doctors = await req.manageDoctorsDB.collection('doctors').find({
//             speciality,
//             hospital_code,
//             site_code // Filter by site_code as well
//         }).toArray();

//         if (doctors.length > 0) {
//             res.json({ success: true, doctors });
//         } else {
//             res.json({ success: false, message: 'No doctors found for this speciality, hospital_code, and site_code.' });
//         }
//     } catch (error) {
//         console.error('Error fetching doctors:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });





// staffRouter.get('/api/specialties-doctors', async (req, res) => {
//     const hospital_code = req.query.hospital_code;
//     const site_code = req.query.site_code; // Get site_code from the query parameters

//     try {
//         const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const result = [];

//         for (let speciality of specialties) {
//             const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital_code, site_code }).toArray();
//             if (doctors.length > 0) {
//                 result.push({ name: speciality, doctors });
//             }
//         }

//         if (result.length > 0) {
//             res.json({ success: true, specialties: result });
//         } else {
//             res.json({ success: false, message: 'No specialities or doctors found.' });
//         }
//     } catch (error) {
//         console.error('Error fetching specialties and doctors:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });






// staffRouter.post('/send-reminder', async (req, res) => {
//     const { Mr_no } = req.body;
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     try {
//         // Retrieve patient data based on Mr_no
//         const collection = db.collection('patient_data');
//         const patient = await collection.findOne({ Mr_no });

//         if (!patient) {
//             return res.status(400).json({ error: 'Phone Number not found' });
//         }

//         // Get the latest speciality from the specialities array
//         const latestSpeciality = patient.specialities.reduce((latest, speciality) => {
//             return new Date(speciality.timestamp) > new Date(latest.timestamp) ? speciality : latest;
//         }, patient.specialities[0]);
//         const latestSpecialityName = latestSpeciality.name;

//         const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
//         const formattedDatetime = formatTo12Hour(patient.datetime);

//         // Construct the reminder message
//         const reminderMessage = `Friendly reminder! Your appointment for ${latestSpeciality.name} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;

//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": patient.site_code },
//             { projection: { "sites.$": 1 } } // Only return the matching site object
//         );

//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const emailType = 'appointmentReminder'; // You can modify this if the email needs to differ from SMS

//         // Send SMS and/or email based on notification preference
//         try {
//             if (notificationPreference === 'sms' || notificationPreference === 'both') {
//                 try{
//                     await collection.updateOne(
//                         { Mr_no },
//                         {
//                             $push: {
//                                 smsLogs: {
//                                     type: "reminder",
//                                     speciality: latestSpeciality.name,
//                                     timestamp: new Date()
//                                 }
//                             }
//                         }
//                     );

//                 await sendSMS(patient.phoneNumber, reminderMessage);
//                 // Log the reminder SMS in the smsLogs array
//                 }catch{
//                     console.log("Reminder SMS Logs added in Database, but SMS not sent.")
//                 }
                
//             }

//             if (notificationPreference === 'email' || notificationPreference === 'both') {
//                 if (patient.email) { // Ensure the email exists
//                     await sendEmail(patient.email, emailType, latestSpecialityName, formattedDatetime, patient.hashedMrNo, patient.firstName);
//                     // Log the email in the emailLogs array
//                     await collection.updateOne(
//                         { Mr_no },
//                         {
//                             $push: {
//                                 emailLogs: {
//                                     type: "reminder",
//                                     speciality: latestSpeciality.name,
//                                     timestamp: new Date()
//                                 }
//                             }
//                         }
//                     );
//                 } else {
//                     console.warn('Email not provided for patient:', Mr_no);
//                 }
//             }

//             // Correct placement of res.redirect() after sending notifications
//             res.redirect(basePath + '/blank-page');
//         } catch (error) {
//             console.error('Error sending reminder:', error);
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     } catch (error) {
//         console.error('Error processing the request:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });



// staffRouter.post('/api/data-with-hospital_code', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, hospital_code } = req.body;  // hospital_code now taken from the body

//         // Extract speciality and doctor from the combined field
//         const [speciality, doctor] = req.body['speciality-doctor'].split('||');

//         // Validate required fields
//         if (!datetime || !speciality || !doctor || !hospital_code) { // Ensure hospital_code is not null
//             req.flash('errorMessage', 'Appointment date & time, speciality, doctor, and hospital_code are required.');
//             return res.redirect(basePath+'/data-entry');
//         }

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();
//         if (patient) {
//             // Update existing patient data
//             let updatedSpecialities = patient.specialities || [];
            
//             // Check if the speciality already exists in the array
//             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 // If the speciality exists, update the timestamp and add the doctor
//                 updatedSpecialities[specialityIndex].timestamp = currentTimestamp;
//                 if (!updatedSpecialities[specialityIndex].doctors.includes(doctor)) {
//                     updatedSpecialities[specialityIndex].doctors.push(doctor);
//                 }
//             } else {
//                 // If speciality does not exist, add a new object
//                 updatedSpecialities.push({
//                     name: speciality,
//                     timestamp: currentTimestamp,
//                     doctors: [doctor]
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
//                         specialities: updatedSpecialities,
//                         speciality,
//                         phoneNumber,
//                         hospital_code,  // Now using the hospital_code from the form data
//                         surveyStatus: "Not Completed"
//                     },
//                     $push: {
//                         smsLogs: {
//                             type: "appointment creation",
//                             speciality: speciality,
//                             timestamp: currentTimestamp
//                         }
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
//                     doctors: [doctor]
//                 }],
//                 speciality,
//                 phoneNumber,
//                 hospital_code,  // Now using the hospital_code from the form data
//                 surveyStatus: "Not Completed",
//                 hashedMrNo,
//                 smsLogs: [{
//                     type: "appointment creation",
//                     speciality: speciality,
//                     timestamp: new Date()
//                 }]
//             });
//         }

//         // Generate the survey link and SMS message
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `https://app.wehealthify.org:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             // Send SMS to the patient
//             await sendSMS(phoneNumber, smsMessage);
//             req.flash('successMessage', 'Patient added. SMS sent.');
//             res.redirect(basePath+'/data-entry');
//         } catch (error) {
//             console.error('Error sending SMS:', error);
//             req.flash('successMessage', 'Patient added, but SMS not sent.');
//             res.redirect(basePath+'/data-entry');
//         }
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         req.flash('errorMessage', 'Internal server error.');
//         res.redirect(basePath+'/data-entry');
//     }
// });

// // Route to serve the Privacy Policy page
// staffRouter.get('/privacy-policy', (req, res) => {
//     res.render('privacy'); // Renders 'views/privacy.ejs'
// });


// // Mount the staff router at the base path
// app.use(basePath, staffRouter);


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`API data entry server is running on `);
//     });
// }



// module.exports = startServer;






//This is include all the new Twillio features




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
const sgMail = require('@sendgrid/mail')


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
//     const skip = req.body.skip === "true";
//     const validateOnly = req.body.validate_only === "true";
//     const finalUpload = req.body.final_upload === "true";
    
//     if (!req.file) {
//         return res.status(400).json({ error: "No file uploaded!" });
//     }

//     const filePath = req.file.path;
//     const db = req.dataEntryDB.collection("patient_data");
//     const doctorDB = req.manageDoctorsDB.collection("doctors");
//     // We also need to read from `surveys` for appointment_tracker:
//     const docDB = req.manageDoctorsDB;
//     const surveysCollection = docDB.collection('surveys');
//     const adminDB = req.adminUserDB;

//     const hospital_code = req.session.hospital_code;
//     const site_code = req.session.site_code;

//     try {
//         const duplicates = [];
//         const invalidEntries = [];
//         const invalidDoctorsData = [];
//         const missingDataRows = [];
//         const processedRecords = new Map();
//         const doctorsCache = new Map();
        
//         // Header mapping configuration
//         const headerMapping = {
//             'MR Number': 'Mr_no',
//             'First Name': 'firstName',
//             'MiddleName (Optional)': 'middleName',
//             'Last Name': 'lastName',
//             'Date of Birth (mm/dd/yyyy)': 'DOB',
//             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
//             'Specialty': 'speciality',
//             'Doctor ID': 'doctorId',
//             'Phone Number': 'phoneNumber',
//             'Email': 'email',
//             'Gender': 'gender'
//         };

//         // Compile regex patterns once
//         const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
//         const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;

//         // Read CSV data with optimized streaming
//         const csvData = await new Promise((resolve, reject) => {
//             const records = [];
//             fs.createReadStream(filePath)
//                 .pipe(csvParser({
//                     mapHeaders: ({ header }) => headerMapping[header] || header,
//                     skipEmptyLines: true
//                 }))
//                 .on('data', (data) => records.push(data))
//                 .on('end', () => resolve(records))
//                 .on('error', reject);
//         });

//         // Batch fetch all required doctors upfront
//         const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
//         const doctors = await doctorDB.find({ 
//             doctor_id: { $in: Array.from(uniqueDoctorIds) },
//             hospital_code 
//         }).toArray();
//         doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

//         // Batch fetch existing patients
//         const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
//         const existingPatientsArray = await db.find(
//             { Mr_no: { $in: Array.from(uniqueMrNumbers) } }
//         ).toArray();
        
//         const existingPatients = new Map(
//             existingPatientsArray.map(patient => [patient.Mr_no, patient])
//         );

//         // Fetch hospital details for template message
//         const hospitalDetails = await adminDB.collection('hospitals').findOne(
//             { hospital_code: hospital_code }
//         );
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         // Helper function to strip date part from "MM/DD/YYYY, HH:MM AM/PM"
//         const getDateFromDatetime = (datetime) => {
//             const [date] = datetime.split(',');
//             return date.trim();
//         };

//         const BATCH_SIZE = 100;

//         for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
//             const batch = csvData.slice(i, i + BATCH_SIZE);
            
//             for (const [batchIndex, record] of batch.entries()) {
//                 const rowNumber = i + batchIndex + 2;
//                 const validationErrors = [];

//                 // Check missing required fields
//                 [
//                     'Mr_no', 'DOB', 'speciality',
//                     'firstName', 'lastName',
//                     'datetime', 'doctorId', 'phoneNumber'
//                 ].forEach(field => {
//                     if (!record[field]) {
//                         validationErrors.push('Missing');
//                     }
//                 });

//                 const {
//                     Mr_no, DOB, speciality, gender,
//                     firstName, middleName, lastName, datetime,
//                     doctorId, phoneNumber, email
//                 } = record;

//                 // Validate formats
//                 if (datetime && !datetimeRegex.test(datetime)) {
//                     validationErrors.push('Invalid date/time format');
//                 }

//                 if (DOB && !dobRegex.test(DOB)) {
//                     validationErrors.push('Invalid date of birth format');
//                 }

//                 // Check DOB mismatch
//                 const existingPatient = existingPatients.get(Mr_no);
//                 if (existingPatient && existingPatient.DOB !== DOB) {
//                     validationErrors.push('Date of birth does not match');
//                 }

//                 // Validate doctor and specialty
//                 if (doctorId) {
//                     const doctor = doctorsCache.get(doctorId);
//                     if (!doctor) {
//                         validationErrors.push('No Doctor ID found');
//                     } 
//                 }
//                 if (speciality) {
//                     const specialtyExists = doctors.some(doc => doc.speciality === speciality);
//                     if (!specialtyExists) {
//                         validationErrors.push('Specialty not found');
//                     }
//                 }

//                 // If no major validation errors so far, check for duplicates
//                 if (validationErrors.length === 0) {
//                     const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                     const formattedDatetimeObj = new Date(correctedDatetime);
//                     const dateOnly = getDateFromDatetime(datetime);

//                     // Check if exact appointment duplicate
//                     const exactDuplicateCheck = await db.findOne({
//                         Mr_no,
//                         "specialities": {
//                             $elemMatch: {
//                                 name: speciality,
//                                 timestamp: formattedDatetimeObj,
//                                 doctor_ids: doctorId
//                             }
//                         }
//                     });

//                     if (exactDuplicateCheck) {
//                         if (!skip) {
//                             duplicates.push({
//                                 rowNumber,
//                                 ...record,
//                                 validationErrors: ['Appointment already exists']
//                             });
//                         }
//                         continue;
//                     }

//                     // Check for duplicate appointments on same date
//                     if (existingPatient) {
//                         const hasExistingAppointment = existingPatient.specialities?.some(spec =>
//                             spec.name === speciality &&
//                             getDateFromDatetime(spec.timestamp?.toString() ?? '') === dateOnly
//                         );

//                         if (hasExistingAppointment) {
//                             validationErrors.push('Duplicate appointment');
//                         }
//                     }
//                 }

//                 // Categorize validation errors
//                 if (validationErrors.length > 0) {
//                     const validationRow = {
//                         rowNumber,
//                         ...record,
//                         validationErrors
//                     };

//                     // Force LTR for date/time cells in case of Excel alignment quirks
//                     if (validationRow.datetime) {
//                         validationRow.datetime = "\u200E" + validationRow.datetime;
//                     }

//                     if (validationErrors.some(error => error.startsWith('Missing'))) {
//                         missingDataRows.push(validationRow);
//                     } else if (validationErrors.some(error => error.includes('Doctor'))) {
//                         invalidDoctorsData.push(validationRow);
//                     } else if (validationErrors.some(error => error.includes('Duplicate'))) {
//                         duplicates.push(validationRow);
//                     } else {
//                         invalidEntries.push(validationRow);
//                     }
//                     continue;
//                 }

//                 // ---------------
//                 // Build appointment_tracker from the Surveys
//                 // ---------------
//                 let appointment_tracker = {};
//                 try {
//                     const specialitySurveys = await surveysCollection.findOne({
//                         specialty: speciality,
//                         hospital_code: hospital_code,
//                         site_code: site_code
//                     });

//                     if (specialitySurveys) {
//                         // 1) Group each survey by the months selected
//                         let sortedSurveys = {};
//                         specialitySurveys.surveys.forEach(survey => {
//                             survey.selected_months.forEach(month => {
//                                 if (!sortedSurveys[month]) {
//                                     sortedSurveys[month] = [];
//                                 }
//                                 sortedSurveys[month].push(survey.survey_name);
//                             });
//                         });

//                         // 2) Sort the months numerically
//                         let sortedMonths = Object.keys(sortedSurveys)
//                             .sort((a, b) => parseInt(a) - parseInt(b));

//                         // 3) Create 'Baseline' + Followup labels
//                         let surveyTypeLabels = ["Baseline"];
//                         for (let idx = 1; idx < sortedMonths.length; idx++) {
//                             surveyTypeLabels.push(`Followup - ${idx}`);
//                         }

//                         // 4) Build the array of appointment-tracker items
//                         const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                         let firstAppointmentTime = new Date(correctedDatetime);
//                         let lastAppointmentTime = new Date(firstAppointmentTime);

//                         appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                             let appointmentTime;
//                             if (index === 0) {
//                                 appointmentTime = new Date(firstAppointmentTime);
//                             } else {
//                                 let previousMonth = parseInt(sortedMonths[index - 1]);
//                                 let currentMonth = parseInt(month);
//                                 let monthDifference = currentMonth - previousMonth;
//                                 appointmentTime = new Date(lastAppointmentTime);
//                                 appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                             }
//                             lastAppointmentTime = new Date(appointmentTime);

//                             return {
//                                 month: month,
//                                 survey_name: sortedSurveys[month],
//                                 surveyType: surveyTypeLabels[index],
//                                 appointment_time: formatTo12Hour(appointmentTime),
//                                 surveyStatus: "Not Completed"
//                             };
//                         });
//                     }
//                 } catch (err) {
//                     console.error('Error building appointment_tracker:', err);
//                     // We won't block the user if there's an error fetching the survey.
//                 }
//                 // ---------------

//                 // Process valid record => either update existing patient or create a new record
//                 const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
//                 const formattedDatetimeObj = new Date(correctedDatetime);

//                 if (existingPatient) {
//                     // We do a partial update + push new specialty 
//                     await db.updateOne(
//                         { Mr_no },
//                         {
//                             $set: {
//                                 firstName,
//                                 middleName,
//                                 lastName,
//                                 phoneNumber,
//                                 email,
//                                 gender,
//                                 datetime,  // or you can store final formatted string
//                                 surveyStatus: "Not Completed",
//                                 appointment_tracker // Storing the new appointment_tracker
//                             },
//                             $push: {
//                                 specialities: {
//                                     name: speciality,
//                                     timestamp: formattedDatetimeObj,
//                                     doctor_ids: [doctorId]
//                                 },
//                                 smsLogs: {
//                                     type: "appointment creation",
//                                     speciality,
//                                     timestamp: formattedDatetimeObj
//                                 }
//                             }
//                         }
//                     );

//                     // Store updated existing patient for Twilio messaging
//                     const updatedPatient = {
//                         ...existingPatient,
//                         Mr_no,
//                         firstName,
//                         middleName,
//                         lastName,
//                         phoneNumber,
//                         email,
//                         gender,
//                         datetime,
//                         speciality,
//                         doctorId,
//                         hashedMrNo: existingPatient.hashedMrNo
//                     };
//                     processedRecords.set(Mr_no, updatedPatient);

//                 } else {
//                     // For new patients, calculate hashedMrNo and surveyLink then create new record
//                     const hashedMrNo = hashMrNo(Mr_no.toString());
//                     const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//                     // Create brand new patient record
//                     // const newRecord = {
//                     //     Mr_no,
//                     //     firstName,
//                     //     middleName,
//                     //     lastName,
//                     //     DOB,
//                     //     datetime, // raw or final format as needed
//                     //     specialities: [{
//                     //         name: speciality,
//                     //         timestamp: formattedDatetimeObj,
//                     //         doctor_ids: [doctorId]
//                     //     }],
//                     //     speciality,
//                     //     phoneNumber,
//                     //     email,
//                     //     hospital_code,
//                     //     site_code,
//                     //     surveyStatus: "Not Completed",
//                     //     hashedMrNo,
//                     //     surveyLink,  // NEW FIELD ADDED
//                     //     smsLogs: [{
//                     //         type: "appointment creation",
//                     //         speciality,
//                     //         timestamp: formattedDatetimeObj
//                     //     }],
//                     //     gender,
//                     //     appointment_tracker, // Storing the new appointment_tracker
//                     //     doctorId // Store doctorId for Twilio messaging
//                     // };

//                     const newRecord = {
//                         Mr_no,
//                         firstName,
//                         middleName,
//                         lastName,
//                         DOB,
//                         datetime,                     // raw or formatted as you already do
//                         specialities: [{
//                             name       : speciality,
//                             timestamp  : formattedDatetimeObj,
//                             doctor_ids : [doctorId]
//                         }],
//                         speciality,
//                         phoneNumber,
//                         email,
//                         hospital_code,
//                         site_code,
//                         surveyStatus : "Not Completed",
//                         hashedMrNo,
//                         surveyLink,                    // existing field
//                         appointment_tracker,
//                         gender,
//                         doctorId,                      // for Twilio
//                         SurveySent  : 1                // <-- NEW FIELD
//                     };
                    
//                     processedRecords.set(Mr_no, newRecord);
//                 }
//             }
//         }

//         // If only validating or skipping duplicates
//         if (validateOnly || skip) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Validation completed",
//                 validationIssues: {
//                     missingData: missingDataRows,
//                     invalidDoctors: invalidDoctorsData,
//                     duplicates,
//                     invalidEntries
//                 }
//             });
//         }

//         // Bulk insert new records (if any)
//         if (processedRecords.size > 0) {
//             const newRecords = Array.from(processedRecords.values());
//             const trulyNewRecords = newRecords.filter(record => !existingPatients.has(record.Mr_no));
            
//             if (trulyNewRecords.length > 0) {
//                 await db.insertMany(trulyNewRecords, { ordered: false });
//             }

//             // Send SMS messages and Twilio WhatsApp templates asynchronously
//             setImmediate(async () => {
//                 // Initialize Twilio client
//                 const twilio = require('twilio');
//                 const accountSid = process.env.TWILIO_ACCOUNT_SID;
//                 const authToken = process.env.TWILIO_AUTH_TOKEN;
//                 const client = twilio(accountSid, authToken);

//                 for (const record of newRecords) {
//                     // Traditional SMS message
//                     const smsMessage = `Dear patient, your appointments have been recorded. Please fill out these survey questions prior to your appointments: https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${record.hashedMrNo}`;
//                     sendSMS(record.phoneNumber, smsMessage)
//                         .catch(error => console.error('SMS error:', error));
                    
//                     try {
//                         // Get doctor details for this patient
//                         const doctor = doctorsCache.get(record.doctorId);
//                         if (!doctor) {
//                             console.error(`Doctor not found for ID: ${record.doctorId}`);
//                             continue;
//                         }

//                         // Build placeholder variables for the template
//                         const patientFullName = `${record.firstName} ${record.lastName}`.trim();
//                         const doctorFullName = `${doctor.firstName} ${doctor.lastName}`.trim();
//                         const formattedDatetime = record.datetime;
                        
//                         const placeholders = {
//                             1: patientFullName,                 // {{1}} - Patient name
//                             2: doctorFullName,                  // {{2}} - Doctor name
//                             3: formattedDatetime,               // {{3}} - Appointment date
//                             4: hospitalName,                    // {{4}} - Hospital Name
//                             5: record.hashedMrNo                // {{5}} - Hashed MR number
//                         };
                        
//                         // Format phone number for WhatsApp (ensure it has proper international format)
//                         let formattedPhoneNumber = record.phoneNumber;
//                         if (!formattedPhoneNumber.startsWith('whatsapp:')) {
//                             formattedPhoneNumber = `whatsapp:${formattedPhoneNumber}`;
//                         }
                        
//                         const message = await client.messages.create({
//                             from: process.env.TWILIO_WHATSAPP_NUMBER,
//                             to: formattedPhoneNumber,
//                             contentSid: process.env.TWILIO_TEMPLATE_SID,
//                             contentVariables: JSON.stringify(placeholders),
//                             statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'  // <-- Add this line
//                         });
                        
//                         console.log(`Template WhatsApp message sent to ${patientFullName} (${formattedPhoneNumber})`);
//                         console.log('Message SID:', message.sid);
                        
//                     } catch (twilioError) {
//                         console.error(`Error sending Twilio WhatsApp template to ${record.phoneNumber}:`, twilioError.message);
//                     }
//                 }
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Upload completed",
//             uploadedCount: processedRecords.size,
//             skippedRecords: missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length,
//             totalRecords: csvData.length
//         });

//     } catch (error) {
//         console.error("Error processing batch upload:", error);
//         return res.status(500).json({
//             error: "Error processing batch upload.",
//             details: error.message
//         });
//     }
// });

staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
    const skip = req.body.skip === "true";
    const validateOnly = req.body.validate_only === "true";
    const finalUpload = req.body.final_upload === "true";

    if (!req.file) {
        console.error("Upload Error: No file received.");
        return res.status(400).json({ error: "No file uploaded!" });
    }

    // --- Start: New File Saving Logic (Added) ---
    const tempFilePath = req.file.path; // Path to the temporary file uploaded by multer
    const batchUploadDir = path.join(__dirname, 'public', 'batch_upload_csv');
    let savedCsvPathForLogging = ''; // Primarily for logging where it was saved

    try {
        // 1. Ensure the target directory exists
        await fsPromises.mkdir(batchUploadDir, { recursive: true });
        // console.log(`Directory ensured: ${batchUploadDir}`); // Optional: for debugging

        // 2. Generate timestamped filename
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const fileExt = path.extname(originalName);
        const safeOriginalNameBase = path.basename(originalName, fileExt)
                                         .replace(/[^a-zA-Z0-9_-]/g, '_'); // Basic sanitization
        const newFileName = `${safeOriginalNameBase}_${timestamp}${fileExt}`;
        const destinationPath = path.join(batchUploadDir, newFileName);
        savedCsvPathForLogging = destinationPath; // Store for logging

        // 3. Copy the uploaded file to the target directory
        await fsPromises.copyFile(tempFilePath, destinationPath);
        console.log(`Uploaded CSV file saved to: ${destinationPath}`);

    } catch (saveError) {
        console.error(`Error saving uploaded CSV to ${batchUploadDir}:`, saveError);
        // Log the error but proceed with processing using the temp file
        // The core functionality should not be blocked if saving fails
        savedCsvPathForLogging = ''; // Indicate saving failed
    }
    // --- End: New File Saving Logic ---


    // --- Start: Existing Unmodified Logic ---
    const filePath = req.file.path; // <--- IMPORTANT: Keep using the original temp path for processing
    const db = req.dataEntryDB.collection("patient_data");
    const doctorDB = req.manageDoctorsDB.collection("doctors");
    const docDB = req.manageDoctorsDB;
    const surveysCollection = docDB.collection('surveys');
    const adminDB = req.adminUserDB;

    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;

    try {
        const duplicates = [];
        const invalidEntries = [];
        const invalidDoctorsData = [];
        const missingDataRows = [];
        const processedRecords = new Map();
        const doctorsCache = new Map();

        const headerMapping = {
            'MR Number': 'Mr_no',
            'First Name': 'firstName',
            'MiddleName (Optional)': 'middleName',
            'Last Name': 'lastName',
            'Date of Birth (mm/dd/yyyy)': 'DOB',
            'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
            'Specialty': 'speciality',
            'Doctor ID': 'doctorId',
            'Phone Number': 'phoneNumber',
            'Email': 'email',
            'Gender': 'gender'
        };

        const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;

        // Read CSV data from the original temporary path
        const csvData = await new Promise((resolve, reject) => {
            const records = [];
            const stream = fs.createReadStream(filePath); // Uses the original req.file.path

            stream.on('error', (err) => {
                console.error(`Error reading file stream from ${filePath}:`, err);
                reject(new Error(`Failed to read CSV file: ${err.message}`));
            });

            stream.pipe(csvParser({
                mapHeaders: ({ header }) => headerMapping[header] || header,
                skipEmptyLines: true
            }))
            .on('data', (data) => records.push(data))
            .on('headers', (headers) => {
                console.log(`CSV Headers read: ${headers.join(', ')}`);
            })
            .on('end', () => {
                console.log(`CSV parsing finished for ${filePath}. Read ${records.length} records.`);
                resolve(records);
            })
            .on('error', (err) => {
                 console.error(`CSV Parser error on file ${filePath}:`, err);
                 reject(new Error(`Failed to parse CSV: ${err.message}`));
            });
        });

        // --- All the rest of your validation, DB, and messaging logic ---
        // --- remains exactly the same as in your provided code        ---

        // Batch fetch doctors...
        const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
        const doctors = await doctorDB.find({
            doctor_id: { $in: Array.from(uniqueDoctorIds) },
            hospital_code
        }).toArray();
        doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

        // Batch fetch existing patients...
        const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
        const existingPatientsArray = await db.find(
            { Mr_no: { $in: Array.from(uniqueMrNumbers) } }
        ).toArray();
        const existingPatients = new Map(
            existingPatientsArray.map(patient => [patient.Mr_no, patient])
        );

        // Fetch hospital details...
        const hospitalDetails = await adminDB.collection('hospitals').findOne(
            { hospital_code: hospital_code }
        );
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        // Helper function...
        const getDateFromDatetime = (datetime) => {
             if (!datetime || typeof datetime !== 'string') return ''; // Basic safety check
            const [date] = datetime.split(',');
            return date ? date.trim() : '';
        };

        const BATCH_SIZE = 100;

        // Loop through batches...
        for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
            const batch = csvData.slice(i, i + BATCH_SIZE);

            for (const [batchIndex, record] of batch.entries()) {
                const rowNumber = i + batchIndex + 2;
                const validationErrors = [];

                // Validation checks... (exactly as before)
                [
                    'Mr_no', 'DOB', 'speciality',
                    'firstName', 'lastName',
                    'datetime', 'doctorId', 'phoneNumber'
                ].forEach(field => {
                    if (!record[field]) {
                        // Use a more descriptive error message if possible
                        validationErrors.push(`Missing ${field}`);
                    }
                });

                 const {
                    Mr_no, DOB, speciality, gender,
                    firstName, middleName, lastName, datetime,
                    doctorId, phoneNumber, email
                } = record;

                if (datetime && !datetimeRegex.test(datetime)) {
                    validationErrors.push('Invalid date/time format');
                }
                if (DOB && !dobRegex.test(DOB)) {
                     validationErrors.push('Invalid date of birth format');
                 }
                const existingPatient = existingPatients.get(Mr_no);
                if (existingPatient && existingPatient.DOB !== DOB) {
                     validationErrors.push('Date of birth does not match');
                 }
                if (doctorId) {
                    const doctor = doctorsCache.get(doctorId);
                    if (!doctor) validationErrors.push('No Doctor ID found');
                 }
                if (speciality) {
                     const specialtyExists = doctors.some(doc => doc.speciality === speciality);
                     if (!specialtyExists) validationErrors.push('Specialty not found');
                 }

                 // Duplicate checks... (exactly as before)
                 if (validationErrors.length === 0 && record.datetime && record.Mr_no && record.speciality && record.doctorId) { // Ensure fields exist before checking
                    const correctedDatetime = record.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                    let formattedDatetimeObj;
                    try {
                        formattedDatetimeObj = new Date(correctedDatetime);
                        if (isNaN(formattedDatetimeObj.getTime())) { // Check if date is valid
                           throw new Error('Invalid date created from datetime string');
                        }
                     } catch (dateError) {
                        console.warn(`Could not parse datetime "${record.datetime}" for duplicate check. Row ${rowNumber}. Error: ${dateError.message}`);
                        validationErrors.push('Invalid date/time format for duplicate check');
                     }

                    if (!isNaN(formattedDatetimeObj?.getTime())) { // Proceed only if date is valid
                         const dateOnly = getDateFromDatetime(record.datetime);
                        const exactDuplicateCheck = await db.findOne({
                             Mr_no: record.Mr_no,
                            "specialities": {
                                 $elemMatch: {
                                     name: record.speciality,
                                     timestamp: formattedDatetimeObj,
                                     doctor_ids: record.doctorId
                                 }
                             }
                         });

                         if (exactDuplicateCheck) {
                             if (!skip) {
                                 duplicates.push({ rowNumber, ...record, validationErrors: ['Appointment already exists'] });
                             }
                             continue; // Skip processing this record
                         }

                         if (existingPatient) {
                             const hasExistingAppointment = existingPatient.specialities?.some(spec =>
                                 spec.name === record.speciality &&
                                 getDateFromDatetime(spec.timestamp?.toString() ?? '') === dateOnly
                             );
                             if (hasExistingAppointment) {
                                 validationErrors.push('Duplicate appointment on the same day');
                             }
                         }
                    }
                 }


                // Categorize errors... (exactly as before)
                if (validationErrors.length > 0) {
                     const validationRow = { rowNumber, ...record, validationErrors };
                     if (validationRow.datetime) {
                         validationRow.datetime = "\u200E" + validationRow.datetime;
                     }
                     if (validationErrors.some(error => error.startsWith('Missing'))) {
                         missingDataRows.push(validationRow);
                     } else if (validationErrors.some(error => error.includes('Doctor') || error.includes('Specialty'))) {
                         invalidDoctorsData.push(validationRow);
                     } else if (validationErrors.some(error => error.includes('Duplicate'))) {
                         duplicates.push(validationRow);
                     } else {
                         invalidEntries.push(validationRow);
                     }
                     continue;
                 }

                // Build appointment_tracker... (exactly as before)
                let appointment_tracker = {};
                try {
                     const specialitySurveys = await surveysCollection.findOne({
                         specialty: record.speciality, // Use record's speciality
                         hospital_code: hospital_code,
                         site_code: site_code
                     });
                     if (specialitySurveys) {
                        let sortedSurveys = {};
                        specialitySurveys.surveys.forEach(survey => {
                            survey.selected_months.forEach(month => {
                                if (!sortedSurveys[month]) sortedSurveys[month] = [];
                                sortedSurveys[month].push(survey.survey_name);
                            });
                        });
                        let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                        let surveyTypeLabels = ["Baseline"];
                        for (let idx = 1; idx < sortedMonths.length; idx++) {
                            surveyTypeLabels.push(`Followup - ${idx}`);
                        }
                        const correctedApptDatetime = record.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                        let firstAppointmentTime = new Date(correctedApptDatetime);
                        let lastAppointmentTime = new Date(firstAppointmentTime);
                        appointment_tracker[record.speciality] = sortedMonths.map((month, index) => {
                            let appointmentTime;
                            if (index === 0) {
                                appointmentTime = new Date(firstAppointmentTime);
                            } else {
                                let previousMonth = parseInt(sortedMonths[index - 1]);
                                let currentMonth = parseInt(month);
                                let monthDifference = currentMonth - previousMonth;
                                appointmentTime = new Date(lastAppointmentTime);
                                appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                            }
                            lastAppointmentTime = new Date(appointmentTime);
                            return {
                                month: month,
                                survey_name: sortedSurveys[month],
                                surveyType: surveyTypeLabels[index],
                                appointment_time: formatTo12Hour(appointmentTime),
                                surveyStatus: "Not Completed"
                            };
                        });
                    }
                } catch (err) {
                     console.error('Error building appointment_tracker for row', rowNumber, ':', err);
                 }


                // Process valid record (update/insert)... (exactly as before)
                 const correctedRecordDatetime = record.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                 const formattedRecordDatetimeObj = new Date(correctedRecordDatetime);

                if (existingPatient) {
                    await db.updateOne(
                        { Mr_no: record.Mr_no }, // Use record's Mr_no
                        {
                            $set: {
                                firstName: record.firstName,
                                middleName: record.middleName,
                                lastName: record.lastName,
                                phoneNumber: record.phoneNumber,
                                email: record.email,
                                gender: record.gender,
                                datetime: record.datetime,
                                surveyStatus: "Not Completed", // Reset status on new appointment? Review this logic.
                                appointment_tracker
                            },
                            $push: {
                                specialities: {
                                    name: record.speciality,
                                    timestamp: formattedRecordDatetimeObj,
                                    doctor_ids: [record.doctorId]
                                },
                                smsLogs: {
                                    type: "appointment creation",
                                    speciality: record.speciality,
                                    timestamp: formattedRecordDatetimeObj
                                }
                            }
                        }
                    );
                    const updatedPatient = { ...existingPatient, ...record, hashedMrNo: existingPatient.hashedMrNo, appointment_tracker }; // Include tracker
                    processedRecords.set(record.Mr_no, updatedPatient);
                } else {
                    const hashedMrNo = hashMrNo(record.Mr_no.toString());
                    const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
                    const newRecord = {
                        Mr_no: record.Mr_no,
                        firstName: record.firstName,
                        middleName: record.middleName,
                        lastName: record.lastName,
                        DOB: record.DOB,
                        datetime: record.datetime,
                        specialities: [{
                            name: record.speciality,
                            timestamp: formattedRecordDatetimeObj,
                            doctor_ids: [record.doctorId]
                        }],
                        speciality: record.speciality,
                        phoneNumber: record.phoneNumber,
                        email: record.email,
                        hospital_code,
                        site_code,
                        surveyStatus: "Not Completed",
                        hashedMrNo,
                        surveyLink,
                        appointment_tracker,
                        gender: record.gender,
                        doctorId: record.doctorId,
                        SurveySent: 1
                    };
                    processedRecords.set(record.Mr_no, newRecord);
                }
            } // end inner loop (batch entries)
        } // end outer loop (batches)


        // Response handling (validateOnly/skip)... (exactly as before)
        if (validateOnly || skip) {
             console.log("Validation/Skip request processed.");
             return res.status(200).json({
                 success: true,
                 message: "Validation completed",
                 validationIssues: {
                     missingData: missingDataRows,
                     invalidDoctors: invalidDoctorsData,
                     duplicates,
                     invalidEntries
                 }
             });
         }

        // Final upload processing (DB inserts, notifications)... (exactly as before)
        if (processedRecords.size > 0) {
             const newRecords = Array.from(processedRecords.values());
             const trulyNewRecords = newRecords.filter(record => !existingPatients.has(record.Mr_no));

             if (trulyNewRecords.length > 0) {
                 try {
                     await db.insertMany(trulyNewRecords, { ordered: false });
                     console.log(`Inserted ${trulyNewRecords.length} new patient records.`);
                 } catch (insertError) {
                     console.error("Error during bulk insert:", insertError);
                     // Handle potential duplicate key errors if any slipped through validation
                     // Decide if you want to throw or just log
                 }
             } else {
                 console.log("No truly new records to insert, only updates were processed.");
             }

            // Send notifications...
            setImmediate(async () => {
                 const twilio = require('twilio');
                 const accountSid = process.env.TWILIO_ACCOUNT_SID;
                 const authToken = process.env.TWILIO_AUTH_TOKEN;
                 if (!accountSid || !authToken) {
                    console.warn("Twilio credentials not found in environment variables. Skipping WhatsApp notifications.");
                    return;
                 }
                 const client = twilio(accountSid, authToken);

                 for (const record of newRecords) { // Use newRecords which contains both new and updated info
                    // Send SMS
                    const smsMessage = `Dear patient, your appointments have been recorded. Please fill out these survey questions prior to your appointments: http://localhost/patientsurveys/dob-validation?identifier=${record.hashedMrNo}`;
                    sendSMS(record.phoneNumber, smsMessage)
                       .then(msg => console.log(`SMS sent for ${record.Mr_no}, SID: ${msg.sid}`))
                       .catch(error => console.error(`SMS error for ${record.Mr_no}:`, error.message));

                    // Send WhatsApp
                    try {
                        const doctor = doctorsCache.get(record.doctorId);
                        if (!doctor) {
                             console.error(`Doctor not found in cache for ID: ${record.doctorId} for WhatsApp message.`);
                             continue; // Skip WhatsApp if doctor info isn't available
                        }
                        const patientFullName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
                        const doctorFullName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
                        const placeholders = {
                             1: patientFullName,
                             2: doctorFullName,
                             3: record.datetime, // Use the formatted datetime from the record
                             4: hospitalName,
                             5: record.hashedMrNo
                        };
                        let formattedPhoneNumber = record.phoneNumber;
                        if (formattedPhoneNumber && !formattedPhoneNumber.startsWith('whatsapp:')) {
                             formattedPhoneNumber = `whatsapp:${formattedPhoneNumber}`;
                        }

                        if (process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID && formattedPhoneNumber) {
                             const message = await client.messages.create({
                                 from: process.env.TWILIO_WHATSAPP_NUMBER,
                                 to: formattedPhoneNumber,
                                 contentSid: process.env.TWILIO_TEMPLATE_SID,
                                 contentVariables: JSON.stringify(placeholders),
                                 statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
                             });
                             console.log(`WhatsApp template sent to ${patientFullName} (${formattedPhoneNumber}), SID: ${message.sid}`);
                        } else {
                             console.warn(`Skipping WhatsApp for ${record.Mr_no}: Missing Twilio config or phone number.`);
                        }
                    } catch (twilioError) {
                         console.error(`Error sending Twilio WhatsApp template to ${record.phoneNumber} (MR: ${record.Mr_no}):`, twilioError.message);
                    }
                 } // end for loop notifications
             }); // end setImmediate
        } // end if processedRecords.size > 0

        // Final success response... (exactly as before)
        console.log("Final Upload request processed successfully.");
        return res.status(200).json({
            success: true,
            message: "Upload completed",
            uploadedCount: processedRecords.size,
            skippedRecords: missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length,
            totalRecords: csvData.length
            // You could add savedCsvPathForLogging here if needed by the client
            // savedLocation: savedCsvPathForLogging ? path.relative(__dirname, savedCsvPathForLogging) : 'Save Failed'
        });
        // --- End of Existing Unmodified Logic ---

    } catch (error) { // Catch block for the main processing logic
        console.error("Error processing batch upload (main logic):", error);
        // Note: File saving might have succeeded even if this part fails.
        // Cleanup of the *saved* file is not done here, only the temp file below.
        return res.status(500).json({
            error: "Error processing batch upload.",
            details: error.message
        });
    } finally {
        // --- Cleanup Temporary File ---
        // This runs regardless of success or failure in the try block above
        try {
            await fsPromises.stat(tempFilePath); // Check if temp file still exists
            await fsPromises.unlink(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
            if (cleanupError.code !== 'ENOENT') { // Ignore if file already gone
                console.error(`Error cleaning up temporary file ${tempFilePath}:`, cleanupError);
            }
        }
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

        res.render('blank-page', {
            patients,
            doctor,
            lng: res.locals.lng,
            dir: res.locals.dir,
        });
    } catch (error) {
        console.error('Error fetching patients data:', error);
        res.status(500).send('Internal Server Error');
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

            return res.redirect(basePath + '/blank-page');
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
        res.redirect(basePath+'/blank-page');
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
            // Depending on your application's requirements, you might:
            // - Redirect to an error page
            // - Render the view without doctor information
            // - Throw an error
            // Here, we'll proceed without the doctor information
        }

        // Render the edit-appointment view with the patient and doctor data
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
            doctor, // Pass the doctor data to the view
            successMessage: req.flash('successMessage'),
            errorMessage: req.flash('errorMessage'),
            lng: res.locals.lng,
            dir: res.locals.dir,
            hospital_code: res.locals.hospital_code, // If needed in the view
            site_code: res.locals.site_code,
            username: res.locals.username,
        });
    } catch (error) {
        console.error('Error fetching patient or doctor data:', error);
        res.status(500).send('Internal Server Error');
    }
});



staffRouter.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
        const hospital_code = req.session.hospital_code; // Get hospital_code from session
        const username = req.session.username; // Get username from session

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

        // Fetch doctor information for rendering
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        if (!doctor) {
            console.warn(`Doctor with username "${username}" not found.`);
            // Handle missing doctor case (optional)
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
            doctor, // Include doctor data in the render function
            successMessage: 'Patient data updated successfully.',
            errorMessage: '',
            lng: res.locals.lng,
            dir: res.locals.dir,
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
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender } = req.body;  
        const hospital_code = req.session.hospital_code;
        const site_code = req.session.site_code;

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctorId) {
            req.flash('errorMessage', 'Appointment date & time, and speciality & doctor selection are required.');
            return res.redirect(basePath + '/data-entry');
        }

        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor
        const doctor = await doc_collection.findOne({ doctor_id: doctorId });
        console.log(doctor);  // Extra logging from old code
        const doctorName = doctor.firstName;

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Fetch survey details from the surveys collection
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({
            specialty: speciality,
            hospital_code: hospital_code,
            site_code: site_code
        });

        // Structure appointment_tracker with sorting logic, surveyType & appointment_time
        let appointment_tracker = {};
        if (specialitySurveys) {
            let sortedSurveys = {};
            // Group surveys by month
            specialitySurveys.surveys.forEach(survey => {
                survey.selected_months.forEach(month => {
                    if (!sortedSurveys[month]) {
                        sortedSurveys[month] = [];
                    }
                    sortedSurveys[month].push(survey.survey_name);
                });
            });
            // Sort the months numerically
            let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
            // Create survey type labels
            let surveyTypeLabels = ["Baseline"];
            for (let i = 1; i < sortedMonths.length; i++) {
                surveyTypeLabels.push(`Followup - ${i}`);
            }
            let firstAppointmentTime = new Date(datetime);
            let lastAppointmentTime = new Date(firstAppointmentTime);
            appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                let appointmentTime;
                if (index === 0) {
                    appointmentTime = new Date(firstAppointmentTime);
                } else {
                    let previousMonth = parseInt(sortedMonths[index - 1]);
                    let currentMonth = parseInt(month);
                    let monthDifference = currentMonth - previousMonth;
                    appointmentTime = new Date(lastAppointmentTime);
                    appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                }
                lastAppointmentTime = new Date(appointmentTime);
                return {
                    month: month,
                    survey_name: sortedSurveys[month],
                    surveyType: surveyTypeLabels[index],
                    appointment_time: formatTo12Hour(appointmentTime),
                    surveyStatus: "Not Completed"
                };
            });
        }

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();

        // Prepare placeholders for old-code fields
        let smsMessage;
        let emailType;
        const hashedMrNo = hashMrNo(Mr_no.toString());
        // Define the survey link once for reuse.
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;

        // Fetch the notification preference for the site
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code },
            { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;

        // Fetch hospital details for template
        const hospitalDetails = await adminDB.collection('hospitals').findOne(
            { hospital_code: hospital_code }
        );
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        // -----------------------
        // If patient exists
        // -----------------------
        if (patient) {
            const lastAppointmentDate = new Date(patient.datetime);
            const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
            let updatedSurveyStatus = patient.surveyStatus;
            const isSpecialityChanged = patient.speciality !== speciality;
            // Reset surveyStatus if more than 30 days or if speciality changes
            if (daysDifference >= 30 || isSpecialityChanged) {
                updatedSurveyStatus = "Not Completed";
            }
            // Update the specialities array
            let updatedSpecialities = patient.specialities || [];
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(datetime);
                if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                    updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                }
            } else {
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),
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
                        gender,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        email,
                        hospital_code,
                        site_code,
                        surveyStatus: updatedSurveyStatus,
                        appointment_tracker
                    },
                    $unset: {
                        aiMessage: "",
                        aiMessageGeneratedAt: ""
                    }
                }
            );
            // Prepare messages based on notification preference & updatedSurveyStatus
            if (updatedSurveyStatus === "Not Completed") {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                emailType = 'appointmentConfirmation';
            } else {
                console.log("Patient has already completed their surveys.");
            }
        // -----------------------
        // If patient does NOT exist
        // -----------------------
        // } else {
        //     // Insert new patient data with surveyLink stored for new records
        //     await collection.insertOne({
        //         Mr_no,
        //         firstName,
        //         middleName,
        //         lastName,
        //         gender,
        //         DOB,
        //         datetime: formattedDatetime,
        //         specialities: [{
        //             name: speciality,
        //             timestamp: formatTo12Hour(datetime),
        //             doctor_ids: [doctorId]
        //         }],
        //         speciality,
        //         phoneNumber,
        //         email,
        //         hospital_code,
        //         site_code,
        //         surveyStatus: "Not Completed",
        //         hashedMrNo,
        //         surveyLink,
        //         appointment_tracker,
        //     });
        }else {
            // Insert new patient data with surveyLink stored for new records
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                gender,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),
                    doctor_ids: [doctorId]
                }],
                speciality,
                phoneNumber,
                email,
                hospital_code,
                site_code,
                surveyStatus: "Not Completed",
                hashedMrNo,
                surveyLink,
                appointment_tracker,
                SurveySent: 1            // <-- NEW FIELD (default value)
            });
            // Prepare new-patient messaging using the same surveyLink
            smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
            emailType = 'appointmentConfirmation'; 
        }

        // --------------------------------------------------
        // NEW CODE: Twilio WhatsApp Template Integration
        // --------------------------------------------------
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = twilio(accountSid, authToken);
            const patientFullName = `${firstName} ${lastName}`.trim();
            const doctorFullName = `${doctor.firstName} ${doctor.lastName}`.trim();
            const placeholders = {
                1: patientFullName,                // {{1}} - Patient name
                2: doctorFullName,                 // {{2}} - Doctor name
                3: formattedDatetime,              // {{3}} - Appointment date
                4: hospitalName,                   // {{4}} - Hospital Name
                5: hashedMrNo                      // {{5}} - Hashed MR number
            };
            // Format phone number for WhatsApp (ensure it has proper international format)
            let formattedPhoneNumber = phoneNumber;
            if (!phoneNumber.startsWith('whatsapp:')) {
                formattedPhoneNumber = `whatsapp:${phoneNumber}`;
            }
            const message = await client.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                to: formattedPhoneNumber,
                contentSid: process.env.TWILIO_TEMPLATE_SID,
                contentVariables: JSON.stringify(placeholders),
                statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
            });
            console.log('Template WhatsApp message sent successfully!');
            console.log('Message SID:', message.sid);
        } catch (twilioError) {
            console.error('Error sending Twilio WhatsApp template:', twilioError.message);
        }

        req.flash('successMessage', 'Patient added. Notifications sent.');
        res.redirect(basePath + '/data-entry');
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect(basePath + '/data-entry');
    }
});
 




// staffRouter.post('/api/json-patient-data', async (req, res) => {
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     const docDB = req.manageDoctorsDB;

//     try {
//         const {
//             Mr_no,
//             firstName,
//             middleName,
//             lastName,
//             DOB,
//             datetime,
//             phoneNumber,
//             email,
//             gender,
//             // The combined field "speciality-doctor" from the body
//             // e.g., "Cardiology||DOC123"
//             'speciality-doctor': specialityDoctor
//         } = req.body;

//         const hospital_code = req.session?.hospital_code;
//         const site_code = req.session?.site_code;

//         // Extract speciality and doctorId from the combined field
//         const [speciality, doctorId] = (specialityDoctor || '').split('||');

//         // Validate required fields
//         if (!datetime || !speciality || !doctorId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Appointment date & time, and speciality & doctor selection are required.'
//             });
//         }

//         const collection = db.collection('patient_data');
//         const doc_collection = docDB.collection('doctors');

//         // Find the doctor
//         const doctor = await doc_collection.findOne({ doctor_id: doctorId });
//         const doctorName = doctor?.firstName || 'Unknown Doctor';

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Fetch survey details from the surveys collection
//         const surveysCollection = docDB.collection('surveys');
//         const specialitySurveys = await surveysCollection.findOne({
//             specialty: speciality,
//             hospital_code: hospital_code,
//             site_code: site_code
//         });

//         // Structure appointment_tracker with sorting logic, surveyType & appointment_time
//         let appointment_tracker = {};
//         if (specialitySurveys) {
//             let sortedSurveys = {};

//             // Group surveys by month
//             specialitySurveys.surveys.forEach(survey => {
//                 survey.selected_months.forEach(month => {
//                     if (!sortedSurveys[month]) {
//                         sortedSurveys[month] = [];
//                     }
//                     sortedSurveys[month].push(survey.survey_name);
//                 });
//             });

//             // Sort the months numerically
//             let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));

//             // Create survey type labels
//             let surveyTypeLabels = ["Baseline"];
//             for (let i = 1; i < sortedMonths.length; i++) {
//                 surveyTypeLabels.push(`Followup - ${i}`);
//             }

//             let firstAppointmentTime = new Date(datetime);
//             let lastAppointmentTime = new Date(firstAppointmentTime);

//             appointment_tracker[speciality] = sortedMonths.map((month, index) => {
//                 let appointmentTime;

//                 if (index === 0) {
//                     appointmentTime = new Date(firstAppointmentTime);
//                 } else {
//                     // For the new approach, calculate how many months to add
//                     let previousMonth = parseInt(sortedMonths[index - 1]);
//                     let currentMonth = parseInt(month);
//                     let monthDifference = currentMonth - previousMonth;
//                     appointmentTime = new Date(lastAppointmentTime);
//                     appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
//                 }

//                 lastAppointmentTime = new Date(appointmentTime);

//                 return {
//                     month: month,
//                     survey_name: sortedSurveys[month],
//                     surveyType: surveyTypeLabels[index],
//                     appointment_time: formatTo12Hour(appointmentTime),
//                     surveyStatus: "Not Completed"
//                 };
//             });
//         }

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });
//         const currentTimestamp = new Date();

//         // Prepare placeholders for old-code fields
//         let smsMessage;
//         let emailType;
//         const hashedMrNo = hashMrNo(Mr_no.toString());

//         // Fetch the notification preference for the site
//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": site_code },
//             { projection: { "sites.$": 1 } }
//         );
//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;

//         // Fetch hospital details for template
//         const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
//         const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

//         // -----------------------
//         // If patient exists
//         // -----------------------
//         if (patient) {
//             const lastAppointmentDate = new Date(patient.datetime);
//             const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);

//             let updatedSurveyStatus = patient.surveyStatus;
//             const isSpecialityChanged = patient.speciality !== speciality;

//             // Reset surveyStatus if more than 30 days or if speciality changes
//             if (daysDifference >= 30 || isSpecialityChanged) {
//                 updatedSurveyStatus = "Not Completed";
//             }

//             // Update the specialities array
//             let updatedSpecialities = patient.specialities || [];
//             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);

//             if (specialityIndex !== -1) {
//                 updatedSpecialities[specialityIndex].timestamp = formattedDatetime;
//                 if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
//                     updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
//                 }
//             } else {
//                 updatedSpecialities.push({
//                     name: speciality,
//                     timestamp: formattedDatetime,
//                     doctor_ids: [doctorId]
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         firstName,
//                         middleName,
//                         lastName,
//                         gender,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialities,
//                         speciality,
//                         phoneNumber,
//                         email,
//                         hospital_code,
//                         site_code,
//                         surveyStatus: updatedSurveyStatus,
//                         appointment_tracker
//                     },
//                     $unset: {
//                         aiMessage: "",
//                         aiMessageGeneratedAt: ""
//                     }
//                 }
//             );

//             // Prepare messages based on notification preference & updatedSurveyStatus
//             if (updatedSurveyStatus === "Not Completed") {
//                 const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//                 emailType = 'appointmentConfirmation';
//             } else {
//                 console.log("Patient has already completed their surveys.");
//             }

//         // -----------------------
//         // If patient does NOT exist
//         // -----------------------
//         } else {
//             // Insert new patient data
//             await collection.insertOne({
//                 Mr_no,
//                 firstName,
//                 middleName,
//                 lastName,
//                 gender,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [
//                     {
//                         name: speciality,
//                         timestamp: formattedDatetime,
//                         doctor_ids: [doctorId]
//                     }
//                 ],
//                 speciality,
//                 phoneNumber,
//                 email,
//                 hospital_code,
//                 site_code,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo,
//                 appointment_tracker
//             });

//             // Prepare new-patient messaging
//             const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
//             smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
//             emailType = 'appointmentConfirmation';
//         }

//         // --------------------------------------------------
//         // Twilio WhatsApp Template Integration
//         // --------------------------------------------------
//         try {
//             // const twilio = require('twilio');
//             // const accountSid = process.env.TWILIO_ACCOUNT_SID;
//             // const authToken = process.env.TWILIO_AUTH_TOKEN;
//             // const client = twilio(accountSid, authToken);

//             const accountSid = process.env.TWILIO_ACCOUNT_SID;
//             const authToken = process.env.TWILIO_AUTH_TOKEN;
//             const client = twilio(accountSid, authToken);

//             // Build placeholder variables for the template
//             const patientFullName = `${firstName} ${lastName}`.trim();
//             const doctorFullName = `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim();

//             const placeholders = {
//                 1: patientFullName,     // {{1}} - Patient name
//                 2: doctorFullName,      // {{2}} - Doctor name
//                 3: formattedDatetime,   // {{3}} - Appointment date
//                 4: hospitalName,        // {{4}} - Hospital Name
//                 5: hashedMrNo           // {{5}} - Hashed MR number
//             };

//             // Ensure proper WhatsApp format
//             let formattedPhoneNumber = phoneNumber;
//             if (!phoneNumber.startsWith('whatsapp:')) {
//                 formattedPhoneNumber = `whatsapp:${phoneNumber}`;
//             }

//             const message = await client.messages.create({
//                 from: process.env.TWILIO_WHATSAPP_NUMBER,
//                 to: formattedPhoneNumber,
//                 contentSid: process.env.TWILIO_TEMPLATE_SID,
//                 contentVariables: JSON.stringify(placeholders),
//                 statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
//             });

//             console.log('Template WhatsApp message sent successfully!');
//             console.log('Message SID:', message.sid);

//         } catch (twilioError) {
//             console.error('Error sending Twilio WhatsApp template:', twilioError.message);
//             // optionally handle/log the error
//         }

//         // All done: send JSON response
//         return res.status(200).json({
//             success: true,
//             message: 'Patient data processed. Notifications sent (where applicable).'
//         });

//     } catch (error) {
//         console.error('Error inserting/updating data:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Internal server error.',
//             error: error.message
//         });
//     }
// });


// Endpoint to get patient data based on Mr_no

staffRouter.post('/api/json-patient-data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const {
            Mr_no,
            firstName,
            middleName,
            lastName,
            DOB,
            datetime,
            phoneNumber,
            email,
            gender,
            // The combined field "speciality-doctor" from the body
            // e.g., "Cardiology||DOC123"
            'speciality-doctor': specialityDoctor
        } = req.body;

        const hospital_code = req.session?.hospital_code;
        const site_code = req.session?.site_code;

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = (specialityDoctor || '').split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Appointment date & time, and speciality & doctor selection are required.'
            });
        }

        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor
        const doctor = await doc_collection.findOne({ doctor_id: doctorId });
        const doctorName = doctor?.firstName || 'Unknown Doctor';

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Fetch survey details from the surveys collection
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({
            specialty: speciality,
            hospital_code: hospital_code,
            site_code: site_code
        });

        // Structure appointment_tracker with sorting logic, surveyType & appointment_time
        let appointment_tracker = {};
        if (specialitySurveys) {
            let sortedSurveys = {};

            // Group surveys by month
            specialitySurveys.surveys.forEach(survey => {
                survey.selected_months.forEach(month => {
                    if (!sortedSurveys[month]) {
                        sortedSurveys[month] = [];
                    }
                    sortedSurveys[month].push(survey.survey_name);
                });
            });

            // Sort the months numerically
            let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));

            // Create survey type labels
            let surveyTypeLabels = ["Baseline"];
            for (let i = 1; i < sortedMonths.length; i++) {
                surveyTypeLabels.push(`Followup - ${i}`);
            }

            let firstAppointmentTime = new Date(datetime);
            let lastAppointmentTime = new Date(firstAppointmentTime);

            appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                let appointmentTime;

                if (index === 0) {
                    appointmentTime = new Date(firstAppointmentTime);
                } else {
                    // For the new approach, calculate how many months to add
                    let previousMonth = parseInt(sortedMonths[index - 1]);
                    let currentMonth = parseInt(month);
                    let monthDifference = currentMonth - previousMonth;
                    appointmentTime = new Date(lastAppointmentTime);
                    appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                }

                lastAppointmentTime = new Date(appointmentTime);

                return {
                    month: month,
                    survey_name: sortedSurveys[month],
                    surveyType: surveyTypeLabels[index],
                    appointment_time: formatTo12Hour(appointmentTime),
                    surveyStatus: "Not Completed"
                };
            });
        }

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();

        // Prepare placeholders for old-code fields
        let smsMessage;
        let emailType;
        const hashedMrNo = hashMrNo(Mr_no.toString());
        // Define surveyLink once, to be used below in messaging and insertion for new records.
        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${hashedMrNo}`;

        // Fetch the notification preference for the site
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code },
            { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;

        // Fetch hospital details for template
        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        // -----------------------
        // If patient exists
        // -----------------------
        if (patient) {
            const lastAppointmentDate = new Date(patient.datetime);
            const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);

            let updatedSurveyStatus = patient.surveyStatus;
            const isSpecialityChanged = patient.speciality !== speciality;

            // Reset surveyStatus if more than 30 days or if speciality changes
            if (daysDifference >= 30 || isSpecialityChanged) {
                updatedSurveyStatus = "Not Completed";
            }

            // Update the specialities array
            let updatedSpecialities = patient.specialities || [];
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);

            if (specialityIndex !== -1) {
                updatedSpecialities[specialityIndex].timestamp = formattedDatetime;
                if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                    updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                }
            } else {
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: formattedDatetime,
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
                        gender,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        email,
                        hospital_code,
                        site_code,
                        surveyStatus: updatedSurveyStatus,
                        appointment_tracker
                    },
                    $unset: {
                        aiMessage: "",
                        aiMessageGeneratedAt: ""
                    }
                }
            );

            // Prepare messages based on notification preference & updatedSurveyStatus
            if (updatedSurveyStatus === "Not Completed") {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                emailType = 'appointmentConfirmation';
            } else {
                console.log("Patient has already completed their surveys.");
            }

        // -----------------------
        // If patient does NOT exist
        // -----------------------
        // } else {
        //     // Insert new patient data with surveyLink stored for new records
        //     await collection.insertOne({
        //         Mr_no,
        //         firstName,
        //         middleName,
        //         lastName,
        //         gender,
        //         DOB,
        //         datetime: formattedDatetime,
        //         specialities: [{
        //             name: speciality,
        //             timestamp: formattedDatetime,
        //             doctor_ids: [doctorId]
        //         }],
        //         speciality,
        //         phoneNumber,
        //         email,
        //         hospital_code,
        //         site_code,
        //         surveyStatus: "Not Completed",
        //         hashedMrNo,
        //         surveyLink,
        //         appointment_tracker,
        //     });

        }else {
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                gender,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name       : speciality,
                    timestamp  : formattedDatetime,
                    doctor_ids : [doctorId]
                }],
                speciality,
                phoneNumber,
                email,
                hospital_code,
                site_code,
                surveyStatus : "Not Completed",
                hashedMrNo,
                surveyLink,
                appointment_tracker,
                SurveySent   : 1        // <-- NEW FIELD ADDED
            });

            // Prepare new-patient messaging using the same surveyLink
            smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
            emailType = 'appointmentConfirmation';
        }

        // --------------------------------------------------
        // Twilio WhatsApp Template Integration
        // --------------------------------------------------
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = twilio(accountSid, authToken);

            // Build placeholder variables for the template
            const patientFullName = `${firstName} ${lastName}`.trim();
            const doctorFullName = `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim();

            const placeholders = {
                1: patientFullName,     // {{1}} - Patient name
                2: doctorFullName,      // {{2}} - Doctor name
                3: formattedDatetime,   // {{3}} - Appointment date
                4: hospitalName,        // {{4}} - Hospital Name
                5: hashedMrNo           // {{5}} - Hashed MR number
            };

            // Ensure proper WhatsApp format
            let formattedPhoneNumber = phoneNumber;
            if (!phoneNumber.startsWith('whatsapp:')) {
                formattedPhoneNumber = `whatsapp:${phoneNumber}`;
            }

            const message = await client.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                to: formattedPhoneNumber,
                contentSid: process.env.TWILIO_TEMPLATE_SID,
                contentVariables: JSON.stringify(placeholders),
                statusCallback: 'https://app.wehealthify.org/whatsapp-status-callback'
            });

            console.log('Template WhatsApp message sent successfully!');
            console.log('Message SID:', message.sid);

        } catch (twilioError) {
            console.error('Error sending Twilio WhatsApp template:', twilioError.message);
            // optionally handle/log the error
        }

        // All done: send JSON response
        return res.status(200).json({
            success: true,
            message: 'Patient data processed. Notifications sent (where applicable).'
        });

    } catch (error) {
        console.error('Error inserting/updating data:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message
        });
    }
});


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
    const adminDB = req.adminUserDB;
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
        const latestSpecialityName = latestSpeciality.name;

        const surveyLink = `https://app.wehealthify.org/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
        const formattedDatetime = formatTo12Hour(patient.datetime);

        // Construct the reminder message
        const reminderMessage = `Friendly reminder! Your appointment for ${latestSpeciality.name} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;

        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": patient.site_code },
            { projection: { "sites.$": 1 } } // Only return the matching site object
        );

        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const emailType = 'appointmentReminder'; // You can modify this if the email needs to differ from SMS

        // Send SMS and/or email based on notification preference
        try {
            if (notificationPreference === 'sms' || notificationPreference === 'both') {
                try{
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

                await sendSMS(patient.phoneNumber, reminderMessage);
                // Log the reminder SMS in the smsLogs array
                }catch{
                    console.log("Reminder SMS Logs added in Database, but SMS not sent.")
                }
                
            }

            if (notificationPreference === 'email' || notificationPreference === 'both') {
                if (patient.email) { // Ensure the email exists
                    await sendEmail(patient.email, emailType, latestSpecialityName, formattedDatetime, patient.hashedMrNo, patient.firstName);
                    // Log the email in the emailLogs array
                    await collection.updateOne(
                        { Mr_no },
                        {
                            $push: {
                                emailLogs: {
                                    type: "reminder",
                                    speciality: latestSpeciality.name,
                                    timestamp: new Date()
                                }
                            }
                        }
                    );
                } else {
                    console.warn('Email not provided for patient:', Mr_no);
                }
            }

            // Correct placement of res.redirect() after sending notifications
            res.redirect(basePath + '/blank-page');
        } catch (error) {
            console.error('Error sending reminder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } catch (error) {
        console.error('Error processing the request:', error);
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
