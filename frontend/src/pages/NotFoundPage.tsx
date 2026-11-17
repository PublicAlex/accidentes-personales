import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

export function NotFoundPage() {
  return (
    <main className="container narrow">
      <div className="card empty-state">
        <span className="empty-icon"><Icon name="alert" size={28} /></span>
        <h1>Página no encontrada</h1>
        <p>La página que buscas no existe.</p>
        <Link className="button" to="/">Volver al inicio</Link>
      </div>
    </main>
  );
}
