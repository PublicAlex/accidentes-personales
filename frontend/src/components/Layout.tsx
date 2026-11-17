import { Outlet } from 'react-router-dom';
import { SiteFooter, SiteHeader } from './SiteHeader';

export function Layout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="container">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

// Envoltorio de las páginas públicas (landing, login, registro, 404): sus páginas traen su propio <main>.
export function PublicLayout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
