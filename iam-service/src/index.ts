import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';
import { AppDataSource } from './config/data-source';
import authRoutes from './routes/auth';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3003;
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
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 IAM SERVICE running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`📚 Endpoints:`);
      console.log(`   Health: GET /health`);
      console.log(`   Register: POST /auth/register`);
      console.log(`   Validate Token: POST /auth/validate (for Gateway)`);
      console.log(`   Get User: GET /auth/user/:firebaseUid`);
      console.log(`   Update Role: PUT /auth/user/:userId/role`);
      console.log(`   Deactivate User: DELETE /auth/user/:userId`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down IAM Service...');
      await AppDataSource.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down IAM Service...');
      await AppDataSource.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start IAM Service:', (error as Error).message);
    process.exit(1);
  }
};

startServer();
