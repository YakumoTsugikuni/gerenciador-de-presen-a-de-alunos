const express = require('express');
const path = require('path');
const studentsRouter = require('./routes/students');
const coursesRouter = require('./routes/courses');
const attendanceRouter = require('./routes/attendance');
const authRouter = require('./routes/auth');
const historyRouter = require('./routes/history');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
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
app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.initialize().then(() => app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
}));