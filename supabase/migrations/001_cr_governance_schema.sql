-- =====================================================================
-- UNAI PM CRM — Change Request Governance & Smart Delegation Schema Migration
-- Target: Supabase / Postgres Database Engine
-- Phase 1 Migration
-- =====================================================================

-- 1. GOVERNANCE CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.governance_config (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, config_key)
);

ALTER TABLE public.governance_config ENABLE ROW LEVEL SECURITY;

-- 2. EMPLOYEE SKILL PROFILES (Master Skill Inventory)
CREATE TABLE IF NOT EXISTS public.employee_skill_profiles (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    employee_id VARCHAR(100) REFERENCES public.employees_cache(employee_id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Technical', -- Technical, Domain, Leadership, QA
    proficiency_level INTEGER NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5), -- 1 (Novice) to 5 (Expert)
    years_of_experience NUMERIC(4, 1) DEFAULT 1.0,
    certifications TEXT[] DEFAULT '{}'::TEXT[],
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, skill_name)
);

ALTER TABLE public.employee_skill_profiles ENABLE ROW LEVEL SECURITY;

-- 3. PROJECT SKILL OVERRIDES (TL-editable per-project non-destructive overrides)
CREATE TABLE IF NOT EXISTS public.project_skill_overrides (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) REFERENCES public.employees_cache(employee_id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    override_proficiency INTEGER NOT NULL CHECK (override_proficiency BETWEEN 1 AND 5),
    notes TEXT,
    overridden_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, employee_id, skill_name)
);

ALTER TABLE public.project_skill_overrides ENABLE ROW LEVEL SECURITY;

-- 4. ALTER EXISTING CHANGE REQUESTS TABLE (Migrate in-place)
ALTER TABLE public.change_requests
    ADD COLUMN IF NOT EXISTS cr_type VARCHAR(50) DEFAULT 'Scope',
    ADD COLUMN IF NOT EXISTS severity VARCHAR(30) DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS requires_cto_approval BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS source_document_id VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_version_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS affected_feature_ids TEXT[] DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS affected_task_ids TEXT[] DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS budget_impact_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS budget_impact_pct NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS timeline_impact_days INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS effort_split_ratio NUMERIC(4, 2) DEFAULT 0;

-- 5. CR IMPACT ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS public.cr_impact_analysis (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    change_request_id VARCHAR(100) REFERENCES public.change_requests(id) ON DELETE CASCADE,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analyzed_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    affected_document_ids TEXT[] DEFAULT '{}'::TEXT[],
    affected_feature_ids TEXT[] DEFAULT '{}'::TEXT[],
    affected_task_ids TEXT[] DEFAULT '{}'::TEXT[],
    budget_delta NUMERIC(12, 2) DEFAULT 0,
    timeline_delta_days INTEGER DEFAULT 0,
    risk_score NUMERIC(5, 2) DEFAULT 0,
    requires_cto_approval BOOLEAN DEFAULT false,
    escalation_reasons TEXT[] DEFAULT '{}'::TEXT[],
    traceability_graph JSONB DEFAULT '{}'::jsonb,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai'
);

ALTER TABLE public.cr_impact_analysis ENABLE ROW LEVEL SECURITY;

-- 6. CR APPROVAL DECISIONS TABLE (Multi-Approver Ledger)
CREATE TABLE IF NOT EXISTS public.cr_approval_decisions (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    change_request_id VARCHAR(100) REFERENCES public.change_requests(id) ON DELETE CASCADE,
    approver_id VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    approver_name VARCHAR(255) NOT NULL,
    approver_role VARCHAR(50) NOT NULL, -- PM, CTO, etc.
    decision VARCHAR(50) NOT NULL, -- Approved, Rejected, Changes Requested, Escalated
    comments TEXT,
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai'
);

ALTER TABLE public.cr_approval_decisions ENABLE ROW LEVEL SECURITY;

-- 7. DELEGATION PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.delegation_proposals (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    candidate_employee_id VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    candidate_name VARCHAR(255) NOT NULL,
    rank INTEGER NOT NULL DEFAULT 1,
    composite_score NUMERIC(5, 2) NOT NULL,
    skill_score NUMERIC(5, 2) NOT NULL,
    capacity_score NUMERIC(5, 2) NOT NULL,
    workload_score NUMERIC(5, 2) NOT NULL,
    experience_score NUMERIC(5, 2) NOT NULL,
    priority_score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Proposed', -- Proposed, Accepted, Overridden, Reassigned
    is_auto_assigned BOOLEAN DEFAULT false,
    override_reason TEXT,
    reviewed_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.delegation_proposals ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- RLS POLICIES FOR GOVERNANCE & DELEGATION
-- =====================================================================

-- Governance Config
CREATE POLICY "Governance Config - CTO & PM read, CTO write" ON public.governance_config
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'CEO')));

-- Employee Skill Profiles
CREATE POLICY "Skills - Read all in organization" ON public.employee_skill_profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Skills - Employees edit own, TL/PM/CTO edit all" ON public.employee_skill_profiles
    FOR ALL TO authenticated
    USING (employee_id = auth.uid()::text OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'TL')));

-- Project Skill Overrides
CREATE POLICY "Skill Overrides - Read project members" ON public.project_skill_overrides
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Skill Overrides - TL PM CTO write" ON public.project_skill_overrides
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'TL')));

-- CR Impact Analysis & Decisions
CREATE POLICY "CR Impact - Read project members" ON public.cr_impact_analysis
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "CR Decisions - Read and write PM/CTO" ON public.cr_approval_decisions
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'CEO')));

-- Delegation Proposals
CREATE POLICY "Delegations - Read project members" ON public.delegation_proposals
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Delegations - TL PM CTO write" ON public.delegation_proposals
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'TL')));
