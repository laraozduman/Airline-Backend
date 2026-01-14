FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

# Train the model during build
RUN python train.py

EXPOSE 8080

# Set environment variables for gunicorn
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Run gunicorn (Cloud Run will override PORT if needed)
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --access-logfile - --error-logfile - app:app