# LegalArie Architecture - User & Device Summary

## System Overview

LegalArie is a three-tier legal practice management system:
- **Backend:** Node.js API + PostgreSQL database + Firebase real-time + AWS S3
- **Frontend:** Single React app with role-based dashboards
- **Mobile:** Flutter Android/iOS apps for clients & lawyers only

---

## User Groups & Devices

### 1. CLIENTS (Premium Corporate/High-End Individuals)

**Primary Use Case:** Track case status, receive updates, upload documents, communicate with lawyers

**Devices:**
- ✅ Web Browser (desktop, tablet, phone) — Primary access
- ✅ Android App (Flutter) — Phase 1 launch
- ✅ iOS App (Flutter) — Phase 4 launch

**Dashboard Access:** `https://legalaarie.com/client`

**What Clients See:**
- All their active/closed cases in one list
- Case detail: status timeline, assigned lawyers, hearing dates
- Documents (redacted/approved only)
- Tasks assigned to them (upload docs, attend meetings, provide info)
- Real-time messaging with assigned lawyer
- Billing visibility (invoices, retainer balance)
- Real-time push notifications

---

### 2. LAWYERS (In-House + Freelance)

**Primary Use Case:** Manage assigned cases, track tasks, upload documents, update status, message clients

**Devices:**
- ✅ Web Browser (desktop, laptop, tablet) — Primary access
- ✅ Android App (Flutter) — Phase 1 launch
- ✅ iOS App (Flutter) — Phase 4 launch

**Dashboard Access:** `https://legalaarie.com/lawyer`

**What Lawyers See:**
- Cases assigned to them (filter by status)
- Case detail: client info, documents, hearing dates, court details
- Task management (create, assign to self/paralegal, track completion)
- Real-time messaging with clients
- Work hours logging (billable/non-billable)
- Calendar with hearing dates and internal deadlines
- Document upload (to S3, visible to client if enabled)
- Case status workflow (Open → Active → Hearing Scheduled → Judgment Awaited → Closed)

---

### 3. OWNERS/PARTNERS/ADMINS (Management)

**Primary Use Case:** Real-time business intelligence, partner performance tracking, revenue attribution, compensation management

**Devices:**
- ✅ Web Browser (Desktop/Laptop) — Management Dashboard
- ❌ Android App — NOT available (internal tool only)
- ❌ iOS App — NOT available (internal tool only)

**Dashboard Access:** `https://legalaarie.com/admin` (Private, password-protected)

**What Owners See:**

**Real-Time KPI Dashboard:**
- Active matters (total, by practice area)
- Revenue this month (invoiced, pending, collected)
- Collections outstanding (AR aging report)
- Partner performance (cases managed, revenue generated, utilization %)
- Client satisfaction score (average, by partner)
- Pipeline value (prospects → projected revenue)
- Matter turnaround time (avg days filing → closure)

**Revenue Attribution Engine:**
- Each case: originating partner, handling partner, referral assist
- Billable hours breakdown per lawyer
- Auto-calculated: partner share %, firm pool allocation, referral bonuses
- Collections status per case

**Compensation Module:**
- Monthly bonus calculation (base + performance)
- KPI tracking: revenue generated, cases closed, utilization, collections rate
- Performance vs. targets (visual)
- Annual appraisal summaries
- Contribution points per partner
- Compensation payout schedules

**CRM Management:**
- Prospect pipeline (leads → clients)
- Lead follow-ups, interaction logs
- Referral source tracking

**Team Management:**
- Add/remove lawyers
- Assign permissions (role-based)
- View audit logs (who did what, when)

---

## Real-Time Data Flow

```
┌─ LAWYERS (Web + Mobile) ──┐
│                            │
│  Updates case status       │
│  Uploads document          │
│  Sends message to client   │
└────────────┬───────────────┘
             │
             ↓
    ┌────────────────────┐
    │  Backend API       │
    │ (Node.js/Express)  │
    │                    │
    │ • Update DB        │
    │ • Emit Socket.io   │
    │ • Send Firebase    │
    └────────────┬───────┘
             ┌───┴────┬──────┐
             ↓        ↓      ↓
    ┌──────────┐  ┌──────┐  ┌──────────┐
    │ CLIENTS  │  │ADMINS│  │DATABASE  │
    │Web+Mobile│  │Web   │  │          │
    │ Notified │  │View  │  │Updated   │
    └──────────┘  └──────┘  └──────────┘
```

---

## Phase Rollout Timeline

| Phase | Timeline | Client App | Lawyer App | Owner Dashboard |
|-------|----------|-----------|-----------|-----------------|
| **Phase 1** | Weeks 1-4 | ✅ Web + Android | ✅ Web + Android | ❌ Not yet |
| **Phase 2** | Weeks 5-8 | ✅ Enhanced | ✅ Enhanced | ✅ KPI Dashboard |
| **Phase 3** | Weeks 9-12 | ✅ Full | ✅ Full | ✅ Full (Compensation) |
| **Phase 4** | Month 4+ | ✅ iOS | ✅ iOS | ✅ SaaS Multi-Firm |

---

## Device Summary Table

| User Type | Web Browser | Android App | iOS App | Desktop | Purpose |
|-----------|-----------|-----------|---------|---------|---------|
| **Clients** | ✅ Primary | ✅ Mobile (Phase 1) | ✅ (Phase 4) | Optional | Track cases, docs, messaging |
| **Lawyers** | ✅ Primary | ✅ Mobile (Phase 1) | ✅ (Phase 4) | Optional | Manage cases, tasks, docs |
| **Owners** | ✅ Primary | ❌ No | ❌ No | **Required** | Management dashboards only |

---

## Competitive Advantage

**Your Unique Differentiators (vs Clio):**

1. **Owner Dashboard** — Real-time partner performance & KPI visibility (Clio has generic reporting)
2. **Revenue Attribution** — Auto-calculates who earned what on each case (Clio lacks this)
3. **Compensation Module** — Automatic bonus/appraisal calculation (Clio lacks this)
4. **Pakistani Focus** — Local courts, payment gateways, compliance (Clio is global)
5. **Premium Client Transparency** — Real-time updates, case tracking (Clio has basic portal)

---

## Infrastructure (Unified Backend)

**One Backend, Three Frontend Views:**
- Single Node.js API server
- Single PostgreSQL database
- Role-based access control (client sees only their cases, lawyers see assigned cases, admins see everything)
- Firebase for real-time messaging/notifications
- AWS S3 for document storage
- Socket.io for live updates

**Single React App with Routes:**
```
/login                  → Authentication
/client/*               → Client Portal
/lawyer/*               → Lawyer Dashboard
/admin/*                → Owner/Admin Dashboard (protected)
```

---

## Next Steps

**Phase 1 (Week 1-4) Implementation:**
1. Backend API foundation + authentication
2. Client portal web interface
3. Lawyer dashboard web interface
4. Real-time messaging integration
5. Android app deployment
6. Load testing & optimization

**Phase 2 (Week 5-8):** Owner dashboard with KPIs + revenue attribution engine

**Phase 3 (Week 9-12):** Billing, HR, compensation modules

---

