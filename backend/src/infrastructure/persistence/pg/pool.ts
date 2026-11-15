import pg from 'pg';

export type Pool = pg.Pool;

export function createPool(connectionString: string): Pool {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000 });
  // Un cliente ocioso que se cae (p. ej. reinicio de la BD) no debe tumbar el proceso; la siguiente consulta reconecta.
  pool.on('error', () => {});
  return pool;
}
