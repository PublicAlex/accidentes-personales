import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AuthProvider } from '../hooks/useAuth';
import { RequireAuth } from './RequireAuth';

vi.mock('../api/auth', () => ({
  getMe: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
}));
import { getMe } from '../api/auth';

function montar() {
  render(
    <MemoryRouter initialEntries={['/accidentes']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Pantalla login</p>} />
          <Route path="/accidentes" element={<RequireAuth><p>Contenido protegido</p></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra Cargando mientras /me está pendiente', () => {
    vi.mocked(getMe).mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByText('Cargando...')).toBeTruthy();
    expect(screen.queryByText('Pantalla login')).toBeNull();
  });

  it('redirige a /login sin sesión', async () => {
    vi.mocked(getMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'x'));
    montar();
    expect(await screen.findByText('Pantalla login')).toBeTruthy();
  });

  it('renderiza el hijo con sesión', async () => {
    vi.mocked(getMe).mockResolvedValue({ id: '1', email: 'a@b.co', fullName: 'Ana Pérez', role: 'USER' });
    montar();
    expect(await screen.findByText('Contenido protegido')).toBeTruthy();
  });
});
