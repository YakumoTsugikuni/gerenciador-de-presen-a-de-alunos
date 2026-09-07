const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.all(`
    SELECT attendance.*, students.name AS student_name, courses.title AS course_title
    FROM attendance
    JOIN students ON students.id = attendance.student_id
    JOIN courses ON courses.id = attendance.course_id
    ORDER BY attendance_date DESC, student_name
  `);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { student_id, course_id, attendance_date, status } = req.body;
  if (!student_id || !course_id || !attendance_date || !['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: 'Aluno, curso, data e status sao obrigatorios.' });
  }
  db.run(`
    INSERT INTO attendance (student_id, course_id, attendance_date, status)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id, course_id, attendance_date) DO UPDATE SET status = excluded.status
  `, [student_id, course_id, attendance_date, status]);
  res.status(201).json({ message: 'Presenca registrada.' });
});

router.delete('/:id', (req, res) => {
  const result = db.run('DELETE FROM attendance WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Registro nao encontrado.' });
  res.status(204).end();
});

module.exports = router;