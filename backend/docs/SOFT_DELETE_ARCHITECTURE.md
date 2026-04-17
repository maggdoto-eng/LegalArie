# Soft Delete Architecture

**Document Status:** Architecture Design  
**Date:** April 18, 2026  
**Version:** 1.0

---

## 1. Overview

The soft delete feature allows records to be marked as deleted without permanently removing them from the database. This enables:
- **Data Recovery** - Restore accidentally deleted records
- **Audit Trail** - Maintain history of all deletions
- **Compliance** - Keep deleted data for legal/regulatory requirements
- **Analytics** - Analyze historical data including deleted records

---

## 2. Soft Delete Strategy

### 2.1 Implementation Approach

**Chosen Strategy: Timestamp-based Soft Delete**

- Add `deleted_at` nullable TIMESTAMP column to all entity tables
- `NULL` = record is active (not deleted)
- `NOT NULL` = record is soft deleted (timestamp of deletion)
- Default on creation: `deleted_at = NULL`

**Why this approach:**
- ✅ Simple to implement and query
- ✅ Maintains exact deletion timestamp for audit logs
- ✅ Easy to restore (just set to NULL)
- ✅ Efficient database indexing
- ✅ Works with existing ORM patterns

### 2.2 Alternative Considered: Soft Delete Flag

```sql
-- NOT using this approach
ALTER TABLE cases ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
```

**Why we rejected this:**
- ❌ Loses deletion timestamp information
- ❌ Harder to debug which deletion happened when
- ❌ Cannot easily track deletion history

---

## 3. Database Schema Changes

### 3.1 Schema Design Pattern

Every entity table will have:

```sql
-- Base table structure
CREATE TABLE cases (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- ... other columns ...
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL,  -- Soft delete marker
  INDEX idx_deleted_at (deleted_at),   -- Index for filtering
  INDEX idx_active_cases (status, deleted_at)  -- Composite index
);
```

### 3.2 Tables Affected

**Phase 1 Tables:**
1. `users` - User records (lawyers, staff, admin)
2. `cases` - Legal cases
3. `tasks` - Case tasks
4. `time_entries` - Billable time entries
5. `case_notes` - Case notes/comments
6. `case_documents` - Uploaded documents

### 3.3 Indexes for Performance

```sql
-- Soft delete queries need efficient filtering
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_active ON cases(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_active ON tasks(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_active ON time_entries(id) WHERE deleted_at IS NULL;

-- For filtering by status and active state
CREATE INDEX idx_cases_status_active ON cases(status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status_active ON tasks(status, deleted_at) WHERE deleted_at IS NULL;
```

---

## 4. Query Filtering Logic

### 4.1 Automatic Filtering Pattern

All queries should automatically exclude soft-deleted records by default:

```javascript
// Pattern for all SELECT queries
const getAllCases = async (filters = {}) => {
  const query = `
    SELECT * FROM cases 
    WHERE deleted_at IS NULL  -- Automatic filter
    AND status = $1
  `;
  return db.query(query, [filters.status]);
};

// Pattern for single record queries
const getCaseById = async (id) => {
  const query = `
    SELECT * FROM cases 
    WHERE id = $1 
    AND deleted_at IS NULL  -- Automatic filter
  `;
  return db.query(query, [id]);
};
```

### 4.2 Include Deleted Records (When Needed)

For admin/audit purposes, allow including deleted records:

```javascript
const getAllCases = async (filters = {}, includeDeleted = false) => {
  let query = `
    SELECT * FROM cases 
    WHERE 1=1
  `;
  
  if (!includeDeleted) {
    query += ` AND deleted_at IS NULL`;  // Automatic filter
  }
  
  if (filters.status) {
    query += ` AND status = $1`;
  }
  
  return db.query(query, [filters.status]);
};
```

### 4.3 Query Parameter Convention

All list endpoints support optional query parameter:

```
GET /api/cases?include_deleted=true  -- Include soft-deleted records
GET /api/cases                       -- Exclude soft-deleted records (default)
```

---

## 5. Middleware Architecture

### 5.1 Soft Delete Middleware

```javascript
// middleware/softDelete.ts
export const softDeleteMiddleware = (req, res, next) => {
  // Add soft delete context to request
  req.softDelete = {
    includeDeleted: req.query.include_deleted === 'true',
    userId: req.user?.id,
    timestamp: new Date(),
  };
  next();
};
```

