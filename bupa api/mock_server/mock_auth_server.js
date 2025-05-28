

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
    const { template, data } = req.body;

    console.log('Authenticated Client ID from token:', req.userContext.clientId);
    console.log('Received Template Name:', template);
    // The 'data' field is expected to be a stringified JSON array
    console.log('Received Data (raw string - could be encrypted):', data);

    if (!template || data === undefined) { // Check for data specifically, as it can be an empty string if empty array stringified
        console.error('Missing template or data in request body');
        return res.status(400).json({ code: 400, status: "error", message: 'Missing template or data fields' });
    }

    let parsedDataArray;
    try {
        parsedDataArray = JSON.parse(data); // Attempt to parse the stringified JSON array
        if (!Array.isArray(parsedDataArray)) {
            throw new Error("Data is not an array after parsing.");
        }
        console.log(`Parsed 'data' field: Contains ${parsedDataArray.length} records.`);
        // You can log individual records if needed for debugging, but be mindful of sensitive data.
        // e.g., console.log('First record in parsed data (if any):', parsedDataArray[0]);
    } catch (parseError) {
        console.error("Error parsing 'data' field (should be a stringified JSON array):", parseError.message);
        // Bupa docs don't specify error for this, sending a generic 400
        return res.status(400).json({ code: 400, status: "error", message: "Invalid 'data' field format. Expected stringified JSON array." });
    }

    // Bupa API specifies max 300 records per chunk
    // This mock endpoint receives what your client sends (which should be one chunk).
    // We can check if the received chunk respects the limit.
    if (parsedDataArray.length > 300) {
        console.warn(`Warning: Received chunk with ${parsedDataArray.length} records, which exceeds Bupa's max of 300 per chunk.`);
        // Note: The real Bupa API might reject this. This mock will still process it for testing your client's sending logic.
    }

    // TODO: If encryption is used by the client, you would add mock decryption logic here
    // using a shared secret to inspect 'parsedDataArray'. For now, we assume it's unencrypted or we log the encrypted string.

    // Simulate Bupa's success response
    res.status(200).json({
        code: 200,
        status: "queued",
        total_records: parsedDataArray.length, // Reflect the number of records received in this chunk
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


// // mock_auth_server.js
// const express = require('express');
// const bodyParser = require('body-parser');
// const crypto = require('crypto');
// const jwt = require('jsonwebtoken');

// const app = express();
// const PORT = 3006; // Port for our mock server

// // --- Configuration (normally this would be stored securely) ---
// const MOCK_CLIENT_ID = 'test_client_id_123';
// const MOCK_CLIENT_SECRET = 'super_secret_key_shhh'; // Used to validate signature & sign JWTs
// const JWT_ACCESS_TOKEN_SECRET = MOCK_CLIENT_SECRET; // For simplicity, use same secret for JWT signing
// const JWT_REFRESH_TOKEN_SECRET = 'another_super_secret_for_refresh';

// const ACCESS_TOKEN_EXPIRES_IN = 15 * 60;
// const REFRESH_TOKEN_EXPIRES_IN = 60 * 60;

// // In-memory store for valid refresh tokens (for simplicity in this mock)
// // In a real app, this would be a persistent database
// const validRefreshTokens = new Set();

// app.use(bodyParser.json()); // To parse JSON bodies
// app.use(bodyParser.text()); // To parse raw text bodies if Authorization header is sent as plain string

// // --- Helper Functions ---
// function generateSignature(timestamp, secret) {
//     return crypto.createHash('sha256').update(timestamp + secret).digest('hex');
// }

// function generateTokens(clientId) {
//     const accessTokenPayload = { clientId: clientId, type: 'access', sub: 'user_or_client_identifier' };
//     const accessToken = jwt.sign(accessTokenPayload, JWT_ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

//     const refreshTokenPayload = { clientId: clientId, type: 'refresh', sub: 'user_or_client_identifier' };
//     const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    
//     validRefreshTokens.add(refreshToken); // Store valid refresh token

//     return {
//         access_token: accessToken,
//         access_token_expires_in: ACCESS_TOKEN_EXPIRES_IN.toString(),
//         refresh_token: refreshToken,
//         refresh_token_expires_in: REFRESH_TOKEN_EXPIRES_IN.toString(),
//     };
// }

// // --- Token Endpoints ---

// // 1. GET JWT TOKEN
// app.get('/services/fetch_jwt_token', (req, res) => {
//     console.log('\n--- Received request for /services/fetch_jwt_token ---');
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//         console.error('Authorization header missing');
//         return res.status(400).json({ code: 400, message: 'Authorization header missing' });
//     }

//     let authData;
//     try {
//         authData = JSON.parse(authHeader);
//         console.log('Parsed Authorization Header:', authData);
//     } catch (e) {
//         console.error('Invalid Authorization header format (not JSON):', authHeader);
//         return res.status(400).json({ code: 400, message: 'Invalid Authorization header format. Expected JSON.' });
//     }

//     const { clientId, signature, timestamp } = authData;

//     if (!clientId || !signature || !timestamp) {
//         console.error('Missing clientId, signature, or timestamp in Authorization header');
//         return res.status(400).json({ code: 400, message: 'Missing clientId, signature, or timestamp' });
//     }

//     // Validate clientId
//     if (clientId !== MOCK_CLIENT_ID) {
//         console.error(`Invalid clientId: ${clientId}. Expected: ${MOCK_CLIENT_ID}`);
//         return res.status(401).json({ code: 401, message: 'Invalid clientId' });
//     }

//     // Validate signature
//     const expectedSignature = generateSignature(timestamp.toString(), MOCK_CLIENT_SECRET);
//     console.log(`Received Signature: ${signature}`);
//     console.log(`Expected Signature: ${expectedSignature}`);
//     console.log(`Timestamp used for expected signature: ${timestamp}`);


//     // --- Timestamp validation (optional but good practice) ---
//     const requestTimestamp = parseInt(timestamp, 10);
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const FIVE_MINUTES = 5 * 60;

//     if (Math.abs(currentTimestamp - requestTimestamp) > FIVE_MINUTES) {
//         console.error('Timestamp is too old or too far in the future.');
//         // Note: The client's example timestamp "1726124042" is for Sep 12 2024.
//         // For local testing, ensure your client sends a current timestamp.
//         // We'll be more lenient here for simple testing, but in production, this check is vital.
//         // return res.status(401).json({ code: 401, message: 'Timestamp out of valid range.' });
//     }
//     // --- End Timestamp validation ---


//     if (signature !== expectedSignature) {
//         console.error('Invalid signature');
//         return res.status(401).json({ code: 401, message: 'Invalid signature' });
//     }

//     // If all checks pass, issue tokens
//     const tokens = generateTokens(clientId);
//     console.log('Successfully validated. Issuing tokens:', tokens);
//     res.status(200).json({
//         code: 200,
//         data: tokens,
//     });
// });

// // 2. REFRESH ACCESS TOKEN
// app.get('/services/refresh_access_token', (req, res) => {
//     console.log('\n--- Received request for /services/refresh_access_token ---');
//     const providedRefreshToken = req.headers.authorization; // As per client spec, refresh token is directly in Auth header

//     if (!providedRefreshToken) {
//         console.error('Authorization header (refresh token) missing');
//         return res.status(400).json({ code: 400, message: 'Refresh token missing in Authorization header' });
//     }
//     console.log('Received Refresh Token in Auth Header:', providedRefreshToken);

//     // Check if this refresh token is one we issued and consider valid
//     if (!validRefreshTokens.has(providedRefreshToken)) {
//         console.error('Invalid or expired refresh token provided.');
//         return res.status(401).json({ code: 401, message: 'Invalid or expired refresh token.' });
//     }
    
//     try {
//         // Verify the refresh token itself (optional if just checking against the set, but good for checking expiry)
//         const decoded = jwt.verify(providedRefreshToken, JWT_REFRESH_TOKEN_SECRET);
//         console.log('Refresh token successfully verified. Decoded:', decoded);

//         // Issue new set of tokens
//         const tokens = generateTokens(decoded.clientId);
        
//         // Invalidate the old refresh token (important for security)
//         validRefreshTokens.delete(providedRefreshToken);
//         console.log('Old refresh token invalidated. Issuing new tokens:', tokens);

//         res.status(200).json({
//             code: 200,
//             data: tokens,
//         });

//     } catch (err) {
//         console.error('Refresh token verification failed:', err.message);
//         validRefreshTokens.delete(providedRefreshToken); // Remove if verification fails (e.g. expired)
//         return res.status(401).json({ code: 401, message: `Refresh token error: ${err.message}` });
//     }
// });


// // --- Protected Resource Endpoint ---
// // This endpoint requires a valid access token
// app.post('/api/my_protected_data', (req, res) => {
//     console.log('\n--- Received request for /api/my_protected_data ---');
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         console.error('Authorization header missing or not Bearer type');
//         return res.status(401).json({ code: 401, message: 'Unauthorized: Missing or invalid Bearer token' });
//     }

//     const token = authHeader.split(' ')[1];
//     console.log('Received Access Token:', token);

//     try {
//         const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET); // Verify using the same secret used to sign
//         console.log('Access token successfully verified. Decoded:', decoded);

//         // Token is valid, process the request
//         const requestInput = req.body;
//         console.log('Request Input to protected resource:', requestInput);

//         res.status(200).json({
//             code: 200,
//             message: 'Hi, I have received your request input.',
//             received_input: requestInput,
//             token_payload: decoded
//         });
//     } catch (err) {
//         console.error('Access token verification failed:', err.message);
//         res.status(401).json({ code: 401, message: `Unauthorized: ${err.message}` });
//     }
// });


// function verifyMockAccessToken(req, res, next) {
//     console.log('\n--- Verifying access token for protected route ---');
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         console.error('Authorization header missing or not Bearer type');
//         return res.status(401).json({ code: 401, message: 'Unauthorized: Missing or invalid Bearer token' });
//     }

//     const token = authHeader.split(' ')[1];
//     console.log('Received Access Token:', token);

//     try {
//         // Ensure JWT_ACCESS_TOKEN_SECRET is defined (it should be from your existing code)
//         const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET);
//         console.log('Access token successfully verified. Decoded:', decoded);
//         req.user = decoded; // Attach decoded payload to request if needed
//         next(); // Proceed to the route handler
//     } catch (err) {
//         console.error('Access token verification failed:', err.message);
//         return res.status(401).json({ code: 401, message: `Unauthorized: ${err.message}` });
//     }
// }


// // --- New Protected Endpoint to Receive Appointment Data ---
// app.post('/api/v1/external_appointment_data', verifyMockAccessToken, (req, res) => {
//     console.log('\n--- Received request for /api/v1/external_appointment_data ---');
//     const receivedData = req.body;

//     console.log('Authenticated Client ID:', req.user.clientId); // From the token
//     console.log('Received Appointment Data Payload:', JSON.stringify(receivedData, null, 2));

//     // TODO: Here you would typically:
//     // 1. Validate the receivedData payload structure.
//     // 2. Process the data (e.g., store it in a mock database, log it, etc.).

//     // For now, just acknowledge receipt
//     res.status(200).json({
//         code: 200,
//         message: 'Appointment data received successfully by mock server.',
//         data_received: receivedData // Echo back the data for confirmation
//     });
// });




// app.listen(PORT, () => {
//     console.log(`Mock Auth Server running on https://app.wehealthify.org:${PORT}`);
//     console.log(`Client ID: ${MOCK_CLIENT_ID}`);
//     console.log(`Client Secret: ${MOCK_CLIENT_SECRET}`);
//     console.log('Endpoints:');
//     console.log(`  GET /services/fetch_jwt_token`);
//     console.log(`  GET /services/refresh_access_token`);
//     console.log(`  POST /api/my_protected_data (requires Bearer token)`);
//     console.log(`POST /api/v1/external_appointment_data`)
// });