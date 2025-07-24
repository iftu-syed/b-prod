const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();  // Load environment variables
const crypto = require('crypto');
const session = require('express-session');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo'); // Import connect-mongo
const axios = require('axios');

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;


// Define the base path
const basePath = '/superadmin';
app.locals.basePath = basePath;
const path = require('path');
const fs = require('fs');
// function writeLog(logFile, logData) {
//     const logDir = path.join(__dirname, 'logs');



//     // Check if the 'logs' folder exists, create it if it doesn't
//     if (!fs.existsSync(logDir)) {
//         fs.mkdirSync(logDir);
//     }
//     const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0]; // Formatting the timestamp
//     const logMessage = `${timestamp} | ${logData}\n`;
//     // Now append the log data to the file
//     fs.appendFile(path.join(logDir, logFile), logMessage, (err) => {
//         if (err) {
//             console.error('Error writing to log file:', err);
//         }
//     });
// }

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
const manageDoctorsConnection = mongoose.createConnection(process.env.MONGO_URI_DOCTORS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});




// ADD THIS NEW CONNECTION
const backupDbConnection = mongoose.createConnection(process.env.MONGO_URI_BACKUP, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
backupDbConnection.on('connected', () => console.log('Successfully connected to BackUp MongoDB.'));
backupDbConnection.on('error', (err) => console.error('Backup MongoDB connection error:', err));


const doctorSchema = new mongoose.Schema({
    username: String
    // Add other fields as needed
});

const staffSchema = new mongoose.Schema({
    username: String
    // Add other fields as needed
});

const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,
    hospitalName: String,
    siteCode: String,
    siteName: String,
    role: {
    type:   String,
    default: 'hospital_admin',
    immutable: true
  },
    subscription: { type: String, enum: ['Active', 'Inactive'] },
    loginCounter: { type: Number, default: 0 }  // Add this line
});

const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

const Doctor = manageDoctorsConnection.model('Doctor', doctorSchema);
const Staff = manageDoctorsConnection.model('Staff', staffSchema);

const siteSchema = new mongoose.Schema({
    site_code: String,
    site_name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    notification_preference: String
});

const hospitalSchema = new mongoose.Schema({
    hospital_code: { type: String, required: true, unique: true },
    hospital_name: { type: String, required: true },
    sites: [siteSchema]
});

const Hospital = mongoose.model('Hospital', hospitalSchema);



// ADD THE NEW SCHEMA AND MODEL FOR WHATSAPP LOGS
const whatsAppLogSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using date "YYYY-MM-DD" as the unique ID
    analytics: mongoose.Schema.Types.Mixed,
    members: [mongoose.Schema.Types.Mixed],
    pagination: mongoose.Schema.Types.Mixed,
    lastUpdatedAt: { type: Date, default: Date.now }
});

// Create the model from the backupDbConnection
const WhatsAppLog = backupDbConnection.model('WhatsAppLog', whatsAppLogSchema);


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
        // writeLog('user_activity_logs.txt', `Severity: INFO | Event: Authenticated Access | Action: User ${req.session.user.username} accessed protected route`);
        // If the session exists, proceed to the next middleware or route
        return next();
    } else {
        // writeLog('user_activity_logs.txt', `Severity: WARNING | Event: Unauthenticated Access | Action: User attempted to access protected route without being logged in`);
        // If no session exists, redirect to the login page with an error message
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect(basePath + '/');
    }
}

app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Create an Express Router
const router = express.Router();




let apiAccessToken = null;



