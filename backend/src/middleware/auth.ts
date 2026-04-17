import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      firmId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Middleware: Verify JWT token and attach user info to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
          status: 401,
        },
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.firmId = decoded.firmId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token verification failed',
        status: 401,
      },
    });
  }
};

/**
 * Middleware: Check if user has required role
 */
export const roleMiddleware = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !requiredRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for this action',
          status: 403,
        },
      });
    }
    next();
  };
};

/**
 * Generate access token
 */
export const generateAccessToken = (userId: string, role: string, firmId: string): string => {
  return jwt.sign(
    { userId, role, firmId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify and decode token
 */
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
