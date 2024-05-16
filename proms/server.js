// const express = require('express');
// const { exec } = require('child_process');

// const app = express();
// const PORT = 3000;

// app.use(express.urlencoded({ extended: true }));

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
// });

// app.post('/submit', (req, res) => {
//     const inputData = req.body.inputData;
    
//     // Execute Python script with input data
//     exec(`python run_code_folder_generation.py ${inputData}`, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Error executing Python script: ${error.message}`);
//             return;
//         }
//         if (stderr) {
//             console.error(`Python script stderr: ${stderr}`);
//             return;
//         }
//         // Send the output back to the client
//         res.send(stdout);
        
//     });
// });

// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });


const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.get('/test', (req, res) => {
//     res.sendFile(__dirname+'/advanced_images.html');
// });
// console.log(__dirname + '/advanced_images.html');

app.post('/submit', (req, res) => {
    const inputData = req.body.inputData;
    
    // Execute Python script with input data
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
        // No need to send the output back to the client
        res.status(204).end();
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
