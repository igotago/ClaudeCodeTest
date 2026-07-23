'use strict';

const express = require('express');
const { db, generateId, transaction } = require('./db');

const router = express.Router();

class InsufficientStockError extends Error {
  constructor(failures) {
    super('insufficient_stock');
    this.failures = failures;
  }
}

function nowIso() {
  return new Date().toISOString();
}

// Vendors

router.get('/vendors', (req, res) => {
  res.json(db.prepare('SELECT * FROM vendors ORDER BY createdAt').all());
});

router.post('/vendors', (req, res) => {
  const { name, phone, email, boothNumber } = req.body;
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
  res.status(201).json(vendor);
});

router.patch('/vendors/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const updated = { ...existing, ...req.body, id: existing.id };
  db.prepare(
    'UPDATE vendors SET name = @name, phone = @phone, email = @email, boothNumber = @boothNumber WHERE id = @id'
  ).run({ name: updated.name, phone: updated.phone, email: updated.email, boothNumber: updated.boothNumber, id: updated.id });
  res.json(updated);
});

router.delete('/vendors/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const removedItemCount = transaction(() => {
    const count = db.prepare('SELECT COUNT(*) AS count FROM inventory WHERE vendorId = ?').get(req.params.id).count;
    db.prepare('DELETE FROM inventory WHERE vendorId = ?').run(req.params.id);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
    return count;
  });
  res.json({ removedItemCount });
});

// Inventory

router.get('/inventory', (req, res) => {
  const { vendorId } = req.query;
  const items = vendorId
    ? db.prepare('SELECT * FROM inventory WHERE vendorId = ? ORDER BY createdAt').all(vendorId)
    : db.prepare('SELECT * FROM inventory ORDER BY createdAt').all();
  res.json(items);
});

router.post('/inventory', (req, res) => {
  const { vendorId, name, description, price, quantity } = req.body;
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
  res.status(201).json(item);
});

router.patch('/inventory/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const updated = { ...existing, ...req.body, id: existing.id };
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
  res.json(updated);
});

router.delete('/inventory/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Settings

router.get('/settings', (req, res) => {
  res.json(db.prepare('SELECT taxRate FROM settings WHERE id = 1').get());
});

router.put('/settings', (req, res) => {
  const { taxRate } = req.body;
  db.prepare('UPDATE settings SET taxRate = ? WHERE id = 1').run(taxRate);
  res.json({ taxRate });
});

// Sales — atomic checkout: validate every line has stock, decrement all of them,
// and record the sale in a single transaction. Either everything commits or nothing does.

router.post('/sales', (req, res) => {
  const { lines } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'empty_cart' });
  }

  const selectItem = db.prepare('SELECT * FROM inventory WHERE id = ?');
  const decrementStmt = db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ?');
  const insertSale = db.prepare(
    'INSERT INTO sales (id, subtotal, taxRate, tax, total, createdAt) VALUES (@id, @subtotal, @taxRate, @tax, @total, @createdAt)'
  );
  const insertSaleLine = db.prepare(
    'INSERT INTO sale_line_items (id, saleId, itemId, vendorId, name, unitPrice, quantity) VALUES (@id, @saleId, @itemId, @vendorId, @name, @unitPrice, @quantity)'
  );

  function checkout(cartLines) {
    const failures = [];
    const resolvedLines = [];

    for (const line of cartLines) {
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
  }

  try {
    res.status(201).json(transaction(() => checkout(lines)));
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return res.status(409).json({ error: 'insufficient_stock', failures: err.failures });
    }
    throw err;
  }
});

module.exports = router;
