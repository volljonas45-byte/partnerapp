const fs   = require('fs');
const path = require('path');
const { pool } = require('./pg');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[migrate] Schema applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] Failed to apply schema:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrate };
