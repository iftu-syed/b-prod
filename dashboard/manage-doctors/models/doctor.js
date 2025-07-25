

const mongoose = require('mongoose');
const doctorSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    doctor_id :String,
    password: String,
    hashedusername:String,
    speciality: String,
    hospital_code: String,
    site_code: String,
    hospitalName: String, // Add this line
    loginCounter: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false },
    passwordChangedByAdmin: { type: Boolean, default: false },
    loginTimestamps: {
        type: [Date],
        default: []
    },
    viewMoreTimestamps: {
        type: [
        {
            Mr_no: String,
            timestamp: Date
        }
        ],
        default: []
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: String,
    role: {
    type:   String,
    default: 'doctor',
    immutable: true
  }
});

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
