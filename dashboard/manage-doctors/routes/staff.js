const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/manage_doctors';

// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital = req.session.user.hospital; // Use session data for hospital

//     try {
//         await client.connect();
//         const db = client.db();
//         const staff = await db.collection('staffs').find({ hospital }).toArray(); // Ensure you use 'staffs' collection
//         const surveys = await db.collection('surveys').find().toArray();
//         const combinedData = staff.map(member => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
//             return {
//                 id: member._id,
//                 name: member.name,
//                 speciality: member.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('manage-staff', { staff: combinedData, specialities, hospital });
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
        const staff = await db.collection('staffs').find({ hospital }).toArray(); // Ensure you use 'staffs' collection
        const surveys = await db.collection('surveys').find().toArray();
        const combinedData = staff.map(member => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
            return {
                _id: member._id,
                name: member.name,
                username: member.username, // Ensure this field is fetched
                speciality: member.speciality,
                surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
            };
        });
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('manage-staff', { staff: combinedData, specialities, hospital });
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
        const staffMember = await Staff.findById(req.params.id);
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('edit-staff', { staffMember, specialities, hospital });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await client.close();
    }
});

// POST route to update staff details
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, username, password, speciality } = req.body;
        const hospital = req.session.user.hospital; // Use session data for hospital
        await Staff.findByIdAndUpdate(req.params.id, { name, username, password, speciality, hospital });
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST route to delete a staff member
router.post('/delete/:id', async (req, res) => {
    try {
        await Staff.findByIdAndDelete(req.params.id);
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST route to add a new staff member
router.post('/', async (req, res) => {
    try {
        const { name, username, password, speciality } = req.body;
        const hospital = req.session.user.hospital; // Use session data for hospital
        const newStaff = new Staff({ name, username, password, speciality, hospital });
        await newStaff.save();
        res.redirect('/staff');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
