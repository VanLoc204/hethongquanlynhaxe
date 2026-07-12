const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(express.json());

// Mount routes
app.use('/', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'user-service' });
});

// Start server
const startServer = async () => {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Listen
  app.listen(PORT, () => {
    console.log(`USER-SERVICE is running on port ${PORT}`);
  });
};

startServer();
