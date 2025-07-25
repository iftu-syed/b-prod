const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const path = require('path');
const ejs = require('ejs');
// const fs = require('fs').promises; // Use promises version of fs for better async handling
const app = express();
const fs = require('fs');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { Parser } = require('json2csv'); // Add this at the top with other requires
const xml2js = require('xml2js'); // Add this at the top with other requires
require('dotenv').config();
const i18nextMiddleware = require('i18next-http-middleware');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');
// Define the basePath for patientlogin
const basePath = '/patientlogin';
app.locals.basePath = basePath;


// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;


// AES-256 Encryption function
const encrypt = (text) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY is missing or not 32 characters long.');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// AES-256 Decryption function
const decrypt = (text) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY is missing or not 32 characters long.');
    }

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
app.use('/patientlogin/locales', express.static(path.join(__dirname, 'views/locales')));;
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

  app.use(express.urlencoded({ extended: true }));

  // normalize old `?lang=` into `?lng=` so downstream code only needs to look at req.query.lng
app.use((req, res, next) => {
  if (req.query.lang && !req.query.lng) {
    req.query.lng = req.query.lang;
  }
  next();
});


async function startServer() {
    // const port = 3055;
    const port = process.env.Patient_PORT;

    // Set EJS as the view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Middleware
    app.use(session({
        // secret: 'your-secret-key', // Change this to a random secret key
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/Data_Entry_Incoming?authsource=admin', // Use a different database for sessions
            ttl: 14 * 24 * 60 * 60 // Sessions will be stored for 14 days
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 // 1 day for session cookie
        }
    }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(flash());
    // Middleware to pass messages to the views
// Middleware to pass messages to the views
app.use((req, res, next) => {
  const currentLanguage =
     req.query.lng
  || req.cookies.lng
  || 'en';
  const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

  res.locals.lng = currentLanguage;
  res.locals.dir = dir;

  // keep both cookies in sync
  res.cookie('lng',  currentLanguage, { path: '/', maxAge: 7*24*60*60*1000 });
  res.cookie('lang', currentLanguage, { path: '/', maxAge: 7*24*60*60*1000 });
      res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');
    next();
});


    // // Serve static files (login page)
    // app.use(express.static(path.join(__dirname, 'public')));
    // app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
    // app.use('/data', express.static(path.join(__dirname, 'data')));

    // Serve static files using the basePath
    app.use(basePath, express.static(path.join(__dirname, 'public')));
    // app.use(basePath + '/new_folder', express.static(path.join(__dirname, 'new_folder')));
    app.use(basePath + '/data', express.static(path.join(__dirname, 'data')));
    



    const uri1 = process.env.DATA_ENTRY_MONGO_URL;
    const uri2 = process.env.PATIENT_DATA_MONGO_URL;
    const uri3 = process.env.DOCTORS_SURVEYS_MONGO_URL;


    // Connect to both MongoDB databases
    const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
    const client2 = new MongoClient(uri2, { useNewUrlParser: true, useUnifiedTopology: true });
    const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });

    await Promise.all([client1.connect(), client2.connect(), client3.connect()]);

    const db1 = client1.db('Data_Entry_Incoming');
    const db2 = client2.db('patient_data');
    const db3 = client3.db('manage_doctors');


// const logsDb = client1.db('patient_logs');

// // 2) Inside that DB, define the three collections
// const accessColl = logsDb.collection('access_logs');
// const auditColl  = logsDb.collection('audit_logs');
// const errorColl  = logsDb.collection('error_logs');

// // 3) Point your helper at those three collections
// function writeDbLog(type, data) {
//   const entry = {
//     ...data,
//     timestamp: new Date().toISOString()
//   };

//   switch (type) {
//     case 'access':
//       return accessColl.insertOne(entry);
//     case 'audit':
//       return auditColl.insertOne(entry);
//     case 'error':
//       return errorColl.insertOne(entry);
//     default:
//       return Promise.reject(new Error(`Unknown log type: ${type}`));
//   }
// }


