

// mock_auth_server.js (Updated to mimic Bupa/GOQii API for testing)
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
// crypto is not needed for Bupa token validation as per docs, but jwt uses it internally.

const app = express();
// Ensure this PORT matches what your index.js BUPA_API_BASE_URL points to for testing
const PORT = 3006;

// --- Configuration: These are the credentials THIS MOCK SERVER expects ---
// Your index.js (when testing against this mock) should use these values
// for its BUPA_API_CLIENT_ID and BUPA_API_SECRET config.
const EXPECTED_BUPA_CLIENT_ID = 'clientexample'; // As per Bupa PDF example
const EXPECTED_BUPA_SECRET = 'secretexample';   // As per Bupa PDF example

const JWT_ACCESS_TOKEN_SECRET = 'your-secure-jwt-secret-for-this-mock'; // Secret to sign/verify access tokens
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900; // 15 minutes, as per Bupa PDF

app.use(bodyParser.json()); // To parse JSON bodies

// --- Helper Function to Generate Access Token ---
function generateBupaAccessToken(clientId) {
    const accessTokenPayload = { clientId: clientId, type: 'access', sub: 'wehealthify_client' };
    const accessToken = jwt.sign(accessTokenPayload, JWT_ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS });
    return {
        access_token: accessToken,
        access_token_expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS.toString()
    };
}

// --- Bupa/GOQii API Mock Endpoints ---

// 1. Fetch JWT Access Token (Mimicking GET /services/wh_fetch_token)
app.get('/services/wh_fetch_token', (req, res) => {
    console.log('\n--- Mock Bupa: Received request for /services/wh_fetch_token ---');
    const receivedClientId = req.headers['clientid']; // Headers are case-insensitive, but often lowercased
    const receivedSecret = req.headers['secret'];

    console.log('Received clientId header:', receivedClientId);
    console.log('Received secret header:', receivedSecret);

    if (!receivedClientId || !receivedSecret) {
        console.error('clientId or secret header missing');
        // Bupa docs don't specify error structure for this, sending a generic 400
        return res.status(400).json({ code: 400, message: 'clientId or secret header missing' });
    }

    // Validate credentials
    if (receivedClientId !== EXPECTED_BUPA_CLIENT_ID || receivedSecret !== EXPECTED_BUPA_SECRET) {
        console.error('Invalid clientId or secret');
        // Bupa docs don't specify error structure for this, sending a generic 401
        return res.status(401).json({ code: 401, message: 'Invalid clientId or secret' });
    }

    // If credentials are valid, issue an access token
    const tokenData = generateBupaAccessToken(receivedClientId);
    console.log('Successfully validated. Issuing Bupa access token:', tokenData);
    res.status(200).json({
        code: 200,
        data: tokenData
    });
});

// --- Middleware to Verify Bupa Access Token ---
function verifyBupaAccessToken(req, res, next) {
    console.log('\n--- Mock Bupa: Verifying access token for protected route ---');
    const authHeader = req.headers.authorization;

    // Bupa PDF for wh_send_whatsapp_messages shows "Authorization: <access_token>"
    // Bupa PDF for wh_fetch_member_analytics shows "Authorization: Bearer <access_token>"
    // For consistency and common practice, this mock will check for "Bearer <token>"
    // Your index.js should send "Bearer <token>" for this mock.
    // If Bupa strictly requires no "Bearer" for WhatsApp, adjust your index.js or this middleware.
    if (!authHeader) {
        console.error('Authorization header missing');
        return res.status(401).json({ code: 401, status: "error", message: 'Unauthorized or invalid token - Authorization header missing' }); //
    }

    const parts = authHeader.split(' ');
    let token;

    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
    } else if (parts.length === 1) {
        // To accommodate if "Authorization: <access_token>" (no "Bearer") is sent for WhatsApp endpoint
        token = parts[0];
        console.log('Received Authorization header without "Bearer" prefix, using the full header as token.');
    } else {
        console.error('Invalid Authorization header format');
        return res.status(401).json({ code: 401, status: "error", message: 'Unauthorized or invalid token - Invalid Authorization header format' });
    }
    
    console.log('Received Access Token for verification:', token);

    try {
        const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET);
        console.log('Access token successfully verified. Decoded:', decoded);
        req.userContext = decoded; // Attach decoded payload (e.g., clientId) to request
        next();
    } catch (err) {
        console.error('Access token verification failed:', err.message);
        res.status(401).json({ code: 401, status: "error", message: 'Unauthorized or invalid token' }); //
    }
}

