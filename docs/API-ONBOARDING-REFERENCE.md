# LegalArie API Reference - Onboarding & Auth Endpoints

## Authentication Endpoints

### POST /api/auth/login
**Login with email and password**

```
Request:
POST /api/auth/login
Content-Type: application/json

{
  "email": "contact@acme.com",
  "password": "SecurePassword123"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "contact@acme.com",
      "role": "client",
      "firmId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Corporation",
      "phone": "+923001234567"
    }
  },
  "timestamp": "2026-04-18T10:30:00Z"
}

Error (401 Unauthorized):
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "status": 401
  },
  "timestamp": "2026-04-18T10:30:00Z"
}
```

---

### POST /api/auth/refresh-token
**Refresh expired access token**

```
Request:
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Error (401 Unauthorized):
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is expired or invalid",
    "status": 401
  }
}
```

---

### POST /api/auth/complete-onboarding
**Client completes account setup after email invitation**

```
Request:
POST /api/auth/complete-onboarding
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePassword123",
  "phone": "+923001234567"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "contact@acme.com",
      "role": "client",
      "firmId": "550e8400-e29b-41d4-a716-446655440001"
    }
  }
}

Error (400 Bad Request):
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invitation token is expired or invalid",
    "status": 400
  }
}
```

---

### POST /api/auth/complete-onboarding/lawyer
**Lawyer completes account setup after email invitation**

```
Request:
POST /api/auth/complete-onboarding/lawyer
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePassword456",
  "phone": "+923009876543"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "ahmed@lawfirm.com",
      "role": "lawyer",
      "firmId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Ahmed Hassan",
      "permissions": ["view_cases", "create_tasks", "upload_documents", "update_case_status", "log_hours"]
    }
  }
}
```

---

## Admin Endpoints (Owner/Partner Only)

### POST /api/admin/clients
**Owner adds a new client and sends invitation**

```
Request:
POST /api/admin/clients
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "company": "Acme Corp Limited",
  "practice_area": "Corporate Law",
  "phone": "+923001234567"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "clientId": "550e8400-e29b-41d4-a716-446655440002",
    "email": "contact@acme.com",
    "name": "Acme Corporation",
    "invitationSent": true,
    "invitationExpiresAt": "2026-04-25T18:00:00Z",
    "invitationLink": "https://legalaarie.com/onboard?token=xyz123"
  },
  "timestamp": "2026-04-18T10:30:00Z"
}

Error (403 Forbidden):
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Only firm owners can add clients",
    "status": 403
  }
}

Error (409 Conflict):
{
  "success": false,
  "error": {
    "code": "CLIENT_EXISTS",
    "message": "A client with this email already exists",
    "status": 409
  }
}
```

---

### POST /api/admin/lawyers
**Owner adds a lawyer and sends invitation**

```
Request:
POST /api/admin/lawyers
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Ahmed Hassan",
  "email": "ahmed@lawfirm.com",
  "phone": "+923009876543",
  "role": "lawyer",
  "specialization": "Corporate Law",
  "hourlyRate": 500
}

Response (201 Created):
{
  "success": true,
  "data": {
    "lawyerId": "550e8400-e29b-41d4-a716-446655440003",
    "email": "ahmed@lawfirm.com",
    "name": "Ahmed Hassan",
    "role": "lawyer",
    "invitationSent": true,
    "invitationExpiresAt": "2026-04-25T18:00:00Z",
    "permissions": ["view_cases", "create_tasks", "upload_documents", "update_case_status", "log_hours"]
  }
}

Error (409 Conflict):
{
  "success": false,
  "error": {
    "code": "LAWYER_EXISTS",
    "message": "A lawyer with this email already exists",
    "status": 409
  }
}
```

---

### POST /api/admin/resend-invitation
**Resend invitation email (e.g., if client lost the first one)**

```
Request:
POST /api/admin/resend-invitation
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "email": "contact@acme.com",
    "invitationSent": true,
    "expiresAt": "2026-04-25T18:00:00Z"
  }
}
```

---

## Error Codes Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_CREDENTIALS` | 401 | Email or password is wrong |
| `INVALID_TOKEN` | 400 | Invitation token expired or invalid |
| `UNAUTHORIZED` | 401 | Missing or invalid authorization header |
| `PERMISSION_DENIED` | 403 | User role doesn't have permission |
| `CLIENT_EXISTS` | 409 | Client email already in system |
| `LAWYER_EXISTS` | 409 | Lawyer email already in system |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expired or invalid |

---

## JWT Token Structure

**Access Token (expires in 15 minutes):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "firmId": "550e8400-e29b-41d4-a716-446655440001",
  "email": "contact@acme.com",
  "role": "client",
  "permissions": ["view_cases", "view_documents", "view_messages"],
  "iat": 1713435000,
  "exp": 1713435900
}
```

**Refresh Token (expires in 7 days):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "firmId": "550e8400-e29b-41d4-a716-446655440001",
  "iat": 1713435000,
  "exp": 1714040000
}
```

---

## Implementation Checklist

**Week 1 Backend Implementation:**
- [ ] POST /api/auth/login
- [ ] POST /api/auth/refresh-token
- [ ] POST /api/auth/complete-onboarding
- [ ] POST /api/auth/complete-onboarding/lawyer
- [ ] POST /api/admin/clients
- [ ] POST /api/admin/lawyers
- [ ] POST /api/admin/resend-invitation
- [ ] Email service integration (SendGrid/SMTP)
- [ ] Invitation token generation & validation
- [ ] Unit tests for all endpoints
- [ ] Integration tests for full onboarding flow

---

