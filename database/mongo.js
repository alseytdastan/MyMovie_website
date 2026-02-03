const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'mymovie';

let db;
let client;

async function connectToDb() {
  if (db) return db;

  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database "${dbName}"`);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw new Error('Database connection failed');
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function getClient() {
  if (!client) throw new Error('Database not initialized');
  return client;
}

module.exports = { connectToDb, getDb, getClient, ObjectId };
