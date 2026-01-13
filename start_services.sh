#!/bin/bash
# Start all airline services for local testing
# This script starts containers and services in the correct order

echo
echo "========================================="
echo "  Airline Backend - Local Testing Setup"
echo "========================================="
echo

# Start Docker containers
echo "[1/5] Starting PostgreSQL..."
docker start airline-postgres
sleep 3

echo "[2/5] Starting Redis..."
docker start airline-redis
sleep 2

echo "[3/5] Starting RabbitMQ..."
docker start airline-rabbitmq
sleep 3

echo
echo "========================================="
echo
echo "Next, open 3 new terminals and run:"
echo
echo "Terminal 1 - Backend:"
echo "  cd ~/Airline-backend"
echo "  npm run dev"
echo
echo "Terminal 2 - ML Service:"
echo "  cd ~/Airline-backend/ml-service"
echo "  python api_simple.py"
echo
echo "Terminal 3 - Notification Service:"
echo "  cd ~/Airline-backend/notification-service"
echo "  npm run dev"
echo
echo "========================================="
echo
echo "Services will be available at:"
echo "  Backend:       http://localhost:3000"
echo "  ML Service:    http://localhost:5000"
echo "  Notifications: http://localhost:4000"
echo "  RabbitMQ UI:   http://localhost:15672 (guest/guest)"
echo
echo "========================================="
echo
echo "Import Postman Collection:"
echo "  File > Import > Select: Postman_Collection.json"
echo
