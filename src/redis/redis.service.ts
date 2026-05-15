import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl = 3600) {
    return this.redis.set(key, value, 'EX', ttl);
  }
}