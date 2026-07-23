'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, 'antique-mall.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    boothNumber TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    vendorId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inventory_vendorId ON inventory(vendorId);

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    subtotal REAL NOT NULL,
    taxRate REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sale_line_items (
    id TEXT PRIMARY KEY,
    saleId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    name TEXT NOT NULL,
    unitPrice REAL NOT NULL,
    quantity INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sale_line_items_saleId ON sale_line_items(saleId);

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    taxRate REAL NOT NULL
  );
  INSERT OR IGNORE INTO settings (id, taxRate) VALUES (1, 0.08);
`);

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// node:sqlite's DatabaseSync has no built-in transaction helper (unlike better-sqlite3),
// so this wraps BEGIN/COMMIT/ROLLBACK by hand. `fn` runs synchronously; throwing rolls back.
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, generateId, transaction };
