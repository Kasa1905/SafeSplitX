/**
 * Database Configuration for SafeSplitX
 * Handles connections to both MongoDB and PostgreSQL
 */

const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// MongoDB connection configuration
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0 // Disable mongoose buffering
};

// PostgreSQL connection configuration
const postgresConfig = {
  logging: (msg) => logger.info(msg), // Log SQL queries
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};

let mongoConnection = null;
let postgresConnection = null;

/**
 * Connect to MongoDB using Mongoose
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
const connectMongoDB = async () => {
  try {
    if (mongoConnection && mongoConnection.readyState === 1) {
      logger.info('MongoDB already connected');
      return mongoConnection;
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, mongoConfig);
    
    mongoConnection = mongoose.connection;
    
    mongoConnection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoConnection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoConnection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    logger.info('MongoDB connected successfully');
    return mongoConnection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Connect to PostgreSQL using Sequelize
 * @returns {Promise<Sequelize>} PostgreSQL connection
 */
const connectPostgreSQL = async () => {
  try {
    if (postgresConnection) {
      await postgresConnection.authenticate();
      logger.info('PostgreSQL already connected');
      return postgresConnection;
    }

    const postgresUri = process.env.POSTGRES_URI;
    const postgresConfig = {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    };

    // Use URI if provided, otherwise use individual config values
    if (postgresUri) {
      postgresConnection = new Sequelize(postgresUri, {
        ...postgresConfig,
        logging: (msg) => logger.info(msg)
      });
    } else if (postgresConfig.host && postgresConfig.database && postgresConfig.username) {
      postgresConnection = new Sequelize(
        postgresConfig.database,
        postgresConfig.username,
        postgresConfig.password,
        {
          host: postgresConfig.host,
          port: postgresConfig.port,
          ...postgresConfig
        }
      );
    } else {
      throw new Error('PostgreSQL configuration is incomplete. Provide either POSTGRES_URI or individual config values.');
    }

    logger.info('Connecting to PostgreSQL...');
    await postgresConnection.authenticate();

    // Sync database in development
    if (process.env.NODE_ENV === 'development') {
      await postgresConnection.sync({ alter: true });
      logger.info('PostgreSQL database synced');
    }

    logger.info('PostgreSQL connected successfully');
    return postgresConnection;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
};

/**
 * Auto-detect and connect to available database
 * Priority: MongoDB first, then PostgreSQL
 * @returns {Promise<{type: string, connection: any}>}
 */
const connectDatabase = async () => {
  try {
    // Try MongoDB first
    if (process.env.MONGODB_URI) {
      const connection = await connectMongoDB();
      return { type: 'mongodb', connection };
    }
    
    // Fallback to PostgreSQL
    if (process.env.POSTGRES_URI || process.env.POSTGRES_HOST) {
      const connection = await connectPostgreSQL();
      return { type: 'postgresql', connection };
    }
    
    throw new Error('No database configuration found. Please set up MongoDB or PostgreSQL environment variables.');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Close database connections
 * @returns {Promise<void>}
 */
const closeDatabaseConnections = async () => {
  try {
    if (mongoConnection) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
    
    if (postgresConnection) {
      await postgresConnection.close();
      logger.info('PostgreSQL connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};

/**
 * Get current database connection info
 * @returns {Object} Database connection information
 */
const getDatabaseInfo = () => {
  const info = {
    mongodb: {
      connected: mongoConnection && mongoConnection.readyState === 1,
      uri: process.env.MONGODB_URI ? '***configured***' : 'not configured'
    },
    postgresql: {
      connected: postgresConnection && postgresConnection.authenticate,
      config: process.env.POSTGRES_URI || process.env.POSTGRES_HOST ? '***configured***' : 'not configured'
    }
  };
  
  return info;
};

module.exports = {
  connectMongoDB,
  connectPostgreSQL,
  connectDatabase,
  closeDatabaseConnections,
  getDatabaseInfo,
  getMongoConnection: () => mongoConnection,
  getPostgresConnection: () => postgresConnection
};