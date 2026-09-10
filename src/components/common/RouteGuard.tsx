import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppPermission } from '../../lib/permissions';
import { UnauthorizedScreen } from './UnauthorizedScreen';

interface RouteGuardProps {
  permission: AppPermission;
  children: React.ReactNode;
  onFallbackNavigate?: () => void;
  customMessage?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  permission,
  children,
  onFallbackNavigate,
  customMessage
}) => {
  const { role, hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <UnauthorizedScreen
        requiredPermission={permission}
        userRole={role}
        onGoBack={onFallbackNavigate || (() => window.history.back())}
        customMessage={customMessage}
      />
    );
  }

  return <>{children}</>;
};
