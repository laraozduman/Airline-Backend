import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { AirportRepository } from '../repositories/AirportRepository';
import { redisClient } from '../config/redis';

const CACHE_TTL = 3600; // 1 hour

export const airportController = {
  // Get all airports (with caching)
  getAllAirports: async (req: Request, res: Response): Promise<void> => {
    try {
      const cacheKey = 'airports:all';
      
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('✅ Cache hit for all airports');
        const cachedResponse = JSON.parse(cached);
        cachedResponse.cached = true;
        res.status(200).json(cachedResponse);
        return;
      }
      
      console.log('❌ Cache miss for all airports, fetching from DB');
      const airportRepo = new AirportRepository(AppDataSource);
      const airports = await airportRepo.getAllAirports();
      
      const response = { 
        airports,
        count: airports.length,
        cached: false
      };
      
      // Store in cache
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
        console.log('✅ Cached all airports');
      } catch (cacheError) {
        console.error('❌ Failed to cache airports:', cacheError);
      }
      
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching airports', error: (error as Error).message });
    }
  },

  // Get airport by code (with caching)
  getAirportByCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const code = (req.params.code as string).toUpperCase();
      if (!code || code.length !== 3) {
        res.status(400).json({ message: 'Invalid airport code. Must be 3 characters (e.g., JFK)' });
        return;
      }

      const cacheKey = `airport:${code}`;
      
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for airport ${code}`);
        const cachedResponse = JSON.parse(cached);
        cachedResponse.cached = true;
        res.status(200).json(cachedResponse);
        return;
      }
      
      console.log(`❌ Cache miss for airport ${code}, fetching from DB`);
      const airportRepo = new AirportRepository(AppDataSource);
      const airport = await airportRepo.getAirportByCode(code);

      if (!airport) {
        res.status(404).json({ message: 'Airport not found' });
        return;
      }

      const response = { airport, cached: false };
      
      // Store in cache
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
        console.log(`✅ Cached airport ${code}`);
      } catch (cacheError) {
        console.error(`❌ Failed to cache airport ${code}:`, cacheError);
      }

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching airport', error: (error as Error).message });
    }
  },

  // Search airports
  searchAirports: async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ message: 'Search query is required' });
        return;
      }

      const airportRepo = new AirportRepository(AppDataSource);
      const airports = await airportRepo.searchAirports(query);

      res.status(200).json({ 
        airports,
        count: airports.length,
        query 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error searching airports', error: (error as Error).message });
    }
  },

  // Create airport (admin only)
  createAirport: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, name, city, country, timezone } = req.body;

      if (!code || !name) {
        res.status(400).json({ message: 'Airport code and name are required' });
        return;
      }

      if (code.length !== 3) {
        res.status(400).json({ message: 'Airport code must be exactly 3 characters' });
        return;
      }

      const airportRepo = new AirportRepository(AppDataSource);
      const airport = await airportRepo.createAirport({
        code: code.toUpperCase(),
        name,
        city,
        country,
        timezone,
        isActive: true,
      });

      res.status(201).json({ 
        message: 'Airport created successfully',
        airport 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error creating airport', error: (error as Error).message });
    }
  },

  // Update airport (admin only)
  updateAirport: async (req: Request, res: Response): Promise<void> => {
    try {
      const code = (req.params.code as string);
      const updates = req.body;

      if (!code || code.length !== 3) {
        res.status(400).json({ message: 'Invalid airport code' });
        return;
      }

      const airportRepo = new AirportRepository(AppDataSource);
      const airport = await airportRepo.updateAirport(code, updates);

      if (!airport) {
        res.status(404).json({ message: 'Airport not found' });
        return;
      }

      res.status(200).json({ 
        message: 'Airport updated successfully',
        airport 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating airport', error: (error as Error).message });
    }
  },

  // Delete airport (admin only)
  deleteAirport: async (req: Request, res: Response): Promise<void> => {
    try {
      const code = (req.params.code as string);
      if (!code || code.length !== 3) {
        res.status(400).json({ message: 'Invalid airport code' });
        return;
      }

      const airportRepo = new AirportRepository(AppDataSource);
      const deleted = await airportRepo.deleteAirport(code);

      if (!deleted) {
        res.status(404).json({ message: 'Airport not found' });
        return;
      }

      res.status(200).json({ message: 'Airport deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting airport', error: (error as Error).message });
    }
  },

  // Warm up cache (admin only)
  warmUpCache: async (req: Request, res: Response): Promise<void> => {
    try {
      const airportRepo = new AirportRepository(AppDataSource);
      await airportRepo.warmUpCache();

      res.status(200).json({ message: 'Airport cache warmed up successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error warming up cache', error: (error as Error).message });
    }
  },
};
