
// const express = require('express');
// const path = require('path');
// const cors_proxy = require('cors-anywhere');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const fs = require('fs');

// const app = express();
// const host = 'localhost';
// const port = 8080;

// // MongoDB connection
// mongoose.connect('mongodb://localhost:27017/Data_Entry_Incoming', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function () {
//     console.log('Connected to MongoDB');
// });

// // Middleware
// app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname)));

// // Route to serve index.html at the root route
// app.get('/', (req, res) => {
//     const mr_no = req.query.mr_no; // Get mr_no from query parameters

//     // Read the index.html file
//     fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
//         if (err) {
//             res.status(500).send('Error reading index.html file');
//             return;
//         }

//         res.send(data); // Send the original HTML file
//     });
// });

// // Route to handle storing scores
// app.post('/storeScore', async (req, res) => {
//     try {
//         const { Mr_no, formID, assessmentID, scoreDetails } = req.body;
//         const timestamp = new Date();

//         // Find the document by Mr_no
//         let patientDoc = await db.collection('patient_data').findOne({ Mr_no: Mr_no });

//         if (patientDoc) {
//             // If the document exists, update it by adding a new assessment under the corresponding formID
//             if (!patientDoc.FORM_ID) {
//                 patientDoc.FORM_ID = {};
//             }

//             if (!patientDoc.FORM_ID[formID]) {
//                 patientDoc.FORM_ID[formID] = { assessments: [] };
//             }

//             patientDoc.FORM_ID[formID].assessments.push({
//                 assessmentID: assessmentID,
//                 scoreDetails: scoreDetails,
//                 timestamp: timestamp
//             });

//             await db.collection('patient_data').updateOne(
//                 { Mr_no: Mr_no },
//                 { $set: { FORM_ID: patientDoc.FORM_ID } }
//             );
//         } else {
//             // Handle case where Mr_no does not exist
//             res.status(404).send('Mr_no not found');
//             return;
//         }

//         res.send('Score stored successfully');
//     } catch (err) {
//         console.error('Error saving score: ', err);
//         res.status(500).send('Error saving score');
//     }
// });

// // Start the CORS Anywhere proxy
// cors_proxy.createServer({
//     originWhitelist: [], // Allow all origins
//     requireHeader: ['origin', 'x-requested-with'],
//     removeHeaders: ['cookie', 'cookie2']
// }).listen(port + 1, host, function () {
//     console.log('Running CORS Anywhere on ' + host + ':' + (port + 1));
// });

// // Start the Express server
// app.listen(port, () => {
//     console.log(`Server running at http://${host}:${port}/`);
// });




const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Data_Entry_Incoming', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Proxy setup to handle CORS issues
// app.use('/proxy', createProxyMiddleware({
//     target: 'https://www.assessmentcenter.net',
//     changeOrigin: true,
//     pathRewrite: {
//         '^/proxy': '/ac_api/2014-01' // Rewrite path
//     },
//     secure: false // Disable SSL verification
// }));
// app.use('/proxy', createProxyMiddleware({
//     target: 'https://www.assessmentcenter.net',
//     changeOrigin: true,
//     pathRewrite: {
//         '^/proxy': '' // Ensure path rewrite is correctly removing the '/proxy' prefix
//     },
//     secure: true // Set to true for SSL verification
// }));

app.use('/proxy', createProxyMiddleware({
    target: 'https://www.assessmentcenter.net',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy': '' // Remove '/proxy' from the path
    },
    secure: true // Ensure SSL verification is enabled unless facing SSL issues
}));


// Route to serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle storing scores in MongoDB
app.post('/storeScore', async (req, res) => {
    try {
        const { Mr_no, formID, assessmentID, scoreDetails } = req.body;
        const timestamp = new Date();

        // Find the document by Mr_no and formID
        let patientDoc = await db.collection('patient_data').findOne({ Mr_no: Mr_no });

        if (patientDoc) {
            // If the document exists, update it by adding a new assessment under the corresponding formID
            if (!patientDoc.FORM_ID) {
                patientDoc.FORM_ID = {};
            }

            if (!patientDoc.FORM_ID[formID]) {
                patientDoc.FORM_ID[formID] = { assessments: [] };
            }

            patientDoc.FORM_ID[formID].assessments.push({
                assessmentID: assessmentID,
                scoreDetails: scoreDetails,
                timestamp: timestamp
            });

            await db.collection('patient_data').updateOne(
                { Mr_no: Mr_no },
                { $set: { FORM_ID: patientDoc.FORM_ID } }
            );
        } else {
            // Handle case where Mr_no does not exist
            res.status(404).send('Mr_no not found');
            return;
        }

        res.send('Score stored successfully');
    } catch (err) {
        console.error('Error saving score: ', err);
        res.status(500).send('Error saving score');
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
