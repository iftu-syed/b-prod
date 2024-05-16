// Required modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const port = 4000; // Change the port as needed

const startServer1 = require('./manage-doctors/app');
const startServer2 = require('./Survey-App/app');
const startServer3 = require('./Survey_names/app');


startServer1();
startServer2();
startServer3();

// Middleware for parsing JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB database
mongoose.connect('mongodb://localhost:27017/adminUser', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define schema for User
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    hospital: String,
    subscription: String
})

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

// Home page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Find admin user in MongoDB
    User.findOne({ username, password })
        .then(user => {
            if (!user) {
                res.status(401).send('Invalid username or password');
            } else {
                // If successful login, redirect to admin dashboard
                res.redirect('/admin-dashboard');
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send('Internal Server Error');
        });
});

// Route to handle form submission for adding a user
app.post('/addUser', async (req, res) => {
    try {
        // Extract username, password, hospital, and subscription from request body
        const { username, password, hospital, subscription } = req.body;

        // Create a new User document
        const newUser = new User({ username, password, hospital, subscription });

        // Save the new user to the database
        await newUser.save();

        // Send a redirect response to the success page
        res.redirect('/success.html');

    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Admin dashboard route
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Route for managing doctors
// app.get('/manage-doctors', (req, res) => {
//     res.send('Manage Doctors page');
// });

app.get('/manage-doctors', (req, res) => {
    res.redirect('http://localhost:4010'); // Redirect to the route defined in app.js
});

app.get('/Survey-App', (req, res) => {
    res.redirect('http://localhost:4050'); // Redirect to the route defined in app.js
});

// Route for managing surveys
app.get('/manage-surveys', (req, res) => {
    // res.send('Manage Surveys page');
    res.redirect('http://localhost:4050');
    
});

// Route for viewing reports
app.get('/view-report', (req, res) => {
    res.send('View Report page');
});

// Route for editing profile
app.get('/edit-profile', (req, res) => {
    res.send('Edit Profile page');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});