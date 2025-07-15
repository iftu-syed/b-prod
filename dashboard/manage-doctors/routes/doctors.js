const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');
const User = require('../models/user'); // Import the User model for adminUser database
const Staff = require('../models/staff'); // Import the Staff model
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();  // Load environment variables
const fs = require('fs');
const path = require('path');
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

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

// const MONGO_URI   = process.env.MONGO_URI;           // your primary app DB URI
// const LOGS_DB     = 'hospital_admin_logs';           // name of your logs database
// let accessColl, auditColl, errorColl;

// // immediately-invoked async function to set up the three collections
// (async function initHospitalAdminLogs() {
//   const client = new MongoClient(MONGO_URI, {
//     useNewUrlParser:    true,
//     useUnifiedTopology: true,
//   });
//   await client.connect();

//   const logsDb = client.db(LOGS_DB);
//   accessColl = logsDb.collection('access_logs');
//   auditColl  = logsDb.collection('audit_logs');
//   errorColl  = logsDb.collection('error_logs');
//   console.log('🔐 Connected to hospital_admin_logs (access, audit, error)');
// })();

// // helper to write into the logs
// async function writeDbLog(type, data) {
//   const entry = { ...data, timestamp: new Date().toISOString() };
//   switch (type) {
//     case 'access': return accessColl.insertOne(entry);
//     case 'audit':  return auditColl.insertOne(entry);
//     case 'error':  return errorColl.insertOne(entry);
//     default:
//       throw new Error(`Unknown log type: ${type}`);
//   }
// }

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 2) Map each type to its own file
const logFiles = {
  access: path.join(logsDir, 'access.log'),
  audit:  path.join(logsDir, 'audit.log'),
  error:  path.join(logsDir, 'error.log'),
};

function writeDbLog(type, data) {
  const timestamp = new Date().toISOString();
  const entry     = { ...data, timestamp };
  const filePath  = logFiles[type];

  if (!filePath) {
    return Promise.reject(new Error(`Unknown log type: ${type}`));
  }

  // Append a JSON line to the appropriate log file
  const line = JSON.stringify(entry) + '\n';
  return fs.promises.appendFile(filePath, line);
}

// Use the MongoDB URI from the .env file
const uri = process.env.MONGO_URI  // Fallback to default MongoDB URI



// Middleware to check authentication
function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('https://app.wehealthify.org/hospitaladmin'); // Redirect to port 4000 if session is missing
    }
}

// Apply the checkAuth middleware to all routes
router.use(checkAuth);

// Dynamic base path to be used in routes
const basePath = '/manageproviders/doctors'; // Adjust this according to the basePath you are using


router.get('/', async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;
    try {
    await writeDbLog('access', {
      action:        'view_manage_doctors_staffs',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (logErr) {
    console.error('Failed to write access log:', logErr);
  }
    const adminCredentials = req.session.adminCredentials;

    let staffCredentials = null;
    if (req.session.staffCredentials) {
        staffCredentials = req.session.staffCredentials;
        delete req.session.staffCredentials; // Clear staffCredentials after use
    }
    
    const staffUsername = staffCredentials?.username || null; // Extract staffUsername from staffCredentials
    const staffPassword = staffCredentials?.password || null; // Extract staffPassword from staffCredentials
    delete req.session.adminCredentials; // Clear adminCredentials after use
    // delete req.session.staffCredentials; // Clear staffCredentials after use

    let client;

    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect(basePath);
    }

    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();

        const doctors = await db.collection('doctors').find({ hospital_code, site_code }).toArray();
        const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray();
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
                    const apiSurveys = Array.isArray(survey.API) ? survey.API.map(api => api.name) : [];
                    const customSurveys = Array.isArray(survey.custom) ? survey.custom : [];
                    return [...customSurveys, ...apiSurveys];
                }).flat(),
            };
        });

        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        const { firstName, lastName, hospitalName } = req.session.user;

        res.render('manage-doctors', {
            doctors: combinedData,
            staff,
            specialities,
            hospital_code,
            site_code,
            firstName,
            lastName,
            hospitalName,
            adminCredentials,
            staffCredentials, // Pass staffCredentials here
            staffUsername, // Explicitly pass staffUsername to the template
            staffPassword, // Explicitly pass staffPassword to the template
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        req.flash('error', 'An error occurred while fetching the data. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});


// Test route to check if we can access the users collection in adminUser database
router.get('/test-users-connection', async (req, res) => {
    try {
        // Fetch all users to verify the connection
        const users = await User.find({});
        console.log('Users:', users);  // Log output to confirm data retrieval
        res.json(users);  // Return users as JSON response
    } catch (error) {
        console.error('Error accessing users collection:', error);
        res.status(500).json({ message: 'Failed to access users collection' });
    }
});

// // GET route to render edit form
// router.get('/edit/:id', async (req, res) => {
//     let client;  // Define client outside of try block
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code;

//     // Validate presence of hospital_code and site_code
//     if (!hospital_code || !site_code) {
//         req.flash('error', 'Invalid session data. Please log in again.');
//         return res.redirect(basePath);
//     }

//     try {
//         client = new MongoClient(uri);  // Initialize client here
//         await client.connect();
//         const db = client.db();

//         // Fetch the doctor to be edited
//         const doctor = await Doctor.findById(req.params.id);

//         if (!doctor) {
//             req.flash('error', 'Doctor not found.');
//             return res.redirect(`${basePath}`);
//         }

//         const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

//         const { firstName, lastName } = req.session.user
//         res.render('edit-doctor', { doctor, specialities, hospital_code, site_code, firstName, lastName });
//     } catch (err) {
//         console.error('Error fetching doctor or specialties:', err);
//         req.flash('error', 'An error occurred while fetching the doctor or specialties. Please try again.');
//         res.status(500).send('Internal Server Error');
//     } finally {
//         if (client) {
//             await client.close();  // Ensure client.close() is always called
//         }
//     }
// });

router.get('/edit/:id', async (req, res) => {
    let client;  // Define client outside of try block
      const username      = req.session.user.username;
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code;
    const hospitalName = req.session.user.hospitalName;
    const ip            = req.ip;
    const doctorId      = req.params.id;
      await writeDbLog('access', {
    action:        'view_edit_doctor',
    username,
    hospital_code,
    site_code,
    doctorId,
    ip
  });

    // Validate presence of hospital_code and site_code
    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect(basePath);
    }

    try {
        client = new MongoClient(uri);  // Initialize client here
        await client.connect();
        const db = client.db();

        // Fetch the doctor to be edited
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            req.flash('error', 'Doctor not found.');
            return res.redirect(`${basePath}`);
        }

        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        const { firstName, lastName } = req.session.user
        res.render('edit-doctor', { doctor, specialities, hospitalName, hospital_code, site_code, firstName, lastName });
    } catch (err) {
        console.error('Error fetching doctor or specialties:', err);
            await writeDbLog('error', {
      action:        'view_edit_doctor_error',
      username,
      hospital_code,
      site_code,
      doctorId,
      error:          err.message,
      stack:          err.stack,
      ip
    });
        req.flash('error', 'An error occurred while fetching the doctor or specialties. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            await client.close();  // Ensure client.close() is always called
        }
    }
});


router.post('/edit/:id', async (req, res) => {
      const username      = req.session.user.username;
  const hospital_code = req.session.user.hospital_code;
  const site_code     = req.session.user.site_code;
  const ip            = req.ip;
  const doctorId      = req.params.id;
        await writeDbLog('audit', {
      action:        'update_doctor_start',
      username,
      hospital_code,
      site_code,
      doctorId,
      ip
    });

    try {

        const firstName = req.body.firstName.trim();
        const lastName = req.body.lastName.trim();
        const speciality = req.body.speciality;
        const isLocked = req.body.isLocked;
        const resetPassword = req.body.resetPassword;

        const existingDoctor = await Doctor.findById(req.params.id);
        let newPassword = existingDoctor.password;

        // Clean up names to create consistent username format
        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let newUsername  = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        // Check for duplicate usernames
        let isDuplicate = await Doctor.exists({ username: username, _id: { $ne: req.params.id } }) ||
                          await Staff.exists({ username: username }) ||
                          await User.exists({ username: username });

        // Handle duplicate usernames by adding a suffix
        if (isDuplicate) {
            let suffix = 2;
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Doctor.exists({ username: newUsername, _id: { $ne: req.params.id } }) ||
                             await Staff.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername;
                    break;
                }
                suffix++;
            }
        }

        // Create the update data object
        const updateData = {
            firstName,
            lastName,
            username,
            doctor_id: username, // Update doctor_id to match username
            speciality,
            hospital_code,
            site_code,
            isLocked: isLocked === 'true',
            passwordChangedByAdmin: false
        };

        // Handle password reset if requested
        if (resetPassword === 'true') {
            const randomNum = Math.floor(Math.random() * 90000) + 10000;
            newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;
            const encryptedPassword = encrypt(newPassword);
            updateData.password = encryptedPassword;
            updateData.isLocked = false;
            updateData.failedLogins = 0;
            updateData.lastLogin = null;
            updateData.passwordChangedByAdmin = true;
        }

        // Update the doctor record
        await Doctor.findByIdAndUpdate(req.params.id, updateData);
            await writeDbLog('audit', {
      action:        'update_doctor_success',
      username,
      hospital_code,
      site_code,
      doctorId,
      newUsername,
      ip
    });

        req.flash('success', 'Doctor updated successfully');

        // Store credentials in session for display
        req.session.adminCredentials = {
            username: username,
            ...(resetPassword === 'true' && { password: newPassword })
        };

        res.redirect(basePath);
    } catch (err) {
        console.error(err);
            await writeDbLog('error', {
      action:        'update_doctor_error',
      username,
      hospital_code,
      site_code,
      doctorId,
      error:          err.message,
      stack:          err.stack,
      ip
    });
        req.flash('error', 'An error occurred while updating the doctor');
        res.status(500).send('Server Error');
    }
});



