const { Paynow } = require("paynow");

// -- Utility: pick correct credentials --
function getPaynowInstance(currency) {
  const isUSD = (currency || '').toUpperCase() === 'USD';
  const PAYNOW_ID = isUSD ? process.env.PAYNOW_ID_USD : process.env.PAYNOW_ID_ZWL;
  const PAYNOW_KEY = isUSD ? process.env.PAYNOW_KEY_USD : process.env.PAYNOW_KEY_ZWL;

  if (!PAYNOW_ID || !PAYNOW_KEY) {
    throw new Error(`Missing Paynow credentials for ${isUSD ? 'USD' : 'ZWL'}`);
  }

  const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
  if (process.env.PAYNOW_SANDBOX === 'true') paynow.sandbox = true;
  return paynow;
}

// -- Product info --
const PRODUCT_INFO = { name: "Modern Farmer Full Access", price: 49.99 };

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { paymentMethod, currency, paymentDetails, userId, email } = data;

    // Validate
    const missing = [];
    if (!paymentMethod) missing.push("paymentMethod");
    if (!currency) missing.push("currency");
    if (!userId) missing.push("userId");
    if (!email) missing.push("email");
    if (missing.length) throw new Error(`Missing required fields: ${missing.join(", ")}`);

    // Initialize Paynow
    const paynow = getPaynowInstance(currency);
    paynow.resultUrl = `${process.env.SITE_URL}/.netlify/functions/paynow-webhook`;
    paynow.returnUrl = `${process.env.SITE_URL}/payment.html`;

    const reference = `MF-${userId}-${Date.now()}`;
    const payment = paynow.createPayment(reference, email);
    payment.add(PRODUCT_INFO.name, PRODUCT_INFO.price);

    const method = paymentMethod.toLowerCase().trim();
    const mobileMethods = ["ecocash", "onemoney", "innbucks", "telecash"];
    const cardMethods = ["visa", "mastercard", "zimswitch", "paygo", "banktransfer"];

    let response;
    if (mobileMethods.includes(method)) {
      if (!/^0(77|78|71|73|75|76)\d{7}$/.test(paymentDetails)) {
        throw new Error("Invalid phone number format. Use 07xxxxxxxx");
      }
      response = await paynow.sendMobile(payment, paymentDetails, method);
    } else if (cardMethods.includes(method)) {
      response = await paynow.send(payment);
    } else {
      throw new Error(`Unsupported payment method: ${method}`);
    }

    if (response.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: mobileMethods.includes(method)
            ? "Payment initiated. Please check your phone."
            : "Redirecting to payment page...",
          pollUrl: response.pollUrl || null,
          redirectUrl: response.redirectUrl || null,
          instructions: response.instructions || null,
        })
      };
    } else {
      throw new Error(response.error || "Payment initiation failed.");
    }

  } catch (error) {
    console.error("PAYNOW HANDLER ERROR:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
