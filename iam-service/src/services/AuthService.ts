import { auth } from '../config/firebase';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { Repository } from 'typeorm';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export class AuthService {
  private userRepository!: Repository<User>;

  constructor() {
    // Repository will be initialized lazily when needed
  }

  private async getUserRepository(): Promise<Repository<User>> {
    if (!this.userRepository) {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      this.userRepository = AppDataSource.getRepository(User);
    }
    return this.userRepository;
  }

  /**
   * Register a new user with Firebase and create profile in database
   */
  async register(email: string, password: string, firstName?: string, lastName?: string, role: 'admin' | 'user' = 'user') {
    try {
      const userRepository = await this.getUserRepository();
      
      // Create user in Firebase
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: `${firstName || ''} ${lastName || ''}`.trim(),
      });

      // Create user profile in database
      const user = userRepository.create({
        firebaseUid: firebaseUser.uid,
        email,
        firstName,
        lastName,
        role,
        isActive: true,
      });

      await userRepository.save(user);

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
      const userRepository = await this.getUserRepository();
      
      // Get user from Firebase by email
      const firebaseUser = await auth.getUserByEmail(email);
      
      // Get user from database
      const user = await userRepository.findOne({
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
      const userRepository = await this.getUserRepository();
      
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Get user from database
      const user = await userRepository.findOne({
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
    const userRepository = await this.getUserRepository();
    return await userRepository.findOne({
      where: { firebaseUid },
    });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const userRepository = await this.getUserRepository();
    return await userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Update user role (admin operation)
   */
  async updateUserRole(userId: string, role: 'admin' | 'user') {
    const userRepository = await this.getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.role = role;
    await userRepository.save(user);

    return user;
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string) {
    const userRepository = await this.getUserRepository();
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    await userRepository.save(user);

    // Disable in Firebase as well
    await auth.updateUser(user.firebaseUid, {
      disabled: true,
    });

    return user;
  }
}
