import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import type { TeamMember, EmployeeSkillProfile, ProjectSkillOverride, UserRole } from '../types';
import { skillProfileService, EffectiveSkill } from '../services/skillProfileService';

interface SkillProfileEditorProps {
  employee: TeamMember;
  projectId?: string;
  projectName?: string;
  currentUser: { id: string; name: string; role: UserRole };
  organizationId?: string;
  onProfileUpdated?: () => void;
}

export const SkillProfileEditor: React.FC<SkillProfileEditorProps> = ({
  employee,
  projectId,
  projectName,
  currentUser,
  organizationId = 'org-unai',
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'master' | 'project_override'>('master');
  const [effectiveSkills, setEffectiveSkills] = useState<EffectiveSkill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Skill Form State
  const [newSkillName, setNewSkillName] = useState('');
  const [newCategory, setNewCategory] = useState<'Technical' | 'Domain' | 'Leadership' | 'QA'>('Technical');
  const [newProficiency, setNewProficiency] = useState<number>(3);
  const [newExpYears, setNewExpYears] = useState<number>(2);

  // Project Override Form State
  const [overrideSkillName, setOverrideSkillName] = useState('');
  const [overrideProficiency, setOverrideProficiency] = useState<number>(4);
  const [overrideNotes, setOverrideNotes] = useState('');

  const isTLOrAbove = ['TL', 'PM', 'CTO', 'CEO'].includes(currentUser.role);
  const canEditMaster = currentUser.id === employee.id || ['PM', 'CTO', 'CEO'].includes(currentUser.role);

  const seedTaxonomy = skillProfileService.getSeedTaxonomy();

  const loadSkills = async () => {
    setLoading(true);
    try {
      const eff = await skillProfileService.getEffectiveSkills(employee.id, projectId, organizationId);
      setEffectiveSkills(eff);
    } catch (err) {
      console.warn('Error loading skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, [employee.id, projectId]);

  const handleAddMasterSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      await skillProfileService.upsertEmployeeSkill(
        employee.id,
        {
          skillName: newSkillName.trim(),
          category: newCategory,
          proficiencyLevel: newProficiency,
          yearsOfExperience: newExpYears,
        },
        organizationId
      );

      setNewSkillName('');
      setNewProficiency(3);
      setNewExpYears(2);
      await loadSkills();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error adding master skill:', err);
    }
  };

  const handleDeleteMasterSkill = async (skillName: string) => {
    try {
      await skillProfileService.deleteEmployeeSkill(employee.id, skillName);
      await loadSkills();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error deleting skill:', err);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !overrideSkillName.trim()) return;

    try {
      await skillProfileService.applyProjectSkillOverride(
        projectId,
        employee.id,
        overrideSkillName.trim(),
        overrideProficiency,
        overrideNotes.trim(),
        currentUser.id
      );

      setOverrideSkillName('');
      setOverrideNotes('');
      setOverrideProficiency(4);
      await loadSkills();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error applying override:', err);
    }
  };

  const handleRemoveOverride = async (skillName: string) => {
    if (!projectId) return;
    try {
      await skillProfileService.removeProjectSkillOverride(projectId, employee.id, skillName);
      await loadSkills();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error removing override:', err);
    }
  };

  const getProficiencyLabel = (lvl: number) => {
    switch (lvl) {
      case 5: return 'Expert (Level 5)';
      case 4: return 'Advanced (Level 4)';
      case 3: return 'Competent (Level 3)';
      case 2: return 'Developing (Level 2)';
      default: return 'Novice (Level 1)';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{employee.name} — Skill Profile</h4>
            <p className="text-xs text-slate-500">{employee.designation} • {employee.department}</p>
          </div>
        </div>

        {/* Tab switcher if project context exists */}
        {projectId && (
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('master')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'master' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Profile
            </button>
            <button
              onClick={() => setActiveTab('project_override')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'project_override' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Project Overrides ({projectName || 'Project'})
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* TAB 1: MASTER SKILL PROFILE */}
        {activeTab === 'master' && (
          <div className="space-y-5">
            {/* Add Skill Form */}
            {canEditMaster && (
              <form onSubmit={handleAddMasterSkill} className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                  Add / Update Master Skill
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-1">Skill Name (Type or Select)</label>
                    <input
                      type="text"
                      list="seed-skills"
                      required
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="e.g. React, Node.js, Docker..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <datalist id="seed-skills">
                      {seedTaxonomy.map((s) => (
                        <option key={s.name} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Domain">Domain</option>
                      <option value="QA">QA</option>
                      <option value="Leadership">Leadership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Experience (Yrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newExpYears}
                      onChange={(e) => setNewExpYears(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">Proficiency:</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={newProficiency}
                      onChange={(e) => setNewProficiency(Number(e.target.value))}
                      className="w-32 accent-indigo-600"
                    />
                    <span className="text-xs font-bold text-indigo-700">{getProficiencyLabel(newProficiency)}</span>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save to Profile
                  </button>
                </div>
              </form>
            )}

            {/* Existing Skills List */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                Current Skill Inventory ({effectiveSkills.length})
              </span>

              {loading ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading skills...</p>
              ) : effectiveSkills.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic border border-dashed border-slate-200 rounded-lg">
                  No skills registered yet. Add technical skills to enable smart task delegation.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {effectiveSkills.map((sk) => (
                    <div
                      key={sk.skillName}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{sk.skillName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {sk.category}
                          </span>
                          {sk.isOverridden && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Overridden in Project
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            {'★'.repeat(sk.proficiencyLevel)}
                            <span className="text-slate-300">{'★'.repeat(5 - sk.proficiencyLevel)}</span>
                          </div>
                          <span>•</span>
                          <span>{sk.yearsOfExperience} yrs exp</span>
                        </div>
                      </div>

                      {canEditMaster && (
                        <button
                          onClick={() => handleDeleteMasterSkill(sk.skillName)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROJECT SPECIFIC OVERRIDES (TL EDITABLE) */}
        {activeTab === 'project_override' && (
          <div className="space-y-5">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Non-Destructive Overrides:</strong> Team Leads can adjust an employee's proficiency level specifically for <em>{projectName}</em> (e.g. specialized domain knowledge). The master employee profile remains unaltered.
              </p>
            </div>

            {/* Override Form */}
            {isTLOrAbove && (
              <form onSubmit={handleApplyOverride} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Add Project Skill Override
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Skill to Override *</label>
                    <input
                      type="text"
                      list="seed-skills"
                      required
                      value={overrideSkillName}
                      onChange={(e) => setOverrideSkillName(e.target.value)}
                      placeholder="e.g. React"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Override Proficiency</label>
                    <select
                      value={overrideProficiency}
                      onChange={(e) => setOverrideProficiency(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                    >
                      <option value={5}>Level 5 - Expert</option>
                      <option value={4}>Level 4 - Advanced</option>
                      <option value={3}>Level 3 - Competent</option>
                      <option value={2}>Level 2 - Developing</option>
                      <option value={1}>Level 1 - Novice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">TL Notes / Rationale</label>
                  <input
                    type="text"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="e.g. Completed specialized migration module on prior sprint..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    Apply Project Override
                  </button>
                </div>
              </form>
            )}

            {/* Overrides Table */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Active Project Overrides
              </span>
              {effectiveSkills.filter((s) => s.isOverridden).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic border border-dashed border-slate-200 rounded-lg">
                  No active project-specific overrides. Master skills are in effect.
                </p>
              ) : (
                <div className="space-y-2">
                  {effectiveSkills.filter((s) => s.isOverridden).map((sk) => (
                    <div
                      key={sk.skillName}
                      className="p-3 bg-amber-50/40 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sk.skillName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Overridden: Level {sk.proficiencyLevel} (Base: Level {sk.baseProficiency})
                          </span>
                        </div>
                        {sk.overrideNotes && (
                          <p className="text-slate-600 mt-1 italic">"{sk.overrideNotes}"</p>
                        )}
                      </div>

                      {isTLOrAbove && (
                        <button
                          onClick={() => handleRemoveOverride(sk.skillName)}
                          className="px-2.5 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                        >
                          Revert to Master
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
