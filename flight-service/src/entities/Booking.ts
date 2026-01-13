import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Flight } from './Flight';
import { User } from './User';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  flightId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  passengerEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  passengerName?: string;

  @Column({ type: 'int', default: 1 })
  numberOfSeats!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ type: 'varchar', default: 'confirmed' })
  status!: 'pending' | 'confirmed' | 'cancelled';

  @Column({ type: 'varchar', nullable: true })
  bookingReference?: string;

  @Column({ type: 'uuid', nullable: true })
  milesSmilesMemberId?: string;

  @Column({ type: 'varchar', default: 'cash' })
  paymentMethod!: 'cash' | 'miles' | 'mixed';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  milesUsed!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cashAmount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Flight)
  @JoinColumn({ name: 'flightId' })
  flight!: Flight;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
