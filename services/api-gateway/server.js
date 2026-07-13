const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'api-gateway' });
});

// Microservices Proxies
const services = [
  { path: '/api/v1/auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:8001' },
  { path: '/api/v1/users', url: process.env.USER_SERVICE_URL || 'http://localhost:8002' },
  { path: '/api/v1/trips', url: process.env.TRIP_SERVICE_URL || 'http://localhost:8003' },
  { path: '/api/v1/bookings', url: process.env.BOOKING_SERVICE_URL || 'http://localhost:8004' },
  { path: '/api/v1/pricing', url: process.env.PRICING_SERVICE_URL || 'http://localhost:8005' },
  { path: '/api/v1/payments', url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8006' },
  { path: '/api/v1/tracking', url: process.env.TRACKING_SERVICE_URL || 'http://localhost:8007' },
  { path: '/api/v1/notifications', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8008' },
  { path: '/api/v1/reviews', url: process.env.REVIEW_SERVICE_URL || 'http://localhost:8009' }
];

// Intercept legacy booking endpoints under /api/v1/trips/book and route them to booking-service
app.use('/api/v1/trips/book', proxy(process.env.BOOKING_SERVICE_URL || 'http://localhost:8004', {
  proxyReqPathResolver: (req) => {
    const forwardPath = '/book' + req.url;
    console.log(`[API Gateway Intercept] Routing /api/v1/trips/book${req.url} to booking-service:${forwardPath}`);
    return forwardPath;
  },
  userResErrorResolver: (err, res, next) => {
    console.error(`[API Gateway Intercept] Error forwarding to booking-service:`, err.message);
    res.status(502).json({
      success: false,
      message: 'Bad Gateway. The booking-service is currently unavailable.',
      error: err.message
    });
  }
}));

// Intercept /api/v1/trips/my-bookings/:userId → booking-service /my-bookings/:userId
app.use('/api/v1/trips/my-bookings', proxy(process.env.BOOKING_SERVICE_URL || 'http://localhost:8004', {
  proxyReqPathResolver: (req) => {
    const forwardPath = '/my-bookings' + req.url;
    console.log(`[API Gateway Intercept] Routing /api/v1/trips/my-bookings${req.url} to booking-service:${forwardPath}`);
    return forwardPath;
  },
  userResErrorResolver: (err, res, next) => {
    console.error(`[API Gateway Intercept] Error forwarding /my-bookings to booking-service:`, err.message);
    res.status(502).json({ success: false, message: 'Bad Gateway.', error: err.message });
  }
}));

services.forEach(service => {
  app.use(service.path, proxy(service.url, {
    proxyReqPathResolver: (req) => {
      // Forward the request path preserving original routes after the base prefix
      // E.g., /api/v1/auth/login -> /login
      const forwardPath = req.url;
      console.log(`[API Gateway] Routing request from ${service.path}${forwardPath} to ${service.url}${forwardPath}`);
      return forwardPath;
    },
    userResErrorResolver: (err, res, next) => {
      console.error(`[API Gateway] Error forwarding to ${service.url}:`, err.message);
      res.status(502).json({
        success: false,
        message: 'Bad Gateway. The microservice is currently unavailable.',
        error: err.message
      });
    }
  }));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`API GATEWAY is running on port ${PORT}`);
});
