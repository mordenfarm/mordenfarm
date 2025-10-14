const admin = require("firebase-admin");
const crypto = require("crypto");
const querystring = require("querystring");

if (!admin.apps.length) {
  const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
  admin.initializeApp({ credential: admin.credential.cert(credentials) });
}
const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const fields = querystring.parse(event.body);
    const { reference, status, amount, paynowreference, pollurl, currency, hash } = fields;

    if (!hash) return { statusCode: 403, body: "Forbidden: Missing hash" };

    // Pick correct key based on currency
    const isUSD = (currency || "").toUpperCase() === "USD";
    const PAYNOW_KEY = isUSD ? process.env.PAYNOW_KEY_USD : process.env.PAYNOW_KEY_ZWL;

    // Verify hash
    const concatenated = Object.keys(fields)
      .sort()
      .filter((k) => k.toLowerCase() !== "hash")
      .map((k) => fields[k])
      .join("") + PAYNOW_KEY;

    const expected = crypto.createHash("sha512").update(concatenated).digest("hex").toUpperCase();
    if (expected !== hash.toUpperCase()) {
      console.warn("HASH MISMATCH", { reference, expected, received: hash });
      return { statusCode: 403, body: "Forbidden: Invalid hash" };
    }

    if (!reference || !status) return { statusCode: 200, body: "OK" };

    const userId = reference.split("-")[1];
    const userRef = db.collection("users").doc(userId);

    await db.collection("transactions").add({
      userId,
      reference,
      paynowReference: paynowreference || null,
      amount,
      currency,
      status,
      pollUrl: pollurl,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      webhookData: fields
    });

    if (status.toLowerCase() === "paid") {
      await userRef.set({
        subscription: true,
        subscriptionStatus: "active",
        lastPaymentReference: reference,
        lastPaymentAmount: amount,
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { statusCode: 200, body: "Webhook processed successfully." };

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
