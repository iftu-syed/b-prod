// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');

// Add session management dependencies
const session = require('express-session');
const MongoStore = require('connect-mongo');

require('dotenv').config();


// Import Twilio SDK
const twilio = require('twilio');
const crypto = require('crypto');
const flash = require('connect-flash');
// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// Add this after express-session middleware





const app = express();
const PORT = process.env.PORT || 3051;

function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on http://localhost:${PORT}`);
    });
}



module.exports = startServer;

app.use(bodyParser.json());


// index.js

// Connection URIs
const dataEntryUri = 'mongodb://localhost:27017/Data_Entry_Incoming';
const manageDoctorsUri = 'mongodb://localhost:27017/manage_doctors';

// Create new MongoClient instances for both databases
const dataEntryClient = new MongoClient(dataEntryUri);
const manageDoctorsClient = new MongoClient(manageDoctorsUri);

// Connect to both MongoDB databases
async function connectToMongoDB() {
    try {
        await Promise.all([
            dataEntryClient.connect(),
            manageDoctorsClient.connect()
        ]);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();


// Access databases and collections in the routes as needed
app.use((req, res, next) => {
    req.dataEntryDB = dataEntryClient.db();
    req.manageDoctorsDB = manageDoctorsClient.db();
    next();
});

// Configure session middleware
// app.use(session({
//     secret: 'your_secret_key', // Replace with your own secret key
//     resave: false,
//     saveUninitialized: true,
//     store: MongoStore.create({ mongoUrl: manageDoctorsUri })
// }));
// Configure session middleware

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secret key from environment variables
    resave: false,
    saveUninitialized: false, // Ensure sessions are only saved when modified
    store: MongoStore.create({ mongoUrl: manageDoctorsUri }),
    cookie: { secure: false, maxAge: 60000 * 30 } // Set appropriate cookie options
}));


// Utility function to format date and time to 12-hour format with AM/PM
// function formatTo12Hour(datetime) {
//     const date = new Date(datetime);
//     return date.toLocaleString('en-US', {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true
//     });
// }
function formatTo12Hour(datetime) {
    const date = new Date(datetime);
    if (isNaN(date)) {
        return "Invalid Date";
    }
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}




app.use(flash());

// Ensure flash messages are available in all templates
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


const accountSid = 'AC67f36ac44b4203d21bb5f7ddfc9ea3ad';  // Replace with your Account SID
const authToken = '2831644b0d889a5d26b6ba2f507db929';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+17077223196';  // Replace with your Twilio Phone Number

// Twilio client initialization
const client = require('twilio')(accountSid, authToken);

// Function to send SMS
function sendSMS(to, message) {
    return client.messages.create({
        body: message,
        from: twilioPhoneNumber,  // Your Twilio phone number
        to: to                    // Recipient's phone number
    });
}

// Login route
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/blank-page', async (req, res) => {
    try {
        const hospital = req.session.hospital; // Get the hospital from the session
        if (!hospital) {
            return res.redirect('/'); // Redirect to login if no hospital is found in session
        }

        // Get patients data from the database filtered by hospital
        const patients = await req.dataEntryDB.collection('patient_data').find({ hospital }).toArray();

        // Log total number of patients
        console.log(`Fetched ${patients.length} patients from database for hospital: ${hospital}`);

        // Render the blank-page template with patient data
        res.render('blank-page', { patients });
    } catch (error) {
        console.error('Error fetching patients data:', error);
        // Handle errors appropriately (e.g., display an error message to the user)
        res.status(500).send('Internal Server Error');
    }
});







app.post('/login', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body;

    try {
        const doctor = await doctorsDB.findOne({ username });
        if (!doctor || doctor.password !== password) {
            return res.render('login', { errorMessage: 'Invalid username or password' });
        }

        // Store the hospital in the session
        req.session.hospital = doctor.hospital;
        req.session.username = doctor.username; // Optionally store the username or other info

        // Login successful, redirect to blank page
        res.redirect('/blank-page');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).render('login', { errorMessage: 'Internal server error' });
    }
});



app.get('/data-entry', async (req, res) => {
    try {
        // Fetch distinct specialties from the database
        let specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        // Filter out the 'STAFF' specialty
        specialities = specialities.filter(speciality => speciality !== 'STAFF');

        // Render the data-entry page with the filtered specialties and hospital from session
        res.render('data-entry', { specialities, hospital: req.session.hospital });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', { specialities: [], hospital: req.session.hospital });
    }
});



// app.get('/', async (req, res) => {
//     try {

//         // Fetch distinct specialities from surveys collection
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         res.render('data-entry', { specialities }); // Render the data-entry.ejs template with specialities
//     } catch (error) {
//         console.error('Error:', error);
//         // If there's an error, pass an empty array as specialities
//         res.render('data-entry', { specialities: [] });
//     }
// });






// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         const formattedDatetime = formatTo12Hour(datetime);

//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality,
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );

//         } else {
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime,
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()
//                 }],
//                 hospital,
//                 surveyStatus: "Not Completed"
//             });
//         }

//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             await sendSMS(phoneNumber, smsMessage);
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added. SMS sent.', specialities, hospital });
//         } catch (error) {
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added, but SMS not sent.', specialities, hospital });
//         }

//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Patient added.', specialities, hospital });
//     }
// });

// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, dateOfSurgery, phoneNumber } = req.body;
//         const hospital = req.session.hospital; // Get hospital from session

//         const collection = db.collection('patient_data');

//         const formattedDatetime = formatTo12Hour(datetime);

//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality,
//                         dateOfSurgery,
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );

//         } else {
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 ...req.body,
//                 datetime: formattedDatetime,
//                 hashedMrNo,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()
//                 }],
//                 hospital,
//                 surveyStatus: "Not Completed"
//             });
//         }

//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             await sendSMS(phoneNumber, smsMessage);
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added. SMS sent.', specialities, hospital });
//         } catch (error) {
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added, but SMS not sent.', specialities, hospital });
//         }

//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Patient added.', specialities, hospital });
//     }
// });
// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB;
//     try {
//         const { Mr_no, Name, DOB, datetime, speciality, phoneNumber } = req.body;
//         const hospital = req.session.hospital;

//         // Validate required fields
//         if (!datetime || !speciality) {
//             // Respond with an error if required fields are missing
//             return res.status(400).send('Appointment date & time and speciality are required.');
//         }

//         const collection = db.collection('patient_data');

//         // Format the datetime to 12-hour format
//         const formattedDatetime = formatTo12Hour(datetime);

//         // Find existing patient data
//         const patient = await collection.findOne({ Mr_no });

//         if (patient) {
//             // Update existing patient data
//             let updatedSpecialties = patient.specialities || [];
//             const currentTimestamp = new Date();

//             // Update the timestamp for the existing speciality or add a new speciality
//             const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
//             if (specialityIndex !== -1) {
//                 updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
//             } else {
//                 updatedSpecialties.push({
//                     name: speciality,
//                     timestamp: currentTimestamp
//                 });
//             }

//             await collection.updateOne(
//                 { Mr_no },
//                 {
//                     $set: {
//                         Name,
//                         DOB,
//                         datetime: formattedDatetime,
//                         specialities: updatedSpecialties,
//                         speciality,
//                         phoneNumber,
//                         hospital,
//                         surveyStatus: "Not Completed"
//                     }
//                 }
//             );
//         } else {
//             // Insert new patient data
//             const hashedMrNo = hashMrNo(Mr_no.toString());
//             await collection.insertOne({
//                 Mr_no,
//                 Name,
//                 DOB,
//                 datetime: formattedDatetime,
//                 specialities: [{
//                     name: speciality,
//                     timestamp: new Date()
//                 }],
//                 phoneNumber,
//                 hospital,
//                 surveyStatus: "Not Completed",
//                 hashedMrNo
//             });
//         }

//         // Generate the survey link and SMS message
//         const hashedMrNo = hashMrNo(Mr_no.toString());
//         const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
//         const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

//         try {
//             // Send SMS to the patient
//             await sendSMS(phoneNumber, smsMessage);
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added. SMS sent.', specialities, hospital });
//         } catch (error) {
//             console.error('Error sending SMS:', error);
//             const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//             res.render('data-entry', { successMessage: 'Patient added, but SMS not sent.', specialities, hospital });
//         }
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
//         res.render('data-entry', { successMessage: 'Patient added.', specialities, hospital });
//     }
// });

