const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { jwtSecret, getToken, setAuthCookie, clearAuthCookie } = require('../config/auth');
const rateLimit = require('../middleware/rateLimit');
const router = express.Router();

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario e senha sao obrigatorios.' });
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
  const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '8h' });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, is_admin: !!user.is_admin } });
});

router.post('/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), (req, res) => {
  const { display_name, username, password, password_confirm } = req.body;
  if (!display_name || !username || !password || !password_confirm) return res.status(400).json({ error: 'Todos os campos sao obrigatorios.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Senha precisa ter ao menos 6 caracteres.' });
  if (password !== password_confirm) return res.status(400).json({ error: 'As senhas nao conferem.' });
  // simple email/username validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) && !/^[a-zA-Z0-9_.-]{3,}$/.test(username)) {
    return res.status(400).json({ error: 'Usuario/e-mail invalido.' });
  }
  // check duplicates
  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return res.status(400).json({ error: 'Usuario ou e-mail ja cadastrado.' });
  // never allow setting is_admin via registration
  const hash = bcrypt.hashSync(password, 10);
  const result = db.run('INSERT INTO users (username, password, display_name, is_admin) VALUES (?, ?, ?, ?)', [username, hash, display_name, 0]);
  const newUser = db.get('SELECT id, username, display_name, is_admin FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ message: 'Conta criada com sucesso.', user: { id: newUser.id, username: newUser.username, display_name: newUser.display_name } });
});

router.get('/me', (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(200).json({ user: null });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.get('SELECT id, username, display_name, is_admin FROM users WHERE id = ?', [payload.id]);
    if (user) user.is_admin = !!user.is_admin;
    res.json({ user: user || null });
  } catch (err) {
    res.status(200).json({ user: null });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

module.exports = router;
