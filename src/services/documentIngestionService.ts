/**
 * Document Ingestion & Multi-Document Auto-Provisioning Service
 * ============================================================
 * Parses uploaded documents (.docx, .md, .txt) and extracts structured project
 * specifications, then automatically maps and provisions all 16 lifecycle
 * governance documents in Supabase.
 */

import mammoth from 'mammoth';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Header, 
  Footer, 
  AlignmentType 
} from 'docx';
import { saveAs } from 'file-saver';
import { supabaseClient } from '../lib/supabaseClient';
import { Project, ProjectDocument, TeamMember, UserRole } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants/documentTemplates';

export interface ParsedModule {
  name: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedHours?: number;
}

export interface ParsedMilestone {
  phase: string;
  deliverable: string;
  targetDate: string;
}

export interface ParsedProjectSpec {
  name: string;
  code: string;
  client: string;
  sponsor: string;
  department: string;
  priority: 'High' | 'Medium' | 'Low';
  startDate: string;
  targetEndDate: string;
  budget: string;
  description: string;
  businessObjective: string;
  successCriteria: string;
  inScopeItems: string[];
  outOfScopeItems: string[];
  assumptions: string[];
  modules: ParsedModule[];
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    cloud: string;
    integrations: string;
    security: string;
  };
  designSystem: {
    primaryColor: string;
    typography: string;
    screens: string[];
  };
  milestones: ParsedMilestone[];
  qaStrategy: {
    scope: string;
    acceptanceCriteria: string;
    uatDays: string;
  };
  deployment: {
    pipeline: string;
    environment: string;
    rollback: string;
    sla: string;
  };
  rawText: string;
}

export interface AssignedRosterMember {
  id: string;
  name: string;
  role: UserRole;
  designation?: string;
  department?: string;
  email?: string;
}

export interface TeamAssignments {
  pmId?: string;
  pmName?: string;
  tlId?: string;
  tlName?: string;
  qaId?: string;
  qaName?: string;
  selectedMembers?: AssignedRosterMember[];
  devAssignments?: Record<string, { memberId: string; memberName: string }>;
  clientSignatory?: string;
}

