-- =====================================================================
-- UNAI PM CRM — Feature Tasks & Time Tracking Migration
-- File: sql/002_feature_tasks_timetracking.sql
-- =====================================================================

-- 1. FEATURE REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.project_features (
    id                VARCHAR(100) PRIMARY KEY,
    project_id        VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    technology        VARCHAR(255),
    source_doc_ids    TEXT[] DEFAULT '{}'::TEXT[],
    source_doc_names  TEXT[] DEFAULT '{}'::TEXT[],
    sequence_order    INTEGER NOT NULL DEFAULT 1,
    status            VARCHAR(50) NOT NULL DEFAULT 'Pending',
    progress          INTEGER DEFAULT 0,
    assigned_tl_id    VARCHAR(100),
    assigned_tl_name  VARCHAR(255),
    is_blocked        BOOLEAN DEFAULT true,
    linked_functions  TEXT[] DEFAULT '{}'::TEXT[],
    linked_apis       TEXT[] DEFAULT '{}'::TEXT[],
    linked_screens    TEXT[] DEFAULT '{}'::TEXT[],
    estimated_hours   NUMERIC(8,2),
    actual_hours      NUMERIC(8,2) DEFAULT 0,
    start_date        VARCHAR(50),
    due_date          VARCHAR(50),
    organization_id   VARCHAR(100) NOT NULL REFERENCES public.organizations(id),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TASK TIME LOGS TABLE (Begin / End / Break tracking)
CREATE TABLE IF NOT EXISTS public.task_time_logs (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id     VARCHAR(100),
    employee_name   VARCHAR(255),
    action          VARCHAR(30) NOT NULL,  -- begin, end, break_start, break_end, pause
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT
);

-- 3. ADD COLUMNS TO TASKS TABLE
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id VARCHAR(100)
    REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS feature_id VARCHAR(100)
    REFERENCES public.project_features(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(30) DEFAULT 'feature_task';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 4. RLS POLICIES
ALTER TABLE public.project_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Features - Full Access" ON public.project_features
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TimeLogs - Full Access" ON public.task_time_logs
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_features_project ON public.project_features(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_feature ON public.tasks(feature_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_task ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_employee ON public.task_time_logs(employee_id);
