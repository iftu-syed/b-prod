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
//         // Find the doctor based on username and password
//         const doctor = await Doctor.findOne({ username, password });
//         if (doctor) {
//             // Find surveys based on doctor's speciality
//             const surveys = await Survey.findOne({ specialty: doctor.speciality });
//             if (surveys) {
//                 // Fetch patients based on doctor and patient's speciality
//                 const patients = await Patient.find({ speciality: doctor.speciality });
//                 // Map patients to add the isCurrentDate field
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


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const doctor = await Doctor.findOne({ username, password });
        if (doctor) {
            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                const patients = await Patient.find({ speciality: doctor.speciality });
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
//             res.render('patient-details', { patient, surveyNames, codes: [], doctorNotes: patient.doctorNotes });
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

//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 username: req.query.username, // Pass username to the template
//                 speciality: req.query.speciality // Pass speciality to the template
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
//     const { mrNo, username, speciality } = req.query;
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
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality } // Pass doctor object to the template
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
//     const { mrNo, username, speciality } = req.query;
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
//             res.render('patient-details', {
//                 patient,
//                 surveyNames,
//                 codes: patient.Codes,
//                 interventions: patient.Events,
//                 doctorNotes: patient.doctorNotes,
//                 doctor: { username, speciality } // Pass doctor object to the template
//             });
//         } else {
//             res.send('Patient not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

// Function to execute Python script for graph generation
const generateGraphs = (mr_no, survey_type) => {
    return new Promise((resolve, reject) => {
        const command = `python3 python_scripts/script1.py ${mr_no} "${survey_type}"`;
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



app.get('/search', async (req, res) => {
    const { mrNo, username, speciality, name } = req.query;
    try {
        const patient = await Patient.findOne({ Mr_no: mrNo });
        if (patient) {
            const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];
            const newFolderDirectory = path.join(__dirname, 'new_folder');
            
            // Clear the directory before generating new graphs
            await clearDirectory(newFolderDirectory);

            // Generate graphs for all survey types in parallel
            const graphPromises = surveyNames.map(surveyType => {
                console.log(`Generating graph for Mr_no: ${mrNo}, Survey: ${surveyType}`);
                return generateGraphs(mrNo, surveyType);
            });

            await Promise.all(graphPromises);

            patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
            res.render('patient-details', {
                patient,
                surveyNames,
                codes: patient.Codes,
                interventions: patient.Events,
                doctorNotes: patient.doctorNotes,
                doctor: { username, speciality, name } // Pass doctor object to the template
            });
        } else {
            res.send('Patient not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});





app.post('/addNote', async (req, res) => {
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




app.post('/addCode', async (req, res) => {
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







// // Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Doctor Login Server is running on http://localhost:${PORT}`);
//     });
// }


// module.exports = startServer;