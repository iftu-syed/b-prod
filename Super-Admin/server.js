// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const app = express();

// // Connect to MongoDB with updated database name and connection name
// mongoose.connect('mongodb://localhost:27017/adminUser', { useNewUrlParser: true, useUnifiedTopology: true });

// const adminSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     username: String,
//     password: String,
//     hospital: String,
//     hospitalName: String,
//     siteCode: String, // New field added
//     subscription: { type: String, enum: ['Active', 'Inactive'] }
// });

// const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

// // Define the Hospital Schema directly in server.js
// const siteSchema = new mongoose.Schema({
//     site_code: String,
//     address: String,
//     city: String,
//     state: String,
//     country: String,
//     zip: String
// });

// const hospitalSchema = new mongoose.Schema({
//     hospital_code: { type: String, required: true, unique: true },
//     hospital_name: { type: String, required: true },
//     sites: [siteSchema]
// });

// const Hospital = mongoose.model('Hospital', hospitalSchema);

// app.set('view engine', 'ejs');
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));

// const session = require('express-session');
// const flash = require('connect-flash');

// app.use(session({
//     secret: 'yourSecretKey',
//     resave: false,
//     saveUninitialized: true
// }));

// app.use(flash());

// // Middleware to pass flash messages to views
// app.use((req, res, next) => {
//     res.locals.error = req.flash('error');
//     next();
// });

// // Routes
// app.get('/', (req, res) => {
//     res.render('login');
// });

// // Route to render the Hospital Form
// app.get('/addHospital', (req, res) => {
//     res.render('add-hospital');
// });

// // Route to handle Hospital Creation or Adding Sites
// app.post('/addHospital', async (req, res) => {
//     const { hospital_code, hospital_name, site_code, address, city, state, country, zip } = req.body;

//     try {
//         let hospital = await Hospital.findOne({ hospital_code, hospital_name });

//         if (hospital) {
//             // Hospital exists, add the new site
//             hospital.sites.push({ site_code, address, city, state, country, zip });
//         } else {
//             // Hospital does not exist, create a new hospital entry
//             hospital = new Hospital({
//                 hospital_code,
//                 hospital_name,
//                 sites: [{ site_code, address, city, state, country, zip }]
//             });
//         }

//         await hospital.save();
//         req.flash('success', 'Hospital and sites added/updated successfully.');
//         res.redirect('/dashboard');
//     } catch (error) {
//         console.error(error);
//         req.flash('error', 'Failed to add/update hospital.');
//         res.redirect('/addHospital');
//     }
// });

// app.post('/login', (req, res) => {
//     const { username, password } = req.body;

//     const hardcodedUsername = 'admin';
//     const hardcodedPassword = 'admin';

//     if (username !== hardcodedUsername && password !== hardcodedPassword) {
//         req.flash('error', 'Invalid username and password');
//     } else if (username !== hardcodedUsername) {
//         req.flash('error', 'Invalid username');
//     } else if (password !== hardcodedPassword) {
//         req.flash('error', 'Invalid password');
//     } else {
//         return res.redirect('/dashboard');
//     }
//     res.redirect('/');
// });

// // Route to handle Admin Creation
// app.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, password, hospital, hospitalName, siteCode, subscription } = req.body;
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the username already exists
//         let count = 1;
//         while (await Admin.findOne({ username })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if an admin with the same siteCode and hospital already exists
//         const existingAdmin = await Admin.findOne({ hospital, hospitalName, siteCode, firstName, lastName });
//         if (existingAdmin) {
//             req.flash('error', 'Admin with these details already exists.');
//             return res.redirect('/dashboard');
//         }

//         const newAdmin = new Admin({ firstName, lastName, username, password, hospital, hospitalName, siteCode, subscription });
//         await newAdmin.save();

//         // Redirect to avoid form resubmission
//         res.redirect('/dashboard');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // GET route to render the edit form for a specific admin
// app.get('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const admin = await Admin.findById(id).lean();
//         const hospitals = await Hospital.find().lean(); // Fetch hospitals data

