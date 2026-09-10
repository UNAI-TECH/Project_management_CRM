import { supabaseClient } from './supabaseClient';
import { UserProfile, UserRole, DocumentBrandingTemplate } from '../types';

export const THIS_CRM = 'pm_crm';
const LOCAL_SESSION_KEY = 'unai_pm_crm_local_session';

// Export for backwards-compatibility referencing the unified client
export const onboardingSupabase = supabaseClient;
export const pmCrmSupabase = supabaseClient;



/**
 * Helper to upload company logo to Supabase Storage bucket 'logos'
 */
export async function uploadCompanyLogo(file: File): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabaseClient.storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[OnboardingAuth] Storage upload fallback to local base64:', error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('logos')
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || '';
  } catch (e) {
    console.warn('[OnboardingAuth] Error in uploadCompanyLogo:', e);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Helper to upload profile picture to Supabase Storage bucket 'avatars'
 */
export async function uploadProfileAvatar(file: File): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabaseClient.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[OnboardingAuth] Avatar upload fallback to local base64:', error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || '';
  } catch (e) {
    console.warn('[OnboardingAuth] Error in uploadProfileAvatar:', e);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Update authenticated user's password
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('[OnboardingAuth] Password update error:', error);
    throw new Error(error.message || 'Failed to update password');
  }
}

/**
 * Complete first-time user setup: upload avatar, update password if needed, mark setup complete in Supabase
 */
export async function completeFirstTimeSetup(params: {
  userId: string;
  email: string;
  avatarUrl?: string;
  newPassword?: string;
}): Promise<UserProfile> {
  const { userId, email, avatarUrl, newPassword } = params;

  // 1. Update password in Supabase Auth if provided
  if (newPassword && newPassword.trim().length >= 6) {
    await updateUserPassword(newPassword);
  }

  // 2. Update organization_members record
  try {
    await supabaseClient
      .from('organization_members')
      .update({
        avatar_url: avatarUrl || null,
        has_completed_setup: true,
        must_change_password: false,
        auth_user_id: userId,
      })
      .or(`auth_user_id.eq.${userId},email.ilike.${email}`);
  } catch (e) {
    console.warn('[OnboardingAuth] Member setup update warning:', e);
  }

  // 3. Update employees_cache record
  try {
    await supabaseClient
      .from('employees_cache')
      .update({
        avatar_url: avatarUrl || null,
        has_completed_setup: true,
        must_change_password: false,
      })
      .or(`employee_id.eq.${userId},email.ilike.${email}`);
  } catch (e) {
    console.warn('[OnboardingAuth] Employee cache setup update warning:', e);
  }

  // 4. Cache in localStorage so it is never lost across sign-ins
  try {
    if (avatarUrl) {
      localStorage.setItem(`unai_user_avatar_${email.toLowerCase()}`, avatarUrl);
    }
    localStorage.setItem(`unai_user_setup_done_${email.toLowerCase()}`, 'true');
  } catch {}

  // 5. Return refreshed user profile
  const { profile } = await fetchUserProfileAndRole(userId, email);
  return profile;
}

/**
 * Helper to upload custom watermark / icon mark to Supabase Storage bucket 'watermarks'
 */
