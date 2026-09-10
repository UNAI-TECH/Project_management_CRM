import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadCompanyLogo, uploadCustomWatermarkImage } from '../lib/onboardingAuth';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  LockKeyhole,
  Building2,
  User,
  Globe,
  FileCheck,
  ChevronLeft,
  Check,
  Briefcase,
  Phone,
  Users,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Printer,
  Trash2,
  Loader2
} from 'lucide-react';
import { exportService } from '../services/exportService';

type AuthView = 'login' | 'onboarding';

const DESIGNATION_PRESETS = [
  'CEO / Founder',
  'Managing Director',
  'Chief Technology Officer (CTO)',
  'Chief Information Officer (CIO)',
  'VP of Engineering',
  'Operations Head',
  'Director of Operations',
  'Senior Project Director',
  'Engineering Lead',
  'HR Director',
  'Head of People & Culture',
  'Other (Custom)'
];

const EMPLOYEE_COUNTS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

export const LoginScreen: React.FC = () => {
  const { signIn, signUpCompany, checkEmailStatus, activateMember } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login state - 2-step flow (Email verification -> Password / First-time generation)
  const [loginStep, setLoginStep] = useState<'email' | 'password' | 'first_time_password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [verifiedMember, setVerifiedMember] = useState<{
    fullName: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName?: string;
    organizationLogo?: string;
    designation: string;
    avatarUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Onboarding state - Step 1 Company
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3 | 4>(1);
  const [companyName, setCompanyName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [industry, setIndustry] = useState('');
  const [employeeCount, setEmployeeCount] = useState('11-50 employees');
  const [country, setCountry] = useState('India');
  const [companyEmail, setCompanyEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [aboutCompany, setAboutCompany] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Onboarding state - Step 2 Admin
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('CEO / Founder');
  const [customDesignation, setCustomDesignation] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Onboarding state - Step 3 Document Template & Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkType, setWatermarkType] = useState<'logo' | 'custom'>('logo');
  const [watermarkCustomType, setWatermarkCustomType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkCustomFile, setWatermarkCustomFile] = useState<File | null>(null);
  const [watermarkCustomPreview, setWatermarkCustomPreview] = useState<string | null>(null);
  const [watermarkFaded, setWatermarkFaded] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(15);
  const [watermarkSize, setWatermarkSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [watermarkOrientation, setWatermarkOrientation] = useState<'diagonal' | 'horizontal'>('diagonal');
  const [headerAlignment, setHeaderAlignment] = useState<'split' | 'center' | 'left' | 'right'>('split');
  const [headerLayout, setHeaderLayout] = useState<'inline' | 'stacked'>('inline');
  const [headerIsBold, setHeaderIsBold] = useState(true);
  const [headerRightText, setHeaderRightText] = useState('PM CRM Engineering Deliverable');
  const [footerCopyright, setFooterCopyright] = useState('All Rights Reserved');
  const [footerConfidentiality, setFooterConfidentiality] = useState('Strictly Confidential - Internal & Client Delivery Use Only');

  // Onboarding state - Step 4 Review & Submit
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const effectiveDesignation = selectedDesignation === 'Other (Custom)'
    ? (customDesignation.trim() || 'Admin')
    : selectedDesignation;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomWatermarkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setWatermarkCustomFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkCustomPreview(reader.result as string);
        setWatermarkCustomType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your work email to continue.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid work email address.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const status = await checkEmailStatus(cleanEmail);

      if (!status.exists) {
        setError(`Access Denied: The email "${cleanEmail}" is not registered under any active organization. Only authorized employees created or invited by an organization administrator can log in.`);
        return;
      }

      setVerifiedMember(status.member);

      if (status.isFirstTime) {
        setLoginStep('first_time_password');
      } else {
        setLoginStep('password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify work email. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your password or contact your administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstTimeActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await activateMember({
        email: email.trim().toLowerCase(),
        password: newPassword,
        fullName: verifiedMember?.fullName,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to activate account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardSubmit = async () => {
    setOnboardError(null);
    if (!acceptedTerms) {
      setOnboardError('You must accept the terms and conditions to register your company.');
      return;
    }
    if (adminPassword !== confirmPassword) {
      setOnboardError('Passwords do not match.');
      return;
    }
    if (adminPassword.length < 6) {
      setOnboardError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      let uploadedLogoUrl: string | undefined = undefined;
      let uploadedCustomWmUrl: string | undefined = undefined;

      if (logoFile) {
        uploadedLogoUrl = await uploadCompanyLogo(logoFile);
      }

      if (watermarkCustomFile) {
        uploadedCustomWmUrl = await uploadCustomWatermarkImage(watermarkCustomFile);
      }

      await signUpCompany({
        companyName,
        registrationNo: registrationNo || undefined,
        industry: industry || undefined,
        country,
        companyEmail: companyEmail || undefined,
        contactNumber: contactNumber || undefined,
        aboutCompany: aboutCompany || undefined,
        employeeCount: employeeCount || undefined,
        logoUrl: uploadedLogoUrl || logoPreview || undefined,
        documentBranding: {
          watermark: {
            enabled: watermarkEnabled,
            type: watermarkType,
            customType: watermarkCustomType,
            text: watermarkText,
            customImageUrl: uploadedCustomWmUrl || watermarkCustomPreview || undefined,
            isFaded: watermarkFaded,
            opacity: watermarkOpacity,
            size: watermarkSize,
            orientation: watermarkOrientation,
          },
          header: {
            enabled: true,
            showLogo: true,
            alignment: headerAlignment,
            layout: headerLayout,
            isBold: headerIsBold,
            leftText: companyName,
            rightText: headerRightText,
          },
          footer: {
            enabled: true,
            copyrightText: `© ${new Date().getFullYear()} ${companyName || 'Company'}. ${footerCopyright}`,
            showPageNumber: true,
            confidentialityNotice: footerConfidentiality,
          },
        },
        adminName,
        adminEmail,
        adminPassword,
        designation: effectiveDesignation,
      });

      setOnboardSuccess(true);
    } catch (err: any) {
      console.error('[LoginScreen] Onboard error:', err);
      setOnboardError(err.message || 'Registration failed. Please check your details or network connection.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const canProceedStep1 = companyName.trim() && country.trim();
  const canProceedStep2 = 
    adminName.trim() && 
    adminEmail.trim() && 
    adminPassword.trim() && 
    confirmPassword.trim() &&
    (selectedDesignation !== 'Other (Custom)' || customDesignation.trim().length > 0);

  const industries = [
    'Technology', 'Healthcare', 'Finance & Banking', 'Education', 'Manufacturing',
    'Retail & E-commerce', 'Real Estate', 'Consulting & IT Services', 'Media & Entertainment',
    'Logistics & Supply Chain', 'Energy & Utilities', 'Other'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/90 p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        {/* Left Card: Branding Panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white p-8 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

          <div className="w-full" />

          <div className="relative z-10 my-auto flex flex-col items-center justify-center space-y-4">
            <div className="bg-white/95 p-4 rounded-2xl shadow-xl border border-white/20 flex items-center justify-center max-w-[220px]">
              <img
                src="./unai-signature.png"
                alt="UNAI Logo"
                className="h-14 sm:h-16 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/unai-signature.png';
                }}
              />
            </div>

            <div className="pt-2">
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white leading-snug">
                One Identity. <br />
                All UNAI CRMs.
              </h1>
              <p className="text-xs text-blue-100/90 leading-relaxed font-sans max-w-xs mt-2">
                {authView === 'login' 
                  ? 'Secure login powered by UNAI Onboarding Platform.' 
                  : 'Register your company to start managing projects paperlessly.'
                }
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-center gap-1.5 text-xs text-blue-100 w-full">
            <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
            <span className="text-[11px] font-medium">Enterprise Role Based Access</span>
          </div>
        </div>

        {/* Right Card: Auth Form Panel */}
        <div className="md:w-7/12 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white overflow-y-auto max-h-[85vh]">
          {/* Top Toggle: Login / Sign Up as Company */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setAuthView('login'); setOnboardStep(1); setOnboardError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authView === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthView('onboarding'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authView === 'onboarding'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up as Company
            </button>
          </div>

          {/* ===== LOGIN VIEW ===== */}
          {authView === 'login' && (
            <div className="max-w-md mx-auto w-full space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">
                  {loginStep === 'first_time_password' 
                    ? 'Activate Your Account' 
                    : loginStep === 'password'
                    ? 'Welcome Back'
                    : 'Sign In'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {loginStep === 'first_time_password'
                    ? 'Create your password to complete first-time account setup'
                    : loginStep === 'password'
                    ? 'Enter your password to access your workspace'
                    : 'Enter your work email to continue to PM CRM'}
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-950">
                      {error.toLowerCase().includes('access denied')
                        ? 'Access Denied'
                        : error.toLowerCase().includes('email not confirmed')
                        ? 'Email Verification Required'
                        : error.toLowerCase().includes('invalid email')
                        ? 'Invalid Credentials'
                        : error.toLowerCase().includes('no account')
                        ? 'Account Not Found'
                        : 'Authentication Notice'}
                    </p>
                    <p className="leading-relaxed text-rose-700">{error}</p>
                  </div>
                </div>
              )}

              {/* STEP 1: Email Verification Only */}
              {loginStep === 'email' && (
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Work Email</span>
                      <span className="text-[10px] text-slate-400 font-normal">Registered Organization Email</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@yourcompany.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Organization Email...</span>
                      </div>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2A: Returning User Password Entry */}
              {loginStep === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4 animate-fade-in">
                  {/* Centered Profile Avatar */}
                  <div className="flex flex-col items-center justify-center pt-1 pb-1 space-y-2 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0d82ff] to-[#00d1ff] p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                      {verifiedMember?.avatarUrl || localStorage.getItem(`unai_user_avatar_${email.toLowerCase()}`) ? (
                        <img
                          src={verifiedMember?.avatarUrl || localStorage.getItem(`unai_user_avatar_${email.toLowerCase()}`) || ''}
                          alt={verifiedMember?.fullName || 'User'}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span className="text-white font-black text-xl">
                          {(verifiedMember?.fullName || email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{verifiedMember?.fullName || 'Welcome Back'}</h3>
                    </div>
                  </div>

                  {/* Verified Email Field with Green Checkmark */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Work Email
                      </label>
                      <button
                        type="button"
                        onClick={() => { setLoginStep('email'); setPassword(''); setError(null); }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl cursor-default"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      <a
                        href="https://onboarding.unaitech.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                      >
                        Forgot Password?
                      </a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('first_time_password'); setError(null); }}
                      className="text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      First time logging in? <span className="font-bold text-blue-600 hover:underline">Set up password</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2B: First-Time User Password Generation */}
              {loginStep === 'first_time_password' && (
                <form onSubmit={handleFirstTimeActivation} className="space-y-4 animate-fade-in">
                  {/* User Profile Header Badge */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0d82ff] to-[#00d1ff] p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                      {verifiedMember?.avatarUrl || localStorage.getItem(`unai_user_avatar_${email.toLowerCase()}`) ? (
                        <img
                          src={verifiedMember?.avatarUrl || localStorage.getItem(`unai_user_avatar_${email.toLowerCase()}`) || ''}
                          alt={verifiedMember?.fullName || 'User'}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span className="text-white font-black text-xl">
                          {(verifiedMember?.fullName || email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{verifiedMember?.fullName || 'Activate Account'}</h3>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">First-Time Setup Required</p>
                    </div>
                  </div>

                  {/* Verified Email Field with Green Checkmark */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Work Email
                      </label>
                      <button
                        type="button"
                        onClick={() => { setLoginStep('email'); setNewPassword(''); setConfirmNewPassword(''); setError(null); }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl cursor-default"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create password (min 6 chars)"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Account...</span>
                      </div>
                    ) : (
                      <>
                        <span>Activate & Sign In</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('password'); setError(null); }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    >
                      Already set a password? Sign in with password
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs">
                <LockKeyhole className="w-3.5 h-3.5" />
                <span>Secured by UNAI Onboarding Platform</span>
              </div>
            </div>
          )}

          {/* ===== ONBOARDING VIEW ===== */}
          {authView === 'onboarding' && !onboardSuccess && (
            <div className="max-w-md mx-auto w-full space-y-4 animate-fade-in">
              {/* Step Indicator */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {[1, 2, 3, 4].map((step) => (
                    <React.Fragment key={step}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step < onboardStep ? 'bg-emerald-500 text-white' :
                        step === onboardStep ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {step < onboardStep ? <Check className="w-3.5 h-3.5" /> : step}
                      </div>
                      {step < 4 && (
                        <div className={`flex-1 h-0.5 rounded-full ${step < onboardStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <h2 className="text-xl font-black font-display text-slate-900 tracking-tight">
                  {onboardStep === 1 && 'Company Details'}
                  {onboardStep === 2 && 'Admin Account'}
                  {onboardStep === 3 && 'Document Template & Branding'}
                  {onboardStep === 4 && 'Review & Submit'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {onboardStep === 1 && 'Tell us about your organization & branding'}
                  {onboardStep === 2 && 'Set up your primary administrator account (Super Admin)'}
                  {onboardStep === 3 && 'Configure watermark, header & footer for CRM deliverables'}
                  {onboardStep === 4 && 'Verify all details and register'}
                </p>
              </div>

              {onboardError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p>{onboardError}</p>
                </div>
              )}

              {/* Step 1: Company Details */}
              {onboardStep === 1 && (
                <div className="space-y-3">
                  {/* Company Logo Upload Placeholder */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Company Logo (Shows on Dashboard & Documents)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <label className="flex-1 border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 py-2.5 px-3 rounded-xl cursor-pointer transition-colors text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                          <Upload className="w-4 h-4" />
                          <span>{logoFile ? logoFile.name : 'Upload Logo (PNG, JPG, SVG)'}</span>
                        </div>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Name *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corporation Pvt Ltd"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Industry</label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none">
                          <option value="">Select Industry...</option>
                          {['Technology & Software', 'Consulting & Services', 'Manufacturing', 'Finance & Banking', 'Healthcare', 'Construction & Real Estate', 'Education', 'Travel & Hospitality', 'Other'].map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">No. of Employees</label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none">
                          {EMPLOYEE_COUNTS.map((cnt) => <option key={cnt} value={cnt}>{cnt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Contact Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Country *</label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                          placeholder="Country"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="info@company.com"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Registration Number</label>
                      <div className="relative">
                        <FileCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="text" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)}
                          placeholder="CIN / Reg No. (optional)"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">About Company</label>
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={aboutCompany}
                        onChange={(e) => setAboutCompany(e.target.value)}
                        placeholder="Brief overview of company operations, mission, or key services..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button onClick={() => setOnboardStep(2)} disabled={!companyName.trim()}
                    className="w-full py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">
                    <span>Next: Admin Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Admin Account */}
              {onboardStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  {/* Designation Selector with Dropdown & Custom Option */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Designation *</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={selectedDesignation}
                          onChange={(e) => setSelectedDesignation(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                        >
                          {DESIGNATION_PRESETS.map((des) => (
                            <option key={des} value={des}>{des}</option>
                          ))}
                        </select>
                      </div>

                      {selectedDesignation === 'Other (Custom)' && (
                        <input
                          type="text"
                          value={customDesignation}
                          onChange={(e) => setCustomDesignation(e.target.value)}
                          placeholder="Enter your custom designation (e.g. Chief Executive Officer)"
                          className="w-full px-4 py-2 bg-blue-50/50 border border-blue-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      )}
                    </div>
                  </div>

                  {/* Role in CRM Badge */}
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Assigned CRM Role:</span>
                    <span className="font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-lg">
                      Super Admin (Full Access)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setOnboardStep(1)}
                      className="px-4 py-2.5 rounded-xl font-bold text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /><span>Back</span>
                    </button>
                    <button onClick={() => setOnboardStep(3)} disabled={!adminName.trim() || !adminEmail.trim() || !adminPassword || adminPassword !== confirmPassword || adminPassword.length < 6}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">
                      <span>Next: Document Template</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Document Template & Watermark */}
              {onboardStep === 3 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-slate-600 leading-relaxed">
                    Set up default letterhead, watermark, header, and footer applied to all 16 downloadable PM CRM documents (.docx, PDF).
                  </div>

                  {/* Watermark Configuration */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Document Watermark
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={watermarkEnabled}
                          onChange={(e) => setWatermarkEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {watermarkEnabled && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200/60 animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWatermarkType('logo')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              watermarkType === 'logo'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Company Logo Watermark
                          </button>
                          <button
                            type="button"
                            onClick={() => setWatermarkType('custom')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              watermarkType === 'custom'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Custom Watermark
                          </button>
                        </div>

                        {/* Custom Watermark Sub-options */}
                        {watermarkType === 'custom' && (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">Custom Mode:</span>
                              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setWatermarkCustomType('text')}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    watermarkCustomType === 'text'
                                      ? 'bg-white text-blue-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Shortform / Text
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWatermarkCustomType('image')}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    watermarkCustomType === 'image'
                                      ? 'bg-white text-blue-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Upload Custom Logo / Icon
                                </button>
                              </div>
                            </div>

                            {watermarkCustomType === 'text' ? (
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Watermark Text / Shortform Acronym
                                </label>
                                <input
                                  type="text"
                                  value={watermarkText}
                                  onChange={(e) => setWatermarkText(e.target.value)}
                                  placeholder="e.g. ST (Swaxthika Travels) / UNAI / CONFIDENTIAL"
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                />
                                <span className="text-[10px] text-slate-600 mt-1 block">
                                  Tip: Enter company shortform (e.g. ST) or classification.
                                </span>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Custom Watermark Image / Icon ('watermarks' storage bucket)
                                </label>
                                {watermarkCustomPreview ? (
                                  <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                      <img
                                        src={watermarkCustomPreview}
                                        alt="Custom watermark preview"
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11px] font-bold text-slate-800 truncate">Custom Watermark Loaded</div>
                                      <div className="text-[9px] text-emerald-600 font-medium">Ready for storage upload</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <label className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold cursor-pointer transition-colors">
                                        Replace
                                        <input
                                          type="file"
                                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                          onChange={handleCustomWatermarkFileChange}
                                          className="sr-only"
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setWatermarkCustomFile(null);
                                          setWatermarkCustomPreview(null);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Remove image"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/50 group">
                                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600 mb-0.5 transition-colors" />
                                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-700">
                                      Choose Custom Watermark Image
                                    </span>
                                    <span className="text-[9px] text-slate-600">
                                      PNG, SVG, JPG or WEBP (transparent recommended)
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                      onChange={handleCustomWatermarkFileChange}
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
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Watermark Size:</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setWatermarkSize(sz)}
                                className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                  watermarkSize === sz
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

                        {/* Watermark Angle / Orientation */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Watermark Angle & Orientation:</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setWatermarkOrientation('diagonal')}
                              className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                watermarkOrientation === 'diagonal'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Diagonal / Tilted (-30°)
                            </button>
                            <button
                              type="button"
                              onClick={() => setWatermarkOrientation('horizontal')}
                              className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                watermarkOrientation === 'horizontal'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Horizontal / Straight (0°)
                            </button>
                          </div>
                        </div>

                        {/* Faded Toggle & Opacity */}
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700">Faded / Translucent:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setWatermarkFaded(true); setWatermarkOpacity(15); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                watermarkFaded ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Faded (15%)
                            </button>
                            <button
                              type="button"
                              onClick={() => { setWatermarkFaded(false); setWatermarkOpacity(40); }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                !watermarkFaded ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Standard (40%)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Header & Footer Customization */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-2.5 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block">
                      Default Header & Footer
                    </span>

                    {/* Header Alignment & Layout */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Header Alignment</label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => setHeaderAlignment('split')}
                            className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              headerAlignment === 'split' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Split
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeaderAlignment('center')}
                            className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              headerAlignment === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Center
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeaderAlignment('left')}
                            className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              headerAlignment === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Left
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Logo & Text Position</label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setHeaderLayout('inline')}
                            className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              headerLayout === 'inline' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Side-by-Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeaderLayout('stacked')}
                            className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              headerLayout === 'stacked' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Text Under Logo
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Header Subtitle (Right)</label>
                      <input
                        type="text"
                        value={headerRightText}
                        onChange={(e) => setHeaderRightText(e.target.value)}
                        placeholder="PM CRM Engineering Deliverable"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Footer Confidentiality Notice</label>
                      <input
                        type="text"
                        value={footerConfidentiality}
                        onChange={(e) => setFooterConfidentiality(e.target.value)}
                        placeholder="Strictly Confidential - Internal Use Only"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Live Mini Preview Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Document Preview
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          exportService.exportSampleTestDeliverable(
                            {
                              watermark: {
                                enabled: watermarkEnabled,
                                type: watermarkType,
                                customType: watermarkCustomType,
                                text: watermarkText,
                                customImageUrl: watermarkCustomPreview || undefined,
                                isFaded: watermarkFaded,
                                opacity: watermarkOpacity,
                                size: watermarkSize,
                                orientation: watermarkOrientation,
                              },
                              header: {
                                enabled: true,
                                showLogo: true,
                                alignment: headerAlignment,
                                layout: headerLayout,
                                isBold: headerIsBold,
                                leftText: companyName || 'Company Name',
                                rightText: headerRightText,
                              },
                              footer: {
                                enabled: true,
                                copyrightText: `© ${new Date().getFullYear()} ${companyName || 'Company'}. ${footerCopyright}`,
                                showPageNumber: true,
                                confidentialityNotice: footerConfidentiality,
                              },
                            },
                            companyName || 'Company Name',
                            logoPreview || undefined,
                            'pdf'
                          );
                        }}
                        className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Sample PDF</span>
                      </button>
                    </div>
                    <div className="border border-dashed border-slate-300 bg-white rounded-xl p-3 relative overflow-hidden min-h-[90px] flex flex-col justify-between text-[10px] text-slate-500 select-none shadow-sm">
                    {/* Background Watermark in Preview */}
                    {watermarkEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {watermarkType === 'custom' && watermarkCustomType === 'image' && watermarkCustomPreview ? (
                          <img
                            src={watermarkCustomPreview}
                            alt="Custom Watermark"
                            className={`object-contain ${
                              watermarkOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: watermarkFaded ? 0.15 : 0.4,
                              maxHeight: watermarkSize === 'sm' ? '30px' : watermarkSize === 'md' ? '48px' : watermarkSize === 'lg' ? '70px' : '90px',
                              maxWidth: watermarkSize === 'sm' ? '60px' : watermarkSize === 'md' ? '120px' : watermarkSize === 'lg' ? '180px' : '240px',
                            }}
                          />
                        ) : watermarkType === 'logo' && logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Watermark"
                            className={`object-contain ${
                              watermarkOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: watermarkFaded ? 0.15 : 0.4,
                              maxHeight: watermarkSize === 'sm' ? '30px' : watermarkSize === 'md' ? '48px' : watermarkSize === 'lg' ? '70px' : '90px',
                              maxWidth: watermarkSize === 'sm' ? '60px' : watermarkSize === 'md' ? '120px' : watermarkSize === 'lg' ? '180px' : '240px',
                            }}
                          />
                        ) : (
                          <span
                            className={`font-display tracking-widest text-slate-400 uppercase text-center px-2 ${
                              watermarkOrientation === 'horizontal' ? 'transform-none' : 'transform -rotate-12'
                            }`}
                            style={{
                              opacity: watermarkFaded ? 0.2 : 0.45,
                              fontSize: watermarkSize === 'sm' ? '12px' : watermarkSize === 'md' ? '16px' : watermarkSize === 'lg' ? '22px' : '28px',
                              fontWeight: headerIsBold ? 900 : 700,
                            }}
                          >
                            {watermarkType === 'logo' ? (companyName || 'COMPANY') : (watermarkText || 'CONFIDENTIAL')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Header in Preview */}
                    <div className="relative z-10 border-b border-slate-100 pb-1">
                      {headerLayout === 'stacked' ? (
                        <div className={`flex flex-col ${headerAlignment === 'center' ? 'items-center text-center' : 'items-start text-left'}`}>
                          {logoPreview && (
                            <img src={logoPreview} alt="Logo" className="h-4 w-auto object-contain mb-0.5" />
                          )}
                          <span className={`text-[11px] font-display ${headerIsBold ? 'font-black text-slate-800' : 'font-semibold text-slate-700'}`}>
                            {companyName || 'Company Name'}
                          </span>
                          <span className="text-[9px] text-slate-400">{headerRightText}</span>
                        </div>
                      ) : (
                        <div className={`flex ${headerAlignment === 'center' ? 'flex-col items-center justify-center text-center' : 'items-center justify-between'}`}>
                          <div className="flex items-center gap-1.5">
                            {logoPreview && (
                              <img src={logoPreview} alt="Logo" className="h-3.5 w-auto object-contain" />
                            )}
                            <span className={`text-[11px] font-display ${headerIsBold ? 'font-black text-slate-800' : 'font-semibold text-slate-700'}`}>
                              {companyName || 'Company Name'}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400">{headerRightText}</span>
                        </div>
                      )}
                    </div>

                    <div className="py-2 text-center text-slate-400 relative z-10 italic">
                      [Document Sections & Engineering Specification Content]
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1 relative z-10 text-[9px] text-slate-400">
                      <span>{footerConfidentiality}</span>
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={() => setOnboardStep(2)}
                      className="px-4 py-2.5 rounded-xl font-bold text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /><span>Back</span>
                    </button>
                    <button onClick={() => setOnboardStep(4)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5">
                      <span>Next: Review & Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {onboardStep === 4 && (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Company Details
                      </h4>
                      {logoPreview && (
                        <div className="h-6 w-auto bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center">
                          <img src={logoPreview} alt="Logo" className="h-5 w-auto object-contain" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                      <span className="font-medium">Company Name:</span><span className="font-bold text-slate-900">{companyName}</span>
                      {industry && <><span className="font-medium">Industry:</span><span className="font-bold text-slate-900">{industry}</span></>}
                      {employeeCount && <><span className="font-medium">Employees:</span><span className="font-bold text-slate-900">{employeeCount}</span></>}
                      <span className="font-medium">Country:</span><span className="font-bold text-slate-900">{country}</span>
                      {contactNumber && <><span className="font-medium">Contact:</span><span className="font-bold text-slate-900">{contactNumber}</span></>}
                      {companyEmail && <><span className="font-medium">Email:</span><span className="font-bold text-slate-900">{companyEmail}</span></>}
                      {registrationNo && <><span className="font-medium">Reg No:</span><span className="font-bold text-slate-900">{registrationNo}</span></>}
                    </div>
                    {aboutCompany && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 italic">
                        "{aboutCompany}"
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200/60">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Admin Account
                    </h4>
                    <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                      <span className="font-medium">Name:</span><span className="font-bold text-slate-900">{adminName}</span>
                      <span className="font-medium">Email:</span><span className="font-bold text-slate-900">{adminEmail}</span>
                      <span className="font-medium">Designation:</span><span className="font-bold text-slate-900">{effectiveDesignation}</span>
                      <span className="font-medium">Role:</span><span className="font-bold text-blue-600">Super Admin</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-1.5 text-xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Document Template
                    </h4>
                    <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                      <span className="font-medium">Watermark:</span>
                      <span className="font-bold text-slate-900">
                        {watermarkEnabled ? `${watermarkType === 'logo' ? 'Logo' : watermarkText} (${watermarkFaded ? 'Faded 15%' : 'Standard 40%'})` : 'Disabled'}
                      </span>
                      <span className="font-medium">Header/Footer:</span>
                      <span className="font-bold text-slate-900">Customized</span>
                    </div>
                  </div>

                  {/* Terms & Conditions Toggle Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-700 leading-snug">
                      I agree to the <strong>Terms of Service</strong>, <strong>Privacy Policy</strong>, and authorize <strong>UNAI PM CRM</strong> to establish company workspace and access privileges.
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button onClick={() => setOnboardStep(3)}
                      className="px-4 py-3 rounded-xl font-bold text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /><span>Back</span>
                    </button>
                    <button onClick={handleOnboardSubmit} disabled={isLoading || isUploadingLogo || !acceptedTerms}
                      className="flex-1 py-3 rounded-xl font-bold text-white text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                      {isLoading || isUploadingLogo ? (
                        <span>Registering Company...</span>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4" />
                          <span>Register & Continue as Admin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onboarding Success */}
          {authView === 'onboarding' && onboardSuccess && (
            <div className="max-w-md mx-auto w-full text-center space-y-4 animate-fade-in py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black font-display text-slate-900">Company Registered!</h2>
              <p className="text-xs text-slate-500">
                <strong>{companyName}</strong> has been successfully registered. You are now signed in as <strong>{effectiveDesignation} (Super Admin)</strong>. Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

