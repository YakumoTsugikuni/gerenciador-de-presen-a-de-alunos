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
  // Users table for responsible accounts
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Audit table for attendance changes
  database.run(`
    CREATE TABLE IF NOT EXISTS attendance_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER,
      action TEXT NOT NULL,
      user_id INTEGER,
      student_id INTEGER,
      course_id INTEGER,
      attendance_date TEXT,
      status TEXT,
      previous_status TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure attendance has recorded_by and recorded_at columns (add if missing)
  const stmt = database.prepare("PRAGMA table_info(attendance)");
  const cols = [];
  while (stmt.step()) cols.push(stmt.getAsObject().name);
  stmt.free();
  if (!cols.includes('recorded_by')) database.run('ALTER TABLE attendance ADD COLUMN recorded_by INTEGER');
  if (!cols.includes('recorded_at')) database.run("ALTER TABLE attendance ADD COLUMN recorded_at TEXT");
  if (!cols.includes('note')) database.run("ALTER TABLE attendance ADD COLUMN note TEXT");

  // Ensure users table has is_admin column (for older DBs)
  try {
    const s1 = database.prepare("PRAGMA table_info(users)");
    const ucols = [];
    while (s1.step()) ucols.push(s1.getAsObject().name);
    s1.free();
    if (!ucols.includes('is_admin')) database.run('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
    if (!ucols.includes('active')) database.run('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  } catch (e) {
    // ignore
  }

  // Seed an initial admin user if none exists
  try {
    const row = (() => {
      const s = database.prepare('SELECT COUNT(*) AS c FROM users');
      s.step();
      const r = s.getAsObject();
      s.free();
      return r;
    })();
    if (row.c === 0) {
      const bcrypt = require('bcryptjs');
      const envUser = process.env.FIRST_ADMIN_USERNAME;
      const envPass = process.env.FIRST_ADMIN_PASSWORD;
      if (envUser && envPass) {
        const hash = bcrypt.hashSync(envPass, 10);
        database.run('INSERT INTO users (username, password, display_name, is_admin) VALUES (?, ?, ?, ?)', [envUser, hash, 'Administrador', 1]);
        console.log('Admin user created from FIRST_ADMIN_* environment variables.');
      } else {
        const hash = bcrypt.hashSync('admin', 10);
        database.run('INSERT INTO users (username, password, display_name, is_admin) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrador', 1]);
        console.warn('Default admin created with username "admin" and password "admin" — please change immediately or set FIRST_ADMIN_USERNAME/FIRST_ADMIN_PASSWORD.');
      }
    }
  } catch (err) {
    // ignore seeding errors
  }
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