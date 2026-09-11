const state = { students: [], courses: [], attendance: [] };
const $ = (selector) => document.querySelector(selector);
// Overlay control for auth modals: show overlay then open dialog to hide app content
window.showAuthModal = function(id) {
  const overlay = document.getElementById('auth-overlay');
  const dlg = document.getElementById(id);
  if (!dlg) return;
  // show overlay (fade in)
  overlay.classList.add('visible');
  // hide main UI from assistive tech while overlay is active
  const mainEl = document.querySelector('main');
  const asideEl = document.querySelector('aside');
  mainEl?.setAttribute('aria-hidden', 'true');
  asideEl?.setAttribute('aria-hidden', 'true');
  // add visual blur to underlying UI for extra obscuring of sensitive content
  mainEl?.classList.add('blurred');
  asideEl?.classList.add('blurred');
  // ensure paint then open dialog so overlay hides background before dialog appears
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { dlg.showModal(); } catch(e) { /* ignore if already open */ }
    // when dialog closes, hide overlay if no other dialogs are open
    const onClose = () => {
      // small timeout to allow dialog close animation to finish
      setTimeout(() => {
        if (document.querySelectorAll('dialog[open]').length === 0) {
          overlay.classList.remove('visible');
          // restore aria-hidden and remove blur
          const m = document.querySelector('main'); const a = document.querySelector('aside');
          m?.removeAttribute('aria-hidden'); a?.removeAttribute('aria-hidden');
          m?.classList.remove('blurred'); a?.classList.remove('blurred');
        }
      }, 10);
    };
    dlg.addEventListener('close', onClose, { once: true });
  }));
};

// Safe hide API in case code wants to close dialogs programmatically
window.hideAuthOverlay = function() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  const m = document.querySelector('main'); const a = document.querySelector('aside');
  m?.removeAttribute('aria-hidden'); a?.removeAttribute('aria-hidden');
  m?.classList.remove('blurred'); a?.classList.remove('blurred');
};
const api = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(`/api/${url}`, { headers, ...options });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || 'Ocorreu um erro.');
  return data;
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

