import { NextFunction, Request, Response } from 'express';

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

// Authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
// console.log(req?.auth?.userId);
try {
    const { userId } = req.auth;
    if (!userId) {
        res.status(401).json({ message: 'Authentication failed' });
    }
    next();
} catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed' });
}
};