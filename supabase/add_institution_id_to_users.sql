-- ==============================================================================
-- MIGRATION: Add institution_id to public.users & Update Multi-Sig RLS Policies
-- ==============================================================================

-- 1. Add institution_id column to public.users (nullable, only populated for role = 'institution')
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS institution_id UUID NULL REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_institution_id ON public.users(institution_id);

-- 2. Backfill existing institution owners so their institution_id is populated
UPDATE public.users u
SET institution_id = i.id
FROM public.institutions i
WHERE i.user_id = u.id AND u.role = 'institution' AND u.institution_id IS NULL;

-- 3. Update public.handle_new_user() trigger function
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

-- 4. Update INSTITUTIONS table RLS Policies
DROP POLICY IF EXISTS "Institution can view own record" ON public.institutions;
CREATE POLICY "Institution can view own record"
    ON public.institutions
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Institution can update own record" ON public.institutions;
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

-- 5. Update STUDENTS table RLS Policies
DROP POLICY IF EXISTS "Institutions can view their students" ON public.students;
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

-- 6. Update CERTIFICATES table RLS Policies
DROP POLICY IF EXISTS "Institutions can select their own issued certificates" ON public.certificates;
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

DROP POLICY IF EXISTS "Institutions can insert certificates for their institution" ON public.certificates;
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

-- 7. Update PENDING_CERTIFICATES table RLS Policies
DROP POLICY IF EXISTS "Institutions can view their pending certificates" ON public.pending_certificates;
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

DROP POLICY IF EXISTS "Institutions can insert their pending certificates" ON public.pending_certificates;
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

DROP POLICY IF EXISTS "Institutions can update their pending certificates" ON public.pending_certificates;
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
