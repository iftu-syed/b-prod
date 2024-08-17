const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/manage_doctors';



router.get('/', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code

    try {
        await client.connect();
        const db = client.db();
        const staff = await db.collection('staffs').find({ hospital_code }).toArray(); // Ensure you use 'staffs' collection
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
        res.render('manage-staff', { staff: combinedData, specialities, hospital_code });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});


// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//     try {
//         await client.connect();
//         const db = client.db();
//         const staffMember = await Staff.findById(req.params.id);
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('edit-staff', { staffMember, specialities, hospital_code });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         await client.close();
//     }
// });


// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code

//     try {
//         // Fetch the staff member's details using Mongoose
//         const staffMember = await Staff.findById(req.params.id);

//         // If firstName and lastName are available, generate the username
//         const username = `${hospital_code}_${staffMember.firstName.charAt(0)}_${staffMember.lastName}`.toLowerCase();

//         // Connect to MongoDB to fetch specialities
//         const client = new MongoClient(uri);
//         await client.connect();
//         const db = client.db();
//         const specialities = await db.collection('surveys').distinct('specialty');

//         // Render the edit-staff page with the staffMember details, specialities, and auto-generated username
//         res.render('edit-staff', { 
//             staffMember: {
//                 ...staffMember.toObject(), // Convert Mongoose document to plain object
//                 username // Override or set the auto-generated username
//             }, 
//             specialities, 
//             hospital_code 
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         await client.close(); // Close the MongoDB connection after the operation is complete
//     }
// });
// GET route to render edit form
router.get('/edit/:id', async (req, res) => {
    const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
    let client;  // Declare client at the top

    try {
        // Fetch the staff member's details using Mongoose
        const staffMember = await Staff.findById(req.params.id);

        // If firstName and lastName are available, generate the username
        const username = `${hospital_code}_${staffMember.firstName.charAt(0)}_${staffMember.lastName}`.toLowerCase();

        // Initialize and connect to MongoDB client
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();
        const specialities = await db.collection('surveys').distinct('specialty');

        // Render the edit-staff page with the staffMember details, specialities, and auto-generated username
        res.render('edit-staff', { 
            staffMember: {
                ...staffMember.toObject(), // Convert Mongoose document to plain object
                username // Override or set the auto-generated username
            }, 
            specialities, 
            hospital_code 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        // Close the MongoDB connection after the operation is complete, only if client is initialized
        if (client) {
            await client.close();
        }
    }
});


// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { name, username, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//         await Staff.findByIdAndUpdate(req.params.id, { name, username, password, speciality, hospital_code });
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// POST route to update staff details
router.post('/edit/:id', async (req, res) => {
    try {
        const { firstName, lastName, password, speciality } = req.body;
        const hospital_code = req.session.user.hospital_code;
        const username = `${hospital_code}_${firstName.charAt(0)}${lastName}`.toLowerCase(); // Generate username

        await Staff.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            username, // Update the username
            password, // Update the password
            speciality,
            hospital_code
        });
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

// // POST route to add a new staff member
// router.post('/', async (req, res) => {
//     try {
//         const { name, username, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//         const newStaff = new Staff({ name, username, password, speciality, hospital_code });
//         await newStaff.save();
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// POST route to add a new staff member
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, password, speciality } = req.body;
        const hospital_code = req.session.user.hospital_code;
        const username = `${hospital_code}_${firstName.charAt(0)}${lastName}`.toLowerCase(); // Generate username
        const newStaff = new Staff({ firstName, lastName, username, password, speciality, hospital_code });
        await newStaff.save();
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



module.exports = router;
