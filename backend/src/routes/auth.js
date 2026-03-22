const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, run } = require('../db/pg');

const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user account (first-time setup).
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
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
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id',
      [email, passwordHash]
    );

    // Create default empty settings row for this user
    await run('INSERT INTO settings (user_id) VALUES (?)', [result.lastInsertRowid]);

    const token = jwt.sign(
      { userId: result.lastInsertRowid },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, email });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user and returns a JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);
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
      { expiresIn: '30d' }
    );

    res.json({ token, email: user.email });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user info.
 */
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, email, name, color, role, workspace_owner_id, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/status
 * Returns whether any user account exists (for first-run detection).
 */
router.get('/status', async (req, res) => {
  try {
    const row = await getOne('SELECT COUNT(*) as count FROM users', []);
    res.json({ hasAccount: parseInt(row.count) > 0 });
  } catch (err) {
    console.error('[auth/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
