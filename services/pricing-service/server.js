const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const pricingRoutes = require('./routes/pricingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(express.json());

// Mount routes
app.use('/', pricingRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'pricing-service' });
});

// Start server
const startServer = async () => {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Listen
  app.listen(PORT, () => {
    console.log(`PRICING-SERVICE is running on port ${PORT}`);
  });
};

startServer();
