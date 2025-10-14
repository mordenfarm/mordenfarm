// Patch punycode require before loading paynow
try {
  require('module').Module._extensions['.js'];
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === 'punycode') {
      return require('punycode/');  // redirect to userland punycode
    }
    return originalRequire.apply(this, arguments);
  };
} catch (e) {
  // ignore if patch fails
}

const { Paynow } = require("paynow");



const PRODUCT_INFO = {
    name: 'Modern Farmer Full Access',
    price: 49.99
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    console.log('=== PAYNOW HANDLER INVOKED ===');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Path:', event.path);

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.error(`Wrong HTTP method: ${event.httpMethod}`);
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: `Method Not Allowed. Received ${event.httpMethod}, expected POST.` 
            }) 
        };
    }

    console.log('POST request confirmed ✓');

    // Check environment variables-
    const { PAYNOW_ID, PAYNOW_KEY, SITE_URL, PAYNOW_SANDBOX } = process.env;
    if (!PAYNOW_ID || !PAYNOW_KEY || !SITE_URL) {
        console.error("Missing environment variables:", {
            hasPaynowId: !!PAYNOW_ID,
            hasPaynowKey: !!PAYNOW_KEY,
            hasSiteUrl: !!SITE_URL
        });
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: "Server configuration error. Please contact support." 
            }) 
        };
    }

    console.log('Environment variables present ✓');
    console.log('Sandbox mode:', PAYNOW_SANDBOX === 'true' ? 'ENABLED' : 'DISABLED');

    // Parse request body
    let data;
    try {
        data = JSON.parse(event.body);
        console.log('Request parsed:', {
            paymentMethod: data.paymentMethod,
            currency: data.currency,
            userId: data.userId,
            email: data.email,
            hasPaymentDetails: !!data.paymentDetails
        });
    } catch (error) {
        console.error('JSON parse error:', error);
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ success: false, message: "Invalid JSON in request body." }) 
        };
    }

    // Validate required fields
    const { paymentMethod, currency, paymentDetails, userId, email } = data;
    const missingFields = [];
    if (!paymentMethod) missingFields.push('paymentMethod');
    if (!currency) missingFields.push('currency');
    if (!paymentDetails) missingFields.push('paymentDetails');
    if (!userId) missingFields.push('userId');
    if (!email) missingFields.push('email');

    if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return { 
            statusCode: 400, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            }) 
        };
    }

    console.log('All required fields present ✓');

    // Process payment
    try {
        console.log('Initializing Paynow...');
        const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
        
        // CRITICAL: Enable sandbox mode if in testing
        if (PAYNOW_SANDBOX === 'true') {
            paynow.sandbox = true;
            console.log('🔧 SANDBOX MODE ENABLED');
        }
        
        // Set URLs
        paynow.resultUrl = `${SITE_URL}/.netlify/functions/paynow-webhook`;
        paynow.returnUrl = `${SITE_URL}/payment.html`;
        
        console.log('Paynow URLs set:', {
            resultUrl: paynow.resultUrl,
            returnUrl: paynow.returnUrl,
            sandboxMode: paynow.sandbox || false
        });

        // Create payment
        const uniqueReference = `MF-${userId}-${Date.now()}`;
        const payment = paynow.createPayment(uniqueReference, email);
        payment.add(PRODUCT_INFO.name, PRODUCT_INFO.price);
        
        console.log('Payment created with reference:', uniqueReference);

        const method = paymentMethod.toLowerCase().replace(/\s/g, '');
        const mobileMethods = ['ecocash', 'onemoney', 'innbucks', 'telecash'];
        const cardMethods = ['visa', 'mastercard', 'zimswitch', 'paygo'];

        let response;

        if (mobileMethods.includes(method)) {
            console.log(`Processing mobile payment: ${method}`);
            
            // Validate phone number
            const phoneRegex = /^0(77|78|71|73|75|76)\d{7}$/;
            if (!phoneRegex.test(paymentDetails)) {
                console.error('Invalid phone number format:', paymentDetails);
                return { 
                    statusCode: 400, 
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        message: "Invalid phone number format. Use 07xxxxxxxx" 
                    }) 
                };
            }

            console.log('Calling paynow.sendMobile...');
            response = await paynow.sendMobile(payment, paymentDetails, method);
            
        } else if (cardMethods.includes(method) || method === 'banktransfer') {
            console.log(`Processing card/standard payment: ${method}`);
            console.log('Calling paynow.send...');
            response = await paynow.send(payment);
            
        } else {
            console.error(`Invalid payment method: ${method}`);
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: `Invalid payment method: ${method}` 
                }) 
            };
        }

        console.log('Paynow API response:', {
            success: response?.success,
            status: response?.status,
            hasInstructions: !!response?.instructions,
            hasPollUrl: !!response?.pollUrl,
            hasRedirectUrl: !!response?.redirectUrl,
            error: response?.error,
            responseKeys: response ? Object.keys(response) : []
        });

        if (response && response.success) {
            const isMobile = mobileMethods.includes(method);
            console.log(`✓ Payment initiated successfully (${isMobile ? 'mobile' : 'card'})`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: isMobile 
                        ? "Payment initiated. Please check your phone to approve." 
                        : "Redirecting to payment page...",
                    instructions: response.instructions || "Please complete payment on your device",
                    pollUrl: response.pollUrl || null,
                    redirectUrl: response.redirectUrl || null,
                }),
            };
        } else {
            const errorMessage = response?.error || response?.message || "Unknown error from payment gateway";
            console.error('Paynow initiation failed:', errorMessage);
            console.error('Full response:', JSON.stringify(response));
            
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
        console.error('=== UNEXPECTED ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Specific error handling
        let userMessage = "An internal server error occurred. Please try again.";
        let statusCode = 500;
        
        if (error.message && error.message.includes('Hashes do not match')) {
            userMessage = "Payment gateway configuration error. Please contact support with error code: HASH_MISMATCH";
            statusCode = 500;
            console.error('CRITICAL: Paynow hash mismatch - check PAYNOW_ID and PAYNOW_KEY');
            console.error('Integration ID (first 4 chars):', PAYNOW_ID.substring(0, 4) + '...');
            console.error('Integration Key (first 4 chars):', PAYNOW_KEY.substring(0, 4) + '...');
        } else if (error.message && error.message.includes('Network')) {
            userMessage = "Unable to connect to payment gateway. Please check your internet connection.";
            statusCode = 503;
        }
        
        return { 
            statusCode, 
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: userMessage,
                errorCode: error.message && error.message.includes('Hashes do not match') ? 'HASH_MISMATCH' : 'UNKNOWN'
            }) 
        };
    }
};
