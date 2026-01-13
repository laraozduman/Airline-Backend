import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/User';
import { AppDataSource } from '../config/data-source';

export class UserRepository {
  private repository: Repository<User>;

  constructor(dataSource?: DataSource) {
    this.repository = (dataSource || AppDataSource).getRepository(User);
  }

  async createUser(firebaseUid: string, email: string, role: 'admin' | 'user' = 'user', firstName?: string, lastName?: string): Promise<User> {
    const user = this.repository.create({
      firebaseUid,
      email,
      role,
      firstName,
      lastName,
      isActive: true,
    });
    return await this.repository.save(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.repository.findOneBy({ email });
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return await this.repository.findOneBy({ firebaseUid });
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.repository.findOneBy({ id });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updates);
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.repository.find();
  }

  async getUserCount(): Promise<number> {
    return await this.repository.count();
  }
}
