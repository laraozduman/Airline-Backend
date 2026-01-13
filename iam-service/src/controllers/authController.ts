import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export const authController = {
  /**
   * Register new user
   * POST /auth/register
   */
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const result = await authService.register(email, password, firstName, lastName, role);

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        message: 'Registration failed', 
        error: (error as Error).message 
      });
    }
  },

  /**
   * Login endpoint for testing
   * POST /auth/login
   */
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ 
        message: 'Login failed', 
        error: (error as Error).message 
      });
    }
  },

  /**
   * Validate Firebase token
   * POST /auth/validate
   * Used by API Gateway to validate tokens
   */
  validateToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const userData = await authService.validateToken(token);

      res.status(200).json({
        valid: true,
        user: userData,
      });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(401).json({ 
        valid: false,
        message: 'Invalid token', 
        error: (error as Error).message 
      });
    }
  },

  /**
   * Get user profile by Firebase UID
   * GET /auth/user/:firebaseUid
   */
  getUserProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const { firebaseUid } = req.params;

      const user = await authService.getUserByFirebaseUid(firebaseUid as string);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ 
        message: 'Error fetching user profile', 
        error: (error as Error).message 
      });
    }
  },

  /**
   * Update user role (admin only)
   * PUT /auth/user/:userId/role
   */
  updateUserRole: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'user'].includes(role)) {
        res.status(400).json({ message: 'Valid role (admin/user) is required' });
        return;
      }

      const user = await authService.updateUserRole(userId as string, role);

      res.status(200).json({
        message: 'User role updated successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(400).json({ 
        message: 'Error updating user role', 
        error: (error as Error).message 
      });
    }
  },

  /**
   * Deactivate user account
   * DELETE /auth/user/:userId
   */
  deactivateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      await authService.deactivateUser(userId as string);

      res.status(200).json({
        message: 'User deactivated successfully',
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(400).json({ 
        message: 'Error deactivating user', 
        error: (error as Error).message 
      });
    }
  },
};
