import { Repository, DataSource } from 'typeorm';
import { Flight } from '../entities/Flight';
import { AppDataSource } from '../config/data-source';

export class FlightRepository {
  private repository: Repository<Flight>;

  constructor(dataSource?: DataSource) {
    this.repository = (dataSource || AppDataSource).getRepository(Flight);
  }

  async createFlight(data: Partial<Flight>): Promise<Flight> {
    const flight = this.repository.create(data);
    return await this.repository.save(flight);
  }

  async getAllFlights(): Promise<Flight[]> {
    return await this.repository.find({
      order: { departureTime: 'ASC' },
    });
  }

  async getFlightById(id: string): Promise<Flight | null> {
    return await this.repository.findOneBy({ id });
  }

  async getFlightsByRoute(departure: string, arrival: string): Promise<Flight[]> {
    return await this.repository.find({
      where: { departure, arrival },
      order: { departureTime: 'ASC' },
    });
  }

  async updateFlight(id: string, updates: Partial<Flight>): Promise<Flight | null> {
    await this.repository.update(id, updates);
    return await this.getFlightById(id);
  }

  async deleteFlight(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getAvailableSeats(id: string): Promise<number | null> {
    const flight = await this.getFlightById(id);
    if (!flight) return null;
    return flight.getAvailableSeats();
  }

  async bookSeats(id: string, seatCount: number): Promise<boolean> {
    const flight = await this.getFlightById(id);
    if (!flight) return false;

    const available = flight.getAvailableSeats();
    if (available < seatCount) return false;

    await this.repository.update(id, {
      bookedSeats: flight.bookedSeats + seatCount,
    });
    return true;
  }

  async searchFlights(
    departure?: string,
    arrival?: string,
    dateFrom?: Date,
    dateTo?: Date,
    passengers?: number,
    flexibleDates?: boolean,
    directFlightsOnly?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ flights: Flight[]; total: number }> {
    let query = this.repository.createQueryBuilder('flight');

    // Required: departure and arrival
    if (departure) {
      query = query.andWhere('LOWER(flight.departure) = LOWER(:departure)', { departure });
    }
    if (arrival) {
      query = query.andWhere('LOWER(flight.arrival) = LOWER(:arrival)', { arrival });
    }

    // Date range search
    if (dateFrom) {
      query = query.andWhere('DATE(flight.departureTime) >= DATE(:dateFrom)', { dateFrom });
    }
    if (dateTo) {
      // If flexible dates is enabled, add extra days for flexible search
      const adjustedDateTo = flexibleDates ? new Date(dateTo.getTime() + 3 * 24 * 60 * 60 * 1000) : dateTo;
      query = query.andWhere('DATE(flight.departureTime) <= DATE(:dateTo)', { dateTo: adjustedDateTo });
    }

    // Passenger availability check (has enough available seats)
    if (passengers && passengers > 0) {
      query = query.andWhere(
        '(flight.capacity - flight.bookedSeats) >= :passengers',
        { passengers }
      );
    }

    // Filter by status (exclude cancelled flights)
    query = query.andWhere('flight.status != :cancelledStatus', { cancelledStatus: 'cancelled' });

    // Order by departure time, then by price (cheapest first)
    query = query.orderBy('flight.departureTime', 'ASC').addOrderBy('flight.price', 'ASC');

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    query = query.skip((page - 1) * limit).take(limit);

    let results = await query.getMany();

    // If direct flights only, filter out connecting flights (those with different arrival day/time patterns)
    if (directFlightsOnly) {
      // A direct flight is one that departs and arrives on the same calendar day or within a reasonable time
      // For simplicity, we filter based on flight duration (arrival - departure should be < 12 hours for most direct flights)
      const MAX_DIRECT_FLIGHT_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
      results = results.filter((flight) => {
        const flightDuration = flight.arrivalTime.getTime() - flight.departureTime.getTime();
        return flightDuration <= MAX_DIRECT_FLIGHT_DURATION;
      });
    }

    return { flights: results, total };
  }
}
