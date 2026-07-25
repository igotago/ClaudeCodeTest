'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { handleApiRequest, NotFoundError } = require('./routes');

const rootDir = path.join(__dirname, '..');

const staticFiles = {
  '/': 'mall-owner.html',
  '/mall-owner.html': 'mall-owner.html',
  '/pos.html': 'pos.html',
  '/vendor.html': 'vendor.html',
  '/data.js': 'data.js',
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function serveStatic(res, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.slice('/api'.length);
    try {
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readJsonBody(req) : undefined;
      const query = Object.fromEntries(url.searchParams);
      const { status, body: responseBody } = handleApiRequest(req.method, apiPath, query, body);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(responseBody === null ? '' : JSON.stringify(responseBody));
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }
      console.error(err);
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'internal_error' }));
    }
    return;
  }

  const staticFile = staticFiles[url.pathname];
  if (staticFile) {
    serveStatic(res, staticFile);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

// iisnode sets process.env.PORT to a named pipe when hosted under IIS.
const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Antique mall server listening on http://localhost:${port}`);
});

module.exports = server;
