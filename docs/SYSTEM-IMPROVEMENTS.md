# LegalArie System Design: Recommended Improvements

## Overview
Your current design is solid for MVP, but for production (especially SaaS Phase 4), these improvements are critical for reliability, security, and observability.

---

## 1. 🔴 **CRITICAL: Add Soft Deletes (Data Safety)**

### Current Problem
```sql
-- Current schema uses hard deletes
CREATE TABLE cases (
  ...
);

-- If case is deleted:
DELETE FROM cases WHERE id = $1;  -- Data GONE forever
```

**Risk:** In legal domain, you CANNOT permanently delete case data (compliance, audit trail, disputes)

### Solution: Add `deleted_at` Timestamp
```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  firm_id UUID NOT NULL,
  case_number VARCHAR(100) NOT NULL,
  status ENUM(...),
  deleted_at TIMESTAMP DEFAULT NULL,  ← Add this
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Remove ON DELETE CASCADE everywhere
-- Replace with: ON DELETE RESTRICT (force explicit handling)
ALTER TABLE case_team 
  DROP CONSTRAINT case_team_case_id_fkey,
  ADD CONSTRAINT case_team_case_id_fkey 
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE RESTRICT;

-- Query pattern: Always filter deleted_at IS NULL
SELECT * FROM cases 
WHERE firm_id = $1 AND deleted_at IS NULL;

-- Add index for performance
CREATE INDEX idx_cases_deleted_at ON cases(firm_id, deleted_at);

-- Soft delete operation
UPDATE cases SET deleted_at = NOW() WHERE id = $1;

-- Restore if needed
UPDATE cases SET deleted_at = NULL WHERE id = $1;
```

**Impact:** ✅ Compliance, ✅ Audit trail preserved, ✅ Recovery option

---

## 2. 🔴 **CRITICAL: Observability & Distributed Tracing**

### Current Problem
If a bug only affects Firm 5's data, you have no way to trace requests end-to-end.

### Solution: Request Tracing (Correlation IDs)

```typescript
// middleware/requestTracing.ts
import { v4 as uuidv4 } from 'uuid';

export const tracingMiddleware = (req, res, next) => {
  // Use existing trace ID or create new one
  const traceId = req.headers['x-trace-id'] || uuidv4();
  const spanId = uuidv4();
  
  req.traceId = traceId;
  req.spanId = spanId;
  
  // Add to response headers (client can track back to your logs)
  res.setHeader('x-trace-id', traceId);
  
  // Add to request context for all logs
  req.context = {
    traceId,
    spanId,
    firmId: req.firmId,
    userId: req.userId,
    timestamp: new Date().toISOString(),
    endpoint: `${req.method} ${req.path}`,
  };
  
  next();
};

// Usage in route handlers
app.get('/api/cases/:caseId', tracingMiddleware, async (req, res) => {
  const logger = createLogger(req.context);  // Context attached
  
  logger.info('Fetching case', { caseId: req.params.caseId });
  // Log output:
  // {
  //   "timestamp": "2026-04-18T10:30:00Z",
  //   "level": "info",
  //   "message": "Fetching case",
  //   "traceId": "abc-123-xyz",
  //   "firmId": "firm-1",
  //   "userId": "user-5",
  //   "caseId": "case-99"
  // }
  
  const caseData = await db.query(
    'SELECT * FROM cases WHERE id = $1 AND firm_id = $2 AND deleted_at IS NULL',
    [req.params.caseId, req.firmId]
  );
  
  logger.info('Case fetched successfully', { found: caseData.length > 0 });
  res.json(caseData);
});
```

**Why Critical for SaaS:**
- Multi-tenant bugs are hard to reproduce
- Need to trace exact requests across services
- Support tickets require "show me what went wrong"

**Implementation:**
- ✅ Add trace ID to all logs (Winston/Pino)
- ✅ Send logs to centralized service (Datadog, CloudWatch, Sumologic)
- ✅ Mobile/Web apps include trace ID in error reports
- ✅ Create alerts: "requests failing for firm_id = X"

---

## 3. 🔴 **CRITICAL: API Rate Limiting (Security)**

### Current Problem
No protection against:
- Brute force attacks (login attempts)
- DDoS from malicious clients
- Resource exhaustion

### Solution: Rate Limiting by Firm & User

