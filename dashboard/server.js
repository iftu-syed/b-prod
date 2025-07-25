require('dotenv').config();  // Load .env file
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const crypto = require('crypto');
const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const Backend = require('i18next-fs-backend');
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

// Create an instance of express
const app = express();
const port = process.env.PORT || 4000; // Use PORT from .env, fallback to 4000

const startServer1 = require('./manage-doctors/app');
const startServer2 = require('./Survey-App/app');

// Start other servers
startServer1();
startServer2();


// Define the base path for superadmin
const basePath = '/hospitaladmin'; 
app.locals.basePath = basePath;
// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;

// Middleware for parsing JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session management with MongoDB store
app.use(session({
    secret: process.env.SESSION_SECRET,  // Use secret from .env
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    })
}));

// Flash middleware for displaying messages
app.use(flash());
app.use(cookieParser());
// Middleware to make flash messages available in views
app.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
        const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

        res.locals.lng = currentLanguage; // Set the language for EJS templates
        res.locals.dir = dir;             // Set the direction for EJS templates

        res.cookie('lng', currentLanguage); // Persist language in cookies
        req.language = currentLanguage;
        req.dir = dir;
    res.locals.messages = req.flash();
    next();
});

// Serve static files under the base path
//app.use(basePath, express.static(path.join(__dirname, 'public')));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

// Connect to MongoDB database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

  app.use('/hospitaladmin/locales', express.static(path.join(__dirname, 'views/locales')));;
  i18next
    .use(Backend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
      backend: {
        loadPath: path.join(__dirname, 'views/locales/{{lng}}/translation.json'),
      },
      fallbackLng: 'en',
      preload: ['en', 'ar'], // Supported languages
      detection: {
        order: ['querystring', 'cookie', 'header'],
        caches: ['cookie'],
      },
    });
    app.use(i18nextMiddleware.handle(i18next));
// Define schema for User
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,
    hospitalName: String,
    siteCode: String,  // Use siteCode as shown in your database
    subscription: String,
    loginCounter: { type: Number, default: 0 },  // Add loginCounter with default value of 0
    role: {
    type:   String,
    default: 'hospital_admin',
    immutable: true
  }
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

// Create Express Router
const router = express.Router();


// const MONGO_URI = process.env.MONGODB_URI;        // e.g. your Atlas URI
// const LOGS_DB    = 'Hospital_admin_logs';             // matches the DB name you created
// let accessColl, auditColl, errorColl;

// // immediately‐invoked async to set up the three collections
// (async function initHospitalAdminLogs() {
//   const client = new MongoClient(MONGO_URI, {
//     useNewUrlParser:    true,
//     useUnifiedTopology: true,
//   });
//   await client.connect();
  
//   const logsDb = client.db(LOGS_DB);
//   accessColl = logsDb.collection('access_logs');
//   auditColl  = logsDb.collection('audit_logs');
//   errorColl  = logsDb.collection('error_logs');
//   console.log('Connected to Hospital_admin_logs collections');
// })();

// const writeDbLog = async (type, data) => {
//   const entry = { ...data, timestamp: new Date().toISOString() };
//   switch (type) {
//     case 'access': return accessColl.insertOne(entry);
//     case 'audit':  return auditColl.insertOne(entry);
//     case 'error':  return errorColl.insertOne(entry);
//     default:       throw new Error(`Unknown log type: ${type}`);
//   }
// };

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 2) Map each type to its own file
const logFiles = {
  access: path.join(logsDir, 'access.log'),
  audit:  path.join(logsDir, 'audit.log'),
  error:  path.join(logsDir, 'error.log'),
};

