"""
Flight Price Prediction API Server (Simple HTTP)
Uses pre-trained Linear Regression model
Run: python api_simple.py
"""

import json
import math
from pathlib import Path
from datetime import datetime
import socket

# Load model
MODEL_FILE = Path(__file__).parent / "models" / "price_model.json"

if not MODEL_FILE.exists():
    print(f"❌ Model not found. Run train_simple.py first!")
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


def parse_query(query_string):
    """Parse query string into dictionary"""
    params = {}
    if not query_string:
        return params
    for pair in query_string.split('&'):
        if '=' in pair:
            key, value = pair.split('=', 1)
            # URL decode
            value = value.replace('%20', ' ').replace('%2C', ',')
            params[key] = value
    return params


def run_server(port=5000):
    """Run simple HTTP prediction server"""
    
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('0.0.0.0', port))
    server_socket.listen(5)
    
    print(f"\n🚀 Flight Price Prediction Server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📍 Server running on http://localhost:{port}")
    print(f"\n📚 Endpoints:")
    print(f"   GET /health - Health check")
    print(f"   GET /predict?airline=X&source_city=Y&... - Single prediction")
    print(f"   GET /model-info - Model information")
    print(f"\n💡 Example:")
    print(f"   http://localhost:{port}/predict?airline=IndiGo&source_city=Mumbai&stops=0&departure_time=10:00&arrival_time=12:30&destinatin=Delhi&class=Business&duratin=150&days_left=5")
    print(f"\n⏹️  Press Ctrl+C to stop\n")
    
    try:
        while True:
            client_socket, client_address = server_socket.accept()
            
            # Receive HTTP request
            request_data = b''
            while True:
                data = client_socket.recv(1024)
                if not data:
                    break
                request_data += data
                if b'\r\n\r\n' in request_data:
                    break
            
            request_str = request_data.decode('utf-8', errors='ignore')
            lines = request_str.split('\r\n')
            request_line = lines[0].split()
            
            if len(request_line) < 2:
                client_socket.close()
                continue
            
            path = request_line[1]
            
            # Handle requests
            response = b''
            content_type = 'application/json'
            status = 404
            
            if path == '/health':
                status = 200
                response_data = {
                    'status': 'healthy',
                    'model_loaded': True,
                    'service': 'flight-price-prediction'
                }
                response = json.dumps(response_data).encode()
            
            elif path.startswith('/predict?'):
                status = 200
                query_string = path.split('?')[1]
                flight_data = parse_query(query_string)
                
                price, error = predict_price(flight_data)
                
                if price is not None:
                    response_data = {
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
                    status = 400
                    response_data = {'status': 'error', 'error': error}
                
                response = json.dumps(response_data).encode()
            
            elif path == '/model-info':
                status = 200
                response_data = {
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
                response = json.dumps(response_data).encode()
            
            else:
                status = 404
                response_data = {'error': 'Not found'}
                response = json.dumps(response_data).encode()
            
            # Send HTTP response
            http_response = f"HTTP/1.1 {status} {'OK' if status == 200 else 'Bad Request'}\r\n"
            http_response += f"Content-Type: {content_type}\r\n"
            http_response += f"Content-Length: {len(response)}\r\n"
            http_response += "Connection: close\r\n\r\n"
            
            client_socket.sendall(http_response.encode() + response)
            client_socket.close()
            
            print(f"✅ {request_line[0]} {path}")
    
    except KeyboardInterrupt:
        print("\n\n✋ Server stopped")
        server_socket.close()


if __name__ == '__main__':
    run_server(port=5000)
