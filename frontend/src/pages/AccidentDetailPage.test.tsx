import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AccidentDetailPage } from './AccidentDetailPage';

vi.mock('../api/accidents', () => ({ createAccident: vi.fn(), listAccidents: vi.fn(), getAccident: vi.fn() }));
import { getAccident } from '../api/accidents';

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/accidentes/a1']}>
      <Routes>
        <Route path="/accidentes/:id" element={<AccidentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AccidentDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los campos del accidente propio', async () => {
    vi.mocked(getAccident).mockResolvedValue({
      id: 'a1',
      affectedName: 'Ana Pérez',
      documentType: 'CC',
      documentNumber: 'ABC12345',
      phone: '3001234567',
      contactEmail: 'ana@correo.co',
      accidentType: 'LABORAL',
      occurredOn: '2026-11-10',
      place: 'Bogotá',
      description: 'Descripción suficientemente larga',
      status: 'REGISTRADO',
      createdAt: '2026-11-11T15:30:00.000Z',
      updatedAt: '2026-11-11T15:30:00.000Z',
    });
    montar();
    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('Laboral')).toBeTruthy();
    expect(screen.getByText('10/11/2026')).toBeTruthy();
    expect(screen.getByText('Registrado')).toBeTruthy();
    expect(screen.getByText('ABC12345')).toBeTruthy();
    expect(screen.getAllByText('11/11/2026 15:30 UTC')).toHaveLength(2);
  });

  it('404 muestra "Accidente no encontrado" con enlace al listado', async () => {
    vi.mocked(getAccident).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    montar();
    expect(await screen.findByText('Accidente no encontrado')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver a mis accidentes' }).getAttribute('href')).toBe('/accidentes');
  });

  it('error de red muestra Reintentar', async () => {
    vi.mocked(getAccident).mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'x'));
    montar();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
