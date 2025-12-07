/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Express app for Vercel's serverless functions.
 * It handles MongoDB connection caching for serverless environments.
 */
import app from '../app.js';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import logger from '../src/utils/logger.js';

// Cache the database connection in serverless environment
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.debug('Using cached database connection');
    return;
  }

  if (mongoose.connections[0].readyState) {
    isConnected = true;
    logger.debug('Using existing database connection');
    return;
  }

  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      // Serverless-optimized settings
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

// Wrap the app with database connection for serverless
const handler = async (req, res) => {
  await connectDB();
  return app(req, res);
};

export default handler;
