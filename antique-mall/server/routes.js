'use strict';

const { db, generateId, transaction } = require('./db');

class InsufficientStockError extends Error {
  constructor(failures) {
    super('insufficient_stock');
    this.failures = failures;
  }
}

class NotFoundError extends Error {}

function nowIso() {
  return new Date().toISOString();
}

// Vendors

function listVendors() {
  return db.prepare('SELECT * FROM vendors ORDER BY createdAt').all();
}

function createVendor(body) {
  const { name, phone, email, boothNumber } = body;
  const vendor = {
    id: generateId('v'),
    name,
    phone,
    email,
    boothNumber: boothNumber || '',
    createdAt: nowIso(),
  };
  db.prepare(
    'INSERT INTO vendors (id, name, phone, email, boothNumber, createdAt) VALUES (@id, @name, @phone, @email, @boothNumber, @createdAt)'
  ).run(vendor);
  return vendor;
}

function updateVendor(id, body) {
  const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError();
  const updated = { ...existing, ...body, id: existing.id };
  db.prepare(
    'UPDATE vendors SET name = @name, phone = @phone, email = @email, boothNumber = @boothNumber WHERE id = @id'
  ).run({ name: updated.name, phone: updated.phone, email: updated.email, boothNumber: updated.boothNumber, id: updated.id });
  return updated;
}

function deleteVendor(id) {
  const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError();
  return transaction(() => {
    const count = db.prepare('SELECT COUNT(*) AS count FROM inventory WHERE vendorId = ?').get(id).count;
    db.prepare('DELETE FROM inventory WHERE vendorId = ?').run(id);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(id);
    return { removedItemCount: count };
  });
}

// Inventory

function listInventory(vendorId) {
  return vendorId
    ? db.prepare('SELECT * FROM inventory WHERE vendorId = ? ORDER BY createdAt').all(vendorId)
    : db.prepare('SELECT * FROM inventory ORDER BY createdAt').all();
}

function createInventoryItem(body) {
  const { vendorId, name, description, price, quantity } = body;
  const item = {
    id: generateId('i'),
    vendorId,
    name,
    description: description || '',
    price,
    quantity,
    createdAt: nowIso(),
  };
  db.prepare(
    'INSERT INTO inventory (id, vendorId, name, description, price, quantity, createdAt) VALUES (@id, @vendorId, @name, @description, @price, @quantity, @createdAt)'
  ).run(item);
  return item;
}

function updateInventoryItem(id, body) {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError();
  const updated = { ...existing, ...body, id: existing.id };
  db.prepare(
    'UPDATE inventory SET vendorId = @vendorId, name = @name, description = @description, price = @price, quantity = @quantity WHERE id = @id'
  ).run({
    vendorId: updated.vendorId,
    name: updated.name,
    description: updated.description,
    price: updated.price,
    quantity: updated.quantity,
    id: updated.id,
  });
  return updated;
}

function deleteInventoryItem(id) {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError();
  db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
}

// Settings

function getSettings() {
  return db.prepare('SELECT taxRate FROM settings WHERE id = 1').get();
}

function updateSettings(body) {
  const { taxRate } = body;
  db.prepare('UPDATE settings SET taxRate = ? WHERE id = 1').run(taxRate);
  return { taxRate };
}

// Sales — atomic checkout: validate every line has stock, decrement all of them,
// and record the sale in a single transaction. Either everything commits or nothing does.

function checkout(body) {
  const { lines } = body;
  if (!Array.isArray(lines) || lines.length === 0) {
    const err = new Error('empty_cart');
    err.status = 400;
    throw err;
  }

  const selectItem = db.prepare('SELECT * FROM inventory WHERE id = ?');
  const decrementStmt = db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ?');
  const insertSale = db.prepare(
    'INSERT INTO sales (id, subtotal, taxRate, tax, total, createdAt) VALUES (@id, @subtotal, @taxRate, @tax, @total, @createdAt)'
  );
  const insertSaleLine = db.prepare(
    'INSERT INTO sale_line_items (id, saleId, itemId, vendorId, name, unitPrice, quantity) VALUES (@id, @saleId, @itemId, @vendorId, @name, @unitPrice, @quantity)'
  );

  return transaction(() => {
    const failures = [];
    const resolvedLines = [];

    for (const line of lines) {
      const item = selectItem.get(line.itemId);
      if (!item || item.quantity < line.qty) {
        failures.push({
          itemId: line.itemId,
          name: item ? item.name : line.name || 'Unknown item',
          available: item ? item.quantity : 0,
        });
      } else {
        resolvedLines.push({ line, item });
      }
    }

    if (failures.length > 0) {
      throw new InsufficientStockError(failures);
    }

    const subtotal = resolvedLines.reduce((sum, { line, item }) => sum + item.price * line.qty, 0);
    const settings = db.prepare('SELECT taxRate FROM settings WHERE id = 1').get();
    const tax = subtotal * settings.taxRate;
    const total = subtotal + tax;

    const sale = { id: generateId('s'), subtotal, taxRate: settings.taxRate, tax, total, createdAt: nowIso() };
    insertSale.run(sale);

    const saleLines = resolvedLines.map(({ line, item }) => {
      decrementStmt.run(line.qty, item.id);
      const saleLine = {
        id: generateId('sli'),
        saleId: sale.id,
        itemId: item.id,
        vendorId: item.vendorId,
        name: item.name,
        unitPrice: item.price,
        quantity: line.qty,
      };
      insertSaleLine.run(saleLine);
      return saleLine;
    });

    return { sale, lines: saleLines };
  });
}

// Router: matches (method, path) against the API surface and dispatches to a handler.
// Returns { status, body } or throws NotFoundError / InsufficientStockError / a plain Error with .status.
function handleApiRequest(method, pathname, query, body) {
  const vendorMatch = pathname.match(/^\/vendors\/([^/]+)$/);
  const inventoryMatch = pathname.match(/^\/inventory\/([^/]+)$/);

  if (pathname === '/vendors' && method === 'GET') return { status: 200, body: listVendors() };
  if (pathname === '/vendors' && method === 'POST') return { status: 201, body: createVendor(body) };
  if (vendorMatch && method === 'PATCH') return { status: 200, body: updateVendor(vendorMatch[1], body) };
  if (vendorMatch && method === 'DELETE') return { status: 200, body: deleteVendor(vendorMatch[1]) };

  if (pathname === '/inventory' && method === 'GET') return { status: 200, body: listInventory(query.vendorId) };
  if (pathname === '/inventory' && method === 'POST') return { status: 201, body: createInventoryItem(body) };
  if (inventoryMatch && method === 'PATCH') return { status: 200, body: updateInventoryItem(inventoryMatch[1], body) };
  if (inventoryMatch && method === 'DELETE') {
    deleteInventoryItem(inventoryMatch[1]);
    return { status: 204, body: null };
  }

  if (pathname === '/settings' && method === 'GET') return { status: 200, body: getSettings() };
  if (pathname === '/settings' && method === 'PUT') return { status: 200, body: updateSettings(body) };

  if (pathname === '/sales' && method === 'POST') {
    try {
      return { status: 201, body: checkout(body) };
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return { status: 409, body: { error: 'insufficient_stock', failures: err.failures } };
      }
      throw err;
    }
  }

  throw new NotFoundError();
}

module.exports = { handleApiRequest, NotFoundError, InsufficientStockError };
