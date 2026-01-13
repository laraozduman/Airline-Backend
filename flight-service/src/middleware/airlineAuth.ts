import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Airline partner API keys (in production, store in database)
const AIRLINE_API_KEYS: Record<string, { name: string; secret: string }> = {
  'AA': { name: 'American Airlines', secret: process.env.AIRLINE_AA_SECRET || 'aa-secret-key-12345' },
  'UA': { name: 'United Airlines', secret: process.env.AIRLINE_UA_SECRET || 'ua-secret-key-12345' },
  'DL': { name: 'Delta Air Lines', secret: process.env.AIRLINE_DL_SECRET || 'dl-secret-key-12345' },
  'BA': { name: 'British Airways', secret: process.env.AIRLINE_BA_SECRET || 'ba-secret-key-12345' },
};

/**
 * Middleware to authenticate airline partners
 * Expects header: X-Airline-Code and X-Airline-Secret
 */
export const airlineAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const airlineCode = req.headers['x-airline-code'] as string;
    const airlineSecret = req.headers['x-airline-secret'] as string;

    if (!airlineCode || !airlineSecret) {
      res.status(401).json({ 
        message: 'Airline authentication required',
        error: 'Missing X-Airline-Code or X-Airline-Secret header'
      });
      return;
    }

    // Check if airline exists
    const airline = AIRLINE_API_KEYS[airlineCode.toUpperCase()];
    if (!airline) {
      res.status(401).json({ 
        message: 'Invalid airline code',
        error: `Airline code '${airlineCode}' not recognized`
      });
      return;
    }

    // Verify secret using constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(airlineSecret),
      Buffer.from(airline.secret)
    );

    if (!isValid) {
      res.status(401).json({ 
        message: 'Invalid airline credentials',
        error: 'Airline secret does not match'
      });
      return;
    }

    // Attach airline info to request
    (req as any).airline = {
      code: airlineCode.toUpperCase(),
      name: airline.name,
    };

    next();
  } catch (error) {
    res.status(500).json({ 
      message: 'Error authenticating airline',
      error: (error as Error).message 
    });
  }
};
