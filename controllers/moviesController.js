const { ObjectId } = require('mongodb');
const { moviesCollection } = require('../models/movie');

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

/** Validate film body for create/update. Returns { errors, data }. */
function validateFilmBody(body, requireAll) {
  const errors = [];
  const { title, year, genre, genres, rating, director, poster, posterUrl, description } = body;
  const currentYear = new Date().getFullYear();

  if (requireAll || title !== undefined) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push('title must be a non-empty string');
    }
  }

  if (requireAll || year !== undefined) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1888 || y > currentYear + 1) {
      errors.push(`year must be between 1888 and ${currentYear + 1}`);
    }
  }

  const gs = normalizeGenres(genre, genres);
  if (requireAll || genre !== undefined || genres !== undefined) {
    if (gs.length < 1 || gs.length > GENRES_MAX) {
      errors.push(`genres must contain 1-${GENRES_MAX} items`);
    }
    for (const g of gs) {
      if (!g || typeof g !== 'string') {
        errors.push('each genre must be a non-empty string');
        break;
      }
    }
  }

  if (rating !== undefined && rating !== null && rating !== '') {
    const r = validateRating(rating);
    if (r === null) {
      errors.push(`rating must be between ${RATING_MIN} and ${RATING_MAX}`);
    }
  }

  const data = {
    title: title !== undefined ? String(title).trim() : undefined,
    year: year !== undefined && year !== null && year !== '' ? Number(year) : undefined,
    genres: gs.length ? gs : undefined,
    rating: rating !== undefined && rating !== null && rating !== '' ? Number(rating) : undefined,
    director: director !== undefined ? (director ? String(director).trim() : null) : undefined,
    poster: poster || posterUrl || undefined,
    posterUrl: poster || posterUrl || undefined,
    description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
  };

  return { errors, data };
}

// GET all movies (public)
async function listMovies(req, res) {
  const { title, genre, year, sort, fields } = req.query;

  if (req.query.ids) {
    const ids = String(req.query.ids)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (ids.length === 0) {
      return res.status(200).json([]);
    }

    try {
      const movies = await moviesCollection().find({ _id: { $in: ids } }).toArray();
      return res.status(200).json(movies);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

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
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const skip = (page - 1) * limit;

    const cursor = moviesCollection()
      .find(filter, { projection: Object.keys(projection).length ? projection : undefined })
      .sort(sortSpec)
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      cursor.toArray(),
      moviesCollection().countDocuments(filter),
    ]);

    res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET movie by ID (public)
async function getMovie(req, res) {
  const _id = parseObjectId(req, res);
  if (!_id) return;
  try {
    const movie = await moviesCollection().findOne({ _id });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.status(200).json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST create movie (protected)
async function createMovie(req, res) {
  const validated = validateFilmBody(req.body, true);
  if (validated.errors.length) {
    return res.status(400).json({ message: 'Validation error', errors: validated.errors });
  }
  const { title, year, genres, rating, director, poster, posterUrl, description } = validated.data;

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
    const result = await moviesCollection().insertOne(movieData);
    res.status(201).json({ _id: result.insertedId, ...movieData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT update movie (protected)
async function updateMovie(req, res) {
  const _id = parseObjectId(req, res);
  if (!_id) return;

  const validated = validateFilmBody(req.body, true);
  if (validated.errors.length) {
    return res.status(400).json({ message: 'Validation error', errors: validated.errors });
  }

  const updateData = { updatedAt: new Date() };
  if (validated.data.title !== undefined) updateData.title = validated.data.title;
  if (validated.data.year !== undefined) updateData.year = validated.data.year;
  if (validated.data.genres !== undefined) {
    updateData.genres = validated.data.genres;
    updateData.genre = validated.data.genres && validated.data.genres[0] ? validated.data.genres[0] : 'general';
  }
  if (validated.data.rating !== undefined) updateData.rating = validated.data.rating;
  if (validated.data.director !== undefined) updateData.director = validated.data.director;
  if (validated.data.posterUrl !== undefined) {
    updateData.poster = validated.data.posterUrl || null;
    updateData.posterUrl = validated.data.posterUrl || null;
  }
  if (validated.data.description !== undefined) updateData.description = validated.data.description;

  if (Object.keys(updateData).length === 1) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const result = await moviesCollection().findOneAndUpdate(
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
}

// DELETE movie (protected)
async function deleteMovie(req, res) {
  const _id = parseObjectId(req, res);
  if (!_id) return;
  try {
    const result = await moviesCollection().deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Movie not found' });
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listMovies, getMovie, createMovie, updateMovie, deleteMovie };
