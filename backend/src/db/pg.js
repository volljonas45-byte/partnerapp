const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... style.
 */
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Run a query and return all rows.
 */
async function query(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return result;
}

/**
 * Return the first row or null.
 */
async function getOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Return all rows as an array.
 */
async function getAll(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE).
 * For INSERT ... RETURNING id, returns { lastInsertRowid, changes }.
 * For UPDATE/DELETE, returns { lastInsertRowid: null, changes }.
 */
async function run(sql, params = []) {
  const result = await query(sql, params);
  const lastInsertRowid = result.rows[0]?.id ?? null;
  const changes = result.rowCount;
  return { lastInsertRowid, changes };
}

module.exports = { pool, query, getOne, getAll, run };