export async function uploadCustomWatermarkImage(file: File): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `wm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabaseClient.storage
      .from('watermarks')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[OnboardingAuth] Watermark upload fallback to local base64:', error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('watermarks')
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || '';
  } catch (e) {
    console.warn('[OnboardingAuth] Error in uploadCustomWatermarkImage:', e);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Persist company ownership, details and logo in Supabase organizations table
 */
export async function updateOrganizationDetails(
  organizationId: string,
  details: {
    name?: string;
    registrationNo?: string;
    industry?: string;
    country?: string;
    companyEmail?: string;
    contactNumber?: string;
    aboutCompany?: string;
    employeeCount?: string;
    logoUrl?: string;
  }
): Promise<void> {
  try {
    const payload: Record<string, any> = {};
    if (details.name !== undefined) payload.name = details.name;
    if (details.registrationNo !== undefined) payload.registration_no = details.registrationNo;
    if (details.industry !== undefined) payload.industry = details.industry;
    if (details.country !== undefined) payload.country = details.country;
    if (details.companyEmail !== undefined) payload.company_email = details.companyEmail;
    if (details.contactNumber !== undefined) payload.contact_number = details.contactNumber;
    if (details.aboutCompany !== undefined) payload.about_company = details.aboutCompany;
    if (details.employeeCount !== undefined) payload.employee_count = details.employeeCount;
    if (details.logoUrl !== undefined) payload.logo_url = details.logoUrl;

    await supabaseClient
      .from('organizations')
      .update(payload)
      .eq('id', organizationId);
  } catch (err) {
    console.error('[OnboardingAuth] Update organization details error:', err);
    throw err;
  }
}

/**
 * Update a member's designation and role
 */
export async function updateMemberDesignationAndRole(
  memberId: string,
  data: { designation?: string; role?: UserRole; department?: string; fullName?: string }
): Promise<void> {
  try {
    const payload: Record<string, any> = {};
    if (data.designation !== undefined) payload.designation = data.designation;
    if (data.role !== undefined) payload.role = data.role;
    if (data.department !== undefined) payload.department = data.department;
    if (data.fullName !== undefined) payload.full_name = data.fullName;

    const { error: memberErr } = await supabaseClient
      .from('organization_members')
      .update(payload)
      .eq('id', memberId);

    if (memberErr) {
      throw new Error(`Failed to update member in organization: ${memberErr.message}`);
    }

    // Also update employees_cache if matching
    if (data.designation || data.role) {
      const { error: empErr } = await supabaseClient
        .from('employees_cache')
        .update({
          ...(data.designation ? { designation: data.designation } : {}),
          ...(data.role ? { pm_crm_role: data.role } : {}),
        })
        .eq('employee_id', memberId);

      if (empErr) {
        console.warn('[OnboardingAuth] Employee cache update note:', empErr.message);
      }
    }
  } catch (err) {
    console.error('[OnboardingAuth] Update member designation error:', err);
    throw err;
  }
}

export const DEFAULT_BRANDING_TEMPLATE: DocumentBrandingTemplate = {
  watermark: {
    enabled: true,
    type: 'logo',
    customType: 'text',
    text: 'CONFIDENTIAL',
    customImageUrl: undefined,
    isFaded: true,
    opacity: 15,
    size: 'md',
    orientation: 'diagonal',
  },
  header: {
    enabled: true,
    showLogo: true,
    alignment: 'split',
    layout: 'inline',
    isBold: true,
    leftText: '',
    rightText: 'PM CRM Engineering Deliverable',
  },
  footer: {
    enabled: true,
    copyrightText: 'All Rights Reserved',
    showPageNumber: true,
    confidentialityNotice: 'Strictly Confidential - Internal & Client Delivery Use Only',
  },
};

export const FULL_ACCESS_ROLES: UserRole[] = ['CEO', 'MD', 'COO', 'CTO', 'CIO'];

export function normalizeUserRole(rawRole?: string): UserRole {
  if (!rawRole) return 'Employee';
  const clean = rawRole.trim().toUpperCase();
  if (clean === 'CEO' || clean.includes('CHIEF EXECUTIVE') || clean.includes('FOUNDER') || clean.includes('OWNER')) return 'CEO';
  if (clean === 'MD' || clean.includes('MANAGING DIRECTOR')) return 'MD';
  if (clean === 'COO' || clean.includes('CHIEF OPERATING') || clean.includes('OPERATIONS HEAD')) return 'COO';
  if (clean === 'CTO' || clean.includes('CHIEF TECHNOLOGY') || clean.includes('VP OF ENGINEERING')) return 'CTO';
  if (clean === 'CIO' || clean.includes('CHIEF INFORMATION')) return 'CIO';
  if (clean === 'PM' || clean.includes('PROJECT MANAGER') || clean.includes('PROJECT DIRECTOR')) return 'PM';
  if (clean === 'TL' || clean.includes('TEAM LEAD') || clean.includes('TECH LEAD') || clean.includes('ENGINEERING LEAD') || clean.includes('LEAD ENGINEER')) return 'TL';
  return 'Employee';
}

export function inferRoleFromProfile(designation?: string, email?: string, isSuperAdmin?: boolean): UserRole {
  if (designation) {
    const d = designation.trim().toLowerCase();
    if (/\b(ceo|founder|president|owner|chief executive)\b/i.test(d)) return 'CEO';
    if (/\b(md|managing director)\b/i.test(d)) return 'MD';
    if (/\b(coo|chief operating|operations head|director of operations)\b/i.test(d)) return 'COO';
    if (/\b(cto|chief technology|vp of engineering|vice president of engineering)\b/i.test(d)) return 'CTO';
    if (/\b(cio|chief information)\b/i.test(d)) return 'CIO';
    if (/\b(pm|project manager|senior project director|project director)\b/i.test(d)) return 'PM';
    if (/\b(tl|team lead|tech lead|engineering lead|lead developer|lead engineer)\b/i.test(d)) return 'TL';
  }
  return isSuperAdmin ? 'CTO' : 'Employee';
}

/**
 * Transfer organization ownership to another member after re-verifying current admin password
 */
export async function transferOrganizationOwnership(params: {
  currentAdminEmail: string;
  currentAdminPassword: string;
  newOwnerMemberId: string;
  organizationId: string;
}): Promise<{ success: boolean; newOwnerName: string }> {
  // 1. Verify current admin password by attempting Supabase authentication
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: params.currentAdminEmail,
    password: params.currentAdminPassword,
  });

  if (authError || !authData.user) {
    throw new Error('Authentication failed: Incorrect password. Please re-enter your valid current password to authorize ownership transfer.');
  }

  const currentAuthUser = authData.user;

  // 2. Fetch target member details
  const { data: targetMember, error: memberErr } = await supabaseClient
    .from('organization_members')
    .select('*')
    .eq('id', params.newOwnerMemberId)
    .maybeSingle();

  if (memberErr || !targetMember) {
    throw new Error('Target user not found in organization members.');
  }

  // 3. Prevent self-transfer
  if (
    targetMember.email?.toLowerCase() === params.currentAdminEmail.toLowerCase() ||
    (targetMember.auth_user_id && targetMember.auth_user_id === currentAuthUser.id)
  ) {
    throw new Error('Cannot transfer ownership to yourself. Please select another executive or team member.');
  }

  // 4. Verify target member belongs to the same organization
  if (targetMember.organization_id && targetMember.organization_id !== params.organizationId) {
    throw new Error('Target member does not belong to your organization.');
  }

  // 5. Promote target member to CEO / Owner role
  const targetDesignation = targetMember.designation && !targetMember.designation.includes('CEO')
    ? `Chief Executive Officer (CEO) / ${targetMember.designation}`
    : 'Chief Executive Officer (CEO) / Owner';

  const { error: promoteErr } = await supabaseClient
    .from('organization_members')
    .update({
      role: 'CEO',
      designation: targetDesignation,
    })
    .eq('id', params.newOwnerMemberId);

  if (promoteErr) {
    throw new Error(`Failed to promote target member: ${promoteErr.message}`);
  }

  // Also sync employees_cache for target member
  try {
    await supabaseClient
      .from('employees_cache')
      .update({
        pm_crm_role: 'CEO',
        designation: targetDesignation,
      })
      .or(`employee_id.eq.${targetMember.auth_user_id || targetMember.id},email.ilike.${targetMember.email}`);
  } catch (e) {
    console.warn('[OnboardingAuth] Target employees_cache sync note:', e);
  }

  // 6. Update organization primary owner reference
  const { error: orgErr } = await supabaseClient
    .from('organizations')
    .update({
      owner_id: targetMember.auth_user_id || targetMember.id,
    })
    .eq('id', params.organizationId);

  if (orgErr) {
    throw new Error(`Failed to update organization owner: ${orgErr.message}`);
  }

  // 7. Demote current admin from Owner/Executive to PM (Project Manager)
  const formerOwnerDesignation = 'Project Manager / Former Owner';
  const { error: demoteErr } = await supabaseClient
    .from('organization_members')
    .update({
      role: 'PM',
      designation: formerOwnerDesignation,
    })
    .eq('organization_id', params.organizationId)
    .or(`email.ilike.${params.currentAdminEmail},auth_user_id.eq.${currentAuthUser.id}`);

  if (demoteErr) {
    console.warn('[OnboardingAuth] Demote current admin warning:', demoteErr.message);
  }

  // Also update employees_cache for current admin
  try {
    await supabaseClient
      .from('employees_cache')
      .update({
        pm_crm_role: 'PM',
        designation: formerOwnerDesignation,
      })
      .or(`email.ilike.${params.currentAdminEmail},employee_id.eq.${currentAuthUser.id}`);
  } catch (e) {
    console.warn('[OnboardingAuth] Demote current admin employees_cache sync note:', e);
  }

  // 8. Update local storage session cache so caller's active state is immediately updated to PM
  try {
    const local = localStorage.getItem(LOCAL_SESSION_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.profile) {
        parsed.profile.role = 'PM';
        parsed.profile.designation = formerOwnerDesignation;
        parsed.profile.isHrAdmin = false;
      }
      parsed.role = 'PM';
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
    }
  } catch {}

  return { 
    success: true, 
    newOwnerName: targetMember.full_name || targetMember.email 
  };
}

/**
 * Helper to build a standard UserProfile object
 */
function buildUserProfile(authUserId: string, email: string, role: UserRole, extra?: Partial<UserProfile>): UserProfile {
  const nameFromEmail = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    id: authUserId,
    email: extra?.email || email,
    fullName: extra?.fullName || (email.toLowerCase().startsWith('kamal') ? 'Kamalesh S' : nameFromEmail),
    department: extra?.department || 'Management',
    designation: extra?.designation || (
      role === 'CEO' ? 'Chief Executive Officer (CEO)' :
      role === 'MD' ? 'Managing Director (MD)' :
      role === 'COO' ? 'Chief Operating Officer (COO)' :
      role === 'CTO' ? 'Chief Technology Officer (CTO)' : 
      role === 'CIO' ? 'Chief Information Officer (CIO)' :
      role === 'PM' ? 'Project Manager' : 
      role === 'TL' ? 'Team Lead' : 'Developer'
    ),
    employeeCode: extra?.employeeCode || `UNAI-EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    isActive: extra?.isActive ?? true,
    isHrAdmin: extra?.isHrAdmin ?? FULL_ACCESS_ROLES.includes(role),
    role,
    avatar: extra?.avatar,
    mustChangePassword: extra?.mustChangePassword ?? false,
    hasCompletedSetup: extra?.hasCompletedSetup ?? false,
    organizationId: extra?.organizationId,
    organizationName: extra?.organizationName,
    organizationLogo: extra?.organizationLogo,
    documentBranding: extra?.documentBranding || DEFAULT_BRANDING_TEMPLATE,
  };
}

