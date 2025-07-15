//This code is after the ningix configuration

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const flash = require('connect-flash');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Add crypto module for encryption

// Use environment variables
const uri = process.env.DB_URI;
const dbName = process.env.DB_NAME;
const encryptionKey = process.env.ENCRYPTION_KEY; // Use encryption key from .env
const RedirectUrl =process.env.REDIRECT_URL;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let db;
// let logsDb, accessColl, auditColl, errorColl;

// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    console.log("Connected successfully to server");
    db = client.db(dbName);
    // logsDb     = client.db('patient_logs');
    // accessColl = logsDb.collection('access_logs');
    // auditColl  = logsDb.collection('audit_logs');
    // errorColl  = logsDb.collection('error_logs');
    return db;
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err;
  }
}

// let initLogsPromise = null;

// async function ensureLogsInit() {
//   if (accessColl) return;           // already done
//   if (!initLogsPromise) {
//     initLogsPromise = connectToDatabase()
//       .catch(err => { initLogsPromise = null; throw err; });
//   }
//   await initLogsPromise;
// }

// async function writeDbLog(type, data) {
//   // make sure our three collections exist
//   await ensureLogsInit();

//   const entry = { ...data, timestamp: new Date().toISOString() };
//   switch (type) {
//     case 'access': return accessColl.insertOne(entry);
//     case 'audit':  return auditColl.insertOne(entry);
//     case 'error':  return errorColl.insertOne(entry);
//     default:       throw new Error(`Unknown log type: ${type}`);
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
// Encryption function for passwords (AES-256-CBC)
const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Generate random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex'); // Store IV along with the encrypted password
};

// Decryption function (if needed for password comparison)
const decrypt = (text) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

router.use(bodyParser.urlencoded({ extended: true }));


router.get('/:hashMrNo', async (req, res) => {
  const { hashMrNo } = req.params;
    const ip = req.ip;
  // const { dob } = req.query; // DOB is not strictly needed here if hashMrNo is unique and sufficient

  console.log('Received hashMrNo for form display:', hashMrNo);

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    const patient = await collection.findOne({
      hashedMrNo: hashMrNo,
    });

    if (!patient) {
        await writeDbLog('error', {
        action:        'reset_password_form_not_found',
        hashMrNo,
        ip,
      });
      console.log('Patient not found with hashMrNo:', hashMrNo);
      req.flash('error', 'Patient details not found. Please try again.');
      return res.redirect(`/patientpassword?lng=${currentLanguage}`);
    }

    
    await writeDbLog('access', {
      action:        'reset_password_form',
      hashMrNo,
      Mr_no:         patient.Mr_no,
      ip,
    });

    console.log('Patient found for form display:', patient.Mr_no);
    // Pass both Mr_no (for context if needed, but primarily for DB update)
    // and hashMrNo (for constructing URLs, especially error redirects)
    res.render('form', {
      Mr_no: patient.Mr_no, // The actual Mr_no
      hashMrNo: hashMrNo,   // The identifier used in the URL
      lng: req.language,    // Pass language
      dir: req.dir,       // Pass direction
      success: req.flash('success'),

      error: req.flash('error'), // if you pass them individually

    });
  } catch (error) {
    console.error('Error fetching patient for form display:', error);
        await writeDbLog('error', {
      action:        'reset_password_form_error',
      hashMrNo,
      error:         error.message,
      stack:         error.stack,
      ip,
    });
    req.flash('error', 'Internal server error. Please try again.');
    res.redirect(`/patientpassword?lng=${currentLanguage}`);
  }
});


router.post('/submit', async (req, res) => {
  // Mr_no (actual) and hashMrNo (for URL identifier) will come from hidden fields in the form body
  const { Mr_no, hashMrNo, password, confirmPassword } = req.body;
  const currentLanguage = req.query.lng || req.cookies.lng || 'en';
    const ip = req.ip;

  // Validate that hashMrNo and Mr_no are present (they should be from the hidden fields)
  if (!hashMrNo || !Mr_no) {
        await writeDbLog('error', {
      action:        'password_submit_missing_identifiers',
      hashMrNo, Mr_no,
      ip,
    });
    req.flash('error', 'An error occurred. Missing patient identifier. Please try again.');
    return res.redirect(`/patientpassword?lng=${currentLanguage}`);
  }

  // Regular expression for password validation
  const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!passwordPattern.test(password)) {

        await writeDbLog('audit', {
      action:        'password_validation_failed',
      hashMrNo, Mr_no,
      reason:        'pattern_mismatch',
      ip,
    });
    req.flash('error', 'Password must contain at least one capital letter, one number, one special character, and be at least 8 characters long.');
    // Redirect back to the form using hashMrNo
    return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }

  if (password !== confirmPassword) {
        await writeDbLog('audit', {
      action:        'password_validation_failed',
      hashMrNo, Mr_no,
      reason:        'confirmation_mismatch',
      ip,
    });
    req.flash('error', 'Passwords do not match.');
    // Redirect back to the form using hashMrNo
    return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    const encryptedPassword = encrypt(password);

    // Update the patient's password using the actual Mr_no
    const updateResult = await collection.updateOne({ Mr_no: Mr_no }, { $set: { password: encryptedPassword } });

    if (updateResult.matchedCount === 0) {
            await writeDbLog('error', {
        action:        'password_update_no_patient',
        hashMrNo, Mr_no,
        ip,
      });
        req.flash('error', 'Failed to update password. Patient not found with the provided MRN.');
        return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
    }
    
    
    await writeDbLog('audit', {
      action:        'password_updated',
      hashMrNo, Mr_no,
      ip,
    });
    req.flash('success', 'Password updated successfully');
    const sep = RedirectUrl.includes('?') ? '&' : '?';
    return res.redirect(`${RedirectUrl}${sep}lng=${currentLanguage}&success=true`);


  } catch (err) {
    console.error('Error updating password:', err);
        await writeDbLog('error', {
      action:        'password_update_error',
      hashMrNo, Mr_no,
      error:         err.message,
      stack:         err.stack,
      ip,
    });
    req.flash('error', 'Internal server error during password update.');
    // Redirect back to the form using hashMrNo
    res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }
});


module.exports = router;