function writeDbLog(type, data) {
  const timestamp = new Date().toISOString();
  const entry     = { ...data, timestamp };
  const filePath  = logFiles[type];

  if (!filePath) {
    return Promise.reject(new Error(`Unknown log type: ${type}`));
  }

  // Append a JSON line to the appropriate log file
  const line = JSON.stringify(entry) + '\n';
  return fs.promises.appendFile(filePath, line);
}
// Routes
// Home page route (for login)
router.get('/', async (req, res) => {
     const ip = req.ip;
     try {
         // Log page view as an access event
         await writeDbLog('access', {
             action: 'view_login_page',
             ip,
             lang: res.locals.lng
         });
     } catch (err) {
         console.error('Failed to write access log:', err);
     }
    res.render('index', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});

// Login route
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;
    // Find the admin user in MongoDB
    User.findOne({ username })
        .then(user => {
            if (!user) {
        // no such username
        writeDbLog('access', {
          action:        'login_failed_username',
          username,
          ip
        });
                req.flash('error', 'Invalid username or password');
                res.redirect(`${basePath}/`);
            } else {
                // Decrypt the password stored in the database
                const decryptedPassword = decrypt(user.password);

                // Compare the decrypted password with the one provided by the user
                if (decryptedPassword !== password) {
        writeDbLog('access', {
          action:        'login_failed_password',
          username,
          ip
        });
                    req.flash('error', 'Invalid username or password');
                    res.redirect(`${basePath}/`);
                } else if (user.subscription !== 'Active') {
        writeDbLog('access', {
          action:        'login_failed_inactive_subscription',
          username,
          hospital_code: user.hospital_code,
          ip
        });
                    req.flash('error', 'Your subscription is Inactive. Please contact WeHealthify Team for further details.');
                    res.redirect(`${basePath}/`);
                } else if (user.loginCounter === 0) {
        writeDbLog('access', {
          action:        'login_first_time',
          username,
          ip
        });
                    req.session.user = {
                        username: user.username,
                        hospital_code: user.hospital_code,
                        site_code: user.siteCode,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        hospitalName: user.hospitalName,
                        role: user.role
                    };
                    res.redirect(`${basePath}/reset-password`);
                } else {
                    // Increment loginCounter by 1 after a successful login
                    user.loginCounter += 1;
                    user.save()
                        .then(() => {
          writeDbLog('access', {
            action:        'login_success',
            username,
            hospital_code: user.hospital_code,
            ip
          });
                            req.session.user = {
                                username: user.username,
                                hospital_code: user.hospital_code,
                                site_code: user.siteCode,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                hospitalName: user.hospitalName,
                                role: user.role
                            };

                            res.redirect(`${basePath}/admin-dashboard`);
                        })
                        .catch(err => {
                            console.error('Error saving loginCounter:', err);
          writeDbLog('error', {
            action:   'login_increment_error',
            username,
            hospital_code: user.hospital_code,
            error:    err.message,
            stack:    err.stack,
            ip
          });
                            res.status(500).send('Internal Server Error');
                        });
                }
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
      writeDbLog('error', {
        action:   'login_exception',
        username,
        error:    err.message,
        stack:    err.stack,
        ip
      });
            res.status(500).send('Internal Server Error');
        });
});

// // Reset-password route
// router.get('/reset-password', (req, res) => {
//     res.render('reset-password', {
//         success_msg: req.flash('success'),
//         error_msg: req.flash('error'),
//         lng: res.locals.lng,
//         dir: res.locals.dir,
//     });
// });


router.get('/reset-password', checkAuth, (req, res) => {
   const ip = req.ip;
  // Ensure user session exists before accessing session variables
  if (!req.session.user) {
        writeDbLog('access', {
      action:        'reset_password_render_no_session',
      ip
    });
      console.error("User session is missing! Redirecting to login.");
      return res.redirect(`${basePath}/`); // Redirect to login if session is missing
  }

  // Extract user details from session
  const { firstName, lastName, hospital_code, site_code, hospitalName,username } = req.session.user;
    writeDbLog('access', {
    action:         'reset_password_render',
    username,
    hospital_code,
    site_code,
    ip
  });

  // Log values for debugging
  console.log("Rendering Reset Password Page with:");
  console.log("User:", req.session.user);

  if (!hospital_code) {
      console.error("Error: hospital_code is undefined in session!");
  }

  res.render('reset-password', { 
      success_msg: req.flash('success'),
      error_msg: req.flash('error'),
      firstName, 
      lastName, 
      hospital_code,  // ✅ Ensure this is passed to EJS
      site_code, 
      hospitalName, 
      lng: res.locals.lng, 
      dir: res.locals.dir 
  });
});

