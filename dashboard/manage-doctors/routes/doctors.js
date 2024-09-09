

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
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code;

//     // Validate presence of hospital_code and site_code
//     if (!hospital_code || !site_code) {
//         req.flash('error', 'Invalid session data. Please log in again.');
//         return res.redirect('/'); // Redirect to login if validation fails
//     }

//     try {
//         await client.connect();
//         const db = client.db();

//         // Fetch doctors based on hospital_code and site_code
//         const doctors = await db.collection('doctors').find({ hospital_code, site_code }).toArray();

//         // Fetch staff based on hospital_code and site_code
//         const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray();

//         // Fetch surveys based on hospital_code and site_code
//         const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

//         const combinedData = doctors.map(doctor => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
//             return {
//                 id: doctor._id,
//                 firstName: doctor.firstName,
//                 lastName: doctor.lastName,
//                 username: doctor.username,
//                 speciality: doctor.speciality,
//                 surveyName: matchedSurveys.map(survey => {
//                     const apiSurveys = Array.isArray(survey.API) ? survey.API.map(api => api.name).join('<br>') : '';
//                     const customSurveys = Array.isArray(survey.custom) ? survey.custom.join('<br>') : '';
//                     return `${customSurveys}<br>${apiSurveys}`;  // Just return the names, no labels
//                 }).flat(),
//             };
//         });
        
        

//         // Fetch distinct specialties based on hospital_code and site_code
//         const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

//         // Render the page with the filtered data
//         res.render('manage-doctors', { doctors: combinedData, staff, specialities, hospital_code, site_code });
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         req.flash('error', 'An error occurred while fetching the data. Please try again.');
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });


// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code;

//     // Validate presence of hospital_code and site_code
//     if (!hospital_code || !site_code) {
//         req.flash('error', 'Invalid session data. Please log in again.');
//         return res.redirect('/'); // Redirect to login if validation fails
//     }

//     try {
//         await client.connect();
//         const db = client.db();

//         // Fetch doctors based on hospital_code and site_code
//         const doctors = await db.collection('doctors').find({ hospital_code, site_code }).toArray();

//         // Fetch staff based on hospital_code and site_code
//         const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray();

//         // Fetch surveys based on hospital_code and site_code
//         const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

//         const combinedData = doctors.map(doctor => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
//             return {
//                 id: doctor._id,
//                 firstName: doctor.firstName,
//                 lastName: doctor.lastName,
//                 username: doctor.username,
//                 speciality: doctor.speciality,
//                 surveyName: matchedSurveys.map(survey => {
//                     const apiSurveys = Array.isArray(survey.API) ? survey.API.map(api => api.name).join('<br>') : '';
//                     const customSurveys = Array.isArray(survey.custom) ? survey.custom.join('<br>') : '';
//                     return `${customSurveys}<br>${apiSurveys}`;  // Just return the names, no labels
//                 }).flat(),
//             };
//         });

//         // Fetch distinct specialties based on hospital_code and site_code
//         const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

//         // Pass firstName, lastName, hospitalName, and site_code from the session to the view
//         const { firstName, lastName, hospitalName } = req.session.user;

//         // Render the page with the filtered data and session variables
//         res.render('manage-doctors', { 
//             doctors: combinedData, 
//             staff, 
//             specialities, 
//             hospital_code, 
//             site_code, 
//             firstName, 
//             lastName, 
//             hospitalName 
//         });
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         req.flash('error', 'An error occurred while fetching the data. Please try again.');
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });

