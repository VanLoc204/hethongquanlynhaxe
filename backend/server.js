const dotenv = require('dotenv');
const app = require('./app');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

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

    // 3. Periodic midnight / auto-freeze check for unsubmitted trip reports
    const { autoMidnightCheck } = require('./controllers/tripReportController');
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
      } catch (err) {
        // Silently catch background interval error
      }
    }, 15 * 60 * 1000); // Mỗi 15 phút kiểm tra một lần
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