// Post request to update the password
router.post('/reset-password', (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const username = req.session.user.username;
    const ip = req.ip;

    if (newPassword !== confirmPassword) {
          writeDbLog('access', {
      action:   'reset_password_mismatch',
      username,
      ip
    });
        req.flash('error', 'Passwords do not match');
        return res.redirect(`${basePath}/reset-password`);
    }

      writeDbLog('access', {
    action:   'reset_password_attempt',
    username,
    ip
  });
    // Encrypt the new password
    const encryptedPassword = encrypt(newPassword);

    // Update the user's password and set loginCounter to 1
    User.findOneAndUpdate({ username }, { password: encryptedPassword, loginCounter: 1 })
        .then(() => {
                writeDbLog('access', {
        action:   'reset_password_success',
        username,
        ip
      });
            req.flash('success', 'Password updated successfully');

            // Save user info in session (if needed) and redirect to dashboard
            res.redirect(`${basePath}/admin-dashboard`);
        })
        .catch(err => {
            console.error('Error updating password:', err);
                  writeDbLog('error', {
        action:   'reset_password_failure',
        username,
        error:    err.message,
        stack:    err.stack,
        ip
      });
            req.flash('error', 'Internal Server Error');
            res.redirect(`${basePath}/reset-password`);
        });
});

// Middleware to check if user is authenticated
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect(`${basePath}/`);
    }
}

// Admin dashboard route
// router.get('/admin-dashboard', checkAuth, (req, res) => {
//     const { firstName, lastName, hospital_code, site_code, hospitalName } = req.session.user;
//     res.render('admin-dashboard', { firstName, lastName, hospital_code, site_code, hospitalName, lng: res.locals.lng, dir: res.locals.dir, });
// });

// code with logo update(auto pull based on the user login)


