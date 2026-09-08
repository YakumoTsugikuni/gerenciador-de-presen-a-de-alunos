const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Permissao negada.' });
  next();
}

// GET /api/users - list users (admin)
router.get('/', auth, requireAdmin, (req, res) => {
  const users = db.all('SELECT id, username, display_name, is_admin, active, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

// POST /api/users - create user (admin)
router.post('/', auth, requireAdmin, (req, res) => {
  const { display_name, username, password, is_admin = 0 } = req.body;
  if (!display_name || !username || !password) return res.status(400).json({ error: 'Campos obrigatorios ausentes.' });
  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return res.status(400).json({ error: 'Usuario ja cadastrado.' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.run('INSERT INTO users (username, password, display_name, is_admin, active) VALUES (?, ?, ?, ?, ?)', [username, hash, display_name, is_admin ? 1 : 0, 1]);
  res.status(201).json(db.get('SELECT id, username, display_name, is_admin, active FROM users WHERE id = ?', [result.lastInsertRowid]));
});

// PUT /api/users/:id - update user (admin)
router.put('/:id', auth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const { display_name, username, is_admin, active } = req.body;
  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado.' });
  if (username && username !== existing.username) {
    const dup = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (dup) return res.status(400).json({ error: 'Username ja em uso.' });
  }
  db.run('UPDATE users SET display_name = ?, username = ?, is_admin = ?, active = ? WHERE id = ?', [display_name || existing.display_name, username || existing.username, is_admin ? 1 : 0, (typeof active !== 'undefined' ? (active ? 1 : 0) : existing.active), id]);
  res.json(db.get('SELECT id, username, display_name, is_admin, active FROM users WHERE id = ?', [id]));
});

// POST /api/users/:id/reset-password (admin)
router.post('/:id/reset-password', auth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Senha obrigatoria.' });
  const hash = bcrypt.hashSync(password, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
  res.json({ message: 'Senha redefinida.' });
});

module.exports = router;
