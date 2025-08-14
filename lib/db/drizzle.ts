import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  // 开发环境临时跳过数据库连接
  console.warn('⚠️ POSTGRES_URL not set, using placeholder connection');
  process.env.POSTGRES_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema });
