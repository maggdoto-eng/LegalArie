import Redis from 'ioredis';

/**
 * Redis client for:
 * - Rate limiting (track request counts)
 * - Idempotency key caching (cache mutation responses)
 * - Session management
 * - Real-time message caching
 * - Job queue (notifications)
 */

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  // TLS for production
  tls: process.env.NODE_ENV === 'production' && !process.env.REDIS_PASSWORD
    ? {}
    : undefined,
};

export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

export const closeRedis = async () => {
  await redisClient.quit();
};
