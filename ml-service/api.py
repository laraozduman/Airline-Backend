"""
Flight Price Prediction API Server
Uses pre-trained Linear Regression model
Run: python api.py
"""

import json
import math
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# Load model
MODEL_FILE = Path(__file__).parent / "models" / "price_model.json"

if not MODEL_FILE.exists():
    print(f" Model not found. Run train_simple.py first!")
    exit(1)

with open(MODEL_FILE) as f:
    MODEL_DATA = json.load(f)

print(f"✅ Model loaded successfully")
print(f"   MAE: ${MODEL_DATA['mae']:.2f}")
print(f"   RMSE: ${MODEL_DATA['rmse']:.2f}")


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


def encode_category(value, mapping):
    """Get encoded value for category, or -1 if unknown"""
    return mapping.get(value, -1)


def predict_price(flight_data):
    """Predict price for a flight"""
    try:
        # Extract and encode features
        features = [
            encode_category(flight_data.get('airline', ''), MODEL_DATA['airline_map']),
            encode_category(flight_data.get('source_city', ''), MODEL_DATA['source_map']),
            float(flight_data.get('stops', 0)),
            float(extract_hour(flight_data.get('departure_time', ''))),
            float(extract_hour(flight_data.get('arrival_time', ''))),
            encode_category(flight_data.get('destinatin', ''), MODEL_DATA['dest_map']),
            encode_category(flight_data.get('class', 'Economy'), MODEL_DATA['class_map']),
            float(flight_data.get('duratin', 0)),
            float(flight_data.get('days_left', 0)),
        ]
        
        # Check for missing categories
        if any(f == -1 for f in features):
            return None, "Unknown airline, city, or class"
        
        # Normalize features
        normalized = []
        for i, feature in enumerate(features):
            norm = (feature - MODEL_DATA['mean_x'][i]) / MODEL_DATA['std_x'][i]
            normalized.append(norm)
        
        # Predict
        prediction = MODEL_DATA['bias'] + sum(
            MODEL_DATA['weights'][i] * normalized[i] 
            for i in range(len(normalized))
        )
        
        # Ensure positive price
        prediction = max(0, prediction)
        
        return prediction, None
    
    except Exception as e:
        return None, str(e)


class PredictionHandler(BaseHTTPRequestHandler):
    """HTTP request handler for predictions"""
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'model_loaded': True,
                'service': 'flight-price-prediction'
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path.startswith('/predict?'):
            # Parse query parameters
            query_string = self.path.split('?')[1]
            params = urllib.parse.parse_qs(query_string)
            
            flight_data = {}
            for key, values in params.items():
                flight_data[key] = values[0] if values else ''
            
            # Make prediction
            price, error = predict_price(flight_data)
            
            self.send_response(200 if price is not None else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            if price is not None:
                response = {
                    'status': 'success',
                    'predicted_price': round(float(price), 2),
                    'currency': 'USD',
                    'input': {
                        'airline': flight_data.get('airline'),
                        'route': f"{flight_data.get('source_city')} → {flight_data.get('destinatin')}",
                        'class': flight_data.get('class'),
                        'stops': int(float(flight_data.get('stops', 0))),
                        'days_left': int(float(flight_data.get('days_left', 0)))
                    }
                }
            else:
                response = {'status': 'error', 'error': error}
            
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path == '/model-info':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'status': 'success',
                'model': 'Linear Regression',
                'features': MODEL_DATA['feature_names'],
                'airlines': list(MODEL_DATA['airline_map'].keys()),
                'cities': list(MODEL_DATA['source_map'].keys()),
                'classes': list(MODEL_DATA['class_map'].keys()),
                'performance': {
                    'mae': f"${MODEL_DATA['mae']:.2f}",
                    'rmse': f"${MODEL_DATA['rmse']:.2f}"
                }
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'error': 'Not found'}
            self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        return


def run_server(port=5000):
    """Run the prediction server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, PredictionHandler)
    
    print(f"\n🚀 Flight Price Prediction Server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📍 Server running on http://localhost:{port}")
    print(f"\n📚 Endpoints:")
    print(f"   GET /health - Health check")
    print(f"   GET /predict?airline=X&source_city=Y&... - Single prediction")
    print(f"   GET /model-info - Model information")
    print(f"\n💡 Example:")
    print(f"   http://localhost:{port}/predict?airline=IndiGo&source_city=Mumbai&stops=0&departure_time=2026-02-20%2010:00&arrival_time=2026-02-20%2012:30&destinatin=Delhi&class=Business&duratin=150&days_left=5")
    print(f"\n⏹️  Press Ctrl+C to stop\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✋ Server stopped")
        httpd.server_close()


if __name__ == '__main__':
    run_server(port=5000)
