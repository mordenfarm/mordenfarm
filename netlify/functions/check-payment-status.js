const { Paynow } = require("paynow");

/**
 * Check Payment Status Function
 * 
 * This serverless function acts as a secure proxy for checking the status
 * of a Paynow transaction. It polls the Paynow API using the pollUrl
 * returned from the initial payment request.
 * 
 * The frontend calls this function repeatedly (every 4 seconds) to check
 * if the user has completed their mobile money payment.
 */

exports.handler = async (event) => {
    // --- 1. METHOD VALIDATION ---
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Method Not Allowed" }) 
        };
    }

    // --- 2. ENVIRONMENT VARIABLE CHECK ---
    const { PAYNOW_ID, PAYNOW_KEY } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY) {
        console.error("CRITICAL: Paynow credentials are not configured for status checking.");
        return { 
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Server configuration error." }) 
        };
    }

    // --- 3. PARSE AND VALIDATE REQUEST BODY ---
    let pollUrl;
    try {
        const data = JSON.parse(event.body);
        pollUrl = data.pollUrl;

        if (!pollUrl) {
            return { 
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Missing pollUrl in request body." }) 
            };
        }

        // Validate pollUrl format (basic security check)
        if (!pollUrl.startsWith('http://') && !pollUrl.startsWith('https://')) {
            return { 
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Invalid pollUrl format." }) 
            };
        }

    } catch (error) {
        return { 
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Invalid JSON in request body." }) 
        };
    }

    // --- 4. POLL TRANSACTION STATUS ---
    try {
        // Instantiate Paynow SDK with credentials
        const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);

        // Use the SDK's pollTransaction method to check status
        // This returns a StatusResponse object
        const status = await paynow.pollTransaction(pollUrl);

        // The status object has a paid() method that returns true/false
        const isPaid = status.paid();
        
        // Log for debugging (helpful for tracking payment flow)
        console.log(`Poll result for ${pollUrl}: Status=${status.status}, Paid=${isPaid}`);

        // --- 5. RETURN STATUS TO FRONTEND ---
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isPaid: isPaid,
                status: status.status, // Possible values: 'created', 'sent', 'paid', 'cancelled', 'delivered'
                // Include additional useful info if available
                reference: status.reference || null,
                amount: status.amount || null,
            }),
        };

    } catch (error) {
        // --- 6. ERROR HANDLING ---
        // This could happen if:
        // - The pollUrl is invalid or expired
        // - Network issues with Paynow servers
        // - The Paynow SDK throws an error
        console.error("Error polling transaction status:", error);
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: "An internal error occurred while checking status.",
                // Don't expose the actual error to the client for security
                isPaid: false,
                status: 'error'
            }),
        };
    }
};