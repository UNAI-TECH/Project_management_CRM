/**
 * Skill Profile Service (§Smart Delegation Engine)
 * ================================================
 * Manages Employee Master Skill Profiles and Project-Specific Overrides (TL-editable).
 * Hybrid Model: Base permanent skills + Project-specific TL-editable overrides.
 */

import { supabaseClient } from '../lib/supabaseClient';
import type { EmployeeSkillProfile, ProjectSkillOverride } from '../types';
import { SEED_SKILL_TAXONOMY } from '../constants/governanceDefaults';

export interface EffectiveSkill {
  skillName: string;
  category: 'Technical' | 'Domain' | 'Leadership' | 'QA';
  proficiencyLevel: number; // 1-5
  isOverridden: boolean;
  baseProficiency: number;
  yearsOfExperience: number;
  certifications?: string[];
  overrideNotes?: string;
}

export const skillProfileService = {
  /**
   * Fetch master skill profiles for an employee
   */
  async getEmployeeSkills(employeeId: string, orgId?: string): Promise<EmployeeSkillProfile[]> {
    try {
      let query = supabaseClient
        .from('employee_skill_profiles')
        .select('*')
        .eq('employee_id', employeeId);

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SkillProfileService] getEmployeeSkills notice:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        skillName: row.skill_name,
        category: row.category || 'Technical',
        proficiencyLevel: row.proficiency_level || 3,
        yearsOfExperience: Number(row.years_of_experience || 1),
        certifications: row.certifications || [],
        organizationId: row.organization_id || 'org-unai',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('[SkillProfileService] Error fetching employee skills:', err);
      return [];
    }
  },

  /**
   * Upsert a master skill for an employee
   */
  async upsertEmployeeSkill(
    employeeId: string,
    skill: {
      skillName: string;
      category?: 'Technical' | 'Domain' | 'Leadership' | 'QA';
      proficiencyLevel: number;
      yearsOfExperience?: number;
      certifications?: string[];
    },
    orgId: string = 'org-unai'
  ): Promise<EmployeeSkillProfile | null> {
    try {
      const payload = {
        employee_id: employeeId,
        skill_name: skill.skillName.trim(),
        category: skill.category || 'Technical',
        proficiency_level: Math.min(5, Math.max(1, skill.proficiencyLevel)),
        years_of_experience: skill.yearsOfExperience || 1.0,
        certifications: skill.certifications || [],
        organization_id: orgId,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseClient
        .from('employee_skill_profiles')
        .upsert(payload, { onConflict: 'employee_id,skill_name' })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        employeeId: data.employee_id,
        skillName: data.skill_name,
        category: data.category,
        proficiencyLevel: data.proficiency_level,
        yearsOfExperience: Number(data.years_of_experience),
        certifications: data.certifications || [],
        organizationId: data.organization_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[SkillProfileService] Error upserting skill:', err);
      return null;
    }
  },

  /**
   * Delete a master skill
   */
  async deleteEmployeeSkill(employeeId: string, skillName: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('employee_skill_profiles')
        .delete()
        .eq('employee_id', employeeId)
        .eq('skill_name', skillName);

      return !error;
    } catch (err) {
      console.error('[SkillProfileService] Error deleting skill:', err);
      return false;
    }
  },

  /**
   * Get project-specific skill overrides
   */
  async getProjectSkillOverrides(projectId: string): Promise<ProjectSkillOverride[]> {
    try {
      const { data, error } = await supabaseClient
        .from('project_skill_overrides')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.warn('[SkillProfileService] getProjectSkillOverrides notice:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        employeeId: row.employee_id,
        skillName: row.skill_name,
        overrideProficiency: row.override_proficiency,
        notes: row.notes,
        overriddenBy: row.overridden_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('[SkillProfileService] Error fetching project overrides:', err);
      return [];
    }
  },

  /**
   * Apply a project-specific skill override (TL-editable, non-destructive)
   */
  async applyProjectSkillOverride(
    projectId: string,
    employeeId: string,
    skillName: string,
    overrideProficiency: number,
    notes: string,
    overriddenBy: string
  ): Promise<ProjectSkillOverride | null> {
    try {
      const payload = {
        project_id: projectId,
        employee_id: employeeId,
        skill_name: skillName.trim(),
        override_proficiency: Math.min(5, Math.max(1, overrideProficiency)),
        notes: notes || null,
        overridden_by: overriddenBy,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseClient
        .from('project_skill_overrides')
        .upsert(payload, { onConflict: 'project_id,employee_id,skill_name' })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        projectId: data.project_id,
        employeeId: data.employee_id,
        skillName: data.skill_name,
        overrideProficiency: data.override_proficiency,
        notes: data.notes,
        overriddenBy: data.overridden_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[SkillProfileService] Error applying project override:', err);
      return null;
    }
  },

  /**
   * Remove project-specific skill override (reverts to master profile)
   */
  async removeProjectSkillOverride(projectId: string, employeeId: string, skillName: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('project_skill_overrides')
        .delete()
        .eq('project_id', projectId)
        .eq('employee_id', employeeId)
        .eq('skill_name', skillName);

      return !error;
    } catch (err) {
      console.error('[SkillProfileService] Error removing override:', err);
      return false;
    }
  },

  /**
   * Get Effective Skills for an employee in a specific project context
   * Merges base master profile with project-specific overrides.
   */
  async getEffectiveSkills(employeeId: string, projectId?: string, orgId?: string): Promise<EffectiveSkill[]> {
    const baseSkills = await this.getEmployeeSkills(employeeId, orgId);
    let overrides: ProjectSkillOverride[] = [];

    if (projectId && projectId !== 'all') {
      const allProjectOverrides = await this.getProjectSkillOverrides(projectId);
      overrides = allProjectOverrides.filter((o) => o.employeeId === employeeId);
    }

    const overrideMap = new Map<string, ProjectSkillOverride>();
    overrides.forEach((o) => overrideMap.set(o.skillName.toLowerCase(), o));

    const effectiveList: EffectiveSkill[] = baseSkills.map((bs) => {
      const ov = overrideMap.get(bs.skillName.toLowerCase());
      if (ov) {
        return {
          skillName: bs.skillName,
          category: bs.category,
          proficiencyLevel: ov.overrideProficiency,
          isOverridden: true,
          baseProficiency: bs.proficiencyLevel,
          yearsOfExperience: bs.yearsOfExperience,
          certifications: bs.certifications,
          overrideNotes: ov.notes,
        };
      }
      return {
        skillName: bs.skillName,
        category: bs.category,
        proficiencyLevel: bs.proficiencyLevel,
        isOverridden: false,
        baseProficiency: bs.proficiencyLevel,
        yearsOfExperience: bs.yearsOfExperience,
        certifications: bs.certifications,
      };
    });

    // If an override exists for a skill NOT in base skills, add it
    overrides.forEach((ov) => {
      const exists = baseSkills.some((bs) => bs.skillName.toLowerCase() === ov.skillName.toLowerCase());
      if (!exists) {
        effectiveList.push({
          skillName: ov.skillName,
          category: 'Technical',
          proficiencyLevel: ov.overrideProficiency,
          isOverridden: true,
          baseProficiency: 0,
          yearsOfExperience: 1,
          overrideNotes: ov.notes,
        });
      }
    });

    return effectiveList;
  },

  /**
   * Return predefined seed taxonomy for autocomplete
   */
  getSeedTaxonomy() {
    return SEED_SKILL_TAXONOMY;
  },
};
