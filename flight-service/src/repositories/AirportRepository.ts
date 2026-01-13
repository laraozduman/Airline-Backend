import { Repository, DataSource } from 'typeorm';
import { Airport } from '../entities/Airport';
import { AirportCacheService } from '../services/AirportCacheService';

export class AirportRepository {
  private repository: Repository<Airport>;
  private cacheService: AirportCacheService;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Airport);
    this.cacheService = new AirportCacheService();
  }

  /**
   * Get airport by code with Redis caching
   */
  async getAirportByCode(code: string): Promise<Airport | null> {
    const upperCode = code.toUpperCase();

    // Try Redis cache first
    const cachedName = await this.cacheService.getAirportName(upperCode);
    
    if (cachedName) {
      // Return a partial airport object from cache
      return {
        code: upperCode,
        name: cachedName,
      } as Airport;
    }

    // Cache miss - query database
    const airport = await this.repository.findOne({ 
      where: { code: upperCode } 
    });

    // Store in cache for next time
    if (airport) {
      await this.cacheService.setAirportName(airport.code, airport.name);
    }

    return airport;
  }

  /**
   * Get multiple airports with batch caching
   */
  async getAirportsByCodes(codes: string[]): Promise<Airport[]> {
    const upperCodes = codes.map(c => c.toUpperCase());
    
    // Get cached airports
    const cached = await this.cacheService.getAirportNames(upperCodes);
    
    // Find which codes are not in cache
    const missingCodes = upperCodes.filter(code => !cached.has(code));
    
    const results: Airport[] = [];
    
    // Add cached results
    cached.forEach((name: string, code: string) => {
      results.push({ code, name } as Airport);
    });

    // Fetch missing from database
    if (missingCodes.length > 0) {
      const dbAirports = await this.repository
        .createQueryBuilder('airport')
        .where('airport.code IN (:...codes)', { codes: missingCodes })
        .getMany();

      // Cache the newly fetched airports
      const toCache = new Map<string, string>();
      dbAirports.forEach(airport => {
        toCache.set(airport.code, airport.name);
        results.push(airport);
      });

      if (toCache.size > 0) {
        await this.cacheService.setAirportNames(toCache);
      }
    }

    return results;
  }

  /**
   * Create a new airport
   */
  async createAirport(data: Partial<Airport>): Promise<Airport> {
    const airport = this.repository.create(data);
    const saved = await this.repository.save(airport);
    
    // Cache the new airport
    await this.cacheService.setAirportName(saved.code, saved.name);
    
    return saved;
  }

  /**
   * Update airport
   */
  async updateAirport(code: string, updates: Partial<Airport>): Promise<Airport | null> {
    await this.repository.update({ code: code.toUpperCase() }, updates);
    
    const updated = await this.repository.findOne({ 
      where: { code: code.toUpperCase() } 
    });

    if (updated) {
      // Update cache
      await this.cacheService.setAirportName(updated.code, updated.name);
    }

    return updated;
  }

  /**
   * Delete airport
   */
  async deleteAirport(code: string): Promise<boolean> {
    const upperCode = code.toUpperCase();
    const result = await this.repository.delete({ code: upperCode });
    
    if (result.affected && result.affected > 0) {
      // Invalidate cache
      await this.cacheService.invalidateAirport(upperCode);
      return true;
    }
    
    return false;
  }

  /**
   * Get all airports
   */
  async getAllAirports(): Promise<Airport[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  /**
   * Search airports by name or code
   */
  async searchAirports(query: string): Promise<Airport[]> {
    return await this.repository
      .createQueryBuilder('airport')
      .where('LOWER(airport.code) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(airport.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(airport.city) LIKE LOWER(:query)', { query: `%${query}%` })
      .andWhere('airport.isActive = :active', { active: true })
      .orderBy('airport.code', 'ASC')
      .getMany();
  }

  /**
   * Warm up cache with all airports
   */
  async warmUpCache(): Promise<void> {
    const airports = await this.getAllAirports();
    const airportMap = new Map<string, string>();
    
    airports.forEach(airport => {
      airportMap.set(airport.code, airport.name);
    });

    await this.cacheService.setAirportNames(airportMap);
    console.log(`✅ Cache warmed up with ${airports.length} airports`);
  }
}
