const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'firebase-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
  console.log('Firebase Admin initialized');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
}

const db = admin.firestore();

module.exports = { db, admin };
