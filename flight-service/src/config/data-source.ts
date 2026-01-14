import { DataSource } from 'typeorm';
import { Connector } from '@google-cloud/cloud-sql-connector';
import { Flight } from '../entities/Flight';
import { User } from '../entities/User';
import { Booking } from '../entities/Booking';
import { MilesSmiles } from '../entities/MilesSmiles';
import { MilesTransaction } from '../entities/MilesTransaction';
import { Airport } from '../entities/Airport';

// Determine if we're using Cloud SQL Connector (Cloud Run/production)
const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = process.env.K_SERVICE !== undefined;

let AppDataSourceConfig: any = {
  type: 'postgres',
  entities: [Flight, User, Booking, MilesSmiles, MilesTransaction, Airport],
  migrations: [`${__dirname}/../migrations/**/*.ts`],
  subscribers: [`${__dirname}/../subscribers/**/*.ts`],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
};

if (isCloudRun && process.env.INSTANCE_CONNECTION_NAME) {
  // Cloud Run: Use Cloud SQL Connector
  const connector = new Connector();
  
  AppDataSourceConfig = {
    ...AppDataSourceConfig,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'airline_db',
    extra: {
      socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    },
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
