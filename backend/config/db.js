const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

    // Tự động nhận biết kết nối Atlas (mongodb+srv) hay local (mongodb://)
    const isAtlas = mongoUri.startsWith('mongodb+srv://');

    const conn = await mongoose.connect(mongoUri, {
      // Các option tương thích cả MongoDB local lẫn MongoDB Atlas
      serverSelectionTimeoutMS: 10000,  // Timeout 10 giây khi không kết nối được
      socketTimeoutMS: 45000,           // Timeout socket 45 giây
      ...(isAtlas && {
        // Option bổ sung chỉ dùng cho Atlas (TLS mặc định đã bật)
        retryWrites: true,
        w: 'majority'
      })
    });

    const host = conn.connection.host;
    if (isAtlas) {
      console.log(`☁️  MongoDB Atlas connected: ${host}`);
    } else {
      console.log(`🗄️  MongoDB Local connected: ${host}`);
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
