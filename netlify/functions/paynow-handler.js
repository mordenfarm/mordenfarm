const { Paynow } = require("paynow");

// --- 1. CONFIGURATION & SECURITY ---
// Define product information securely on the server.
// This prevents client-side price manipulation. The frontend can send any amount,
// but we will ALWAYS use the price defined here.
const PRODUCT_INFO = {
    name: 'Modern Farmer Full Access',
    price: 49.99
};

exports.handler = async (event) => {
    // --- 2. PRE-FLIGHT CHECKS ---

    // A. Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "Method Not Allowed" })
        };
    }

    // B. Check for essential environment variables
    const { PAYNOW_ID, PAYNOW_KEY, SITE_URL } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY || !SITE_URL) {
        console.error("CRITICAL ERROR: Missing Paynow or Site URL environment variables.");
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "Server configuration error. Please contact support." })
        };
    }

    // --- 3. PARSE & VALIDATE INCOMING DATA ---
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "Invalid JSON in request body." })
        };
    }

    // Destructure the required fields from the client.
    // We deliberately ignore `amount` and `itemName` from the client for security.
    const { paymentMethod, currency, paymentDetails, userId, email } = data;

    // Ensure all required fields from the client are present.
    const requiredFields = { paymentMethod, currency, paymentDetails, userId, email };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Missing required field: ${key}` })
            };
        }
    }

    // --- 4. PAYNOW INTEGRATION LOGIC ---
    try {
        // Instantiate the Paynow SDK with your credentials
        const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);

        // Set the URL where Paynow will post the transaction status update (your webhook)
        paynow.resultUrl = `${SITE_URL}/.netlify/functions/paynow-webhook`;

        // Set the URL where the user is returned to after payment on a Paynow page (optional but good practice)
        paynow.returnUrl = `${SITE_URL}`; // e.g., redirect to a "thank you" page

        // Create a unique reference for this transaction.
        // Embedding the userId is crucial for identifying the user in the webhook.
        const uniqueReference = `MF-${userId}-${Date.now()}`;

        // Create a new payment object using the user's email
        const payment = paynow.createPayment(uniqueReference, email);

        // Add the product to the cart using the SECURE, server-defined name and price
        payment.add(PRODUCT_INFO.name, PRODUCT_INFO.price);

        // --- 4A. VALIDATE MOBILE METHOD ---
        // Sanitize the payment method name from the frontend (e.g., "EcoCash" -> "ecocash")
        const mobileMethod = paymentMethod.toLowerCase().replace(/\s/g, '');
        const validMethods = ['ecocash', 'onemoney', 'innbucks', 'telecash', 'visa', 'mastercard', 'zimswitch', 'paygo', 'banktransfer'];

        if (!validMethods.includes(mobileMethod)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    message: `Invalid payment method. Supported methods: ${validMethods.join(', ')}`
                })
            };
        }

        // --- 4B. VALIDATE PHONE NUMBER FORMAT ---
        // Zimbabwean mobile numbers: 077XXXXXXX, 078XXXXXXX, 071XXXXXXX, 073XXXXXXX, 076XXXXXXX
        const phoneRegex = /^0(77|78|71|73|76)\d{7}$/;
        if (['ecocash', 'onemoney', 'innbucks', 'telecash'].includes(mobileMethod) && !phoneRegex.test(paymentDetails)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    message: "Invalid phone number format. Please use format: 07XXXXXXXX"
                })
            };
        }

        // --- 5. SEND MOBILE PAYMENT REQUEST ---
        // Use `sendMobile` for push payments like EcoCash, OneMoney, etc.
        let response;
        try {
            response = await paynow.sendMobile(payment, paymentDetails, mobileMethod);
        } catch (apiError) {
            // Handle promise rejection from Paynow SDK
            console.error("Paynow API call failed:", apiError);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    message: "Failed to communicate with payment gateway. Please try again."
                }),
            };
        }

        if (response && response.success) {
            // Payment was initiated successfully by Paynow.
            console.log(`Successfully initiated payment for user ${userId}. Poll URL: ${response.pollUrl}`);

            // Return a success response to the frontend, including the poll URL.
            // The frontend can use this URL to check the transaction status.
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: "Payment initiated. Please check your phone to approve the transaction.",
                    instructions: response.instructions || "Check your phone for the payment prompt",
                    pollUrl: response.pollUrl,
                }),
            };
        } else {
            // Paynow returned an error (e.g., invalid phone number, service unavailable).
            const errorMessage = response?.error || "Unknown error from payment gateway.";
            console.error(`Paynow initiation failed for user ${userId}:`, errorMessage);

            return {
                statusCode: 400, // Bad Request, as the issue is likely with the payment details
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: errorMessage }),
            };
        }

    } catch (error) {
        // --- 6. UNEXPECTED ERROR HANDLING ---
        console.error("An unexpected error occurred in the paynow-handler:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "An internal server error occurred. Please try again later." }),
        };
    }
};