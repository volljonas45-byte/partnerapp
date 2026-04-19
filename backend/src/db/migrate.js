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
    `CREATE TABLE IF NOT EXISTS finance_setup (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE, legal_form VARCHAR(20) DEFAULT 'gbr', partners JSONB DEFAULT '[]', founded_date DATE, tax_mode VARCHAR(20) DEFAULT 'regular', vat_rate NUMERIC(5,2) DEFAULT 19, tax_number VARCHAR(50) DEFAULT '', finanzamt VARCHAR(100) DEFAULT '', fiscal_year_start INTEGER DEFAULT 1, opening_balance NUMERIC(12,2) DEFAULT 0, open_receivables NUMERIC(12,2) DEFAULT 0, monthly_fixed_costs NUMERIC(12,2) DEFAULT 0, industry TEXT DEFAULT '', revenue_goal NUMERIC(12,2) DEFAULT 0, profit_goal NUMERIC(12,2) DEFAULT 0, tax_reserve_pct NUMERIC(5,2) DEFAULT 30, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(workspace_owner_id))`,
    `CREATE TABLE IF NOT EXISTS finance_categories (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, type VARCHAR(10) NOT NULL, color VARCHAR(20) DEFAULT '#9090B8', is_default BOOLEAN DEFAULT FALSE)`,
    `CREATE TABLE IF NOT EXISTS finance_transactions (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(10) NOT NULL, date DATE NOT NULL, description TEXT NOT NULL, amount_net NUMERIC(12,2) NOT NULL, vat_amount NUMERIC(12,2) DEFAULT 0, amount_gross NUMERIC(12,2) NOT NULL, category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL, notes TEXT DEFAULT '', receipt_data TEXT DEFAULT '', receipt_filename TEXT DEFAULT '', receipt_mime VARCHAR(50) DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS partners (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, workspace_owner_id INTEGER NOT NULL REFERENCES users(id), status TEXT DEFAULT 'pending', phone TEXT DEFAULT '', commission_rate_pool NUMERIC DEFAULT 20, commission_rate_own NUMERIC DEFAULT 25, application_message TEXT DEFAULT '', approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS partner_leads (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER NOT NULL REFERENCES users(id), partner_id INTEGER REFERENCES partners(id), company TEXT NOT NULL, contact_person TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', website TEXT DEFAULT '', address TEXT DEFAULT '', city TEXT DEFAULT '', industry TEXT DEFAULT '', source TEXT DEFAULT 'pool', source_proof TEXT DEFAULT '', status TEXT DEFAULT 'anrufen', priority TEXT DEFAULT 'medium', deal_value NUMERIC, notes TEXT DEFAULT '', follow_up_date DATE, commission_rate NUMERIC, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS partner_call_log (id SERIAL PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES partner_leads(id) ON DELETE CASCADE, partner_id INTEGER NOT NULL REFERENCES partners(id), called_at TIMESTAMPTZ DEFAULT NOW(), outcome TEXT DEFAULT '', notes TEXT DEFAULT '')`,
    `CREATE TABLE IF NOT EXISTS partner_appointments (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER NOT NULL REFERENCES users(id), partner_id INTEGER NOT NULL REFERENCES partners(id), lead_id INTEGER REFERENCES partner_leads(id), scheduled_at TIMESTAMPTZ NOT NULL, industry TEXT DEFAULT '', demo_goal TEXT DEFAULT '', google_meet_link TEXT DEFAULT '', status TEXT DEFAULT 'scheduled', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS partner_commissions (id SERIAL PRIMARY KEY, workspace_owner_id INTEGER NOT NULL REFERENCES users(id), partner_id INTEGER NOT NULL REFERENCES partners(id), lead_id INTEGER REFERENCES partner_leads(id), appointment_id INTEGER REFERENCES partner_appointments(id), amount NUMERIC NOT NULL, rate NUMERIC NOT NULL, deal_value NUMERIC, type TEXT DEFAULT 'appointment', status TEXT DEFAULT 'open', paid_at TIMESTAMPTZ, notes TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`,
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