// THIS IS THE NEW, CORRECTED FUNCTION
async function getNewAccessToken() {
    try {
        // CORRECTED: The endpoint path is /services/wh_fetch_token, not /sal/services/...
        const response = await axios.get(`${process.env.WH_API_BASE_URL}/services/wh_fetch_token`, {
            headers: {
                'clientId': process.env.WH_CLIENT_ID,
                'secret': process.env.WH_SECRET
            }
        });

        // CORRECTED: The token is located in response.data.data.access_token
        if (response.data && response.data.data && response.data.data.access_token) {
            console.log('Successfully fetched new API access token.');
            apiAccessToken = response.data.data.access_token; // Corrected path
            return apiAccessToken;
        } else {
            console.error('Unexpected token response structure:', response.data);
            throw new Error('Could not find access_token in API response.');
        }
    } catch (error) {
        console.error('Error fetching API access token:', error.response ? error.response.data : error.message);
        apiAccessToken = null; // Reset token on failure
        throw error; // Re-throw the error to be handled by the route
    }
}




// REPLACE the existing '/whatsapp-logs' route with this new one
router.get('/whatsapp-logs', isAuthenticated, async (req, res) => {
    // Determine the date to display: either from the query parameter or default to today's date.
    const displayDate = req.query.date || new Date().toISOString().split('T')[0];
    const page = req.query.page || 1;
    // An explicit fetch action happens only when a 'date' is present in the URL query.
    const isFetchAction = !!req.query.date;
    let apiError = null; // To hold potential, non-critical API error messages

    try {
        // --- Step 1: If this is an explicit fetch, update the DB from the API first ---
        if (isFetchAction) {
            try {
                if (!apiAccessToken) {
                    await getNewAccessToken();
                }

                const analyticsResponse = await axios.post(
                    `${process.env.WH_API_BASE_URL}/services/wh_fetch_member_analytics?date=${displayDate}&page=${page}`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${apiAccessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                const apiData = analyticsResponse.data.data;

                const query = { _id: displayDate };
                const updateData = {
                    analytics: apiData.analytics,
                    members: apiData.members,
                    pagination: apiData.pagination,
                    lastUpdatedAt: new Date()
                };
                await WhatsAppLog.updateOne(query, { $set: updateData }, { upsert: true });
                console.log(`Successfully upserted log data for date: ${displayDate}`);

            } catch (fetchError) {
                // Handle token errors specifically: try to refresh and redirect
                if (fetchError.response && (fetchError.response.status === 401 || fetchError.response.status === 403)) {
                    console.log('Token might be expired or invalid. Attempting to fetch a new one.');
                    await getNewAccessToken();
                    return res.redirect(`${basePath}/whatsapp-logs?date=${displayDate}&page=${page}`);
                }
                // For other API errors, set a message and continue to show data from DB
                console.error('API Error during fetch action:', fetchError.message);
                apiError = 'Could not fetch latest data from API; showing last known backup.';
            }
        }

        // --- Step 2: Always read from the local database to render the page ---
        const dataFromDb = await WhatsAppLog.findById(displayDate).lean();

        // --- Step 3: Render the view ---
        res.render('whatsapp-logs', {
            data: dataFromDb,
            date: displayDate,
            page: page,
            error: apiError // Pass any API error message to the view
        });

    } catch (error) {
        // This is a catch-all for database connection errors or other unexpected issues.
        console.error('Unhandled Error on /whatsapp-logs route:', error);
        res.render('whatsapp-logs', {
            data: null,
            date: displayDate,
            page: page,
            error: 'An unexpected error occurred while accessing the database.'
        });
    }
});


// REPLACE your existing fetchAndStoreLogsForDate function with this complete, improved version.
async function fetchAndStoreLogsForDate(date) {
    if (!apiAccessToken) {
        console.log('No initial token, fetching a new one.');
        await getNewAccessToken();
    }

    const executeFetch = async () => {
        // Step 1: Fetch the first page to get pagination details
        const initialResponse = await axios.post(
            `${process.env.WH_API_BASE_URL}/services/wh_fetch_member_analytics?date=${date}&page=1`,
            {},
            { headers: { 'Authorization': `Bearer ${apiAccessToken}`, 'Content-Type': 'application/json' } }
        );

        const initialData = initialResponse.data.data;
        // If the API returns no data for this date, stop here.
        if (!initialData || !initialData.pagination) {
            console.log(`No data or pagination info for date: ${date}. Skipping.`);
            // Still, we should save an empty record so we don't try fetching it again needlessly.
            await WhatsAppLog.updateOne(
                { _id: date },
                { $set: { analytics: {}, members: [], pagination: {}, lastUpdatedAt: new Date() }},
                { upsert: true }
            );
            return;
        }

        const totalPages = parseInt(initialData.pagination.total_pages || '1', 10);
        let allMembers = initialData.members || [];

        // Step 2: If there are more pages, fetch them all in parallel
        if (totalPages > 1) {
            console.log(`Fetching ${totalPages} pages for date: ${date}`);
            const pagePromises = [];
            for (let page = 2; page <= totalPages; page++) {
                pagePromises.push(
                    axios.post(
                        `${process.env.WH_API_BASE_URL}/services/wh_fetch_member_analytics?date=${date}&page=${page}`,
                        {},
                        { headers: { 'Authorization': `Bearer ${apiAccessToken}`, 'Content-Type': 'application/json' } }
                    )
                );
            }
            const pageResults = await Promise.all(pagePromises);
            // Combine the 'members' from all the additional pages
            const additionalMembers = pageResults.flatMap(result => result.data.data.members || []);
            allMembers = allMembers.concat(additionalMembers);
        }

        // Step 3: Save the complete, combined data to the database
        await WhatsAppLog.updateOne(
            { _id: date },
            { $set: {
                analytics: initialData.analytics, // Analytics from page 1 is for the whole day
                members: allMembers,             // The complete list of all members from all pages
                pagination: {                    // Update pagination to reflect the fully fetched state
                    total_records: allMembers.length,
                    records_per_page: allMembers.length,
                    current_page: 1,
                    total_pages: 1
                },
                lastUpdatedAt: new Date()
            }},
            { upsert: true }
        );
        console.log(`Successfully fetched and stored ${allMembers.length} total members for: ${date}`);
    };

    try {
        await executeFetch();
    } catch (error) {
        // If the token is expired, get a new one and retry the entire fetch process ONCE.
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log(`Token expired for date ${date}. Refreshing and retrying...`);
            await getNewAccessToken(); // Refresh the token
            await executeFetch();      // Retry the entire multi-page fetch
            return;
        }
        // For any other kind of error, log it and throw it.
        console.error(`Failed to fetch all pages for ${date}:`, error.message);
        throw new Error(`Could not fetch all data for ${date}.`);
    }
}



// REPLACE your existing '/aggregate-logs' route with this new version.
router.get('/aggregate-logs', isAuthenticated, async (req, res) => {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const RECORDS_PER_PAGE = 300; // You can adjust this value
    let viewData = null;
    let queryError = null;

    if (startDate && endDate) {
        try {
            // --- Step 1: Fetch and update the DB for the entire date range ---
            const datePromises = [];
            let currentDate = new Date(startDate);
            const lastDate = new Date(endDate);
            
            while (currentDate <= lastDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                datePromises.push(fetchAndStoreLogsForDate(dateString));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            await Promise.all(datePromises);
            console.log("All dates in the range have been updated from the API.");

            // --- Step 2: Aggregate analytics AND combine all members ---
            const logs = await WhatsAppLog.find({ _id: { $gte: startDate, $lte: endDate } }).lean();

            if (logs.length > 0) {
                // a) Calculate aggregated analytics
                const aggregatedAnalytics = {
                    total_records: 0, sent_count: 0, delivered_count: 0,
                    read_count: 0, failed_count: 0, undelivered_count: 0
                };
                logs.forEach(log => {
                    Object.keys(aggregatedAnalytics).forEach(key => {
                        aggregatedAnalytics[key] += parseInt(log.analytics[key] || 0, 10);
                    });
                });

                // b) Combine all member arrays into one large array
                const allMembers = logs.flatMap(log => log.members);

                // c) Paginate the combined member list
                const totalRecords = allMembers.length;
                const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);
                const startIndex = (page - 1) * RECORDS_PER_PAGE;
                const endIndex = startIndex + RECORDS_PER_PAGE;
                const paginatedMembers = allMembers.slice(startIndex, endIndex);

                // d) Prepare the data object for the view
                viewData = {
                    analytics: aggregatedAnalytics,
                    members: paginatedMembers,
                    pagination: {
                        total_records: totalRecords,
                        records_per_page: RECORDS_PER_PAGE,
                        current_page: page,
                        total_pages: totalPages
                    }
                };
            }

        } catch (error) {
            console.error('Error during aggregate fetch/process:', error);
            queryError = 'Failed to update or process data. Aggregates may be incomplete.';
        }
    }

    res.render('aggregate-logs', {
        data: viewData,
        startDate: startDate || '',
        endDate: endDate || '',
        page: page,
        error: queryError
    });
});


// Routes
router.get('/', (req, res) => {
      writeDbLog('access', {
    action: 'view_super_admin_login',
    ip:     req.ip
  });
    res.render('login');
});

// Logout Route
router.get('/logout', isAuthenticated, (req, res) => {
    //console.log("Hi");
    const username = req.session?.user?.username || 'Unknown';
      const ip = req.ip;
    // Set the flash message before destroying the session
      writeDbLog('access', {
    action:   'super_admin_logout',
    username,
    ip
  });
    req.flash('success', 'You have been logged out.');
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session during logout', err);
                  writeDbLog('error', {
        action:   'super_admin_logout_error',
        username,
        message:  err.message,
        stack:    err.stack,
        ip
      });
            req.flash('error', 'Failed to log out. Please try again.');
            return res.redirect(basePath + '/dashboard');
        }
        // Clear the cookie and redirect to the login page
        res.clearCookie('connect.sid'); // Optional: Clears the session cookie
        //console.log("in here",req.session.user.username);
        res.redirect(basePath + '/');
    });
});

