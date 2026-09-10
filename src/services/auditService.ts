import { supabaseClient } from '../lib/supabaseClient';
import { AuditLog, UserRole } from '../types';

export function mapDbAuditToAuditLog(dbRow: any): AuditLog {
  return {
    id: dbRow.id,
    timestamp: dbRow.timestamp ? new Date(dbRow.timestamp).toLocaleString('en-GB') : 'Just now',
    actorId: dbRow.actor_id,
    actorName: dbRow.actor_name || 'System User',
    actorRole: (dbRow.actor_role as UserRole) || 'Employee',
    action: dbRow.action || 'System Action',
    entityType: dbRow.entity_type || 'Project',
    entityId: dbRow.entity_id || '',
    details: dbRow.details || '',
  };
}

export const auditService = {
  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    let query = supabaseClient
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching audit logs from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbAuditToAuditLog);
  },

  async logAction(
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    organizationId?: string
  ): Promise<AuditLog> {
    const fallbackLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: 'Just now',
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      details,
    };

    try {
      let safeOrgId = organizationId?.trim() || null;
      if (!safeOrgId && actorId) {
        const { data: mem } = await supabaseClient
          .from('organization_members')
          .select('organization_id')
          .or(`auth_user_id.eq.${actorId},id.eq.${actorId}`)
          .maybeSingle();
        if (mem?.organization_id) {
          safeOrgId = mem.organization_id;
        }
      }

      // Without organization_id, database NOT NULL constraint will fail
      if (!safeOrgId) {
        return fallbackLog;
      }

      let safeActorId: string | null = null;
      if (actorId) {
        const { data: emp } = await supabaseClient
          .from('employees_cache')
          .select('employee_id')
          .eq('employee_id', actorId)
          .maybeSingle();
        if (emp) safeActorId = emp.employee_id;
      }

      const { data, error } = await supabaseClient
        .from('audit_log')
        .insert({
          actor_id: safeActorId,
          actor_name: actorName,
          actor_role: actorRole,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details,
          organization_id: safeOrgId,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('[AuditService] Audit log write notice:', error.message);
        return fallbackLog;
      }

      return data ? mapDbAuditToAuditLog(data) : fallbackLog;
    } catch (e) {
      console.warn('[AuditService] Audit log exception notice:', e);
      return fallbackLog;
    }
  },
};
