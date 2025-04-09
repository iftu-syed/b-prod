const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Define the base path
const basePath = '/privacy-policy';

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import Router
const router = express.Router();

// Define the GET route for privacy-policy
router.get('/', (req, res) => {
    res.render('privacy', { title: 'Privacy Policy' });
});

// Use the router under the base path
app.use(basePath, router);

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}${basePath}/privacy-policy`);
});
