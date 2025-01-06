const isCurrentDate = (datetime) => {
    // Parse the datetime to extract the date part
    const [datePart] = datetime.split(','); // Get "MM/DD/YYYY" part
    const [month, day, year] = datePart.trim().split('/'); // Split "MM/DD/YYYY"
    
    // Get today's date in the same format
    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Compare the dates
    return datePart.trim() === todayFormatted;

}

const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
const Backend = require('i18next-fs-backend');
const i18next = require('i18next');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const app = express();
const { exec } = require('child_process');
const axios = require('axios'); // Import axios for HTTP requests
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Table = require('cli-table3');
// require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded
const crypto = require('crypto');

const dashboardDbUri = 'mongodb+srv://admin:admin@cluster0.d3ycy.mongodb.net/dashboards';
mongoose.connect(dashboardDbUri, { useNewUrlParser: true, useUnifiedTopology: true });
const dashboardDb = mongoose.connection;
dashboardDb.on('error', console.error.bind(console, 'connection error:'));
dashboardDb.once('open', function () {
    console.log("Connected to MongoDB dashboards database!");
});



// Define the base path for the entire application
const basePath = '/doctorlogin';
app.locals.basePath = basePath;

app.use(cookieParser())

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;


// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Ensure this is loaded from .env
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to decrypt text (password)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');  // Extract the IV
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');  // Extract the encrypted text
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);  // Create decipher using the key
    let decrypted = decipher.update(encryptedText);  // Decrypt the text

    decrypted = Buffer.concat([decrypted, decipher.final()]);  // Finalize decryption

    return decrypted.toString();  // Return the decrypted password as a string
}

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH); // Generate random IV
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV and encrypted text
}



app.use(`${basePath}/new_folder`, express.static(path.join(__dirname, 'new_folder')));
app.use(`${basePath}/new_folder_1`, express.static(path.join(__dirname, 'new_folder_1')));
app.use(`${basePath}/data`, express.static(path.join(__dirname, 'data')));
// const PORT = 3003;  
// app.use(express.static(path.join(__dirname, 'public')));
app.use(`${basePath}`, express.static(path.join(__dirname, 'public')));


app.use(session({
    // secret: 'your-secret-key', // Change this to a random secret key
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://admin:klmnqwaszx@10.154.0.3:27017/manage_doctors?authsource=admin', // Use a different database for sessions
        ttl: 14 * 24 * 60 * 60 // Sessions will be stored for 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day for session cookie
    }
}));

const flash = require('connect-flash');

app.use(flash());

// Middleware to make flash messages accessible in all views
app.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});


const doctorsSurveysURL = process.env.DOCTORS_SURVEYS_MONGO_URL;
const patientDataURL = process.env.PATIENT_DATA_MONGO_URL;

