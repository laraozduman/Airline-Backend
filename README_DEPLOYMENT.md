# Airline Ticketing System - Complete Documentation

A microservices-based airline ticketing platform built with Node.js, TypeScript, and Python. This system provides flight booking, user authentication, Miles&Smiles loyalty program, and AI-powered price predictions.

---

## 📍 Deployed URLs (Google Cloud Run - europe-west1)

### Production Services
| Service | URL | Status |
|---------|-----|--------|
| **IAM Service** | `https://iam-service-882344695975.europe-west1.run.app` | ✅ Active |
| **Flight Service** | `https://flight-service-882344695975.europe-west1.run.app` | ✅ Active |
| **ML Service** | `https://ml-service-882344695975.europe-west1.run.app` | ✅ Active |
| **API Gateway** | `https://gateway-882344695975.europe-west1.run.app` | ✅ Active |
| **Cloud SQL** | `airline-backend:europe-west1:airline-db` | ✅ Active |

### Health Checks
```bash
# IAM Service Health
curl https://iam-service-882344695975.europe-west1.run.app/health

# Flight Service Health
curl https://flight-service-882344695975.europe-west1.run.app/health

# ML Service Health
curl https://ml-service-882344695975.europe-west1.run.app/health
```

---

## 🏗️ System Architecture

### Microservices Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌──────────────────────────────┐
│   API Gateway (Express)      │  - Request routing & rate limiting
│   - Auth proxy to IAM        │  - CORS handling
│   - Load balancing           │  - Token validation
└──────────────┬───────────────┘
       │       │       │
       v       v       v
┌─────────────────────────────────────────────────────────┐
│           Microservices Layer                           │
├──────────────────┬──────────────────┬──────────────────┤
│  IAM Service     │ Flight Service   │  ML Service      │
│  (Firebase Auth) │ (Core Business)  │  (Price Predict) │
├──────────────────┼──────────────────┼──────────────────┤
│ • User auth      │ • Flights CRUD   │ • ML Models      │
│ • Token validate │ • Bookings       │ • Price predict  │
│ • Profile mgmt   │ • Miles&Smiles   │ • Feature eng    │
│ • Role mgmt      │ • Airports       │                  │
└──────────────────┴──────────────────┴──────────────────┘
       │               │                     │
       v               v                     v
┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
│ Cloud SQL   │  │ Redis Cache  │  │ RabbitMQ Queue  │
│ PostgreSQL  │  │              │  │                 │
└─────────────┘  └──────────────┘  └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API** | Express.js, TypeScript | REST API framework |
| **Auth** | Firebase Admin SDK | User authentication & JWT |
| **Database** | PostgreSQL + TypeORM | Primary data store |
| **Cache** | Redis | Session & query caching |
| **Message Queue** | RabbitMQ | Async email & event processing |
| **ML** | Python 3.11, scikit-learn | Price prediction |
| **Deployment** | Google Cloud Run | Serverless container platform |
| **CI/CD** | GitHub Actions | Automated deployments |
| **IaC** | Docker | Container orchestration |

---

## 🗄️ Data Models (Entity Relationship Diagram)

