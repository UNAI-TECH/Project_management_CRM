import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ProjectDocument } from '../../types';
import { Download } from '../icons';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface ExportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProjectDocument | null;
  onExport: (format: 'docx' | 'pdf', options: { coverPage: boolean; approvalSection: boolean; auditTrail: boolean }) => void;
}

export const ExportDocumentModal: React.FC<ExportDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onExport,
}) => {
  const { user, documentBranding } = useAuth();
  const { tasks } = useData();
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx');
  const [coverPage, setCoverPage] = useState(true);
  const [approvalSection, setApprovalSection] = useState(true);
  const [auditTrail, setAuditTrail] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!document) return null;

  const linkedTasks = tasks.filter(
    (t) => t.docId === document.id || t.templateId === document.templateId || t.projectId === document.projectId
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'docx') {
        await exportService.exportToDocx(document, documentBranding, user?.organizationName, linkedTasks);
      } else {
        await exportService.exportToPdf(document, documentBranding, user?.organizationName, user?.organizationLogo, linkedTasks);
      }
      onExport(format, {
        coverPage,
        approvalSection,
        auditTrail,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Document"
      subtitle="Render digitized JSON form data back into formatted .docx or .pdf template"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Document Info Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Document:</span>
            <span className="font-bold text-slate-800">{document.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Phase:</span>
            <span className="font-semibold text-blue-700">{document.phase}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Version:</span>
            <span className="font-semibold text-slate-700">v{document.version}</span>
          </div>
        </div>

        {/* Format Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                format === 'docx'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-blue-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="export_format"
                checked={format === 'docx'}
                onChange={() => setFormat('docx')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold">Word (.docx)</p>
                <p className="text-[10px] text-slate-500">Exact Word template layout</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                format === 'pdf'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-blue-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="export_format"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold">PDF (.pdf)</p>
                <p className="text-[10px] text-slate-500">Print & client ready</p>
              </div>
            </label>
          </div>
        </div>

        {/* Include Checkboxes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Include in Export
          </label>
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={coverPage}
                onChange={(e) => setCoverPage(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Cover Page with {user?.organizationName || 'Company'} Signature Branding</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={approvalSection}
                onChange={(e) => setApprovalSection(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Approval Section (CTO / Sponsor Sign-off)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={auditTrail}
                onChange={(e) => setAuditTrail(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Audit Trail & Version Change Log</span>
            </label>
          </div>
        </div>

        {/* Dynamic Watermark & Branding Info Pill */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between text-blue-900">
          <div className="flex items-center gap-2">
            <span className="font-bold">Watermark:</span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-semibold text-[11px]">
              {documentBranding?.watermark?.enabled
                ? documentBranding.watermark.type === 'logo'
                  ? 'Company Logo'
                  : documentBranding.watermark.text || 'CONFIDENTIAL'
                : 'Disabled'}
            </span>
            <span className="text-[11px] text-blue-700">
              ({documentBranding?.watermark?.opacity ?? 15}% Opacity • {documentBranding?.watermark?.orientation || 'diagonal'})
            </span>
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Customized</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isExporting ? (
              <span>Generating {format.toUpperCase()}...</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
