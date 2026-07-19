const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );
    console.log(`MongoDB connected successfully in REVIEW-SERVICE: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error in REVIEW-SERVICE: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
