// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Connect to MongoDB with updated database name and connection name
mongoose.connect('mongodb://localhost:27017/adminUser', { useNewUrlParser: true, useUnifiedTopology: true });

// Create a schema for admins
// Create a schema for admins
const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
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

// app.post('/login', async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         // Dummy login logic
//         if (username === 'admin' && password === 'admin') {
//             const admins = await Admin.find();
//             res.render('index', { admins });
//         } else {
//             // Redirect back to login page with error message
//             res.render('login', { error: 'Invalid username or password' });
//         }
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Hardcoded credentials
    const hardcodedUsername = 'admin';
    const hardcodedPassword = 'admin';

    if (username === hardcodedUsername && password === hardcodedPassword) {
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});



// app.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, username, password, hospital, subscription } = req.body;
//         const newAdmin = new Admin({ firstName, lastName, username, password, hospital, subscription });
//         await newAdmin.save();
//         const admins = await Admin.find();
//         res.render('index', { admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// app.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, password, hospital, subscription } = req.body;
//         let baseUsername = `${hospital.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the username already exists
//         let count = 1;
//         while (await Admin.findOne({ username })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         const newAdmin = new Admin({ firstName, lastName, username, password, hospital, subscription });
//         await newAdmin.save();
//         const admins = await Admin.find();
//         res.render('index', { admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.post('/addAdmin', async (req, res) => {
    try {
        const { firstName, lastName, password, hospital, subscription } = req.body;
        let baseUsername = `${hospital.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        let username = baseUsername;

        // Check if the username already exists
        let count = 1;
        while (await Admin.findOne({ username })) {
            username = `${baseUsername}_${count}`;
            count++;
        }

        const newAdmin = new Admin({ firstName, lastName, username, password, hospital, subscription });
        await newAdmin.save();

        // Redirect to avoid form resubmission
        res.redirect('/dashboard');
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

// app.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { firstName, lastName, username, password, hospital, subscription } = req.body;
//         await Admin.findByIdAndUpdate(id, { firstName, lastName, username, password, hospital, subscription });
//         const admins = await Admin.find();
//         res.render('index', { admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// app.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { firstName, lastName, hospital, subscription } = req.body;

//         // Generate the base username
//         let baseUsername = `${hospital.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the new username already exists, skip the current admin being updated
//         let count = 1;
//         while (await Admin.findOne({ username, _id: { $ne: id } })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Update the admin data including the newly generated username
//         await Admin.findByIdAndUpdate(id, { firstName, lastName, hospital, subscription, username });
//         const admins = await Admin.find();
//         res.render('index', { admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.post('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, password, hospital, subscription } = req.body;

        // Generate the base username
        let baseUsername = `${hospital.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        let username = baseUsername;

        // Check if the new username already exists, skip the current admin being updated
        let count = 1;
        while (await Admin.findOne({ username, _id: { $ne: id } })) {
            username = `${baseUsername}_${count}`;
            count++;
        }

        // Update the admin data including the newly generated username and the password
        await Admin.findByIdAndUpdate(id, { firstName, lastName, hospital, subscription, username, password });
        const admins = await Admin.find();
        res.render('index', { admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/dashboard', async (req, res) => {
    try {
        // Fetch admin data or other necessary data for the dashboard
        const admins = await Admin.find();
        // Render the index.ejs page with the data
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
