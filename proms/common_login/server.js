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
const { Parser } = require('json2csv'); // Add this at the top with other requires
const xml2js = require('xml2js'); // Add this at the top with other requires


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

    function writeLog(logFile, logData) {
        fs.appendFile(path.join(__dirname, 'logs', logFile), logData + '\n', (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }
    app.use((req, res, next) => {
        if (req.session && req.session.user) {
            const { Mr_no, firstName, lastName, hospital_code, speciality } = req.session.user;
            const timestamp = new Date().toISOString();
            const logData = `Mr_no: ${Mr_no}, firstName: ${firstName}, lastName: ${lastName}, hospital: ${hospital_code}, speciality: ${speciality}, timestamp: ${timestamp}, page: ${req.path}, action: ${req.method}`;
            writeLog('access_logs.txt', logData);
        }
        next();
    });
    


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
    //         // Check if the password is set
    //         if (!user1.password) {
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the provided password matches the user's password
    //         if (user1.password !== password) {
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    
    //         // Check survey status and appointment finished count
    //         if (user1.surveyStatus === 'Not Completed') {
    //             if (!user1.hasOwnProperty('appointmentFinished')) {
    //                 // Redirect to the specified page if `appointmentFinished` field is absent
    //                 return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
    //             }
    //         }
    
    //         // Password matches, user authenticated successfully
    //         req.session.user = user1;
    
    //         const newFolderDirectory = path.join(__dirname, 'new_folder');
    //         await clearDirectory(newFolderDirectory);
    
    //         // Define a function to execute Python script
    //         const executePythonScript = (scriptName, args) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error executing ${scriptName}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to generate CSV
    //         const generateCSV = (mr_no) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to execute Python script for graph generation
    //         const generateGraphs = (mr_no, survey_type) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Check for special conditions based on user's specialities
    //         const specialities = user1.specialities || []; // Ensure `specialities` is always an array
    //         const onlyOrthopaedic = specialities.length === 1 && specialities[0].name === "Orthopaedic Surgery";
    //         const multipleSpecialitiesOrOther = specialities.length >= 2 || (specialities.length === 1 && specialities[0].name !== "Orthopaedic Surgery");
    
    //         if (onlyOrthopaedic) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    //         } else if (multipleSpecialitiesOrOther) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = surveyResults.map((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 if (surveyNames.length > 0) {
    //                     return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
    //                 } else {
    //                     console.warn(`No survey types available for speciality: ${specialityName}`);
    //                     return Promise.resolve();
    //                 }
    //             });
    
    //             await Promise.all(graphPromises.flat());
    //         }
    
    //         // Initialize aiMessage to an empty string or a default message
    //         let aiMessage = '';
    
    //         try {
    //             // Fetch the AI-generated message here (you can replace this with your logic to get the message)
    //             const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
    //             const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
    //             const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);
    
    //             await Promise.all([fs.stat(severityLevelsCsv), fs.stat(patientHealthScoresCsv), fs.stat(apiSurveysCsv)]);
    
    //             aiMessage = await new Promise((resolve, reject) => {
    //                 exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating AI message: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     resolve(stdout.trim());
    //                 });
    //             });
    //         } catch (error) {
    //             console.error('Error generating AI message:', error);
    //             aiMessage = 'Unable to generate AI message at this time.';
    //         }
    
    //         return res.render('userDetails', { 
    //             user: user1, 
    //             surveyName: user1.specialities.map(s => s.name), 
    //             csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //             painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
    //             aiMessage: aiMessage // Pass the AI message to the template
    //         });
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
    //         // Check if the password is set
    //         if (!user1.password) {
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the provided password matches the user's password
    //         if (user1.password !== password) {
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    
    //         // Check survey status and appointment finished count
    //         if (user1.surveyStatus === 'Not Completed') {
    //             if (!user1.hasOwnProperty('appointmentFinished')) {
    //                 // Redirect to the specified page if `appointmentFinished` field is absent
    //                 return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
    //             }
    //         }
    
    //         // Password matches, user authenticated successfully
    //         req.session.user = user1;
    
    //         const newFolderDirectory = path.join(__dirname, 'new_folder');
    //         await clearDirectory(newFolderDirectory);
    
    //         // Define a function to execute Python script
    //         const executePythonScript = (scriptName, args) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error executing ${scriptName}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to generate CSV
    //         const generateCSV = (mr_no) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to execute Python script for graph generation
    //         const generateGraphs = (mr_no, survey_type) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Check for special conditions based on user's specialities
    //         const specialities = user1.specialities || []; // Ensure `specialities` is always an array
    //         const onlyOrthopaedic = specialities.length === 1 && specialities[0].name === "Orthopaedic Surgery";
    //         const multipleSpecialitiesOrOther = specialities.length >= 2 || (specialities.length === 1 && specialities[0].name !== "Orthopaedic Surgery");
    
    //         if (onlyOrthopaedic) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    //         } else if (multipleSpecialitiesOrOther) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = surveyResults.map((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 if (surveyNames.length > 0) {
    //                     return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
    //                 } else {
    //                     console.warn(`No survey types available for speciality: ${specialityName}`);
    //                     return Promise.resolve();
    //                 }
    //             });
    
    //             await Promise.all(graphPromises.flat());
    //         }
    
    //         // Initialize aiMessage to an empty string or a default message
    //         let aiMessage = '';
    
    //         try {
    //             // Fetch the AI-generated message here (you can replace this with your logic to get the message)
    //             const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
    //             const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
    //             const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);
    
    //             await Promise.all([fs.stat(severityLevelsCsv), fs.stat(patientHealthScoresCsv), fs.stat(apiSurveysCsv)]);
    
    //             aiMessage = await new Promise((resolve, reject) => {
    //                 exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating AI message: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     resolve(stdout.trim());
    //                 });
    //             });
    //         } catch (error) {
    //             console.error('Error generating AI message:', error);
    //             aiMessage = 'Unable to generate AI message at this time.';
    //         }
    
    //         // Store the AI message and timestamp in the database
    //         const currentDate = new Date();
    //         await db1.collection('patient_data').updateOne(
    //             { Mr_no: user1.Mr_no },
    //             {
    //                 $set: {
    //                     aiMessage: aiMessage,
    //                     aiMessageGeneratedAt: currentDate
    //                 }
    //             }
    //         );
    
    //         return res.render('userDetails', { 
    //             user: user1, 
    //             surveyName: user1.specialities.map(s => s.name), 
    //             csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //             painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
    //             aiMessage: aiMessage // Pass the AI message to the template
    //         });
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
            // Check if the password is set
            if (!user1.password) {
                req.flash('error', 'Please, register to sign in');
                return res.redirect('/');
            }
    
            // Check if the provided password matches the user's password
            if (user1.password !== password) {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/');
            }
    
            // Check survey status and appointment finished count
            if (user1.surveyStatus === 'Not Completed') {
                if (!user1.hasOwnProperty('appointmentFinished')) {
                    // Redirect to the specified page if `appointmentFinished` field is absent
                    return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
                }
            }
    
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
    
                // Fetch all survey data for user's specialities in parallel
                const surveyPromises = user1.specialities.map(speciality =>
                    db3.collection('surveys').findOne({ specialty: speciality.name })
                );
    
                const surveyResults = await Promise.all(surveyPromises);
    
                // Generate graphs for all specialities and their survey types in parallel
                const graphPromises = surveyResults.map((surveyData, index) => {
                    const specialityName = user1.specialities[index].name;
                    const surveyNames = surveyData ? surveyData.surveyName : [];
                    if (surveyNames.length > 0) {
                        return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
                    } else {
                        console.warn(`No survey types available for speciality: ${specialityName}`);
                        return Promise.resolve();
                    }
                });
    
                await Promise.all(graphPromises.flat());
            }
    
            // Initialize aiMessage to the existing message or an empty string
            let aiMessage = user1.aiMessage || '';
    
            // Determine if 30 days have passed since the last AI message generation
            const currentDate = new Date();
            const lastGeneratedDate = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists
    
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const isThirtyDaysPassed = (currentDate - lastGeneratedDate) > thirtyDaysInMs;
    
            if (!isThirtyDaysPassed && aiMessage) {
                console.log('Using existing AI message');
            } else {
                try {
                    // Fetch the AI-generated message if 30 days have passed
                    const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
                    const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
                    const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);
    
                    await Promise.all([fs.stat(severityLevelsCsv), fs.stat(patientHealthScoresCsv), fs.stat(apiSurveysCsv)]);
    
                    aiMessage = await new Promise((resolve, reject) => {
                        exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error generating AI message: ${error.message}`);
                                reject(error);
                            }
                            resolve(stdout.trim());
                        });
                    });
    
                    // Update the AI message and the generation date in the database
                    await db1.collection('patient_data').updateOne(
                        { Mr_no: user1.Mr_no },
                        {
                            $set: {
                                aiMessage: aiMessage,
                                aiMessageGeneratedAt: currentDate
                            }
                        }
                    );
                } catch (error) {
                    console.error('Error generating AI message:', error);
                    aiMessage = 'Unable to generate AI message at this time.';
                }
            }
    
            // Render the user details page
            return res.render('userDetails', { 
                user: user1, 
                surveyName: user1.specialities.map(s => s.name), 
                csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
                painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
                aiMessage: aiMessage // Pass the AI message to the template
            });
        } else {
            // User not found
            req.flash('error', 'These details are not found');
            return res.redirect('/');
        }
    });
    // app.post('/login', async (req, res) => {
    //     let { identifier, password } = req.body;
    
    //     // Find user by MR number or phone number
    //     const user1 = await db1.collection('patient_data').findOne({
    //         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    //     });
    
    //     if (user1) {
    //         // Check if the password is set
    //         if (!user1.password) {
    //             req.flash('error', 'Please, register to sign in');
    //             return res.redirect('/');
    //         }
    
    //         // Check if the provided password matches the user's password
    //         if (user1.password !== password) {
    //             req.flash('error', 'Invalid credentials');
    //             return res.redirect('/');
    //         }
    
    //         // Check survey status and appointment finished count
    //         if (user1.surveyStatus === 'Not Completed') {
    //             if (!user1.hasOwnProperty('appointmentFinished')) {
    //                 // Redirect to the specified page if `appointmentFinished` field is absent
    //                 return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
    //             }
    //         }
    
    //         // Password matches, user authenticated successfully
    //         req.session.user = user1;
    
    //         const newFolderDirectory = path.join(__dirname, 'new_folder');
    //         await clearDirectory(newFolderDirectory);
    
    //         // Define a function to execute Python script
    //         const executePythonScript = (scriptName, args) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error executing ${scriptName}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to generate CSV
    //         const generateCSV = (mr_no) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Define a function to execute Python script for graph generation
    //         const generateGraphs = (mr_no, survey_type) => {
    //             return new Promise((resolve, reject) => {
    //                 const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
    //                 exec(command, (error, stdout, stderr) => {
    //                     if (error) {
    //                         console.error(`Error generating graph for ${survey_type}: ${error.message}`);
    //                         reject(error);
    //                     }
    //                     if (stderr) {
    //                         console.error(`stderr: ${stderr}`);
    //                     }
    //                     resolve();
    //                 });
    //             });
    //         };
    
    //         // Check for special conditions based on user's specialities
    //         const specialities = user1.specialities || []; // Ensure `specialities` is always an array
    //         const onlyOrthopaedic = specialities.length === 1 && specialities[0].name === "Orthopaedic Surgery";
    //         const multipleSpecialitiesOrOther = specialities.length >= 2 || (specialities.length === 1 && specialities[0].name !== "Orthopaedic Surgery");
    
    //         if (onlyOrthopaedic) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    //         } else if (multipleSpecialitiesOrOther) {
    //             await executePythonScript('API_script', [user1.Mr_no]);
    
    //             // Fetch all survey data for user's specialities in parallel
    //             const surveyPromises = user1.specialities.map(speciality =>
    //                 db3.collection('surveys').findOne({ specialty: speciality.name })
    //             );
    
    //             const surveyResults = await Promise.all(surveyPromises);
    
    //             // Generate graphs for all specialities and their survey types in parallel
    //             const graphPromises = surveyResults.map((surveyData, index) => {
    //                 const specialityName = user1.specialities[index].name;
    //                 const surveyNames = surveyData ? surveyData.surveyName : [];
    //                 if (surveyNames.length > 0) {
    //                     return Promise.all(surveyNames.map(surveyType => generateGraphs(user1.Mr_no, surveyType)));
    //                 } else {
    //                     console.warn(`No survey types available for speciality: ${specialityName}`);
    //                     return Promise.resolve();
    //                 }
    //             });
    
    //             await Promise.all(graphPromises.flat());
    //         }
    
    //         // Initialize aiMessage to the existing message or an empty string
    //         let aiMessage = user1.aiMessage || '';
    
    //         // Determine if the CSV files have been modified since the last AI message generation
    //         const mr_no = user1.Mr_no;
    //         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);
    //         const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${mr_no}.csv`);
    
    //         // Get the last modification times of the CSV files
    //         const [patientHealthScoresStats, apiSurveysStats] = await Promise.all([
    //             fs.stat(patientHealthScoresCsv),
    //             fs.stat(apiSurveysCsv)
    //         ]);
    
    //         const patientHealthScoresMtime = patientHealthScoresStats.mtime;
    //         const apiSurveysMtime = apiSurveysStats.mtime;
    
    //         // Retrieve the stored last modification times and determine if the AI message needs to be regenerated
    //         const lastGeneratedTime = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists
    //         const storedPatientHealthScoresMtime = user1.patientHealthScoresMtime || new Date(0);
    //         const storedApiSurveysMtime = user1.apiSurveysMtime || new Date(0);
    
    //         const isCsvModified = patientHealthScoresMtime > storedPatientHealthScoresMtime ||
    //             apiSurveysMtime > storedApiSurveysMtime;
    
    //         if (isCsvModified) {
    //             // Regenerate the AI message if the CSV files have been modified
    //             try {
    //                 aiMessage = await new Promise((resolve, reject) => {
    //                     exec(`python3 common_login/python_scripts/patientprompt.py "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating AI message: ${error.message}`);
    //                             reject(error);
    //                         }
    //                         resolve(stdout.trim());
    //                     });
    //                 });
    
    //                 // Update the AI message, last generated time, and CSV modification times in the database
    //                 await db1.collection('patient_data').updateOne(
    //                     { Mr_no: mr_no },
    //                     {
    //                         $set: {
    //                             aiMessage: aiMessage,
    //                             aiMessageGeneratedAt: new Date(),
    //                             patientHealthScoresMtime: patientHealthScoresMtime,
    //                             apiSurveysMtime: apiSurveysMtime
    //                         }
    //                     }
    //                 );
    //             } catch (error) {
    //                 console.error('Error generating AI message:', error);
    //                 aiMessage = 'Unable to generate AI message at this time.';
    //             }
    //         } else {
    //             console.log('Using existing AI message');
    //         }
    
    //         // Render the user details page
    //         return res.render('userDetails', { 
    //             user: user1, 
    //             surveyName: user1.specialities.map(s => s.name), 
    //             csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
    //             painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
    //             aiMessage: aiMessage // Pass the AI message to the template
    //         });
    //     } else {
    //         // User not found
    //         req.flash('error', 'These details are not found');
    //         return res.redirect('/');
    //     }
    // });
    
    

    // Middleware to pass messages to the views
    app.use((req, res, next) => {
        res.locals.message = req.flash('error');
        next();
    });


    app.post('/logout', async (req, res) => {
        if (req.session && req.session.user && req.session.loginTime) {
            const { Mr_no, firstName, lastName, hospital_code, speciality } = req.session.user;
            const loginTime = new Date(req.session.loginTime);
            const logoutTime = new Date();
            const sessionDuration = (logoutTime - loginTime) / 1000; // Duration in seconds
    
            // Log the logout activity and session duration
            const logData = `Mr_no: ${Mr_no}, firstName: ${firstName}, lastName: ${lastName}, hospital: ${hospital_code}, speciality: ${speciality}, timestamp: ${logoutTime.toISOString()}, action: logout, session_duration: ${sessionDuration} seconds`;
            writeLog('logout_logs.txt', logData);
        }
    
        const directory = path.join(__dirname, 'new_folder');
        await clearDirectory(directory);
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/');
        });        
    });
    
    


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
//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/PROMIS Bank v1.1 - Pain Interference_${user.Mr_no}.csv`
//     });
// });

// Inside your server.js or the route handling function
// app.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;
//     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
    
//     // Fetch the AI-generated message here (you can replace this with your logic to get the message)
//     const aiMessage = "Your AI generated message goes here."; // Replace with actual AI message fetching logic

//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/PROMIS Bank v1.1 - Pain Interference_${user.Mr_no}.csv`,
//         aiMessage: aiMessage // Pass the AI message to the template
//     });
// });
// app.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;
//     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
//     const lang = req.query.lang || 'en';
//     const aiMessage = "Your AI generated message goes here."; 
    
//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
//         aiMessage: aiMessage, // Pass the AI message to the template
//         lang: lang  // Pass the language preference to the template
//     });
// });

// app.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;
//     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });
//     const lang = req.query.lang || 'en';
    
//     // Use the AI message stored in the session
//     const aiMessage = req.session.aiMessage || 'Your AI generated message goes here.';

//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
//         aiMessage: aiMessage, // Pass the AI message to the template
//         lang: lang  // Pass the language preference to the template
//     });
// });

app.get('/userDetails', checkAuth, async (req, res) => {
    const user = req.session.user;
    const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });

    // Fetch AI message from the database
    const patient = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });
    const aiMessage = patient ? patient.aiMessage : 'Your AI generated message goes here.';

    const lang = req.query.lang || 'en';
    
    res.render('userDetails', { 
        user: user, 
        surveyName: surveyData ? surveyData.surveyName : [], 
        csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
        painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
        aiMessage: aiMessage, // Pass the AI message to the template
        lang: lang  // Pass the language preference to the template
    });
});




