import { ConflictError } from '../../../application/errors.js';
import type {
  AccidentRepository,
  AccidentSummary,
  UpdateStatusInput,
} from '../../../application/ports/AccidentRepository.js';
import { Accident } from '../../../domain/accident/Accident.js';
import type { AccidentStatus } from '../../../domain/accident/AccidentStatus.js';
import type { AccidentType } from '../../../domain/accident/AccidentType.js';
import type { DocumentType } from '../../../domain/accident/DocumentType.js';
import { translatePgError } from './pgErrors.js';
import type { Pool } from './pool.js';

interface AccidentRow {
  id: string;
  owner_id: string;
  affected_name: string;
  document_type: DocumentType;
  document_number: string;
  phone: string;
  contact_email: string;
  accident_type: AccidentType;
  occurred_on: string;
  place: string;
  description: string;
  status: AccidentStatus;
  status_changed_by: string | null;
  status_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = `id, owner_id, affected_name, document_type, document_number, phone, contact_email,
  accident_type, to_char(occurred_on, 'YYYY-MM-DD') AS occurred_on, place, description, status,
  status_changed_by, status_changed_at, created_at, updated_at`;

function toAccident(r: AccidentRow): Accident {
  return Accident.rehydrate({
    id: r.id,
    ownerId: r.owner_id,
    affectedName: r.affected_name,
    documentType: r.document_type,
    documentNumber: r.document_number,
    phone: r.phone,
    contactEmail: r.contact_email,
    accidentType: r.accident_type,
    occurredOn: r.occurred_on,
    place: r.place,
    description: r.description,
    status: r.status,
    statusChangedBy: r.status_changed_by,
    statusChangedAt: r.status_changed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

export class PgAccidentRepository implements AccidentRepository {
  constructor(private readonly pool: Pool) {}

  async create(a: Accident): Promise<Accident> {
    try {
      const r = await this.pool.query<AccidentRow>(
        `INSERT INTO accidents (id, owner_id, affected_name, document_type, document_number, phone, contact_email,
           accident_type, occurred_on, place, description, status, status_changed_by, status_changed_at,
           created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING ${COLUMNS}`,
        [
          a.id, a.ownerId, a.affectedName, a.documentType, a.documentNumber, a.phone, a.contactEmail,
          a.accidentType, a.occurredOn, a.place, a.description, a.status, a.statusChangedBy, a.statusChangedAt,
          a.createdAt, a.updatedAt,
        ],
      );
      return toAccident(r.rows[0] as AccidentRow);
    } catch (err) {
      return translatePgError(err);
    }
  }

  async listByOwner(ownerId: string, limit: number): Promise<AccidentSummary[]> {
    try {
      const r = await this.pool.query<Pick<AccidentRow, 'id' | 'accident_type' | 'occurred_on' | 'status'>>(
        `SELECT id, accident_type, to_char(occurred_on, 'YYYY-MM-DD') AS occurred_on, status
         FROM accidents WHERE owner_id = $1
         ORDER BY accidents.occurred_on DESC, created_at DESC, id
         LIMIT $2`,
        [ownerId, limit],
      );
      return r.rows.map((row) => ({
        id: row.id,
        accidentType: row.accident_type,
        occurredOn: row.occurred_on,
        status: row.status,
      }));
    } catch (err) {
      return translatePgError(err);
    }
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Accident | null> {
    try {
      const r = await this.pool.query<AccidentRow>(
        `SELECT ${COLUMNS} FROM accidents WHERE id = $1 AND owner_id = $2`,
        [id, ownerId],
      );
      return r.rows[0] ? toAccident(r.rows[0]) : null;
    } catch (err) {
      return translatePgError(err);
    }
  }

  async findStatusById(id: string): Promise<{ id: string; status: AccidentStatus } | null> {
    try {
      const r = await this.pool.query<{ id: string; status: AccidentStatus }>(
        'SELECT id, status FROM accidents WHERE id = $1',
        [id],
      );
      return r.rows[0] ? { id: r.rows[0].id, status: r.rows[0].status } : null;
    } catch (err) {
      return translatePgError(err);
    }
  }

  async updateStatus(input: UpdateStatusInput): Promise<{ id: string; status: AccidentStatus; updatedAt: Date }> {
    let rows: { id: string; status: AccidentStatus; updated_at: Date }[];
    try {
      const r = await this.pool.query<{ id: string; status: AccidentStatus; updated_at: Date }>(
        `UPDATE accidents
         SET status = $1, status_changed_by = $2, status_changed_at = $3, updated_at = $3
         WHERE id = $4 AND status = $5
         RETURNING id, status, updated_at`,
        [input.next, input.by, input.at, input.id, input.expected],
      );
      rows = r.rows;
    } catch (err) {
      return translatePgError(err);
    }
    const row = rows[0];
    if (!row) throw new ConflictError('CONCURRENT_UPDATE');
    return { id: row.id, status: row.status, updatedAt: row.updated_at };
  }
}
