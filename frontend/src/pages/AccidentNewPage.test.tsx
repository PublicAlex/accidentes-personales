import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AccidentNewPage } from './AccidentNewPage';

vi.mock('../api/accidents', () => ({ createAccident: vi.fn(), listAccidents: vi.fn(), getAccident: vi.fn() }));
import { createAccident } from '../api/accidents';

function montar() {
  render(<MemoryRouter><AccidentNewPage /></MemoryRouter>);
}

function llenar() {
  const c = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
  c('Nombre del afectado', 'Ana Pérez');
  c('Tipo de documento', 'CC');
  c('Número de documento', 'ABC12345');
  c('Teléfono', '3001234567');
  c('Correo de contacto', 'ana@correo.co');
  c('Tipo de accidente', 'TRANSITO');
  c('Fecha del accidente', '2020-01-10');
  c('Lugar', 'Bogotá');
  c('Descripción', 'Descripción suficientemente larga');
}

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar accidente' }));

describe('AccidentNewPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('formulario vacío muestra error por campo y no llama a la API', () => {
    montar();
    enviar();
    expect(screen.getAllByRole('alert').length).toBe(9);
    expect(createAccident).not.toHaveBeenCalled();
  });

  it('deshabilita el botón durante el envío y confirma al éxito', async () => {
    let resolver!: (v: unknown) => void;
    vi.mocked(createAccident).mockReturnValue(new Promise((r) => { resolver = r; }) as never);
    montar();
    llenar();
    enviar();
    const boton = (await screen.findByRole('button', { name: 'Enviando...' })) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    resolver({ id: 'abc' });
    const enlace = await screen.findByRole('link', { name: 'Ver detalle' });
    expect(enlace.getAttribute('href')).toBe('/accidentes/abc');
    expect((screen.getByLabelText('Nombre del afectado') as HTMLInputElement).value).toBe('');
    const arg = vi.mocked(createAccident).mock.calls[0][0];
    expect(Object.keys(arg).sort()).toEqual(
      ['accidentType', 'affectedName', 'contactEmail', 'description', 'documentNumber', 'documentType', 'occurredOn', 'phone', 'place'],
    );
  });

  it('400 con details pinta el campo y los desconocidos van al mensaje general', async () => {
    vi.mocked(createAccident).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'x', [
        { field: 'description', message: 'Descripción rechazada por el servidor' },
        { field: 'otro', message: 'Campo raro' },
      ]),
    );
    montar();
    llenar();
    enviar();
    expect(await screen.findByText('Descripción rechazada por el servidor')).toBeTruthy();
    expect(screen.getByText('Campo raro')).toBeTruthy();
    expect((screen.getByLabelText('Lugar') as HTMLInputElement).value).toBe('Bogotá');
  });

  it('error de red muestra mensaje y deja el botón habilitado', async () => {
    vi.mocked(createAccident).mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'x'));
    montar();
    llenar();
    enviar();
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Registrar accidente' }) as HTMLButtonElement).disabled).toBe(false));
  });
});
