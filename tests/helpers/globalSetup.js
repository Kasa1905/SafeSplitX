const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
  // Start MongoDB Memory Server
  mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'splitsafex_test'
    }
  });

  const uri = mongod.getUri();
  process.env.MONGODB_URI_TEST = uri;
  process.env.MONGODB_URI = uri;

  // Set other test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-global-setup';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';

  // Store mongod instance globally so teardown can access it
  global.__MONGOD__ = mongod;

  console.log('Global test setup completed');
};