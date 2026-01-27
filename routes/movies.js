const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/mongo');

const router = express.Router();

// Helper function for ObjectId validation
function parseObjectId(req, res) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return new ObjectId(id);
}

// GET all movies with filtering, sorting, projection
router.get('/', async (req, res) => {
  const { title, genre, year, sort, fields } = req.query;

  const filter = {};
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (genre) filter.genre = genre;
  if (year !== undefined) {
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum)) return res.status(400).json({ error: 'Year must be an integer' });
    if (yearNum < 1800 || yearNum > new Date().getFullYear())
      return res.status(400).json({ error: 'Year out of range' });
    filter.year = yearNum;
  }

  const projection = {};
  if (fields) {
    fields.split(',').forEach(f => {
      const t = f.trim();
      if (t) projection[t] = 1;
    });
    if (Object.keys(projection).length > 0 && !projection._id) projection._id = 1;
  }

  let sortSpec = { year: 1 };
  if (sort) {
    if (sort === 'year' || sort === 'year:asc') {
      sortSpec = { year: 1 };
    } else if (sort === 'year:desc') {
      sortSpec = { year: -1 };
    } else {
      const [field, dir] = sort.split(':');
      if (field) {
        sortSpec = { [field]: dir === 'desc' ? -1 : 1 };
      }
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

// GET movie by ID
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

// POST create new movie
router.post('/', async (req, res) => {
  const { title, genre, year, poster, posterUrl, description } = req.body;
  console.log("Received data:", { title, genre, year, poster, posterUrl, description });  

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  const movieData = {
    title,
    genre: genre || 'general',
    year: parseInt(year),
    poster: poster || posterUrl || null,
    posterUrl: poster || posterUrl || null,
    description: description || null,
    createdAt: new Date()
  };

  try {
    const db = getDb();
    console.log("Inserting movie data into MongoDB:", movieData);
    const result = await db.collection('movies').insertOne(movieData);
    res.status(201).json({ _id: result.insertedId, ...movieData });
  } catch (err) {
    console.error('Error while inserting movie:', err);  
    res.status(500).json({ error: 'Internal server error' });
  }
});




// PUT update movie by ID
router.put('/:id', async (req, res) => {
  const _id = parseObjectId(req, res);
  if (!_id) return;

  const { title, genre, year, poster, posterUrl, description } = req.body;

  const updateData = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (genre !== undefined) updateData.genre = genre;
  if (year !== undefined) {
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1800 || yearNum > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Year must be a valid integer between 1800 and ' + (new Date().getFullYear() + 1) });
    }
    updateData.year = yearNum;
  }
  if (poster !== undefined || posterUrl !== undefined) {
    updateData.poster = poster || posterUrl || null;
    updateData.posterUrl = poster || posterUrl || null;
  }
  if (description !== undefined) {
    updateData.description = description;
  }

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

    if (!result.value) return res.status(404).json({ error: 'Movie not found' });

    res.status(200).json(result.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE movie by ID
router.delete('/:id', async (req, res) => {
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
