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
    `CREATE TABLE IF NOT EXISTS planning_kpis (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, area TEXT NOT NULL DEFAULT 'Allgemein', owner_id INTEGER REFERENCES users(id), target_value NUMERIC DEFAULT 100, current_value NUMERIC DEFAULT 0, unit TEXT DEFAULT '%', frequency TEXT DEFAULT 'monthly', description TEXT DEFAULT '', color TEXT DEFAULT 'blue', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS planning_decisions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT DEFAULT '', impact TEXT DEFAULT '', area TEXT DEFAULT 'Allgemein', owner_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'active', decided_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS planning_tasks (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT DEFAULT '', type TEXT DEFAULT 'task', area TEXT DEFAULT 'Allgemein', owner_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'open', priority TEXT DEFAULT 'medium', due_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS planning_feedback (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, author_id INTEGER NOT NULL REFERENCES users(id), week_start DATE NOT NULL, area TEXT NOT NULL DEFAULT 'Allgemein', rating INTEGER CHECK (rating >= 1 AND rating <= 5), wins TEXT DEFAULT '', blockers TEXT DEFAULT '', next_steps TEXT DEFAULT '', improvement_goal TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, author_id, week_start))`,
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
