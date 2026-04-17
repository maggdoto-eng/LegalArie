import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';

/**
 * Rate limiting strategies for LegalArie
 * Prevents:
 * - Brute force attacks (login attempts)
 * - DDoS from malicious clients
 * - Resource exhaustion
 */

/**
 * Strict: Login attempts (5 per minute per email)
 * Prevents brute force password guessing
 */
export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:login:',
  }),
  keyGenerator: (req) => req.body?.email || req.ip,
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV !== 'production',
});

/**
 * Moderate: API requests (500 per minute per firm)
 * Allows normal usage but prevents spam
 */
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:api:',
  }),
  keyGenerator: (req) => (req as any).firmId || req.ip,
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  skip: (req) => {
    // Skip rate limiting for:
    // - Admin users (they need higher limits)
    // - Health check endpoints
    return (req as any).userRole === 'admin' || req.path === '/health/ready';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict: Document upload (10 uploads per minute per user)
 * Prevents S3 quota exhaustion
 */
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:upload:',
  }),
  keyGenerator: (req) => (req as any).userId || req.ip,
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Too many upload requests. Please wait before uploading again.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict: Messaging (100 messages per minute per user)
 * Prevents spam messages
 */
export const messagingLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:messaging:',
  }),
  keyGenerator: (req) => (req as any).userId || req.ip,
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute
  message: 'You are sending messages too quickly. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Response handler for rate limit exceeded
 * Logs violation to audit trail
 */
export const rateLimitErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err?.status === 429) {
    const logger = (req as any).logger || console;
    logger.warn('Rate limit exceeded', {
      userId: (req as any).userId,
      firmId: (req as any).firmId,
      endpoint: `${req.method} ${req.path}`,
      ip: req.ip,
    });

    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: err.message || 'Too many requests. Please try again later.',
        retryAfter: res.get('Retry-After'),
      },
    });
  }

  next(err);
};
