import { describe, expect, it } from 'vitest';
import { ACCIDENT_STATUSES } from '../api/types';
import { statusLabels } from './statusLabels';

describe('statusLabels', () => {
  it('tiene una etiqueta en español por cada estado', () => {
    expect(Object.keys(statusLabels).sort()).toEqual([...ACCIDENT_STATUSES].sort());
    expect(statusLabels.REGISTRADO).toBe('Registrado');
    expect(statusLabels.EN_REVISION).toBe('En revisión');
    expect(statusLabels.CERRADO).toBe('Cerrado');
  });
});
