const express = require('express');
const { exec } = require('child_process');
const http = require('http'); // Require the http module
const path = require('path');

const app = express();
const PORT = 3000;



// server1.js

const startServer2 = require('./API_DATA_ENTRY/index');
const startServer3 = require('./common_login/server');
// const startServer4 = require('./Doctor_Login_Page/app');

// Start the servers defined in their respective files
startServer2();
startServer3();
// startServer4();

// Start the server defined in server.js

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/index1.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index1.html'));
});



app.get('/API_DATA_ENTRY/index.js',(req,res)=>{
    res.redirect('http://127.0.0.1:3051/')
})

app.get('/Doctor_Login_Page/app.js',(req,res)=>{
    res.redirect('http://127.0.0.1:3003/')
})

app.post('/submit', (req, res) => {
    const inputData = req.body.inputData;

    exec(`python run_code_folder_generation.py ${inputData}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            res.status(500).send('Internal server error');
            return;
        }
        if (stderr) {
            console.error(`Python script stderr: ${stderr}`);
            res.status(500).send('Internal server error');
            return;
        }

        // Redirect to http://localhost:5500/advanced_images.html for Graphs or patient data Analysis.....
        res.redirect('http://127.0.0.1:5501/advanced_images.html');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

