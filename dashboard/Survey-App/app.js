//This code is after the ngnix conf with surveyapp
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const app = express();
require('dotenv').config(); // Load environment variables from .env
const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');

const PORT = process.env.Survey_App_PORT || 4050;  // Use PORT from .env, default to 4050 if not specified
// const uri = 'mongodb://localhost:27017';
// const client = new MongoClient(uri);
const client = new MongoClient(process.env.MONGODB_URI);
const surveysFilePath = path.join(__dirname, 'data', 'surveys.json');
const surveysData = JSON.parse(fs.readFileSync(surveysFilePath, 'utf-8'));

// Define the base path
const basePath = '/surveyapp';
app.locals.basePath = basePath;

app.locals.BASE_URL = process.env.BASE_URL;
// const MONGO_URI = process.env.MONGODB_URI;    // e.g. your Atlas URI
// const LOGS_DB    = 'hospital_admin_logs';          // the same DB you used for hospital admin
// let accessColl, auditColl, errorColl;

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
//   console.log('🔐 Connected to hospital_admin_logs collections');
// })();

// // helper to write into those
// async function writeDbLog(type, data) {
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


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files under the base path
app.use(basePath, express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,  // Use session secret from .env
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,  // Use MongoDB URI from .env
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.use(flash());
app.use(cookieParser());
app.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    next();
});
app.use('/surveyapp/locales', express.static(path.join(__dirname, 'views/locales')));;
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
async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (e) {
        console.error('Error connecting to MongoDB:', e);
    }
}

connectToDatabase();

// Middleware to check if user is authenticated
function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        next(); // If user is authenticated, proceed to the next middleware/route handler
    } else {
        // res.redirect(basePath + '/'); // If user is not authenticated, redirect to the login page
        res.redirect('/hospitaladmin'); // New redirect
    }
}

// Router for survey app routes
const router = express.Router();


