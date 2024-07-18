const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const passwordRouter = require('./routes/index');
const PORT = 3002;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Function to format date to MM/DD/YYYY
const formatDateToMMDDYYYY = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) 
    month = '0' + month;
  if (day.length < 2) 
    day = '0' + day;

  return [month, day, year].join('/');
};

// Define root route
app.get('/', (req, res) => {
  res.render('input_form');
});

app.post('/password', (req, res) => {
  const { Mr_no, dob } = req.body;

  // Format the date to MM/DD/YYYY
  const formattedDob = formatDateToMMDDYYYY(dob);

  res.redirect(`/password/${Mr_no}?dob=${formattedDob}`);
});

// Use the password router
app.use('/password', passwordRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at http://localhost:${PORT}`);
});
