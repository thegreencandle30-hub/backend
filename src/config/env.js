import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    saltKey: process.env.PHONEPE_SALT_KEY,
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    env: process.env.PHONEPE_ENV || 'UAT',
  },
  
  // Market Data API Configuration
  market: {
    apiKey: process.env.MARKET_API_KEY,
    apiUrl: process.env.MARKET_API_URL || 'https://api.example.com/market',
    cacheTtl: parseInt(process.env.MARKET_CACHE_TTL, 10) || 60, // seconds
  },
  
  // FCM (Firebase Cloud Messaging) for Push Notifications
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
    enabled: process.env.FCM_ENABLED === 'true',
  },
  
  adminCorsOrigin: process.env.ADMIN_CORS_ORIGIN || 'http://localhost:3000',
};

export default env;