// // Route to render the Hospital Form
// router.get('/addHospital', (req, res) => {
//     res.render('add-hospital');
// });


router.post('/deleteSite', isAuthenticated, async (req, res) => {
    const { hospitalId, siteId } = req.body;
        const username = req.session.user.username;
    const ip = req.ip;
  
    try {
      await Hospital.updateOne(
        { _id: hospitalId },
        { $pull: { sites: { _id: siteId } } }
      );
      console.log(`✅ Deleted site ${siteId} from hospital ${hospitalId}`);
              writeDbLog('access', {
            action:     'delete_site',
            username,
            hospitalId,
            siteId,
            ip
        });
      res.redirect('/superadmin/addHospital');
    } catch (error) {
      console.error('❌ Error deleting site:', error);
              writeDbLog('error', {
            action:     'delete_site_error',
            username,
            hospitalId,
            siteId,
            message:    error.message,
            stack:      error.stack,
            ip
        });
      res.status(500).send('Error deleting site');
    }
  });

  router.post('/updateSite', isAuthenticated, async (req, res) => {
    const { hospitalId, siteId, site_code, site_name, address, city, state, country, zip, notification_preference } = req.body;
    const username = req.session.user.username;
    const ip = req.ip;
  
    try {
        console.log("in updateSite");
      const result = await Hospital.updateOne(
        { _id: hospitalId, "sites._id": siteId },
        {
          $set: {
            "sites.$.site_code": site_code,
            "sites.$.site_name": site_name,
            "sites.$.address": address,
            "sites.$.city": city,
            "sites.$.state": state,
            "sites.$.country": country,
            "sites.$.zip": zip,
            "sites.$.notification_preference": notification_preference
          }
        }
      );
      console.log("result",result);
          writeDbLog('access', {
      action:                 'update_site',
      username,
      hospitalId,
      siteId,
      updatedFields: {
        site_code,
        site_name,
        address,
        city,
        state,
        country,
        zip,
        notification_preference
      },
      ip
    });
  
      console.log(`✅ Site ${siteId} updated in hospital ${hospitalId}`);
      //res.redirect('/superadmin/addHospital');
      return res.redirect(basePath + '/addHospital');
    } catch (err) {
      console.error("❌ Error updating site:", err);
          writeDbLog('error', {
      action:     'update_site_error',
      username,
      hospitalId,
      siteId,
      message:    err.message,
      stack:      err.stack,
      ip
    });
      res.status(500).send('Update failed');
    }
  });
    


  router.get('/addHospital', isAuthenticated, async (req, res) => {
      const username = req.session.user.username;
  const ip = req.ip;
    writeDbLog('access', {
    action:   'view_add_hospital',
    username,
    ip
  });
    try {
        const hospitals = await Hospital.find().lean();


        res.render('add-hospital', { hospitals }); // Pass to EJS
    } catch (err) {
        console.error("❌ Error loading hospital form:", err);
            writeDbLog('error', {
      action:   'view_add_hospital_error',
      username,
      message:  err.message,
      stack:    err.stack,
      ip
    });
        res.status(500).send('Error loading hospital form');
    }
});

