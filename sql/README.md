# UNAI PM CRM — SQL Migrations

## Folder Structure

```
sql/
├── UNIFIED_MASTER_SCHEMA.sql      # Complete master schema containing core tables + RLS + storage
├── 001_master_schema.sql          # Initial schema baseline
├── 002_add_cio_role.sql           # CIO role + organizations
├── 002_feature_tasks_timetracking.sql # Feature tasks and timer logs
├── 003_add_company_details.sql    # Company details enhancement
├── 004_add_avatars_and_first_time_setup.sql # Avatar upload & setup flow
├── 005_fix_rls_infinite_recursion.sql # RLS recursion fix
├── 006_add_document_branding_templates.sql # Watermark and branding templates
├── 007_organization_member_auth_flow.sql # Onboarding auth flow
├── 008_role_based_auth_and_executives.sql # Role based auth
├── 009_fix_org_isolation.sql      # Multi-tenant isolation
├── 010_fix_projects_foreign_keys.sql # Foreign key fixes
├── 011_fix_document_versions_rls.sql # Document versions RLS
├── 012_governance_foundation.sql  # Documentation-driven project governance foundation (~30 tables)
└── README.md                      # This file
```

## How to Use

### Fresh Database Setup
Run `001_master_schema.sql` against your PM CRM Supabase database. This creates all tables, RLS policies, and indexes.

```bash
# Using Supabase CLI
supabase db reset
# Or paste into Supabase Dashboard → SQL Editor
```

### Upgrading Existing Database
Run migration files **in order** starting from the first one you haven't applied:

```bash
# Example: Apply CIO role migration
psql $DATABASE_URL -f sql/002_add_cio_role.sql
```

## Naming Convention
- Files are numbered sequentially: `001_`, `002_`, `003_`, etc.
- Each file is **idempotent** (safe to run multiple times)
- Use `IF NOT EXISTS`, `IF EXISTS`, and `DO $$ ... $$` blocks

## Tables Overview

| # | Table | Purpose |
|---|-------|---------|
| 1 | `organizations` | Company registration & onboarding data |
| 2 | `organization_members` | User ↔ Organization mapping with roles |
| 3 | `employees_cache` | Employee profiles synced from Onboarding Platform |
| 4 | `projects` | Client project records |
| 5 | `project_members` | Project ↔ Employee assignments |
| 6 | `project_documents` | 16 digitized Word document templates |
| 7 | `document_versions` | Document change history snapshots |
| 8 | `tasks` | Deliverable task assignments |
| 9 | `task_reference_files` | Uploaded files attached to tasks |
| 10 | `task_submissions` | Employee task submission records |
| 11 | `task_status_log` | Task status change audit trail |
| 12 | `audit_log` | Immutable system-wide audit ledger |

## Role Hierarchy

| Role | Dashboard | Projects | Documents | Tasks | Team | Reports | Audit | Settings |
|------|-----------|----------|-----------|-------|------|---------|-------|----------|
| **CTO** | ✅ Full | ✅ CRUD | ✅ CRUD | ✅ CRUD + Verify | ✅ Manage | ✅ Export | ✅ View | ✅ Full |
| **CIO** | ✅ Full | ✅ CRUD | ✅ CRUD | ✅ CRUD + Verify | ✅ Manage | ✅ Export | ✅ View | ✅ Full |
| **PM** | ✅ Scoped | ✅ Read | ✅ Edit | ✅ Create + Verify | ✅ Read | ✅ Export | ❌ | ✅ Limited |
| **TL** | ✅ Scoped | ✅ Read | ✅ Edit | ✅ Create + Verify | ✅ Read | ✅ Read | ❌ | ❌ |
| **Employee** | ✅ My Tasks | ✅ Read | ✅ Read | ✅ Submit | ✅ Read | ❌ | ❌ | ❌ |
