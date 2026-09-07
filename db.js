const fs = require('fs');
const path = require('path');
const dataDirectory = path.join(__dirname, 'data');
fs.mkdirSync(dataDirectory, { recursive: true });
const databaseFile = path.join(dataDirectory, 'presenca.sqlite');
let database;

async function initialize() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  database = fs.existsSync(databaseFile) ? new SQL.Database(fs.readFileSync(databaseFile)) : new SQL.Database();
  database.run('PRAGMA foreign_keys = ON');
  database.run(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 130),
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    UNIQUE(student_id, course_id, attendance_date)
  );
  `);
  database.run(`
    DELETE FROM attendance
    WHERE student_id NOT IN (SELECT id FROM students)
       OR course_id NOT IN (SELECT id FROM courses)
  `);
  save();
}

function save() {
  if (database) fs.writeFileSync(databaseFile, Buffer.from(database.export()));
}

function all(sql, params = []) {
  const statement = database.prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

function get(sql, params = []) { return all(sql, params)[0]; }

function run(sql, params = []) {
  database.run(sql, params);
  const changes = database.getRowsModified();
  const id = get('SELECT last_insert_rowid() AS id')?.id;
  save();
  return { lastInsertRowid: id, changes };
}

module.exports = { initialize, all, get, run };