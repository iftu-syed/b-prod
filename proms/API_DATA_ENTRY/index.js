// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module

const app = express();
const PORT = process.env.PORT || 3051;

function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on http://localhost:${PORT}`);
    });
}

module.exports = startServer;

app.use(bodyParser.json());

// Connection URI
// const uri = 'mongodb://localhost:27017/Data_Entry_Incoming'; // Update the MongoDB URI with the correct database name

// // Create a new MongoClient
// const client = new MongoClient(uri);

// // Connect to MongoDB
// async function connectToMongoDB() {
//     try {
//         await client.connect();
//         console.log('Connected to MongoDB');
//     } catch (error) {
//         console.error('Error connecting to MongoDB:', error);
//     }
// }

// connectToMongoDB();



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



app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// // API endpoint to handle data submission
// app.post('/api/data', async (req, res) => {
//     try {
//         // Access a specific database
//         const database = client.db();

//         // Access a collection within the database
//         const collection = database.collection('patient_data');

//         // Insert the submitted data into the collection
//         await collection.insertOne(req.body);

//         res.status(201).json({ message: 'Data saved successfully' });
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// index.js

// API endpoint to handle data submission
// app.post('/api/data', async (req, res) => {
//     try {
//         // Access a specific database
//         const database = client.db();

//         // Access a collection within the database
//         const collection = database.collection('patient_data');

//         // Insert the submitted data into the collection
//         await collection.insertOne(req.body);

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true });

//         // Alternatively, if you want to redirect with a delay
//         // setTimeout(() => {
//         //     res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true });
//         // }, 3000);
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// API endpoint to handle data submission
// app.post('/api/data', async (req, res) => {
//     try {
//         // Access the manage_doctors database from the request object
//         const db = req.manageDoctorsDB;

//         // Access a collection within the database
//         const collection = db.collection('patient_data');

//         // Insert the submitted data into the collection
//         await collection.insertOne(req.body);

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true });

//         // Alternatively, if you want to redirect with a delay
//         // setTimeout(() => {
//         //     res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true });
//         // }, 3000);
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });



// Render data entry form
// app.get('/', (req, res) => {
//     res.render('data-entry'); // Render the data-entry.ejs template
// });


// Render data entry form
// app.get('/', async (req, res) => {
//     const db = req.manageDoctorsDB; // Access the manage_doctors database from the request object
//     try {
//         // Fetch distinct specialities from surveys collection
//         const specialities = await db.collection('surveys').distinct('specialty');

//         res.render('data-entry', { specialities }); // Render the data-entry.ejs template with specialities
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Render data entry form
// app.get('/', async (req, res) => {
//     const db = req.manageDoctorsDB; // Access the manage_doctors database from the request object
//     try {
//         // Fetch distinct specialities from surveys collection
//         const specialities = await db.collection('surveys').distinct('specialty');

//         res.render('data-entry', { specialities }); // Render the data-entry.ejs template with specialities
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });
app.get('/', async (req, res) => {
    try {
        // Fetch distinct specialities from surveys collection
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        res.render('data-entry', { specialities }); // Render the data-entry.ejs template with specialities
    } catch (error) {
        console.error('Error:', error);
        // If there's an error, pass an empty array as specialities
        res.render('data-entry', { specialities: [] });
    }
});


// app.post('/api/data', async (req, res) => {
//     const db = req.dataEntryDB; // Access the Data_Entry_Incoming database from the request object
//     try {
//         // Access a collection within the database
//         const collection = db.collection('patient_data');
//         // Fetch distinct specialities from surveys collection
//         const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

//         // Insert the submitted data into the collection
//         await collection.insertOne(req.body);

//         // Redirect to data-entry.ejs with success message
//         res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true,specialities });

//         // Alternatively, if you want to redirect with a delay
//         // setTimeout(() => {
//         //     res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true });
//         // }, 3000);
//     } catch (error) {
//         console.error('Error inserting data into MongoDB:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


//this the new code that can handle the multiple appointments and multiple speciality to maintain the historical data of the patient

app.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB; // Access the Data_Entry_Incoming database from the request object
    try {
        const { Mr_no, datetime, speciality } = req.body;

        // Access a collection within the database
        const collection = db.collection('patient_data');
        // Fetch distinct specialities from surveys collection
        const specialities = await manageDoctorsClient.db().collection('surveys').distinct('specialty');

        // Check if MR number exists in the database
        const patient = await collection.findOne({ Mr_no });

        if (!patient) {
            // If MR number does not exist, insert the submitted data into the collection
            await collection.insertOne(req.body);
        } else {
            // If MR number exists, check the specialty
            if (patient.speciality === speciality) {
                // If specialty is the same, update the datetime field
                await collection.updateOne(
                    { Mr_no },
                    { $set: { datetime } }
                );
            } else {
                // If specialty is different, update the datetime field and add specialty to an array
                const updatedSpecialties = patient.specialities || [];
                if (!updatedSpecialties.includes(speciality)) {
                    updatedSpecialties.push(speciality);
                }

                await collection.updateOne(
                    { Mr_no },
                    { $set: { datetime, specialities: updatedSpecialties } }
                );
            }
        }

        // Redirect to data-entry.ejs with success message
        res.render('data-entry', { successMessage: 'Data entry is done.', redirect: true, specialities });

    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// // Handle login form submission
// app.post('/login', async (req, res) => {
//     const { Mr_no, password } = req.body;
    
//     // Access a specific database
//     const database = client.db('Data_Entry_Incoming');
//     // Access a collection within the database
//     const collection = database.collection('patient_data');

//     // Check if patient exists with given Mr_no and password
//     const patient = await collection.findOne({ Mr_no, password });

//     if (patient) {
//         // If patient exists, render details page with patient data
//         res.render('details', { patient });
//     } else {
//         // If patient doesn't exist or password is incorrect, render login page with error message
//         res.render('login', { error: 'Invalid MR Number or Password' });
//     }
// });
