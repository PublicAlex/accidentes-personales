import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <p className="loading">Cargando...</p>;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  return <>{children ?? <Outlet />}</>;
}
