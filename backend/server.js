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

// Import AI services
const { getServiceManager } = require('./ai/serviceManager');
const { getServerConfig } = require('./config/server');

// Initialize configuration
const serverConfig = getServerConfig();

// Initialize Express app
const app = express();
const { server: { port: PORT } } = serverConfig.getAll();

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

// ===== CORS MIDDLEWARE =====
const corsConfig = serverConfig.getSecurityConfig();
app.use(cors({
  origin: corsConfig.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===== RATE LIMITING =====
const rateLimitConfig = serverConfig.getRateLimitConfig();
if (rateLimitConfig.enabled) {
  const limiter = rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

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
app.get('/health', async (req, res) => {
  try {
    // Get basic API health
    const apiHealth = {
      success: true,
      message: 'SafeSplitX API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: serverConfig.getServerConfig().environment
    };

    // Get AI services health if available
    if (serverConfig.getAIServicesConfig().enabled) {
      try {
        const aiServiceManager = getServiceManager();
        const aiHealth = aiServiceManager.getStatus();
        apiHealth.ai = aiHealth;
      } catch (error) {
        apiHealth.ai = { 
          status: 'error', 
          error: error.message 
        };
      }
    }

    res.status(200).json(apiHealth);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
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
      if (!serverConfig.isProduction()) {
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

// ===== AI SERVICES INITIALIZATION =====
const initializeAIServices = async () => {
  if (process.env.ENABLE_AI_SERVICES === 'false') {
    logger.info('AI services disabled by configuration');
    return;
  }

  try {
    logger.info('Initializing AI services...');
    const aiServiceManager = getServiceManager();
    const result = await aiServiceManager.initialize();
    
    if (result.success) {
      logger.info('AI services initialized successfully');
    } else {
      logger.warn('AI services initialization completed with issues', { 
        message: result.message 
      });
    }
  } catch (error) {
    logger.error('AI services initialization failed:', error);
    
    // Don't exit if AI services fail unless strict mode is enabled
    if (serverConfig.getAIServicesConfig().strictMode) {
      process.exit(1);
    } else {
      logger.warn('Continuing without AI services');
    }
  }
};

// ===== SERVER STARTUP =====
const startServer = async () => {
  try {
    await initializeDatabase();
    await initializeAIServices();
    
    app.listen(PORT, () => {
      logger.info(`SafeSplitX Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${serverConfig.getServerConfig().environment}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      
      if (!serverConfig.isProduction()) {
        logger.info(`Frontend URL: ${serverConfig.getServerConfig().frontendUrl}`);
        logger.info('API endpoints are placeholders - implement in your assigned modules');
      }
      
      // Log AI services status
      if (serverConfig.getAIServicesConfig().enabled) {
        logger.info('AI-powered fraud detection is enabled');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    if (serverConfig.getAIServicesConfig().enabled) {
      const aiServiceManager = getServiceManager();
      await aiServiceManager.shutdown();
    }
  } catch (error) {
    logger.error('Error during AI services shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    if (serverConfig.getAIServicesConfig().enabled) {
      const aiServiceManager = getServiceManager();
      await aiServiceManager.shutdown();
    }
  } catch (error) {
    logger.error('Error during AI services shutdown:', error);
  }
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