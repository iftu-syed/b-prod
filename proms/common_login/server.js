const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs').promises; // Use promises version of fs for better async handling
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');

async function startServer() {
    const app = express();
    const port = 3055;

    // Set EJS as the view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Middleware
    app.use(session({
        secret: 'your-secret-key', // Change this to a random secret key
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: 'mongodb://localhost:27017/sessions', // Use a different database for sessions
            ttl: 14 * 24 * 60 * 60 // Sessions will be stored for 14 days
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 // 1 day for session cookie
        }
    }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(flash());

    // Serve static files (login page)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));

    // MongoDB connection URL
    const uri1 = 'mongodb://localhost:27017/Data_Entry_Incoming';
    const uri2 = 'mongodb://localhost:27017/patient_data';
    const uri3 = 'mongodb://localhost:27017/manage_doctors';

    // Connect to both MongoDB databases
    const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
    const client2 = new MongoClient(uri2, { useNewUrlParser: true, useUnifiedTopology: true });
    const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });

    await Promise.all([client1.connect(), client2.connect(), client3.connect()]);

    const db1 = client1.db('Data_Entry_Incoming');
    const db2 = client2.db('patient_data');
    const db3 = client3.db('manage_doctors');

    console.log('Connected to all databases');

    // Middleware to check if user is logged in
    function checkAuth(req, res, next) {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/');
        }
    }

    // Serve login page on root URL
    app.get('/', (req, res) => {
        const message = req.flash('error')[0]; // Get the flash message if any
        const messageType = 'error'; // Default message type
        res.render('login', { message, messageType });
    });

    app.get('/login', async (req, res) => {
        const { Mr_no, password } = req.query;

        const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
        if (user1) {
            const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
            return res.render('userDetails', { user: user1, surveyName: surveyData ? surveyData.surveyName : [] });
        }
        res.redirect('/');
    });

    // Optimized clearDirectory function
    async function clearDirectory(directory) {
        try {
            const files = await fs.readdir(directory);
            const unlinkPromises = files.map(file => fs.unlink(path.join(directory, file)));
            await Promise.all(unlinkPromises);
        } catch (err) {
            console.error('Error clearing directory:', err);
        }
    }

    // This is the section related to the modified post method.
    app.post('/login', async (req, res) => {
        let { identifier, password } = req.body;

        // Find user by MR number or phone number
        const user1 = await db1.collection('patient_data').findOne({
            $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
        });

        if (user1) {
            // Check if the password is set
            if (!user1.password) {
                // User exists but no password is set
                req.flash('error', 'Please, register to sign in');
                return res.redirect('/');
            } else if (user1.password === password) {
                // Password matches, user authenticated successfully

                // Set the session user
                req.session.user = user1;

                const newFolderDirectory = path.join(__dirname, 'new_folder');
                await clearDirectory(newFolderDirectory);

                // Define a function to execute Python script for graph generation
                const generateGraphs = (mr_no, survey_type) => {
                    return new Promise((resolve, reject) => {
                        const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error generating graph for ${survey_type}: ${error.message}`);
                                reject(error);
                            }
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            resolve();
                        });
                    });
                };

                // Fetch all survey data for user's specialities in parallel
                const surveyPromises = user1.specialities.map(speciality =>
                    db3.collection('surveys').findOne({ specialty: speciality.name })
                );

                const surveyResults = await Promise.all(surveyPromises);

                // Generate graphs for all specialities and their survey types in parallel
                const graphPromises = [];
                surveyResults.forEach((surveyData, index) => {
                    const specialityName = user1.specialities[index].name;
                    const surveyNames = surveyData ? surveyData.surveyName : [];
                    surveyNames.forEach(surveyType => {
                        console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
                        graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
                    });
                });

                await Promise.all(graphPromises);

                // Render user details using userDetails.ejs
                return res.render('userDetails', { user: user1, surveyName: user1.specialities.map(s => s.name) });
            } else {
                // Password does not match
                req.flash('error', 'Invalid credentials');
                return res.redirect('/');
            }
        } else {
            // User not found
            req.flash('error', 'These details are not found');
            return res.redirect('/');
        }
    });

    // Middleware to pass messages to the views
    app.use((req, res, next) => {
        res.locals.message = req.flash('error');
        next();
    });

    // Logout route
    app.post('/logout', async (req, res) => {
        const directory = path.join(__dirname, 'new_folder');
        await clearDirectory(directory);
        req.session.destroy();
        res.redirect('/');
    });

    // GET route for Register link
    app.get('/register', (req, res) => {
        res.redirect('http://localhost:3002/');
    });

    // GET route for Reset Password link
    app.get('/reset-password', (req, res) => {
        res.redirect('http://localhost:3002/');
    });

    // Protect the userDetails route
    app.get('/userDetails', checkAuth, async (req, res) => {
        const user = req.session.user;
        const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
        res.render('userDetails', { user: user, surveyName: surveyData ? surveyData.surveyName : [] });
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// Export the function to start the server
module.exports = startServer;
