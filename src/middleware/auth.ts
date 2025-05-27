import { NextFunction, Request, Response } from "express";
import admin from "../config/firebase";

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

// Authentication middleware for protected routes
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // console.log({ reqHeader: req });
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized - No token provided" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = decodedToken;
    console.log({ decoded: decodedToken });
    next();
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    res.status(401).json({ error: "Unauthorized - Invalid token" });
    return;
  }
};
