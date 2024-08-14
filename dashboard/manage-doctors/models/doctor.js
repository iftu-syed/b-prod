

// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     name: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String, // Ensure this line is included
// });

// module.exports = mongoose.model('Doctor', doctorSchema);



// doctor.js (and similarly staff.js)
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    firstName: String, // Replacing name with firstName
    lastName: String,  // Adding lastName
    username: String,
    password: String,
    speciality: String,
    hospital: String,
});

module.exports = mongoose.model('Doctor', doctorSchema);
