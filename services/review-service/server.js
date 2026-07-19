const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const chatRoutes = require('./routes/chatRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8009;

// Middleware
app.use(express.json());

// Routes
app.use('/', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'review-service' });
});

// Start Server
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Listen on Port
  app.listen(PORT, () => {
    console.log(`REVIEW-SERVICE is running on port ${PORT}`);
  });
};

startServer();
