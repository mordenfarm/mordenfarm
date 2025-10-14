const { Paynow } = require("paynow");

// -- Utility: pick correct credentials --
function getPaynowInstance(currency) {
  // Normalize currency (handle both ZWL and ZWG as the same)
  const normalizedCurrency = (currency || '').toUpperCase();
  const isUSD = normalizedCurrency === 'USD';
  const PAYNOW_ID = isUSD ? process.env.PAYNOW_ID_USD : process.env.PAYNOW_ID_ZWL;
  const PAYNOW_KEY = isUSD ? process.env.PAYNOW_KEY_USD : process.env.PAYNOW_KEY_ZWL;
  
  if (!PAYNOW_ID || !PAYNOW_KEY) {
    throw new Error(`Missing Paynow credentials for ${isUSD ? 'USD' : 'ZWL'}`);
  }
  
  // Log credentials (masked) for debugging
  console.log(`Initializing Paynow for ${isUSD ? 'USD' : 'ZWL'}`, {
    integrationId: PAYNOW_ID,
    keyLength: PAYNOW_KEY.length,
    keyPreview: PAYNOW_KEY.substring(0, 4) + '...' + PAYNOW_KEY.substring(PAYNOW_KEY.length - 4)
  });
  
  const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
  
  // Enable sandbox mode if needed
  if (process.env.PAYNOW_SANDBOX === 'true') {
    console.log('Running in SANDBOX mode');
    // In sandbox mode, use test URLs
    paynow.resultUrl = 'https://example.com/gateways/paynow/update';
    paynow.returnUrl = 'https://example.com/return';
  } else {
    // Production mode - use real URLs
    paynow.resultUrl = `${process.env.SITE_URL}/.netlify/functions/paynow-webhook`;
    paynow.returnUrl = `${process.env.SITE_URL}/payment.html`;
  }
  
  console.log('Paynow URLs configured:', {
    resultUrl: paynow.resultUrl,
    returnUrl: paynow.returnUrl
  });
  
  return paynow;
}

// -- Product info --
const PRODUCT_INFO = { 
  name: "Modern Farmer Full Access", 
  price: 49.99 
};

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ 
        success: false, 
        message: "Method Not Allowed" 
      }) 
    };
  }

  console.log('=== PAYNOW HANDLER INITIATED ===');
  
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    const { paymentMethod, currency, paymentDetails, userId, email } = data;

    console.log('Payment request:', {
      paymentMethod,
      currency,
      userId,
      email,
      hasPaymentDetails: !!paymentDetails
    });

    // Validate required fields
    const missing = [];
    if (!paymentMethod) missing.push("paymentMethod");
    if (!currency) missing.push("currency");
    if (!userId) missing.push("userId");
    if (!email) missing.push("email");
    
    if (missing.length) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    // Initialize Paynow with correct credentials
    const paynow = getPaynowInstance(currency);
    
    // Create unique reference
    const reference = `MF-${userId}-${Date.now()}`;
    console.log('Creating payment with reference:', reference);

    // Create payment
    const payment = paynow.createPayment(reference, email);
    payment.add(PRODUCT_INFO.name, PRODUCT_INFO.price);

    // Determine payment method type
    const method = paymentMethod.toLowerCase().trim();
    const mobileMethods = ["ecocash", "onemoney", "innbucks", "telecash"];
    const cardMethods = ["visa", "mastercard", "zimswitch", "paygo"];

    let response;

    if (mobileMethods.includes(method)) {
      // Validate phone number
      if (!paymentDetails || !/^0(77|78|71|73|75|76)\d{7}$/.test(paymentDetails)) {
        throw new Error("Invalid phone number format. Use 07xxxxxxxx");
      }
      
      console.log(`Initiating mobile payment via ${method}`);
      response = await paynow.sendMobile(payment, paymentDetails, method);
      
    } else if (cardMethods.includes(method)) {
      console.log('Initiating card/online payment');
      response = await paynow.send(payment);
      
    } else if (method === 'banktransfer') {
      // Bank transfer is manual - return instructions
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Bank transfer requires manual processing",
          instructions: "Please contact support for bank account details. Reference: " + reference,
          redirectUrl: null,
          pollUrl: null
        })
      };
      
    } else {
      throw new Error(`Unsupported payment method: ${method}`);
    }

    // Log the raw response for debugging
    console.log('Paynow response:', {
      success: response.success,
      hasRedirectUrl: !!response.redirectUrl,
      hasPollUrl: !!response.pollUrl,
      error: response.error || 'none'
    });

    // Check if payment initiation was successful
    if (response.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: mobileMethods.includes(method)
            ? "Payment initiated. Please check your phone to complete the transaction."
            : "Redirecting to payment gateway...",
          pollUrl: response.pollUrl || null,
          redirectUrl: response.redirectUrl || null,
          instructions: response.instructions || null,
          reference: reference
        })
      };
    } else {
      // Payment initiation failed
      console.error('Paynow returned failure:', response.error);
      throw new Error(response.error || "Payment initiation failed. Please try again.");
    }

  } catch (error) {
    console.error("=== PAYNOW HANDLER ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    // Provide helpful error messages
    let userMessage = error.message;
    
    if (error.message.includes('Hashes do not match')) {
      userMessage = "Payment gateway configuration error. Please contact support.";
      console.error("HINT: Check that your Paynow Integration Key is correct for the currency being used.");
    }
    
    if (error.message.includes('Invalid integration')) {
      userMessage = "Payment gateway authentication failed. Please contact support.";
      console.error("HINT: Check that your Paynow Integration ID is correct.");
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: userMessage
      })
    };
  }
};
