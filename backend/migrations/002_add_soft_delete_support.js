/**
 * Migration: Add soft delete support to all core tables
 * Up: Adds deleted_at timestamp column to all tables
 * Down: Removes deleted_at column from all tables
 * 
 * This migration adds soft delete capability to:
 * - users
 * - cases
 * - tasks
 * - time_entries
 * - case_notes
 * - case_documents
 */

// Migration name: 002_add_soft_delete_support
// Direction: up

const migrations = {
  // Up migration - adds soft delete support
  up: `
    -- Start transaction
    BEGIN;

    -- Add deleted_at to users table
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_users_deleted_at ON users(deleted_at);
    CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

    -- Add deleted_at to cases table
    ALTER TABLE cases ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_cases_deleted_at ON cases(deleted_at);
    CREATE INDEX idx_cases_active ON cases(id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_cases_status_active ON cases(status, deleted_at) WHERE deleted_at IS NULL;

    -- Add deleted_at to tasks table
    ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
    CREATE INDEX idx_tasks_active ON tasks(id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tasks_case_active ON tasks(case_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tasks_status_active ON tasks(status, deleted_at) WHERE deleted_at IS NULL;

    -- Add deleted_at to time_entries table
    ALTER TABLE time_entries ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_time_entries_deleted_at ON time_entries(deleted_at);
    CREATE INDEX idx_time_entries_active ON time_entries(id) WHERE deleted_at IS NULL;

    -- Add deleted_at to case_notes table (if exists)
    ALTER TABLE case_notes ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_case_notes_deleted_at ON case_notes(deleted_at);

    -- Add deleted_at to case_documents table (if exists)
    ALTER TABLE case_documents ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    CREATE INDEX idx_case_documents_deleted_at ON case_documents(deleted_at);

    -- Create audit_log table for tracking soft deletes
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id BIGINT NOT NULL,
      action VARCHAR(20) NOT NULL,
      user_id BIGINT,
      old_values JSONB,
      new_values JSONB,
      reason VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes on audit_log
    CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX idx_audit_user ON audit_log(user_id);

    -- Commit transaction
    COMMIT;
  `,

  // Down migration - removes soft delete support
  down: `
    -- Start transaction
    BEGIN;

    -- Drop indexes first
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

    -- Remove deleted_at columns
    ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE cases DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE tasks DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE time_entries DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE case_notes DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE case_documents DROP COLUMN IF EXISTS deleted_at;

    -- Commit transaction
    COMMIT;
  `,
};

module.exports = migrations;
