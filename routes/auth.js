const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../database/mongo');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ username: u });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(p, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const role = user.role === 'admin' ? 'admin' : 'user';
    req.session.user = { id: user._id.toString(), username: user.username, role };
    res.status(200).json({ message: 'ok' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Invalid credentials' });
  }
});

/**
 * POST /auth/register
 * Body: { username, password }
 * On success: create user, set req.session.user = { id, username }, return { message: "ok" }
 * On validation/auth fail: 400 { message: "Invalid credentials" }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const u = username.trim();
    const p = password;
    if (!u || u.length < 3 || !p || p.length < 6) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const db = getDb();
    const existing = await db.collection('users').findOne({ username: u });
    if (existing) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const passwordHash = await bcrypt.hash(p, 10);
    const newUser = {
      username: u,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);

    req.session.user = { id: result.insertedId.toString(), username: u, role: 'user' };
    res.status(201).json({ message: 'ok' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Invalid credentials' });
  }
});

/**
 * POST /auth/logout
 * Destroy session and clear cookie.
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.status(200).json({ message: 'ok' });
  });
});

/**
 * GET /auth/me
 * Return 200 with { user: { id, username } } if logged in, else 401.
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({ user: req.session.user });
  }
  res.status(401).json({ message: 'Not authenticated' });
});

module.exports = router;
