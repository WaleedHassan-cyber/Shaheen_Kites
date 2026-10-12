import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KiteLoader from './KiteLoader';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <KiteLoader full label="Opening your account…" />;
  // Remember the page (for example a scanned /verify link) so we come back to it after login.
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}