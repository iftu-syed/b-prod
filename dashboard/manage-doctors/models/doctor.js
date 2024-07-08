// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     name: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String, // Add this line
// });

// module.exports = mongoose.model('Doctor', doctorSchema);


const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    speciality: String,
    hospital: String, // Ensure this line is included
});

module.exports = mongoose.model('Doctor', doctorSchema);
