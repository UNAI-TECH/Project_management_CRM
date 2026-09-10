import { UserRole } from '../types';

export type AppPermission =
  // Screen Level Permissions
  | 'screen:dashboard'
  | 'screen:projects'
  | 'screen:project-detail'
  | 'screen:documents'
  | 'screen:document-detail'
  | 'screen:document-edit'
  | 'screen:tasks'
  | 'screen:my-tasks'
  | 'screen:team'
  | 'screen:cr-inbox'
  | 'screen:reports'
  | 'screen:audit-trail'
  | 'screen:settings'
  
  // Project Permissions
  | 'project:create'
  | 'project:edit'
  | 'project:delete'
  | 'project:view_all'
  | 'project:view_assigned'
  
  // Document Permissions
  | 'document:create'
  | 'document:edit_any'
  | 'document:edit_assigned_sections'
  | 'document:approve'
  | 'document:lock'
  | 'document:export_all'
  | 'document:view_history'
  
  // Task & Subtask Permissions
  | 'task:create'
  | 'task:assign_any'
  | 'task:assign_team'
  | 'task:verify'
  | 'task:delete'
  | 'task:override_any'
  | 'task:submit_work'
  | 'task:track_time'
  
  // Feature & Sprint Permissions
  | 'feature:create'
  | 'feature:assign_tl'
  | 'feature:update_progress'
  | 'sprint:manage'
  | 'sprint:plan'
  
  // Governance & CR Permissions
  | 'cr:create'
  | 'cr:review'
  | 'cr:approve_executive'
  | 'cr:escalate'
  | 'requirement:manage'
  | 'risk:manage'
  
  // Administration & Audit
  | 'admin:manage_users'
  | 'admin:invite_member'
  | 'admin:deactivate_member'
  | 'admin:update_branding'
  | 'admin:transfer_ownership'
  | 'audit:view_ledger';

// Full access executive roles (Super Admins)
export const EXECUTIVE_ROLES: UserRole[] = ['CEO', 'MD', 'COO', 'CTO', 'CIO'];

const ALL_PERMISSIONS: AppPermission[] = [
  'screen:dashboard',
  'screen:projects',
  'screen:project-detail',
  'screen:documents',
  'screen:document-detail',
  'screen:document-edit',
  'screen:tasks',
  'screen:my-tasks',
  'screen:team',
  'screen:cr-inbox',
  'screen:reports',
  'screen:audit-trail',
  'screen:settings',
  'project:create',
  'project:edit',
  'project:delete',
  'project:view_all',
  'project:view_assigned',
  'document:create',
  'document:edit_any',
  'document:edit_assigned_sections',
  'document:approve',
  'document:lock',
  'document:export_all',
  'document:view_history',
  'task:create',
  'task:assign_any',
  'task:assign_team',
  'task:verify',
  'task:delete',
  'task:override_any',
  'task:submit_work',
  'task:track_time',
  'feature:create',
  'feature:assign_tl',
  'feature:update_progress',
  'sprint:manage',
  'sprint:plan',
  'cr:create',
  'cr:review',
  'cr:approve_executive',
  'cr:escalate',
  'requirement:manage',
  'risk:manage',
  'admin:manage_users',
  'admin:invite_member',
  'admin:deactivate_member',
  'admin:update_branding',
  'admin:transfer_ownership',
  'audit:view_ledger',
];

const PM_PERMISSIONS: AppPermission[] = [
  'screen:dashboard',
  'screen:projects',
  'screen:project-detail',
  'screen:documents',
  'screen:document-detail',
  'screen:document-edit',
  'screen:tasks',
  'screen:my-tasks',
  'screen:team',
  'screen:cr-inbox',
  'screen:reports',
  'project:create',
  'project:edit',
  'project:view_assigned',
  'document:create',
  'document:edit_assigned_sections',
  'document:approve',
  'document:export_all',
  'document:view_history',
  'task:create',
  'task:assign_team',
  'task:verify',
  'task:submit_work',
  'task:track_time',
  'feature:create',
  'feature:assign_tl',
  'feature:update_progress',
  'sprint:manage',
  'sprint:plan',
  'cr:create',
  'cr:review',
  'cr:escalate',
  'requirement:manage',
  'risk:manage',
  'admin:invite_member',
];

const TL_PERMISSIONS: AppPermission[] = [
  'screen:dashboard',
  'screen:projects',
  'screen:project-detail',
  'screen:documents',
  'screen:document-detail',
  'screen:document-edit',
  'screen:tasks',
  'screen:my-tasks',
  'screen:team',
  'screen:reports',
  'project:view_assigned',
  'document:edit_assigned_sections',
  'document:view_history',
  'task:create',
  'task:assign_team',
  'task:verify',
  'task:submit_work',
  'task:track_time',
  'feature:update_progress',
  'sprint:plan',
  'cr:create',
  'risk:manage',
];

const EMPLOYEE_PERMISSIONS: AppPermission[] = [
  'screen:dashboard',
  'screen:projects',
  'screen:project-detail',
  'screen:documents',
  'screen:document-detail',
  'screen:my-tasks',
  'screen:team',
  'project:view_assigned',
  'document:edit_assigned_sections',
  'task:submit_work',
  'task:track_time',
];

export const ROLE_PERMISSION_MAP: Record<UserRole, Set<AppPermission>> = {
  CEO: new Set(ALL_PERMISSIONS),
  MD: new Set(ALL_PERMISSIONS),
  COO: new Set(ALL_PERMISSIONS),
  CTO: new Set(ALL_PERMISSIONS),
  CIO: new Set(ALL_PERMISSIONS),
  PM: new Set(PM_PERMISSIONS),
  TL: new Set(TL_PERMISSIONS),
  Employee: new Set(EMPLOYEE_PERMISSIONS),
};

/**
 * Check if a role possesses a specific permission.
 */
export function checkRolePermission(role: UserRole | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSION_MAP[role];
  return perms ? perms.has(permission) : false;
}

/**
 * Returns allowed navigation tabs for a specific active role.
 */
export function getAllowedTabsForRole(role: UserRole): string[] {
  const perms = ROLE_PERMISSION_MAP[role] || new Set();
  const tabs: string[] = [];
  
  if (perms.has('screen:dashboard')) tabs.push('dashboard');
  if (perms.has('screen:projects')) tabs.push('projects', 'project-detail');
  if (perms.has('screen:documents')) tabs.push('documents', 'document-detail');
  if (perms.has('screen:document-edit')) tabs.push('document-edit');
  if (perms.has('screen:tasks')) tabs.push('tasks');
  if (perms.has('screen:my-tasks')) tabs.push('my-tasks');
  if (perms.has('screen:team')) tabs.push('team');
  if (perms.has('screen:cr-inbox')) tabs.push('cr-inbox');
  if (perms.has('screen:reports')) tabs.push('reports');
  if (perms.has('screen:audit-trail')) tabs.push('audit-trail');
  if (perms.has('screen:settings')) tabs.push('settings');
  
  return tabs;
}