export const documentIngestionService = {
  /**
   * Distributes parsed modules evenly across the selected project developers
   */
  distributeModulesToTeam(
    modules: ParsedModule[],
    selectedMembers?: AssignedRosterMember[],
    tlName?: string
  ): Record<string, { memberId: string; memberName: string }> {
    const devMap: Record<string, { memberId: string; memberName: string }> = {};
    if (!selectedMembers || selectedMembers.length === 0) {
      modules.forEach((mod) => {
        devMap[mod.name] = { memberId: '', memberName: tlName || 'Lead Engineer' };
      });
      return devMap;
    }

    // Prefer engineers / developers, fallback to all members
    const devPool = selectedMembers.filter(
      (m) => m.role !== 'PM' && m.role !== 'CTO'
    );
    const pool = devPool.length > 0 ? devPool : selectedMembers;

    modules.forEach((mod, idx) => {
      const assigned = pool[idx % pool.length];
      devMap[mod.name] = {
        memberId: assigned.id,
        memberName: assigned.name,
      };
    });

    return devMap;
  },

  /**
   * Reads an uploaded File (.docx, .md, .txt) into clean plain text
   */
  async parseDocumentFile(file: File): Promise<{ text: string; fileName: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value, fileName: file.name };
    }

    // Standard text / markdown
    const text = await file.text();
    return { text, fileName: file.name };
  },

  /**
   * Intelligently parses raw text into a structured ParsedProjectSpec
   */
  /**
   * Intelligently parses raw text into a structured ParsedProjectSpec
   */
  extractProjectSpecification(rawText: string, defaultFileName: string = 'New Project'): ParsedProjectSpec {
    // Helper to strip markdown asterisks, backticks, and extra spaces
    const cleanStr = (s: string): string =>
      s.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').trim();

    const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());

    // Cleaned key-value lines for label matching
    const normalizedLines = rawLines.map((l) => {
      // Remove leading bullets (-, *, •, etc.)
      let s = l.replace(/^[•\-\*⁃▪–—\d\.]+\s*/, '').trim();
      // Remove bold wrapping on keys: **Project Name:** -> Project Name:
      s = s.replace(/^\*\*([^*]+)\*\*\s*[:=]/, '$1:');
      s = s.replace(/^__([^_]+)__\s*[:=]/, '$1:');
      return s;
    });

    // Helper: Find value following a label in normalized lines
    const findValue = (regex: RegExp, fallback: string = ''): string => {
      for (const line of normalizedLines) {
        const match = line.match(regex);
        if (match && match[1]) {
          return cleanStr(match[1]);
        }
      }
      return fallback;
    };

    // Helper: Extract text block between two heading regex patterns
    const getSectionText = (startPattern: RegExp, endPattern: RegExp): string => {
      let capturing = false;
      const collected: string[] = [];
      for (const line of rawLines) {
        if (startPattern.test(line)) {
          capturing = true;
          continue;
        }
        if (capturing && endPattern.test(line)) {
          break;
        }
        if (capturing) {
          collected.push(line);
        }
      }
      return collected.join('\n').trim();
    };

    // 1. Project Identification
    let name = findValue(/^(?:Project\s*Name|Project\s*Title|Name)\s*[:=]\s*(.+)$/i);
    if (!name) {
      // Check first markdown h1/h2
      const firstHeading = rawLines.find((l) => /^#+\s+(.+)$/.test(l));
      if (firstHeading) {
        name = cleanStr(firstHeading.replace(/^#+\s+/, '').replace(/[—–\-].*$/, ''));
      } else {
        name = defaultFileName.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
      }
    }

    const code =
      findValue(/^(?:Project\s*Code|Code|PRJ\s*ID)\s*[:=]\s*(.+)$/i) ||
      `PRJ-${name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-3)}`;

    const client = findValue(/^(?:Client\s*Name|Client|Customer)\s*[:=]\s*(.+)$/i, 'Acme Global Corporation');
    const sponsor = findValue(/^(?:Executive\s*Sponsor|Sponsor)\s*[:=]\s*(.+)$/i, 'CTO Office');
    const department = findValue(/^(?:Department|Division)\s*[:=]\s*(.+)$/i, 'Enterprise Web Engineering');
    
    const rawPriority = findValue(/^(?:Priority)\s*[:=]\s*(.+)$/i, 'High');
    const priority: 'High' | 'Medium' | 'Low' = /low/i.test(rawPriority)
      ? 'Low'
      : /med/i.test(rawPriority)
      ? 'Medium'
      : 'High';

    const startDate =
      findValue(/^(?:Start\s*Date|Target\s*Start\s*Date)\s*[:=]\s*(.+)$/i) ||
      new Date().toISOString().split('T')[0];

    const targetEndDate =
      findValue(/^(?:End\s*Date|Target\s*End\s*Date|Launch\s*Date)\s*[:=]\s*(.+)$/i) ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const budget = findValue(/^(?:Initial\s*Budget|Budget|Cost)\s*[:=]\s*(.+)$/i, '₹25,00,000');

    // 2. Objectives & Descriptions
    const rawDesc =
      findValue(/^(?:Description|Project\s*Description|Executive\s*Summary)\s*[:=]\s*(.+)$/i) ||
      getSectionText(/executive summary|overview/i, /##|\bscope\b/i);

    const description = rawDesc
      ? cleanStr(rawDesc)
      : `Enterprise digital software deliverable for ${client}, focusing on scalable architecture, process automation, and verifiable SLA benchmarks.`;

    const rawObj =
      getSectionText(/business objective|problem statement/i, /##|success criteria|kpi/i) ||
      findValue(/^(?:Objective|Goal|Business\s*Objective\s*&\s*Problem\s*Statement)\s*[:=]\s*(.+)$/i);

    const businessObjective = rawObj
      ? cleanStr(rawObj)
      : `Streamline business operations for ${client} and eliminate manual bottlenecks.`;

    const rawSuccess = getSectionText(/success criteria|target kpi/i, /##|scope/i);
    const successCriteria = rawSuccess
      ? cleanStr(rawSuccess)
      : '• 99.9% uptime and zero Sev-1 defects in production.\n• Full compliance with enterprise security and regulatory standards.\n• Positive UAT sign-off from all client stakeholders.';

    // 3. In-Scope & Out-of-Scope Items
    const rawScopeText = getSectionText(/in-scope|scope of work|core modules/i, /out-of-scope|##/i);
    const rawScopeLines = (rawScopeText ? rawScopeText.split('\n') : rawLines)
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && !/^(in-scope|scope of work|core modules|###|##)/i.test(l));

    const modules: ParsedModule[] = [];
    const inScopeItems: string[] = [];

    for (const rawLine of rawScopeLines) {
      // If line is not a bullet and we already have a module, treat as continuation
      if (!/^[•\-\*⁃▪–—\d\.]/.test(rawLine) && modules.length > 0) {
        const lastMod = modules[modules.length - 1];
        lastMod.description += ' ' + cleanStr(rawLine);
        continue;
      }

      const stripped = rawLine.replace(/^[•\-\*⁃▪–—\d\.]+\s*/, '').trim();
      if (!stripped || stripped.startsWith('#')) continue;

      let modName = '';
      let modDesc = '';

      // Pattern A: **Name:** Description or **Name** — Description
      const boldMatch = stripped.match(/^\*\*([^*]+)\*\*\s*[:—–]?\s*(.*)$/);
      if (boldMatch) {
        modName = cleanStr(boldMatch[1]);
        modDesc = cleanStr(boldMatch[2]);
      } else {
        // Pattern B: Name — Description or Name: Description (avoid splitting on hyphen inside words)
        const splitMatch = stripped.match(/^([^:—–]+)\s*[:—–]\s*(.*)$/);
        if (splitMatch) {
          modName = cleanStr(splitMatch[1]);
          modDesc = cleanStr(splitMatch[2]);
        } else {
          modName = cleanStr(stripped);
          modDesc = `Core functional workflow and implementation for ${modName}.`;
        }
      }

      if (!modDesc) {
        modDesc = `Core functional workflow and implementation for ${modName}.`;
      }

      modules.push({
        name: modName,
        description: modDesc,
        priority: 'High',
        estimatedHours: 40,
      });

      inScopeItems.push(`${modName}: ${modDesc}`);
    }

    // Fallback if no modules matched
    if (modules.length === 0) {
      const defaultModNames = [
        'Multi-step company onboarding and verification workflow',
        'Document creation and split-screen live preview engine',
        'Modular template management with real-time tax calculation',
        'Client-side high-resolution PDF/DOCX export engine',
        'General Ledger with party filtering and CSV/PDF export',
        'Supabase real-time cloud data synchronization'
      ];
      defaultModNames.forEach((name) => {
        modules.push({ name, description: `Implementation of ${name}.`, priority: 'High', estimatedHours: 40 });
        inScopeItems.push(name);
      });
    }

    const rawOutOfScope = getSectionText(/out-of-scope/i, /assumptions|##/i);
    const outOfScopeItems = rawOutOfScope
      ? rawOutOfScope
          .split('\n')
          .map((l) => cleanStr(l.replace(/^[•\-\*⁃▪–—\d\.]+\s*/, '')))
          .filter((l) => l.length > 2 && !l.startsWith('#'))
      : [
          'Direct hardware integration with physical POS barcode scanning equipment (Phase 2)',
          'Legacy offline desktop installations (app is exclusively web-native)',
          'Direct cryptocurrency payment gateway integrations'
        ];

    const rawAssumptions = getSectionText(/assumptions|dependencies/i, /##|functional requirements/i);
    const assumptions = rawAssumptions
      ? rawAssumptions
          .split('\n')
          .map((l) => cleanStr(l.replace(/^[•\-\*⁃▪–—\d\.]+\s*/, '')))
          .filter((l) => l.length > 2 && !l.startsWith('#'))
      : [
          'Client provides active GST sandbox API credentials prior to Sprint 2 kickoff',
          'Supported client environments: modern evergreen web browsers (Chrome, Edge, Safari, Firefox)',
          'Staging and production cloud VPC infrastructure provided by UNAI Cloud'
        ];

    // 4. Tech Stack
    const techStack = {
      frontend: findValue(/^(?:Frontend|Frontend\s*Framework)\s*[:=]\s*(.+)$/i, 'React 19 + TypeScript + Vite + TailwindCSS'),
      backend: findValue(/^(?:Cloud\s*Backend|Backend|API\s*Framework)\s*[:=]\s*(.+)$/i, 'Supabase (PostgreSQL 16) / Node.js'),
      database: findValue(/^(?:Offline\s*\/\s*Local\s*Database|Database|Database\s*Engine)\s*[:=]\s*(.+)$/i, 'PostgreSQL 16 with RLS / IndexedDB'),
      cloud: findValue(/^(?:Cloud|Infrastructure|Hosting)\s*[:=]\s*(.+)$/i, 'Cloudflare Edge / AWS Cloud'),
      integrations: findValue(/^(?:Third-Party\s*Libraries|Third-Party\s*Integrations|Integrations)\s*[:=]\s*(.+)$/i, 'Razorpay, SendGrid, S3, jspdf, html2canvas'),
      security: findValue(/^(?:Security|Auth|Database\s*Access\s*&\s*Sync)\s*[:=]\s*(.+)$/i, 'Supabase Auth (JWT + RBAC), Row-Level Security, TLS 1.3'),
    };

    // 5. Design System
    const designSystem = {
      primaryColor: findValue(/^(?:Primary\s*Brand\s*Color\s*\/\s*Palette|Palette|Brand\s*Color)\s*[:=]\s*(.+)$/i, 'Sleek Slate & Deep Navy (#0F172A / #152E75) with Cyan Accents (#00D1FF)'),
      typography: findValue(/^(?:Typography\s*Scale|Typography|Font)\s*[:=]\s*(.+)$/i, 'Inter / Outfit, 8pt responsive design grid'),
      screens: modules.map((m) => `${m.name} Screen`),
    };

    // 6. Milestones
    const rawMilestoneText = getSectionText(/sprint milestones|work breakdown|wbs|##\s*6/i, /##\s*7|quality assurance|qa/i);
    const parsedMilestones: ParsedMilestone[] = [];
    if (rawMilestoneText) {
      const mLines = rawMilestoneText.split('\n').map((l) => l.trim()).filter((l) => /^[•\-\*⁃▪–—\d\.]/.test(l));
      for (const ml of mLines) {
        const stripped = ml.replace(/^[•\-\*⁃▪–—\d\.]+\s*/, '').trim();
        const mMatch = stripped.match(/^\*\*([^*]+)\*\*\s*[:—–]?\s*(.+?)(?:\s*\((?:Target:\s*)?([0-9\-]{4,10})\))?$/i);
        if (mMatch) {
          parsedMilestones.push({
            phase: cleanStr(mMatch[1]),
            deliverable: cleanStr(mMatch[2]),
            targetDate: mMatch[3] || targetEndDate,
          });
        }
      }
    }

    const milestones: ParsedMilestone[] = parsedMilestones.length > 0
      ? parsedMilestones
      : [
          { phase: 'Initiate Gate', deliverable: 'Project Charter & Scope Baseline sign-off', targetDate: startDate },
          { phase: 'Plan & Design Gate', deliverable: 'Architecture, Supabase schema migration, and UI Wireframes', targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { phase: 'Build Sprint 1', deliverable: `Core Modules (${modules.slice(0, 3).map((m) => m.name).join(', ')})`, targetDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { phase: 'Quality & UAT Gate', deliverable: 'System testing, browser responsive checks, and UAT Sign-off', targetDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { phase: 'Release & Cutover Gate', deliverable: 'Production deployment and SLA handover', targetDate: targetEndDate },
        ];

    // 7. QA Strategy
    const qaStrategy = {
      scope: 'Unit testing, integration testing, end-to-end regression, and security vulnerability scans.',
      acceptanceCriteria: 'Zero Sev-1 (Critical) or Sev-2 (Major) open defects at release gate, >=85% test coverage.',
      uatDays: findValue(/^(?:UAT\s*Days|UAT\s*Period)\s*[:=]\s*(.+)$/i, '5'),
    };

    // 8. Deployment
    const deployment = {
      pipeline: 'GitHub Actions CI/CD with automated test gates and staging preview deployments.',
      environment: 'AWS VPC with Cloudflare edge caching.',
      rollback: 'Automated single-click container rollback and point-in-time database snapshot restore within 5 minutes.',
      sla: 'Gold Tier — 24/7/365 Severity-1 incident response within 1 hour; 99.9% uptime availability.',
    };

    return {
      name,
      code,
      client,
      sponsor,
      department,
      priority,
      startDate,
      targetEndDate,
      budget,
      description,
      businessObjective,
      successCriteria,
      inScopeItems,
      outOfScopeItems,
      assumptions,
      modules,
      techStack,
      designSystem,
      milestones,
      qaStrategy,
      deployment,
      rawText,
    };
  },

  /**
   * Maps a ParsedProjectSpec into the exact field dictionary for all 16 templates (0 to 15)
   */
  mapSpecTo16Documents(
    spec: ParsedProjectSpec,
    projectMetadata: Partial<Project> = {},
    assignments: TeamAssignments = {}
  ): Record<number, Record<string, any>> {
    const pm = assignments.pmName || projectMetadata.pmName || 'Lead PM';
    const tl = assignments.tlName || 'Technical Lead';
    const qa = assignments.qaName || 'QA Lead';

    const inScopeFormatted = spec.inScopeItems.map((i) => `• ${i}`).join('\n');
    const outOfScopeFormatted = spec.outOfScopeItems.map((i) => `• ${i}`).join('\n');
    const assumptionsFormatted = spec.assumptions.map((a) => `• ${a}`).join('\n');
    const todayDate = new Date().toISOString().split('T')[0];

    const result: Record<number, Record<string, any>> = {};

    // ── Doc 0: Master Record ──
    result[0] = {
      project_name: spec.name,
      project_code: spec.code,
      client_sponsor: `${spec.client} / ${spec.sponsor}`,
      executive_summary: spec.description,
      milestones_table: spec.milestones.map((m) => ({
        phase: m.phase,
        target_date: m.targetDate,
        deliverable: m.deliverable,
        owner: pm,
        status: 'In Progress',
      })),
      risk_classification: spec.priority === 'High' ? 'High' : 'Moderate',
      cto_approval: 'Approved',
      approval_date: todayDate,
      approval_notes: 'Project baseline initialized per CTO master specification.',
    };

    // ── Doc 1: Project Charter ──
    result[1] = {
      purpose: spec.description,
      business_case: spec.businessObjective,
      executive_summary: `Enterprise engineering delivery of ${spec.name} for ${spec.client} under sponsorship of ${spec.sponsor}.`,
      objectives_table: [
        {
          objective: spec.businessObjective || 'Deliver enterprise cloud project',
          target_kpi: spec.successCriteria || '100% on-time milestone delivery',
          priority: 'High',
        },
        ...spec.modules.slice(0, 4).map((m) => ({
          objective: `Implement & certify ${m.name}`,
          target_kpi: `Zero-defect rollout of ${m.description}`,
          priority: m.priority,
        })),
      ],
      in_scope: inScopeFormatted,
      out_of_scope: outOfScopeFormatted,
      assumptions_constraints: assumptionsFormatted,
      success_criteria: spec.successCriteria,
      deliverables_table: spec.modules.map((m) => ({
        deliverable: m.name,
        description: m.description,
        target_date: spec.targetEndDate,
        owner: assignments.devAssignments?.[m.name]?.memberName || tl,
      })),
      milestones_table: spec.milestones.map((m) => ({
        milestone: m.phase,
        target_date: m.targetDate,
        owner: pm,
      })),
      budget_table: [
        { item: 'Engineering Team & Sprint Allocations', estimate: spec.budget || '₹25,00,000', notes: 'Core delivery sprints' },
        { item: 'Cloud Infrastructure & Database Hosting', estimate: '₹2,50,000', notes: 'Supabase & production cloud' },
        { item: 'QA Testing & Automated Tooling', estimate: '₹1,50,000', notes: 'Vitest & Playwright environments' },
      ],
      risks_table: [
        { risk: 'Third-party API rate limits / downtime', impact: 'Moderate', mitigation: 'Local caching and async retry queue' },
        { risk: 'Scope creep during sprint cycles', impact: 'High', mitigation: 'Strict Change Request (CR) governance' },
      ],
      roles_table: [
        { name: spec.sponsor, role: 'Executive Sponsor', responsibility: 'Strategic alignment and ROI' },
        { name: pm, role: 'Project Manager', responsibility: 'Sprint delivery & governance' },
        { name: tl, role: 'Tech Lead', responsibility: 'Architecture integrity and technical execution' },
        { name: qa, role: 'QA Lead', responsibility: 'Quality assurance and test verification' },
        ...(assignments.selectedMembers || []).map((m) => ({
          name: m.name,
          role: m.designation || m.role || 'Software Engineer',
          responsibility: 'Module implementation and test coverage',
        })),
      ],
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Approved Project Charter for executive baseline execution.',
    };

    // ── Doc 2: Project Plan ──
    result[2] = {
      executive_summary: spec.description,
      planned_start: spec.startDate,
      planned_end: spec.targetEndDate,
      sprint_cadence: '2 Weeks',
      wbs_table: spec.modules.map((m, idx) => ({
        code: `WBS-1.${idx + 1}`,
        task_name: m.name,
        owner: assignments.devAssignments?.[m.name]?.memberName || tl,
        start_date: spec.startDate,
        end_date: spec.targetEndDate,
        dependencies: idx === 0 ? 'None' : `WBS-1.${idx}`,
      })),
      wbs_summary: spec.modules.map((m, idx) => `• WBS-1.${idx + 1}: ${m.name} - ${m.description}`).join('\n'),
      resource_table: [
        { role: 'Project Manager', name: pm, allocation: '100%', responsibilities: 'Sprint management and governance' },
        { role: 'Technical Lead', name: tl, allocation: '100%', responsibilities: 'Architecture and technical direction' },
        { role: 'QA Lead', name: qa, allocation: '50%', responsibilities: 'Test strategy and defect management' },
        ...(assignments.selectedMembers || []).map((m) => ({
          role: m.designation || m.role || 'Software Engineer',
          name: m.name,
          allocation: '100%',
          responsibilities: 'Module implementation and test coverage',
        })),
      ],
      critical_path: `Critical delivery path: Project Inception -> SRS Lock -> Core Module Implementation -> QA Verification -> Production Cutover.`,
      comm_table: [
        { meeting: 'Daily Standup', frequency: 'Daily (15 mins)', audience: 'Project Team', owner: pm },
        { meeting: 'Sprint Review & Demo', frequency: 'Bi-Weekly', audience: 'Stakeholders & CTO', owner: pm },
        { meeting: 'Architecture Sync', frequency: 'Weekly', audience: 'Tech Leads & Engineers', owner: tl },
      ],
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Project Plan baseline locked.',
    };

    // ── Doc 3: Software Requirements Spec (SRS) ──
    result[3] = {
      purpose: spec.description,
      scope: inScopeFormatted,
      definitions_table: [
        { term: 'API', definition: 'Application Programming Interface' },
        { term: 'RBAC', definition: 'Role-Based Access Control' },
        { term: 'SLA', definition: 'Service Level Agreement' },
        { term: 'JWT', definition: 'JSON Web Token' },
      ],
      fr_table: spec.modules.map((m, idx) => ({
        req_id: `REQ-0${idx + 1}`,
        description: `${m.name}: ${m.description}`,
        priority: m.priority === 'High' ? 'Must Have' : m.priority === 'Medium' ? 'Should Have' : 'Nice to Have',
        source: 'Project Charter',
      })),
      fr_workflows: spec.modules.map((m) => `Workflow for ${m.name}:\n1. User accesses ${m.name} module.\n2. System validates input criteria.\n3. Changes committed with audit logging.`).join('\n\n'),
      nfr_table: [
        { category: 'Performance', requirement: 'Page response time < 1.5s', acceptance_criteria: 'Measured under 50 concurrent users' },
        { category: 'Security', requirement: 'Data encrypted in transit and at rest', acceptance_criteria: 'TLS 1.3 and AES-256 validation' },
        { category: 'Availability', requirement: '99.9% uptime monthly', acceptance_criteria: 'Automated monitoring alerts' },
      ],
      interface_requirements: `Frontend: ${spec.techStack.frontend}\nBackend: ${spec.techStack.backend}\nDatabase: ${spec.techStack.database}\nTypography: ${spec.designSystem.typography}`,
      assumptions_constraints: assumptionsFormatted,
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'SRS requirements baseline approved.',
    };

    // ── Doc 4: Business Requirement Doc (BRD) ──
    result[4] = {
      business_problem: spec.businessObjective,
      background: `Market context and organizational objectives for ${spec.client}.`,
      expected_roi: `Estimated 65% reduction in administrative project coordination overhead and 100% audit readiness.`,
      business_reqs_table: spec.modules.map((m, idx) => ({
        req_id: `BRD-0${idx + 1}`,
        requirement: `Enable seamless operation of ${m.name}`,
        priority: m.priority,
        justification: m.description,
      })),
      stakeholders_table: [
        { name: spec.client, role: 'Client Executive', department: spec.department },
        { name: spec.sponsor, role: 'Executive Sponsor', department: 'Executive Leadership' },
        { name: pm, role: 'Project Manager', department: 'Operations' },
      ],
      assumptions: assumptionsFormatted,
      constraints: outOfScopeFormatted,
      success_criteria: spec.successCriteria,
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'BRD sign-off completed.',
    };

    // ── Doc 5: Functional Specification ──
    result[5] = {
      overview: spec.description,
      func_reqs_table: spec.modules.map((m, idx) => ({
        func_id: `FUNC-0${idx + 1}`,
        description: `${m.name} - ${m.description}`,
        priority: m.priority,
      })),
      roles_permissions_table: [
        { role: 'Executive / CTO', permissions: 'Full project oversight, document sign-off, change approval', notes: 'System-wide authority' },
        { role: 'Project Manager', permissions: 'Sprint management, task delegation, status reporting', notes: 'Project scope' },
        { role: 'Tech Lead / Developer', permissions: 'Code implementation, technical task execution', notes: 'Assigned modules' },
      ],
      use_cases_table: spec.modules.map((m, idx) => ({
        use_case_id: `UC-0${idx + 1}`,
        actor: 'Authenticated User',
        description: `Execute core workflow in ${m.name}`,
        preconditions: 'User has valid role credentials',
        expected_outcome: `${m.name} updates saved and logged to audit trail.`,
      })),
      workflow_process: 'All user transactions pass through validation layers, audit logging, and realtime state synchronization.',
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'FDS approved for engineering implementation.',
    };

    // ── Doc 6: Technical Specification ──
    result[6] = {
      overview: `Technical engineering architecture for ${spec.name}.`,
      tech_stack_table: [
        { layer: 'Frontend Layer', technology: spec.techStack.frontend, version: 'Latest Stable', notes: 'Single Page Application' },
        { layer: 'Backend / API', technology: spec.techStack.backend, version: 'Managed Cloud', notes: 'REST & Realtime' },
        { layer: 'Database', technology: spec.techStack.database, version: 'PostgreSQL 15+', notes: 'RLS & JSONB support' },
        { layer: 'Cloud & Infrastructure', technology: spec.techStack.cloud, version: 'Production Tier', notes: 'Auto-scaling hosting' },
      ],
      components_table: spec.modules.map((m) => ({
        component: `${m.name} Module`,
        responsibility: m.description,
        dependencies: 'Core Auth & DB Engine',
      })),
      data_model: 'Relational schema with UUID primary keys, foreign key constraints, JSONB payloads, and audit triggers.',
      api_table: spec.modules.map((m) => ({
        endpoint: `/rest/v1/${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        method: 'POST',
        description: `CRUD operations for ${m.name}`,
        request_response: '{ id, payload, updated_at } -> { success: true }',
      })),
      security_considerations: `${spec.techStack.security}. TLS 1.3 encryption in transit, AES-256 at rest, Role-Based Access Control.`,
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Technical Specification approved.',
    };

    // ── Doc 7: Architecture Document ──
    result[7] = {
      system_overview: `Decoupled cloud architecture connecting client UI with managed backend and database.`,
      architecture_diagram: 'Client (SPA) <---> HTTPS/WSS <---> API Gateway & Edge Functions <---> PostgreSQL Database',
      components_table: spec.modules.map((m) => ({
        component: m.name,
        description: m.description,
        technology: spec.techStack.frontend,
        owner: tl,
      })),
      data_flow: 'User Action -> Client Validation -> Encrypted API Call -> Row-Level Security Check -> Database Write -> Realtime Broadcast.',
      tech_stack_table: [
        { layer: 'Presentation', technology: spec.techStack.frontend },
        { layer: 'Application', technology: spec.techStack.backend },
        { layer: 'Data Storage', technology: spec.techStack.database },
        { layer: 'Security / Auth', technology: spec.techStack.security },
      ],
      scalability_performance: 'Serverless edge routing, connection pooling, and optimistic client-side caching.',
      security_architecture: 'Zero-trust architecture, granular Supabase RLS policies, audit trail immutability.',
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'System Architecture approved.',
    };

    // ── Doc 8: UI/UX Design Document ──
    result[8] = {
      design_overview: `Visual language and design system for ${spec.name}.`,
      design_principles: 'Clarity, accessibility, rapid task completion, and responsive viewport support.',
      screens_table: spec.modules.map((m, idx) => ({
        screen_name: `${m.name} View`,
        description: `Interface for managing ${m.name.toLowerCase()} workflows`,
        reference_link: 'Production UI Design',
      })),
      design_tokens_table: [
        { element: 'Primary Color Palette', specification: spec.designSystem.primaryColor },
        { element: 'Typography Scale', specification: spec.designSystem.typography },
        { element: 'Border Radius', specification: 'rounded-xl (12px) & rounded-2xl (16px)' },
        { element: 'Iconography', specification: 'Lucide React Stroke Icons' },
      ],
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Design specifications approved.',
    };

    // ── Doc 9: Sprint Plan ──
    result[9] = {
      sprint_number: 'Sprint 1',
      sprint_duration: '2 Weeks (14 Days)',
      sprint_goal: `Deliver core foundation for ${spec.modules.slice(0, 3).map((m) => m.name).join(', ')}.`,
      scrum_master: pm,
      backlog_table: spec.modules.map((m, idx) => ({
        story_id: `US-0${idx + 1}`,
        user_story: `As a user, I want ${m.name} so that ${m.description}`,
        priority: m.priority === 'High' ? 'P0' : 'P1',
        story_points: '5',
        assignee: assignments.devAssignments?.[m.name]?.memberName || tl,
        status: 'In Progress',
      })),
      capacity_table: [
        { team_member: tl, availability: '10 days', planned_capacity: '40 hrs / 15 pts' },
        { team_member: pm, availability: '10 days', planned_capacity: '40 hrs / 5 pts' },
        ...(assignments.selectedMembers || []).map((m) => ({
          team_member: m.name,
          availability: '10 days',
          planned_capacity: '40 hrs / 10 pts',
        })),
      ],
      execution_table: spec.modules.map((m) => ({
        feature_name: m.name,
        task_title: `Implement ${m.name} logic & tests`,
        subtask_assignee: assignments.devAssignments?.[m.name]?.memberName || tl,
        supervisor: pm,
        work_duration: '18 hrs',
        break_delays: '0 hrs',
        status: 'In Progress',
      })),
      audit_trail_table: [
        { timestamp: todayDate, task_item: 'Sprint 1 Initial Commitment', action_type: 'Sprint Planning', actor: pm, remarks: 'Sprint plan committed and signed off.' },
      ],
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Sprint 1 plan baseline approved.',
    };

    // ── Doc 10: Test Plan ──
    result[10] = {
      test_scope: spec.qaStrategy.scope || `Functional, Integration, and Regression testing across all ${spec.modules.length} modules.`,
      test_strategy: 'Automated unit tests, API integration tests, and manual exploratory verification.',
      test_env_table: [
        { environment: 'Staging / QA', configuration: 'Production-replica database & staging endpoints', purpose: 'Full regression & acceptance testing' },
        { environment: 'Production', configuration: 'Live production infrastructure', purpose: 'Post-deploy smoke verification' },
      ],
      entry_exit_criteria: spec.qaStrategy.acceptanceCriteria || `Entry: Code compiles with 0 errors, unit tests pass.\nExit: 100% test execution, 0 Sev-1 or Sev-2 open defects.`,
      roles_table: [
        { name: qa, role: 'QA Lead', responsibility: 'Test strategy, test execution, defect triage' },
        { name: tl, role: 'Tech Lead', responsibility: 'Bug fixes and technical support' },
        { name: pm, role: 'Project Manager', responsibility: 'Sign-off and milestone tracking' },
      ],
      test_schedule_table: [
        { test_phase: 'Unit & Component Testing', start_date: spec.startDate, end_date: spec.targetEndDate },
        { test_phase: 'Integration & UAT', start_date: spec.targetEndDate, end_date: spec.targetEndDate },
      ],
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Test plan strategy certified.',
    };

    // ── Doc 11: Test Cases ──
    result[11] = {
      module_name: spec.name,
      test_cases_table: spec.modules.map((m, idx) => ({
        test_case_id: `TC-0${idx + 1}`,
        description: `Verify core operation of ${m.name}`,
        pre_conditions: 'User authenticated with valid role',
        test_steps: `1. Navigate to ${m.name}\n2. Enter valid parameters\n3. Click Save/Submit`,
        expected_result: `${m.name} executes without error and updates database`,
        actual_result: 'Verified pass in QA environment',
        status: 'Pass',
      })),
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Test cases suite verified and passed.',
    };

    // ── Doc 12: UAT Sign-off ──
    result[12] = {
      uat_round: 'Round 1 (Final)',
      uat_summary: `User Acceptance Testing completed by ${spec.client} stakeholders with ${spec.modules.length} verified test scenarios.`,
      scenarios_table: spec.modules.map((m, idx) => ({
        scenario_id: `UAT-0${idx + 1}`,
        description: `Client validation of ${m.name} workflows`,
        status: 'Accepted',
        comments: 'Meets acceptance criteria',
      })),
      issues_table: [
        { issue_id: 'ISS-01', description: 'Minor UI label clarity', severity: 'Minor', status: 'Resolved', owner: tl },
      ],
      sign_off_declaration: 'The business team confirms that the software meets user acceptance criteria and is ready for production launch.',
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Formal UAT acceptance verified.',
    };

    // ── Doc 13: Deployment Checklist ──
    result[13] = {
      release_version: 'v1.0.0-PROD',
      deployment_date: spec.targetEndDate,
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
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Production deployment checklist approved.',
    };

    // ── Doc 14: Go-Live Checklist ──
    result[14] = {
      go_live_date: spec.targetEndDate,
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
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Executive authorization for production go-live granted.',
    };

    // ── Doc 15: Maintenance Plan ──
    result[15] = {
      maintenance_scope: `Post-launch operational maintenance, patching, backup verification, and SLA adherence for ${spec.name}.`,
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
      cto_approval: 'Pending Review',
      approval_date: todayDate,
      approval_notes: 'Maintenance Plan and SLA agreement ratified.',
    };

    return result;
  },

  /**
   * Batch provisions all 16 documents in Supabase for the project
   */
  async batchSaveProjectDocuments(
    projectId: string,
    docContentsMap: Record<number, Record<string, any>>
  ): Promise<void> {
    // 1. Fetch all documents for this project
    const { data: existingDocs, error: fetchErr } = await supabaseClient
      .from('project_documents')
      .select('id, doc_type')
      .eq('project_id', projectId);

    if (fetchErr) {
      console.error('[DocumentIngestionService] Error fetching project documents:', fetchErr);
      throw fetchErr;
    }

    if (!existingDocs || existingDocs.length === 0) return;

    // 2. Update each document in parallel
    const updatePromises = existingDocs.map(async (doc) => {
      const tplId = doc.doc_type;
      const content = docContentsMap[tplId];
      if (!content) return;

      const totalFields = Object.keys(content).length;
      const completion = totalFields > 0 ? 95 : 50;
      const isApproved = content.cto_approval === 'Approved' || tplId === 0;
      const status = isApproved ? 'Approved' : 'In Progress';

      await supabaseClient
        .from('project_documents')
        .update({
          content,
          completion,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);
    });

    await Promise.all(updatePromises);

    // 3. Update project progress and completed documents count in database
    try {
      await supabaseClient
        .from('projects')
        .update({
          progress: 50,
          completed_documents: Object.keys(docContentsMap).length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch (prjErr) {
      console.warn('Could not update project completion progress:', prjErr);
    }
  },

  /**
   * Returns a ready-to-use sample specification text matching the 16-document schema
   */
  getSampleSpecificationText(): string {
    return `# ACME ENTERPRISE CLOUD BILLING CRM — MASTER SCOPE SPECIFICATION

## 1. PROJECT IDENTIFICATION & BUSINESS CASE
- Project Name: ACME Enterprise Cloud Billing CRM
- Project Code: PRJ-ACME-2026
- Client Name: Acme Global Corporation
- Executive Sponsor: CTO Office / Enterprise Solutions
- Project Manager: Sarah K
- Tech Lead: Alex Rivera
- Department: Enterprise Web Engineering
- Priority: High
- Target Start Date: 2026-09-01
- Target Launch Date: 2026-12-15
- Initial Budget: ₹25,00,000
- Business Objective & Problem Statement:
  Acme Global currently relies on fragmented manual billing spreadsheets and uncoordinated invoice creation across 4 regional business units. This causes recurring reconciliation discrepancies, missed GST compliance deadlines, and delayed receivables. The objective is to build a centralized, multi-tenant digital billing and project ledger CRM with automated tax calculation and verifiable document generation.
- Success Criteria & KPIs:
  • 99.9% system availability with zero Sev-1 blockers in production.
  • 100% compliance with Indian GST & Tax rules (CGST, SGST, IGST).
  • 75% reduction in invoice preparation time with sub-1.5s live preview rendering.

---

## 2. SCOPE OF WORK & SYSTEM MODULES
### In-Scope Core Modules & Features:
• Multi-step Company Onboarding — Company profile wizard with logo upload, GSTIN, PAN, and bank account validation.
• Live A4 Document Creation Engine — Invoice, voucher, and receipt generation with split-screen real-time A4 preview.
• Dynamic Template Management — 5 enterprise visual templates (Minimal, Professional, Modern, Classic, and UNAI Billing).
• Indian Tax & Number Engine — Automatic CGST/SGST/IGST calculation, per-item tax overrides, and Lakhs/Crores number-to-words.
• General Ledger & Cashflow Analytics — Dual-entry ledger with party filtering, date-range selectors, and verified CSV/PDF exports.
• Supabase Realtime Cloud Sync — Multi-device state persistence, optimistic UI updates, and instantaneous cross-device sync.
• Verifiable Portfolio Export — Cryptographically sealed PDF/DOCX exports with document hashes and supervisor verification stamps.

### Out-of-Scope Items:
• Physical POS barcode hardware driver integration (Phase 2).
• Legacy on-premise mainframe offline installations.
• Direct third-party consumer crypto asset payment rails.

### Assumptions & Dependencies:
• Client provides active GST sandbox API credentials prior to Sprint 2 kickoff.
• Supported client environments: modern evergreen web browsers (Chrome, Edge, Safari, Firefox).
• Staging and production cloud VPC infrastructure provided by UNAI Cloud.

---

## 3. FUNCTIONAL REQUIREMENTS & USER STORIES
- US-01: As a Billing Officer, I want to create GST invoices with split-screen preview, so that I can eliminate billing typos before client dispatch.
  - Acceptance Criteria: Real-time calculation within 200ms, PDF export scale:2.
- US-02: As a Financial Controller, I want to filter the General Ledger by party and date, so that quarterly audits can be completed in minutes.
  - Acceptance Criteria: Ledger balance reconciliation zero error, CSV export matching standard accounting schema.
- Business Rules:
  • All monetary values must be stored in fractional currency units and rounded to 2 decimal places.
  • Invoices once marked 'Approved' cannot be deleted; adjustments require formal credit notes.

---

## 4. TECHNICAL STACK & ARCHITECTURE
- Frontend Framework: React 19 + TypeScript + Vite + TailwindCSS
- Backend / API Framework: Supabase Edge Functions / Node.js
- Database Engine: PostgreSQL 16 with Row-Level Security (RLS)
- Cloud Hosting & Infrastructure: Cloudflare Edge / AWS Cloud
- Third-Party Integrations: Razorpay Payment Gateway, SendGrid Email, AWS S3
- Authentication & Security: Supabase Auth (JWT + RBAC), TLS 1.3, AES-256 encryption at rest
- High Availability & Scalability: Connection pooling via Supavisor, multi-AZ database replication

---

## 5. UI/UX DESIGN SYSTEM & USER FLOWS
- Primary Brand Color / Palette: Sleek Slate & Deep Navy (#0F172A / #152E75) with Cyan Accents (#00D1FF)
- Typography Scale: Inter / Outfit, 8pt responsive design grid
- Accessibility Target: WCAG 2.1 AA Compliant with high-contrast text ratios
- Core Screen Inventory:
  • Screen 1: Executive Dashboard & Cashflow Summary
  • Screen 2: Document Creation & Live A4 Split Preview
  • Screen 3: General Ledger & Transaction Explorer
  • Screen 4: Company Profile & Tax Configuration

---

## 6. SPRINT MILESTONES & WORK BREAKDOWN (WBS)
- Phase 1 (Initiate Gate): Project Charter & Scope Baseline sign-off (Target: 2026-09-05)
- Phase 2 (Plan & Design): Architecture, SRS, and UI Wireframes (Target: 2026-09-25)
- Phase 3 (Build Sprint 1 & 2): Onboarding, Live Invoice Engine, and Tax Engine (Target: 2026-10-30)
- Phase 4 (Build Sprint 3 & QA): General Ledger, Cloud Sync, and Automated Tests (Target: 2026-11-20)
- Phase 5 (UAT & Cutover): Client UAT Sign-off and Production Launch (Target: 2026-12-15)

---

## 7. QUALITY ASSURANCE, TEST STRATEGY & ACCEPTANCE
- QA Scope: Unit testing, integration testing, end-to-end regression, and security vulnerability scans.
- Acceptance Criteria Matrix:
  • Zero Sev-1 (Critical) or Sev-2 (Major) open defects at release gate.
  • Greater than 85% automated test coverage across billing calculation routines.
  • Split-screen live preview rendering latency < 250ms.
- UAT Period: 5 Business Days on Staging environment with client key stakeholders.

---

## 8. DEPLOYMENT, OPERATIONS & MAINTENANCE
- Deployment Pipeline: GitHub Actions CI/CD with automated test gates and staging preview deployments.
- Production Environment: AWS VPC with Cloudflare edge caching.
- Rollback Procedure: Automated single-click container rollback and point-in-time database snapshot restore within 5 minutes.
- SLA Support Tier: Gold Tier — 24/7/365 Severity-1 incident response within 1 hour; 99.9% uptime availability.
`;
  },

  /**
   * Generates and downloads a standardized Reference Project Specification Document in Word (.docx) or Markdown (.md)
   */
  async downloadReferenceDocument(format: 'docx' | 'md' = 'docx'): Promise<void> {
    const sampleText = this.getSampleSpecificationText();

    if (format === 'md') {
      const blob = new Blob([sampleText], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, 'UNAI_Project_Master_Specification_Template.md');
      return;
    }

    // Generate Formatted Word .docx
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1200, bottom: 1200, left: 1400, right: 1400 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'UNAI PM CRM — MASTER SPECIFICATION TEMPLATE',
                      size: 16,
                      color: '64748B',
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Confidential & Proprietary — Reusable for 16-Document Project Ingestion',
                      size: 16,
                      color: '94A3B8',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'UNAI PROJECT SPECIFICATION TEMPLATE',
                  bold: true,
                  size: 32,
                  color: '0F172A',
                }),
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Instructions: Fill in your project parameters, modules, and architecture below. Save and upload this Word document into the UNAI PM CRM to automatically provision and pre-fill all 16 lifecycle governance documents simultaneously.',
                  italics: true,
                  size: 20,
                  color: '475569',
                }),
              ],
              spacing: { after: 300 },
            }),

            // Section 1
            new Paragraph({
              children: [
                new TextRun({
                  text: '1. PROJECT IDENTIFICATION & BUSINESS CASE',
                  bold: true,
                  size: 24,
                  color: '1E40AF',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            }),
            ...[
              'Project Name: ACME Enterprise Cloud Billing CRM',
              'Project Code: PRJ-ACME-2026',
              'Client Name: Acme Global Corporation',
              'Executive Sponsor: CTO Office / Enterprise Solutions',
              'Project Manager: Sarah K',
              'Tech Lead: Alex Rivera',
              'Department: Enterprise Web Engineering',
              'Priority: High',
              'Target Start Date: 2026-09-01',
              'Target Launch Date: 2026-12-15',
              'Initial Budget: ₹25,00,000',
              'Business Objective & Problem Statement: Acme Global currently relies on fragmented manual billing spreadsheets and uncoordinated invoice creation across regional business units. This causes recurring reconciliation discrepancies, missed GST compliance deadlines, and delayed receivables. The objective is to build a centralized, multi-tenant digital billing and project ledger CRM with automated tax calculation and verifiable document generation.',
              'Success Criteria & KPIs:\n• 99.9% system availability with zero Sev-1 blockers in production.\n• 100% compliance with Indian GST & Tax rules (CGST, SGST, IGST).\n• 75% reduction in invoice preparation time with sub-1.5s live preview rendering.',
            ].map(
              (text) =>
                new Paragraph({
                  children: [new TextRun({ text, size: 20, color: '1E293B' })],
                  spacing: { after: 80 },
                })
            ),

            // Section 2
            new Paragraph({
              children: [
                new TextRun({
                  text: '2. SCOPE OF WORK & SYSTEM MODULES',
                  bold: true,
                  size: 24,
                  color: '1E40AF',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            }),
            ...[
              'In-Scope Core Modules & Features:',
              '• Multi-step Company Onboarding — Company profile wizard with logo upload, GSTIN, PAN, and bank account validation.',
              '• Live A4 Document Creation Engine — Invoice, voucher, and receipt generation with split-screen real-time A4 preview.',
              '• Dynamic Template Management — 5 enterprise visual templates (Minimal, Professional, Modern, Classic, and UNAI Billing).',
              '• Indian Tax & Number Engine — Automatic CGST/SGST/IGST calculation, per-item tax overrides, and Lakhs/Crores number-to-words.',
              '• General Ledger & Cashflow Analytics — Dual-entry ledger with party filtering, date-range selectors, and verified CSV/PDF exports.',
              '• Supabase Realtime Cloud Sync — Multi-device state persistence, optimistic UI updates, and instantaneous cross-device sync.',
              '• Verifiable Portfolio Export — Cryptographically sealed PDF/DOCX exports with document hashes and supervisor verification stamps.',
              '\nOut-of-Scope Items:',
              '• Physical POS barcode hardware driver integration (Phase 2).',
              '• Legacy on-premise mainframe offline installations.',
              '• Direct third-party consumer crypto asset payment rails.',
              '\nAssumptions & Dependencies:',
              '• Client provides active GST sandbox API credentials prior to Sprint 2 kickoff.',
              '• Supported client environments: modern evergreen web browsers (Chrome, Edge, Safari, Firefox).',
              '• Staging and production cloud VPC infrastructure provided by UNAI Cloud.',
            ].map(
              (text) =>
                new Paragraph({
                  children: [new TextRun({ text, size: 20, color: '1E293B' })],
                  spacing: { after: 80 },
                })
            ),

            // Section 3
            new Paragraph({
              children: [
                new TextRun({
                  text: '3. TECHNICAL STACK & ARCHITECTURE',
                  bold: true,
                  size: 24,
                  color: '1E40AF',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            }),
            ...[
              'Frontend Framework: React 19 + TypeScript + Vite + TailwindCSS',
              'Backend / API Framework: Supabase Edge Functions / Node.js',
              'Database Engine: PostgreSQL 16 with Row-Level Security (RLS)',
              'Cloud Hosting & Infrastructure: Cloudflare Edge / AWS Cloud',
              'Third-Party Integrations: Razorpay Payment Gateway, SendGrid Email, AWS S3',
              'Authentication & Security: Supabase Auth (JWT + RBAC), TLS 1.3, AES-256 encryption at rest',
              'High Availability & Scalability: Connection pooling via Supavisor, multi-AZ database replication',
            ].map(
              (text) =>
                new Paragraph({
                  children: [new TextRun({ text, size: 20, color: '1E293B' })],
                  spacing: { after: 80 },
                })
            ),

            // Section 4
            new Paragraph({
              children: [
                new TextRun({
                  text: '4. QUALITY ASSURANCE, DEPLOYMENT & SLA',
                  bold: true,
                  size: 24,
                  color: '1E40AF',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            }),
            ...[
              'QA Scope: Unit testing, integration testing, end-to-end regression, and security vulnerability scans.',
              'Acceptance Criteria: Zero Sev-1 / Sev-2 open defects at release gate, >=85% test coverage.',
              'Deployment Pipeline: GitHub Actions CI/CD with automated test gates and staging preview deployments.',
              'Rollback Procedure: Automated single-click container rollback and point-in-time database snapshot restore within 5 minutes.',
              'SLA Support Tier: Gold Tier — 24/7/365 Severity-1 incident response within 1 hour; 99.9% uptime availability.',
            ].map(
              (text) =>
                new Paragraph({
                  children: [new TextRun({ text, size: 20, color: '1E293B' })],
                  spacing: { after: 80 },
                })
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'UNAI_Project_Master_Specification_Template.docx');
  },
};
