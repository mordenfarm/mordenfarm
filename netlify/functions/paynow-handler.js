const { Paynow } = require("paynow");

// --- 1. CONFIGURATION & SECURITY ---
const PRODUCT_INFO = {
    name: 'Modern Farmer Full Access',
    price: 49.99
};

exports.handler = async (event) => {
    // --- 2. PRE-FLIGHT CHECKS ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
    }

    const { PAYNOW_ID, PAYNOW_KEY, SITE_URL } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY || !SITE_URL) {
        console.error("CRITICAL ERROR: Missing Paynow or Site URL environment variables.");
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Server configuration error." }) };
    }

    // --- 3. PARSE & VALIDATE INCOMING DATA ---
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid JSON." }) };
    }

    const { paymentMethod, currency, paymentDetails, userId, email } = data;
    const requiredFields = { paymentMethod, currency, paymentDetails, userId, email };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: `Missing field: ${key}` }) };
        }
    }

    // --- 4. PAYNOW INTEGRATION LOGIC ---
    try {
        const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
        paynow.resultUrl = `${SITE_URL}/.netlify/functions/paynow-webhook`;
        paynow.returnUrl = `${SITE_URL}`;

        const uniqueReference = `MF-${userId}-${Date.now()}`;
        const payment = paynow.createPayment(uniqueReference, email);
        payment.add(PRODUCT_INFO.name, PRODUCT_INFO.price);

        const method = paymentMethod.toLowerCase().replace(/\s/g, '');
        const mobileMethods = ['ecocash', 'onemoney', 'innbucks', 'telecash'];
        const cardMethods = ['visa', 'mastercard', 'zimswitch', 'paygo'];

        let response;

        if (mobileMethods.includes(method)) {
            // --- 4A. HANDLE MOBILE PAYMENTS ---
            const phoneRegex = /^0(77|78|71|73|75|76)\d{7}$/;
            if (!phoneRegex.test(paymentDetails)) {
                return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid phone number format." }) };
            }
            response = await paynow.sendMobile(payment, paymentDetails, method);

        } else if (cardMethods.includes(method) || method === 'banktransfer') {
            // --- 4B. HANDLE CARD & OTHER PAYMENTS ---
            // For card payments, we initiate a standard transaction which will give us a redirect URL.
            // The `send` method is used for this.
            response = await paynow.send(payment);

        } else {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid payment method specified." }) };
        }

        // --- 5. PROCESS PAYNOW RESPONSE ---
        if (response && response.success) {
            // Successfully initiated. The response will contain either a pollUrl (for mobile)
            // or a redirectUrl (for cards/other).
            const isMobile = mobileMethods.includes(method);

            console.log(`Successfully initiated ${isMobile ? 'mobile' : 'standard'} payment for user ${userId}.`);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: isMobile ? "Payment initiated. Please check your phone." : "Redirecting to payment page...",
                    instructions: response.instructions,
                    pollUrl: isMobile ? response.pollUrl : null,
                    redirectUrl: !isMobile ? response.redirectUrl : null,
                }),
            };

        } else {
            const errorMessage = response?.error || "Unknown error from payment gateway.";
            console.error(`Paynow initiation failed for user ${userId}:`, errorMessage);
            return { statusCode: 400, body: JSON.stringify({ success: false, message: errorMessage }) };
        }

    } catch (error) {
        // --- 6. UNEXPECTED ERROR HANDLING ---
        console.error("An unexpected error occurred in the paynow-handler:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "An internal server error occurred." }) };
    }
};