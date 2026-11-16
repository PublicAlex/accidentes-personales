import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="container landing">
      <h1>Accidentes personales</h1>
      <p>Registra un accidente personal y consulta el estado de tus registros de forma segura.</p>
      <div className="actions">
        <Link className="button" to="/accidentes/nuevo">Registrar un accidente</Link>
        <Link className="button secondary" to="/login">Ingresar para consultar mis accidentes</Link>
      </div>
    </main>
  );
}
