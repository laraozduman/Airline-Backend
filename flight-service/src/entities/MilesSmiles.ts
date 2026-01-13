import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('miles_smiles')
export class MilesSmiles {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  memberNumber!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  milesBalance!: number;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @Column({ type: 'varchar', default: 'active' })
  status!: 'active' | 'inactive' | 'suspended';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Transactions relation defined on MilesTransaction to avoid circular imports
}
