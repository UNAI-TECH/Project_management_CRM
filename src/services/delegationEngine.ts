/**
 * Smart Delegation Engine (§Smart Delegation Engine)
 * ===================================================
 * Replaces naive round-robin allocation with multi-factor weighted delegation scoring:
 *   Composite Score = (Skill * 0.35) + (Capacity * 0.25) + (Workload * 0.20) + (Experience * 0.10) + (Priority * 0.10)
 * 
 * Supports:
 * - Skill match computation against Effective Skills (Master profile + Project overrides)
 * - Cross-project workload balance and availability tracking
 * - Auto-assign when confidence >= threshold, or proposal card for TL review
 * - Mandatory TL override reason recording
 */

import { supabaseClient } from '../lib/supabaseClient';
import type { Task, ProjectFeature, TeamMember, DelegationProposal, DelegationScoreBreakdown } from '../types';
import { skillProfileService, EffectiveSkill } from './skillProfileService';
import { DEFAULT_GOVERNANCE_THRESHOLDS, DelegationScoreWeights } from '../constants/governanceDefaults';

export interface TaskRequirementContext {
  title: string;
  description: string;
  technology?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedHours?: number;
  requiredSkills?: string[];
}

export interface CandidateEvaluation {
  member: TeamMember;
  scores: DelegationScoreBreakdown;
  effectiveSkills: EffectiveSkill[];
}

