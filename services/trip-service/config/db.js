const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );
    console.log(`MongoDB connected successfully in TRIP-SERVICE: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error in TRIP-SERVICE: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
