import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  flightNumber!: string;

  @Column({ type: 'varchar' })
  departure!: string;

  @Column({ type: 'varchar' })
  arrival!: string;

  @Column({ type: 'timestamp' })
  departureTime!: Date;

  @Column({ type: 'timestamp' })
  arrivalTime!: Date;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'int', default: 0 })
  bookedSeats!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', nullable: true })
  airline?: string;

  @Column({ type: 'varchar', nullable: true })
  aircraft?: string;

  @Column({ type: 'varchar', default: 'scheduled' })
  status!: 'scheduled' | 'in-flight' | 'completed' | 'cancelled';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relation to bookings defined on Booking entity to avoid circular imports

  getAvailableSeats(): number {
    return this.capacity - this.bookedSeats;
  }
}
