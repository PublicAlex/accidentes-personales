import type { AccidentStatus } from '../api/types';
import { statusLabels } from './statusLabels';

export function StatusBadge({ status }: { status: AccidentStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{statusLabels[status] ?? status}</span>;
}
