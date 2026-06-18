const { Pool } = require('pg');

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

      const existing = await client.query('SELECT COUNT(*)::int AS count FROM products');
      if (existing.rows[0].count === 0) {
        await client.query(`
          INSERT INTO products (name, category, price, description, stock) VALUES
          ('Erkaklar ko''ylagi', 'Erkaklar', 89000, 'Klassik oq ko''ylak, 100% paxta', 50),
          ('Ayollar bluzasi', 'Ayollar', 75000, 'Zamonaviy stil, turli ranglar', 40),
          ('Denim shim', 'Unisex', 120000, 'Sifatli denim, slim fit', 35),
          ('Sport kostyum', 'Sport', 150000, 'Yengil va qulay, to''q ko''k', 25),
          ('Qishki kurtka', 'Qishki', 250000, 'Issiq va chidamli, qora rang', 20),
          ('Paxta futbolka', 'Casual', 45000, 'Yumshoq paxta, ko''p ranglar', 60),
          ('Biznes kostyum', 'Rasmiy', 350000, 'Erkaklar uchun to''q kulrang', 15),
          ('Yozgi ko''ylak', 'Yozgi', 65000, 'Yengil mato, gul naqshli', 45);
        `);
        console.log('Seed data kiritildi');
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
