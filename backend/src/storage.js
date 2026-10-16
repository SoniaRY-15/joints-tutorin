const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function openPostgresStorage(connectionString) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3 });
  await pool.query(`CREATE TABLE IF NOT EXISTS tutorin_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    state JSONB NOT NULL
  )`);
  await pool.query(`INSERT INTO tutorin_state (id, state)
    VALUES (1, '{"version":1,"users":{}}'::jsonb) ON CONFLICT (id) DO NOTHING`);

  let state = (await pool.query('SELECT state FROM tutorin_state WHERE id = 1')).rows[0].state;
  if (state.version !== 1 || !state.users || typeof state.users !== 'object') {
    await pool.end();
    throw new Error('Format database tidak valid.');
  }

  let queue = Promise.resolve();
  return {
    read: () => structuredClone(state),
    async refresh() {
      const result = await pool.query('SELECT state FROM tutorin_state WHERE id = 1');
      state = result.rows[0].state;
      return state;
    },
    transaction(operation) {
      const task = queue.then(async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await client.query('SELECT state FROM tutorin_state WHERE id = 1 FOR UPDATE');
          const next = result.rows[0].state;
          const value = await operation(next);
          await client.query('UPDATE tutorin_state SET state = $1::jsonb WHERE id = 1', [JSON.stringify(next)]);
          await client.query('COMMIT');
          state = next;
          return value;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}

// One process owns this file. Each transaction is serialized and atomically renamed.
async function openStorage(filename) {
  if (process.env.DATABASE_URL) return openPostgresStorage(process.env.DATABASE_URL);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  let state;
  try { state = JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Database tidak dapat dibaca: ${error.message}`, { cause: error });
    state = { version: 1, users: {} };
  }
  if (state.version !== 1 || !state.users || typeof state.users !== 'object') throw new Error('Format database tidak valid.');
  let queue = Promise.resolve();
  return {
    read: () => structuredClone(state),
    transaction(operation) {
      const task = queue.then(async () => {
        const next = structuredClone(state);
        const result = await operation(next);
        const temporary = `${filename}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
          await fs.rename(temporary, filename);
        } catch (error) { await fs.rm(temporary, { force: true }); throw error; }
        state = next;
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
module.exports = { openStorage };
