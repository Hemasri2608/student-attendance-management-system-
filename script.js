const STORAGE_KEY = 'attendease_students';
const getStudents = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveStudents = students => localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
const today = () => new Date().toISOString().slice(0, 10);

function renderAdmin() {
  const rows = document.getElementById('studentRows');
  if (!rows) return;
  const dateInput = document.getElementById('attendanceDate');
  if (!dateInput.value) dateInput.value = today();
  const date = dateInput.value;
  const students = getStudents();
  rows.innerHTML = '';
  students.forEach(student => {
    const status = (student.attendance || {})[date] || 'Not marked';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(student.id)}</td><td>${escapeHtml(student.name)}</td><td>${escapeHtml(student.className)}</td><td><select aria-label="Attendance for ${escapeHtml(student.name)}" data-status-id="${escapeHtml(student.id)}"><option ${status === 'Not marked' ? 'selected' : ''}>Not marked</option><option ${status === 'Present' ? 'selected' : ''}>Present</option><option ${status === 'Absent' ? 'selected' : ''}>Absent</option></select></td><td><button class="btn danger" data-delete-id="${escapeHtml(student.id)}" type="button">Delete</button></td>`;
    rows.appendChild(tr);
  });
  document.getElementById('emptyMessage').hidden = students.length > 0;
  document.getElementById('totalCount').textContent = students.length;
  document.getElementById('presentCount').textContent = students.filter(s => (s.attendance || {})[date] === 'Present').length;
  document.getElementById('absentCount').textContent = students.filter(s => (s.attendance || {})[date] === 'Absent').length;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
const studentForm = document.getElementById('studentForm');
if (studentForm) {
  renderAdmin();
  studentForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = document.getElementById('studentId').value.trim();
    const name = document.getElementById('studentName').value.trim();
    const className = document.getElementById('studentClass').value.trim();
    const students = getStudents();
    if (students.some(s => s.id.toLowerCase() === id.toLowerCase())) return alert('That student ID already exists.');
    students.push({id, name, className, attendance: {}});
    saveStudents(students); studentForm.reset(); renderAdmin();
  });
  document.getElementById('attendanceDate').addEventListener('change', renderAdmin);
  document.getElementById('studentRows').addEventListener('change', event => {
    if (!event.target.matches('[data-status-id]')) return;
    const students = getStudents();
    const student = students.find(s => s.id === event.target.dataset.statusId);
    if (student) { student.attendance = student.attendance || {}; student.attendance[document.getElementById('attendanceDate').value] = event.target.value; saveStudents(students); renderAdmin(); }
  });
  document.getElementById('studentRows').addEventListener('click', event => {
    const id = event.target.dataset.deleteId;
    if (!id || !confirm('Delete this student and their attendance records?')) return;
    saveStudents(getStudents().filter(s => s.id !== id)); renderAdmin();
  });
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Delete ALL students and attendance records? This cannot be undone.')) { saveStudents([]); renderAdmin(); }
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const students = getStudents();
    const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [['Student ID','Name','Class','Date','Status'], ...students.flatMap(s => {
      const entries = Object.entries(s.attendance || {});
      return entries.length ? entries.map(([date,status]) => [s.id,s.name,s.className,date,status]) : [[s.id,s.name,s.className,'','Not marked']];
    })].map(row => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href = url; link.download = 'attendance-records.csv'; link.click(); URL.revokeObjectURL(url);
  });
}
const lookupForm = document.getElementById('lookupForm');
if (lookupForm) lookupForm.addEventListener('submit', event => {
  event.preventDefault();
  const id = document.getElementById('lookupId').value.trim();
  const student = getStudents().find(s => s.id.toLowerCase() === id.toLowerCase());
  const result = document.getElementById('studentResult');
  if (!student) { result.innerHTML = '<p class="empty">No student found. Check your ID or contact the administrator.</p>'; return; }
  const entries = Object.entries(student.attendance || {});
  const present = entries.filter(([,status]) => status === 'Present').length;
  const absent = entries.filter(([,status]) => status === 'Absent').length;
  const marked = present + absent;
  const percent = marked ? Math.round(present / marked * 100) : 0;
  result.innerHTML = `<div class="result-card"><h2>${escapeHtml(student.name)}</h2><p class="muted">${escapeHtml(student.id)} · ${escapeHtml(student.className)}</p><div class="result-grid"><div><span>Present</span><strong>${present}</strong></div><div><span>Absent</span><strong>${absent}</strong></div><div><span>Attendance</span><strong>${percent}%</strong></div></div><p class="muted">Percentage is calculated from dates marked Present or Absent.</p></div>`;
});
