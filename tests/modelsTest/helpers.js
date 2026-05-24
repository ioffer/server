const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo = null;

async function connect() {
  mongoose.set('strictQuery', false);
  mongoose.set('debug', false);
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'test' });
}

async function cleanup() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  mongo = null;
}

module.exports = { connect, cleanup, disconnect };
