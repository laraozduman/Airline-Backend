import { Router } from 'express';
import { flightController } from '../controllers/flight';
import { authenticate, adminOnly } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/search', flightController.searchFlights);
router.get('/', flightController.getAllFlights);
router.get('/:id', flightController.getFlightById);
router.get('/:id/available-seats', flightController.getAvailableSeats);

// Protected admin routes
router.post('/', authenticate, adminOnly, flightController.addFlight);
router.put('/:id', authenticate, adminOnly, flightController.updateFlight);
router.delete('/:id', authenticate, adminOnly, flightController.deleteFlight);

export default router;