/**
 * Fetch profile and verified PM CRM role grant for an authenticated user ID.
 */
export async function fetchUserProfileAndRole(authUserId: string, email: string): Promise<{ profile: UserProfile; role: UserRole }> {
  console.log('[OnboardingAuth] Resolving profile & role for user:', authUserId, email);

  try {
    // 1. Query organization membership in database
    let organizationId: string | undefined;
    let organizationName: string | undefined;
    let organizationLogo: string | undefined;
    let organizationBranding: DocumentBrandingTemplate | undefined;
    let memberRole: UserRole | undefined;
    let memberDesignation: string | undefined;
    let memberFullName: string | undefined;
    let memberAvatar: string | undefined;
    let memberMustChangePassword = false;
    let memberHasCompletedSetup = false;

    try {
      const { data: orgMember } = await supabaseClient
        .from('organization_members')
        .select('*')
        .or(`auth_user_id.eq.${authUserId},email.ilike.${email}`)
        .eq('is_active', true)
        .maybeSingle();

      if (orgMember) {
        organizationId = orgMember.organization_id;
        memberRole = normalizeUserRole(orgMember.role);
        memberDesignation = orgMember.designation;
        memberFullName = orgMember.full_name;
        memberAvatar = orgMember.avatar_url;
        memberMustChangePassword = !!orgMember.must_change_password;
        memberHasCompletedSetup = !!orgMember.has_completed_setup;

        // Auto-link auth_user_id if it was null or newly authenticated
        if (!orgMember.auth_user_id || orgMember.auth_user_id !== authUserId) {
          await supabaseClient
            .from('organization_members')
            .update({ auth_user_id: authUserId })
            .eq('id', orgMember.id);
        }

        // Fetch organization details (name, logo_url, document_branding, custom_watermark_url)
        const { data: orgDetails } = await supabaseClient
          .from('organizations')
          .select('name, logo_url, document_branding, custom_watermark_url')
          .eq('id', organizationId)
          .maybeSingle();

        if (orgDetails) {
          organizationName = orgDetails.name;
          organizationLogo = orgDetails.logo_url;
          organizationBranding = orgDetails.document_branding;
          if (organizationBranding?.watermark && orgDetails.custom_watermark_url && !organizationBranding.watermark.customImageUrl) {
            organizationBranding.watermark.customImageUrl = orgDetails.custom_watermark_url;
          }
        }
      }
    } catch (e) {
      console.warn('[OnboardingAuth] Org member query exception:', e);
    }

    // Check localStorage cache for avatar and setup state fallback
    try {
      const cachedAvatar = localStorage.getItem(`unai_user_avatar_${email.toLowerCase()}`);
      if (!memberAvatar && cachedAvatar) {
        memberAvatar = cachedAvatar;
      }
      const cachedSetupDone = localStorage.getItem(`unai_user_setup_done_${email.toLowerCase()}`);
      if (cachedSetupDone === 'true' || memberAvatar) {
        memberHasCompletedSetup = true;
        memberMustChangePassword = false;
      }
    } catch {}

    // 2. Query employees_cache table as secondary source
    if (!memberRole) {
      try {
        const { data: empData } = await supabaseClient
          .from('employees_cache')
          .select('*')
          .or(`employee_id.eq.${authUserId},email.ilike.${email}`)
          .maybeSingle();

        if (empData) {
          memberRole = normalizeUserRole(empData.pm_crm_role);
          if (!memberDesignation) memberDesignation = empData.designation;
          if (!memberFullName) memberFullName = empData.name;
          if (!organizationId) organizationId = empData.organization_id;
          if (!memberAvatar) memberAvatar = empData.avatar_url;
          if (empData.must_change_password !== undefined) memberMustChangePassword = !!empData.must_change_password;
          if (empData.has_completed_setup !== undefined) memberHasCompletedSetup = !!empData.has_completed_setup;
        }
      } catch (e) {
        console.warn('[OnboardingAuth] Employees cache query exception:', e);
      }
    }

    const role: UserRole = memberRole || inferRoleFromProfile(memberDesignation, email, true);

    const userProfile = buildUserProfile(authUserId, email, role, {
      fullName: memberFullName,
      department: 'Management',
      designation: memberDesignation,
      isActive: true,
      isHrAdmin: FULL_ACCESS_ROLES.includes(role),
      avatar: memberAvatar,
      mustChangePassword: memberMustChangePassword,
      hasCompletedSetup: memberHasCompletedSetup,
      organizationId,
      organizationName,
      organizationLogo,
      documentBranding: organizationBranding,
    });

    return { profile: userProfile, role };
  } catch (err: any) {
    if (err.message && err.message.startsWith('Access denied')) {
      throw err;
    }
    console.warn('[OnboardingAuth] Fallback profile construction:', err);
    const role = inferRoleFromProfile(undefined, email);
    const profile = buildUserProfile(authUserId, email, role);
    return { profile, role };
  }
}

