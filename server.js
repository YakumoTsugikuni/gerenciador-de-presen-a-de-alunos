const express = require('express');
const path = require('path');
const studentsRouter = require('./routes/students');
const coursesRouter = require('./routes/courses');
const attendanceRouter = require('./routes/attendance');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/summary', (req, res) => {
  const summary = db.get(`
    SELECT
      (SELECT COUNT(*) FROM students) AS students,
      (SELECT COUNT(*) FROM courses) AS courses,
      (SELECT COUNT(*) FROM attendance WHERE status = 'present') AS total_present,
      (SELECT COUNT(*) FROM attendance WHERE status = 'absent') AS total_absent
  `);
  res.json({ students: summary.students, courses: summary.courses, present: summary.total_present, absent: summary.total_absent });
});

app.use('/api/students', studentsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.initialize().then(() => app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
}));