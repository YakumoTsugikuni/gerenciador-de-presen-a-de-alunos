const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const rows = db.all(`
    SELECT attendance.*, students.name AS student_name, courses.title AS course_title, users.username AS recorded_by_user
    FROM attendance
    JOIN students ON students.id = attendance.student_id
    JOIN courses ON courses.id = attendance.course_id
    LEFT JOIN users ON users.id = attendance.recorded_by
    ORDER BY attendance_date DESC, student_name
  `);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { student_id, course_id, attendance_date, status, note } = req.body;
  if (!student_id || !course_id || !attendance_date || !['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: 'Aluno, curso, data e status sao obrigatorios.' });
  }
  // Prevent future dates
  const today = new Date();
  const provided = new Date(`${attendance_date}T00:00:00`);
  if (provided > new Date(today.toDateString())) {
    return res.status(400).json({ error: 'Nao e possivel registrar presenca para data futura.' });
  }
  // Check existing record to determine create/update for audit
  const existing = db.get('SELECT * FROM attendance WHERE student_id = ? AND course_id = ? AND attendance_date = ?', [student_id, course_id, attendance_date]);
  const timestamp = new Date().toISOString();
  if (existing) {
    // update
    db.run('UPDATE attendance SET status = ?, recorded_by = ?, recorded_at = ?, note = ? WHERE id = ?', [status, req.user.id, timestamp, note || null, existing.id]);
    db.run('INSERT INTO attendance_audit (attendance_id, action, user_id, student_id, course_id, attendance_date, status, previous_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [existing.id, 'updated', req.user.id, student_id, course_id, attendance_date, status, existing.status, timestamp]);
    return res.status(200).json({ message: 'Presenca atualizada.' });
  } else {
    // create
    const result = db.run('INSERT INTO attendance (student_id, course_id, attendance_date, status, recorded_by, recorded_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)', [student_id, course_id, attendance_date, status, req.user.id, timestamp, note || null]);
    const insertedId = result.lastInsertRowid;
    db.run('INSERT INTO attendance_audit (attendance_id, action, user_id, student_id, course_id, attendance_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [insertedId, 'created', req.user.id, student_id, course_id, attendance_date, status, timestamp]);
    return res.status(201).json({ message: 'Presenca registrada.' });
  }
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.get('SELECT * FROM attendance WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Registro nao encontrado.' });
  db.run('DELETE FROM attendance WHERE id = ?', [id]);
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO attendance_audit (attendance_id, action, user_id, student_id, course_id, attendance_date, status, previous_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, 'deleted', req.user.id, existing.student_id, existing.course_id, existing.attendance_date, null, existing.status, timestamp]);
  res.status(204).end();
});

module.exports = router;