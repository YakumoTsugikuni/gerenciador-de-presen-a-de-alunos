const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const repoPath = '/home/runner/work/gerenciador-de-presen-a-de-alunos/gerenciador-de-presen-a-de-alunos';

async function waitForServer(baseUrl, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Servidor nao iniciou a tempo para os testes.');
}

async function jsonRequest(baseUrl, path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  if (response.status !== 204) {
    data = await response.json();
  }
  return { response, data };
}

test('valida regras de reposicao de aula e remove ausencia corretamente', async () => {
  const port = 3500 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: repoPath,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: 'ignore'
  });

  try {
    await waitForServer(baseUrl);

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const username = `resp-${suffix}@example.com`;
    const password = 'senha123';

    const register = await jsonRequest(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        display_name: 'Responsavel Teste',
        username,
        password,
        password_confirm: password
      }
    });
    assert.equal(register.response.status, 201);

    const login = await jsonRequest(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    assert.equal(login.response.status, 200);
    const cookie = login.response.headers.get('set-cookie');
    assert.ok(cookie);

    const student = await jsonRequest(baseUrl, '/api/students', {
      method: 'POST',
      cookie,
      body: {
        name: `Aluno ${suffix}`,
        age: 18,
        email: `aluno-${suffix}@example.com`
      }
    });
    assert.equal(student.response.status, 201);

    const course = await jsonRequest(baseUrl, '/api/courses', {
      method: 'POST',
      cookie,
      body: {
        title: `Curso ${suffix}`,
        duration: 10,
        description: 'Curso de validacao'
      }
    });
    assert.equal(course.response.status, 201);

    const attendanceDate = new Date().toISOString().slice(0, 10);

    const makeupWithoutAbsence = await jsonRequest(baseUrl, '/api/attendance', {
      method: 'POST',
      cookie,
      body: {
        student_id: student.data.id,
        course_id: course.data.id,
        attendance_date: attendanceDate,
        status: 'makeup'
      }
    });
    assert.equal(makeupWithoutAbsence.response.status, 400);
    assert.equal(makeupWithoutAbsence.data.error, 'Nao existe ausencia para aplicar reposicao nesta data.');

    const absent = await jsonRequest(baseUrl, '/api/attendance', {
      method: 'POST',
      cookie,
      body: {
        student_id: student.data.id,
        course_id: course.data.id,
        attendance_date: attendanceDate,
        status: 'absent'
      }
    });
    assert.equal(absent.response.status, 201);

    const makeup = await jsonRequest(baseUrl, '/api/attendance', {
      method: 'POST',
      cookie,
      body: {
        student_id: student.data.id,
        course_id: course.data.id,
        attendance_date: attendanceDate,
        status: 'makeup'
      }
    });
    assert.equal(makeup.response.status, 200);
    assert.equal(makeup.data.message, 'Reposicao registrada e ausencia removida.');

    const attendanceList = await jsonRequest(baseUrl, '/api/attendance', { cookie });
    assert.equal(attendanceList.response.status, 200);
    const record = attendanceList.data.find(row =>
      row.student_id === student.data.id &&
      row.course_id === course.data.id &&
      row.attendance_date === attendanceDate
    );
    assert.ok(record);
    assert.equal(record.status, 'present');
    assert.ok(String(record.note || '').startsWith('Reposicao de aula'));

    const makeupWhenAlreadyPresent = await jsonRequest(baseUrl, '/api/attendance', {
      method: 'POST',
      cookie,
      body: {
        student_id: student.data.id,
        course_id: course.data.id,
        attendance_date: attendanceDate,
        status: 'makeup'
      }
    });
    assert.equal(makeupWhenAlreadyPresent.response.status, 400);
    assert.equal(makeupWhenAlreadyPresent.data.error, 'Reposicao so pode ser aplicada em uma ausencia existente.');
  } finally {
    if (!server.killed) server.kill('SIGTERM');
  }
});
