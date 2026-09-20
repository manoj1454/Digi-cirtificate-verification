-- ==============================================================================
-- PENDING CERTIFICATES & MULTI-SIG APPROVAL SCHEMA
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create Enum for Pending Certificate Status
DO $$ BEGIN
    CREATE TYPE certificate_status AS ENUM ('pending_approval', 'approved', 'issued', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Optional Institution Staff table to link multiple staff accounts to an institution
CREATE TABLE IF NOT EXISTS public.institution_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, user_id)
);

-- 3. Create pending_certificates Table
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

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_pending_certificates_institution_id ON public.pending_certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_credential_id ON public.pending_certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_created_by ON public.pending_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_pending_certificates_status ON public.pending_certificates(status);
CREATE INDEX IF NOT EXISTS idx_institution_staff_lookup ON public.institution_staff(user_id, institution_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.pending_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_staff ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Only users belonging to that institution_id can read/write their own institution's rows
CREATE POLICY "Institutions can view their pending certificates"
    ON public.pending_certificates
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Institutions can insert their pending certificates"
    ON public.pending_certificates
    FOR INSERT
    WITH CHECK (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Institutions can update their pending certificates"
    ON public.pending_certificates
    FOR UPDATE
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
        )
    );

-- Institution Staff Policies
CREATE POLICY "Users can view staff of their institution"
    ON public.institution_staff
    FOR SELECT
    USING (
        institution_id IN (
            SELECT id FROM public.institutions WHERE user_id = auth.uid()
            UNION
            SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
        )
    );

-- 7. Grant Permissions to anon, authenticated, and service_role
GRANT ALL ON public.pending_certificates TO anon, authenticated, service_role;
GRANT ALL ON public.institution_staff TO anon, authenticated, service_role;
