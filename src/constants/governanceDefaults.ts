/**
 * Governance & Delegation Defaults (§CR Governance, §Smart Delegation Engine)
 * =========================================================================
 * Provides default configurations for Change Request escalation thresholds,
 * Smart Delegation multi-factor scoring weights, and skill taxonomy seeds.
 */

export interface DelegationScoreWeights {
  skill: number;
  capacity: number;
  workload: number;
  experience: number;
  priority: number;
}

export interface GovernanceThresholds {
  budgetImpactPctThreshold: number; // e.g. 15% -> CTO Escalation
  timelineImpactDaysThreshold: number; // e.g. 14 days -> CTO Escalation
  effortSplitRatioThreshold: number; // e.g. 0.30 (30% reallocation) -> CTO Escalation
  autoAssignConfidenceThreshold: number; // e.g. 75% -> Auto-assigned, else proposed to TL
  scoreWeights: DelegationScoreWeights;
}

export const DEFAULT_GOVERNANCE_THRESHOLDS: GovernanceThresholds = {
  budgetImpactPctThreshold: 15.0, // > 15% budget delta escalates to CTO
  timelineImpactDaysThreshold: 14, // > 14 days delay escalates to CTO
  effortSplitRatioThreshold: 0.30, // > 30% team reassignment escalates to CTO
  autoAssignConfidenceThreshold: 75.0, // Composite score >= 75 allows auto-assign
  scoreWeights: {
    skill: 0.35,      // 35% weight on skill match
    capacity: 0.25,   // 25% weight on sprint & hour capacity
    workload: 0.20,   // 20% weight on active task balance
    experience: 0.10, // 10% weight on domain/stack experience
    priority: 0.10,   // 10% weight on priority alignment
  },
};

/**
 * Standard seed skill taxonomy
 * Users can pick from this list or type custom tags (Hybrid model).
 */
export const SEED_SKILL_TAXONOMY: Array<{ name: string; category: 'Technical' | 'Domain' | 'Leadership' | 'QA' }> = [
  // Frontend
  { name: 'React', category: 'Technical' },
  { name: 'React Native', category: 'Technical' },
  { name: 'TypeScript', category: 'Technical' },
  { name: 'JavaScript', category: 'Technical' },
  { name: 'Tailwind CSS', category: 'Technical' },
  { name: 'HTML/CSS', category: 'Technical' },
  { name: 'Next.js', category: 'Technical' },

  // Backend & Cloud
  { name: 'Node.js', category: 'Technical' },
  { name: 'Python', category: 'Technical' },
  { name: 'Supabase', category: 'Technical' },
  { name: 'PostgreSQL', category: 'Technical' },
  { name: 'REST APIs', category: 'Technical' },
  { name: 'GraphQL', category: 'Technical' },
  { name: 'Docker', category: 'Technical' },
  { name: 'AWS', category: 'Technical' },
  { name: 'CI/CD & DevOps', category: 'Technical' },

  // QA & Testing
  { name: 'Manual Testing', category: 'QA' },
  { name: 'Automated Testing (Cypress/Playwright)', category: 'QA' },
  { name: 'API Testing (Postman)', category: 'QA' },
  { name: 'Performance Testing', category: 'QA' },

  // Design & Architecture
  { name: 'UI/UX Design (Figma)', category: 'Domain' },
  { name: 'System Architecture', category: 'Technical' },
  { name: 'Database Design', category: 'Technical' },
  { name: 'Security & Auth', category: 'Technical' },

  // Leadership & Process
  { name: 'Agile/Scrum', category: 'Leadership' },
  { name: 'Sprint Planning', category: 'Leadership' },
  { name: 'Technical Leadership', category: 'Leadership' },
];
