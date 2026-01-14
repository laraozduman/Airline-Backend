FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

# Train the model during build
RUN python train.py

EXPOSE 8080

# Run with PORT provided by Cloud Run (defaults to 8080 locally)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 300 app:app"]