import { supabaseClient } from '../lib/supabaseClient';
import { ProjectDocument, ProjectFeature, TeamMember, Task, FeatureStatus } from '../types';

export const MANDATORY_DOC_TEMPLATE_IDS = [5, 6, 7, 8]; // 5=FDS, 6=TDS, 7=ARCH, 8=UIUX

export function mapDbRowToFeature(row: any): ProjectFeature {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name || 'Untitled Feature',
    description: row.description || '',
    technology: row.technology || '',
    sourceDocIds: row.source_doc_ids || [],
    sourceDocNames: row.source_doc_names || [],
    sequenceOrder: row.sequence_order || 1,
    status: (row.status as FeatureStatus) || 'Pending',
    progress: row.progress || 0,
    assignedTlId: row.assigned_tl_id || undefined,
    assignedTlName: row.assigned_tl_name || undefined,
    isBlocked: row.is_blocked ?? true,
    linkedFunctions: row.linked_functions || [],
    linkedApis: row.linked_apis || [],
    linkedScreens: row.linked_screens || [],
    estimatedHours: row.estimated_hours ? Number(row.estimated_hours) : undefined,
    actualHours: row.actual_hours ? Number(row.actual_hours) : 0,
    startDate: row.start_date || undefined,
    dueDate: row.due_date || undefined,
    organizationId: row.organization_id,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : 'Recently',
  };
}

