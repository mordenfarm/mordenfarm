const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, username } = JSON.parse(event.body);

    if (!userId || !username) {
      return { statusCode: 400, body: 'Missing userId or username' };
    }

    await db.collection('users').doc(userId).set({
      username: username
    }, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Username updated successfully' })
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};