// GET / => with session check
router.get('/', checkAuth, async (req, res) => {
    const { hospital_code, site_code, firstName, lastName, hospitalName,username } = req.session.user;
  const ip = req.ip;

    try {
    await writeDbLog('access', {
      action:        'view_surveys_home',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log:', logErr);
  }
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Get values from the session
        // const { hospital_code, site_code, firstName, lastName, hospitalName } = req.session.user;
        
        // Find surveys that match both hospital_code and site_code
        const surveys = await collection.find({ hospital_code, site_code }).toArray();
        
        // Render the index.ejs view, passing the filtered surveys and session data
        res.render('index', { 
            surveys, 
            firstName, 
            lastName, 
            hospitalName, 
            hospital_code,
            site_code,
            lng: res.locals.lng, 
            dir: res.locals.dir 
        });
    } catch (e) {
        console.error('Error getting surveys:', e);
              await writeDbLog('error', {
        action:        'view_surveys_home_error',
        username,
        hospital_code,
        site_code,
        error:         e.message,
        stack:         e.stack,
        ip
      });
        res.status(500).send('Internal Server Error');
    }
});

// GET /add => with session check
router.get('/add', checkAuth, async (req, res) => {
        const { hospital_code, site_code, firstName, lastName, hospitalName,username } = req.session.user;
        const ip = req.ip;
          try {
    await writeDbLog('access', {
      action:        'view_add_survey',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log:', logErr);
  }


    try {
        const db = client.db('surveyDB');
        const collection = db.collection('surveys');
        const customSurveys = await collection.find().toArray();
        
        // Get hospital_code, site_code, firstName, lastName, and hospitalName from the session

        // Pass all session data and surveys to the template
        res.render('add_survey', { 
            customSurveys, 
            apiSurveys: surveysData, 
            hospital_code, 
            site_code, 
            firstName, 
            lastName, 
            hospitalName,
            lng: res.locals.lng, 
            dir: res.locals.dir 
        });
    } catch (e) {
        console.error('Error getting surveys:', e);
              await writeDbLog('error', {
        action:        'view_add_survey_error',
        username,
        hospital_code,
        site_code,
        error:         e.message,
        stack:         e.stack,
        ip
      });
        res.status(500).send('Internal Server Error');
    }
});




router.post('/add', checkAuth, async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
      const ip = req.ip;
        try {
    await writeDbLog('access', {
      action:        'add_survey_attempt',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log for add_survey_attempt:', logErr);
  }
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');

        // Extract survey data from the request body
        let { specialty, apiSurveyData, customSurveyData, surveyData, hospital_code, site_code } = req.body;

        // Validate specialty name
        if (!specialty || typeof specialty !== 'string' || !specialty.trim()) {
                  await writeDbLog('audit', {
        action:        'add_survey_validation_failed',
        username,
        hospital_code,
        site_code,
        reason:        'empty_specialty',
        ip
      });
            res.cookie('errorMessage', 'Please provide a valid specialty name.', { httpOnly: false });
            return res.redirect(basePath + '/add');
        }

        // Convert specialty to title case for consistency
        specialty = specialty.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

        // Check if a survey with the same specialty (case-insensitive), hospital_code, and site_code already exists
        const existingSurvey = await collection.findOne({
            specialty: { $regex: new RegExp(`^${specialty}$`, 'i') },
            hospital_code,
            site_code
        });

        if (existingSurvey) {
                  await writeDbLog('audit', {
        action:        'add_survey_duplicate',
        username,
        hospital_code,
        site_code,
        specialty,
        ip
      });
            res.cookie('errorMessage', `This specialty "${specialty}" already exists for the selected hospital and site.`, { httpOnly: false });
            return res.redirect(basePath + '/add');
        }

        // Parse the survey data
        const API = JSON.parse(apiSurveyData);
        const custom = JSON.parse(customSurveyData);
        const surveys = JSON.parse(surveyData);

        // Debugging: Log final object before inserting
        console.log("Final Insert Object:", { specialty, hospital_code, site_code, API, custom, surveys });

        // Insert the new survey document
        await collection.insertOne({
            specialty,
            hospital_code,
            site_code,
            API,
            custom,
            surveys
        });

            await writeDbLog('audit', {
      action:        'add_survey_success',
      username,
      hospital_code,
      site_code,
      specialty,
      ip
    });

        res.cookie('successMessage', `Specialty "${specialty}" added successfully.`, { httpOnly: false });
        return res.redirect(basePath + '/add');
    } catch (e) {
        console.error('Error adding survey:', e);
              await writeDbLog('error', {
        action:        'add_survey_error',
        username,
        hospital_code,
        site_code,
        error:         e.message,
        stack:         e.stack,
        ip
      });
        res.cookie('errorMessage', 'An error occurred while adding the specialty.', { httpOnly: false });
        return res.redirect(basePath + '/add');
    }
});

// router.post('/add', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');

//         // Extract survey data from the request body
//         let { specialty, apiSurveyData, customSurveyData, surveyData, hospital_code, site_code } = req.body;

//         // Validate specialty name
//         if (!specialty || typeof specialty !== 'string' || !specialty.trim()) {
//             req.flash('error', 'Please provide a valid specialty name.');
//             return res.redirect(basePath + '/add');
//         }

//         // Convert specialty to title case for consistency
//         specialty = specialty.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

//         // Check if a survey with the same specialty (case-insensitive), hospital_code, and site_code already exists
//         const existingSurvey = await collection.findOne({
//             specialty: { $regex: new RegExp(`^${specialty}$`, 'i') }, // Case-insensitive match
//             hospital_code: hospital_code,
//             site_code: site_code
//         });

//         if (existingSurvey) {
//             req.flash('error', `This specialty "${specialty}" already exists for the selected hospital and site.`);
//             return res.redirect(basePath + '/add');
//         }

//         // Parse the survey data
//         const API = JSON.parse(apiSurveyData);
//         const custom = JSON.parse(customSurveyData);
//         const surveys = JSON.parse(surveyData);

//         // Debugging: Log final object before inserting
//         console.log("Final Insert Object:", { specialty, hospital_code, site_code, API, custom, surveys });

//         // Insert the new survey document
//         await collection.insertOne({
//             specialty,
//             hospital_code,
//             site_code,
//             API,
//             custom,
//             surveys
//         });

//         req.flash('success', `Specialty "${specialty}" added successfully.`);
//         return res.redirect(basePath + '/add');
//     } catch (e) {
//         console.error('Error adding survey:', e);
//         req.flash('error', 'An error occurred while adding the specialty.');
//         return res.redirect(basePath + '/add');
//     }
// });



// New route for checking specialty availability


router.get('/check-specialty', checkAuth, async (req, res) => {
    const { specialty, hospital_code, site_code } = req.query;
    const { username } = req.session.user;
    const ip = req.ip;
      try {
    await writeDbLog('access', {
      action:        'check_specialty_attempt',
      username,
      hospital_code,
      site_code,
      specialty,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log for check_specialty_attempt:', logErr);
  }

  try {
    
    if (!specialty || !hospital_code || !site_code) {
            await writeDbLog('audit', {
      action:        'check_specialty_validation_failed',
      username,
      hospital_code,
      site_code,
      missing:       [
        !specialty && 'specialty',
        !hospital_code && 'hospital_code',
        !site_code && 'site_code'
      ].filter(Boolean).join(','),
      ip
    });
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const db = client.db('manage_doctors');
    const collection = db.collection('surveys');
    
    // Format specialty name the same way it will be stored
    const formattedSpecialty = specialty.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    
    // Check if specialty exists (case-insensitive)
    const existingSpecialty = await collection.findOne({
      specialty: { $regex: new RegExp(`^${formattedSpecialty}$`, 'i') },
      hospital_code: hospital_code,
      site_code: site_code
    });
        await writeDbLog('audit', {
      action:        'check_specialty_result',
      username,
      hospital_code,
      site_code,
      specialty:     formattedSpecialty,
      exists:        Boolean(existingSpecialty),
      ip
    });
    
    return res.json({ 
      exists: !!existingSpecialty,
      formatted: formattedSpecialty
    });
    
  } catch (error) {
    console.error('Error checking specialty:', error);
        await writeDbLog('error', {
      action:        'check_specialty_error',
      username,
      hospital_code,
      site_code,
      error:         error.message,
      stack:         error.stack,
      ip
    });
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/edit/:id', checkAuth, async (req, res) => {
      const { id } = req.params;
  const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;

    try {
    await writeDbLog('access', {
      action:        'edit_survey_view_attempt',
      username,
      hospital_code,
      site_code,
      surveyId:      id,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log for edit_survey_view_attempt:', logErr);
  }
    try {
        const db1 = client.db('surveyDB');  // Database for all surveys
        const db2 = client.db('manage_doctors');  // Database for selected surveys

        // Fetch all custom surveys from surveyDB.surveys collection
        const allSurveys = await db1.collection('surveys').find().toArray(); 

        // Find the survey being edited using the provided ID from manage_doctors.surveys collection
        const survey = await db2.collection('surveys').findOne({ _id: new ObjectId(req.params.id) });

        // Check if the survey exists
        if (!survey) {
                  await writeDbLog('audit', {
        action:        'edit_survey_not_found',
        username,
        hospital_code,
        site_code,
        surveyId:      id,
        ip
      });
            // If no survey found, redirect or show an error
            req.flash('error', 'Survey not found');
            return res.redirect(basePath + '/');
        }
 const { firstName, lastName, hospitalName, site_code, hospital_code} = req.session.user;
            await writeDbLog('audit', {
      action:        'edit_survey_view_success',
      username,
      hospital_code,
      site_code,
      surveyId:      id,
      ip
    });
        // Load API surveys from the surveys.json file (if applicable)
        const apiSurveys = surveysData;

        // Get session data
       

        // Pass the survey (for pre-checked values), all surveys (from surveyDB), API surveys, and session data to the view
        res.render('edit_survey', { survey, allSurveys, apiSurveys, firstName, lastName, hospitalName, hospital_code, site_code,lng: res.locals.lng, dir: res.locals.dir, });
    } catch (e) {
        console.error('Error fetching survey for edit:', e);
            await writeDbLog('error', {
      action:   'edit_survey_error',
      username,
      hospital_code,
      site_code,
      surveyId: id,
      error:    e.message,
      stack:    e.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});





router.post('/edit/:id', checkAuth, async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;
  const surveyId = req.params.id;
  const { specialty } = req.body;
    try {
    await writeDbLog('access', {
      action:        'edit_survey_update_attempt',
      username,
      hospital_code,
      site_code,
      surveyId,
      specialty,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log for edit_survey_update_attempt:', logErr);
  }
    try {
            
        const db = client.db('manage_doctors');
        
        const collection = db.collection('surveys');
    
        const { specialty, apiSurveyData, customSurveyData, surveyData, hospital_code, site_code } = req.body;

        const API = JSON.parse(apiSurveyData);  

        const custom = JSON.parse(customSurveyData);  

        const surveys = JSON.parse(surveyData);  

       
        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    specialty,
                    hospital_code,
                    site_code,
                    API,    
                    custom, 
                    surveys 
                }
            }
        );
            await writeDbLog('audit', {
      action:        'edit_survey_update_success',
      username,
      hospital_code,
      site_code,
      surveyId,
      modifiedCount: result.modifiedCount,
      ip
    });

        req.flash('success', 'Survey updated successfully.');
        res.redirect(basePath + '/');
    } catch (e) {
        // Log error details
        console.error('Error updating survey:', e);
            await writeDbLog('error', {
      action:    'edit_survey_update_error',
      username,
      hospital_code,
      site_code,
      surveyId,
      error:     e.message,
      stack:     e.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});

router.post('/delete/:id', checkAuth, async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;
  const surveyId = req.params.id;
    try {
    await writeDbLog('access', {
      action:        'delete_survey_attempt',
      username,
      hospital_code,
      site_code,
      surveyId,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log for delete_survey_attempt:', logErr);
  }
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        await collection.deleteOne({ _id: new ObjectId(req.params.id) });
            await writeDbLog('audit', {
      action:        'delete_survey_success',
      username,
      hospital_code,
      site_code,
      surveyId,
      ip
    });
        res.redirect(basePath + '/');
    } catch (e) {
        console.error('Error deleting survey:', e);
            await writeDbLog('error', {
      action:    'delete_survey_error',
      username,
      hospital_code,
      site_code,
      surveyId,
      error:     e.message,
      stack:     e.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});

// Mount the router at the base path
app.use(basePath, router);

function startServer() {
    app.listen(PORT, () => {
        console.log(`Survey App is running on https://app.wehealthify.org${basePath}`);
    });
}

module.exports = startServer;