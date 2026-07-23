'use strict';
/* exported formatCurrency, getVendors, addVendor, updateVendor, deleteVendor,
   getInventory, getInventoryByVendor, addInventoryItem, updateInventoryItem,
   deleteInventoryItem, checkout, getSettings, saveSettings */

async function apiRequest(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const error = new Error(errorBody.error || `Request failed: ${res.status}`);
    error.status = res.status;
    error.body = errorBody;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

function formatCurrency(n) {
  return `$${n.toFixed(2)}`;
}

// Vendors

async function getVendors() {
  return apiRequest('GET', '/vendors');
}

async function addVendor(vendor) {
  return apiRequest('POST', '/vendors', vendor);
}

async function updateVendor(id, patch) {
  return apiRequest('PATCH', `/vendors/${id}`, patch);
}

async function deleteVendor(id) {
  return apiRequest('DELETE', `/vendors/${id}`);
}

// Inventory

async function getInventory() {
  return apiRequest('GET', '/inventory');
}

async function getInventoryByVendor(vendorId) {
  return apiRequest('GET', `/inventory?vendorId=${encodeURIComponent(vendorId)}`);
}

async function addInventoryItem(item) {
  return apiRequest('POST', '/inventory', item);
}

async function updateInventoryItem(id, patch) {
  return apiRequest('PATCH', `/inventory/${id}`, patch);
}

async function deleteInventoryItem(id) {
  return apiRequest('DELETE', `/inventory/${id}`);
}

// Sales

async function checkout(lines) {
  return apiRequest('POST', '/sales', { lines });
}

// Settings

async function getSettings() {
  return apiRequest('GET', '/settings');
}

async function saveSettings(settings) {
  return apiRequest('PUT', '/settings', settings);
}