//         res.render('edit-admin', { admin, hospitals }); // Pass hospitals data to the view
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// // Route to handle Admin Edit
// // app.post('/editAdmin/:id', async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         const { firstName, lastName, password, hospital, hospitalName, siteCode, subscription } = req.body;

// //         // Generate the base username
// //         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
// //         let username = baseUsername;

// //         // Check if the new username already exists, skip the current admin being updated
// //         let count = 1;
// //         while (await Admin.findOne({ username, _id: { $ne: id } })) {
// //             username = `${baseUsername}_${count}`;
// //             count++;
// //         }

// //         // Update the admin data including the siteCode
// //         await Admin.findByIdAndUpdate(id, { firstName, lastName, hospital, hospitalName, siteCode, subscription, username, password });
// //         const admins = await Admin.find();
// //         res.render('index', { admins });
// //     } catch (err) {
// //         console.error(err);
// //         res.status(500).send('Internal Server Error');
// //     }
// // });

// // Route to handle Admin Edit
// app.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { firstName, lastName, password, hospital, hospitalName, siteCode, subscription } = req.body;

//         // Generate the base username
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the new username already exists, skip the current admin being updated
//         let count = 1;
//         while (await Admin.findOne({ username, _id: { $ne: id } })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if another admin with the same hospital, site code, first name, and last name exists (excluding the current one)
//         const existingAdmin = await Admin.findOne({ 
//             hospital, 
//             hospitalName, 
//             siteCode, 
//             firstName, 
//             lastName, 
//             _id: { $ne: id } 
//         });

//         if (existingAdmin) {
//             req.flash('error', 'An admin with the same details already exists.');
//             return res.redirect(`/editAdmin/${id}`);
//         }

//         // Update the admin data including the siteCode
//         await Admin.findByIdAndUpdate(id, { 
//             firstName, 
//             lastName, 
//             hospital, 
//             hospitalName, 
//             siteCode, 
//             subscription, 
//             username, 
//             password 
//         });

//         // Fetch the updated list of admins and hospitals
//         const admins = await Admin.find().lean();
//         const hospitals = await Hospital.find().lean();

//         // Render the index.ejs view with the updated data
//         res.render('index', { admins, hospitals });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Route to render the Dashboard with the list of Admins and Hospitals
// app.get('/dashboard', async (req, res) => {
//     try {
//         const hospitals = await Hospital.find().lean();
//         const admins = await Admin.find().lean();
//         res.render('index', { hospitals, admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Route to handle Admin Deletion
// app.post('/deleteAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         await Admin.findByIdAndDelete(id);

//         // Fetch the updated list of admins and hospitals
//         const admins = await Admin.find();
//         const hospitals = await Hospital.find();  // Fetch hospitals data

//         // Render the index.ejs view with the updated data
//         res.render('index', { admins, hospitals });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// app.listen(3001, () => {
//     console.log('Server is running on port 3001');
// });



const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Connect to MongoDB with updated database name and connection name
mongoose.connect('mongodb://localhost:27017/adminUser', { useNewUrlParser: true, useUnifiedTopology: true });

const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,  // Renamed from hospital to hospital_code
    hospitalName: String,
    siteCode: String, // New field added
    subscription: { type: String, enum: ['Active', 'Inactive'] }
});

const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

// Define the Hospital Schema directly in server.js
const siteSchema = new mongoose.Schema({
    site_code: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zip: String
});

const hospitalSchema = new mongoose.Schema({
    hospital_code: { type: String, required: true, unique: true },
    hospital_name: { type: String, required: true },
    sites: [siteSchema]
});

const Hospital = mongoose.model('Hospital', hospitalSchema);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const session = require('express-session');
const flash = require('connect-flash');

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('login');
});

// Route to render the Hospital Form
app.get('/addHospital', (req, res) => {
    res.render('add-hospital');
});