export const featureService = {
  /**
   * Checks if all 4 mandatory docs (FDS, TDS, ARCH, UI/UX) exist and are marked 'Approved'.
   */
  checkMandatoryDocsApproved(projectDocs: ProjectDocument[]): {
    isReady: boolean;
    missingDocs: string[];
    unapprovedDocs: string[];
    statuses: Record<number, { name: string; status: string; approved: boolean }>;
  } {
    const docMap = new Map<number, ProjectDocument>();
    projectDocs.forEach((d) => docMap.set(d.templateId, d));

    const mandatoryDefs = [
      { id: 5, name: 'Functional Specification (FDS)' },
      { id: 6, name: 'Technical Specification (TDS)' },
      { id: 7, name: 'Architecture Document (ARCH)' },
      { id: 8, name: 'UI/UX Design Document' },
    ];

    const missingDocs: string[] = [];
    const unapprovedDocs: string[] = [];
    const statuses: Record<number, { name: string; status: string; approved: boolean }> = {};

    mandatoryDefs.forEach((def) => {
      const doc = docMap.get(def.id);
      if (!doc) {
        missingDocs.push(def.name);
        statuses[def.id] = { name: def.name, status: 'Missing', approved: false };
      } else {
        const isAppr = doc.status === 'Approved';
        if (!isAppr) {
          unapprovedDocs.push(def.name);
        }
        statuses[def.id] = { name: def.name, status: doc.status, approved: isAppr };
      }
    });

    return {
      isReady: missingDocs.length === 0 && unapprovedDocs.length === 0,
      missingDocs,
      unapprovedDocs,
      statuses,
    };
  },

  /**
   * Automatically extracts structured Features from approved documentation:
   * - Architecture Doc (#7) -> Primary features from `components_table`
   * - Functional Spec (#5) -> Functions from `func_reqs_table`
   * - Technical Spec (#6) -> APIs from `api_table`
   * - UI/UX Design (#8) -> Screens from `screens_table`
   */
  extractFeaturesFromDocs(
    projectDocs: ProjectDocument[],
    projectId: string,
    organizationId: string
  ): ProjectFeature[] {
    const docMap = new Map<number, ProjectDocument>();
    projectDocs.forEach((d) => docMap.set(d.templateId, d));

    const fdsDoc = docMap.get(5);
    const tdsDoc = docMap.get(6);
    const archDoc = docMap.get(7);
    const uiDoc = docMap.get(8);

    // 1. Extract raw items from docs
    const archComponents: Array<{ component: string; description: string; technology: string }> =
      archDoc?.content?.components_table && Array.isArray(archDoc.content.components_table) && archDoc.content.components_table.length > 0
        ? archDoc.content.components_table
        : [
            { component: 'Core Application Framework & Auth', description: 'Authentication, Session Management & RBAC', technology: 'TypeScript / Supabase' },
            { component: 'Business Logic & Workflow Engine', description: 'Core domain services and state transitions', technology: 'Node.js / REST APIs' },
            { component: 'Frontend UI & Client Portal', description: 'Responsive web interface and analytics dashboard', technology: 'React / Tailwind CSS' },
          ];

    const fdsFunctions: Array<{ func_id: string; description: string; priority: string }> =
      fdsDoc?.content?.func_reqs_table && Array.isArray(fdsDoc.content.func_reqs_table)
        ? fdsDoc.content.func_reqs_table
        : [];

    const tdsApis: Array<{ endpoint: string; method: string; description: string }> =
      tdsDoc?.content?.api_table && Array.isArray(tdsDoc.content.api_table)
        ? tdsDoc.content.api_table
        : [];

    const uiScreens: Array<{ screen_name: string; description: string }> =
      uiDoc?.content?.screens_table && Array.isArray(uiDoc.content.screens_table)
        ? uiDoc.content.screens_table
        : [];

    const sourceDocIds = [fdsDoc?.id, tdsDoc?.id, archDoc?.id, uiDoc?.id].filter(Boolean) as string[];
    const sourceDocNames = [fdsDoc?.name, tdsDoc?.name, archDoc?.name, uiDoc?.name].filter(Boolean) as string[];

    // 2. Build feature nodes from Architecture components
    const features: ProjectFeature[] = archComponents.map((comp, idx) => {
      const featId = `feat-${projectId}-${idx + 1}-${Date.now().toString(36)}`;
      const compNameLower = (comp.component || '').toLowerCase();

      // Correlate functions by matching name keywords or distributing
      const matchingFunctions = fdsFunctions
        .filter((f) => compNameLower.includes((f.description || '').toLowerCase().slice(0, 5)) || (fdsFunctions.length <= archComponents.length && idx === 0))
        .map((f) => `${f.func_id ? `[${f.func_id}] ` : ''}${f.description}`);

      const matchingApis = tdsApis
        .filter((a) => compNameLower.includes((a.endpoint || '').toLowerCase().slice(0, 4)))
        .map((a) => `${a.method || 'GET'} ${a.endpoint || ''} - ${a.description || ''}`);

      const matchingScreens = uiScreens
        .filter((s) => compNameLower.includes((s.screen_name || '').toLowerCase().slice(0, 4)))
        .map((s) => s.screen_name);

      return {
        id: featId,
        projectId,
        name: comp.component || `Feature Module ${idx + 1}`,
        description: comp.description || 'Architectural deliverable extracted from Architecture Document.',
        technology: comp.technology || 'Modern Web Stack',
        sourceDocIds,
        sourceDocNames,
        sequenceOrder: idx + 1,
        status: idx === 0 ? 'Pending' : 'Blocked',
        progress: 0,
        isBlocked: idx !== 0, // Feature 1 is unlocked initially, subsequent are blocked
        linkedFunctions: matchingFunctions.length > 0 ? matchingFunctions : fdsFunctions.slice(idx * 2, idx * 2 + 2).map(f => `${f.func_id}: ${f.description}`),
        linkedApis: matchingApis.length > 0 ? matchingApis : tdsApis.slice(idx * 2, idx * 2 + 2).map(a => `${a.method} ${a.endpoint}`),
        linkedScreens: matchingScreens.length > 0 ? matchingScreens : uiScreens.slice(idx * 2, idx * 2 + 2).map(s => s.screen_name),
        estimatedHours: 40,
        actualHours: 0,
        organizationId,
        createdAt: new Date().toLocaleDateString('en-GB'),
      };
    });

    return features;
  },

  async getFeatures(projectId?: string, orgId?: string): Promise<ProjectFeature[]> {
    let query = supabaseClient
      .from('project_features')
      .select('*')
      .order('sequence_order', { ascending: true });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch project_features from Supabase (falling back to empty):', error.message);
      return [];
    }

    return (data || []).map(mapDbRowToFeature);
  },

  async saveFeatures(features: ProjectFeature[]): Promise<ProjectFeature[]> {
    if (features.length === 0) return [];

    const rowsToUpsert = features.map((f) => ({
      id: f.id,
      project_id: f.projectId,
      name: f.name,
      description: f.description,
      technology: f.technology || null,
      source_doc_ids: f.sourceDocIds,
      source_doc_names: f.sourceDocNames,
      sequence_order: f.sequenceOrder,
      status: f.status,
      progress: f.progress,
      assigned_tl_id: f.assignedTlId || null,
      assigned_tl_name: f.assignedTlName || null,
      is_blocked: f.isBlocked,
      linked_functions: f.linkedFunctions,
      linked_apis: f.linkedApis,
      linked_screens: f.linkedScreens,
      estimated_hours: f.estimatedHours || null,
      actual_hours: f.actualHours || 0,
      start_date: f.startDate || null,
      due_date: f.dueDate || null,
      organization_id: f.organizationId,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseClient
      .from('project_features')
      .upsert(rowsToUpsert)
      .select();

    if (error) {
      console.error('Error saving features in Supabase:', error);
      throw error;
    }

    return (data || []).map(mapDbRowToFeature);
  },

  async assignFeatureToTL(
    featureId: string,
    tlMember: TeamMember,
    estimatedHours: number,
    dueDate: string
  ): Promise<ProjectFeature> {
    const { data, error } = await supabaseClient
      .from('project_features')
      .update({
        assigned_tl_id: tlMember.id,
        assigned_tl_name: tlMember.name,
        estimated_hours: estimatedHours,
        due_date: dueDate,
        status: 'In Progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', featureId)
      .select()
      .single();

    if (error) {
      console.error('Error assigning feature to TL:', error);
      throw error;
    }

    return mapDbRowToFeature(data);
  },

  /**
   * When a feature is verified by PM, unlock the next sequential feature and its tasks.
   */
  async unlockNextFeature(
    completedFeatureId: string,
    allFeatures: ProjectFeature[]
  ): Promise<{ unlockedFeature: ProjectFeature | null; updatedFeatures: ProjectFeature[] }> {
    const currentFeat = allFeatures.find((f) => f.id === completedFeatureId);
    if (!currentFeat) return { unlockedFeature: null, updatedFeatures: allFeatures };

    const nextOrder = currentFeat.sequenceOrder + 1;
    const nextFeat = allFeatures.find((f) => f.sequenceOrder === nextOrder);

    if (!nextFeat) {
      return { unlockedFeature: null, updatedFeatures: allFeatures };
    }

    // Unblock next feature in DB
    const { data, error } = await supabaseClient
      .from('project_features')
      .update({
        is_blocked: false,
        status: 'Pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', nextFeat.id)
      .select()
      .single();

    if (error) {
      console.error('Error unlocking next feature in Supabase:', error);
      return { unlockedFeature: null, updatedFeatures: allFeatures };
    }

    const unblocked = mapDbRowToFeature(data);

    // Also unblock any tasks belonging to this feature
    await supabaseClient
      .from('tasks')
      .update({ is_blocked: false, status: 'Open' })
      .eq('feature_id', nextFeat.id);

    const updated = allFeatures.map((f) => (f.id === nextFeat.id ? unblocked : f));
    return { unlockedFeature: unblocked, updatedFeatures: updated };
  },

  computeFeatureProgress(featureTasks: Task[]): number {
    if (featureTasks.length === 0) return 0;
    const verified = featureTasks.filter((t) => t.status === 'Verified').length;
    return Math.round((verified / featureTasks.length) * 100);
  },
};
