const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

// Connection URI
const uri = 'mongodb://localhost:27017'; // Change this URI according to your MongoDB setup

// Database Name
const dbName = 'Data_Entry_Incoming'; // Change this to your actual database name

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Add more options as needed
};

router.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
async function connectToDatabase() {
  let client;
  try {
    // Create a new MongoClient
    client = new MongoClient(uri, options);

    // Connect the client to the server
    await client.connect();

    console.log("Connected successfully to server");

    // Specify the database you want to use
    const db = client.db(dbName);

    return db;
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err; // Re-throw the error to handle it outside
  }
}

// Route to display form for creating password
router.get('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');
    const patient = await collection.findOne({ Mr_no });
    if (!patient) {
      return res.status(404).send('Patient not found');
    }
    res.render('form', { Mr_no: patient.Mr_no });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Route to handle form submission for creating password
// router.post('/:Mr_no', async (req, res) => {
//   const { Mr_no } = req.params;
//   const { password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     return res.send('Passwords do not match');
//   }

//   try {
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');
//     await collection.updateOne({ Mr_no }, { $set: { password } });
//     res.send('Password updated successfully');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal server error');
//   }
// });


// Route to handle form submission for creating password
router.post('/:Mr_no', async (req, res) => {
  const { Mr_no } = req.params;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send('Passwords do not match');
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');
    await collection.updateOne({ Mr_no }, { $set: { password } });
    // Display success message and redirect after 3 seconds
  
      res.redirect('http://127.0.0.1:3055/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});




module.exports = router;