async function load() {
  // require authentication first
  try {
    const me = await api('auth/me');
    state.user = me.user;
  } catch (e) {
    state.user = null;
  }
  if (!state.user) {
    // show login modal and do not load data
    window.showAuthModal && window.showAuthModal('login-modal');
    document.getElementById('user-name').textContent = '';
    document.getElementById('logout-link').style.display = 'none';
    return;
  }
  // load data
  [state.students, state.courses, state.attendance] = await Promise.all([api('students'), api('courses'), api('attendance')]);
  const summary = await api('summary');
  $('#student-count').textContent = summary.students; $('#course-count').textContent = summary.courses; $('#present-count').textContent = summary.present; $('#absent-count').textContent = summary.absent;
  render();
}
function render() {
  $('#students-table').innerHTML = state.students.map(student => `<tr><td><strong>${escapeHtml(student.name)}</strong></td><td>${escapeHtml(student.age)} anos</td><td>${escapeHtml(student.email)}</td><td><button class="icon-button" data-delete-student="${student.id}" title="Excluir aluno">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhum aluno cadastrado.</td></tr>';
  $('#courses-grid').innerHTML = state.courses.map(course => `<article class="course-card"><div class="course-number">${String(course.id).padStart(2, '0')}</div><div><h3>${escapeHtml(course.title)}</h3><p>${escapeHtml(course.description || 'Sem descricao cadastrada.')}</p><span>${escapeHtml(course.duration)} horas</span></div><button class="icon-button" data-delete-course="${course.id}" title="Excluir curso">×</button></article>`).join('') || '<p class="empty">Nenhum curso cadastrado.</p>';
  $('#attendance-table').innerHTML = state.attendance.map(item => `<tr><td>${escapeHtml(formatDate(item.attendance_date))}</td><td><strong>${escapeHtml(item.student_name)}</strong></td><td>${escapeHtml(item.course_title)}</td><td><span class="badge ${escapeHtml(item.status)}">${item.status === 'present' ? 'Presente' : 'Ausente'}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhuma presenca registrada.</td></tr>';
  $('#recent-list').innerHTML = state.attendance.slice(0, 4).map(item => `<div class="record"><span class="record-avatar">${escapeHtml(item.student_name?.charAt(0))}</span><div><strong>${escapeHtml(item.student_name)}</strong><small>${escapeHtml(item.course_title)} · ${escapeHtml(formatDate(item.attendance_date))}</small></div><span class="badge ${escapeHtml(item.status)}">${item.status === 'present' ? 'Presente' : 'Ausente'}</span></div>`).join('') || '<p class="empty">Nenhum registro ainda.</p>';
  fillSelect('#attendance-student', state.students, 'Selecione um aluno'); fillSelect('#attendance-course', state.courses, 'Selecione um curso');
}

// Render dashboard summary into overview panel
async function renderDashboard() {
  try {
    const data = await api('reports/dashboard');
    // simple injection into overview area
    const panel = document.querySelector('#overview .stats');
    if (!panel) return;
    // display counts
    $('#student-count').textContent = data.totals.total_students;
    $('#course-count').textContent = data.totals.total_courses;
    $('#present-count').textContent = data.present;
    $('#absent-count').textContent = data.absent;
  } catch (err) { console.error(err); }
}

// History loading and filters
async function loadHistory(page = 1) {
  try {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const course = document.getElementById('filter-course').value;
    const user = document.getElementById('filter-user').value;
    const status = document.getElementById('filter-status').value;
    const q = new URLSearchParams();
    if (start) q.set('start_date', start);
    if (end) q.set('end_date', end);
    if (course) q.set('course_id', course);
    if (user) q.set('user_id', user);
    if (status) q.set('status', status);
    q.set('page', page);
    const resp = await api(`history?${q.toString()}`);
    const tbody = document.getElementById('history-table');
    tbody.innerHTML = resp.data.map(r => `<tr><td>${escapeHtml(r.attendance_date)}</td><td>${escapeHtml(r.course_title)}</td><td>${escapeHtml(r.total_present)}</td><td>${escapeHtml(r.total_absent)}</td><td>${escapeHtml(r.percent)}%</td><td>${escapeHtml(r.recorded_by_user || '')}</td><td><button class="text-button" data-detail-course="${r.course_id}" data-detail-date="${escapeHtml(r.attendance_date)}">Ver</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Nenhuma chamada encontrada.</td></tr>';
  } catch (err) { toast(err.message, true); }
}

// load users for admin
async function loadUsers() {
  try {
    const users = await api('users');
    document.getElementById('users-table').innerHTML = users.map(u => `<tr><td>${escapeHtml(u.display_name)}</td><td>${escapeHtml(u.username)}</td><td>${u.is_admin ? 'Sim' : 'Nao'}</td><td>${u.active ? 'Sim' : 'Nao'}</td><td></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nenhum usuario.</td></tr>';
  } catch (err) { /* ignore if not admin */ }
}

// populate course and user selects
async function fillFilters() {
  try {
    const courses = await api('courses');
    document.getElementById('filter-course').innerHTML = `<option value="">Todas as turmas</option>` + courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
    document.getElementById('report-course').innerHTML = `<option value="">Todas as turmas</option>` + courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
    const users = await api('users').catch(() => []);
    document.getElementById('filter-user').innerHTML = `<option value="">Todos os responsaveis</option>` + users.map(u => `<option value="${u.id}">${escapeHtml(u.display_name || u.username)}</option>`).join('');
  } catch (err) { console.error(err); }
}

// Export CSV
document.getElementById('export-csv')?.addEventListener('click', async () => {
  const start = document.getElementById('report-start').value;
  const end = document.getElementById('report-end').value;
  const course = document.getElementById('report-course').value;
  const q = new URLSearchParams();
  if (start) q.set('start_date', start);
  if (end) q.set('end_date', end);
  if (course) q.set('course_id', course);
  try {
    const resp = await fetch(`/api/reports/export?${q.toString()}`);
    if (!resp.ok) throw new Error('Falha ao gerar CSV');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, true); }
});

// Apply/Clear filter buttons
document.getElementById('apply-filters')?.addEventListener('click', () => { loadHistory(); });
document.getElementById('clear-filters')?.addEventListener('click', () => { document.getElementById('filter-start').value=''; document.getElementById('filter-end').value=''; document.getElementById('filter-course').value=''; document.getElementById('filter-user').value=''; document.getElementById('filter-status').value=''; loadHistory(); });

// Delegate detail view click
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-detail-course]');
  if (btn) {
    const course = btn.dataset.detailCourse;
    const date = btn.dataset.detailDate;
    try {
      const resp = await api(`history/detail?course_id=${course}&date=${date}`);
      const list = resp.data.map(item => `<div><strong>${escapeHtml(item.student_name)}</strong> — ${escapeHtml(item.status)} ${item.note ? `(${escapeHtml(item.note)})` : ''} <small>${escapeHtml(item.recorded_at)} por ${escapeHtml(item.recorded_by_user || '')}</small></div>`).join('');
      alert(`Detalhes ${date} - ${list}`);
    } catch (err) { toast(err.message, true); }
  }
});

// After loading app data, populate dashboard and filters
async function postLoadSetup() {
  await renderDashboard();
  await fillFilters();
  await loadHistory();
  await loadUsers();
  // show admin nav items if user is admin
  if (state.user && state.user.is_admin) {
    document.getElementById('nav-users').style.display = 'block';
    document.getElementById('nav-audit').style.display = 'block';
  } else {
    document.getElementById('nav-users').style.display = 'none';
    document.getElementById('nav-audit').style.display = 'none';
  }
}