router.post('/addHospital', async (req, res) => {
    const { hospital_code, hospital_name, site_code, site_name, address, city, state, country, zip, notification_preference} = req.body;
    const username = req.session.user.username;
    const ip = req.ip;
      writeDbLog('access', {
    action:        'add_hospital_attempt',
    username,
    hospital_code,
    site_code,
    ip
  });

    try {
        console.log("notification_preference:",notification_preference);
        let hospital = await Hospital.findOne({ hospital_code, hospital_name });

        if (hospital) {
            // Hospital exists, add the new site
            hospital.sites.push({ site_code, site_name, address, city, state, country, zip, notification_preference });
        } else {
            // Hospital does not exist, create a new hospital entry
            hospital = new Hospital({
                hospital_code,
                hospital_name,
                sites: [{ site_code, site_name, address, city, state, country, zip, notification_preference }]
            });
            console.log("hospital:",hospital);

        }

        await hospital.save();
            writeDbLog('audit', {
      action:        isNewHospital ? 'add_hospital' : 'add_site',
      username,
      hospital_code,
      site_code,
      site_name,
      notification_preference,
      ip
    });
        req.flash('success', 'Hospital and sites added/updated successfully.');
        res.redirect(basePath + '/dashboard');
    } catch (error) {
        console.error(error);
            writeDbLog('error', {
      action:        'add_hospital_error',
      username,
      hospital_code: req.body.hospital_code,
      site_code:     req.body.site_code,
      message:       error.message,
      stack:         error.stack,
      ip
    });
        res.redirect(basePath + '/addHospital');
        req.flash('error', 'Failed to add/update hospital.');
        res.redirect(basePath + '/addHospital');
    }
});


