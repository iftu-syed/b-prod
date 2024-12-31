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


// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;


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

// router.get('/', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');
        
//         // Get values from the session
//         const { hospital_code, site_code, firstName, lastName, hospitalName } = req.session.user;
        
//         // Find surveys that match both hospital_code and site_code
//         const surveys = await collection.find({ hospital_code, site_code }).toArray();
        
//         // Render the index.ejs view, passing the filtered surveys and session data
//         res.render('index', { surveys, firstName, lastName, hospitalName, site_code,lng: res.locals.lng, dir: res.locals.dir, });
//     } catch (e) {
//         console.error('Error getting surveys:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });

// router.get('/add', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('surveyDB');
//         const collection = db.collection('surveys');
//         const customSurveys = await collection.find().toArray();
        
//         // Get hospital_code, site_code, firstName, lastName, and hospitalName from the session
//         const { hospital_code, site_code, firstName, lastName, hospitalName } = req.session.user;

//         // Pass all session data and surveys to the template
//         res.render('add_survey', { customSurveys, apiSurveys: surveysData, hospital_code, site_code, firstName, lastName, hospitalName,lng: res.locals.lng, dir: res.locals.dir, });
//     } catch (e) {
//         console.error('Error getting surveys:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });


router.get('/', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Get values from the session
        const { hospital_code, site_code, firstName, lastName, hospitalName } = req.session.user;
        
        // Find surveys that match both hospital_code and site_code
        const surveys = await collection.find({ hospital_code, site_code }).toArray();
        
        // Render the index.ejs view, passing the filtered surveys and session data
        res.render('index', { 
            surveys, 
            firstName, 
            lastName, 
            hospitalName, 
            site_code,
            lng: res.locals.lng, 
            dir: res.locals.dir 
        });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});

// GET /add => with session check
router.get('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('surveyDB');
        const collection = db.collection('surveys');
        const customSurveys = await collection.find().toArray();
        
        // Get hospital_code, site_code, firstName, lastName, and hospitalName from the session
        const { hospital_code, site_code, firstName, lastName, hospitalName } = req.session.user;

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
        res.status(500).send('Internal Server Error');
    }
});


router.post('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');

        // Extract survey data from the request body
        const { specialty, apiSurveyData, customSurveyData, hospital_code, site_code } = req.body;

        // Check if a survey with the same specialty, hospital_code, and site_code already exists
        const existingSurvey = await collection.findOne({
            specialty: specialty,
            hospital_code: hospital_code,
            site_code: site_code
        });

        if (existingSurvey) {
            // If survey already exists, show an error message and redirect back to /add
            req.flash('error', 'This specialty already exists for the selected hospital and site.');
            return res.redirect(basePath + '/add');
        }

        // Insert the new survey data if no duplication found
        const API = JSON.parse(apiSurveyData);
        const custom = JSON.parse(customSurveyData);

        await collection.insertOne({
            specialty,
            API,
            custom,
            hospital_code,
            site_code
        });

        req.flash('success', 'Survey added successfully.');
        return res.redirect(basePath + '/add');
    } catch (e) {
        console.error('Error adding survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/edit/:id', checkAuth, async (req, res) => {
    try {
        const db1 = client.db('surveyDB');  // Database for all surveys
        const db2 = client.db('manage_doctors');  // Database for selected surveys

        // Fetch all custom surveys from surveyDB.surveys collection
        const allSurveys = await db1.collection('surveys').find().toArray(); 

        // Find the survey being edited using the provided ID from manage_doctors.surveys collection
        const survey = await db2.collection('surveys').findOne({ _id: new ObjectId(req.params.id) });

        // Check if the survey exists
        if (!survey) {
            // If no survey found, redirect or show an error
            req.flash('error', 'Survey not found');
            return res.redirect(basePath + '/');
        }

        // Load API surveys from the surveys.json file (if applicable)
        const apiSurveys = surveysData;

        // Get session data
        const { firstName, lastName, hospitalName, site_code } = req.session.user;

        // Pass the survey (for pre-checked values), all surveys (from surveyDB), API surveys, and session data to the view
        res.render('edit_survey', { survey, allSurveys, apiSurveys, firstName, lastName, hospitalName, site_code,lng: res.locals.lng, dir: res.locals.dir, });
    } catch (e) {
        console.error('Error fetching survey for edit:', e);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/edit/:id', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        const { apiSurveyData, customSurveyData, specialty, hospital_code, site_code } = req.body;

        // Parse the JSON strings for API and Custom surveys
        const apiSurveys = JSON.parse(apiSurveyData);
        const customSurveys = JSON.parse(customSurveyData);

        // Update the survey document with the new values
        await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    specialty,
                    hospital_code,
                    site_code,
                    API: apiSurveys,
                    custom: customSurveys
                }
            }
        );

        // Redirect to the home page after saving the changes
        res.redirect(basePath + '/');
    } catch (e) {
        console.error('Error updating survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/delete/:id', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect(basePath + '/');
    } catch (e) {
        console.error('Error deleting survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

// Mount the router at the base path
app.use(basePath, router);

function startServer() {
    app.listen(PORT, () => {
        console.log(`Survey App is running on https://proms-2.giftysolutions.com${basePath}`);
    });
}

module.exports = startServer;
