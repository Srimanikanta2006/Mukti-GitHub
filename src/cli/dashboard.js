#!/usr/bin/env node
/**
 * MUKTI - Live Dashboard Local Server CLI
 * 
 * Serves the modern live contribution visualizer on http://localhost:3000
 * with real-time JSON API endpoints.
 * 
 * Usage:
 *   npm run dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../config/event-config');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DASHBOARD_HTML = path.join(ROOT_DIR, 'dashboard', 'index.html');

const manager = new EventConfigManager(ROOT_DIR);

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/' || req.url === '/index.html') {
    if (fs.existsSync(DASHBOARD_HTML)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(DASHBOARD_HTML, 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Dashboard HTML not found.');
    }
  } else if (req.url === '/api/config') {
    try {
      const config = manager.loadConfig();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (req.url === '/api/state') {
    try {
      const state = manager.loadState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MUKTI LIVE CONTRIBUTION DASHBOARD ACTIVE`);
  console.log(`======================================================`);
  console.log(`\nOpen your browser or projector display at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
