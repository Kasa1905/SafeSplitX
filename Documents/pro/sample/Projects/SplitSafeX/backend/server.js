/**
 * SafeSplitX Backend Server
 * AI-Powered Expense Management Platform
 * 
 * Entry point for the Express.js API server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Import custom middleware and utilities
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { generateRequestId } = require('./middleware/requestId');
const { sanitizationMiddleware } = require('./middleware/sanitization');

// Import route handlers
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const groupRoutes = require('./routes/groups');
const settlementRoutes = require('./routes/settlements');
const paymentRoutes = require('./routes/payments');
const currencyRoutes = require('./routes/currency');
const analyticsRoutes = require('./routes/analytics');
const fraudRoutes = require('./routes/fraud');

// Import database configuration
const { connectDatabase } = require('./config/database');
const { initializeModels } = require('./models');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ===== CORS CONFIGURATION =====
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ===== RATE LIMITING =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===== GENERAL MIDDLEWARE =====
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID and sanitization middleware
app.use(generateRequestId);
app.use(sanitizationMiddleware);

// ===== UPLOAD DIRECTORY SETUP =====
const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Upload directory created successfully');
} catch (error) {
  logger.error('Failed to create upload directory:', error);
}

// ===== STATIC FILE SERVING =====
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ===== HEALTH CHECK ENDPOINT =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafeSplitX API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== API ROUTES =====

// Authentication routes
app.use('/api/auth', authRoutes);

// Expense management routes
app.use('/api/expenses', expenseRoutes);

// Group management routes
app.use('/api/groups', groupRoutes);

// Settlement management routes
app.use('/api/settlements', settlementRoutes);

// Payment processing routes
app.use('/api/payments', paymentRoutes);

// Currency management routes
app.use('/api/currency', currencyRoutes);

// Analytics and reporting routes
app.use('/api/analytics', analyticsRoutes);

// Fraud detection routes
app.use('/api/fraud', fraudRoutes);

// ===== 404 HANDLER =====
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== DATABASE CONNECTION =====
const initializeDatabase = async () => {
  try {
    // Connect to database and get connection details
    const { type, connection } = await connectDatabase();
    logger.info(`Database connected successfully (${type})`);
    
    // Initialize models based on database type
    if (type === 'postgresql') {
      initializeModels(connection);
      // Optional dev sync for PostgreSQL
      if (process.env.NODE_ENV !== 'production') {
        await connection.sync({ alter: true });
        logger.info('PostgreSQL database synced successfully');
      }
    } else {
      initializeModels();
    }
    
    logger.info('Database models initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// ===== SERVER STARTUP =====
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`SafeSplitX Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        logger.info('API endpoints are placeholders - implement in your assigned modules');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;