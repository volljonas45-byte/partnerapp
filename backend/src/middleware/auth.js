const jwt = require('jsonwebtoken');
const { getOne } = require('../db/pg');

/**
 * Middleware to verify JWT token and attach user/workspace info to request.
 * Expects: Authorization: Bearer <token>
 *
 * Sets:
 *   req.userId          — the actual logged-in user's ID
 *   req.workspaceUserId — workspace owner's ID (for data queries); equals req.userId for admins
 *   req.userRole        — 'admin' | 'pm' | 'developer'
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;

    // Fetch workspace & role info from DB
    const user = await getOne(
      'SELECT id, role, workspace_owner_id, name, color FROM users WHERE id = ?',
      [req.userId]
    );

    // workspaceUserId: team members point to their admin; admins point to themselves
    req.workspaceUserId = user?.workspace_owner_id ?? req.userId;
    req.userRole        = user?.role ?? 'admin';

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
