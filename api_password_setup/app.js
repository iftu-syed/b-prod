// const express = require('express');
// const bodyParser = require('body-parser');
// const app = express();
// const passwordRouter = require('./routes/index');
// const PORT = 3002;

// app.set('view engine', 'ejs');
// app.use(bodyParser.urlencoded({ extended: true }));



// // Use the password router
// app.use('/password', passwordRouter);

// app.listen(PORT, () => {
//   console.log(`The patient password generation is running at http://localhost:${PORT}`);
// });


const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path'); // Add this line to import the path module
const passwordRouter = require('./routes/index');


const PORT = 3002;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Define root route
app.get('/', (req, res) => {
  res.render('input_form');
});

app.post('/password', (req, res) => {
  const Mr_no = req.body.Mr_no;
  res.redirect(`/password/${Mr_no}`);
});

// Use the password router
app.use('/password', passwordRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at http://localhost:${PORT}`);
});
