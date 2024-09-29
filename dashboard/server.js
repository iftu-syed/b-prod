// //new code with sessions


// // Required modules
// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const flash = require('connect-flash');

// const app = express();
// const port = 4000; // Change the port as needed

// const startServer1 = require('./manage-doctors/app');
// const startServer2 = require('./Survey-App/app');
// const startServer3 = require('./Survey_names/app');

// startServer1();
// startServer2();
// startServer3();

// // Middleware for parsing JSON and form data
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Session setup
// app.use(session({
//     secret: 'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/adminUser' })
// }));


// // After the session middleware
// app.use(flash());

// // Middleware to make flash messages available in views
// app.use((req, res, next) => {
//     res.locals.messages = req.flash();
//     next();
// });

// // Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));

// // Set EJS as templating engine
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly


// // Connect to MongoDB database
// mongoose.connect('mongodb://localhost:27017/adminUser', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => console.log('MongoDB connected'))
//   .catch(err => console.error('Error connecting to MongoDB:', err));


// // Define schema for User
// const userSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     username: String,
//     password: String,
//     hospital_code: String,
//     hospitalName: String,
//     siteCode: String,  // Use siteCode as shown in your database
//     subscription: String
// });


// // Create a model based on the schema
// const User = mongoose.model('User', userSchema);

// // Home page route
// // Home page route
// app.get('/', (req, res) => {
//     res.render('index');
// });



// app.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     // Find admin user in MongoDB
//     User.findOne({ username, password })
//         .then(user => {
//             if (!user) {
//                 req.flash('error', 'Invalid username or password');
//                 res.redirect('/');
//             } else if (user.subscription !== 'Active') {
//                 req.flash('error', 'Your subscription is Inactive. Please contact WeHealthify Team for further details.');
//                 res.redirect('/');
//             } else {
//                 // Save user info in session
//                 req.session.user = {
//                     username: user.username,
//                     hospital_code: user.hospital_code,
//                     site_code: user.siteCode,
//                     firstName: user.firstName,  // Add firstName to session
//                     lastName: user.lastName,    // Add lastName to session
//                     hospitalName: user.hospitalName // Add hospitalName to session
//                 };
                
//                 res.redirect('/admin-dashboard');
//             }
//         })
//         .catch(err => {
//             console.error('Error finding user:', err);
//             res.status(500).send('Internal Server Error');
//         });
// });


// // Middleware to check if user is authenticated
// function checkAuth(req, res, next) {
//     if (req.session.user) {
//         next();
//     } else {
//         res.redirect('/');
//     }
// }

// app.get('/admin-dashboard', checkAuth, (req, res) => {
//     const { firstName, lastName, hospital_code, site_code, hospitalName } = req.session.user;
//     res.render('admin-dashboard', { firstName, lastName, hospital_code, site_code, hospitalName });
// });

// // Logout route
// app.post('/logout', (req, res) => {
//     req.session.destroy(); // Destroy the session
//     res.redirect('/');
// });


// // Route for managing doctors
// app.get('/manage-doctors', checkAuth, (req, res) => {
//     res.redirect('http://localhost:4010');
// });

// app.get('/Survey-App', checkAuth, (req, res) => {
//     res.redirect('http://localhost:4050');
// });

// // Route for managing surveys
// app.get('/manage-surveys', checkAuth, (req, res) => {
//     res.redirect('http://localhost:4050');
// });

// app.get('/view-report', checkAuth, (req, res) => {
//     const { firstName, lastName, hospitalName, site_code } = req.session.user;
//     res.render('view-report', { firstName, lastName, hospitalName, site_code });
// });


// // Route for editing profile
// app.get('/edit-profile', checkAuth, (req, res) => {
//     res.send('Edit Profile page');
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });












// Required modules
require('dotenv').config();  // Load .env file
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const crypto = require('crypto');

// AES-256 encryption key and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 characters (256 bits)
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to encrypt the password
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper function to decrypt the password
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}


const app = express();
const port = process.env.PORT || 4000; // Use PORT from .env, fallback to 4000

