const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret, getToken } = require('../config/auth');

function authMiddleware(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    // Attach user info (minimal) to req.user
    const user = db.get('SELECT id, username, display_name, is_admin FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Usuario invalido.' });
    // check active flag (default active if column absent)
    const uinfo = db.get('SELECT active FROM users WHERE id = ?', [payload.id]);
    if (uinfo && uinfo.active === 0) return res.status(403).json({ error: 'Usuario desativado.' });
    user.is_admin = !!user.is_admin;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido.' });
  }
}

module.exports = authMiddleware;
