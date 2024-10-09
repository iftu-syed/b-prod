const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const path = require('path');
const ejs = require('ejs');
// const fs = require('fs').promises; // Use promises version of fs for better async handling
const fs = require('fs');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { Parser } = require('json2csv'); // Add this at the top with other requires
const xml2js = require('xml2js'); // Add this at the top with other requires
require('dotenv').config();
// Load .env file
// require('dotenv').config({ path: path.resolve(__dirname, '.env') });
// console.log(`Loaded ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`); // Ensure the key is loaded

const crypto = require('crypto');
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

async function startServer() {
    const app = express();
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
            mongoUrl: 'mongodb://localhost:27017/Data_Entry_Incoming', // Use a different database for sessions
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
    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');
    next();
});


    // Serve static files (login page)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
    app.use('/data', express.static(path.join(__dirname, 'data')));



    // // MongoDB connection URL
    // const uri1 = 'mongodb://localhost:27017/Data_Entry_Incoming';
    // const uri2 = 'mongodb://localhost:27017/patient_data';
    // const uri3 = 'mongodb://localhost:27017/manage_doctors';
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

    console.log('Connected to all databases');

    // Middleware to check if user is logged in
    function checkAuth(req, res, next) {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/');
        }
    }

    function writeLog(logFile, logData) {
        fs.appendFile(path.join(__dirname, 'logs', logFile), logData + '\n', (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }
    app.use((req, res, next) => {
        if (req.session && req.session.user) {
            const { Mr_no, firstName, lastName, hospital_code, speciality } = req.session.user;
            const timestamp = new Date().toISOString();
            const logData = `Mr_no: ${Mr_no}, firstName: ${firstName}, lastName: ${lastName}, hospital: ${hospital_code}, speciality: ${speciality}, timestamp: ${timestamp}, page: ${req.path}, action: ${req.method}`;
            writeLog('access_logs.txt', logData);
        }
        next();
    });
    


    // Serve login page on root URL
    app.get('/', (req, res) => {
        const message = req.flash('error')[0]; // Get the flash message if any
        const messageType = 'error'; // Default message type
        res.render('login', { message, messageType });
    });

    app.get('/login', async (req, res) => {
        const { Mr_no, password } = req.query;

        const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
        if (user1) {
            // const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
            const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
            const customSurveys = surveyData ? surveyData.custom : [];

            // return res.render('userDetails', { user: user1, surveyName: surveyData ? surveyData.surveyName : [] });
            return res.render('userDetails', { user: user1, customSurveys: customSurveys });
        }
        res.redirect('/');
    });
    
// Example route to handle /openServer request
app.get('/openServer', (req, res) => {
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

    




    app.post('/login', async (req, res) => {
        let { identifier, password } = req.body;
    
        // Find user by MR number or phone number
        const user1 = await db1.collection('patient_data').findOne({
            $or: [{ Mr_no: identifier }, { phoneNumber: identifier }]
        });
    
        if (user1) {
            // Check if the password is set
            if (!user1.password) {
                req.flash('error', 'Please, register to sign in');
                return res.redirect('/');
            }

        try {
            // Decrypt the stored password
            const decryptedPassword = decrypt(user1.password);

            // Compare the decrypted password with the provided password
            if (decryptedPassword !== password) {
                console.log(`Provided Password: ${password}`); // Log the provided password
                req.flash('error', 'Invalid credentials');
                return res.redirect('/');
            }

            console.log('Login successful'); // Log successful login
        } catch (err) {
            console.error('Error decrypting password:', err);
            req.flash('error', 'Internal server error');
            return res.redirect('/');
        }

            // Check survey status and appointment finished count
            if (user1.surveyStatus === 'Not Completed') {
                if (!user1.hasOwnProperty('appointmentFinished')) {
                    // Redirect to the specified page if `appointmentFinished` field is absent
                    return res.redirect(`http://localhost:3088/search?identifier=${user1.Mr_no}`);
                }
            }
    
            // Password matches, user authenticated successfully
            req.session.user = user1;
    
            const newFolderDirectory = path.join(__dirname, 'new_folder');
            // await clearDirectory(newFolderDirectory);
    
            // Define a function to execute Python script
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
    
            // Define a function to generate CSV
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
    
            // Define a function to execute Python script for graph generation
            // const generateGraphs = (mr_no, survey_type) => {
            //     return new Promise((resolve, reject) => {
            //         const command = `python3 common_login/python_scripts/script1.py ${mr_no} "${survey_type}"`;
            //         exec(command, (error, stdout, stderr) => {
            //             if (error) {
            //                 console.error(`Error generating graph for ${survey_type}: ${error.message}`);
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
            
    
            // Check if the user has an API array in their record
if (user1.API && Array.isArray(user1.API) && user1.API.length > 0) {
    // If API array exists, execute API_script.py
    await executePythonScript('API_script', [user1.Mr_no]);
} else {
    // Otherwise, proceed with the existing logic for generating graphs for specialities
    await executePythonScript('API_script', [user1.Mr_no]);

    // Fetch all survey data for user's specialities in parallel
    const surveyPromises = user1.specialities.map(speciality =>
        db3.collection('surveys').findOne({ specialty: speciality.name })
    );

    const surveyResults = await Promise.all(surveyPromises);
    
    const graphPromises = surveyResults.map((surveyData, index) => {
        const specialityName = user1.specialities[index].name;
        // const customSurveys = surveyData ? surveyData.custom : [];
        const customSurveys = surveyData && Array.isArray(surveyData.custom) ? surveyData.custom : [];
        if (customSurveys.length > 0) {
            return Promise.all(customSurveys.map(customType => generateGraphs(user1.Mr_no, customType)));
        } else {
            console.warn(`No custom types available for speciality: ${specialityName}`);
            return Promise.resolve();
        }
    });

    await Promise.all(graphPromises.flat());
}


            // Initialize aiMessage to the existing message or an empty string
            let aiMessage = user1.aiMessage || '';
    
            // Determine if 30 days have passed since the last AI message generation
            const currentDate = new Date();
            const lastGeneratedDate = user1.aiMessageGeneratedAt || new Date(0); // Default to epoch if no date exists
    
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const isThirtyDaysPassed = (currentDate - lastGeneratedDate) > thirtyDaysInMs;
    
            if (!isThirtyDaysPassed && aiMessage) {
                console.log('Using existing AI message');
            } else {
                try {
                    // Fetch the AI-generated message if 30 days have passed
                    const severityLevelsCsv = path.join(__dirname, 'public', 'SeverityLevels.csv');
                    const patientHealthScoresCsv = path.join(__dirname, 'data', `patient_health_scores_${user1.Mr_no}.csv`);
                    const apiSurveysCsv = path.join(__dirname, 'data', `API_SURVEYS_${user1.Mr_no}.csv`);
    

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
                    
                    
                    // Ensure the required files exist or create empty ones
                    await Promise.all([
                        ensureFileExists(severityLevelsCsv),
                        ensureFileExists(patientHealthScoresCsv),
                        ensureFileExists(apiSurveysCsv)
                    ]);
                    
                    aiMessage = await new Promise((resolve, reject) => {
                        exec(`python3 common_login/python_scripts/patientprompt.py "${severityLevelsCsv}" "${patientHealthScoresCsv}" "${apiSurveysCsv}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error generating AI message: ${error.message}`);
                                reject(error);
                            }
                            resolve(stdout.trim());
                        });
                    });
    
                    // Update the AI message and the generation date in the database
                    await db1.collection('patient_data').updateOne(
                        { Mr_no: user1.Mr_no },
                        {
                            $set: {
                                aiMessage: aiMessage,
                                aiMessageGeneratedAt: currentDate
                            }
                        }
                    );
                } catch (error) {
                    console.error('Error generating AI message:', error);
                    aiMessage = 'Unable to generate AI message at this time.';
                }
            }
    
            // Render the user details page
            return res.render('userDetails', { 
                user: user1, 
                surveyName: user1.specialities.map(s => s.name), 
                csvPath: `data/patient_health_scores_${user1.Mr_no}.csv`,
                painCsvPath: `data/API_SURVEYS_${user1.Mr_no}.csv`,
                aiMessage: aiMessage // Pass the AI message to the template
            });
        } else {
            // User not found
            req.flash('error', 'These details are not found');
            return res.redirect('/');
        }
    });

    

    // Middleware to pass messages to the views
    app.use((req, res, next) => {
        res.locals.message = req.flash('error');
        next();
    });


    app.post('/logout', async (req, res) => {
        if (req.session && req.session.user && req.session.loginTime) {
            const { Mr_no, firstName, lastName, hospital_code, speciality } = req.session.user;
            const loginTime = new Date(req.session.loginTime);
            const logoutTime = new Date();
            const sessionDuration = (logoutTime - loginTime) / 1000; // Duration in seconds
    
            // Log the logout activity and session duration
            const logData = `Mr_no: ${Mr_no}, firstName: ${firstName}, lastName: ${lastName}, hospital: ${hospital_code}, speciality: ${speciality}, timestamp: ${logoutTime.toISOString()}, action: logout, session_duration: ${sessionDuration} seconds`;
            writeLog('logout_logs.txt', logData);
        }
    
        const directory = path.join(__dirname, 'new_folder');
        // await clearDirectory(directory);
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/');
        });        
    });
    
    


