"""
Flight Price Prediction ML Microservice
Serves predictions via Flask API
Run: python app.py (development) or gunicorn app:app (production)
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Model paths
MODELS_DIR = Path(__file__).parent / "models"

# Load model and preprocessing objects
try:
    model = joblib.load(MODELS_DIR / "price_model.pkl")
    encoders = joblib.load(MODELS_DIR / "encoders.pkl")
    scaler = joblib.load(MODELS_DIR / "scaler.pkl")
    feature_cols = joblib.load(MODELS_DIR / "feature_cols.pkl")
    logger.info("✅ Model and preprocessing objects loaded successfully")
    MODEL_LOADED = True
except Exception as e:
    logger.error(f"❌ Failed to load model: {str(e)}")
    logger.error(f"Make sure to run 'python train.py' first to train the model")
    MODEL_LOADED = False

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": MODEL_LOADED,
        "service": "flight-price-prediction"
    }), 200

@app.route("/predict", methods=["POST"])
def predict_price():
    """
    Predict flight price based on flight details
    
    Expected request body:
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
    """
    try:
        if not MODEL_LOADED:
            return jsonify({
                "error": "Model not loaded. Please train the model first.",
                "status": "error"
            }), 503
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['airline', 'source_city', 'departure_time', 'stops', 
                          'arrival_time', 'destination_city', 'class', 'duration', 'days_left']
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {missing_fields}",
                "status": "error"
            }), 400
        
        # Prepare features
        df = pd.DataFrame([data])
        
        # Encode categorical variables
        categorical_cols = ['airline', 'source_city', 'class', 'destination_city']
        for col in categorical_cols:
            if col in encoders:
                try:
                    df[col] = encoders[col].transform([df[col].iloc[0]])
                except ValueError:
                    # Handle unknown categories
                    logger.warning(f"Unknown category for {col}: {df[col].iloc[0]}")
                    df[col] = -1
        
        # Extract time features
        for time_col in ['departure_time', 'arrival_time']:
            df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
            df[f'{time_col}_hour'] = df[time_col].dt.hour.astype(int)
            df[f'{time_col}_day'] = df[time_col].dt.day.astype(int)
            df[f'{time_col}_month'] = df[time_col].dt.month.astype(int)
            df.drop(time_col, axis=1, inplace=True)
        
        # Ensure numeric types
        numeric_cols = ['stops', 'days_left', 'duration']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Select and scale features
        X = df[feature_cols].copy()
        X[numeric_cols] = scaler.transform(X[numeric_cols])
        
        # Make prediction
        predicted_price = model.predict(X)[0]
        
        # Ensure positive price
        predicted_price = max(0, predicted_price)
        
        logger.info(f"✅ Prediction made: {data['airline']} {data['source_city']}-{data['destination_city']} -> ${predicted_price:.2f}")
        
        return jsonify({
            "status": "success",
            "predicted_price": round(float(predicted_price), 2),
            "currency": "USD",
            "input": {
                "airline": data['airline'],
                "route": f"{data['source_city']} → {data['destination_city']}",
                "class": data['class'],
                "stops": int(data['stops']),
                "days_left": int(data['days_left'])
            }
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Prediction error: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route("/batch-predict", methods=["POST"])
def batch_predict():
    """
    Predict prices for multiple flights
    
    Expected request body:
    {
        "flights": [
            { flight1_data },
            { flight2_data },
            ...
        ]
    }
    """
    try:
        if not MODEL_LOADED:
            return jsonify({
                "error": "Model not loaded",
                "status": "error"
            }), 503
        
        data = request.get_json()
        flights = data.get('flights', [])
        
        if not flights:
            return jsonify({
                "error": "No flights provided",
                "status": "error"
            }), 400
        
        predictions = []
        for flight_data in flights:
            try:
                # Prepare features
                df = pd.DataFrame([flight_data])
                
                # Encode categorical variables
                categorical_cols = ['airline', 'source_city', 'class', 'destination_city']
                for col in categorical_cols:
                    if col in encoders:
                        try:
                            df[col] = encoders[col].transform([df[col].iloc[0]])
                        except ValueError:
                            df[col] = -1
                
                # Extract time features
                for time_col in ['departure_time', 'arrival_time']:
                    df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
                    df[f'{time_col}_hour'] = df[time_col].dt.hour.astype(int)
                    df[f'{time_col}_day'] = df[time_col].dt.day.astype(int)
                    df[f'{time_col}_month'] = df[time_col].dt.month.astype(int)
                    df.drop(time_col, axis=1, inplace=True)
                
                # Numeric conversion
                numeric_cols = ['stops', 'days_left', 'duration']
                for col in numeric_cols:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # Select and scale features
                X = df[feature_cols].copy()
                X[numeric_cols] = scaler.transform(X[numeric_cols])
                
                # Predict
                price = max(0, model.predict(X)[0])
                
                predictions.append({
                    "flight": flight_data.get('airline', 'N/A'),
                    "route": f"{flight_data.get('source_city', 'N/A')} → {flight_data.get('destinatin', 'N/A')}",
                    "predicted_price": round(float(price), 2),
                    "status": "success"
                })
            except Exception as e:
                predictions.append({
                    "flight": flight_data.get('airline', 'N/A'),
                    "error": str(e),
                    "status": "failed"
                })
        
        successful = len([p for p in predictions if p['status'] == 'success'])
        logger.info(f"✅ Batch prediction completed: {successful}/{len(flights)} successful")
        
        return jsonify({
            "status": "completed",
            "total": len(flights),
            "successful": successful,
            "predictions": predictions
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Batch prediction error: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route("/model-info", methods=["GET"])
def model_info():
    """Get model information and feature list"""
    return jsonify({
        "status": "success",
        "model": "Random Forest Regressor",
        "features": feature_cols,
        "categorical_features": ['airline', 'source_city', 'class', 'destinatin'],
        "numeric_features": ['stops', 'days_left', 'duratin', 'departure_time_hour', 'departure_time_day', 'departure_time_month', 'arrival_time_hour', 'arrival_time_day', 'arrival_time_month'],
        "expected_input_fields": {
            "airline": "string (airline name)",
            "source_city": "string (departure city)",
            "departure_time": "string (ISO format: YYYY-MM-DD HH:mm)",
            "stops": "integer (number of stops)",
            "arrival_time": "string (ISO format: YYYY-MM-DD HH:mm)",
            "destinatin": "string (destination city)",
            "class": "string (cabin class: Economy/Business/First)",
            "duratin": "integer (flight duration in minutes)",
            "days_left": "integer (days until departure)"
        }
    }), 200

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
