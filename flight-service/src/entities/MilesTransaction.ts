import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MilesSmiles } from './MilesSmiles';

@Entity('miles_transactions')
export class MilesTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  milesSmilesMemberId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  milesAmount!: number;

  @Column({ type: 'varchar' })
  transactionType!: 'earn' | 'redeem' | 'expire' | 'adjustment';

  @Column({ type: 'uuid', nullable: true })
  flightId?: string;

  @Column({ type: 'uuid', nullable: true })
  bookingId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  partnerAirline?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => MilesSmiles)
  @JoinColumn({ name: 'milesSmilesMemberId' })
  milesSmiles!: MilesSmiles;
}
