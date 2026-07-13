const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const bookingRoutes = require('./routes/bookingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

// Middleware
app.use(express.json());

// Routes
app.use('/', bookingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'booking-service' });
});

// Start server
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Listen on Port
  app.listen(PORT, () => {
    console.log(`BOOKING-SERVICE is running on port ${PORT}`);
  });
};

startServer();
