const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { systemLogger } = require('./middlewares/systemLogger');

const app = express();

// Global Middlewares
app.set('trust proxy', true);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(systemLogger);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/reviews', chatRoutes);
app.use('/api/v1/system', systemRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'unified-backend-monolith' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Backend Error]:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
