"""
Flight Price Prediction - Linear Regression Model
Pure Python implementation - no external dependencies
Run: python train_simple.py
"""

import csv
import json
import math
from pathlib import Path
from datetime import datetime
import random

def load_csv(filepath):
    """Load CSV file"""
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def extract_hour(time_str):
    """Extract hour from datetime string"""
    try:
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        return dt.hour
    except:
        try:
            return int(time_str.split(' ')[1].split(':')[0])
        except:
            return 12


def encode_categorical(value, categories):
    """Encode categorical value"""
    if value not in categories:
        categories[value] = len(categories)
    return categories[value]


class LinearRegression:
    """Simple linear regression for price prediction"""
    
    def __init__(self):
        self.weights = None
        self.bias = 0
        self.mean_x = None
        self.std_x = None
    
    def fit(self, X, y, learning_rate=0.001, iterations=100):
        """Train the model"""
        n_features = len(X[0])
        self.weights = [0.0] * n_features
        self.bias = 0.0
        
        # Normalize features
        self.mean_x = [sum(X[i][j] for i in range(len(X))) / len(X) for j in range(n_features)]
        self.std_x = []
        
        for j in range(n_features):
            variance = sum((X[i][j] - self.mean_x[j]) ** 2 for i in range(len(X))) / len(X)
            self.std_x.append(math.sqrt(variance) if variance > 0 else 1)
        
        # Normalize
        X_norm = []
        for i in range(len(X)):
            row = []
            for j in range(n_features):
                normalized = (X[i][j] - self.mean_x[j]) / self.std_x[j]
                row.append(normalized)
            X_norm.append(row)
        
        # Gradient descent
        for iteration in range(iterations):
            # Predictions
            predictions = []
            for i in range(len(X_norm)):
                pred = self.bias + sum(self.weights[j] * X_norm[i][j] for j in range(n_features))
                predictions.append(pred)
            
            # Calculate gradients
            errors = [y[i] - predictions[i] for i in range(len(y))]
            
            # Update weights
            for j in range(n_features):
                gradient = -2 * sum(errors[i] * X_norm[i][j] for i in range(len(X_norm))) / len(X_norm)
                self.weights[j] -= learning_rate * gradient
            
            # Update bias
            bias_gradient = -2 * sum(errors) / len(errors)
            self.bias -= learning_rate * bias_gradient
            
            if (iteration + 1) % 20 == 0:
                mse = sum(e ** 2 for e in errors) / len(errors)
                print(f"   Iteration {iteration + 1}/{iterations}: MSE = {mse:.2f}")
    
    def predict(self, X):
        """Make predictions"""
        predictions = []
        for i in range(len(X)):
            # Normalize
            normalized = []
            for j in range(len(X[i])):
                norm_val = (X[i][j] - self.mean_x[j]) / self.std_x[j]
                normalized.append(norm_val)
            
            # Predict
            pred = self.bias + sum(self.weights[j] * normalized[j] for j in range(len(normalized)))
            predictions.append(max(0, pred))  # Ensure positive price
        
        return predictions


def train_model(csv_path):
    """Train price prediction model"""
    
    print(f"📚 Loading flight data from {csv_path}...")
    data = load_csv(csv_path)
    print(f"✅ Loaded {len(data)} flight records\n")
    
    # Prepare features
    X = []
    y = []
    
    # Category encoders for later use in predictions
    airline_map = {}
    source_map = {}
    dest_map = {}
    class_map = {}
    
    print("🔄 Processing features...")
    for idx, record in enumerate(data):
        try:
            features = [
                encode_categorical(record['airline'], airline_map),
                encode_categorical(record['source_city'], source_map),
                float(record['stops']),
                float(extract_hour(record['departure_time'])),
                float(extract_hour(record['arrival_time'])),
                encode_categorical(record['destination_city'], dest_map),
                encode_categorical(record['class'], class_map),
                float(record['duration']),
                float(record['days_left']),
            ]
            price = float(record['price'])
            
            X.append(features)
            y.append(price)
        except (ValueError, KeyError) as e:
            print(f"  ⚠️  Skipped row {idx}: {e}")
            continue
    
    print(f"\n✅ Processed {len(X)} valid records")
    print(f"💰 Price range: ${min(y):.2f} - ${max(y):.2f}")
    print(f"📊 Average price: ${sum(y)/len(y):.2f}")
    
    print(f"\n🎯 Features used: airline, source_city, stops, dep_hour, arr_hour, destination, class, duration, days_left")
    print(f"🏷️  Categories found:")
    print(f"   Airlines: {list(airline_map.keys())}")
    print(f"   Cities: {list(source_map.keys())}")
    print(f"   Classes: {list(class_map.keys())}")
    
    # Train model
    print(f"\n🤖 Training Linear Regression model...")
    model = LinearRegression()
    model.fit(X, y, learning_rate=0.01, iterations=100)
    
    # Evaluate
    predictions = model.predict(X)
    errors = [abs(predictions[i] - y[i]) for i in range(len(y))]
    mae = sum(errors) / len(errors)
    rmse = math.sqrt(sum(e ** 2 for e in errors) / len(errors))
    
    print(f"\n📊 Model Performance:")
    print(f"   MAE (Mean Absolute Error): ${mae:.2f}")
    print(f"   RMSE (Root Mean Squared Error): ${rmse:.2f}")
    
    # Save model
    model_data = {
        'weights': model.weights,
        'bias': model.bias,
        'mean_x': model.mean_x,
        'std_x': model.std_x,
        'airline_map': airline_map,
        'source_map': source_map,
        'dest_map': dest_map,
        'class_map': class_map,
        'mae': mae,
        'rmse': rmse,
        'avg_price': sum(y) / len(y),
        'feature_names': ['airline', 'source_city', 'stops', 'departure_hour', 'arrival_hour', 'destination', 'class', 'duration', 'days_left']
    }
    
    model_dir = Path(__file__).parent / "models"
    model_dir.mkdir(exist_ok=True)
    
    model_file = model_dir / "price_model.json"
    with open(model_file, 'w') as f:
        json.dump(model_data, f, indent=2)
    
    print(f"\n✅ Model saved to {model_file}")
    print(f"✨ Ready for predictions!")


if __name__ == "__main__":
    csv_file = Path(__file__).parent / "data" / "flight_prices.csv"
    
    if not csv_file.exists():
        print(f"❌ Dataset not found at {csv_file}")
        print(f"📝 Expected file: {csv_file}")
        exit(1)
    
    train_model(str(csv_file))
