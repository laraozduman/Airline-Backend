import { Request, Response } from 'express';
import { CreateFlightRequest } from '../models/types';
import { FlightRepository } from '../repositories/FlightRepository';
import { AppDataSource } from '../config/data-source';

export const flightController = {
  // Add new flight (Admin only)
  addFlight: async (req: Request, res: Response): Promise<void> => {
    try {
      const { flightNumber, departure, arrival, departureTime, arrivalTime, capacity, price, airline, aircraft } =
        req.body as CreateFlightRequest;

      // Validation
      if (!flightNumber || !departure || !arrival || !departureTime || !arrivalTime || !capacity || !price) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      if (capacity <= 0 || price <= 0) {
        res.status(400).json({ message: 'Capacity and price must be greater than 0' });
        return;
      }

      const departDate = new Date(departureTime);
      const arriveDate = new Date(arrivalTime);

      if (arriveDate <= departDate) {
        res.status(400).json({ message: 'Arrival time must be after departure time' });
        return;
      }

      const repository = new FlightRepository(AppDataSource);
      const flight = await repository.createFlight({
        flightNumber,
        departure,
        arrival,
        departureTime: departDate,
        arrivalTime: arriveDate,
        capacity,
        price,
        airline,
        aircraft,
        status: 'scheduled',
      });

      res.status(201).json({ message: 'Flight added successfully', flight });
    } catch (error) {
      res.status(500).json({ message: 'Error adding flight', error: (error as Error).message });
    }
  },

  // Get all flights
  getAllFlights: async (req: Request, res: Response): Promise<void> => {
    try {
      const repository = new FlightRepository(AppDataSource);
      const flights = await repository.getAllFlights();
      res.status(200).json({ flights });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching flights', error: (error as Error).message });
    }
  },

  // Get flight by ID
  getFlightById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const repository = new FlightRepository(AppDataSource);
      const flight = await repository.getFlightById(id);

      if (!flight) {
        res.status(404).json({ message: 'Flight not found' });
        return;
      }

      res.status(200).json({ flight });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching flight', error: (error as Error).message });
    }
  },

  // Search flights by route, dates, and preferences
  searchFlights: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        departure,
        arrival,
        dateFrom,
        dateTo,
        passengers,
        flexibleDates,
        directFlightsOnly,
        page,
        limit,
      } = req.query as {
        departure?: string;
        arrival?: string;
        dateFrom?: string;
        dateTo?: string;
        passengers?: string;
        flexibleDates?: string;
        directFlightsOnly?: string;
        page?: string;
        limit?: string;
      };

      // Validate required parameters
      if (!departure || !arrival) {
        res.status(400).json({
          message: 'Departure and arrival airports are required',
          example: '/api/flights/search?departure=JFK&arrival=LAX&dateFrom=2024-02-01&dateTo=2024-02-07&passengers=2',
        });
        return;
      }

      // Validate and parse optional parameters
      let departureDate: Date | undefined;
      let returnDate: Date | undefined;
      let passengerCount: number | undefined;
      let isFlexible = false;
      let directOnly = false;

      if (dateFrom) {
        departureDate = new Date(dateFrom);
        if (isNaN(departureDate.getTime())) {
          res.status(400).json({ message: 'Invalid dateFrom format. Use YYYY-MM-DD' });
          return;
        }
      }

      if (dateTo) {
        returnDate = new Date(dateTo);
        if (isNaN(returnDate.getTime())) {
          res.status(400).json({ message: 'Invalid dateTo format. Use YYYY-MM-DD' });
          return;
        }
      }

      if (departureDate && returnDate && returnDate < departureDate) {
        res.status(400).json({ message: 'Return date must be after departure date' });
        return;
      }

      if (passengers) {
        passengerCount = parseInt(passengers, 10);
        if (isNaN(passengerCount) || passengerCount < 1) {
          res.status(400).json({ message: 'Passengers must be a positive number' });
          return;
        }
      }

      if (flexibleDates === 'true') {
        isFlexible = true;
      }

      if (directFlightsOnly === 'true') {
        directOnly = true;
      }

      // Parse pagination parameters
      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSize = limit ? parseInt(limit, 10) : 20;
      
      if (pageNum < 1 || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100' });
        return;
      }

      const repository = new FlightRepository(AppDataSource);
      const { flights, total } = await repository.searchFlights(
        departure,
        arrival,
        departureDate,
        returnDate,
        passengerCount,
        isFlexible,
        directOnly,
        pageNum,
        pageSize
      );

      const totalPages = Math.ceil(total / pageSize);

      // Return empty array if no flights found
      if (flights.length === 0) {
        res.status(200).json({
          flights: [],
          message: 'No flights found matching your criteria',
          pagination: {
            page: pageNum,
            limit: pageSize,
            total: 0,
            totalPages: 0,
          },
          searchCriteria: {
            departure,
            arrival,
            dateFrom: departureDate?.toISOString().split('T')[0],
            dateTo: returnDate?.toISOString().split('T')[0],
            passengers: passengerCount,
            flexibleDates: isFlexible,
            directFlightsOnly: directOnly,
          },
        });
        return;
      }

      res.status(200).json({
        flights,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages,
        },
        count: flights.length,
        searchCriteria: {
          departure,
          arrival,
          dateFrom: departureDate?.toISOString().split('T')[0],
          dateTo: returnDate?.toISOString().split('T')[0],
          passengers: passengerCount,
          flexibleDates: isFlexible,
          directFlightsOnly: directOnly,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Error searching flights', error: (error as Error).message });
    }
  },

  // Update flight (Admin only)
  updateFlight: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const updates = req.body as Partial<Record<string, unknown>>;

      const repository = new FlightRepository(AppDataSource);
      const flight = await repository.updateFlight(id, updates as any);

      if (!flight) {
        res.status(404).json({ message: 'Flight not found' });
        return;
      }

      res.status(200).json({ message: 'Flight updated successfully', flight });
    } catch (error) {
      res.status(500).json({ message: 'Error updating flight', error: (error as Error).message });
    }
  },

  // Delete flight (Admin only)
  deleteFlight: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };

      const repository = new FlightRepository(AppDataSource);
      const success = await repository.deleteFlight(id);

      if (!success) {
        res.status(404).json({ message: 'Flight not found' });
        return;
      }

      res.status(200).json({ message: 'Flight deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting flight', error: (error as Error).message });
    }
  },

  // Get available seats
  getAvailableSeats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const repository = new FlightRepository(AppDataSource);
      const available = await repository.getAvailableSeats(id);

      if (available === null) {
        res.status(404).json({ message: 'Flight not found' });
        return;
      }

      res.status(200).json({ flightId: id, availableSeats: available });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching available seats', error: (error as Error).message });
    }
  },
};