export interface EmailAuthCheckResult {
  exists: boolean;
  isFirstTime: boolean;
  member: {
    fullName: string;
    email: string;
    role: UserRole;
    organizationId: string;
    organizationName?: string;
    organizationLogo?: string;
    designation: string;
    avatarUrl?: string;
  } | null;
}

/**
 * Check whether an email belongs to an active organization member and if they are a first-time user
 */
export async function checkEmailAuthStatus(email: string): Promise<EmailAuthCheckResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { exists: false, isFirstTime: false, member: null };
  }

  // 1. Check organization_members
  try {
    const { data: member } = await supabaseClient
      .from('organization_members')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (member) {
      let orgName = '';
      let orgLogo = '';
      if (member.organization_id) {
        const { data: org } = await supabaseClient
          .from('organizations')
          .select('name, logo_url')
          .eq('id', member.organization_id)
          .maybeSingle();
        if (org) {
          orgName = org.name;
          orgLogo = org.logo_url;
        }
      }

      const localSetupCompleted = localStorage.getItem(`unai_setup_completed_${cleanEmail}`) === 'true';
      const hasCompletedInDb = member.has_completed_setup === true || (member.auth_user_id && !member.auth_user_id.startsWith('pending-'));
      const isFirstTime = (member.must_change_password === true) || (!hasCompletedInDb && !localSetupCompleted);

      return {
        exists: true,
        isFirstTime: Boolean(isFirstTime),
        member: {
          fullName: member.full_name,
          email: member.email,
          role: normalizeUserRole(member.role),
          organizationId: member.organization_id,
          organizationName: orgName,
          organizationLogo: orgLogo,
          designation: member.designation,
          avatarUrl: member.avatar_url,
        }
      };
    }
  } catch (e) {
    console.warn('[OnboardingAuth] Org member lookup note:', e);
  }

  // 2. Check employees_cache as secondary
  try {
    const { data: emp } = await supabaseClient
      .from('employees_cache')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (emp) {
      const localSetupCompleted = localStorage.getItem(`unai_setup_completed_${cleanEmail}`) === 'true';
      const isFirstTime = (emp.must_change_password === true) || (!emp.has_completed_setup && !localSetupCompleted);
      return {
        exists: true,
        isFirstTime: Boolean(isFirstTime),
        member: {
          fullName: emp.name,
          email: emp.email,
          role: normalizeUserRole(emp.pm_crm_role),
          organizationId: emp.organization_id || '',
          designation: emp.designation,
          avatarUrl: emp.avatar_url,
        }
      };
    }
  } catch (e) {
    console.warn('[OnboardingAuth] Employees cache lookup note:', e);
  }

  return {
    exists: false,
    isFirstTime: false,
    member: null,
  };
}

