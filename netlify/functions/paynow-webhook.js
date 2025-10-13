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
    console.error("CRITICAL: Firebase Admin initialization failed:", error);
    // Don't throw - let the handler function return proper HTTP responses
}

const db = admin.firestore();

exports.handler = async (event) => {
    // --- 2. VALIDATE THE INCOMING REQUEST ---
    
    // A. Check HTTP method
    if (event.httpMethod !== 'POST') {
        console.warn(`Invalid HTTP method received: ${event.httpMethod}`);
        return { 
            statusCode: 405, 
            headers: { 'Content-Type': 'text/plain' },
            body: "Method Not Allowed" 
        };
    }
    
    // B. Verify environment variables
    const { PAYNOW_KEY } = process.env;
    if (!PAYNOW_KEY) {
        console.error("CRITICAL: PAYNOW_KEY is not set for webhook verification.");
        return { 
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: "Server Configuration Error." 
        };
    }

    // C. Verify Firebase Admin is initialized
    if (!admin.apps.length) {
        console.error("CRITICAL: Firebase Admin is not initialized.");
        return { 
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: "Server Configuration Error." 
        };
    }

    // --- 3. PARSE WEBHOOK DATA ---
    let fields;
    try {
        // Paynow sends data as application/x-www-form-urlencoded
        fields = querystring.parse(event.body);
        
        // Validate that we have required fields
        if (!fields || typeof fields !== 'object') {
            throw new Error("Invalid webhook data structure");
        }
        
    } catch (error) {
        console.error("Failed to parse incoming webhook data:", error);
        return { 
            statusCode: 400,
            headers: { 'Content-Type': 'text/plain' },
            body: "Bad Request: Could not parse body." 
        };
    }
    
    // --- 4. SECURITY: VERIFY THE PAYNOW HASH ---
    // This is CRITICAL to ensure the request is genuinely from Paynow
    // and not a malicious actor trying to grant free subscriptions.
    
    const receivedHash = fields.hash;
    
    if (!receivedHash) {
        console.warn("Webhook received without hash. Rejecting.");
        return { 
            statusCode: 403,
            headers: { 'Content-Type': 'text/plain' },
            body: "Forbidden: Missing hash." 
        };
    }
    
    // Recreate the hash string exactly as Paynow does
    let concatenatedString = "";
    
    // Sort keys alphabetically (Paynow's requirement)
    Object.keys(fields)
        .sort()
        .forEach(key => {
            // Exclude the hash field itself from the concatenation
            if (key.toLowerCase() !== "hash") {
                concatenatedString += fields[key];
            }
        });

    // Add the integration key at the end
    concatenatedString += PAYNOW_KEY;

    // Generate SHA-512 hash and convert to uppercase
    const expectedHash = crypto
        .createHash('sha512')
        .update(concatenatedString)
        .digest('hex')
        .toUpperCase();

    // Compare hashes (case-insensitive for safety)
    if (receivedHash.toUpperCase() !== expectedHash) {
        console.warn("Webhook hash mismatch. Possible fraudulent request.", { 
            receivedHash: receivedHash.substring(0, 10) + "...", // Log partial hash for security
            expectedHash: expectedHash.substring(0, 10) + "...",
            reference: fields.reference 
        });
        return { 
            statusCode: 403,
            headers: { 'Content-Type': 'text/plain' },
            body: "Forbidden: Invalid hash." 
        };
    }

    // --- 5. EXTRACT AND VALIDATE WEBHOOK DATA ---
    const { reference, status, paynowreference, amount, pollurl } = fields;
    
    console.log(`Webhook received - Reference: ${reference}, Status: ${status}, Amount: ${amount}`);

    // Validate required fields
    if (!reference || !status) {
        console.error("Webhook missing required fields (reference or status)");
        return { 
            statusCode: 200, // Return 200 to prevent Paynow retries
            headers: { 'Content-Type': 'text/plain' },
            body: "OK. Missing required fields." 
        };
    }

    // --- 6. PROCESS SUCCESSFUL PAYMENTS ---
    // Only process if the payment was successful
    if (status.toLowerCase() === 'paid') {
        try {
            // Extract userId from the reference format: MF-{userId}-{timestamp}
            const referenceParts = reference.split('-');
            
            if (referenceParts.length < 3 || referenceParts[0] !== 'MF') {
                console.error(`Invalid reference format: ${reference}. Expected format: MF-{userId}-{timestamp}`);
                return { 
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/plain' },
                    body: "OK. Invalid reference format." 
                };
            }
            
            const userId = referenceParts[1];

            if (!userId || userId.length === 0) {
                console.error(`Could not extract userId from reference: ${reference}`);
                return { 
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/plain' },
                    body: "OK. Invalid userId in reference." 
                };
            }
            
            // --- 7. UPDATE FIRESTORE DATABASE ---
            const userRef = db.collection('users').doc(userId);
            
            // Check if user exists before updating
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                console.error(`User document does not exist for userId: ${userId}`);
                return { 
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/plain' },
                    body: "OK. User not found." 
                };
            }

            // Update user's subscription status
            await userRef.update({
                subscription: true,
                subscriptionStatus: 'active',
                lastPaymentReference: reference,
                lastPaymentAmount: amount || null,
                paynowReference: paynowreference || null,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                subscriptionActivatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✓ Successfully activated subscription for user: ${userId}, Reference: ${reference}`);
            
            // --- 8. OPTIONAL: LOG TRANSACTION ---
            // Create a transaction log for audit purposes
            await db.collection('transactions').add({
                userId: userId,
                reference: reference,
                paynowReference: paynowreference || null,
                status: status,
                amount: amount || null,
                pollUrl: pollurl || null,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                webhookData: fields // Store complete webhook data
            });

            console.log(`✓ Transaction logged for reference: ${reference}`);
            
        } catch (error) {
            // Log the error but return 200 to prevent Paynow from retrying
            // (since retrying won't fix a database/code error)
            console.error(`Failed to update Firestore for reference ${reference}:`, error);
            console.error("Error details:", error.message, error.stack);
            
            // Return 500 only if you want Paynow to retry
            // Return 200 if the error is not retriable
            return { 
                statusCode: 500,
                headers: { 'Content-Type': 'text/plain' },
                body: "Internal Server Error during database update." 
            };
        }
    } else {
        // Log non-paid statuses for monitoring
        console.log(`Non-paid status received - Reference: ${reference}, Status: ${status}`);
        
        // Optional: Update user document with failed/cancelled status
        try {
            const referenceParts = reference.split('-');
            if (referenceParts.length >= 3 && referenceParts[0] === 'MF') {
                const userId = referenceParts[1];
                
                await db.collection('transactions').add({
                    userId: userId,
                    reference: reference,
                    status: status,
                    amount: amount || null,
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                    note: 'Payment not completed'
                });
            }
        } catch (logError) {
            // Don't fail the webhook if logging fails
            console.error("Failed to log non-paid transaction:", logError);
        }
    }

    // --- 9. ACKNOWLEDGE RECEIPT ---
    // Always return 200 OK to Paynow to acknowledge receipt
    // This prevents Paynow from retrying the webhook
    return { 
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: "Webhook processed successfully." 
    };
};