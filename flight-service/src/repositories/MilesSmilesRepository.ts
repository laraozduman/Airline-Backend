import { Repository, DataSource } from 'typeorm';
import { MilesSmiles } from '../entities/MilesSmiles';
import { MilesTransaction } from '../entities/MilesTransaction';

export class MilesSmilesRepository {
  private repository: Repository<MilesSmiles>;
  private transactionRepository: Repository<MilesTransaction>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(MilesSmiles);
    this.transactionRepository = dataSource.getRepository(MilesTransaction);
  }

  async createMember(userId: string, email?: string, phoneNumber?: string, address?: string): Promise<MilesSmiles> {
    const memberNumber = this.generateMemberNumber();
    
    const member = this.repository.create({
      userId,
      memberNumber,
      email,
      phoneNumber,
      address,
      milesBalance: 0,
      status: 'active',
    });

    return await this.repository.save(member);
  }

  async getMemberByUserId(userId: string): Promise<MilesSmiles | null> {
    return await this.repository.findOne({ where: { userId } });
  }

  async getMemberByMemberNumber(memberNumber: string): Promise<MilesSmiles | null> {
    return await this.repository.findOne({ where: { memberNumber } });
  }

  async getMemberById(id: string): Promise<MilesSmiles | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async addMiles(
    memberId: string,
    miles: number,
    transactionType: 'earn' | 'adjustment',
    description?: string,
    flightId?: string,
    partnerAirline?: string
  ): Promise<{ member: MilesSmiles; transaction: MilesTransaction }> {
    const member = await this.repository.findOne({ where: { id: memberId } });
    
    if (!member) {
      throw new Error('MilesSmiles member not found');
    }

    // Update balance
    member.milesBalance = Number(member.milesBalance) + miles;
    await this.repository.save(member);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      milesSmilesMemberId: memberId,
      milesAmount: miles,
      transactionType,
      description,
      flightId,
      partnerAirline,
    });

    await this.transactionRepository.save(transaction);

    return { member, transaction };
  }

  async deductMiles(
    memberId: string,
    miles: number,
    bookingId?: string,
    flightId?: string
  ): Promise<{ member: MilesSmiles; transaction: MilesTransaction }> {
    const member = await this.repository.findOne({ where: { id: memberId } });
    
    if (!member) {
      throw new Error('MilesSmiles member not found');
    }

    if (Number(member.milesBalance) < miles) {
      throw new Error('Insufficient miles balance');
    }

    // Update balance
    member.milesBalance = Number(member.milesBalance) - miles;
    await this.repository.save(member);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      milesSmilesMemberId: memberId,
      milesAmount: -miles,
      transactionType: 'redeem',
      bookingId,
      flightId,
      description: 'Miles redeemed for flight booking',
    });

    await this.transactionRepository.save(transaction);

    return { member, transaction };
  }

  async getTransactions(memberId: string): Promise<MilesTransaction[]> {
    return await this.transactionRepository.find({
      where: { milesSmilesMemberId: memberId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCompletedFlightsForMilesUpdate(date: Date): Promise<any[]> {
    // This would query bookings with flights that have landed
    // For now, returning a simple query structure
    const query = `
      SELECT 
        b.id as bookingId,
        b."milesSmilesMemberId",
        b."numberOfSeats",
        f.id as flightId,
        f.departure,
        f.arrival,
        f.price
      FROM bookings b
      INNER JOIN flights f ON b."flightId" = f.id
      WHERE b."milesSmilesMemberId" IS NOT NULL
        AND f."arrivalTime" < $1
        AND f.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM miles_transactions mt
          WHERE mt."bookingId" = b.id AND mt."transactionType" = 'earn'
        )
    `;
    
    return await this.repository.query(query, [date]);
  }

  private generateMemberNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MS${timestamp.slice(-8)}${random}`;
  }
}
