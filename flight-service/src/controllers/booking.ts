import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { BookingRepository } from '../repositories/BookingRepository';
import { FlightRepository } from '../repositories/FlightRepository';
import { MilesSmilesRepository } from '../repositories/MilesSmilesRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from '../services/EmailService';
import { publishWelcome } from '../utils/queuePublisher';

const emailService = new EmailService();

export const bookingController = {
  // Buy a ticket
  buyTicket: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const userId = user.userId; // Use userId from auth middleware
      const {
        flightId,
        numberOfSeats,
        useSmiles,
        milesAmount,
        becomeMember,
        phoneNumber,
        address,
        passengerEmail,
        passengerName,
      } = req.body;

      // Validate input
      if (!flightId || !numberOfSeats || numberOfSeats < 1) {
        res.status(400).json({ message: 'Invalid flight ID or number of seats' });
        return;
      }

      const flightRepo = new FlightRepository(AppDataSource);
      const bookingRepo = new BookingRepository(AppDataSource);
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      const userRepo = new UserRepository(AppDataSource);

      // Get user details from database
      const userDetails = await userRepo.getUserById(userId);
      if (!userDetails) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Get flight details
      const flight = await flightRepo.getFlightById(flightId);
      if (!flight) {
        res.status(404).json({ message: 'Flight not found' });
        return;
      }

      // Check flight capacity
      const availableSeats = await flightRepo.getAvailableSeats(flightId);
      if (availableSeats === null || availableSeats < numberOfSeats) {
        res.status(400).json({
          message: 'Not enough available seats',
          availableSeats: availableSeats || 0,
          requested: numberOfSeats,
        });
        return;
      }

      const totalPrice = Number(flight.price) * numberOfSeats;
      let milesSmilesMember = await milesRepo.getMemberByUserId(userId);
      let paymentMethod: 'cash' | 'miles' | 'mixed' = 'cash';
      let milesUsed = 0;
      let cashAmount = totalPrice;

      // Handle Miles&Smiles membership creation
      if (becomeMember && !milesSmilesMember) {
        milesSmilesMember = await milesRepo.createMember(userId, userDetails.email, phoneNumber, address);
        
        // Queue welcome email notification
        publishWelcome({
          memberId: milesSmilesMember.id,
          email: userDetails.email,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          memberNumber: milesSmilesMember.memberNumber,
          joinedAt: new Date().toISOString(),
        });
        
        // Also send immediate email (legacy, can be removed later)
        emailService.sendWelcomeEmail(userDetails.email, userDetails.firstName || 'Valued Customer', milesSmilesMember.memberNumber)
          .catch((err: any) => console.error('Failed to send welcome email:', err));
      }

      // Handle Miles payment
      if (useSmiles && milesSmilesMember) {
        const memberBalance = Number(milesSmilesMember.milesBalance);
        
        if (milesAmount && milesAmount > 0) {
          // Use specific amount of miles
          if (memberBalance < milesAmount) {
            res.status(400).json({
              message: 'Insufficient miles balance',
              balance: memberBalance,
              requested: milesAmount,
            });
            return;
          }

          // Assume 1 mile = $0.01 for redemption
          const milesValue = milesAmount * 0.01;
          
          if (milesValue >= totalPrice) {
            // Pay entirely with miles
            milesUsed = Math.ceil(totalPrice / 0.01);
            cashAmount = 0;
            paymentMethod = 'miles';
          } else {
            // Mixed payment
            milesUsed = milesAmount;
            cashAmount = totalPrice - milesValue;
            paymentMethod = 'mixed';
          }

          // Deduct miles
          await milesRepo.deductMiles(milesSmilesMember.id, milesUsed);
          
          // Refresh member data to get updated balance
          milesSmilesMember = await milesRepo.getMemberById(milesSmilesMember.id);
        }
      }

      // Reduce flight capacity
      const updatedFlight = await flightRepo.bookSeats(flightId, numberOfSeats);

      // Create booking
      const booking = await bookingRepo.createBooking({
        flightId,
        userId,
        numberOfSeats,
        totalPrice,
        passengerEmail: passengerEmail || userDetails.email,
        passengerName: passengerName || `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim(),
        milesSmilesMemberId: milesSmilesMember?.id,
        paymentMethod,
        milesUsed,
        cashAmount,
      });

      // Send booking confirmation email
      emailService.sendBookingConfirmation(
        userDetails.email,
        booking.bookingReference!,
        flight,
        numberOfSeats,
        cashAmount
      ).catch((err: any) => console.error('Failed to send booking confirmation:', err));

      res.status(201).json({
        message: 'Ticket purchased successfully',
        booking: {
          bookingReference: booking.bookingReference,
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          arrival: flight.arrival,
          departureTime: flight.departureTime,
          numberOfSeats,
          totalPrice,
          paymentMethod,
          milesUsed,
          cashAmount,
        },
        milesSmilesMember: milesSmilesMember ? {
          memberNumber: milesSmilesMember.memberNumber,
          remainingBalance: Number(milesSmilesMember.milesBalance),
        } : undefined,
        newMember: becomeMember && milesSmilesMember ? true : false,
      });
    } catch (error) {
      console.error('Error buying ticket:', error);
      res.status(500).json({ message: 'Error purchasing ticket', error: (error as Error).message });
    }
  },

  // Get user's bookings
  getMyBookings: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const bookingRepo = new BookingRepository(AppDataSource);
      
      const bookings = await bookingRepo.getBookingsByUserId(userId);
      
      res.status(200).json({ bookings });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching bookings', error: (error as Error).message });
    }
  },

  // Get booking by reference
  getBookingByReference: async (req: Request, res: Response): Promise<void> => {
    try {
      const reference = (req.params.reference as string);
      const bookingRepo = new BookingRepository(AppDataSource);
      
      const booking = await bookingRepo.getBookingByReference(reference);
      
      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      res.status(200).json({ booking });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking', error: (error as Error).message });
    }
  },

  // Cancel booking
  cancelBooking: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = (req.params.id as string);
      const userId = (req as any).user.userId;
      const bookingRepo = new BookingRepository(AppDataSource);
      const flightRepo = new FlightRepository(AppDataSource);
      
      const booking = await bookingRepo.getBookingById(id);
      
      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      // Check ownership
      if (booking.userId !== userId) {
        res.status(403).json({ message: 'You can only cancel your own bookings' });
        return;
      }

      // Cancel booking
      const cancelledBooking = await bookingRepo.cancelBooking(id as string);

      // Restore flight capacity
      const flight = await flightRepo.getFlightById(booking.flightId);
      if (flight) {
        flight.bookedSeats = Math.max(0, flight.bookedSeats - booking.numberOfSeats);
        await flightRepo.updateFlight(flight.id, { bookedSeats: flight.bookedSeats });
      }

      // If miles were used, refund them
      if (booking.milesSmilesMemberId && booking.milesUsed > 0) {
        const milesRepo = new MilesSmilesRepository(AppDataSource);
        await milesRepo.addMiles(
          booking.milesSmilesMemberId,
          Number(booking.milesUsed),
          'adjustment',
          'Refund for cancelled booking'
        );
      }

      res.status(200).json({
        message: 'Booking cancelled successfully',
        booking: cancelledBooking,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error cancelling booking', error: (error as Error).message });
    }
  },
};
