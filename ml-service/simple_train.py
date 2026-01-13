"""
Simplified Flight Price Prediction ML Model
No external dependencies - uses only built-in libraries and scikit-learn basics
Run: python simple_train.py
"""

import csv
import json
import math
from pathlib import Path
from datetime import datetime

# Simple Random Forest implementation using decision trees
class SimpleDecisionTree:
    def __init__(self, max_depth=10, min_samples_split=2):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree = None
    
    def fit(self, X, y):
        self.tree = self._build_tree(X, y, depth=0)
        return self
    
    def _build_tree(self, X, y, depth):
        if depth >= self.max_depth or len(y) < self.min_samples_split:
            return {'value': sum(y) / len(y)}
        
        best_gain = 0
        best_feature = None
        best_split = None
        
        for feature_idx in range(len(X[0])):
            values = sorted(set(x[feature_idx] for x in X))
            
            for split in values:
                left_y = [y[i] for i in range(len(X)) if X[i][feature_idx] <= split]
                right_y = [y[i] for i in range(len(X)) if X[i][feature_idx] > split]
                
                if not left_y or not right_y:
                    continue
                
                gain = self._calculate_gain(y, left_y, right_y)
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_split = split
        
        if best_feature is None:
            return {'value': sum(y) / len(y)}
        
        left_indices = [i for i in range(len(X)) if X[i][best_feature] <= best_split]
        right_indices = [i for i in range(len(X)) if X[i][best_feature] > best_split]
        
        left_X = [X[i] for i in left_indices]
        left_y = [y[i] for i in left_indices]
        right_X = [X[i] for i in right_indices]
        right_y = [y[i] for i in right_indices]
        
        return {
            'feature': best_feature,
            'split': best_split,
            'left': self._build_tree(left_X, left_y, depth + 1),
            'right': self._build_tree(right_X, right_y, depth + 1)
        }
    
    @staticmethod
    def _calculate_gain(y, left_y, right_y):
        def variance(values):
            if not values:
                return 0
            mean = sum(values) / len(values)
            return sum((x - mean) ** 2 for x in values) / len(values)
        
        parent_var = variance(y)
        left_var = variance(left_y)
        right_var = variance(right_y)
        
        return parent_var - (len(left_y) * left_var + len(right_y) * right_var) / len(y)
    
    def predict(self, X):
        return [self._traverse_tree(x, self.tree) for x in X]
    
    @staticmethod
    def _traverse_tree(x, node):
        if 'value' in node:
            return node['value']
        
        if x[node['feature']] <= node['split']:
            return SimpleDecisionTree._traverse_tree(x, node['left'])
        else:
            return SimpleDecisionTree._traverse_tree(x, node['right'])


class SimpleRandomForest:
    def __init__(self, n_trees=10, max_depth=10):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.trees = []
    
    def fit(self, X, y):
        import random
        for _ in range(self.n_trees):
            # Bootstrap sample
            indices = [random.randint(0, len(X) - 1) for _ in range(len(X))]
            X_sample = [X[i] for i in indices]
            y_sample = [y[i] for i in indices]
            
            tree = SimpleDecisionTree(max_depth=self.max_depth)
            tree.fit(X_sample, y_sample)
            self.trees.append(tree)
        return self
    
    def predict(self, X):
        predictions = [[tree.predict([x])[0] for tree in self.trees] for x in X]
        return [sum(p) / len(p) for p in predictions]


def load_csv(filepath):
    """Load CSV file"""
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def extract_hour(time_str):
    try:
        return int(datetime.fromisoformat(time_str.replace('Z', '+00:00')).hour)
    except:
        return int(time_str.split(':')[0]) if ':' in time_str else 12


def encode_categorical(value, categories):
    """Encode categorical value"""
    if value not in categories:
        categories[value] = len(categories)
    return categories[value]


def train_model(csv_path):
    """Train price prediction model"""
    
    print(f"📚 Loading data from {csv_path}...")
    data = load_csv(csv_path)
    print(f"✅ Loaded {len(data)} flight records")
    
    # Prepare features
    X = []
    y = []
    
    # Category encoders
    airline_map = {}
    source_map = {}
    dest_map = {}
    class_map = {}
    
    for record in data:
        try:
            features = [
                encode_categorical(record['airline'], airline_map),
                encode_categorical(record['source_city'], source_map),
                int(record['stops']),
                extract_hour(record['departure_time']),
                extract_hour(record['arrival_time']),
                encode_categorical(record['destinatin'], dest_map),
                encode_categorical(record['class'], class_map),
                int(record['duratin']),
                int(record['days_left']),
            ]
            price = float(record['price'])
            
            X.append(features)
            y.append(price)
        except (ValueError, KeyError) as e:
            print(f"⚠️  Skipping record: {e}")
            continue
    
    print(f"\n✅ Processed {len(X)} valid records")
    print(f"💰 Price range: ${min(y):.2f} - ${max(y):.2f}")
    print(f"📊 Average price: ${sum(y)/len(y):.2f}")
    
    # Train model
    print("\n🤖 Training Random Forest...")
    model = SimpleRandomForest(n_trees=10, max_depth=8)
    model.fit(X, y)
    
    # Evaluate
    predictions = model.predict(X)
    mae = sum(abs(predictions[i] - y[i]) for i in range(len(y))) / len(y)
    
    print(f"✅ Training complete!")
    print(f"   MAE: ${mae:.2f}")
    
    # Save model
    model_data = {
        'trees_count': len(model.trees),
        'airline_map': airline_map,
        'source_map': source_map,
        'dest_map': dest_map,
        'class_map': class_map,
        'mae': mae,
        'avg_price': sum(y) / len(y)
    }
    
    model_file = Path(__file__).parent / "models" / "price_model.json"
    model_file.parent.mkdir(exist_ok=True)
    
    with open(model_file, 'w') as f:
        json.dump(model_data, f, indent=2)
    
    print(f"💾 Model metadata saved to {model_file}")
    print(f"\n✨ Model trained successfully!")
    print(f"   Ready for predictions via Flask API")


if __name__ == "__main__":
    csv_file = Path(__file__).parent / "data" / "flight_prices.csv"
    
    if not csv_file.exists():
        print(f"❌ Dataset not found at {csv_file}")
        print(f"   Please place flight_prices.csv in the data/ directory")
        exit(1)
    
    train_model(str(csv_file))
