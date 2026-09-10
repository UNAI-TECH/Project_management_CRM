import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TeamMember } from '../../types';
import { ChevronDown, Search, Check, User, X, Plus, Users } from 'lucide-react';

interface EmployeeSelectProps {
  value: string;
  onChange: (member: { name: string; designation?: string; department?: string }) => void;
  teamMembers: TeamMember[];
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  value,
  onChange,
  teamMembers,
  placeholder = 'Select Employee...',
  className = '',
  multiple = false,
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

  // Deduplicate and filter team members strictly to unique organization members
  const uniqueMembers = useMemo(() => {
    const map = new Map<string, TeamMember>();
    (teamMembers || []).forEach((m) => {
      const name = m.name?.trim();
      if (!name || name === 'Team Member' || name === 'Member') return;
      const key = (m.email ? m.email.toLowerCase() : name.toLowerCase()).trim();
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values());
  }, [teamMembers]);

  // Selected names parsed for multiple mode
  const selectedNames = useMemo(() => {
    if (!value) return [];
    if (!multiple) return [value.trim()];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value, multiple]);

  // Find currently selected member if single mode
  const selectedSingleMember = useMemo(() => {
    if (multiple || !value) return null;
    return uniqueMembers.find((m) => m.name.toLowerCase() === value.trim().toLowerCase()) || null;
  }, [value, uniqueMembers, multiple]);

  // Filtered members based on search
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return uniqueMembers;
    const term = searchTerm.toLowerCase();
    return uniqueMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.designation && m.designation.toLowerCase().includes(term)) ||
        (m.role && m.role.toLowerCase().includes(term)) ||
        (m.department && m.department.toLowerCase().includes(term)) ||
        (m.email && m.email.toLowerCase().includes(term))
    );
  }, [uniqueMembers, searchTerm]);

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

  const handleToggleMember = (memberName: string) => {
    if (!multiple) {
      const matched = uniqueMembers.find((m) => m.name.toLowerCase() === memberName.toLowerCase());
      onChange({
        name: memberName,
        designation: matched?.designation || matched?.role,
        department: matched?.department,
      });
      setIsOpen(false);
      setSearchTerm('');
      return;
    }

    const exists = selectedNames.some((n) => n.toLowerCase() === memberName.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = selectedNames.filter((n) => n.toLowerCase() !== memberName.toLowerCase());
    } else {
      nextList = [...selectedNames, memberName];
    }
    onChange({ name: nextList.join(', ') });
  };

  const handleRemoveSingleFromMulti = (e: React.MouseEvent, nameToRemove: string) => {
    e.stopPropagation();
    const nextList = selectedNames.filter((n) => n.toLowerCase() !== nameToRemove.toLowerCase());
    onChange({ name: nextList.join(', ') });
  };

  const handleSelectPreset = (presetMembers: TeamMember[]) => {
    const names = presetMembers.map((m) => m.name);
    onChange({ name: names.join(', ') });
  };

  const handleCustomInput = (customName: string) => {
    if (multiple) {
      if (!selectedNames.includes(customName)) {
        const nextList = [...selectedNames, customName];
        onChange({ name: nextList.join(', ') });
      }
    } else {
      onChange({ name: customName });
      setIsOpen(false);
    }
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ name: '' });
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
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 py-0.5">
          {multiple ? (
            selectedNames.length > 0 ? (
              selectedNames.map((name) => {
                const member = uniqueMembers.find((m) => m.name.toLowerCase() === name.toLowerCase());
                const avatar =
                  member?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0d82ff,00d1ff,6366f1`;

                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md text-[11px] font-semibold"
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="w-3.5 h-3.5 rounded-full object-cover border border-blue-200"
                    />
                    <span className="truncate max-w-[110px]">{name}</span>
                    <span
                      onClick={(e) => handleRemoveSingleFromMulti(e, name)}
                      className="hover:text-rose-600 cursor-pointer ml-0.5 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                );
              })
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400 font-normal">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{placeholder || 'Select Audience / Attendees...'}</span>
              </span>
            )
          ) : selectedSingleMember ? (
            <div className="flex items-center gap-2 truncate">
              <img
                src={
                  selectedSingleMember.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedSingleMember.name)}&backgroundColor=0d82ff,00d1ff,6366f1`
                }
                alt={selectedSingleMember.name}
                className="w-4 h-4 rounded-full flex-shrink-0 object-cover border border-slate-200"
              />
              <span className="font-semibold text-slate-900 truncate">{selectedSingleMember.name}</span>
              <span className="text-[10px] text-slate-400 font-normal truncate hidden sm:inline">
                ({selectedSingleMember.designation || selectedSingleMember.role})
              </span>
            </div>
          ) : value ? (
            <div className="flex items-center gap-2 truncate">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-700">
                {value.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-900 truncate">{value}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 font-normal">
              <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {value && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu rendered via Portal to prevent table clipping */}
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
            {/* Quick presets for multiple mode */}
            {multiple && uniqueMembers.length > 0 && (
              <div className="p-2 bg-slate-50/90 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(uniqueMembers)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                >
                  All Team ({uniqueMembers.length})
                </button>
                {uniqueMembers.some(
                  (m) => m.department?.toLowerCase().includes('eng') || m.role === 'Employee' || m.role === 'TL'
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPreset(
                        uniqueMembers.filter(
                          (m) => m.department?.toLowerCase().includes('eng') || m.role === 'Employee' || m.role === 'TL'
                        )
                      )
                    }
                    className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                  >
                    Tech / Devs
                  </button>
                )}
                {uniqueMembers.some(
                  (m) => m.role === 'CTO' || m.role === 'PM' || m.role === 'TL' || m.role === 'CEO'
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPreset(
                        uniqueMembers.filter(
                          (m) => m.role === 'CTO' || m.role === 'PM' || m.role === 'TL' || m.role === 'CEO'
                        )
                      )
                    }
                    className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors cursor-pointer"
                  >
                    Leadership
                  </button>
                )}
              </div>
            )}

            {/* Search Box */}
            <div className="p-2 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employee, role, or department..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 bg-white">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const isSelected = selectedNames.some((n) => n.toLowerCase() === member.name.toLowerCase());
                  const avatarUrl =
                    member.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=0d82ff,00d1ff,6366f1`;

                  return (
                    <button
                      key={member.id || member.email || member.name}
                      type="button"
                      onClick={() => handleToggleMember(member.name)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/90 text-blue-950 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {multiple ? (
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        ) : null}

                        <img
                          src={avatarUrl}
                          alt={member.name}
                          className="w-7 h-7 rounded-full flex-shrink-0 object-cover border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.role === 'CTO' || member.role === 'CEO' ? (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                {member.role}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[10px] text-blue-600 font-medium truncate">
                            {member.designation || member.role} {member.department ? `• ${member.department}` : ''}
                          </div>
                          {member.email && (
                            <div className="text-[9px] text-slate-400 truncate">{member.email}</div>
                          )}
                        </div>
                      </div>

                      {!multiple && isSelected && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No matching organization employees found.
                </div>
              )}

              {/* Allow custom name / group entry */}
              {searchTerm.trim() &&
                !uniqueMembers.some((m) => m.name.toLowerCase() === searchTerm.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleCustomInput(searchTerm.trim())}
                    className="w-full flex items-center gap-2 p-2 mt-1 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span className="truncate">Add custom: &quot;{searchTerm.trim()}&quot;</span>
                  </button>
                )}
            </div>

            {/* Done / Close Button for Multiple Mode */}
            {multiple && (
              <div className="p-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  {selectedNames.length} attendee{selectedNames.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
