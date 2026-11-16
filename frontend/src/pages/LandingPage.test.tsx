import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('muestra el propósito y los dos accesos', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Accidentes personales' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Registrar un accidente' }).getAttribute('href')).toBe('/accidentes/nuevo');
    expect(screen.getByRole('link', { name: 'Ingresar para consultar mis accidentes' }).getAttribute('href')).toBe('/login');
  });
});