### 5.2 Middleware Placement

```javascript
// In Express app setup
app.use(softDeleteMiddleware);  // Add to all requests
app.use('/api/cases', casesRouter);
app.use('/api/tasks', tasksRouter);
```

---

## 6. Operation Workflows

### 6.1 Soft Delete (Archive Record)

```
User Action: DELETE /api/cases/123
├── Validate: User has permission to delete case 123
├── Query: SELECT * FROM cases WHERE id = 123 AND deleted_at IS NULL
├── Check: Ensure case is not already deleted
├── Update: UPDATE cases SET deleted_at = NOW() WHERE id = 123
├── Cascade: Soft delete related tasks (case_id = 123)
├── Log: Audit log: "Case 123 deleted by user 456 at 2026-04-18T10:30:00Z"
└── Response: 200 OK { message: "Case deleted successfully" }
```

### 6.2 Restore (Undelete Record)

```
User Action: POST /api/cases/123/restore
├── Validate: User has admin permission
├── Query: SELECT * FROM cases WHERE id = 123 AND deleted_at IS NOT NULL
├── Check: Ensure case is soft-deleted
├── Update: UPDATE cases SET deleted_at = NULL WHERE id = 123
├── Cascade: Restore related tasks IF they were deleted with this case
├── Log: Audit log: "Case 123 restored by user 456 at 2026-04-18T10:31:00Z"
└── Response: 200 OK { data: case_object }
```

### 6.3 Permanent Delete (Hard Delete - Admin Only)

```
User Action: DELETE /api/admin/cases/123/permanent
├── Validate: User has SUPER_ADMIN permission
├── Query: SELECT * FROM cases WHERE id = 123
├── Check: User confirmation (optional)
├── Delete: DELETE FROM cases WHERE id = 123
├── Cascade: Delete all related records:
│   ├── DELETE FROM tasks WHERE case_id = 123
│   ├── DELETE FROM case_notes WHERE case_id = 123
│   └── DELETE FROM case_documents WHERE case_id = 123
├── Log: Audit log: "Case 123 permanently deleted by admin 456"
└── Response: 200 OK { message: "Case permanently deleted" }
```

---

## 7. Cascade Behavior

### 7.1 Soft Delete Cascading

When a parent record is soft-deleted, child records are also soft-deleted:

```
DELETE /api/cases/123
├── Set cases.deleted_at = NOW() (case 123)
└── Set tasks.deleted_at = NOW() (all tasks where case_id = 123)
```

### 7.2 Restore Cascading

When restoring a parent, child records are restored only if they were deleted as part of the cascade:

```
POST /api/cases/123/restore
├── Set cases.deleted_at = NULL (case 123)
├── Check: Was task X deleted at the same time as case?
│   ├── If YES: Set tasks.deleted_at = NULL (restore it)
│   └── If NO: Leave it deleted (was deleted separately)
```

**Implementation Strategy:**
- Track deletion time to determine cascade relationships
- Records deleted within 1 second of parent = likely cascade delete
- Use deletion order (parent first, then children) as indicator

---

## 8. API Endpoints for Soft Delete

### 8.1 Restore Endpoints

```
POST /api/cases/:id/restore
- Body: {} (empty)
- Response: 200 OK { data: restored_case }
- Auth: User must have case access

POST /api/tasks/:id/restore
- Body: {} (empty)
- Response: 200 OK { data: restored_task }

POST /api/time-entries/:id/restore
- Body: {} (empty)
- Response: 200 OK { data: restored_entry }
```

### 8.2 Permanent Delete Endpoints (Admin Only)

```
DELETE /api/admin/cases/:id/permanent
- Query: ?confirm=true (for safety)
- Response: 200 OK { message: "Deleted" }
- Auth: SUPER_ADMIN role required

DELETE /api/admin/tasks/:id/permanent
- Auth: SUPER_ADMIN role required

DELETE /api/admin/time-entries/:id/permanent
- Auth: SUPER_ADMIN role required
```

### 8.3 List with Deleted Records

```
GET /api/cases?include_deleted=true
- Returns: All cases including soft-deleted ones
- Auth: SUPER_ADMIN or MANAGER role
```

---

## 9. Audit Trail & Logging

