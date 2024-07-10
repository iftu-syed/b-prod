const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const surveyRoutes = require('./routes/surveys');
const path = require('path');
const PORT = 4099;
const app = express();


// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/surveyDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Routes
app.use('/surveys', surveyRoutes);

// Route to serve the "Add Survey" page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'addSurvey.html'));
});

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

function startServer() {
  app.listen(PORT, () => {
      console.log(`Login server is running on http://localhost:${PORT}`);
  });
}

module.exports = startServer;