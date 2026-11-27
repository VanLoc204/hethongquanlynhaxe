const express = require('express');
const cors = require('cors');
const compression = require('compression');
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
app.use(compression());
// CORS: Cho phép frontend từ localhost (dev) và từ host production (Render/Vercel)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile app, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Cho phép tất cả domain onrender.com và vercel.app
    if (/\.onrender\.com$/.test(origin) || /\.vercel\.app$/.test(origin) || /\.netlify\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Mở rộng hoàn toàn cho môi trường KLTN
  },
  credentials: true
}));
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

// Root & Health check endpoints (hỗ trợ Render probe/UptimeRobot/Docker/Trình duyệt)
app.all(['/', '/api'], (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'anbinh-backend',
    message: 'Hệ Thống Quản Lý Nhà Xe An Bình Lines API Monolith đang hoạt động ổn định.',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'anbinh-backend'
  });
});

// Routes
const { payosWebhook } = require('./controllers/bookingController');

// Mount routes with universal support (both /api/... and direct /... for compatibility with all frontends)
const mountRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/trips`, tripRoutes);
  app.use(`${prefix}/bookings`, bookingRoutes);
  app.use(`${prefix}/pricing`, pricingRoutes);
  app.use(`${prefix}/chat`, chatRoutes);
  app.use(`${prefix}/system`, systemRoutes);
  app.use(`${prefix}/targets`, targetRoutes);
  app.use(`${prefix}/promotions`, promotionRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
};

mountRoutes('/api');
mountRoutes('');

// Universal aliases for search endpoint (/search and /api/search)
app.use(['/search', '/api/search'], (req, res, next) => {
  req.url = '/search' + (req.url.startsWith('?') ? req.url : (req.url === '/' ? '' : req.url));
  tripRoutes(req, res, next);
});

// PayOS Webhook (supports both /api/payment/webhook and /payment/webhook)
app.post(['/api/payment/webhook', '/payment/webhook'], payosWebhook);

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
