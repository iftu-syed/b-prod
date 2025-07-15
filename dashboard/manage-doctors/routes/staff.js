const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const { MongoClient } = require('mongodb');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();  // Load environment variables

// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
const IV_LENGTH = 16; // AES block size for CBC mode


// Helper function to encrypt text (password)
function encrypt(text) {
    try {
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted; // Return IV and encrypted text
    } catch (err) {
        console.error("Encryption Error:", err.message);
        throw new Error("Encryption failed.");
    }
}

// Helper function to decrypt text (password)
function decrypt(text) {
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex'); // Extract IV
        let encryptedText = Buffer.from(textParts.join(':'), 'hex'); // Extract encrypted text

        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted; // Return decrypted text
    } catch (err) {
        console.error("Decryption Error:", err.message);
        throw new Error("Decryption failed.");
    }
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
// Middleware to check authentication
function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('https://app.wehealthify.org/hospitaladmin'); // Redirect to login if session is missing
    }
}

// Apply the checkAuth middleware globally
router.use(checkAuth);


// Define base path
const basePath = '/manageproviders/staff'; // Adjust this according to the new basePath
const basePath1 = '/manageproviders/doctors'
// GET route to fetch staff members
router.get('/', async (req, res) => {
    const client = new MongoClient(process.env.MONGO_URI);
    const hospital_code = req.session.user.hospital_code; // Use session data for hospital_code
    const site_code = req.session.user.site_code; // Use session data for site_code

    // Extract credentials from session (if available)
const staffUsername = req.session.staffUsername || null;
const staffPassword = req.session.staffPassword || null;

// Define staffCredentials if username and password are present
const staffCredentials = staffUsername && staffPassword ? { username: staffUsername, password: staffPassword } : null;

// Clear session credentials after use to avoid persistent messages
req.session.staffUsername = null;
req.session.staffPassword = null;


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

// Fallback to default URI if MONGO_URI is not defined
const uri = process.env.MONGO_URI // Fallback to default MongoDB URI

// Use 'uri' in MongoClient initialization
// router.get('/edit/:id', async (req, res) => {
//     const hospital_code = req.session.user.hospital_code;
//     const site_code = req.session.user.site_code; // Get site_code from session
//     let client;

//     try {
//         const staffMember = await Staff.findById(req.params.id);
//         const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

//         // Use 'uri' here instead of process.env.MONGO_URI
//         client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//         await client.connect();
//         const db = client.db();
//         const specialities = await db.collection('surveys').distinct('specialty');

//         const { firstName, lastName } = req.session.user
//         res.render('edit-staff', { 
//             staffMember: {
//                 ...staffMember.toObject(),
//                 username // Pass the generated username to the view
//             }, 
//             specialities, 
//             hospital_code,
//             site_code,
//             firstName, 
//             lastName // Pass site_code to the view
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


router.get('/edit/:id', async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
     const ip = req.ip;
    const hospitalName = req.session.user.hospitalName;
    if (!hospital_code || !site_code ) {
        return res.redirect(basePath); // Redirect to basePath if any session variable is missing
    }
    let client;
    await writeDbLog('access', {
      action:        'view_staff_edit_form',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      ip
    });
    try {

        const staffMember = await Staff.findById(req.params.id);
        const username = `${site_code.toLowerCase()}_${staffMember.firstName.charAt(0).toLowerCase()}${staffMember.lastName.toLowerCase()}`; // Generate username using site_code

        // Use 'uri' here instead of process.env.MONGO_URI
        client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const db = client.db();
        const specialities = await db.collection('surveys').distinct('specialty');

        const { firstName, lastName } = req.session.user
        res.render('edit-staff', { 
            staffMember: {
                ...staffMember.toObject(),
                username // Pass the generated username to the view
            }, 
            specialities, 
            hospital_code,
            hospitalName,
            site_code,
            firstName, 
            lastName // Pass site_code to the view
        });
    } catch (err) {
        console.error(err);
            await writeDbLog('error', {
      action:        'view_staff_edit_form_error',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
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

// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, speciality, isLocked, resetPassword } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;

//         const existingStaff = await Staff.findById(req.params.id);
//         let newPassword = existingStaff.password; // Default to the existing password
//         let decryptedPassword = decrypt(existingStaff.password); // Decrypt password for redirection

//         // Generate a base username
//         let baseUsername = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
//         let username = baseUsername;

//         // Check for existing usernames across staff, doctors, and users
//         const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` }, _id: { $ne: req.params.id } });
//         const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//         const existingUsers = await User.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//         if (existingStaffs.length > 0 || existingDoctors.length > 0 || existingUsers.length > 0) {
//             // Append numeric suffix to make the username unique
//             let maxSuffix = 0;
//             [...existingStaffs, ...existingDoctors, ...existingUsers].forEach(record => {
//                 const suffixMatch = record.username.match(/(\d{2})$/);
//                 if (suffixMatch) {
//                     const suffixNum = parseInt(suffixMatch[1], 10);
//                     if (suffixNum > maxSuffix) {
//                         maxSuffix = suffixNum;
//                     }
//                 }
//             });
//             username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         }

//         const updateData = {
//             firstName,
//             lastName,
//             username,
//             speciality,
//             hospital_code,
//             site_code,
//             isLocked: isLocked === 'true',
//             passwordChangedByAdmin: false,
//         };

//         if (resetPassword === 'true') {
//             const randomNum = Math.floor(Math.random() * 90000) + 10000; // Generate new password
//             newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}${randomNum}`;
//             const encryptedPassword = encrypt(newPassword);
//             updateData.password = encryptedPassword;
//             updateData.isLocked = false;
//             updateData.failedLogins = 0;
//             updateData.lastLogin = null;
//             updateData.passwordChangedByAdmin = true;
//         }

//         await Staff.findByIdAndUpdate(req.params.id, updateData);

//         const redirectPassword = resetPassword === 'true' ? newPassword : decryptedPassword;
//         // res.redirect(`${basePath}?username=${username}&password=${redirectPassword}`);
//                 res.redirect(`${basePath1}?staffUsername=${username}&staffPassword=${decryptedPassword}`);
//     } catch (err) {
//         console.error('Error updating staff:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// // POST route to update staff details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         const { firstName, lastName, speciality, isLocked, resetPassword } = req.body;
//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;

//         const existingStaff = await Staff.findById(req.params.id);
//         if (!existingStaff) {
//             req.flash('error', 'Staff member not found.');
//             return res.redirect(`${basePath}/staff`);
//         }

//         let newPassword = existingStaff.password; // Default to the existing password
//         let decryptedPassword = decrypt(existingStaff.password); // Decrypt password for redirection

//         // Generate a base username
//         let baseUsername = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
//         let username = baseUsername;

//         // Check for existing usernames across staff, doctors, and users
//         const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` }, _id: { $ne: req.params.id } });
//         const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//         const existingUsers = await User.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//         if (existingStaffs.length > 0 || existingDoctors.length > 0 || existingUsers.length > 0) {
//             // Append numeric suffix to make the username unique
//             let maxSuffix = 0;
//             [...existingStaffs, ...existingDoctors, ...existingUsers].forEach(record => {
//                 const suffixMatch = record.username.match(/(\d{2})$/);
//                 if (suffixMatch) {
//                     const suffixNum = parseInt(suffixMatch[1], 10);
//                     if (suffixNum > maxSuffix) {
//                         maxSuffix = suffixNum;
//                     }
//                 }
//             });
//             username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         }

//         const updateData = {
//             firstName,
//             lastName,
//             username,
//             speciality,
//             hospital_code,
//             site_code,
//             isLocked: isLocked === 'true',
//             passwordChangedByAdmin: false,
//         };

//         if (resetPassword === 'true') {
//             const randomNum = Math.floor(Math.random() * 90000) + 10000; // Generate new password
//             newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}${randomNum}`;
//             const encryptedPassword = encrypt(newPassword);
//             updateData.password = encryptedPassword;
//             updateData.isLocked = false;
//             updateData.failedLogins = 0;
//             updateData.lastLogin = null;
//             updateData.passwordChangedByAdmin = true;
//         }

//         await Staff.findByIdAndUpdate(req.params.id, updateData);

//         // Store updated credentials in session
//         req.session.staffUsername = username;
//         req.session.staffPassword = resetPassword === 'true' ? newPassword : decryptedPassword;

//         delete req.session.staffUsername;
//         delete req.session.staffPassword;
//         delete req.session.staffCredentials;

//         req.session.staffCredentials = {
//             username,
//             password: resetPassword === 'true' ? newPassword : decryptedPassword,
//         };
        
//         res.redirect(basePath1);
//     } catch (err) {
//         console.error('Error updating staff:', err);
//         req.flash('error', 'An error occurred while updating the staff details. Please try again.');
//         res.status(500).send('Internal Server Error');
//     }
// });


router.post('/edit/:id', async (req, res) => {
      const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;

    try {
        const { firstName, lastName, speciality, isLocked, resetPassword } = req.body;
        const hospital_code = req.session.user.hospital_code;
        const site_code = req.session.user.site_code;

        const existingStaff = await Staff.findById(req.params.id);
        if (!existingStaff) {
            req.flash('error', 'Staff member not found.');
            return res.redirect(`${basePath}/staff`);
        }

        let newPassword = existingStaff.password;
        let decryptedPassword = decrypt(existingStaff.password);

        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        let isDuplicate = await Staff.exists({ username: username, _id: { $ne: req.params.id } }) ||
                          await Doctor.exists({ username: username }) ||
                          await User.exists({ username: username });

        if (isDuplicate) {
            let suffix = 2;
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Staff.exists({ username: newUsername, _id: { $ne: req.params.id } }) ||
                             await Doctor.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername;
                    break;
                }
                suffix++;
            }
        }

        const updateData = {
            firstName,
            lastName,
            username,
            speciality,
            hospital_code,
            site_code,
            isLocked: isLocked === 'true',
            passwordChangedByAdmin: false,
        };
    await writeDbLog('audit', {
      action:        'edit_staff_success',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      changes:       updateData,
      ip
    });
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

        await Staff.findByIdAndUpdate(req.params.id, updateData);

        req.session.staffCredentials = {
            username,
            password: resetPassword === 'true' ? newPassword : decryptedPassword,
        };
        
        res.redirect(basePath1);
    } catch (err) {
        console.error('Error updating staff:', err);
            await writeDbLog('error', {
      action:        'edit_staff_error',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      error:         err.message,
      stack:         err.stack,
      ip
    });
        req.flash('error', 'An error occurred while updating the staff details. Please try again.');
        res.status(500).send('Internal Server Error');
    }
});





// POST route to delete a staff member
router.post('/delete/:id', async (req, res) => {
  const { username, hospital_code, site_code } = req.session.user;
  const ip = req.ip;
    try {
            await writeDbLog('audit', {
      action:        'delete_staff_success',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      ip
    });
        await Staff.findByIdAndDelete(req.params.id);
        res.redirect(basePath1);
    } catch (err) {
        console.error(err);
            await writeDbLog('error', {
      action:        'delete_staff_error',
      username,
      hospital_code,
      site_code,
      staffId:       req.params.id,
      error:         err.message,
      stack:         err.stack,
      ip
    });
        res.status(500).send('Server Error');
    }
});




router.post('/', async (req, res) => {
        const { hospital_code, site_code, hospitalName } = req.session.user;
        const ip = req.ip;

    try {
        const { firstName, lastName, speciality, password } = req.body;

        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        let isDuplicate = await Staff.exists({ username: username }) ||
                          await Doctor.exists({ username: username }) ||
                          await User.exists({ username: username });

        if (isDuplicate) {
            let suffix = 2;
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Staff.exists({ username: newUsername }) ||
                             await Doctor.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername;
                    break;
                }
                suffix++;
            }
        }

        const newPassword = password || `${site_code}_${firstName.charAt(0).toLowerCase()}@${Math.floor(Math.random() * 90000) + 10000}`;
        const encryptedPassword = encrypt(newPassword);

        const newStaff = new Staff({
            firstName,
            lastName,
            username,
            password: encryptedPassword,
            speciality,
            hospital_code,
            site_code,
            hospitalName,
            loginCounter: 0,
            isLocked: false,
        });
             
            await writeDbLog('audit', {
      action:        'add_staff_success',
      username,
      hospital_code,
      site_code,
      newUsername:   newStaff.username,
      speciality:    newStaff.speciality,
      ip
    });
        await newStaff.save();

        req.session.staffCredentials = { username, password: newPassword };
        res.redirect(basePath1);
    } catch (err) {
        console.error('Error adding staff:', err);
            await writeDbLog('error', {
      action:        'add_staff_error',
      username,
      hospital_code,
      site_code,
      error:         err.message,
      stack:         err.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});




// POST route to delete a staff member
router.post('/delete/:id', async (req, res) => {
    try {
        await Staff.findByIdAndDelete(req.params.id);
        res.redirect(basePath);
    } catch (err) {
        console.error('Error deleting staff:', err);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;
