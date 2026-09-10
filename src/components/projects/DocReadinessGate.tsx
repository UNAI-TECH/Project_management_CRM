import React from 'react';
import { ProjectDocument } from '../../types';
import { featureService } from '../../services/featureService';
import { ShieldCheck, CheckCircle2, XCircle, Sparkles, FileText, ArrowRight } from 'lucide-react';

interface DocReadinessGateProps {
  documents: ProjectDocument[];
  onOpenInitializeModal: () => void;
  canInitialize: boolean;
  hasExistingFeatures: boolean;
}

export const DocReadinessGate: React.FC<DocReadinessGateProps> = ({
  documents,
  onOpenInitializeModal,
  canInitialize,
  hasExistingFeatures,
}) => {
  const check = featureService.checkMandatoryDocsApproved(documents);

  const docList = [
    { id: 5, name: 'Functional Specification (FDS)', phase: 'Design Phase', desc: 'Screen logic, user flows, and error rules' },
    { id: 6, name: 'Technical Specification (TDS)', phase: 'Design Phase', desc: 'API endpoints, database schema, algorithms' },
    { id: 7, name: 'Architecture Document (ARCH)', phase: 'Design Phase', desc: 'System topology, components, caching & messaging' },
    { id: 8, name: 'UI/UX Design Document', phase: 'Design Phase', desc: 'Figma wireframes, screens, design tokens' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100/80 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Documentation-Driven Task Gate
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            All 4 mandatory baseline specifications must be approved before feature deliverables and tasks can be extracted and assigned to engineering leads.
          </p>
        </div>

        <div>
          {check.isReady ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Gate Passed: All 4 Docs Approved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Gate Locked: Awaiting Approval</span>
            </span>
          )}
        </div>
      </div>

      {/* Mandatory Docs 4-Grid Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {docList.map((docDef) => {
          const statusObj = check.statuses[docDef.id];
          const isApproved = statusObj?.approved;
          const statusText = statusObj?.status || 'Missing';

          return (
            <div
              key={docDef.id}
              className={`p-4 rounded-2xl border transition-all ${
                isApproved
                  ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-300/30'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Doc #{docDef.id}
                </span>
                {isApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">
                {docDef.name}
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {docDef.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{docDef.phase}</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <p className="text-[11px] text-slate-500">
          {check.isReady
            ? 'Architecture modules, APIs, functions, and wireframes are ready for auto-extraction into feature tasks.'
            : `Please complete and obtain CTO/PM approval for ${check.unapprovedDocs.join(', ') || check.missingDocs.join(', ')}.`}
        </p>

        {canInitialize && (
          <button
            type="button"
            disabled={!check.isReady}
            onClick={onOpenInitializeModal}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              check.isReady
                ? 'bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] text-white hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transform hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{hasExistingFeatures ? 'Re-extract / Update Feature Registry' : 'Auto-Extract & Initialize Feature Tasks'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