```typescript
// middleware/rateLimit.ts
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';

const redisClient = redis.createClient();

// Strict: Login attempts (5 per minute per email)
export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:login:',
  }),
  keyGenerator: (req) => req.body.email,  // Rate limit by email
  windowMs: 60 * 1000,  // 1 minute
  max: 5,  // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: API requests (500 per minute per firm)
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:api:',
  }),
  keyGenerator: (req) => req.firmId,  // Rate limit by firm
  windowMs: 60 * 1000,  // 1 minute
  max: 500,  // 500 requests/min
  skip: (req) => req.userRole === 'admin',  // Admins bypass
  standardHeaders: true,
});

// Apply to routes
app.post('/api/auth/login', loginLimiter, async (req, res) => { ... });
app.use('/api/', apiLimiter);
```

**Response Headers:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1713435900
Retry-After: 60

{"error": "Rate limit exceeded"}
```

---

## 4. 🔴 **CRITICAL: Idempotency Keys (Financial Operations)**

### Current Problem
Revenue attribution calculations must never run twice.

### Solution: Idempotency Keys

```typescript
// middleware/idempotency.ts
export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(400).json({
      error: 'Idempotency-Key header required for mutations',
    });
  }
  
  req.idempotencyKey = idempotencyKey;
  
  // Check if request already processed
  const cachedResponse = await redis.get(`idempotency:${idempotencyKey}`);
  if (cachedResponse) {
    return res.status(200).json(JSON.parse(cachedResponse));
  }
  
  // Store original res.json
  const originalJson = res.json;
  res.json = function(data) {
    // Cache successful response for 24 hours
    redis.setex(
      `idempotency:${idempotencyKey}`,
      86400,
      JSON.stringify(data)
    );
    return originalJson.call(this, data);
  };
  
  next();
};

// Usage: Calculate revenue attribution
app.post('/api/revenue/calculate-attribution', idempotencyMiddleware, async (req, res) => {
  // If same idempotency key → returns cached result (no recalculation)
  // Safe to retry without double-counting
});
```

**Client Usage:**
```typescript
// Mobile app: Always send unique key for important operations
const response = await fetch('/api/revenue/calculate-attribution', {
  method: 'POST',
  headers: {
    'Idempotency-Key': `${userId}-${Date.now()}`,
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ casesIds: [...] }),
});
```

---

## 5. 🟠 **HIGH: Add Caching Strategy (Performance)**

### Current Problem
Every request hits database even for unchanged data.

### Solution: Redis Caching with Cache Invalidation

```typescript
// services/caseService.ts
export class CaseService {
  private readonly cache = new Redis();
  
