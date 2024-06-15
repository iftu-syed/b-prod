

// Function to check if the datetime is the current date
function isCurrentDate(datetime) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    return datetime.split('T')[0] === currentDate; // Compare with the date part of the datetime
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

app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
app.use('/Doctor_Login_Page/new_folder_1', express.static(path.join(__dirname, 'new_folder_1')));
// const PORT = 3003;

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
    speciality: String
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


// Define Patient schema for Data_Entry_Incoming database
// const patientSchema = new mongoose.Schema({
//     Mr_no: String,
//     Name: String,
//     DOB: String,
//     datetime: String,
//     speciality: String,
//     dateOfSurgery: String,
//     phoneNumber: String,
//     password: String
// });
// const patientSchema = new mongoose.Schema({
//     Mr_no: String,
//     Name: String,
//     DOB: String,
//     datetime: String,
//     speciality: String,
//     dateOfSurgery: String,
//     phoneNumber: String,
//     password: String,
//     Events: [
//         {
//             event: String,
//             date: String
//         }
//     ]
// });

// const patientSchema = new mongoose.Schema({
//     Mr_no: String,
//     Name: String,
//     DOB: String,
//     datetime: String,
//     speciality: String,
//     dateOfSurgery: String,
//     phoneNumber: String,
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
    ]
});




// Define Patient model
const Patient = patientDataDB.model('Patient', patientSchema, 'patient_data');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