app.get('/survey-details/:mr_no', checkAuth, async (req, res) => {
    const mr_no = req.params.mr_no;
    const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

    if (patientData) {
        res.render('surveyDetails', { user: patientData });
    } else {
        res.status(404).json({ error: 'Patient not found' });
    }
});

app.get('/edit-details', async (req, res) => {
    const { Mr_no } = req.query;

    try {
        // Fetch the patient data based on MR number
        const patient = await db1.collection('patient_data').findOne({ Mr_no });

        if (patient) {
            // Format the patient's DOB to the desired format (MM/DD/YYYY) for display
            let formattedDisplayDOB = '';
            let formattedInputDOB = '';
            if (patient.DOB) {
                const dob = new Date(patient.DOB);
                const month = (dob.getMonth() + 1).toString().padStart(2, '0'); // Ensure 2-digit month
                const day = dob.getDate().toString().padStart(2, '0'); // Ensure 2-digit day
                formattedDisplayDOB = `${month}/${day}/${dob.getFullYear()}`;
                formattedInputDOB = `${dob.getFullYear()}-${month}-${day}`; // For input field
            }

            // Prepare the patient data to be rendered
            const formattedPatient = {
                mrNo: patient.Mr_no,
                firstName: patient.firstName || '',
                middleName: patient.middleName || '',
                lastName: patient.lastName || '',
                displayDOB: formattedDisplayDOB,
                inputDOB: formattedInputDOB,
                phoneNumber: patient.phoneNumber || '',
                password: patient.password || '' // Note: Should not be displayed in the frontend
            };

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




app.post('/update-data', async (req, res) => {
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, phoneNumber, password, Confirm_Password } = req.body;

        // Check if the password and confirm password match
        if (password && password !== Confirm_Password) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }

        // Prepare the update object
        let updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (middleName) updateData.middleName = middleName;
        if (lastName) updateData.lastName = lastName;
        if (DOB) updateData.DOB = DOB;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (password) updateData.password = password;

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            req.flash('error', 'No updates were made.');
            return res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }

        // Update the patient document
        const updateResult = await db1.collection('patient_data').updateOne(
            { Mr_no },
            { $set: updateData }
        );

        if (updateResult.modifiedCount === 1) {
            req.flash('success', 'Record updated successfully');
        } else {
            req.flash('error', 'No changes were made or record update failed.');
        }

        res.redirect(`/edit-details?Mr_no=${Mr_no}`);
    } catch (error) {
        console.error("Error updating patient record:", error);
        req.flash('error', 'Internal Server Error');
        res.redirect(`/edit-details?Mr_no=${Mr_no}`);
    }
});


