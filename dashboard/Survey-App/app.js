const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const app = express();
// const port = 30011;
const PORT = 4050;
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const surveysFilePath = path.join(__dirname, 'data', 'surveys.json');
const surveysData = JSON.parse(fs.readFileSync(surveysFilePath, 'utf-8'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/adminUser',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.use(flash());
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    next();
});

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
        res.redirect('/'); // If user is not authenticated, redirect to the login page
    }
}



// In the GET / route
app.get('/', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Get hospital_code and site_code from the session
        const { hospital_code, site_code } = req.session.user;
        
        // Find surveys that match both hospital_code and site_code
        const surveys = await collection.find({ hospital_code, site_code }).toArray();
        
        // Render the index.ejs view, passing the filtered surveys
        res.render('index', { surveys });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});



// app.get('/add', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('surveyDB');
//         const collection = db.collection('surveys');
//         const surveys = await collection.find().toArray();
        
//         // Get hospital_code and site_code from the session
//         const { hospital_code, site_code } = req.session.user;
        
//         // Pass hospital_code and site_code to the template
//         res.render('add_survey', { surveys, hospital_code, site_code });
//     } catch (e) {
//         console.error('Error getting surveys:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.get('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('surveyDB');
        const collection = db.collection('surveys');
        const customSurveys = await collection.find().toArray();
        
        // Get hospital_code and site_code from the session
        const { hospital_code, site_code } = req.session.user;

        // Pass both the custom and API surveys to the template
        res.render('add_survey', { customSurveys, apiSurveys: surveysData, hospital_code, site_code });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});


// // In the POST /add route
// app.post('/add', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');
        
//         // Extract survey data, hospital code, and site code from the request body
//         const { surveyName, specialty, hospital_code, site_code } = req.body;
        
//         // Insert the new survey with the hospital code and site code into the database
//         await collection.insertOne({ surveyName, specialty, hospital_code, site_code });
//         res.redirect('/');
//     } catch (e) {
//         console.error('Error adding survey:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.post('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');

        // Extract survey data from the request body
        const { specialty, apiSurveyData, customSurveyData, hospital_code, site_code } = req.body;

        // Parse the JSON strings into JavaScript objects
        const API = JSON.parse(apiSurveyData); // API surveys will have name and id
        const custom = JSON.parse(customSurveyData); // Custom surveys will only have names

        // Insert the new survey data into the database
        await collection.insertOne({
            specialty,
            API, // Rename apiSurveys to API
            custom, // Rename customSurveys to custom
            hospital_code,
            site_code
        });

        res.redirect('/');
    } catch (e) {
        console.error('Error adding survey:', e);
        res.status(500).send('Internal Server Error');
    }
});






// // In the GET /edit/:id route
// app.get('/edit/:id', checkAuth, async (req, res) => {
//     try {
//         const db1 = client.db('manage_doctors'); // For fetching the survey being edited
//         const collection1 = db1.collection('surveys');
//         const survey = await collection1.findOne({ _id: new ObjectId(req.params.id) });

//         // Fetch all existing specialties from the surveyDB collection
//         const db2 = client.db('surveyDB');
//         const collection2 = db2.collection('surveys');
//         const surveys = await collection2.find().toArray();
//         const specialties = await collection1.distinct('specialty');

//         // Pass survey, specialties, surveys, and site_code to the template
//         res.render('edit_survey', { survey, specialties, surveys, site_code: survey.site_code });
//     } catch (e) {
//         console.error('Error getting survey for edit:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.get('/edit/:id', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');

        // Find the survey being edited using the provided ID
        const survey = await collection.findOne({ _id: new ObjectId(req.params.id) });

        // Fetch all available API and Custom surveys from the relevant collections
        const customSurveys = await db.collection('customSurveys').distinct('surveyName'); 
        const apiSurveys = await db.collection('apiSurveys').find().toArray();

        // Pass the survey to be edited, the available custom surveys, and API surveys to the view
        res.render('edit_survey', { survey, customSurveys, apiSurveys });
    } catch (e) {
        console.error('Error fetching survey for edit:', e);
        res.status(500).send('Internal Server Error');
    }
});








// // In the POST /edit/:id route
// app.post('/edit/:id', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');
        
//         // Extract selected survey names, specialty, hospital code, and site code from the request body
//         const { surveyNames, specialty, hospital_code, site_code } = req.body;

//         // Update the survey document in the database with the new values
//         await collection.updateOne(
//             { _id: new ObjectId(req.params.id) },
//             { $set: { 
//                 surveyName: Array.isArray(surveyNames) ? surveyNames : [surveyNames], 
//                 specialty, 
//                 hospital_code, 
//                 site_code  // Ensure site_code is also updated
//             } }
//         );

//         // Redirect the user to the home page after the update is complete
//         res.redirect('/');
//     } catch (e) {
//         console.error('Error editing survey:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.post('/edit/:id', checkAuth, async (req, res) => {
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
                    API: apiSurveys,      // Store the selected API surveys
                    custom: customSurveys  // Store the selected Custom surveys
                }
            }
        );

        // Redirect to the home page after saving the changes
        res.redirect('/');
    } catch (e) {
        console.error('Error updating survey:', e);
        res.status(500).send('Internal Server Error');
    }
});




app.post('/delete/:id', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/');
    } catch (e) {
        console.error('Error deleting survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

function startServer() {
    app.listen(PORT, () => {
        console.log(`Login server is running on http://localhost:${PORT}`);
    });
}

module.exports = startServer;
