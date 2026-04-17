# Architecture Overview

## System Design

LegalArie is a cloud-based legal practice management platform with three main layers:

### 1. Frontend Layer (React SPA)
- **Tech:** React 18 + Vite + TailwindCSS
- **Deployment:** Vercel
- **Real-time:** Socket.io client for live updates
- **State:** Zustand for global state management
- **Routes:** React Router v6

**Key Components:**
- Client Portal: Case status, messaging, documents
- Lawyer Dashboard: Case management, task assignment
- Admin Dashboard: KPIs, revenue tracking, user management

### 2. Backend Layer (Node.js API)
- **Tech:** Node.js 18 + Express + TypeScript
- **Database:** PostgreSQL
- **Deployment:** Railway
- **Real-time:** Socket.io server + Firebase Cloud Messaging
- **Auth:** JWT (access + refresh tokens)

**Key Modules:**
- Authentication & Authorization (RBAC)
- Case Management (CRUD + state machine)
- Messaging (client ↔ lawyer real-time chat)
- File Management (AWS S3 presigned URLs)
- Revenue Attribution (tracking contribution)
- Audit Logging (immutable event trail)

### 3. Mobile Layer (Flutter)
- **Tech:** Flutter + Dart
- **Platform:** Android (Phase 1), iOS (Phase 4)
- **Deployment:** Google Play (Android), App Store (iOS)
- **State:** GetX for state management
- **Local Storage:** Hive for offline caching

**Key Screens:**
- Client case list + detail
- Messaging interface
- Document viewer
- Notification center

---

## Data Flow

### Authentication Flow
```
Client Login
    ↓
POST /api/auth/login (email, password)
    ↓
Backend: Verify credentials + generate JWT
    ↓
Return: { accessToken, refreshToken, user }
    ↓
Frontend: Store tokens in localStorage + Zustand
    ↓
All subsequent requests: Authorization: Bearer <accessToken>
```

### Real-Time Messaging Flow
```
Lawyer sends message via app
    ↓
POST /api/messages (content, recipient_id, case_id)
    ↓
Backend: Save to DB + emit Socket.io event
    ↓
Socket.io: Broadcast to recipient (if online)
    ↓
Firebase Cloud Messaging: Push notification (if offline)
    ↓
Recipient app: Receive notification + display in real-time
    ↓
Recipient marks as read
    ↓
Backend: Update message.read_at in DB
```

### Document Upload Flow
```
Lawyer clicks "Upload Document"
    ↓
POST /api/documents/get-upload-url
    ↓
Backend generates presigned S3 URL (valid 15 min)
    ↓
Frontend: Direct upload to S3 (bypasses backend)
    ↓
S3 triggers Lambda function
    ↓
Lambda: 
  1. Virus scan (ClamAV)
  2. OCR extraction
  3. Full-text indexing
  4. Metadata tagging
  5. Audit log entry
    ↓
POST /api/documents/mark-uploaded (fileId, metadata)
    ↓
Backend: Create document record, emit Socket.io event
    ↓
Client receives notification: "New document uploaded"
    ↓
Client app: Fetch document list (document now visible)
```

### Case Status Update Flow
```
Lawyer updates case status (Open → Active → Closed)
    ↓
PUT /api/cases/:caseId (status: "Active")
    ↓
Backend: Update case.status, create case_status_history entry
    ↓
Backend: Emit Socket.io event + Firebase notification to client
    ↓
Client app: Receive real-time notification
    ↓
Client: Sees updated status in case detail view
```

---

