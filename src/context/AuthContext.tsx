import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole, DocumentBrandingTemplate } from '../types';
import { 
  signIn as authSignIn, 
  signOut as authSignOut, 
  checkSession, 
  signUpCompany as authSignUpCompany,
  inviteUser as authInviteUser,
  completeFirstTimeSetup as authCompleteFirstTimeSetup,
  updateOrganizationBranding,
  checkEmailAuthStatus as authCheckEmailAuthStatus,
  activateFirstTimeMember as authActivateFirstTimeMember,
  transferOrganizationOwnership as authTransferOwnership,
  FULL_ACCESS_ROLES,
  EmailAuthCheckResult,
  DEFAULT_BRANDING_TEMPLATE
} from '../lib/onboardingAuth';
import { AppPermission, checkRolePermission, getAllowedTabsForRole } from '../lib/permissions';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  baseRole: UserRole;
  activeRole: UserRole;
  availableRoles: UserRole[];
  isSwitchedRole: boolean;
  switchRole: (newRole: UserRole) => void;
  resetRole: () => void;
  isLoading: boolean;
  mustCompleteSetup: boolean;
  mustChangePassword: boolean;
  documentBranding: DocumentBrandingTemplate;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkEmailStatus: (email: string) => Promise<EmailAuthCheckResult>;
  activateMember: (params: { email: string; password: string; fullName?: string }) => Promise<void>;
  completeSetup: (avatarUrl?: string, newPassword?: string) => Promise<void>;
  updateDocumentBranding: (branding: DocumentBrandingTemplate) => Promise<void>;
  transferOwnership: (targetMemberId: string, currentPassword: string) => Promise<string>;
  signUpCompany: (data: {
    companyName: string;
    registrationNo?: string;
    industry?: string;
    country: string;
    companyEmail?: string;
    contactNumber?: string;
    aboutCompany?: string;
    employeeCount?: string;
    logoUrl?: string;
    documentBranding?: DocumentBrandingTemplate;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    designation?: string;
  }) => Promise<void>;
  inviteUser: (data: {
    email: string;
    fullName: string;
    role: UserRole;
    department: string;
    designation: string;
  }) => Promise<void>;
  // RBAC Permission engine helper
  hasPermission: (permission: AppPermission) => boolean;
  allowedTabs: string[];
  // RBAC Permission helpers based on documentation Section 3.2
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canManageMembers: boolean;
  canCreateTask: boolean;
  canVerifyTask: boolean;
  canExportAll: boolean;
  canAccessAuditTrail: boolean;
  canManageUsers: boolean;
  isFullAccessAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const session = await checkSession();
        if (session) {
          setUser(session.profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const checkEmailStatus = async (email: string) => {
    return await authCheckEmailAuthStatus(email);
  };

  const activateMember = async (params: { email: string; password: string; fullName?: string }) => {
    setIsLoading(true);
    try {
      const res = await authActivateFirstTimeMember(params);
      setUser(res.profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authSignIn(email, password);
      setUser(res.profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (user?.email) {
        try {
          localStorage.removeItem(`unai_pm_crm_active_view_role_${user.email.toLowerCase()}`);
        } catch {}
      }
      try {
        localStorage.removeItem('unai_pm_crm_active_view_role');
      } catch {}
      await authSignOut();
      setUser(null);
      setActiveRole('Employee');
    } finally {
      setIsLoading(false);
    }
  };

  const signUpCompany = async (data: {
    companyName: string;
    registrationNo?: string;
    industry?: string;
    country: string;
    companyEmail?: string;
    contactNumber?: string;
    aboutCompany?: string;
    employeeCount?: string;
    logoUrl?: string;
    documentBranding?: DocumentBrandingTemplate;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    designation?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await authSignUpCompany(data);
      setUser(res.profile);
    } finally {
      setIsLoading(false);
    }
  };

  const inviteUser = async (data: {
    email: string;
    fullName: string;
    role: UserRole;
    department: string;
    designation: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    await authInviteUser({
      ...data,
      organizationId: user.organizationId || 'org-default',
      invitedBy: user.id,
    });
  };

  const completeSetup = async (avatarUrl?: string, newPassword?: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updated = await authCompleteFirstTimeSetup({
        userId: user.id,
        email: user.email,
        avatarUrl,
        newPassword,
      });
      setUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocumentBranding = async (branding: DocumentBrandingTemplate) => {
    if (!user || !user.organizationId) return;
    setIsLoading(true);
    try {
      await updateOrganizationBranding(user.organizationId, branding);
      setUser(prev => prev ? { ...prev, documentBranding: branding } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const transferOwnership = async (targetMemberId: string, currentPassword: string): Promise<string> => {
    if (!user || !user.organizationId) {
      throw new Error('User or organization context missing.');
    }
    setIsLoading(true);
    try {
      const res = await authTransferOwnership({
        currentAdminEmail: user.email,
        currentAdminPassword: currentPassword,
        newOwnerMemberId: targetMemberId,
        organizationId: user.organizationId,
      });

      // Refresh current user session state to immediately reflect the new PM role
      const sessionData = await checkSession();
      if (sessionData?.profile) {
        setUser(sessionData.profile);
      } else {
        setUser(prev => prev ? {
          ...prev,
          role: 'PM',
          designation: 'Project Manager / Former Owner',
          isHrAdmin: false,
        } : null);
      }

      return res.newOwnerName;
    } finally {
      setIsLoading(false);
    }
  };

  const baseRole: UserRole = user?.role || 'Employee';
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('unai_pm_crm_active_view_role');
      if (saved) return saved as UserRole;
    } catch {}
    return baseRole;
  });

  // Sync activeRole whenever user/baseRole changes if no override is saved
  useEffect(() => {
    if (user?.role) {
      const isExecutiveUser = FULL_ACCESS_ROLES.includes(user.role);
      const isPMUser = user.role === 'PM';
      const isTLUser = user.role === 'TL';
      const allowedRoles: UserRole[] = isExecutiveUser
        ? [user.role, 'PM', 'TL', 'Employee']
        : isPMUser
        ? ['PM', 'TL', 'Employee']
        : isTLUser
        ? ['TL', 'Employee']
        : ['Employee'];

      try {
        const userKey = user.email ? `unai_pm_crm_active_view_role_${user.email.toLowerCase()}` : 'unai_pm_crm_active_view_role';
        const saved = localStorage.getItem(userKey);
        if (saved && allowedRoles.includes(saved as UserRole)) {
          setActiveRole(saved as UserRole);
          return;
        }
        // Clean up legacy global key
        localStorage.removeItem('unai_pm_crm_active_view_role');
      } catch {}

      setActiveRole(user.role);
    } else {
      setActiveRole('Employee');
    }
  }, [user?.role, user?.email]);

  // Compute available role switches based on real base role
  const isExecutiveUser = FULL_ACCESS_ROLES.includes(baseRole);
  const isPMUser = baseRole === 'PM';
  const isTLUser = baseRole === 'TL';

  const availableRoles: UserRole[] = isExecutiveUser
    ? [baseRole, 'PM', 'TL', 'Employee']
    : isPMUser
    ? ['PM', 'TL', 'Employee']
    : isTLUser
    ? ['TL', 'Employee']
    : ['Employee'];

  const switchRole = (newRole: UserRole) => {
    if (!availableRoles.includes(newRole)) return;
    setActiveRole(newRole);
    try {
      const userKey = user?.email ? `unai_pm_crm_active_view_role_${user.email.toLowerCase()}` : 'unai_pm_crm_active_view_role';
      localStorage.setItem(userKey, newRole);
    } catch {}
  };

  const resetRole = () => {
    setActiveRole(baseRole);
    try {
      const userKey = user?.email ? `unai_pm_crm_active_view_role_${user.email.toLowerCase()}` : 'unai_pm_crm_active_view_role';
      localStorage.removeItem(userKey);
      localStorage.removeItem('unai_pm_crm_active_view_role');
    } catch {}
  };

  const isSwitchedRole = activeRole !== baseRole;
  const currentRole: UserRole = activeRole;
  const mustCompleteSetup = !!user && user.hasCompletedSetup === false;
  const mustChangePassword = !!user && user.mustChangePassword === true;
  // Section 3.2 CRUD Matrix implementations:
  // All executive roles retain Super Admin permissions regardless of view mode
  const isSuperAdmin = FULL_ACCESS_ROLES.includes(baseRole);

  // RBAC Permission Engine Check
  const hasPermission = (permission: AppPermission): boolean => {
    // If executive base role, they have unrestricted system permissions
    if (isSuperAdmin) return true;
    return checkRolePermission(activeRole, permission);
  };

  const allowedTabs = getAllowedTabsForRole(activeRole);

  const canCreateProject = hasPermission('project:create');
  const canDeleteProject = hasPermission('project:delete');
  const canManageMembers = hasPermission('admin:invite_member') || hasPermission('admin:manage_users');
  const canCreateTask = hasPermission('task:create');
  const canVerifyTask = hasPermission('task:verify');
  const canExportAll = hasPermission('document:export_all');
  const canAccessAuditTrail = hasPermission('audit:view_ledger');
  const canManageUsers = hasPermission('admin:manage_users');
  const isFullAccessAdmin = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        baseRole,
        activeRole,
        availableRoles,
        isSwitchedRole,
        switchRole,
        resetRole,
        isLoading,
        mustCompleteSetup,
        mustChangePassword,
        documentBranding,
        signIn,
        signOut,
        checkEmailStatus,
        activateMember,
        completeSetup,
        updateDocumentBranding,
        transferOwnership,
        signUpCompany,
        inviteUser,
        hasPermission,
        allowedTabs,
        canCreateProject,
        canDeleteProject,
        canManageMembers,
        canCreateTask,
        canVerifyTask,
        canExportAll,
        canAccessAuditTrail,
        canManageUsers,
        isFullAccessAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
