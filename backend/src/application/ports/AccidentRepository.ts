import type { Accident } from '../../domain/accident/Accident.js';
import type { AccidentStatus } from '../../domain/accident/AccidentStatus.js';
import type { AccidentType } from '../../domain/accident/AccidentType.js';

export interface AccidentSummary {
  readonly id: string;
  readonly accidentType: AccidentType;
  readonly occurredOn: string;
  readonly status: AccidentStatus;
}

export interface UpdateStatusInput {
  readonly id: string;
  readonly expected: AccidentStatus;
  readonly next: AccidentStatus;
  readonly by: string;
  readonly at: Date;
}

export interface AccidentRepository {
  create(accident: Accident): Promise<Accident>;
  /** Orden occurred_on DESC, created_at DESC, id. */
  listByOwner(ownerId: string, limit: number): Promise<AccidentSummary[]>;
  findByIdForOwner(id: string, ownerId: string): Promise<Accident | null>;
  /** Solo para ChangeAccidentStatus: sin datos personales. */
  findStatusById(id: string): Promise<{ id: string; status: AccidentStatus } | null>;
  /** 0 filas -> ConflictError('CONCURRENT_UPDATE'). */
  updateStatus(input: UpdateStatusInput): Promise<{ id: string; status: AccidentStatus; updatedAt: Date }>;
}
