import dotenv from 'dotenv';
dotenv.config({ path: '/app/.env' });
import { DataSource } from 'typeorm';
import { Flight } from '../entities/Flight';
import { User } from '../entities/User';
import { Booking } from '../entities/Booking';
import { MilesSmiles } from '../entities/MilesSmiles';
import { MilesTransaction } from '../entities/MilesTransaction';
import { Airport } from '../entities/Airport';

// Load environment variables before constructing DataSource

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'default',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'airline_db',
  entities: [Flight, User, Booking, MilesSmiles, MilesTransaction, Airport],
  migrations: [`${__dirname}/../migrations/**/*.ts`],
  subscribers: [`${__dirname}/../subscribers/**/*.ts`],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
});
