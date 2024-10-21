const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();  // Load environment variables
const crypto = require('crypto');
const session = require('express-session');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo'); // Import connect-mongo

// Define the base path
const basePath = '/superadmin';
app.locals.basePath = basePath;

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
    siteName: String,
    subscription: { type: String, enum: ['Active', 'Inactive'] },
    loginCounter: { type: Number, default: 0 }  // Add this line
});

const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

const siteSchema = new mongoose.Schema({
    site_code: String,
    site_name: String,
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

// Serve static files under the base path
app.use(basePath, express.static('public'));



// app.use(session({
//     secret: process.env.SESSION_SECRET,  // Use environment variable for session secret
//     resave: false,
//     saveUninitialized: true
// }));



// Update session middleware to store sessions in MongoDB
app.use(session({
    secret: process.env.SESSION_SECRET,  // Use environment variable for session secret
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // MongoDB connection URI from environment variables
        dbName: process.env.SESSION_DB, // Use environment variable for database name
        collectionName: process.env.SESSION_COLLECTION, // Use environment variable for session collection name
        ttl: 14 * 24 * 60 * 60,          // Session expiry (14 days in this example)
        autoRemove: 'native',            // Automatically remove expired sessions
    })
}));



// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        // If the session exists, proceed to the next middleware or route
        return next();
    } else {
        // If no session exists, redirect to the login page with an error message
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect(basePath + '/');
    }
}

app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    next();
});

// Create an Express Router
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    res.render('login');
});


// Logout Route
router.get('/logout', (req, res) => {
    // Set the flash message before destroying the session
    req.flash('success', 'You have been logged out.');

    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session during logout', err);
            req.flash('error', 'Failed to log out. Please try again.');
            return res.redirect(basePath + '/dashboard');
        }

        // Clear the cookie and redirect to the login page
        res.clearCookie('connect.sid'); // Optional: Clears the session cookie
        res.redirect(basePath + '/');
    });
});

// // Route to render the Hospital Form
// router.get('/addHospital', (req, res) => {
//     res.render('add-hospital');
// });


// Route to render the Hospital Form
router.get('/addHospital', isAuthenticated,(req, res) => {
    res.render('add-hospital');
});

router.post('/addHospital', async (req, res) => {
    const { hospital_code, hospital_name, site_code, site_name, address, city, state, country, zip } = req.body;

    try {
        let hospital = await Hospital.findOne({ hospital_code, hospital_name });

        if (hospital) {
            // Hospital exists, add the new site
            hospital.sites.push({ site_code, site_name, address, city, state, country, zip });
        } else {
            // Hospital does not exist, create a new hospital entry
            hospital = new Hospital({
                hospital_code,
                hospital_name,
                sites: [{ site_code, site_name, address, city, state, country, zip }]
            });
        }

        await hospital.save();
        req.flash('success', 'Hospital and sites added/updated successfully.');
        res.redirect(basePath + '/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to add/update hospital.');
        res.redirect(basePath + '/addHospital');
    }
});

// router.post('/login', (req, res) => {
//     const { username, password } = req.body;

//     const hardcodedUsername = process.env.HARDCODED_USERNAME;  // Use environment variable for hardcoded username
//     const hardcodedPassword = process.env.HARDCODED_PASSWORD;  // Use environment variable for hardcoded password

//     if (username !== hardcodedUsername && password !== hardcodedPassword) {
//         req.flash('error', 'Invalid username and password');
//     } else if (username !== hardcodedUsername) {
//         req.flash('error', 'Invalid username');
//     } else if (password !== hardcodedPassword) {
//         req.flash('error', 'Invalid password');
//     } else {
//         return res.redirect(basePath + '/dashboard');
//     }
//     res.redirect(basePath + '/');
// });


router.post('/login', (req, res) => {
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
        // Set the user object in the session upon successful login
        req.session.user = { username };

        // Redirect to the dashboard
        return res.redirect(basePath + '/dashboard');
    }

    // If login fails, redirect back to the login page
    res.redirect(basePath + '/');
});


// router.post('/addAdmin', async (req, res) => {
//     try {
//         const { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

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
//             return res.redirect(basePath + '/dashboard');
//         }

//         // Auto-generate the password
//         const randomNum = Math.floor(Math.random() * 90000) + 10000;
//         const password = `${siteCode}_${firstName.toLowerCase()}@${randomNum}`;

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

//         // Redirect to dashboard with decrypted password in query parameters
//         res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });



router.post('/addAdmin', isAuthenticated ,async (req, res) => {
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
            return res.redirect(basePath + '/dashboard');
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
        res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// router.get('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const admin = await Admin.findById(id).lean();
//         const hospitals = await Hospital.find().lean();

//         res.render('edit-admin', { admin, hospitals });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });



router.get('/editAdmin/:id', isAuthenticated,async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findById(id).lean();
        const hospitals = await Hospital.find().lean();

        res.render('edit-admin', { admin, hospitals });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/editAdmin/:id', async (req, res) => {
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
            return res.redirect(`${basePath}/editAdmin/${id}`);
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
            siteName,
            subscription,
            username,
            password: encryptedPassword  // Use encrypted password
        });

        // Redirect to the dashboard with the decrypted password in query parameters
        res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// router.get('/dashboard', async (req, res) => {
//     try {
//         const hospitals = await Hospital.find().lean();
//         const admins = await Admin.find().lean();
//         res.render('index', { hospitals, admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Protecting the dashboard route
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const hospitals = await Hospital.find().lean();
        const admins = await Admin.find().lean();
        res.render('index', { hospitals, admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/deleteAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Admin.findByIdAndDelete(id);

        // Fetch the updated list of admins and hospitals
        const admins = await Admin.find();
        const hospitals = await Hospital.find();

        // Render the index.ejs view with the updated data
        res.render('index', { admins, hospitals });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Mount the router at the base path
app.use(basePath, router);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});