const path = require('path');
const dotenv = require('dotenv');
const app = require('./app');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 8000;

// Start Server
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start Express app listening
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 UNIFIED BACKEND MONOLITH is running on port ${PORT}`);
      console.log(`=======================================================`);
    });

    // 3. Periodic midnight / auto-freeze check for unsubmitted trip reports & auto-close attendances
    const { autoMidnightCheck } = require('./controllers/tripReportController');
    const { autoCloseEndOfDayAttendances } = require('./controllers/attendanceController');
    setInterval(async () => {
      try {
        const dummyReq = {};
        const dummyRes = {
          status: () => dummyRes,
          json: (data) => {
            if (data.createdCount > 0) {
              console.log(`[Auto-Midnight Job] Đã tự động chốt ${data.createdCount} báo cáo chuyến đi chưa nộp.`);
            }
          }
        };
        await autoMidnightCheck(dummyReq, dummyRes);
        await autoCloseEndOfDayAttendances();
      } catch (err) {
        // Silently catch background interval error
      }
    }, 15 * 60 * 1000); // Mỗi 15 phút kiểm tra một lần

    // 4. Auto keep-alive heartbeat for Render Free Tier to avoid spin-down (every 10 minutes)
    const https = require('https');
    const http = require('http');
    const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || 'https://anbinh-backend.onrender.com';
    setInterval(() => {
      try {
        const client = keepAliveUrl.startsWith('https') ? https : http;
        client.get(`${keepAliveUrl}/health`, () => {}).on('error', () => {});
      } catch (e) {}
    }, 10 * 60 * 1000); // 10 phút ping một lần giữ máy chủ luôn thức
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
