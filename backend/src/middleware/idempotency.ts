import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { redisClient } from '../config/redis';

/**
 * Idempotency middleware
 * Ensures that financial operations (revenue calculations, billing) never run twice
 * 
 * How it works:
 * 1. Client sends Idempotency-Key header with unique ID
 * 2. Request is processed and response cached for 24 hours
 * 3. If same client retries with same key, return cached response (no re-execution)
 * 4. After 24 hours, cache expires and request treated as new
 */

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
}

export const idempotencyMiddleware = async (
  req: IdempotentRequest,
  res: Response,
  next: NextFunction
) => {
  // Only apply to mutation endpoints
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Idempotency key is required for mutations
  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for mutation operations',
      },
    });
  }

  // Validate idempotency key format (should be UUID or similar)
  if (!/^[a-zA-Z0-9\-_]{20,}$/.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be at least 20 alphanumeric characters',
      },
    });
  }

  req.idempotencyKey = idempotencyKey;

  // Check if request already processed (in Redis cache)
  try {
    const cacheKey = `idempotency:${idempotencyKey}`;
    const cachedResponse = await redisClient.get(cacheKey);

    if (cachedResponse) {
      const logger = (req as any).logger || console;
      logger.info('Idempotent request: returning cached response', {
        idempotencyKey,
        userId: (req as any).userId,
      });

      // Return cached response
      return res.status(200).json(JSON.parse(cachedResponse));
    }
  } catch (error) {
    console.error('Error checking idempotency cache:', error);
    // Continue with request if cache check fails
  }

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    // Only cache successful responses (2xx, 3xx)
    if (res.statusCode >= 200 && res.statusCode < 400) {
      try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        // Cache for 24 hours (86400 seconds)
        redisClient.setex(
          cacheKey,
          86400,
          JSON.stringify(data)
        ).catch((error) => {
          console.error('Error caching idempotent response:', error);
        });

        const logger = (req as any).logger || console;
        logger.info('Idempotent request: response cached', {
          idempotencyKey,
          userId: (req as any).userId,
          statusCode: res.statusCode,
        });
      } catch (error) {
        console.error('Error in idempotency response handler:', error);
      }
    }

    return originalJson(data);
  };

  next();
};

/**
 * Store idempotency key in database for audit trail
 * Call this after a critical operation succeeds
 */
export const recordIdempotencyKey = async (
  db: Pool,
  {
    idempotencyKey,
    userId,
    firmId,
    requestPath,
    requestMethod,
    responseStatus,
    responseBody,
  }: {
    idempotencyKey: string;
    userId: string;
    firmId: string;
    requestPath: string;
    requestMethod: string;
    responseStatus: number;
    responseBody: any;
  }
) => {
  try {
    await db.query(
      `INSERT INTO idempotency_keys 
       (user_id, firm_id, idempotency_key, request_path, request_method, response_status, response_body)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        firmId,
        idempotencyKey,
        requestPath,
        requestMethod,
        responseStatus,
        JSON.stringify(responseBody),
      ]
    );
  } catch (error) {
    console.error('Error recording idempotency key:', error);
    // Don't throw - we don't want to fail the request if DB record fails
  }
};

/**
 * Clean up expired idempotency keys (run periodically)
 */
export const cleanupExpiredIdempotencyKeys = async (db: Pool) => {
  try {
    const result = await db.query(
      `DELETE FROM idempotency_keys WHERE expires_at < CURRENT_TIMESTAMP`
    );
    console.log(`Cleaned up ${result.rowCount} expired idempotency keys`);
  } catch (error) {
    console.error('Error cleaning up idempotency keys:', error);
  }
};
