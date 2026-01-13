import { auth } from '../config/firebase';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { Repository } from 'typeorm';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Register a new user with Firebase and create profile in database
   */
  async register(email: string, password: string, firstName?: string, lastName?: string, role: 'admin' | 'user' = 'user') {
    try {
      // Create user in Firebase
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: `${firstName || ''} ${lastName || ''}`.trim(),
      });

      // Create user profile in database
      const user = this.userRepository.create({
        firebaseUid: firebaseUser.uid,
        email,
        firstName,
        lastName,
        role,
        isActive: true,
      });

      await this.userRepository.save(user);

      // Generate JWT token
      const payload = {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
      };
      const options: SignOptions = {
        expiresIn: '24h',
      };
      const token = jwt.sign(payload, JWT_SECRET, options);

      return {
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
        expiresIn: JWT_EXPIRES_IN,
      };
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new Error('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Login user and get JWT token
   */
  async login(email: string, password: string) {
    try {
      // Get user from Firebase by email
      const firebaseUser = await auth.getUserByEmail(email);
      
      // Get user from database
      const user = await this.userRepository.findOne({
        where: { firebaseUid: firebaseUser.uid },
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // Generate JWT token
      const payload = {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
      };
      const options: SignOptions = {
        expiresIn: '24h',
      };
      const token = jwt.sign(payload, JWT_SECRET, options);

      return {
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
        expiresIn: JWT_EXPIRES_IN,
      };
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Validate JWT token and return user data
   */
  async validateToken(token: string) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Get user from database
      const user = await this.userRepository.findOne({
        where: { firebaseUid: decoded.firebaseUid },
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      return {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token format');
      }
      throw error;
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByFirebaseUid(firebaseUid: string) {
    return await this.userRepository.findOne({
      where: { firebaseUid },
    });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Update user role (admin operation)
   */
  async updateUserRole(userId: string, role: 'admin' | 'user') {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.role = role;
    await this.userRepository.save(user);

    return user;
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    // Disable in Firebase as well
    await auth.updateUser(user.firebaseUid, {
      disabled: true,
    });

    return user;
  }
}
