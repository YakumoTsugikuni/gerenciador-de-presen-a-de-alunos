const state = { students: [], courses: [], attendance: [] };
const $ = (selector) => document.querySelector(selector);
const api = async (url, options) => { const response = await fetch(`/api/${url}`, { headers: { 'Content-Type': 'application/json' }, ...options }); const data = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(data?.error || 'Ocorreu um erro.'); return data; };

async function load() {
  [state.students, state.courses, state.attendance] = await Promise.all([api('students'), api('courses'), api('attendance')]);
  const summary = await api('summary');
  $('#student-count').textContent = summary.students; $('#course-count').textContent = summary.courses; $('#present-count').textContent = summary.present; $('#absent-count').textContent = summary.absent;
  render();
}
function render() {
  $('#students-table').innerHTML = state.students.map(student => `<tr><td><strong>${student.name}</strong></td><td>${student.age} anos</td><td>${student.email}</td><td><button class="icon-button" data-delete-student="${student.id}" title="Excluir aluno">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhum aluno cadastrado.</td></tr>';
  $('#courses-grid').innerHTML = state.courses.map(course => `<article class="course-card"><div class="course-number">${String(course.id).padStart(2, '0')}</div><div><h3>${course.title}</h3><p>${course.description || 'Sem descricao cadastrada.'}</p><span>${course.duration} horas</span></div><button class="icon-button" data-delete-course="${course.id}" title="Excluir curso">×</button></article>`).join('') || '<p class="empty">Nenhum curso cadastrado.</p>';
  $('#attendance-table').innerHTML = state.attendance.map(item => `<tr><td>${formatDate(item.attendance_date)}</td><td><strong>${item.student_name}</strong></td><td>${item.course_title}</td><td><span class="badge ${item.status}">${item.status === 'present' ? 'Presente' : 'Ausente'}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhuma presenca registrada.</td></tr>';
  $('#recent-list').innerHTML = state.attendance.slice(0, 4).map(item => `<div class="record"><span class="record-avatar">${item.student_name.charAt(0)}</span><div><strong>${item.student_name}</strong><small>${item.course_title} · ${formatDate(item.attendance_date)}</small></div><span class="badge ${item.status}">${item.status === 'present' ? 'Presente' : 'Ausente'}</span></div>`).join('') || '<p class="empty">Nenhum registro ainda.</p>';
  fillSelect('#attendance-student', state.students, 'Selecione um aluno'); fillSelect('#attendance-course', state.courses, 'Selecione um curso');
}
function fillSelect(selector, items, placeholder) { $(selector).innerHTML = `<option value="">${placeholder}</option>` + items.map(item => `<option value="${item.id}">${item.name || item.title}</option>`).join(''); }
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR'); }
function showView(view) { document.querySelectorAll('.view').forEach(item => item.classList.toggle('active-view', item.id === view)); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); $('#page-title').textContent = { overview: 'Visao geral', students: 'Alunos', courses: 'Cursos', attendance: 'Presencas' }[view]; }
function toast(message, error = false) { const element = $('#toast'); element.textContent = message; element.className = `toast visible ${error ? 'error' : ''}`; setTimeout(() => element.className = 'toast', 2800); }

document.addEventListener('click', async (event) => {
  const viewButton = event.target.closest('[data-view]'); if (viewButton) showView(viewButton.dataset.view);
  const openButton = event.target.closest('[data-open]'); if (openButton) $(`#${openButton.dataset.open}`).showModal();
  const studentId = event.target.closest('[data-delete-student]')?.dataset.deleteStudent; const courseId = event.target.closest('[data-delete-course]')?.dataset.deleteCourse;
  try { if (studentId && confirm('Excluir este aluno?')) { await api(`students/${studentId}`, { method: 'DELETE' }); await load(); toast('Aluno excluido.'); } if (courseId && confirm('Excluir este curso?')) { await api(`courses/${courseId}`, { method: 'DELETE' }); await load(); toast('Curso excluido.'); } } catch (error) { toast(error.message, true); }
});
document.querySelectorAll('form').forEach(form => form.addEventListener('submit', async (event) => { event.preventDefault(); const payload = Object.fromEntries(new FormData(form)); const endpoint = form.id === 'student-form' ? 'students' : form.id === 'course-form' ? 'courses' : 'attendance'; try { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); form.closest('dialog')?.close(); form.reset(); await load(); toast('Registro salvo com sucesso.'); } catch (error) { toast(error.message, true); } }));
load().catch(error => toast(error.message, true));