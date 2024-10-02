// const express = require('express');
// const router = express.Router();
// const Staff = require('../models/staff');
// const { MongoClient } = require('mongodb');

// const uri = 'mongodb://localhost:27017/manage_doctors';


// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//     const site_code = req.session.user.site_code; // Use session data for site_code

//     try {
//         await client.connect();
//         const db = client.db();

//         // Fetch staff members based on hospital_code and site_code
//         const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray(); // Ensure you use 'staffs' collection
        
//         // Fetch surveys that match the specialties of the staff members
//         const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

//         const combinedData = staff.map(member => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
//             return {
//                 _id: member._id,
//                 firstName: member.firstName,
//                 lastName: member.lastName,
//                 username: member.username,
//                 speciality: member.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });

//         // Fetch distinct specialties based on hospital_code and site_code
//         const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

//         // Render the manage-staff page with the filtered data
//         res.render('manage-staff', { staff: combinedData, specialities, hospital_code, site_code });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });





// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code; // Get site_code from session
//     let client;

//     try {
//         const staffMember = await Staff.findById(req.params.id);
//         const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

//         client = new MongoClient(uri);
//         await client.connect();
//         const db = client.db();
//         const specialities = await db.collection('surveys').distinct('specialty');

//         res.render('edit-staff', { 
//             staffMember: {
//                 ...staffMember.toObject(),
//                 username // Pass the generated username to the view
//             }, 
//             specialities, 
//             hospital_code,
//             site_code // Pass site_code to the view
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         if (client) {
//             await client.close();
//         }
//     }
// });






// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code; // Get site_code from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`; // Generate username using site_code

//         await Staff.findByIdAndUpdate(req.params.id, {
//             firstName,
//             lastName,
//             username, // Update the username
//             password, // Update the password
//             speciality,
//             hospital_code,
//             site_code // Update site_code
//         });

//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// // POST route to delete a staff member
// router.post('/delete/:id', async (req, res) => {
//     try {
//         await Staff.findByIdAndDelete(req.params.id);
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });




// router.post('/', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body; // Remove hospitalName from body since it comes from session
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;
//         const hospitalName = req.session.user.hospitalName; // Pull hospitalName from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         const newStaff = new Staff({ 
//             firstName, 
//             lastName, 
//             username, 
//             password, 
//             speciality, 
//             hospital_code, 
//             site_code,
//             hospitalName // Store hospitalName from session
//         });

//         await newStaff.save();
//         req.flash('success', 'Staff member added successfully');
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// module.exports = router;



//This is the code after the .env file step up

// const express = require('express');
// const router = express.Router();
// const Staff = require('../models/staff');
// const { MongoClient } = require('mongodb');
// require('dotenv').config(); // Load environment variables

// // Use the MongoDB URI from the .env file
// const uri = process.env.MONGO_URI;

// // GET route to fetch staff members
// router.get('/', async (req, res) => {
//     const client = new MongoClient(uri);
//     const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
//     const site_code = req.session.user.site_code; // Use session data for site_code

//     try {
//         await client.connect();
//         const db = client.db();

//         // Fetch staff members based on hospital_code and site_code
//         const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray(); // Ensure you use 'staffs' collection
        
//         // Fetch surveys that match the specialties of the staff members
//         const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

//         const combinedData = staff.map(member => {
//             const matchedSurveys = surveys.filter(survey => survey.specialty === member.speciality);
//             return {
//                 _id: member._id,
//                 firstName: member.firstName,
//                 lastName: member.lastName,
//                 username: member.username,
//                 speciality: member.speciality,
//                 surveyName: matchedSurveys.map(survey => survey.surveyName).flat()
//             };
//         });

//         // Fetch distinct specialties based on hospital_code and site_code
//         const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

//         // Render the manage-staff page with the filtered data
//         res.render('manage-staff', { staff: combinedData, specialities, hospital_code, site_code });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     } finally {
//         await client.close();
//     }
// });

// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code; // Get site_code from session
//     let client;

//     try {
//         const staffMember = await Staff.findById(req.params.id);
//         const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

//         client = new MongoClient(uri);
//         await client.connect();
//         const db = client.db();
//         const specialities = await db.collection('surveys').distinct('specialty');