// call after successful start/load
// start() calls load(), which returns early if not authenticated. so we call postLoadSetup inside start after load.
function fillSelect(selector, items, placeholder) { $(selector).innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + items.map(item => `<option value="${item.id}">${escapeHtml(item.name || item.title)}</option>`).join(''); }
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR'); }
function showView(view) { document.querySelectorAll('.view').forEach(item => item.classList.toggle('active-view', item.id === view)); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); $('#page-title').textContent = { overview: 'Visao geral', students: 'Alunos', courses: 'Cursos', attendance: 'Presencas' }[view]; }
function toast(message, error = false) { const element = $('#toast'); element.textContent = message; element.className = `toast visible ${error ? 'error' : ''}`; setTimeout(() => element.className = 'toast', 2800); }

document.addEventListener('click', async (event) => {
  const viewButton = event.target.closest('[data-view]'); if (viewButton) showView(viewButton.dataset.view);
  const openButton = event.target.closest('[data-open]'); if (openButton) window.showAuthModal ? window.showAuthModal(openButton.dataset.open) : $(`#${openButton.dataset.open}`).showModal();
  const studentId = event.target.closest('[data-delete-student]')?.dataset.deleteStudent; const courseId = event.target.closest('[data-delete-course]')?.dataset.deleteCourse;
  try { if (studentId && confirm('Excluir este aluno?')) { await api(`students/${studentId}`, { method: 'DELETE' }); await load(); toast('Aluno excluido.'); } if (courseId && confirm('Excluir este curso?')) { await api(`courses/${courseId}`, { method: 'DELETE' }); await load(); toast('Curso excluido.'); } } catch (error) { toast(error.message, true); }
});
// Only handle student and course forms with the generic handler
document.querySelectorAll('form').forEach(form => {
  if (form.id !== 'student-form' && form.id !== 'course-form') return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const endpoint = form.id === 'student-form' ? 'students' : 'courses';
    try { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); form.closest('dialog')?.close(); form.reset(); await load(); toast('Registro salvo com sucesso.'); } catch (error) { toast(error.message, true); }
  });
});
// Login form handler
const loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm));
  try {
    const resp = await api('auth/login', { method: 'POST', body: JSON.stringify(payload) });
    loginForm.closest('dialog')?.close();
    loginForm.reset();
    await load();
    toast(`Logado como ${resp.user.display_name || resp.user.username}`);
  } catch (err) {
    toast(err.message, true);
  }
});

// Register form handler
const registerForm = document.getElementById('register-form');
if (registerForm) registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(registerForm));
  // client-side validation
  if (!payload.display_name || !payload.username || !payload.password || !payload.password_confirm) return toast('Preencha todos os campos.', true);
  if (payload.password.length < 6) return toast('Senha precisa ter ao menos 6 caracteres.', true);
  if (payload.password !== payload.password_confirm) return toast('As senhas nao conferem.', true);
  // basic email check
  if (!/^\S+@\S+\.\S+$/.test(payload.username) && !/^[a-zA-Z0-9_.-]{3,}$/.test(payload.username)) return toast('Usuario/e-mail invalido.', true);
  try {
    const resp = await api('auth/register', { method: 'POST', body: JSON.stringify(payload) });
    registerForm.closest('dialog')?.close();
    registerForm.reset();
    // open login modal
    window.showAuthModal && window.showAuthModal('login-modal');
    toast(resp.message || 'Conta criada com sucesso.');
  } catch (err) {
    toast(err.message, true);
  }
});

// Attendance date validation: prevent selecting future dates
function setDateMax() {
  const input = document.querySelector('input[name="attendance_date"]');
  if (input) input.max = new Date().toISOString().split('T')[0];
}

// Intercept attendance form submission to validate date client-side
const attendanceForm = document.getElementById('attendance-form');
if (attendanceForm) attendanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(new FormData(form));
  const today = new Date().toISOString().split('T')[0];
  if (payload.attendance_date > today) return toast('Nao e possivel registrar presenca para data futura.', true);
  try { await api('attendance', { method: 'POST', body: JSON.stringify(payload) }); form.closest('dialog')?.close(); form.reset(); await load(); toast('Registro salvo com sucesso.'); } catch (error) { toast(error.message, true); }
});

setDateMax();
// logout link
  document.getElementById('logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  api('auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  document.getElementById('user-name').textContent = '';
  document.getElementById('logout-link').style.display = 'none';
  window.showAuthModal && window.showAuthModal('login-modal');
});

// Update UI on successful load
async function start() {
  try {
    await load();
    if (state.user) {
      document.getElementById('user-name').textContent = state.user.display_name || state.user.username;
      document.getElementById('logout-link').style.display = 'inline';
      await postLoadSetup();
    }
  } catch (err) { toast(err.message, true); }
}

start();