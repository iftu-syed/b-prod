

// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     name: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String, // Ensure this line is included
// });

// module.exports = mongoose.model('Doctor', doctorSchema);



// // doctor.js (and similarly staff.js)
// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     firstName: String, // Replacing name with firstName
//     lastName: String,  // Adding lastName
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String,
// });

// module.exports = mongoose.model('Doctor', doctorSchema);

// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital: String,
//     loginAttempts: { type: Number, default: 0 },  // Initialized to 0 by default
//     isLocked: { type: Boolean, default: false }   // Initialized to false by default
// });

// module.exports = mongoose.model('Doctor', doctorSchema);


// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     username: String,
//     doctor_id:String,
//     password: String,
//     speciality: String,
//     hospital_code: String,
//     loginCounter: { type: Number, default: 0 },   // Renamed from loginAttempts to loginCounter
//     failedLogins: { type: Number, default: 0 },   // New field to track the number of failed login attempts
//     lastLogin: { type: Date, default: Date.now }, // New field to store the last login timestamp
//     isLocked: { type: Boolean, default: false }
// });

// module.exports = mongoose.model('Doctor', doctorSchema);


const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    doctor_id: String,
    password: String,
    speciality: String,
    hospital_code: String,
    loginCounter: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false },
    passwordChangedByAdmin: { type: Boolean, default: false }  // New field to track admin password changes
});

module.exports = mongoose.model('Doctor', doctorSchema);
