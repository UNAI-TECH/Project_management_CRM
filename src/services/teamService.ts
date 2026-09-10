import { supabaseClient } from '../lib/supabaseClient';
import { TeamMember, UserRole } from '../types';

export function resolveAccessLevel(role: UserRole, designation?: string): 'Full Access' | 'Team Access' | 'Task Access' {
  if (['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(role)) return 'Full Access';
  if (role === 'PM' || role === 'TL') return 'Team Access';
  const des = (designation || '').toLowerCase();
  if (des.includes('lead') || des.includes('manager') || des.includes('architect') || des.includes('head') || des.includes('director')) {
    return 'Team Access';
  }
  return 'Task Access';
}

export function mapDbMemberToTeamMember(dbRow: any, orgMember?: any): TeamMember {
  const memberName = orgMember?.full_name || dbRow.name || (dbRow.email ? dbRow.email.split('@')[0] : 'Team Member');
  const memberEmail = orgMember?.email || dbRow.email || '';
  const memberRole = (dbRow.project_role as UserRole) || orgMember?.role || 'Employee';
  const memberDesignation = orgMember?.designation || dbRow.designation || (memberRole === 'PM' ? 'Project Manager' : memberRole === 'TL' ? 'Technical Lead' : 'Software Engineer');
  const memberDept = orgMember?.department || dbRow.department || 'Engineering';

  const cachedAvatar = memberEmail ? localStorage.getItem(`unai_user_avatar_${memberEmail.toLowerCase()}`) : null;
  const resolvedAvatar =
    orgMember?.avatar_url ||
    orgMember?.avatar ||
    dbRow?.avatar_url ||
    cachedAvatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memberName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return {
    id: dbRow.employee_id || dbRow.id,
    projectId: dbRow.project_id || 'all',
    name: memberName,
    email: memberEmail,
    role: memberRole,
    designation: memberDesignation,
    department: memberDept,
    accessLevel: resolveAccessLevel(memberRole, memberDesignation),
    reportsTo: dbRow.reports_to || null,
    avatar: resolvedAvatar,
  };
}

export const teamService = {
  async getProjectMembers(projectId?: string, orgId?: string): Promise<TeamMember[]> {
    try {
      // 1. Fetch organization members for the organization
      let orgQuery = supabaseClient.from('organization_members').select('*');
      if (orgId) {
        orgQuery = orgQuery.eq('organization_id', orgId);
      }
      const { data: orgData, error: orgError } = await orgQuery;
      if (orgError) {
        console.warn('Notice fetching organization_members:', orgError.message);
      }

      // 2. Fetch project assignments
      let pmQuery = supabaseClient.from('project_members').select('*');
      if (projectId && projectId !== 'all') {
        pmQuery = pmQuery.eq('project_id', projectId);
      }
      if (orgId) {
        pmQuery = pmQuery.eq('organization_id', orgId);
      }

      let { data: pmRows, error: pmError } = await pmQuery;
      if (pmError && (pmError.message?.includes('future') || pmError.message?.includes('Unauthorized'))) {
        await new Promise((r) => setTimeout(r, 1200));
        const retryResult = await pmQuery;
        pmRows = retryResult.data;
        pmError = retryResult.error;
      }
      if (pmError) {
        console.warn('Notice fetching project members:', pmError.message);
      }

      const orgMap = new Map<string, any>();
      (orgData || []).forEach((m: any) => {
        if (m.id) orgMap.set(m.id, m);
        if (m.auth_user_id) orgMap.set(m.auth_user_id, m);
        if (m.email) orgMap.set(m.email.toLowerCase(), m);
      });

      // Deduplicated map of team members by unique key (email or id)
      const memberMap = new Map<string, TeamMember>();

      // First, add all registered organization members
      (orgData || []).forEach((orgMember: any) => {
        const rawName = orgMember.full_name || orgMember.email?.split('@')[0] || '';
        if (!rawName || rawName === 'Team Member' || rawName === 'Member') {
          if (orgMember.email && orgMember.email.includes('@')) {
            const formatted = orgMember.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            orgMember.full_name = formatted;
          }
        }
        const memberName = orgMember.full_name || (orgMember.email ? orgMember.email.split('@')[0] : 'Employee');
        const role = (orgMember.role as UserRole) || 'Employee';
        const designation = orgMember.designation || (role === 'CTO' ? 'Chief Technology Officer' : role === 'PM' ? 'Project Manager' : role === 'TL' ? 'Technical Lead' : 'Software Engineer');
        const department = orgMember.department || 'Engineering';

        const cachedAvatar = orgMember.email ? localStorage.getItem(`unai_user_avatar_${orgMember.email.toLowerCase()}`) : null;
        const resolvedAvatar =
          orgMember.avatar_url ||
          orgMember.avatar ||
          cachedAvatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memberName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

        const tm: TeamMember = {
          id: orgMember.id,
          projectId: 'all',
          name: memberName,
          email: orgMember.email || '',
          role: role,
          designation: designation,
          department: department,
          accessLevel: resolveAccessLevel(role, designation),
          reportsTo: orgMember.reports_to || null,
          avatar: resolvedAvatar,
        };

        const key = (orgMember.email ? orgMember.email.toLowerCase() : orgMember.id).trim();
        if (key) {
          memberMap.set(key, tm);
        }
      });

      // Next, augment / add any project-specific assignments without overriding master org role
      (pmRows || []).forEach((dbRow: any) => {
        if (!dbRow.employee_id && !dbRow.name && !dbRow.email) return;

        const matched = dbRow.employee_id ? orgMap.get(dbRow.employee_id) : (dbRow.email ? orgMap.get(dbRow.email.toLowerCase()) : null);
        const member = mapDbMemberToTeamMember(dbRow, matched);

        if (member.name === 'Team Member' && !member.email) return;

        const key = (member.email ? member.email.toLowerCase() : member.name ? member.name.toLowerCase() : member.id).trim();
        if (key) {
          const existing = memberMap.get(key);
          if (existing) {
            // Only update reportsTo or assign project-specific details, preserve true org role
            if (matched?.role) {
              existing.role = matched.role;
              existing.designation = matched.designation || existing.designation;
            }
            if (dbRow.reports_to) {
              existing.reportsTo = dbRow.reports_to;
            }
          } else {
            memberMap.set(key, member);
          }
        }
      });

      return Array.from(memberMap.values());
    } catch (e) {
      console.warn('Project members query fallback:', e);
      return [];
    }
  },

  async addProjectMember(
    memberData: Partial<TeamMember>,
    assignedBy?: string,
    organizationId?: string
  ): Promise<TeamMember> {
    const fallbackMember: TeamMember = {
      id: memberData.id || `mem-${Date.now()}`,
      projectId: memberData.projectId || 'all',
      name: memberData.name || 'Member',
      email: memberData.email || '',
      role: memberData.role || 'Employee',
      designation: memberData.designation || (memberData.role === 'PM' ? 'Project Manager' : memberData.role === 'TL' ? 'Technical Lead' : 'Software Engineer'),
      department: memberData.department || 'Engineering',
      accessLevel: memberData.accessLevel || (memberData.role === 'CTO' ? 'Full Access' : memberData.role === 'PM' ? 'Team Access' : 'Task Access'),
      reportsTo: memberData.reportsTo || null,
      reportsToName: memberData.reportsToName || null,
      avatar: memberData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberData.name || 'User')}&backgroundColor=0d82ff,00d1ff,6366f1`,
    };

    try {
      // Only upsert into project_members if projectId is provided and not a fallback string
      if (memberData.projectId && memberData.projectId !== 'all' && !memberData.projectId.startsWith('proj-default')) {
        const safeAssignedBy = assignedBy || null;
        const safeEmpId = memberData.id || null;
        const safeOrgId = organizationId || null;
        const safeReportsTo = memberData.reportsTo || null;

        const payload: any = {
          project_id: memberData.projectId,
          employee_id: safeEmpId,
          project_role: memberData.role || 'Employee',
          reports_to: safeReportsTo,
          assigned_by: safeAssignedBy,
          organization_id: safeOrgId,
        };

        let { data, error } = await supabaseClient
          .from('project_members')
          .upsert(payload, {
            onConflict: 'project_id, employee_id',
          })
          .select()
          .maybeSingle();

        // Fallback: If upsert failed due to unique constraint or constraint naming, perform targeted update
        if (error && safeEmpId) {
          const updateRes = await supabaseClient
            .from('project_members')
            .update({
              project_role: memberData.role || 'Employee',
              reports_to: safeReportsTo,
              assigned_by: safeAssignedBy,
              organization_id: safeOrgId,
            })
            .eq('project_id', memberData.projectId)
            .eq('employee_id', safeEmpId)
            .select()
            .maybeSingle();

          if (!updateRes.error && updateRes.data) {
            data = updateRes.data;
            error = null;
          }
        }

        if (error) {
          console.warn('[teamService] project_members write warning:', error.message);
        } else if (data) {
          return {
            ...fallbackMember,
            id: data.employee_id || data.id || fallbackMember.id,
            reportsTo: data.reports_to || fallbackMember.reportsTo,
          };
        }
      }
    } catch (e) {
      console.warn('[teamService] project_members insert gracefully handled:', e);
    }

    return fallbackMember;
  },

  async removeProjectMember(memberId: string): Promise<void> {
    try {
      await supabaseClient
        .from('project_members')
        .delete()
        .eq('id', memberId);
    } catch (e) {
      console.warn('Remove project member error:', e);
    }
  },

  async getOrgMembers(orgId?: string): Promise<Array<{ id: string; authUserId: string; fullName: string; email: string; role: UserRole; designation: string; department: string }>> {
    try {
      let query = supabaseClient.from('organization_members').select('*');
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Notice querying organization_members:', error.message);
        return [];
      }
      return (data || []).map((m: any) => ({
        id: m.id,
        authUserId: m.auth_user_id || m.id,
        fullName: m.full_name || m.email?.split('@')[0] || 'Member',
        email: m.email || '',
        role: (m.role as UserRole) || 'Employee',
        designation: m.designation || (m.role === 'CTO' ? 'Chief Technology Officer' : m.role === 'PM' ? 'Project Manager' : 'Software Engineer'),
        department: m.department || 'Engineering',
      }));
    } catch (e) {
      console.warn('Failed to load org members:', e);
      return [];
    }
  },
};
