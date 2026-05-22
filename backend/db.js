const mysql = require('mysql2/promise');

// ── CREATE CONNECTION POOL ────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root@mysql2026',        // ← PUT YOUR MYSQL ROOT PASSWORD HERE
  database: 'shopwave',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── CREATE TABLES + SEED DATA ─────────────────────────────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
    // USERS table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // PRODUCTS table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image VARCHAR(500),
        description TEXT,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ORDERS table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        shipping_name VARCHAR(100),
        shipping_street VARCHAR(200),
        shipping_city VARCHAR(100),
        shipping_zip VARCHAR(20),
        shipping_country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ORDER ITEMS table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(200),
        product_image VARCHAR(500),
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // SEED products if table is empty
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      await conn.query(`
        INSERT INTO products (name, price, category, image, description, stock) VALUES
        ('Wireless Headphones', 89.99, 'Electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Premium sound quality with noise cancellation and 30hr battery life.', 15),
        ('Leather Wallet', 34.99, 'Accessories', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', 'Slim genuine leather wallet with RFID blocking technology.', 30),
        ('Running Shoes', 119.99, 'Footwear', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'Lightweight and responsive shoes for everyday training.', 20),
        ('Mechanical Keyboard', 149.99, 'Electronics', 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=400', 'Tactile RGB keyboard with hot-swappable switches.', 10),
        ('Sunglasses', 54.99, 'Accessories', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', 'Polarized UV400 protection with titanium frame.', 25),
        ('Smart Watch', 199.99, 'Electronics', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Health tracking, GPS, and 7-day battery in one sleek package.', 8),
        ('Backpack', 79.99, 'Bags', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', '30L waterproof backpack with USB charging port.', 18),
        ('Desk Lamp', 44.99, 'Home', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'LED touch lamp with adjustable brightness and color temperature.', 22)
      `);
      console.log('✅ Products seeded');
    }

    console.log('✅ Database tables ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };