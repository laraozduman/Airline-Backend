import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import fetch from 'node-fetch';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

interface FlightPredictionInput {
  airline: string;
  source_city: string;
  departure_time: string;
  stops: number;
  arrival_time: string;
  destinatin: string;
  class: string;
  duratin: number;
  days_left: number;
}

/**
 * GET /api/flights/predict-price
 * Predict price for a flight based on its details
 * Query parameters: airline, source_city, departure_time, stops, arrival_time, destinatin, class, duratin, days_left
 */
router.get('/predict-price', async (req: Request, res: Response) => {
  try {
    const flightDetails: FlightPredictionInput = {
      airline: req.query.airline as string,
      source_city: req.query.source_city as string,
      departure_time: req.query.departure_time as string,
      stops: parseInt(req.query.stops as string) || 0,
      arrival_time: req.query.arrival_time as string,
      destinatin: req.query.destinatin as string,
      class: req.query.class as string || 'Economy',
      duratin: parseInt(req.query.duratin as string) || 0,
      days_left: parseInt(req.query.days_left as string) || 0
    };

    // Validate required fields
    const requiredFields = ['airline', 'source_city', 'departure_time', 'stops', 'arrival_time', 'destinatin', 'class', 'duratin', 'days_left'];
    const missingFields = requiredFields.filter(f => !flightDetails[f as keyof FlightPredictionInput]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        required: requiredFields
      });
    }

    // Call ML service
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flightDetails)
    });

    if (!response.ok) {
      const error = await response.json() as any;
      return res.status(response.status).json({ error: error.error || 'Prediction failed' });
    }

    const prediction = await response.json() as any;

    res.json({
      status: 'success',
      predictedPrice: prediction.predicted_price,
      currency: 'USD',
      input: prediction.input,
      confidence: 'high' // Can be adjusted based on model metrics
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to predict price' });
  }
});

/**
 * POST /api/flights/batch-predict
 * Predict prices for multiple flights
 * Protected: Requires authentication
 */
router.post('/batch-predict', authenticate, async (req: Request, res: Response) => {
  try {
    const { flights } = req.body;

    if (!flights || !Array.isArray(flights)) {
      return res.status(400).json({ error: 'Flights array is required' });
    }

    // Call ML service batch endpoint
    const response = await fetch(`${ML_SERVICE_URL}/batch-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flights })
    });

    if (!response.ok) {
      const error = await response.json() as any;
      return res.status(response.status).json({ error: error.error || 'Batch prediction failed' });
    }

    const result = await response.json() as any;

    res.json({
      status: 'success',
      total: result.total,
      successful: result.successful,
      predictions: result.predictions
    });
  } catch (error) {
    console.error('Batch prediction error:', error);
    res.status(500).json({ error: 'Failed to process batch predictions' });
  }
});

/**
 * GET /api/flights/ml-model-info
 * Get ML model information and features
 */
router.get('/ml-model-info', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/model-info`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch model info' });
    }

    const modelInfo = await response.json() as any;

    res.json({
      status: 'success',
      model: modelInfo.model,
      features: modelInfo.features,
      expectedInput: modelInfo.expected_input_fields,
      categoricalFeatures: modelInfo.categorical_features,
      numericFeatures: modelInfo.numeric_features
    });
  } catch (error) {
    console.error('Model info error:', error);
    res.status(500).json({ error: 'Failed to fetch model information' });
  }
});

/**
 * GET /api/flights/ml-health
 * Check ML service health
 */
router.get('/ml-health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);

    if (!response.ok) {
      return res.status(response.status).json({ 
        status: 'unhealthy',
        message: 'ML service is down'
      });
    }

    const health = await response.json() as any;

    res.json({
      status: health.status,
      modelLoaded: health.model_loaded,
      mlService: health.service
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      message: 'Cannot reach ML service',
      error: (error as Error).message
    });
  }
});

export default router;
