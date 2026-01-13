import cron from 'node-cron';
import { AppDataSource } from '../config/data-source';
import { FlightRepository } from '../repositories/FlightRepository';
import { MilesSmilesRepository } from '../repositories/MilesSmilesRepository';
import { BookingRepository } from '../repositories/BookingRepository';
import { EmailService } from '../services/EmailService';

const emailService = new EmailService();

/**
 * Nightly process to update miles for completed flights
 * Runs every day at 2:00 AM
 */
export function startMilesUpdateScheduler() {
  // Run at 2:00 AM every day 
  cron.schedule('0 2 * * *', async () => {
    console.log('🕒 Starting nightly miles update process...');
    
    try {
      const flightRepo = new FlightRepository(AppDataSource);
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      const bookingRepo = new BookingRepository(AppDataSource);
      
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log(`📅 Processing completed flights from ${yesterday.toISOString()}`);
      
      // Get all flights that completed yesterday
      const completedFlights = await AppDataSource
        .createQueryBuilder()
        .select('flight')
        .from('flights', 'flight')
        .where('DATE(flight.arrivalTime) = DATE(:yesterday)', { yesterday })
        .andWhere('flight.status = :status', { status: 'completed' })
        .getMany();
      
      console.log(`✈️  Found ${completedFlights.length} completed flights`);
      
      let totalMembersUpdated = 0;
      let totalMilesAdded = 0;
      
      for (const flight of completedFlights) {
        // Get all bookings for this flight with MilesSmiles members
        const bookings = await bookingRepo.getBookingsByFlightId(flight.id);
        
        for (const booking of bookings) {
          if (booking.milesSmilesMemberId) {
            // Calculate miles earned (1 mile per $1 spent)
            const milesEarned = Math.floor(Number(booking.totalPrice));
            
            // Add miles to member account
            await milesRepo.addMiles(booking.milesSmilesMemberId, milesEarned, 'earn', `Flight ${flight.flightNumber} from ${flight.departureAirport} to ${flight.arrivalAirport}`, booking.id);
            
            // Get updated member info for email
            const member = await milesRepo.getMemberById(booking.milesSmilesMemberId);
            if (member && member.user) {
              // Send email notification
              await emailService.sendMilesUpdateEmail(
                member.user.email,
                member.user.firstName || 'Valued Member',
                milesEarned,
                Number(member.milesBalance)
              );
              
              totalMembersUpdated++;
              totalMilesAdded += milesEarned;
            }
          }
        }
      }
      
      console.log(`✅ Miles update complete: ${totalMembersUpdated} members updated, ${totalMilesAdded} total miles added`);
    } catch (error) {
      console.error('❌ Error in nightly miles update:', error);
    }
  });
  
  console.log('✅ Miles update scheduler started (runs daily at 2:00 AM)');
}

/**
 * Process to send welcome emails to new members from queue
 * Runs every 5 minutes
 */
export function startWelcomeEmailScheduler() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('📧 Checking for new members to send welcome emails...');
    
    try {
      const milesRepo = new MilesSmilesRepository(AppDataSource);
      
      // Get members who joined in the last 10 minutes and haven't received welcome email
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
      
      const newMembers = await AppDataSource
        .createQueryBuilder()
        .select('member')
        .from('miles_smiles', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.createdAt >= :tenMinutesAgo', { tenMinutesAgo })
        .getMany();
      
      if (newMembers.length > 0) {
        console.log(`👥 Found ${newMembers.length} new members`);
        
        for (const member of newMembers) {
          if (member.user) {
            try {
              await emailService.sendWelcomeEmail(
                member.user.email,
                member.user.firstName || 'Valued Member',
                member.memberNumber
              );
              console.log(`✅ Sent welcome email to ${member.user.email}`);
            } catch (error) {
              console.error(`❌ Failed to send welcome email to ${member.user.email}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in welcome email scheduler:', error);
    }
  });
  
  console.log('✅ Welcome email scheduler started (runs every 5 minutes)');
}
