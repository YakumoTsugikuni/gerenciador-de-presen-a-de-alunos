const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const students = db.all('SELECT * FROM students ORDER BY name');
  res.json(students);
});

router.post('/', (req, res) => {
  const { name, age, email } = req.body;
  if (!name || !age || !email) return res.status(400).json({ error: 'Nome, idade e e-mail sao obrigatorios.' });
  try {
    const result = db.run('INSERT INTO students (name, age, email) VALUES (?, ?, ?)', [name.trim(), Number(age), email.trim().toLowerCase()]);
    res.status(201).json(db.get('SELECT * FROM students WHERE id = ?', [result.lastInsertRowid]));
  } catch (error) {
    const message = error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Este e-mail ja esta cadastrado.' : 'Nao foi possivel cadastrar o aluno.';
    res.status(400).json({ error: message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.run('DELETE FROM students WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Aluno nao encontrado.' });
  res.status(204).end();
});

module.exports = router;