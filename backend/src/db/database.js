const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'invoices.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CORE SCHEMA ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL UNIQUE,
    company_name        TEXT DEFAULT '',
    address             TEXT DEFAULT '',
    city                TEXT DEFAULT '',
    postal_code         TEXT DEFAULT '',
    country             TEXT DEFAULT 'Deutschland',
    email               TEXT DEFAULT '',
    phone               TEXT DEFAULT '',
    vat_id              TEXT DEFAULT '',
    steuernummer        TEXT DEFAULT '',
    bank_name           TEXT DEFAULT '',
    iban                TEXT DEFAULT '',
    bic                 TEXT DEFAULT '',
    logo_base64         TEXT DEFAULT NULL,
    invoice_prefix      TEXT DEFAULT 'RE',
    quote_prefix        TEXT DEFAULT 'AN',
    legal_form          TEXT DEFAULT 'Einzelunternehmen',
    geschaeftsfuehrer   TEXT DEFAULT '',
    handelsregister     TEXT DEFAULT '',
    registergericht     TEXT DEFAULT '',
    kleinunternehmer    INTEGER DEFAULT 0,
    primary_color       TEXT DEFAULT '#111827',
    footer_text         TEXT DEFAULT 'Vielen Dank für Ihr Vertrauen.',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    company_name    TEXT NOT NULL,
    contact_person  TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    city            TEXT DEFAULT '',
    postal_code     TEXT DEFAULT '',
    country         TEXT DEFAULT '',
    email           TEXT DEFAULT '',
    phone           TEXT DEFAULT '',
    vat_id          TEXT DEFAULT '',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    client_id       INTEGER NOT NULL,
    invoice_number  TEXT NOT NULL,
    status          TEXT DEFAULT 'draft',
    issue_date      TEXT NOT NULL,
    due_date        TEXT NOT NULL,
    leistungsdatum  TEXT DEFAULT NULL,
    payment_date    TEXT DEFAULT NULL,
    notes           TEXT DEFAULT '',
    subtotal        REAL DEFAULT 0,
    tax_total       REAL DEFAULT 0,
    total           REAL DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity    REAL DEFAULT 1,
    unit_price  REAL DEFAULT 0,
    tax_rate    REAL DEFAULT 0,
    amount      REAL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  -- Angebote (Quotes)
  CREATE TABLE IF NOT EXISTS quotes (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL,
    client_id             INTEGER NOT NULL,
    quote_number          TEXT NOT NULL,
    status                TEXT DEFAULT 'draft',
    issue_date            TEXT NOT NULL,
    valid_until           TEXT NOT NULL,
    notes                 TEXT DEFAULT '',
    subtotal              REAL DEFAULT 0,
    tax_total             REAL DEFAULT 0,
    total                 REAL DEFAULT 0,
    converted_invoice_id  INTEGER DEFAULT NULL,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id    INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity    REAL DEFAULT 1,
    unit_price  REAL DEFAULT 0,
    tax_rate    REAL DEFAULT 0,
    amount      REAL DEFAULT 0,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );
`);

// ── SAFE MIGRATIONS (add columns that may not exist on older DBs) ─────────────
function migrate(sql) {
  try { db.prepare(sql).run(); } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
}

migrate("ALTER TABLE settings ADD COLUMN quote_prefix        TEXT DEFAULT 'AN'");
migrate("ALTER TABLE settings ADD COLUMN legal_form          TEXT DEFAULT 'Einzelunternehmen'");
migrate("ALTER TABLE settings ADD COLUMN geschaeftsfuehrer   TEXT DEFAULT ''");
migrate("ALTER TABLE settings ADD COLUMN handelsregister     TEXT DEFAULT ''");
migrate("ALTER TABLE settings ADD COLUMN registergericht     TEXT DEFAULT ''");
migrate("ALTER TABLE settings ADD COLUMN steuernummer        TEXT DEFAULT ''");
migrate("ALTER TABLE settings ADD COLUMN kleinunternehmer    INTEGER DEFAULT 0");
migrate("ALTER TABLE settings ADD COLUMN primary_color       TEXT DEFAULT '#111827'");
migrate("ALTER TABLE settings ADD COLUMN footer_text         TEXT DEFAULT 'Vielen Dank für Ihr Vertrauen.'");
migrate("ALTER TABLE settings ADD COLUMN storno_prefix       TEXT DEFAULT 'ST'");
migrate("ALTER TABLE invoices  ADD COLUMN leistungsdatum     TEXT DEFAULT NULL");
migrate("ALTER TABLE invoices  ADD COLUMN invoice_type       TEXT DEFAULT 'standard'");
migrate("ALTER TABLE invoices  ADD COLUMN reverse_charge     INTEGER DEFAULT 0");
migrate("ALTER TABLE invoices  ADD COLUMN storno_of_id       INTEGER DEFAULT NULL");
migrate("ALTER TABLE invoices  ADD COLUMN leistungszeitraum_von  TEXT DEFAULT NULL");
migrate("ALTER TABLE invoices  ADD COLUMN leistungszeitraum_bis  TEXT DEFAULT NULL");
migrate("ALTER TABLE invoice_items ADD COLUMN title          TEXT DEFAULT ''");
migrate("ALTER TABLE quote_items   ADD COLUMN title          TEXT DEFAULT ''");
migrate("ALTER TABLE settings      ADD COLUMN default_payment_days INTEGER DEFAULT 30");
migrate("ALTER TABLE settings      ADD COLUMN email_alias         TEXT DEFAULT ''");
migrate("ALTER TABLE settings      ADD COLUMN email_signature      TEXT DEFAULT ''");

// ── PROJECT SCHEMA ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    client_id   INTEGER NOT NULL,
    name        TEXT NOT NULL,
    status      TEXT DEFAULT 'planned',
    start_date  TEXT DEFAULT NULL,
    deadline    TEXT DEFAULT NULL,
    budget      REAL DEFAULT NULL,
    description TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    title      TEXT NOT NULL,
    status     TEXT DEFAULT 'todo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)
  );
`);

migrate("ALTER TABLE invoices ADD COLUMN project_id INTEGER DEFAULT NULL");
migrate("ALTER TABLE quotes   ADD COLUMN project_id INTEGER DEFAULT NULL");

// Project extended fields
migrate("ALTER TABLE projects ADD COLUMN type             TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN build_type       TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN frontend         TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN hosting          TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN domain_provider  TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN domain_name      TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN repository_url   TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN dsgvo_type       TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN live_url         TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN admin_access     TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN hosting_access   TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN ftp_access       TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN billing_type       TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN price              REAL DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN payment_status     TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN hosting_provider   TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN hosting_owner      TEXT DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN admin_access_note  TEXT DEFAULT NULL");

// Project checklist
db.exec(`
  CREATE TABLE IF NOT EXISTS project_checklist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    key        TEXT NOT NULL,
    checked    INTEGER DEFAULT 0,
    UNIQUE(project_id, key),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// Project credentials (secure external links only — no passwords stored)
db.exec(`
  CREATE TABLE IF NOT EXISTS project_credentials (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    label      TEXT NOT NULL,
    type       TEXT DEFAULT 'other',
    link       TEXT DEFAULT NULL,
    note       TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)
  );
`);

// ── ONBOARDING SCHEMA ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS onboarding_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    brand_name  TEXT DEFAULT '',
    brand_color TEXT DEFAULT '#111827',
    brand_logo  TEXT DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS onboarding_template_steps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    position    INTEGER DEFAULT 0,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    config      TEXT DEFAULT '{}',
    FOREIGN KEY (template_id) REFERENCES onboarding_templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS onboarding_flows (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    template_id   INTEGER NOT NULL,
    client_id     INTEGER DEFAULT NULL,
    client_name   TEXT DEFAULT '',
    status        TEXT DEFAULT 'pending',
    link_token    TEXT UNIQUE NOT NULL,
    password_hash TEXT DEFAULT NULL,
    responses     TEXT DEFAULT '{}',
    current_step  INTEGER DEFAULT 0,
    completed_at  DATETIME DEFAULT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES onboarding_templates(id)
  );
`);

