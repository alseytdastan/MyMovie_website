const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
} = require('../controllers/moviesController');

const router = express.Router();

router.get('/', listMovies);
router.get('/:id', getMovie);
router.post('/', requireAuth, requireAdmin, createMovie);
router.put('/:id', requireAuth, requireAdmin, updateMovie);
router.delete('/:id', requireAuth, requireAdmin, deleteMovie);

module.exports = router;
