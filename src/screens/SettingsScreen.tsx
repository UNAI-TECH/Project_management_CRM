import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Settings as SettingsIcon, 
  FileText, 
  ShieldCheck, 
  Calendar, 
  Lock,
  Plus,
  X,
  Mail,
  User,
  Briefcase,
  Building2,
  UserPlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Layers,
  Type,
  Printer,
  FileDown,
  Download,
  Upload,
  Image,
  Trash2,
  Loader2,
  Edit2,
  CheckCircle2,
  Award,
  Globe,
  Phone,
  ShieldAlert,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { supabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { exportService } from '../services/exportService';
import { 
  uploadCustomWatermarkImage, 
  uploadCompanyLogo, 
  updateOrganizationDetails, 
  updateMemberDesignationAndRole 
} from '../lib/onboardingAuth';

interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  isActive: boolean;
}

export const SettingsScreen: React.FC = () => {
  const { user, role, canManageUsers, inviteUser, documentBranding, updateDocumentBranding, transferOwnership, isFullAccessAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'templates' | 'users' | 'workflow' | 'notifications' | 'integrations' | 'backup'>('company');
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // Company Profile & Ownership state
  const [compName, setCompName] = useState(user?.organizationName || 'UNAI Tech Innovations Pvt Ltd');
  const [compRegNo, setCompRegNo] = useState('U72200TZ2023PTC012345');
  const [compIndustry, setCompIndustry] = useState('Information Technology & Software Services');
  const [compCountry, setCompCountry] = useState('India');
  const [compEmail, setCompEmail] = useState('corporate@unaitech.com');
  const [compPhone, setCompPhone] = useState('+91 98765 43210');
  const [compEmployeeCount, setCompEmployeeCount] = useState('51-200 employees');
  const [compAbout, setCompAbout] = useState('Enterprise software architecture, AI document governance, and project lifecycle management solutions.');
  const [compLogoUrl, setCompLogoUrl] = useState<string | undefined>(user?.organizationLogo);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companySavedMsg, setCompanySavedMsg] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);

  // Transfer Ownership state
  const [orgOnboardedBy, setOrgOnboardedBy] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Admin Designation & Role Edit Modal state
  const [editingAdmin, setEditingAdmin] = useState<UserListItem | null>(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CTO');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [adminUpdateSuccess, setAdminUpdateSuccess] = useState(false);

  // Document Branding Settings state
  const [wmEnabled, setWmEnabled] = useState(documentBranding?.watermark?.enabled ?? true);
  const [wmType, setWmType] = useState<'logo' | 'custom' | 'text'>(
    documentBranding?.watermark?.type === 'text' ? 'custom' : (documentBranding?.watermark?.type || 'logo')
  );
  const [wmCustomType, setWmCustomType] = useState<'text' | 'image'>(
    documentBranding?.watermark?.customType || (documentBranding?.watermark?.customImageUrl ? 'image' : 'text')
  );
  const [wmText, setWmText] = useState(documentBranding?.watermark?.text || 'CONFIDENTIAL');
  const [wmCustomImageUrl, setWmCustomImageUrl] = useState<string | undefined>(documentBranding?.watermark?.customImageUrl);
  const [isUploadingCustomWm, setIsUploadingCustomWm] = useState(false);
  const [wmFaded, setWmFaded] = useState(documentBranding?.watermark?.isFaded ?? true);
  const [wmOpacity, setWmOpacity] = useState(documentBranding?.watermark?.opacity ?? 15);
  const [wmSize, setWmSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(documentBranding?.watermark?.size || 'md');
  const [wmOrientation, setWmOrientation] = useState<'diagonal' | 'horizontal'>(documentBranding?.watermark?.orientation || 'diagonal');

  const [hdrLeftText, setHdrLeftText] = useState(documentBranding?.header?.leftText || user?.organizationName || '');
  const [hdrRightText, setHdrRightText] = useState(documentBranding?.header?.rightText || 'PM CRM Engineering Deliverable');
  const [hdrAlignment, setHdrAlignment] = useState<'left' | 'center' | 'right' | 'split'>(documentBranding?.header?.alignment || 'split');
  const [hdrLayout, setHdrLayout] = useState<'inline' | 'stacked'>(documentBranding?.header?.layout || 'inline');
  const [hdrIsBold, setHdrIsBold] = useState<boolean>(documentBranding?.header?.isBold ?? true);

  const [ftrCopyright, setFtrCopyright] = useState(documentBranding?.footer?.copyrightText || 'All Rights Reserved');
  const [ftrConfidentiality, setFtrConfidentiality] = useState(documentBranding?.footer?.confidentialityNotice || 'Strictly Confidential - Internal & Client Delivery Use Only');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSavedMsg, setBrandingSavedMsg] = useState(false);
  const [isExportingTest, setIsExportingTest] = useState(false);

  // Handle custom watermark file upload to 'watermarks' bucket
  const handleCustomWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCustomWm(true);
    try {
      const publicUrl = await uploadCustomWatermarkImage(file);
      if (publicUrl) {
        setWmCustomImageUrl(publicUrl);
        setWmCustomType('image');
        setWmType('custom');

        // Immediately persist to Supabase organizations table so it stays saved
        await updateDocumentBranding({
          watermark: {
            enabled: wmEnabled,
            type: 'custom',
            customType: 'image',
            text: wmText,
            customImageUrl: publicUrl,
            isFaded: wmFaded,
            opacity: wmOpacity,
            size: wmSize,
            orientation: wmOrientation,
          },
          header: {
            enabled: true,
            showLogo: true,
            alignment: hdrAlignment,
            layout: hdrLayout,
            isBold: hdrIsBold,
            leftText: hdrLeftText,
            rightText: hdrRightText,
          },
          footer: {
            enabled: true,
            copyrightText: ftrCopyright,
            showPageNumber: true,
            confidentialityNotice: ftrConfidentiality,
          },
        });

        setBrandingSavedMsg(true);
        setTimeout(() => setBrandingSavedMsg(false), 3000);
      }
    } catch (err) {
      console.error('Failed to upload custom watermark image:', err);
    } finally {
      setIsUploadingCustomWm(false);
    }
  };

  // Test Export Function
  const handleDownloadTestDocument = async (format: 'pdf' | 'docx' = 'pdf') => {
    setIsExportingTest(true);
    try {
      await exportService.exportSampleTestDeliverable(
        {
          watermark: {
            enabled: wmEnabled,
            type: wmType === 'text' ? 'custom' : wmType,
            customType: wmCustomType,
            text: wmText,
            customImageUrl: wmCustomType === 'image' ? wmCustomImageUrl : undefined,
            isFaded: wmFaded,
            opacity: wmOpacity,
            size: wmSize,
            orientation: wmOrientation,
          },
          header: {
            enabled: true,
            showLogo: true,
            alignment: hdrAlignment,
            layout: hdrLayout,
            isBold: hdrIsBold,
            leftText: hdrLeftText,
            rightText: hdrRightText,
          },
          footer: {
            enabled: true,
            copyrightText: ftrCopyright,
            showPageNumber: true,
            confidentialityNotice: ftrConfidentiality,
          },
        },
        user?.organizationName || hdrLeftText || 'Organization',
        user?.organizationLogo,
        format
      );
    } catch (err) {
      console.error('Failed to export test document:', err);
    } finally {
      setIsExportingTest(false);
    }
  };

  // Sync state if user documentBranding updates
  useEffect(() => {
    if (documentBranding) {
      setWmEnabled(documentBranding.watermark?.enabled ?? true);
      setWmType(documentBranding.watermark?.type === 'text' ? 'custom' : (documentBranding.watermark?.type || 'logo'));
      setWmCustomType(documentBranding.watermark?.customType || (documentBranding.watermark?.customImageUrl ? 'image' : 'text'));
      setWmText(documentBranding.watermark?.text || 'CONFIDENTIAL');
      setWmCustomImageUrl(documentBranding.watermark?.customImageUrl);
      setWmFaded(documentBranding.watermark?.isFaded ?? true);
      setWmOpacity(documentBranding.watermark?.opacity ?? 15);
      setWmSize(documentBranding.watermark?.size || 'md');
      setWmOrientation(documentBranding.watermark?.orientation || 'diagonal');

      setHdrLeftText(documentBranding.header?.leftText || user?.organizationName || '');
      setHdrRightText(documentBranding.header?.rightText || 'PM CRM Engineering Deliverable');
      setHdrAlignment(documentBranding.header?.alignment || 'split');
      setHdrLayout(documentBranding.header?.layout || 'inline');
      setHdrIsBold(documentBranding.header?.isBold ?? true);

      setFtrCopyright(documentBranding.footer?.copyrightText || 'All Rights Reserved');
      setFtrConfidentiality(documentBranding.footer?.confidentialityNotice || 'Strictly Confidential - Internal & Client Delivery Use Only');
    }
  }, [documentBranding, user?.organizationName]);

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await updateDocumentBranding({
        watermark: {
          enabled: wmEnabled,
          type: wmType === 'text' ? 'custom' : wmType,
          customType: wmCustomType,
          text: wmText,
          customImageUrl: wmCustomType === 'image' ? wmCustomImageUrl : undefined,
          isFaded: wmFaded,
          opacity: wmOpacity,
          size: wmSize,
          orientation: wmOrientation,
        },
        header: {
          enabled: true,
          showLogo: true,
          alignment: hdrAlignment,
          layout: hdrLayout,
          isBold: hdrIsBold,
          leftText: hdrLeftText,
          rightText: hdrRightText,
        },
        footer: {
          enabled: true,
          copyrightText: ftrCopyright,
          showPageNumber: true,
          confidentialityNotice: ftrConfidentiality,
        },
      });
      setBrandingSavedMsg(true);
      setTimeout(() => setBrandingSavedMsg(false), 3500);
    } catch (err) {
      console.error('Failed to save document branding:', err);
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Invite User Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Employee');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const loadOnboardingData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch organization members (scoped to current organization)
      let membersQuery = supabaseClient
        .from('organization_members')
        .select('*');

      if (user?.organizationId) {
        membersQuery = membersQuery.eq('organization_id', user.organizationId);
      }

      const { data: members, error } = await membersQuery;

      if (error) {
        console.warn('organization_members query notice:', error.message);
      }

      if (members && members.length > 0) {
        const mapped: UserListItem[] = members.map((m: any) => ({
          id: m.id || m.auth_user_id,
          fullName: m.full_name || m.email?.split('@')[0] || 'Member',
          email: m.email || '',
          role: m.role || 'Employee',
          department: m.department || 'Engineering',
          designation: m.designation || (m.role === 'CTO' ? 'Chief Technology Officer' : m.role === 'CIO' ? 'Chief Information Officer' : 'Software Engineer'),
          isActive: m.is_active ?? true,
        }));
        setUsersList(mapped);
      } else {
        setUsersList([]);
      }

      // 2. Fetch organization details if available
      if (user?.organizationId) {
        const { data: orgData } = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('id', user.organizationId)
          .maybeSingle();

        if (orgData) {
          setOrgOnboardedBy(orgData.onboarded_by || null);
          if (orgData.name) setCompName(orgData.name);
          if (orgData.registration_no) setCompRegNo(orgData.registration_no);
          if (orgData.industry) setCompIndustry(orgData.industry);
          if (orgData.country) setCompCountry(orgData.country);
          if (orgData.company_email) setCompEmail(orgData.company_email);
          if (orgData.contact_number) setCompPhone(orgData.contact_number);
          if (orgData.employee_count) setCompEmployeeCount(orgData.employee_count);
          if (orgData.about_company) setCompAbout(orgData.about_company);
          if (orgData.logo_url) setCompLogoUrl(orgData.logo_url);
        }
      }
    } catch (err) {
      console.error('Error fetching settings data:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    loadOnboardingData();
  }, [loadOnboardingData]);

  const handleSaveCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      await updateOrganizationDetails(user?.organizationId || 'org-default', {
        name: compName,
        registrationNo: compRegNo,
        industry: compIndustry,
        country: compCountry,
        companyEmail: compEmail,
        contactNumber: compPhone,
        employeeCount: compEmployeeCount,
        aboutCompany: compAbout,
        logoUrl: compLogoUrl,
      });
      setCompanySavedMsg(true);
      setTimeout(() => setCompanySavedMsg(false), 3500);
    } catch (err) {
      console.error('Failed to save company details:', err);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCompanyLogo(true);
    try {
      const publicUrl = await uploadCompanyLogo(file);
      if (publicUrl) {
        setCompLogoUrl(publicUrl);
        await updateOrganizationDetails(user?.organizationId || 'org-default', {
          logoUrl: publicUrl,
        });
      }
    } catch (err) {
      console.error('Company logo upload error:', err);
    } finally {
      setIsUploadingCompanyLogo(false);
    }
  };

  const handleSaveAdminDesignation = async () => {
    if (!editingAdmin) return;
    setIsUpdatingAdmin(true);
    try {
      await updateMemberDesignationAndRole(editingAdmin.id, {
        designation: editDesignation.trim(),
        role: editRole,
      });

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingAdmin.id
            ? { ...u, designation: editDesignation.trim(), role: editRole }
            : u
        )
      );

      setAdminUpdateSuccess(true);
      setTimeout(() => {
        setEditingAdmin(null);
        setAdminUpdateSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Error updating admin designation:', err);
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteFullName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and email are required.');
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      await inviteUser({
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
        department: inviteDepartment,
        designation: inviteDesignation || inviteRole,
      });

      // Add to local list immediately
      setUsersList((prev) => [
        ...prev,
        {
          id: `invited-${Date.now()}`,
          fullName: inviteFullName,
          email: inviteEmail,
          role: inviteRole,
          department: inviteDepartment,
          designation: inviteDesignation || inviteRole,
          isActive: true,
        },
      ]);

      setInviteSuccess(true);
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(false);
        setInviteFullName('');
        setInviteEmail('');
        setInviteRole('Employee');
        setInviteDepartment('Engineering');
        setInviteDesignation('');
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite user.');
    } finally {
      setInviteLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    CEO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    MD: 'bg-teal-50 text-teal-800 border-teal-200',
    COO: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    CTO: 'bg-purple-50 text-purple-800 border-purple-200',
    CIO: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    PM: 'bg-blue-50 text-blue-800 border-blue-200',
    TL: 'bg-amber-50 text-amber-800 border-amber-200',
    Employee: 'bg-slate-50 text-slate-700 border-slate-200',
    'HR Admin': 'bg-rose-50 text-rose-800 border-rose-200',
  };

  // Available SubTabs depending on Admin privileges
  const subTabItems = [
    ...(isFullAccessAdmin ? [{ id: 'company', label: 'Company & Leadership', icon: Building2 }] : []),
    { id: 'templates', label: 'Document Templates', icon: FileText },
    ...(isFullAccessAdmin ? [
      { id: 'users', label: 'Users & Roles', icon: Users },
      { id: 'workflow', label: 'Workflow & CRUD Rules', icon: Lock },
    ] : []),
    { id: 'notifications', label: 'Notifications', icon: Calendar },
    ...(isFullAccessAdmin ? [{ id: 'integrations', label: 'Integrations (Supabase SSO)', icon: ShieldCheck }] : []),
    { id: 'backup', label: 'Backup & Restore', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Settings & System Governance
          </h2>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {user?.designation || role}
          </span>
          {isFullAccessAdmin && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Full Access Super Admin
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {isFullAccessAdmin 
            ? 'Configure enterprise Onboarding Platform sync, company profile, role grants, template schemas, and audit logging'
            : 'View workspace preferences, digitized document standards, and personal notification preferences'}
        </p>
      </div>

      {/* Main Container with Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Navigation Menu */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-1">
          {subTabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {/* ===== COMPANY & EXECUTIVE LEADERSHIP SUBTAB ===== */}
          {activeSubTab === 'company' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Company Ownership & Executive Governance</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Maintain legal corporate identity, registration details, company logo, and executive administrator designations
                  </p>
                </div>

                {companySavedMsg && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Company Details Saved</span>
                  </div>
                )}
              </div>

              {/* 1. Company Profile Form */}
              <form onSubmit={handleSaveCompanyDetails} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Legal Corporate Information</span>
                  </h4>
                </div>

                {/* Logo & Basic Info Header */}
                <div className="flex flex-col md:flex-row items-start gap-6 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2 overflow-hidden relative group">
                      {compLogoUrl ? (
                        <img
                          src={compLogoUrl}
                          alt="Company Logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-10 h-10 text-slate-300" />
                      )}
                      {isUploadingCompanyLogo && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>{isUploadingCompanyLogo ? 'Uploading...' : 'Change Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingCompanyLogo}
                        onChange={handleCompanyLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Company / Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        placeholder="e.g. Acme Tech Innovations Pvt Ltd"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Registration / CIN / Tax ID
                      </label>
                      <input
                        type="text"
                        value={compRegNo}
                        onChange={(e) => setCompRegNo(e.target.value)}
                        placeholder="e.g. U72200TZ2023PTC012345"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Industry & Sector
                      </label>
                      <input
                        type="text"
                        value={compIndustry}
                        onChange={(e) => setCompIndustry(e.target.value)}
                        placeholder="e.g. Information Technology & Services"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Country / Jurisdiction
                      </label>
                      <input
                        type="text"
                        value={compCountry}
                        onChange={(e) => setCompCountry(e.target.value)}
                        placeholder="e.g. India"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Scale Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Corporate Email</span>
                    </label>
                    <input
                      type="email"
                      value={compEmail}
                      onChange={(e) => setCompEmail(e.target.value)}
                      placeholder="corporate@company.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Contact Number</span>
                    </label>
                    <input
                      type="text"
                      value={compPhone}
                      onChange={(e) => setCompPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Employee Scale</span>
                    </label>
                    <select
                      value={compEmployeeCount}
                      onChange={(e) => setCompEmployeeCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="1-10 employees">1-10 employees</option>
                      <option value="11-50 employees">11-50 employees</option>
                      <option value="51-200 employees">51-200 employees</option>
                      <option value="201-500 employees">201-500 employees</option>
                      <option value="500+ employees">500+ employees</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    About Company & Core Mission
                  </label>
                  <textarea
                    rows={2}
                    value={compAbout}
                    onChange={(e) => setCompAbout(e.target.value)}
                    placeholder="Brief description of the organization and business domain..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingCompany}
                    className="px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingCompany ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Details...</span>
                      </>
                    ) : (
                      <span>Save Company Profile</span>
                    )}
                  </button>
                </div>
              </form>

              {/* 2. Executive Leadership & Admin Governance Table */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span>Executive Leadership & Admin Designations</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Admins, CIOs, CTOs, and Department Directors with system-wide management authority
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setIsInviteOpen(true); setInviteError(null); setInviteSuccess(false); }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] rounded-xl shadow-[0_4px_18px_rgba(13,130,255,0.35)] flex items-center gap-1.5 transition-all cursor-pointer transform hover:-translate-y-0.5 shrink-0 self-start"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Executive / Member</span>
                  </button>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Executive Name & Email</th>
                        <th className="py-3 px-4">Official Designation</th>
                        <th className="py-3 px-4">CRM System Role</th>
                        <th className="py-3 px-4">Governance Scope</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            {loadingUsers ? 'Loading executive records...' : 'No administrators registered yet.'}
                          </td>
                        </tr>
                      ) : (
                        usersList.map((m) => {
                          const isSuperAdmin = m.role === 'CTO' || m.role === 'CIO';
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                    {m.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{m.fullName}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">{m.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                                  {m.designation || (isSuperAdmin ? 'Chief Executive' : 'Senior Staff')}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    roleColors[m.role] || 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {m.role}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="text-[11px] text-slate-600 font-medium">
                                  {isSuperAdmin
                                    ? 'Enterprise Full Control'
                                    : m.role === 'PM'
                                    ? 'Project & Document Delivery'
                                    : m.role === 'TL'
                                    ? 'Team Task Coordination'
                                    : 'Task Execution & Development'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAdmin(m);
                                    setEditDesignation(m.designation || '');
                                    setEditRole((m.role as UserRole) || 'CTO');
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit Designation</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transfer Organization Ownership Card (Only visible to current Primary Organization Owner) */}
              {Boolean((orgOnboardedBy && (user?.id === orgOnboardedBy || user?.email === orgOnboardedBy)) || (role === 'CEO' && user?.id === orgOnboardedBy) || (role === 'CEO' && !orgOnboardedBy)) && (
                <div className="p-6 bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-slate-50 rounded-2xl border border-rose-200/80 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                        <h4 className="text-sm font-black text-slate-900 font-display">
                          Transfer Organization Ownership
                        </h4>
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                          Critical Governance Action
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Transfer the primary organization ownership and executive governance to another verified team member. For security, your password re-authentication is required.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTransferModalOpen(true);
                        setTransferError(null);
                        setTransferSuccess(null);
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-[0_4px_14px_rgba(225,29,72,0.3)] transition-all cursor-pointer transform hover:-translate-y-0.5 shrink-0 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Transfer Ownership</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Transfer Ownership Modal */}
              {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Transfer Organization Ownership</h4>
                          <p className="text-xs text-slate-500">Authorize transfer with current password</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsTransferModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {transferSuccess ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h5 className="text-sm font-bold text-emerald-900">Ownership Transferred</h5>
                        <p className="text-xs text-emerald-700">{transferSuccess}</p>
                      </div>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!transferTargetId || !transferPassword) {
                            setTransferError('Please select a member and enter your current password.');
                            return;
                          }
                          setTransferLoading(true);
                          setTransferError(null);
                          try {
                            const newOwner = await transferOwnership(transferTargetId, transferPassword);
                            setTransferSuccess(`Ownership successfully transferred to ${newOwner}!`);
                            await loadOnboardingData();
                            setTimeout(() => {
                              setIsTransferModalOpen(false);
                              setTransferSuccess(null);
                              setTransferPassword('');
                              setTransferTargetId('');
                            }, 2000);
                          } catch (err: any) {
                            setTransferError(err.message || 'Failed to transfer ownership.');
                          } finally {
                            setTransferLoading(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            This will promote the selected member to <strong>CEO / Owner</strong> with enterprise-wide full governance over projects, team allocations, and organization settings.
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Select New Owner / Executive *
                          </label>
                          <select
                            required
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
                          >
                            <option value="">-- Select Organization Member --</option>
                            {usersList
                              .filter((u) => u.email.toLowerCase() !== user?.email.toLowerCase())
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName} ({u.email}) — {u.role} ({u.designation})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Your Current Admin Password * (Security Re-auth)
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="password"
                              required
                              value={transferPassword}
                              onChange={(e) => setTransferPassword(e.target.value)}
                              placeholder="Enter your current password to authorize"
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                            />
                          </div>
                        </div>

                        {transferError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{transferError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsTransferModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={transferLoading || !transferTargetId || !transferPassword}
                            className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-[0_4px_14px_rgba(225,29,72,0.3)] transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {transferLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying & Transferring...</span>
                              </>
                            ) : (
                              <span>Confirm Transfer</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Edit Admin Designation & Role Modal */}
              {editingAdmin && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Edit Executive Designation</h4>
                        <p className="text-xs text-slate-500">{editingAdmin.fullName} ({editingAdmin.email})</p>
                      </div>
                      <button
                        onClick={() => setEditingAdmin(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Official Designation *
                        </label>
                        <input
                          type="text"
                          required
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          placeholder="e.g. Chief Information Officer (CIO) / Managing Director"
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          CRM System Role
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
                        >
                          <option value="CEO">CEO / Founder (Full Access)</option>
                          <option value="MD">Managing Director - MD (Full Access)</option>
                          <option value="COO">COO (Full Access)</option>
                          <option value="CTO">CTO (Chief Technology Officer)</option>
                          <option value="CIO">CIO (Chief Information Officer)</option>
                          <option value="PM">Project Manager (PM)</option>
                          <option value="TL">Team Lead (TL)</option>
                          <option value="Employee">Employee (Developer/Designer)</option>
                        </select>
                      </div>
                    </div>

                    {adminUpdateSuccess && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Designation & Role updated successfully!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingAdmin(null)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingAdmin || !editDesignation.trim()}
                        onClick={handleSaveAdminDesignation}
                        className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isUpdatingAdmin ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSubTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Users & Role Grants</h3>
                  <p className="text-xs text-slate-500">
                    Manage organization users and their PM CRM role assignments
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start">
                  {canManageUsers && (
                    <button
                      onClick={() => { setIsInviteOpen(true); setInviteError(null); setInviteSuccess(false); }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                      <span>Invite User</span>
                    </button>
                  )}
                  <a
                    href="https://onboarding.unaitech.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] text-white font-bold text-xs rounded-xl shadow-[0_4px_18px_rgba(13,130,255,0.35)] flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>HR Platform</span>
                  </a>
                </div>
              </div>

              {loadingUsers ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading user profiles from Onboarding Platform...</div>
              ) : usersList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No active employees found in Onboarding database.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3">User</th>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">CRM Role</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                                {usr.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{usr.fullName}</p>
                                <span className="text-[11px] text-slate-400 font-mono">{usr.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-slate-600">
                            {usr.department}
                          </td>
                          <td className="py-3 font-semibold text-slate-700">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${roleColors[usr.role] || roleColors.Employee}`}>
                              {usr.role}
                            </span>
                          </td>
                          <td className="py-3">
                            {usr.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-300">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'templates' && (
            <div className="space-y-6 text-xs animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">Document Template & Letterhead Branding</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Customize default watermark, faded translucency, headers, and footers for all 16 CRM deliverables.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={isSavingBranding}
                  className="px-5 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isSavingBranding ? 'Saving...' : 'Save Branding Changes'}</span>
                </button>
              </div>

              {brandingSavedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-fade-in">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">Document template & letterhead branding updated successfully in Supabase!</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Watermark, Header & Footer Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Watermark Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Document Watermark
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wmEnabled}
                          onChange={(e) => setWmEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {wmEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWmType('logo')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              wmType === 'logo'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Company Logo Watermark
                          </button>
                          <button
                            type="button"
                            onClick={() => setWmType('custom')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              wmType === 'custom' || wmType === 'text'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Custom Watermark
                          </button>
                        </div>

                        {/* Custom Watermark Sub-options */}
                        {(wmType === 'custom' || wmType === 'text') && (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">Custom Mode:</span>
                              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setWmCustomType('text')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    wmCustomType === 'text'
                                      ? 'bg-white text-blue-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Shortform / Text
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWmCustomType('image')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    wmCustomType === 'image'
                                      ? 'bg-white text-blue-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Upload Custom Logo / Icon
                                </button>
                              </div>
                            </div>

                            {wmCustomType === 'text' ? (
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Watermark Text / Shortform Acronym
                                </label>
                                <input
                                  type="text"
                                  value={wmText}
                                  onChange={(e) => setWmText(e.target.value)}
                                  placeholder="e.g. ST (Swaxthika Travels) / UNAI / CONFIDENTIAL"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                />
                                <span className="text-[10px] text-slate-600 mt-1 block">
                                  Tip: Enter your company shortform (e.g. ST) or document classification (e.g. DRAFT).
                                </span>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                                  Custom Watermark Image / Icon (Supabase 'watermarks' Storage)
                                </label>
                                {wmCustomImageUrl ? (
                                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                      <img
                                        src={wmCustomImageUrl}
                                        alt="Custom watermark preview"
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-slate-800 truncate">Custom Watermark Active</div>
                                      <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Stored in 'watermarks' bucket
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors">
                                        Replace
                                        <input
                                          type="file"
                                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                          onChange={handleCustomWatermarkUpload}
                                          className="sr-only"
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setWmCustomImageUrl(undefined)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove custom watermark image"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/50 group">
                                    {isUploadingCustomWm ? (
                                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Uploading to 'watermarks' storage...</span>
                                      </div>
                                    ) : (
                                      <>
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-1 transition-colors" />
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">
                                          Click to upload Custom Watermark Image / Icon
                                        </span>
                                        <span className="text-[10px] text-slate-600 mt-0.5">
                                          PNG, SVG, JPG or WEBP (transparent background recommended)
                                        </span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                      disabled={isUploadingCustomWm}
                                      onChange={handleCustomWatermarkUpload}
                                      className="sr-only"
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Watermark Size Selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Watermark Logo / Text Size:</label>
                          <div className="grid grid-cols-4 gap-2">
                            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setWmSize(sz)}
                                className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                                  wmSize === sz
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {sz === 'sm' && 'Small'}
                                {sz === 'md' && 'Medium'}
                                {sz === 'lg' && 'Large'}
                                {sz === 'xl' && 'X-Large'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Watermark Angle / Orientation Selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Watermark Angle & Orientation:</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setWmOrientation('diagonal')}
                              className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                                wmOrientation === 'diagonal'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Diagonal / Tilted (-30°)
                            </button>
                            <button
                              type="button"
                              onClick={() => setWmOrientation('horizontal')}
                              className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                                wmOrientation === 'horizontal'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Horizontal / Straight (0°)
                            </button>
                          </div>
                        </div>

                        {/* Faded Preset & Opacity Slider */}
                        <div className="pt-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-700">Watermark Translucency:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setWmFaded(true); setWmOpacity(15); }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                  wmFaded ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Faded (15%)
                              </button>
                              <button
                                type="button"
                                onClick={() => { setWmFaded(false); setWmOpacity(40); }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                  !wmFaded ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Standard (40%)
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="5"
                              max="70"
                              value={wmOpacity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setWmOpacity(val);
                                setWmFaded(val <= 20);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <span className="font-mono font-bold text-slate-700 w-10 text-right">{wmOpacity}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Header & Footer Customization */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block">
                      Letterhead Header & Footer
                    </span>

                    {/* Header Alignment Controls */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Header Alignment:</label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setHdrAlignment('split')}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            hdrAlignment === 'split'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Split (L/R)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHdrAlignment('center')}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            hdrAlignment === 'center'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>Center</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHdrAlignment('left')}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            hdrAlignment === 'left'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>Left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHdrAlignment('right')}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            hdrAlignment === 'right'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                          <span>Right</span>
                        </button>
                      </div>
                    </div>

                    {/* Logo & Text Position and Header Typography */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Logo & Text Position:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHdrLayout('inline')}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              hdrLayout === 'inline'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Side-by-Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setHdrLayout('stacked')}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              hdrLayout === 'stacked'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Text Under Logo
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Header Typography:</label>
                        <button
                          type="button"
                          onClick={() => setHdrIsBold(!hdrIsBold)}
                          className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            hdrIsBold
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                          <span>{hdrIsBold ? 'Bold Header (Active)' : 'Normal Font'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Header Left (Brand / Org)</label>
                      <input
                        type="text"
                        value={hdrLeftText}
                        onChange={(e) => setHdrLeftText(e.target.value)}
                        placeholder="Company or Organization Name"
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Header Right (Subtitle)</label>
                      <input
                        type="text"
                        value={hdrRightText}
                        onChange={(e) => setHdrRightText(e.target.value)}
                        placeholder="PM CRM Engineering Deliverable"
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Footer Copyright Notice</label>
                      <input
                        type="text"
                        value={ftrCopyright}
                        onChange={(e) => setFtrCopyright(e.target.value)}
                        placeholder="All Rights Reserved"
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Footer Confidentiality Disclaimer</label>
                      <input
                        type="text"
                        value={ftrConfidentiality}
                        onChange={(e) => setFtrConfidentiality(e.target.value)}
                        placeholder="Strictly Confidential - Internal & Client Delivery Use Only"
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Live Interactive Document Letterhead Preview */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                      Live Export Preview
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadTestDocument('pdf')}
                        disabled={isExportingTest}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Download / Print formatted sample document as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isExportingTest ? 'Preparing...' : 'Printable PDF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadTestDocument('docx')}
                        disabled={isExportingTest}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Download sample document as Microsoft Word (.docx)"
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-600" />
                        <span>DOCX</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between select-none min-h-[380px]">
                    {/* Background Watermark in Preview with dynamic Size, Opacity & Angle */}
                    {wmEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {/* Custom Uploaded Image Watermark */}
                        {(wmType === 'custom' || wmType === 'text') && wmCustomType === 'image' && wmCustomImageUrl ? (
                          <img
                            src={wmCustomImageUrl}
                            alt="Custom Watermark"
                            className={`object-contain transition-all duration-200 ${
                              wmOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: wmOpacity / 100,
                              maxHeight: wmSize === 'sm' ? '70px' : wmSize === 'md' ? '120px' : wmSize === 'lg' ? '180px' : '250px',
                              maxWidth: wmSize === 'sm' ? '120px' : wmSize === 'md' ? '200px' : wmSize === 'lg' ? '280px' : '360px',
                            }}
                          />
                        ) : wmType === 'logo' && user?.organizationLogo ? (
                          <img
                            src={user.organizationLogo}
                            alt="Company Watermark"
                            className={`object-contain transition-all duration-200 ${
                              wmOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: wmOpacity / 100,
                              maxHeight: wmSize === 'sm' ? '70px' : wmSize === 'md' ? '120px' : wmSize === 'lg' ? '180px' : '250px',
                              maxWidth: wmSize === 'sm' ? '120px' : wmSize === 'md' ? '200px' : wmSize === 'lg' ? '280px' : '360px',
                            }}
                          />
                        ) : (
                          <span
                            className={`font-display tracking-widest text-slate-400 uppercase text-center px-4 transition-all duration-200 ${
                              wmOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: wmOpacity / 100,
                              fontSize: wmSize === 'sm' ? '16px' : wmSize === 'md' ? '24px' : wmSize === 'lg' ? '36px' : '48px',
                              fontWeight: hdrIsBold ? 900 : 700,
                            }}
                          >
                            {wmType === 'logo' ? (user?.organizationName || 'COMPANY') : (wmText || 'CONFIDENTIAL')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Header rendered dynamically according to alignment, layout and bold */}
                    <div className="relative z-10 border-b-2 border-slate-900 pb-3">
                      {/* Stacked Layout (Text Under Logo) */}
                      {hdrLayout === 'stacked' ? (
                        <div className={`flex flex-col gap-1.5 ${
                          hdrAlignment === 'center' ? 'items-center text-center' :
                          hdrAlignment === 'right' ? 'items-end text-right' : 'items-start text-left'
                        }`}>
                          {user?.organizationLogo && (
                            <img src={user.organizationLogo} alt="Logo" className="h-8 w-auto object-contain mb-0.5" />
                          )}
                          <span className={`text-sm font-display ${hdrIsBold ? 'font-black text-slate-950' : 'font-semibold text-slate-800'}`}>
                            {hdrLeftText || user?.organizationName || 'Your Company Name'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{hdrRightText}</span>
                        </div>
                      ) : (
                        /* Inline Layout */
                        <div className={`flex ${
                          hdrAlignment === 'center' ? 'flex-col items-center justify-center text-center gap-1' :
                          hdrAlignment === 'right' ? 'items-center justify-end gap-3' :
                          hdrAlignment === 'left' ? 'items-center justify-start gap-3' :
                          'items-center justify-between'
                        }`}>
                          <div className="flex items-center gap-2">
                            {user?.organizationLogo && (
                              <img src={user.organizationLogo} alt="Logo" className="h-6 w-auto object-contain" />
                            )}
                            <span className={`text-xs font-display ${hdrIsBold ? 'font-black text-slate-950' : 'font-semibold text-slate-800'}`}>
                              {hdrLeftText || user?.organizationName || 'Your Company Name'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{hdrRightText}</span>
                        </div>
                      )}
                    </div>

                    {/* Sample Document Body Content (100% Transparent background - watermark shines through) */}
                    <div className="relative z-10 py-4 space-y-3.5 text-slate-800 bg-transparent">
                      {/* Document Control Metadata Block */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] bg-transparent border border-slate-300/80 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Project Code:</span>
                          <span className="font-mono text-slate-900 font-semibold">PRJ-2026-X</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Project Manager:</span>
                          <span className="text-slate-900 font-semibold">{user?.fullName || 'Lead PM'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Target End Date:</span>
                          <span className="text-slate-900">Q4 2026</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Priority:</span>
                          <span className="font-bold text-emerald-700">High / Critical</span>
                        </div>
                      </div>

                      {/* Section 1.0 */}
                      <div className="space-y-1 bg-transparent">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-0.5">
                          1.0 PURPOSE & JUSTIFICATION
                        </div>
                        <p className="text-[10px] text-slate-700 leading-relaxed bg-transparent">
                          This engineering deliverable establishes the core technical architecture, data pipeline governance, and security controls across all microservices.
                        </p>
                      </div>

                      {/* Section 2.0 */}
                      <div className="space-y-1 bg-transparent">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-0.5">
                          2.0 ARCHITECTURAL DELIVERABLES & SLO
                        </div>
                        <p className="text-[10px] text-slate-700 leading-relaxed bg-transparent">
                          Target system availability of 99.95% with automated active-active failover and multi-region replication.
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{ftrConfidentiality}</span>
                      <span className="font-mono">Page 1 of 12</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'integrations' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900">Onboarding Platform SSO Bridge</h3>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Connected to Central Identity Provider</span>
                </div>
                <p className="text-blue-800">
                  Auth Project: <code className="font-mono text-blue-950 font-bold">https://ylarmzqfyvpvgxarukpq.supabase.co</code>
                </p>
                <p className="text-slate-600">
                  Target CRM: <code className="font-mono font-bold text-slate-900">pm_crm</code>
                </p>
              </div>
            </div>
          )}

          {activeSubTab !== 'users' && activeSubTab !== 'templates' && activeSubTab !== 'integrations' && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Settings parameters for this section are managed via CTO configuration policies.
            </div>
          )}
        </div>
      </div>

      {/* ===== INVITE USER MODAL ===== */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UserPlus className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Invite User</h3>
                  <p className="text-[11px] text-slate-500">Add a new member to your organization</p>
                </div>
              </div>
              <button onClick={() => setIsInviteOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {inviteSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">User Invited Successfully!</p>
                  <p className="text-xs text-slate-500">
                    <strong>{inviteFullName}</strong> has been added as <strong>{inviteRole}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {inviteError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {inviteError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="text" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)}
                        placeholder="Employee full name"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="employee@company.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role *</label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer">
                          <option value="CEO">CEO / Founder (Full Access)</option>
                          <option value="MD">Managing Director - MD (Full Access)</option>
                          <option value="COO">COO (Full Access)</option>
                          <option value="CTO">CTO (Chief Technology Officer)</option>
                          <option value="CIO">CIO (Chief Information Officer)</option>
                          <option value="PM">PM (Project Manager)</option>
                          <option value="TL">TL (Team Lead)</option>
                          <option value="Employee">Employee (Developer / Designer)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select value={inviteDepartment} onChange={(e) => setInviteDepartment(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer">
                          <option value="Engineering">Engineering</option>
                          <option value="Design">Design</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Sales">Sales</option>
                          <option value="HR">Human Resources</option>
                          <option value="Finance">Finance</option>
                          <option value="Operations">Operations</option>
                          <option value="Executive">Executive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Designation</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="text" value={inviteDesignation} onChange={(e) => setInviteDesignation(e.target.value)}
                        placeholder="e.g. Senior Developer, QA Lead"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!inviteSuccess && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleInviteUser} disabled={inviteLoading || !inviteFullName.trim() || !inviteEmail.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer">
                  {inviteLoading ? 'Inviting...' : (
                    <><UserPlus className="w-3.5 h-3.5" /><span>Invite User</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
