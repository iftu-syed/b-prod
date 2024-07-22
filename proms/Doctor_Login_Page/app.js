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


// MongoDB connection URLs
const doctorsSurveysURL = 'mongodb://localhost:27017/manage_doctors';
const patientDataURL = 'mongodb://localhost:27017/Data_Entry_Incoming';


// Connect to MongoDB for doctors and surveys connection
const doctorsSurveysDB = mongoose.createConnection(doctorsSurveysURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB for patient_data connection
const patientDataDB = mongoose.createConnection(patientDataURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Doctor model for manage_doctors database
const Doctor = doctorsSurveysDB.model('doctors', {
    name: String,
    username: String,
    password: String,
    speciality: String,
    hospital: String // Ensure this field is present
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



// const patientSchema = new mongoose.Schema({
//     Mr_no: String,
//     Name: String,
//     DOB: String,
//     datetime: String,
//     speciality: String,
//     dateOfSurgery: String,
//     phoneNumber: String,
//     hospital: String,
//     password: String,
//     Events: [
//         {
//             event: String,
//             date: String
//         }
//     ],
//     Codes: [
//         {
//             code: String,
//             date: String
//         }
//     ],
//     doctorNotes: [
//         {
//             note: String,
//             date: String
//         }
//     ]
// });



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


// // Route to get paginated codes from MongoDB
// app.get('/codes', async (req, res) => {
//     const { page = 1, limit = 50 } = req.query;
//     try {
//         const codes = await Code.find({})
//             .skip((page - 1) * limit)
//             .limit(limit);
//         res.json(codes);
//     } catch (err) {
//         console.error('Error fetching codes:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });




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


// app.get('/codes.json', (req, res) => {
//     res.sendFile(path.join(__dirname, 'codes.json'));
// });

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


// app.get('/logout', (req, res) => {
//     res.redirect('/');
// });

app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy the session
    res.redirect('/');
});



app.post('/generateGraph', async (req, res) => {
    const { Mr_no, surveyType } = req.body;

    console.log(`Generating graph for Mr_no: ${Mr_no}, Survey Type: ${surveyType}`);
    // Validate Mr_no and surveyType
    if (!Mr_no || !surveyType) {
        return res.status(400).send('Missing Mr_no or surveyType');
    }

    try {
        // Execute Python script with Mr_no and surveyType as arguments
        exec(`python3 python_scripts/script2.py ${Mr_no} ${surveyType}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect back to patient details page
            res.redirect(`/search?mrNo=${Mr_no}`);

        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});






// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 const patients = await Patient.find({ speciality: doctor.speciality });
//                 const patientsWithDateStatus = patients.map(patient => ({
//                     ...patient.toObject(),
//                     isCurrentDate: isCurrentDate(patient.datetime)
//                 }));
//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 const patients = await Patient.find({ speciality: doctor.speciality });
//                 const patientsWithDateStatus = patients.map(patient => ({
//                     ...patient.toObject(),
//                     isCurrentDate: isCurrentDate(patient.datetime)
//                 }));
//                 req.session.user = doctor; // Save user info in session
//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });





// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 // Filter patients by both speciality and hospital
//                 const patients = await Patient.find({ speciality: doctor.speciality, hospital: doctor.hospital });
//                 const patientsWithDateStatus = patients.map(patient => ({
//                     ...patient.toObject(),
//                     isCurrentDate: isCurrentDate(patient.datetime)
//                 }));
//                 req.session.user = doctor; // Save user info in session
//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });
//new code for specialty mapping
// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 // Fetch patients related to the logged-in doctor's hospital and specialties
//                 const patients = await Patient.find({
//                     hospital: doctor.hospital,
//                     'specialities.name': doctor.speciality
//                 });
//                 const patientsWithDateStatus = patients.map(patient => ({
//                     ...patient.toObject(),
//                     isCurrentDate: isCurrentDate(patient.datetime)
//                 }));
//                 req.session.user = doctor; // Save user info in session
//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 // Fetch patients related to the logged-in doctor's hospital and specialties
//                 const patients = await Patient.find({
//                     hospital: doctor.hospital,
//                     'specialities.name': doctor.speciality
//                 });
//                 const patientsWithDateStatus = patients.map(patient => ({
//                     ...patient.toObject(),
//                     isCurrentDate: isCurrentDate(patient.datetime),
//                     specialityMatches: doctor.speciality === patient.speciality
//                 }));
//                 req.session.user = doctor; // Save user info in session
//                 res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
//             } else {
//                 res.send('No surveys found for this speciality');
//             }
//         } else {
//             res.send('Invalid username or password');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

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
//         res.status(500).send('Server Error');
//     }
// });

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const doctor = await Doctor.findOne({ username, password });
        if (doctor) {
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
            res.send('Invalid username or password');
        }
    } catch (error) {
        console.error(error);
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
const generateGraphs = (mr_no, survey_type) => {
    return new Promise((resolve, reject) => {
        const command = `python3 python_scripts/script-d3.py ${mr_no} "${survey_type}"`;
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



// app.get('/search', async (req, res) => {
//     const { mrNo, username, speciality, name } = req.query;
//     try {
//         const patient = await Patient.findOne({ Mr_no: mrNo });
//         if (patient) {
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
            
//             // Clear the directory before generating new graphs
//             await clearDirectory(newFolderDirectory);

//             // Generate graphs for all survey types in parallel
//             const graphPromises = surveyNames.map(surveyType => {
//                 console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
//                 return generateGraphs(mrNo, surveyType);
//             });

//             await Promise.all(graphPromises);

//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality, name } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });





// app.post('/addNote', async (req, res) => {
//     const { Mr_no, event, date } = req.body;

//     try {
//         // Update the patient document by adding the note and date to the notes array
//         await Patient.updateOne(
//             { Mr_no },
//             { $push: { Events: { event, date } } }
//         );

//         // Send the new event data back in the response
//         res.status(200).json({ event, date });
//     } catch (error) {
//         console.error('Error adding note:', error);
//         res.status(500).send('Error adding note');
//     }
// });


// // Route to handle adding doctor's notes
// app.post('/addDoctorNote', async (req, res) => {
//     const { Mr_no, doctorNote } = req.body;

//     try {
//         // Update the patient document by adding the doctor's note to the doctorNotes array
//         await Patient.updateOne(
//             { Mr_no },
//             { $push: { doctorNotes: { note: doctorNote, date: new Date().toISOString().split('T')[0] } } }
//         );

//         res.redirect(`/search?mrNo=${Mr_no}`);
//     } catch (error) {
//         console.error('Error adding doctor\'s note:', error);
//         res.status(500).send('Error adding doctor\'s note');
//     }
// });




// app.post('/addCode', async (req, res) => {
//     const { Mr_no, code, code_date } = req.body;

//     try {
//         // Update the patient document by adding the code and date to the codes array
//         await Patient.updateOne(
//             { Mr_no },
//             { $push: { Codes: { code, date: code_date } } }
//         );

//         // Send only the ICD code number back in the response
//         res.status(200).json({ code: code, date: code_date });
//     } catch (error) {
//         console.error('Error adding code:', error);
//         res.status(500).send('Error adding code');
//     }
// });



// app.get('/home', checkAuth, (req, res) => {
//     // Render the home page
// });

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


// app.get('/search', checkAuth, async (req, res) => {
//     const { mrNo, username, speciality, name } = req.query;
//     try {
//         const patient = await Patient.findOne({ Mr_no: mrNo });
//         if (patient) {
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
            
//             // Clear the directory before generating new graphs
//             await clearDirectory(newFolderDirectory);

//             // Generate graphs for all survey types in parallel
//             const graphPromises = surveyNames.map(surveyType => {
//                 console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
//                 return generateGraphs(mrNo, surveyType);
//             });

//             await Promise.all(graphPromises);

//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality, name } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.get('/search', checkAuth, async (req, res) => {
//     const { mrNo, username, speciality, name } = req.query;
//     try {
//         const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session
//         const patient = await Patient.findOne({ Mr_no: mrNo });
        
//         if (patient) {
//             // Check if the patient's hospital and speciality match the logged-in doctor's details
//             if (patient.hospital !== loggedInDoctor.hospital || patient.speciality !== loggedInDoctor.speciality) {
//                 res.send('You cannot access this patient\'s details');
//                 return;
//             }

//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
            
//             // Clear the directory before generating new graphs
//             await clearDirectory(newFolderDirectory);

//             // Generate graphs for all survey types in parallel
//             const graphPromises = surveyNames.map(surveyType => {
//                 console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
//                 return generateGraphs(mrNo, surveyType);
//             });

//             await Promise.all(graphPromises);

//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality, name } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.get('/search', checkAuth, async (req, res) => {
//     const { mrNo, username, speciality, name } = req.query;
//     try {
//         const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session
//         const patient = await Patient.findOne({ Mr_no: mrNo });
        
//         if (patient) {
//             // Check if the patient's hospital or any of the specialties match the logged-in doctor's details
//             const hospitalMatches = patient.hospital === loggedInDoctor.hospital;
//             const specialityMatches = patient.specialities.some(spec => spec.name === loggedInDoctor.speciality);

//             if (!hospitalMatches && !specialityMatches) {
//                 res.send('You cannot access this patient\'s details');
//                 return;
//             }

//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
            
//             // Clear the directory before generating new graphs
//             await clearDirectory(newFolderDirectory);

//             // Generate graphs for all survey types in parallel
//             const graphPromises = surveyNames.map(surveyType => {
//                 console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
//                 return generateGraphs(mrNo, surveyType);
//             });

//             await Promise.all(graphPromises);

//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality, name } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.get('/search', checkAuth, async (req, res) => {
//     const { mrNo, username, speciality, name } = req.query;
//     try {
//         const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session
//         const patient = await Patient.findOne({ Mr_no: mrNo });
        
//         if (patient) {
//             // Check if the patient's hospital matches the logged-in doctor's hospital
//             const hospitalMatches = patient.hospital === loggedInDoctor.hospital;

//             if (!hospitalMatches) {
//                 res.send('You cannot access this patient\'s details');
//                 return;
//             }

//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
            
//             // Clear the directory before generating new graphs
//             await clearDirectory(newFolderDirectory);

//             // Generate graphs for all survey types in parallel
//             const graphPromises = surveyNames.map(surveyType => {
//                 console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
//                 return generateGraphs(mrNo, surveyType);
//             });

//             await Promise.all(graphPromises);

//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality, name } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

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

            // Generate graphs for all survey types in parallel
            const graphPromises = surveyNames.map(surveyType => {
                console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
                return generateGraphs(mrNo, surveyType).catch(error => {
                    console.error(`Error generating graph for ${surveyType}:`, error);
                    return null; // Return null in case of error to continue other graph generations
                });
            });

            await Promise.all(graphPromises);

            patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Check if the CSV file exists
            const csvPath = path.join(__dirname, 'data', `patient_health_scores_${patient.Mr_no}.csv`);
            const csvExists = fs.existsSync(csvPath);

            res.render('patient-details', {
                patient,
                surveyNames,
                codes: patient.Codes,
                interventions: patient.Events,
                doctorNotes: patient.doctorNotes,
                doctor: { username, speciality, name }, // Pass doctor object to the template
                csvExists // Pass the flag indicating whether the CSV file exists
            });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error('Error in /search route:', error);
        res.status(500).send('Server Error');
    }
});

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
            req.flash('error', 'Please, Register before you login to generate the password!');
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
            // Execute the Python script to generate the CSV file
            await generateCSV(user1.Mr_no);

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




app.post('/generateGraph', checkAuth, async (req, res) => {
    const { Mr_no, surveyType } = req.body;

    console.log(`Generating graph for Mr_no: ${Mr_no}, Survey Type: ${surveyType}`);
    // Validate Mr_no and surveyType
    if (!Mr_no || !surveyType) {
        return res.status(400).send('Missing Mr_no or surveyType');
    }

    try {
        // Execute Python script with Mr_no and surveyType as arguments
        exec(`python3 python_scripts/script2.py ${Mr_no} ${surveyType}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect back to patient details page
            res.redirect(`/search?mrNo=${Mr_no}`);

        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addNote', checkAuth, async (req, res) => {
    const { Mr_no, event, date } = req.body;

    try {
        // Update the patient document by adding the note and date to the notes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Events: { event, date } } }
        );

        // Send the new event data back in the response
        res.status(200).json({ event, date });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).send('Error adding note');
    }
});

// Route to handle adding doctor's notes
app.post('/addDoctorNote', checkAuth, async (req, res) => {
    const { Mr_no, doctorNote } = req.body;

    try {
        // Update the patient document by adding the doctor's note to the doctorNotes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { doctorNotes: { note: doctorNote, date: new Date().toISOString().split('T')[0] } } }
        );

        res.redirect(`/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding doctor\'s note:', error);
        res.status(500).send('Error adding doctor\'s note');
    }
});

app.post('/addCode', checkAuth, async (req, res) => {
    const { Mr_no, code, code_date } = req.body;

    try {
        // Update the patient document by adding the code and date to the codes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Codes: { code, date: code_date } } }
        );

        // Send only the ICD code number back in the response
        res.status(200).json({ code: code, date: code_date });
    } catch (error) {
        console.error('Error adding code:', error);
        res.status(500).send('Error adding code');
    }
});



// app.get('/chart', async (req, res) => {
//     const { type, mr_no } = req.query;
//     const csvPath = `data/patient_health_scores_${mr_no}.csv`;
//     res.render('chart1', { csvPath});
// });

// app.get('/chart', async (req, res) => {
//     const { mr_no } = req.query;
//     const csvPath = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);
//     if (fs.existsSync(csvPath)) {
//         res.render('chart1', { csvPath });
//     } else {
//         res.status(404).send('CSV file not found');
//     }
// });
// app.get('/chart', async (req, res) => {
//     const { mr_no } = req.query;
//     const csvPath = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);
//     console.log(`CSV Path: ${csvPath}`);  // Log the CSV path
//     if (fs.existsSync(csvPath)) {
//         res.render('chart1', { csvPath });
//         console.log("File sent");
//     } else {
//         res.status(404).send('CSV file not found');
//     }
// });

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