// 1) Ensure a “logs” directory exists alongside this file
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


    console.log('Connected to all databases');

    // Middleware to check if user is logged in
    function checkAuth(req, res, next) {
        if (req.session.user) {
            next();
        } else {
            res.redirect(basePath);
        }
    }


    app.use((req, res, next) => {
        if (req.session && req.session.user) {
            const { Mr_no, fullName, hospital_code, speciality } = req.session.user;
            const timestamp = new Date().toISOString();
            // const logData = `Mr_no: ${Mr_no}, firstName: ${firstName}, lastName: ${lastName}, hospital: ${hospital_code}, speciality: ${speciality}, timestamp: ${timestamp}, page: ${req.path}, action: ${req.method}`;
            // writeLog('access_logs.txt', logData);
                const info = {
                Mr_no,
                fullName,
                hospital_code,
                speciality,
                page: req.path,
                action: req.method,
                ip: req.ip
                };
             writeDbLog('access', info);
        }
        next();
    });
    
    // Define and mount routes using Express Router
    const router = express.Router();

    // Serve login page on root URL
 router.get('/', (req, res) => {

  // pull both error *and* success flashes
  const errorMessage   = req.flash('error');
  const successMessage = req.flash('success');
  res.render('login', {
     lng: res.locals.lng,
     dir:  res.locals.dir,

    errorMessage,
    successMessage
  });
});

    router.get('/login', async (req, res) => {
        const { Mr_no, password } = req.query;

  // 1️⃣ Log the incoming login attempt
  writeDbLog('access', {
    action: 'login_attempt',
    Mr_no,
    // you can capture more context, e.g.:
    ip: req.ip,
    query: { Mr_no }
  });

  try {
    // 2️⃣ Perform the lookup
    const user1 = await db1
      .collection('patient_data')
      .findOne({ Mr_no, password });

    if (user1) {
      // 3️⃣ Log successful login
      writeDbLog('access', {
        action: 'login_success',
        Mr_no,
        userId: user1._id
      });

      // fetch surveys and render
      const surveyData = await db3
        .collection('surveys')
        .findOne({ specialty: user1.speciality });
      const customSurveys = surveyData ? surveyData.custom : [];

      return res.render('userDetails', {
        user: user1,
        customSurveys
      });
    } else {
      // 4️⃣ Log failed login
      writeDbLog('access', {
        action: 'login_failed',
        Mr_no
      });

      return res.redirect(basePath);
    }
  } catch (err) {
    // 5️⃣ Log any unexpected error
    writeDbLog('error', {
      action: 'login_error',
      Mr_no,
      message: err.message,
      stack: err.stack
    });
    console.error('Error in /login route:', err);
    return res.status(500).send('Internal Server Error');
  }
});

    
// Example route to handle /openServer request
router.get('/openServer', (req, res) => {
    // Extract the 'mr_no' parameter from the query string
    const mr_no = req.query.mr_no;

    // Perform your logic here. For example, you could query the database, or start a server, etc.
    // For demonstration, let's just send a response back.
    if (mr_no) {
        res.send(`Server opened with MR No: ${mr_no}`);
    } else {
        res.status(400).send('MR No not provided');
    }
});

    
    // const generateCSV = (mr_no) => {
    //     return new Promise((resolve, reject) => {
    //         const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
    //         exec(command, (error, stdout, stderr) => {
    //             if (error) {
    //                 console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
    //                 reject(error);
    //             }
    //             if (stderr) {
    //                 console.error(`stderr: ${stderr}`);
    //             }
    //             resolve();
    //         });
    //     });
    // };

    const generateCSV = (mr_no) => {
        return new Promise((resolve, reject) => {
            const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
                    reject(error);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                resolve();
            });
        });
    };
    
    
    
    const executePythonScripts = async (mr_no, specialities, apiDataExists) => {
        try {
            if (apiDataExists) {
                // Execute API_script.py if API data exists
                await executePythonScript('API_script', [mr_no]);
            } else {
                // Fetch all survey data for user's specialities in parallel
                const surveyPromises = specialities.map(speciality =>
                    db3.collection('surveys').findOne({ specialty: speciality.name })
                );
    
                const surveyResults = await Promise.all(surveyPromises);
    
                // Iterate through survey results and generate graphs
                const graphPromises = surveyResults.map((surveyData, index) => {
                    const specialityName = specialities[index].name;
                    const customSurveys = surveyData && Array.isArray(surveyData.custom) ? surveyData.custom : [];
                    if (customSurveys.length > 0) {
                        return Promise.all(customSurveys.map(customType => generateGraphs(mr_no, customType)));
                    } else {
                        console.warn(`No custom types available for speciality: ${specialityName}`);
                        return Promise.resolve();
                    }
                });
    
                await Promise.all(graphPromises.flat());
            }
    
            // Execute API_script.py for CSV generation after all graphs
            await executePythonScript('API_script', [mr_no]);
    
            console.log('Python scripts executed successfully.');
        } catch (error) {
            console.error('Error executing Python scripts:', error);
            throw error;
        }
    };
    
    router.post('/run-scripts', async (req, res) => {
        const { mr_no } = req.body;
    
        try {
            // Fetch the user data from the database
            const user = await db1.collection('patient_data').findOne({ Mr_no: mr_no });
    
            if (!user) {
                return res.status(404).send('User not found.');
            }
    
            // Check if API data exists and pass it to the script executor
            const apiDataExists = user.API && Array.isArray(user.API) && user.API.length > 0;
    
            // Execute all scripts
            await executePythonScripts(user.Mr_no, user.specialities, apiDataExists);
    
            return res.status(200).send('Python scripts executed successfully.');
        } catch (error) {
            console.error('Error running Python scripts:', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    
    
    const executePythonScript = (scriptName, args) => {
        return new Promise((resolve, reject) => {
            const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing ${scriptName}: ${error.message}`);
                    reject(error);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                resolve();
            });
        });
    };
    
    // const generateGraphs = (mr_no, custom_type) => {
    //     return new Promise((resolve, reject) => {
    //         const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${custom_type}"`;
    //         exec(command, (error, stdout, stderr) => {
    //             if (error) {
    //                 console.error(`Error generating graph for ${custom_type}: ${error.message}`);
    //                 reject(error);
    //             }
    //             if (stderr) {
    //                 console.error(`stderr: ${stderr}`);
    //             }
    //             resolve();
    //         });
    //     });
    // };
    
    
    const generateGraphs = (mr_no, custom_type) => {
        return new Promise((resolve, reject) => {
            const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${custom_type}"`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error generating graph for ${custom_type}: ${error.message}`);
                    reject(error);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                resolve();
            });
        });
    };




//     router.post('/login', async (req, res) => {
//         let { identifier, password } = req.body;
    
//         // Find user by MR number or phone number
//         const user1 = await db1.collection('patient_data').findOne({
//             $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
//         });
    
//         if (user1) {
//             // Check if the password is set
//             if (!user1.password) {
//                 req.flash('error', 'Please, register to sign in');
//                 return res.redirect(basePath);
//             }

//         try {
//             // Decrypt the stored password
//             const decryptedPassword = decrypt(user1.password);

//             // Compare the decrypted password with the provided password
//             if (decryptedPassword !== password) {
//                 console.log(`Provided Password: ${password}`); // Log the provided password
//                 req.flash('error', 'Invalid credentials');
//                 return res.redirect(basePath);
//             }

//             console.log('Login successful'); // Log successful login
//         } catch (err) {
//             console.error('Error decrypting password:', err);
//             req.flash('error', 'Internal server error');
//             return res.redirect(basePath);
//         }

//             // Check survey status and appointment finished count
//             if (user1.surveyStatus === 'Not Completed') {
//                 if (!user1.hasOwnProperty('appointmentFinished')) {
//                     // Redirect to the specified page if `appointmentFinished` field is absent
//                     return res.redirect(`${process.env.PATIENT_SURVEY_APP_URL}/search?identifier=${user1.Mr_no}`);
//                 }
//             }
    
//             // Password matches, user authenticated successfully
//             req.session.user = user1;
    
//             // const newFolderDirectory = path.join(__dirname, 'new_folder');
//             // await clearDirectory(newFolderDirectory);
    
//             // Define a function to execute Python script
//             const executePythonScript = (scriptName, args) => {
//                 return new Promise((resolve, reject) => {
//                     const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
//                     exec(command, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error executing ${scriptName}: ${error.message}`);
//                             reject(error);
//                         }
//                         if (stderr) {
//                             console.error(`stderr: ${stderr}`);
//                         }
//                         resolve();
//                     });
//                 });
//             };
    
//             // Define a function to generate CSV
//             const generateCSV = (mr_no) => {
//                 return new Promise((resolve, reject) => {
//                     const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
//                     exec(command, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
//                             reject(error);
//                         }
//                         if (stderr) {
//                             console.error(`stderr: ${stderr}`);
//                         }
//                         resolve();
//                     });
//                 });
//             };
    

//             // const generateGraphs = (mr_no, custom_type) => {
//             //     return new Promise((resolve, reject) => {
//             //         const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${custom_type}"`;
//             //         exec(command, (error, stdout, stderr) => {
//             //             if (error) {
//             //                 console.error(`Error generating graph for ${custom_type}: ${error.message}`);
//             //                 reject(error);
//             //             }
//             //             if (stderr) {
//             //                 console.error(`stderr: ${stderr}`);
//             //             }
//             //             resolve();
//             //         });
//             //     });
//             // };
            
    
//             // Check if the user has an API array in their record
// if (user1.API && Array.isArray(user1.API) && user1.API.length > 0) {
//     // If API array exists, execute API_script.py
//     // await executePythonScript('API_script', [user1.Mr_no]);
// } else {
//     // Otherwise, proceed with the existing logic for generating graphs for specialities
//     // await executePythonScript('API_script', [user1.Mr_no]);

//     // Fetch all survey data for user's specialities in parallel
//     const surveyPromises = user1.specialities.map(speciality =>
//         db3.collection('surveys').findOne({ specialty: speciality.name })
//     );

//     const surveyResults = await Promise.all(surveyPromises);
    
//     // const graphPromises = surveyResults.map((surveyData, index) => {
//     //     const specialityName = user1.specialities[index].name;
//     //     // const customSurveys = surveyData ? surveyData.custom : [];
//     //     const customSurveys = surveyData && Array.isArray(surveyData.custom) ? surveyData.custom : [];
//     //     if (customSurveys.length > 0) {
//     //         return Promise.all(customSurveys.map(customType => generateGraphs(user1.Mr_no, customType)));
//     //     } else {
//     //         console.warn(`No custom types available for speciality: ${specialityName}`);
//     //         return Promise.resolve();
//     //     }
//     // });

//     // await Promise.all(graphPromises.flat());
// }


//             // Initialize aiMessage to the existing message or an empty string
//             let aiMessage = user1.aiMessage || '';
//             let aiMessageArabic = user1.aiMessageArabic || '';
            
//             // Determine if 30 days have passed since the last AI message generation
//             const currentDate = new Date();
//             const lastGeneratedDate = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists
    
//             const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
//             const isThirtyDaysPassed = (currentDate - lastGeneratedDate) > thirtyDaysInMs;
            
//             if (!isThirtyDaysPassed && aiMessage && aiMessageArabic) {
//                 console.log('Using existing AI message (English and Arabic).');
//             } else {
//                 try {
//                     // Fetch the AI-generated message if 30 days have passed
//                     const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//                     const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
//                     const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);
    

//                     const ensureFileExists = async (filePath) => {
//                         try {
//                             await fs.promises.stat(filePath);
//                         } catch (error) {
//                             if (error.code === 'ENOENT') {
//                                 console.warn(`File ${filePath} not found. Creating an empty file.`);
//                                 await fs.promises.writeFile(filePath, '');
//                             } else {
//                                 throw error;
//                             }
//                         }
//                         };
                    
                    
//                     // Ensure the required files exist or create empty ones
//                     await Promise.all([
//                         ensureFileExists(severityLevelsCsv),
//                         ensureFileExists(patientHealthScoresCsv),
//                         ensureFileExists(apiSurveysCsv)
//                     ]);
                    
//                     const scriptOutput = await new Promise((resolve, reject) => {
//                         exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
//                             if (error) {
//                                 console.error(`Error generating AI message: ${error.message}`);
//                                 reject(error);
//                             }
//                             resolve(stdout.trim());
//                         });
//                     });
            
//                     // Parse the JSON returned by the Python script
//                     let parsedOutput;
//                     try {
//                         parsedOutput = JSON.parse(scriptOutput);
//                     } catch (parseError) {
//                         throw new Error(`Error parsing JSON from patientprompt.py: ${parseError.message}`);
//                     }
            
//                     // Extract both English summary and Arabic translation
//                     aiMessage = parsedOutput.english_summary;
//                     aiMessageArabic = parsedOutput.arabic_translation;
            
//                     console.log('English Summary:', aiMessage);
//                     console.log('Arabic Translation:', aiMessageArabic);
            
//                     // Update the AI messages and the generation date in the database
//                     await db1.collection('patient_data').updateOne(
//                         { Mr_no: user1.Mr_no },
//                         {
//                             $set: {
//                                 aiMessage: aiMessage,
//                                 aiMessageArabic: aiMessageArabic,
//                                 aiMessageGeneratedAt: currentDate,
//                             },
//                         }
//                     );
//                     user1 = await db1.collection('patient_data').findOne({ Mr_no: identifier });
//                 } catch (error) {
//                     console.error('Error generating AI message:', error);
//                     aiMessage = 'Unable to generate AI message at this time.';
//                     aiMessageArabic = '';
//                 }
//             }
    
//             // Render the user details page
//             // return res.render('userDetails', { 
//             //     user: user1, 
//             //     surveyName: user1.specialities.map(s => s.name), 
//             //     csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
//             //     painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
//             //     aiMessage: aiMessage // Pass the AI message to the template
//             // });

//              // Fetch `patient_health_scores` from the database
//              const patientData = await db1.collection('patient_data').findOne({ Mr_no: user1.Mr_no });

//              // Check if `patient_health_scores` exists in the database
//              if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
//                  req.flash('error', 'No patient health scores found for this patient.');
//                  return res.redirect(basePath);
//              }
     
//              // Store user in session
//              req.session.user = user1;
     
//              // Redirect to user details page
//              return res.redirect(basePath + '/userDetails');


//         } else {
//             // User not found
//             req.flash('error', 'These details are not found');
//             return res.redirect(basePath);
//         }
//     });

    

    // Middleware to pass messages to the views
    

//Openi Ai with curl runner route

// router.post('/api_script', async (req, res) => {
//     const { mr_no } = req.body;

//     try {
//         // Define the paths to the necessary CSV files
//         const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);
//         const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${mr_no}.csv`);

//         // Function to ensure the required files exist, or create empty ones if missing
//         const ensureFileExists = async (filePath) => {
//             try {
//                 await fs.promises.stat(filePath);
//             } catch (error) {
//                 if (error.code === 'ENOENT') {
//                     console.warn(`File ${filePath} not found. Creating an empty file.`);
//                     await fs.promises.writeFile(filePath, '');
//                 } else {
//                     throw error;
//                 }
//             }
//         };

//         // Ensure all necessary files exist
//         await Promise.all([
//             ensureFileExists(severityLevelsCsv),
//             ensureFileExists(patientHealthScoresCsv),
//             ensureFileExists(apiSurveysCsv),
//         ]);

//         // Execute patientprompt.py with the required arguments
//         const command = `python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`;
//         exec(command, async (error, stdout, stderr) => {
//             if (error) {
//                 console.error('patientprompt.py error:', error);
//                 return res.status(500).send('Error running patientprompt.py');
//             }
//             if (stderr) {
//                 console.error('patientprompt.py stderr:', stderr);
//             }

//             // Parse the JSON output from patientprompt.py
//             let parsedOutput;
//             try {
//                 parsedOutput = JSON.parse(stdout.trim());
//             } catch (parseErr) {
//                 console.error('JSON parse error:', parseErr);
//                 return res.status(500).send('Could not parse patientprompt.py output');
//             }

//             // Update the database with the AI-generated messages
//             const db = client1.db('Data_Entry_Incoming');
//             await db.collection('patient_data').updateOne(
//                 { Mr_no: mr_no },
//                 {
//                     $set: {
//                         aiMessage: parsedOutput.english_summary,
//                         aiMessageArabic: parsedOutput.arabic_translation,
//                         aiMessageGeneratedAt: new Date(),
//                     },
//                 }
//             );

//             return res.status(200).send(`AI message updated for Mr_no: ${mr_no}`);
//         });
//     } catch (err) {
//         console.error('Error in /api_script route:', err);
//         return res.status(500).send('Internal Server Error');
//     }
// });


//Data Anonymous

// router.post('/api_script', async (req, res) => {
//     const { mr_no } = req.body;

//     try {
//         // Define the paths to the necessary CSV files
//         const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);
//         const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${mr_no}.csv`);

//         // Function to ensure the required files exist, or create empty ones if missing
//         const ensureFileExists = async (filePath) => {
//             try {
//                 await fs.promises.stat(filePath);
//             } catch (error) {
//                 if (error.code === 'ENOENT') {
//                     console.warn(`File ${filePath} not found. Creating an empty file.`);
//                     await fs.promises.writeFile(filePath, '');
//                 } else {
//                     throw error;
//                 }
//             }
//         };

//         // Function to remove 'mr_no' column from a CSV file
//         const trimMrNoColumn = async (filePath) => {
//             const data = await fs.promises.readFile(filePath, 'utf8');
//             const lines = data.split('\n');
//             const headers = lines[0].split(',');
//             const mrNoIndex = headers.indexOf('mr_no');

//             if (mrNoIndex === -1) {
//                 return data; // Return original data if 'mr_no' column is not found
//             }

//             const trimmedHeaders = headers.filter((_, index) => index !== mrNoIndex);
//             const trimmedLines = lines.map(line => {
//                 const columns = line.split(',');
//                 return columns.filter((_, index) => index !== mrNoIndex).join(',');
//             });

//             return [trimmedHeaders.join(','), ...trimmedLines.slice(1)].join('\n');
//         };

//         // Ensure all necessary files exist
//         await Promise.all([
//             ensureFileExists(severityLevelsCsv),
//             ensureFileExists(patientHealthScoresCsv),
//             ensureFileExists(apiSurveysCsv),
//         ]);

//         // Trim 'mr_no' column from the CSV files
//         const trimmedPatientHealthScores = await trimMrNoColumn(patientHealthScoresCsv);
//         const trimmedApiSurveys = await trimMrNoColumn(apiSurveysCsv);

//         // Save the trimmed content back to the files
//         await Promise.all([
//             fs.promises.writeFile(patientHealthScoresCsv, trimmedPatientHealthScores, 'utf8'),
//             fs.promises.writeFile(apiSurveysCsv, trimmedApiSurveys, 'utf8'),
//         ]);

//         // Log the content of the files before sending them to OpenAI
//         const severityLevelsData = await fs.promises.readFile(severityLevelsCsv, 'utf8');
//         // console.log('\n========== Content for OpenAI ==========');
//         // console.log('Severity Levels Data:\n', severityLevelsData);
//         // console.log('Trimmed Patient Health Scores Data:\n', trimmedPatientHealthScores);
//         // console.log('Trimmed API Surveys Data:\n', trimmedApiSurveys);

//         // Execute patientprompt.py with the required arguments
//         const command = `python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`;
//         exec(command, async (error, stdout, stderr) => {
//             if (error) {
//                 console.error('patientprompt.py error:', error);
//                 return res.status(500).send('Error running patientprompt.py');
//             }
//             if (stderr) {
//                 console.error('patientprompt.py stderr:', stderr);
//             }

//             // Parse the JSON output from patientprompt.py
//             let parsedOutput;
//             try {
//                 parsedOutput = JSON.parse(stdout.trim());
//             } catch (parseErr) {
//                 console.error('JSON parse error:', parseErr);
//                 return res.status(500).send('Could not parse patientprompt.py output');
//             }

//             // Update the database with the AI-generated messages
//             const db = client1.db('Data_Entry_Incoming');
//             await db.collection('patient_data').updateOne(
//                 { Mr_no: mr_no },
//                 {
//                     $set: {
//                         aiMessage: parsedOutput.english_summary,
//                         aiMessageArabic: parsedOutput.arabic_translation,
//                         aiMessageGeneratedAt: new Date(),
//                     },
//                 }
//             );

//             return res.status(200).send(`AI message updated for Mr_no: ${mr_no}`);
//         });
//     } catch (err) {
//         console.error('Error in /api_script route:', err);
//         return res.status(500).send('Internal Server Error');
//     }
// });


// router.post('/api_script', async (req, res) => {
//     const { mr_no } = req.body;

//     try {
//         // Paths to the two CSV files we still need
//         const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//         const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);

//         // -----------------------
//         // Helper function to ensure the file exists (create empty if not)
//         // -----------------------
//         const ensureFileExists = async (filePath) => {
//             try {
//                 await fs.promises.stat(filePath);
//             } catch (error) {
//                 if (error.code === 'ENOENT') {
//                     console.warn(`File ${filePath} not found. Creating an empty file.`);
//                     await fs.promises.writeFile(filePath, '');
//                 } else {
//                     throw error;
//                 }
//             }
//         };

//         // -----------------------
//         // Helper function to remove 'mr_no' column from CSV
//         // -----------------------
//         const trimMrNoColumn = async (filePath) => {
//             const data = await fs.promises.readFile(filePath, 'utf8');
//             const lines = data.split('\n');
//             const headers = lines[0].split(',');
//             const mrNoIndex = headers.indexOf('mr_no');

//             if (mrNoIndex === -1) {
//                 return data; // Return original data if 'mr_no' column is not found
//             }

//             const trimmedHeaders = headers.filter((_, index) => index !== mrNoIndex);
//             const trimmedLines = lines.map(line => {
//                 const columns = line.split(',');
//                 return columns.filter((_, index) => index !== mrNoIndex).join(',');
//             });

//             return [trimmedHeaders.join(','), ...trimmedLines.slice(1)].join('\n');
//         };

//         // -----------------------
//         // Helper function to strip leading/trailing quotes
//         // -----------------------
//         function stripQuotes(str) {
//             return str.replace(/^"+|"+$/g, '');
//         }

//         // Ensure the files exist or create empty ones
//         await Promise.all([
//             ensureFileExists(severityLevelsCsv),
//             ensureFileExists(patientHealthScoresCsv),
//         ]);

//         // Read & trim 'mr_no' from the CSVs
//         let patientHealthScoresData = await trimMrNoColumn(patientHealthScoresCsv);
//         let severityLevelsData = await trimMrNoColumn(severityLevelsCsv);

//         // ---------------------------
//         // Filter severityLevelsData to match only the trace_names from patientHealthScoresData
//         // ---------------------------
//         // 1) Gather unique trace_name from patientHealthScoresData
//         const phsLines = patientHealthScoresData.trim().split('\n');
//         if (phsLines.length > 1) {
//             phsLines.shift(); // Remove CSV header
//         }
//         const traceNamesSet = new Set();
//         for (const line of phsLines) {
//             const cols = line.split(',');
//             // Ensure at least 4 columns: [date, months_since_baseline, score, trace_name, ...]
//             if (cols.length > 3) {
//                 const rawTraceName = cols[3].trim();
//                 const traceName = stripQuotes(rawTraceName);
//                 traceNamesSet.add(traceName);
//             }
//         }

//         // 2) Filter out rows in severityLevelsData whose "Scale" is not in traceNamesSet
//         let severityLines = severityLevelsData.trim().split('\n');
//         const severityHeader = severityLines.shift() || ''; // Save header line
//         severityLines = severityLines.filter((row) => {
//             const cols = row.split(',');
//             if (cols.length === 0) return false;
//             // The first column is "Scale"
//             const scaleName = stripQuotes(cols[0].trim());
//             return traceNamesSet.has(scaleName);
//         });

//         // 3) Rebuild severityLevelsData
//         severityLevelsData = [severityHeader, ...severityLines].join('\n');

//         // ---------------------------
//         // Save the filtered CSV content back to disk
//         // ---------------------------
//         await fs.promises.writeFile(patientHealthScoresCsv, patientHealthScoresData, 'utf8');
//         await fs.promises.writeFile(severityLevelsCsv, severityLevelsData, 'utf8');

//         // ---------------------------
//         // Log the final CSV data before calling the script
//         // ---------------------------
//         console.log('\n[DEBUG] Filtered patient_health_scores:\n', patientHealthScoresData);
//         console.log('\n[DEBUG] Filtered severityLevels:\n', severityLevelsData);

//         // ---------------------------
//         // Execute patientprompt.py with only these two CSV paths
//         // ---------------------------
//         const command = `python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}"`;
//         exec(command, async (error, stdout, stderr) => {
//             if (error) {
//                 console.error('patientprompt.py error:', error);
//                 return res.status(500).send('Error running patientprompt.py');
//             }
//             if (stderr) {
//                 console.error('patientprompt.py stderr:', stderr);
//             }

//             // ---------------------------
//             // Parse JSON output from patientprompt.py
//             // ---------------------------
//             let parsedOutput;
//             try {
//                 parsedOutput = JSON.parse(stdout.trim());
//             } catch (parseErr) {
//                 console.error('JSON parse error:', parseErr);
//                 return res.status(500).send('Could not parse patientprompt.py output');
//             }

//             // ---------------------------
//             // Update the database with the AI-generated messages
//             // ---------------------------
//             const db = client1.db('Data_Entry_Incoming'); // <-- Ensure client1 is accessible here
//             await db.collection('patient_data').updateOne(
//                 { Mr_no: mr_no },
//                 {
//                     $set: {
//                         aiMessage: parsedOutput.english_summary,
//                         aiMessageArabic: parsedOutput.arabic_translation,
//                         aiMessageGeneratedAt: new Date(),
//                     },
//                 }
//             );

//             return res.status(200).send(`AI message updated for Mr_no: ${mr_no}`);
//         });
//     } catch (err) {
//         console.error('Error in /api_script route:', err);
//         return res.status(500).send('Internal Server Error');
//     }
// });

router.post('/api_script', async (req, res) => {
    const { mr_no } = req.body;

    try {
        // Paths to the original CSV files
        const severityLevelsCsvPath = path.join(__dirname, 'public', 'SeverityLevels.csv');
        const patientHealthScoresCsvPath = path.join(__dirname, 'data', `patient_health_scores_${mr_no}.csv`);

        // -----------------------
        // Helper function to ensure a file exists (create empty if not)
        // -----------------------
        const ensureFileExists = async (filePath) => {
            try {
                await fs.promises.stat(filePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn(`File ${filePath} not found. Creating an empty file.`);
                    await fs.promises.writeFile(filePath, '');
                } else {
                    throw error;
                }
            }
        };

        // -----------------------
        // Helper function to read and remove 'mr_no' column from a CSV (in-memory)
        // -----------------------
        const readAndTrimMrNoColumn = async (filePath) => {
            const data = await fs.promises.readFile(filePath, 'utf8');
            const lines = data.split('\n');
            const headers = lines[0].split(',');
            const mrNoIndex = headers.indexOf('mr_no');

            if (mrNoIndex === -1) {
                // No 'mr_no' column found; return as-is
                return data;
            }

            const trimmedHeaders = headers.filter((_, index) => index !== mrNoIndex);
            const trimmedLines = lines.map(line => {
                const columns = line.split(',');
                return columns.filter((_, index) => index !== mrNoIndex).join(',');
            });

            return [trimmedHeaders.join(','), ...trimmedLines.slice(1)].join('\n');
        };

        // -----------------------
        // Helper function to strip leading/trailing quotes
        // -----------------------
        const stripQuotes = (str) => str.replace(/^"+|"+$/g, '');

        // Ensure original CSV files exist or create empty
        await Promise.all([
            ensureFileExists(severityLevelsCsvPath),
            ensureFileExists(patientHealthScoresCsvPath),
        ]);

        // ---------------------------
        // 1) Read CSV content in memory & trim 'mr_no'
        // ---------------------------
        let patientHealthScoresData = await readAndTrimMrNoColumn(patientHealthScoresCsvPath);
        let severityLevelsData = await readAndTrimMrNoColumn(severityLevelsCsvPath);

        // ---------------------------
        // 2) Filter severityLevelsData based on unique trace_name from patientHealthScoresData
        // ---------------------------
        //    a) Gather unique trace_name from patientHealthScoresData
        const phsLines = patientHealthScoresData.trim().split('\n');
        if (phsLines.length > 1) {
            // Remove the header line
            phsLines.shift();
        }
        const traceNamesSet = new Set();
        for (const line of phsLines) {
            const cols = line.split(',');
            // Ensure at least 4 columns (e.g. date, months_since_baseline, score, trace_name)
            if (cols.length > 3) {
                const rawTraceName = cols[3].trim();
                const traceName = stripQuotes(rawTraceName);
                traceNamesSet.add(traceName);
            }
        }

        //    b) Filter out rows in severityLevelsData whose "Scale" is not in traceNamesSet
        let severityLines = severityLevelsData.trim().split('\n');
        const severityHeader = severityLines.shift() || '';
        severityLines = severityLines.filter((row) => {
            const cols = row.split(',');
            if (!cols.length) return false;
            const scaleName = stripQuotes(cols[0].trim());
            return traceNamesSet.has(scaleName);
        });

        //    c) Rebuild severityLevelsData in memory
        severityLevelsData = [severityHeader, ...severityLines].join('\n');

        // ---------------------------
        // 3) (Optional) Debug logs
        // ---------------------------
        console.log('\n[DEBUG] Filtered patient_health_scores:\n', patientHealthScoresData);
        console.log('\n[DEBUG] Filtered severityLevels:\n', severityLevelsData);

        // ---------------------------
        // 4) Write ephemeral CSV files to pass to patientprompt.py
        //    (so we don't overwrite the originals)
        // ---------------------------
        const newFolderDirectory = path.join(__dirname, 'new_folder');
        if (!fs.existsSync(newFolderDirectory)) {
            fs.mkdirSync(newFolderDirectory, { recursive: true });
            console.log('Folder "new_folder" created for temp CSVs');
        }

        const tempPatientFile = path.join(newFolderDirectory, `temp_patient_scores_${mr_no}.csv`);
        const tempSeverityFile = path.join(newFolderDirectory, `temp_severity_levels_${mr_no}.csv`);

        await fs.promises.writeFile(tempPatientFile, patientHealthScoresData, 'utf8');
        await fs.promises.writeFile(tempSeverityFile, severityLevelsData, 'utf8');

        // ---------------------------
        // 5) Execute patientprompt.py with only these two ephemeral CSV paths
        // ---------------------------
        const command = `python3 common_login/python_scripts/patientprompt.py "${tempSeverityFile}" "${tempPatientFile}"`;
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error('patientprompt.py error:', error);
                return res.status(500).send('Error running patientprompt.py');
            }
            if (stderr) {
                console.error('patientprompt.py stderr:', stderr);
            }

            // ---------------------------
            // 6) Parse JSON output from patientprompt.py
            // ---------------------------
            let parsedOutput;
            try {
                parsedOutput = JSON.parse(stdout.trim());
            } catch (parseErr) {
                console.error('JSON parse error:', parseErr);
                return res.status(500).send('Could not parse patientprompt.py output');
            }

            // ---------------------------
            // 7) Update the database with the AI-generated messages
            // ---------------------------
            const db = client1.db('Data_Entry_Incoming'); // Make sure client1 is accessible
            await db.collection('patient_data').updateOne(
                { Mr_no: mr_no },
                {
                    $set: {
                        aiMessage: parsedOutput.english_summary,
                        aiMessageArabic: parsedOutput.arabic_translation,
                        aiMessageGeneratedAt: new Date(),
                    },
                }
            );

            return res.status(200).send(`AI message updated for Mr_no: ${mr_no}`);
        });

    } catch (err) {
        console.error('Error in /api_script route:', err);
        return res.status(500).send('Internal Server Error');
    }
});


//login post method with Openi Ai integration


// router.post('/login', async (req, res) => {
//     let { identifier, password } = req.body;

//     // Find user by MR number or phone number
//     const user1 = await db1.collection('patient_data').findOne({
//         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
//     });

//     if (user1) {
//         // Check if the password is set
//         if (!user1.password) {
//             req.flash('error', 'Please, register to sign in');
//             return res.redirect(basePath);
//         }

//     try {
//         // Decrypt the stored password
//         const decryptedPassword = decrypt(user1.password);

//         // Compare the decrypted password with the provided password
//         if (decryptedPassword !== password) {
//             console.log(`Provided Password: ${password}`); // Log the provided password
//             req.flash('error', 'Invalid credentials');
//             return res.redirect(basePath);
//         }

//         console.log('Login successful'); // Log successful login
//     } catch (err) {
//         console.error('Error decrypting password:', err);
//         req.flash('error', 'Internal server error');
//         return res.redirect(basePath);
//     }

//         // Check survey status and appointment finished count
//         if (user1.surveyStatus === 'Not Completed') {
//             if (!user1.hasOwnProperty('appointmentFinished')) {
//                 // Redirect to the specified page if `appointmentFinished` field is absent
//                 return res.redirect(`${process.env.PATIENT_SURVEY_APP_URL}/search?identifier=${user1.Mr_no}`);
//             }
//         }

//         // Password matches, user authenticated successfully
//         req.session.user = user1;

//         // const newFolderDirectory = path.join(__dirname, 'new_folder');
//         // await clearDirectory(newFolderDirectory);

//         // Define a function to execute Python script
//         const executePythonScript = (scriptName, args) => {
//             return new Promise((resolve, reject) => {
//                 const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
//                 exec(command, (error, stdout, stderr) => {
//                     if (error) {
//                         console.error(`Error executing ${scriptName}: ${error.message}`);
//                         reject(error);
//                     }
//                     if (stderr) {
//                         console.error(`stderr: ${stderr}`);
//                     }
//                     resolve();
//                 });
//             });
//         };

//         // Define a function to generate CSV
//         const generateCSV = (mr_no) => {
//             return new Promise((resolve, reject) => {
//                 const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
//                 exec(command, (error, stdout, stderr) => {
//                     if (error) {
//                         console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
//                         reject(error);
//                     }
//                     if (stderr) {
//                         console.error(`stderr: ${stderr}`);
//                     }
//                     resolve();
//                 });
//             });
//         };


//         // const generateGraphs = (mr_no, custom_type) => {
//         //     return new Promise((resolve, reject) => {
//         //         const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${custom_type}"`;
//         //         exec(command, (error, stdout, stderr) => {
//         //             if (error) {
//         //                 console.error(`Error generating graph for ${custom_type}: ${error.message}`);
//         //                 reject(error);
//         //             }
//         //             if (stderr) {
//         //                 console.error(`stderr: ${stderr}`);
//         //             }
//         //             resolve();
//         //         });
//         //     });
//         // };
        

//         // Check if the user has an API array in their record
// if (user1.API && Array.isArray(user1.API) && user1.API.length > 0) {
// // If API array exists, execute API_script.py
// // await executePythonScript('API_script', [user1.Mr_no]);
// } else {
// // Otherwise, proceed with the existing logic for generating graphs for specialities
// // await executePythonScript('API_script', [user1.Mr_no]);

// // Fetch all survey data for user's specialities in parallel
// const surveyPromises = user1.specialities.map(speciality =>
//     db3.collection('surveys').findOne({ specialty: speciality.name })
// );

// const surveyResults = await Promise.all(surveyPromises);

// // const graphPromises = surveyResults.map((surveyData, index) => {
// //     const specialityName = user1.specialities[index].name;
// //     // const customSurveys = surveyData ? surveyData.custom : [];
// //     const customSurveys = surveyData && Array.isArray(surveyData.custom) ? surveyData.custom : [];
// //     if (customSurveys.length > 0) {
// //         return Promise.all(customSurveys.map(customType => generateGraphs(user1.Mr_no, customType)));
// //     } else {
// //         console.warn(`No custom types available for speciality: ${specialityName}`);
// //         return Promise.resolve();
// //     }
// // });

// // await Promise.all(graphPromises.flat());
// }


//         // Initialize aiMessage to the existing message or an empty string
//         let aiMessage = user1.aiMessage || '';
//         let aiMessageArabic = user1.aiMessageArabic || '';
        
//         // Determine if 30 days have passed since the last AI message generation
//         const currentDate = new Date();
//         const lastGeneratedDate = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists

//         const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
//         const isThirtyDaysPassed = (currentDate - lastGeneratedDate) > thirtyDaysInMs;
        
//         if (!isThirtyDaysPassed && aiMessage && aiMessageArabic) {
//             console.log('Using existing AI message (English and Arabic).');
//         } else {
//             try {
//                 // Fetch the AI-generated message if 30 days have passed
//                 const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//                 const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
//                 const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);


//                 const ensureFileExists = async (filePath) => {
//                     try {
//                         await fs.promises.stat(filePath);
//                     } catch (error) {
//                         if (error.code === 'ENOENT') {
//                             console.warn(`File ${filePath} not found. Creating an empty file.`);
//                             await fs.promises.writeFile(filePath, '');
//                         } else {
//                             throw error;
//                         }
//                     }
//                     };
                
                
//                 // Ensure the required files exist or create empty ones
//                 await Promise.all([
//                     ensureFileExists(severityLevelsCsv),
//                     ensureFileExists(patientHealthScoresCsv),
//                     ensureFileExists(apiSurveysCsv)
//                 ]);
                
//                 const scriptOutput = await new Promise((resolve, reject) => {
//                     exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error generating AI message: ${error.message}`);
//                             reject(error);
//                         }
//                         resolve(stdout.trim());
//                     });
//                 });
        
//                 // Parse the JSON returned by the Python script
//                 let parsedOutput;
//                 try {
//                     parsedOutput = JSON.parse(scriptOutput);
//                 } catch (parseError) {
//                     throw new Error(`Error parsing JSON from patientprompt.py: ${parseError.message}`);
//                 }
        
//                 // Extract both English summary and Arabic translation
//                 aiMessage = parsedOutput.english_summary;
//                 aiMessageArabic = parsedOutput.arabic_translation;
        
//                 console.log('English Summary:', aiMessage);
//                 console.log('Arabic Translation:', aiMessageArabic);
        
//                 // Update the AI messages and the generation date in the database
//                 await db1.collection('patient_data').updateOne(
//                     { Mr_no: user1.Mr_no },
//                     {
//                         $set: {
//                             aiMessage: aiMessage,
//                             aiMessageArabic: aiMessageArabic,
//                             aiMessageGeneratedAt: currentDate,
//                         },
//                     }
//                 );
//                 user1 = await db1.collection('patient_data').findOne({ Mr_no: identifier });
//             } catch (error) {
//                 console.error('Error generating AI message:', error);
//                 aiMessage = 'Unable to generate AI message at this time.';
//                 aiMessageArabic = '';
//             }
//         }

//         // Render the user details page
//         // return res.render('userDetails', { 
//         //     user: user1, 
//         //     surveyName: user1.specialities.map(s => s.name), 
//         //     csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
//         //     painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
//         //     aiMessage: aiMessage // Pass the AI message to the template
//         // });

//          // Fetch `patient_health_scores` from the database
//          const patientData = await db1.collection('patient_data').findOne({ Mr_no: user1.Mr_no });

//          // Check if `patient_health_scores` exists in the database
//          if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
//              req.flash('error', 'No patient health scores found for this patient.');
//              return res.redirect(basePath);
//          }
 
//          // Store user in session
//          req.session.user = user1;
 
//          // Redirect to user details page
//          return res.redirect(basePath + '/userDetails');


//     } else {
//         // User not found
//         req.flash('error', 'These details are not found');
//         return res.redirect(basePath);
//     }
// });


// router.post('/login', async (req, res) => {
//     let { identifier, password } = req.body;
//      const ip = req.ip;
    
//     // Get user's language preference from session, cookie or default to English
//     const userLang = req.session.lng || req.cookies.lng || 'en';

//       writeDbLog('access', {
//         action: 'login_attempt',
//         identifier,
//         ip
//     });
//     // Define flash messages in both languages
//     const messages = {
//         en: {
//             registerRequired: 'Please register to sign in',
//             invalidCredentials: 'Invalid credentials',
//             internalError: 'Internal server error',
//             noHealthScores: 'No patient health scores found for this patient.',
//             userNotFound: 'These details are not found'
//         },
//         ar: {
//             registerRequired: 'الرجاء التسجيل لتسجيل الدخول',
//             invalidCredentials: 'بيانات اعتماد غير صالحة',
//             internalError: 'خطأ في الخادم الداخلي',
//             noHealthScores: 'لم يتم العثور على نتائج صحية لهذا المريض',
//             userNotFound: 'لم يتم العثور على هذه التفاصيل'
//         }
//     };

//     // Helper function to get message in appropriate language
//     const getMessage = (messageKey) => {
//         return messages[userLang] && messages[userLang][messageKey] 
//             ? messages[userLang][messageKey] 
//             : messages.en[messageKey];
//     };

//     // Find user by MR number or phone number
//     const user1 = await db1.collection('patient_data').findOne({
//         $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
//     });

//     if (user1) {
         
//         // Check if the password is set
//         if (!user1.password) {
//             writeDbLog('access', { action: 'login_user_not_found', identifier, ip });
//             writeDbLog('access', { action: 'login_register_required', Mr_no: user1.Mr_no, ip });
//             req.flash('error', getMessage('registerRequired'));
//             return res.redirect(basePath);
//         }

//         try {
//             // Decrypt the stored password
//             const decryptedPassword = decrypt(user1.password);

//             // Compare the decrypted password with the provided password
//             if (decryptedPassword !== password) {
//                       writeDbLog('access', {
//                     action: 'login_failed',
//                     Mr_no: user1.Mr_no,
//                     ip
//                 });
//                 console.log(`Provided Password: ${password}`); // Log the provided password
//                 req.flash('error', getMessage('invalidCredentials'));
//                 return res.redirect(basePath);
//             }
//                     writeDbLog('access', {
//                 action: 'login_success',
//                 Mr_no: user1.Mr_no,
//                 ip
//                 });
//             console.log('Login successful'); // Log successful login
//         } catch (err) {
//                   writeDbLog('error', {
//                     action: 'login_decrypt_error',
//                     Mr_no: user1.Mr_no,
//                     message: err.message,
//                     stack: err.stack
//                 });
//             console.error('Error decrypting password:', err);
//             req.flash('error', getMessage('internalError'));
//             return res.redirect(basePath);
//         }

//         // Check survey status and appointment finished count
//         if (user1.surveyStatus === 'Not Completed') {
//             if (!user1.hasOwnProperty('appointmentFinished')) {
//                       writeDbLog('access', {
//                     action: 'login_redirect_survey',
//                     Mr_no: user1.Mr_no
//                 });
//                 // Redirect to the specified page if `appointmentFinished` field is absent
//                 return res.redirect(`${process.env.PATIENT_SURVEY_APP_URL}/search?identifier=${user1.Mr_no}`);
//             }
//         }

//         // Password matches, user authenticated successfully
//         req.session.user = user1;

//         // Define a function to execute Python script
//         const executePythonScript = (scriptName, args) => {
//             return new Promise((resolve, reject) => {
//                 const command = `python3 common_login/python_scripts/${scriptName}.py ${args.join(' ')}`;
//                 exec(command, (error, stdout, stderr) => {
//                     if (error) {
//                         console.error(`Error executing ${scriptName}: ${error.message}`);
//                         reject(error);
//                     }
//                     if (stderr) {
//                         console.error(`stderr: ${stderr}`);
//                     }
//                     resolve();
//                 });
//             });
//         };

//         // Define a function to generate CSV
//         const generateCSV = (mr_no) => {
//             return new Promise((resolve, reject) => {
//                 const command = `python3 common_login/python_scripts/API_script.py ${mr_no}`;
//                 exec(command, (error, stdout, stderr) => {
//                     if (error) {
//                         console.error(`Error generating CSV for ${mr_no}: ${error.message}`);
//                         reject(error);
//                     }
//                     if (stderr) {
//                         console.error(`stderr: ${stderr}`);
//                     }
//                     resolve();
//                 });
//             });
//         };

//         // Check if the user has an API array in their record
//         if (user1.API && Array.isArray(user1.API) && user1.API.length > 0) {
//             // If API array exists, execute API_script.py
//             // await executePythonScript('API_script', [user1.Mr_no]);
//         } else {
//             // Otherwise, proceed with the existing logic for generating graphs for specialities
//             // await executePythonScript('API_script', [user1.Mr_no]);

//             // Fetch all survey data for user's specialities in parallel
//             const surveyPromises = user1.specialities.map(speciality =>
//                 db3.collection('surveys').findOne({ specialty: speciality.name })
//             );

//             const surveyResults = await Promise.all(surveyPromises);
//         }

//         // Initialize aiMessage to the existing message or an empty string
//         let aiMessage = user1.aiMessage || '';
//         let aiMessageArabic = user1.aiMessageArabic || '';
        
//         // Determine if 30 days have passed since the last AI message generation
//         const currentDate = new Date();
//         const lastGeneratedDate = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists

//         const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
//         const isThirtyDaysPassed = (currentDate - lastGeneratedDate) > thirtyDaysInMs;
        
//         if (!isThirtyDaysPassed && aiMessage && aiMessageArabic) {
//             console.log('Using existing AI message (English and Arabic).');
//         } else {
//             try {
//                 // Fetch the AI-generated message if 30 days have passed
//                 const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
//                 const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
//                 const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);

//                 const ensureFileExists = async (filePath) => {
//                     try {
//                         await fs.promises.stat(filePath);
//                     } catch (error) {
//                         if (error.code === 'ENOENT') {
//                             console.warn(`File ${filePath} not found. Creating an empty file.`);
//                             await fs.promises.writeFile(filePath, '');
//                         } else {
//                             throw error;
//                         }
//                     }
//                     };
                
                
//                 // Ensure the required files exist or create empty ones
//                 await Promise.all([
//                     ensureFileExists(severityLevelsCsv),
//                     ensureFileExists(patientHealthScoresCsv),
//                     ensureFileExists(apiSurveysCsv)
//                 ]);
                
//                 const scriptOutput = await new Promise((resolve, reject) => {
//                     exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
//                         if (error) {
//                             console.error(`Error generating AI message: ${error.message}`);
//                             reject(error);
//                         }
//                         resolve(stdout.trim());
//                     });
//                 });
        
//                 // Parse the JSON returned by the Python script
//                 let parsedOutput;
//                 try {
//                     parsedOutput = JSON.parse(scriptOutput);
//                 } catch (parseError) {
//                     throw new Error(`Error parsing JSON from patientprompt.py: ${parseError.message}`);
//                 }
        
//                 // Extract both English summary and Arabic translation
//                 aiMessage = parsedOutput.english_summary;
//                 aiMessageArabic = parsedOutput.arabic_translation;
        
//                 console.log('English Summary:', aiMessage);
//                 console.log('Arabic Translation:', aiMessageArabic);
        
//                 // Update the AI messages and the generation date in the database
//                 await db1.collection('patient_data').updateOne(
//                     { Mr_no: user1.Mr_no },
//                     {
//                         $set: {
//                             aiMessage: aiMessage,
//                             aiMessageArabic: aiMessageArabic,
//                             aiMessageGeneratedAt: currentDate,
//                         },
//                     }
//                 );
//                 user1 = await db1.collection('patient_data').findOne({ Mr_no: identifier });
//             } catch (error) {
//                 console.error('Error generating AI message:', error);
//                 aiMessage = 'Unable to generate AI message at this time.';
//                 aiMessageArabic = '';
//             }
//         }

//         // Fetch `patient_health_scores` from the database
//         const patientData = await db1.collection('patient_data').findOne({ Mr_no: user1.Mr_no });

//         // Check if `patient_health_scores` exists in the database
//         if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
//             req.flash('error', getMessage('noHealthScores'));
//             return res.redirect(basePath);
//         }

//         // Store user in session
//         req.session.user = user1;
        
//         // Store user's language preference in session if not already set
//         if (!req.session.lng) {
//             req.session.lng = userLang;
//         }

//         // Redirect to user details page
//         return res.redirect(basePath + '/userDetails');
//     } else {
//           writeDbLog('access', {
//             action: 'login_user_not_found',
//             identifier,
//             ip
//         });
//         // User not found
//         req.flash('error', getMessage('userNotFound'));
//         return res.redirect(basePath);
//     }
// });


router.post('/login', async (req, res) => {
    let { identifier, password } = req.body;
    const ip = req.ip;

    // Get user's language preference from session, cookie or default to English
    const userLang = req.session.lng || req.cookies.lng || 'en';

    writeDbLog('access', {
        action: 'login_attempt',
        identifier,
        ip
    });

    // Define flash messages in both languages
    const messages = {
        en: {
            registerRequired: 'Please register to sign in',
            invalidCredentials: 'Invalid credentials',
            internalError: 'Internal server error',
            noHealthScores: 'No patient health scores found for this patient.',
            userNotFound: 'These details are not found'
        },
        ar: {
            registerRequired: 'الرجاء التسجيل لتسجيل الدخول',
            invalidCredentials: 'بيانات اعتماد غير صالحة',
            internalError: 'خطأ في الخادم الداخلي',
            noHealthScores: 'لم يتم العثور على نتائج صحية لهذا المريض',
            userNotFound: 'لم يتم العثور على هذه التفاصيل'
        }
    };

    // Helper function to get message in appropriate language
    const getMessage = (messageKey) => {
        return messages[userLang]?.[messageKey] || messages.en[messageKey];
    };

    // --- Step 1: Find user by MR number or phone number ---
    const user = await db1.collection('patient_data').findOne({
        $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
    });

    if (!user) {
        writeDbLog('access', {
            action: 'login_user_not_found',
            identifier,
            ip
        });
        // User not found
        req.flash('error', getMessage('userNotFound'));
        return res.redirect(basePath);
    }

    // --- Step 2: Authenticate User ---
    if (!user.password) {
        writeDbLog('access', { action: 'login_register_required', Mr_no: user.Mr_no, ip });
        req.flash('error', getMessage('registerRequired'));
        return res.redirect(basePath);
    }

    try {
        const decryptedPassword = decrypt(user.password);
        if (decryptedPassword !== password) {
            writeDbLog('access', {
                action: 'login_failed',
                Mr_no: user.Mr_no,
                ip
            });
            req.flash('error', getMessage('invalidCredentials'));
            return res.redirect(basePath);
        }
        writeDbLog('access', {
            action: 'login_success',
            Mr_no: user.Mr_no,
            ip
        });
        console.log('Login successful');
    } catch (err) {
        writeDbLog('error', {
            action: 'login_decrypt_error',
            Mr_no: user.Mr_no,
            message: err.message,
            stack: err.stack
        });
        console.error('Error decrypting password:', err);
        req.flash('error', getMessage('internalError'));
        return res.redirect(basePath);
    }

    // --- Step 3: Business Logic Checks ---
    if (user.surveyStatus === 'Not Completed' && !user.hasOwnProperty('appointmentFinished')) {
        writeDbLog('access', {
            action: 'login_redirect_survey',
            Mr_no: user.Mr_no
        });
        return res.redirect(`${process.env.PATIENT_SURVEY_APP_URL}/search?identifier=${user.Mr_no}`);
    }

    // --- Step 4: Final Data Validation ---
    // Check if essential survey data exists before creating the session.
    if (!user.SurveyData || !user.SurveyData.patient_health_scores) {
        req.flash('error', getMessage('noHealthScores'));
        return res.redirect(basePath);
    }

    // --- Step 5: Finalize Session and Redirect ---
    // All checks passed, user is authenticated successfully.
    req.session.user = user;
    
    if (!req.session.lng) {
        req.session.lng = userLang;
    }

    return res.redirect(basePath + '/userDetails');
});


    app.use((req, res, next) => {
  const currentLanguage = 
      req.query.lng
   || req.query.lang      // ← also check for `?lang=`
   || req.cookies.lng
   || req.cookies.lang    // ← and fallback to cookie `lang`
   || 'en';
  const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

        res.locals.lng = currentLanguage; // Set the language for EJS templates
        res.locals.dir = dir;             // Set the direction for EJS templates

        res.cookie('lng', currentLanguage); // Persist language in cookies
        res.cookie('lang', currentLanguage, { path: '/', maxAge: 7*24*60*60*1000 });
        req.language = currentLanguage;
        req.dir = dir;
        res.locals.message = req.flash('error');
        next();
    });


    

router.get('/logout', async (req, res) => {
  console.log('🛑 Logout route hit');

  // 1️⃣ If there’s user data, log it
  if (req.session?.user) {
    const { Mr_no, fullName, hospital_code, speciality } = req.session.user;

    try {
      await writeDbLog('access', {
        action: 'logout',
        Mr_no,
        fullName,
        hospital_code,
        speciality,
        ip: req.ip
      });
      console.log('✅ Logout event written to DB');
    } catch (err) {
      console.error('❌ Error writing logout event:', err);
    }
  } else {
    console.warn('⚠️ No session.user found; skipping logout DB write');
  }

  // 2️⃣ Now destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Session destroy error:', err);
    }
    // 3️⃣ Clear the cookie and redirect
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect(basePath);
  });
});


    
    
    