// Function to flatten nested objects
function flattenObject(ob, prefix = '') {
    let toReturn = {};

    for (let i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        let newPrefix = prefix ? `${prefix}_${i}` : i;

        if (Array.isArray(ob[i])) {
            toReturn[newPrefix] = JSON.stringify(ob[i]);
        } else if (typeof ob[i] === 'object' && ob[i] !== null) {
            Object.assign(toReturn, flattenObject(ob[i], newPrefix));
        } else {
            toReturn[newPrefix] = ob[i];
        }
    }
    return toReturn;
}

// Update the CSV export route to include the additional exclusion of ObjectId
app.get('/export-survey-csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

        if (!patientData) {
            return res.status(404).send('Patient not found');
        }

        // Include FORM_ID fields
        if (patientData.FORM_ID) {
            for (let formId in patientData.FORM_ID) {
                let form = patientData.FORM_ID[formId];
                patientData[`FORM_ID_${formId}`] = form;
            }
        }

        const flattenedData = flattenObject(patientData);

        // Fields to exclude
        const excludeFields = ['speciality', 'phoneNumber', 'hashedMrNo', 'password', '_id'];

        // Filter out the fields to exclude
        const filteredData = Object.keys(flattenedData)
            .filter(key => !excludeFields.some(exclude => key.includes(exclude)))
            .reduce((obj, key) => {
                obj[key] = flattenedData[key];
                return obj;
            }, {});

        const csvFields = Object.keys(filteredData);
        const csvParser = new Parser({ fields: csvFields });
        const csvData = csvParser.parse(filteredData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`survey_details_${mr_no}.csv`);
        return res.send(csvData);
    } catch (err) {
        console.error('Error generating CSV:', err);
        return res.status(500).send('Internal Server Error');
    }
});


