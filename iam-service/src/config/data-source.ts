import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { dirname, join } from 'path';
import { User } from '../entities/User';

dotenv.config();

const __dirname = dirname(process.argv[1] || '.');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'airline_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [User],
  migrations: [join(__dirname, '../migrations/*.{ts,js}')],
  subscribers: [],
});
