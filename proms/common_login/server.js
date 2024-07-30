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
            mongoUrl: 'mongodb://localhost:27017/Data_Entry_Incoming', // Use a different database for sessions
            ttl: 14 * 24 * 60 * 60 // Sessions will be stored for 14 days
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 // 1 day for session cookie
        }
    }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(flash());
    // Middleware to pass messages to the views
// Middleware to pass messages to the views
app.use((req, res, next) => {
    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');
    next();
});


    // Serve static files (login page)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
    app.use('/data', express.static(path.join(__dirname, 'data')));


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
    
// Example route to handle /openServer request
app.get('/openServer', (req, res) => {
    // Extract the 'mr_no' parameter from the query string
    const mr_no = req.query.mr_no;

    // Perform your logic here. For example, you could query the database, or start a server, etc.
    // For demonstration, let's just send a response back.
    if (mr_no) {
        res.send(`Server opened with MR No: ${mr_no}`);
    } else {
        res.status(400).send('MR No not provided');
    }
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
    const generateCSV = (mr_no) => {
        return new Promise((resolve, reject) => {
            const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
                    reject(error);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                resolve();
            });
        });
    };

    

    

    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;

    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });

    //     if (user1) {
    //         // Check survey status
    //     if (user1.surveyStatus === 'Not Completed') {
    //         req.flash('error', 'Survey not completed. Please complete the survey.');
    //         return res.redirect('/');
    //     }

    //         // Check if the password is set
    //         if (!user1.password) {
    //             // User exists but no password is set
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully

    //             // Set the session user
    //             req.session.user = user1;

    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);

    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };

    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );

    //             const surveyResults = await Promise.all(surveyPromises);

    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = [];
    //             surveyResults.forEach((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 surveyNames.forEach(surveyType => {
    //                     console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
    //                     graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
    //                 });
    //             });

    //             await Promise.all(graphPromises);
    //             // Execute the Python script to generate the CSV file
    //             await generateCSV(user1.Mr_no);

    //             // Render user details using userDetails.ejs
    //             return res.render('userDetails', { user: user1, surveyName: user1.specialities.map(s => s.name) });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });


    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check survey status
    //         if (user1.surveyStatus === 'Not Completed') {
    //             req.flash('error', 'Survey not completed. Please complete the survey.');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the password is set
    //         if (!user1.password) {
    //             // User exists but no password is set
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully
    
    //             // Set the session user
    //             req.session.user = user1;
    
    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);
    
    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = [];
    //             surveyResults.forEach((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 surveyNames.forEach(surveyType => {
    //                     console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
    //                     graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
    //                 });
    //             });
    
    //             await Promise.all(graphPromises);
    //             // Execute the Python script to generate the CSV file
    //             await generateCSV(user1.Mr_no);
    
    //             // Render user details using userDetails.ejs with CSV path
    //             return res.render('userDetails', { 
    //                 user: user1, 
    //                 surveyName: user1.specialities.map(s => s.name), 
    //                 csvPath: `data/patient_health_scores_${user1.Mr_no}.csv` 
    //             });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });
    
    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check survey status
    //         if (user1.surveyStatus === 'Not Completed') {
    //             req.flash('error', 'Survey not completed. Please complete the survey.');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the password is set
    //         if (!user1.password) {
    //             // User exists but no password is set
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully
    
    //             // Set the session user
    //             req.session.user = user1;
    
    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);
    
    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = [];
    //             surveyResults.forEach((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 surveyNames.forEach(surveyType => {
    //                     console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
    //                     graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
    //                 });
    //             });
    
    //             await Promise.all(graphPromises);
    //             // Execute the Python script to generate the CSV file
    //             await generateCSV(user1.Mr_no);
    
    //             // Render user details using userDetails.ejs with CSV paths
    //             return res.render('userDetails', { 
    //                 user: user1, 
    //                 surveyName: user1.specialities.map(s => s.name), 
    //                 csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //                 painCsvPath: `data/PROMIS Bank v1.1 - Pain Interference_${user1.Mr_no}.csv`
    //             });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });

    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check survey status
    //         if (user1.surveyStatus === 'Not Completed') {
    //             req.flash('error', 'Survey not completed. Please complete the survey.');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the password is set
    //         if (!user1.password) {
    //             // User exists but no password is set
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully
    //             // Set the session user
    //             req.session.user = user1;
    
    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);
    
    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = [];
    //             surveyResults.forEach((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 surveyNames.forEach(surveyType => {
    //                     console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
    //                     graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
    //                 });
    //             });
    
    //             await Promise.all(graphPromises);
    //             // Execute the Python script to generate the CSV file
    //             await generateCSV(user1.Mr_no);
    
    //             // Render user details using userDetails.ejs with CSV paths
    //             return res.render('userDetails', { 
    //                 user: user1, 
    //                 surveyName: user1.specialities.map(s => s.name), 
    //                 csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //                 painCsvPath: `data/PROMIS Bank v1.1 - Pain Interference_${user1.Mr_no}.csv`
    //             });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });

    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check survey status and appointment finished count
    //         if (user1.surveyStatus === 'Not Completed' && user1.appointmentFinished <= 1) {
    //             req.flash('error', 'Survey not completed. Please finish the survey to log in.');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the password is set
    //         if (!user1.password) {
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully
    //             req.session.user = user1;
    
    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);
    
    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = [];
    //             surveyResults.forEach((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 surveyNames.forEach(surveyType => {
    //                     console.log(`Generating graph for speciality: ${specialityName}, Survey: ${surveyType}`);
    //                     graphPromises.push(generateGraphs(user1.Mr_no, surveyType));
    //                 });
    //             });
    
    //             await Promise.all(graphPromises);
    //             await generateCSV(user1.Mr_no);
    
    //             return res.render('userDetails', { 
    //                 user: user1, 
    //                 surveyName: user1.specialities.map(s => s.name), 
    //                 csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //                 painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`
    //             });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });
    //this the api graphs and hard coded graphs generation
    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check survey status and appointment finished count
    //         if (user1.surveyStatus === 'Not Completed' && user1.appointmentFinished <= 1) {
    //             req.flash('error', 'Survey not completed. Please finish the survey to log in.');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the password is set
    //         if (!user1.password) {
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         } else if (user1.password === password) {
    //             // Password matches, user authenticated successfully
    //             req.session.user = user1;
    
    //             const newFolderDirectory = path.join(__dirname, 'new_folder');
    //             await clearDirectory(newFolderDirectory);
    
    //             // Define a function to execute Python script
    //             const executePythonScript = (scriptName, args) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error executing ${scriptName}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Define a function to generate CSV
    //             const generateCSV = (mr_no) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Define a function to execute Python script for graph generation
    //             const generateGraphs = (mr_no, survey_type) => {
    //                 return new Promise((resolve, reject) => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         resolve();
    //                     });
    //                 });
    //             };
    
    //             // Check for special conditions based on user's specialities
    //             const specialities = user1.specialities || []; // Ensure `specialities` is always an array
    //             const onlyOrthopaedic = specialities.length === 1 && specialities[0].name === "Orthopaedic Surgery";
    //             const multipleSpecialitiesOrOther = specialities.length >= 2 || (specialities.length === 1 && specialities[0].name !== "Orthopaedic Surgery");
    
    //             if (onlyOrthopaedic) {
    //                 await executePythonScript('API_script', [user1.Mr_no]);
    //             } else if (multipleSpecialitiesOrOther) {
    //                 await executePythonScript('API_script', [user1.Mr_no]);
    //                 // await generateCSV(user1.Mr_no);
    
    //                 // Fetch all survey data for user's specialities in parallel
    //                 const surveyPromises = user1.specialities.map(speciality =>
    //                     db3.collection('surveys').findOne({ specialty: speciality.name })
    //                 );
    
    //                 const surveyResults = await Promise.all(surveyPromises);
    
    //                 // Generate graphs for all specialities and their survey types in parallel
    //                 const graphPromises = surveyResults.map((surveyData, index) => {
    //                     const specialityName = user1.specialities[index].name;
    //                     const surveyNames = surveyData ? surveyData.surveyName : [];
    //                     return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
    //                 });
    
    //                 await Promise.all(graphPromises.flat());
    //             }
    
    //             return res.render('userDetails', { 
    //                 user: user1, 
    //                 surveyName: user1.specialities.map(s => s.name), 
    //                 csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //                 painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`
    //             });
    //         } else {
    //             // Password does not match
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });
     

    app.post('/login', async (req, res) => {
        let { identifier, password } = req.body;
    
        // Find user by MR number or phone number
        const user1 = await db1.collection('patient_data').findOne({
            $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
        });
    
        if (user1) {
            // Check survey status and appointment finished count
            if (user1.surveyStatus === 'Not Completed') {
                if (!user1.hasOwnProperty('appointmentFinished')) {
                    // Redirect to the specified page if `appointmentFinished` field is absent
                    return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
                } else if (user1.appointmentFinished <= 1) {
                    req.flash('error', 'Survey not completed. Please finish the survey to log in.');
                    return res.redirect('/');
                }
            }
    
            // Check if the password is set
            if (!user1.password) {
                req.flash('error', 'Please, register to sign in');
                return res.redirect('/');
            } else if (user1.password === password) {
                // Password matches, user authenticated successfully
                req.session.user = user1;
    
                const newFolderDirectory = path.join(__dirname, 'new_folder');
                await clearDirectory(newFolderDirectory);
    
                // Define a function to execute Python script
                const executePythonScript = (scriptName, args) => {
                    return new Promise((resolve, reject) => {
                        const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error executing ${scriptName}: ${error.message}`);
                                reject(error);
                            }
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            resolve();
                        });
                    });
                };
    
                // Define a function to generate CSV
                const generateCSV = (mr_no) => {
                    return new Promise((resolve, reject) => {
                        const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
                                reject(error);
                            }
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            resolve();
                        });
                    });
                };
    
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
    
                // Check for special conditions based on user's specialities
                const specialities = user1.specialities || []; // Ensure `specialities` is always an array
                const onlyOrthopaedic = specialities.length === 1 && specialities[0].name === "Orthopaedic Surgery";
                const multipleSpecialitiesOrOther = specialities.length >= 2 || (specialities.length === 1 && specialities[0].name !== "Orthopaedic Surgery");
    
                if (onlyOrthopaedic) {
                    await executePythonScript('API_script', [user1.Mr_no]);
                } else if (multipleSpecialitiesOrOther) {
                    await executePythonScript('API_script', [user1.Mr_no]);
                    // await generateCSV(user1.Mr_no);
    
                    // Fetch all survey data for user's specialities in parallel
                    const surveyPromises = user1.specialities.map(speciality =>
                        db3.collection('surveys').findOne({ specialty: speciality.name })
                    );
    
                    const surveyResults = await Promise.all(surveyPromises);
    
                    // Generate graphs for all specialities and their survey types in parallel
                    const graphPromises = surveyResults.map((surveyData, index) => {
                        const specialityName = user1.specialities[index].name;
                        const surveyNames = surveyData ? surveyData.surveyName : [];
                        return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
                    });
    
                    await Promise.all(graphPromises.flat());
                }
    
                return res.render('userDetails', { 
                    user: user1, 
                    surveyName: user1.specialities.map(s => s.name), 
                    csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
                    painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`
                });
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

    // app.get('/line-chart', async (req, res) => {
    //     const { type, mr_no } = req.query;
    //     const csvPath = `data/${type}_health_${mr_no}.csv`;
    //     const title = type === 'physical' ? 'Physical Health' : 'Mental Health';
    //     res.render('line-chart', { csvPath, title });
    // }); 
    
    // // this is the new code with all the graph generation all types of surveys from the chart 
    // app.get('/chart', async (req, res) => {
    //     const { type, mr_no } = req.query;
    //     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
    //     const title = type === 'physical' ? 'Physical Health' : 'Mental Health';
    //     res.render('chart', { csvPath, title });
    // });    

    // Add this route to render chart.ejs
// app.get('/chart', async (req, res) => {
//     const { type, mr_no } = req.query;
//     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
//     const title = type === 'physical' ? 'PROMIS-10 Physical Health' : 'PROMIS-10 Mental Health';
//     res.render('chart', { csvPath, title });
// });
// app.get('/chart', async (req, res) => {
//     const { type, mr_no } = req.query;
//     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
//     res.render('chart', { csvPath});
// });

// app.get('/chart', async (req, res) => {
//     const { type, mr_no } = req.query;
//     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
//     res.render('chart1', { csvPath});
// });

app.get('/chart', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/patient_health_scores_${mr_no}.csv`;
    res.render('chart', { csvPath });
});


app.get('/chart1', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/PROMIS Bank v1.1 - Pain Interference_${mr_no}.csv`;
    res.render('chart1', { csvPath});
});

    // // Add this route to render chart.ejs
    // app.get('/chart', async (req, res) => {
    //     const { csvPath } = req.query;
    //     res.render('chart', { csvPath });
    // });

// app.get('/chart', async (req, res) => {
//     const { mr_no, type } = req.query;
//     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
//     res.render('chart', { csvPath });
// });

// app.get('/chart', async (req, res) => {
//     const { mr_no } = req.query;
//     res.render('chart', { mr_no });
// });



    // GET route for Register link
    app.get('/register', (req, res) => {
        res.redirect('http://localhost:3002/');
    });

    // GET route for Reset Password link
    app.get('/reset-password', (req, res) => {
        res.redirect('http://localhost:3002/');
    });

    // Protect the userDetails route
    // app.get('/userDetails', checkAuth, async (req, res) => {
    //     const user = req.session.user;
    //     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
    //     res.render('userDetails', { user: user, surveyName: surveyData ? surveyData.surveyName : [] });
    // });

    // Protect the userDetails route
app.get('/userDetails', checkAuth, async (req, res) => {
    const user = req.session.user;
    const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
    res.render('userDetails', { 
        user: user, 
        surveyName: surveyData ? surveyData.surveyName : [], 
        csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
        painCsvPath: `data/PROMIS Bank v1.1 - Pain Interference_${user.Mr_no}.csv`
    });
});


// Add this route to serve the survey details page
app.get('/survey-details/:mr_no', checkAuth, async (req, res) => {
    const mr_no = req.params.mr_no;
    const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

    if (patientData) {
        res.render('surveyDetails', { user: patientData });
    } else {
        res.status(404).json({ error: 'Patient not found' });
    }
});

/* EDIT DETAILS JS UPDATE */

app.get('/edit-details', async (req, res) => {
    const { Mr_no } = req.query;
    console.log("Extracted MR number from query: ${Mr_no}");
    try {
        const patient = await db1.collection('patient_data').findOne({ Mr_no });
        console.log("Found patient data for MR number ${Mr_no}:", patient);
        if (patient) {
            // Prepare the patient data to be rendered
            const formattedPatient = {
                mrNo: patient.Mr_no, // Hash MR number for privacy if needed
                name: patient.Name,
                DOB: patient.DOB,
                phoneNumber: patient.phoneNumber,
                password : patient.password
            };
            console.log("Formatted patient data for rendering:", formattedPatient);
            // Render the edit-details template with the patient data
            res.render('edit-details', { patient: formattedPatient });
        } else {
            // Handle case where patient is not found
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// app.post('/update-data', async (req, res) => {
//     try {
//         console.log("in here");
//       // Extract data from request body
//       const { Mr_no,Name, DOB, phoneNumber } = req.body;
//       // Validate data (optional but recommended)
//       // You can add validation logic here to ensure data integrity

//       // Update the patient document
//       const updateResult = await db1.collection('patient_data').updateOne(
//         { Mr_no }, // Use _id for document identification
//         { $set: { Name, DOB, phoneNumber } }
//       );

//       if (updateResult.modifiedCount === 1) {
//         console.log("Patient record updated successfully!");
//         res.status(200).send({ message: 'Record updated successfully' }); // Inform client of success
//       } else {
//         console.error("Error updating patient record:", updateResult);
//         // res.status(500).send({ message: 'Error updating record' }); // Inform client of error
//         res.redirect('/edit-details');
//       }
//     } catch (error) {
//       console.error("Error updating patient record:", error);
//       res.status(500).send({ message: 'Error updating record' }); // Inform client of error
//     }
//   });
app.post('/update-data', async (req, res) => {
    try {
        const { Mr_no, Name, DOB, phoneNumber, password, Confirm_Password } = req.body;

        // Validate password and confirm password
        if (password !== Confirm_Password) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }

        // Update the patient document
        const updateResult = await db1.collection('patient_data').updateOne(
            { Mr_no }, // Use Mr_no for document identification
            { $set: { Name, DOB, phoneNumber, password } }
        );

        if (updateResult.modifiedCount === 1) {
            req.flash('success', 'Record updated successfully');
            res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        } else {
            req.flash('error', 'Error updating record');
            res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }
    } catch (error) {
        console.error("Error updating patient record:", error);
        req.flash('error', 'Internal Server Error');
        res.redirect(`/edit-details?Mr_no=${Mr_no}`);
    }
});

    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// Export the function to start the server
module.exports = startServer;