  async getCaseById(firmId: string, caseId: string) {
    // Try cache first
    const cacheKey = `case:${firmId}:${caseId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Cache miss → Query DB
    const caseData = await db.query(
      'SELECT * FROM cases WHERE id = $1 AND firm_id = $2',
      [caseId, firmId]
    );
    
    // Cache for 5 minutes
    await this.cache.setex(cacheKey, 300, JSON.stringify(caseData));
    return caseData;
  }
  
  async updateCase(firmId: string, caseId: string, updates: any) {
    // Update DB
    const result = await db.query(
      'UPDATE cases SET ? WHERE id = $1 AND firm_id = $2 RETURNING *',
      [updates, caseId, firmId]
    );
    
    // Invalidate cache (critical!)
    await this.cache.del(`case:${firmId}:${caseId}`);
    
    // Broadcast to connected clients
    io.to(`firm-${firmId}`).emit('case-updated', result);
    
    return result;
  }
}
```

**Cache Hierarchy:**
```
Request → Redis Cache (5 min) → PostgreSQL
         ↓ (miss)               ↓ (miss)
         Cache                 Database
         (hot data)            (source of truth)
```

---

## 6. 🟠 **HIGH: Add Async Job Queue (Reliability)**

### Current Problem
Firebase Cloud Messaging sometimes fails silently. Critical notifications lost.

### Solution: Message Queue (Bull + Redis)

```typescript
// jobs/notificationQueue.ts
import Queue from 'bull';

const notificationQueue = new Queue('notifications', {
  redis: { host: 'localhost', port: 6379 },
});

// Producer: Queue the job (doesn't need to wait)
export async function queueNotification(userId: string, message: string) {
  await notificationQueue.add(
    { userId, message },
    { 
      attempts: 3,  // Retry 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 2000,  // 2s, 4s, 8s
      },
      removeOnComplete: true,  // Clean up after success
    }
  );
}

// Consumer: Process jobs
notificationQueue.process(async (job) => {
  const { userId, message } = job.data;
  
  try {
    // Try Firebase
    const response = await firebase.sendToDevice(userId, {
      body: message,
      sound: 'default',
    });
    
    if (response.failureCount === 0) {
      return { success: true };  // Done
    }
    
    // Firebase failed → Throw to trigger retry
    throw new Error('FCM delivery failed');
  } catch (error) {
    logger.warn('Notification failed, will retry', {
      userId,
      attempt: job.attemptsMade,
      error: error.message,
    });
    throw error;  // Bull will retry
  }
});

// Event handlers
notificationQueue.on('completed', (job) => {
  logger.info('Notification sent', { userId: job.data.userId });
});

notificationQueue.on('failed', (job, err) => {
  logger.error('Notification failed after retries', {
    userId: job.data.userId,
    error: err.message,
  });
  // Send alert to ops team
});
```

**Usage in routes:**
```typescript
app.put('/api/cases/:caseId', async (req, res) => {
  const caseData = await updateCase(req.params.caseId, req.body);
  
  // Queue notification (returns immediately, doesn't block response)
  await queueNotification(
    caseData.client_id,
    `Your case status updated to: ${caseData.status}`
  );
  
  res.json(caseData);  // Respond fast
});
```

**Benefits:**
- ✅ Notifications reliable (auto-retry with exponential backoff)
- ✅ API responds fast (notification sent async)
- ✅ Visibility into failed notifications (audit trail)

---

## 7. 🟠 **HIGH: Database Connection Pooling**

### Current Problem
No explicit connection limit → Connection exhaustion on high load.

### Solution: Connection Pool Configuration

```typescript
// config/database.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings (critical for scalability)
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Fail if can't acquire connection in 5s
});

pool.on('error', (error) => {
  logger.error('Unexpected error on idle client', { error });
  // Alert ops team
});

// Use query method (handles connection acquisition/release)
export const query = (text, values) => pool.query(text, values);

// Don't: Direct client connection (might not return to pool)
// Do: Use pool.query() method
```

---

## 8. 🟠 **HIGH: API Versioning (SaaS Stability)**

### Current Problem
If you change `/api/cases` response format, old mobile apps break.

### Solution: Versioned Endpoints

```typescript
// routes/v1.ts
export const v1Router = Router();

v1Router.get('/cases/:caseId', async (req, res) => {
  // Returns old format for backward compatibility
  const caseData = await getCaseById(req.params.caseId);
  res.json({
    id: caseData.id,
    title: caseData.title,
    status: caseData.status,
    // Old format - no breaking changes
  });
});

// routes/v2.ts (new features in v2)
export const v2Router = Router();

v2Router.get('/cases/:caseId', async (req, res) => {
  // New response format with more fields
  const caseData = await getCaseById(req.params.caseId);
  res.json({
    id: caseData.id,
    title: caseData.title,
    status: caseData.status,
    revenueAttribution: caseData.revenue_attribution,  // New field
    priority: caseData.priority,  // New field
    nextHearingDate: caseData.next_hearing,  // New field
  });
});

// main.ts
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Mobile apps can choose version
// Version 1.0: Uses /api/v1 (backward compatible)
// Version 2.0: Uses /api/v2 (new features)
```

---

## 9. 🟠 **HIGH: Backup & Disaster Recovery Plan**

### Current Problem
If RDS instance fails, you lose all data.

### Solution: Multi-Layer Backup Strategy

```typescript
// infrastructure/backup.ts

// 1. AUTOMATED DAILY BACKUPS
// AWS RDS: Enable automated backups (35-day retention)
// Command: Update DB instance → Backup retention period: 35

// 2. CROSS-REGION REPLICA
// PostgreSQL multi-region failover (automatic)
const replicaConfig = {
  region: 'us-west-2',  // Different from primary (ap-south-1)
  retentionPeriod: 35,
  multiAz: true,  // Multi-AZ within region
};

// 3. S3 BACKUP SCRIPT (Daily)
// backup/daily-backup.ts
const pg = require('pg-backup-api');

async function dailyBackup() {
  const timestamp = new Date().toISOString();
  const backupFile = `backups/legalaarie-${timestamp}.sql`;
  
  // Dump entire database
  exec(`pg_dump ${DB_URL} > ${backupFile}`, async (error) => {
    if (error) throw error;
    
    // Upload to S3 (different account/region for security)
    await s3.putObject({
      Bucket: 'legalaarie-backups-us-east-1',
      Key: backupFile,
      Body: fs.readFileSync(backupFile),
      ServerSideEncryption: 'AES256',  // Encrypted at rest
      ACL: 'private',
    });
    
    // Log backup
    logger.info('Daily backup completed', { backupFile });
  });
}

// Run daily at 2 AM UTC
schedule.scheduleJob('0 2 * * *', dailyBackup);

// 4. TEST RESTORE QUARTERLY
async function quarterlyRestoreTest() {
  const testDb = 'legalaarie-restore-test';
  
  // Restore latest backup to test instance
  exec(`pg_restore -d ${testDb} backup.sql`, (error) => {
    if (error) {
      logger.error('RESTORE TEST FAILED - ALERT TEAM');
      // Send Slack alert
    } else {
      logger.info('Restore test passed');
    }
  });
}
```

**Recovery Time Objective (RTO):**
- Primary region down: 30 seconds (automatic failover to replica)
- Both regions down: 2 hours (restore from S3 backup)

---

## 10. 🟠 **HIGH: Environment-Based Configuration**

### Current Problem
`.env` file might expose secrets. No separation between dev/staging/prod.

### Solution: Secure Config Management

```typescript
// config/env.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export const config = {
  // Database
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production',  // SSL only in prod
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  
  // AWS
  aws: {
    region: process.env.AWS_REGION,
    s3Bucket: process.env.S3_BUCKET,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.NODE_ENV === 'production',  // TLS only in prod
  },
  
  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER,  // sendgrid, smtp
    apiKey: process.env.EMAIL_API_KEY,
    fromAddress: process.env.EMAIL_FROM,
  },
  
  // Features
  features: {
    revenueAttribution: process.env.FEATURE_REVENUE_ATTRIBUTION === 'true',
    auditLogging: process.env.FEATURE_AUDIT_LOGGING === 'true',
  },
};

// Export validation
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET not configured');
}
```

**Environment Files:**
```
.env.development   (local, allows secrets)
.env.staging       (pre-prod testing)
.env.production    (secrets from AWS Secrets Manager)
.env.example       (template, no secrets)
```

---

## 11. 🟡 **MEDIUM: Database Migration Strategy**

### Current Problem
No versioning of schema changes. Hard to track what changed and when.

### Solution: Migrations with Knex.js

```typescript
// migrations/001_initial_schema.ts
export async function up(knex) {
  await knex.schema.createTable('firms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('firms');
}

// migrations/002_add_soft_deletes.ts (later)
export async function up(knex) {
  await knex.schema.alterTable('cases', (table) => {
    table.timestamp('deleted_at').nullable();
  });
  
  await knex.schema.alterTable('users', (table) => {
    table.timestamp('deleted_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('cases', (table) => {
    table.dropColumn('deleted_at');
  });
  
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('deleted_at');
  });
}
```

**Commands:**
```bash
# Run all pending migrations
npx knex migrate:latest

# Roll back last migration
npx knex migrate:rollback

# Check migration status
npx knex migrate:status
```

---

## 12. 🟡 **MEDIUM: OpenAPI Documentation**

### Current Problem
Developers don't know what endpoints exist or what they return.

### Solution: Auto-Generated API Docs

```typescript
// swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LegalArie API',
      version: '1.0.0',
      description: 'Legal practice management platform',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.legalaarie.com', description: 'Production' },
    ],
  },
  apis: ['./src/routes/*.ts'],  // Auto-extract from route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Usage in routes:
/**
 * @swagger
 * /api/cases/{caseId}:
 *   get:
 *     summary: Get case by ID
 *     parameters:
 *       - name: caseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case data
 *       404:
 *         description: Case not found
 */
app.get('/api/cases/:caseId', getCaseHandler);
```

Access at: `http://localhost:3000/api/docs`

---

## 13. 🟡 **MEDIUM: Add Health Check Endpoints**

### Current Problem
Load balancer doesn't know if backend is healthy. Traffic sent to dead instances.

### Solution: Liveness & Readiness Probes

```typescript
// routes/health.ts
export const healthRouter = Router();

// Liveness: Is the server running?
healthRouter.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness: Is the server ready to handle requests?
healthRouter.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    // Check S3 access
    await s3.headBucket({ Bucket: process.env.S3_BUCKET });
    
    res.json({
      status: 'ready',
      database: 'ok',
      redis: 'ok',
      s3: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not-ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Kubernetes liveness probe configuration
// livenessProbe:
//   httpGet:
//     path: /health/live
//     port: 3000
//   initialDelaySeconds: 10
//   periodSeconds: 10

// Readiness probe configuration
// readinessProbe:
//   httpGet:
//     path: /health/ready
//     port: 3000
//   initialDelaySeconds: 5
//   periodSeconds: 5
```

---

## 14. 🟡 **MEDIUM: Session Management Best Practices**

### Current Problem
JWT tokens don't expire properly. Long-lived tokens are security risk.

### Solution: Sliding Window Expiration

```typescript
// middleware/tokenRefresh.ts
export const tokenRefreshMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return next();
  
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // If token expires in < 5 minutes, issue new one
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp - now;
  
  if (timeUntilExpiry < 300) {  // 5 minutes
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        firmId: decoded.firmId,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.setHeader('x-new-access-token', newAccessToken);
    logger.info('Token refreshed', { userId: decoded.userId });
  }
  
  next();
};

// Mobile app should check for new token
const response = await fetch('/api/cases', {
  headers: { 'Authorization': `Bearer ${oldToken}` },
});

const newToken = response.headers['x-new-access-token'];
if (newToken) {
  // Update local storage
  localStorage.setItem('accessToken', newToken);
}
```

---

## 15. 🟡 **MEDIUM: Security Headers & CORS**

### Current Problem
No protection against CSRF, XSS, clickjacking.

### Solution: Helmet.js

```typescript
// middleware/security.ts
import helmet from 'helmet';

app.use(helmet());  // Enables:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security: max-age=31536000; includeSubDomains
// - Content-Security-Policy: default-src 'self'

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  maxAge: 3600,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// CSRF protection
app.use(csrf({
  cookie: true,
}));

// Rate limit all endpoints
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 500,
}));
```

---

## Implementation Priority

| Priority | Improvement | Effort | Impact | Phase |
|----------|-------------|--------|--------|-------|
| 🔴 Critical | Soft Deletes | 1 day | HIGH | Phase 1 |
| 🔴 Critical | Distributed Tracing | 2 days | HIGH | Phase 1 |
| 🔴 Critical | Rate Limiting | 1 day | HIGH | Phase 1 |
| 🔴 Critical | Idempotency Keys | 1 day | HIGH | Phase 1 |
| 🟠 High | Caching Strategy | 2 days | HIGH | Phase 2 |
| 🟠 High | Job Queue | 2 days | HIGH | Phase 2 |
| 🟠 High | Connection Pooling | 1 day | MEDIUM | Phase 1 |
| 🟠 High | API Versioning | 1 day | MEDIUM | Phase 2 |
| 🟠 High | Backup/DR Plan | 3 days | HIGH | Phase 3 |
| 🟠 High | Config Management | 1 day | MEDIUM | Phase 1 |
| 🟡 Medium | Migrations | 1 day | MEDIUM | Phase 1 |
| 🟡 Medium | OpenAPI Docs | 1 day | LOW | Phase 2 |
| 🟡 Medium | Health Checks | 1 day | MEDIUM | Phase 2 |
| 🟡 Medium | Session Management | 1 day | MEDIUM | Phase 1 |
| 🟡 Medium | Security Headers | 1 day | MEDIUM | Phase 1 |

---

## Recommended Week 1 Additions

To your existing Week 1 backend work, add:

1. ✅ Connection pooling config
2. ✅ Soft deletes (migrate schema)
3. ✅ Tracing middleware
4. ✅ Rate limiting
5. ✅ Idempotency middleware
6. ✅ Security headers (Helmet)
7. ✅ Health check endpoints

**Estimated time:** +1-2 days total

**Benefit:** Production-ready foundation vs MVP-only foundation

---

## References

- [12 Factor App](https://12factor.net/) — Stateless app architecture
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Security vulnerabilities
- [Google SRE Book](https://sre.google/books/) — Observability & reliability
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

