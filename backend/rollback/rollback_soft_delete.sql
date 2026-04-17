/**
 * Rollback Script: Remove soft delete support
 * 
 * Usage: Run this script to rollback the soft delete migration
 * psql -U postgres -d legalaarie -f rollback_soft_delete.sql
 * 
 * This script removes:
 * - deleted_at columns from all tables
 * - All soft delete indexes
 * - audit_log table
 */

-- Start transaction
BEGIN;

-- Drop indexes first (must drop before columns)
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_cases_deleted_at;
DROP INDEX IF EXISTS idx_cases_active;
DROP INDEX IF EXISTS idx_cases_status_active;
DROP INDEX IF EXISTS idx_tasks_deleted_at;
DROP INDEX IF EXISTS idx_tasks_active;
DROP INDEX IF EXISTS idx_tasks_case_active;
DROP INDEX IF EXISTS idx_tasks_status_active;
DROP INDEX IF EXISTS idx_time_entries_deleted_at;
DROP INDEX IF EXISTS idx_time_entries_active;
DROP INDEX IF EXISTS idx_case_notes_deleted_at;
DROP INDEX IF EXISTS idx_case_documents_deleted_at;
DROP INDEX IF EXISTS idx_audit_entity;
DROP INDEX IF EXISTS idx_audit_timestamp;
DROP INDEX IF EXISTS idx_audit_user;

-- Drop audit_log table
DROP TABLE IF EXISTS audit_log;

-- Remove deleted_at columns from all tables
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE cases DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE time_entries DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE case_notes DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE case_documents DROP COLUMN IF EXISTS deleted_at;

-- Commit transaction
COMMIT;

-- Verification query: Show remaining columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('users', 'cases', 'tasks', 'time_entries', 'case_notes', 'case_documents')
ORDER BY table_name, column_name;
