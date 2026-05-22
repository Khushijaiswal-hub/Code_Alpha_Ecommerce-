const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const router = express.Router();

const JWT_SECRET = 'shopwave_secret_2024';

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── PLACE ORDER ───────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!items || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;

    // Validate stock and calculate total
    for (const item of items) {
      const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (rows.length === 0) throw new Error(`Product ${item.productId} not found`);
      const product = rows[0];
      if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
      total += parseFloat(product.price) * item.quantity;
    }

    // Create order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total, status, shipping_name, shipping_street, shipping_city, shipping_zip, shipping_country)
       VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        total.toFixed(2),
        shippingAddress.name,
        shippingAddress.street,
        shippingAddress.city,
        shippingAddress.zip,
        shippingAddress.country
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items + reduce stock
    for (const item of items) {
      const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [item.productId]);
      const product = rows[0];

      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, product.id, product.name, product.image, product.price, item.quantity]
      );

      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, product.id]
      );
    }

    await conn.commit();

    // Return the created order with items
    const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const [itemRows] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    res.status(201).json({ ...orderRows[0], items: itemRows });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Order failed' });
  } finally {
    conn.release();
  }
});

// ── GET USER ORDERS ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Attach items to each order
    for (const order of orders) {
      const [items] = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;