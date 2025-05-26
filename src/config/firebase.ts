import * as admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

if (!base64) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_B64");
}

const jsonString = Buffer.from(base64, "base64").toString("utf-8");
const serviceAccount = JSON.parse(jsonString);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
