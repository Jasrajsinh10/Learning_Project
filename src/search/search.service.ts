import { Injectable } from '@nestjs/common';
import { getEmbedding } from 'src/embed/embedding';
import { pool } from 'src/database/db';
import { AddProductDto } from './dto/create-product.dto';
import { RedisService } from 'src/redis/redis.service';
import { AiService } from './ai.service';

@Injectable()
export class SearchService {
  constructor(
    private redisService: RedisService,
    private aiService: AiService
  ) { }

  async searchProducts(query: string) {
    console.log(query)
    if (!query || !query.trim()) {
      throw new Error("Query is empty");
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:${normalizedQuery}`;

    // Check Redis cache
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      console.log('✅ Cache hit for:', query);
      return JSON.parse(cachedResult);
    }

    // Generate embedding
    const embedding = await getEmbedding(normalizedQuery);
    const vector = `[${embedding.join(',')}]`;

    // Hybrid Search using Reciprocal Rank Fusion (RRF)
    // Combining Semantic (pgvector) and Lexical (Full-Text Search)
    const dbResult = await pool.query(
      `
      WITH vector_results AS (
        SELECT id, name, description, 
               ROW_NUMBER() OVER (ORDER BY embedding <=> $1) as rank
        FROM products
        ORDER BY embedding <=> $1
        LIMIT 20
      ),
      lexical_results AS (
        SELECT id, name, description,
               ROW_NUMBER() OVER (ORDER BY ts_rank_cd(text_search_vector, websearch_to_tsquery('english', $2)) DESC) as rank
        FROM products
        WHERE text_search_vector @@ websearch_to_tsquery('english', $2)
        LIMIT 20
      )
      SELECT 
        COALESCE(v.id, l.id) as id,
        COALESCE(v.name, l.name) as name,
        COALESCE(v.description, l.description) as description,
        (COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + l.rank), 0)) as hybrid_score
      FROM vector_results v
      FULL OUTER JOIN lexical_results l ON v.id = l.id
      ORDER BY hybrid_score DESC
      LIMIT 5;
      `,
      [vector, normalizedQuery]
    );

    const rows = dbResult.rows;

    // Generate explanations for the results using LLM (Groq)
    const resultsWithExplanations = await Promise.all(
      rows.map(async (product) => {
        const explanation = await this.aiService.explainRelevance(
          normalizedQuery,
          product.name,
          product.description
        );
        return {
          ...product,
          relevance_explanation: explanation,
        };
      })
    );

    console.log("Results:", resultsWithExplanations);

    // Cache the result with explanations
    await this.redisService.set(cacheKey, JSON.stringify(resultsWithExplanations), 3600);

    return resultsWithExplanations;
  }
  
async addProducts(products: AddProductDto[]) {
  const results: any[] = [];
  
  for (const product of products) {
    const { name, description, category, price } = product;

    // 1. Validation
    if (!name || !description) {
      throw new Error("Name and description are required for all products");
    }

    // 2. Generate embedding (768-dim)
    const embedding = await getEmbedding(description);

    // 3. Convert to pgvector format
    const vector = `[${embedding.join(',')}]`;

    // 4. Insert into DB
    const result = await pool.query(
      `
      INSERT INTO products (id, name, description, category, price, embedding)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id, name, description, category, price;
      `,
      [name, description, category || null, Number(price) || null, vector]
    );

    results.push(result.rows[0]);
  }

  return results;
}
}
