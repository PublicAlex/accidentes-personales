import type { AccidentStatus } from '../api/types';

export const statusLabels: Record<AccidentStatus, string> = {
  REGISTRADO: 'Registrado',
  EN_REVISION: 'En revisión',
  CERRADO: 'Cerrado',
};

// Colores de la insignia por estado (fondo, texto, punto). Contraste AA verificado.
// Agregar un estado nuevo = una entrada aquí y una en statusLabels.
export const statusColors: Record<AccidentStatus, { bg: string; fg: string; dot: string }> = {
  REGISTRADO: { bg: '#DBEAFE', fg: '#1E3A8A', dot: '#2563EB' },
  EN_REVISION: { bg: '#FEF3C7', fg: '#78350F', dot: '#D97706' },
  CERRADO: { bg: '#D1FAE5', fg: '#064E3B', dot: '#059669' },
};