// Connect to MongoDB for doctors and surveys connection
const doctorsSurveysDB = mongoose.createConnection(doctorsSurveysURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB for patient_data connection
const patientDataDB = mongoose.createConnection(patientDataURL, { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/doctorlogin/locales', express.static(path.join(__dirname, 'views/locales')));;
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



const Doctor = doctorsSurveysDB.model('doctors', {
    firstName: String,
    lastName: String,
    username: String,
    doctor_id: String,
    password: String,
    speciality: String,
    hospital_code: String,
    hospitalName:String,
    site_code: String,
    loginCounter: {
        type: Number,
        default: 0
    },
    failedLogins: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    passwordChangedByAdmin: {
        type: Boolean,
        default: false
    }
});



// // Define Code model for codes
const codeSchema = new mongoose.Schema({
    code: String,
    description: String
});
const Survey = doctorsSurveysDB.model('surveys', {
    custom: [String], // Replace surveyName with custom
    specialty: String
});
const Code = doctorsSurveysDB.model('Code', codeSchema);

Code.collection.createIndex({ description: 'text' });






const patientSchema = new mongoose.Schema({
    Mr_no: String,
    firstName: String,
    lastName: String,
    DOB: String,
    datetime: String,
    speciality: String,
    dateOfSurgery: String,
    phoneNumber: String,
    hospital_code: String,
    site_code: String,  // Add this line for site code
    password: String,
    Events: [
        {
            event: String,
            date: String,
            treatment_plan: {
                type: String,
                enum: ['Surgery', 'Lifestyle Modifications', 'Medication', 'Physical Therapy'],
              },
        }
    ],
    Codes: [
        {
            code: String,
            description: String,  // Add this line for description
            date: String
        }
    ],
    doctorNotes: [
        {
            note: String,
            date: String
        }
    ],
    specialities: [
        {
            name: String,
            timestamp: Date
        }
    ],
    aiMessageDoctor: String,  // New field for storing the AI message
    // aiMessageDoctorTimestamp: Date  // New field for storing the timestamp
    aiMessageDoctorTimestamp: { type: String } // Store timestamp as a formatted string

});



// Define Patient model
const Patient = patientDataDB.model('Patient', patientSchema, 'patient_data');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(`${basePath}`, express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');


function formatTimestamp(date) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    };
    return new Date(date).toLocaleString('en-US', options); // Format to "MM/DD/YYYY, HH:mm AM/PM"
}

// Function to write logs
function writeLog(message, fileName) {
    const logDir = path.join(__dirname, 'logs'); // Directory to store logs
    const logFilePath = path.join(logDir, fileName); // Full path to the log file

    // Ensure the logs directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    // Append the message to the log file
    fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

const router = express.Router();
// Search API for Codes with pagination and search optimization
router.get('/codes', async (req, res) => {
    const { page = 1, limit = 50, searchTerm = '' } = req.query;

    // Only trigger search if the search term is 3 characters or more
    if (searchTerm.length < 3) {
        return res.json([]); // If the search term is too short, return empty results
    }

    try {
        // Optimize the MongoDB query with pagination and indexing
        const codes = await Code.find({
            description: { $regex: new RegExp(searchTerm, 'i') } // Case-insensitive regex search
        })
        .skip((page - 1) * limit) // Paginate the results
        .limit(limit); // Limit the number of results per page

        res.json(codes);
    } catch (err) {
        console.error('Error fetching codes:', err);
        res.status(500).send('Internal Server Error');
    }
});

const uri3 = 'mongodb://admin:klmnqwaszx@10.154.0.3:27017/manage_doctors?authsource=admin';
let db3;

const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
client3.connect().then(() => {
    db3 = client3.db('manage_doctors');
    console.log('Connected to manage_doctors database');
}).catch(error => {
    console.error('Failed to connect to manage_doctors database', error);
});

function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

// // Route to generate and serve patient_health_scores CSV
// router.get('/patient_health_scores_csv', async (req, res) => {
//     const { mr_no } = req.query;

//     try {
//         const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

//         if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
//             return res.status(404).send('Patient health scores not found.');
//         }

//         const patientHealthScores = patientData.SurveyData.patient_health_scores.map(score => ({
//             date: score.date,
//             months_since_baseline: score.months_since_baseline,
//             score: score.score,
//             trace_name: score.trace_name,
//             title: score.title,
//             ymin: score.ymin,
//             ymax: score.ymax,
//             event_date: score.event_date,
//             event: score.event,
//         }));

//         const { Parser } = require('json2csv');
//         const parser = new Parser({ fields: Object.keys(patientHealthScores[0]) });
//         const csv = parser.parse(patientHealthScores);

//         res.header('Content-Type', 'text/csv');
//         res.attachment(`patient_health_scores_${mr_no}.csv`);
//         res.send(csv);
//     } catch (err) {
//         console.error('Error generating patient health scores CSV:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Route to generate and serve API_SURVEYS CSV
// router.get('/api_surveys_csv', async (req, res) => {
//     const { mr_no } = req.query;

//     try {
//         const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

//         if (!patientData || !patientData.SurveyData || !patientData.SurveyData.API_SURVEYS) {
//             return res.status(404).send('API Surveys not found.');
//         }

//         const apiSurveys = patientData.SurveyData.API_SURVEYS.map(survey => ({
//             date: survey.date,
//             months_since_baseline: survey.months_since_baseline,
//             score: survey.score,
//             trace_name: survey.trace_name,
//             title: survey.title,
//             ymin: survey.ymin,
//             ymax: survey.ymax,
//             event_date: survey.event_date,
//             event: survey.event,
//         }));

//         const { Parser } = require('json2csv');
//         const parser = new Parser({ fields: Object.keys(apiSurveys[0]) });
//         const csv = parser.parse(apiSurveys);

//         res.header('Content-Type', 'text/csv');
//         res.attachment(`api_surveys_${mr_no}.csv`);
//         res.send(csv);
//     } catch (err) {
//         console.error('Error generating API Surveys CSV:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

const client = new MongoClient(process.env.DATA_ENTRY_MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
let patientDataCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('Data_Entry_Incoming'); // Use your database name here
        patientDataCollection = db.collection('patient_data'); // Access patient_data collection
        console.log('Connected to MongoDB successfully! for SurveyData pull');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

// Call the connectDB function when the app starts
connectDB();

// Route to generate and serve patient_health_scores CSV
router.get('/patient_health_scores_csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await patientDataCollection.findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
            return res.status(404).send('Patient health scores not found.');
        }

        const patientHealthScores = patientData.SurveyData.patient_health_scores.map(score => ({
            date: score.date,
            months_since_baseline: score.months_since_baseline,
            score: score.score,
            trace_name: score.trace_name,
            title: score.title,
            ymin: score.ymin,
            ymax: score.ymax,
            event_date: score.event_date,
            event: score.event,
        }));

        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(patientHealthScores[0]) });
        const csv = parser.parse(patientHealthScores);

        res.header('Content-Type', 'text/csv');
        res.attachment(`patient_health_scores_${mr_no}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Error generating patient health scores CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to generate and serve API_SURVEYS CSV
// router.get('/api_surveys_csv', async (req, res) => {
//     const { mr_no } = req.query;

//     try {
//         const patientData = await patientDataCollection.findOne({ Mr_no: mr_no });

//         if (!patientData || !patientData.SurveyData || !patientData.SurveyData.API_SURVEYS) {
//             return res.status(404).send('API Surveys not found.');
//         }

//         const apiSurveys = patientData.SurveyData.API_SURVEYS.map(survey => ({
//             date: survey.date,
//             months_since_baseline: survey.months_since_baseline,
//             score: survey.score,
//             trace_name: survey.trace_name,
//             title: survey.title,
//             ymin: survey.ymin,
//             ymax: survey.ymax,
//             event_date: survey.event_date,
//             event: survey.event,
//         }));

//         const { Parser } = require('json2csv');
//         const parser = new Parser({ fields: Object.keys(apiSurveys[0]) });
//         const csv = parser.parse(apiSurveys);

//         res.header('Content-Type', 'text/csv');
//         res.attachment(`api_surveys_${mr_no}.csv`);
//         res.send(csv);
//     } catch (err) {
//         console.error('Error generating API Surveys CSV:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

router.get('/api_surveys_csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await patientDataCollection.findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData || !patientData.SurveyData.API_SURVEYS) {
            return res.status(404).send('API Surveys not found or empty.');
        }

        const apiSurveys = patientData.SurveyData.API_SURVEYS.map(survey => ({
            date: survey.date || 'N/A',
            months_since_baseline: survey.months_since_baseline || 'N/A',
            score: survey.score || 'N/A',
            trace_name: survey.trace_name || 'N/A',
            title: survey.title || 'N/A',
            ymin: survey.ymin || 'N/A',
            ymax: survey.ymax || 'N/A',
            event_date: survey.event_date || 'N/A',
            event: survey.event || 'N/A',
        }));

        if (apiSurveys.length === 0) {
            return res.status(404).send('No API Surveys data available.');
        }

        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(apiSurveys[0]) });
        const csv = parser.parse(apiSurveys);

        res.header('Content-Type', 'text/csv');
        res.attachment(`api_surveys_${mr_no}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Error generating API Surveys CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/api/summary', async (req, res) => {
    try {
        const { department, siteName } = req.query;
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }) // Add siteName filter if provided
                }
            },
            {
                $group: {
                    _id: null,
                    totalPatientsRegistered: { $sum: 1 },
                    totalSurveysSent: { $sum: { $cond: [{ $ifNull: ["$surveySentDate", false] }, 1, 0] } },
                    totalSurveysCompleted: { $sum: { $cond: [{ $ifNull: ["$score", false] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalPatientsRegistered: 1,
                    totalSurveysSent: 1,
                    totalSurveysCompleted: 1,
                    surveyResponseRate: {
                        $multiply: [
                            { $cond: [{ $eq: ["$totalSurveysSent", 0] }, 0, { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }] },
                            100
                        ]
                    }
                }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        const summaryData = results[0];
        res.json(summaryData);
    } catch (error) {
        console.error("Error fetching summary data:", error);
        res.status(500).json({ message: "Error fetching summary data" });
    }
});



router.get('/api/response-rate-time-series', async (req, res) => {
    try {
        const { department, siteName } = req.query;
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    surveySentDate: { $exists: true },
                    ...(department && { departmentName: department }), // Match department if provided
                    ...(siteName && { siteName }) // Match siteName if provided
                }
            },
            {
                $addFields: {
                    monthYear: { $dateToString: { format: "%Y-%m", date: "$surveySentDate" } },
                    isCompleted: { $cond: [{ $ifNull: ["$surveyReceivedDate", false] }, 1, 0] }
                }
            },
            {
                $group: {
                    _id: "$monthYear",
                    totalSurveysSent: { $sum: 1 },
                    totalSurveysCompleted: { $sum: "$isCompleted" }
                }
            },
            {
                $project: {
                    _id: 0,
                    monthYear: "$_id",
                    responseRate: {
                        $cond: [
                            { $eq: ["$totalSurveysSent", 0] },
                            0,
                            { $multiply: [{ $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { monthYear: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching time series response rate data:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
});



router.get('/api/mean-score-by-survey-timeline', async (req, res) => {
    try {
        const { promsInstrument, diagnosisICD10, scale, department, siteName } = req.query; // Include siteName
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    ...(promsInstrument && { promsInstrument }),
                    ...(diagnosisICD10 && { diagnosisICD10 }),
                    ...(scale && { scale }),
                    ...(department && { departmentName: department }), // Match department if provided
                    ...(siteName && { siteName }), // Match siteName if provided
                    surveyReceivedDate: { $ne: null }
                }
            },
            {
                $group: {
                    _id: "$surveyType",
                    meanScore: { $avg: "$score" }
                }
            },
            {
                $project: {
                    _id: 0,
                    surveyType: "$_id",
                    meanScore: 1
                }
            },
            { $sort: { surveyType: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching mean score data:", error);
        res.status(500).json({ message: "Error fetching mean score data" });
    }
});


router.get('/api/get-hierarchical-options', async (req, res) => {
    try {
        const { department, siteName } = req.query; // Include siteName from query
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            // Add department and siteName match if provided
            ...(department || siteName ? [{
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName: siteName })
                }
            }] : []),
            {
                $group: {
                    _id: {
                        diagnosisICD10: "$diagnosisICD10",
                        promsInstrument: "$promsInstrument",
                        scale: "$scale"
                    }
                }
            },
            {
                $group: {
                    _id: {
                        diagnosisICD10: "$_id.diagnosisICD10",
                        promsInstrument: "$_id.promsInstrument"
                    },
                    scales: { $addToSet: "$_id.scale" }
                }
            },
            {
                $group: {
                    _id: "$_id.diagnosisICD10",
                    promsInstruments: {
                        $push: {
                            promsInstrument: "$_id.promsInstrument",
                            scales: "$scales"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    diagnosisICD10: "$_id",
                    promsInstruments: 1
                }
            },
            { $sort: { diagnosisICD10: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching hierarchical dropdown values:", error);
        res.status(500).json({ message: "Error fetching dropdown values" });
    }
});


router.get('/api/proms-scores', async (req, res) => {
    const { promsInstrument, diagnosisICD10, scale, department, siteName } = req.query; // Include siteName
    try {
        const collection = dashboardDb.collection('proms_data');

        const query = {
            ...(promsInstrument && { promsInstrument }),
            ...(diagnosisICD10 && { diagnosisICD10 }),
            ...(scale && { scale }),
            ...(department && { departmentName: department }), // Match department if provided
            ...(siteName && { siteName }), // Match siteName if provided
            surveyReceivedDate: { $exists: true }
        };

        const projection = {
            _id: 0,
            surveyReceivedDate: 1,
            score: 1
        };

        const results = await collection.find(query).project(projection).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching PROMs scores for scatter plot:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
});


router.get('/api/treatment-diagnosis-heatmap', async (req, res) => {
    try {
        const { department, siteName, diagnosisICD10, promsInstrument, scale } = req.query;
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }), // Add siteName match if provided
                    ...(diagnosisICD10 && { diagnosisICD10 }),
                    ...(promsInstrument && { promsInstrument }),
                    ...(scale && { scale })
                }
            },
            {
                $group: {
                    _id: { treatmentPlan: "$treatmentPlan", diagnosisICD10: "$diagnosisICD10" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    treatmentPlan: "$_id.treatmentPlan",
                    diagnosisICD10: "$_id.diagnosisICD10",
                    count: 1
                }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching treatment-diagnosis data:", error);
        res.status(500).json({ message: "Error fetching treatment-diagnosis data" });
    }
});



router.get('/api/patients-mcid-count', async (req, res) => {
    try {
        const { promsInstrument, diagnosisICD10, scale, department, siteName } = req.query;
        const collection = dashboardDb.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    ...(promsInstrument && { promsInstrument }),
                    ...(diagnosisICD10 && { diagnosisICD10 }),
                    ...(scale && { scale }),
                    ...(department && { departmentName: department }), // Match department
                    ...(siteName && { siteName }) // Match siteName
                }
            },
            {
                $group: {
                    _id: "$surveyType",
                    totalPatients: { $sum: 1 },
                    mcidAchieved: { $sum: { $cond: [{ $ifNull: ["$mcid", false] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    surveyType: "$_id",
                    totalPatients: 1,
                    mcidAchieved: 1
                }
            },
            { $sort: { surveyType: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching MCID data:", error);
        res.status(500).json({ message: "Error fetching MCID data" });
    }
});


router.get('/api/get-department-options', async (req, res) => {
    try {
        const collection = dashboardDb.collection('proms_data');
        const departments = await collection.distinct("departmentName"); // Adjust the field name if different
        res.json(departments);
    } catch (error) {
        console.error("Error fetching department options:", error);
        res.status(500).json({ message: "Error fetching department options" });
    }
});

router.get('/api/get-site-options', async (req, res) => {
    try {
        const { department } = req.query;
        const collection = dashboardDb.collection('proms_data');

        const query = department ? { departmentName: department } : {};

        const sites = await collection.distinct("siteName", query); // Fetch unique siteNames based on department
        res.json(sites);
    } catch (error) {
        console.error("Error fetching site options:", error);
        res.status(500).json({ message: "Error fetching site options" });
    }
});




// // Routes
router.get('/', (req, res) => {
    res.render('login', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});

// app.get('/dashboard', (req, res) => {
//     // Serve doc_dashboard.html from public directory
//     res.sendFile(path.join(__dirname, 'public', 'doc_dashboard.html'));
// });

router.get('/dashboard', checkAuth, (req, res) => {
    // Pass doctor and basePath to the template
    const doctor = req.session.user;
    res.render('doc_dashboard', { doctor, basePath });
});



router.get('/logout', (req, res) => {
    if (req.session.user) {
        const logoutTime = Date.now();
        const loginTime = req.session.loginTime || logoutTime; // Fallback to logout time if loginTime is missing
        const duration = ((logoutTime - loginTime) / 1000).toFixed(2); // Duration in seconds

        const logData = `Doctor ${req.session.user.username} from ${req.session.user.hospital_code} logged out at ${new Date(logoutTime).toLocaleString()} after ${duration} seconds of activity.`;
        writeLog(logData, 'access.log');
        

        req.session.destroy(); // Destroy the session
    }

    res.redirect(basePath);
});





router.post('/login', async (req, res) => {
    const { username, password } = req.body; // The password from the login form input

    try {
        const doctor = await Doctor.findOne({ username });

        if (!doctor) {
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect(basePath);
        }

        if (doctor.isLocked) {
            req.flash('error_msg', 'Your account is locked due to multiple failed login attempts. Please, contact admin.');
            return res.redirect(basePath);
        }

        // Decrypt the stored password using the decrypt function
        const decryptedPassword = decrypt(doctor.password);

        // Compare the decrypted password with the password provided in the login form
        if (decryptedPassword === password) {
            // Check if this is the first login or if the password was changed by admin
            if (doctor.loginCounter === 0 || doctor.passwordChangedByAdmin) {
                req.session.user = doctor; // Save user info in session
                return res.render('reset-password', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                }); // Render a page with a form to reset the password
            }

            // Successful login
            doctor.failedLogins = 0; // Reset failed logins
            doctor.loginCounter += 1; // Increment login counter
            doctor.lastLogin = new Date(); // Update last login timestamp
            await doctor.save();

            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                const surveyNames = surveys.custom; // Use `custom` instead of `surveyName`
                
                // Add site_code check
                const patients = await Patient.find({
                    hospital_code: doctor.hospital_code,
                    site_code: doctor.site_code, // Ensure patient site_code matches doctor site_code
                    'specialities.name': doctor.speciality
                });

                const patientsWithDateStatus = patients.map(patient => {
                    const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
                    return {
                        ...patient.toObject(),
                        specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
                        specialityMatches: doctor.speciality === patient.speciality
                    };
                });

                req.session.user = doctor; // Save user info in session
                req.session.loginTime = Date.now(); // Log the login time

                // Logging the login event
                const logData = `Doctor ${username} from ${doctor.hospital_code} logged in at ${new Date(req.session.loginTime).toLocaleString()}`;
                writeLog(logData, 'access.log');

                const isCurrentDate = (timestamp) => {
                    const date = new Date(timestamp);
                    const today = new Date();
                    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                };

                const highlightRow = (patient) => {
                    return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
                };

                const formatDate = (timestamp) => {
                    const date = new Date(timestamp);
                    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
                    return date.toLocaleString(undefined, options);
                };

                res.render('home', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    doctor, surveys, patients: patientsWithDateStatus, isCurrentDate, highlightRow, formatDate });
            } else {
                res.send('No surveys found for this speciality');
            }
        } else {
            // Failed login
            doctor.failedLogins += 1;

            if (doctor.failedLogins >= 3) {
                doctor.isLocked = true;
                req.flash('error_msg', 'Your account is locked due to multiple failed login attempts. Please, contact admin.');
            } else {
                req.flash('error_msg', `Invalid password. ${3 - doctor.failedLogins} attempt(s) left.`);
            }

            await doctor.save();
            res.redirect(basePath);
        }
    } catch (error) {
        console.error(error);
        const logError = `Error during login for username ${username}: ${error.message}`;
        writeLog(logError, 'error.log');
        res.status(500).send('Server Error');
    }
});


const clearDirectory = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
};




// Function to execute Python script for graph generation
// const generateGraphs = (mr_no, survey_type) => {
//     return new Promise((resolve, reject) => {
//         const command = `python3 python_scripts/script-d3.py ${mr_no} "${survey_type}"`;
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`Error generating graph for ${survey_type}: ${error.message}`);
//                 // Log the error
//                 const logError = `Error generating graph for ${survey_type} for Mr_no: ${mr_no} - Error: ${error.message}`;
//                 writeLog(logError, 'error.log');
//                 reject(error);  // Reject the promise with the error
//             } else {
//                 if (stderr) {
//                     console.error(`stderr: ${stderr}`);
//                 }
//                 console.log(`API_script.py output: ${stdout}`);
//                 resolve();  // Resolve the promise if no errors
//             }
//         });
//     });
// };

// Function to execute Python script for graph generation
const generateGraphs = (mr_no, survey_type) => {
    // return new Promise((resolve, reject) => {
    //     const command = `python3 python_scripts/script-d3.py ${mr_no} "${survey_type}"`;
    //     exec(command, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //             // Log the error
    //             const logError = `Error generating graph for ${survey_type} for Mr_no: ${mr_no} - Error: ${error.message}`;
    //             writeLog(logError, 'error.log');
    //             reject(error);  // Reject the promise with the error
    //         } else {
    //             if (stderr) {
    //                 console.error(`stderr: ${stderr}`);
    //             }
    //             console.log(`API_script.py output: ${stdout}`);
    //             resolve();  // Resolve the promise if no errors
    //         }
    //     });
    // });
    return new Promise((resolve, reject) => {
        // Bypass the execution of script-d3.py
        console.log(`Skipping graph generation for Mr_no: ${mr_no}, Survey: ${survey_type}`);
        resolve(); // Simply resolve without executing the script
    });
};




// Ensure this middleware is defined for session authentication
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect(basePath);
    }
}

router.get('/reset-password', checkAuth, (req, res) => {
    res.render('reset-password', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});



router.post('/reset-password', checkAuth, async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect(basePath+'/reset-password');
    }

    try {
        const doctorId = req.session.user._id;

        // Retrieve the full Mongoose document by its _id
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            req.flash('error_msg', 'Doctor not found. Please log in again.');
            return res.redirect(basePath);
        }

        doctor.password = encrypt(newPassword);
        doctor.passwordChangedByAdmin = false; // Reset the flag after password change
        doctor.loginCounter += 1; // Increment the loginCounter after password reset
        await doctor.save();

        req.flash('success_msg', 'Password updated successfully.');
        // Redirect to the home page after the password is updated
        res.redirect(basePath+'/home');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('error_msg', 'An error occurred while updating the password. Please try again.');
        res.redirect(basePath+'/reset-password');
    }
});






router.get('/home', checkAuth, async (req, res) => {
    try {
        const doctor = req.session.user; // Retrieve doctor from session
        const surveys = await Survey.findOne({ specialty: doctor.speciality });
        if (surveys) {
            // Add site_code check
            const patients = await Patient.find({
                hospital_code: doctor.hospital_code,
                site_code: doctor.site_code, // Ensure patient site_code matches doctor site_code
                'specialities.name': doctor.speciality
            });
            
            const patientsWithDateStatus = patients.map(patient => {
                const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
                return {
                    ...patient.toObject(),
                    specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
                    specialityMatches: doctor.speciality === patient.speciality
                };
            });

            // Function to check if the timestamp is the current date
            const isCurrentDate = (timestamp) => {
                const date = new Date(timestamp);
                const today = new Date();
                return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            };

            // Function to highlight rows based on the speciality timestamp
            const highlightRow = (patient) => {
                return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
            };

            // Function to format the date
            const formatDate = (timestamp) => {
                const date = new Date(timestamp);
                const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
                return date.toLocaleString(undefined, options);
            };

            res.render('home', {
                lng: res.locals.lng,
                dir: res.locals.dir,
                doctor,
                surveys,
                patients: patientsWithDateStatus,
                isCurrentDate,
                highlightRow,
                formatDate
            });
        } else {
            res.send('No surveys found for this speciality');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});




router.get('/search', checkAuth, async (req, res) => {
    const { mrNo: hashMrNo, username, speciality, name } = req.query;
    try {
        const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session

        // Find the patient using hashMrNo and get the corresponding Mr_no
        const patientWithHash = await Patient.findOne({ hashedMrNo: hashMrNo });
        if (!patientWithHash) {
            return res.send('Patient not found');
        }
        
        // Use the actual Mr_no for further processing
        const mrNo = patientWithHash.Mr_no;

        // Continue with the original logic using Mr_no
        const patient = await Patient.findOne({ Mr_no: mrNo });
        
        if (patient) {
            // Check if the patient's hospital_code matches the logged-in doctor's hospital_code
            const hospital_codeMatches = patient.hospital_code === loggedInDoctor.hospital_code;

            if (!hospital_codeMatches) {
                res.send('You cannot access this patient\'s details');
                return;
            }
            const allPatients = await Patient.find();
            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.custom : []; // Replace surveyName with custom

            const newFolderDirectory = path.join(__dirname, 'new_folder');
            
            // Clear the directory before generating new graphs
            await clearDirectory(newFolderDirectory);

            // Execute API_script.py
            // const apiScriptCommand = `python3 python_scripts/API_script.py ${mrNo}`;
            // exec(apiScriptCommand, (error, stdout, stderr) => {
            //     if (error) {
            //         console.error(`Error executing API_script.py: ${error.message}`);
            //         return;
            //     }
            //     if (stderr) {
            //         console.error(`stderr: ${stderr}`);
            //     }
            //     console.log(`API_script.py output: ${stdout}`);

                const graphPromises = surveyNames.map(surveyType => {
                    console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
                    return generateGraphs(mrNo, surveyType).catch(error => {
                        console.error(`Error generating graph for ${surveyType}:`, error);
                        return null; // Return null in case of error to continue other graph generations
                    });
                });

                Promise.all(graphPromises).then(async () => {
                    patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

                    // Path to the CSV file
                    const csvFileName = `patient_health_scores_${patient.Mr_no}.csv`;
                    const csvPath = path.join(__dirname, 'data', csvFileName);
                    const csvExists = fs.existsSync(csvPath);

                    if (!csvExists) {
                        console.error(`CSV file not found at ${csvPath}`);
                    }

                    const csvApiSurveysPath = `/data/API_SURVEYS_${patient.Mr_no}.csv`; // Construct the path to the new CSV file

                    // Check if we need to regenerate the AI message based on the speciality timestamp
                    const shouldRegenerateAIMessage = patient.specialities.some(spec => new Date(spec.timestamp) > new Date(patient.aiMessageDoctorTimestamp));

                    if (shouldRegenerateAIMessage || !patient.aiMessageDoctor) {
                        // Regenerate AI message if needed
                        const patientPromptCommand = `python3 python_scripts/patientprompt.py "${csvPath}" "${path.join(__dirname, 'public', 'SeverityLevels.csv')}" "${csvApiSurveysPath}"`;
                        exec(patientPromptCommand, async (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error executing patientprompt.py: ${error.message}`);
                                return res.status(500).send('Error generating AI message');
                            }
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            const aiMessage = stdout.trim();

                            patient.aiMessageDoctor = aiMessage; // Assign the generated AI message
                            patient.aiMessageDoctorTimestamp = formatTimestamp(new Date()); // Format the current timestamp
                            await patient.save(); // Save the updated patient document
                            

                            // Log the access
                            const logData = `Doctor ${loggedInDoctor.username} accessed surveys: ${surveyNames.join(', ')}`;
                            writeLog(logData, 'access.log');

                                                        // Prepare paths for CSV files
                            const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
                            const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;
                            
                            // Render the patient details with the new AI message
                            res.render('patient-details', {
                                lng: res.locals.lng,
                                dir: res.locals.dir,
                                patient,
                                allPatients,
                                surveyNames: patient.custom || [], // Use `custom` instead of `surveyName`
                                codes: patient.Codes,
                                interventions: patient.Events,
                                doctorNotes: patient.doctorNotes,
                                doctor: {
                                    username: loggedInDoctor.username,
                                    speciality: loggedInDoctor.speciality,
                                    hospitalName: loggedInDoctor.hospitalName, // Add hospitalName
                                    site_code: loggedInDoctor.site_code,       // Add site_code
                                    firstName: loggedInDoctor.firstName,
                                    lastName: loggedInDoctor.lastName
                                },
                                // csvPath: csvExists ? `/data/${csvFileName}` : null, // Pass the relative CSV path if it exists
                                // csvApiSurveysPath, // Pass the new CSV path
                                // csvPath: csvExists ? `/data/${csvFileName}` : null, // Pass the relative CSV path if it exists
                                // csvApiSurveysPath, // Pass the new CSV path
                                csvPath, // Path for patient_health_scores CSV
                                csvApiSurveysPath, // Path for API_SURVEYS CSV

                                aiMessage // Pass the AI-generated message to the template
                            });
                        });

                    } else {
                        // Use the existing AI message
                        const aiMessage = patient.aiMessageDoctor;

                        // Log the access
                        const logData = `Doctor ${loggedInDoctor.username} accessed surveys: ${surveyNames.join(', ')}`;
                        writeLog(logData, 'access.log');

                        // Prepare paths for CSV files
                        const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
                        const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;


                        // Render the patient details with the existing AI message
                        res.render('patient-details', {
                            lng: res.locals.lng,
                            dir: res.locals.dir,
                            patient,
                            allPatients,
                            surveyNames: patient.custom || [], // Use `custom` instead of `surveyName`
                            codes: patient.Codes,
                            interventions: patient.Events,
                            doctorNotes: patient.doctorNotes,
                            doctor: {
                                username: loggedInDoctor.username,
                                speciality: loggedInDoctor.speciality,
                                hospitalName: loggedInDoctor.hospitalName, // Add hospitalName
                                site_code: loggedInDoctor.site_code,       // Add site_code
                                firstName: loggedInDoctor.firstName,
                                lastName: loggedInDoctor.lastName
                            },
                            // csvPath: csvExists ? `/data/${csvFileName}` : null, // Pass the relative CSV path if it exists
                            // csvApiSurveysPath, // Pass the new CSV path
                            // csvPath: csvExists ? `/data/${csvFileName}` : null, // Pass the relative CSV path if it exists
                            // csvApiSurveysPath, // Pass the new CSV path
                            csvPath, // Path for patient_health_scores CSV
                            csvApiSurveysPath, // Path for API_SURVEYS CSV


                            aiMessage // Pass the existing AI message to the template
                        });
                    }
                }).catch(error => {
                    console.error('Error in /search route:', error);
                    res.status(500).send('Server Error');
                });
            // });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error('Error in /search route:', error);
        res.status(500).send('Server Error');
    }
});

// router.post('/addNote', checkAuth, async (req, res) => {
//     const { Mr_no, event, date, treatment_plan } = req.body;
//     const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

//     try {
//         // Update the patient document by adding the event to the Events array
//         await Patient.updateOne(
//             { Mr_no },
//             { $push: { Events: { event, date, treatment_plan } } }  // Ensure that the event and date are properly stored
//         );

//         const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added an event for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Event: ${event}`;
//         writeLog(logData, 'interaction.log');
        
//         // Respond with the updated event data
//         res.status(200).json({ event, date, treatment_plan });
//     } catch (error) {
//         console.error('Error adding event:', error);
//         // Log the error
//         const logError = `Error adding event for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
//         writeLog(logError, 'error.log');
//         res.status(500).send('Error adding event');
//     }
// });

router.post('/addNote', checkAuth, async (req, res) => {
    const { Mr_no, event, date, treatment_plan } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the event to the Events array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Events: { event, date, treatment_plan } } }  // Ensure that the event and date are properly stored
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added an event for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Event: ${event}`;
        writeLog(logData, 'interaction.log');
        
        // Run the script synchronously by sending an HTTP POST request
        const response = await axios.post(
            `${process.env.BASE_URL}/patientlogin/run-scripts`,
            { mr_no: Mr_no }, // Pass the Mr_no in the request body
            { headers: { 'Content-Type': 'application/json' } }
        );


        // Check if the script execution was successful
        if (response.status === 200) {
            console.log(`Script executed successfully for Mr_no: ${Mr_no}`);
        } else {
            console.error(`Error executing script for Mr_no: ${Mr_no}:`, response.data);
        }

        // Respond with the updated event data
        res.status(200).json({ event, date, treatment_plan });
    } catch (error) {
        console.error('Error adding event:', error);
        // Log the error
        const logError = `Error adding event for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
        writeLog(logError, 'error.log');
        res.status(500).send('Error adding event');
    }
});





router.post('/addDoctorNote', checkAuth, async (req, res) => {
    const { Mr_no, doctorNote } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the doctor's note to the doctorNotes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { doctorNotes: { note: doctorNote, date: new Date().toISOString().split('T')[0] } } }
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added a note for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Note: ${doctorNote}`;
        writeLog(logData, 'interaction.log');
        

        res.redirect(`<%= basePath %>/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding doctor\'s note:', error);
        res.status(500).send('Error adding doctor\'s note');
    }
});




router.post('/addCode', checkAuth, async (req, res) => {
    const { Mr_no, code, code_date } = req.body;  // No need for description input
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Find the description of the code from the Code collection
        const codeDetails = await Code.findOne({ code });
        if (!codeDetails) {
            return res.status(404).send('Code not found');
        }

        // Update the patient document by adding the code, description, and date to the Codes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Codes: { code, description: codeDetails.description, date: code_date } } }  // Use fetched description here
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added ICD code ${code} with description "${codeDetails.description}" for patient Mr_no: ${Mr_no} on ${code_date}`;
        writeLog(logData, 'interaction.log');
        
        // Send the updated code, description, and date back in the response
        res.status(200).json({ code, description: codeDetails.description, date: code_date });
    } catch (error) {
        console.error('Error adding code:', error);

        // Log the error
        const logError = `Error adding ICD code for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
        writeLog(logError, 'error.log');

        res.status(500).send('Error adding code');
    }
});




router.get('/chart', async (req, res) => {
    const { mr_no } = req.query;
    const csvPath = `patient_health_scores_${mr_no}.csv`;  // Just the file name
    const csvFullPath = path.join(__dirname, 'data', csvPath); // Full path for checking existence
    // console.log(`CSV Path: ${csvFullPath}`);  // Log the full CSV path for debugging
    
    if (fs.existsSync(csvFullPath)) {
        res.render('chart1', { csvPath });  // Pass only the file name to the template
    } else {
        res.status(404).send('CSV file not found');
    }
});


const url = 'mongodb://admin:klmnqwaszx@10.154.0.3:27017'; // Update with your MongoDB connection string
const dbName = 'Data_Entry_Incoming'; // Database name
const collectionName = 'patient_data'; // Collection name
// Route to display survey details





router.get('/survey-details/:mr_no', async (req, res) => {
    const mrNo = req.params.mr_no;

    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log('Connected successfully to server');
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Fetch the patient data based on Mr_no
        const patient = await collection.findOne({ Mr_no: mrNo });

        if (!patient) {
            console.log('Patient not found');
            res.status(404).send('Patient not found');
            return;
        }

        // Load survey labels JSON
        const surveyLabelsPath = path.join(__dirname, 'public', 'survey_labels.json');
        const surveyLabels = JSON.parse(fs.readFileSync(surveyLabelsPath, 'utf8'));

        const surveyData = [];
        if (patient.FORM_ID) {
            Object.keys(patient.FORM_ID).forEach(formId => {
                const form = patient.FORM_ID[formId];

                form.assessments.forEach((assessment, index) => {
                    const assessmentData = {
                        name: assessment.scoreDetails.Name,
                        tScore: assessment.scoreDetails['T-Score'],
                        questions: [],
                    };

                    assessment.scoreDetails.Items.forEach(item => {
                        const middleElement = item.Elements[Math.floor(item.Elements.length / 2)];
                        const responseValue = item.Response;

                        let responseLabel = 'Unknown label';
                        const mapElement = item.Elements.find(el => el.Map);

                        if (mapElement && mapElement.Map) {
                            const matchedMap = mapElement.Map.find(map => map.Value === responseValue);
                            if (matchedMap) {
                                responseLabel = matchedMap.Description;
                            }
                        }

                        assessmentData.questions.push({
                            question: middleElement.Description,
                            response: `${responseLabel} (${responseValue})`,
                        });
                    });

                    surveyData.push(assessmentData);
                });
            });
        }

        // Function to format the timestamp
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Invalid Date';

            const date = new Date(timestamp);
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            const daySuffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
            return `${day}${daySuffix} ${month} ${year}`;
        };

        // Updated function for mapping EPDS responses
        const mapEPDSResponseToLabels = (surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];

                            // Specific mapping for EPDS questions using questionKey
                            const questionLabel = surveyLabels['EPDS'] &&
                                                 surveyLabels['EPDS'][responseValue] &&
                                                 surveyLabels['EPDS'][responseValue][questionKey];

                            const labeledResponse = questionLabel ? `${questionLabel} (${responseValue})` : responseValue;
                            acc[questionKey] = labeledResponse;
                        }
                        return acc;
                    }, {})
                };
            });
        };

        // Define the mapResponseToLabels function with specific PROMIS question mapping
        const mapResponseToLabels = (survey, surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];

                            // PROMIS survey-specific handling for each question
                            if (survey === 'PROMIS' && surveyLabels[survey] && surveyLabels[survey][questionKey]) {
                                const questionSpecificLabels = surveyLabels[survey][questionKey];
                                const labeledResponse = questionSpecificLabels[responseValue]
                                    ? `${questionSpecificLabels[responseValue]} (${responseValue})`
                                    : responseValue;
                                acc[questionKey] = labeledResponse;
                            } else {
                                // Default handling for other surveys
                                const labeledResponse = surveyLabels[survey] && surveyLabels[survey][responseValue]
                                    ? `${surveyLabels[survey][responseValue]} (${responseValue})`
                                    : responseValue;
                                acc[questionKey] = labeledResponse;
                            }
                        }
                        return acc;
                    }, {})
                };
            });
        };

