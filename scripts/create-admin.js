#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: node scripts/create-admin.js <email> <password> [role]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import after dotenv to ensure env vars are loaded
import Admin from '../src/models/Admin.js';

const createAdmin = async () => {
  const [, , email, password, role = 'admin'] = process.argv;
  
  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [role]');
    console.error('Example: node scripts/create-admin.js admin@example.com mypassword123 superadmin');
    process.exit(1);
  }
  
  if (!['admin', 'superadmin'].includes(role)) {
    console.error('Role must be either "admin" or "superadmin"');
    process.exit(1);
  }
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if admin with email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.error(`Admin with email ${email} already exists`);
      process.exit(1);
    }
    
    // Create admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      role,
    });
    
    console.log('✅ Admin created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
