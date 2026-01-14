# Airline Ticketing System Backend

A comprehensive Node.js/Express backend API for an airline management system similar to Turkish Airlines. Built with TypeScript, this system includes flight management, user authentication, and booking capabilities.

## 🚀 Features

- ✅ **Admin Flight Management** - Add, update, delete, and search flights
- ✅ **Role-Based Access Control** - Separate admin and user roles
- ✅ **User Authentication** - Login and registration with token-based auth
- ✅ **Flight Search** - Search flights by route and date
- ✅ **Seat Management** - Track available seats and capacity
- ✅ **TypeScript** - Full type safety with strict mode enabled
- ✅ **Express.js** - Fast and minimal web framework
- ✅ **CORS Enabled** - Cross-origin request support

## 📋 Prerequisites

- Node.js v18+ 
- npm 
- TypeScript knowledge 

## 🔧 Installation

1. Clone the repository:
```bash
cd Airline-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. (Optional) Update environment variables in `.env` as needed.

## � Production URLs

The application is deployed on Google Cloud Run:
- **API Gateway:** `https://gateway-882344695975.europe-west1.run.app`
- **IAM Service:** `https://iam-service-882344695975.europe-west1.run.app`
- **Flight Service:** `https://flight-service-882344695975.europe-west1.run.app`
- **ML Service:** `https://ml-service-882344695975.europe-west1.run.app`
- **Database:** Cloud SQL PostgreSQL (europe-west1)

## 📚 Development

### Start Development Server
```bash
npm run dev
```
The server will run on `http://localhost:8080` with hot reload enabled.

### Build for Production
```bash
npm run build
```
This compiles TypeScript to JavaScript in the `dist/` folder.

### Start Production Server
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Flights
- `GET /api/flights` - Get all flights
- `GET /api/flights/search?departure=IST&arrival=JFK` - Search flights
- `GET /api/flights/:id` - Get specific flight
- `GET /api/flights/:id/available-seats` - Get available seats
- `POST /api/flights` - Add new flight (Admin only)
- `PUT /api/flights/:id` - Update flight (Admin only)
- `DELETE /api/flights/:id` - Delete flight (Admin only)

### Health Check
- `GET /api/health` - Server health status

## 🔐 Default Admin Credentials

For testing purposes:
```
Email: admin@airlines.com
Password: admin123
```

⚠️ **Important:** Change these credentials in production!

## 📖 Project Structure

```
src/
├── index.ts                    # Application entry point
├── config/
│   └── server.ts              # Server configuration
├── controllers/
│   ├── auth.ts               # Authentication logic
│   └── flight.ts             # Flight management logic
├── middleware/
│   └── auth.ts               # Auth & authorization middleware
├── models/
│   ├── types.ts              # TypeScript interfaces
│   ├── flight.ts             # Flight data model
│   └── user.ts               # User data model
└── routes/
    ├── auth.ts               # Authentication routes
    └── flights.ts            # Flight routes

dist/                           # Compiled JavaScript (generated)
API_DOCUMENTATION.md           # Detailed API documentation
test-api.ts                    # API testing script
```

## 🧪 Testing the API

### Using the Test Script
```bash
npx ts-node test-api.ts
```

### Using cURL (Production)

#### 1. Register User
```bash
curl -X POST https://gateway-882344695975.europe-west1.run.app/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### 2. Login
```bash
curl -X POST https://gateway-882344695975.europe-west1.run.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### 3. Book a Flight
```bash
curl -X POST https://gateway-882344695975.europe-west1.run.app/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "flightId": "1",
    "numberOfSeats": 1,
    "useSmiles": false,
    "becomeMember": true,
    "phoneNumber": "+1234567890",
    "address": "123 Main St",
    "passengerEmail": "user@example.com",
    "passengerName": "John Doe"
  }'
```

#### 4. Get Flights
```bash
curl https://gateway-882344695975.europe-west1.run.app/v1/flights \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Check Miles&Smiles Profile
```bash
curl https://gateway-882344695975.europe-west1.run.app/v1/miles-smiles/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6. Get ML Price Prediction
```bash
curl -X POST https://ml-service-882344695975.europe-west1.run.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "airline": "Turkish Airlines",
    "source_city": "Istanbul",
    "destination_city": "New York",
    "stops": 0,
    "days_left": 10,
    "class": "Economy"
  }'
```

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed API documentation with examples.

## 🔑 Authentication

The API uses token-based authentication. After successful login or registration, include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Admin endpoints require:
1. Valid authentication token
2. User role must be "admin"

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `JWT_SECRET` | (optional) | Secret for JWT tokens (future use) |

## 🚀 Use Cases Implemented

### ✅ Phase 1: Flight Management (COMPLETED)
- [x] Admin can add flights with date and capacity
- [x] Admin can view all flights
- [x] Admin can search flights by route
- [x] Admin can update flight details
- [x] Admin can delete flights
- [x] Users can search and view flights
- [x] Seat availability tracking

### 📋 Phase 2: Booking System (Future)
- [ ] Users can book flights
- [ ] Users can view their bookings
- [ ] Booking cancellation
- [ ] Refund processing
- [ ] Email notifications

### 📋 Phase 3: Payment Processing (Future)
- [ ] Payment gateway integration
- [ ] Invoice generation
- [ ] Transaction history

## 🗄️ Data Storage

**Production Stack:**
- **PostgreSQL** - Cloud SQL (europe-west1) - Primary relational database
- **Redis** - Cloud Memorystore - Caching & session management
- **RabbitMQ** - CloudAMQP - Message queue for async operations
- **Firebase** - Authentication & token management

## 🔒 Security Considerations

For production deployment:
1. Use proper JWT tokens instead of base64 encoding
2. Hash passwords with bcrypt
3. Implement rate limiting
4. Add request validation
5. Use HTTPS
6. Add CORS restrictions
7. Implement logging and monitoring
8. Add API versioning

## 📦 Dependencies

- **express** - Web framework
- **cors** - Cross-origin request handling
- **dotenv** - Environment configuration
- **typescript** - Type safety
- **tsx** - TypeScript executor for development

## 👨‍💻 Development Notes

### File Changes
- JavaScript files converted to TypeScript (`.ts`)
- Strict type checking enabled in `tsconfig.json`
- All Express routes use proper TypeScript types
- Request handlers properly typed

### Running TypeScript
- Development: `npm run dev` (uses tsx for hot reload)
- Production: `npm run build` then `npm start`

## 📞 API Response Format

All API responses follow a consistent format:

**Success Response (2xx):**
```json
{
  "message": "Operation successful",
  "data": {}
}
```

**Error Response (4xx, 5xx):**
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

ISC

## 📞 Support

For issues or questions, please refer to the API documentation or check the test script for usage examples.

---

**Last Updated:** January 14, 2026  
**Version:** 2.0.0 (Microservices)
**Status:** Production Ready ✅  
**Deployment:** Google Cloud Run (europe-west1)

For detailed architecture, data models, and deployment guides, see [README_DEPLOYMENT.md](README_DEPLOYMENT.md)


THE PRESENTATION VIDEO LINK: https://drive.google.com/drive/folders/1sQuRe9eYMjIw60vicK6kztH9mbcB_8w0?usp=sharing