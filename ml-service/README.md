# Flight Price Prediction ML Microservice

ML microservice for predicting flight prices using Random Forest regression.

## Directory Structure

```
ml-service/
├── app.py                 # Flask API server
├── train.py              # Model training script
├── requirements.txt      # Python dependencies
├── Dockerfile            # Cloud Run deployment
├── Makefile              # Convenient commands
├── models/               # Trained models (generated)
│   ├── price_model.pkl
│   ├── encoders.pkl
│   ├── scaler.pkl
│   └── feature_cols.pkl
└── data/
    └── Clean_Dataset.csv # Training dataset
```

## Setup & Training

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Add Your Dataset
Place your `flight_prices.csv` in the `data/` directory with these columns:
- airline
- flight
- source_city
- departure_time (ISO format or any datetime)
- stops
- arrival_time (ISO format or any datetime)
- destinatin
- class
- duratin (duration in minutes)
- days_left
- price (target variable)

### 3. Train the Model
```bash
python train.py
```

Output will show:
- Data loading and preprocessing
- Model training with Random Forest
- Performance metrics (MAE, RMSE, R²)
- Feature importance rankings
- Saved model artifacts

## Running Locally

### Development Server
```bash
python app.py
```
Server runs on `http://localhost:5000`

### Production with Docker
```bash
docker build -t airline-price-predictor:latest .
docker run -p 5000:5000 airline-price-predictor:latest
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Model Info
```bash
GET /model-info
```
Returns feature list and expected input format.

### Single Price Prediction
```bash
POST /predict
Content-Type: application/json

{
  "airline": "IndiGo",
  "source_city": "Mumbai",
  "departure_time": "2026-02-15 10:30",
  "stops": 0,
  "arrival_time": "2026-02-15 14:30",
  "destinatin": "Delhi",
  "class": "Business",
  "duratin": 240,
  "days_left": 5
}
```

Response:
```json
{
  "status": "success",
  "predicted_price": 12500.50,
  "currency": "USD",
  "input": {
    "airline": "IndiGo",
    "route": "Mumbai → Delhi",
    "class": "Business",
    "stops": 0,
    "days_left": 5
  }
}
```

### Batch Predictions
```bash
POST /batch-predict
Content-Type: application/json

{
  "flights": [
    { flight1_data },
    { flight2_data },
    ...
  ]
}
```

## Deployment to Cloud Run

### Prerequisites
```bash
# Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

gcloud init
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Deploy
```bash
# From ml-service/ directory
gcloud run deploy airline-price-predictor \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2
```

### Update Deployment
```bash
gcloud run deploy airline-price-predictor \
  --source . \
  --region us-central1 \
  --update-env-vars LOG_LEVEL=INFO
```

### View Logs
```bash
gcloud run logs read airline-price-predictor --limit 50
```

## Integration with Node.js Backend

Add to your Express backend:

```typescript
// src/config/ml-service.ts
export const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// src/controllers/flight.ts
import fetch from 'node-fetch';

export async function predictFlightPrice(flightDetails: FlightInput): Promise<number> {
  const response = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flightDetails)
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  
  return data.predicted_price;
}

// Usage in flights endpoint
app.get('/api/flights/predict-price', async (req, res) => {
  const prediction = await predictFlightPrice(req.query);
  res.json({ predictedPrice: prediction });
});
```

## Model Performance

After training, you'll see:
- **MAE**: Average prediction error in dollars
- **RMSE**: Standard deviation of errors
- **R² Score**: Model explains X% of price variance

Typical results:
- R² Score: 0.85-0.95
- MAE: $500-1500 (depending on dataset)

## Monitoring in Production

Cloud Run automatically provides:
- Request/response metrics
- Error tracking
- Execution logs
- Performance dashboards

Access via:
```
https://console.cloud.google.com/run
```

## Environment Variables

Set these in Cloud Run:
```
LOG_LEVEL=INFO
FLASK_ENV=production
PORT=5000
```

## Troubleshooting

### Model not found
```
❌ Failed to load model: No such file or directory
```
Run `python train.py` first to create model files.

### Unknown categories
The service handles unknown airline/city values gracefully by setting them to -1.

### Out of memory
Increase Cloud Run memory allocation:
```bash
gcloud run deploy airline-price-predictor --memory 2Gi
```

## Cost Optimization

- Cloud Run charges only for requests ($0.40 per million)
- Allocate 2-4 CPUs depending on prediction volume
- Use cache headers in Node.js backend to reduce calls

## Testing

```bash
# Test prediction endpoint
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "airline": "SpiceJet",
    "source_city": "Delhi",
    "departure_time": "2026-02-20 14:00",
    "stops": 1,
    "arrival_time": "2026-02-20 18:00",
    "destinatin": "Bangalore",
    "class": "Economy",
    "duratin": 120,
    "days_left": 10
  }'

# Test batch predictions
curl -X POST http://localhost:5000/batch-predict \
  -H "Content-Type: application/json" \
  -d '{"flights": [...array of flight data...]}'
```
