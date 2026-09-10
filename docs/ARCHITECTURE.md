# UNAI PM CRM — System Architecture & Federated Authentication

This document details the architectural layout, authentication bridge, data flows, and security model of UNAI PM CRM.

---

## 1. Federated Authentication Architecture

UNAI PM CRM does not store work credentials or maintain a standalone user login database. Authentication is federated through the shared **UNAI Onboarding Platform**.

```mermaid
graph TB
    subgraph OP["Onboarding Platform (Central Identity Provider)"]
        AUTH["Supabase Auth<br/>auth.users"]
        PROF["public.profiles<br/>id, work_email, full_name, is_active"]
        GRANTS["public.onboarding_role_grants<br/>auth_user_id, crm_name, crm_role, is_active"]
    end

    subgraph CLIENT["UNAI PM CRM Frontend"]
        LOGIN["Login Screen<br/>Work Email + Password"]
        AUTH_CTX["AuthContext<br/>RBAC Permissions Provider"]
        DATA_CTX["DataContext<br/>State & Mutation Actions"]
    end

    subgraph PM_DB["PM CRM Database"]
        PRJ["projects"]
        DOCS["project_documents"]
        TASKS["tasks"]
        LOGS["task_status_log"]
        AUDIT["audit_log"]
    end

    LOGIN -->|"1. signInWithPassword()"| AUTH
    AUTH -->|"2. Return session + auth.users.id"| LOGIN
    LOGIN -->|"3. Query profile"| PROF
    LOGIN -->|"4. Check grant where crm_name = 'pm_crm'"| GRANTS
    GRANTS -->|"5. Return crm_role"| AUTH_CTX
    AUTH_CTX -->|"6. Initialize user session"| DATA_CTX
    DATA_CTX -->|"7. Live database queries & mutations"| PM_DB
```

---

## 2. Authentication Sequence Flow

```mermaid
sequenceDiagram
    participant User as Employee / CTO
    participant App as PM CRM App
    participant Auth as Supabase Auth (auth.users)
    participant Tables as Onboarding Tables (profiles & role_grants)
    participant PM_DB as PM CRM Supabase

    User->>App: Enter Work Email & Password
    App->>Auth: signInWithPassword({ email, password })
    alt Invalid Credentials
        Auth-->>App: Error: Invalid login credentials
        App-->>User: Display authentication failure message
    else Valid Credentials
        Auth-->>App: AuthSession (user.id = auth_user_id)
        App->>Tables: SELECT * FROM profiles WHERE id = auth_user_id
        Tables-->>App: Profile Record (is_active, full_name, etc.)
        App->>Tables: SELECT * FROM onboarding_role_grants WHERE auth_user_id = auth_user_id AND crm_name = 'pm_crm' AND is_active = true
        alt No PM CRM Grant Found
            Tables-->>App: null / empty
            App-->>User: "Access denied: You do not have an active role grant for PM CRM. Please contact HR."
        else Active PM CRM Grant Found
            Tables-->>App: Grant Record (crm_role: 'CTO' | 'PM' | 'TL' | 'Employee')
            App->>App: Set UserProfile & Role in AuthContext
            App->>PM_DB: Fetch Projects, Documents, Tasks
            PM_DB-->>App: Return Live Records
            App-->>User: Render Authorized CRM Dashboard
        end
    end
```

---

## 3. CRUD & RBAC Matrix (Section 3.2 Specification)

| Entity | CTO (Super Admin) | Project Manager (PM) | Team Lead (TL) | Employee |
|---|---|---|---|---|
| **Projects** | Full CRUD | Read (allocated) | Read (allocated) | Read (allocated) |
| **Project Members** | Full CRUD | Read | Read | Read |
| **Project Documents (16)** | Full CRUD | Update sections | Update sections | Read / Update sections |
| **Tasks** | Full CRUD | Delegate to TL/Dev | Delegate to Dev | Submit work on assigned tasks |
| **Task Verification** | Verify & Close / Reopen | Verify & Close / Reopen | Verify & Close / Reopen | Cannot verify |
| **Audit Ledger** | Full View & Export | Scoped View | Scoped View | Scoped View |
| **Document Export (.docx)** | One-click export all | One-click export all | Single doc export | Single doc export |
