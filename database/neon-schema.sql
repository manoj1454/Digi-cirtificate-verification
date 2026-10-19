-- ==============================================================================
-- XYPHER - Academic Credential Verification Platform
-- Standalone Neon PostgreSQL Schema Migration
-- ==============================================================================
-- NOTE:
-- In this architecture, Supabase is retained strictly for Authentication.
-- Application data lives entirely in Neon PostgreSQL.
-- The auth.users table and Supabase RLS policies (auth.uid()) are NOT present here.
-- Authorization and data isolation are enforced at the Express API layer.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Types / Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('regulator', 'institution', 'student', 'company');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE institution_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE certificate_status AS ENUM ('pending_approval', 'approved', 'issued', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Application Tables

-- USERS Table
-- id: Matches the Supabase Auth user UUID
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    full_name TEXT NULL,
    institution_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSTITUTIONS Table
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    status institution_status NOT NULL DEFAULT 'pending',
    wallet_address TEXT NULL,
    approved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Establish foreign key from users.institution_id -> institutions.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_institution'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_institution
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- INSTITUTION STAFF Table (links multiple staff members to an institution)
CREATE TABLE IF NOT EXISTS institution_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, user_id)
);

-- STUDENTS Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CERTIFICATES Table (Finalized, on-chain issued credentials)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    ipfs_hash TEXT NULL,
    on_chain_tx_hash TEXT NULL,
    degree_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PENDING CERTIFICATES Table (Initiated, awaits second-person approval)
CREATE TABLE IF NOT EXISTS pending_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    ipfs_cid TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    degree_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    status certificate_status NOT NULL DEFAULT 'pending_approval',
    on_chain_tx_hash TEXT NULL,
    error_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VERIFICATION LOGS Table (Audit trail for public & company verifications)
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    result TEXT NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANOMALY FLAGS Table (Security alerts for abnormal issuance velocity)
CREATE TABLE IF NOT EXISTS anomaly_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    flag_type TEXT NULL,
    event_type TEXT NOT NULL DEFAULT 'excessive_issuance',
    count INT NULL,
    threshold INT NULL,
    window_hours INT NULL DEFAULT 1,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity TEXT NOT NULL DEFAULT 'WARNING',
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id);

CREATE INDEX IF NOT EXISTS idx_institutions_user_id ON institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_registration ON institutions(registration_number);

CREATE INDEX IF NOT EXISTS idx_institution_staff_lookup ON institution_staff(user_id, institution_id);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

CREATE INDEX IF NOT EXISTS idx_certificates_credential_id ON certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_institution_id ON certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date);

CREATE INDEX IF NOT EXISTS idx_pending_certificates_credential ON pending_certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_institution ON pending_certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_student ON pending_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_created_by ON pending_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_status ON pending_certificates(status);

CREATE INDEX IF NOT EXISTS idx_verification_logs_company ON verification_logs(company_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_credential ON verification_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_institution ON anomaly_flags(institution_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_timestamp ON anomaly_flags(timestamp);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_created_at ON anomaly_flags(created_at);
