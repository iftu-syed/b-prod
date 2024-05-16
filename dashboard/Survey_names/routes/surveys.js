const express = require('express');
const router = express.Router();
const Survey = require('../models/survey');

// Create a new survey
router.post('/', async (req, res) => {
    try {
      console.log(req.body); // Log request body
      const { surveyName } = req.body;
      const survey = new Survey({ surveyName });
      await survey.save();
      res.status(201).send('Survey added successfully');
      // res.redirect('http://localhost:4099/');
    } catch (err) {
      res.status(400).send(err);
    }
  });
  

module.exports = router;
