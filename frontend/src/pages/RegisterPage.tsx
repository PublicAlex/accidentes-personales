import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FieldError } from '../components/FieldError';
import { registerUser } from '../api/auth';

type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validar(email: string, password: string, fullName: string): Errors {
  const e: Errors = {};
  if (!EMAIL_RE.test(email.trim())) e.email = 'Ingresa un correo válido';
  if (password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres';
  const n = [...fullName.trim()].length;
  if (n < 3 || n > 120) e.fullName = 'El nombre debe tener entre 3 y 120 caracteres';
  return e;
}

export function RegisterPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loginFallido, setLoginFallido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (status === 'authenticated' && !enviando) return <Navigate to="/accidentes" replace />;

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGeneral(null);
    setLoginFallido(false);
    const v = validar(email, password, fullName);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setEnviando(true);
    const datos = { email: email.trim(), password, fullName: fullName.trim() };
    try {
      await registerUser(datos);
    } catch (err) {
      setEnviando(false);
      if (err instanceof ApiError && err.status === 409) {
        setGeneral('No se pudo completar el registro. Verifica tus datos o intenta ingresar.');
      } else if (err instanceof ApiError && err.status === 400) {
        const porCampo: Errors = {};
        for (const d of err.details ?? []) porCampo[d.field] = d.message;
        setErrors(porCampo);
        if (!err.details || err.details.length === 0) setGeneral('Los datos ingresados no son válidos');
      } else if (err instanceof ApiError && err.status === 429) {
        setGeneral('Demasiados intentos, espera unos minutos');
      } else if (err instanceof ApiError && err.status === 0) {
        setGeneral('No se pudo conectar con el servidor');
      } else {
        setGeneral('No se pudo completar el registro. Inténtalo de nuevo');
      }
      return;
    }
    try {
      await login(datos.email, datos.password);
      navigate('/accidentes', { replace: true });
    } catch {
      setEnviando(false);
      setLoginFallido(true);
      setGeneral('Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente.');
    }
  }

  return (
    <main className="container narrow">
      <h1>Crear cuenta</h1>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="fullName">Nombre completo</label>
          <input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-describedby="fullName-error" />
          <FieldError id="fullName-error" message={errors.fullName} />
        </div>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="email-error" />
          <FieldError id="email-error" message={errors.email} />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="password-error" />
          <FieldError id="password-error" message={errors.password} />
        </div>
        {general && (
          <p role="alert" className="field-error">
            {general} {loginFallido && <Link to="/login">Ir a ingresar</Link>}
          </p>
        )}
        <button type="submit" disabled={enviando}>{enviando ? 'Creando cuenta...' : 'Registrarme'}</button>
      </form>
      <p>¿Ya tienes cuenta? <Link to="/login">Ingresar</Link></p>
    </main>
  );
}