router.post('/', async (req, res) => {
      const ip = req.ip;
  const {
    firstName: rawFirst,
    lastName: rawLast,
    speciality
  } = req.body;
  const hospital_code = req.session.user.hospital_code.toUpperCase();
  const site_code     = req.session.user.site_code;
  const creator       = req.session.user.username;
    await writeDbLog('audit', {
    action:        'add_doctor_attempt',
    createdBy:     creator,
    hospital_code,
    site_code,
    firstName:     rawFirst,
    lastName:      rawLast,
    speciality,
    ip
  });
    let client;
    try {
        const firstName = req.body.firstName.trim();
        const lastName = req.body.lastName.trim();
        const speciality = req.body.speciality;
        const hospitalName = req.session.user.hospitalName;

        // Generate username based on the updated format
        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        // Check across doctors, staff, and users collections for existing usernames
        let isDuplicate = await Doctor.exists({ username: username }) ||
                          await Staff.exists({ username: username }) ||
                          await User.exists({ username: username });

        if (isDuplicate) {
            let suffix = 2; // Start numbering from 2 if duplicate exists
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Doctor.exists({ username: newUsername }) ||
                             await Staff.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername; // Found a unique username
                    break;
                }
                suffix++;
            }
        }

        const doctor_id = username;
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const password = `${site_code}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;

        // Encrypt the password using AES-256
        const encryptedPassword = encrypt(password);
        const encryptedDoctorUsername = encrypt(username);

        const newDoctor = new Doctor({
            firstName,
            lastName,
            username,
            doctor_id,
            password: encryptedPassword,
            speciality,
            hashedusername: encryptedDoctorUsername,
            hospital_code,
            site_code,
            hospitalName,
            loginCounter: 0,
            failedLogins: 0,
            lastLogin: null,
            isLocked: false,
            createdAt: new Date(),
            createdBy: req.session.user.username,
        });

        await newDoctor.save();
            await writeDbLog('audit', {
      action:        'add_doctor_success',
      createdBy:     creator,
      hospital_code,
      site_code,
      doctorUsername: username,
      ip
    });
        req.session.adminCredentials = { username, password };
        res.redirect(`${basePath}`);
    } catch (err) {
        console.error(err);
            await writeDbLog('error', {
      action:        'add_doctor_error',
      createdBy:     creator,
      hospital_code,
      site_code,
      error:         err.message,
      stack:         err.stack,
      ip
    });
        res.status(500).send('Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});

module.exports = router;
