require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const { connectToDb } = require('./database/mongo');
const moviesRouter = require('./routes/movies');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('SERVER FILE STARTED');
console.log('PORT:', PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '(set)' : '(missing)');
console.log('MONGO_DB_NAME:', process.env.MONGO_DB_NAME || 'mymovie');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ====== FRONTEND PAGES ======

// Home page
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
);

// Films listing page
app.get('/films', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'films.html'))
);

// Film details page
app.get('/films/:id', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'film.html'))
);

// Add film page
app.get('/add-film', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'add-film.html'))
);

// Watchlist page
app.get('/watchlist', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'watchlist.html'))
);

// Profile page
app.get('/profile', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'profile.html'))
);

// About page
app.get('/about', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'about.html'))
);

// Contact page
app.get('/contact', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'contact.html'))
);

// Legacy routes redirects
app.get('/search', (req, res) => {
  const { q } = req.query;
  if (q) {
    return res.redirect(`/films?search=${encodeURIComponent(q)}`);
  }
  res.redirect('/films');
});

app.get('/item/:id', (req, res) =>
  res.redirect(`/films/${req.params.id}`)
);


// API info
app.get('/api/info', (req, res) => {
  res.json({
    project: 'Movies API',
    version: '1.0.0',
    endpoints: {
      'GET /api/movies': 'Get all movies',
      'GET /api/movies/:id': 'Get movie by id',
      'POST /api/movies': 'Create movie',
      'PUT /api/movies/:id': 'Update movie',
      'DELETE /api/movies/:id': 'Delete movie'
    }
  });
});

// Movies API
app.use('/api/movies', moviesRouter);

// Contact form (saves to local data.json)
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).send('All fields are required');
  }

  const newMessage = { name, email, message, createdAt: new Date() };

  fs.readFile('data.json', 'utf8', (err, data) => {
    let messages = [];

    if (!err && data) {
      try {
        messages = JSON.parse(data);
      } catch {
        messages = [];
      }
    }

    messages.push(newMessage);

    fs.writeFile('data.json', JSON.stringify(messages, null, 2), err2 => {
      if (err2) return res.status(500).send('Error saving data');
      res.send(`<h2>Thanks, ${name}! Your message has been received.</h2>`);
    });
  });
});

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Route not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  }
});

// ✅ Connect DB first, then start server
connectToDb()
  .then(() => {
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

module.exports = app;
