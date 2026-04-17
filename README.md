# LegalArie - Premium Legal Practice Management Platform

**LegalArie** is an enterprise-grade legal practice management platform designed for premium law firms in Pakistan. It provides transparency, real-time case tracking, revenue attribution, and performance management for clients, lawyers, and firm partners.

## Vision

Build a world-class legal operations platform that:
- ✅ Gives clients real-time visibility into their cases (premium experience)
- ✅ Tracks lawyer/partner contributions fairly (revenue attribution)
- ✅ Calculates compensation transparently (performance-based bonuses)
- ✅ Scales to multi-tenant SaaS for law firms across Pakistan and South Asia

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js + Express + PostgreSQL |
| **Frontend** | React (Vite) + TailwindCSS + Socket.io |
| **Mobile** | Flutter (Android, Phase 1) |
| **Real-Time** | Firebase Cloud Messaging + Socket.io |
| **File Storage** | AWS S3 (free tier MVP) |
| **Hosting** | Railway (backend), Vercel (frontend), Google Play (Android) |

## Project Structure

```
LegalArie/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, audit logging, error handling
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   └── config/         # Configuration
│   ├── db/
│   │   ├── schema.sql      # PostgreSQL schema
│   │   └── migrations/     # Schema versions
│   ├── tests/              # API tests
│   ├── .env.example        # Environment template
│   └── package.json
│
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client + real-time
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # Context API (auth, user)
│   │   ├── styles/         # TailwindCSS
│   │   └── App.jsx
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── mobile/                  # Flutter Android App
│   ├── lib/
│   │   ├── screens/        # Flutter screens
│   │   ├── services/       # API + Firebase integration
│   │   ├── providers/      # State management (GetX/Riverpod)
│   │   ├── models/         # Data models
│   │   └── main.dart
│   ├── test/
│   ├── pubspec.yaml
│   └── android/
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System design
│   ├── API.md               # API endpoints reference
│   ├── DATABASE.md          # Schema + queries
│   ├── DEPLOYMENT.md        # Infrastructure setup
│   └── FEATURES.md          # Feature roadmap
│
├── .gitignore
├── .env.example             # Root environment
├── docker-compose.yml       # Local PostgreSQL + Redis (optional)
└── package.json            # Root workspace scripts

```

## Phase Roadmap

### Phase 1: MVP (Weeks 1-4)
- ✅ Client portal (case status, documents, messaging)
- ✅ Lawyer dashboard (case management, tasks, status updates)
- ✅ Basic CRM (client database, pipeline)
- ✅ Real-time messaging (client ↔ lawyer)
- ✅ Authentication & RBAC
- ✅ Audit logging
- ✅ Android app

### Phase 2: Revenue Attribution (Weeks 5-8)
- ✅ Time entry logging
- ✅ Revenue attribution engine
- ✅ Management dashboard (KPIs)
- ✅ Calendar & scheduling

### Phase 3: Operations (Weeks 9-12)
- ✅ Billing & invoicing
- ✅ HR module
- ✅ Compensation calculator (bonus, appraisals)
- ✅ Security hardening (RBAC, encryption)

### Phase 4: SaaS (Month 4+)
- ✅ Multi-tenancy
- ✅ Pakistani payment gateway integration
- ✅ SOC 2 compliance
- ✅ iOS app

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Setup (Local Development)

**1. Clone & Install**
```bash
cd ~/LegalArie
git init
git add .
git commit -m "Initial commit: LegalArie project structure"

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Mobile (requires Flutter 3.x)
cd ../mobile
flutter pub get
```

**2. Database Setup**
```bash
# Create PostgreSQL database
createdb legalairie_dev

# Run migrations
cd backend
npm run db:migrate
```

**3. Environment Variables**
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/legalairie_dev
JWT_SECRET=your-secret-key-here
AWS_S3_BUCKET=legalairie-dev
AWS_REGION=us-east-1
FIREBASE_PROJECT_ID=legalairie-dev
FIREBASE_API_KEY=your-firebase-key

# frontend/.env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_CONFIG={...}
```

**4. Run Locally**
```bash
# Terminal 1: Backend (port 3000)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev

# Terminal 3: Mobile
cd mobile && flutter run
```

Visit `http://localhost:5173` for the web app.

## Architecture Decisions

### Why AWS S3?
- Free tier: 5GB storage + 20K GET/2K PUT requests/month
- Industry standard (Clio, MyCase, Smokeball all use it)
- Scales without redesign to multi-tenant SaaS
- Presigned URLs for secure, direct uploads

### Why Firebase Real-Time?
- Simpler than self-hosted Socket.io
- Scales to 100K concurrent connections
- Free tier generous for MVP
- Can migrate to self-hosted if costs prohibitive

### Why PostgreSQL?
- Free on Railway
- Perfect for structured legal data (cases, clients, audit logs)
- Scales to enterprise
- Strong ACID guarantees (important for billing)

### Why Flutter Android Only (Phase 1)?
- Easier to test + deploy than iOS
- Reduces time-to-launch
- iOS added in Phase 4 (SaaS launch)
- Shared Dart codebase, easy port to iOS

## Team Structure

**2-Person Team:**
- **Developer 1:** Backend (Node.js, PostgreSQL, APIs)
- **Developer 2:** Full-stack (React frontend + Flutter mobile)
- **Shared:** Architecture decisions, deployment, testing

## Key Files to Create Next

1. `backend/src/config/database.ts` — PostgreSQL connection
2. `backend/db/schema.sql` — Database schema (cases, clients, users, etc.)
3. `backend/src/middleware/auth.ts` — JWT auth + role-based access
4. `backend/src/routes/auth.ts` — Login/signup endpoints
5. `frontend/src/pages/ClientPortal.jsx` — Client dashboard
6. `frontend/src/pages/LawyerDashboard.jsx` — Lawyer dashboard
7. `mobile/lib/screens/client_cases_screen.dart` — Mobile client view

## Competitive Advantage (vs Clio)

| Feature | LegalArie | Clio |
|---------|-----------|------|
| Revenue Attribution | ✅ Built-in | ❌ No |
| Partner Compensation | ✅ Automatic | ❌ No |
| Real-Time KPI Dashboard | ✅ Yes | ❌ Reporting only |
| Pakistani Market Focus | ✅ Local | ❌ Global |
| Premium Client Transparency | ✅ Core design | ⚠️ Secondary |

## Success Metrics (MVP)

- [ ] Client can login & see all their cases
- [ ] Lawyer can create case & assign tasks
- [ ] Real-time messaging (message sent → received <3 seconds)
- [ ] Document upload (visible to client within 2 seconds)
- [ ] 50 concurrent users, no errors
- [ ] Android app builds & deploys to Google Play (internal testing)

## Contributing

This is a private project for the law firm. All development follows:
- Code review before merge
- Automated tests (>80% coverage)
- Staging deployment before production
- Semantic commits

## License

Proprietary — Not open source.

---

**Next Step:** Open `/Users/mohib/LegalArie` in VS Code and run `npm install` in both `backend/` and `frontend/` folders.

