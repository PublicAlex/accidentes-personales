import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="container">
      <h1>Página no encontrada</h1>
      <p>La página que buscas no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  );
}
