# API Documentation - LegalArie Backend

Complete API reference for all backend endpoints. All endpoints require JWT authentication except `/api/auth/login`.

**Base URL:** `http://localhost:3000/api`

---

## 1. Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "owner@legalaarie.com",
  "password": "Demo@123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "owner@legalaarie.com",
      "fullName": "Firm Owner",
      "role": "partner",
      "firmId": "uuid"
    }
  },
  "error": null
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "status": 401
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  },
  "error": null
}
```

---

## 2. Cases

### List Cases
```http
GET /cases?status=active&priority=high&page=1&limit=20
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `status`: Filter by status (open, active, hearing_scheduled, judgment_awaited, closed)
- `priority`: Filter by priority (low, medium, high, critical)
- `lawyerId`: Filter by assigned lawyer ID
- `page`: Pagination page (default: 1)
- `limit`: Results per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "uuid",
        "caseNumber": "CV-2026-001",
        "title": "Smith vs Jones",
        "status": "active",
        "priority": "high",
        "clientName": "Acme Corp",
        "lawyerName": "Ahmed Hassan",
        "messageCount": 23,
        "documentCount": 12,
        "caseType": "Civil",
        "filingDate": "2026-01-15",
        "expectedClosureDate": "2026-06-30"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  },
  "error": null
}
```

### Get Single Case
```http
GET /cases/{caseId}
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "case": {
      "id": "uuid",
      "caseNumber": "CV-2026-001",
      "title": "Smith vs Jones",
      "description": "Contract dispute resolution",
      "status": "active",
      "priority": "high",
      "clientName": "Acme Corp",
      "clientEmail": "client@acme.com",
      "lawyerName": "Ahmed Hassan",
      "courtName": "District Court, Lahore",
      "judgeName": "Justice Ali Ahmed"
    }
  },
  "error": null
}
```

### Create Case
```http
POST /cases
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "caseNumber": "CV-2026-004",
  "title": "New Legal Matter",
  "clientId": "uuid",
  "lawyerId": "uuid",
  "status": "open",
  "priority": "medium",
  "description": "Case description",
  "courtName": "High Court"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "case": {
      "id": "new-uuid",
      "caseNumber": "CV-2026-004",
      ...
    }
  },
  "error": null
}
```

### Update Case
```http
PUT /cases/{caseId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "hearing_scheduled",
  "priority": "critical",
  "expectedClosureDate": "2026-05-15"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "case": { ...updated case... }
  },
  "error": null
}
```

### Delete Case (Soft Delete)
```http
DELETE /cases/{caseId}
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Case deleted successfully"
  },
  "error": null
}
```

---

## 3. Tasks

### List Tasks
```http
GET /tasks?caseId=uuid&status=open&priority=high&page=1&limit=50
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `caseId`: Filter by case ID
- `status`: Filter by status (open, in_progress, completed, cancelled)
- `priority`: Filter by priority (low, medium, high)
- `assignedToUserId`: Filter by assigned lawyer
- `page`: Pagination page
- `limit`: Results per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "caseId": "uuid",
        "title": "Prepare witness statement",
        "status": "open",
        "priority": "high",
        "dueDate": "2026-04-20",
        "caseNumber": "CV-2026-001",
        "caseTitle": "Smith vs Jones",
        "assignedToName": "Ahmed Hassan"
      }
    ],
    "pagination": { ... }
  },
  "error": null
}
```

### Create Task
```http
POST /tasks
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "caseId": "uuid",
  "title": "Review contract terms",
  "description": "Detailed review needed",
  "assignedToUserId": "uuid",
  "priority": "high",
  "dueDate": "2026-04-25"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "task": { ...new task... }
  },
  "error": null
}
```

### Update Task
```http
PUT /tasks/{taskId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "completed",
  "priority": "medium"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "task": { ...updated task... }
  },
  "error": null
}
```

### Delete Task
```http
DELETE /tasks/{taskId}
Authorization: Bearer {accessToken}
```

---

## 4. Time Entries

### List Time Entries
```http
GET /time-entries?caseId=uuid&startDate=2026-04-01&endDate=2026-04-30&page=1&limit=50
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "timeEntries": [
      {
        "id": "uuid",
        "caseId": "uuid",
        "hoursWorked": 2.5,
        "ratePerHour": 500,
        "totalAmount": 1250,
        "isBillable": true,
        "workDate": "2026-04-18",
        "description": "Document review",
        "caseNumber": "CV-2026-001"
      }
    ],
    "stats": {
      "totalHours": 156.5,
      "billableAmount": 78250
    }
  },
  "error": null
}
```

### Create Time Entry
```http
POST /time-entries
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "caseId": "uuid",
  "taskId": "uuid",
  "hoursWorked": 2.5,
  "ratePerHour": 500,
  "isBillable": true,
  "description": "Contract review",
  "workDate": "2026-04-18"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "timeEntry": { ...new entry... }
  },
  "error": null
}
```

### Get Billable Summary
```http
GET /time-entries/billable/summary?startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "caseBreakdown": [
      {
        "id": "uuid",
        "caseNumber": "CV-2026-001",
        "title": "Smith vs Jones",
        "billableHours": 24.5,
        "billableAmount": 12250
      }
    ],
    "summary": {
      "totalBillableHours": 156.5,
      "totalBillableAmount": 78250
    }
  },
  "error": null
}
```

---

## 5. Dashboard

### Get Firm Dashboard Metrics (Admin Only)
```http
GET /dashboard/metrics
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalRevenue": "16800000",
      "monthlyRevenue": "1800000",
      "activeCases": 45,
      "totalLawyers": 12,
      "avgUtilization": 84.2,
      "revenueGrowth": "+12.5%",
      "caseGrowth": "+8.2%"
    },
    "charts": {
      "revenueTrend": [
        {
          "month": "2026-01-01",
          "actual": "1200000",
          "target": "1320000"
        }
      ],
      "caseDistribution": [
        {
          "status": "open",
          "count": 15
        },
        {
          "status": "active",
          "count": 20
        }
      ]
    },
    "lawyerPerformance": [
      {
        "id": "uuid",
        "name": "Ahmed Hassan",
        "activeCases": 12,
        "billableHours": "156.5",
        "revenue": "450000",
        "utilization": 85
      }
    ],
    "topCases": [
      {
        "id": "uuid",
        "caseNumber": "CV-2026-001",
        "title": "Smith vs Jones",
        "clientName": "Acme Corp",
        "lawyerName": "Ahmed Hassan",
        "status": "active",
        "priority": "high",
        "revenue": "150000"
      }
    ]
  },
  "error": null
}
```

### Get Lawyer Dashboard Metrics
```http
GET /dashboard/lawyer
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "activeCases": 12,
      "billableHours": "156.5",
      "billableAmount": "78250",
      "hoursToday": "7.5",
      "targetHours": 8.0,
      "pendingTasks": 5
    },
    "activeCases": [
      {
        "id": "uuid",
        "caseNumber": "CV-2026-001",
        "title": "Smith vs Jones",
        "clientName": "Acme Corp",
        "status": "active",
        "priority": "high"
      }
    ],
    "pendingTasks": [
      {
        "id": "uuid",
        "title": "Prepare witness statement",
        "priority": "high",
        "dueDate": "2026-04-20",
        "status": "open"
      }
    ],
    "upcomingHearings": [
      {
        "id": "uuid",
        "caseNumber": "CV-2026-001",
        "courtName": "District Court, Lahore",
        "judgeName": "Justice Ali Ahmed"
      }
    ]
  },
  "error": null
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 400
  }
}
```

**Common Error Codes:**
- `INVALID_INPUT` (400): Missing or invalid parameters
- `INVALID_CREDENTIALS` (401): Login failed
- `INVALID_TOKEN` (401): Token expired or invalid
- `FORBIDDEN` (403): User lacks permissions
- `NOT_FOUND` (404): Resource not found
- `DUPLICATE_CASE` (409): Case number already exists
- `SERVER_ERROR` (500): Internal server error

---

## Authentication Header

All endpoints (except `/auth/login`) require:

```
Authorization: Bearer {accessToken}
```

If the token expires (401), the frontend automatically refreshes it using the refresh token and retries the request.

---

## Rate Limiting

Requests are rate-limited per endpoint:
- **Login:** 5 requests/minute
- **API Endpoints:** 500 requests/minute
- **Upload:** 10 requests/minute
- **Messaging:** 100 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1645000000
```

