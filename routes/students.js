const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const students = db.all('SELECT * FROM students ORDER BY name');
  res.json(students);
});

router.post('/', (req, res) => {
  const { name, age, email } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const numericAge = Number(age);
  if (!normalizedName || !normalizedEmail || !Number.isInteger(numericAge)) return res.status(400).json({ error: 'Nome, idade e e-mail sao obrigatorios.' });
  if (numericAge < 1 || numericAge > 129) return res.status(400).json({ error: 'A idade deve estar entre 1 e 129 anos.' });
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return res.status(400).json({ error: 'E-mail invalido.' });
  try {
    const result = db.run('INSERT INTO students (name, age, email) VALUES (?, ?, ?)', [normalizedName, numericAge, normalizedEmail]);
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