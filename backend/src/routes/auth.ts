import express, { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock database pool - in production, use actual PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/legalaarie',
});

// Types
interface LoginRequest {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  firmId: string;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

// ============================================
// LOGIN ENDPOINT
// ============================================

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns JWT tokens (access + refresh)
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required',
          status: 400,
        },
      });
    }

    // Query user from database (mock data for MVP)
    const query = `
      SELECT id, firm_id, email, password_hash, role, full_name, is_active, deleted_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
      LIMIT 1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
          status: 403,
        },
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          status: 401,
        },
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        firmId: user.firm_id,
        email: user.email,
        role: user.role,
      } as TokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        firmId: user.firm_id,
        email: user.email,
        role: user.role,
      } as TokenPayload,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    // Update last_login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Return tokens and user info
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          firmId: user.firm_id,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

// ============================================
// REFRESH TOKEN ENDPOINT
// ============================================

/**
 * POST /api/auth/refresh
 * Generate new access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token is required',
          status: 400,
        },
      });
    }

    // Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      (err: any, decoded: any) => {
        if (err) {
          return res.status(401).json({
            success: false,
            data: null,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired refresh token',
              status: 401,
            },
          });
        }

        // Generate new access token
        const accessToken = jwt.sign(
          {
            userId: decoded.userId,
            firmId: decoded.firmId,
            email: decoded.email,
            role: decoded.role,
          } as TokenPayload,
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );

        return res.status(200).json({
          success: true,
          data: { accessToken },
          error: null,
        });
      }
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        status: 500,
      },
    });
  }
});

// ============================================
// MIDDLEWARE: AUTH TOKEN VERIFICATION
// ============================================

/**
 * Middleware to verify JWT token
 * Attaches user info to request
 */
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          status: 401,
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
      (err: any, decoded: any) => {
        if (err) {
          return res.status(401).json({
            success: false,
            data: null,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired token',
              status: 401,
            },
          });
        }

        req.user = decoded as TokenPayload;
        next();
      }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        status: 500,
      },
    });
  }
};

export default router;
