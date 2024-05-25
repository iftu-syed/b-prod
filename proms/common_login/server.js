// server.js

// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process'); // Import exec from child_process module
const path = require('path'); // Import the path module
const ejs = require('ejs');
const fs = require('fs');

const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Response</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .message {
                    text-align: center;
                    font-size: 36px;
                }
            </style>
        </head>
        <body>
            <div class="message">
                Thanks for Submitting!
            </div>
        </body>
        </html>
    `;



// Import required modules
const { spawn } = require('child_process');



// Function to initialize and start the server
async function startServer() {
    const app = express();
    const port = 3055;




    // Set EJS as the view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // Serve static files (login page)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/new_folder', express.static(path.join(__dirname, 'new_folder')));
    // MongoDB connection URL
    const uri1 = 'mongodb://localhost:27017/Data_Entry_Incoming';
    const uri2 = 'mongodb://localhost:27017/patient_data';
    const uri3 = 'mongodb://localhost:27017/manage_doctors';

    // Connect to both MongoDB databases
    let db1, db2, db3;

    // Connect to the first database
    const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
    await client1.connect();
    db1 = client1.db('Data_Entry_Incoming');
    console.log('Connected to Data_Entry_Incoming database');

    // Connect to the second database
    const client2 = new MongoClient(uri2, { useNewUrlParser: true, useUnifiedTopology: true });
    await client2.connect();
    db2 = client2.db('patient_data');
    console.log('Connected to patient_data database');
    
    // Connect to the third database
    const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
    await client3.connect();
    db3 = client3.db('manage_doctors');
    console.log('Connected to manage_doctors database');

    // Serve login page on root URL
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    // // Common login route
    // app.post('/login', async (req, res) => {
    //     const { Mr_no, password } = req.body;

    //     const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
    //     if (user1) {
    //         // Fetch surveyName from the third database based on speciality
    //         const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
    //         // Render user details using userDetails.ejs
    //         return res.render('userDetails', { user: user1, surveyName: surveyData ? surveyData.surveyName : [] });
    //     }
    //     res.redirect('/');
    // });
    app.get('/login', async (req, res) => {
        const { Mr_no, password } = req.query;

        const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
        if (user1) {
            const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
            return res.render('userDetails', { user: user1, surveyName: surveyData ? surveyData.surveyName : [] });
        }
        res.redirect('/');
    });

    function clearDirectory(directory) {
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
    
            for (const file of files) {
                fs.unlink(path.join(directory, file), err => {
                    if (err) throw err;
                });
            }
        });
    }
    

    // app.post('/login', async (req, res) => {
    //     const { Mr_no, password } = req.body;
    
    //     const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
    //     if (user1) {
    //         // Fetch surveyName from the third database based on speciality
    //         const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
    //         const surveyNames = surveyData ? surveyData.surveyName : [];
    
    //         // Function to generate graphs for each survey
    //         const generateGraphs = async () => {
    //             return new Promise((resolve, reject) => {
    //                 let pending = surveyNames.length;
    //                 if (pending === 0) resolve();
    //                 surveyNames.forEach(surveyType => {
    //                     const command = `python3 common_login/python_scripts/script1.py ${Mr_no} "${surveyType}"`;
    //                     exec(command, (error, stdout, stderr) => {
    //                         if (error) {
    //                             console.error(`Error generating graph for ${surveyType}: ${error.message}`);
    //                         }
    //                         if (stderr) {
    //                             console.error(`stderr: ${stderr}`);
    //                         }
    //                         if (--pending === 0) resolve();
    //                     });
    //                 });
    //             });
    //         };
    
    //         await generateGraphs();
    
    //         // Render user details using userDetails.ejs
    //         return res.render('userDetails', { user: user1, surveyName: surveyNames });
    //     }
    //     res.redirect('/');
    // });
    
    
    app.post('/login', async (req, res) => {
        const { Mr_no, password } = req.body;
    
        const user1 = await db1.collection('patient_data').findOne({ Mr_no, password });
        if (user1) {
            // Fetch surveyName from the third database based on speciality
            const surveyData = await db3.collection('surveys').findOne({ specialty: user1.speciality });
            const surveyNames = surveyData ? surveyData.surveyName : [];
    
            // Clear the `new_folder` directory
            const newFolderDirectory = path.join(__dirname, 'new_folder');
            clearDirectory(newFolderDirectory);
    
            // Function to generate graphs for each survey
            const generateGraphs = async () => {
                return new Promise((resolve, reject) => {
                    let pending = surveyNames.length;
                    if (pending === 0) resolve();
                    surveyNames.forEach(surveyType => {
                        const command = `python3 common_login/python_scripts/script1.py ${Mr_no} "${surveyType}"`;
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error generating graph for ${surveyType}: ${error.message}`);
                            }
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            if (--pending === 0) resolve();
                        });
                    });
                });
            };
    
            await generateGraphs();
    
            // Render user details using userDetails.ejs
            return res.render('userDetails', { user: user1, surveyName: surveyNames });
        }
        res.redirect('/');
    });
    



    // Logout route
    app.post('/logout', (req, res) => {
        // Redirect to login page
        res.redirect('/');
    });



    // Handle GET request to display the form
