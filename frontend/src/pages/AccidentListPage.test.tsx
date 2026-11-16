import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AccidentListPage } from './AccidentListPage';

vi.mock('../api/accidents', () => ({ createAccident: vi.fn(), listAccidents: vi.fn(), getAccident: vi.fn() }));
import { listAccidents } from '../api/accidents';

const montar = () => render(<MemoryRouter><AccidentListPage /></MemoryRouter>);

describe('AccidentListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra cargando y luego el estado vacío con enlace', async () => {
    vi.mocked(listAccidents).mockResolvedValue([]);
    montar();
    expect(screen.getByText('Cargando...')).toBeTruthy();
    expect(await screen.findByText(/Aún no has registrado accidentes/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Registrar accidente' }).getAttribute('href')).toBe('/accidentes/nuevo');
  });

  it('muestra tipo, fecha y estado en español', async () => {
    vi.mocked(listAccidents).mockResolvedValue([
      { id: 'a1', accidentType: 'TRANSITO', occurredOn: '2026-11-10', status: 'EN_REVISION' },
    ]);
    montar();
    expect(await screen.findByText('Tránsito')).toBeTruthy();
    expect(screen.getByText('10/11/2026')).toBeTruthy();
    expect(screen.getByText('En revisión')).toBeTruthy();
  });

  it('error de red muestra mensaje y Reintentar recarga', async () => {
    vi.mocked(listAccidents).mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'x'));
    montar();
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar');
    vi.mocked(listAccidents).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Aún no has registrado accidentes/)).toBeTruthy();
    expect(listAccidents).toHaveBeenCalledTimes(2);
  });
});
