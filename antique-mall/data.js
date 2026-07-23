'use strict';
/* exported formatCurrency, getVendors, addVendor, updateVendor, deleteVendor,
   getInventory, getInventoryByVendor, addInventoryItem, updateInventoryItem,
   deleteInventoryItem, decrementStock, getSettings, saveSettings */

const STORAGE_KEYS = {
  vendors: 'antiqueMall.vendors',
  inventory: 'antiqueMall.inventory',
  settings: 'antiqueMall.settings',
};

function generateId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(n) {
  return `$${n.toFixed(2)}`;
}

// Vendors

function getVendors() {
  return readJSON(STORAGE_KEYS.vendors, []);
}

function saveVendors(vendors) {
  writeJSON(STORAGE_KEYS.vendors, vendors);
}

function addVendor({ name, phone, email, boothNumber }) {
  const vendors = getVendors();
  const vendor = {
    id: generateId('v'),
    name,
    phone,
    email,
    boothNumber: boothNumber || '',
    createdAt: new Date().toISOString(),
  };
  vendors.push(vendor);
  saveVendors(vendors);
  return vendor;
}

function updateVendor(id, patch) {
  const vendors = getVendors();
  const index = vendors.findIndex((v) => v.id === id);
  if (index === -1) return null;
  vendors[index] = { ...vendors[index], ...patch };
  saveVendors(vendors);
  return vendors[index];
}

function deleteVendor(id) {
  const vendors = getVendors().filter((v) => v.id !== id);
  saveVendors(vendors);
  const inventory = getInventory();
  const remaining = inventory.filter((item) => item.vendorId !== id);
  const removedItemCount = inventory.length - remaining.length;
  saveInventory(remaining);
  return { removedItemCount };
}

// Inventory

function getInventory() {
  return readJSON(STORAGE_KEYS.inventory, []);
}

function saveInventory(items) {
  writeJSON(STORAGE_KEYS.inventory, items);
}

function getInventoryByVendor(vendorId) {
  return getInventory().filter((item) => item.vendorId === vendorId);
}

function addInventoryItem({ vendorId, name, description, price, quantity }) {
  const items = getInventory();
  const item = {
    id: generateId('i'),
    vendorId,
    name,
    description: description || '',
    price,
    quantity,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  saveInventory(items);
  return item;
}

function updateInventoryItem(id, patch) {
  const items = getInventory();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...patch };
  saveInventory(items);
  return items[index];
}

function deleteInventoryItem(id) {
  const items = getInventory().filter((item) => item.id !== id);
  saveInventory(items);
}

function decrementStock(itemId, qty) {
  const items = getInventory();
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return null;
  if (qty > items[index].quantity) return null;
  items[index] = { ...items[index], quantity: items[index].quantity - qty };
  saveInventory(items);
  return items[index];
}

// Settings

function getSettings() {
  const settings = readJSON(STORAGE_KEYS.settings, null);
  if (settings === null) {
    const defaults = { taxRate: 0.08 };
    saveSettings(defaults);
    return defaults;
  }
  return settings;
}

function saveSettings(settings) {
  writeJSON(STORAGE_KEYS.settings, settings);
}