/**
 * Activate a first-time member by setting up their password and linking auth credentials
 */
export async function activateFirstTimeMember(params: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{
  user: any;
  session: any;
  profile: UserProfile;
  role: UserRole;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const password = params.password;

  let authUser: any = null;
  let session: any = null;

  try {
    // 1. Try signing in first (in case user already registered in auth.users)
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (signInData?.user && signInData?.session) {
      authUser = signInData.user;
      session = signInData.session;
    } else {
      // 2. If sign-in failed because user doesn't exist yet, sign up
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: params.fullName,
          }
        }
      });

      if (signUpError) {
        // If error was somehow invalid credentials on signin, rethrow
        if (signInError && !signUpError.message.toLowerCase().includes('already registered')) {
          throw new Error(signInError.message || signUpError.message);
        }
      } else {
        authUser = signUpData?.user;
        session = signUpData?.session;
      }
    }
  } catch (e: any) {
    console.warn('[OnboardingAuth] Auth resolution during activation notice:', e);
  }

  const effectiveUserId = authUser?.id || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Update organization_members record safely by primary key ID to avoid 409 Conflict
  try {
    const { data: memberRow } = await supabaseClient
      .from('organization_members')
      .select('id, auth_user_id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (memberRow?.id) {
      const updatePayload: Record<string, any> = {
        has_completed_setup: true,
        must_change_password: false,
      };
      if (!memberRow.auth_user_id || memberRow.auth_user_id.startsWith('pending-') || memberRow.auth_user_id !== effectiveUserId) {
        updatePayload.auth_user_id = effectiveUserId;
      }

      await supabaseClient
        .from('organization_members')
        .update(updatePayload)
        .eq('id', memberRow.id);
    }
  } catch (e) {
    console.warn('[OnboardingAuth] Org member update on activation note:', e);
  }

  // Update employees_cache safely
  try {
    await supabaseClient
      .from('employees_cache')
      .update({
        has_completed_setup: true,
        must_change_password: false,
      })
      .ilike('email', cleanEmail);
  } catch (e) {
    console.warn('[OnboardingAuth] Employee cache update on activation note:', e);
  }

  const { profile, role } = await fetchUserProfileAndRole(effectiveUserId, cleanEmail);
  profile.hasCompletedSetup = true;
  profile.mustChangePassword = false;

  const sessionObj = {
    user: authUser || { id: effectiveUserId, email: cleanEmail },
    session: session || { access_token: 'local-token', user: { id: effectiveUserId, email: cleanEmail } },
    profile,
    role,
  };

  try {
    localStorage.setItem(`unai_setup_completed_${cleanEmail}`, 'true');
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionObj));
  } catch {}

  return sessionObj;
}