// Route to handle Hospital Creation or Adding Sites
app.post('/addHospital', async (req, res) => {
    const { hospital_code, hospital_name, site_code, address, city, state, country, zip } = req.body;

    try {
        let hospital = await Hospital.findOne({ hospital_code, hospital_name });

        if (hospital) {
            // Hospital exists, add the new site
            hospital.sites.push({ site_code, address, city, state, country, zip });
        } else {
            // Hospital does not exist, create a new hospital entry
            hospital = new Hospital({
                hospital_code,
                hospital_name,
                sites: [{ site_code, address, city, state, country, zip }]
            });
        }

        await hospital.save();
        req.flash('success', 'Hospital and sites added/updated successfully.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to add/update hospital.');
        res.redirect('/addHospital');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const hardcodedUsername = 'admin';
    const hardcodedPassword = 'admin';

    if (username !== hardcodedUsername && password !== hardcodedPassword) {
        req.flash('error', 'Invalid username and password');
    } else if (username !== hardcodedUsername) {
        req.flash('error', 'Invalid username');
    } else if (password !== hardcodedPassword) {
        req.flash('error', 'Invalid password');
    } else {
        return res.redirect('/dashboard');
    }
    res.redirect('/');
});

// Route to handle Admin Creation
app.post('/addAdmin', async (req, res) => {
    try {
        const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;
        let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        let username = baseUsername;

        // Check if the username already exists
        let count = 1;
        while (await Admin.findOne({ username })) {
            username = `${baseUsername}_${count}`;
            count++;
        }

        // Check if an admin with the same siteCode and hospital_code already exists
        const existingAdmin = await Admin.findOne({ hospital_code, hospitalName, siteCode, firstName, lastName });
        if (existingAdmin) {
            req.flash('error', 'Admin with these details already exists.');
            return res.redirect('/dashboard');
        }

        const newAdmin = new Admin({ firstName, lastName, username, password, hospital_code, hospitalName, siteCode, subscription });
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
        const admin = await Admin.findById(id).lean();
        const hospitals = await Hospital.find().lean(); // Fetch hospitals data

        res.render('edit-admin', { admin, hospitals }); // Pass hospitals data to the view
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle Admin Edit
app.post('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

        // Generate the base username
        let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
        let username = baseUsername;

        // Check if the new username already exists, skip the current admin being updated
        let count = 1;
        while (await Admin.findOne({ username, _id: { $ne: id } })) {
            username = `${baseUsername}_${count}`;
            count++;
        }

        // Check if another admin with the same hospital_code, site code, first name, and last name exists (excluding the current one)
        const existingAdmin = await Admin.findOne({ 
            hospital_code, 
            hospitalName, 
            siteCode, 
            firstName, 
            lastName, 
            _id: { $ne: id } 
        });

        if (existingAdmin) {
            req.flash('error', 'An admin with the same details already exists.');
            return res.redirect(`/editAdmin/${id}`);
        }

        // Update the admin data including the siteCode
        await Admin.findByIdAndUpdate(id, { 
            firstName, 
            lastName, 
            hospital_code, 
            hospitalName, 
            siteCode, 
            subscription, 
            username, 
            password 
        });

        // Fetch the updated list of admins and hospitals
        const admins = await Admin.find().lean();
        const hospitals = await Hospital.find().lean();

        // Render the index.ejs view with the updated data
        res.render('index', { admins, hospitals });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to render the Dashboard with the list of Admins and Hospitals
app.get('/dashboard', async (req, res) => {
    try {
        const hospitals = await Hospital.find().lean();
        const admins = await Admin.find().lean();
        res.render('index', { hospitals, admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle Admin Deletion
app.post('/deleteAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Admin.findByIdAndDelete(id);

        // Fetch the updated list of admins and hospitals
        const admins = await Admin.find();
        const hospitals = await Hospital.find();  // Fetch hospitals data

        // Render the index.ejs view with the updated data
        res.render('index', { admins, hospitals });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
