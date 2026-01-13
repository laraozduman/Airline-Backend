import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Microservices URLs
const IAM_SERVICE_URL = process.env.IAM_SERVICE_URL || 'http://localhost:3003';
const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4000';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

/**
 * IAM Validation Middleware
 * Validates token with IAM service and adds user headers
 */
async function validateWithIAM(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Call IAM service to validate token
    const iamResponse = await fetch(`${IAM_SERVICE_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!iamResponse.ok) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const iamData = await iamResponse.json() as any;

    if (!iamData.valid || !iamData.user) {
      return res.status(401).json({ message: 'Token validation failed' });
    }

    // Add user info to headers for downstream services
    (req as any).userHeaders = {
      'x-user-id': iamData.user.userId,
      'x-user-email': iamData.user.email,
      'x-user-role': iamData.user.role,
      'x-user-firebase-uid': iamData.user.firebaseUid,
    };

    next();
  } catch (error) {
    console.error('IAM validation error:', error);
    return res.status(500).json({ message: 'Authentication service error' });
  }
}

/**
 * Utility function to forward requests with user headers
 */
async function forwardRequest(
  req: Request,
  res: Response,
  targetUrl: string,
  serviceName: string,
  requireAuth: boolean = false
) {
  try {
    const headers: any = {
      ...req.headers,
      host: new URL(targetUrl).host,
    };

    // Add user headers if authenticated
    if (requireAuth && (req as any).userHeaders) {
      Object.assign(headers, (req as any).userHeaders);
    }

    const fetchOptions: any = {
      method: req.method,
      headers,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    res.send(data);
  } catch (error) {
    console.error(`[${serviceName}] Error:`, error);
    res.status(500).json({
      error: 'Service unavailable',
      service: serviceName,
      message: (error as Error).message,
    });
  }
}

// ==================== IAM Service Routes (No Auth Required) ====================
app.all('/v1/auth/*', (req: Request, res: Response) => {
  const path = req.path.replace('/v1/auth', '');
  const targetUrl = `${IAM_SERVICE_URL}/v1/auth${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'IAM Service', false);
});

// ==================== Flight Service Routes (Auth Required) ====================
app.all('/v1/flights*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/flights', '');
  const targetUrl = `${FLIGHT_SERVICE_URL}/v1/flights${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'Flight Service', true);
});

app.all('/v1/bookings*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/bookings', '');
  const targetUrl = `${FLIGHT_SERVICE_URL}/v1/bookings${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'Flight Service', true);
});

app.all('/v1/airports*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/airports', '');
  const targetUrl = `${FLIGHT_SERVICE_URL}/v1/airports${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'Flight Service', true);
});

// External airline miles API (no user auth, uses airline API key)
app.post('/v1/miles-smiles/external/add-miles', (req: Request, res: Response) => {
  const targetUrl = `${FLIGHT_SERVICE_URL}/v1/miles-smiles/external/add-miles`;
  forwardRequest(req, res, targetUrl, 'Flight Service', false);
});

app.all('/v1/miles-smiles*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/miles-smiles', '');
  const targetUrl = `${FLIGHT_SERVICE_URL}/v1/miles-smiles${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'Flight Service', true);
});

// ==================== Notification Service Routes (Auth Required) ====================
app.all('/v1/notifications*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/notifications', '');
  const targetUrl = `${NOTIFICATION_SERVICE_URL}/v1/notifications${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'Notification Service', true);
});

// ==================== ML Service Routes (Auth Required) ====================
app.all('/v1/ml*', validateWithIAM, (req: Request, res: Response) => {
  const path = req.path.replace('/v1/ml', '');
  const targetUrl = `${ML_SERVICE_URL}${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  forwardRequest(req, res, targetUrl, 'ML Service', true);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    availableRoutes: [
      '/auth/* (IAM Service)',
      '/flights/* (Flight Service)',
      '/bookings/* (Flight Service)',
      '/airports/* (Flight Service)',
      '/miles-smiles/* (Flight Service)',
      '/notifications/* (Notification Service)',
      '/ml/* (ML Service)',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API GATEWAY running on port ${PORT}`);
  console.log(`📡 Service Routes:`);
  console.log(`   IAM: /auth/* → ${IAM_SERVICE_URL}`);
  console.log(`   Flight: /flights/*, /bookings/*, /airports/*, /miles-smiles/* → ${FLIGHT_SERVICE_URL}`);
  console.log(`   Notification: /notifications/* → ${NOTIFICATION_SERVICE_URL}`);
  console.log(`   ML: /ml/* → ${ML_SERVICE_URL}`);
  console.log(`   ⚠️  All routes except /auth/* require authentication`);
});
