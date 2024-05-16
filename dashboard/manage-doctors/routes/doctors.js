const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');
const app = express();
const { MongoClient } = require('mongodb');

// GET route to render manage doctors page
// router.get('/', async (req, res) => {
//     try {
//         const doctors = await Doctor.find();
//         res.render('manage-doctors', { doctors });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

const uri = 'mongodb://localhost:27017/manage_doctors';

// router.get('/', async (req, res) => {
//     // Establish MongoDB connection
//     const client = new MongoClient(uri);

//     try {
//         await client.connect();

//         const db = client.db();

//         // Query doctors and surveys collections
//         const doctors = await db.collection('doctors').find().toArray();
//         const surveys = await db.collection('surveys').find().toArray();

//         // Combine doctors and surveys based on matching speciality
//         const combinedData = doctors.map(doctor => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
//             return {
//                 id : doctor._id,
//                 name: doctor.name,
//                 speciality: doctor.speciality,
//                 speciality1 : surveys.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat() // Ensure surveyName is always an array
                
//             };
//         });
//         console.log('Combined Data:', combinedData); // Log combinedData for debugging

//         // Render the EJS template with combined data
//         res.render('manage-doctors', { doctors: combinedData});

        
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         // Close connection
//         await client.close();
//     }
// });

router.get('/', async (req, res) => {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        
        // Fetch doctors and surveys collections
        const doctors = await db.collection('doctors').find().toArray();
        const surveys = await db.collection('surveys').find().toArray();

        // Combine doctors and surveys based on matching speciality
        const combinedData = doctors.map(doctor => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
            return {
                id: doctor._id,
                name: doctor.name,
                speciality: doctor.speciality,
                surveyName: matchedSurveys.map(survey => survey.surveyName).flat() // Ensure surveyName is always an array
            };
        });

        // Fetch distinct specialities from surveys collection
        const specialities = await db.collection('surveys').distinct('specialty');

        // Render the manage-doctors.ejs template with combined data and specialities
        res.render('manage-doctors', { doctors: combinedData, specialities });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        // Close connection
        await client.close();
    }
});



// GET route to render edit form
router.get('/edit/:id', async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const doctor = await Doctor.findById(req.params.id);
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('edit-doctor', { doctor ,specialities});
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// // POST route to update doctor details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { name, speciality, surveyAssign } = req.body;
//         await Doctor.findByIdAndUpdate(req.params.id, { name, speciality, surveyAssign });
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// POST route to update doctor details
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, username, password, speciality, surveyAssign } = req.body;
        await Doctor.findByIdAndUpdate(req.params.id, { name, username, password, speciality, surveyAssign });
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});




// router.post('/delete/:id', async (req, res) => {
//     try {
//         await Doctor.findByIdAndDelete(req.params.id);
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


router.post('delete/:id', async (req, res) => {
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        res.redirect('/doctors'); // Redirect to the manage doctors page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});




// router.post('/delete/:id', async (req, res) => {
//     try {
//         const doctorId = req.params.id;
//         await Doctor.findByIdAndDelete(doctorId);
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// // POST route to add a new doctor
// router.post('/', async (req, res) => {
//     try {
//         const { name, speciality, surveyAssign } = req.body;
//         const newDoctor = new Doctor({ name, speciality, surveyAssign });
//         await newDoctor.save();
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// POST route to add a new doctor
router.post('/', async (req, res) => {
    try {
        const { name, username, password, speciality, surveyAssign } = req.body;
        const newDoctor = new Doctor({ name, username, password, speciality, surveyAssign });
        await newDoctor.save();
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