### ER Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│      Users       │         │    Airports      │
├──────────────────┤         ├──────────────────┤
│ id (UUID) [PK]   │         │ id (UUID) [PK]   │
│ firebaseUid      │         │ code (VARCHAR)   │
│ email            │         │ name             │
│ role             │         │ city             │
│ firstName        │         │ country          │
│ lastName         │         │ timezone         │
│ isActive         │         │ isActive         │
│ createdAt        │         │ createdAt        │
│ updatedAt        │         │ updatedAt        │
└──────────────────┘         └──────────────────┘


        │
        │ 1
        │
        v N
    ┌───────────────────────┐
    │      Flights          │
    ├───────────────────────┤
    │ id (UUID) [PK]        │
    │ flightNumber          │
    │ departure             │ ◄─── Airport code (VARCHAR)
    │ arrival               │ ◄─── Airport code (VARCHAR)
    │ departureTime         │
    │ arrivalTime           │
    │ capacity              │
    │ bookedSeats           │
    │ price                 │
    │ airline               │
    │ aircraft              │
    │ status                │
    │ createdAt             │
    │ updatedAt             │
    └───────────────────────┘
        │
        │ 1
        │
        v N
    ┌────────────────────────────┐
    │      Bookings              │
    ├────────────────────────────┤
    │ id (UUID) [PK]             │
    │ flightId (UUID) [FK]       │
    │ userId (UUID) [FK]         │
    │ passengerEmail             │
    │ passengerName              │
    │ numberOfSeats              │
    │ totalPrice                 │
    │ status                     │
    │ bookingReference           │
    │ milesSmilesMemberId (FK)   │
    │ paymentMethod              │
    │ milesUsed                  │
    │ cashAmount                 │
    │ createdAt                  │
    │ updatedAt                  │
    └────────────────────────────┘
        │              ▲
        │ 1            │
        │              │ N
        └──────────────┘


┌────────────────────────┐         ┌──────────────────────────┐
│   MilesSmiles          │         │  MilesTransactions       │
├────────────────────────┤         ├──────────────────────────┤
│ id (UUID) [PK]         │    N    │ id (UUID) [PK]           │
│ memberNumber           ├─────────┤ milesSmilesMemberId (FK) │
│ userId (UUID) [FK]     │    1    │ milesAmount              │
│ email                  │         │ transactionType          │
│ milesBalance           │         │ flightId (UUID)          │
│ phoneNumber            │         │ bookingId (UUID)         │
│ address                │         │ description              │
│ status                 │         │ partnerAirline           │
│ createdAt              │         │ createdAt                │
│ updatedAt              │         └──────────────────────────┘
└────────────────────────┘

     │
     │ 1:1
     │
     v
