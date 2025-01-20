// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const app = express();
const i18nextMiddleware = require('i18next-http-middleware');
const i18next = require('i18next');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');
const upload = multer({ dest: "uploads/" });
const sgMail = require('@sendgrid/mail')


app.use('/staff/locales', express.static(path.join(__dirname, 'views/locales')));;
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





const basePath = '/staff'; // Base path for routes
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
              /* General reset and font setup */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Roboto', sans-serif; background-color: #f4f7fc; line-height: 1.6; color: #4f4f4f; padding: 30px; }
              .container { width: 100%; max-width: 650px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); margin: 0 auto; padding: 40px 50px; font-size: 16px; }
              .header { text-align: center; margin-bottom: 40px; }
              .header h1 { font-size: 28px; font-weight: 600; color: #333; letter-spacing: 1px; margin-bottom: 10px; }
              .header p { font-size: 16px; color: #777; }
              .survey-link { display: inline-block; background: linear-gradient(90deg, #0061f2, #00b3f6); color: white; padding: 12px 25px; font-size: 18px; font-weight: bold; border-radius: 6px; text-decoration: none; transition: background 0.3s ease, transform 0.3s ease; text-align: center; }
              .survey-link:hover { background: linear-gradient(90deg, #0053d4, #009fd1); transform: translateY(-2px); }
              .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #777; }
              .footer a { color: #0061f2; text-decoration: none; }
              .footer a:hover { text-decoration: underline; }
              .footer-links { margin-top: 20px; text-align: center; font-size: 14px; color: #888; }
              .footer-links a { margin: 0 15px; color: #0061f2; text-decoration: none; font-weight: bold; }
              .footer-links a:hover { text-decoration: underline; }
              /* Modal Styles */
              .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.5); transition: opacity 0.3s ease; }
              .modal-content { background-color: #fff; margin: 10% auto; padding: 40px; border-radius: 15px; width: 80%; max-width: 800px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); animation: fadeIn 0.5s ease-out; }
              .modal-header { font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #e6e6e6; padding-bottom: 10px; }
              .modal-body { font-size: 16px; color: #555; line-height: 1.8; padding-bottom: 20px; }
              .modal-footer { text-align: right; margin-top: 20px; }
              .close { color: #aaa; font-size: 28px; font-weight: bold; float: right; cursor: pointer; }
              .close:hover, .close:focus { color: #e74c3c; text-decoration: none; cursor: pointer; }
              @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Appointment Confirmation</h1>
              </div>
  
              <div class="content">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> kindly requests that you complete a short questionnaire ahead of your appointment on <strong>${formattedDatetime}</strong>. This information will help us understand your current health state and provide you with the most effective care possible.</p><br>
                  <p>Please select the link below to begin the questionnaire:</p><br>
                  <a href="https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>
  
              <br><br><hr>
  
              <div class="footer">
                  <p>If you have any questions or need further assistance, feel free to <a href="mailto:support@wehealthify.org">contact us</a>.</p>
              </div>
  
              <div class="footer-links">
                  <p><a href="javascript:void(0);" id="privacyLink">Privacy Policy</a></p>
              </div>
          </div>
  
          <!-- The Modal -->
          <div id="privacyModal" class="modal">
              <div class="modal-content">
                  <span class="close" id="closeModalIcon">&times;</span>
                  <div class="modal-header">
                      Privacy Policy for PROMs App
                  </div>
                  <div class="modal-body">
                      <p><strong>1. Introduction</strong></p>
                      <p>This Privacy Policy explains how we collect, use, disclose, and protect your personal data when you use the PROMs app (PROMs App Link). The PROMs app is designed to measure patient-reported outcomes and manage hospital staff, doctor, and patient data securely and in compliance with data protection regulations.</p>
                      <p>By using our app, you agree to the collection and use of your information in accordance with this policy.</p>
  
                      <p><strong>2. Patient Data We Collect</strong></p>
                      <ul>
                          <li><strong>Personal Information</strong>: Name, Date of Birth, Phone Number, Medical Record (MR) Number, and Appointment Details.</li>
                          <li><strong>Health Information</strong>: PROMs survey responses related to your health status, doctor’s notes, ICD codes, and medical history.</li>
                      </ul>
  
                      <p><strong>3. How We Use Your Data</strong></p>
                      <ul>
                          <li>Facilitate patient-doctor interactions through PROMs surveys.</li>
                          <li>Enable doctors to view and analyze patient progress.</li>
                          <li>Ensure the proper functioning of the app and improve healthcare outcomes.</li>
                      </ul>
  
                      <p><strong>4. Legal Basis for Processing</strong></p>
                      <ul>
                          <li>GDPR (General Data Protection Regulation) for users based in the EU.</li>
                          <li>HIPAA (Health Insurance Portability and Accountability Act) for healthcare-related data in the US.</li>
                          <li>Explicit user consent is obtained before processing any personal data.</li>
                      </ul>
  
                      <p><strong>6. Security of Your Data</strong></p>
                      <ul>
                          <li><strong>Encryption</strong>: All personal data is encrypted both at rest (AES-256) and in transit (SSL/TLS).</li>
                          <li><strong>Access Controls</strong>: Role-based access ensures that only authorized personnel can access sensitive information.</li>
                          <li><strong>Audit Logs</strong>: All actions are logged for security monitoring and accountability.</li>
                      </ul>
  
                      <p><strong>7. Data Retention Policy</strong></p>
                      <p>Patient data will be retained for a minimum of 5 years or as required by local health regulations. After this period, data will be anonymized or securely deleted.</p>
  
                      <p><strong>8. Your Data Rights</strong></p>
                      <ul>
                          <li><strong>Access</strong>: You may request a copy of your personal data.</li>
                          <li><strong>Correction</strong>: You can request corrections to inaccurate or incomplete data.</li>
                          <li><strong>Deletion</strong>: You can request the deletion of your data where applicable.</li>
                          <li><strong>Data Portability</strong>: You can request a copy of your data in a portable format.</li>
                      </ul>
  
                      <p>To exercise these rights, contact our support team at <a href="mailto:privacy@promsapp.com">privacy@promsapp.com</a>.</p>
  
                      <p><strong>9. Data Breach Notifications</strong></p>
                      <p>In the event of a data breach, we will notify affected users and relevant authorities within 72 hours as required by GDPR and HIPAA.</p>
  
                      <p><strong>10. Changes to the Privacy Policy</strong></p>
                      <p>We may update this policy from time to time. You will be notified of any changes via email or through our app.</p>
  
                      <p><strong>11. Contact Information</strong></p>
                      <ul>
                          <li>Email: <a href="mailto:support@wehealthify.org">support@wehealthify.org</a></li>
                          <li>Website: <a href="https://app.wehealthify.org">app.wehealthify.org</a></li>
                          <li>Address: Suite 2 Parkway 5 Parkway Business Centre, 300 Princess Road, Manchester, M14 7HR</li>
                      </ul>
                  </div>
                  <div class="modal-footer">
                      <button class="survey-link" id="closeModalButton">Close</button>
                  </div>
              </div>
          </div>
  
          <script>
              var modal = document.getElementById("privacyModal");
              var privacyLink = document.getElementById("privacyLink");
              var closeModalIcon = document.getElementById("closeModalIcon");
              var closeModalButton = document.getElementById("closeModalButton");
  
              privacyLink.onclick = function() {
                  modal.style.display = "block";
              }
  
              closeModalIcon.onclick = function() {
                  modal.style.display = "none";
              }
  
              closeModalButton.onclick = function() {
                  modal.style.display = "none";
              }
  
              window.onclick = function(event) {
                  if (event.target == modal) {
                      modal.style.display = "none";
                  }
              }
          </script>
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
              /* General reset and font setup */
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Roboto', sans-serif;
                  background-color: #f4f7fc;
                  line-height: 1.6;
                  color: #4f4f4f;
                  padding: 30px;
              }
  
              /* Container for the email content */
              .container {
                  width: 100%;
                  max-width: 650px;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                  margin: 0 auto;
                  padding: 40px 50px;
                  font-size: 16px;
                  text-align: left;
              }
  
              /* Header */
              .header {
                  text-align: center;
                  margin-bottom: 40px;
              }
              .header h1 {
                  font-size: 28px;
                  font-weight: 600;
                  color: #333;
                  letter-spacing: 1px;
                  margin-bottom: 10px;
              }
              .header p {
                  font-size: 16px;
                  color: #777;
              }
  
              /* Survey Link button styling */
              .survey-link {
                  display: inline-block;
                  background: linear-gradient(90deg, #0061f2, #00b3f6);
                  color: white;
                  padding: 12px 25px;
                  font-size: 18px;
                  font-weight: bold;
                  border-radius: 6px;
                  text-decoration: none;
                  transition: background 0.3s ease, transform 0.3s ease;
                  text-align: center;
              }
  
              .survey-link:hover {
                  background: linear-gradient(90deg, #0053d4, #009fd1);
                  transform: translateY(-2px);
              }
  
              /* Footer */
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 14px;
                  color: #777;
              }
              .footer a {
                  color: #0061f2;
                  text-decoration: none;
              }
  
              .footer a:hover {
                  text-decoration: underline;
              }
  
              /* Footer links section */
              .footer-links {
                  margin-top: 20px;
                  text-align: center;
                  font-size: 14px;
                  color: #888;
              }
              .footer-links a {
                  margin: 0 15px;
                  color: #0061f2;
                  text-decoration: none;
                  font-weight: bold;
              }
  
              .footer-links a:hover {
                  text-decoration: underline;
              }
  
              /* Modal Styles */
              .modal {
                  display: none; /* Hidden by default */
                  position: fixed;
                  z-index: 1; /* Sit on top */
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  overflow: auto; /* Enable scroll if needed */
                  background-color: rgba(0, 0, 0, 0.5); /* Black with opacity */
                  transition: opacity 0.3s ease;
              }
  
              .modal-content {
                  background-color: #fff;
                  margin: 10% auto;
                  padding: 40px;
                  border-radius: 15px;
                  width: 80%;
                  max-width: 800px;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                  animation: fadeIn 0.5s ease-out;
              }
  
              .modal-header {
                  font-size: 24px;
                  font-weight: 700;
                  color: #2c3e50;
                  margin-bottom: 20px;
                  border-bottom: 2px solid #e6e6e6;
                  padding-bottom: 10px;
              }
  
              .modal-body {
                  font-size: 16px;
                  color: #555;
                  line-height: 1.8;
                  padding-bottom: 20px;
              }
  
              .modal-footer {
                  text-align: right;
                  margin-top: 20px;
              }
  
              .close {
                  color: #aaa;
                  font-size: 28px;
                  font-weight: bold;
                  float: right;
                  cursor: pointer;
              }
  
              .close:hover,
              .close:focus {
                  color: #e74c3c;
                  text-decoration: none;
                  cursor: pointer;
              }
  
              @keyframes fadeIn {
                  0% { opacity: 0; }
                  100% { opacity: 1; }
              }
  
              /* Scrollable content in modal */
              .modal-body p {
                  margin-bottom: 15px;
              }
  
              .modal-body ul {
                  list-style-type: none;
                  padding-left: 0;
              }
  
              .modal-body ul li {
                  padding-left: 20px;
                  position: relative;
              }
  
              .modal-body ul li:before {
                  content: '•';
                  position: absolute;
                  left: 0;
                  color: #3498db;
              }
  
          </style>
      </head>
      <body>
  
          <div class="container">
              <div class="header">
                  <h1>Reminder</h1>
              </div>
  
              <div class="content">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Your appointment for <strong>${speciality}</strong> on <strong>${formattedDatetime}</strong> is approaching. Don't forget to complete your survey beforehand. </p><br>
                  
                  <a href="https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>
  
              <br><br><hr>
  
              <div class="footer">
                  <p>If you have any questions or need further assistance, feel free to <a href="mailto:support@wehealthify.org">contact us</a>.</p>
              </div>
  
              <div class="footer-links">
                  <p><a href="javascript:void(0);" id="privacyLink">Privacy Policy</a></p>
              </div>
          </div>
  
          <!-- The Modal -->
          <div id="privacyModal" class="modal">
              <div class="modal-content">
                  <span class="close" id="closeModalIcon">&times;</span>
                  <div class="modal-header">
                      Privacy Policy for PROMs App
                  </div>
                  <div class="modal-body">
                      <p><strong>1. Introduction</strong></p>
                      <p>This Privacy Policy explains how we collect, use, disclose, and protect your personal data when you use the PROMs app (PROMs App Link). The PROMs app is designed to measure patient-reported outcomes and manage hospital staff, doctor, and patient data securely and in compliance with data protection regulations.</p>
                      <p>By using our app, you agree to the collection and use of your information in accordance with this policy.</p>
  
                      <p><strong>2. Patient Data We Collect</strong></p>
                      <ul>
                          <li><strong>Personal Information</strong>: Name, Date of Birth, Phone Number, Medical Record (MR) Number, and Appointment Details.</li>
                          <li><strong>Health Information</strong>: PROMs survey responses related to your health status, doctor’s notes, ICD codes, and medical history.</li>
                      </ul>
  
                      <p><strong>3. How We Use Your Data</strong></p>
                      <ul>
                          <li>Facilitate patient-doctor interactions through PROMs surveys.</li>
                          <li>Enable doctors to view and analyze patient progress.</li>
                          <li>Ensure the proper functioning of the app and improve healthcare outcomes.</li>
                      </ul>
  
                      <p><strong>4. Legal Basis for Processing</strong></p>
                      <ul>
                          <li>GDPR (General Data Protection Regulation) for users based in the EU.</li>
                          <li>HIPAA (Health Insurance Portability and Accountability Act) for healthcare-related data in the US.</li>
                          <li>Explicit user consent is obtained before processing any personal data.</li>
                      </ul>
  
                      <p><strong>6. Security of Your Data</strong></p>
                      <ul>
                          <li><strong>Encryption</strong>: All personal data is encrypted both at rest (AES-256) and in transit (SSL/TLS).</li>
                          <li><strong>Access Controls</strong>: Role-based access ensures that only authorized personnel can access sensitive information.</li>
                          <li><strong>Audit Logs</strong>: All actions are logged for security monitoring and accountability.</li>
                      </ul>
  
                      <p><strong>7. Data Retention Policy</strong></p>
                      <p>Patient data will be retained for a minimum of 5 years or as required by local health regulations. After this period, data will be anonymized or securely deleted.</p>
  
                      <p><strong>8. Your Data Rights</strong></p>
                      <ul>
                          <li><strong>Access</strong>: You may request a copy of your personal data.</li>
                          <li><strong>Correction</strong>: You can request corrections to inaccurate or incomplete data.</li>
                          <li><strong>Deletion</strong>: You can request the deletion of your data where applicable.</li>
                          <li><strong>Data Portability</strong>: You can request a copy of your data in a portable format.</li>
                      </ul>
  
                      <p>To exercise these rights, contact our support team at <a href="mailto:privacy@promsapp.com">privacy@promsapp.com</a>.</p>
  
                      <p><strong>9. Data Breach Notifications</strong></p>
                      <p>In the event of a data breach, we will notify affected users and relevant authorities within 72 hours as required by GDPR and HIPAA.</p>
  
                      <p><strong>10. Changes to the Privacy Policy</strong></p>
                      <p>We may update this policy from time to time. You will be notified of any changes via email or through our app.</p>
  
                      <p><strong>11. Contact Information</strong></p>
                      <ul>
                          <li>Email: <a href="mailto:support@wehealthify.org">support@wehealthify.org</a></li>
                          <li>Website: <a href="https://app.wehealthify.org">app.wehealthify.org</a></li>
                          <li>Address: Suite 2 Parkway 5 Parkway Business Centre, 300 Princess Road, Manchester, M14 7HR</li>
                      </ul>
                  </div>
                  <div class="modal-footer">
                      <button class="survey-link" id="closeModalButton">Close</button>
                  </div>
              </div>
          </div>
  
          <script>
              var modal = document.getElementById("privacyModal");
              var privacyLink = document.getElementById("privacyLink");
              var closeModalIcon = document.getElementById("closeModalIcon");
              var closeModalButton = document.getElementById("closeModalButton");
  
              privacyLink.onclick = function() {
                  modal.style.display = "block";
              }
  
              closeModalIcon.onclick = function() {
                  modal.style.display = "none";
              }
  
              closeModalButton.onclick = function() {
                  modal.style.display = "none";
              }
  
              window.onclick = function(event) {
                  if (event.target == modal) {
                      modal.style.display = "none";
                  }
              }
          </script>
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
              /* General reset and font setup */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Roboto', sans-serif; background-color: #f4f7fc; color: #4f4f4f; padding: 30px; }
              .container { width: 100%; max-width: 650px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); padding: 40px 50px; font-size: 16px; }
              .header { text-align: center; margin-bottom: 40px; }
              .header h1 { font-size: 28px; font-weight: 600; color: #333; }
              .survey-link { background: linear-gradient(90deg, #0061f2, #00b3f6); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; }
              .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #777; }
              .footer a { color: #0061f2; text-decoration: none; }
              .footer a:hover { text-decoration: underline; }
              .footer-links { margin-top: 20px; text-align: center; font-size: 14px; color: #888; }
              .footer-links a { margin: 0 15px; color: #0061f2; text-decoration: none; font-weight: bold; }
              .footer-links a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Follow Up</h1>
              </div>
              <div class="content">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> once again kindly requests that you complete a short questionnaire to assess how your health has changed as a result of your treatment.</p><br>
                  <p>Please select the link below to begin.</p><br>
                  <a href="https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>
              <br><br><hr>
              <div class="footer">
                  <p>If you have any questions or need further assistance, feel free to <a href="mailto:support@wehealthify.org">contact us</a>.</p>
              </div>
              <div class="footer-links">
                  <p><a href="javascript:void(0);" id="privacyLink">Privacy Policy</a></p>
              </div>
          </div>
  
          <!-- The Modal -->
          <div id="privacyModal" class="modal">
              <div class="modal-content">
                  <span class="close" id="closeModalIcon">&times;</span>
                  <div class="modal-header">
                      Privacy Policy for PROMs App
                  </div>
                  <div class="modal-body">
                      <p><strong>1. Introduction</strong></p>
                      <p>This Privacy Policy explains how we collect, use, disclose, and protect your personal data when you use the PROMs app (PROMs App Link). The PROMs app is designed to measure patient-reported outcomes and manage hospital staff, doctor, and patient data securely and in compliance with data protection regulations.</p>
                      <p>By using our app, you agree to the collection and use of your information in accordance with this policy.</p>
  
                      <p><strong>2. Patient Data We Collect</strong></p>
                      <ul>
                          <li><strong>Personal Information</strong>: Name, Date of Birth, Phone Number, Medical Record (MR) Number, and Appointment Details.</li>
                          <li><strong>Health Information</strong>: PROMs survey responses related to your health status, doctor’s notes, ICD codes, and medical history.</li>
                      </ul>
  
                      <p><strong>3. How We Use Your Data</strong></p>
                      <ul>
                          <li>Facilitate patient-doctor interactions through PROMs surveys.</li>
                          <li>Enable doctors to view and analyze patient progress.</li>
                          <li>Ensure the proper functioning of the app and improve healthcare outcomes.</li>
                      </ul>
  
                      <p><strong>4. Legal Basis for Processing</strong></p>
                      <ul>
                          <li>GDPR (General Data Protection Regulation) for users based in the EU.</li>
                          <li>HIPAA (Health Insurance Portability and Accountability Act) for healthcare-related data in the US.</li>
                          <li>Explicit user consent is obtained before processing any personal data.</li>
                      </ul>
  
                      <p><strong>6. Security of Your Data</strong></p>
                      <ul>
                          <li><strong>Encryption</strong>: All personal data is encrypted both at rest (AES-256) and in transit (SSL/TLS).</li>
                          <li><strong>Access Controls</strong>: Role-based access ensures that only authorized personnel can access sensitive information.</li>
                          <li><strong>Audit Logs</strong>: All actions are logged for security monitoring and accountability.</li>
                      </ul>
  
                      <p><strong>7. Data Retention Policy</strong></p>
                      <p>Patient data will be retained for a minimum of 5 years or as required by local health regulations. After this period, data will be anonymized or securely deleted.</p>
  
                      <p><strong>8. Your Data Rights</strong></p>
                      <ul>
                          <li><strong>Access</strong>: You may request a copy of your personal data.</li>
                          <li><strong>Correction</strong>: You can request corrections to inaccurate or incomplete data.</li>
                          <li><strong>Deletion</strong>: You can request the deletion of your data where applicable.</li>
                          <li><strong>Data Portability</strong>: You can request a copy of your data in a portable format.</li>
                      </ul>
  
                      <p>To exercise these rights, contact our support team at <a href="mailto:privacy@promsapp.com">privacy@promsapp.com</a>.</p>
  
                      <p><strong>9. Data Breach Notifications</strong></p>
                      <p>In the event of a data breach, we will notify affected users and relevant authorities within 72 hours as required by GDPR and HIPAA.</p>
  
                      <p><strong>10. Changes to the Privacy Policy</strong></p>
                      <p>We may update this policy from time to time. You will be notified of any changes via email or through our app.</p>
  
                      <p><strong>11. Contact Information</strong></p>
                      <ul>
                          <li>Email: <a href="mailto:support@wehealthify.org">support@wehealthify.org</a></li>
                          <li>Website: <a href="https://app.wehealthify.org">app.wehealthify.org</a></li>
                          <li>Address: Suite 2 Parkway 5 Parkway Business Centre, 300 Princess Road, Manchester, M14 7HR</li>
                      </ul>
                  </div>
                  <div class="modal-footer">
                      <button class="survey-link" id="closeModalButton">Close</button>
                  </div>
              </div>
          </div>
  
          <script>
              var modal = document.getElementById("privacyModal");
              var privacyLink = document.getElementById("privacyLink");
              var closeModalIcon = document.getElementById("closeModalIcon");
              var closeModalButton = document.getElementById("closeModalButton");
  
              privacyLink.onclick = function() {
                  modal.style.display = "block";
              }
  
              closeModalIcon.onclick = function() {
                  modal.style.display = "none";
              }
  
              closeModalButton.onclick = function() {
                  modal.style.display = "none";
              }
  
              window.onclick = function(event) {
                  if (event.target == modal) {
                      modal.style.display = "none";
                  }
              }
          </script>
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

staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
    const skip = req.body.skip === "true";
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded!" });
    }

    const filePath = req.file.path;
    const db = req.dataEntryDB.collection("patient_data");
    const doctorDB = req.manageDoctorsDB.collection("doctors");
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;

    try {
        const duplicates = [];
        const invalidEntries = [];
        const invalidDoctorsData = [];
        const missingDataRows = [];
        const processedRecords = new Map();
        const doctorsCache = new Map();

        // Maps for duplicate checking
        const specialityTimeMap = new Map(); // For checking same speciality at same time
        const patientSpecialityDateMap = new Map(); // For checking same patient-speciality on same date
        const patientDatetimeMap = new Map(); // For checking same patient at same time

        // Helper function to extract date from datetime
        const getDateFromDatetime = (datetime) => {
            const [date] = datetime.split(',');
            return date.trim();
        };

        // Read CSV data
        const csvData = await new Promise((resolve, reject) => {
            const records = [];
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => records.push(data))
                .on('end', () => resolve(records))
                .on('error', reject);
        });

        // Fetch all existing patients
        const existingPatientsArray = await db.find(
            { Mr_no: { $in: csvData.map(record => record.Mr_no) } }
        ).toArray();
        
        const existingPatients = new Map(
            existingPatientsArray.map(patient => [patient.Mr_no, patient])
        );

        // Process records
        const BATCH_SIZE = 100;
        for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
            const batch = csvData.slice(i, i + BATCH_SIZE);
            
            for (const [batchIndex, record] of batch.entries()) {
                const rowNumber = i + batchIndex + 2;
                const {
                    Mr_no, DOB, speciality, gender,
                    firstName, middleName, lastName, datetime,
                    doctorId, phoneNumber,email
                } = record;

                // Basic field validation
                const missingFields = [];
                ['Mr_no', 'DOB', 'speciality', 'gender', 'firstName', 'lastName', 'datetime', 'doctorId', 'phoneNumber','email']
                    .forEach(field => {
                        if (!record[field]) missingFields.push(field);
                    });

                if (missingFields.length > 0) {
                    if (!skip) {
                        missingDataRows.push({
                            rowNumber,
                            ...record,
                            missingFields: missingFields.join(', ')
                        });
                    }
                    continue;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Define email validation regex

                // Validate email format
                if (!email || !emailRegex.test(email)) {
                    invalidEntries.push({
                        rowNumber,
                        email,
                        error: !email ? "Email is missing" : "Invalid email format",
                    });
                    continue; // Skip to the next record
                }
                
                // Validate datetime format
                const datetimeRegex = /^\ ? ? ?\d{1,2}\/\d{1,2}\/\d{2,4}? ?,? ?\d{1,2}:\d{1,2}(?: ?(AM|PM))$/i;
                if (!datetimeRegex.test(datetime)) {
                    if (!skip) {
                        invalidEntries.push({
                            rowNumber,
                            error: `Invalid datetime format: "${datetime}"`
                        });
                    }
                    continue;
                }

                // Format datetime
                const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                const formattedDatetime = new Date(correctedDatetime);
                const dateOnly = getDateFromDatetime(datetime);

                // Check for various types of duplicates
                const specialityTimeKey = `${speciality}-${datetime}`;
                const patientSpecialityDateKey = `${Mr_no}-${speciality}-${dateOnly}`;
                const patientDatetimeKey = `${Mr_no}-${datetime}`;

                // 1. Check for same speciality at same time
                // if (specialityTimeMap.has(specialityTimeKey)) {
                //     if (!skip) {
                //         duplicates.push({
                //             rowNumber,
                //             error: `Duplicate appointment: Another appointment exists for ${speciality} at ${datetime}`
                //         });
                //     }
                //     continue;
                // }

                // 2. Check for same patient-speciality on same date
                if (patientSpecialityDateMap.has(patientSpecialityDateKey)) {
                    if (!skip) {
                        duplicates.push({
                            rowNumber,
                            error: `Duplicate appointment: Patient already has an appointment for ${speciality} on ${dateOnly}`
                        });
                    }
                    continue;
                }

                // 3. Check for same patient at same time
                if (patientDatetimeMap.has(patientDatetimeKey)) {
                    if (!skip) {
                        duplicates.push({
                            rowNumber,
                            error: `Duplicate appointment: Patient already has an appointment at ${datetime}`
                        });
                    }
                    continue;
                }

                // 4. Check for existing appointments in database
                const existingPatient = existingPatients.get(Mr_no);
                if (existingPatient) {
                    // Check DOB match
                    if (existingPatient.DOB !== DOB) {
                        if (!skip) {
                            invalidEntries.push({
                                rowNumber,
                                error: "DOB cannot be changed for existing patient"
                            });
                        }
                        continue;
                    }

                    // Check for duplicate appointments in existing record
                    const hasExistingAppointment = existingPatient.specialities?.some(spec => 
                        spec.name === speciality && 
                        getDateFromDatetime(spec.timestamp.toString()) === dateOnly
                    );

                    if (hasExistingAppointment) {
                        if (!skip) {
                            duplicates.push({
                                rowNumber,
                                error: `Patient already has an appointment for ${speciality} on ${dateOnly}`
                            });
                        }
                        continue;
                    }
                }

                // If passed all duplicate checks, add to maps
                specialityTimeMap.set(specialityTimeKey, true);
                patientSpecialityDateMap.set(patientSpecialityDateKey, true);
                patientDatetimeMap.set(patientDatetimeKey, true);

                // Validate doctor
                let doctor;
                if (doctorsCache.has(doctorId)) {
                    doctor = doctorsCache.get(doctorId);
                } else {
                    doctor = await doctorDB.findOne({ doctor_id: doctorId });
                    doctorsCache.set(doctorId, doctor);
                }

                if (!doctor || doctor.speciality !== speciality || 
                    doctor.hospital_code !== hospital_code) {
                    if (!skip) {
                        invalidDoctorsData.push({
                            rowNumber,
                            doctorId,
                            speciality,
                            error: !doctor ? "Doctor not found" : 
                                   doctor.speciality !== speciality ? "Speciality mismatch" : 
                                   "Hospital code mismatch"
                        });
                    }
                    continue;
                }

                // Process valid record
                if (existingPatient) {
                    // Update existing patient
                    await db.updateOne(
                        { Mr_no },
                        {
                            $set: {
                                firstName,
                                middleName,
                                lastName,
                                phoneNumber,
                                email,
                                gender,
                                surveyStatus: "Not Completed"
                            },
                            $push: {
                                specialities: {
                                    name: speciality,
                                    timestamp: formattedDatetime,
                                    doctor_ids: [doctorId]
                                },
                                smsLogs: {
                                    type: "appointment creation",
                                    speciality,
                                    timestamp: formattedDatetime
                                }
                            }
                        }
                    );
                } else {
                    // Create new record or update processed record
                    const processedRecord = processedRecords.get(Mr_no);
                    if (processedRecord) {
                        processedRecord.specialities.push({
                            name: speciality,
                            timestamp: formattedDatetime,
                            doctor_ids: [doctorId]
                        });
                        processedRecord.smsLogs.push({
                            type: "appointment creation",
                            speciality,
                            timestamp: formattedDatetime
                        });
                    } else {
                        const newRecord = {
                            Mr_no,
                            firstName,
                            middleName,
                            lastName,
                            DOB,
                            datetime,
                            specialities: [{
                                name: speciality,
                                timestamp: formattedDatetime,
                                doctor_ids: [doctorId]
                            }],
                            speciality,
                            phoneNumber,
                            email,
                            hospital_code,
                            site_code,
                            surveyStatus: "Not Completed",
                            hashedMrNo: hashMrNo(Mr_no.toString()),
                            smsLogs: [{
                                type: "appointment creation",
                                speciality,
                                timestamp: formattedDatetime
                            }],
                            gender
                        };
                        processedRecords.set(Mr_no, newRecord);
                    }
                }
            }
        }

        // Handle validation results
        if (!skip && (missingDataRows.length > 0 || invalidDoctorsData.length > 0 || duplicates.length > 0)) {
            return res.status(400).json({
                missingData: missingDataRows,
                invalidDoctorsData,
                duplicates
            });
        }

        // Insert new records
        if (processedRecords.size > 0) {
            const newRecords = Array.from(processedRecords.values());
            await db.insertMany(newRecords, { ordered: false });

            // Send SMS messages in background
            process.nextTick(() => {
                newRecords.forEach(record => {
                    const smsMessage = `Dear patient, your appointments have been recorded. Please fill out these survey questions prior to your appointments: http://localhost/patientsurveys/dob-validation?identifier=${record.hashedMrNo}`;
                    sendSMS(record.phoneNumber, smsMessage)
                        .catch(error => console.error('SMS error:', error));
                });
            });
        }

        return res.status(200).json({
            redirecturl: (basePath + '/data-entry'),
            duplicates,
            invalidEntries
        });

    } catch (error) {
        console.error("Error processing batch upload:", error);
        return res.status(500).json({ 
            error: "Error processing batch upload.", 
            details: error.message 
        });
    }
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


// staffRouter.get('/data-entry', async (req, res) => {
//     try {

//         const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
//         const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username: req.session.username });
        
//         res.render('data-entry', {
//             specialities: specialities.filter(speciality => speciality !== 'STAFF'), 
//             hospital_code: req.session.hospital_code,
//             site_code: req.session.site_code,
//             doctor // Ensure doctor data is passed to the template
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.render('data-entry', {
//             specialities: [], 
//             hospital_code: req.session.hospital_code,
//             site_code: req.session.site_code,
//             doctor: null // Pass null if there's an error
//         });
//     }
// });



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
    const { Mr_no } = req.query;
    const username = res.locals.username; // Retrieved from validateSession middleware

    try {
        // Fetch patient data from the database using MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ Mr_no });

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
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber,gender } = req.body;  
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
                        gender,
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
                const surveyLink = `https://proms-2.giftysolutions.com:3088/search?identifier=${hashedMrNo}`;
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
                gender,
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
            const surveyLink = `https://proms-2.giftysolutions.com:3088/search?identifier=${hashedMrNo}`;
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




staffRouter.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email } = req.body;  
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
        const doc_collection = docDB.collection('doctors');
        const doctor = await doc_collection.findOne({ doctor_id: doctorId });
        console.log(doctor);
        const doctorName = doctor.firstName;

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();

        let smsMessage;
        let emailType;
        const hashedMrNo = hashMrNo(Mr_no.toString());

        // Fetch the notification preference for the site
        //const siteSettings = await db.collection('site_settings').findOne({ site_code });
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code },
            { projection: { "sites.$": 1 } } // This will return only the matching site object
          );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;

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
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        email,
                        hospital_code,
                        site_code,
                        surveyStatus: updatedSurveyStatus
                    },
                    $unset: {
                        aiMessage: "",
                        aiMessageGeneratedAt: ""
                    }
                }
            );

            // Prepare messages based on notification preference
            if (updatedSurveyStatus === "Not Completed") {
                const surveyLink = `https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                emailType = 'appointmentConfirmation';
            } else {
                //smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                console.log("Patient has already completed their surveys.");
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
                    timestamp: formatTo12Hour(datetime),
                    doctor_ids: [doctorId]
                }],
                speciality,
                phoneNumber,
                email,
                hospital_code,
                site_code,
                surveyStatus: "Not Completed",
                hashedMrNo
            });

            const surveyLink = `https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
            smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
            emailType = 'appointmentConfirmation';    
        }

        // Handle notifications based on the preference
        try {
            if (notificationPreference === 'sms' || notificationPreference === 'both') {
                try{
                    await collection.updateOne(
                        { Mr_no },
                        {
                            $push: {
                                smsLogs: {
                                    type: "appointment notification sent",
                                    speciality: speciality,
                                    timestamp: new Date()
                                }
                            }
                        }
                    );
                    await sendSMS(phoneNumber, smsMessage);
                }
                catch{
                    console.log('Patient added, but SMS not sent.');
                }
            }
            if (notificationPreference === 'email' || notificationPreference === 'both') {
                if(email){
                    console.log("email:",email);
                    console.log("Attempting to send email...");
                    console.log(hashedMrNo,":speciality");
                    console.log("firstName:",firstName);
                    console.log("Doc:",doctorName);
                    await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                    // Log email to emailLogs
                    await collection.updateOne(
                        { Mr_no },
                        {
                            $push: {
                                emailLogs: {
                                    type: "appointment notification sent",
                                    speciality: speciality,
                                    timestamp: new Date()
                                }
                            }
                        }
                    );
                }else{
                    console.warn('Email not provided, skipping email notification.');
                }
            }
            req.flash('successMessage', 'Patient added. Notifications sent.');
            res.redirect(basePath+'/data-entry');
        } catch (error) {
            console.error('Error sending notifications:', error);
            req.flash('successMessage', 'Patient added, but notifications not sent.');
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

        const surveyLink = `https://proms-2.giftysolutions.com:3088/search?identifier=${patient.hashedMrNo}`;
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

        const surveyLink = `https://proms-2.giftysolutions.com/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
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
        const surveyLink = `https://proms-2.giftysolutions.com:3088/search?identifier=${hashedMrNo}`;
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
        console.log(`API data entry server is running on https://proms-2.giftysolutions.com${basePath}`);
    });
}



module.exports = startServer;