app.get('/chart', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/patient_health_scores_${mr_no}.csv`;
    res.render('chart', { csvPath });
});


app.get('/chart1', async (req, res) => {
    const { type, mr_no } = req.query;
    const csvPath = `data/PROMIS Bank v1.1 - Pain Interference_${mr_no}.csv`;
    res.render('chart1', { csvPath});
});

app.get('/register', (req, res) => {
        res.redirect('http://localhost:3002/');
    });

    // GET route for Reset Password link
    app.get('/reset-password', (req, res) => {
        res.redirect('http://localhost:3002/');
    });



app.get('/userDetails', checkAuth, async (req, res) => {
    const user = req.session.user;
    const surveyData = await db3.collection('surveys').findOne({ specialty: user.speciality });

    // Fetch AI message from the database
    const patient = await db1.collection('patient_data').findOne({ Mr_no: user.Mr_no });
    const aiMessage = patient ? patient.aiMessage : 'Your AI generated message goes here.';

    const lang = req.query.lang || 'en';
    
    res.render('userDetails', { 
        user: user, 
        surveyName: surveyData ? surveyData.surveyName : [], 
        csvPath: `data/patient_health_scores_${user.Mr_no}.csv`,
        painCsvPath: `data/API_SURVEYS_${user.Mr_no}.csv`,
        aiMessage: aiMessage, // Pass the AI message to the template
        lang: lang  // Pass the language preference to the template
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

app.get('/survey-details/:mr_no', checkAuth, async (req, res) => {
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

app.get('/edit-details', async (req, res) => {
    const { Mr_no } = req.query;

    try {
        // Fetch the patient data based on MR number
        const patient = await db1.collection('patient_data').findOne({ Mr_no });

        if (patient) {
            // Format the patient's DOB to the desired format (MM/DD/YYYY) for display
            let formattedDisplayDOB = '';
            let formattedInputDOB = '';
            if (patient.DOB) {
                const dob = new Date(patient.DOB);
                const month = (dob.getMonth() + 1).toString().padStart(2, '0'); // Ensure 2-digit month
                const day = dob.getDate().toString().padStart(2, '0'); // Ensure 2-digit day
                formattedDisplayDOB = `${month}/${day}/${dob.getFullYear()}`;
                formattedInputDOB = `${dob.getFullYear()}-${month}-${day}`; // For input field
            }

            // Prepare the patient data to be rendered
            const formattedPatient = {
                mrNo: patient.Mr_no,
                firstName: patient.firstName || '',
                middleName: patient.middleName || '',
                lastName: patient.lastName || '',
                displayDOB: formattedDisplayDOB,
                inputDOB: formattedInputDOB,
                phoneNumber: patient.phoneNumber || '',
                password: patient.password || '' // Note: Should not be displayed in the frontend
            };

            // Render the edit-details template with the patient data
            res.render('edit-details', { patient: formattedPatient });
        } else {
            // Handle case where patient is not found
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).send('Internal Server Error');
    }
});




app.post('/update-data', async (req, res) => {
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, phoneNumber, password, Confirm_Password } = req.body;

        // Check if the password and confirm password match
        if (password && password !== Confirm_Password) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }

        // Prepare the update object
        let updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (middleName) updateData.middleName = middleName;
        if (lastName) updateData.lastName = lastName;
        if (DOB) updateData.DOB = DOB;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        // if (password) updateData.password = password;
        if (password) {
            const encryptedPassword = encrypt(password);
            updateData.password = encryptedPassword;
        }        
        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            req.flash('error', 'No updates were made.');
            return res.redirect(`/edit-details?Mr_no=${Mr_no}`);
        }

        // Update the patient document
        const updateResult = await db1.collection('patient_data').updateOne(
            { Mr_no },
            { $set: updateData }
        );

        if (updateResult.modifiedCount === 1) {
            req.flash('success', 'Record updated successfully');
        } else {
            req.flash('error', 'No changes were made or record update failed.');
        }

        res.redirect(`/edit-details?Mr_no=${Mr_no}`);
    } catch (error) {
        console.error("Error updating patient record:", error);
        req.flash('error', 'Internal Server Error');
        res.redirect(`/edit-details?Mr_no=${Mr_no}`);
    }
});


// Function to flatten nested objects
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
app.get('/export-survey-csv', async (req, res) => {
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
        res.attachment(`survey_details_${mr_no}.csv`);
        return res.send(csvData);
    } catch (err) {
        console.error('Error generating CSV:', err);
        return res.status(500).send('Internal Server Error');
    }
});


app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const { Mr_no } = req.session.user || {};
    const logData = `Error type: ${err.message}, timestamp: ${timestamp}, Mr_no: ${Mr_no || 'N/A'}`;
    writeLog('error_logs.txt', logData);

    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});




    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}


// Export the function to start the server
module.exports = startServer;
