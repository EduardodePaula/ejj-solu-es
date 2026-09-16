const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'ejj.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  document TEXT,
  type TEXT NOT NULL DEFAULT 'pessoa_fisica',
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'servico',
  unit_price REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'rascunho',
  discount_pct REAL NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 15,
  notes TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_value REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT
);

CREATE TABLE IF NOT EXISTS budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  catalog_item_id INTEGER REFERENCES catalog_items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  budget_id INTEGER REFERENCES budgets(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'aberta',
  technician TEXT,
  scheduled_date TEXT,
  completed_at TEXT,
  description TEXT,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receivables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  service_order_id INTEGER REFERENCES service_orders(id),
  contract_id INTEGER REFERENCES contracts(id),
  description TEXT,
  amount REAL NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boletos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receivable_id INTEGER NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_status TEXT NOT NULL DEFAULT 'simulado',
  nosso_numero TEXT,
  linha_digitavel TEXT,
  barcode TEXT,
  pdf_url TEXT,
  raw_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'ativo',
  frequency TEXT NOT NULL DEFAULT 'mensal',
  equipment_covered TEXT,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  monthly_value REAL NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 12,
  auto_renew INTEGER NOT NULL DEFAULT 1,
  payment_day INTEGER NOT NULL DEFAULT 10,
  start_date TEXT NOT NULL,
  end_date TEXT,
  generated_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

module.exports = db;
