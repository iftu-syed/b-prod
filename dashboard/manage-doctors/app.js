

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Doctor = require('./models/doctor');
const Staff = require('./models/staff'); // Import the Staff model
const flash = require('connect-flash');
const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();  // Load environment variables
const cookieParser = require('cookie-parser');
const i18next = require('i18next');

const Backend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
// Use PORT from environment or fallback to 4010
const PORT = process.env.PORT_Manage_Doctor;
const app = express();
app.use(cookieParser());
// Define the base path for manageproviders
const basePath = '/manageproviders';
app.locals.basePath = basePath; // Set basePath as a local variable

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// const MONGO_URI   = process.env.MONGO_URI;           // your primary app DB URI
// const LOGS_DB     = 'hospital_admin_logs';           // name of your logs database
// let accessColl, auditColl, errorColl;

// // immediately-invoked async function to set up the three collections
// (async function initHospitalAdminLogs() {
//   const client = new MongoClient(MONGO_URI, {
//     useNewUrlParser:    true,
//     useUnifiedTopology: true,
//   });
//   await client.connect();

//   const logsDb = client.db(LOGS_DB);
//   accessColl = logsDb.collection('access_logs');
//   auditColl  = logsDb.collection('audit_logs');
//   errorColl  = logsDb.collection('error_logs');
//   console.log('🔐 Connected to hospital_admin_logs (access, audit, error)');
// })();

// // helper to write into the logs
// async function writeDbLog(type, data) {
//   const entry = { ...data, timestamp: new Date().toISOString() };
//   switch (type) {
//     case 'access': return accessColl.insertOne(entry);
//     case 'audit':  return auditColl.insertOne(entry);
//     case 'error':  return errorColl.insertOne(entry);
//     default:
//       throw new Error(`Unknown log type: ${type}`);
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
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.use('/manageproviders/doctors/locales', express.static(path.join(__dirname, 'views/locales')));;
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
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

app.use(flash());
app.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error'); // Add error message flash support
    next();
});

// Serve static files under the base path (manageproviders)
app.use(basePath, express.static(path.join(__dirname, 'public')));

// Routes
app.use(`${basePath}/doctors`, require('./routes/doctors')); // Add doctors routes under /manageproviders
app.use(`${basePath}/staff`, require('./routes/staff'));     // Add staff routes under /manageproviders

// // Home route to redirect to manage doctors page
// app.get(`${basePath}/`, (req, res) => {
//     res.redirect(`${basePath}/doctors`);
// });

app.use((req, res, next) => {
    res.locals.staffCredentials = req.session.staffCredentials || null;
    req.session.staffCredentials = null; // Clear after use
    next();
});


// Home route to redirect to manage doctors page
app.get(`${basePath}/`, async(req, res) => {
    // If session contains staff credentials, redirect with the session variables
    if (req.session.staffUsername && req.session.staffPassword) {
        res.redirect(`${basePath}/doctors?staffUsername=${req.session.staffUsername}&staffPassword=${req.session.staffPassword}`);
    } else {
        // Otherwise, simply redirect to the manage doctors page
        res.redirect(`${basePath}/doctors`);
    }
});

// Doctor delete route (moved to routes/doctors.js)
app.post(`${basePath}/delete/:id`, async (req, res) => {
          const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        await writeDbLog('audit', {
      action:        'delete_doctor_success',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      ip
    });
        res.redirect(basePath);
    } catch (err) {
        console.error('Error deleting doctor:', err);
                    await writeDbLog('error', {
      action:        'delete_doctor_error',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      error:         err.message,
      stack:         err.stack,
      ip
    });
        req.flash('error', 'Error deleting the doctor.');
        res.status(500).redirect(`${basePath}/doctors`);
    }
});

// 404 Error Handling
app.use((req, res) => {
    res.status(404).render('404', { basePath });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    req.flash('error', 'Something went wrong, please try again.');
    res.status(500).redirect(basePath);
});

// Start the server
function startServer() {
    app.listen(PORT, () => {
        console.log(`Server is running on https://app.wehealthify.org${basePath}`);
    });
}

module.exports = startServer;
