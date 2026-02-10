const { getDb } = require('../database/mongo');

function moviesCollection(db = getDb()) {
  return db.collection('movies');
}

module.exports = { moviesCollection };
