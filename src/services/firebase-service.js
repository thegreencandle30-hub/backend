import admin from 'firebase-admin';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }
  
  try {
    // Check if Firebase credentials are configured
    if (!env.firebase.projectId || !env.firebase.privateKey || !env.firebase.clientEmail) {
      logger.warn('Firebase credentials not configured. Firebase features will be disabled.');
      return null;
    }
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        privateKey: env.firebase.privateKey,
        clientEmail: env.firebase.clientEmail,
      }),
    });
    
    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error(`Firebase initialization error: ${error.message}`);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} Decoded token with user info
 */
export const verifyIdToken = async (idToken) => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  
  if (!firebaseApp) {
    throw new Error('Firebase is not initialized');
  }
  
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken;
};

/**
 * Get user by Firebase UID
 * @param {string} uid - Firebase UID
 * @returns {Promise<Object>} Firebase user record
 */
export const getFirebaseUser = async (uid) => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  
  if (!firebaseApp) {
    throw new Error('Firebase is not initialized');
  }
  
  const userRecord = await admin.auth().getUser(uid);
  return userRecord;
};

// Initialize Firebase on module load
initializeFirebase();

export default {
  verifyIdToken,
  getFirebaseUser,
};