router.post('/login', (req, res) => {
    const { username, password } = req.body;
      const ip = req.ip;
    const hardcodedUsername = process.env.HARDCODED_USERNAME;  // Use environment variable for hardcoded username
    const hardcodedPassword = process.env.HARDCODED_PASSWORD;  // Use environment variable for hardcoded password

    if (username !== hardcodedUsername && password !== hardcodedPassword) {
            writeDbLog('access', {
      action:   'super_admin_login_failed',
      username,
      reason:   'invalid_username_and_password',
      ip
    });

        req.flash('error', 'Invalid username and password');
    } else if (username !== hardcodedUsername) {
            writeDbLog('access', {
      action:   'super_admin_login_failed',
      username,
      reason:   'invalid_username',
      ip
    });

        req.flash('error', 'Invalid username');
    } else if (password !== hardcodedPassword) {
            writeDbLog('access', {
      action:   'super_admin_login_failed',
      username,
      reason:   'invalid_password',
      ip
    });

        req.flash('error', 'Invalid password');
    } else {
        // Set the user object in the session upon successful login
            writeDbLog('audit', {
      action:   'super_admin_login_success',
      username,
      ip
    });
        req.session.user = { username };

        // Redirect to the dashboard
        return res.redirect(basePath + '/dashboard');
    }

    // If login fails, redirect back to the login page
    res.redirect(basePath + '/');
});




