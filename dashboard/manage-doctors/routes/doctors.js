

const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/manage_doctors';

// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital = req.session.user.hospital; // Use session data for hospital

//     try {
//         await client.connect();
//         const db = client.db();
//         const doctors = await db.collection('doctors').find({ hospital }).toArray();
//         const staff = await db.collection('staffs').find({ hospital }).toArray(); // Fetch staff
//         const surveys = await db.collection('surveys').find().toArray();
//         const combinedData = doctors.map(doctor => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
//             return {
//                 id: doctor._id,
//                 name: doctor.name,
//                 speciality: doctor.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('manage-doctors', { doctors: combinedData, staff, specialities, hospital }); // Pass staff data too
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });

router.get('/', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital = req.session.user.hospital; // Use session data for hospital

    try {
        await client.connect();
        const db = client.db();
        const doctors = await db.collection('doctors').find({ hospital }).toArray();
        const staff = await db.collection('staffs').find({ hospital }).toArray(); // Fetch staff
        const surveys = await db.collection('surveys').find().toArray();
        const combinedData = doctors.map(doctor => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
            return {
                id: doctor._id,
                firstName: doctor.firstName, // Add firstName
                lastName: doctor.lastName,   // Add lastName
                username: doctor.username,   // Add username
                speciality: doctor.speciality,
                surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
            };
        });
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('manage-doctors', { doctors: combinedData, staff, specialities, hospital }); // Pass staff data too
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});



// GET route to render edit form
router.get('/edit/:id', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital = req.session.user.hospital; // Use session data for hospital
    try {
        await client.connect();
        const db = client.db();
        const doctor = await Doctor.findById(req.params.id);
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('edit-doctor', { doctor, specialities, hospital });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await client.close();
    }
});

// // POST route to update doctor details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { name, username, password, speciality } = req.body;
//         const hospital = req.session.user.hospital; // Use session data for hospital
//         await Doctor.findByIdAndUpdate(req.params.id, { name, username, password, speciality, hospital });
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to update doctor details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital = req.session.user.hospital;
//         const username = `${hospital}_${firstName.charAt(0)}_${lastName}`.toLowerCase(); // Generate username
//         await Doctor.findByIdAndUpdate(req.params.id, { firstName, lastName, username, password, speciality, hospital });
//         req.flash('success', 'Doctor updated successfully');
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });



// POST route to update doctor details
router.post('/edit/:id', async (req, res) => {
    try {
        const { firstName, lastName, password, speciality } = req.body;
        const hospital = req.session.user.hospital;

        // Generate username based on hospital name, first initial of firstName, and lastName
        const username = `${hospital}_${firstName.charAt(0)}${lastName}`.toLowerCase();

        // Update the doctor document in the database
        await Doctor.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            username, 
            password, // Update the password
            speciality, 
            hospital
        });

        // Flash a success message
        req.flash('success', 'Doctor updated successfully');

        // Redirect back to the doctors list page
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



// POST route to delete a doctor
router.post('/delete/:id', async (req, res) => {
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// // POST route to add a new doctor
// router.post('/', async (req, res) => {
//     try {
//         const { name, username, password, speciality } = req.body;
//         const hospital = req.session.user.hospital; // Use session data for hospital
//         const newDoctor = new Doctor({ name, username, password, speciality, hospital });
//         await newDoctor.save();
//         req.flash('success', 'Record updated successfully');
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// POST route to add a new doctor
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, password, speciality } = req.body;
        const hospital = req.session.user.hospital;
        const username = `${hospital}_${firstName.charAt(0)}${lastName}`.toLowerCase(); // Generate username
        const newDoctor = new Doctor({ firstName, lastName, username, password, speciality, hospital });
        await newDoctor.save();
        req.flash('success', 'Doctor added successfully');
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
