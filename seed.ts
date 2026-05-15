import { pipeline } from '@xenova/transformers';
import { Pool } from 'pg';

// DB connection
const pool = new Pool({
  user: 'ztlab58',
  host: 'localhost',
  database: 'postgres',
  port: 5432,
});

// Load embedding model (768-dim)
let embedder: any;

async function loadModel() {
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-mpnet-base-v2' // 768 dimensions
  );
}

// Generate embedding
async function getEmbedding(text: string): Promise<number[]> {
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

// Dummy product data (you can expand this)
const products = Array.from({ length: 100 }, (_, i) => ({
  name: `Product ${i + 1}`,
  description: `This is a high quality product number ${i + 1} suitable for daily use`,
  category: i % 2 === 0 ? 'fashion' : 'electronics',
  price: Math.floor(Math.random() * 5000) + 500,
}));

async function seed() {
  await loadModel();

  for (const p of products) {
    const embedding = await getEmbedding(p.description);
    const vectorString = `[${embedding.join(',')}]`;

    await pool.query(
      `
      INSERT INTO products (id, name, description, category, price, embedding)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      `,
      [p.name, p.description, p.category, p.price, vectorString]
    );

    console.log(`Inserted: ${p.name}`);
  }

  console.log('✅ Seeding complete');
  process.exit();
}

seed();