import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { UserRole } from '../../types';

interface UnauthorizedScreenProps {
  requiredPermission?: string;
  userRole: UserRole;
  onGoBack: () => void;
  customMessage?: string;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({
  requiredPermission,
  userRole,
  onGoBack,
  customMessage
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 text-rose-600 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
        <Lock className="w-3.5 h-3.5" />
        <span>Access Restricted</span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">
        Unauthorized Page / Action
      </h2>

      <p className="text-slate-600 max-w-md text-sm mb-6 leading-relaxed">
        {customMessage || `Your active role (${userRole}) does not have permission to view this view or execute this action. Access is restricted under platform governance.`}
      </p>

      {requiredPermission && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-6 text-xs text-slate-500 font-mono">
          Required Permission: <span className="font-semibold text-slate-800">{requiredPermission}</span>
        </div>
      )}

      <button
        onClick={onGoBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E5BF0] hover:bg-blue-700 text-white font-medium text-xs shadow-md transition-all active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Permitted View</span>
      </button>
    </div>
  );
};
