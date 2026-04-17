# Getting Started - LegalArie Development

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git
- GitHub account

---

## Phase 1: Local Development Setup (Weeks 1-4)

### Step 1: Clone Repository (After Pushing to GitHub)

```bash
git clone https://github.com/YOUR_USERNAME/LegalArie.git
cd LegalArie
```

### Step 2: Install Dependencies

```bash
# Root workspace
npm install

# Backend
cd backend
npm install
cp .env.example .env
cd ..

# Frontend
cd frontend
npm install
cp .env.example .env
cd ..

# Mobile (requires Flutter 3.x installed)
cd mobile
flutter pub get
cd ..
```

### Step 3: Setup PostgreSQL

```bash
# Create local PostgreSQL database
createdb legalaarie_dev

# Or use Docker Compose (optional)
docker-compose up -d
```

### Step 4: Configure Environment Variables

**backend/.env**
```
DATABASE_URL=postgresql://localhost/legalaarie_dev
JWT_SECRET=dev-secret-key-change-in-production
AWS_S3_BUCKET=legalaarie-dev
FIREBASE_PROJECT_ID=legalaarie-dev
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3000
```

### Step 5: Run Development Servers

**Terminal 1: Backend (port 3000)**
```bash
cd backend
npm run dev
```

**Terminal 2: Frontend (port 5173)**
```bash
cd frontend
npm run dev
```

**Terminal 3: Mobile**
```bash
cd mobile
flutter run
```

---

## Phase 2: GitHub Setup

### Push to GitHub

1. Create empty repository at https://github.com/new
   - Name: `LegalArie`
   - Make it **Private**
   - Do NOT add README/gitignore

2. Run these commands in `/Users/mohib/LegalArie`:
```bash
git remote add origin https://github.com/YOUR_USERNAME/LegalArie.git
git branch -m main main
git push -u origin main
```

3. Verify on GitHub that all files are pushed

---

## Phase 3: Development Workflow

### Creating Features

**Branch naming convention:**
```
feature/auth-module
feature/client-portal
bugfix/messaging-latency
```

**Example workflow:**
```bash
git checkout -b feature/auth-module
# Make changes
git add .
git commit -m "feat: implement JWT authentication middleware"
git push origin feature/auth-module
```

### Making Commits

**Commit message format (Conventional Commits):**
```
feat: add case status update API endpoint
fix: resolve real-time messaging race condition
docs: update architecture documentation
refactor: extract audit logging to separate service
```

### Pull Requests

1. Push feature branch to GitHub
2. Create Pull Request on GitHub
3. Peer review before merging to main
4. Squash and merge to keep history clean

---

## Key Files to Implement (Week 1)

After pushing to GitHub, begin with these foundational files:

### Backend (backend/src/)

1. **config/database.ts** — PostgreSQL connection pool
2. **config/firebase.ts** — Firebase initialization
3. **middleware/auth.ts** — JWT verification + role checks
4. **middleware/audit.ts** — Audit logging middleware
5. **middleware/errorHandler.ts** — Global error handling
6. **routes/auth.ts** — Login, signup, token refresh
7. **routes/users.ts** — User management endpoints
8. **services/database.ts** — Query builders + helpers
9. **server.ts** — Express app initialization + Socket.io setup

### Database (backend/db/)

1. **schema.sql** — All table definitions, indexes
2. **migrations/001_initial_schema.sql** — First migration

### Frontend (frontend/src/)

1. **services/api.ts** — Axios client + request interceptors
2. **services/auth.ts** — Login/logout logic
3. **hooks/useAuth.ts** — Auth context hook
4. **context/AuthContext.jsx** — Auth state management
5. **pages/LoginPage.jsx** — Login form
6. **pages/DashboardPage.jsx** — Main dashboard layout

### Mobile (mobile/lib/)

1. **models/user.dart** — Data models
2. **services/api_service.dart** — API client
3. **screens/login_screen.dart** — Login UI
4. **providers/auth_provider.dart** — GetX state management

---

## Immediate Next Steps

1. **Setup GitHub** → Push local repo to GitHub (you'll do this)
2. **Week 1 Backend** → Create database schema + auth endpoints
3. **Week 1 Frontend** → Create login page + client portal stub
4. **Week 2** → Integrate real-time messaging + document upload

---

## Where You'll Work

**All development happens on branches**, pushed directly to GitHub:
- Feature branches (`feature/...`)
- Bug fix branches (`bugfix/...`)
- Pull requests for peer review
- Merge to `main` after approval

**No local commits to main branch** — always work on feature branches.

---

## References

- [Backend API Design](./API.md) — Endpoint specifications
- [Database Schema](./DATABASE.md) — SQL design patterns
- [Architecture Overview](./ARCHITECTURE.md) — System design
- [Deployment Guide](./DEPLOYMENT.md) — Production setup

