import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { hasValidToken } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!hasValidToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}