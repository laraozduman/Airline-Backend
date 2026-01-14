import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: '/app/.env' });
import { createChannel, QueueConfig, WelcomeMessage, MilesMessage } from './queues';
import { sendEmail } from './email';


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const WELCOME_QUEUE = process.env.WELCOME_QUEUE || 'welcome-emails';
const MILES_QUEUE = process.env.MILES_QUEUE || 'miles-updates';
const PARTNER_TOKEN = process.env.PARTNER_API_TOKEN || 'changeme';
const SCHEDULER_TOKEN = process.env.SCHEDULER_TOKEN || 'changeme-scheduler';

let channel: any;
let connection: any;

function authBearer(expected: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (token !== expected) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', queues: { welcome: WELCOME_QUEUE, miles: MILES_QUEUE } });
});

// Partner pushes miles events -> enqueue
app.post('/partners/miles', authBearer(PARTNER_TOKEN), async (req, res) => {
  const body = req.body as MilesMessage;
  if (!body?.memberId || !body?.email || typeof body.milesDelta !== 'number') {
    return res.status(400).json({ error: 'memberId, email, milesDelta required' });
  }
  channel.sendToQueue(MILES_QUEUE, Buffer.from(JSON.stringify(body)), { persistent: true });
  res.json({ status: 'queued' });
});

// Scheduler-triggered: process queued messages (welcome + miles)
app.post('/tasks/process', authBearer(SCHEDULER_TOKEN), async (_req, res) => {
  const results: any = { welcomeSent: 0, milesSent: 0, errors: 0 };
  // Drain welcome queue
  results.welcomeSent = await drainQueue<WelcomeMessage>(WELCOME_QUEUE, handleWelcomeEmail);
  // Drain miles queue
  results.milesSent = await drainQueue<MilesMessage>(MILES_QUEUE, handleMilesEmail);
  res.json({ status: 'completed', ...results });
});

async function handleWelcomeEmail(msg: WelcomeMessage) {
  const name = [msg.firstName, msg.lastName].filter(Boolean).join(' ') || 'there';
  await sendEmail({
    to: msg.email,
    subject: 'Welcome to MilesSmiles',
    html: `<p>Hi ${name},</p><p>Welcome to MilesSmiles! Your member ID: ${msg.memberId}.</p>`
  });
}

async function handleMilesEmail(msg: MilesMessage) {
  const name = 'MilesSmiles member';
  const milesLine = msg.newBalance !== undefined
    ? `<p>New balance: <b>${msg.newBalance}</b> miles.</p>`
    : '';
  const reason = msg.reason ? `<p>Reason: ${msg.reason}</p>` : '';
  const flight = msg.flightId ? `<p>Flight: ${msg.flightId}</p>` : '';
  const airline = msg.airlineCode ? `<p>Airline: ${msg.airlineCode}</p>` : '';
  await sendEmail({
    to: msg.email,
    subject: 'Miles added to your account',
    html: `<p>Hi ${name},</p><p>We added <b>${msg.milesDelta}</b> miles to your account.</p>${milesLine}${reason}${flight}${airline}`
  });
}

async function drainQueue<T>(queueName: string, handler: (msg: T) => Promise<void>) {
  let count = 0;
  while (true) {
    const msg = await channel.get(queueName, { noAck: false });
    if (!msg) break;
    try {
      const content = JSON.parse(msg.content.toString()) as T;
      await handler(content);
      channel.ack(msg);
      count++;
    } catch (err) {
      console.error(`Error processing ${queueName}:`, (err as Error).message);
      channel.nack(msg, false, false); // dead-letter instead of requeue
    }
  }
  return count;
}

async function start() {
  const cfg: QueueConfig = {
    url: RABBITMQ_URL,
    welcomeQueue: WELCOME_QUEUE,
    milesQueue: MILES_QUEUE,
  };
  const { conn, ch } = await createChannel(cfg);
  connection = conn;
  channel = ch;
  app.listen(PORT, () => {
    console.log(`Notification service on :${PORT}`);
    console.log(`Queues -> welcome: ${WELCOME_QUEUE}, miles: ${MILES_QUEUE}`);
  });
}

start().catch((err) => {
  console.error('Failed to start notification service:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await channel?.close();
  await connection?.close();
  process.exit(0);
});
