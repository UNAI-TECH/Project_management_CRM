import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ProjectDocument } from '../../types';
import { ChevronDown, Search, Check, FileText, X, Plus, BookOpen, ExternalLink } from 'lucide-react';

interface DocumentSelectProps {
  value: string;
  onChange: (sourceName: string) => void;
  projectDocuments: ProjectDocument[];
  placeholder?: string;
  className?: string;
}

const COMMON_SOURCES = [
  'Client RFP / Scope Document',
  'Stakeholder Workshop',
  'User Research & Interviews',
  'Regulatory & Compliance Mandate',
  'Product Roadmap & Strategy',
  'Architecture Spike / PoC',
];

export const DocumentSelect: React.FC<DocumentSelectProps> = ({
  value,
  onChange,
  projectDocuments,
  placeholder = 'Select Source / Reference...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 320,
    placeAbove: false,
  });

  // Filtered project docs
  const filteredProjectDocs = useMemo(() => {
    if (!searchTerm.trim()) return projectDocuments;
    const term = searchTerm.toLowerCase();
    return projectDocuments.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        (d.docNumber && d.docNumber.toLowerCase().includes(term)) ||
        d.phase.toLowerCase().includes(term)
    );
  }, [projectDocuments, searchTerm]);

  // Filtered standard sources
  const filteredCommonSources = useMemo(() => {
    if (!searchTerm.trim()) return COMMON_SOURCES;
    const term = searchTerm.toLowerCase();
    return COMMON_SOURCES.filter((s) => s.toLowerCase().includes(term));
  }, [searchTerm]);

  // Recalculate fixed popup position
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const width = Math.max(rect.width, 320);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 16));
    const top = placeAbove ? Math.max(10, rect.top - dropdownHeight - 4) : rect.bottom + 4;

    setCoords({
      top,
      left,
      width,
      placeAbove,
    });
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (selectedText: string) => {
    onChange(selectedText);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleOpen}
        className={`w-full min-h-[36px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs bg-white hover:bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 transition-all text-left shadow-2xs ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
          {value ? (
            <span className="font-semibold text-slate-900 truncate">{value}</span>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {value && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear source"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu rendered via Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Box */}
            <div className="p-2 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search project docs or sources..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1 bg-white">
              {/* Group 1: Project Lifecycle Documents */}
              {filteredProjectDocs.length > 0 && (
                <div className="py-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-blue-600" />
                    <span>Project Lifecycle Documents</span>
                  </div>
                  {filteredProjectDocs.map((doc) => {
                    const docDisplay = `${doc.name} (${doc.docNumber || `PL-${doc.templateId}`})`;
                    const isSelected = value === docDisplay || value === doc.name;

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelect(docDisplay)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/90 text-blue-950 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span>{doc.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-blue-700">
                              {doc.docNumber || `PL-${doc.templateId}`}
                            </span>
                            <span>• Phase: {doc.phase}</span>
                            <span
                              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                doc.status === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Group 2: Standard Reference Sources */}
              {filteredCommonSources.length > 0 && (
                <div className="py-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                    <span>External & Governance Sources</span>
                  </div>
                  {filteredCommonSources.map((source) => {
                    const isSelected = value === source;

                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => handleSelect(source)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/90 text-indigo-950 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-medium text-slate-800 truncate">{source}</div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Allow Custom Source Entry */}
              {searchTerm.trim() &&
                !filteredProjectDocs.some((d) => d.name.toLowerCase() === searchTerm.trim().toLowerCase()) &&
                !filteredCommonSources.some((s) => s.toLowerCase() === searchTerm.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="w-full flex items-center gap-2 p-2 mt-1 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Use custom source: &quot;{searchTerm.trim()}&quot;</span>
                  </button>
                )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
