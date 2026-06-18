require('dotenv').config();

const express = require('express');
const path = require('path');
const { pool, initDB } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/products', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/products/category/:cat', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 ORDER BY id',
      [req.params.cat]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', async (req, res, next) => {
  const { customer_name, customer_email, product_id, quantity } = req.body;

  if (!customer_name?.trim() || !customer_email?.trim() || !product_id || !quantity) {
    return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
  }

  if (!isValidEmail(customer_email)) {
    return res.status(400).json({ error: 'Email manzil noto\'g\'ri' });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Miqdor kamida 1 bo\'lishi kerak' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );

    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    const item = product.rows[0];
    if (item.stock < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Faqat ${item.stock} dona mavjud` });
    }

    const total_price = Number(item.price) * qty;

    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, product_id, quantity, total_price)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customer_name.trim(), customer_email.trim().toLowerCase(), product_id, qty, total_price]
    );

    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [qty, product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.get('/api/orders', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT o.*, p.name AS product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Sahifa topilmadi' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatoligi' });
});

async function start() {
  try {
    await initDB();
    const server = app.listen(PORT, () => {
      console.log(`Fashion Store server ${PORT}-portda ishlamoqda`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} qabul qilindi, server to'xtatilmoqda...`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Server ishga tushmadi:', err.message);
    process.exit(1);
  }
}

start();
