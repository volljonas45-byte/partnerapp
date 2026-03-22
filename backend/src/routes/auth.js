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

    // Block public registration after first account exists — all further users are invited via /team/invite
    const anyUser = await getOne('SELECT id FROM users LIMIT 1', []);
    if (anyUser) {
      return res.status(403).json({ error: 'Registrierung ist deaktiviert. Bitte wende dich an deinen Admin.' });
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
      'SELECT id, email, name, color, role, workspace_owner_id, avatar_base64, created_at FROM users WHERE id = ?',
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
 * PUT /api/auth/profile
 * Update own name, color, avatar_base64.
 */
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, color, avatar_base64 } = req.body;
    await run(
      `UPDATE users SET
        name          = COALESCE(?, name),
        color         = COALESCE(?, color),
        avatar_base64 = CASE WHEN ? THEN ? ELSE avatar_base64 END
       WHERE id = ?`,
      [name ?? null, color ?? null,
       avatar_base64 !== undefined, avatar_base64 ?? null,
       req.userId]
    );
    const user = await getOne(
      'SELECT id, email, name, color, role, workspace_owner_id, avatar_base64, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    res.json(user);
  } catch (err) {
    console.error('[auth/profile]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/password
 * Change own password. Requires current password verification.
 */
router.put('/password', require('../middleware/auth'), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }
    const user = await getOne('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/password]', err);
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