// ── EXTENDED TABLES ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS invoice_payments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id   INTEGER NOT NULL,
    amount       REAL NOT NULL,
    payment_date TEXT NOT NULL,
    notes        TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoice_reminders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id     INTEGER NOT NULL,
    reminder_level INTEGER NOT NULL,
    sent_at        TEXT NOT NULL,
    notes          TEXT DEFAULT '',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pdf_archive (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    document_type   TEXT NOT NULL,
    document_id     INTEGER NOT NULL,
    document_number TEXT NOT NULL,
    pdf_data        BLOB NOT NULL,
    file_size       INTEGER DEFAULT 0,
    generated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS document_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_id   INTEGER NOT NULL,
    version       INTEGER NOT NULL DEFAULT 1,
    snapshot      TEXT NOT NULL,
    changed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── NEW FEATURE TABLES ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS project_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    content    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    type       TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS service_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    unit        TEXT DEFAULT 'Stunde',
    unit_price  REAL DEFAULT 0,
    tax_rate    REAL DEFAULT 19,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

migrate("ALTER TABLE projects ADD COLUMN assignee TEXT DEFAULT NULL");
migrate("ALTER TABLE project_checklist ADD COLUMN label TEXT DEFAULT NULL");
migrate("ALTER TABLE project_checklist ADD COLUMN custom INTEGER DEFAULT 0");

// ── WORKFLOW SCHEMA ───────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS intake_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    fields      TEXT NOT NULL DEFAULT '[]',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS intake_forms (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    template_id  INTEGER REFERENCES intake_templates(id),
    project_id   INTEGER REFERENCES projects(id),
    client_id    INTEGER REFERENCES clients(id),
    title        TEXT NOT NULL,
    token        TEXT UNIQUE NOT NULL,
    status       TEXT DEFAULT 'pending',
    responses    TEXT DEFAULT '{}',
    submitted_at DATETIME DEFAULT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS client_legal (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id      INTEGER NOT NULL UNIQUE,
    company_name   TEXT DEFAULT '',
    address        TEXT DEFAULT '',
    vat_id         TEXT DEFAULT '',
    dsgvo_provider TEXT DEFAULT '',
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS delivery_documents (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    project_id   INTEGER NOT NULL,
    type         TEXT DEFAULT 'one_time',
    status       TEXT DEFAULT 'draft',
    token        TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    summary      TEXT DEFAULT '',
    links        TEXT DEFAULT '[]',
    credentials  TEXT DEFAULT '[]',
    instructions TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

migrate("ALTER TABLE intake_forms ADD COLUMN seen INTEGER DEFAULT 0");
migrate("ALTER TABLE project_areas ADD COLUMN icon TEXT DEFAULT 'briefcase'");

// ── AREAS / GENERAL PROJECTS SCHEMA ───────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS project_areas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT NOT NULL,
    color      TEXT DEFAULT '#0071E3',
    position   INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

migrate("ALTER TABLE projects ADD COLUMN area_id INTEGER DEFAULT NULL");
migrate("ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'website'");

migrate("ALTER TABLE clients ADD COLUMN industry TEXT DEFAULT ''");
migrate("ALTER TABLE clients ADD COLUMN website  TEXT DEFAULT ''");

migrate("ALTER TABLE invoice_items ADD COLUMN billing_cycle TEXT DEFAULT 'once'");
migrate("ALTER TABLE quote_items   ADD COLUMN billing_cycle TEXT DEFAULT 'once'");

module.exports = db;
