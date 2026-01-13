# Notification Service

Always-on consumer for MilesSmiles notifications. Uses RabbitMQ queues and Gmail SMTP.

## Endpoints
- `GET /health` — service status
- `POST /partners/miles` — authenticated (Bearer PARTNER_API_TOKEN). Body: `{ memberId, email, milesDelta, newBalance?, flightId?, airlineCode?, occurredAt?, reason? }`
- `POST /tasks/process` — authenticated (Bearer SCHEDULER_TOKEN). Drains `welcome-emails` and `miles-updates` queues, sends emails.

## Environment
```
PORT=4000
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
WELCOME_QUEUE=welcome-emails
MILES_QUEUE=miles-updates
PARTNER_API_TOKEN=change-me
SCHEDULER_TOKEN=change-me-scheduler
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Your Name <your@gmail.com>
```

## Run locally
```
cd notification-service
npm install
npm run dev   # or npm run build && npm start
```

## Docker
```
docker build -t notification-service .
docker run -p 4000:4000 \
  -e RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672 \
  -e PARTNER_API_TOKEN=secret \
  -e SCHEDULER_TOKEN=sched-secret \
  -e SMTP_HOST=smtp.gmail.com -e SMTP_PORT=465 \
  -e SMTP_USER=your@gmail.com -e SMTP_PASS=app-pass \
  notification-service
```

## Cloud Scheduler
- Create job → HTTP target → `POST https://<notif-service>/tasks/process`
- Header: `Authorization: Bearer <SCHEDULER_TOKEN>`
- Cron: `0 2 * * *` (nightly)
