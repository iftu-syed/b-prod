const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  surveyName: {
    type: String,
    required: true,
    unique: true
  }
});

const Survey = mongoose.model('Survey', surveySchema);

module.exports = Survey;
