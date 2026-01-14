"""
Train the flight price prediction model
Run: python train.py
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import joblib
import os
from pathlib import Path

# Create models directory if it doesn't exist
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

def load_and_prepare_data(csv_path):
    """Load and prepare the flight price dataset"""
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"Missing values:\n{df.isnull().sum()}")
    
    # Create a copy to avoid SettingWithCopyWarning
    df = df.copy()
    
    # Drop index column if it exists
    if 'Unnamed: 0' in df.columns:
        df.drop('Unnamed: 0', axis=1, inplace=True)
        print("Dropped 'Unnamed: 0' index column")
    
    # Handle missing values
    df.fillna(df.median(numeric_only=True), inplace=True)
    
    return df

def preprocess_features(df, fit_encoders=True, encoders=None, scaler=None):
    """Preprocess features for model training"""
    
    # Create a copy
    df = df.copy()
    
    # Convert stops column (zero, one, two, three -> 0, 1, 2, 3)
    if 'stops' in df.columns:
        stops_map = {'zero': 0, 'one': 1, 'two_or_more': 2, 'two or more': 2}
        df['stops'] = df['stops'].astype(str).str.lower().map(stops_map)
        df['stops'] = df['stops'].fillna(0).astype(int)
    
    # Categorical columns to encode
    categorical_cols = ['airline', 'source_city', 'class', 'destination_city']
    
    # Numeric columns
    numeric_cols = ['stops', 'days_left', 'duration']
    
    # Encode categorical variables
    if fit_encoders:
        encoders = {}
        for col in categorical_cols:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                encoders[col] = le
    else:
        if encoders:
            for col in categorical_cols:
                if col in df.columns and col in encoders:
                    df[col] = encoders[col].transform(df[col].astype(str))
    
    # Extract time features from datetime columns
    for time_col in ['departure_time', 'arrival_time']:
        if time_col in df.columns:
            df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
            df[f'{time_col}_hour'] = df[time_col].dt.hour
            df[f'{time_col}_day'] = df[time_col].dt.day
            df[f'{time_col}_month'] = df[time_col].dt.month
            df.drop(time_col, axis=1, inplace=True)
    
    # Drop flight number as it's not useful for prediction
    if 'flight' in df.columns:
        df.drop('flight', axis=1, inplace=True)
    
    # Select features for model
    feature_cols = [col for col in df.columns if col != 'price']
    
    X = df[feature_cols].copy()
    y = df['price'].copy() if 'price' in df.columns else None
    
    # Scale numeric features
    if fit_encoders:
        scaler = StandardScaler()
        X[numeric_cols] = scaler.fit_transform(X[numeric_cols])
    else:
        if scaler:
            X[numeric_cols] = scaler.transform(X[numeric_cols])
    
    return X, y, encoders, scaler, feature_cols

def train_model(csv_path):
    """Train the price prediction model"""
    
    # Load data
    df = load_and_prepare_data(csv_path)
    
    # Preprocess features
    X, y, encoders, scaler, feature_cols = preprocess_features(df, fit_encoders=True)
    
    print(f"\nFeature count: {X.shape[1]}")
    print(f"Price range: ${y.min():.2f} - ${y.max():.2f}")
    print(f"Average price: ${y.mean():.2f}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\nTraining set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Train model
    print("\nTraining Random Forest Regressor...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n📊 Model Performance:")
    print(f"   MAE (Mean Absolute Error): ${mae:.2f}")
    print(f"   RMSE (Root Mean Squared Error): ${rmse:.2f}")
    print(f"   R² Score: {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🎯 Top 10 Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    
    # Save model and preprocessing objects
    model_path = MODELS_DIR / "price_model.pkl"
    encoders_path = MODELS_DIR / "encoders.pkl"
    scaler_path = MODELS_DIR / "scaler.pkl"
    features_path = MODELS_DIR / "feature_cols.pkl"
    
    joblib.dump(model, model_path)
    joblib.dump(encoders, encoders_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(feature_cols, features_path)
    
    print(f"\n✅ Model saved to {model_path}")
    print(f"✅ Encoders saved to {encoders_path}")
    print(f"✅ Scaler saved to {scaler_path}")
    print(f"✅ Features saved to {features_path}")

if __name__ == "__main__":
    # Path to your CSV file
    csv_file = Path(__file__).parent / "data" / "Clean_Dataset.csv"
    
    if not csv_file.exists():
        print(f"⚠️  Dataset not found at {csv_file}")
        print(f"Skipping training - using pre-trained models from repo")
        print(f"Make sure pre-trained models exist in models/ directory")
        exit(0)
    
    train_model(str(csv_file))
