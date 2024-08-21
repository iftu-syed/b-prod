const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
// const port = 30011;
const PORT = 4050;
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

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

app.get('/', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Get hospital_code from the session
        const hospital_code = req.session.user.hospital_code;
        
        // Find surveys that match the hospital_code
        const surveys = await collection.find({ hospital_code: hospital_code }).toArray();
        
        // Render the index.ejs view, passing the filtered surveys
        res.render('index', { surveys });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('surveyDB');
        const collection = db.collection('surveys');
        const surveys = await collection.find().toArray();
        
        // Pass hospital_code from session to the template
        const hospital_code = req.session.user.hospital_code;
        
        res.render('add_survey', { surveys, hospital_code });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/add', checkAuth, async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Extract survey data and hospital code from the request body
        const { surveyName, specialty, hospital_code } = req.body;
        
        // Insert the new survey with the hospital code into the database
        await collection.insertOne({ surveyName, specialty, hospital_code });
        res.redirect('/');
    } catch (e) {
        console.error('Error adding survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

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

//         res.render('edit_survey', { survey, specialties, surveys }); // Pass survey and specialties to the template
//     } catch (e) {
//         console.error('Error getting survey for edit:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.get('/edit/:id', checkAuth, async (req, res) => {
    try {
        const db1 = client.db('manage_doctors'); // For fetching the survey being edited
        const collection1 = db1.collection('surveys');
        const survey = await collection1.findOne({ _id: new ObjectId(req.params.id) });

        // Fetch all existing specialties from the surveyDB collection
        const db2 = client.db('surveyDB');
        const collection2 = db2.collection('surveys');
        const surveys = await collection2.find().toArray();
        const specialties = await collection1.distinct('specialty');

        // Pass survey, specialties, and surveys to the template
        res.render('edit_survey', { survey, specialties, surveys });
    } catch (e) {
        console.error('Error getting survey for edit:', e);
        res.status(500).send('Internal Server Error');
    }
});


// app.post('/edit/:id', checkAuth, async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');
        
//         // Extract selected survey names and specialty from the request body
//         const { surveyNames, specialty } = req.body;

//         // Update the survey document in the database with the new values
//         await collection.updateOne(
//             { _id: new ObjectId(req.params.id) },
//             { $set: { surveyName: Array.isArray(surveyNames) ? surveyNames : [surveyNames], specialty } }
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
        
        // Extract selected survey names, specialty, and hospital code from the request body
        const { surveyNames, specialty, hospital_code } = req.body;

        // Update the survey document in the database with the new values
        await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { 
                surveyName: Array.isArray(surveyNames) ? surveyNames : [surveyNames], 
                specialty, 
                hospital_code  // Ensure hospital_code is also updated
            } }
        );

        // Redirect the user to the home page after the update is complete
        res.redirect('/');
    } catch (e) {
        console.error('Error editing survey:', e);
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
