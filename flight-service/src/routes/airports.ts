import express from 'express';
import { airportController } from '../controllers/airport';
import { authenticate, adminOnly } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', airportController.getAllAirports);
router.get('/search', airportController.searchAirports);
router.get('/:code', airportController.getAirportByCode);

// Admin routes
router.post('/', authenticate, adminOnly, airportController.createAirport);
router.put('/:code', authenticate, adminOnly, airportController.updateAirport);
router.delete('/:code', authenticate, adminOnly, airportController.deleteAirport);
router.post('/cache/warm-up', authenticate, adminOnly, airportController.warmUpCache);

export default router;
