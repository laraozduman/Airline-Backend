import express from 'express';
import { bookingController } from '../controllers/booking';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

// Buy a ticket
router.post('/', bookingController.buyTicket);

// Get user's bookings
router.get('/my-bookings', bookingController.getMyBookings);

// Get booking by reference
router.get('/reference/:reference', bookingController.getBookingByReference);

// Cancel booking
router.delete('/:id', bookingController.cancelBooking);

export default router;
