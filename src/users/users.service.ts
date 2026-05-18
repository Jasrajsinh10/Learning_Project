import { Injectable, OnModuleInit, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { pool } from 'src/database/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UsersService{
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  async createUser(username: string, passwordRaw: string) {
    if (!username || !passwordRaw) {
      throw new Error('Username and password are required');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordRaw, salt);

    try {
      const result = await pool.query(
        `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username`,
        [username, passwordHash]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // unique violation
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  async updateUser(id: string, updates: { username?: string; passwordRaw?: string; auth_token?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.username) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }

    if (updates.passwordRaw) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(updates.passwordRaw, salt);
      fields.push(`password = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.auth_token !== undefined) {
      fields.push(`auth_token = $${paramIndex++}`);
      values.push(updates.auth_token);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, auth_token`;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    
    return result.rows[0];
  }

  async deleteUser(id: string) {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully', id: result.rows[0].id };
  }

  async authenticate(username: string, passwordRaw: string) {
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordRaw, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });

    await pool.query(
      `UPDATE users SET auth_token = $1 WHERE id = $2`,
      [token, user.id]
    );

    return {
      access_token: token,
      user: { id: user.id, username: user.username }
    };
  }

  async logout(token: string) {
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const userId = decoded.sub;

      const result = await pool.query(
        `UPDATE users SET auth_token = NULL WHERE id = $1 RETURNING id`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      return { success: true, message: 'Logged out successfully' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
