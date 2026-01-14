import { DataSource } from 'typeorm';
import { Flight } from '../entities/Flight';
import { User } from '../entities/User';
import { Booking } from '../entities/Booking';
import { MilesSmiles } from '../entities/MilesSmiles';
import { MilesTransaction } from '../entities/MilesTransaction';
import { Airport } from '../entities/Airport';

// Determine if we're using Cloud SQL Connector (Cloud Run/production)
const isCloudRun = process.env.K_SERVICE !== undefined;

let AppDataSourceConfig: any = {
  type: 'postgres',
  entities: [Flight, User, Booking, MilesSmiles, MilesTransaction, Airport],
  migrations: [`${__dirname}/../migrations/**/*.ts`],
  subscribers: [`${__dirname}/../subscribers/**/*.ts`],
  synchronize: true,
  logging: false,
};

if (isCloudRun && process.env.INSTANCE_CONNECTION_NAME) {
  console.log('Using Cloud SQL Connector for database connection', process.env.INSTANCE_CONNECTION_NAME);
  // Cloud Run: connect via Cloud SQL Unix socket
  AppDataSourceConfig = {
    ...AppDataSourceConfig,
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    port: 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'airline_db',
  };
} else {
  // Local development: Direct connection
  AppDataSourceConfig = {
    ...AppDataSourceConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'airline_db',
  };
}

export const AppDataSource = new DataSource(AppDataSourceConfig);
