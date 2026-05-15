import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

async function migrate() {
  try {
    console.log('Starting migration...');
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS text_search_vector tsvector 
      GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || description)) STORED;
    `);
    console.log('Generated column added.');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(text_search_vector);
    `);
    console.log('Index created (if not exists).');
    
    console.log('✅ Migration successful');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
