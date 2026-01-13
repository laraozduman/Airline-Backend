.PHONY: help install train serve deploy-local deploy-cloud

help:
	@echo "ML Service Commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make train        - Train the model"
	@echo "  make serve        - Run Flask server locally"
	@echo "  make deploy-local - Build and run Docker locally"
	@echo "  make deploy-cloud - Deploy to Cloud Run"

install:
	pip install -r requirements.txt

train:
	python train.py

serve:
	python app.py

deploy-local:
	docker build -t airline-price-predictor:latest .
	docker run -p 5000:5000 airline-price-predictor:latest

deploy-cloud:
	@echo "Deploying to Cloud Run..."
	@echo "1. Set your GCP project: gcloud config set project PROJECT_ID"
	@echo "2. Run: gcloud run deploy airline-price-predictor --source . --platform managed --region us-central1 --allow-unauthenticated"
