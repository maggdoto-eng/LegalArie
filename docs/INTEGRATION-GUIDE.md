# Critical Improvements: Integration Guide

## Overview

This guide shows how to integrate the 4 critical system improvements into your Express server.

---

## 1. Database Setup

Update your PostgreSQL database with soft delete support:

```bash
# Run the updated schema
psql -U legalaarie -d legalaarie -f backend/db/schema.sql

# Result: All tables now have:
# - deleted_at TIMESTAMP DEFAULT NULL
# - Indexes for performance
# - Foreign key changes to RESTRICT (no cascading deletes)
# - Idempotency and tracing tables
```

---

## 2. Main Server Integration

Update `backend/src/server.ts`:

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Pool } from 'pg';
import { tracingMiddleware } from './middleware/tracing';
import { apiLimiter, loginLimiter, rateLimitErrorHandler } from './middleware/rateLimit';
import { idempotencyMiddleware } from './middleware/idempotency';
import { authMiddleware } from './middleware/auth';

const app = express();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Connection pool size
});

// ============================================
// SECURITY & OBSERVABILITY MIDDLEWARE (ORDER MATTERS)
// ============================================

// 1. Security headers (helmet) - FIRST
app.use(helmet());

// 2. CORS - EARLY
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// 4. Request tracing - BEFORE AUTH
// Adds trace_id, span_id to req.context
app.use(tracingMiddleware);

// 5. Rate limiting - BEFORE ROUTES
app.use('/api/', apiLimiter);

// 6. Authentication - BEFORE PROTECTED ROUTES
app.use('/api/', authMiddleware);

// 7. Idempotency - BEFORE MUTATION ROUTES
app.use('/api/', idempotencyMiddleware);

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // Login endpoint
  // Rate limited to 5 attempts per minute per email
});

app.post('/api/auth/complete-onboarding', idempotencyMiddleware, async (req, res) => {
  // Idempotent - safe to retry
});

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

