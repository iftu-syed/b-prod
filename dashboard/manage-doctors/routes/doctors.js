



// const express = require('express');
// const router = express.Router();
// const Doctor = require('../models/doctor');
// const { MongoClient } = require('mongodb');

// const uri = 'mongodb://localhost:27017/manage_doctors';

// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital = req.query.hospital;

//     try {
//         await client.connect();
//         const db = client.db();
//         const doctors = await db.collection('doctors').find({ hospital }).toArray();
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
//         res.render('manage-doctors', { doctors: combinedData, specialities, hospital });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });

// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital = req.query.hospital;
//     try {
//         await client.connect();
//         const db = client.db();
//         const doctor = await Doctor.findById(req.params.id);
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('edit-doctor', { doctor, specialities, hospital });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to update doctor details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { name, username, password, speciality, hospital } = req.body;
//         await Doctor.findByIdAndUpdate(req.params.id, { name, username, password, speciality, hospital });
//         res.redirect(`/doctors?hospital=${hospital}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to delete a doctor
// router.post('/delete/:id', async (req, res) => {
//     const hospital = req.query.hospital;
//     try {
//         await Doctor.findByIdAndDelete(req.params.id);
//         res.redirect(`/doctors?hospital=${hospital}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to add a new doctor
// router.post('/', async (req, res) => {
//     try {
//         const { name, username, password, speciality, hospital } = req.body;
//         const newDoctor = new Doctor({ name, username, password, speciality, hospital });
//         await newDoctor.save();
//         res.redirect(`/doctors?hospital=${hospital}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// module.exports = router;



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
//         res.render('manage-doctors', { doctors: combinedData, specialities, hospital });
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
                name: doctor.name,
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

// POST route to update doctor details
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, username, password, speciality } = req.body;
        const hospital = req.session.user.hospital; // Use session data for hospital
        await Doctor.findByIdAndUpdate(req.params.id, { name, username, password, speciality, hospital });
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

// POST route to add a new doctor
router.post('/', async (req, res) => {
    try {
        const { name, username, password, speciality } = req.body;
        const hospital = req.session.user.hospital; // Use session data for hospital
        const newDoctor = new Doctor({ name, username, password, speciality, hospital });
        await newDoctor.save();
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
