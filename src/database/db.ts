import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER || 'ztlab58',
  database: process.env.DB_NAME || 'postgres',
});