const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Permissao negada.' });
  next();
}

router.get('/', auth, requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const rows = db.all(`
    SELECT attendance_audit.*, users.username, users.display_name,
           students.name AS student_name, courses.title AS course_title
    FROM attendance_audit
    LEFT JOIN users ON users.id = attendance_audit.user_id
    LEFT JOIN students ON students.id = attendance_audit.student_id
    LEFT JOIN courses ON courses.id = attendance_audit.course_id
    ORDER BY attendance_audit.created_at DESC, attendance_audit.id DESC
    LIMIT ?
  `, [limit]);
  res.json(rows);
});

module.exports = router;