// 2. Sending WhatsApp Messages (Mimicking POST /services/wh_send_whatsapp_messages)
app.post('/services/wh_send_whatsapp_messages', verifyBupaAccessToken, (req, res) => {
    console.log('\n--- Mock Bupa: Received request for /services/wh_send_whatsapp_messages ---');
    const { template, data } = req.body; // `data` is now expected to be an array directly

    console.log('Authenticated Client ID from token:', req.userContext.clientId);
    console.log('Received Template Name:', template);
    console.log('Received Data (should be a direct JSON array):', data); // Log the received data

    if (!template || data === undefined) {
        console.error('Missing template or data in request body');
        return res.status(400).json({ code: 400, status: "error", message: 'Missing template or data fields' });
    }

    // Validate if 'data' is an array
    if (!Array.isArray(data)) {
        console.error("'data' field is not an array. Received:", data);
        return res.status(400).json({ code: 400, status: "error", message: "Invalid 'data' field format. Expected a JSON array." });
    }

    console.log(`Received 'data' field: Contains ${data.length} records.`);
    // e.g., console.log('First record in received data (if any):', data[0]);


    // Bupa API specifies max 300 records per chunk [cite: 12]
    if (data.length > 300) {
        console.warn(`Warning: Received chunk with ${data.length} records, which exceeds Bupa's max of 300 per chunk.`);
    }

    // TODO: If encryption is used by the client, you would add mock decryption logic here.
    // For now, we assume it's unencrypted.

    // Simulate Bupa's success response [cite: 13]
    res.status(200).json({
        code: 200,
        status: "queued",
        total_records: data.length, // Reflect the number of records received
        message: "Messages have been queued for delivery by Mock Bupa Server"
    });
});


// Optional: Mock Analytics Endpoint (Mimicking POST /services/wh_fetch_member_analytics)
// This is if your index.js also needs to test fetching analytics.
app.post('/services/wh_fetch_member_analytics', verifyBupaAccessToken, (req, res) => {
    console.log('\n--- Mock Bupa: Received request for /services/wh_fetch_member_analytics ---');
    const { date, page } = req.body;
    console.log('Authenticated Client ID from token:', req.userContext.clientId);
    console.log('Received date:', date);
    console.log('Received page:', page);

    if (!date) {
        return res.status(400).json({ "code": 400, "status": "error", "message": "Date parameter is required" }); //
    }
    // Basic date format validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ "code": 400, "status": "error", "message": "Invalid date format. Expected YYYY-MM-DD." });
    }
    const pageNumber = parseInt(page, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({ "code": 400, "status": "error", "message": "Invalid page number. Must be a positive integer."});
    }

    // Simulate paged data
    const mockTotalRecords = 1200; //
    const mockPageSize = 300; //
    const mockTotalPages = Math.ceil(mockTotalRecords / mockPageSize); //

    if (pageNumber > mockTotalPages) {
        return res.status(400).json({ "code": 400, "status": "error", "message": "Page number exceeds total pages" }); //
    }

    // Generate some mock member analytics data
    const members = [];
    const startIndex = (pageNumber - 1) * mockPageSize;
    for (let i = 0; i < mockPageSize && (startIndex + i) < mockTotalRecords; i++) {
        const recordIndex = startIndex + i + 1;
        members.push({ //
            national_id: `NATID${recordIndex.toString().padStart(8, '0')}`,
            first_name: `FirstName${recordIndex}`,
            last_name: `LastName${recordIndex}`,
            phone_number: `0500000${recordIndex.toString().padStart(3,'0')}`,
            message_sent: true,
            delivery_status: (recordIndex % 10 === 0) ? "failed" : "delivered",
            delivery_timestamp: `${date} ${10 + (i % 12)}:${10 + (i % 50)}:00`,
            read_status: (recordIndex % 5 === 0) ? "unread" : "read",
            read_timestamp: (recordIndex % 5 !== 0) ? `${date} ${11 + (i % 12)}:${15 + (i % 45)}:00` : null
        });
    }

    res.status(200).json({ //
        code: 200,
        status: "success",
        date: date,
        page: pageNumber,
        page_size: mockPageSize,
        total_records: mockTotalRecords,
        total_pages: mockTotalPages,
        members: members,
        message: "Member-level analytics data retrieved successfully from Mock Bupa Server"
    });
});


app.listen(PORT, () => {
    console.log(`Mock Bupa/GOQii API Server running on https://app.wehealthify.org:${PORT}`);
    console.log(`This server expects Client ID: "${EXPECTED_BUPA_CLIENT_ID}" and Secret: "${EXPECTED_BUPA_SECRET}" for token generation.`);
    console.log('Available Mock Bupa Endpoints:');
    console.log(`  GET  /services/wh_fetch_token (Requires clientId & secret in headers)`);
    console.log(`  POST /services/wh_send_whatsapp_messages (Requires Bearer token & {template, data} body)`);
    console.log(`  POST /services/wh_fetch_member_analytics (Requires Bearer token & {date, page} body)`);
});
