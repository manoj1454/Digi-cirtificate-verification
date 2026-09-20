-- ==============================================================================
-- CERTIFICATE VERIFICATION PLATFORM - DATABASE SCHEMA & ROW-LEVEL SECURITY (RLS)
-- Run this script in the Supabase SQL Editor to initialize all tables and policies.
-- ==============================================================================

-- 1. Create Enums
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

-- 2. Create Tables

-- USERS Table (Links with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    institution_id UUID NULL REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSTITUTIONS Table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    status institution_status NOT NULL DEFAULT 'pending',
    wallet_address TEXT NULL,
    approved_at TIMESTAMPTZ NULL
);

-- STUDENTS Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    full_name TEXT NOT NULL
);

-- CERTIFICATES Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    ipfs_hash TEXT NULL,
    on_chain_tx_hash TEXT NULL,
    degree_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VERIFICATION LOGS Table
CREATE TABLE IF NOT EXISTS public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    result TEXT NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for Performance & Relationships
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON public.users(institution_id);
CREATE INDEX IF NOT EXISTS idx_institutions_user_id ON public.institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_certificates_credential_id ON public.certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_institution_id ON public.certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_company ON public.verification_logs(company_user_id);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. Row-Level Security Policies
-- ==============================================================================

-- USERS Policies:
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their profile on signup (or via trigger)
CREATE POLICY "Users can insert own profile"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- INSTITUTIONS Policies:
-- A regulator can SELECT all rows in institutions
CREATE POLICY "Regulator can select all institutions"
    ON public.institutions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'regulator'
        )
    );

-- A regulator can UPDATE all rows in institutions (e.g. approve/reject status)
CREATE POLICY "Regulator can update all institutions"
    ON public.institutions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'regulator'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'regulator'
        )
    );

-- An institution can SELECT their own profile
CREATE POLICY "Institution can view own record"
    ON public.institutions
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
    );

-- An institution can INSERT their own profile
CREATE POLICY "Institution can insert own record"
    ON public.institutions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- An institution can UPDATE their own profile
CREATE POLICY "Institution can update own record"
    ON public.institutions
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id
        OR id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
    );

-- STUDENTS Policies:
-- A student can SELECT their own student profile
CREATE POLICY "Student can view own record"
    ON public.students
    FOR SELECT
    USING (auth.uid() = user_id);

-- A student can INSERT their own record
CREATE POLICY "Student can insert own record"
    ON public.students
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Institutions can SELECT students registered under their institution
CREATE POLICY "Institutions can view their students"
    ON public.students
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- CERTIFICATES Policies:
-- A student can only SELECT their own rows in certificates (where student_id matches their linked student record)
CREATE POLICY "Students can only select their own certificates"
    ON public.certificates
    FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students
            WHERE user_id = auth.uid()
        )
    );

-- An institution can only SELECT rows in certificates where institution_id matches their own
CREATE POLICY "Institutions can select their own issued certificates"
    ON public.certificates
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- An institution can only INSERT rows in certificates where institution_id matches their own
CREATE POLICY "Institutions can insert certificates for their institution"
    ON public.certificates
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- VERIFICATION_LOGS Policies:
-- A company can only SELECT their own rows in verification_logs
CREATE POLICY "Company can only select their own verification logs"
    ON public.verification_logs
    FOR SELECT
    USING (
        company_user_id = auth.uid()
    );

-- A company can INSERT their own verification logs
CREATE POLICY "Company can insert their own verification logs"
    ON public.verification_logs
    FOR INSERT
    WITH CHECK (
        company_user_id = auth.uid()
    );

-- ==============================================================================
-- 6. Trigger to automatically handle Supabase Auth signup -> public.users sync
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    assigned_inst_id UUID;
BEGIN
    -- Extract role from metadata, default to 'student' if not specified or invalid
    BEGIN
        assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'student'::public.user_role;
    END;

    -- Extract institution_id from metadata if provided (e.g. for invited staff)
    BEGIN
        assigned_inst_id := (NEW.raw_user_meta_data->>'institution_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        assigned_inst_id := NULL;
    END;

    INSERT INTO public.users (id, email, role, institution_id, created_at)
    VALUES (NEW.id, NEW.email, assigned_role, assigned_inst_id, NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = EXCLUDED.role,
        institution_id = COALESCE(EXCLUDED.institution_id, public.users.institution_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. PENDING CERTIFICATES Table & Workflow
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE certificate_status AS ENUM ('pending_approval', 'approved', 'issued', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.pending_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    ipfs_cid TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    degree_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    approved_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    status certificate_status NOT NULL DEFAULT 'pending_approval',
    on_chain_tx_hash TEXT NULL,
    error_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_certificates_institution_id ON public.pending_certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_credential_id ON public.pending_certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_created_by ON public.pending_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_status ON public.pending_certificates(status);

ALTER TABLE public.pending_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions can view their pending certificates"
    ON public.pending_certificates
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Institutions can insert their pending certificates"
    ON public.pending_certificates
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Institutions can update their pending certificates"
    ON public.pending_certificates
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ==============================================================================
-- 8. ANOMALY FLAGS Table & Monitoring
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.anomaly_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL,
    details JSONB NOT NULL,
    severity TEXT NOT NULL DEFAULT 'WARNING',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_institution ON public.anomaly_flags(institution_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_timestamp ON public.anomaly_flags(timestamp);

ALTER TABLE public.anomaly_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regulator can view all anomaly flags"
    ON public.anomaly_flags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'regulator'
        )
    );

CREATE POLICY "Institution can view own anomaly flags"
    ON public.anomaly_flags
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ==============================================================================
-- 8. Grant Permissions to API Roles (anon, authenticated, service_role)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


