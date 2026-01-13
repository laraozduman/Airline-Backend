import { Request, Response, NextFunction } from 'express';

// Extended Request type with user info from Gateway headers
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'admin' | 'user';
  };
}

/**
 * Authentication middleware
 * Reads user info from headers set by API Gateway (after IAM validation)
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  const email = req.headers['x-user-email'] as string;
  const role = req.headers['x-user-role'] as 'admin' | 'user';

  if (!userId || !email || !role) {
    res.status(401).json({ 
      message: 'Unauthorized - Missing user headers from Gateway' 
    });
    return;
  }

  // Attach user info to request
  (req as AuthRequest).user = {
    userId,
    email,
    role,
  };

  next();
};

/**
 * Admin-only middleware
 * Checks if user has admin role
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (authReq.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};
