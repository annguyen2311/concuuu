const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

const migrationsDir = path.join(__dirname, '..', 'migrations');

const pool = new Pool(
  config.databaseUrl
    ? {
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE || 'studentnet',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
      }
);

pool.on('error', (err) => {
  console.error('❌ Unexpected PG pool error:', err.message);
});

async function runMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: appliedRows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name');
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = { pool, runMigrations };
