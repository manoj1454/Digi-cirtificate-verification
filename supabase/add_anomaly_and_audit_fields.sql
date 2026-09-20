-- ==============================================================================
-- MIGRATION: Anomaly Monitoring & Audit Trail Completeness
-- ==============================================================================

-- 1. Add IP Address and User Agent to verification_logs for abuse tracking
ALTER TABLE public.verification_logs 
ADD COLUMN IF NOT EXISTS ip_address TEXT NULL,
ADD COLUMN IF NOT EXISTS user_agent TEXT NULL;

-- 2. Create anomaly_flags table for storing queryable security alerts
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

-- 3. Enable RLS on anomaly_flags
ALTER TABLE public.anomaly_flags ENABLE ROW LEVEL SECURITY;

-- Regulator can view all anomaly flags
CREATE POLICY "Regulator can view all anomaly flags"
    ON public.anomaly_flags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'regulator'
        )
    );

-- Institution can view their own anomaly flags
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
