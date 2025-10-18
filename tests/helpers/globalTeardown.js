module.exports = async () => {
  // Stop MongoDB Memory Server
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }

  console.log('Global test teardown completed');
};