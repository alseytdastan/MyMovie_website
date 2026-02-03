require('dotenv').config();

const express = require('express');
const session = require('express-session');
const ConnectMongo = require('connect-mongo');
const MongoStore = ConnectMongo.default || ConnectMongo; 
const path = require('path');
const fs = require('fs');

const { connectToDb } = require('./database/mongo');
const moviesRouter = require('./routes/movies');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;


if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is missing');
  process.exit(1);
}

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017';

const dbName = process.env.MONGO_DB_NAME || 'mymovie';

console.log('SERVER FILE STARTED');
console.log('PORT:', PORT);
console.log('MONGO_URI:', mongoUri ? '(set)' : '(missing)');
console.log('MONGO_DB_NAME:', dbName);


app.set('trust proxy', 1);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      dbName: dbName,
      ttl: 14 * 24 * 60 * 60, 
    }),
    cookie: {
      httpOnly: true,                       
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
);

app.get('/films', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'films.html'))
);

app.get('/films/:id', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'film.html'))
);

app.get('/add-film', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'add-film.html'))
);

app.get('/watchlist', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'watchlist.html'))
);

app.get('/profile', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'profile.html'))
);

app.get('/about', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'about.html'))
);

app.get('/contact', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'contact.html'))
);

app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'login.html'))
);

//LEGACY REDIRECTS
app.get('/search', (req, res) => {
  const { q } = req.query;
  if (q) return res.redirect(`/films?search=${encodeURIComponent(q)}`);
  res.redirect('/films');
});

app.get('/item/:id', (req, res) =>
  res.redirect(`/films/${req.params.id}`)
);

//auth api 
app.use('/auth', authRouter);

//movies api 
app.use('/api/movies', moviesRouter);

//contact form
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
      } catch {}
    }

    messages.push(newMessage);

    fs.writeFile('data.json', JSON.stringify(messages, null, 2), err2 => {
      if (err2) return res.status(500).send('Error saving data');
      res.send(`<h2>Thanks, ${name}! Your message has been received.</h2>`);
    });
  });
});

//404 HANDLER
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    res.status(404).json({ error: 'Route not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  }
});

//GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// TART SERVER 
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
