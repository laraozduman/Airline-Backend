import { redisClient } from '../config/redis';

export class AirportCacheService {
  private readonly CACHE_PREFIX = 'airport:';
  private readonly CACHE_TTL = 86400; // 24 hours in seconds

  /**
   * Get airport name by code from cache
   */
  async getAirportName(airportCode: string): Promise<string | null> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }

      const key = `${this.CACHE_PREFIX}${airportCode.toUpperCase()}`;
      const cachedName = await redisClient.get(key);
      
      if (cachedName) {
        console.log(`✅ Cache HIT: ${airportCode} -> ${cachedName}`);
      }
      
      return cachedName;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set airport name in cache
   */
  async setAirportName(airportCode: string, airportName: string): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const key = `${this.CACHE_PREFIX}${airportCode.toUpperCase()}`;
      await redisClient.setEx(key, this.CACHE_TTL, airportName);
      console.log(`✅ Cache SET: ${airportCode} -> ${airportName}`);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Get multiple airport names
   */
  async getAirportNames(airportCodes: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    
    try {
      if (!redisClient.isOpen) {
        return result;
      }

      const keys = airportCodes.map(code => `${this.CACHE_PREFIX}${code.toUpperCase()}`);
      const values = await redisClient.mGet(keys);
      
      values.forEach((value, index) => {
        if (value) {
          result.set(airportCodes[index].toUpperCase(), value);
        }
      });
      
      console.log(`✅ Cache MGET: Retrieved ${result.size}/${airportCodes.length} airports`);
    } catch (error) {
      console.error('Redis mGet error:', error);
    }
    
    return result;
  }

  /**
   * Set multiple airport names at once
   */
  async setAirportNames(airports: Map<string, string>): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const pipeline = redisClient.multi();
      
      airports.forEach((name, code) => {
        const key = `${this.CACHE_PREFIX}${code.toUpperCase()}`;
        pipeline.setEx(key, this.CACHE_TTL, name);
      });
      
      await pipeline.exec();
      console.log(`✅ Cache MSET: Stored ${airports.size} airports`);
    } catch (error) {
      console.error('Redis mSet error:', error);
    }
  }

  /**
   * Invalidate a specific airport cache
   */
  async invalidateAirport(airportCode: string): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const key = `${this.CACHE_PREFIX}${airportCode.toUpperCase()}`;
      await redisClient.del(key);
      console.log(`✅ Cache DELETE: ${airportCode}`);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  /**
   * Clear all airport cache
   */
  async clearAllAirports(): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`✅ Cache CLEAR: Deleted ${keys.length} airports`);
      }
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  /**
   * Get airport name with fallback to a provider function
   */
  async getOrFetchAirportName(
    airportCode: string,
    fetchFunction: (code: string) => Promise<string>
  ): Promise<string> {
    // Try cache first
    const cached = await this.getAirportName(airportCode);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from source
    console.log(`⚠️  Cache MISS: ${airportCode} - Fetching from source...`);
    const airportName = await fetchFunction(airportCode);
    
    // Store in cache for next time
    await this.setAirportName(airportCode, airportName);
    
    return airportName;
  }
}
