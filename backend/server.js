const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = 3000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));

// ── SERVE FRONTEND ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── START SERVER ──────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('🛍️  ShopWave E-Commerce');
    console.log(`✅  Server running → http://localhost:${PORT}`);
    console.log('');
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  console.error('👉 Check your MySQL password in backend/db.js');
  process.exit(1);
});