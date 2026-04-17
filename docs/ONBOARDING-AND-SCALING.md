# LegalArie: Onboarding & Scaling Strategy

## 1. CLIENT ONBOARDING PROCESS

### Flow Overview
```
FIRM OWNER (Web Dashboard)
  ↓ Creates client
BACKEND: Send invitation email with unique token
  ↓
CLIENT: Clicks email link, sets password
  ↓
BACKEND: Verify token, activate account
  ↓
CLIENT: Logs into mobile app → Sees cases
```

### Detailed Steps

**Step 1: Owner Adds Client**
```
Endpoint: POST /api/admin/clients
Method: OWNER role only
Body:
{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "company": "Acme Corp",
  "practice_area": "Corporate Law",
  "phone": "+923001234567"
}

Response:
{
  "success": true,
  "data": {
    "clientId": "uuid-123",
    "email": "contact@acme.com",
    "invitationSent": true,
    "invitationExpiresAt": "2026-04-25T18:00:00Z"
  }
}
```

**Step 2: Backend Sends Email**
```
Email Subject: "Your Law Firm Invited You to LegalArie"

Email Body:
---
Hello,

Your law firm has invited you to use LegalArie to track your cases in real-time.

Click the link below to set up your account:
https://legalaarie.com/onboard?token=eyJhbGc...

This link expires in 7 days.

Best regards,
LegalArie Team
---

Database Action:
INSERT INTO users (id, email, role, firm_id, is_active)
VALUES (uuid(), 'contact@acme.com', 'client', firm_uuid, false);

INSERT INTO audit_logs (user_id, action, resource_id, timestamp)
VALUES (owner_id, 'CLIENT_INVITED', user_id, now());
```

**Step 3: Client Completes Onboarding**
```
URL: https://legalaarie.com/onboard?token=xyz123

Page shows:
- Email (pre-filled, locked): contact@acme.com
- Firm Name (pre-filled, locked): Your Law Firm
- Password (input): [______]
- Phone (input): [______]
- Button: "Complete Setup"

On Submit:
POST /api/auth/complete-onboarding
Body:
{
  "token": "xyz123",
  "password": "SecurePassword123",
  "phone": "+923001234567"
}

Backend Logic:
1. Verify token (signature, expiry)
2. Extract user_id from token payload
3. Hash password with bcryptjs (10 rounds)
4. UPDATE users SET password_hash=$1, is_active=true, phone=$2
5. Generate JWT tokens (access + refresh)
6. Return tokens

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid-123",
      "email": "contact@acme.com",
      "role": "client",
      "name": "Acme Corporation"
    }
  }
}
```

**Step 4: Client Opens Mobile App**
```
Mobile App (Flutter):
1. Detects user is not logged in
2. Shows LoginPage
3. User enters: email + password
4. POST /api/auth/login → receives tokens
5. Stores in encrypted local storage
6. Redirects to ClientCasesHome
7. Shows: All their cases, real-time status
```

### Database Schema (Client Onboarding)
```sql
-- User record (created by owner)
INSERT INTO users (id, email, role, firm_id, created_at, is_active)
VALUES (
  gen_random_uuid(),
  'contact@acme.com',
  'client',
  firm_id,
  now(),
  false  ← Not active until password set
);

-- Invitation token (stored temporarily)
CREATE TABLE invitation_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Audit trail
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, timestamp)
VALUES (
  owner_id,
  'CLIENT_INVITED',
  'users',
  client_user_id,
  now()
);
```

---

## 2. LAWYER ONBOARDING PROCESS

### Flow Overview (Similar to Client, but Different)
```
FIRM OWNER (Web Dashboard)
  ↓ Adds lawyer with role
BACKEND: Send invitation + assign default permissions
  ↓
LAWYER: Clicks email link, sets password
  ↓
BACKEND: Activate + set permissions (can edit cases, log hours, etc.)
  ↓
LAWYER: Logs into mobile app → Sees assigned cases
```

### Detailed Steps

**Step 1: Owner Adds Lawyer**
```
Endpoint: POST /api/admin/lawyers
Method: OWNER/PARTNER role only
Body:
{
  "name": "Ahmed Hassan",
  "email": "ahmed@lawfirm.com",
  "phone": "+923009876543",
  "role": "lawyer",  ← lawyer, partner, or admin
  "specialization": "Corporate Law",
  "hourlyRate": 500,  ← PKR per hour (optional)
  "permissions": ["view_cases", "create_tasks", "upload_docs"]
}

Response:
{
  "success": true,
  "data": {
    "lawyerId": "uuid-456",
    "email": "ahmed@lawfirm.com",
    "role": "lawyer",
    "invitationSent": true
  }
}
```

