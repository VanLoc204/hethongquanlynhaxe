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
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
