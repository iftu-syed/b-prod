//This code is after the ningix configuration

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const flash = require('connect-flash');
const crypto = require('crypto'); // Add crypto module for encryption

// Use environment variables
const uri = process.env.DB_URI;
const dbName = process.env.DB_NAME;
const encryptionKey = process.env.ENCRYPTION_KEY; // Use encryption key from .env

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let db;

// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    console.log("Connected successfully to server");
    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err;
  }
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

// Route to display form for creating a password
router.get('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  const { dob } = req.query;

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Validate Mr_no / PhoneNumber and DOB (assuming they are NOT encrypted in the DB)
    const patient = await collection.findOne({
      $or: [{ Mr_no }, { phoneNumber: Mr_no }],
      DOB: dob
    });

    if (!patient) {
      req.flash('error', 'Please check your details and try again');
      return res.redirect('/patientpassword');
    }

    res.render('form', { Mr_no: patient.Mr_no });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error');
    res.redirect('/patientpassword');
  }
});

// Route to handle form submission for creating a password
router.post('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  const { password, confirmPassword } = req.body;

  // Regular expression for password validation
  const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

  // Check if the password meets the required constraints
  if (!passwordPattern.test(password)) {
    req.flash('error', 'Password must contain at least one capital letter, one number, one special character, and be at least 6 characters long.');
    return res.redirect(`/patientpassword/password/${Mr_no}`);
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect(`/patientpassword/password/${Mr_no}`);
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Encrypt password before storing it
    const encryptedPassword = encrypt(password);

    // Update the patient's password
    await collection.updateOne({ Mr_no }, { $set: { password: encryptedPassword } });
    req.flash('success', 'Password updated successfully');
    
    // Redirect to a success page or home
    res.redirect(`http://localhost:${process.env.REDIRECT_PORT}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error');
    res.redirect('/patientpassword');
  }
});

module.exports = router;
