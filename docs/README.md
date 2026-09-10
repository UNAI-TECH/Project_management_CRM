# UNAI PM CRM — V2 Complete Documentation

UNAI Tech's **Project Management & Paperless Document Platform (PM CRM)** is an enterprise application designed to manage the end-to-end software engineering lifecycle across 16 standardized Word-based templates, backed by real federated authentication and database persistence.

---

## 1. Authentication & Federation Architecture

Authentication is federated through the central **UNAI Onboarding Platform** (`https://ylarmzqfyvpvgxarukpq.supabase.co`):

1. **User Authentication**: Handled by Supabase Auth (`auth.users`).
2. **Profile Resolution**: Looked up from `public.profiles` (`work_email`, `full_name`, `department`, `designation`, `employee_code`, `is_active`).
3. **Role Verification**: Verified against `public.onboarding_role_grants` where `auth_user_id = user.id`, `crm_name = 'pm_crm'`, and `is_active = true`.
4. **Access Enforcement**: If no active grant exists or if the profile is marked inactive, login is rejected with `"Access denied: You do not have an active role grant for PM CRM. Please contact HR."`

---

## 2. Directory Structure

```text
Project_management_CRM/
├── docs/                      # Complete system documentation
│   ├── SOP_MANUAL.md          # Standard Operating Procedure (SOP) Manual
│   ├── DOCUMENT_INGESTION_AND_TASK_FLOW.md # Ingestion, Multi-Split & Task Generation Guide
│   ├── ARCHITECTURE.md        # Authentication sequences & state flow
│   └── DATABASE.md            # Onboarding & PM CRM schema specifications
├── electron/                  # Cross-platform desktop configuration
│   ├── main.cjs               # Main process entry point
│   └── preload.cjs            # Inter-process preload script
├── src/
│   ├── components/
│   │   ├── common/            # Custom UI cards, modals, rings, flat panels
│   │   ├── icons/             # Independent inline SVG icon components
│   │   ├── layout/            # Sticky sidebar & header components
│   │   └── modals/            # Workflow modals (Task Assignment, Verification, Export)
│   ├── context/
│   │   ├── AuthContext.tsx    # Live Onboarding Platform authentication & RBAC
│   │   └── DataContext.tsx    # Live backend data provider
│   ├── services/
│   │   ├── projectService.ts  # Live Supabase project CRUD & auto doc seeding
│   │   ├── documentService.ts # Live document editing & snapshot versioning
│   │   ├── taskService.ts     # Live task delegation, submission & verification
│   │   ├── teamService.ts     # Live project member allocation
│   │   ├── auditService.ts    # Live immutable audit logging
│   │   └── exportService.ts   # Client-side Word (.docx) & PDF generation
│   └── screens/               # Main application views (Dashboard, Projects, Tasks, etc.)
├── supabase/
│   └── schema.sql             # Complete PM CRM database DDL script
└── tailwind.config.js         # Design token configuration
```

---

## 3. Setup & Environment Variables

Configure `.env` in the root directory:

```env
# Central Onboarding Platform (Identity Provider)
VITE_SUPABASE_URL=https://ylarmzqfyvpvgxarukpq.supabase.co
VITE_SUPABASE_ANON_KEY=your_onboarding_platform_anon_key
VITE_CRM_NAME=pm_crm

# Dedicated PM CRM Database (optional; defaults to VITE_SUPABASE_URL)
VITE_PM_CRM_SUPABASE_URL=
VITE_PM_CRM_SUPABASE_ANON_KEY=
```

### Running Locally
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run desktop app via Electron
npm run electron:dev

# Production build
npm run build
```

---

## 4. Key Workflows

- **Project Provisioning**: CTO creates a project → all 16 lifecycle document templates (Master Record through Maintenance Plan) are automatically generated in `project_documents`.
- **Task Delegation Chain**: CTO → PM → TL → Employee.
- **Task Submission & Verification**: Assignee uploads deliverables (notes, files, URLs) → Assigner verifies and closes or reopens with feedback. Every status transition is logged in `task_status_log`.
- **Word Document Export**: Renders dynamic JSON form schemas into formatted `.docx` files using client-side JavaScript.
