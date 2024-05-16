// const mongoose = require('mongoose');

// const doctorSchema = new mongoose.Schema({
//     name: String,
//     speciality: String,
//     surveyAssign: String
// });

// module.exports = mongoose.model('Doctor', doctorSchema);


const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    speciality: String,
});

module.exports = mongoose.model('Doctor', doctorSchema);