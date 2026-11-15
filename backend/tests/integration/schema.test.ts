import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPool, truncate } from '../support/db.js';

const pool = createTestPool();
beforeEach(() => truncate(pool));
afterAll(() => pool.end());

async function names(sql: string): Promise<string[]> {
  const r = await pool.query<{ n: string }>(sql);
  return r.rows.map((x) => x.n);
}

async function insertUser(email = 'a@example.test', role = 'USER'): Promise<string> {
  const id = randomUUID();
  await pool.query('INSERT INTO users (id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5)', [
    id, email, 'h', 'Nombre Valido', role,
  ]);
  return id;
}

const validAccident = (owner: string) => ({
  id: randomUUID(), owner_id: owner, affected_name: 'Juan Perez', document_type: 'CC', document_number: '12345678',
  phone: '+573001234567', contact_email: 'j@example.test', accident_type: 'TRANSITO', occurred_on: '2026-01-01',
  place: 'Bogota', description: 'Descripcion con mas de veinte caracteres.', status: 'REGISTRADO',
});

async function insertAccident(row: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(row);
  await pool.query(
    `INSERT INTO accidents (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    keys.map((k) => row[k]),
  );
}

describe('esquema migrado', () => {
  it('existen tablas e indices', async () => {
    const tables = await names("SELECT tablename AS n FROM pg_tables WHERE schemaname='public'");
    expect(tables).toEqual(expect.arrayContaining(['users', 'accidents', 'revoked_tokens', 'pgmigrations']));
    const idx = await names("SELECT indexname AS n FROM pg_indexes WHERE schemaname='public'");
    expect(idx).toEqual(
      expect.arrayContaining(['users_email_lower_uq', 'accidents_owner_occurred_idx', 'revoked_tokens_expires_idx']),
    );
  });

  it('PK uuid y FKs presentes', async () => {
    const pk = await names(
      `SELECT c.table_name || '.' || c.data_type AS n FROM information_schema.columns c
       WHERE c.table_schema='public' AND c.column_name IN ('id','jti') AND c.table_name IN ('users','accidents','revoked_tokens')`,
    );
    expect(pk.sort()).toEqual(['accidents.uuid', 'revoked_tokens.uuid', 'users.uuid']);
    const fks = await names("SELECT conname AS n FROM pg_constraint WHERE contype='f'");
    expect(fks).toHaveLength(3);
    expect(await names("SELECT conname AS n FROM pg_constraint WHERE conname='accidents_status_check'")).toHaveLength(1);
  });

  it('rechaza filas invalidas', async () => {
    await expect(insertUser('Mayus@example.test')).rejects.toMatchObject({ code: '23514' });
    await expect(insertUser('b@example.test', 'ADMIN')).rejects.toMatchObject({ code: '23514' });
    await insertUser('dup@example.test');
    await expect(insertUser('dup@example.test')).rejects.toMatchObject({ code: '23505' });
    const owner = await insertUser('o@example.test');
    await insertAccident(validAccident(owner));
    const bad: Record<string, unknown>[] = [
      { status: 'OTRO' },
      { document_type: 'XX' },
      { document_number: 'ab' },
      { phone: '123' },
      { accident_type: 'X' },
      { occurred_on: '1899-12-31' },
      { affected_name: 'ab' },
      { description: 'corta' },
      { status_changed_by: owner },
      { owner_id: randomUUID() },
    ];
    for (const over of bad) {
      await expect(insertAccident({ ...validAccident(owner), ...over })).rejects.toMatchObject({
        code: expect.stringMatching(/^23(514|503)$/),
      });
    }
  });
});
