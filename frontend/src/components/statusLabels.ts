import type { AccidentStatus } from '../api/types';

export const statusLabels: Record<AccidentStatus, string> = {
  REGISTRADO: 'Registrado',
  EN_REVISION: 'En revisión',
  CERRADO: 'Cerrado',
};