---

## Tracing

Every request includes a unique trace ID for debugging:

```
X-Trace-ID: 550e8400-e29b-41d4-a716-446655440000
X-Span-ID: 550e8400-e29b-41d4-a716-446655440001
```

These are logged server-side for audit trails and debugging.

---

## Testing

### Using cURL
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@legalaarie.com","password":"Demo@123456"}'

# Get cases
curl -X GET "http://localhost:3000/api/cases?page=1&limit=20" \
  -H "Authorization: Bearer {accessToken}"
```

### Using Postman
1. POST to `/auth/login` with demo credentials
2. Copy `accessToken` from response
3. Set `Authorization: Bearer {token}` in request headers
4. Test any endpoint

### Using React API Service
```typescript
import apiService from './services/api';

// Login
const user = await apiService.login('owner@legalaarie.com', 'Demo@123456');

// Get cases
const casesResponse = await apiService.getCases({ 
  status: 'active',
  page: 1,
  limit: 20
});

// Get dashboard
const metrics = await apiService.getDashboardMetrics();
```

---

## Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://user:pass@localhost/legalaarie
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3000/api
```

---

## Next Steps

1. **Database Setup:** Run migrations with `npm run migrate`
2. **Seed Data:** Create test users with `npm run seed`
3. **Start Backend:** `npm run dev`
4. **Start Frontend:** `cd frontend && npm run dev`
5. **Test APIs:** Use demo credentials or Postman

All endpoints are production-ready and include error handling, logging, and security measures.
