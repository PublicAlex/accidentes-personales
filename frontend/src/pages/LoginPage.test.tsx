import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AuthProvider } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';

vi.mock('../api/auth', () => ({
  getMe: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
}));
import { getMe, loginUser } from '../api/auth';

function montar() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accidentes" element={<p>Lista de accidentes</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function enviar() {
  const boton = await screen.findByRole('button', { name: 'Ingresar' });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'a@b.co' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto123' } });
  fireEvent.click(boton);
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'x'));
  });

  it('401 muestra mensaje genérico y no navega', async () => {
    vi.mocked(loginUser).mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    montar();
    await enviar();
    expect((await screen.findByRole('alert')).textContent).toBe('Correo o contraseña incorrectos');
    expect(screen.queryByText('Lista de accidentes')).toBeNull();
  });

  it('429 muestra mensaje de demasiados intentos', async () => {
    vi.mocked(loginUser).mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'x'));
    montar();
    await enviar();
    expect((await screen.findByRole('alert')).textContent).toBe('Demasiados intentos, espera unos minutos');
  });

  it('éxito navega a /accidentes', async () => {
    vi.mocked(loginUser).mockResolvedValue({ id: '1', email: 'a@b.co', fullName: 'Ana Pérez', role: 'USER' });
    montar();
    await enviar();
    expect(await screen.findByText('Lista de accidentes')).toBeTruthy();
  });
});
