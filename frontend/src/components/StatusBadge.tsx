import type { CSSProperties } from 'react';
import type { AccidentStatus } from '../api/types';
import { statusColors, statusLabels } from './statusLabels';

export function StatusBadge({ status }: { status: AccidentStatus }) {
  const c = statusColors[status];
  const style = c
    ? ({ '--badge-bg': c.bg, '--badge-fg': c.fg, '--badge-dot': c.dot } as CSSProperties)
    : undefined;
  return (
    <span className={`badge badge-${status.toLowerCase()}`} style={style}>
      {statusLabels[status] ?? status}
    </span>
  );
}
