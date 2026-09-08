const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/history - list calls grouped by course + date
router.get('/', auth, (req, res) => {
  const { start_date, end_date, course_id, student_id, user_id, status, page = 1, limit = 50 } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (start_date) { where += ' AND attendance_date >= ?'; params.push(start_date); }
  if (end_date) { where += ' AND attendance_date <= ?'; params.push(end_date); }
  if (course_id) { where += ' AND course_id = ?'; params.push(course_id); }
  if (student_id) { where += ' AND student_id = ?'; params.push(student_id); }
  if (user_id) { where += ' AND recorded_by = ?'; params.push(user_id); }
  if (status) { where += ' AND status = ?'; params.push(status); }

  // Group by course and date to represent a "call"
  const offset = (Number(page) - 1) * Number(limit);
  const rows = db.all(`
    SELECT course_id, attendance_date,
      COUNT(*) AS total_students,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS total_present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS total_absent,
      MIN(recorded_at) AS first_recorded_at,
      MAX(recorded_at) AS last_recorded_at,
      recorded_by
    FROM attendance
    ${where}
    GROUP BY course_id, attendance_date
    ORDER BY attendance_date DESC, course_id
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  // enrich with course and user names
  const enriched = rows.map(r => {
    const course = db.get('SELECT title FROM courses WHERE id = ?', [r.course_id]) || {};
    const user = db.get('SELECT id, username, display_name FROM users WHERE id = ?', [r.recorded_by]) || null;
    const percent = r.total_students ? Math.round((r.total_present / r.total_students) * 100) : 0;
    return { ...r, course_title: course.title || '—', recorded_by_user: user ? (user.display_name || user.username) : null, percent };
  });

  res.json({ data: enriched, page: Number(page), limit: Number(limit) });
});

// GET /api/history/detail?course_id=...&date=YYYY-MM-DD
router.get('/detail', auth, (req, res) => {
  const { course_id, date } = req.query;
  if (!course_id || !date) return res.status(400).json({ error: 'course_id e date obrigatorios.' });
  const rows = db.all(`
    SELECT attendance.*, students.name AS student_name, users.username AS recorded_by_user, users.display_name AS recorded_by_name
    FROM attendance
    JOIN students ON students.id = attendance.student_id
    LEFT JOIN users ON users.id = attendance.recorded_by
    WHERE course_id = ? AND attendance_date = ?
    ORDER BY student_name
  `, [course_id, date]);
  res.json({ data: rows });
});

module.exports = router;
