/**
 * Tests for logger utility module
 */

const path = require('path');
const fs = require('fs');

// Mock fs and winston before importing logger
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    errors: jest.fn(() => 'errors-format'),
    json: jest.fn(() => 'json-format'),
    printf: jest.fn(() => 'printf-format'),
    colorize: jest.fn(() => 'colorize-format')
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock helpers
jest.mock('../../../helpers', () => ({
  generateId: jest.fn(() => 'test-id-123')
}));

const winston = require('winston');
const logger = require('../../../logger');

describe('Logger Utils', () => {
  let mockLogger;
  let mockConsoleTransport;
  let mockFileTransport;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock logger instance
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      close: jest.fn(() => Promise.resolve()),
      transports: []
    };

    // Mock transports
    mockConsoleTransport = { close: jest.fn() };
    mockFileTransport = { close: jest.fn() };

    // Set up winston mocks
    winston.createLogger.mockReturnValue(mockLogger);
    winston.transports.Console.mockReturnValue(mockConsoleTransport);
    winston.transports.File.mockReturnValue(mockFileTransport);

    // Mock fs methods
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockReturnValue(true);
  });

  describe('Logger Creation and Directory Setup', () => {
    test('should create logs directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      // Re-require logger to trigger directory creation
      delete require.cache[require.resolve('../../../logger')];
      require('../../../logger');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    test('should not create logs directory if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      delete require.cache[require.resolve('../../../logger')];
      require('../../../logger');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Loggers', () => {
    test('should expose fraud logger', () => {
      expect(logger.fraudLogger).toBeDefined();
      expect(typeof logger.fraudLogger.warn).toBe('function');
    });

    test('should expose settlement logger', () => {
      expect(logger.settlementLogger).toBeDefined();
      expect(typeof logger.settlementLogger.info).toBe('function');
    });

    test('should expose transaction logger', () => {
      expect(logger.transactionLogger).toBeDefined();
      expect(typeof logger.transactionLogger.info).toBe('function');
    });

    test('should expose security logger', () => {
      expect(logger.securityLogger).toBeDefined();
      expect(typeof logger.securityLogger.warn).toBe('function');
      expect(typeof logger.securityLogger.error).toBe('function');
    });

    test('should expose audit logger', () => {
      expect(logger.auditLogger).toBeDefined();
      expect(typeof logger.auditLogger.info).toBe('function');
    });

    test('should expose performance logger', () => {
      expect(logger.performanceLogger).toBeDefined();
      expect(typeof logger.performanceLogger.info).toBe('function');
    });
  });

  describe('Specialized Logging Functions', () => {
    test('should log fraud events', () => {
      const event = 'SUSPICIOUS_ACTIVITY';
      const data = { amount: 1000, account: 'test' };
      const userId = 'user-123';
      
      logger.logFraudEvent(event, data, userId);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Fraud Event: ${event}`,
        expect.objectContaining({
          event,
          data,
          userId,
          correlationId: expect.any(String)
        })
      );
    });

    test('should log settlement events', () => {
      const action = 'SETTLEMENT_PROCESSED';
      const settlement = { id: 'settlement-123', amount: 500 };
      const userId = 'user-123';
      
      logger.logSettlementEvent(action, settlement, userId);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Settlement: ${action}`,
        expect.objectContaining({
          action,
          settlement,
          userId
        })
      );
    });

    test('should log transaction events', () => {
      const type = 'TRANSACTION_CREATED';
      const transaction = { id: 'txn-123', amount: 250 };
      const userId = 'user-123';
      
      logger.logTransactionEvent(type, transaction, userId);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Transaction: ${type}`,
        expect.objectContaining({
          type,
          transaction,
          userId
        })
      );
    });

    test('should log security events', () => {
      const event = 'LOGIN_ATTEMPT';
      const data = { ip: '127.0.0.1', userAgent: 'test-agent' };
      const userId = 'user-123';
      
      logger.logSecurityEvent(event, data, userId);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Security Event: ${event}`,
        expect.objectContaining({
          event,
          data,
          userId
        })
      );
    });

    test('should log audit events', () => {
      const action = 'USER_UPDATED';
      const resource = 'user';
      const changes = { email: 'new@email.com' };
      const userId = 'user-123';
      
      logger.logAuditEvent(action, resource, changes, userId);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Audit: ${action}`,
        expect.objectContaining({
          action,
          resource,
          changes,
          userId
        })
      );
    });

    test('should log performance data', () => {
      const operation = 'DATABASE_QUERY';
      const duration = 150;
      const metadata = { query: 'SELECT * FROM users' };
      
      logger.logPerformance(operation, duration, metadata);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Performance: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          metadata
        })
      );
    });
  });

  describe('Correlation ID Support', () => {
    test('should support withCorrelationId function', () => {
      expect(typeof logger.withCorrelationId).toBe('function');
      
      const correlationId = 'test-correlation-id';
      const result = logger.withCorrelationId(correlationId);
      
      expect(result).toEqual({ correlationId });
    });

    test('should use correlation ID in fraud logging', () => {
      const correlationId = 'fraud-correlation-123';
      
      logger.logFraudEvent('TEST_EVENT', {}, 'user-123', correlationId);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Fraud Event: TEST_EVENT',
        expect.objectContaining({
          correlationId
        })
      );
    });

    test('should generate correlation ID when not provided', () => {
      logger.logFraudEvent('TEST_EVENT', {}, 'user-123');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Fraud Event: TEST_EVENT',
        expect.objectContaining({
          correlationId: 'test-id-123'
        })
      );
    });
  });

  describe('Sensitive Data Masking', () => {
    test('should provide maskSensitiveData function', () => {
      expect(typeof logger.maskSensitiveData).toBe('function');
    });

    test('should mask sensitive fields', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
        ssn: '123-45-6789',
        creditCard: '4111111111111111'
      };
      
      const masked = logger.maskSensitiveData(sensitiveData);
      
      expect(masked.username).toBe('testuser');
      expect(masked.password).toBe('***');
      expect(masked.ssn).toBe('***');
      expect(masked.creditCard).toBe('***');
    });

    test('should handle nested sensitive data', () => {
      const data = {
        user: {
          name: 'John',
          password: 'secret'
        },
        payment: {
          amount: 100,
          creditCard: '4111111111111111'
        }
      };
      
      const masked = logger.maskSensitiveData(data);
      
      expect(masked.user.name).toBe('John');
      expect(masked.user.password).toBe('***');
      expect(masked.payment.amount).toBe(100);
      expect(masked.payment.creditCard).toBe('***');
    });
  });

  describe('Logger Management', () => {
    test('should close all loggers', async () => {
      // Add some mock transports to the logger
      mockLogger.transports = [mockConsoleTransport, mockFileTransport];
      
      await logger.closeLoggers();
      
      expect(mockLogger.close).toHaveBeenCalled();
    });

    test('should handle logger close errors gracefully', async () => {
      const closeError = new Error('Close failed');
      mockLogger.close.mockRejectedValueOnce(closeError);
      
      await expect(logger.closeLoggers()).resolves.toBeUndefined();
    });

    test('should close individual transports', async () => {
      mockLogger.transports = [mockConsoleTransport, mockFileTransport];
      
      await logger.closeLoggers();
      
      expect(mockConsoleTransport.close).toHaveBeenCalled();
      expect(mockFileTransport.close).toHaveBeenCalled();
    });
  });

  describe('Request Logging Middleware', () => {
    test('should provide createRequestLogger function', () => {
      expect(typeof logger.createRequestLogger).toBe('function');
    });

    test('should create middleware function', () => {
      const middleware = logger.createRequestLogger();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Error Logger Middleware', () => {
    test('should provide errorLogger function', () => {
      expect(typeof logger.errorLogger).toBe('function');
    });

    test('should log errors and call next', () => {
      const error = new Error('Test error');
      const req = { method: 'GET', url: '/test' };
      const res = {};
      const next = jest.fn();
      
      logger.errorLogger(error, req, res, next);
      
      expect(mockLogger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});