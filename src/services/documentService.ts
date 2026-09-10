import { supabaseClient } from '../lib/supabaseClient';
import { ProjectDocument, DocumentStatus, LifecyclePhase } from '../types';

export function mapDbDocToProjectDocument(dbRow: any): ProjectDocument {
  return {
    id: dbRow.id,
    projectId: dbRow.project_id,
    projectName: dbRow.projects?.name || 'Project',
    templateId: dbRow.doc_type ?? 1,
    docNumber: dbRow.doc_number || 'PL-01',
    name: dbRow.name || 'Document',
    phase: (dbRow.phase as LifecyclePhase) || 'Initiate',
    version: dbRow.version || '1.0',
    status: (dbRow.status as DocumentStatus) || 'Draft',
    completion: dbRow.completion || 0,
    ownerName: dbRow.owner_name || 'Owner',
    ownerId: dbRow.owner_id || '',
    createdAt: dbRow.created_at ? new Date(dbRow.created_at).toLocaleDateString('en-GB') : 'Recently',
    lastUpdated: dbRow.updated_at ? new Date(dbRow.updated_at).toLocaleDateString('en-GB') : 'Today',
    description: `Digitized template #${dbRow.doc_number || ''}`,
    content: dbRow.content || {},
    files: dbRow.files || [],
  };
}

