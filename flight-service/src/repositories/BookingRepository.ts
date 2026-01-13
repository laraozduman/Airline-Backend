import { Repository, DataSource } from 'typeorm';
import { Booking } from '../entities/Booking';
import { AppDataSource } from '../config/data-source';

export class BookingRepository {
  private repository: Repository<Booking>;

  constructor(dataSource?: DataSource) {
    this.repository = (dataSource || AppDataSource).getRepository(Booking);
  }

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    const bookingReference = this.generateBookingReference();
    const booking = this.repository.create({
      ...data,
      bookingReference,
      status: data.status || 'confirmed',
      milesUsed: data.milesUsed || 0,
      cashAmount: data.cashAmount || 0,
      paymentMethod: data.paymentMethod || 'cash',
    });
    return await this.repository.save(booking);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['flight', 'user'],
    });
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['flight'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBookingsByFlightId(flightId: string): Promise<Booking[]> {
    return await this.repository.find({
      where: { flightId },
      relations: ['user'],
    });
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    await this.repository.update(id, updates);
    return await this.getBookingById(id);
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getAllBookings(): Promise<Booking[]> {
    return await this.repository.find({
      relations: ['flight', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    return await this.repository.findOne({
      where: { bookingReference: reference },
      relations: ['flight', 'user'],
    });
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.repository.findOne({ where: { id } });
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    booking.status = 'cancelled';
    return await this.repository.save(booking);
  }

  private generateBookingReference(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let reference = '';
    for (let i = 0; i < 6; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return reference;
  }
}
