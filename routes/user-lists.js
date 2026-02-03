const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/mongo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseMovieId(req, res, movieId) {
  if (!ObjectId.isValid(movieId)) {
    res.status(400).json({ message: 'Invalid movie id' });
    return null;
  }
  return new ObjectId(movieId);
}

async function getListIds(db, collectionName, userId) {
  const items = await db
    .collection(collectionName)
    .find({ userId })
    .project({ movieId: 1 })
    .toArray();
  return items.map((i) => i.movieId.toString());
}

function listRoutes(listName, collectionName) {
  router.get(`/${listName}`, requireAuth, async (req, res) => {
    try {
      const db = getDb();
      const items = await getListIds(db, collectionName, req.session.user.id);
      res.status(200).json({ items });
    } catch (err) {
      console.error(`${listName} get error:`, err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.post(`/${listName}`, requireAuth, async (req, res) => {
    try {
      const { movieId } = req.body;
      const parsed = parseMovieId(req, res, movieId);
      if (!parsed) return;

      const db = getDb();
      const userId = req.session.user.id;
      const existing = await db.collection(collectionName).findOne({ userId, movieId: parsed });
      if (!existing) {
        await db.collection(collectionName).insertOne({ userId, movieId: parsed, createdAt: new Date() });
      }
      const items = await getListIds(db, collectionName, userId);
      res.status(200).json({ items });
    } catch (err) {
      console.error(`${listName} add error:`, err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.delete(`/${listName}/:movieId`, requireAuth, async (req, res) => {
    try {
      const parsed = parseMovieId(req, res, req.params.movieId);
      if (!parsed) return;

      const db = getDb();
      const userId = req.session.user.id;
      await db.collection(collectionName).deleteOne({ userId, movieId: parsed });
      const items = await getListIds(db, collectionName, userId);
      res.status(200).json({ items });
    } catch (err) {
      console.error(`${listName} delete error:`, err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

listRoutes('likes', 'likes');
listRoutes('watchlist', 'watchlist');

module.exports = router;
