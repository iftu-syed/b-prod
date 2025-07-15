require('dotenv').config();
const express = require('express');
const fs   = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passwordRouter = require('./routes/index');
const { MongoClient } = require('mongodb');
const app = express();
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');
// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

// Use environment variables
const uri = process.env.DB_URI; // Ensure DB_URI is set in your .env file
const dbName = process.env.DB_NAME; // Ensure DB_NAME is set in your .env file
// let logsDb, accessColl, auditColl, errorColl;
let db;
app.use('/patientpassword/locales', express.static(path.join(__dirname, 'views/locales')));;
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

// Use environment variables
const PORT = process.env.PORT;

// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected successfully to server');
    db = client.db(dbName);
    // logsDb     = client.db('patient_logs');
    // accessColl = logsDb.collection('access_logs');
    // auditColl  = logsDb.collection('audit_logs');
    // errorColl  = logsDb.collection('error_logs');
    return db;
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
}

// let initLogsPromise = null;

// async function ensureLogsInit() {
//   if (accessColl) return;           // already done
//   if (!initLogsPromise) {
//     initLogsPromise = connectToDatabase()
//       .catch(err => { initLogsPromise = null; throw err; });
//   }
//   await initLogsPromise;
// }

// async function writeDbLog(type, data) {
//   // make sure our three collections exist
//   await ensureLogsInit();

//   const entry = { ...data, timestamp: new Date().toISOString() };
//   switch (type) {
//     case 'access': return accessColl.insertOne(entry);
//     case 'audit':  return auditColl.insertOne(entry);
//     case 'error':  return errorColl.insertOne(entry);
//     default:       throw new Error(`Unknown log type: ${type}`);
//   }
// }

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


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/patientpassword', express.static(path.join(__dirname, 'public')));

// Set up express-session middleware using environment variable
app.use(session({
  secret: process.env.SESSION_SECRET, // Use secret from .env
  resave: false,
  saveUninitialized: true
}));

