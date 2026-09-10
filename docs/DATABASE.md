# UNAI PM CRM — Database & Schema Reference

This reference details the relational database schema, tables, properties, and constraints across both the **Onboarding Platform** and **PM CRM** databases.

---

## 1. Onboarding Platform Schema (Central Identity)

The Onboarding Platform defines user identity, profile details, and role grants across all CRMs.

### `public.profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, REFERENCES `auth.users(id)` | User authentication ID |
| `work_email` | TEXT | UNIQUE, NOT NULL | Employee work email address |
| `full_name` | TEXT | NOT NULL | Employee display name |
| `department` | TEXT | | Assigned department |
| `designation` | TEXT | | Employee title / designation |
| `employee_code` | TEXT | UNIQUE | Internal employee badge code |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account status flag |
| `is_hr_admin` | BOOLEAN | NOT NULL, DEFAULT false | HR management permissions |

### `public.onboarding_role_grants`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Grant ID |
| `auth_user_id` | UUID | NOT NULL | References `auth.users(id)` |
| `crm_name` | TEXT | CHECK (`hr_crm`, `finance_crm`, `pm_crm`) | Target CRM |
| `crm_role` | TEXT | NOT NULL | Assigned role (`CTO`, `PM`, `TL`, `Employee`) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Grant status |

---

## 2. PM CRM Database Schema (Application Data)

The PM CRM database manages projects, digitized documents, task lifecycles, and audit logging.

```mermaid
erDiagram
    projects ||--o{ project_members : "allocates"
    projects ||--o{ project_documents : "contains"
    project_documents ||--o{ document_versions : "snapshotted_by"
    projects ||--o{ tasks : "assigned_under"
    project_documents ||--o{ tasks : "linked_to"
    tasks ||--o{ task_status_log : "tracked_by"
    tasks ||--o{ task_submissions : "submitted_via"

    projects {
        string id PK
        string project_code UK
        string name
        string client
        string sponsor
        string status
        string priority
        string start_date
        string target_end_date
        integer progress
        string pm_name
        string pm_id
        text description
        string lifecycle_phase
        timestamp created_at
    }

    project_documents {
        string id PK
        string project_id FK
        integer doc_type
        string doc_number
        string name
        string phase
        string version
        string status
        integer completion
        jsonb content
        timestamp created_at
    }

    tasks {
        string id PK
        string project_id FK
        string doc_id FK
        string title
        text description
        string assigned_by
        string assigned_to
        string status
        string priority
        string due_date
        integer progress
        timestamp created_at
    }

    task_status_log {
        string id PK
        string task_id FK
        string from_status
        string to_status
        string changed_by
        text remarks
        timestamp changed_at
    }

    audit_log {
        string id PK
        timestamp timestamp
        string actor_id
        string actor_name
        string actor_role
        string action
        string entity_type
        string entity_id
        text details
    }
```