router.get('/', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code;  // Extract site_code from session

    // Validate presence of hospital_code and site_code
    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect('/'); // Redirect to login if validation fails
    }

    try {
        await client.connect();
        const db = client.db();

        // Fetch doctors based on hospital_code and site_code
        const doctors = await db.collection('doctors').find({ hospital_code, site_code }).toArray();

        // Fetch staff based on hospital_code and site_code
        const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray();

        // Fetch surveys based on hospital_code and site_code
        const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

        const combinedData = doctors.map(doctor => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
            return {
                id: doctor._id,
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                username: doctor.username,
                speciality: doctor.speciality,
                surveyName: matchedSurveys.map(survey => {
                    const apiSurveys = Array.isArray(survey.API) ? survey.API.map(api => api.name).join('<br>') : '';
                    const customSurveys = Array.isArray(survey.custom) ? survey.custom.join('<br>') : '';
                    return `${customSurveys}<br>${apiSurveys}`;  // Just return the names, no labels
                }).flat(),
            };
        });

        // Fetch distinct specialties based on hospital_code and site_code
        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        // Pass firstName, lastName, hospitalName, and site_code from the session to the view
        const { firstName, lastName, hospitalName } = req.session.user;

        // Render the page with the filtered data and session variables
        res.render('manage-doctors', { 
            doctors: combinedData, 
            staff, 
            specialities, 
            hospital_code, 
            site_code,  // Pass site_code to the EJS view
            firstName, 
            lastName, 
            hospitalName 
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        req.flash('error', 'An error occurred while fetching the data. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});





// GET route to render edit form
router.get('/edit/:id', async (req, res) => {
    const client = new MongoClient(uri);
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code;

    // Validate presence of hospital_code and site_code
    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect('/'); // Redirect to login if validation fails
    }

    try {
        await client.connect();
        const db = client.db();

        // Fetch the doctor to be edited
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            req.flash('error', 'Doctor not found.');
            return res.redirect('/doctors');
        }
        
        // Fetch specialties based on both hospital_code and site_code
        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });
        
        // Render the edit form with the doctor data and specialties
        res.render('edit-doctor', { doctor, specialities, hospital_code, site_code });
    } catch (err) {
        console.error('Error fetching doctor or specialties:', err);
        req.flash('error', 'An error occurred while fetching the doctor or specialties. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});




router.post('/edit/:id', async (req, res) => {
    try {
        const { firstName, lastName, speciality, isLocked, resetPassword } = req.body;
        const hospital_code = req.session.user.hospital_code;
        const site_code = req.session.user.site_code; // Get site_code from session

        const existingDoctor = await Doctor.findById(req.params.id);
        let newPassword = existingDoctor.password;

        // Prepare the update data
        const updateData = {
            firstName,
            lastName,
            username: existingDoctor.username,  // Keep existing username
            speciality, 
            hospital_code,  // Include hospital_code in the update
            site_code,      // Include site_code in the update
            isLocked: isLocked === 'true',
            passwordChangedByAdmin: false
        };

        // If reset password is requested
        if (resetPassword === 'true') {
            const randomNum = Math.floor(Math.random() * 90000) + 10000; // Generate a 5-digit random number
            newPassword = `${site_code}_${firstName.toLowerCase()}@${randomNum}`; // Use site_code for new password
            updateData.password = newPassword;
            updateData.isLocked = false;
            updateData.failedLogins = 0;
            updateData.lastLogin = null;
            updateData.passwordChangedByAdmin = true;  // Mark password as changed by admin
        }

        // Update the doctor's information
        await Doctor.findByIdAndUpdate(req.params.id, updateData);

        req.flash('success', 'Doctor updated successfully');
        // Redirect back to the doctors page with the updated username and new password
        res.redirect(`/doctors?username=${existingDoctor.username}&password=${newPassword}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, speciality } = req.body;
        const hospital_code = req.session.user.hospital_code.toUpperCase(); // Get hospital_code from session
        const site_code = req.session.user.site_code; // Get site_code from session

        // Generate username and doctor_id using site_code instead of hospital_code
        const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        const doctor_id = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

        const generateNonZeroRandomNumber = () => {
            let number = '';
            for (let i = 0; i < 5; i++) {
                number += Math.floor(Math.random() * 9) + 1;
            }
            return number;
        };

        const randomNum = generateNonZeroRandomNumber();
        const password = `${site_code}_${firstName.toLowerCase()}@${randomNum}`;

        const newDoctor = new Doctor({ 
            firstName, 
            lastName, 
            username, 
            doctor_id,
            password,         
            speciality, 
            hospital_code,  // Store hospital_code
            site_code,       // Store site_code and use it to create the username
            loginCounter: 0,  
            failedLogins: 0,  
            lastLogin: null,  
            isLocked: false   
        });

        await newDoctor.save();
        req.flash('success', 'Doctor added successfully');
        res.redirect(`/doctors?username=${username}&password=${password}&doctor_id=${doctor_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



module.exports = router;