┌─────────────┐
│   Users     │
└─────────────┘
```

### Entity Descriptions

#### **Users**
- Stores user account information
- Linked to Firebase for authentication
- Supports role-based access (admin/user)
- Indexes on firebaseUid and email for fast lookups

#### **Flights**
- Flight information and scheduling
- Tracks capacity and booked seats
- Supports flight status management (scheduled, in-flight, completed, cancelled)
- Prices stored as decimal for financial accuracy

#### **Bookings**
- User flight reservations
- Tracks payment method (cash/miles/mixed)
- Links users to flights through flightId and userId
- Integrates with Miles&Smiles for loyalty program

#### **MilesSmiles**
- Loyalty program membership
- Unique member number per user
- Tracks miles balance
- Status management (active/inactive/suspended)

#### **MilesTransactions**
- Audit trail for all miles operations
- Transaction types: earn, redeem, expire, adjustment
- Links to flights and bookings for traceability
- Supports partner airline attribution

#### **Airports**
- IATA code reference database
- Timezone information for scheduling
- Used for flight origin/destination validation

---

## 🎯 Design Decisions & Assumptions

### 1. **Microservices Architecture**
**Why:** Enables independent scaling, deployment, and technology choices per service
- **IAM Service**: Handles authentication/authorization in isolation
- **Flight Service**: Core business logic with separate database
- **ML Service**: Python-based ML predictions without Node.js overhead

**Trade-off:** Increased operational complexity; managed with Docker & Cloud Run

---

### 2. **Cloud SQL + Socket-Based Connection**
**Why:** Google Cloud SQL provides managed PostgreSQL with automatic backups and high availability
- **Issue Encountered:** Initial attempts to use localhost:5432 failed in Cloud Run
- **Solution:** Implemented Cloud SQL Unix socket connection at `/cloudsql/INSTANCE_CONNECTION_NAME`
- **Implementation:** TypeORM detects Cloud Run environment via `K_SERVICE` env var and uses appropriate connection method

```typescript
// Automatic detection in data-source.ts
const isCloudRun = process.env.K_SERVICE !== undefined;
if (isCloudRun) {
  host: `/cloudsql/${INSTANCE_CONNECTION_NAME}` // Unix socket
} else {
  host: 'localhost' // Local development
}
```

---

### 3. **Redis Caching Layer**
**Purpose:** 
- Session management
- Query result caching
- Rate limiting counters
- Real-time flight availability

**Why:** Reduces database load; improves response times for frequently accessed data

---

### 4. **RabbitMQ Message Queue**
**Purpose:**
- Asynchronous email notifications
- Miles transaction logging
- Booking confirmations
- Welcome emails

**Assumptions:**
- Email delivery doesn't block booking response
- At-least-once delivery semantic acceptable for notifications
- Order preservation for single user's transactions

---

### 5. **JWT-Based Authentication**
**Design:**
- Firebase Admin SDK validates tokens
- API Gateway extracts user info from token claims
- Services trust the gateway's auth middleware

**Assumption:** API Gateway always validates before routing to services

---

### 6. **Miles&Smiles Loyalty Program**
**Features:**
- Optional membership during booking
- 1 mile = $0.01 for redemption
- 10% of cash spent converted to miles
- Transaction audit trail

**Assumption:** Miles never expire in current implementation (future: add expiration logic)

---

### 7. **ML Price Prediction**
**Model:** Random Forest Regressor
**Features Used:**
- Categorical: airline, source_city, class, destination
- Numeric: stops, days_left, duration, departure/arrival times (hour, day, month)

**Assumptions:**
- Historical data patterns continue into future
- No major market disruptions affecting pricing
- Model retraining monthly from booking data

---
**Assumptions:**
- There is no external miles adding page, assumed to be implemented to a different webpage
- The endpoint is in working order with loyalty airline codes kept in the google cloud secrets 

## ⚠️ Issues Encountered & Resolutions

### Issue 1: Environment Variables Not Loading in Cloud Run
**Problem:** Flight service attempted to connect to `127.0.0.1:5432` despite setting database credentials

**Root Cause:** Cloud Run shows "0 environment variables" in dashboard even when set

**Solution:** 
- Hardcoded `NODE_ENV = 'production'` in index.ts
- Removed dependency on NODE_ENV for critical features
- Updated data-source.ts to use Cloud SQL socket path on Cloud Run

**Status:** ✅ Resolved

---

### Issue 2: Database Credential Not Matching
**Problem:** FATAL password authentication failed for user "postgres"

**Root Cause:** TypeORM fallback values overrode environment variables during initialization

**Diagnosis:** Checked error logs showing fallback username "postgres" was correct, confirming env vars loaded

**Solution:** Added explicit type annotation for response data in IAM service:
```typescript
const milesData = await response.json() as { milesBalance?: number };
```

**Status:** ✅ Resolved

---

### Issue 3: ML Service Module Not Found
**Problem:** `ModuleNotFoundError: No module named 'app'`

**Root Cause:** Gunicorn command using `sh -c` wrapper prevented proper module resolution

**Solution:** Updated Dockerfile to:
- Use `exec` to run gunicorn as PID 1
- Proper environment variable expansion
- Added logging flags for Cloud Run visibility

```dockerfile
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 300 \
    --access-logfile - --error-logfile - app:app
```

**Status:** ✅ Resolved

---

### Issue 4: Type Error - Invalid Transaction Type
**Problem:** `Argument of type '"booking"' is not assignable to parameter of type '"earn" | "adjustment"'`

**Root Cause:** Using unsupported transaction type in booking controller

**Solution:** Changed `'booking'` to `'earn'` to match repository enum

**Status:** ✅ Resolved

---

### Issue 5: Cloud Run Gunicorn Port Binding
**Problem:** ML service failing to respect Cloud Run PORT environment variable

**Solution:** Updated Dockerfile CMD to use PORT env var with fallback:
```dockerfile
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
CMD exec gunicorn --bind 0.0.0.0:$PORT ...
```

**Status:** ✅ Resolved

---

## 🚀 Deployment Guide

### Deploying to Cloud Run

#### 1. **Flight Service**
```bash
gcloud run deploy flight-service \
  --source ./flight-service \
  --region europe-west1 \
  --service-account=airline-backend@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances=PROJECT_ID:europe-west1:airline-db \
  --set-env-vars INSTANCE_CONNECTION_NAME=PROJECT_ID:europe-west1:airline-db,DB_USERNAME=postgres,DB_NAME=airline,DB_PORT=5432 \
  --set-secrets DB_PASSWORD=FLIGHT_DB_PASSWORD:latest \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300
