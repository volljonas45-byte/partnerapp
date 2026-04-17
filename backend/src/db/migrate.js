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

  // Incremental migrations — safe to run repeatedly
  const alterations = [
    `ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS next_followup_type TEXT DEFAULT 'anruf'`,
  ];
  const client2 = await pool.connect();
  try {
    for (const alt of alterations) {
      await client2.query(alt);
    }
    console.log('[migrate] Alterations applied');
  } catch (err) {
    console.error('[migrate] Alteration failed:', err.message);
  } finally {
    client2.release();
  }
}

module.exports = { migrate };