app.get('/edit-appointment', async (req, res) => {
    const { Mr_no } = req.query;
    console.log("Extracted MR number from query: ${Mr_no}");
    const db = req.dataEntryDB;
    try {
        console.log(Mr_no);
        // Fetch patient data from the database based on MR number
        const patient = await db.collection('patient_data').findOne({ Mr_no });
        if (patient) {
            // Prepare the patient data to be rendered
            const formattedPatient = {
                mrNo: patient.Mr_no, // Hash MR number for privacy if needed
                name: patient.Name,
                DOB: patient.DOB,
                phoneNumber: patient.phoneNumber,
                datetime: patient.datetime,
                speciality: patient.speciality,
            };
            console.log("Formatted patient data for rendering:", formattedPatient);
        // Fetch distinct specialties from the database
        let specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        // Filter out the 'STAFF' specialty
        specialities = specialities.filter(speciality => speciality !== 'STAFF');

        // Render the edit-appointment page with patient data
        res.render('edit-appointment', { specialities, hospital: req.session.hospital, patient: formattedPatient });}
        else{
            return res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    try {
      const { mrNo, Name, DOB, datetime, speciality, phoneNumber } = req.body;
      const hospital = req.session.hospital; // Get hospital from session
  
      const collection = db.collection('patient_data');
  
      // Format the datetime to 12-hour format with AM/PM
      const formattedDatetime = formatTo12Hour(datetime);
  
      // Check if the patient already exists
      const patient = await collection.findOne({ Mr_no: mrNo });
  
      if (patient) {
        //console.log(`Patient with Mr. No: ${mrNo} found. Updating details.`);
        await collection.updateOne(
          { Mr_no: mrNo },
          {
            $set: {
              Name,
              DOB,
              datetime: formattedDatetime,
              speciality, // Update speciality without timestamp
              phoneNumber,
              hospital // Add hospital to the document
            }
          }
        );
        console.log(patient);
        const updatedPatient = {
            mrNo: patient.Mr_no, // Hash MR number for privacy if needed
            name: patient.Name,
            DOB: patient.DOB,
            phoneNumber: patient.phoneNumber,
            datetime: patient.datetime,
            speciality: patient.speciality,
        };
        res.render('edit-appointment', {
            patient: updatedPatient,
            successMessage: 'Patient data updated successfully.' });
  
      } else {
        throw new Error('Patient with MR Number ' + Mr_no + ' does not exist.');
      }
    } catch (error) {
      if (error.message.includes('does not exist')) {
        // Handle patient not found error specifically
        res.status(400).json({ error: 'Patient does not exist.' }); 
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

app.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, Name, DOB, datetime, speciality, phoneNumber } = req.body;
        const hospital = req.session.hospital;

        // Validate required fields
        if (!datetime || !speciality) {
            req.flash('errorMessage', 'Appointment date & time and speciality are required.');
            return res.redirect('/data-entry');
        }

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        if (patient) {
            // Update existing patient data
            let updatedSpecialties = patient.specialities || [];
            const currentTimestamp = new Date();
        
            // Update the timestamp for the existing speciality or add a new speciality
            const specialityIndex = updatedSpecialties.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                updatedSpecialties[specialityIndex].timestamp = currentTimestamp;
            } else {
                updatedSpecialties.push({
                    name: speciality,
                    timestamp: currentTimestamp
                });
            }
        
            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        Name,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialties,
                        speciality, // Add this line to ensure the speciality field is updated
                        phoneNumber,
                        hospital,
                        surveyStatus: "Not Completed"
                    }
                }
            );
        } else {
            // Insert new patient data
            const hashedMrNo = hashMrNo(Mr_no.toString());
            await collection.insertOne({
                Mr_no,
                Name,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: new Date()
                }],
                speciality, // Add this line to ensure the speciality field is included
                phoneNumber,
                hospital,
                surveyStatus: "Not Completed",
                hashedMrNo
            });
        }
        

        // Generate the survey link and SMS message
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost:3088/search?identifier=${hashedMrNo}`;
        const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

        try {
            // Send SMS to the patient
            await sendSMS(phoneNumber, smsMessage);
            req.flash('successMessage', 'Patient added. SMS sent.');
            res.redirect('/data-entry');
        } catch (error) {
            console.error('Error sending SMS:', error);
            req.flash('successMessage', 'Patient added, but SMS not sent.');
            res.redirect('/data-entry');
        }
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect('/data-entry');
    }
});


// Endpoint to get patient data based on Mr_no
app.get('/api/patient/:mrNo', async (req, res) => {
    const mrNo = req.params.mrNo;
    const db = req.dataEntryDB;

    try {
        const patient = await db.collection('patient_data').findOne({ Mr_no: mrNo });

        if (patient) {
            res.json({ success: true, patient });
        } else {
            res.json({ success: false, message: 'Patient not found' });
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// Endpoint to get all available specialties
app.get('/api/specialties', async (req, res) => {
    try {
        const specialties = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.json({ success: true, specialties });
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


app.post('/send-reminder', async (req, res) => {
    const { Mr_no,speciality, } = req.body;
    const db = req.dataEntryDB;
    try {
        console.log(Mr_no);
      // Retrieve patient data based on Mr_no
    
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });
      if (!patient) {
        return res.status(400).json({ error: 'Phone Number not found' });
      }
      console.log(patient.phoneNumber);
      const surveyLink = `http://localhost:3088/search?identifier=${patient.hashedMrNo}`;
  
      // Format the datetime to 12-hour format with AM/PM (assuming same logic as before)
      const formattedDatetime = formatTo12Hour(patient.datetime);
  
      // Construct the reminder message
      const reminderMessage = `Friendly reminder! Your appointment for ${patient.speciality} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;
      
      const PatientNumber = patient.phoneNumber
      // Send SMS using your existing sendSMS function
      await sendSMS(PatientNumber, reminderMessage);
  
    //   res.json({ message: 'Reminder sent successfully' });
    res.redirect('/blank-page');
    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


