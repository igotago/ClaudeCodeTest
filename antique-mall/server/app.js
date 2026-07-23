'use strict';

const path = require('node:path');
const express = require('express');
const routes = require('./routes');

const app = express();
const rootDir = path.join(__dirname, '..');

app.use(express.json());

app.get('/', (req, res) => res.redirect('/mall-owner.html'));
app.get('/mall-owner.html', (req, res) => res.sendFile(path.join(rootDir, 'mall-owner.html')));
app.get('/pos.html', (req, res) => res.sendFile(path.join(rootDir, 'pos.html')));
app.get('/vendor.html', (req, res) => res.sendFile(path.join(rootDir, 'vendor.html')));
app.get('/data.js', (req, res) => res.sendFile(path.join(rootDir, 'data.js')));

app.use('/api', routes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Antique mall server listening on http://localhost:${port}`);
});
