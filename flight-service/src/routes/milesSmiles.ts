import express from 'express';
import { milesSmilesController } from '../controllers/milesSmiles';
import { authenticate, adminOnly } from '../middleware/auth';
import { airlineAuth } from '../middleware/airlineAuth';

const router = express.Router();

// External airline API - requires airline authentication (no user auth)
router.post('/external/add-miles', airlineAuth, milesSmilesController.externalAddMiles);

// All other routes require user authentication
router.use(authenticate);

// User routes - get own profile and transactions
router.get('/profile', milesSmilesController.getMyProfile);
router.get('/transactions', milesSmilesController.getMyTransactions);
router.get('/member/:userId', milesSmilesController.getMemberByUserId);

// Admin/Partner routes - require admin access
router.post('/add-miles', adminOnly, milesSmilesController.addMilesToAccount);
router.post('/process-completed-flights', adminOnly, milesSmilesController.processCompletedFlights);
router.get('/members', adminOnly, milesSmilesController.getAllMembers);

export default router;
