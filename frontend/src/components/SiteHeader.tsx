import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './Icon';

export function SiteHeader() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    navigate('/');
    await logout();
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="cross" size={18} /></span>
          <span>Registro de Accidentes Personales</span>
        </Link>
        {status === 'authenticated' && (
          <>
            <nav aria-label="Principal" className="main-nav">
              <NavLink to="/accidentes" end>Mis accidentes</NavLink>
              <NavLink to="/accidentes/nuevo">Registrar accidente</NavLink>
            </nav>
            <div className="user">
              <span className="user-email">{user?.email}</span>
              <button type="button" className="btn-outline btn-sm" onClick={salir} disabled={saliendo}>
                {saliendo ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="site-footer">Datos ficticios — MVP</footer>;
}