```

#### 2. **IAM Service**
```bash
gcloud run deploy iam-service \
  --source ./iam-service \
  --region europe-west1 \
  --service-account=airline-backend@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances=PROJECT_ID:europe-west1:airline-db \
  --set-secrets /app/.env=iam-service-env:latest \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=1Gi
```

#### 3. **ML Service**
```bash
gcloud run deploy ml-service \
  --source ./ml-service \
  --region europe-west1 \
  --set-secrets /app/.env=ml-service-env:latest \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300
```

### Local Development

```bash
# Start services (separate terminals)
docker-compose up -d  # PostgreSQL, Redis, RabbitMQ

cd iam-service && npm install && npm run dev
cd flight-service && npm install && npm run dev
cd ml-service && pip install -r requirements.txt && python app.py
```

---

## 📊 API Endpoints Summary

### Authentication (IAM Service)
```
POST   /v1/auth/register           - Register new user
POST   /v1/auth/login              - Login with email/password
POST   /v1/auth/validate           - Validate JWT token
GET    /v1/auth/profile            - Get current user profile
GET    /health                     - Service health check
```

### Flights (Flight Service)
```
GET    /v1/flights                 - List flights
POST   /v1/flights                 - Create flight (admin)
PUT    /v1/flights/:id             - Update flight (admin)
DELETE /v1/flights/:id             - Delete flight (admin)
GET    /v1/flights/search          - Search flights
```

### Bookings (Flight Service)
```
POST   /v1/bookings                - Create booking
GET    /v1/bookings/my-bookings    - Get user's bookings
GET    /v1/bookings/reference/:ref - Get booking by reference
DELETE /v1/bookings/:id            - Cancel booking
```

### Miles&Smiles (Flight Service)
```
GET    /v1/miles-smiles/profile    - Get membership profile
GET    /v1/miles-smiles/transactions - Get miles history
POST   /v1/miles-smiles/add-miles  - Add miles (admin)
POST   /v1/miles-smiles/external/add-miles - Add miles (airline API)
```

### ML Predictions (ML Service)
```
GET    /health                     - Service health
GET    /model-info                 - ML model information
POST   /predict                    - Get price prediction
```

---

## 🔒 Security Considerations

1. **Secrets Management**: Sensitive credentials stored in Google Secret Manager
2. **Environment Isolation**: Separate `.env` files per service
3. **Cloud SQL IAM**: Service account restricted to specific database
4. **JWT Validation**: All protected endpoints validate tokens
5. **Rate Limiting**: Express rate limit middleware on public endpoints
6. **CORS**: Configured per service for cross-origin requests

---

## 📈 Performance Optimizations

1. **Database Indexes**: Composite indexes on frequently queried fields
2. **Redis Caching**: Flight search results, user profiles cached
3. **Connection Pooling**: TypeORM connection pool for database
4. **Async Processing**: RabbitMQ for non-blocking operations
5. **Cloud Run Auto-scaling**: Horizontal scaling based on CPU/memory

---

## 🔧 Future Improvements

4. **Monitoring**: Add Prometheus + Grafana for metrics
5. **Caching Strategy**: Implement cache invalidation strategy
6. **Load Testing**: Automated performance testing in CI/CD
7. **Database Replication**: Read replicas for reporting

---


Lara Özduman
22070006044