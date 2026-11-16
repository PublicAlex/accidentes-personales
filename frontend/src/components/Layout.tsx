import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    navigate('/');
    await logout();
  }

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">Accidentes personales</Link>
        <nav aria-label="Principal">
          <Link to="/accidentes">Mis accidentes</Link>
          <Link to="/accidentes/nuevo">Registrar accidente</Link>
        </nav>
        <span className="user">
          {user?.fullName}{' '}
          <button type="button" onClick={salir} disabled={saliendo}>
            {saliendo ? 'Saliendo...' : 'Salir'}
          </button>
        </span>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