app.get('/api/cases/:caseId', async (req, res) => {
  const logger = (req as any).logger;
  
  try {
    logger.info('Fetching case', { caseId: req.params.caseId });
    
    const caseData = await db.query(
      'SELECT * FROM cases WHERE id = $1 AND firm_id = $2 AND deleted_at IS NULL',
      [req.params.caseId, (req as any).firmId]
    );
    
    if (caseData.rowCount === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    res.json({ success: true, data: caseData.rows[0] });
  } catch (error) {
    logger.error('Error fetching case', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/cases/:caseId', async (req, res) => {
  const logger = (req as any).logger;
  const { idempotencyKey } = req as any;
  
  try {
    // Soft delete check - exclude deleted records
    const caseData = await db.query(
      'UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2 AND firm_id = $3 AND deleted_at IS NULL RETURNING *',
      [req.body.status, req.params.caseId, (req as any).firmId]
    );
    
    if (caseData.rowCount === 0) {
      return res.status(404).json({ error: 'Case not found or already deleted' });
    }
    
    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value) VALUES ($1, $2, $3, $4, $5)',
      [(req as any).userId, 'CASE_UPDATED', 'cases', req.params.caseId, JSON.stringify(caseData.rows[0])]
    );
    
    res.json({ success: true, data: caseData.rows[0] });
  } catch (error) {
    logger.error('Error updating case', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/cases/:caseId', async (req, res) => {
  const logger = (req as any).logger;
  
  try {
    // Soft delete (not permanent)
    const result = await db.query(
      'UPDATE cases SET deleted_at = NOW() WHERE id = $1 AND firm_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.caseId, (req as any).firmId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Case not found or already deleted' });
    }
    
    logger.info('Case soft deleted', { caseId: req.params.caseId });
    res.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    logger.error('Error deleting case', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// HEALTH CHECKS (No auth required)
// ============================================

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready', database: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'not-ready', error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// Rate limit error handler
app.use(rateLimitErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const logger = (req as any).logger || console;
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LegalArie API running on port ${PORT}`);
});
```

---

## 3. Authentication Middleware Update

Update `backend/src/middleware/auth.ts` to attach firm context:

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Attach firm context (critical for multi-tenancy)
    (req as any).firmId = decoded.firmId;
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## 4. Logger Setup

Create `backend/src/utils/logger.ts`:

```typescript
import winston from 'winston';

interface LogContext {
  traceId: string;
  spanId: string;
  firmId?: string;
  userId?: string;
  userRole?: string;
  timestamp: string;
  endpoint: string;
}

export const createLogger = (context: LogContext) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: {
      traceId: context.traceId,
      spanId: context.spanId,
      firmId: context.firmId,
      userId: context.userId,
      endpoint: context.endpoint,
    },
    transports: [
      // Log to console
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
      // Log to file (for production)
      ...(process.env.NODE_ENV === 'production'
        ? [
            new winston.transports.File({ filename: 'error.log', level: 'error' }),
            new winston.transports.File({ filename: 'combined.log' }),
          ]
        : []),
    ],
  });
};
```

---

## 5. Usage Examples

### Soft Delete Example

```typescript
import { softDelete, restoreSoftDeleted } from './utils/softDelete';

// Delete a case
app.delete('/api/cases/:caseId', async (req, res) => {
  await softDelete(
    db,
    'cases',
    req.params.caseId,
    (req as any).firmId,
    (req as any).userId,
    'Case closed - no longer needed'
  );
  res.json({ success: true });
});

// Restore a case (admin only)
app.post('/api/admin/cases/:caseId/restore', async (req, res) => {
  const restored = await restoreSoftDeleted(
    db,
    'cases',
    req.params.caseId,
    (req as any).firmId,
    (req as any).userId
  );
  res.json({ success: restored });
});
```

### Tracing Example

Every request automatically gets a trace ID. In logs:

```json
{
  "timestamp": "2026-04-18T10:30:00Z",
  "level": "info",
  "message": "Fetching case",
  "traceId": "abc-123-def-456",
  "spanId": "xyz-789",
  "firmId": "firm-1",
  "userId": "user-5",
  "caseId": "case-99"
}
```

Find all requests from Firm 1:
```bash
grep '"firmId": "firm-1"' combined.log | jq '.traceId' | sort -u
```

### Rate Limiting Example

Rate limits are transparent to the client. If they exceed limits:

```json
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1713435900
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later.",
    "retryAfter": "60"
  }
}
```

### Idempotency Example (Mobile App)

```typescript
// Mobile app: Always send idempotency key for important operations
const response = await fetch('/api/cases', {
  method: 'POST',
  headers: {
    'Idempotency-Key': `${userId}-${Date.now()}-${Math.random()}`,
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    caseNumber: 'CV-2026-001',
    clientId: 'client-123',
    title: 'Smith vs Jones',
  }),
});

// If network fails and app retries:
// 1st attempt: Creates case, caches response
// 2nd attempt: Returns cached response (no duplicate case created)
// 3rd attempt: Returns cached response again
```

---

## 6. Environment Configuration

Add to `.env.production`:

```bash
# Redis (for rate limiting and caching)
REDIS_HOST=redis.legalaarie.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0

# Logging
LOG_LEVEL=info

# Database
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

---

## 7. Testing

Test all 4 improvements:

```bash
# Test soft delete
curl -X DELETE http://localhost:3000/api/cases/case-123 \
  -H "Authorization: Bearer $TOKEN"

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -H "Content-Type: application/json"
done
# After 5 attempts: 429 Too Many Requests

# Test tracing (check X-Trace-Id header)
curl -I http://localhost:3000/api/cases \
  -H "Authorization: Bearer $TOKEN"

# Test idempotency
curl -X POST http://localhost:3000/api/cases \
  -H "Idempotency-Key: test-key-12345" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Case"}' \
  -H "Content-Type: application/json"

# Retry with same key - returns same response
curl -X POST http://localhost:3000/api/cases \
  -H "Idempotency-Key: test-key-12345" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Case"}' \
  -H "Content-Type: application/json"
```

---

## 8. Next Steps

After integrating these 4 critical improvements:

1. ✅ Add unit tests for each middleware
2. ✅ Add integration tests (test entire flow)
3. ✅ Set up centralized logging (Datadog/CloudWatch)
4. ✅ Configure alerts for: rate limit violations, soft deletes, errors
5. ✅ Document API client library (how to include trace ID + idempotency key)
6. ✅ Update mobile app to send idempotency keys
7. ✅ Performance testing under load (Redis needed!)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Express Server                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  helmet()  →  tracingMiddleware  →  rateLimit      │
│       ↓             ↓                   ↓            │
│   Security      X-Trace-Id         Blocked         │
│   Headers       X-Span-Id          on 429          │
│                                                     │
│  authMiddleware  →  idempotencyMiddleware          │
│       ↓                    ↓                        │
│  Attach          Cache mutations for               │
│  firmId          24 hours                          │
│  userId                                            │
│  role                                              │
│                                                     │
│  Route Handlers:                                   │
│  - Check deleted_at IS NULL                        │
│  - Use soft delete for deletes                     │
│  - Log to audit_logs                               │
│                                                     │
└─────────────────────────────────────────────────────┘
        ↓                               ↓
    PostgreSQL              Redis (Rate Limit Cache)
  (Soft Deletes)        (Idempotency Cache: 24hrs)
  (Audit Logs)
```

---

## References

- [Soft Delete Best Practices](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Rate Limiting Strategies](https://developer.wordpress.org/plugins/security/using-nonces/)
- [Idempotency Keys](https://stripe.com/docs/api/idempotent_requests)
- [Distributed Tracing](https://www.jaegertracing.io/docs/)

