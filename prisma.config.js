require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    async adapter() {
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      });
      return new PrismaPg(pool);
    },
  },
});
