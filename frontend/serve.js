#!/usr/bin/env node
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const BUILD_DIR = path.join(__dirname, 'build');

// Serve static files
app.use(express.static(BUILD_DIR));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${BUILD_DIR}`);
});
