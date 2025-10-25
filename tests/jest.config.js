module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
  collectCoverageFrom: [
    'backend/controllers/**/*.js',
    'backend/routes/**/*.js',
    'backend/middleware/**/*.js',
    'backend/ai/**/*.js',
    'backend/services/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  // globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  // globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1
};