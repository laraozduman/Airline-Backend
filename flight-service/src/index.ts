import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config({ path: '/app/.env' });

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/data-source';
import { connectRedis } from './config/redis';
import { initQueue, closeQueue } from './utils/queuePublisher';
import flightRoutes from './routes/flights';
import bookingRoutes from './routes/bookings';
import milesSmilesRoutes from './routes/milesSmiles';
import airportRoutes from './routes/airports';
import predictionRoutes from './controllers/prediction';
import { startMilesUpdateScheduler, startWelcomeEmailScheduler } from './schedulers/milesScheduler';

const app: Express = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = 'production';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize and start server
const startServer = async () => {
  // Health check - must be defined before listening
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      service: 'flight-service',
      status: 'running',
      port: PORT,
      timestamp: new Date(),
      environment: NODE_ENV 
    });
  });

  // Routes with API versioning
  app.use('/v1/flights', publicLimiter, flightRoutes);
  app.use('/v1/bookings', publicLimiter, bookingRoutes);
  app.use('/v1/miles-smiles', publicLimiter, milesSmilesRoutes);
  app.use('/v1/airports', publicLimiter, airportRoutes);
  app.use('/v1/flights', publicLimiter, predictionRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
  });

  // Error handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });

  // Start listening first so Cloud Run health checks pass
  const server = app.listen(PORT, () => {
    console.log(`🚀 FLIGHT SERVICE running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`📚 Endpoints:`);
    console.log(`   Health: GET /health`);
    console.log(`   Flights: GET /v1/flights, POST /v1/flights (admin)`);
    console.log(`   Bookings: POST /v1/bookings, GET /v1/bookings/my-bookings`);
    console.log(`   Miles&Smiles: GET /v1/miles-smiles/profile, POST /v1/miles-smiles/add-miles`);
    console.log(`   Airports: GET /v1/airports, GET /v1/airports/:code`);
    console.log(`   All endpoints require authentication via API Gateway`);
  });

  try {
    // Initialize database after server starts
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    // Initialize Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // Initialize RabbitMQ
    await initQueue();
    console.log('✅ RabbitMQ connected');

    // Start schedulers
    startMilesUpdateScheduler();
    startWelcomeEmailScheduler();
    console.log('✅ Schedulers started');
  } catch (error) {
    console.error('❌ Error during initialization:', (error as Error).message);
    console.error('   Service will continue but some features may not work');
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Flight Service...');
    server.close();
    await closeQueue();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Flight Service...');
    server.close();
    await closeQueue();
    process.exit(0);
  });
};

startServer();
