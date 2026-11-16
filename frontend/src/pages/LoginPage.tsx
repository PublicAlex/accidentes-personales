import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export function mensajeLogin(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Correo o contraseña incorrectos';
    if (err.status === 429) return 'Demasiados intentos, espera unos minutos';
    if (err.status === 0) return 'No se pudo conectar con el servidor';
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo';
}

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pedido = (location.state as { from?: unknown } | null)?.from;
  const from = typeof pedido === 'string' && pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/accidentes';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (status === 'authenticated' && !enviando) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(mensajeLogin(err));
      setEnviando(false);
    }
  }

  return (
    <main className="container narrow">
      <h1>Ingresar</h1>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={enviando}>{enviando ? 'Ingresando...' : 'Ingresar'}</button>
      </form>
      <p>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
    </main>
  );
}
