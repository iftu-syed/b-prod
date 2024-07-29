const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const flash = require('connect-flash');

// Connection URI
const uri = 'mongodb://localhost:27017'; // Update this URI if necessary

// Database Name
const dbName = 'Data_Entry_Incoming';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let db;

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

router.use(bodyParser.urlencoded({ extended: true }));

// Route to display form for creating password
router.get('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  const { dob } = req.query;

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Validate Mr_no / PhoneNumber and DOB
    const patient = await collection.findOne({
      $or: [{ Mr_no }, { phoneNumber: Mr_no }],
      DOB: dob
    });

    if (!patient) {
      req.flash('error', 'Please check your details and try again');
      return res.redirect('/');
    }

    res.render('form', { Mr_no: patient.Mr_no });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error');
    res.redirect('/');
  }
});

// Route to handle form submission for creating password
router.post('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect(`/password/${Mr_no}`);
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');
    await collection.updateOne({ Mr_no }, { $set: { password } });
    req.flash('success', 'Password updated successfully');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error');
    res.redirect('/');
  }
});

module.exports = router;
