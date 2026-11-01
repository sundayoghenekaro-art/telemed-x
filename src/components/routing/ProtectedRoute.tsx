import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { UserRole } from '@/types/dhos';
import { canAccessRoute, routeLabelFor } from '@/lib/access';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  children: ReactNode;
  currentRole?: UserRole | null;
}

export function ProtectedRoute({ children, currentRole }: ProtectedRouteProps) {
  const location = useLocation();

  if (!canAccessRoute(currentRole, location.pathname)) {
    return <AccessDenied area={routeLabelFor(location.pathname)} />;
  }

  return <>{children}</>;
}
