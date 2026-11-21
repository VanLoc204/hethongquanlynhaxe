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

const targetRoutes = require('./routes/targetRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const path = require('path');

const app = express();

// Khởi tạo mã phiên làm việc duy nhất mỗi khi khởi động server
const SERVER_BOOT_ID = Date.now().toString();
app.locals.serverBootId = SERVER_BOOT_ID;

// Global Middlewares
app.set('trust proxy', 1);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Server-Boot-Id', SERVER_BOOT_ID);
  req.serverBootId = SERVER_BOOT_ID;
  next();
});
app.use(systemLogger);
app.use('/face-models', express.static(path.join(__dirname, 'public/face-models')));

// Routes
const { payosWebhook } = require('./controllers/bookingController');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.post('/api/payment/webhook', payosWebhook);

// Direct payOS Webhook Endpoint
app.post('/payment/webhook', payosWebhook);

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
