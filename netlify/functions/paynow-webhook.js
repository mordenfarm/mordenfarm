const admin = require('firebase-admin');
const crypto = require('crypto');
const querystring = require('querystring');

// --- 1. INITIALIZE FIREBASE ADMIN SDK ---
// This is done once when the function is deployed, not on every invocation.
try {
    if (!admin.apps.length) {
        const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(credentials),
        });
    }
} catch (error) {
    console.error("Firebase Admin initialization failed:", error);
}

const db = admin.firestore();

exports.handler = async (event) => {
    // --- 2. VALIDATE THE INCOMING REQUEST ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: "Method Not Allowed" };
    }
    
    const { PAYNOW_KEY } = process.env;
    if (!PAYNOW_KEY) {
        console.error("CRITICAL: PAYNOW_KEY is not set for webhook verification.");
        return { statusCode: 500, body: "Server Configuration Error." };
    }

    let fields;
    try {
        // Paynow sends data as application/x-www-form-urlencoded
        fields = querystring.parse(event.body);
    } catch (error) {
        console.error("Failed to parse incoming webhook data.", error);
        return { statusCode: 400, body: "Bad Request: Could not parse body." };
    }
    
    // --- 3. SECURITY: VERIFY THE PAYNOW HASH ---
    // This is crucial to ensure the request is genuinely from Paynow.
    const receivedHash = fields.hash;
    let concatenatedString = "";
    
    // Recreate the string that Paynow hashes
    Object.keys(fields)
        .sort() // Sort keys alphabetically
        .forEach(key => {
            if (key.toLowerCase() !== "hash") {
                concatenatedString += fields[key];
            }
        });

    concatenatedString += PAYNOW_KEY;

    const expectedHash = crypto.createHash('sha512').update(concatenatedString).digest('hex').toUpperCase();

    if (receivedHash !== expectedHash) {
        console.warn("Webhook hash mismatch. Possible fraudulent request.", { receivedHash, expectedHash });
        return { statusCode: 403, body: "Forbidden: Invalid hash." };
    }

    // --- 4. PROCESS THE VERIFIED DATA ---
    const { reference, status, pollurl } = fields;
    console.log(`Webhook received for reference: ${reference}, status: ${status}`);

    // Check if the transaction was successful
    if (status && status.toLowerCase() === 'paid') {
        try {
            // Extract the userId from the unique reference we created
            const userId = reference.split('-')[1];

            if (!userId) {
                console.error(`Could not parse userId from reference: ${reference}`);
                // Return 200 so Paynow doesn't retry, but log the error
                return { statusCode: 200, body: "OK. Error processing reference." };
            }
            
            // --- 5. UPDATE FIRESTORE DATABASE ---
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                subscription: true,
                lastPaymentReference: reference,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Successfully updated subscription for user: ${userId}`);
            
        } catch (error) {
            console.error(`Failed to update Firestore for reference ${reference}:`, error);
            // Return 500 to signal an error, Paynow might retry
            return { statusCode: 500, body: "Internal Server Error during database update." };
        }
    } else {
        console.log(`Non-paid status received for reference ${reference}: ${status}`);
    }

    // --- 6. ACKNOWLEDGE RECEIPT ---
    // Always return a 200 OK to Paynow to let them know you've received the webhook.
    return { statusCode: 200, body: "Webhook processed successfully." };
};