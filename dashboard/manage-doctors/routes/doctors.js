

const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/manage_doctors';

function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('http://localhost:4000'); // Redirect to port 4000 if session is missing
    }
}

// Apply the checkAuth middleware to all routes
router.use(checkAuth);

// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code

//     try {
//         await client.connect();
//         const db = client.db();
//         const doctors = await db.collection('doctors').find({ hospital_code }).toArray();
//         const staff = await db.collection('staffs').find({ hospital_code }).toArray(); // Fetch staff
//         const surveys = await db.collection('surveys').find().toArray();
//         const combinedData = doctors.map(doctor => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
//             return {
//                 id: doctor._id,
//                 firstName: doctor.firstName, // Add firstName
//                 lastName: doctor.lastName,   // Add lastName
//                 username: doctor.username,   // Add username
//                 speciality: doctor.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });
//         const specialities = await db.collection('surveys').distinct('specialty');
//         res.render('manage-doctors', { doctors: combinedData, staff, specialities, hospital_code }); // Pass staff data too
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

    try {
        await client.connect();
        const db = client.db();
        const doctors = await db.collection('doctors').find({ hospital_code }).toArray();
        const staff = await db.collection('staffs').find({ hospital_code }).toArray(); // Fetch staff

        // Fetch surveys that match the hospital_code
        const surveys = await db.collection('surveys').find({ hospital_code }).toArray();
        
        const combinedData = doctors.map(doctor => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
            return {
                id: doctor._id,
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                username: doctor.username,
                speciality: doctor.speciality,
                surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
            };
        });

        // Fetch distinct specialties based on hospital_code
        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code });
        
        res.render('manage-doctors', { doctors: combinedData, staff, specialities, hospital_code });
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
    const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
    try {
        await client.connect();
        const db = client.db();
        const doctor = await Doctor.findById(req.params.id);
        const specialities = await db.collection('surveys').distinct('specialty');
        res.render('edit-doctor', { doctor, specialities, hospital_code });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await client.close();
    }
});





router.post('/edit/:id', async (req, res) => {
    try {
        const { firstName, lastName, speciality, isLocked, resetPassword } = req.body;
        const hospital_code = req.session.user.hospital_code;

        const existingDoctor = await Doctor.findById(req.params.id);

        let newPassword = existingDoctor.password;

        const updateData = {
            firstName,
            lastName,
            username: existingDoctor.username,
            speciality, 
            hospital_code,
            isLocked: isLocked === 'true',
            passwordChangedByAdmin: false  // Default to false unless reset happens
        };

        if (resetPassword === 'true') {
            const randomNum = Math.floor(Math.random() * 90000) + 10000;  // Random 5-digit number
            newPassword = `${hospital_code}_${firstName.toLowerCase()}@${randomNum}`;
            updateData.password = newPassword;
            updateData.isLocked = false;
            updateData.failedLogins = 0;
            updateData.lastLogin = null;
            updateData.passwordChangedByAdmin = true;  // Mark the password as changed by admin
        }

        await Doctor.findByIdAndUpdate(req.params.id, updateData);

        req.flash('success', 'Doctor updated successfully');

        // Redirect to manage-doctors with username and password in the query string
        res.redirect(`/doctors?username=${existingDoctor.username}&password=${newPassword}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, speciality } = req.body;
        const hospital_code = req.session.user.hospital_code.toUpperCase();
        const username = `${hospital_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        const doctor_id = `${hospital_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

        // Function to generate a random 5-digit number without zeros
        const generateNonZeroRandomNumber = () => {
            let number = '';
            for (let i = 0; i < 5; i++) {
                number += Math.floor(Math.random() * 9) + 1; // Generates a digit between 1 and 9
            }
            return number;
        };

        const randomNum = generateNonZeroRandomNumber();
        const password = `${hospital_code}_${firstName.toLowerCase()}@${randomNum}`;

        const newDoctor = new Doctor({ 
            firstName, 
            lastName, 
            username, 
            doctor_id,
            password,         
            speciality, 
            hospital_code,
            loginCounter: 0,  
            failedLogins: 0,  
            lastLogin: null,  
            isLocked: false   
        });

        await newDoctor.save();
        req.flash('success', 'Doctor added successfully');
        // Pass username, password, and doctor_id as query parameters
        res.redirect(`/doctors?username=${username}&password=${password}&doctor_id=${doctor_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



module.exports = router;
