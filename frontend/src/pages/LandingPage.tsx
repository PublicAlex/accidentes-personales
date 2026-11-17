import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield', title: 'Registro seguro', text: 'Tus datos se almacenan con controles de acceso y validación.' },
  { icon: 'lock', title: 'Consulta privada', text: 'Solo tú puedes ver los accidentes que registraste.' },
  { icon: 'pulse', title: 'Seguimiento de estado', text: 'Revisa si tu caso está registrado, en revisión o cerrado.' },
];

export function LandingPage() {
  return (
    <main className="container landing">
      <section className="card hero">
        <span className="hero-icon"><Icon name="clipboard" size={28} /></span>
        <h1>Accidentes personales</h1>
        <p className="lead">Registra un accidente personal y consulta el estado de tus registros de forma segura.</p>
        <div className="actions">
          <Link className="button" to="/accidentes/nuevo">Registrar un accidente</Link>
          <Link className="button secondary" to="/login">Ingresar para consultar mis accidentes</Link>
        </div>
      </section>
      <ul className="features" aria-label="Características">
        {FEATURES.map((f) => (
          <li key={f.title} className="card feature">
            <span className="feature-icon"><Icon name={f.icon} /></span>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
