const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(express.json());

// Routes
app.use('/', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

// Start server
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Listen on Port
  app.listen(PORT, () => {
    console.log(`AUTH-SERVICE is running on port ${PORT}`);
  });
};

startServer();