// Set up connect-flash middleware
app.use(flash());

 app.use((req, res, next) => {

  // 1) ?lng= first, 2) cookie next, 3) fallback to English
  const currentLanguage = req.query.lng
    ? req.query.lng
    : (req.cookies.lng || 'en');

   const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

   res.locals.lng = currentLanguage;
   res.locals.dir = dir;


  // Only overwrite the cookie when the user explicitly switched via ?lng=
  if (req.query.lng) {
    res.cookie('lng', currentLanguage, { maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

   req.language = currentLanguage;
   req.dir = dir;
   res.locals.success = req.flash('success');
   res.locals.error   = req.flash('error');
   next();
 });

// Function to format date to MM/DD/YYYY
function normalizeToNoPadding(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;     // not in expected format
  const [mo, da, yr] = parts;
  // parseInt will strip any leading zeros
  const m = parseInt(mo, 10);
  const d = parseInt(da, 10);
  return `${m}/${d}/${yr}`;
}

// Create a new router
const patientRouter = express.Router();

// Define root route
patientRouter.get('/', (req, res) => {
  writeDbLog('access', {
    action: 'view_input_form',
    ip:     req.ip
  });
  res.render('input_form', { 
    message: res.locals.error,
    lng: res.locals.lng,
    dir: res.locals.dir,
   });
});

// patientRouter.post('/password', (req, res) => {
//   const { Mr_no, dob } = req.body;

//   // Format the date to MM/DD/YYYY
//   const formattedDob = formatDateToMMDDYYYY(dob);

//   // Correct the redirect path to include /patientpassword
//   res.redirect(`/patientpassword/password/${Mr_no}?dob=${formattedDob}`);
// });

// patientRouter.post('/password', async (req, res) => {
//   const { Mr_no, dob } = req.body;

//   // Format the date to MM/DD/YYYY
//   const formattedDob = formatDateToMMDDYYYY(dob);

//   try {
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');

//     console.log('Searching for patient with:', { Mr_no, dob: formattedDob });

//     // Find the patient using the provided Mr_no and formatted DOB
//     const patient = await collection.findOne({
//       Mr_no: Mr_no,
//       DOB: formattedDob,
//     });

//     if (!patient) {
//       console.log('Patient not found or hashMrNo is missing');
//       req.flash('error', 'Please check your details and try again');
//       return res.redirect('/patientpassword');
//     }

//     console.log('Patient found:', patient);

//     // Ensure the code accesses `hashedMrNo` correctly
//     if (!patient.hashedMrNo) {
//       console.log('hashedMrNo not found for the patient');
//       req.flash('error', 'Internal server error: Missing patient hashedMrNo');
//       return res.redirect('/patientpassword');
//     }

//     console.log('hashedMrNo found:', patient.hashedMrNo);

//     // Redirect with the `hashedMrNo` and `dob`
//     res.redirect(`/patientpassword/password/${patient.hashedMrNo}`);
//   } catch (error) {
//     console.error('Error fetching patient:', error);
//     req.flash('error', 'Internal server error');
//     res.redirect('/patientpassword');
//   }
// });


//new code with phoneNumber and DOB

patientRouter.post('/password', async (req, res) => {
  // Get the identifier (which could be Mr_no or phone number) and dob
  const { Mr_no: identifier, dob } = req.body;
  writeDbLog('access', {
    action:     'password_lookup_attempt',
    identifier,
    rawDob:     dob,
    ip:         req.ip
  }); // Input field name is still 'Mr_no' in the form
  console.log("raw DOB",dob);

  // Format the date to MM/DD/YYYY
  const formattedDob = normalizeToNoPadding(dob);
  console.log("normalized DOB",formattedDob);

  // Validate input
  if (!identifier || !dob) {
    writeDbLog('error', {
      action: 'password_lookup_validation_failed',
      reason: 'missing_identifier_or_dob',
      ip:     req.ip
    });
      req.flash('error', 'Please provide both identifier (MRN or Phone) and Date of Birth.');
      return res.redirect(`/patientpassword?lng=${res.locals.lng}`);
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data'); // Ensure this is your correct collection name

    console.log('Searching for patient with identifier:', identifier, 'and DOB:', formattedDob);

    // Find the patient using the identifier (Mr_no OR phoneNumber) and formatted DOB
    const patient = await collection.findOne({
      $or: [
        { Mr_no: identifier },
        { phoneNumber: identifier } // Use 'phoneNumber' based on your screenshot
      ],
      DOB: formattedDob, // DOB must also match
    });

    if (!patient) {
      writeDbLog('access', {
        action:     'password_lookup_not_found',
        identifier,
        formattedDob,
        ip:         req.ip
      });
      console.log('Patient not found with the given identifier and DOB.');
      req.flash('error', 'Patient not found. Please check your details and try again.');
      return res.redirect(`/patientpassword?lng=${res.locals.lng}`);
    }

    console.log('Patient found:', patient.Mr_no, patient.fullName); // Log some patient info for confirmation

    // Ensure the hashedMrNo exists before redirecting
    // Assuming hashedMrNo is the unique key needed for the next step regardless of login method
    if (!patient.hashedMrNo) {
      writeDbLog('error', {
        action:    'password_lookup_missing_hashedMrNo',
        Mr_no:     patient.Mr_no,
        identifier,
        ip:        req.ip
      });
      console.error('Critical error: Found patient but hashedMrNo is missing.', { patientId: patient._id });
      req.flash('error', 'Internal server error: Missing required patient identifier.');
      return res.redirect(`/patientpassword?lng=${res.locals.lng}`);
    }

    writeDbLog('access', {
      action:     'password_lookup_success',
      Mr_no:      patient.Mr_no,
      identifier,
      ip:         req.ip
    });
    console.log('Redirecting with hashedMrNo:', patient.hashedMrNo);

    // Redirect with the hashedMrNo
  // carry your current language in the querystring
  const lng = res.locals.lng;
  res.redirect(`/patientpassword/password/${patient.hashedMrNo}?lng=${lng}`);

  } catch (error) {
    writeDbLog('error', {
      action: 'password_lookup_error',
      message: error.message,
      stack:   error.stack,
      ip:      req.ip
    });
    console.error('Error during patient lookup:', error);
    req.flash('error', 'An internal server error occurred. Please try again later.');
    res.redirect('/patientpassword');
  }
});

// Use the password router
patientRouter.use('/password', passwordRouter);
app.use(express.urlencoded({ extended: true }));
// Mount the patientRouter under '/patientpassword'
app.use('/patientpassword', patientRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at https://app.wehealthify.org/patientpassword`);
});