router.get('/chart', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/patient_health_scores_${mr_no}.csv`;
    res.render('chart', { csvPath });
});


router.get('/chart1', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/PROMIS Bank v1.1 - Pain Interference_${mr_no}.csv`;
    res.render('chart1', { csvPath});
});

router.get('/register', (req, res) => {
        res.redirect(process.env.PATIENT_PASSWORD_APP_URL);
    });

    // GET route for Reset Password link
    router.get('/reset-password', (req, res) => {
        res.redirect(process.env.PATIENT_PASSWORD_APP_URL);
    });

// router.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;
//     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });

//     // Fetch AI message from the database
//     const patient = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });
//     const aiMessage = patient ? patient.aiMessage : 'Your AI generated message goes here.';

//     const lang = req.query.lang || 'en';
    
//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
//         aiMessage: aiMessage, // Pass the AI message to the template
//         lang: lang  // Pass the language preference to the template
//     });
// });


//new code after pulling the SurveyData from database instead of csv files(under data folder).

// Route to serve patient_health_scores as a virtual CSV
// router.get('/patient_health_scores_csv', async (req, res) => {
//     const { mr_no } = req.query;

router.get('/patient_health_scores_csv', async (req, res) => {
        const { hashedMr_no } = req.query;
        const patient = await db1.collection('patient_data').findOne({ hashedMrNo: hashedMr_no });
        const mr_no = patient ? patient.Mr_no : null;          // fall back handled below

    try {
        // Fetch patient_health_scores from the database
        const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
            return res.status(404).send('Patient health scores not found.');
        }

        // Flatten the patient_health_scores data for CSV format
        const patientHealthScores = patientData.SurveyData.patient_health_scores.map(score => ({
            date: score.date,
            months_since_baseline: score.months_since_baseline,
            score: score.score,
            trace_name: score.trace_name,
            title: score.title,
            ymin: score.ymin,
            ymax: score.ymax,
            event_date: score.event_date,
            event: score.event,
        }));

        // Convert the data to CSV
        const parser = new Parser({ fields: Object.keys(patientHealthScores[0]) });
        const csv = parser.parse(patientHealthScores);

        // Serve the CSV
        res.header('Content-Type', 'text/csv');
        res.attachment();
        res.send(csv);
    } catch (err) {
        console.error('Error generating patient health scores CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Route to serve API_SURVEYS as a virtual CSV
// router.get('/api_surveys_csv', async (req, res) => {
//     const { mr_no } = req.query;

//     try {
//         // Fetch API_SURVEYS data from the database
//         const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

//         if (!patientData || !patientData.SurveyData || !patientData.SurveyData.API_SURVEYS) {
//             return res.status(404).send('API_SURVEYS data not found.');
//         }

//         // Flatten the API_SURVEYS data for CSV format
//         const apiSurveysData = patientData.SurveyData.API_SURVEYS.map(survey => ({
//             date: survey.date,
//             months_since_baseline: survey.months_since_baseline,
//             score: survey.score,
//             trace_name: survey.trace_name,
//             title: survey.title,
//             ymin: survey.ymin,
//             ymax: survey.ymax,
//             event_date: survey.event_date,
//             event: survey.event,
//         }));

//         // Convert the data to CSV
//         const parser = new Parser({ fields: Object.keys(apiSurveysData[0]) });
//         const csv = parser.parse(apiSurveysData);

//         // Serve the CSV
//         res.header('Content-Type', 'text/csv');
//         res.attachment(`API_SURVEYS_${mr_no}.csv`);
//         res.send(csv);
//     } catch (err) {
//         console.error('Error generating API_SURVEYS CSV:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// Route to serve API_SURVEYS as a virtual CSV
// router.get('/api_surveys_csv', async (req, res) => {
//     const { mr_no } = req.query;

router.get('/api_surveys_csv', async (req, res) => {
        const { hashedMr_no } = req.query;
        const patient = await db1.collection('patient_data').findOne({ hashedMrNo: hashedMr_no });
        const mr_no = patient ? patient.Mr_no : null;
    try {
        // Fetch API_SURVEYS data from the database
        const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData) {
            return res.status(404).send('Survey data not found for this patient.');
        }

        const apiSurveysData = patientData.SurveyData.API_SURVEYS;

        // Handle the case where API_SURVEYS is empty or undefined
        if (!apiSurveysData || apiSurveysData.length === 0) {
            return res.status(200).send('No API_SURVEYS data available for this patient.');
        }

        // Flatten the API_SURVEYS data for CSV format
        const flattenedData = apiSurveysData.map(survey => ({
            date: survey.date || '',
            months_since_baseline: survey.months_since_baseline || '',
            score: survey.score || '',
            trace_name: survey.trace_name || '',
            title: survey.title || '',
            ymin: survey.ymin || '',
            ymax: survey.ymax || '',
            event_date: survey.event_date || '',
            event: survey.event || '',
        }));

        // Convert the data to CSV
        const parser = new Parser({ fields: Object.keys(flattenedData[0]) });
        const csv = parser.parse(flattenedData);

        // Serve the CSV
        res.header('Content-Type', 'text/csv');
        res.attachment();
        res.send(csv);
    } catch (err) {
        console.error('Error generating API_SURVEYS CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});



// router.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;

//     // Fetch SurveyData -> patient_health_scores from the database
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });

//     if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
//         req.flash('error', 'No patient health scores found.');
//         return res.redirect(basePath);
//     }

//     // Get the patient_health_scores from the database
//     const patientHealthScores = patientData.SurveyData.patient_health_scores;

//     // Fetch AI message from the database
//     const aiMessage = patientData.aiMessage || 'Your AI generated message goes here.';

//     const lang = req.query.lang || 'en';

//     res.render('userDetails', { 
//         user: user,
//         surveyName: user.specialities.map(s => s.name),
//         patientHealthScores: patientHealthScores, // Pass scores instead of the CSV path
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`, // Keep API_SURVEYS as CSV
//         aiMessage: aiMessage,
//         lang: lang
//     });
// });


// router.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;

//     // Fetch patient data and AI message from the database
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });
//     const aiMessage = patientData ? patientData.aiMessage : 'Your AI-generated message goes here.';

//     const lang = req.query.lang || 'en';

//     res.render('userDetails', { 
//         user: user,
//         surveyName: user.specialities.map(s => s.name),
//         csvPath: `${basePath}/patient_health_scores_csv?mr_no=${user.Mr_no}`, // Virtual CSV path
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`, // Keep API_SURVEYS as CSV
//         aiMessage: aiMessage,
//         lang: lang
//     });
// });

// router.get('/userDetails', checkAuth, async (req, res) => {
//     const user = req.session.user;
//     const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });

//     // Fetch AI message from the database
//     const patient = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });
//     const aiMessage = patient ? patient.aiMessage : 'Your AI generated message goes here.';

//     const lang = req.query.lang || 'en';
    
//     res.render('userDetails', { 
//         user: user, 
//         surveyName: surveyData ? surveyData.surveyName : [], 
//         csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
//         painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
//         aiMessage: aiMessage, // Pass the AI message to the template
//         lang: lang  // Pass the language preference to the template
//     });
// });

router.get('/userDetails', checkAuth, async (req, res) => {
    const user = req.session.user;

    // Fetch patient data and AI message from the database
    const patientData = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });

    // Overwrite the session user with the fresh DB AI fields
    if (patientData) {
        user.aiMessage = patientData.aiMessage;
        user.aiMessageArabic = patientData.aiMessageArabic;
    }

    const lang = req.query.lang || 'en';

    res.render('userDetails', { 
        lng: res.locals.lng,
        dir: res.locals.dir,
        user: user,
        surveyName: user.specialities.map(s => s.name),
        // csvPath: `${basePath}/patient_health_scores_csv?mr_no=${user.Mr_no}`,
        // painCsvPath: `${basePath}/api_surveys_csv?mr_no=${user.Mr_no}`,
        csvPath:  `${basePath}/patient_health_scores_csv?hashedMr_no=${user.hashedMrNo}`,
        painCsvPath:`${basePath}/api_surveys_csv?hashedMr_no=${user.hashedMrNo}`,
        aiMessage: user.aiMessage,           // Now definitely the fresh version
        aiMessageArabic: user.aiMessageArabic,
        lang: lang
    });
});



function cleanItems(itemsArray) {
    return itemsArray.map(item => {
        return {
            Elements: item.Elements.map(element => ({
                Description: element.Description
            }))
        };
    });
}

router.get('/survey-details/:mr_no', checkAuth, async (req, res) => {
    const mr_no = req.params.mr_no;
    const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

    if (patientData && patientData.FORM_ID) {
        for (let formId in patientData.FORM_ID) {
            patientData.FORM_ID[formId].assessments.forEach(assessment => {
                if (assessment.Items && Array.isArray(assessment.Items)) {
                    assessment.Items = cleanItems(assessment.Items);
                }
            });
        }
    }

    if (patientData) {
        res.render('surveyDetails', { user: patientData });
    } else {
        res.status(404).json({ error: 'Patient not found' });
    }
});

// router.get('/edit-details', async (req, res) => {
//     const { Mr_no } = req.query;

//     try {
//         // Fetch the patient data based on MR number
//         const patient = await db1.collection('patient_data').findOne({ Mr_no });

//         if (patient) {
//             // Format the patient's DOB to the desired format (MM/DD/YYYY) for display
//             let formattedDisplayDOB = '';
//             let formattedInputDOB = '';
//             if (patient.DOB) {
//                 const dob = new Date(patient.DOB);
//                 const month = (dob.getMonth() + 1).toString().padStart(2, '0'); // Ensure 2-digit month
//                 const day = dob.getDate().toString().padStart(2, '0'); // Ensure 2-digit day
//                 formattedDisplayDOB = `${month}/${day}/${dob.getFullYear()}`;
//                 formattedInputDOB = `${dob.getFullYear()}-${month}-${day}`; // For input field
//             }

//             // Prepare the patient data to be rendered
//             const formattedPatient = {
//                 mrNo: patient.Mr_no,
//                 firstName: patient.firstName || '',
//                 middleName: patient.middleName || '',
//                 lastName: patient.lastName || '',
//                 displayDOB: formattedDisplayDOB,
//                 height:patient.height,
//                 gender:patient.gender,
//                 inputDOB: formattedInputDOB,
//                 phoneNumber: patient.phoneNumber || '',
//                 password: patient.password || '' // Note: Should not be displayed in the frontend
//             };

//             // Render the edit-details template with the patient data
//             res.render('edit-details', { 
//                 patient: formattedPatient,
//                 lng: res.locals.lng,
//                 dir: res.locals.dir, 
//             });
//         } else {
//             // Handle case where patient is not found
//             res.status(404).send('Patient not found');
//         }
//     } catch (error) {
//         console.error('Error fetching patient data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


router.get('/edit-details', checkAuth, async (req, res) => {
    const { hashedMr_no } = req.query; // Use hashedMr_no instead of Mr_no
    const user = req.session.user;

    try {
        // Fetch the patient data based on hashedMr_no
        const patient = await db1.collection('patient_data').findOne({ hashedMrNo: hashedMr_no });

        if (patient) {
            // Format the patient's DOB and prepare patient data for rendering
            let formattedDisplayDOB = '';
            let formattedInputDOB = '';
            if (patient.DOB) {
                const dob = new Date(patient.DOB);
                const month = (dob.getMonth() + 1).toString().padStart(2, '0');
                const day = dob.getDate().toString().padStart(2, '0');
                formattedDisplayDOB = `${month}/${day}/${dob.getFullYear()}`;
                formattedInputDOB = `${dob.getFullYear()}-${month}-${day}`;
            }

            const formattedPatient = {
                mrNo: patient.Mr_no,
                hashedMr_no: patient.hashedMrNo,
                fullName: patient.fullName || '',
                // middleName: patient.middleName || '',
                // lastName: patient.lastName || '',
                displayDOB: formattedDisplayDOB,
                inputDOB: formattedInputDOB,
                gender: patient.gender || '',
                phoneNumber: patient.phoneNumber || '',
                password: patient.password || '' // Avoid displaying sensitive data
            };

            // Render the `edit-details` page
            res.render('edit-details', {
                user: user,
                patient: formattedPatient,
                lng: res.locals.lng,
                dir: res.locals.dir,
            });
        } else {
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).send('Internal Server Error');
    }
});




// router.post('/update-data', async (req, res) => {
//     try {
//         const { hashedMr_no, firstName, middleName, lastName, DOB, phoneNumber, password, Confirm_Password } = req.body;

//         // Check if the password and confirm password match
//         if (password && password !== Confirm_Password) {
//             req.flash('error', 'Passwords do not match.');
//             return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
//         }

//         // Prepare the update object
//         let updateData = {};
//         if (firstName) updateData.firstName = firstName;
//         if (middleName) updateData.middleName = middleName;
//         if (lastName) updateData.lastName = lastName;
//         if (DOB) updateData.DOB = DOB;
//         if (phoneNumber) updateData.phoneNumber = phoneNumber;
//         // if (password) updateData.password = password;
//         if (password) {
//             const encryptedPassword = encrypt(password);
//             updateData.password = encryptedPassword;
//         }        
//         // Check if there's anything to update
//         if (Object.keys(updateData).length === 0) {
//             req.flash('error', 'No updates were made.');
//             return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
//         }

//         // Update the patient document
//         const updateResult = await db1.collection('patient_data').updateOne(
//             { hashedMrNo: hashedMr_no },
//             { $set: updateData }
//         );

//         if (updateResult.modifiedCount === 1) {
//             req.flash('success', 'Record updated successfully');
//             Object.keys(updateData).forEach(field => {
//                 req.session.user[field] = updateData[field];
//             });
//         } else {
//             req.flash('error', 'No changes were made or record update failed.');
//         }

//         // Redirect using hashedMr_no
//         res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
//     } catch (error) {
//         console.error("Error updating patient record:", error);
//         req.flash('error', 'Internal Server Error');
//         res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
//     }
// });


// Function to flatten nested objects

router.post('/update-data', async (req, res) => {
    try {
      const {
        hashedMr_no,
        fullName,
        // middleName,
        // lastName,
        DOB,
        phoneNumber,
        password,
        Confirm_Password
      } = req.body;
  
      // 1) Ensure passwords match
      if (password && password !== Confirm_Password) {
       writeDbLog('error', {
        action: 'update_data_password_mismatch',
        Mr_no: (req.session && req.session.user || {}).Mr_no || null,
        ip: req.ip
      });
        req.flash('error', 'Passwords do not match.');
        return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
      }
  
      // 2) Load the existing record so we can compare DOB
      const existing = await db1.collection('patient_data')
                                .findOne({ hashedMrNo: hashedMr_no });
      if (!existing) {
       writeDbLog('error', {
        action: 'update_data_patient_not_found',
          Mr_no: (req.session && req.session.user || {}).Mr_no || null,
        ip: req.ip
      });
        req.flash('error', 'Patient not found.');
        return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
      }

function usToIso(usDate) {
  const m = usDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, month, day, year] = m;

  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Helper: turn "YYYY-MM-DD" → "M/D/YYYY"
function isoToUs(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${parseInt(month,10)}/${parseInt(day,10)}/${year}`;
}



const updateData = {};

// fullName (same as before)
if (fullName && fullName !== existing.fullName) {
  updateData.fullName = fullName;
}

// DOB
    if (DOB) {
      // 1) Normalize existing.DOB into ISO
      let existingIso = null;
      if (typeof existing.DOB === 'string') {
        existingIso = usToIso(existing.DOB);
      } else if (existing.DOB instanceof Date) {
        existingIso = existing.DOB.toISOString().slice(0,10);
      }

      // 2) Compare
      if (existingIso && existingIso !== DOB) {
        // 3) Store back into US style without leading zeros
        updateData.DOB = isoToUs(DOB);
      }
    }

// phoneNumber
if (phoneNumber && phoneNumber !== existing.phoneNumber) {
  updateData.phoneNumber = phoneNumber;
}

// password (same as before)
if (password) {
  updateData.password = encrypt(password);
}


  
      // 4) Bail if nothing to update
      if (Object.keys(updateData).length === 0) {
       writeDbLog('error', {
        action: 'update_data_no_changes',
          Mr_no: (req.session && req.session.user || {}).Mr_no || null,
        ip: req.ip
      });
        req.flash('error', 'No updates were made.');
        return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
      }
  
      // 5) Apply to BOTH databases in parallel
      const [r1, r2] = await Promise.all([
        db1.collection('patient_data')
           .updateOne({ hashedMrNo: hashedMr_no }, { $set: updateData }),
        db2.collection('patient_data')
           .updateOne({ hashedMrNo: hashedMr_no }, { $set: updateData })
      ]);
  
      // 6) If either write actually modified something, success
      if ((r1.modifiedCount + r2.modifiedCount) > 0) {
       writeDbLog('audit', {
        action: 'update_data_success',
          Mr_no: (req.session && req.session.user || {}).Mr_no || null,
        changedFields: Object.keys(updateData),
        ip: req.ip
      });
        req.flash('success', 'Record updated successfully');
        // sync session so your page immediately shows the change
        Object.entries(updateData).forEach(([k,v]) => {
          req.session.user[k] = v;
        });
      } else {
       writeDbLog('error', {
        action: 'update_data_failed',
          Mr_no: (req.session && req.session.user || {}).Mr_no || null,
        attemptedFields: Object.keys(updateData),
        ip: req.ip
      });
        req.flash('error', 'No changes were made or update failed.');
      }
  
      // 7) Go back to the form
      return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
  
    } catch (err) {
    // 8) Catch‐all unexpected errors
     writeDbLog('error', {
      action: 'update_data_handler_error',
      message: err.message,
      stack: err.stack,
          Mr_no: (req.session && req.session.user || {}).Mr_no || null,
      ip: req.ip
    });
      console.error('Error updating patient record:', err);
      req.flash('error', 'Internal Server Error');
      return res.redirect(`${basePath}/edit-details?hashedMr_no=${hashedMr_no}`);
    }
  });

function flattenObject(ob, prefix = '') {
    let toReturn = {};

    for (let i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        let newPrefix = prefix ? `${prefix}_${i}` : i;

        if (Array.isArray(ob[i])) {
            toReturn[newPrefix] = JSON.stringify(ob[i]);
        } else if (typeof ob[i] === 'object' && ob[i] !== null) {
            Object.assign(toReturn, flattenObject(ob[i], newPrefix));
        } else {
            toReturn[newPrefix] = ob[i];
        }
    }
    return toReturn;
}

// Update the CSV export route to include the additional exclusion of ObjectId
router.get('/export-survey-csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await db1.collection('patient_data').findOne({ Mr_no: mr_no });

        if (!patientData) {
            return res.status(404).send('Patient not found');
        }

        // Include FORM_ID fields
        if (patientData.FORM_ID) {
            for (let formId in patientData.FORM_ID) {
                let form = patientData.FORM_ID[formId];
                patientData[`FORM_ID_${formId}`] = form;
            }
        }

        const flattenedData = flattenObject(patientData);

        // Fields to exclude
        const excludeFields = ['speciality', 'phoneNumber', 'hashedMrNo', 'password', '_id'];

        // Filter out the fields to exclude
        const filteredData = Object.keys(flattenedData)
            .filter(key => !excludeFields.some(exclude => key.includes(exclude)))
            .reduce((obj, key) => {
                obj[key] = flattenedData[key];
                return obj;
            }, {});

        const csvFields = Object.keys(filteredData);
        const csvParser = new Parser({ fields: csvFields });
        const csvData = csvParser.parse(filteredData);

        res.header('Content-Type', 'text/csv');
        res.attachment();
        return res.send(csvData);
    } catch (err) {
        console.error('Error generating CSV:', err);
        return res.status(500).send('Internal Server Error');
    }
});


router.get('/eq5d-vas-data', checkAuth, async (req, res) => {
    const { hashedMr_no } = req.query;

    console.log(`\n--- [SERVER /eq5d-vas-data] ---`);
    console.log(`[SERVER LOG] Request received for hashedMr_no: ${hashedMr_no}`);

    if (!hashedMr_no) {
        console.error("[SERVER LOG] ERROR: hashedMr_no is missing in the request query.");
        return res.status(400).json({ error: 'hashedMr_no is required' });
    }

    try {
        console.log(`[SERVER LOG] Attempting to find patient with hashedMrNo: '${hashedMr_no}' in db1.patient_data`);
        const patientData = await db1.collection('patient_data').findOne({ hashedMrNo: hashedMr_no });

        if (!patientData) {
            console.warn(`[SERVER LOG] WARNING: Patient not found for hashedMrNo: '${hashedMr_no}'`);
            return res.status(404).json({ error: 'Patient not found' });
        }
        console.log(`[SERVER LOG] Patient data FOUND for '${hashedMr_no}'.`);

        // For debugging, log a portion of the patientData if EQ-5D exists
        if (patientData['EQ-5D']) {
            console.log("[SERVER LOG] 'EQ-5D' object from patientData:", JSON.stringify(patientData['EQ-5D'], null, 2));
        } else {
            console.warn("[SERVER LOG] WARNING: 'EQ-5D' object NOT FOUND in patientData for this patient.");
        }

        let vasDataPoints = [];
        const eq5dMainObject = patientData['EQ-5D']; // Main object containing EQ-5D_0, EQ-5D_1 etc.

        if (eq5dMainObject && typeof eq5dMainObject === 'object' && !Array.isArray(eq5dMainObject)) {
            console.log("[SERVER LOG] 'EQ-5D' field is a valid object. Processing instances (EQ-5D_0, EQ-5D_1...).");
            let index = 0;
            while (true) {
                const instanceKey = `EQ-5D_${index}`; // Key like 'EQ-5D_0', 'EQ-5D_1'
                console.log(`[SERVER LOG] Checking for instance key: '${instanceKey}' in eq5dMainObject`);

                const eq5dInstance = eq5dMainObject[instanceKey];

                if (eq5dInstance) {
                    console.log(`[SERVER LOG] Found instance '${instanceKey}':`, JSON.stringify(eq5dInstance, null, 2));

                    if (typeof eq5dInstance.VAS_value !== 'undefined' && eq5dInstance.VAS_value !== null) {
                        const vasScoreString = String(eq5dInstance.VAS_value).trim();
                        const vasScore = Number(vasScoreString);

                        if (!isNaN(vasScore)) {
                            vasDataPoints.push({
                                instance: index + 1, // Frontend expects instance starting from 1
                                vasScore: vasScore
                            });
                            console.log(`[SERVER LOG] SUCCESS: Added instance ${index + 1} with VAS Score = ${vasScore}`);
                        } else {
                            console.warn(`[SERVER LOG] WARNING: Invalid VAS_value (NaN after parsing) for key '${instanceKey}'. Original value: '${eq5dInstance.VAS_value}'`);
                        }
                    } else {
                        console.warn(`[SERVER LOG] WARNING: VAS_value is missing or null in instance '${instanceKey}'.`);
                    }
                    index++;
                } else {
                    console.log(`[SERVER LOG] No instance found for key '${instanceKey}'. Stopping loop. Last successful index was ${index -1}.`);
                    break; // Exit loop if EQ-5D_index does not exist
                }
            }
        } else {
            if (!eq5dMainObject) {
                console.warn(`[SERVER LOG] WARNING: 'EQ-5D' field was not found at all in patient data for '${hashedMr_no}'.`);
            } else {
                console.warn(`[SERVER LOG] WARNING: 'EQ-5D' field is not the expected object structure for '${hashedMr_no}'. Type: ${typeof eq5dMainObject}`);
            }
        }

        if (vasDataPoints.length > 0) {
            console.log(`[SERVER LOG] Successfully extracted ${vasDataPoints.length} VAS data points for '${hashedMr_no}'. Response:`, JSON.stringify(vasDataPoints, null, 2));
        } else {
            console.warn(`[SERVER LOG] WARNING: No VAS data points were extracted for '${hashedMr_no}'. Sending empty array.`);
        }

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(vasDataPoints);

    } catch (error) {
        console.error(`[SERVER LOG] CRITICAL ERROR in /eq5d-vas-data for '${hashedMr_no}':`, error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
    console.log(`--- [SERVER /eq5d-vas-data] Request processing finished for ${hashedMr_no} ---`);
});


app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const { Mr_no } = req.session.user || {};
    // const logData = `Error type: ${err.message}, timestamp: ${timestamp}, Mr_no: ${Mr_no || 'N/A'}`;
    // writeLog('error_logs.txt', logData);
      const userMr = (req.session.user || {}).Mr_no;
  writeDbLog('error', {
    Mr_no: userMr || null,
    message: err.message,
    stack: err.stack
  });

    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});


    // Mount the router at basePath
    app.use(basePath, router);

    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on https://app.wehealthify.org${basePath}`);
    });
}


// Export the function to start the server
module.exports = startServer;