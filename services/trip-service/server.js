const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const tripRoutes = require('./routes/tripRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

// Middleware
app.use(express.json());

// Routes
app.use('/', tripRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'trip-service' });
});

// Start Server
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Listen on Port
  app.listen(PORT, () => {
    console.log(`TRIP-SERVICE is running on port ${PORT}`);
  });
};

startServer();
