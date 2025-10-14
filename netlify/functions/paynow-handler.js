const { Paynow } = require("paynow");

// --- 1. CONFIGURATION & SECURITY ---
const PRODUCT_INFO = {
    name: 'Modern Farmer Full Access',
    price: 49.99
};

exports.handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // --- 2. PRE-FLIGHT CHECKS ---
    console.log('Received request:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
        console.error(`Wrong HTTP method: ${event.httpMethod}`);
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "Method Not Allowed. Use POST." 
            }) 
        };
    }

    const { PAYNOW_ID, PAYNOW_KEY, SITE_URL } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY || !SITE_URL) {
        console.error("CRITICAL ERROR: Missing environment variables", {
            hasPaynowId: !!PAYNOW_ID,
            hasPaynowKey: !!PAYNOW_KEY,
            hasSiteUrl: !!SITE_URL
        });
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "Server configuration error." 
            }) 
        };
    }

    // --- 3. PARSE & VALIDATE INCOMING DATA ---
    let data;
    try {
        console.log('Parsing request body...');
        data = JSON.parse(event.body);
        console.log('Parsed data:', { ...data, paymentDetails: '***REDACTED***' });
    } catch (error) {
        console.error('JSON parse error:', error);
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "Invalid JSON." 
            }) 
        };
    }

    const { paymentMethod, currency, paymentDetails, userId, email } = data;
    const requiredFields = { paymentMethod, currency, paymentDetails, userId, email };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            console.error(`Missing field: ${key}`);
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: `Missing field: ${key}` 
                }) 
            };
        }
    }

    // --- 4. PAYNOW INTEGRATION LOGIC ---
    try {
        console.log(`Initializing Paynow for user ${userId} with method ${paymentMethod}`);
        
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
            console.log(`Processing mobile payment: ${method}`);
            const phoneRegex = /^0(77|78|71|73|75|76)\d{7}$/;
            if (!phoneRegex.test(paymentDetails)) {
                return { 
                    statusCode: 400, 
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        message: "Invalid phone number format." 
                    }) 
                };
            }
            response = await paynow.sendMobile(payment, paymentDetails, method);

        } else if (cardMethods.includes(method) || method === 'banktransfer') {
            // --- 4B. HANDLE CARD & OTHER PAYMENTS ---
            console.log(`Processing card/standard payment: ${method}`);
            response = await paynow.send(payment);

        } else {
            console.error(`Invalid payment method: ${method}`);
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: "Invalid payment method specified." 
                }) 
            };
        }

        // --- 5. PROCESS PAYNOW RESPONSE ---
        console.log('Paynow response received:', {
            success: response?.success,
            hasInstructions: !!response?.instructions,
            hasPollUrl: !!response?.pollUrl,
            hasRedirectUrl: !!response?.redirectUrl,
            error: response?.error
        });

        if (response && response.success) {
            const isMobile = mobileMethods.includes(method);
            console.log(`Successfully initiated ${isMobile ? 'mobile' : 'standard'} payment for user ${userId}.`);

            return {
                statusCode: 200,
                headers,
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
            console.error('Full response object:', JSON.stringify(response));
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: errorMessage 
                }) 
            };
        }

    } catch (error) {
        // --- 6. UNEXPECTED ERROR HANDLING ---
        console.error("An unexpected error occurred in the paynow-handler:", error);
        console.error('Error stack:', error.stack);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "An internal server error occurred.",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            }) 
        };
    }
};
