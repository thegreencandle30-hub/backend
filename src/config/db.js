import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from './env.js';

// Cache connection state for serverless environments
let isConnected = false;

/**
 * Connect to MongoDB with support for both serverful and serverless environments.
 * In serverless (Vercel), connections are cached to avoid creating new connections
 * on every function invocation.
 */
const connectDB = async () => {
  // If already connected, reuse the connection
  if (isConnected) {
    logger.debug('Using cached database connection');
    return;
  }

  // Check if mongoose already has an active connection
  if (mongoose.connections[0].readyState === 1) {
    isConnected = true;
    logger.debug('Using existing database connection');
    return;
  }

  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      // Settings optimized for both serverful and serverless
      bufferCommands: false,
      maxPoolSize: env.isServerless ? 10 : 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    // Only exit process in serverful environment
    if (!env.isServerless) {
      process.exit(1);
    }
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error(`MongoDB error: ${err.message}`);
});

export default connectDB;
