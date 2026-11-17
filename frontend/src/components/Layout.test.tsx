import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError, request } from '../api/client';
import { AuthProvider } from '../hooks/useAuth';
import { Layout } from './Layout';
import { RequireAuth } from './RequireAuth';

vi.mock('../api/auth', () => ({
  getMe: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
}));
import { getMe, logoutUser } from '../api/auth';

function montar() {
  render(
    <MemoryRouter initialEntries={['/accidentes']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>Landing</p>} />
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/accidentes" element={<p>Lista de accidentes</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Layout y sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMe).mockResolvedValue({ id: '1', email: 'a@b.co', fullName: 'Ana Pérez', role: 'USER' });
  });

  it('logout aunque falle la red limpia la sesión y vuelve a la landing', async () => {
    vi.mocked(logoutUser).mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'x'));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByText('Landing')).toBeTruthy();
  });

  it('un 401 en una llamada protegida deja la sesión anónima y redirige a /login', async () => {
    montar();
    await screen.findByText('Lista de accidentes');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"code":"UNAUTHENTICATED","message":"x"}}', { status: 401 })));
    await request('GET', '/accidents').catch(() => undefined);
    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
