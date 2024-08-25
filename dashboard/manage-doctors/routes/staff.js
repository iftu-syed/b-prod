const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/manage_doctors';



// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code

//     try {
//         await client.connect();
//         const db = client.db();
//         const staff = await db.collection('staffs').find({ hospital_code }).toArray(); // Ensure you use 'staffs' collection
//         const surveys = await db.collection('surveys').find().toArray();
//         const combinedData = staff.map(member => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
//             return {
//                 _id: member._id,
//                 name: member.name,
//                 username: member.username, // Ensure this field is fetched
//                 speciality: member.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('manage-staff', { staff: combinedData, specialities, hospital_code });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });

router.get('/', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
    const site_code = req.session.user.site_code; // Use session data for site_code

    try {
        await client.connect();
        const db = client.db();

        // Fetch staff members based on hospital_code and site_code
        const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray(); // Ensure you use 'staffs' collection
        
        // Fetch surveys that match the specialties of the staff members
        const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

        const combinedData = staff.map(member => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
            return {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                username: member.username,
                speciality: member.speciality,
                surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
            };
        });

        // Fetch distinct specialties based on hospital_code and site_code
        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        // Render the manage-staff page with the filtered data
        res.render('manage-staff', { staff: combinedData, specialities, hospital_code, site_code });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});




// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//     let client;  // Declare client at the top

//     try {
//         // Fetch the staff member's details using Mongoose
//         const staffMember = await Staff.findById(req.params.id);

//         // If firstName and lastName are available, generate the username
//         const username = `${hospital_code}_${staffMember.firstName.charAt(0)}_${staffMember.lastName}`.toLowerCase();

//         // Initialize and connect to MongoDB client
//         client = new MongoClient(uri);
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
//         // Close the MongoDB connection after the operation is complete, only if client is initialized
//         if (client) {
//             await client.close();
//         }
//     }
// });

// GET route to render edit form
router.get('/edit/:id', async (req, res) => {
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code; // Get site_code from session
    let client;

    try {
        const staffMember = await Staff.findById(req.params.id);
        const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();
        const specialities = await db.collection('surveys').distinct('specialty');

        res.render('edit-staff', { 
            staffMember: {
                ...staffMember.toObject(),
                username // Pass the generated username to the view
            }, 
            specialities, 
            hospital_code,
            site_code // Pass site_code to the view
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});




// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const username = `${hospital_code}_${firstName.charAt(0)}${lastName}`.toLowerCase(); // Generate username

//         await Staff.findByIdAndUpdate(req.params.id, {
//             firstName,
//             lastName,
//             username, // Update the username
//             password, // Update the password
//             speciality,
//             hospital_code
//         });
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
        const site_code = req.session.user.site_code; // Get site_code from session

        const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`; // Generate username using site_code

        await Staff.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            username, // Update the username
            password, // Update the password
            speciality,
            hospital_code,
            site_code // Update site_code
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
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const username = `${hospital_code}_${firstName.charAt(0)}${lastName}`.toLowerCase(); // Generate username
//         const newStaff = new Staff({ firstName, lastName, username, password, speciality, hospital_code });
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
        const site_code = req.session.user.site_code; // Get site_code from session

        const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`; // Generate username using site_code
        const newStaff = new Staff({ 
            firstName, 
            lastName, 
            username, 
            password, 
            speciality, 
            hospital_code, 
            site_code // Store site_code in the database
        });
        
        await newStaff.save();
        res.redirect('/doctors');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