export const documentService = {
  async getDocuments(projectId?: string): Promise<ProjectDocument[]> {
    let query = supabaseClient
      .from('project_documents')
      .select('*, projects(name)')
      .order('doc_type', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching documents from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbDocToProjectDocument);
  },

  async getDocumentById(id: string): Promise<ProjectDocument | null> {
    const { data, error } = await supabaseClient
      .from('project_documents')
      .select('*, projects(name)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching document by ID from Supabase:', error);
      return null;
    }

    return data ? mapDbDocToProjectDocument(data) : null;
  },

  async saveDocumentContent(
    documentId: string,
    content: Record<string, any>,
    actorId: string,
    actorName: string,
    remarks: string = 'Updated form data',
    explicitStatus?: DocumentStatus,
    explicitCompletion?: number
  ): Promise<ProjectDocument> {
    // 1. Fetch current document for versioning
    const current = await this.getDocumentById(documentId);
    if (!current) throw new Error('Document not found');

    const nextVer = (parseFloat(current.version || '1.0') + 0.1).toFixed(1);

    // 2. Save snapshot in document_versions table (immutable history)
    try {
      const { error: verErr } = await supabaseClient.from('document_versions').insert({
        document_id: documentId,
        version_no: current.version,
        snapshot: current.content || {},
        changed_by: actorId,
        changed_by_name: actorName,
        remarks,
      });
      if (verErr) {
        console.warn('Could not record document_versions snapshot (run migration 011 in Supabase if RLS restricted):', verErr.message);
      }
    } catch (verEx) {
      console.warn('Exception recording document_versions snapshot:', verEx);
    }

    // 3. Determine status and completion percentage cleanly
    const isApproved = explicitStatus === 'Approved' || content.cto_approval === 'Approved' || (!content.cto_approval && current.status === 'Approved');
    const isReview = explicitStatus === 'In Review' || content.cto_approval === 'Revisions Requested';
    const status: DocumentStatus = explicitStatus || (isApproved ? 'Approved' : isReview ? 'In Review' : 'In Progress');

    let completion: number;
    if (explicitCompletion !== undefined) {
      completion = explicitCompletion;
    } else if (status === 'Approved') {
      completion = 100;
    } else {
      const totalFields = Object.keys(content).length;
      const filledFields = Object.values(content).filter(
        (val) => val !== '' && val !== null && (!Array.isArray(val) || val.length > 0)
      ).length;
      completion = totalFields > 0 ? Math.min(100, Math.max(15, Math.round((filledFields / totalFields) * 100))) : 30;
    }

    // 4. Update the document row
    const { data, error } = await supabaseClient
      .from('project_documents')
      .update({
        content,
        version: nextVer,
        status,
        completion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, projects(name)')
      .single();

    if (error) {
      console.error('Error saving document content in Supabase:', error);
      throw error;
    }

    // Record approval and emit domain event if newly approved (§13, §75)
    if (status === 'Approved' && current.status !== 'Approved') {
      try {
        const { recordApproval } = await import('./documentWorkflowService');
        await recordApproval(
          documentId,
          null,
          actorId,
          actorName,
          'PM',
          'Approved',
          remarks
        );

        const { processEvent } = await import('./workflowEngine');
        await processEvent({
          eventType: 'DOCUMENT_APPROVED',
          projectId: data.project_id,
          entityType: 'Document',
          entityId: documentId,
          versionId: nextVer,
          documentType: String(data.doc_type),
          actorId,
          actorName,
          actorRole: 'PM',
          organizationId: data.organization_id || '',
          payload: { document: data },
        });
      } catch (evtErr) {
        console.warn('Non-fatal: approval or event emission notice:', evtErr);
      }
    }

    return mapDbDocToProjectDocument(data);
  },

  async updateDocumentStatus(documentId: string, status: DocumentStatus, actorId?: string, actorName?: string): Promise<ProjectDocument> {
    const current = await this.getDocumentById(documentId);

    const { data, error } = await supabaseClient
      .from('project_documents')
      .update({
        status,
        completion: status === 'Approved' ? 100 : status === 'In Review' ? 85 : 50,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, projects(name)')
      .single();

    if (error) {
      console.error('Error updating document status in Supabase:', error);
      throw error;
    }

    if (status === 'Approved' && current?.status !== 'Approved') {
      try {
        const { recordApproval } = await import('./documentWorkflowService');
        await recordApproval(
          documentId,
          null,
          actorId || 'system',
          actorName || 'Supervisor',
          'CTO',
          'Approved',
          'Approved via status update'
        );

        const { processEvent } = await import('./workflowEngine');
        await processEvent({
          eventType: 'DOCUMENT_APPROVED',
          projectId: data.project_id,
          entityType: 'Document',
          entityId: documentId,
          versionId: data.version,
          documentType: String(data.doc_type),
          actorId: actorId || 'system',
          actorName: actorName || 'Supervisor',
          actorRole: 'CTO',
          organizationId: data.organization_id || '',
          payload: { document: data },
        });
      } catch (evtErr) {
        console.warn('Non-fatal: approval or event emission notice:', evtErr);
      }
    }

    return mapDbDocToProjectDocument(data);
  },

  generateAutoFillContent(
    templateId: number,
    project: {
      name: string;
      code: string;
      client: string;
      sponsor: string;
      pmName: string;
      department: string;
      startDate: string;
      targetEndDate: string;
      description: string;
      priority: string;
      lifecyclePhase: string;
    },
    actorName?: string
  ): Record<string, any> {
    const today = new Date().toISOString().split('T')[0];
    const pm = project.pmName || actorName || 'Lead PM';
    const tl = 'Technical Lead';
    const qa = 'QA Lead';

    const baseContent: Record<string, any> = {
      project_name: project.name,
      project_code: project.code,
      client_sponsor: project.client,
      client: project.client,
      primary_sponsor: project.sponsor,
      sponsor: project.sponsor,
      owner: pm,
      prepared_by: pm,
      phase: project.lifecyclePhase || 'Initiate',
      department: project.department || 'Engineering',
      start_date: project.startDate,
      planned_start: project.startDate,
      target_end_date: project.targetEndDate,
      planned_end: project.targetEndDate,
      target_launch: project.targetEndDate,
      executive_summary: project.description || `Enterprise software project ${project.name} developed for ${project.client}.`,
      purpose: project.description || `Formal documentation and execution specifications for ${project.name}.`,
      business_case: `Automate operational workflows, reduce administrative overhead, and deliver secure cloud software for ${project.client}.`,
      risk_classification: project.priority === 'High' ? 'High' : project.priority === 'Medium' ? 'Moderate' : 'Low',
      in_scope: `• Core architecture & database models\n• Client workflow interfaces & APIs\n• Automated governance and security verification`,
      out_of_scope: `• Third-party legacy systems\n• Unapproved custom hardware integrations`,
      assumptions_constraints: `• Cloud infrastructure SLA >= 99.9%\n• Modern web browser client environments`,
      success_criteria: `100% test coverage on critical path, SLA uptime >= 99.9%, and formal client UAT sign-off.`,
      wbs_summary: `Phase 1: Architecture & SRS, Phase 2: Core Engineering Sprints, Phase 3: QA Verification & Deployment.`,
      cto_approval: 'Pending Review',
      approval_date: today,
      approval_notes: 'Document initialized from project baseline parameters.',
    };

    // Add template-specific structured table fields matching DOCUMENT_TEMPLATES
    switch (templateId) {
      case 0: // Master Record
        return {
          ...baseContent,
          milestones_table: [
            { phase: 'Initiate', target_date: project.startDate, deliverable: 'Project Charter & Baseline Approval', owner: pm, status: 'In Progress' },
            { phase: 'Requirements', target_date: project.startDate, deliverable: 'SRS & BRD Sign-off', owner: pm, status: 'Not Started' },
            { phase: 'Design', target_date: project.startDate, deliverable: 'FDS, TDS & Architecture Freeze', owner: tl, status: 'Not Started' },
            { phase: 'Build', target_date: project.targetEndDate, deliverable: 'Sprint Execution & Feature Delivery', owner: tl, status: 'Not Started' },
            { phase: 'Test', target_date: project.targetEndDate, deliverable: 'QA Verification & UAT Sign-off', owner: qa, status: 'Not Started' },
            { phase: 'Release', target_date: project.targetEndDate, deliverable: 'Production Deployment & Cutover', owner: tl, status: 'Not Started' },
          ],
        };

      case 1: // Project Charter
        return {
          ...baseContent,
          objectives_table: [
            { objective: 'Establish cloud CRM platform', target_kpi: '100% milestone compliance', priority: 'High' },
            { objective: 'Automate document-driven governance', target_kpi: 'Zero manual audit paperwork', priority: 'High' },
            { objective: 'Ensure high-availability architecture', target_kpi: '99.9% uptime SLA', priority: 'Medium' },
          ],
          deliverables_table: [
            { deliverable: 'Core Application Architecture', description: 'Database schema, API structure & auth engine', target_date: project.targetEndDate, owner: tl },
            { deliverable: 'Feature Modules Implementation', description: 'Functional components and responsive views', target_date: project.targetEndDate, owner: tl },
            { deliverable: 'QA Verification Suite', description: 'Automated test suite & regression coverage', target_date: project.targetEndDate, owner: qa },
          ],
          milestones_table: [
            { milestone: 'Project Kickoff & Charter Sign-off', target_date: project.startDate, owner: pm },
            { milestone: 'Requirements Lock (SRS & BRD)', target_date: project.startDate, owner: pm },
            { milestone: 'Architecture & Design Freeze', target_date: project.startDate, owner: tl },
            { milestone: 'Sprint Delivery & QA Sign-off', target_date: project.targetEndDate, owner: tl },
            { milestone: 'Production Go-Live & Cutover', target_date: project.targetEndDate, owner: pm },
          ],
          budget_table: [
            { item: 'Engineering Team & Sprint Allocations', estimate: '₹25,00,000', notes: 'Core delivery sprints' },
            { item: 'Cloud Infrastructure & Database Hosting', estimate: '₹2,50,000', notes: 'Supabase & production cloud' },
            { item: 'QA Testing & Automated Tooling', estimate: '₹1,50,000', notes: 'Vitest & Playwright environments' },
          ],
          risks_table: [
            { risk: 'Third-party API rate limits / downtime', impact: 'Moderate', mitigation: 'Local caching and async retry queue' },
            { risk: 'Scope creep during sprint cycles', impact: 'High', mitigation: 'Strict Change Request (CR) governance' },
          ],
          roles_table: [
            { name: project.sponsor, role: 'Executive Sponsor', responsibility: 'Strategic alignment and ROI' },
            { name: pm, role: 'Project Manager', responsibility: 'Sprint delivery & governance' },
            { name: tl, role: 'Tech Lead', responsibility: 'Architecture integrity and technical execution' },
            { name: qa, role: 'QA Lead', responsibility: 'Quality assurance and test verification' },
          ],
        };

      case 2: // Project Plan
        return {
          ...baseContent,
          sprint_cadence: '2 Weeks',
          wbs_table: [
            { code: 'WBS-1.1', task_name: 'Requirements & Scope Finalization', owner: pm, start_date: project.startDate, end_date: project.startDate, dependencies: 'None' },
            { code: 'WBS-1.2', task_name: 'Database Schema & API Specifications', owner: tl, start_date: project.startDate, end_date: project.startDate, dependencies: 'WBS-1.1' },
            { code: 'WBS-1.3', task_name: 'Frontend Components & UX Implementation', owner: tl, start_date: project.startDate, end_date: project.targetEndDate, dependencies: 'WBS-1.2' },
            { code: 'WBS-1.4', task_name: 'QA Testing & UAT Sign-off', owner: qa, start_date: project.targetEndDate, end_date: project.targetEndDate, dependencies: 'WBS-1.3' },
          ],
          resource_table: [
            { role: 'Project Manager', name: pm, allocation: '100%', responsibilities: 'Sprint management and governance' },
            { role: 'Technical Lead', name: tl, allocation: '100%', responsibilities: 'Architecture and technical direction' },
            { role: 'QA Lead', name: qa, allocation: '50%', responsibilities: 'Test strategy and defect management' },
          ],
          critical_path: 'Critical delivery path: Charter Approval -> Architecture Freeze -> Core Sprints -> QA Certification -> Production Launch.',
          comm_table: [
            { meeting: 'Daily Standup', frequency: 'Daily (15 mins)', audience: 'Project Team', owner: pm },
            { meeting: 'Sprint Review & Demo', frequency: 'Bi-Weekly', audience: 'Stakeholders & CTO', owner: pm },
            { meeting: 'Architecture Sync', frequency: 'Weekly', audience: 'Tech Leads & Engineers', owner: tl },
          ],
        };

      case 3: // SRS
        return {
          ...baseContent,
          scope: baseContent.in_scope,
          definitions_table: [
            { term: 'API', definition: 'Application Programming Interface' },
            { term: 'RBAC', definition: 'Role-Based Access Control' },
            { term: 'SLA', definition: 'Service Level Agreement' },
            { term: 'JWT', definition: 'JSON Web Token' },
          ],
          fr_table: [
            { req_id: 'REQ-01', description: 'User Authentication & Role-Based Access Control', priority: 'Must Have', source: 'Project Charter' },
            { req_id: 'REQ-02', description: 'Real-Time Project & Task Management Dashboard', priority: 'Must Have', source: 'Project Charter' },
            { req_id: 'REQ-03', description: 'Automated 16 Lifecycle Governance Document Generation', priority: 'Must Have', source: 'Project Charter' },
            { req_id: 'REQ-04', description: 'Change Request (CR) Impact Analysis & Escalation Engine', priority: 'Must Have', source: 'Governance Policy' },
          ],
          fr_workflows: 'All transactions validated on client and server before committing to PostgreSQL database.',
          nfr_table: [
            { category: 'Performance', requirement: 'Page response time < 1.5s', acceptance_criteria: 'Measured under 50 concurrent users' },
            { category: 'Security', requirement: 'Data encrypted in transit and at rest', acceptance_criteria: 'TLS 1.3 and AES-256 validation' },
            { category: 'Availability', requirement: '99.9% uptime monthly', acceptance_criteria: 'Automated monitoring alerts' },
          ],
          interface_requirements: 'Web Application (React/TypeScript), Tailwind CSS design system, Supabase cloud REST/WSS.',
        };

      case 4: // BRD
        return {
          ...baseContent,
          business_problem: baseContent.business_case,
          background: `Organizational context and operational requirements for ${project.client}.`,
          expected_roi: 'Estimated 65% reduction in administrative project coordination overhead and 100% audit readiness.',
          business_reqs_table: [
            { req_id: 'BRD-01', requirement: 'Automated multi-document governance lifecycle', priority: 'High', justification: 'Eliminate manual paperwork' },
            { req_id: 'BRD-02', requirement: 'Supervisor sign-offs and role delegation tracking', priority: 'High', justification: 'Ensure executive accountability' },
            { req_id: 'BRD-03', requirement: 'Realtime task delivery and time tracking logs', priority: 'Medium', justification: 'Transparent sprint monitoring' },
          ],
          stakeholders_table: [
            { name: project.client, role: 'Client Stakeholder', department: project.department },
            { name: project.sponsor, role: 'Executive Sponsor', department: 'Executive Leadership' },
            { name: pm, role: 'Project Manager', department: 'Management' },
          ],
          assumptions: baseContent.assumptions_constraints,
          constraints: baseContent.out_of_scope,
        };

      case 5: // Functional Specification
        return {
          ...baseContent,
          overview: baseContent.description,
          func_reqs_table: [
            { func_id: 'FUNC-01', description: 'Multi-Document Ingestion & Parsing Engine', priority: 'High' },
            { func_id: 'FUNC-02', description: 'Smart Task Delegation with 5-Factor Composite Scoring', priority: 'High' },
            { func_id: 'FUNC-03', description: 'Executive Change Request Approval Inbox & Impact Analysis', priority: 'High' },
          ],
          roles_permissions_table: [
            { role: 'Executive / CTO', permissions: 'Full project oversight, document sign-off, change approval', notes: 'System-wide authority' },
            { role: 'Project Manager', permissions: 'Sprint management, task delegation, status reporting', notes: 'Project scope' },
            { role: 'Tech Lead / Developer', permissions: 'Code implementation, technical task execution', notes: 'Assigned modules' },
          ],
          use_cases_table: [
            { use_case_id: 'UC-01', actor: 'Authenticated User', description: 'Access project dashboard and view real-time status', preconditions: 'Active user session', expected_outcome: 'Dashboard loads with current metrics' },
            { use_case_id: 'UC-02', actor: 'Project Manager', description: 'Auto-fill and download governance Word documents', preconditions: 'PM role authorized', expected_outcome: 'Formatted .docx generated and exported' },
          ],
          workflow_process: 'All state changes flow through domain event bus and immutable audit ledger.',
        };

      case 6: // Technical Specification
        return {
          ...baseContent,
          overview: `Technical engineering specification for ${project.name}.`,
          tech_stack_table: [
            { layer: 'Frontend Layer', technology: 'React + TypeScript + Tailwind CSS', version: 'Latest Stable', notes: 'Single Page Application' },
            { layer: 'Backend / API', technology: 'Supabase Serverless / Edge Functions', version: 'Managed Cloud', notes: 'REST & Realtime WSS' },
            { layer: 'Database', technology: 'PostgreSQL 15+', version: 'Cloud Hosted', notes: 'Row-Level Security & JSONB' },
            { layer: 'Export Engine', technology: 'docx & file-saver', version: 'Client Side', notes: 'Formatted DOCX generation' },
          ],
          components_table: [
            { component: 'Auth & Profile Service', responsibility: 'Session validation, RBAC, and org membership', dependencies: 'Supabase Auth' },
            { component: 'Document Engine', responsibility: 'Lifecycle templates, auto-fill cascading, Word export', dependencies: 'PostgreSQL' },
            { component: 'CR & Delegation Engine', responsibility: 'Impact calculation, composite scoring, escalation routing', dependencies: 'Workflow Engine' },
          ],
          data_model: 'Relational schema with UUID primary keys, foreign key constraints, JSONB payloads, and audit triggers.',
          api_table: [
            { endpoint: '/rest/v1/projects', method: 'GET/POST', description: 'Project CRUD and metadata', request_response: '{ id, name, ... } -> { data }' },
            { endpoint: '/rest/v1/project_documents', method: 'GET/POST/PATCH', description: 'Document content snapshots and statuses', request_response: '{ content, version, ... } -> { data }' },
            { endpoint: '/rest/v1/tasks', method: 'GET/POST/PATCH', description: 'Task delegation and execution tracking', request_response: '{ title, assigned_to, ... } -> { data }' },
          ],
          security_considerations: 'TLS 1.3 encryption in transit, AES-256 at rest, Row-Level Security policies, and immutable audit logging.',
        };

      case 7: // Architecture Document
        return {
          ...baseContent,
          system_overview: `Decoupled cloud architecture connecting client UI with managed backend and database.`,
          architecture_diagram: 'Client (SPA) <---> HTTPS/WSS <---> Supabase API Gateway <---> PostgreSQL Database',
          components_table: [
            { component: 'Frontend Client', description: 'Interactive React application', technology: 'React / Vite', owner: tl },
            { component: 'Backend Services', description: 'Edge functions & Realtime bus', technology: 'Supabase', owner: tl },
            { component: 'Data Storage', description: 'Relational database with RLS', technology: 'PostgreSQL', owner: tl },
          ],
          data_flow: 'User Action -> Client Validation -> Encrypted API Call -> Row-Level Security Check -> Database Write -> Realtime Broadcast.',
          tech_stack_table: [
            { layer: 'Presentation', technology: 'React + TypeScript + Tailwind CSS' },
            { layer: 'Application', technology: 'Supabase Edge Functions' },
            { layer: 'Data Storage', technology: 'PostgreSQL 15+' },
            { layer: 'Security / Auth', technology: 'Supabase Auth + RLS Policies' },
          ],
          scalability_performance: 'Serverless auto-scaling compute, connection pooling, and optimistic client-side caching.',
          security_architecture: 'Zero-trust architecture, granular Supabase RLS policies, audit trail immutability.',
        };

      case 8: // UI/UX Design Document
        return {
          ...baseContent,
          design_overview: `Visual design system and interface guidelines for ${project.name}.`,
          design_principles: 'Clarity, accessibility, rapid task completion, and responsive viewport support.',
          screens_table: [
            { screen_name: 'Project Overview & Onboarding', description: '4-step onboarding wizard and KPI summary', reference_link: 'Production UI' },
            { screen_name: '16 Document Digitization Grid', description: 'Template management, auto-fill, and Word export', reference_link: 'Production UI' },
            { screen_name: 'Task Delegation & Tracking', description: 'Smart delegation proposals and time logging', reference_link: 'Production UI' },
            { screen_name: 'Change Request Governance Desk', description: 'Impact scoring and CTO escalation inbox', reference_link: 'Production UI' },
          ],
          design_tokens_table: [
            { element: 'Primary Color Palette', specification: '#1E3A8A (Navy), #0D9488 (Teal), #059669 (Emerald)' },
            { element: 'Typography Scale', specification: 'Inter / Outfit sans-serif font hierarchy' },
            { element: 'Border Radius', specification: 'rounded-xl (12px) & rounded-2xl (16px)' },
            { element: 'Iconography', specification: 'Lucide React Stroke Icons' },
          ],
        };

      case 9: // Sprint Plan
        return {
          ...baseContent,
          sprint_number: 'Sprint 1',
          sprint_duration: '2 Weeks (14 Days)',
          sprint_goal: `Deliver foundation architecture, database schemas, and core feature views for ${project.name}.`,
          scrum_master: pm,
          backlog_table: [
            { story_id: 'US-01', user_story: 'As a PM, I want automated document drafting so that governance is instant', priority: 'P0', story_points: '5', assignee: tl, status: 'In Progress' },
            { story_id: 'US-02', user_story: 'As a TL, I want smart delegation recommendations based on developer skills', priority: 'P0', story_points: '5', assignee: tl, status: 'In Progress' },
            { story_id: 'US-03', user_story: 'As a CTO, I want an escalation inbox for high-impact change requests', priority: 'P1', story_points: '3', assignee: pm, status: 'To Do' },
          ],
          capacity_table: [
            { team_member: tl, availability: '10 days', planned_capacity: '40 hrs / 15 pts' },
            { team_member: pm, availability: '10 days', planned_capacity: '40 hrs / 5 pts' },
          ],
          execution_table: [
            { feature_name: 'Core Architecture', task_title: 'Implement database schemas and API hooks', subtask_assignee: tl, supervisor: pm, work_duration: '16 hrs', break_delays: '0 hrs', status: 'In Progress' },
          ],
          audit_trail_table: [
            { timestamp: today, task_item: 'Sprint 1 Commitment', action_type: 'Sprint Planning', actor: pm, remarks: 'Sprint plan committed and signed off.' },
          ],
        };

      case 10: // Test Plan
        return {
          ...baseContent,
          test_scope: 'Functional, Integration, Performance, and Security testing across all application modules.',
          test_strategy: 'Automated unit tests with Vitest, end-to-end user workflows with Playwright, and manual exploratory testing.',
          test_env_table: [
            { environment: 'Staging / QA', configuration: 'Production-replica database & staging endpoints', purpose: 'Full regression & acceptance testing' },
            { environment: 'Production', configuration: 'Live production infrastructure', purpose: 'Post-deploy smoke verification' },
          ],
          entry_exit_criteria: 'Entry: TypeScript compiles with 0 errors, unit test suite passes.\nExit: 100% test execution, 0 open Sev-1 or Sev-2 defects.',
          roles_table: [
            { name: qa, role: 'QA Lead', responsibility: 'Test strategy, test execution, defect triage' },
            { name: tl, role: 'Tech Lead', responsibility: 'Bug fixes and technical support' },
            { name: pm, role: 'Project Manager', responsibility: 'Sign-off and milestone tracking' },
          ],
          test_schedule_table: [
            { test_phase: 'Unit & Integration Testing', start_date: project.startDate, end_date: project.targetEndDate },
            { test_phase: 'User Acceptance Testing (UAT)', start_date: project.targetEndDate, end_date: project.targetEndDate },
          ],
        };

      case 11: // Test Cases
        return {
          ...baseContent,
          module_name: project.name,
          test_cases_table: [
            { test_case_id: 'TC-01', description: 'Verify user login and role permission boundaries', pre_conditions: 'Valid user credentials', test_steps: '1. Enter email/password\n2. Click Login\n3. Verify role dashboard', expected_result: 'Redirected to appropriate role interface', actual_result: 'Pass', status: 'Pass' },
            { test_case_id: 'TC-02', description: 'Verify 16 document auto-fill and DOCX export', pre_conditions: 'Project created with parameters', test_steps: '1. Select Document\n2. Click Download\n3. Inspect generated Word file', expected_result: 'DOCX downloads with filled tables', actual_result: 'Pass', status: 'Pass' },
            { test_case_id: 'TC-03', description: 'Verify Change Request impact analysis calculation', pre_conditions: 'CR created with cost/schedule changes', test_steps: '1. Submit CR\n2. Check impact badge', expected_result: 'Impact level and escalation route correctly calculated', actual_result: 'Pass', status: 'Pass' },
          ],
        };

      case 12: // UAT Sign-off
        return {
          ...baseContent,
          uat_round: 'Round 1 (Final)',
          uat_summary: `User Acceptance Testing completed by ${project.client} stakeholders with full feature verification.`,
          scenarios_table: [
            { scenario_id: 'UAT-01', description: 'End-to-end project creation and onboarding flow', status: 'Accepted', comments: 'Meets all client requirements' },
            { scenario_id: 'UAT-02', description: 'Document generation and Word export validation', status: 'Accepted', comments: 'Formatting verified' },
            { scenario_id: 'UAT-03', description: 'Task delegation and execution tracking', status: 'Accepted', comments: 'Workflow operating smoothly' },
          ],
          issues_table: [
            { issue_id: 'ISS-01', description: 'Minor UI label clarity', severity: 'Minor', status: 'Resolved', owner: tl },
          ],
          sign_off_declaration: 'The business team confirms that the software meets user acceptance criteria and is ready for production launch.',
        };

      case 13: // Deployment Checklist
        return {
          ...baseContent,
          release_version: 'v1.0.0-PROD',
          deployment_date: project.targetEndDate,
          deployment_owner: tl,
          pre_deployment_table: [
            { item: 'Database migrations verified in staging', status: 'Ready', owner: tl, remarks: 'Schema up to date' },
            { item: 'Environment variables configured in production', status: 'Ready', owner: tl, remarks: 'Verified secrets' },
            { item: 'SSL / Domain routing active', status: 'Ready', owner: tl, remarks: 'TLS 1.3 enabled' },
          ],
          deployment_steps_table: [
            { step_no: '1', action: 'Build and package production assets', owner: 'CI/CD', status: 'Completed' },
            { step_no: '2', action: 'Run DB schema migrations', owner: tl, status: 'Completed' },
            { step_no: '3', action: 'Deploy frontend & edge workers', owner: tl, status: 'Completed' },
            { step_no: '4', action: 'Run smoke verification suite', owner: qa, status: 'Completed' },
          ],
          post_deployment_table: [
            { item: 'Health check endpoint returns 200 OK', status: 'Verified', verified_by: qa },
            { item: 'Realtime WebSocket connections active', status: 'Verified', verified_by: tl },
            { item: 'Audit logging active', status: 'Verified', verified_by: pm },
          ],
          rollback_plan: 'In the event of Sev-1 failure: 1. Revert DNS traffic to previous deployment. 2. Restore database snapshot if schema modified. 3. Notify CTO & stakeholders within 15 minutes.',
        };

      case 14: // Go-Live Checklist
        return {
          ...baseContent,
          go_live_date: project.targetEndDate,
          readiness_table: [
            { item: 'QA & UAT Sign-offs completed', status: 'Go', owner: pm, remarks: '100% passed' },
            { item: 'Production environment healthy & verified', status: 'Go', owner: tl, remarks: 'All services green' },
            { item: 'Support team briefed on escalation procedures', status: 'Go', owner: pm, remarks: 'On-call roster ready' },
          ],
          comm_plan_table: [
            { audience: 'Client Stakeholders', message: 'System launch announcement & login details', channel: 'Email / Portal', owner: pm },
            { audience: 'Internal Team', message: 'Hypercare monitoring active', channel: 'Slack / CRM', owner: tl },
          ],
          support_plan: '24/7 hypercare support for first 14 days following launch. Dedicated Slack channel & emergency phone line.',
          go_no_go_decision: 'GO — Certified for Production Launch. All readiness criteria satisfied.',
        };

      case 15: // Maintenance Plan
        return {
          ...baseContent,
          maintenance_scope: `Post-launch operational maintenance, patching, backup verification, and SLA adherence for ${project.name}.`,
          schedule_table: [
            { activity: 'Database backup verification & WAL check', frequency: 'Daily', owner: tl },
            { activity: 'Security patches & dependency updates', frequency: 'Monthly', owner: tl },
            { activity: 'Performance & SLA review', frequency: 'Monthly', owner: pm },
          ],
          sla_table: [
            { severity: 'Critical (Sev-1)', response_time: '< 1 Hour', resolution_time: '< 6 Hours' },
            { severity: 'Major (Sev-2)', response_time: '< 4 Hours', resolution_time: '< 24 Hours' },
            { severity: 'Minor (Sev-3)', response_time: '< 1 Business Day', resolution_time: '< 5 Business Days' },
          ],
          escalation_table: [
            { level: 'Level 1: Support Desk', contact: 'support@unai.tech', role: 'First Responder', escalation_time: 'Immediate' },
            { level: 'Level 2: Tech Lead', contact: tl, role: 'Engineering Lead', escalation_time: '1 Hour' },
            { level: 'Level 3: CTO Office', contact: 'cto@unai.tech', role: 'Executive Escalation', escalation_time: '2 Hours' },
          ],
          change_management_process: 'All changes follow formal Change Request (CR) governance with impact analysis, rollback plan, and PM/CTO approval.',
        };

      default:
        return baseContent;
    }
  },

  async autoFillAndSaveDocument(
    documentId: string,
    templateId: number,
    project: any,
    actorId: string,
    actorName: string
  ): Promise<ProjectDocument> {
    const autoContent = this.generateAutoFillContent(templateId, project, actorName);
    
    // Fetch existing document to merge content
    const existing = await this.getDocumentById(documentId);
    const mergedContent = {
      ...autoContent,
      ...(existing?.content || {}),
    };

    return this.saveDocumentContent(
      documentId,
      mergedContent,
      actorId,
      actorName,
      `Auto-filled template from Project "${project.name}" parameters`
    );
  },

  /**
   * Autosaves document draft directly to Supabase cloud without incrementing formal version
   * or spamming document_versions table.
   */
  async autosaveDocumentDraft(
    documentId: string,
    content: Record<string, any>,
    actorId?: string,
    actorName?: string,
    completionPercentage?: number
  ): Promise<ProjectDocument> {
    const totalFields = Object.keys(content).filter((k) => !k.startsWith('_')).length;
    const filledFields = Object.entries(content).filter(
      ([k, val]) =>
        !k.startsWith('_') &&
        val !== '' &&
        val !== null &&
        (!Array.isArray(val) || val.length > 0)
    ).length;

    const completion =
      completionPercentage !== undefined
        ? completionPercentage
        : totalFields > 0
        ? Math.min(95, Math.max(10, Math.round((filledFields / totalFields) * 100)))
        : 20;

    const { data, error } = await supabaseClient
      .from('project_documents')
      .update({
        content,
        completion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, projects(name)')
      .single();

    if (error) {
      console.warn('[DocumentService] Autosave draft notice in Supabase:', error.message);
      throw error;
    }

    return mapDbDocToProjectDocument(data);
  }
};
