const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/mongo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const RATING_MIN = 0;
const RATING_MAX = 10;
const GENRES_MAX = 6;

function parseObjectId(req, res) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return new ObjectId(id);
}

/** Normalize genres: accept array or string, return array of non-empty strings, max GENRES_MAX. */
function normalizeGenres(genre, genres) {
  let arr = Array.isArray(genres) ? genres : [];
  if (arr.length === 0 && genre != null && genre !== '') {
    const s = String(genre).trim();
    if (s) arr = [s];
  }
  arr = arr.map((g) => String(g).trim()).filter(Boolean);
  return arr.slice(0, GENRES_MAX);
}

/** Validate rating: number in [RATING_MIN, RATING_MAX]. Returns null if invalid. */
function validateRating(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < RATING_MIN || n > RATING_MAX) return null;
  return n;
}

/** Validate film body for create/update. Returns { error } or { title, year, genres, rating, director, poster, posterUrl, description }. */
function validateFilmBody(body, isUpdate) {
  const { title, year, genre, genres, rating, director, poster, posterUrl, description } = body;
  if (!isUpdate && (!title || typeof title !== 'string' || !title.trim())) {
    return { error: 'Title is required' };
  }
  if (title !== undefined && typeof title === 'string' && !title.trim()) {
    return { error: 'Title cannot be empty' };
  }
  if (!isUpdate && (year === undefined || year === null || year === '')) {
    return { error: 'Year is required' };
  }
  if (year !== undefined && year !== null && year !== '') {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear() + 1) {
      return { error: 'Year must be an integer between 1800 and ' + (new Date().getFullYear() + 1) };
    }
  }
  const gs = normalizeGenres(genre, genres);
  if (gs.length > GENRES_MAX) {
    return { error: 'At most ' + GENRES_MAX + ' genres allowed' };
  }
  for (const g of gs) {
    if (!g || typeof g !== 'string') return { error: 'Each genre must be a non-empty string' };
  }
  const r = validateRating(rating);
  if (rating !== undefined && rating !== null && rating !== '' && r === null) {
    return { error: 'Rating must be a number between ' + RATING_MIN + ' and ' + RATING_MAX };
  }
  return {
    title: title !== undefined ? String(title).trim() : undefined,
    year: year !== undefined && year !== null && year !== '' ? Number(year) : undefined,
    genres: gs.length ? gs : undefined,
    rating: r !== undefined ? r : undefined,
    director: director !== undefined ? (director ? String(director).trim() : null) : undefined,
    poster: poster || posterUrl || undefined,
    posterUrl: poster || posterUrl || undefined,
    description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
  };
}

// GET all movies (public)
router.get('/', async (req, res) => {
  const { title, genre, year, sort, fields } = req.query;

  const filter = {};
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (genre) {
    filter.$or = [{ genre: genre }, { genres: genre }];
  }
  if (year !== undefined) {
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum)) return res.status(400).json({ error: 'Year must be an integer' });
    if (yearNum < 1800 || yearNum > new Date().getFullYear())
      return res.status(400).json({ error: 'Year out of range' });
    filter.year = yearNum;
  }

  const projection = {};
  if (fields) {
    fields.split(',').forEach((f) => {
      const t = f.trim();
      if (t) projection[t] = 1;
    });
    if (Object.keys(projection).length > 0 && !projection._id) projection._id = 1;
  }

  let sortSpec = { year: 1 };
  if (sort) {
    if (sort === 'year' || sort === 'year:asc') sortSpec = { year: 1 };
    else if (sort === 'year:desc') sortSpec = { year: -1 };
    else {
      const [field, dir] = sort.split(':');
      if (field) sortSpec = { [field]: dir === 'desc' ? -1 : 1 };
    }
  }

  try {
    const db = getDb();
    const movies = await db
      .collection('movies')
      .find(filter, { projection: Object.keys(projection).length ? projection : undefined })
      .sort(sortSpec)
      .toArray();
    res.status(200).json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET movie by ID (public)
router.get('/:id', async (req, res) => {
  const _id = parseObjectId(req, res);
  if (!_id) return;
  try {
    const db = getDb();
    const movie = await db.collection('movies').findOne({ _id });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.status(200).json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create movie (protected)
router.post('/', requireAuth, async (req, res) => {
  const validated = validateFilmBody(req.body, false);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }
  const { title, year, genres, rating, director, poster, posterUrl, description } = validated;
  if (!title || year === undefined) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  const movieData = {
    title,
    year,
    genres: genres && genres.length ? genres : [],
    genre: genres && genres[0] ? genres[0] : 'general',
    rating: rating !== undefined ? rating : null,
    director: director || null,
    poster: poster || posterUrl || null,
    posterUrl: poster || posterUrl || null,
    description: description || null,
    createdAt: new Date(),
  };

  try {
    const db = getDb();
    const result = await db.collection('movies').insertOne(movieData);
    res.status(201).json({ _id: result.insertedId, ...movieData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update movie (protected)
router.put('/:id', requireAuth, async (req, res) => {
  const _id = parseObjectId(req, res);
  if (!_id) return;

  const validated = validateFilmBody(req.body, true);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  const updateData = { updatedAt: new Date() };
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.year !== undefined) updateData.year = validated.year;
  if (validated.genres !== undefined) {
    updateData.genres = validated.genres;
    updateData.genre = validated.genres && validated.genres[0] ? validated.genres[0] : 'general';
  }
  if (validated.rating !== undefined) updateData.rating = validated.rating;
  if (validated.director !== undefined) updateData.director = validated.director;
  if (validated.posterUrl !== undefined) {
    updateData.poster = validated.posterUrl || null;
    updateData.posterUrl = validated.posterUrl || null;
  }
  if (validated.description !== undefined) updateData.description = validated.description;

  if (Object.keys(updateData).length === 1) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const db = getDb();
    const result = await db.collection('movies').findOneAndUpdate(
      { _id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    const doc = result.value ?? result;
    if (!doc) return res.status(404).json({ error: 'Movie not found' });
    res.status(200).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE movie (protected)
router.delete('/:id', requireAuth, async (req, res) => {
  const _id = parseObjectId(req, res);
  if (!_id) return;
  try {
    const db = getDb();
    const result = await db.collection('movies').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Movie not found' });
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
