// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Connect to MongoDB with updated database name and connection name
mongoose.connect('mongodb://localhost:27017/adminUser', { useNewUrlParser: true, useUnifiedTopology: true });

// Create a schema for admins
const adminSchema = new mongoose.Schema({
    username: String,
    password: String,
    hospital: String,
    subscription: { type: String, enum: ['Active', 'Inactive'] }
});

const Admin = mongoose.model('User', adminSchema); // Change model name to 'User'

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
// app.get('/', async (req, res) => {
//     try {
//         const admins = await Admin.find();
//         res.render('index', { admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Dummy login logic
        if (username === 'admin' && password === 'admin') {
            const admins = await Admin.find();
            res.render('index', { admins });
        } else {
            // Redirect back to login page with error message
            res.render('login', { error: 'Invalid username or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/addAdmin', async (req, res) => {
    try {
        const { username, password, hospital, subscription } = req.body;
        const newAdmin = new Admin({ username, password, hospital, subscription });
        await newAdmin.save();
        // res.redirect('/');
        const admins = await Admin.find();
        res.render('index', { admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// GET route to render the edit form for a specific admin
app.get('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findById(id);
        res.render('edit-admin', { admin });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, hospital, subscription } = req.body;
        await Admin.findByIdAndUpdate(id, { username, password, hospital, subscription });
        // res.redirect('/');
        const admins = await Admin.find();
        res.render('index', { admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/deleteAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Admin.findByIdAndDelete(id);
        // res.redirect('/');
        const admins = await Admin.find();
        res.render('index', { admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
