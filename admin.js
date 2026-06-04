const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('password');
const adminPanel = document.getElementById('adminPanel');
const adminMessage = document.getElementById('adminMessage');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const logoutBtn = document.getElementById('logoutBtn');
const tableBody = document.getElementById('guestTableBody');
const emptyState = document.getElementById('emptyState');

const totalAnswers = document.getElementById('totalAnswers');
const attendingAnswers = document.getElementById('attendingAnswers');
const totalGuests = document.getElementById('totalGuests');
const declinedAnswers = document.getElementById('declinedAnswers');

let currentPassword = localStorage.getItem('weddingAdminPassword') || '';
let currentItems = [];

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value || '—';
  }
}

function showMessage(text, isError = false) {
  adminMessage.textContent = text;
  adminMessage.classList.toggle('is-error', isError);
  adminMessage.hidden = !text;
}

function setLoading(isLoading) {
  refreshBtn.disabled = isLoading;
  exportBtn.disabled = isLoading || currentItems.length === 0;
}

function renderSummary(summary) {
  totalAnswers.textContent = summary.totalAnswers;
  attendingAnswers.textContent = summary.attendingAnswers;
  totalGuests.textContent = summary.totalGuests;
  declinedAnswers.textContent = summary.declinedAnswers;
}

function renderTable(items) {
  tableBody.innerHTML = '';
  emptyState.hidden = items.length > 0;
  exportBtn.disabled = items.length === 0;

  items.forEach((item) => {
    const row = document.createElement('tr');

    const cells = [
      formatDate(item.createdAt),
      item.name,
      item.statusLabel,
      String(item.guestCount),
      item.comment || '—'
    ];

    cells.forEach((cellText) => {
      const cell = document.createElement('td');
      cell.textContent = cellText;
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'mini-btn danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', () => deleteItem(item.id));
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

async function loadItems(password = currentPassword) {
  setLoading(true);
  showMessage('');

  try {
    const response = await fetch('/api/admin/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось загрузить список гостей');
    }

    currentPassword = password;
    localStorage.setItem('weddingAdminPassword', password);
    currentItems = data.items;
    renderSummary(data.summary);
    renderTable(data.items);
    passwordForm.hidden = true;
    adminPanel.hidden = false;
  } catch (error) {
    localStorage.removeItem('weddingAdminPassword');
    currentPassword = '';
    passwordForm.hidden = false;
    adminPanel.hidden = true;
    showMessage(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function deleteItem(id) {
  if (!confirm('Удалить этот ответ из списка?')) return;

  try {
    const response = await fetch(`/api/admin/rsvp/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: currentPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Не удалось удалить ответ');
    }

    await loadItems(currentPassword);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function exportCsv() {
  const headers = ['Дата', 'Имя', 'Ответ', 'Количество гостей', 'Комментарий'];
  const rows = currentItems.map((item) => [
    formatDate(item.createdAt),
    item.name,
    item.statusLabel,
    item.guestCount,
    item.comment || ''
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wedding-rsvp-sergey-lyudmila.csv';
  link.click();
  URL.revokeObjectURL(url);
}

passwordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadItems(passwordInput.value.trim());
});

refreshBtn.addEventListener('click', () => loadItems(currentPassword));
exportBtn.addEventListener('click', exportCsv);
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('weddingAdminPassword');
  currentPassword = '';
  currentItems = [];
  adminPanel.hidden = true;
  passwordForm.hidden = false;
  passwordInput.value = '';
  showMessage('');
});

if (currentPassword) {
  loadItems(currentPassword);
}
