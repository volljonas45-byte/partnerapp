-- ── CORE SCHEMA ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL UNIQUE,
  company_name         TEXT DEFAULT '',
  address              TEXT DEFAULT '',
  city                 TEXT DEFAULT '',
  postal_code          TEXT DEFAULT '',
  country              TEXT DEFAULT 'Deutschland',
  email                TEXT DEFAULT '',
  phone                TEXT DEFAULT '',
  vat_id               TEXT DEFAULT '',
  steuernummer         TEXT DEFAULT '',
  bank_name            TEXT DEFAULT '',
  iban                 TEXT DEFAULT '',
  bic                  TEXT DEFAULT '',
  logo_base64          TEXT DEFAULT NULL,
  invoice_prefix       TEXT DEFAULT 'RE',
  quote_prefix         TEXT DEFAULT 'AN',
  storno_prefix        TEXT DEFAULT 'ST',
  legal_form           TEXT DEFAULT 'Einzelunternehmen',
  geschaeftsfuehrer    TEXT DEFAULT '',
  handelsregister      TEXT DEFAULT '',
  registergericht      TEXT DEFAULT '',
  kleinunternehmer     INTEGER DEFAULT 0,
  primary_color        TEXT DEFAULT '#111827',
  footer_text          TEXT DEFAULT 'Vielen Dank für Ihr Vertrauen.',
  default_payment_days INTEGER DEFAULT 30,
  email_alias          TEXT DEFAULT '',
  email_signature      TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clients (
  id              SERIAL PRIMARY KEY,
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
  brand_color     TEXT DEFAULT '#111827',
  brand_logo      TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL,
  client_id               INTEGER NOT NULL,
  invoice_number          TEXT NOT NULL,
  status                  TEXT DEFAULT 'draft',
  issue_date              TEXT NOT NULL,
  due_date                TEXT NOT NULL,
  leistungsdatum          TEXT DEFAULT NULL,
  payment_date            TEXT DEFAULT NULL,
  notes                   TEXT DEFAULT '',
  subtotal                REAL DEFAULT 0,
  tax_total               REAL DEFAULT 0,
  total                   REAL DEFAULT 0,
  invoice_type            TEXT DEFAULT 'standard',
  reverse_charge          INTEGER DEFAULT 0,
  storno_of_id            INTEGER DEFAULT NULL,
  leistungszeitraum_von   TEXT DEFAULT NULL,
  leistungszeitraum_bis   TEXT DEFAULT NULL,
  project_id              INTEGER DEFAULT NULL,
  created_at              TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)   REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER NOT NULL,
  title       TEXT DEFAULT '',
  description TEXT NOT NULL,
  quantity    REAL DEFAULT 1,
  unit_price  REAL DEFAULT 0,
  tax_rate    REAL DEFAULT 0,
  amount      REAL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quotes (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL,
  client_id            INTEGER NOT NULL,
  quote_number         TEXT NOT NULL,
  status               TEXT DEFAULT 'draft',
  issue_date           TEXT NOT NULL,
  valid_until          TEXT NOT NULL,
  notes                TEXT DEFAULT '',
  subtotal             REAL DEFAULT 0,
  tax_total            REAL DEFAULT 0,
  total                REAL DEFAULT 0,
  converted_invoice_id INTEGER DEFAULT NULL,
  project_id           INTEGER DEFAULT NULL,
  created_at           TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)   REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id          SERIAL PRIMARY KEY,
  quote_id    INTEGER NOT NULL,
  title       TEXT DEFAULT '',
  description TEXT NOT NULL,
  quantity    REAL DEFAULT 1,
  unit_price  REAL DEFAULT 0,
  tax_rate    REAL DEFAULT 0,
  amount      REAL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- ── PROJECT SCHEMA ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL,
  client_id          INTEGER,
  name               TEXT NOT NULL,
  status             TEXT DEFAULT 'planned',
  start_date         TEXT DEFAULT NULL,
  deadline           TEXT DEFAULT NULL,
  budget             REAL DEFAULT NULL,
  description        TEXT DEFAULT '',
  type               TEXT DEFAULT NULL,
  build_type         TEXT DEFAULT NULL,
  frontend           TEXT DEFAULT NULL,
  hosting            TEXT DEFAULT NULL,
  hosting_provider   TEXT DEFAULT NULL,
  hosting_owner      TEXT DEFAULT NULL,
  domain_provider    TEXT DEFAULT NULL,
  domain_name        TEXT DEFAULT NULL,
  repository_url     TEXT DEFAULT NULL,
  dsgvo_type         TEXT DEFAULT NULL,
  live_url           TEXT DEFAULT NULL,
  admin_access       TEXT DEFAULT NULL,
  hosting_access     TEXT DEFAULT NULL,
  ftp_access         TEXT DEFAULT NULL,
  admin_access_note  TEXT DEFAULT NULL,
  billing_type       TEXT DEFAULT NULL,
  price              REAL DEFAULT NULL,
  payment_status     TEXT DEFAULT NULL,
  assignee           TEXT DEFAULT NULL,
  area_id            INTEGER DEFAULT NULL,
  project_type       TEXT DEFAULT 'website',
  created_at         TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  status     TEXT DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_checklist (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  key        TEXT NOT NULL,
  checked    INTEGER DEFAULT 0,
  label      TEXT DEFAULT NULL,
  custom     INTEGER DEFAULT 0,
  UNIQUE(project_id, key),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_credentials (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  label      TEXT NOT NULL,
  type       TEXT DEFAULT 'other',
  link       TEXT DEFAULT NULL,
  note       TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

-- ── ONBOARDING SCHEMA ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  brand_name  TEXT DEFAULT '',
  brand_color TEXT DEFAULT '#111827',
  brand_logo  TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS onboarding_template_steps (
  id          SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL,
  position    INTEGER DEFAULT 0,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  config      TEXT DEFAULT '{}',
  FOREIGN KEY (template_id) REFERENCES onboarding_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS onboarding_flows (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  template_id   INTEGER NOT NULL,
  client_id     INTEGER DEFAULT NULL,
  client_name   TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending',
  link_token    TEXT UNIQUE NOT NULL,
  password_hash TEXT DEFAULT NULL,
  responses     TEXT DEFAULT '{}',
  current_step  INTEGER DEFAULT 0,
  completed_at  TIMESTAMP DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES onboarding_templates(id)
);

-- ── EXTENDED TABLES ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_payments (
  id           SERIAL PRIMARY KEY,
  invoice_id   INTEGER NOT NULL,
  amount       REAL NOT NULL,
  payment_date TEXT NOT NULL,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoice_reminders (
  id             SERIAL PRIMARY KEY,
  invoice_id     INTEGER NOT NULL,
  reminder_level INTEGER NOT NULL,
  sent_at        TEXT NOT NULL,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdf_archive (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  document_type   TEXT NOT NULL,
  document_id     INTEGER NOT NULL,
  document_number TEXT NOT NULL,
  pdf_data        BYTEA NOT NULL,
  file_size       INTEGER DEFAULT 0,
  generated_at    TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_history (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  document_id   INTEGER NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  snapshot      TEXT NOT NULL,
  changed_at    TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── NEW FEATURE TABLES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_notes (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_activity (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_templates (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  unit        TEXT DEFAULT 'Stunde',
  unit_price  REAL DEFAULT 0,
  tax_rate    REAL DEFAULT 19,
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── WORKFLOW SCHEMA ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intake_templates (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  fields      TEXT NOT NULL DEFAULT '[]',
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS intake_forms (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  template_id  INTEGER REFERENCES intake_templates(id),
  project_id   INTEGER REFERENCES projects(id),
  client_id    INTEGER REFERENCES clients(id),
  title        TEXT NOT NULL,
  token        TEXT UNIQUE NOT NULL,
  status       TEXT DEFAULT 'pending',
  responses    TEXT DEFAULT '{}',
  seen         INTEGER DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS client_legal (
  id             SERIAL PRIMARY KEY,
  client_id      INTEGER NOT NULL UNIQUE,
  company_name   TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  vat_id         TEXT DEFAULT '',
  dsgvo_provider TEXT DEFAULT '',
  updated_at     TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS delivery_documents (
  id           SERIAL PRIMARY KEY,
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
  created_at   TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── AREAS / GENERAL PROJECTS SCHEMA ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_areas (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#0071E3',
  icon       TEXT DEFAULT 'briefcase',
  position   INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── WORKFLOW SYSTEM ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_workflow (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL UNIQUE,
  user_id       INTEGER NOT NULL,
  current_phase TEXT    NOT NULL DEFAULT 'demo',
  phase_data    TEXT    NOT NULL DEFAULT '{}',
  decisions     TEXT    NOT NULL DEFAULT '{}',
  completed_at  TIMESTAMP DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workflow_reminders (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'followup',
  title       TEXT    NOT NULL,
  due_date    TEXT    NOT NULL,
  note        TEXT    DEFAULT '',
  done        INTEGER NOT NULL DEFAULT 0,
  done_at     TIMESTAMP DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_tools (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  url        TEXT    DEFAULT '',
  category   TEXT    NOT NULL DEFAULT 'other',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── SAFE COLUMN MIGRATIONS ─────────────────────────────────────────────────────
-- Adds new columns to existing tables without errors if they already exist

DO $$ BEGIN ALTER TABLE settings          ADD COLUMN email_alias    TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE settings          ADD COLUMN email_signature TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE invoice_items     ADD COLUMN billing_cycle   TEXT DEFAULT 'once'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quote_items       ADD COLUMN billing_cycle   TEXT DEFAULT 'once'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE service_templates ADD COLUMN billing_cycle   TEXT DEFAULT 'once'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects          ADD COLUMN assignee_id     INTEGER DEFAULT NULL REFERENCES users(id); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── TEAM MANAGEMENT MIGRATIONS ─────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE users ADD COLUMN role               TEXT    DEFAULT 'admin'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN workspace_owner_id INTEGER DEFAULT NULL;    EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN name               TEXT    DEFAULT '';      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN color              TEXT    DEFAULT '#6366f1'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN assignee_id        INTEGER DEFAULT NULL;    EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clients ADD COLUMN industry TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clients ADD COLUMN website  TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN show_in_dashboard BOOLEAN DEFAULT TRUE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN avatar_base64 TEXT DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── CHANGE REQUESTS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS change_requests (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  type        TEXT DEFAULT 'intern',
  priority    TEXT DEFAULT 'mittel',
  status      TEXT DEFAULT 'offen',
  assignee_id INTEGER DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── TIME TRACKING SCHEMA ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_entries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  project_id  INTEGER DEFAULT NULL,
  description TEXT DEFAULT '',
  start_time  TIMESTAMP NOT NULL,
  end_time    TIMESTAMP DEFAULT NULL,
  duration    INTEGER DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fahrtenbuch_entries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  project_id  INTEGER DEFAULT NULL,
  date        TEXT NOT NULL,
  from_loc    TEXT DEFAULT '',
  to_loc      TEXT DEFAULT '',
  distance_km REAL DEFAULT 0,
  purpose     TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ── CALENDAR ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time  TIMESTAMP NOT NULL,
  end_time    TIMESTAMP DEFAULT NULL,
  all_day     BOOLEAN DEFAULT FALSE,
  color       TEXT DEFAULT '#0071E3',
  type        TEXT DEFAULT 'event',
  project_id  INTEGER DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
