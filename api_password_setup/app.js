require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const flash = require('connect-flash');
const passwordRouter = require('./routes/index');
const app = express();

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

// Use environment variables
const uri = process.env.DB_URI; // Ensure DB_URI is set in your .env file
const dbName = process.env.DB_NAME; // Ensure DB_NAME is set in your .env file

let db;


// Use environment variables
const PORT = process.env.PORT;


// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected successfully to server');
    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
}



app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/patientpassword', express.static(path.join(__dirname, 'public')));

// Set up express-session middleware using environment variable
app.use(session({
  secret: process.env.SESSION_SECRET, // Use secret from .env
  resave: false,
  saveUninitialized: true
}));

// Set up connect-flash middleware
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Function to format date to MM/DD/YYYY
const formatDateToMMDDYYYY = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [month, day, year].join('/');
};

// Create a new router
const patientRouter = express.Router();

// Define root route
patientRouter.get('/', (req, res) => {
  res.render('input_form', { message: res.locals.error });
});

// patientRouter.post('/password', (req, res) => {

//   const { Mr_no, dob } = req.body;

//   // Format the date to MM/DD/YYYY
//   const formattedDob = formatDateToMMDDYYYY(dob);

//   // Correct the redirect path to include /patientpassword
//   res.redirect(`/patientpassword/password/${Mr_no}?dob=${formattedDob}`);
// });

patientRouter.post('/password', async (req, res) => {
  const { Mr_no, dob } = req.body;

  // Format the date to MM/DD/YYYY
  const formattedDob = formatDateToMMDDYYYY(dob);

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    console.log('Searching for patient with:', { Mr_no, dob: formattedDob });

    // Find the patient using the provided Mr_no and formatted DOB
    const patient = await collection.findOne({
      Mr_no: Mr_no,
      DOB: formattedDob,
    });

    if (!patient) {
      console.log('Patient not found or hashMrNo is missing');
      req.flash('error', 'Please check your details and try again');
      return res.redirect('/patientpassword');
    }

    console.log('Patient found:', patient);

    // Ensure the code accesses `hashedMrNo` correctly
    if (!patient.hashedMrNo) {
      console.log('hashedMrNo not found for the patient');
      req.flash('error', 'Internal server error: Missing patient hashedMrNo');
      return res.redirect('/patientpassword');
    }

    console.log('hashedMrNo found:', patient.hashedMrNo);

    // Redirect with the `hashedMrNo` and `dob`
    res.redirect(`/patientpassword/password/${patient.hashedMrNo}?dob=${formattedDob}`);
  } catch (error) {
    console.error('Error fetching patient:', error);
    req.flash('error', 'Internal server error');
    res.redirect('/patientpassword');
  }
});


// Use the password router
patientRouter.use('/password', passwordRouter);

// Mount the patientRouter under '/patientpassword'
app.use('/patientpassword', patientRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at https://proms-2.giftysolutions.com/patientpassword`);
});
