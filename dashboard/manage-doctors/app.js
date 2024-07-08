// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const path = require('path');
// const PORT = 4010;
// const app = express();
// const Doctor = require('./models/doctor');
// app.set('view engine', 'ejs');

// // MongoDB connection
// mongoose.connect('mongodb://localhost:27017/manage_doctors', { useNewUrlParser: true, useUnifiedTopology: true });

// // Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(__dirname + '/public'));

// // Routes
// app.use('/doctors', require('./routes/doctors'));

// app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

// // Home route to redirect to manage doctors page
// app.get('/', (req, res) => {
//     const hospital = req.query.hospital;
//     res.redirect(`/doctors?hospital=${hospital}`);
// });

// app.post('/delete/:id', async (req, res) => {
//     try {
//         await Doctor.findByIdAndDelete(req.params.id);
//         res.redirect('/');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Server is running on http://localhost:${PORT}`);
//     });
// }

// module.exports = startServer;














//new code with sessions

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Doctor = require('./models/doctor');

const PORT = 4010;
const app = express();
app.set('view engine', 'ejs');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/manage_doctors', { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/adminUser',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

// Routes
app.use('/doctors', require('./routes/doctors'));

// Home route to redirect to manage doctors page
app.get('/', (req, res) => {
    res.redirect('/doctors');
});

app.post('/delete/:id', async (req, res) => {
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

function startServer() {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = startServer;