//Open ai prompt route

// app.get('/get-ai-message', async (req, res) => {
//     const mrNo = req.query.mr_no;

//     try {
//         // Define the correct paths for the CSV files using path.join
//         const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mrNo}.csv`);
//         const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${mrNo}.csv`);

//         // Ensure the files exist before proceeding
//         await Promise.all([fs.stat(severityLevelsCsv), fs.stat(patientHealthScoresCsv), fs.stat(apiSurveysCsv)]);

//         // Execute the Python script with correct file paths
//         const { exec } = require('child_process');
//         exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`Error generating AI message: ${error.message}`);
//                 return res.status(500).json({ message: 'Error generating AI message.' });
//             }
//             res.json({ message: stdout.trim() });
//         });

//     } catch (error) {
//         console.error('Error handling AI message request:', error);
//         res.status(500).json({ message: 'Internal server error.' });
//     }
// });


// app.get('/get-ai-message', async (req, res) => {
//     const mrNo = req.query.mr_no;

//     try {
//         // Define the correct paths for the CSV files using path.join
//         const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mrNo}.csv`);
//         const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${mrNo}.csv`);

//         // Ensure the files exist before proceeding
//         await Promise.all([fs.stat(severityLevelsCsv), fs.stat(patientHealthScoresCsv), fs.stat(apiSurveysCsv)]);

//         // Execute the Python script with correct file paths
//         const { exec } = require('child_process');
//         exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`Error generating AI message: ${error.message}`);
//                 return res.status(500).json({ message: 'Error generating AI message.' });
//             }

//             // Store the AI message in the session
//             req.session.aiMessage = stdout.trim();

//             res.json({ message: req.session.aiMessage });
//         });

//     } catch (error) {
//         console.error('Error handling AI message request:', error);
//         res.status(500).json({ message: 'Internal server error.' });
//     }
// });






// app.use((err, req, res, next) => {
//     const timestamp = new Date().toISOString();
//     const { Mr_no } = req.session.user || {};
//     const logData = `Error type: ${err.message}, timestamp: ${timestamp}, Mr_no: ${Mr_no || 'N/A'}`;
//     writeLog('error_logs.txt', logData);

//     console.error('Unhandled error:', err);
//     res.status(500).send('Internal Server Error');
// });
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const { Mr_no } = req.session.user || {};
    const logData = `Error type: ${err.message}, timestamp: ${timestamp}, Mr_no: ${Mr_no || 'N/A'}`;
    writeLog('error_logs.txt', logData);

    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});




    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}


// Export the function to start the server
module.exports = startServer;