router.post('/addAdmin', isAuthenticated, async (req, res) => {
      const username = req.session.user.username;
  const ip = req.ip;

    writeDbLog('access', {
    action:       'add_admin_attempt',
    username,
    ip
  });
    try {
        let { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

        // Trim leading and trailing spaces from firstName and lastName
        firstName = firstName.trim();
        lastName = lastName.trim();

        // Find the hospital based on the selected hospital code
        const hospital = await Hospital.findOne({ hospital_code });

        // Find the selected site within the hospital's sites array
        const site = hospital.sites.find(s => s.site_code === siteCode);

        // Extract siteName from the selected site
        const siteName = site ? site.site_name : '';

       // Generate username based on the updated format
// Generate username based on the updated format
let cleanFirstName = firstName.split(' ')[0].toLowerCase();
let cleanLastName = lastName.split(' ')[0].toLowerCase();
let baseUsername = `${cleanFirstName}.${cleanLastName}.${siteCode.toLowerCase()}`;
let username = baseUsername;

// Check if the username already exists in Admin, Doctor, or Staff collections
let isDuplicate = await Admin.exists({ username: username }) ||
                  await Doctor.exists({ username: username }) ||
                  await Staff.exists({ username: username });

if (isDuplicate) {
    let suffix = 2; // Start numbering from 2 if duplicate exists

    while (true) {
        let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${siteCode.toLowerCase()}`;

        // Check if this new username exists
        let exists = await Admin.exists({ username: newUsername }) ||
                     await Doctor.exists({ username: newUsername }) ||
                     await Staff.exists({ username: newUsername });

        if (!exists) {
            username = newUsername; // Found a unique username
            break;
        }

        suffix++; // Increment the suffix and try again
    }
}



        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const password = `${siteCode}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;

        const encryptedPassword = encrypt(password);

        const newAdmin = new Admin({
            firstName,
            lastName,
            username,
            password: encryptedPassword,
            hospital_code,
            hospitalName,
            siteCode,
            siteName,
            subscription
        });

        await newAdmin.save();

            writeDbLog('audit', {
      action:       'add_admin_success',
      username,
      newAdminUsername: username,
      hospital_code,
      siteCode,
      ip
    });

        // Store the credentials in session instead of query params
        req.session.adminCredentials = { username, password };
        res.redirect(`${basePath}/dashboard`);
    } catch (err) {
        console.error(err);
            writeDbLog('error', {
      action:       'add_admin_error',
      actor,
      message:      err.message,
      stack:        err.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});






router.get('/editAdmin/:id', isAuthenticated, async (req, res) => {
        const { id } = req.params;
          const ip = req.ip;
           const username = req.session.user.username;

             writeDbLog('access', {
    action:   'view_edit_admin',
    username,
    adminId:  id,
    ip
  });

    try {
        const admin = await Admin.findById(id).lean();
        const hospitals = await Hospital.find().lean();
        // Decrypt the password before sending to the view
        admin.password = decrypt(admin.password);

        res.render('edit-admin', { admin, hospitals });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.post('/editAdmin/:id', async (req, res) => {
      const actor = req.session.user.username;
  const ip = req.ip;
  const { id } = req.params;

    writeDbLog('access', {
    action:   'edit_admin_attempt',
    actor,
    adminId:  id,
    ip
  });
    try {
        let { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

        firstName = firstName.trim();
        lastName = lastName.trim();

        const hospital = await Hospital.findOne({ hospital_code });
        const site = hospital.sites.find(s => s.site_code === siteCode);
        const siteName = site ? site.site_name : '';

        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${siteCode.toLowerCase()}`;
        const currentAdmin = await Admin.findById(id);

        let username = baseUsername;

        if (username !== currentAdmin.username) {
            let isDuplicate = await Admin.exists({ username: username }) ||
                              await Doctor.exists({ username: username }) ||
                              await Staff.exists({ username: username });

            if (isDuplicate) {
                let suffix = 2; // Start numbering from 2 if duplicate exists

                while (true) {
                    let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${siteCode.toLowerCase()}`;

                    // Check if this new username exists
                    let exists = await Admin.exists({ username: newUsername }) ||
                                 await Doctor.exists({ username: newUsername }) ||
                                 await Staff.exists({ username: newUsername });

                    if (!exists) {
                        username = newUsername; // Found a unique username
                        break;
                    }

                    suffix++; // Increment the suffix and try again
                }
            }
        } else {
            username = currentAdmin.username;
        }

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

        const updateData = {
            firstName,
            lastName,
            hospital_code,
            hospitalName,
            siteCode,
            siteName,
            subscription
        };

        if (username !== currentAdmin.username) {
            updateData.username = username;
        }

        if (password && decrypt(currentAdmin.password) !== password) {
            updateData.password = encrypt(password);
        }

        await Admin.findByIdAndUpdate(id, updateData);
            writeDbLog('audit', {
      action:       'edit_admin_success',
      actor,
      adminId:      id,
      updatedFields: Object.keys(updateData),
      ip
    });

        req.session.adminCredentials = { username: updateData.username || currentAdmin.username, password: password || decrypt(currentAdmin.password) };

        res.redirect(`${basePath}/dashboard`);
    } catch (err) {
        console.error(err);
            writeDbLog('error', {
      action:   'edit_admin_error',
      actor,
      adminId:  id,
      message:  err.message,
      stack:    err.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});


// router.get('/dashboard', isAuthenticated, async (req, res) => {
//     try {
//         const hospitals = await Hospital.find().lean();
//         const admins = await Admin.find().lean();
//         res.render('index', { hospitals, admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const hospitals = await Hospital.find().lean();
        const admins = await Admin.find().lean();

        // Retrieve admin credentials from session
        const adminCredentials = req.session.adminCredentials;
        delete req.session.adminCredentials; // Clear the session data after use

        res.render('index', { hospitals, admins, adminCredentials });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});




router.post('/deleteAdmin/:id', async (req, res) => {
      const actor = req.session.user.username;
  const ip    = req.ip;
  const { id } = req.params;
    writeDbLog('access', {
    action:   'delete_admin_attempt',
    actor,
    adminId:  id,
    ip
  });
    try {

        // Fetch the admin before deleting for logging purposes
        const admin = await Admin.findById(id);

        if (!admin) {
                  writeDbLog('audit', {
        action:   'delete_admin_not_found',
        actor,
        adminId:  id,
        ip
      });
            req.flash('error', 'Admin not found.');
            return res.redirect(basePath + '/dashboard');
        }

        await Admin.findByIdAndDelete(id);

            writeDbLog('audit', {
      action:       'delete_admin_success',
      actor,
      adminId:      id,
      deletedUser:  admin.username,
      ip
    });

        req.flash('success', 'Admin deleted successfully.');
        res.redirect(basePath + '/dashboard');
    } catch (err) {
        console.error(err);
            writeDbLog('error', {
      action:   'delete_admin_error',
      actor,
      adminId:  id,
      message:  err.message,
      stack:    err.stack,
      ip
    });
        res.status(500).send('Internal Server Error');
    }
});
app.use(basePath, router);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});