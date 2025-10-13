const { Paynow } = require("paynow");
const crypto = require('crypto');

exports.handler = async (event) => {
    // --- 1. PRE-FLIGHT CHECK & VALIDATION ---
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
    }

    // Check for essential environment variables
    const { PAYNOW_ID, PAYNOW_KEY, SITE_URL } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY || !SITE_URL) {
        console.error("Critical Error: Missing Paynow or Site URL environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: "Server configuration error. Please contact support." })
        };
    }

    // --- 2. PARSE & VALIDATE INCOMING DATA ---
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid request body." }) };
    }

    const { action, paymentMethod, currency, paymentDetails, userId, email, amount, itemName } = data;

    // Ensure all required fields are present
    if (!action || !paymentMethod || !currency || !paymentDetails || !userId || !email || !amount || !itemName) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing required payment information." }) };
    }

    // --- 3. PAYNOW INTEGRATION LOGIC ---
    try {
        // Instantiate the Paynow SDK
        const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);

        // Set the URL where Paynow will send the payment status update (the webhook)
        paynow.resultUrl = `${SITE_URL}/.netlify/functions/paynow-webhook`;
        // Optional: Set a return URL if you want to redirect the user somewhere specific after they pay on a Paynow page
        paynow.returnUrl = `${SITE_URL}`;

        // Create a unique reference for this transaction.
        // Embedding the userId makes it easy to identify the user in the webhook.
        const uniqueReference = `MF-${userId}-${Date.now()}`;
        
        // Create a new payment object
        const payment = paynow.createPayment(uniqueReference, email);
        payment.add(itemName, amount);

        // Map frontend method names to Paynow SDK expected values (must be lowercase)
        const mobileMethod = paymentMethod.toLowerCase().replace(/\s/g, '');

        // --- 4. SEND MOBILE PAYMENT REQUEST ---
        // 'sendMobile' is used for push payments like EcoCash, OneMoney, etc.
        const response = await paynow.sendMobile(payment, paymentDetails, mobileMethod);

        if (response && response.success) {
            // Payment initiated successfully
            console.log(`Successfully initiated payment for user ${userId}. Poll URL: ${response.pollUrl}`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Payment initiated. Please check your phone.",
                    instructions: response.instructions,
                    pollUrl: response.pollUrl,
                }),
            };
        } else {
            // Paynow returned an error
            const errorMessage = response ? response.error : "Unknown error from payment gateway.";
            console.error(`Paynow initiation failed for user ${userId}:`, errorMessage);
            return {
                statusCode: 400, // Bad request, as the issue is likely with payment details or gateway status
                body: JSON.stringify({ success: false, message: errorMessage }),
            };
        }

    } catch (error) {
        // --- 5. ROBUST ERROR HANDLING ---
        console.error("An unexpected error occurred in paynow-handler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: "An internal server error occurred. Please try again later." }),
        };
    }
};