app.get('/ICIQ-UI_SF', (req, res) => {
    const { Mr_no } = req.query; // Assuming Mr_no is passed in the query parameters

    // Render the form template and pass the Mr_no value
    res.render('form', { Mr_no });
});


// Handle GET request to display the EPDS form
app.get('/EPDS', (req, res) => {
    const { Mr_no } = req.query; // Assuming Mr_no is passed in the query parameters

    // Render the EPDS form template and pass the Mr_no value
    res.render('EDPS', { Mr_no });
});

// Handle GET request to display the PAID form
app.get('/PAID', (req, res) => {
    const { Mr_no } = req.query; // Assuming Mr_no is passed in the query parameters

    // Render the PAID form template and pass the Mr_no value
    res.render('PAID', { Mr_no });
});



// Handle GET request to display the PROMS-10 form
app.get('/PROMIS-10', (req, res) => {
    const { Mr_no } = req.query; // Assuming Mr_no is passed in the query parameters

    // Render the PROMS-10 form template and pass the Mr_no value
    res.render('PROMIS-10', { Mr_no });
});





const { exec } = require('child_process');

app.get('/execute', async (req, res) => {
    const { Mr_no} = req.query;

    // Validate Mr_no and password
    if (!Mr_no) {
        return res.status(400).send('Missing Mr_no');
    }
    // res.status(200);
    res.set('Connection', 'close').status(200);

    try {
        // Execute Python script with Mr_no and password as arguments
        exec(`python3 common_login/python_scripts/script.py ${Mr_no}`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect to the login page with Mr_no and password parameters
            // res.redirect(`/login?Mr_no=${Mr_no}&password=${password}`);
            // res.send('Hello');

            // res.status(200).end();
            
        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Route to handle the generateGraph request
// app.post('/generateGraph', (req, res) => {
//     const { Mr_no, surveyType } = req.body;
    
//     // Execute the Python script with Mr_no and surveyType
//     // const pythonScriptPath = path.join(__dirname, 'generate_individual_graph.py');
//     exec(`python3 common_login/python_scripts/script1.py ${Mr_no} "${surveyType}"`, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Error executing Python script: ${error.message}`);
//             return res.status(500).send('Error generating graph');
//         }
        
//         // console.log(`Python script output: ${stdout}`);
//         // console.error(`Python script error output: ${stderr}`);
        
//         // res.status(200).send('Graph generated successfully');
//     });
// });

app.post('/generateGraph', async (req, res) => {
    const { Mr_no, surveyType, password } = req.body;

    console.log(`Generating graph for Mr_no: ${Mr_no}, Survey Type: ${surveyType}`);

    // Validate Mr_no, surveyType, and password
    if (!Mr_no || !surveyType || !password) {
        return res.status(400).send('Missing Mr_no, surveyType, or password');
    }

    try {
        // Execute Python script with Mr_no and surveyType as arguments
        exec(`python3 common_login/python_scripts/script1.py ${Mr_no} "${surveyType}"`, (error, stdout, stderr) => {
            if (error) {
                res.status(500).send(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                res.status(400).send(`stderr: ${stderr}`);
                return;
            }

            // Redirect back to patient details page
            res.redirect(`/login?Mr_no=${Mr_no}&password=${password}`);
        });
    } catch (err) {
        console.error('Error executing Python script:', err);
        res.status(500).send('Internal Server Error');
    }
});






app.post('/submit', async (req, res) => {
    const formData = req.body;
    const { Mr_no } = formData; // Mr_no passed from the form

    try {
        // Find the document in patient_data collection that matches Mr_no
        const patientData = await db1.collection('patient_data').findOne({ Mr_no });

        if (patientData) {
            // Calculate the index for the new CCFFIS object
            let newIndex = 0;
            if (patientData.CCFFIS) {
                newIndex = Object.keys(patientData.CCFFIS).length;
            }

            // Construct the new CCFFIS object key with the calculated index
            const newCCFFISKey = `CCFFIS_${newIndex}`;

            // Get the current date and time
            const currentDate = new Date();
            const timestamp = currentDate.toISOString(); // Convert to ISO string format

            // Add timestamp to the form data
            formData.timestamp = timestamp;

            // Construct the new CCFFIS object with the calculated key and form data
            const newCCFFIS = { [newCCFFISKey]: formData };

            // Update the document with the new CCFFIS object
            await db1.collection('patient_data').updateOne(
                { Mr_no },
                { $set: { [`CCFFIS.${newCCFFISKey}`]: formData } }
            );

            // Send success response
            // return res.status(200).send('CCFFIS object created successfully');

    // Send the HTML content as the response
    res.status(200).send(htmlContent);


        } else {
            // If no document found for the given Mr_no
            console.log('No matching document found for Mr_no:', Mr_no);
            return res.status(404).send('No matching document found');
        }
    } catch (error) {
        console.error('Error updating form data:', error);
        return res.status(500).send('Error updating form data');
    }
});


app.post('/submitEPDS', async (req, res) => {
    const formData = req.body;
    const { Mr_no } = formData; // Mr_no passed from the form

    try {
        // Find the document in patient_data collection that matches Mr_no
        const patientData = await db1.collection('patient_data').findOne({ Mr_no });

        if (patientData) {
            // Calculate the index for the new EPDS object
            let newIndex = 0;
            if (patientData.EPDS) {
                newIndex = Object.keys(patientData.EPDS).length;
            }

            // Construct the new EPDS object key with the calculated index
            const newEPDSKey = `EPDS_${newIndex}`;

            // Get the current date and time
            const currentDate = new Date();
            const timestamp = currentDate.toISOString(); // Convert to ISO string format

            // Add timestamp to the form data
            formData.timestamp = timestamp;

            // Construct the new EPDS object with the calculated key and form data
            const newEPDS = { [newEPDSKey]: formData };

            // Update the document with the new EPDS object
            await db1.collection('patient_data').updateOne(
                { Mr_no },
                { $set: { [`EPDS.${newEPDSKey}`]: formData } }
            );

            // Send success response
            // return res.status(200).send('EPDS object created successfully');
            res.status(200).send(htmlContent);
        } else {
            // If no document found for the given Mr_no
            console.log('No matching document found for Mr_no:', Mr_no);
            return res.status(404).send('No matching document found');
        }
    } catch (error) {
        console.error('Error updating form data:', error);
        return res.status(500).send('Error updating form data');
    }
});


// Handle POST request to submit the PAID form data
app.post('/submitPAID', async (req, res) => {
    const formData = req.body;
    const { Mr_no } = formData; // Mr_no passed from the form

    try {
        // Find the document in patient_data collection that matches Mr_no
        const patientData = await db1.collection('patient_data').findOne({ Mr_no });

        if (patientData) {
            // Calculate the index for the new PAID object
            let newIndex = 0;
            if (patientData.PAID) {
                newIndex = Object.keys(patientData.PAID).length;
            }

            // Construct the new PAID object key with the calculated index
            const newPAIDKey = `PAID_${newIndex}`;

            // Get the current date and time
            const currentDate = new Date();
            const timestamp = currentDate.toISOString(); // Convert to ISO string format

            // Add timestamp to the form data
            formData.timestamp = timestamp;

            // Construct the new PAID object with the calculated key and form data
            const newPAID = { [newPAIDKey]: formData };

            // Update the document with the new PAID object
            await db1.collection('patient_data').updateOne(
                { Mr_no },
                { $set: { [`PAID.${newPAIDKey}`]: formData } }
            );

            // Send success response
            res.status(200).send(htmlContent);
        } else {
            // If no document found for the given Mr_no
            console.log('No matching document found for Mr_no:', Mr_no);
            return res.status(404).send('No matching document found');
        }
    } catch (error) {
        console.error('Error updating PAID form data:', error);
        return res.status(500).send('Error updating PAID form data');
    }
});


app.post('/submitPROMIS-10', async (req, res) => {
    const formData = req.body;
    const { Mr_no } = formData; // Mr_no passed from the form

    try {
        // Find the document in patient_data collection that matches Mr_no
        const patientData = await db1.collection('patient_data').findOne({ Mr_no });

        if (patientData) {
            // Calculate the index for the new PROMS-10 object
            let newIndex = 0;
            if (patientData.PROMS_10) {
                newIndex = Object.keys(patientData.PROMS_10).length;
            }

            // Construct the new PROMS-10 object key with the calculated index
            const newPROMS10Key = `PROMS_10_${newIndex}`;

            // Get the current date and time
            const currentDate = new Date();
            const timestamp = currentDate.toISOString(); // Convert to ISO string format

            // Add timestamp to the form data
            formData.timestamp = timestamp;

            // Construct the new PROMS-10 object with the calculated key and form data
            const newPROMS10 = { [newPROMS10Key]: formData };

            // Update the document with the new PROMS-10 object
            await db1.collection('patient_data').updateOne(
                { Mr_no },
                { $set: { [`PROMS_10.${newPROMS10Key}`]: formData } }
            );

            // Send success response
            res.status(200).send(htmlContent);
        } else {
            // If no document found for the given Mr_no
            console.log('No matching document found for Mr_no:', Mr_no);
            return res.status(404).send('No matching document found');
        }
    } catch (error) {
        console.error('Error updating PROMS-10 form data:', error);
        return res.status(500).send('Error updating PROMS-10 form data');
    }
});





    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });


}


// Export the function to start the server
module.exports = startServer;
