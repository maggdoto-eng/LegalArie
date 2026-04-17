-- LegalArie Database Schema
-- PostgreSQL 14+
-- Phase 1: MVP Core Tables

-- ============================================
-- 1. ORGANIZATIONS & USERS
-- ============================================

CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Pakistan',
  subscription_tier ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'lawyer', 'partner', 'admin', 'support') NOT NULL DEFAULT 'lawyer',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(firm_id, email)
);

-- ============================================
-- 2. CLIENTS & CASES
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company_name VARCHAR(255),
  practice_area VARCHAR(100),
  retainer_status ENUM('prospect', 'active', 'retained', 'closed') DEFAULT 'prospect',
  relationship_owner_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(firm_id, email)
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_number VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  assigned_lawyer_id UUID NOT NULL REFERENCES users(id),
  status ENUM('open', 'active', 'hearing_scheduled', 'judgment_awaited', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  case_type VARCHAR(100),
  filing_date DATE,
  expected_closure_date DATE,
  description TEXT,
  court_name VARCHAR(255),
  judge_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(firm_id, case_number)
);

-- Link multiple lawyers to a case
CREATE TABLE IF NOT EXISTS case_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100) DEFAULT 'assigned_lawyer',
  joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(case_id, lawyer_id)
);

-- ============================================
-- 3. TASKS & ACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_to_user_id UUID REFERENCES users(id),
  status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- ============================================
-- 4. MESSAGING
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_case_id ON messages(case_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);

-- ============================================
-- 5. DOCUMENTS & FILES
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  s3_file_id VARCHAR(500) NOT NULL UNIQUE,
  s3_url VARCHAR(1000) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes BIGINT,
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  document_type VARCHAR(100),
  visible_to_client BOOLEAN DEFAULT FALSE,
  is_redacted BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_uploaded_by_id ON documents(uploaded_by_id);

-- ============================================
-- 6. AUDIT LOGGING (Immutable)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Immutable: no UPDATE or DELETE allowed on audit_logs
ALTER TABLE audit_logs OWNER TO legalaarie_app;
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================
-- 7. CASE STATUS HISTORY (For Compliance)
-- ============================================

CREATE TABLE IF NOT EXISTS case_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_status_history_case_id ON case_status_history(case_id);

-- ============================================
-- 8. TIME ENTRIES (For Phase 2 - Billing)
-- ============================================

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users(id),
  hours DECIMAL(5, 2) NOT NULL,
  billable BOOLEAN DEFAULT TRUE,
  description TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX idx_time_entries_lawyer_id ON time_entries(lawyer_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_cases_firm_id ON cases(firm_id);
CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_assigned_lawyer_id ON cases(assigned_lawyer_id);
CREATE INDEX idx_cases_status ON cases(status);

CREATE INDEX idx_users_firm_id ON users(firm_id);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_clients_firm_id ON clients(firm_id);
CREATE INDEX idx_clients_retainer_status ON clients(retainer_status);

CREATE INDEX idx_tasks_case_id ON tasks(case_id);
CREATE INDEX idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================
-- SEQUENCES (For reference)
-- ============================================

-- None needed with UUID primary keys

-- ============================================
-- VIEWS (For Phase 2+)
-- ============================================

-- View: All active cases with assigned lawyer info
CREATE OR REPLACE VIEW v_active_cases AS
SELECT 
  c.id,
  c.case_number,
  c.title,
  c.status,
  c.priority,
  cli.name AS client_name,
  u.full_name AS lawyer_name,
  c.created_at
FROM cases c
JOIN clients cli ON c.client_id = cli.id
JOIN users u ON c.assigned_lawyer_id = u.id
WHERE c.status IN ('open', 'active', 'hearing_scheduled');

-- View: Case statistics by lawyer
CREATE OR REPLACE VIEW v_lawyer_case_stats AS
SELECT 
  u.id,
  u.full_name,
  COUNT(c.id) AS total_cases,
  SUM(CASE WHEN c.status IN ('open', 'active') THEN 1 ELSE 0 END) AS active_cases,
  SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) AS closed_cases
FROM users u
LEFT JOIN cases c ON u.id = c.assigned_lawyer_id
WHERE u.role = 'lawyer'
GROUP BY u.id, u.full_name;
