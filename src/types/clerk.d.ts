import { Request, Response, NextFunction } from 'express';

declare module '@clerk/clerk-sdk-node' {
  export interface ClerkAuth {
    userId: string;
    sessionId: string;
  }

  export interface RequestWithAuth extends Request {
    auth: ClerkAuth;
  }

  export function ClerkExpressWithAuth(): (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction
  ) => void;
} 