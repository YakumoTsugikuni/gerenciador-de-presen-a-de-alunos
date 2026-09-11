const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  res.json(db.all('SELECT * FROM courses ORDER BY title'));
});

router.post('/', (req, res) => {
  const { title, duration, description = '' } = req.body;
  if (!title || !duration) return res.status(400).json({ error: 'Titulo e duracao sao obrigatorios.' });
  const result = db.run('INSERT INTO courses (title, duration, description) VALUES (?, ?, ?)', [title.trim(), Number(duration), description.trim()]);
  res.status(201).json(db.get('SELECT * FROM courses WHERE id = ?', [result.lastInsertRowid]));
});

router.delete('/:id', (req, res) => {
  const result = db.run('DELETE FROM courses WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Curso nao encontrado.' });
  res.status(204).end();
});

module.exports = router;