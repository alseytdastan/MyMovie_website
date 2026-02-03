require('dotenv').config();
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'mymovie';
const username = process.env.ADMIN_USERNAME || 'admin';
const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';

async function seed() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      console.log('User already exists:', username);
      process.exit(0);
      return;
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);
    await db.collection('users').insertOne({
      username,
      passwordHash,
      role: 'admin',
      createdAt: new Date(),
    });
    console.log('User created:', username);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
