// const mongoose = require('mongoose');

// const staffSchema = new mongoose.Schema({
//     name: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String, // Ensure this line is included
// });

// module.exports = mongoose.model('Staff', staffSchema);


// staff.js (under models)

const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    firstName: String,  // Replace name with firstName
    lastName: String,   // Add lastName
    username: String,
    password: String,
    speciality: String,
    hospital_code: String,
});

module.exports = mongoose.model('Staff', staffSchema);
