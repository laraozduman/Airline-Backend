import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/validate', authController.validateToken);

// User management routes (should be protected by API Gateway)
router.get('/user/:firebaseUid', authController.getUserProfile);
router.put('/user/:userId/role', authController.updateUserRole);
router.delete('/user/:userId', authController.deactivateUser);

export default router;