**Step 2: Backend Sends Email (Different Message)**
```
Email Subject: "Welcome to LegalArie - Set Up Your Account"

Email Body:
---
Hi Ahmed,

Welcome to LegalArie! Your law firm has set up your account.

Click the link below to complete your setup:
https://legalaarie.com/onboard/lawyer?token=xyz123

You'll then have access to:
- All assigned cases
- Real-time messaging with clients
- Task management
- Document uploads
- Time tracking

This link expires in 7 days.

Best regards,
LegalArie Team
---
```

**Step 3: Lawyer Completes Onboarding**
```
URL: https://legalaarie.com/onboard/lawyer?token=xyz123

Page shows:
- Name (pre-filled): Ahmed Hassan
- Email (pre-filled, locked): ahmed@lawfirm.com
- Phone (input): [______]
- Password (input): [______]
- Button: "Complete Setup"

POST /api/auth/complete-onboarding/lawyer
Body:
{
  "token": "xyz123",
  "password": "SecurePassword456",
  "phone": "+923009876543"
}

Backend Logic:
1. Verify token
2. Extract lawyer_id from token
3. Hash password
4. UPDATE users SET password_hash=$1, is_active=true, phone=$2
5. Set default permissions (already in token payload)
6. Generate JWT with extended permissions
7. Return tokens

Response: (same as client)
```

**Step 4: Lawyer Opens Mobile App**
```
Mobile App:
1. Shows LoginPage
2. Lawyer enters: email + password
3. POST /api/auth/login
4. Backend returns: { accessToken, refreshToken, role: "lawyer" }
5. App detects role = "lawyer"
6. Redirects to LawyerCasesHome (NOT ClientCasesHome)
7. Shows:
   - All assigned cases
   - Tasks to complete
   - Hearing dates
   - Time tracking interface
```

### Key Difference: Permissions

**Client Permissions:**
```json
{
  "view_cases": true,
  "view_documents": true,
  "view_messages": true,
  "view_billing": true,
  "create_tasks": false,
  "upload_documents": false,
  "update_case_status": false
}
```

**Lawyer Permissions:**
```json
{
  "view_cases": true,
  "view_documents": true,
  "view_messages": true,
  "create_tasks": true,
  "upload_documents": true,
  "update_case_status": true,
  "log_hours": true,
  "assign_tasks_to_paralegals": false  ← Unless partner
}
```

### Database Schema (Lawyer Onboarding)
```sql
-- Lawyer user record
INSERT INTO users (id, email, role, firm_id, created_at, is_active, phone)
VALUES (uuid(), 'ahmed@lawfirm.com', 'lawyer', firm_id, now(), false, '+923009876543');

-- Lawyer permissions (created at onboarding)
INSERT INTO user_permissions (user_id, permission, granted_at)
VALUES
  (lawyer_id, 'view_cases', now()),
  (lawyer_id, 'create_tasks', now()),
  (lawyer_id, 'upload_documents', now()),
  (lawyer_id, 'update_case_status', now());

-- Optional: Assign specific cases to lawyer
INSERT INTO case_team (case_id, lawyer_id, role, joined_date)
VALUES (case_id, lawyer_id, 'assigned_lawyer', now());
```

---

## 3. SCALING FROM SINGLE-TENANT TO MULTI-TENANT SaaS

### Phase 1-3: Single-Tenant (Your Firm Only)

**Infrastructure:**
```
┌─────────────────────────────────┐
│    LegalArie (Your Firm)        │
│                                 │
│  Backend: 1 Node.js Server      │
│  Database: 1 PostgreSQL         │
│  Storage: 1 AWS S3 Bucket       │
│  Messaging: 1 Firebase Project  │
└─────────────────────────────────┘

Costs: ~$100-200/month (Railway + Firebase + S3 free tier)
```

### Phase 4: Multi-Tenant SaaS

**Recommended: Shared Database with Tenant Isolation (Option A)**

```
┌────────────────────────────────────────────────────┐
│         Multi-Tenant Backend (Auto-Scaling)        │
│                                                    │
│  API Server 1    API Server 2    API Server 3     │
│       ↓               ↓               ↓             │
│  ┌──────────────────────────────────────────────┐ │
│  │   Load Balancer (Route traffic fairly)       │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────┐
│  Single PostgreSQL Database (Partitioned by firm_id)
│                                                    │
│  Firm 1 Data (firm_id=1)                          │
│  ├─ 50 users                                      │
│  ├─ 200 cases                                     │
│  └─ 1000 documents                                │
│                                                    │
│  Firm 2 Data (firm_id=2)                          │
│  ├─ 30 users                                      │
│  ├─ 150 cases                                     │
│  └─ 800 documents                                 │
│                                                    │
│  Firm 3 Data (firm_id=3) ... etc                  │
│                                                    │
└────────────────────────────────────────────────────┘
         ↓              ↓              ↓
   S3 Bucket    Firebase Project   Redis Cache
   (shared)     (shared)           (shared)
```