export const delegationEngine = {
  /**
   * Load governance thresholds & weights from Supabase or fallback to defaults
   */
  async getScoreWeights(orgId: string = 'org-unai'): Promise<DelegationScoreWeights> {
    try {
      const { data } = await supabaseClient
        .from('governance_config')
        .select('config_value')
        .eq('organization_id', orgId)
        .eq('config_key', 'DELEGATION_SCORE_WEIGHTS')
        .maybeSingle();

      if (data?.config_value) {
        return {
          skill: Number(data.config_value.skill ?? DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights.skill),
          capacity: Number(data.config_value.capacity ?? DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights.capacity),
          workload: Number(data.config_value.workload ?? DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights.workload),
          experience: Number(data.config_value.experience ?? DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights.experience),
          priority: Number(data.config_value.priority ?? DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights.priority),
        };
      }
    } catch (err) {
      console.warn('[DelegationEngine] Weight fetch notice, using defaults:', err);
    }
    return DEFAULT_GOVERNANCE_THRESHOLDS.scoreWeights;
  },

  /**
   * Extract required skills from task/feature text & technology fields
   */
  extractRequiredSkills(context: TaskRequirementContext): string[] {
    if (context.requiredSkills && context.requiredSkills.length > 0) {
      return context.requiredSkills;
    }

    const textToScan = `${context.title} ${context.description} ${context.technology || ''}`.toLowerCase();
    const taxonomy = skillProfileService.getSeedTaxonomy();
    const matched: string[] = [];

    taxonomy.forEach((item) => {
      const sName = item.name.toLowerCase();
      if (textToScan.includes(sName) || (sName === 'react' && textToScan.includes('frontend')) || (sName === 'node.js' && textToScan.includes('backend'))) {
        matched.push(item.name);
      }
    });

    if (matched.length === 0) {
      // Default domain inference
      if (textToScan.includes('test') || textToScan.includes('qa')) matched.push('Manual Testing');
      else if (textToScan.includes('api') || textToScan.includes('database') || textToScan.includes('schema')) matched.push('REST APIs', 'PostgreSQL');
      else if (textToScan.includes('ui') || textToScan.includes('screen') || textToScan.includes('figma')) matched.push('React', 'Tailwind CSS');
      else matched.push('TypeScript', 'React');
    }

    return Array.from(new Set(matched));
  },

  /**
   * Compute Skill Match Score (0 - 100)
   */
  computeSkillScore(effectiveSkills: EffectiveSkill[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 70; // Baseline neutral if no skill requirement

    let matchedSum = 0;
    const skillMap = new Map<string, EffectiveSkill>();
    effectiveSkills.forEach((s) => skillMap.set(s.skillName.toLowerCase(), s));

    requiredSkills.forEach((req) => {
      const match = skillMap.get(req.toLowerCase());
      if (match) {
        // Proficiency is 1-5 -> 20, 40, 60, 80, 100
        matchedSum += match.proficiencyLevel * 20;
      } else {
        matchedSum += 10; // Nominal credit for general developer
      }
    });

    return Math.min(100, Math.round(matchedSum / requiredSkills.length));
  },

  /**
   * Compute Capacity Score (0 - 100)
   * Higher score = more available capacity in sprint/hours
   */
  async computeCapacityScore(employeeId: string, projectId: string): Promise<number> {
    try {
      const { data: openTasks } = await supabaseClient
        .from('tasks')
        .select('id, estimated_hours, status')
        .eq('assigned_to', employeeId)
        .in('status', ['Open', 'In Progress', 'Blocked']);

      const activeCount = openTasks?.length || 0;
      const totalEstimatedHours = (openTasks || []).reduce((acc: number, t: any) => acc + (Number(t.estimated_hours) || 8), 0);

      // Standard sprint capacity benchmark: 40 hours / 5 active tasks
      if (activeCount === 0) return 100;
      if (totalEstimatedHours >= 40) return 20;
      if (totalEstimatedHours >= 30) return 40;
      if (totalEstimatedHours >= 20) return 65;
      if (totalEstimatedHours >= 10) return 85;
      return 95;
    } catch {
      return 70;
    }
  },

  /**
   * Compute Workload Score (0 - 100)
   * Cross-project active task balance (inversely proportional to load)
   */
  async computeWorkloadScore(employeeId: string): Promise<number> {
    try {
      const { count } = await supabaseClient
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', employeeId)
        .in('status', ['Open', 'In Progress']);

      const load = count || 0;
      if (load === 0) return 100;
      if (load === 1) return 90;
      if (load === 2) return 80;
      if (load === 3) return 65;
      if (load === 4) return 50;
      if (load >= 5) return 25;
      return 60;
    } catch {
      return 70;
    }
  },

  /**
   * Compute Experience Score (0 - 100)
   */
  computeExperienceScore(effectiveSkills: EffectiveSkill[], member: TeamMember): number {
    const avgExpYears = effectiveSkills.length > 0
      ? effectiveSkills.reduce((acc, s) => acc + s.yearsOfExperience, 0) / effectiveSkills.length
      : 2;

    const des = (member.designation || '').toLowerCase();
    let bonus = 0;
    if (des.includes('lead') || des.includes('principal') || des.includes('senior') || des.includes('architect')) {
      bonus = 25;
    } else if (des.includes('mid') || des.includes('engineer 2')) {
      bonus = 15;
    }

    const expBase = Math.min(75, Math.round(avgExpYears * 12));
    return Math.min(100, expBase + bonus);
  },

  /**
   * Compute Priority Score (0 - 100)
   * High/Critical tasks get higher priority alignment when routed to senior/expert candidates
   */
  computePriorityScore(priority: 'Critical' | 'High' | 'Medium' | 'Low', skillScore: number): number {
    if (priority === 'Critical') {
      return skillScore >= 80 ? 100 : skillScore >= 60 ? 70 : 40;
    }
    if (priority === 'High') {
      return skillScore >= 70 ? 95 : 75;
    }
    if (priority === 'Medium') {
      return 80;
    }
    return 90; // Low priority can be handled by anyone
  },

  /**
   * Evaluate a single candidate for a task
   */
  async evaluateCandidate(
    member: TeamMember,
    context: TaskRequirementContext,
    projectId: string,
    weights: DelegationScoreWeights,
    orgId: string = 'org-unai'
  ): Promise<CandidateEvaluation> {
    const effectiveSkills = await skillProfileService.getEffectiveSkills(member.id, projectId, orgId);
    const requiredSkills = this.extractRequiredSkills(context);

    const skillScore = this.computeSkillScore(effectiveSkills, requiredSkills);
    const capacityScore = await this.computeCapacityScore(member.id, projectId);
    const workloadScore = await this.computeWorkloadScore(member.id);
    const experienceScore = this.computeExperienceScore(effectiveSkills, member);
    const priorityScore = this.computePriorityScore(context.priority, skillScore);

    const compositeScore = Math.round(
      skillScore * weights.skill +
      capacityScore * weights.capacity +
      workloadScore * weights.workload +
      experienceScore * weights.experience +
      priorityScore * weights.priority
    );

    return {
      member,
      effectiveSkills,
      scores: {
        compositeScore,
        skillScore,
        capacityScore,
        workloadScore,
        experienceScore,
        priorityScore,
      },
    };
  },

  /**
   * Main Entry: Generate Delegation Proposals for a Task
   * Evaluates all project team members and returns sorted ranked proposals.
   */
  async generateDelegationProposals(
    task: Partial<Task>,
    projectId: string,
    candidates: TeamMember[],
    orgId: string = 'org-unai'
  ): Promise<DelegationProposal[]> {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const weights = await this.getScoreWeights(orgId);
    const context: TaskRequirementContext = {
      title: task.title || 'General Task',
      description: task.description || '',
      priority: (task.priority as any) || 'Medium',
      estimatedHours: task.estimatedHours || 8,
    };

    // Filter to developers/engineers primarily, or all available members
    const eligiblePool = candidates.filter((m) => m.role !== 'PM' && m.role !== 'CTO');
    const pool = eligiblePool.length > 0 ? eligiblePool : candidates;

    const evaluations: CandidateEvaluation[] = [];
    for (const member of pool) {
      const evaluation = await this.evaluateCandidate(member, context, projectId, weights, orgId);
      evaluations.push(evaluation);
    }

    // Sort descending by composite score
    evaluations.sort((a, b) => b.scores.compositeScore - a.scores.compositeScore);

    const taskId = task.id || `tsk-temp-${Date.now()}`;
    const autoThreshold = DEFAULT_GOVERNANCE_THRESHOLDS.autoAssignConfidenceThreshold;

    const proposals: DelegationProposal[] = evaluations.map((ev, index) => {
      const isTop = index === 0;
      const isAuto = isTop && ev.scores.compositeScore >= autoThreshold;

      return {
        id: `prop-${taskId}-${ev.member.id}-${Date.now().toString(36)}`,
        projectId,
        taskId,
        featureId: task.featureId || undefined,
        candidateEmployeeId: ev.member.id,
        candidateName: ev.member.name,
        rank: index + 1,
        compositeScore: ev.scores.compositeScore,
        skillScore: ev.scores.skillScore,
        capacityScore: ev.scores.capacityScore,
        workloadScore: ev.scores.workloadScore,
        experienceScore: ev.scores.experienceScore,
        priorityScore: ev.scores.priorityScore,
        status: isAuto ? 'Accepted' : 'Proposed',
        isAutoAssigned: isAuto,
        organizationId: orgId,
        createdAt: new Date().toISOString(),
      };
    });

    // Persist proposals to Supabase
    try {
      const rowsToInsert = proposals.map((p) => ({
        id: p.id,
        project_id: p.projectId,
        task_id: p.taskId,
        feature_id: p.featureId || null,
        candidate_employee_id: p.candidateEmployeeId,
        candidate_name: p.candidateName,
        rank: p.rank,
        composite_score: p.compositeScore,
        skill_score: p.skillScore,
        capacity_score: p.capacityScore,
        workload_score: p.workloadScore,
        experience_score: p.experienceScore,
        priority_score: p.priorityScore,
        status: p.status,
        is_auto_assigned: p.isAutoAssigned,
        organization_id: p.organizationId,
      }));

      await supabaseClient.from('delegation_proposals').insert(rowsToInsert);
    } catch (err) {
      console.warn('[DelegationEngine] Notice persisting proposals:', err);
    }

    return proposals;
  },

  /**
   * Record TL decision (Accept proposal or Override with mandatory reason)
   */
  async recordDelegationDecision(
    proposalId: string,
    decision: 'Accepted' | 'Overridden',
    overrideReason?: string,
    reviewerId?: string
  ): Promise<boolean> {
    try {
      if (decision === 'Overridden' && (!overrideReason || overrideReason.trim().length === 0)) {
        throw new Error('Mandatory override reason is required when changing assignment.');
      }

      const { error } = await supabaseClient
        .from('delegation_proposals')
        .update({
          status: decision,
          override_reason: overrideReason || null,
          reviewed_by: reviewerId || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      return !error;
    } catch (err) {
      console.error('[DelegationEngine] Error recording delegation decision:', err);
      throw err;
    }
  },

  /**
   * Fetch active delegation proposals for a task
   */
  async getProposalsForTask(taskId: string): Promise<DelegationProposal[]> {
    try {
      const { data, error } = await supabaseClient
        .from('delegation_proposals')
        .select('*')
        .eq('task_id', taskId)
        .order('rank', { ascending: true });

      if (error) {
        console.warn('[DelegationEngine] getProposalsForTask notice:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        taskId: row.task_id,
        featureId: row.feature_id || undefined,
        candidateEmployeeId: row.candidate_employee_id,
        candidateName: row.candidate_name,
        rank: row.rank,
        compositeScore: Number(row.composite_score),
        skillScore: Number(row.skill_score),
        capacityScore: Number(row.capacity_score),
        workloadScore: Number(row.workload_score),
        experienceScore: Number(row.experience_score),
        priorityScore: Number(row.priority_score),
        status: row.status,
        isAutoAssigned: row.is_auto_assigned,
        overrideReason: row.override_reason,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        organizationId: row.organization_id,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('[DelegationEngine] Error fetching proposals:', err);
      return [];
    }
  },
};