## Database Schema (Core Tables)

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role ENUM('client', 'lawyer', 'admin', 'support'),
  firm_id UUID REFERENCES firms(id),
  full_name VARCHAR NOT NULL,
  phone VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  firm_id UUID REFERENCES firms(id),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  company VARCHAR,
  practice_area VARCHAR,
  relationship_owner_id UUID REFERENCES users(id),
  retainer_status ENUM('prospect', 'active', 'retained', 'closed'),
  created_at TIMESTAMP
);
```

### Cases
```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  firm_id UUID REFERENCES firms(id),
  case_number VARCHAR UNIQUE,
  title VARCHAR NOT NULL,
  client_id UUID REFERENCES clients(id),
  assigned_lawyer_id UUID REFERENCES users(id),
  status ENUM('open', 'active', 'hearing_scheduled', 'judgment_awaited', 'closed'),
  priority ENUM('low', 'medium', 'high', 'critical'),
  case_type VARCHAR,
  filing_date DATE,
  expected_closure_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  case_id UUID REFERENCES cases(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP,
  read_at TIMESTAMP
);
```

### Documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  file_name VARCHAR NOT NULL,
  s3_file_id VARCHAR NOT NULL,
  s3_url VARCHAR,
  uploaded_by_id UUID REFERENCES users(id),
  document_type VARCHAR,
  visible_to_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);
```

### Audit Logs (Immutable)
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR NOT NULL,
  resource_type VARCHAR,
  resource_id VARCHAR,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP NOT NULL,
  ip_address INET
);
```

---

## Security Architecture

### Authentication
- JWT tokens (15 min access, 7 day refresh)
- Password hashing: bcryptjs (10 rounds)
- 2FA support: Authenticator app (TOTP)

### Authorization (RBAC)
- Role-based middleware checks
- Matter-scoped permissions (lawyer can only see assigned cases)
- Client can only see their own cases

### Data Protection
- TLS 1.3 for all in-transit communication
- PostgreSQL encryption at rest (via Railway)
- S3 encryption at rest (default)
- Field-level encryption for sensitive data (SSNs, case details)

### Audit Trail
- Every action logged (create, update, delete, access)
- Immutable audit log (append-only)
- Enables compliance + legal hold capabilities

---

## Deployment Architecture

### Development
```
Local: localhost:3000 (backend), localhost:5173 (frontend)
Database: Local PostgreSQL or Railway dev instance
S3: AWS S3 sandbox bucket (free tier)
```

### Staging
```
Backend: Railway staging environment
Frontend: Vercel preview deployment
Database: Railway staging PostgreSQL
S3: AWS S3 staging bucket
```

### Production
```
Backend: Railway production environment
Frontend: Vercel production
Database: Railway production (encrypted, multi-region backup)
S3: AWS S3 production bucket with versioning
CDN: CloudFront for S3 object distribution
```

---

## API Architecture

### Base URL
- Dev: `http://localhost:3000`
- Prod: `https://api.legalaarie.com`

### Authentication Header
```
Authorization: Bearer <accessToken>
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-18T10:30:00Z"
}
```

### Error Handling
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "The requested case does not exist",
    "status": 404
  }
}
```

---

## Scaling Considerations (Post-MVP)

### Caching Strategy
- Redis for session tokens (shared across instances)
- Redis for rate limiting
- Application-level caching (Zustand frontend, in-memory backend)

### Database Optimization
- Connection pooling (PgBouncer on Railway)
- Query indexing on hot tables (cases, messages, users)
- Read replicas for reporting queries

### Real-Time Optimization
- Socket.io horizontal scaling (Redis adapter)
- Message queue (RabbitMQ/SQS) for async tasks
- Background jobs (email, OCR, notifications)

### File Storage Optimization
- S3 intelligent tiering (archive old cases)
- CloudFront caching for public documents
- Multi-region replication for disaster recovery

---

## Monitoring & Logging

### Backend Metrics
- Request latency (p50, p95, p99)
- Error rate (5xx, 4xx)
- Database query performance
- Real-time connection count

### Frontend Metrics
- Page load time
- Time to interactive (TTI)
- JavaScript errors
- Real-time message delivery latency

### Tools
- Backend: Winston/Pino for logging, Prometheus for metrics
- Frontend: Sentry for error tracking, Datadog for APM
- Database: Railway analytics dashboard
- S3: CloudWatch for metrics

---

## Next Steps

1. **Week 1:** Implement backend foundation (auth, middleware, DB)
2. **Week 2:** Build client portal (React)
3. **Week 3:** Build lawyer dashboard (React) + messaging
4. **Week 4:** Mobile app (Flutter), load testing, deployment

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.
