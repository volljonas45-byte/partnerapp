const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user account (first-time setup).
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Whitelist check — only allowed emails can register
  const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
    return res.status(403).json({ error: 'Registrierung nicht erlaubt.' });
  }

  // Check if already registered
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  ).run(email, passwordHash);

  // Create default empty settings row for this user
  db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(result.lastInsertRowid);

  const token = jwt.sign(
    { userId: result.lastInsertRowid },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );

  res.status(201).json({ token, email });
});

/**
 * POST /api/auth/login
 * Authenticates user and returns a JWT.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );

  res.json({ token, email: user.email });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user info.
 */
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

/**
 * GET /api/auth/status
 * Returns whether any user account exists (for first-run detection).
 */
router.get('/status', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
  res.json({ hasAccount: count.count > 0 });
});

module.exports = router;