// Route to get paginated codes from MongoDB
app.get('/codes', async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    try {
        const codes = await Code.find({})
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





// Routes
app.get('/', (req, res) => {
    res.render('login');
});


app.get('/logout', (req, res) => {
    res.redirect('/');
});



app.get('/execute', async (req, res) => {
    const { Mr_no} = req.query;

    console.log(Mr_no);
    // Validate Mr_no and password
    if (!Mr_no) {
        return res.status(400).send('Missing Mr_no');
    }
    // res.status(200);
    res.set('Connection', 'close').status(200);

    try {
        // Execute Python script with Mr_no and password as arguments
        exec(`python3 python_scripts/script.py ${Mr_no}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect to the login page with Mr_no and password parameters
            // res.redirect(`/login?Mr_no=${Mr_no}&password=${password}`);
            // res.send('Hello');

            // res.status(200).end();
            
        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
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



// app.post('/generateGraph', async (req, res) => {
//     const { Mr_no, surveyType } = req.body;

//     console.log(`Generating graph for Mr_no: ${Mr_no}, Survey Type: ${surveyType}`);

//     if (!Mr_no || !surveyType) {
//         return res.status(400).json({ error: "Mr_no and surveyType are required" });
//     }

//     // Adjust the command based on the survey type
//     let command;
//     if (surveyType === 'PROMIS-10') {
//         command = `python3 script2.py ${Mr_no} PROMIS-10`;
//     } else {
//         command = `python3 script2.py ${Mr_no} ${surveyType}`;
//     }

//     try {
//         const { stdout, stderr } = await exec(command);
//         if (stderr) {
//             console.error(`Error generating graph: ${stderr}`);
//             return res.status(500).json({ error: "Error generating graph" });
//         }
//         console.log(`Graph generation output: ${stdout}`);
//         res.json({ message: 'Graph generated successfully' });
//     } catch (err) {
//         console.error(`Error executing script: ${err.message}`);
//         res.status(500).json({ error: "Error executing script" });
//     }
// });



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Find the doctor based on username and password
        const doctor = await Doctor.findOne({ username, password });
        if (doctor) {
            // Find surveys based on doctor's speciality
            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                // Fetch patients based on doctor and patient's speciality
                const patients = await Patient.find({ speciality: doctor.speciality });
                // Map patients to add the isCurrentDate field
                const patientsWithDateStatus = patients.map(patient => ({
                    ...patient.toObject(),
                    isCurrentDate: isCurrentDate(patient.datetime)
                }));
                res.render('home', { doctor, surveys, patients: patientsWithDateStatus, isCurrentDate });
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





// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             res.render('patient-details', { patient, surveyNames });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// Route to handle patient search and pass codes to EJS template
// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             // Read codes from codes.json file
//             fs.readFile(path.join(__dirname, 'codes.json'), 'utf8', (err, data) => {
//                 if (err) {
//                     console.error('Error reading codes.json:', err);
//                     return res.status(500).send('Error reading codes.json');
//                 }
//                 const codes = JSON.parse(data);
//                 res.render('patient-details', { patient, surveyNames, codes });
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });



// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             // Read codes from codes.json file
//             fs.readFile(path.join(__dirname, 'codes.json'), 'utf8', (err, data) => {
//                 if (err) {
//                     console.error('Error reading codes.json:', err);
//                     return res.status(500).send('Error reading codes.json');
//                 }
//                 const codes = JSON.parse(data);

//                 // Pass DoctorNotes to the template
//                 const doctorNotes = patient.doctorNotes || [];
//                 res.render('patient-details', { patient, surveyNames, codes, doctorNotes });
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             // Sort doctorNotes by date in ascending order
//             patient.doctorNotes.sort((a, b) => new Date(a.date) - new Date(b.date));

//             // Read codes from codes.json file
//             fs.readFile(path.join(__dirname, 'codes.json'), 'utf8', (err, data) => {
//                 if (err) {
//                     console.error('Error reading codes.json:', err);
//                     return res.status(500).send('Error reading codes.json');
//                 }
//                 const codes = JSON.parse(data);
//                 res.render('patient-details', { patient, surveyNames, codes, doctorNotes: patient.doctorNotes });
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

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


//this the old code before the implement of the thumbnail in the
// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             // Sort doctorNotes by date
//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

//             // Read codes from codes.json file
//             fs.readFile(path.join(__dirname, 'codes.json'), 'utf8', (err, data) => {
//                 if (err) {
//                     console.error('Error reading codes.json:', err);
//                     return res.status(500).send('Error reading codes.json');
//                 }
//                 const codes = JSON.parse(data);
//                 res.render('patient-details', { patient, surveyNames, codes, doctorNotes: patient.doctorNotes });
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });




// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query; // Retrieve Mr_no from request query parameters
//     try {
//         // Find patient based on Mr_no from patient_data collection in Data_Entry_Incoming database
//         const patient = await Patient.findOne({ Mr_no: mrNo }); // Use mrNo retrieved from query parameters
//         if (patient) {
//             // Fetch surveyName from the third database based on speciality
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];

//             // Clear the `new_folder` directory
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
//             fs.readdir(newFolderDirectory, (err, files) => {
//                 if (err) throw err;
//                 for (const file of files) {
//                     fs.unlink(path.join(newFolderDirectory, file), err => {
//                         if (err) throw err;
//                     });
//                 }
//             });

//             // Generate graphs for each survey
//             await new Promise((resolve, reject) => {
//                 let pending = surveyNames.length;
//                 if (pending === 0) resolve();
//                 surveyNames.forEach(surveyType => {
//                     const command = `python3 python_scripts/script1.py ${mrNo} "${surveyType}"`;
//                     exec(command, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error generating graph for ${surveyType}: ${error.message}`);
//                         }
//                         if (stderr) {
//                             console.error(`stderr: ${stderr}`);
//                         }
//                         if (--pending === 0) resolve();
//                     });
//                 });
//             });

//             // Sort doctorNotes by date
//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

//             // Read codes from codes.json file
//             fs.readFile(path.join(__dirname, 'codes.json'), 'utf8', (err, data) => {
//                 if (err) {
//                     console.error('Error reading codes.json:', err);
//                     return res.status(500).send('Error reading codes.json');
//                 }
//                 const codes = JSON.parse(data);
//                 res.render('patient-details', { patient, surveyNames, codes, doctorNotes: patient.doctorNotes });
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// app.get('/search', async (req, res) => {
//     const { mrNo } = req.query;
//     try {
//         const patient = await Patient.findOne({ Mr_no: mrNo });
//         if (patient) {
//             const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
//             const surveyNames = surveyData ? surveyData.surveyName : [];
//             const newFolderDirectory = path.join(__dirname, 'new_folder');
//             fs.readdir(newFolderDirectory, (err, files) => {
//                 if (err) throw err;
//                 for (const file of files) {
//                     fs.unlink(path.join(newFolderDirectory, file), err => {
//                         if (err) throw err;
//                     });
//                 }
//             });
//             await new Promise((resolve, reject) => {
//                 let pending = surveyNames.length;
//                 if (pending === 0) resolve();
//                 surveyNames.forEach(surveyType => {
//                     const command = `python3 python_scripts/script1.py ${mrNo} "${surveyType}"`;
//                     exec(command, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error generating graph for ${surveyType}: ${error.message}`);
//                         }
//                         if (stderr) {
//                             console.error(`stderr: ${stderr}`);
//                         }
//                         if (--pending === 0) resolve();
//                     });
//                 });
//             });
//             patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
//             const codes = await Code.find({});
//             res.render('patient-details', { patient, surveyNames, codes, doctorNotes: patient.doctorNotes });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

app.get('/search', async (req, res) => {
    const { mrNo } = req.query;
    try {
        const patient = await Patient.findOne({ Mr_no: mrNo });
        if (patient) {
            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];
            const newFolderDirectory = path.join(__dirname, 'new_folder');
            fs.readdir(newFolderDirectory, (err, files) => {
                if (err) throw err;
                for (const file of files) {
                    fs.unlink(path.join(newFolderDirectory, file), err => {
                        if (err) throw err;
                    });
                }
            });
            await new Promise((resolve, reject) => {
                let pending = surveyNames.length;
                if (pending === 0) resolve();
                surveyNames.forEach(surveyType => {
                    const command = `python3 python_scripts/script1.py ${mrNo} "${surveyType}"`;
                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error generating graph for ${surveyType}: ${error.message}`);
                        }
                        if (stderr) {
                            console.error(`stderr: ${stderr}`);
                        }
                        if (--pending === 0) resolve();
                    });
                });
            });
            patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
            res.render('patient-details', { patient, surveyNames, codes: [], doctorNotes: patient.doctorNotes });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

//adding the note/Events

app.post('/addNote', async (req, res) => {
    const { Mr_no, event, date } = req.body;

    try {
        // Update the patient document by adding the note and date to the notes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Events: { event, date } } }
        );

        res.redirect(`/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).send('Error adding note');
    }
});

// Route to handle adding doctor's notes
app.post('/addDoctorNote', async (req, res) => {
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

// Route to handle adding codes

app.post('/addCode', async (req, res) => {
    const { Mr_no, code, code_date } = req.body;

    try {
        // Update the patient document by adding the code and date to the codes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Codes: { code, date: code_date } } }
        );

        res.redirect(`/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding code:', error);
        res.status(500).send('Error adding code');
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