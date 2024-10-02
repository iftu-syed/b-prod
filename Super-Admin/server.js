const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();  // Load environment variables
const crypto = require('crypto');

// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 character key (256 bits)
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to encrypt text (password)
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper function to decrypt text (password)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

// Connect to MongoDB using environment variables
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,
    hospitalName: String,
    siteCode: String,
    siteName: String,  // Add this line
    subscription: { type: String, enum: ['Active', 'Inactive'] }
});

const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

const siteSchema = new mongoose.Schema({
    site_code: String,
    site_name: String,  // Add this line
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
    secret: process.env.SESSION_SECRET,  // Use environment variable for session secret
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

app.post('/addHospital', async (req, res) => {
    const { hospital_code, hospital_name, site_code, site_name, address, city, state, country, zip } = req.body; // Include site_name

    try {
        let hospital = await Hospital.findOne({ hospital_code, hospital_name });

        if (hospital) {
            // Hospital exists, add the new site
            hospital.sites.push({ site_code, site_name, address, city, state, country, zip }); // Include site_name
        } else {
            // Hospital does not exist, create a new hospital entry
            hospital = new Hospital({
                hospital_code,
                hospital_name,
                sites: [{ site_code, site_name, address, city, state, country, zip }] // Include site_name
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

    const hardcodedUsername = process.env.HARDCODED_USERNAME;  // Use environment variable for hardcoded username
    const hardcodedPassword = process.env.HARDCODED_PASSWORD;  // Use environment variable for hardcoded password

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

// app.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the username already exists
//         let count = 1;
//         while (await Admin.findOne({ username })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if an admin with the same siteCode and hospital_code already exists
//         const existingAdmin = await Admin.findOne({ hospital_code, hospitalName, siteCode, firstName, lastName });
//         if (existingAdmin) {
//             req.flash('error', 'Admin with these details already exists.');
//             return res.redirect('/dashboard');
//         }

//         // Create new admin including siteName
//         const newAdmin = new Admin({ firstName, lastName, username, password, hospital_code, hospitalName, siteCode, siteName, subscription });
//         await newAdmin.save();

//         // Redirect to avoid form resubmission
//         res.redirect('/dashboard');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// app.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the username already exists
//         let count = 1;
//         while (await Admin.findOne({ username })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if an admin with the same siteCode and hospital_code already exists
//         const existingAdmin = await Admin.findOne({ hospital_code, hospitalName, siteCode, firstName, lastName });
//         if (existingAdmin) {
//             req.flash('error', 'Admin with these details already exists.');
//             return res.redirect('/dashboard');
//         }

//         // Encrypt the password using AES-256
//         const encryptedPassword = encrypt(password);

//         // Create new admin including encrypted password and siteName
//         const newAdmin = new Admin({ 
//             firstName, 
//             lastName, 
//             username, 
//             password: encryptedPassword,  // Save encrypted password
//             hospital_code, 
//             hospitalName, 
//             siteCode, 
//             siteName, 
//             subscription 
//         });
//         await newAdmin.save();

//         // Redirect to avoid form resubmission
//         res.redirect('/dashboard');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.post('/addAdmin', async (req, res) => {
    try {
        const { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

        // Find the hospital based on the selected hospital code
        const hospital = await Hospital.findOne({ hospital_code });

        // Find the selected site within the hospital's sites array
        const site = hospital.sites.find(s => s.site_code === siteCode);

        // Extract siteName from the selected site
        const siteName = site ? site.site_name : '';

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

        // Auto-generate the password
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const password = `${siteCode}_${firstName.toLowerCase()}@${randomNum}`;

        // Encrypt the password using AES-256
        const encryptedPassword = encrypt(password);

        // Create new admin including encrypted password and siteName
        const newAdmin = new Admin({ 
            firstName, 
            lastName, 
            username, 
            password: encryptedPassword,  // Save encrypted password
            hospital_code, 
            hospitalName, 
            siteCode, 
            siteName, 
            subscription 
        });

        await newAdmin.save();

        // Redirect to dashboard with decrypted password in query parameters
        res.redirect(`/dashboard?username=${username}&password=${password}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

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

// app.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate the base username
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the new username already exists, skip the current admin being updated
//         let count = 1;
//         while (await Admin.findOne({ username, _id: { $ne: id } })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if another admin with the same hospital_code, site code, first name, and last name exists (excluding the current one)
//         const existingAdmin = await Admin.findOne({ 
//             hospital_code, 
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

//         // Update the admin data including the siteName and siteCode
//         await Admin.findByIdAndUpdate(id, { 
//             firstName, 
//             lastName, 
//             hospital_code, 
//             hospitalName, 
//             siteCode, 
//             siteName,  // Include siteName here
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


// app.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate the base username
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         let username = baseUsername;

//         // Check if the new username already exists, skip the current admin being updated
//         let count = 1;
//         while (await Admin.findOne({ username, _id: { $ne: id } })) {
//             username = `${baseUsername}_${count}`;
//             count++;
//         }

//         // Check if another admin with the same hospital_code, site code, first name, and last name exists (excluding the current one)
//         const existingAdmin = await Admin.findOne({ 
//             hospital_code, 
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

//         // Encrypt the new password using AES-256
//         const encryptedPassword = encrypt(password);

//         // Update the admin data including the siteName and siteCode
//         await Admin.findByIdAndUpdate(id, { 
//             firstName, 
//             lastName, 
//             hospital_code, 
//             hospitalName, 
//             siteCode, 
//             siteName,  // Include siteName here
//             subscription, 
//             username, 
//             password: encryptedPassword  // Use encrypted password
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


app.post('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

        // Find the hospital based on the selected hospital code
        const hospital = await Hospital.findOne({ hospital_code });

        // Find the selected site within the hospital's sites array
        const site = hospital.sites.find(s => s.site_code === siteCode);

        // Extract siteName from the selected site
        const siteName = site ? site.site_name : '';

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

        // Encrypt the new password using AES-256
        const encryptedPassword = encrypt(password);

        // Update the admin data including the siteName and siteCode
        await Admin.findByIdAndUpdate(id, { 
            firstName, 
            lastName, 
            hospital_code, 
            hospitalName, 
            siteCode, 
            siteName,  // Include siteName here
            subscription, 
            username, 
            password: encryptedPassword  // Use encrypted password
        });

        // Redirect to the dashboard with the decrypted password in query parameters
        res.redirect(`/dashboard?username=${username}&password=${password}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


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

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server is running on port ${process.env.PORT || 3001}`);
});
