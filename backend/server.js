// backend/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const { MongoClient } = require('mongodb');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const hospitalRoute = require("./hospital");
const doctorRoute = require("./doctor");


// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use("/hospital-dashboard",hospitalRoute);
app.use("/doc-dashboard",doctorRoute);
// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const PORT = 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});