router.get('/admin-dashboard', checkAuth,async  (req, res) => {
  const ip = req.ip;
  const { firstName, lastName, hospital_code, site_code, hospitalName,username } = req.session.user;
    try {
    await writeDbLog('access', {
      action:        'view_admin_dashboard',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (err) {
    console.error('Failed to write admin-dashboard access log:', err);
  }
  res.render('admin-dashboard', { 
    firstName, 
    lastName, 
    hospital_code,    // <-- Make sure this is passed
    site_code, 
    hospitalName, 
    lng: res.locals.lng, 
    dir: res.locals.dir
  });
});

// Logout route
router.get('/logout', checkAuth, async (req, res) => {
  const ip = req.ip;
  const { username, hospital_code, site_code } = req.session.user;

  // Log the logout
  try {
    await writeDbLog('access', {
      action:        'logout',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (err) {
    console.error('Failed to write logout log:', err);
  }

  // Destroy session and redirect
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect(`${basePath}/`);
  });
});

// Route for managing doctors
router.get('/manage-doctors', checkAuth, (req, res) => {
    res.redirect('https://app.wehealthify.org:4010');
});

// Route for managing surveys
router.get('/Survey-App', checkAuth, (req, res) => {
    res.redirect('https://app.wehealthify.org:4050');
});

// Route for viewing reports
// router.get('/view-report', checkAuth, (req, res) => {
//     const { firstName, lastName, hospitalName, site_code } = req.session.user;
//     res.render('view-report', { firstName, lastName, hospitalName, site_code,lng: res.locals.lng, dir: res.locals.dir, });
// });

//This is performance dashboard code....


// // MongoDB connection setup
// mongoose.connect('mongodb+srv://admin:admin@cluster0.d3ycy.mongodb.net/dashboards', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function () {
//     console.log("Connected to proms_data");
// });


const secondaryConnection = mongoose.createConnection('mongodb+srv://admin:admin@cluster0.d3ycy.mongodb.net/dashboards', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = secondaryConnection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Connected to proms_data");
});


// //get route of performance dashboard
// router.get('/perf-dashboard', checkAuth, (req, res) => {
//     const { firstName, lastName, hospitalName, site_code } = req.session.user;
//     res.render('perf_dashboard', { firstName, lastName, hospitalName, site_code, lng: res.locals.lng, dir: res.locals.dir });
// });

router.get('/perf-dashboard', checkAuth, async (req, res) => {
  // Ensure user session exists before accessing session variables
  if (!req.session.user) {
      console.error("User session is missing! Redirecting to login.");
      return res.redirect(`${basePath}/`); // Redirect to login if session is missing
  }

  // Extract user details from session
  const { firstName, lastName, hospital_code, site_code, hospitalName,username } = req.session.user;
   const ip = req.ip;
     try {
    await writeDbLog('access', {
      action:        'view_perf_dashboard',
      username,
      hospital_code,
      site_code,
      ip
    });
  } catch (err) {
    console.error('Failed to write perf-dashboard access log:', err);
  }
  res.render('perf_dashboard', { 
      firstName, 
      lastName, 
      hospital_code,  // ✅ Ensure this is passed to EJS
      site_code, 
      hospitalName, 
      lng: res.locals.lng, 
      dir: res.locals.dir 
  });
});


router.get('/api/top-doc',async (req, res) => {
    try {
        const collection = db.collection('proms_data');
  
        // Aggregation pipeline to get the total numbers
        const aggregationPipeline = [
            {
              $group: {
                _id: {
                  doctorId: "$doctorId",
                  doctorName: "$doctorName",
                  surveyType: "$surveyType",
                  siteName: "$siteName"
                },
                totalPatients: { $sum: 1 }, // Count total patients per doctor and survey type
                patientsAchievedMCID: {
                  $sum: {
                    $cond: [
                      { $gte: ["$score", { $add: ["$mcid", 0] }] }, // Check if score >= MCID
                      1,
                      0
                    ]
                  }
                }
              }
            },
            
            {
              $addFields: {
                mcidPercentage: {
                  $multiply: [
                    { $divide: ["$patientsAchievedMCID", "$totalPatients"] },
                    100
                  ]
                }
              }
            },
            {
                $addFields: {
                  mcidPercentage: { $round: ["$mcidPercentage", 2] } // Round to two decimal places
                }
            },
          
            {
              $sort: { mcidPercentage: -1 }
            },
          
            {
              $limit: 5
            },
            {
              $project: {
                _id: 0,
                doctorId: "$_id.doctorId",
                doctorName: "$_id.doctorName",
                surveyType: "$_id.surveyType",
                siteName:"$_id.siteName",
                totalPatients: 1,
                patientsAchievedMCID: 1,
                mcidPercentage: 1
              }
            }
        ];
  
        // Execute the aggregation and send the result
        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching summary data:", error);
        res.status(500).json({ message: "Error fetching top Doctors data" });
    }
  });

router.get('/api/bottom-doc',async (req, res) => {
try {
    const collection = db.collection('proms_data');

    // Aggregation pipeline to get the total numbers
    const aggregationPipeline = [
        {
          $group: {
            _id: {
              doctorId: "$doctorId",
              doctorName: "$doctorName",
              surveyType: "$surveyType",
              siteName: "$siteName"
            },
            totalPatients: { $sum: 1 }, // Count total patients per doctor and survey type
            patientsAchievedMCID: {
              $sum: {
                $cond: [
                  { $gte: ["$score", { $add: ["$mcid", 0] }] }, // Check if score >= MCID
                  1,
                  0
                ]
              }
            }
          }
        },
        
        {
          $addFields: {
            mcidPercentage: {
              $multiply: [
                { $divide: ["$patientsAchievedMCID", "$totalPatients"] },
                100
              ]
            }
          }
        },
        {
            $addFields: {
              mcidPercentage: { $round: ["$mcidPercentage", 2] } // Round to two decimal places
            }
        },
      
        {
          $sort: { mcidPercentage: 1 } // Change sorting order to ascending
        },
      
        {
          $limit: 5
        },
        {
          $project: {
            _id: 0,
            doctorId: "$_id.doctorId",
            doctorName: "$_id.doctorName",
            surveyType: "$_id.surveyType",
            siteName: "$_id.siteName",
            totalPatients: 1,
            patientsAchievedMCID: 1,
            mcidPercentage: 1
          }
        }
      ];

    // Execute the aggregation and send the result
    const results = await collection.aggregate(aggregationPipeline).toArray();
    res.json(results);
} catch (error) {
    console.error("Error fetching bottom doc data:", error);
    res.status(500).json({ message: "Error fetching bottom doc data" });
}
});

router.get("/api/treemap-data", async (req, res) => {
  try {
    const collection = db.collection('proms_data'); // Ensure the collection name is correct
    const aggregationPipeline = [
      {
        $group: {
          _id: {
            siteName: "$siteName",
            departmentName: "$departmentName",
            diagnosisICD10: "$diagnosisICD10",
          },
          patientCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            siteName: "$_id.siteName",
            departmentName: "$_id.departmentName",
          },
          children: {
            $push: {
              name: "$_id.diagnosisICD10",
              value: "$patientCount",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.siteName",
          children: {
            $push: {
              name: "$_id.departmentName",
              children: "$children",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          children: 1,
        },
      },
    ];

    const results = await collection.aggregate(aggregationPipeline).toArray();
    res.json({ name: "Sites", children: results });
  } catch (err) {
    console.error("Error fetching treemap data:", err);
    res.status(500).send({ error: err.message });
  }
});

// API routes
router.get('/api/summary', async (req, res) => {
  try {
      const collection = db.collection('proms_data');

      const aggregationPipeline = [
          {
              $group: {
                  _id: null,
                  totalPatientsRegistered: { $sum: 1 },
                  totalSurveysSent: { $sum: { $cond: [{ $ifNull: ["$surveySentDate", false] }, 1, 0] } },
                  totalSurveysCompleted: { $sum: { $cond: [{ $ifNull: ["$score", false] }, 1, 0] } }
              }
          },
          {
              $project: {
                  _id: 0,
                  totalPatientsRegistered: 1,
                  totalSurveysSent: 1,
                  totalSurveysCompleted: 1,
                  surveyResponseRate: {
                      $multiply: [
                          { $cond: [{ $eq: ["$totalSurveysSent", 0] }, 0, { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }] },
                          100
                      ]
                  }
              }
          }
      ];

      const results = await collection.aggregate(aggregationPipeline).toArray();
      const summaryData = results[0];
      res.json(summaryData);
  } catch (error) {
      console.error("Error fetching summary data:", error);
      res.status(500).json({ message: "Error fetching summary data" });
  }
});

router.get('/api/response-rate-time-series', async (req, res) => {
  try {
      const collection = db.collection('proms_data');

      const aggregationPipeline = [
          { $match: { surveySentDate: { $exists: true } } },
          {
              $addFields: {
                  monthYear: { $dateToString: { format: "%Y-%m", date: "$surveySentDate" } },
                  isCompleted: { $cond: [{ $ifNull: ["$surveyReceivedDate", false] }, 1, 0] }
              }
          },
          {
              $group: {
                  _id: "$monthYear",
                  totalSurveysSent: { $sum: 1 },
                  totalSurveysCompleted: { $sum: "$isCompleted" }
              }
          },
          {
              $project: {
                  _id: 0,
                  monthYear: "$_id",
                  responseRate: {
                      $cond: [
                          { $eq: ["$totalSurveysSent", 0] },
                          0,
                          { $multiply: [{ $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }, 100] }
                      ]
                  }
              }
          },
          { $sort: { monthYear: 1 } }
      ];

      const results = await collection.aggregate(aggregationPipeline).toArray();
      res.json(results);
  } catch (error) {
      console.error("Error fetching time series response rate data:", error);
      res.status(500).json({ message: "Error fetching data" });
  }
});




// Route for editing profile
router.get('/edit-profile', checkAuth, (req, res) => {
    res.send('Edit Profile page');
});

const PUBLIC_DIR=path.join(__dirname, '..', 'frontend', 'build');


app.get('/api-hospital/me', checkAuth, (req, res) => {
  const user = req.session.user;
  res.set('Cache-Control', 'no-store');
  res.json({
    role: user.role,
  });
});

app.get(
  '/admin/Dashboard/:hospital_code/:site_code/*',   
  checkAuth,                                        
  (req, res, next) => {
    if (req.session.user && !req.session.user.role) {
      req.session.user.role = 'hospital_admin';
    }
    next();
  },
  (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
);



// Mount the router with the base path
app.use(basePath, router);
app.use(`${basePath}`, express.static(path.join(__dirname, 'public')));



app.listen(port, () => {
    console.log(`Server is running on https://app.wehealthify.org${basePath}`);
});