### 9.1 Audit Table Structure

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,      -- 'case', 'task', 'time_entry'
  entity_id BIGINT NOT NULL,
  action VARCHAR(20) NOT NULL,            -- 'DELETE', 'RESTORE', 'PERMANENT_DELETE'
  user_id BIGINT,
  old_values JSONB,                       -- Previous state
  new_values JSONB,                       -- New state
  reason VARCHAR(255),                    -- Why was it deleted?
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_user (user_id)
);
```

### 9.2 Audit Logging Pattern

```javascript
// Log every soft delete
async function logAuditTrail(entityType, entityId, action, userId, oldValues, reason) {
  const query = `
    INSERT INTO audit_log 
    (entity_type, entity_id, action, user_id, old_values, reason, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `;
  return db.query(query, [entityType, entityId, action, userId, oldValues, reason]);
}
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure
1. Create `deleted_at` columns on all tables
2. Create indexes for performance
3. Implement soft delete middleware
4. Create restore endpoints
5. Add filtering to list endpoints

### Phase 2: Audit & Recovery
6. Create audit_log table
7. Implement audit logging
8. Create permanent delete endpoints
9. Add admin audit dashboard

### Phase 3: Recovery Tools
10. Create data recovery dashboard
11. Implement bulk restore functionality
12. Create deletion analytics/reports

---

## 11. Error Handling

### 11.1 Common Errors

```javascript
// Record not found (already deleted or never existed)
if (!record) {
  throw new Error(404, 'Record not found or has been deleted');
}

// Attempting to restore non-deleted record
if (!record.deleted_at) {
  throw new Error(400, 'Record is not deleted. Cannot restore.');
}

// Insufficient permissions
if (!user.hasPermission('admin')) {
  throw new Error(403, 'Only admins can permanently delete records');
}
```

---

## 12. Performance Considerations

### 12.1 Index Strategy

```sql
-- Partial indexes (only for active records)
CREATE INDEX idx_cases_active ON cases(id, status, updated_at) 
WHERE deleted_at IS NULL;

-- For joins
CREATE INDEX idx_tasks_case_active ON tasks(case_id) 
WHERE deleted_at IS NULL;

-- For sorting/pagination
CREATE INDEX idx_cases_created_active ON cases(created_at DESC) 
WHERE deleted_at IS NULL;
```

### 12.2 Query Optimization

- Always filter by `deleted_at IS NULL` in WHERE clause
- Use partial indexes for frequently queried active records
- Cache recently active records (1 hour TTL)

### 12.3 Storage Implications

- Soft-deleted records remain in database (storage cost)
- Consider archiving very old soft-deleted records (> 1 year) to separate archive table
- Document retention policy: Keep soft-deleted for 90 days, then auto-purge

---

## 13. Migration Strategy

### 13.1 Zero-Downtime Migration

```sql
-- Step 1: Add column (non-blocking)
ALTER TABLE cases ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Step 2: Create indexes
CREATE INDEX idx_cases_deleted_at ON cases(deleted_at);

-- Step 3: Update code to respect deleted_at filter
-- (deploy new code that excludes deleted records)

-- Step 4: No old records need updating (NULL = active)
```

### 13.2 Rollback Strategy

```sql
-- If needed, rollback is simple:
ALTER TABLE cases DROP COLUMN deleted_at;
```

---

## 14. Testing Strategy

### 14.1 Unit Test Cases

- ✅ Soft delete marks record as deleted
- ✅ Restore clears deleted_at
- ✅ List endpoints exclude deleted by default
- ✅ List endpoints include deleted with flag
- ✅ Cascade delete works correctly
- ✅ Audit logs created for all operations

### 14.2 Integration Test Cases

- ✅ Soft delete with cascade to related records
- ✅ Restore with cascade relationships
- ✅ Permissions enforced for restore/permanent delete
- ✅ Audit trail complete and accurate

---

## Summary

**Soft Delete Architecture Key Points:**
- ✅ Timestamp-based (`deleted_at` column) strategy
- ✅ Automatic filtering of deleted records
- ✅ Optional `include_deleted` query parameter for admins
- ✅ Cascade soft delete to related records
- ✅ Restore functionality with cascade awareness
- ✅ Admin-only permanent delete
- ✅ Complete audit trail logging
- ✅ Efficient indexes for performance
- ✅ Zero-downtime migration approach

**Deliverables:**
- Database migration scripts with `deleted_at` columns
- Soft delete middleware
- Restore and permanent delete endpoints
- Audit logging table and functions
- Updated list endpoints with delete filtering