/**
 * Sign in using Supabase Auth credentials.
 */
export async function signIn(email: string, password?: string): Promise<{
  user: any;
  session: any;
  profile: UserProfile;
  role: UserRole;
}> {
  if (!password) {
    throw new Error('Password is required to sign in.');
  }

  const cleanEmail = email.trim().toLowerCase();
  console.log('[OnboardingAuth] Signing in with email:', cleanEmail);

  try {
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      const msg = (authError?.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        throw new Error('Email not confirmed: Please check your inbox for the confirmation link, or disable "Confirm email" in Supabase Dashboard (Authentication → Providers → Email).');
      }
      if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email or password: Please check your credentials and try again.');
      }
      if (msg.includes('user not found')) {
        throw new Error('No account found with this email: Please register your company or request an invite.');
      }
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        throw new Error('Too many login attempts. Please wait a few moments and try again.');
      }
      throw new Error(authError?.message || 'Authentication failed on Supabase.');
    }

    console.log('[OnboardingAuth] Supabase Auth successful. User ID:', authData.user.id);
    const { profile, role } = await fetchUserProfileAndRole(authData.user.id, authData.user.email || cleanEmail);

    // Save fallback session and mark setup completed for this email
    try {
      localStorage.setItem(`unai_setup_completed_${cleanEmail}`, 'true');
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: authData.user, profile, role }));
    } catch {}

    return {
      user: authData.user,
      session: authData.session,
      profile,
      role,
    };
  } catch (err: any) {
    console.warn('[OnboardingAuth] Auth request caught:', err);

    const isNetworkError = 
      err.name === 'AuthRetryableFetchError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('network') ||
      err.message?.includes('ERR_FAILED');

    if (isNetworkError) {
      console.log('[OnboardingAuth] Network unreachable. Activating local session for:', cleanEmail);
      const role = inferRoleFromProfile(undefined, cleanEmail);
      const mockId = `emp-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const profile = buildUserProfile(mockId, cleanEmail, role);
      const sessionObj = {
        user: { id: mockId, email: cleanEmail },
        session: { access_token: 'local-token', user: { id: mockId, email: cleanEmail } },
        profile,
        role,
      };

      try {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionObj));
      } catch {}

      return sessionObj;
    }

    const msg = (err.message || '').toLowerCase();
    if (msg.includes('email not confirmed')) {
      throw new Error('Email not confirmed: Please check your email inbox to confirm your account, or disable "Confirm email" in Supabase Auth settings.');
    }
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
      throw new Error('Invalid email or password: Please check your credentials and try again.');
    }

    throw new Error(err.message || 'Authentication failed. Please check your credentials or network connection.');
  }
}

/**
 * Sign up a new company (Single Supabase Unified Onboarding).
 */
export async function signUpCompany(data: {
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
}): Promise<{
  user: any;
  session: any;
  profile: UserProfile;
  role: UserRole;
  organizationId: string;
}> {
  const cleanEmail = data.adminEmail.trim().toLowerCase();
  const adminDesignation = data.designation?.trim() || 'Admin';
  const effectiveBranding = data.documentBranding || DEFAULT_BRANDING_TEMPLATE;
  console.log('[OnboardingAuth] Company signup starting for:', data.companyName, 'Admin:', cleanEmail);

  // 1. Create auth user on Supabase Auth
  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email: cleanEmail,
    password: data.adminPassword,
    options: {
      data: {
        full_name: data.adminName,
        company_name: data.companyName,
        designation: adminDesignation,
      },
    },
  });

  if (authError) {
    console.error('[OnboardingAuth] Auth signup error:', authError);
    throw new Error(authError.message || 'Failed to create account. Email may already be registered.');
  }

  if (!authData.user) {
    throw new Error('Account creation failed. Please try again.');
  }

  const authUserId = authData.user.id;
  let session = authData.session;

  // 2. Auto-sign in if no session was returned
  if (!session) {
    try {
      const { data: signInData } = await supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password: data.adminPassword,
      });
      session = signInData?.session;
    } catch (e) {
      console.warn('[OnboardingAuth] Auto-login after signup note:', e);
    }
  }

  // 3. Insert or Upsert into organizations table
  const organizationId = `org-${Date.now()}`;
  try {
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .upsert({
        id: organizationId,
        name: data.companyName,
        registration_no: data.registrationNo || null,
        industry: data.industry || null,
        country: data.country,
        company_email: data.companyEmail || null,
        contact_number: data.contactNumber || null,
        about_company: data.aboutCompany || null,
        employee_count: data.employeeCount || null,
        logo_url: data.logoUrl || null,
        document_branding: effectiveBranding,
        is_verified: true,
        onboarded_by: authUserId,
      })
      .select()
      .single();

    if (orgError) {
      console.error('[OnboardingAuth] Org insert error:', orgError);
    } else {
      console.log('[OnboardingAuth] Organization created successfully in Supabase:', orgData?.id);
    }
  } catch (err) {
    console.error('[OnboardingAuth] Org insert exception:', err);
  }

  // 4. Insert into organization_members table
  try {
    const { error: memberError } = await supabaseClient
      .from('organization_members')
      .upsert({
        organization_id: organizationId,
        auth_user_id: authUserId,
        email: cleanEmail,
        full_name: data.adminName,
        role: 'CTO',
        department: 'Management',
        designation: adminDesignation,
        is_active: true,
        has_completed_setup: false,
        must_change_password: false,
      });

    if (memberError) {
      console.error('[OnboardingAuth] Org member insert error:', memberError);
    } else {
      console.log('[OnboardingAuth] Organization member record saved in Supabase.');
    }
  } catch (err) {
    console.error('[OnboardingAuth] Org member exception:', err);
  }

  // 5. Insert into employees_cache table
  try {
    const { error: empError } = await supabaseClient
      .from('employees_cache')
      .upsert({
        employee_id: authUserId,
        name: data.adminName,
        email: cleanEmail,
        pm_crm_role: 'CTO',
        department: 'Management',
        designation: adminDesignation,
        is_active: true,
        organization_id: organizationId,
        has_completed_setup: false,
        must_change_password: false,
      });

    if (empError) {
      console.error('[OnboardingAuth] Employees cache insert error:', empError);
    } else {
      console.log('[OnboardingAuth] Employee cache saved in Supabase.');
    }
  } catch (err) {
    console.error('[OnboardingAuth] Employee cache exception:', err);
  }

  const role: UserRole = 'CTO';
  const profile = buildUserProfile(authUserId, cleanEmail, role, {
    fullName: data.adminName,
    department: 'Management',
    designation: adminDesignation,
    isHrAdmin: true,
    hasCompletedSetup: false,
    mustChangePassword: false,
    organizationId,
    organizationName: data.companyName,
    organizationLogo: data.logoUrl,
  });

  // Save session locally
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
      user: authData.user,
      profile,
      role,
    }));
  } catch {}

  return {
    user: authData.user,
    session,
    profile,
    role,
    organizationId,
  };
}

/**
 * Invite a new user to the organization.
 */
export async function inviteUser(data: {
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  designation: string;
  organizationId: string;
  invitedBy: string;
}): Promise<void> {
  const cleanEmail = data.email.trim().toLowerCase();
  console.log('[OnboardingAuth] Inviting user:', cleanEmail, 'as', data.role);

  try {
    await supabaseClient.from('organization_members').insert({
      organization_id: data.organizationId,
      auth_user_id: `pending-${Date.now()}`,
      email: cleanEmail,
      full_name: data.fullName,
      role: data.role,
      department: data.department,
      designation: data.designation,
      is_active: true,
      has_completed_setup: false,
      must_change_password: true,
      invited_by: data.invitedBy,
    });
  } catch (err) {
    console.warn('[OnboardingAuth] Org member insert warning:', err);
  }

  try {
    await supabaseClient.from('employees_cache').upsert({
      employee_id: `pending-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: data.fullName,
      email: cleanEmail,
      pm_crm_role: data.role,
      department: data.department,
      designation: data.designation,
      is_active: true,
      has_completed_setup: false,
      must_change_password: true,
      organization_id: data.organizationId,
    });
  } catch (err) {
    console.warn('[OnboardingAuth] Employee cache upsert warning:', err);
  }

  console.log('[OnboardingAuth] User invited successfully:', cleanEmail);
}