**Why This Approach:**
- ✅ **Cost-Effective**: 50 firms share 1 DB (~$500/month vs $5000 for separate DBs)
- ✅ **Simple Operations**: 1 backup, 1 monitoring, 1 deployment pipeline
- ✅ **Infinite Scaling**: Add API servers as needed (load balancer handles distribution)
- ✅ **No Code Changes**: Same API works for 1 firm or 1000 firms
- ✅ **Fast Updates**: Deploy once, all firms get updates instantly

### API-Led Architecture (From Day 1)

**Key Principle: Every Request Must Carry firm_id Context**

```typescript
// Middleware: Extract firm_id from JWT token
export const tenantMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Attach to request
  req.firmId = decoded.firmId;    ← Critical for multi-tenancy
  req.userId = decoded.userId;
  req.userRole = decoded.role;
  
  next();
};

// Example: Get cases for this firm only
app.get('/api/cases', tenantMiddleware, async (req, res) => {
  const cases = await db.query(
    'SELECT * FROM cases WHERE firm_id = $1 AND assigned_lawyer_id = $2',
    [req.firmId, req.userId]  ← firm_id always included
  );
  
  res.json({ success: true, data: cases });
});
```

**Database Query Pattern (Tenant Isolation)**

```sql
-- Good: Queries always include firm_id
SELECT * FROM cases 
WHERE firm_id = $1 AND status = 'active'
-- Result: Only returns cases from this firm

-- Bad (NEVER DO THIS): Missing firm_id check
SELECT * FROM cases WHERE status = 'active'
-- Risk: Could return all firms' active cases (data leak!)

-- Index for performance (critical for SaaS)
CREATE INDEX idx_cases_firm_id_status 
ON cases(firm_id, status);
```

### Scaling Timeline & Infrastructure

| Phase | Users | Firms | Infrastructure | Costs |
|-------|-------|-------|----------------|-------|
| **Phase 1** | <100 | 1 | 1 API server, 1 DB | $150/mo |
| **Phase 2** | <500 | 5 | Same (optimize queries) | $200/mo |
| **Phase 3** | <1000 | 10 | Add Redis cache | $300/mo |
| **Phase 4 (Launch SaaS)** | 5000 | 50 | 3 API servers, load balancer | $1500/mo |
| **Year 2** | 20000 | 200 | 10 API servers, DB replicas | $5000/mo |

### Deployment Pipeline (API-Led)

```
┌─ Developer commits code to feature branch
├─ GitHub Actions runs: ESLint, tests, build
├─ If pass, merge to main
├─ GitHub Actions: Deploy to staging (Railway)
├─ Run integration tests on staging
├─ If pass, promote to production
└─ Rolling deploy (no downtime, 1 API server at a time)

Result: Same API version serves all firms
        No per-firm deployments needed
```

### Critical: Tenant Isolation Checklist

**Before launching SaaS, verify:**

- [ ] Every API endpoint verifies firm_id from JWT token
- [ ] Every DB query filters by firm_id
- [ ] No cross-tenant data leaks in error messages
- [ ] Audit logs track which firm accessed what data
- [ ] Mass operations include firm_id (e.g., bulk update cases)
- [ ] Search functionality respects firm boundaries
- [ ] Document upload/download verifies firm ownership
- [ ] WebSocket connections authenticated with firm context

**Test Multi-Tenancy:**
```
1. Create 2 test firms in DB
2. Log in as User A (Firm 1) → Query cases → Verify only Firm 1 cases returned
3. Log in as User B (Firm 2) → Query cases → Verify only Firm 2 cases returned
4. Manually try to query Firm 1 cases as Firm 2 user → Should fail
5. Try SQL injection to access other firm's data → Should fail
```

---

## Summary: Your Development Strategy

### For MVP (Weeks 1-4): Build with SaaS in Mind

1. **Database Design**: Add `firm_id` to every table, create indexes
2. **API Design**: Every endpoint extracts `firm_id` from token
3. **Authentication**: JWT tokens include `firmId` + `userId` + `role`
4. **Permissions**: Check both `firmId` AND `userId` before returning data
5. **Logging**: Audit logs include context (which firm, which user)

### For SaaS Launch (Phase 4): Reuse Same Codebase

1. **Billing Layer**: Add subscription management (Stripe + Pakistani gateway)
2. **Onboarding**: Self-serve firm signup → auto-create firm record
3. **Deployment**: Deploy single multi-tenant version (no code changes needed!)
4. **Infrastructure**: Scale horizontally (more API servers behind load balancer)

**Cost Savings: You save 3+ months of development because you built API-first from day 1.**

---

