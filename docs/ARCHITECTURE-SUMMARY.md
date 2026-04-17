# LegalArie Architecture - User & Device Summary

## System Overview

LegalArie is a three-tier legal practice management system:
- **Backend:** Node.js API + PostgreSQL database + Firebase real-time + AWS S3
- **Mobile App:** Flutter (Android + iOS) - Clients & Lawyers ONLY
- **Web App:** React (Browser) - Owners/Partners/Admin Staff ONLY

---

## User Groups & Devices

### 1. CLIENTS (Premium Corporate/High-End Individuals)

**Primary Use Case:** Track case status, receive updates, upload documents, communicate with lawyers

**Platforms:**
- ❌ Web Browser — NOT AVAILABLE
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

**Platforms:**
- ❌ Web Browser — NOT AVAILABLE
- ✅ Android App (Flutter) — Phase 1 launch
- ✅ iOS App (Flutter) — Phase 4 launch

**App Access:** Download from Google Play (Android) or App Store (iOS)

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

### 3. OWNERS/PARTNERS/ADMIN STAFF (Management)

**Primary Use Case:** Real-time business intelligence, partner performance tracking, revenue attribution, compensation management

**Platforms:**
- ✅ Web Browser (Desktop/Laptop) — Management Dashboard (PRIMARY)
- ❌ Android App — NOT available (web-only tool)
- ❌ iOS App — NOT available (web-only tool)

**Dashboard Access:** `https://legalaarie.com/admin` (Private, password-protected, browser-only)

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
┌─ MOBILE APP (Flutter) ──┐     ┌─ WEB APP (React) ──┐
│ (Clients + Lawyers)     │     │ (Owners/Admins)    │
│                         │     │                    │
│ • Case status update    │     │ • View KPIs        │
│ • Document upload       │     │ • Track revenue    │
│ • Message client/lawyer │     │ • Manage partners  │
└──────────┬──────────────┘     └─────────┬──────────┘
           │                              │
           └──────────────┬───────────────┘
                          ↓
                  ┌──────────────────┐
                  │  Backend API     │
                  │ (Node.js/Express)│
                  │                  │
                  │ • Update DB      │
                  │ • Emit Socket.io │
                  │ • Firebase msgs  │
                  └────────┬─────────┘
                           ↓
          ┌────────────────┴────────────────┐
          ↓                                 ↓
    ┌──────────────┐              ┌──────────────┐
    │ MOBILE APPS  │              │ WEB DASHBOARD│
    │(Clients+     │              │(Owners/Admins│
    │Lawyers)      │              │   Real-time) │
    │ Real-time    │              │   Updates    │
    │ Notified     │              └──────────────┘
    └──────────────┘
```

---

## Phase Rollout Timeline

| Phase | Timeline | Client Mobile App | Lawyer Mobile App | Admin Web Dashboard |
|-------|----------|-----------|-----------|-----------------|
| **Phase 1** | Weeks 1-4 | ✅ Android (Flutter) | ✅ Android (Flutter) | ❌ Not yet |
| **Phase 2** | Weeks 5-8 | ✅ Enhanced | ✅ Enhanced | ✅ KPI Dashboard |
| **Phase 3** | Weeks 9-12 | ✅ Full Feature | ✅ Full Feature | ✅ Full (Compensation) |
| **Phase 4** | Month 4+ | ✅ iOS (Flutter) | ✅ iOS (Flutter) | ✅ SaaS Multi-Firm |

---

## Platform Summary Table

| User Type | Web Browser | Android App | iOS App | Purpose |
|-----------|-----------|-----------|---------|----------|
| **Clients** | ❌ NO | ✅ Yes (Phase 1) | ✅ Yes (Phase 4) | Case tracking, docs, messaging |
| **Lawyers** | ❌ NO | ✅ Yes (Phase 1) | ✅ Yes (Phase 4) | Case management, tasks, docs |
| **Owners/Admins** | ✅ Yes (Only) | ❌ NO | ❌ NO | KPI dashboards, revenue tracking, management |

---

## Competitive Advantage

**Your Unique Differentiators (vs Clio):**

1. **Owner Dashboard** — Real-time partner performance & KPI visibility (Clio has generic reporting)
2. **Revenue Attribution** — Auto-calculates who earned what on each case (Clio lacks this)
3. **Compensation Module** — Automatic bonus/appraisal calculation (Clio lacks this)
4. **Pakistani Focus** — Local courts, payment gateways, compliance (Clio is global)
5. **Premium Client Transparency** — Real-time updates, case tracking (Clio has basic portal)

---

## Infrastructure (Two-Platform Strategy)

**Unified Backend Powers Both Apps:**
- Single Node.js API server (Railway)
- Single PostgreSQL database (Railway)
- Role-based access control (client sees only their cases, lawyers see assigned cases, admins see all)
- Firebase for real-time messaging/notifications (both web + mobile)
- AWS S3 for document storage (presigned uploads)
- Socket.io for live updates (web dashboard)

**React Web App (Admin/Management Only):**
- Desktop browser-based internal management tool
- Role-based dashboard for owners, partners, admin staff
- Routes:
  - `/admin/login` — Admin authentication
  - `/admin/dashboard` — KPI dashboard (owners/admins)
  - `/admin/revenue-attribution` — Revenue tracking & visualization
  - `/admin/compensation` — Monthly bonus & appraisal calculation
  - `/admin/crm` — CRM & prospect pipeline
  - `/admin/users` — Team management & permissions
  - `/admin/audit-logs` — Audit trail viewer

**Flutter Mobile App (Clients + Lawyers - Field Workers):**
- iOS & Android native apps
- Public app on App Store & Google Play
- Two separate login flows: Client vs Lawyer
- Screens:
  - `login_screen` — Client or Lawyer authentication
  - `client_cases_home` — Client case list + detail
  - `lawyer_dashboard` — Lawyer case management
  - `messaging_screen` — Real-time client ↔ lawyer chat
  - `document_viewer` — View/upload documents
  - `calendar_screen` — Hearing dates & deadlines
  - `task_screen` — Task tracking & action items
  - `profile_screen` — User profile & settings

---

## Next Steps

**Phase 1 (Weeks 1-4) Implementation - MOBILE FIRST:**
1. Backend API foundation + authentication (JWT, roles)
2. Flutter mobile app: Client login & case dashboard (Android)
3. Flutter mobile app: Lawyer login & case management (Android)
4. Real-time messaging integration (Firebase + Socket.io)
5. Document upload to S3 (Flutter)
6. Android app deployment to Google Play (internal testing)

**Phase 2 (Weeks 5-8):** React web dashboard for owners + revenue attribution engine

**Phase 3 (Weeks 9-12):** Billing, HR, compensation modules (web + mobile enhancements)

**Phase 4 (Month 4+):** iOS apps + Multi-tenant SaaS

---

## Key Difference from Clio

Clio is desktop/browser-first. **LegalArie is mobile-first** for field workers (clients & lawyers) and browser-based for management (owners). This is better because:

- ✅ Clients get real-time updates on phone (primary demand)
- ✅ Lawyers manage cases on mobile (field workers need mobility)
- ✅ Owners get desktop-based management tools (strategic work)
- ✅ Faster mobile development (Flutter for both platforms)
- ✅ Simpler web app (management only, not public-facing)

