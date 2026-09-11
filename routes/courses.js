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
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';
  const numericDuration = Number(duration);
  if (!normalizedTitle || !Number.isFinite(numericDuration) || numericDuration <= 0) return res.status(400).json({ error: 'Titulo e duracao sao obrigatorios.' });
  const result = db.run('INSERT INTO courses (title, duration, description) VALUES (?, ?, ?)', [normalizedTitle, numericDuration, normalizedDescription]);
  res.status(201).json(db.get('SELECT * FROM courses WHERE id = ?', [result.lastInsertRowid]));
});

router.delete('/:id', (req, res) => {
  const result = db.run('DELETE FROM courses WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Curso nao encontrado.' });
  res.status(204).end();
});

module.exports = router;