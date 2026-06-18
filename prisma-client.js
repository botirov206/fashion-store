const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

function createPrisma() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');
    const pool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'fashiondb',
    user: process.env.DB_USER || 'fashion_user',
    password: process.env.DB_PASSWORD || 'fashion_pass_2026',
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const prisma = createPrisma();
module.exports = prisma;
