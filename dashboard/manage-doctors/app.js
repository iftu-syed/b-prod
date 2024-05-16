const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const PORT = 4010;
const app = express();
const Doctor = require('./models/doctor');
app.set('view engine', 'ejs');


// MongoDB connection
mongoose.connect('mongodb://localhost:27017/manage_doctors', { useNewUrlParser: true, useUnifiedTopology: true });



// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Routes
app.use('/doctors', require('./routes/doctors'));

app.set('views', path.join(__dirname, 'views'));

// Home route to redirect to manage doctors page
app.get('/', (req, res) => {
    res.redirect('/doctors');
});

// app.post('/delete/:id', async (req, res) => {
//     try {
//         await Doctor.findByIdAndDelete(req.params.id);
//         res.redirect('/');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

app.post('/delete/:id', async (req, res) => {
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// Start server
// const PORT = process.env.PORT || 4001;

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function startServer() {
    app.listen(PORT, () => {
        console.log(`Login server is running on http://localhost:${PORT}`);
    });
  }

  module.exports = startServer;