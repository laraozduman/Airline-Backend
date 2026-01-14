import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config({ path: '/app/.env' });

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/data-source';
import authRoutes from './routes/auth';

const app: Express = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'iam-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes with API versioning
app.use('/v1/auth', authRoutes);

// Start server
const startServer = async () => {
  // Start listening first so Cloud Run health checks pass
  try {
    // Initialize database connection after server starts
    await AppDataSource.initialize();
    console.log(' Database connected successfully');
  } catch (error) {
    console.error(' Database connection failed:', (error as Error).message);
    console.error(' Service will continue but database operations will fail');
  }

  const server = app.listen(PORT, () => {
    console.log(`   IAM SERVICE running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`   Endpoints:`);
    console.log(`   Health: GET /health`);
    console.log(`   Register: POST /v1/auth/register`);
    console.log(`   Validate Token: POST /v1/auth/validate (for Gateway)`);
    console.log(`   Get User: GET /v1/auth/user/:firebaseUid`);
    console.log(`   Update Role: PUT /v1/auth/user/:userId/role`);
    console.log(`   Deactivate User: DELETE /v1/auth/user/:userId`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n   Shutting down IAM Service...');
    server.close();
    await AppDataSource.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n   Shutting down IAM Service...');
    server.close();
    await AppDataSource.destroy();
    process.exit(0);
  });
};

startServer();
