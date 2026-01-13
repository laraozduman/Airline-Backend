export interface Flight {
  id: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  capacity: number;
  bookedSeats: number;
  price: number;
  airline: string;
  aircraft: string;
  status: 'scheduled' | 'in-flight' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFlightRequest {
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  capacity: number;
  price: number;
  airline: string;
  aircraft: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
