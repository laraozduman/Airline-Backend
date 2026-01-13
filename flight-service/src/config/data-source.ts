import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Flight } from '../entities/Flight';
import { User } from '../entities/User';
import { Booking } from '../entities/Booking';
import { MilesSmiles } from '../entities/MilesSmiles';
import { MilesTransaction } from '../entities/MilesTransaction';
import { Airport } from '../entities/Airport';

// Load environment variables before constructing DataSource
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'airline_db',
  entities: [Flight, User, Booking, MilesSmiles, MilesTransaction, Airport],
  migrations: [`${__dirname}/../migrations/**/*.ts`],
  subscribers: [`${__dirname}/../subscribers/**/*.ts`],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
});
