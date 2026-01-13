import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { MilesSmilesRepository } from '../repositories/MilesSmilesRepository';
import { publishMiles } from '../utils/queuePublisher';

export const milesSmilesController = {
  // Get member profile
  getMyProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      
      const member = await milesRepo.getMemberByUserId(userId);
      
      if (!member) {
        res.status(404).json({ message: 'You are not a Miles&Smiles member yet' });
        return;
      }

      res.status(200).json({ member });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching profile', error: (error as Error).message });
    }
  },

  // Get miles transactions
  getMyTransactions: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      
      const member = await milesRepo.getMemberByUserId(userId);
      
      if (!member) {
        res.status(404).json({ message: 'You are not a Miles&Smiles member' });
        return;
      }

      const transactions = await milesRepo.getTransactions(member.id);
      
      res.status(200).json({ transactions, balance: member.milesBalance });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transactions', error: (error as Error).message });
    }
  },

  // Admin/Partner: Add miles to account
  addMilesToAccount: async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberNumber, miles, description, partnerAirline } = req.body;

      if (!memberNumber || !miles || miles <= 0) {
        res.status(400).json({ message: 'Member number and positive miles amount are required' });
        return;
      }

      const milesRepo = new MilesSmilesRepository(AppDataSource);
      const member = await milesRepo.getMemberByMemberNumber(memberNumber);

      if (!member) {
        res.status(404).json({ message: 'Miles&Smiles member not found' });
        return;
      }

      const result = await milesRepo.addMiles(
        member.id,
        miles,
        'adjustment',
        description || 'Miles added by partner airline',
        undefined,
        partnerAirline
      );

      // Queue miles update notification
      publishMiles({
        memberId: member.id,
        email: member.email || 'unknown@example.com',
        milesDelta: miles,
        newBalance: Number(result.member.milesBalance),
        airlineCode: partnerAirline,
        occurredAt: new Date().toISOString(),
        reason: description || 'Miles added by partner airline',
      });

      res.status(200).json({
        message: 'Miles added successfully',
        member: {
          memberNumber: result.member.memberNumber,
          newBalance: result.member.milesBalance,
        },
        transaction: result.transaction,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error adding miles', error: (error as Error).message });
    }
  },

  // Nightly process to update miles after flight completion
  processCompletedFlights: async (req: Request, res: Response): Promise<void> => {
    try {
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      const currentDate = new Date();

      // Get all completed flights that haven't been processed for miles
      const completedBookings = await milesRepo.getCompletedFlightsForMilesUpdate(currentDate);

      const processedCount = completedBookings.length;
      const results = [];

      for (const booking of completedBookings) {
        try {
          // Calculate miles: 1 mile per $1 spent (simple formula)
          const milesEarned = Math.floor(booking.price * booking.numberOfSeats);

          const result = await milesRepo.addMiles(
            booking.milesSmilesMemberId,
            milesEarned,
            'earn',
            `Miles earned from flight ${booking.flightId}`,
            booking.flightId
          );

          // Queue miles update notification
          publishMiles({
            memberId: result.member.id,
            email: result.member.email || 'unknown@example.com',
            milesDelta: milesEarned,
            newBalance: Number(result.member.milesBalance),
            flightId: booking.flightId,
            occurredAt: new Date().toISOString(),
            reason: `Miles earned from completed flight`,
          });

          results.push({
            bookingId: booking.bookingId,
            memberNumber: result.member.memberNumber,
            milesEarned,
            newBalance: result.member.milesBalance,
          });
        } catch (error) {
          console.error(`Error processing booking ${booking.bookingId}:`, error);
        }
      }

      res.status(200).json({
        message: 'Completed flights processed successfully',
        processedCount,
        results,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error processing completed flights', error: (error as Error).message });
    }
  },

  // Admin: Get all members
  getAllMembers: async (req: Request, res: Response): Promise<void> => {
    try {
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      const members = await milesRepo['repository'].find({
        order: { createdAt: 'DESC' },
      });

      res.status(200).json({ members, count: members.length });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching members', error: (error as Error).message });
    }
  },

  // External Airline: Add miles (authenticated via airline API key)
  externalAddMiles: async (req: Request, res: Response): Promise<void> => {
    try {
      const airline = (req as any).airline; // Set by airlineAuth middleware
      const { memberNumber, miles, flightReference, description } = req.body;

      // Validate required fields
      if (!memberNumber || !miles || miles <= 0) {
        res.status(400).json({ 
          message: 'Validation error',
          error: 'memberNumber and positive miles amount are required'
        });
        return;
      }

      const milesRepo = new MilesSmilesRepository(AppDataSource);
      
      // Find member by member number
      const member = await milesRepo.getMemberByMemberNumber(memberNumber);
      if (!member) {
        res.status(404).json({ 
          message: 'Member not found',
          error: `No Miles&Smiles member with number ${memberNumber}`
        });
        return;
      }

      // Add miles with airline information
      const transactionDescription = description || 
        `Miles earned from ${airline.name} flight ${flightReference || 'N/A'}`;

      const result = await milesRepo.addMiles(
        member.id,
        miles,
        'earn',
        transactionDescription,
        undefined, // No local booking ID for external flights
        airline.code
      );

      // Queue miles update notification
      publishMiles({
        memberId: member.id,
        email: member.email || 'unknown@example.com',
        milesDelta: miles,
        newBalance: Number(result.member.milesBalance),
        airlineCode: airline.code,
        occurredAt: new Date().toISOString(),
        reason: transactionDescription,
      });

      res.status(200).json({
        success: true,
        message: 'Miles added successfully',
        data: {
          memberNumber: result.member.memberNumber,
          milesAdded: miles,
          newBalance: result.member.milesBalance,
          airline: airline.name,
          transactionId: result.transaction.id,
          transactionDate: result.transaction.createdAt,
        },
      });
    } catch (error) {
      console.error('Error in external miles addition:', error);
      res.status(500).json({ 
        message: 'Error adding miles',
        error: (error as Error).message 
      });
    }
  },
};