const startServer1 = require('./manage-doctors/app');
const startServer2 = require('./Survey-App/app');
const startServer3 = require('./Survey_names/app');

startServer1();
startServer2();
startServer3();

// Middleware for parsing JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// // Session setup
// app.use(session({
//     secret: process.env.SESSION_SECRET,  // Use SESSION_SECRET from .env
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })  // Use MONGODB_URI from .env
// }));

app.use(session({
    secret: process.env.SESSION_SECRET,  // Use secret from .env
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/adminUser' // Fallback if .env is missing
    })
}));

// After the session middleware
app.use(flash());

// Middleware to make flash messages available in views
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

// Connect to MongoDB database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define schema for User
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,
    hospitalName: String,
    siteCode: String,  // Use siteCode as shown in your database
    subscription: String
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

// Home page route
app.get('/', (req, res) => {
    res.render('index');
});

// app.post('/login', (req, res) => {

//     const { username, password } = req.body;
//     // Find admin user in MongoDB
//     User.findOne({ username, password })
//         .then(user => {
//             if (!user) {
//                 req.flash('error', 'Invalid username or password');
//                 res.redirect('/');
//             } else if (user.subscription !== 'Active') {
//                 req.flash('error', 'Your subscription is Inactive. Please contact WeHealthify Team for further details.');
//                 res.redirect('/');
//             } else {
//                 // Save user info in session
//                 req.session.user = {
//                     username: user.username,
//                     hospital_code: user.hospital_code,
//                     site_code: user.siteCode,
//                     firstName: user.firstName,  // Add firstName to session
//                     lastName: user.lastName,    // Add lastName to session
//                     hospitalName: user.hospitalName // Add hospitalName to session
//                 };
                
//                 res.redirect('/admin-dashboard');
//             }
//         })
//         .catch(err => {
//             console.error('Error finding user:', err);
//             res.status(500).send('Internal Server Error');
//         });
// });


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Find the admin user in MongoDB
    User.findOne({ username })
        .then(user => {
            if (!user) {
                req.flash('error', 'Invalid username or password');
                res.redirect('/');
            } else {
                // Decrypt the password stored in the database
                const decryptedPassword = decrypt(user.password);

                // Compare the decrypted password with the one provided by the user
                if (decryptedPassword !== password) {
                    req.flash('error', 'Invalid username or password');
                    res.redirect('/');
                } else if (user.subscription !== 'Active') {
                    req.flash('error', 'Your subscription is Inactive. Please contact WeHealthify Team for further details.');
                    res.redirect('/');
                } else {
                    // Save user info in session
                    req.session.user = {
                        username: user.username,
                        hospital_code: user.hospital_code,
                        site_code: user.siteCode,
                        firstName: user.firstName,  // Add firstName to session
                        lastName: user.lastName,    // Add lastName to session
                        hospitalName: user.hospitalName // Add hospitalName to session
                    };

                    res.redirect('/admin-dashboard');
                }
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send('Internal Server Error');
        });
});

// Middleware to check if user is authenticated
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

app.get('/admin-dashboard', checkAuth, (req, res) => {
    const { firstName, lastName, hospital_code, site_code, hospitalName } = req.session.user;
    res.render('admin-dashboard', { firstName, lastName, hospital_code, site_code, hospitalName });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(); // Destroy the session
    res.redirect('/');
});

// Route for managing doctors
app.get('/manage-doctors', checkAuth, (req, res) => {
    res.redirect('http://localhost:4010');
});

app.get('/Survey-App', checkAuth, (req, res) => {
    res.redirect('http://localhost:4050');
});

// Route for managing surveys
app.get('/manage-surveys', checkAuth, (req, res) => {
    res.redirect('http://localhost:4050');
});

app.get('/view-report', checkAuth, (req, res) => {
    const { firstName, lastName, hospitalName, site_code } = req.session.user;
    res.render('view-report', { firstName, lastName, hospitalName, site_code });
});

// Route for editing profile
app.get('/edit-profile', checkAuth, (req, res) => {
    res.send('Edit Profile page');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
