import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Initialize Firebase Admin with credentials
// You should have your service account JSON file in a secure location
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

if (!serviceAccount) {
  throw new Error('Firebase service account is not configured');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin; 