//         res.render('edit-staff', { 
//             staffMember: {
//                 ...staffMember.toObject(),
//                 username // Pass the generated username to the view
//             }, 
//             specialities, 
//             hospital_code,
//             site_code // Pass site_code to the view
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         if (client) {
//             await client.close();
//         }
//     }
// });

// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code; // Get site_code from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`; // Generate username using site_code

//         await Staff.findByIdAndUpdate(req.params.id, {
//             firstName,
//             lastName,
//             username, // Update the username
//             password, // Update the password
//             speciality,
//             hospital_code,
//             site_code // Update site_code
//         });

//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to delete a staff member
// router.post('/delete/:id', async (req, res) => {
//     try {
//         await Staff.findByIdAndDelete(req.params.id);
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// // POST route to add a new staff member
// router.post('/', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body; // Remove hospitalName from body since it comes from session
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;
//         const hospitalName = req.session.user.hospitalName; // Pull hospitalName from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         const newStaff = new Staff({ 
//             firstName, 
//             lastName, 
//             username, 
//             password, 
//             speciality, 
//             hospital_code, 
//             site_code,
//             hospitalName // Store hospitalName from session
//         });

//         await newStaff.save();
//         req.flash('success', 'Staff member added successfully');
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();  // Load environment variables

// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to encrypt text (password)
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper function to decrypt text (password)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, cipher.final()]);

    return decrypted.toString();
}

// GET route to fetch staff members
router.get('/', async (req, res) => {
    const client = new MongoClient(process.env.MONGO_URI);
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
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code; // Get site_code from session
//     let client;

//     try {
//         const staffMember = await Staff.findById(req.params.id);
//         const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

//         client = new MongoClient(process.env.MONGO_URI);
//         await client.connect();
//         const db = client.db();
//         const specialities = await db.collection('surveys').distinct('specialty');

//         res.render('edit-staff', { 
//             staffMember: {
//                 ...staffMember.toObject(),
//                 username // Pass the generated username to the view
//             }, 
//             specialities, 
//             hospital_code,
//             site_code // Pass site_code to the view
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         if (client) {
//             await client.close();
//         }
//     }
// });

// Fallback to default URI if MONGO_URI is not defined
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manage_doctors'; // Fallback to default MongoDB URI

// Use 'uri' in MongoClient initialization
router.get('/edit/:id', async (req, res) => {
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code; // Get site_code from session
    let client;

    try {
        const staffMember = await Staff.findById(req.params.id);
        const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

        // Use 'uri' here instead of process.env.MONGO_URI
        client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
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

// POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code; // Get site_code from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`; // Generate username using site_code

//         // Encrypt the password before saving
//         const encryptedPassword = encrypt(password);

//         await Staff.findByIdAndUpdate(req.params.id, {
//             firstName,
//             lastName,
//             username, // Update the username
//             password: encryptedPassword, // Save encrypted password
//             speciality,
//             hospital_code,
//             site_code // Update site_code
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

        // Auto-generate the password if not provided
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const newPassword = password || `${site_code}_${firstName.toLowerCase()}@${randomNum}`;

        // Encrypt the password before saving
        const encryptedPassword = encrypt(newPassword);

        await Staff.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            username, // Update the username
            password: encryptedPassword, // Save encrypted password
            speciality,
            hospital_code,
            site_code // Update site_code
        });

        // Redirect with staffUsername and decrypted password for pop-up display
        res.redirect(`/doctors?staffUsername=${username}&staffPassword=${newPassword}`);
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
// router.post('/', async (req, res) => {
//     try {
//         const { firstName, lastName, password, speciality } = req.body; // Remove hospitalName from body since it comes from session
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;
//         const hospitalName = req.session.user.hospitalName; // Pull hospitalName from session

//         const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         // Encrypt the password before saving
//         const encryptedPassword = encrypt(password);

//         const newStaff = new Staff({ 
//             firstName, 
//             lastName, 
//             username, 
//             password: encryptedPassword, // Save encrypted password
//             speciality, 
//             hospital_code, 
//             site_code,
//             hospitalName // Store hospitalName from session
//         });

//         await newStaff.save();
//         req.flash('success', 'Staff member added successfully');
//         res.redirect('/doctors');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


// POST route to add a new staff member
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, password, speciality } = req.body; // Remove hospitalName from body since it comes from session
        const hospital_code = req.session.user.hospital_code;
        const site_code = req.session.user.site_code;
        const hospitalName = req.session.user.hospitalName; // Pull hospitalName from session

        const username = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

        // Auto-generate the password if not provided
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const newPassword = password || `${site_code}_${firstName.toLowerCase()}@${randomNum}`;

        // Encrypt the password before saving
        const encryptedPassword = encrypt(newPassword);

        const newStaff = new Staff({ 
            firstName, 
            lastName, 
            username, 
            password: encryptedPassword, // Save encrypted password
            speciality, 
            hospital_code, 
            site_code,
            hospitalName // Store hospitalName from session
        });

        await newStaff.save();

        // Redirect with staffUsername and decrypted password for pop-up display
        res.redirect(`/doctors?staffUsername=${username}&staffPassword=${newPassword}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
