const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
// const port = 30011;
const PORT = 4050;
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (e) {
        console.error('Error connecting to MongoDB:', e);
    }
}

connectToDatabase();

app.get('/', async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        const surveys = await collection.find().toArray();
        res.render('index', { surveys });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/add', async (req, res) => {
    try {
        const db = client.db('surveyDB');
        const collection = db.collection('surveys');
        const surveys = await collection.find().toArray();
        res.render('add_survey', { surveys });
    } catch (e) {
        console.error('Error getting surveys:', e);
        res.status(500).send('Internal Server Error');
    }
});


// app.post('/add', async (req, res) => {
//     try {
//         const db = client.db('manage_doctors');
//         const collection = db.collection('surveys');
//         const { surveyName, specialty } = req.body;
//         await collection.insertOne({ surveyName, specialty });
//         res.redirect('/');
//     } catch (e) {
//         console.error('Error adding survey:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.post('/add', async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        const { surveyName, specialty } = req.body;
        await collection.insertOne({ surveyName, specialty }); // Insert the custom specialty along with other survey data
        res.redirect('/');
    } catch (e) {
        console.error('Error adding survey:', e);
        res.status(500).send('Internal Server Error');
    }
});
//this code is commented on 5th may
// app.get('/edit/:id', async (req, res) => {
//     try {
//         const db1 = client.db('manage_doctors'); // For fetching the survey being edited
//         const collection1 = db1.collection('surveys');
//         const survey = await collection1.findOne({ _id: new ObjectId(req.params.id) });

//         const db2 = client.db('surveyDB'); // For fetching all surveys
//         const collection2 = db2.collection('surveys');
//         const surveys = await collection2.find().toArray();

//         res.render('edit_survey', { survey, surveys }); // Pass both survey and surveys to the template
//     } catch (e) {
//         console.error('Error getting survey for edit:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.get('/edit/:id', async (req, res) => {
    try {
        const db1 = client.db('manage_doctors'); // For fetching the survey being edited
        const collection1 = db1.collection('surveys');
        const survey = await collection1.findOne({ _id: new ObjectId(req.params.id) });

        // Fetch all existing specialties from the surveyDB collection
        const db2 = client.db('surveyDB');
        const collection2 = db2.collection('surveys');
        const surveys = await collection2.find().toArray();
        const specialties = await collection1.distinct('specialty');

        res.render('edit_survey', { survey, specialties,surveys }); // Pass survey and specialties to the template
    } catch (e) {
        console.error('Error getting survey for edit:', e);
        res.status(500).send('Internal Server Error');
    }
});



// app.post('/edit/:id', async (req, res) => {
//     try {
//         const db = client.db('your_database_name');
//         const collection = db.collection('surveys');
//         const { surveyName, specialty } = req.body; // Destructure surveyName and specialty from request body
//         await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { surveyName, specialty } }); // Use new ObjectId
//         res.redirect('/');
//     } catch (e) {
//         console.error('Error editing survey:', e);
//         res.status(500).send('Internal Server Error');
//     }
// });





app.post('/edit/:id', async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        
        // Extract selected survey names and specialty from the request body
        const { surveyNames, specialty } = req.body;

        // Update the survey document in the database with the new values
        await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { surveyName: Array.isArray(surveyNames) ? surveyNames : [surveyNames], specialty } }
        );

        // Redirect the user to the home page after the update is complete
        res.redirect('/');
    } catch (e) {
        console.error('Error editing survey:', e);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/delete/:id', async (req, res) => {
    try {
        const db = client.db('manage_doctors');
        const collection = db.collection('surveys');
        await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/');
    } catch (e) {
        console.error('Error deleting survey:', e);
        res.status(500).send('Internal Server Error');
    }
});

// app.listen(port, () => {
//     console.log(`Server listening at http://localhost:${port}`);
// });

function startServer() {
    app.listen(PORT, () => {
        console.log(`Login server is running on http://localhost:${PORT}`);
    });
  }

  module.exports = startServer;