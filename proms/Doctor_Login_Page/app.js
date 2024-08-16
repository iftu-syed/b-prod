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



const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const app = express();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session');
const MongoStore = require('connect-mongo');




app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
app.use('/Doctor_Login_Page/new_folder_1', express.static(path.join(__dirname, 'new_folder_1')));
app.use('/data', express.static(path.join(__dirname, 'data')));
// const PORT = 3003;  


app.use(session({
    secret: 'your-secret-key', // Change this to a random secret key
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/manage_doctors', // Use a different database for sessions
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
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// MongoDB connection URLs
const doctorsSurveysURL = 'mongodb://localhost:27017/manage_doctors';
const patientDataURL = 'mongodb://localhost:27017/Data_Entry_Incoming';


// Connect to MongoDB for doctors and surveys connection
const doctorsSurveysDB = mongoose.createConnection(doctorsSurveysURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB for patient_data connection
const patientDataDB = mongoose.createConnection(patientDataURL, { useNewUrlParser: true, useUnifiedTopology: true });

// // Define Doctor model for manage_doctors database
// const Doctor = doctorsSurveysDB.model('doctors', {
//     name: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String // Ensure this field is present
// });


const Doctor = doctorsSurveysDB.model('doctors', {
    name: String,
    username: String,
    password: String,
    speciality: String,
    hospital: String,
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
    }
});


// Define Survey model
const Survey = doctorsSurveysDB.model('surveys', {
    surveyName: [String],
    specialty: String
});

// Define Code model for codes
const codeSchema = new mongoose.Schema({
    code: String,
    description: String
});
const Code = doctorsSurveysDB.model('Code', codeSchema);





const patientSchema = new mongoose.Schema({
    Mr_no: String,
    Name: String,
    DOB: String,
    datetime: String,
    speciality: String,
    dateOfSurgery: String,
    phoneNumber: String,
    hospital: String,
    password: String,
    Events: [
        {
            event: String,
            date: String
        }
    ],
    Codes: [
        {
            code: String,
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
    ]
});




// Define Patient model
const Patient = patientDataDB.model('Patient', patientSchema, 'patient_data');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


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

app.get('/codes', async (req, res) => {
    const { page = 1, limit = 50, searchTerm = '' } = req.query;
    try {
        const codes = await Code.find({
            description: new RegExp(searchTerm, 'i')
        })
        .skip((page - 1) * limit)
        .limit(limit);
        res.json(codes);
    } catch (err) {
        console.error('Error fetching codes:', err);
        res.status(500).send('Internal Server Error');
    }
});



const uri3 = 'mongodb://localhost:27017/manage_doctors';
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





// Routes
app.get('/', (req, res) => {
    res.render('login');
});




app.get('/logout', (req, res) => {
    if (req.session.user) {
        const logoutTime = Date.now();
        const loginTime = req.session.loginTime || logoutTime; // Fallback to logout time if loginTime is missing
        const duration = ((logoutTime - loginTime) / 1000).toFixed(2); // Duration in seconds

        const logData = `Doctor ${req.session.user.username} from ${req.session.user.hospital} logged out at ${new Date(logoutTime).toLocaleString()} after ${duration} seconds of activity.`;
        writeLog(logData, 'access.log');
        

        req.session.destroy(); // Destroy the session
    }

    res.redirect('/');
});



// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 const patients = await Patient.find({
//                     hospital: doctor.hospital,
//                     'specialities.name': doctor.speciality
//                 });
//                 const patientsWithDateStatus = patients.map(patient => {
//                     const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
//                     return {
//                         ...patient.toObject(),
//                         specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
//                         specialityMatches: doctor.speciality === patient.speciality
//                     };
//                 });

//                 req.session.user = doctor; // Save user info in session
//                 req.session.loginTime = Date.now(); // Log the login time

//                 // Logging the login event
//                 const logData = `Doctor ${username} from ${doctor.hospital} logged in at ${new Date(req.session.loginTime).toLocaleString()}`;
//                 writeLog(logData, 'access.log');
                

//                 const isCurrentDate = (timestamp) => {
//                     const date = new Date(timestamp);
//                     const today = new Date();
//                     return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
//                 };

//                 const highlightRow = (patient) => {
//                     return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
//                 };

//                 const formatDate = (timestamp) => {
//                     const date = new Date(timestamp);
//                     const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
//                     return date.toLocaleString(undefined, options);
//                 };

//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate, highlightRow, formatDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         const logError = `Error during login for username ${username}: ${error.message}`;
//         writeLog(logError, 'error.log');
//         res.status(500).send('Server Error');
//     }
// });


//flash-message

// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 const patients = await Patient.find({
//                     hospital: doctor.hospital,
//                     'specialities.name': doctor.speciality
//                 });
//                 const patientsWithDateStatus = patients.map(patient => {
//                     const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
//                     return {
//                         ...patient.toObject(),
//                         specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
//                         specialityMatches: doctor.speciality === patient.speciality
//                     };
//                 });

//                 req.session.user = doctor; // Save user info in session
//                 req.session.loginTime = Date.now(); // Log the login time

//                 // Logging the login event
//                 const logData = `Doctor ${username} from ${doctor.hospital} logged in at ${new Date(req.session.loginTime).toLocaleString()}`;
//                 writeLog(logData, 'access.log');

//                 const isCurrentDate = (timestamp) => {
//                     const date = new Date(timestamp);
//                     const today = new Date();
//                     return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
//                 };

//                 const highlightRow = (patient) => {
//                     return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
//                 };

//                 const formatDate = (timestamp) => {
//                     const date = new Date(timestamp);
//                     const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
//                     return date.toLocaleString(undefined, options);
//                 };

//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate, highlightRow, formatDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             req.flash('error_msg', 'Invalid username or password');
//             res.redirect('/');
//         }
//     } catch (error) {
//         console.error(error);
//         const logError = `Error during login for username ${username}: ${error.message}`;
//         writeLog(logError, 'error.log');
//         res.status(500).send('Server Error');
//     }
// });

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const doctor = await Doctor.findOne({ username });

        if (!doctor) {
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect('/');
        }

        if (doctor.isLocked) {
            req.flash('error_msg', 'Your account is locked due to multiple failed login attempts. Please, contact admin.');
            return res.redirect('/');
        }

        if (doctor.password === password) {
            // Successful login
            doctor.failedLogins = 0; // Reset failed logins
            doctor.loginCounter += 1; // Increment login counter
            doctor.lastLogin = new Date(); // Update last login timestamp
            await doctor.save();

            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                const patients = await Patient.find({
                    hospital: doctor.hospital,
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
                const logData = `Doctor ${username} from ${doctor.hospital} logged in at ${new Date(req.session.loginTime).toLocaleString()}`;
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

                res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate, highlightRow, formatDate });
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
            res.redirect('/');
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
//                 reject(error);
//             }
//             if (stderr) {
//                 console.error(`stderr: ${stderr}`);
//             }
//             resolve();
//         });
//     });
// };

// Function to execute Python script for graph generation
const generateGraphs = (mr_no, survey_type) => {
    return new Promise((resolve, reject) => {
        const command = `python3 python_scripts/script-d3.py ${mr_no} "${survey_type}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error generating graph for ${survey_type}: ${error.message}`);
                // Log the error
                const logError = `Error generating graph for ${survey_type} for Mr_no: ${mr_no} - Error: ${error.message}`;
                writeLog(logError, 'error.log');
                reject(error);  // Reject the promise with the error
            } else {
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                console.log(`API_script.py output: ${stdout}`);
                resolve();  // Resolve the promise if no errors
            }
        });
    });
};




// Ensure this middleware is defined for session authentication
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

// Define the /home route with authentication
app.get('/home', checkAuth, async (req, res) => {
    try {
        const doctor = req.session.user; // Retrieve doctor from session
        const surveys = await Survey.findOne({ specialty: doctor.speciality });
        if (surveys) {
            const patients = await Patient.find({
                hospital: doctor.hospital,
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





app.get('/search', checkAuth, async (req, res) => {
    const { mrNo, username, speciality, name } = req.query;
    try {
        const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session
        const patient = await Patient.findOne({ Mr_no: mrNo });
        
        if (patient) {
            // Check if the patient's hospital matches the logged-in doctor's hospital
            const hospitalMatches = patient.hospital === loggedInDoctor.hospital;

            if (!hospitalMatches) {
                res.send('You cannot access this patient\'s details');
                return;
            }

            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];
            const newFolderDirectory = path.join(__dirname, 'new_folder');
            
            // Clear the directory before generating new graphs
            await clearDirectory(newFolderDirectory);

            // Execute API_script.py
            const apiScriptCommand = `python3 python_scripts/API_script.py ${mrNo}`;
            exec(apiScriptCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing API_script.py: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                console.log(`API_script.py output: ${stdout}`);

                // Generate graphs for all survey types in parallel
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

                    // Execute patientprompt.py to get the AI message
                    const patientPromptCommand = `python3 python_scripts/patientprompt.py "${csvPath}" "${path.join(__dirname, 'public', 'SeverityLevels.csv')}" "${path.join(__dirname, 'data', `API_SURVEYS_${mrNo}.csv`)}"`;
                    exec(patientPromptCommand, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error executing patientprompt.py: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`stderr: ${stderr}`);
                        }
                        const aiMessage = stdout.trim();

                        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital} accessed patient record for Mr_no: ${mrNo} at ${new Date().toLocaleString()}`;
                        writeLog(logData, 'access.log');

                        res.render('patient-details', {
                            patient,
                            surveyNames,
                            codes: patient.Codes,
                            interventions: patient.Events,
                            doctorNotes: patient.doctorNotes,
                            doctor: { username, speciality, name }, // Pass doctor object to the template
                            csvPath: csvExists ? `/data/${csvFileName}` : null, // Pass the relative CSV path if it exists
                            csvApiSurveysPath, // Pass the new CSV path
                            aiMessage // Pass the AI-generated message to the template
                        });
                    });

                }).catch(error => {
                    console.error('Error in /search route:', error);
                    res.status(500).send('Server Error');
                });
            });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error('Error in /search route:', error);
        res.status(500).send('Server Error');
    }
});




app.post('/addNote', checkAuth, async (req, res) => {
    const { Mr_no, event, date } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the event to the Events array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Events: { event, date } } }  // Ensure that the event and date are properly stored
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital} added an event for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Event: ${event}`;
        writeLog(logData, 'interaction.log');
        
        // Respond with the updated event data
        res.status(200).json({ event, date });
    } catch (error) {
        console.error('Error adding event:', error);
        // Log the error
        const logError = `Error adding event for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
        writeLog(logError, 'error.log');
        res.status(500).send('Error adding event');
    }
});




app.post('/addDoctorNote', checkAuth, async (req, res) => {
    const { Mr_no, doctorNote } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the doctor's note to the doctorNotes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { doctorNotes: { note: doctorNote, date: new Date().toISOString().split('T')[0] } } }
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital} added a note for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Note: ${doctorNote}`;
        writeLog(logData, 'interaction.log');
        

        res.redirect(`/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding doctor\'s note:', error);
        res.status(500).send('Error adding doctor\'s note');
    }
});





app.post('/addCode', checkAuth, async (req, res) => {
    const { Mr_no, code, code_date } = req.body;  // Ensure `code_date` is correctly captured
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the code and date to the codes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Codes: { code, date: code_date } } }  // Ensure `date` is stored
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital} added ICD code ${code} for patient Mr_no: ${Mr_no} on ${code_date}`;
        writeLog(logData, 'interaction.log');
        
        // Send only the ICD code number back in the response
        res.status(200).json({ code: code, date: code_date });
    } catch (error) {
        console.error('Error adding code:', error);

        // Log the error
        const logError = `Error adding ICD code for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
        writeLog(logError, 'error.log');

        res.status(500).send('Error adding code');
    }
});



app.get('/chart', async (req, res) => {
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


// Add this route to serve the survey details page
app.get('/survey-details/:mr_no', checkAuth, async (req, res) => {
    const mr_no = req.params.mr_no;
    const patientData = await patientDataDB.collection('patient_data').findOne({ Mr_no: mr_no });

    if (patientData) {
        res.render('surveyDetails', { user: patientData });
    } else {
        res.status(404).json({ error: 'Patient not found' });
    }
});

// Add this route to serve the patient details page
app.get('/patient-details/:mr_no', checkAuth, async (req, res) => {
    const mr_no = req.params.mr_no;
    try {
        const patient = await patientDataDB.collection('patient_data').findOne({ Mr_no: mr_no });
        if (patient) {
            // Fetch surveys related to the patient's speciality
            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];
            patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

            res.render('patient-details', {
                patient,
                surveyNames,
                codes: patient.Codes,
                interventions: patient.Events,
                doctorNotes: patient.doctorNotes,
                doctor: req.session.user // Pass the doctor object from session to the template
            });
        } else {
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient details:', error);
        res.status(500).send('Internal Server Error');
    }
});

// // Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Doctor Login Server is running on http://localhost:${PORT}`);
//     });
// }


// module.exports = startServer;