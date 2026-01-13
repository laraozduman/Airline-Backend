import { connect, Connection as AmqpConnection, Channel } from 'amqplib';

export interface QueueConfig {
  url: string;
  welcomeQueue: string;
  milesQueue: string;
}

export async function createChannel(cfg: QueueConfig) {
  const conn = await connect(cfg.url);
  const ch = await conn.createChannel();
  await ch.assertQueue(cfg.welcomeQueue, { durable: true });
  await ch.assertQueue(cfg.milesQueue, { durable: true });
  ch.prefetch(10);
  return { conn, ch };
}

export interface WelcomeMessage {
  memberId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  joinedAt?: string;
}

export interface MilesMessage {
  memberId: string;
  email: string;
  milesDelta: number;
  newBalance?: number;
  flightId?: string;
  airlineCode?: string;
  occurredAt?: string;
  reason?: string;
}
