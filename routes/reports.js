const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();
const { stringify } = require('csv-stringify/sync');

// GET /api/reports/dashboard
router.get('/dashboard', auth, (req, res) => {
  // total students, courses
  const totals = db.get(`
    SELECT (SELECT COUNT(*) FROM students) AS total_students,
           (SELECT COUNT(*) FROM courses) AS total_courses,
           (SELECT COUNT(DISTINCT attendance_date || '-' || course_id) FROM attendance) AS total_calls,
           (SELECT COUNT(*) FROM attendance) AS total_records
  `) || { total_students:0, total_courses:0, total_calls:0, total_records:0 };

  // calls today
  const today = new Date().toISOString().split('T')[0];
  const callsToday = db.get('SELECT COUNT(DISTINCT attendance_date || "-" || course_id) AS calls_today FROM attendance WHERE attendance_date = ?', [today])?.calls_today || 0;

  // last call
  const last = db.get(`
    SELECT course_id, attendance_date, recorded_by, MAX(recorded_at) AS recorded_at
    FROM attendance
    GROUP BY course_id, attendance_date
    ORDER BY recorded_at DESC
    LIMIT 1
  `);
  const last_call = last ? {
    course_id: last.course_id,
    attendance_date: last.attendance_date,
    recorded_at: last.recorded_at,
    course_title: db.get('SELECT title FROM courses WHERE id = ?', [last.course_id])?.title || null,
    recorded_by: db.get('SELECT display_name FROM users WHERE id = ?', [last.recorded_by])?.display_name || null
  } : null;

  // totals present/absent
  const pres = db.get(`SELECT SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present, SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent FROM attendance`) || {present:0, absent:0};
  const percent = (pres.present + pres.absent) ? Math.round((pres.present / (pres.present + pres.absent)) * 100) : 0;

  res.json({ totals, callsToday, last_call, present: pres.present, absent: pres.absent, percent });
});

// GET /api/reports/student/:id - frequency summary for a student
router.get('/student/:id', auth, (req, res) => {
  const studentId = req.params.id;
  const total_calls = db.get('SELECT COUNT(*) AS c FROM attendance WHERE student_id = ?', [studentId])?.c || 0;
  const present = db.get("SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND status = 'present'", [studentId])?.c || 0;
  const absent = db.get("SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND status = 'absent'", [studentId])?.c || 0;
  const percent = total_calls ? Math.round((present / total_calls) * 100) : 0;
  const history = db.all('SELECT attendance_date, course_id, status, note, recorded_at FROM attendance WHERE student_id = ? ORDER BY attendance_date DESC', [studentId]);
  res.json({ studentId, total_calls, present, absent, percent, history });
});

// GET /api/reports/export - export based on filters to CSV
router.get('/export', auth, (req, res) => {
  const { start_date, end_date, course_id, student_id, user_id, status } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (start_date) { where += ' AND attendance_date >= ?'; params.push(start_date); }
  if (end_date) { where += ' AND attendance_date <= ?'; params.push(end_date); }
  if (course_id) { where += ' AND course_id = ?'; params.push(course_id); }
  if (student_id) { where += ' AND student_id = ?'; params.push(student_id); }
  if (user_id) { where += ' AND recorded_by = ?'; params.push(user_id); }
  if (status) { where += ' AND status = ?'; params.push(status); }

  const rows = db.all(`
    SELECT attendance.attendance_date, courses.title AS course_title, students.name AS student_name, attendance.status, attendance.note, users.username AS recorded_by, attendance.recorded_at
    FROM attendance
    JOIN students ON students.id = attendance.student_id
    JOIN courses ON courses.id = attendance.course_id
    LEFT JOIN users ON users.id = attendance.recorded_by
    ${where}
    ORDER BY attendance_date DESC
  `, params);

  const csv = stringify(rows, { header: true, columns: { attendance_date: 'date', course_title: 'course', student_name: 'student', status: 'status', note: 'note', recorded_by: 'user', recorded_at: 'recorded_at' } });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
  res.send(csv);
});

module.exports = router;
