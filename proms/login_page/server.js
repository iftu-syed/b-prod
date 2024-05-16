// // server.js

// const express = require('express');
// const env = require('dotenv').config();
// const ejs = require('ejs');
// const path = require('path');
// const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
// const session = require('express-session');
// const MongoStore = require('connect-mongo')(session);
// const PORT = 3050;
// function startServer() {
//   app.listen(PORT, () => {
//       console.log(`Login server is running on http://localhost:${PORT}`);
//   });
// }

// module.exports = startServer;

// const app = express();

// mongoose.connect('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.2', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }, (err) => {
//   if (!err) {
//     console.log('MongoDB Connection Succeeded.');
//   } else {
//     console.log('Error in DB connection : ' + err);
//   }
// });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function () {});

// app.use(session({
//   secret: 'work hard',
//   resave: true,
//   saveUninitialized: false,
//   store: new MongoStore({
//     mongooseConnection: db
//   })
// }));

// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));

// app.use(express.static(__dirname + '/views'));

// const index = require('./routes/index');
// app.use('/', index);

// // Catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   const err = new Error('File Not Found');
//   err.status = 404;
//   next(err);
// });

// // Error handler
// // Define as the last app.use callback
// app.use(function (err, req, res, next) {
//   res.status(err.status || 500);
//   res.send(err.message);
// });


// // function startServer() {
// //   const port = process.env.PORT || 3050;
// //   app.listen(port, () => {
// //       console.log(`Server is started on http://127.0.0.1:${port}`);
// //   });
// // }

// // // Export the function to start the server
// // module.exports = startServer;



// server.js

const express = require('express');
const env = require('dotenv').config();
const ejs = require('ejs');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const PORT = 3050;

function startServer() {
  app.listen(PORT, () => {
      console.log(`Login server is running on http://localhost:${PORT}`);
  });
}

module.exports = startServer;

const app = express();

mongoose.connect('mongodb://127.0.0.1:27017/login_credentials', { // Changed the database name to "login_credentials"
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'patient_data' // Changed the connection name to "patient_dataa"
}, (err) => {
  if (!err) {
    console.log('MongoDB Connection Succeeded.');
  } else {
    console.log('Error in DB connection : ' + err);
  }
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {});

app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(__dirname + '/views'));

const index = require('./routes/index');
app.use('/', index);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('File Not Found');
  err.status = 404;
  next(err);
});

// Error handler
// Define as the last app.use callback
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});
