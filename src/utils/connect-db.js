const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in your .env file');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI); 
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

module.exports = { connectDB };
