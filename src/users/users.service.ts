import { Injectable } from '@nestjs/common';
import { pool } from 'src/database/db';
import { getEmbedding } from 'src/embed/embedding';

@Injectable()
export class UsersService {
  async createUser(email: string, password: string) {
    const embedding = await getEmbedding(email); // Use email as the searchable text
    const vector = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `
      INSERT INTO users (email, password, embedding)
      VALUES ($1, $2, $3)
      RETURNING id, email;
      `,
      [email, password, vector]
    );

    return result.rows[0];
  }

  async findSimilarUsers(queryEmail: string, limit = 5) {
    const embedding = await getEmbedding(queryEmail);
    const vector = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `
      SELECT id, email, embedding <=> $1 as similarity
      FROM users
      ORDER BY embedding <=> $1
      LIMIT $2;
      `,
      [vector, limit]
    );

    return result.rows;
  }
}