// Function to map PAIN-6b and PHYSICAL-6b responses to labels
const mapPainAndPhysicalResponsesToLabels = (surveyKey) => {
    if (!patient[surveyKey]) return null;

    return Object.keys(patient[surveyKey]).map((key, index) => {
        const entry = patient[surveyKey][key];
        const timestamp = entry['timestamp'];
        const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

        return {
            question: `Assessment ${index + 1}<br>(${formattedDate})`,
            responses: Object.keys(entry).reduce((acc, questionKey) => {
                if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                    const responseValue = entry[questionKey];

                    // PAIN-6b and PHYSICAL-6b specific mapping using surveyLabels
                    const questionLabel = surveyLabels[surveyKey] &&
                        surveyLabels[surveyKey][responseValue] &&
                        surveyLabels[surveyKey][responseValue][questionKey];

                    const labeledResponse = questionLabel ? `${questionLabel} (${responseValue})` : responseValue;
                    acc[questionKey] = labeledResponse;
                }
                return acc;
            }, {})
        };
    });
};

// Updated logic for surveys
const PAIN6bSurvey = mapPainAndPhysicalResponsesToLabels('PAIN-6b');
const PHYSICAL6bSurvey = mapPainAndPhysicalResponsesToLabels('PHYSICAL-6b');


        // Function to map ICIQ responses with specific labels for questions 3, 4, and 5
        const mapICIQResponseToLabels = (surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];

                            if (questionKey === "How often do you leak urine?") {
                                const questionLabel = surveyLabels['ICIQ_UI_SF'] &&
                                                      surveyLabels['ICIQ_UI_SF'][responseValue] &&
                                                      surveyLabels['ICIQ_UI_SF'][responseValue][questionKey];
                                acc[questionKey] = questionLabel ? `${questionLabel} (${responseValue})` : responseValue;
                            } else if (questionKey === "How much urine do you usually leak?") {
                                if (["0", "2", "4", "6"].includes(responseValue)) {
                                    const questionLabel = surveyLabels['ICIQ_UI_SF'][responseValue][questionKey];
                                    acc[questionKey] = questionLabel ? `${questionLabel} (${responseValue})` : responseValue;
                                } else {
                                    acc[questionKey] = responseValue;
                                }
                            } else if (questionKey === "Overall, how much does leaking urine interfere with your everyday life?") {
                                if (responseValue === "0") {
                                    acc[questionKey] = "Not at all (0)";
                                } else if (responseValue === "10") {
                                    acc[questionKey] = "A great deal (10)";
                                } else {
                                    acc[questionKey] = responseValue;
                                }
                            } else {
                                acc[questionKey] = responseValue;
                            }
                        }
                        return acc;
                    }, {})
                };
            });
        };

        // Use the new function for EPDS
        const EPDSSurvey = mapEPDSResponseToLabels('EPDS');

        // Render the survey details page
        res.render('surveyDetails', {
            lng: res.locals.lng,
            dir: res.locals.dir,
            patient,
            surveyData,
            PAIDSurvey: mapResponseToLabels('PAID', 'PAID'),
            PROMISSurvey: mapResponseToLabels('PROMIS', 'PROMIS-10'),
            ICIQSurvey: mapICIQResponseToLabels('ICIQ_UI_SF'),
            WexnerSurvey: mapResponseToLabels('Wexner', 'Wexner'),
            EPDSSurvey,
            PAIN6bSurvey, // Add PAIN-6b mapping
            PHYSICAL6bSurvey // Add PHYSICAL-6b mapping
        });

    } catch (error) {
        console.error('Error fetching survey details:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;


// Helper function to check if any speciality timestamp is newer than the aiMessageDoctorTimestamp

function shouldRegenerateAIMessage(patient) {
    const latestTimestamp = patient.aiMessageDoctorTimestamp;
    if (!latestTimestamp) return true; // If no previous timestamp exists, regenerate the message

    // Extract date part (MM/DD/YYYY) from a timestamp
    const extractDate = (timestamp) => timestamp.split(',')[0].trim();

    // Check if surveyStatus is "Completed" and the date in the timestamp of specialities is the same as aiMessageDoctorTimestamp
    const isSameDayCompleted = patient.specialities.some(spec => {
        const specDate = extractDate(spec.timestamp.trim());
        const latestDate = extractDate(latestTimestamp);
        return patient.surveyStatus === 'Completed' && specDate === latestDate;
    });

    // If the above condition is true, use the existing AI message
    if (isSameDayCompleted) {
        return false;
    }

    // Check if the speciality timestamp is newer than the AI message timestamp
    return patient.specialities.some(spec => {
        const specTimestamp = spec.timestamp.trim();
        return specTimestamp > latestTimestamp;
    });
}


// Route for generating or fetching AI message
router.get('/patient-details/:mr_no', checkAuth, async (req, res) => {
    const hashMrNo = req.params.mr_no;
    try {
        // Find the patient using hashMrNo and get the corresponding Mr_no
        const patientWithHash = await Patient.findOne({ hashedMrNo: hashMrNo });
        if (!patientWithHash) {
            return res.status(404).send('Patient not found');
        }

        // Use the actual Mr_no for further processing
        const mrNo = patientWithHash.Mr_no;

        // Find the patient using Mr_no for further processing
        const patient = await Patient.findOne({ Mr_no: mrNo });
        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        // Check if we need to regenerate the AI message
        if (shouldRegenerateAIMessage(patient)) {
            // Call the function to regenerate the AI message
            // const csvPath = `patient_health_scores_${patient.Mr_no}.csv`;
            // const csvApiSurveysPath = `/data/API_SURVEYS_${patient.Mr_no}.csv`;

                        // const csvPath = `patient_health_scores_${patient.Mr_no}.csv`;
            // const csvApiSurveysPath = `/data/API_SURVEYS_${patient.Mr_no}.csv`;

            const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
            const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;

            const patientPromptCommand = `python3 python_scripts/patientprompt.py "${csvPath}" "${path.join(__dirname, 'public', 'SeverityLevels.csv')}" "${csvApiSurveysPath}"`;
            
            exec(patientPromptCommand, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing patientprompt.py: ${error.message}`);
                    return res.status(500).send('Error generating AI message');
                }
                
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }

                const aiMessage = stdout.trim();
                
                // Update the patient document with the new AI message and timestamp
                patient.aiMessageDoctor = aiMessage;
                patient.aiMessageDoctorTimestamp = new Date();
                await patient.save();

                // Render the response with updated data
                res.render('patient-details', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    patient,
                    aiMessage, // Pass the new AI message to the template
                    // Add any other patient details or variables needed for the template
                    csvPath,
                    csvApiSurveysPath,
                });
            });

        } else {
            // Use the existing AI message
            const aiMessage = patient.aiMessageDoctor;
            const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
            const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;

            res.render('patient-details', {
                lng: res.locals.lng,
                dir: res.locals.dir,
                patient,
                aiMessage, // Pass the existing AI message to the template
                // Add any other patient details or variables needed for the template
                csvPath,
                csvApiSurveysPath,
            });
        }
    } catch (error) {
        console.error('Error fetching patient details:', error);
        res.status(500).send('Server Error');
    }
});

// Mount the router with the base path
app.use(basePath, router);

// // Start server
const PORT = process.env.DOCTOR_LOGIN_PAGE_PORT || 3003;
// const PORT = 3003;
app.listen(PORT, () => console.log(`Server is running on https://proms-2.giftysolutions.com${basePath}`));


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Doctor Login Server is running on http://localhost:${PORT}`);
//     });
// }


// module.exports = startServer;

