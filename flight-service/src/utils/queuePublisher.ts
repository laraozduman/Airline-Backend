import { connect, Channel, Connection as AmqpConnection } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const WELCOME_QUEUE = process.env.WELCOME_QUEUE || 'welcome-emails';
const MILES_QUEUE = process.env.MILES_QUEUE || 'miles-updates';

let channel: any = null;
let connection: any = null;

export interface WelcomeMessage {
  memberId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  memberNumber?: string;
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

/**
 * Initialize RabbitMQ connection and channel
 */
export async function initQueue(): Promise<void> {
  try {
    connection = await connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Assert queues exist
    await channel.assertQueue(WELCOME_QUEUE, { durable: true });
    await channel.assertQueue(MILES_QUEUE, { durable: true });
    
    console.log('✅ RabbitMQ connected, queues asserted');

    // Handle connection errors
    connection.on('error', (err: any) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed, will retry on next publish');
      channel = null;
      connection = null;
    });
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    channel = null;
    connection = null;
  }
}

/**
 * Publish a welcome email message to the queue
 */
export function publishWelcome(message: WelcomeMessage): void {
  try {
    if (!channel) {
      console.warn('RabbitMQ channel not initialized, skipping welcome email queue');
      return;
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(WELCOME_QUEUE, messageBuffer, { persistent: true });
    console.log('📧 Welcome email queued for:', message.email);
  } catch (error) {
    console.error('Failed to publish welcome message:', error);
  }
}

/**
 * Publish a miles update message to the queue
 */
export function publishMiles(message: MilesMessage): void {
  try {
    if (!channel) {
      console.warn('RabbitMQ channel not initialized, skipping miles update queue');
      return;
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(MILES_QUEUE, messageBuffer, { persistent: true });
    console.log('✨ Miles update queued for:', message.email, `(${message.milesDelta > 0 ? '+' : ''}${message.milesDelta} miles)`);
  } catch (error) {
    console.error('Failed to publish miles message:', error);
  }
}

/**
 * Close RabbitMQ connection gracefully
 */
export async function closeQueue(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}
