const mongoose = require('mongoose');
const supabaseService = require('../services/supabaseService');

class DatabaseService {
  constructor() {
    this.type = process.env.DATABASE_TYPE || 'mongodb';
    // Force MongoDB for Vercel deployments if Supabase is not properly configured
    if (process.env.VERCEL && !process.env.SUPABASE_URL) {
      this.type = 'mongodb';
      console.log('🔄 Forcing MongoDB usage on Vercel (Supabase not configured)');
    }
    this.mongodb = null;
    this.supabase = supabaseService;
  }

  async connect() {
    if (this.type === 'supabase') {
      console.log('📊 Using Supabase PostgreSQL database');
      return this.supabase;
    } else {
      console.log('📊 Connecting to MongoDB...');
      try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/dsp-brand-protection';
        await mongoose.connect(mongoUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('📊 MongoDB Connected:', mongoUri.includes('localhost') ? 'localhost' : 'remote');
        this.mongodb = mongoose;
        return this.mongodb;
      } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
      }
    }
  }

  getService() {
    if (this.type === 'supabase') {
      return this.supabase;
    } else {
      return this.mongodb;
    }
  }

  async disconnect() {
    if (this.type === 'mongodb' && this.mongodb) {
      await this.mongodb.disconnect();
      console.log('📊 MongoDB Disconnected');
    }
  }
}

module.exports = new DatabaseService();
