import 'reflect-metadata';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

import { entities } from './entities.js';
import { migrations } from './migrations/index.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'launchdesk',
  password: process.env.DATABASE_PASSWORD ?? 'launchdesk',
  database: process.env.DATABASE_NAME ?? 'launchdesk',
  entities,
  migrations,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
