# LegalArie Phase 1 - Complete Task Breakdown (115 Tasks)

**Status:** Ready for Autonomous Development  
**Date:** April 18, 2026  
**Total Tasks:** 115

---

## 📋 Table of Contents
1. [Soft Delete Feature (10 tasks)](#soft-delete-feature)
2. [Request Tracing (7 tasks)](#request-tracing)
3. [Rate Limiting (8 tasks)](#rate-limiting)
4. [Idempotency (6 tasks)](#idempotency)
5. [Database Schema (5 tasks)](#database-schema)
6. [API Endpoints (20 tasks)](#api-endpoints)
7. [Frontend Components (18 tasks)](#frontend-components)
8. [Frontend Features (11 tasks)](#frontend-features)
9. [API Service Layer (3 tasks)](#api-service-layer)
10. [Unit Tests (4 tasks)](#unit-tests)
11. [Integration Tests (5 tasks)](#integration-tests)
12. [E2E Tests (4 tasks)](#e2e-tests)
13. [Performance Tests (4 tasks)](#performance-tests)
14. [Deployment & DevOps (8 tasks)](#deployment--devops)
15. [Documentation (5 tasks)](#documentation)
16. [Security & Monitoring (5 tasks)](#security--monitoring)
17. [Final QA & Release (3 tasks)](#final-qa--release)

---

## SOFT DELETE FEATURE
### Tasks 1-10: Soft Delete Architecture

**1. Design soft delete architecture and database schema**
- Define soft delete strategy (timestamp vs flag)
- Plan query filtering logic
- Design recovery/restore workflows
- Document design decisions in architecture doc
- Deliverable: Architecture document

**2. Create softDelete middleware for Express**
- Middleware to automatically exclude deleted records
- Add deleted_at column checking
- Handle include_deleted query parameter
- Deliverable: middleware/softDelete.ts

**3. Add deleted_at column to all database tables**
- Alter Users table: add deleted_at nullable timestamp
- Alter Cases table: add deleted_at nullable timestamp
- Alter Tasks table: add deleted_at nullable timestamp
- Alter TimeEntries table: add deleted_at nullable timestamp
- Deliverable: Database migration script

**4. Implement soft delete in Case model**
- Add delete() method (sets deleted_at)
- Add restore() method (clears deleted_at)
- Add scope for active cases only
- Update queries to filter deleted
- Deliverable: Updated models/Case.ts

**5. Implement soft delete in Task model**
- Add delete() method (sets deleted_at)
- Add restore() method (clears deleted_at)
- Update task queries
- Cascade delete behavior for case deletion
- Deliverable: Updated models/Task.ts

**6. Implement soft delete in TimeEntry model**
- Add delete() method (sets deleted_at)
- Add restore() method (clears deleted_at)
- Update timeEntry queries
- Deliverable: Updated models/TimeEntry.ts

**7. Implement soft delete in User model**
- Add delete() method (sets deleted_at)
- Update user queries to exclude deleted
- Deliverable: Updated models/User.ts

**8. Create restore endpoint for soft deleted records**
- POST /api/cases/:id/restore
- POST /api/tasks/:id/restore
- POST /api/time-entries/:id/restore
- Add authorization checks
- Deliverable: routes/softDelete.ts

**9. Create permanent delete endpoint (admin only)**
- DELETE /api/admin/cases/:id/permanent
- DELETE /api/admin/tasks/:id/permanent
- Delete from database (not soft delete)
- Require admin role
- Deliverable: routes/admin.ts

**10. Add soft delete filtering to all list endpoints**
- Update GET /api/cases to exclude deleted by default
- Update GET /api/tasks to exclude deleted by default
- Update GET /api/time-entries to exclude deleted by default
- Add ?include_deleted=true query parameter
- Deliverable: Updated endpoint implementations

---

## REQUEST TRACING
### Tasks 11-17: Request Tracing System

**11. Design request tracing system and request ID generation**
- UUID v4 for request IDs
- Span ID generation strategy
- Trace context propagation
- Design trace header format
- Deliverable: Tracing design document

**12. Implement request ID middleware**
- Generate or extract X-Request-ID header
- Add to request object
- Pass to all downstream services
- Deliverable: middleware/requestId.ts

**13. Create logger service with request context**
- Logger class that includes request ID in all logs
- Structured logging format (JSON)
- Log levels: debug, info, warn, error
- Deliverable: services/Logger.ts

**14. Add tracing to all API endpoints**
- Log request start (method, path, timestamp)
- Log request parameters
- Log response status and time taken
- Deliverable: Updated all route files

**15. Implement distributed tracing headers**
- X-Trace-ID header support
- X-Span-ID header support
- Parent span ID support
- Header propagation to external services
- Deliverable: Updated middleware

**16. Create trace aggregation service**
- Collect traces from all requests
- Store in trace store (Redis or in-memory)
- Query traces by request ID
- Deliverable: services/TraceAggregator.ts

**17. Add correlation IDs to database operations**
- Include request ID in all database queries
- Track which request triggered which database operation
- Log query time with request context
- Deliverable: Updated database service

---

## RATE LIMITING
### Tasks 18-25: Rate Limiting Implementation

**18. Design rate limiting strategy**
- Per-user rate limits (e.g., 100 requests/minute)
- Per-IP rate limits (e.g., 1000 requests/minute)
- Per-endpoint rate limits
- Burst allowance strategy
- Deliverable: Rate limiting design doc

**19. Implement Redis rate limit store**
- Set up Redis connection for rate limits
- Implement counter storage format
- Implement TTL cleanup
- Deliverable: services/RateLimitStore.ts

**20. Create rate limit middleware**
- Check request against rate limits
- Return 429 Too Many Requests if exceeded
- Add rate limit headers to response
- Deliverable: middleware/rateLimit.ts

**21. Apply rate limiting to login endpoint**
- 5 failed login attempts per 15 minutes (by IP)
- 10 login attempts per hour (by user)
- Lock account after 5 failures
- Deliverable: Updated auth routes

**22. Apply rate limiting to file upload endpoint**
- 50 uploads per day (per user)
- 10MB per day total (per user)
- Deliverable: Updated file routes

**23. Apply rate limiting to search endpoint**
- 1000 searches per hour (per user)
- 100 searches per minute (per IP)
- Deliverable: Updated search routes

**24. Implement rate limit response headers**
- X-RateLimit-Limit header
- X-RateLimit-Remaining header
- X-RateLimit-Reset header
- Deliverable: Updated middleware

**25. Create rate limit configuration service**
- Load limits from environment variables
- Allow per-endpoint configuration
- Hot-reload configuration without restart
- Deliverable: services/RateLimitConfig.ts

---

## IDEMPOTENCY
### Tasks 26-31: Idempotency Implementation

**26. Design idempotency key strategy**
- Client-provided Idempotency-Key header
- Key format and validation
- Expiration policy (24 hours default)
- Conflict resolution strategy
- Deliverable: Idempotency design doc

**27. Implement idempotency key middleware**
- Extract Idempotency-Key from headers
- Validate key format
- Add to request context
- Deliverable: middleware/idempotency.ts

**28. Create idempotency cache store (Redis)**
- Store request hash and response
- Set 24-hour TTL
- Query cache for duplicate requests
- Deliverable: services/IdempotencyStore.ts

**29. Add idempotency to POST /api/cases**
- Check idempotency cache
- Return cached response if exists
- Store response in cache
- Deliverable: Updated cases routes

**30. Add idempotency to POST /api/tasks**
- Check idempotency cache
- Return cached response if exists
- Store response in cache
- Deliverable: Updated tasks routes

**31. Add idempotency to POST /api/time-entries**
- Check idempotency cache
- Return cached response if exists
- Store response in cache
- Deliverable: Updated time entries routes

**32. Add idempotency to POST /api/auth/login**
- Prevent double login issues
- Return same token if retried
- Deliverable: Updated auth routes

**33. Implement idempotency response caching**
- Cache full response (headers + body)
- Return exact same response on retry
- Log idempotent request
- Deliverable: Updated middleware

---

## DATABASE SCHEMA
### Tasks 34-38: Create Database Tables

**34. Create Cases table schema**
- Columns: id, title, description, status, priority, client_id, lawyer_id, created_at, updated_at, deleted_at
- Indexes: status, client_id, lawyer_id, created_at
- Foreign keys: client_id, lawyer_id
- Deliverable: Migration file

**35. Create Tasks table schema**
- Columns: id, case_id, title, description, status, assigned_to, due_date, created_at, updated_at, deleted_at
- Indexes: case_id, assigned_to, status, due_date
- Foreign keys: case_id, assigned_to
- Deliverable: Migration file

**36. Create TimeEntries table schema**
- Columns: id, task_id, lawyer_id, hours, description, date, created_at, updated_at, deleted_at
- Indexes: task_id, lawyer_id, date
- Foreign keys: task_id, lawyer_id
- Deliverable: Migration file

**37. Create CaseNotes table schema**
- Columns: id, case_id, author_id, content, created_at, updated_at
- Indexes: case_id, author_id, created_at
- Foreign keys: case_id, author_id
- Deliverable: Migration file

**38. Create CaseDocuments table schema**
- Columns: id, case_id, uploaded_by, filename, file_path, file_size, mime_type, created_at
- Indexes: case_id, uploaded_by
- Foreign keys: case_id, uploaded_by
- Deliverable: Migration file

---

## API ENDPOINTS
### Tasks 39-58: Implement CRUD Endpoints

**39. Implement GET /api/cases endpoint**
- List all active cases
- Query params: page, limit, sort, search, status, priority
- Return paginated response
- Include pagination metadata
- Deliverable: GET endpoint implementation

**40. Implement GET /api/cases/:id endpoint**
- Fetch single case by ID
- Include related tasks and notes
- Check case access permissions
- Deliverable: GET by ID endpoint

**41. Implement POST /api/cases endpoint**
- Create new case
- Validate required fields
- Require lawyer_id and client_id
- Idempotent with Idempotency-Key
- Deliverable: POST endpoint

**42. Implement PUT /api/cases/:id endpoint**
- Update case details
- Validate input data
- Check case access permissions
- Log audit trail
- Deliverable: PUT endpoint

**43. Implement DELETE /api/cases/:id endpoint**
- Soft delete case
- Set deleted_at timestamp
- Cascade soft delete to related tasks
- Log deletion
- Deliverable: DELETE endpoint

**44. Implement GET /api/tasks endpoint**
- List all active tasks
- Query params: page, limit, status, assigned_to, case_id
- Return paginated response
- Deliverable: GET endpoint

**45. Implement GET /api/tasks/:id endpoint**
- Fetch single task by ID
- Include time entries and assignee
- Deliverable: GET by ID endpoint

**46. Implement POST /api/tasks endpoint**
- Create new task
- Validate case_id and assigned_to
- Set default status (pending)
- Idempotent with Idempotency-Key
- Deliverable: POST endpoint

**47. Implement PUT /api/tasks/:id endpoint**
- Update task details
- Allow status change
- Trigger notifications on assignment change
- Deliverable: PUT endpoint

**48. Implement DELETE /api/tasks/:id endpoint**
- Soft delete task
- Set deleted_at timestamp
- Preserve time entries
- Deliverable: DELETE endpoint

**49. Implement GET /api/time-entries endpoint**
- List all time entries
- Query params: page, limit, lawyer_id, task_id, date_from, date_to
- Return paginated response
- Deliverable: GET endpoint

**50. Implement GET /api/time-entries/:id endpoint**
- Fetch single time entry by ID
- Deliverable: GET by ID endpoint

**51. Implement POST /api/time-entries endpoint**
- Create new time entry
- Validate hours and date
- Require task_id and lawyer_id
- Idempotent with Idempotency-Key
- Deliverable: POST endpoint

**52. Implement PUT /api/time-entries/:id endpoint**
- Update time entry
- Validate hours
- Update billable amount if rate changes
- Deliverable: PUT endpoint

**53. Implement DELETE /api/time-entries/:id endpoint**
- Soft delete time entry
- Set deleted_at timestamp
- Update task billing calculations
- Deliverable: DELETE endpoint

---

## FRONTEND COMPONENTS
### Tasks 54-71: Create React Components

**54. Create CasesPage component**
- List view of all cases
- Case cards with status badges
- Click to view case details
- Deliverable: pages/CasesPage.tsx

**55. Create CaseDetailPage component**
- Display case details
- Show associated tasks
- Show case notes
- Show case documents
- Deliverable: pages/CaseDetailPage.tsx

**56. Create CaseFormModal component**
- Create/edit case form
- Form fields: title, description, status, priority, client, lawyer
- Validation messages
- Submit and cancel buttons
- Deliverable: components/CaseFormModal.tsx

**57. Create TasksPage component**
- List view of all tasks
- Filter by case, status, assigned_to
- Task cards with due date
- Deliverable: pages/TasksPage.tsx

**58. Create TaskDetailPage component**
- Display task details
- Show time entries logged
- Show task assignee
- Show due date and status
- Deliverable: pages/TaskDetailPage.tsx

**59. Create TaskFormModal component**
- Create/edit task form
- Form fields: title, description, case, assigned_to, due_date, status
- Validation messages
- Deliverable: components/TaskFormModal.tsx

**60. Create TimeEntriesPage component**
- List view of time entries
- Filter by lawyer, date range
- Time entry cards with hours
- Deliverable: pages/TimeEntriesPage.tsx

**61. Create TimeEntryFormModal component**
- Create/edit time entry form
- Form fields: task, date, hours, description
- Validation (hours between 0-24)
- Deliverable: components/TimeEntryFormModal.tsx

**62. Implement case search and filtering**
- Real-time search by title
- Filter by status (open, active, closed)
- Filter by priority (low, medium, high, critical)
- Combined search/filter logic
- Deliverable: Updated CasesPage

**63. Implement task search and filtering**
- Real-time search by title
- Filter by status
- Filter by assigned_to
- Filter by case_id
- Deliverable: Updated TasksPage

**64. Implement time entry search and filtering**
- Filter by lawyer
- Filter by date range
- Filter by task
- Deliverable: Updated TimeEntriesPage

**65. Create pagination component**
- Next/Previous buttons
- Page number display
- Goto page input
- Deliverable: components/Pagination.tsx

**66. Add sorting to all list views**
- Sortable columns (click header to sort)
- Sort ascending/descending indicators
- Remember sort preference
- Deliverable: Updated list components

**67. Create data table component for lists**
- Generic table component
- Sortable columns
- Selectable rows
- Responsive design
- Deliverable: components/DataTable.tsx

**68. Implement case status badge component**
- Different colors for each status
- Hover tooltip with status details
- Deliverable: components/CaseStatusBadge.tsx

**69. Implement task priority badge component**
- Color coding: low (blue), medium (yellow), high (orange), critical (red)
- Icon indicators
- Deliverable: components/TaskPriorityBadge.tsx

**70. Create empty state components**
- Empty cases state
- Empty tasks state
- Empty time entries state
- With action buttons to create
- Deliverable: components/EmptyState.tsx

**71. Create loading skeleton components**
- Case list skeleton
- Task list skeleton
- Detail page skeleton
- Smooth animation
- Deliverable: components/LoadingSkeleton.tsx

---

## FRONTEND FEATURES
### Tasks 72-82: Additional Features

**72. Implement error boundary component**
- Catch component errors
- Display error message
- Show reset button
- Deliverable: components/ErrorBoundary.tsx

**73. Create toast notification service**
- Show success messages
- Show error messages
- Auto-dismiss after 3 seconds
- Deliverable: services/ToastNotification.ts

**74. Add form validation for case creation**
- Required field validation
- Title min length 5 chars
- Email validation for client
- Real-time error display
- Deliverable: hooks/useCaseValidation.ts

**75. Add form validation for task creation**
- Required field validation
- Due date must be future
- Hours validation (0-24)
- Deliverable: hooks/useTaskValidation.ts

**76. Add form validation for time entry creation**
- Required field validation
- Hours between 0.5 and 24
- Date not in future
- Deliverable: hooks/useTimeEntryValidation.ts

**77. Implement API service methods for cases**
- getCases(filters, pagination)
- getCase(id)
- createCase(data, idempotencyKey)
- updateCase(id, data)
- deleteCase(id)
- restoreCase(id)
- Deliverable: services/caseService.ts

**78. Implement API service methods for tasks**
- getTasks(filters, pagination)
- getTask(id)
- createTask(data, idempotencyKey)
- updateTask(id, data)
- deleteTask(id)
- restoreTask(id)
- Deliverable: services/taskService.ts

**79. Implement API service methods for time entries**
- getTimeEntries(filters, pagination)
- getTimeEntry(id)
- createTimeEntry(data, idempotencyKey)
- updateTimeEntry(id, data)
- deleteTimeEntry(id)
- Deliverable: services/timeEntryService.ts

---

## UNIT TESTS
### Tasks 80-83: Unit Tests

**80. Create unit tests for soft delete middleware**
- Test deletion marking with timestamp
- Test restoration clearing timestamp
- Test query filtering
- Test include_deleted parameter
- Target: 100% coverage
- Deliverable: __tests__/middleware/softDelete.test.ts

**81. Create unit tests for rate limit middleware**
- Test limit enforcement
- Test counter tracking
- Test TTL cleanup
- Test header additions
- Target: 100% coverage
- Deliverable: __tests__/middleware/rateLimit.test.ts

**82. Create unit tests for idempotency middleware**
- Test cache hit/miss
- Test response caching
- Test key validation
- Test expiration
- Target: 100% coverage
- Deliverable: __tests__/middleware/idempotency.test.ts

**83. Create unit tests for tracing service**
- Test request ID generation
- Test trace propagation
- Test log formatting
- Test trace aggregation
- Target: 95% coverage
- Deliverable: __tests__/services/tracing.test.ts

---

## INTEGRATION TESTS
### Tasks 84-88: Integration Tests

**84. Create integration tests for Cases API**
- Test CRUD operations
- Test filtering and sorting
- Test pagination
- Test error handling
- Target: 90% coverage
- Deliverable: __tests__/integration/casesAPI.test.ts

**85. Create integration tests for Tasks API**
- Test CRUD operations
- Test task assignment
- Test filtering
- Test error handling
- Deliverable: __tests__/integration/tasksAPI.test.ts

**86. Create integration tests for TimeEntries API**
- Test CRUD operations
- Test time calculations
- Test filtering by date range
- Test error handling
- Deliverable: __tests__/integration/timeEntriesAPI.test.ts

**87. Create integration tests for soft delete functionality**
- Test soft delete cascading
- Test restore functionality
- Test permanent delete
- Test access control on deleted items
- Deliverable: __tests__/integration/softDelete.test.ts

**88. Create integration tests for rate limiting**
- Test rate limit enforcement across requests
- Test counter reset
- Test multi-user scenarios
- Test burst handling
- Deliverable: __tests__/integration/rateLimiting.test.ts

---

## E2E TESTS
### Tasks 89-92: End-to-End Tests

**89. Create E2E tests for case creation flow**
- User navigates to cases page
- Clicks create case button
- Fills form
- Submits
- Verifies case appears in list
- Deliverable: e2e/cases.e2e.ts

**90. Create E2E tests for task assignment flow**
- User navigates to case
- Creates task
- Assigns to lawyer
- Task appears in lawyer's task list
- Deliverable: e2e/tasks.e2e.ts

**91. Create E2E tests for time entry logging flow**
- User logs into app
- Navigates to task
- Logs time entry
- Time entry appears in reports
- Deliverable: e2e/timeEntries.e2e.ts

**92. Create E2E tests for search functionality**
- User searches for case by title
- Results appear
- Filter results by status
- Pagination works
- Deliverable: e2e/search.e2e.ts

---

## PERFORMANCE TESTS
### Tasks 93-96: Performance & Load Testing

**93. Performance test API endpoints under load**
- Test GET /api/cases with 10,000 records
- Measure response time
- Target: < 500ms for p95
- Deliverable: benchmark/apiPerformance.ts

**94. Performance test frontend components**
- Test rendering CasesPage with 1000 items
- Measure render time
- Target: < 2s initial render
- Deliverable: benchmark/componentPerformance.ts

**95. Load test rate limiting under concurrent requests**
- Simulate 100 concurrent requests
- Verify rate limits enforce correctly
- Verify no false positives
- Deliverable: benchmark/rateLimitingLoad.ts

**96. Test idempotency with duplicate requests**
- Send 10 duplicate requests
- Verify same response
- Verify single database write
- Deliverable: benchmark/idempotencyLoad.ts

---

## DEPLOYMENT & DEVOPS
### Tasks 97-104: Deployment Infrastructure

**97. Create deployment checklist document**
- Pre-deployment checks
- Database migration steps
- Environment configuration
- Rollback procedures
- Deliverable: docs/DEPLOYMENT_CHECKLIST.md

**98. Set up CI/CD pipeline for automated testing**
- GitHub Actions workflow
- Run tests on PR
- Build on merge
- Auto-deploy on main
- Deliverable: .github/workflows/ci.yml

**99. Create database migration scripts**
- Up migrations (all schema changes)
- Down migrations (rollback)
- Data migration scripts if needed
- Deliverable: migrations/ directory

**100. Create database rollback scripts**
- Revert all schema changes
- Restore from backup if needed
- Data recovery procedures
- Deliverable: rollback/ directory

**101. Set up environment configuration for production**
- Production .env.production
- Logging configuration
- Database connection strings
- Redis configuration
- JWT secrets
- Deliverable: .env.production.example

**102. Create API documentation for all endpoints**
- Swagger/OpenAPI spec
- Request/response examples
- Error codes and descriptions
- Authentication requirements
- Deliverable: docs/API.md

**103. Create frontend component documentation**
- Component props documentation
- Usage examples
- Design guidelines
- Storybook integration
- Deliverable: docs/COMPONENTS.md

**104. Create deployment guide**
- Step-by-step deployment instructions
- Docker setup if applicable
- Database setup
- Environment configuration
- Deliverable: docs/DEPLOYMENT_GUIDE.md

---

## SECURITY & MONITORING
### Tasks 105-109: Security & Observability

**105. Create troubleshooting guide**
- Common issues and solutions
- Debug mode instructions
- Log analysis guide
- Performance troubleshooting
- Deliverable: docs/TROUBLESHOOTING.md

**106. Implement monitoring and alerting system**
- API response time monitoring
- Error rate monitoring
- Database query performance
- Alert thresholds
- Deliverable: monitoring/alerts.ts

**107. Create health check endpoints**
- GET /health (basic health)
- GET /health/db (database check)
- GET /health/redis (redis check)
- Deliverable: routes/health.ts

**108. Implement graceful shutdown handling**
- Stop accepting new requests
- Wait for in-flight requests
- Close database connections
- Close Redis connections
- Deliverable: middleware/gracefulShutdown.ts

**109. Security audit of all endpoints**
- Check authentication on all endpoints
- Verify authorization checks
- Test SQL injection protection
- Test XSS protection
- Test CSRF protection
- Deliverable: SECURITY_AUDIT.md

---

## FINAL QA & RELEASE
### Tasks 110-115: Quality Assurance & Release

**110. Final code review and quality assurance**
- Code review all PRs
- Check code style consistency
- Verify test coverage > 85%
- Performance review
- Deliverable: QA_REPORT.md

**111. Implement final testing and bug fixes**
- Regression testing
- Bug fixes for found issues
- Edge case testing
- Platform-specific testing
- Deliverable: Updated codebase

**112. Deploy to staging environment**
- Run migrations
- Configure staging environment
- Run full test suite
- Smoke testing
- Deliverable: Staging deployment complete

**113. User acceptance testing on staging**
- Test all features with demo data
- Get stakeholder sign-off
- Document feedback
- Fix critical issues
- Deliverable: UAT_REPORT.md

**114. Final testing before production**
- Full system test
- Load test
- Security test
- Backup procedures verified
- Deliverable: PRODUCTION_READY.md

**115. Deploy to production environment**
- Production deployment
- Database migrations
- Configuration updates
- Monitoring activation
- Post-deployment verification
- Deliverable: Production live

---

## 📊 Task Summary by Category

| Category | Tasks | Status |
|----------|-------|--------|
| Soft Delete | 10 | Not Started |
| Request Tracing | 7 | Not Started |
| Rate Limiting | 8 | Not Started |
| Idempotency | 6 | Not Started |
| Database Schema | 5 | Not Started |
| API Endpoints | 20 | Not Started |
| Frontend Components | 18 | Not Started |
| Frontend Features | 9 | Not Started |
| Unit Tests | 4 | Not Started |
| Integration Tests | 5 | Not Started |
| E2E Tests | 4 | Not Started |
| Performance Tests | 4 | Not Started |
| Deployment/DevOps | 8 | Not Started |
| Security/Monitoring | 5 | Not Started |
| QA/Release | 6 | Not Started |
| **TOTAL** | **115** | **Not Started** |

---

## 🚀 Getting Started

1. All tasks are loaded in the todo list system
2. Tasks should be worked on sequentially by priority
3. Each task should be marked as `in-progress` when started
4. Mark as `completed` immediately upon finish
5. Commit changes to git after each major feature section
6. Run tests after each completed task

**Happy coding! 🎯**
