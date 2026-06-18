const { Pool } = require('pg');
const { seedProducts, seedOrders } = require('./seed-data');

function createPool() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');

    return new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'fashiondb',
    user: process.env.DB_USER || 'fashion_user',
    password: process.env.DB_PASSWORD || 'fashion_pass_2026',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = createPool();

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDB(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(50),
          price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
          description TEXT,
          stock INTEGER DEFAULT 0 CHECK (stock >= 0),
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          customer_name VARCHAR(100) NOT NULL,
          customer_email VARCHAR(100) NOT NULL,
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
          status VARCHAR(20) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      const productsAdded = await seedProducts(pool);
      if (productsAdded > 0) {
        console.log(`Mahsulotlar: ${productsAdded} ta qo'shildi`);
      }

      const ordersAdded = await seedOrders(pool);
      if (ordersAdded > 0) {
        console.log(`Buyurtmalar: ${ordersAdded} ta qo'shildi`);
      }

      console.log('Ma\'lumotlar bazasi tayyor');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`DB ulanish urinishi ${attempt}/${retries} muvaffaqiyatsiz, qayta urinilmoqda...`);
      await wait(attempt * 2000);
    } finally {
      client.release();
    }
  }
}

module.exports = { pool, initDB };
