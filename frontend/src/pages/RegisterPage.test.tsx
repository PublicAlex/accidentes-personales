import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AuthProvider } from '../hooks/useAuth';
import { RegisterPage } from './RegisterPage';

vi.mock('../api/auth', () => ({
  getMe: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
}));
import { getMe, loginUser, registerUser } from '../api/auth';

function montar() {
  render(
    <MemoryRouter initialEntries={['/registro']}>
      <AuthProvider>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route path="/accidentes" element={<p>Lista de accidentes</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function llenar(email = 'a@b.co', password = 'secreto123', nombre = 'Ana Pérez') {
  const boton = await screen.findByRole('button', { name: 'Registrarme' });
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.click(boton);
}

const usuario = { id: '1', email: 'a@b.co', fullName: 'Ana Pérez', role: 'USER' as const };

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'x'));
  });

  it('datos inválidos muestran error por campo y no llaman a la API', async () => {
    montar();
    await llenar('mal', 'corta', 'Al');
    expect(await screen.findByText('Ingresa un correo válido')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();
    expect(screen.getByText('El nombre debe tener entre 3 y 120 caracteres')).toBeTruthy();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('409 muestra mensaje genérico sin afirmar que el correo existe', async () => {
    vi.mocked(registerUser).mockRejectedValue(new ApiError(409, 'EMAIL_TAKEN', 'x'));
    montar();
    await llenar();
    const alerta = (await screen.findByRole('alert')).textContent ?? '';
    expect(alerta).toContain('No se pudo completar el registro');
    expect(alerta.toLowerCase()).not.toContain('ya está registrado');
  });

  it('400 con details pinta el error en su campo', async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'x', [{ field: 'email', message: 'El correo no tiene un formato válido' }]),
    );
    montar();
    await llenar();
    expect(await screen.findByText('El correo no tiene un formato válido')).toBeTruthy();
  });

  it('429 muestra mensaje de demasiados intentos', async () => {
    vi.mocked(registerUser).mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'x'));
    montar();
    await llenar();
    expect((await screen.findByRole('alert')).textContent).toContain('Demasiados intentos');
  });

  it('registro exitoso hace login y navega a /accidentes', async () => {
    vi.mocked(registerUser).mockResolvedValue(usuario);
    vi.mocked(loginUser).mockResolvedValue(usuario);
    montar();
    await llenar();
    expect(await screen.findByText('Lista de accidentes')).toBeTruthy();
    expect(loginUser).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secreto123' });
  });

  it('si el login posterior falla, avisa que la cuenta fue creada y enlaza a login', async () => {
    vi.mocked(registerUser).mockResolvedValue(usuario);
    vi.mocked(loginUser).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x'));
    montar();
    await llenar();
    expect((await screen.findByRole('alert')).textContent).toContain('Tu cuenta fue creada');
    expect(screen.getByRole('link', { name: 'Ir a ingresar' })).toBeTruthy();
  });
});