/**
 * Check existing active session and re-verify role grants.
 */
export async function checkSession(): Promise<{
  user: any;
  session: any;
  profile: UserProfile;
  role: UserRole;
} | null> {
  try {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

    if (!sessionError && sessionData?.session?.user) {
      const user = sessionData.session.user;
      const { profile, role } = await fetchUserProfileAndRole(user.id, user.email || '');

      return {
        user,
        session: sessionData.session,
        profile,
        role,
      };
    }
  } catch (err) {
    console.warn('[OnboardingAuth] Remote session check note:', err);
  }

  // Fallback to local session if available
  try {
    const local = localStorage.getItem(LOCAL_SESSION_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed?.profile && parsed?.role) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Sign out from Supabase Auth.
 */
export async function signOut(): Promise<void> {
  try {
    await supabaseClient.auth.signOut();
  } catch (e) {
    console.warn('[OnboardingAuth] Remote signOut note:', e);
  }
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem('unai_pm_crm_auth_token');
    localStorage.removeItem('unai_onboarding_auth_token');
  } catch {}
}

/**
 * Update organization document branding and letterhead template settings in Supabase and local storage
 */
export async function updateOrganizationBranding(
  organizationId: string,
  branding: DocumentBrandingTemplate
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('organizations')
      .update({
        document_branding: branding,
        custom_watermark_url: branding.watermark?.customImageUrl || null,
      })
      .eq('id', organizationId);

    if (error) {
      console.warn('[OnboardingAuth] Org branding update error:', error);
    }
  } catch (err) {
    console.warn('[OnboardingAuth] Org branding update exception:', err);
  }

  // Update local session if available
  try {
    const local = localStorage.getItem(LOCAL_SESSION_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed?.profile) {
        parsed.profile.documentBranding = branding;
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
      }
    }
  } catch {}
}
