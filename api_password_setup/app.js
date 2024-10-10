require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passwordRouter = require('./routes/index');
const app = express();

// Use environment variables
const PORT = process.env.PORT;

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

patientRouter.post('/password', (req, res) => {
  const { Mr_no, dob } = req.body;

  // Format the date to MM/DD/YYYY
  const formattedDob = formatDateToMMDDYYYY(dob);

  // Correct the redirect path to include /patientpassword
  res.redirect(`/patientpassword/password/${Mr_no}?dob=${formattedDob}`);
});

// Use the password router
patientRouter.use('/password', passwordRouter);

// Mount the patientRouter under '/patientpassword'
app.use('/patientpassword', patientRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at http://localhost/patientpassword`);
});
