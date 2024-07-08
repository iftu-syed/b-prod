

// // Required modules
// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const bodyParser = require('body-parser');

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
//     username: String,
//     password: String,
//     hospital: String,
//     subscription: String
// });

// // Create a model based on the schema
// const User = mongoose.model('User', userSchema);

// // Home page route
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Login route
// app.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     // Find admin user in MongoDB
//     User.findOne({ username, password })
//         .then(user => {
//             if (!user) {
//                 res.status(401).send('Invalid username or password');
//             } else {
//                 // Redirect to dashboard with hospital as query parameter
//                 res.redirect(`/admin-dashboard?hospital=${user.hospital}`);
//             }
//         })
//         .catch(err => {
//             console.error('Error finding user:', err);
//             res.status(500).send('Internal Server Error');
//         });
// });

// // Admin dashboard route
// app.get('/admin-dashboard', (req, res) => {
//     const hospital = req.query.hospital;
//     res.render('admin-dashboard', { hospital: hospital });
// });

// // Logout route
// app.post('/logout', (req, res) => {
//     res.redirect('/');
// });

// // Route to handle form submission for adding a user
// app.post('/addUser', async (req, res) => {
//     try {
//         const { username, password, hospital, subscription } = req.body;
//         const newUser = new User({ username, password, hospital, subscription });
//         await newUser.save();
//         res.redirect('/success.html');
//     } catch (error) {
//         console.error('Error adding user:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Route for managing doctors
// app.get('/manage-doctors', (req, res) => {
//     const hospital = req.query.hospital;
//     res.redirect(`http://localhost:4010?hospital=${hospital}`); // Pass hospital as query parameter
// });

// app.get('/Survey-App', (req, res) => {
//     res.redirect('http://localhost:4050');
// });

// // Route for managing surveys
// app.get('/manage-surveys', (req, res) => {
//     res.redirect('http://localhost:4050');
// });

// // View Report route
// app.get('/view-report', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'view-report.html'));
// });

// // Route for editing profile
// app.get('/edit-profile', (req, res) => {
//     res.send('Edit Profile page');
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });





//new code with sessions


// Required modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

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

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/adminUser' })
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

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
});

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
                // Save user info in session
                req.session.user = user;
                res.redirect('/admin-dashboard');
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

// Admin dashboard route
app.get('/admin-dashboard', checkAuth, (req, res) => {
    const hospital = req.session.user.hospital;
    res.render('admin-dashboard', { hospital: hospital });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(); // Destroy the session
    res.redirect('/');
});

// Route to handle form submission for adding a user
app.post('/addUser', async (req, res) => {
    try {
        const { username, password, hospital, subscription } = req.body;
        const newUser = new User({ username, password, hospital, subscription });
        await newUser.save();
        res.redirect('/success.html');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal Server Error');
    }
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

// View Report route
app.get('/view-report', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-report.html'));
});

// Route for editing profile
app.get('/edit-profile', checkAuth, (req, res) => {
    res.send('Edit Profile page');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
