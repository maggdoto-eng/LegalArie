# Git-First Development Workflow - LegalArie

This project uses a **Git-first workflow**: all development happens directly on GitHub branches, with code pushed and pulled without any local development work.

---

## Initial Setup (One Time)

### Prerequisites
- GitHub account
- macOS Terminal (zsh)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `LegalArie`
3. Description: "Premium Legal Practice Management Platform"
4. Select **Private** (recommended for law firm software)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 2: Add Remote and Push Initial Code

```bash
cd /Users/mohib/LegalArie

# Add GitHub as remote origin
git remote add origin https://github.com/YOUR_USERNAME/LegalArie.git

# Push initial commit to GitHub
git branch -m main main
git push -u origin main
```

After this, your code is on GitHub and you're ready to start development!

---

## Development Workflow (Ongoing)

### For Each Feature

**1. Create a feature branch**
```bash
git checkout -b feature/auth-module
# or
git checkout -b feature/client-portal
```

**2. Make changes directly in your editor** (code files in this branch)

**3. Commit with semantic messages**
```bash
git add src/middleware/auth.ts
git commit -m "feat: add JWT authentication middleware"
```

**4. Push to GitHub**
```bash
git push origin feature/auth-module
```

**5. Create Pull Request on GitHub**
- Go to https://github.com/YOUR_USERNAME/LegalArie
- Click "New Pull Request"
- Select `feature/auth-module` → `main`
- Add description
- Request reviewer (your team member)

**6. After approval, merge on GitHub**
- Click "Squash and merge" to keep history clean
- Delete branch after merging

**7. Pull the latest main locally**
```bash
git checkout main
git pull origin main
```

---

## Commit Message Format

Follow **Conventional Commits** for clarity:

```
feat:    New feature (feat: add case status API endpoint)
fix:     Bug fix (fix: resolve messaging latency issue)
docs:    Documentation (docs: update architecture)
refactor: Code restructure (refactor: extract auth service)
test:    Tests (test: add login endpoint tests)
chore:   Build/deps (chore: update dependencies)
```

### Examples
```
git commit -m "feat: implement JWT authentication for client login"
git commit -m "fix: resolve real-time message delivery lag"
git commit -m "docs: add API endpoint documentation"
git commit -m "refactor: extract database connection pool"
```

---

## Branching Strategy

```
main (production-ready code)
  ├── feature/auth-module
  ├── feature/client-portal
  ├── feature/lawyer-dashboard
  ├── feature/messaging
  ├── feature/documents-upload
  ├── bugfix/messaging-race-condition
  └── docs/architecture-update
```

**Rules:**
- Always branch from `main`
- Feature branches are temporary (deleted after merge)
- Never commit directly to `main`
- Code review before merging

---

## Phase 1 Implementation (Weeks 1-4)

### Week 1: Backend Foundation

```bash
# Create feature branch
git checkout -b feature/auth-module

# Files to create in backend/src/:
# 1. config/database.ts (PostgreSQL connection)
# 2. config/firebase.ts (Firebase setup)
# 3. routes/auth.ts (Login/signup endpoints)
# 4. routes/users.ts (User management)
# 5. services/authService.ts (Business logic)

# After creating files:
git add backend/src/
git commit -m "feat: implement authentication module"
git push origin feature/auth-module

# Create PR on GitHub, review, merge
```

### Week 2: Frontend Portal

```bash
git checkout -b feature/client-portal

# Files to create in frontend/src/:
# 1. pages/LoginPage.jsx
# 2. pages/ClientPortal.jsx
# 3. components/CaseList.jsx
# 4. components/CaseDetail.jsx
# 5. services/api.ts
# 6. hooks/useAuth.ts
# 7. context/AuthContext.jsx

git add frontend/src/
git commit -m "feat: build client portal UI"
git push origin feature/client-portal
```

### Week 3: Lawyer Dashboard

```bash
git checkout -b feature/lawyer-dashboard

# Lawyer-specific components
git add frontend/src/
git commit -m "feat: implement lawyer dashboard and task management"
git push origin feature/lawyer-dashboard
```

### Week 4: Messaging + Mobile

```bash
git checkout -b feature/realtime-messaging
# ... real-time messaging code

git checkout -b feature/flutter-app
# ... Flutter Android app
```

---

## Key Files Already Committed

✅ **Root Configuration:**
- `.gitignore` — Ignore node_modules, .env, build files
- `package.json` — Root workspace scripts
- `README.md` — Project overview
- `docs/ARCHITECTURE.md` — System design

✅ **Backend Foundation:**
- `backend/package.json` — Node.js dependencies
- `backend/src/server.ts` — Express app skeleton
- `backend/src/middleware/auth.ts` — JWT middleware
- `backend/src/middleware/audit.ts` — Audit logging
- `backend/db/schema.sql` — Complete database schema

✅ **Frontend Setup:**
- `frontend/package.json` — React dependencies
- `frontend/.env.example` — Environment template

✅ **Mobile Setup:**
- `mobile/pubspec.yaml` — Flutter dependencies

✅ **Documentation:**
- `docs/DEVELOPMENT.md` — Developer guide
- `docs/ARCHITECTURE.md` — Architecture overview

---

## Next Steps

1. **Push initial commit to GitHub** (completed above)
2. **Create feature branches for each module** (listed above)
3. **Implement Week 1 backend foundation**
4. **Create pull requests for code review**
5. **Merge reviewed code to main**

---

## Troubleshooting

### Push rejected: "branch already exists"
```bash
git push -u origin feature/your-feature
```

### Need to sync with latest main
```bash
git fetch origin
git rebase origin/main
git push -f origin feature/your-feature
```

### Accidentally committed to main
```bash
git reset HEAD~1  # Undo last commit
git checkout -b feature/new-branch
git commit -m "feat: your message"
```

### View all commits pushed
```bash
git log --oneline origin/main
```

---

## Questions?

Refer to:
- [Architecture](./ARCHITECTURE.md) — System design
- [Development Setup](./DEVELOPMENT.md) — Local setup (if needed)
- [API Reference](./API.md) — Endpoint specs (coming Week 1)

