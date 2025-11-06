// Simple in-browser datastore + SQL-like parser for demo
const STORE_KEY = 'falls-db-v1';

class DataStore {
  constructor() {
    this.data = [];
    this.load();
  }

  load() {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse store, resetting', e);
        this.data = [];
      }
    } else {
      // seed sample data
      this.data = [
        { id: this._id(), name: '김영희', age: 82, location: 'A동 201호', risk_level: 'high', last_fall: '2025-03-12', notes: '보행 보조기 사용' },
        { id: this._id(), name: '이철수', age: 76, location: 'B동 103호', risk_level: 'medium', last_fall: '2024-10-02', notes: '야간 화장실 낙상 경험' },
        { id: this._id(), name: '박순자', age: 90, location: 'C동 305호', risk_level: 'high', last_fall: '', notes: '시력 저하' }
      ];
      this.save();
    }
  }

  save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
  }

  _id() {
    return Math.random().toString(36).slice(2, 9);
  }

  all() {
    return [...this.data];
  }

  select(where) {
    if (!where) return this.all();
    return this.data.filter(r => {
      return Object.entries(where).every(([k, v]) => String(r[k]) === String(v));
    });
  }

  insert(obj) {
    const record = { id: this._id(), ...obj };
    this.data.unshift(record);
    this.save();
    return record;
  }

  update(id, changes) {
    const idx = this.data.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data[idx] = { ...this.data[idx], ...changes };
    this.save();
    return this.data[idx];
  }

  delete(id) {
    const idx = this.data.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.splice(idx, 1);
    this.save();
    return true;
  }
}

const store = new DataStore();

// --- UI Bindings ---
const tableBody = document.querySelector('#records-table tbody');
const countEl = document.getElementById('record-count');
const btnAdd = document.getElementById('btn-add');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const fileInput = document.getElementById('file-input');
const sqlInput = document.getElementById('sql-input');
const btnRunSql = document.getElementById('btn-run-sql');
const btnClearSql = document.getElementById('btn-clear-sql');
const sqlResult = document.getElementById('sql-result');

// modal elements
const recordModal = new bootstrap.Modal(document.getElementById('recordModal'));
const modalTitle = document.getElementById('modal-title');
const recordForm = document.getElementById('record-form');
const btnSave = document.getElementById('btn-save');
const btnDelete = document.getElementById('btn-delete');

function renderTable(rows = null) {
  const data = rows || store.all();
  tableBody.innerHTML = '';
  data.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.age ?? ''}</td>
      <td>${escapeHtml(r.location ?? '')}</td>
      <td><span class="badge ${badgeClass(r.risk_level)}">${r.risk_level ?? ''}</span></td>
      <td>${r.last_fall ?? ''}</td>
      <td>${escapeHtml(r.notes ?? '')}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${r.id}">수정</button>
          <button class="btn btn-sm btn-outline-danger btn-del" data-id="${r.id}">삭제</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  countEl.textContent = data.length;
}

function badgeClass(level) {
  if (!level) return 'bg-secondary';
  if (level === 'high') return 'bg-danger';
  if (level === 'medium') return 'bg-warning text-dark';
  return 'bg-success';
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// open modal for add/edit
btnAdd.addEventListener('click', () => openModalFor());

function openModalFor(record = null) {
  if (record) {
    modalTitle.textContent = '레코드 수정';
    document.getElementById('record-id').value = record.id;
    document.getElementById('field-name').value = record.name ?? '';
    document.getElementById('field-age').value = record.age ?? '';
    document.getElementById('field-location').value = record.location ?? '';
    document.getElementById('field-risk').value = record.risk_level ?? 'low';
    document.getElementById('field-lastfall').value = record.last_fall ?? '';
    document.getElementById('field-notes').value = record.notes ?? '';
    btnDelete.classList.remove('d-none');
  } else {
    modalTitle.textContent = '레코드 추가';
    recordForm.reset();
    document.getElementById('record-id').value = '';
    btnDelete.classList.add('d-none');
  }
  recordModal.show();
}

// save form
btnSave.addEventListener('click', () => {
  const id = document.getElementById('record-id').value;
  const payload = {
    name: document.getElementById('field-name').value.trim(),
    age: Number(document.getElementById('field-age').value || 0),
    location: document.getElementById('field-location').value.trim(),
    risk_level: document.getElementById('field-risk').value,
    last_fall: document.getElementById('field-lastfall').value,
    notes: document.getElementById('field-notes').value.trim(),
  };
  if (!payload.name) {
    alert('이름을 입력해주세요');
    return;
  }
  if (id) {
    store.update(id, payload);
  } else {
    store.insert(payload);
  }
  recordModal.hide();
  renderTable();
});

// delete from modal
btnDelete.addEventListener('click', () => {
  const id = document.getElementById('record-id').value;
  if (!id) return;
  if (!confirm('이 레코드를 정말 삭제할까요?')) return;
  store.delete(id);
  recordModal.hide();
  renderTable();
});

// table action delegation
tableBody.addEventListener('click', (e) => {
  const edit = e.target.closest('.btn-edit');
  const del = e.target.closest('.btn-del');
  if (edit) {
    const id = edit.dataset.id;
    const rec = store.all().find(r => r.id === id);
    if (rec) openModalFor(rec);
  } else if (del) {
    const id = del.dataset.id;
    if (confirm('정말 삭제하시겠습니까?')) {
      store.delete(id);
      renderTable();
    }
  }
});

// Export / Import
btnExport.addEventListener('click', () => {
  const data = JSON.stringify(store.all(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'falls-data.json';
  a.click();
  URL.revokeObjectURL(url);
});

btnImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (!Array.isArray(json)) throw new Error('JSON은 배열이어야 합니다');
      // basic validation and merge
      json.forEach(item => {
        // if has id, keep it, else generate
        const rec = { id: item.id || undefined, name: item.name || '이름 없음', age: item.age || 0, location: item.location || '', risk_level: item.risk_level || 'low', last_fall: item.last_fall || '', notes: item.notes || '' };
        if (rec.id && store.all().some(r => r.id === rec.id)) {
          store.update(rec.id, rec);
        } else {
          store.insert(rec);
        }
      });
      renderTable();
      alert('가져오기 완료');
    } catch (err) {
      alert('가져오기 실패: ' + err.message);
    }
  };
  reader.readAsText(f);
});

// --- Very small SQL-like parser ---
function parseAndRun(command) {
  const text = (command || '').trim();
  if (!text) return { ok: false, msg: '명령을 입력하세요' };
  const tokens = text.split(/\s+/);
  const verb = tokens[0].toUpperCase();
  try {
    if (verb === 'SELECT') {
      // SELECT * WHERE key=value
      const where = parseWhere(text);
      const rows = store.select(where);
      return { ok: true, rows };
    }
    if (verb === 'INSERT') {
      // INSERT key=value, key2=value2
      const rest = text.slice(6).trim();
      const obj = parseKeyValues(rest);
      const rec = store.insert(obj);
      return { ok: true, rows: [rec], msg: '삽입됨' };
    }
    if (verb === 'UPDATE') {
      // UPDATE SET key=value WHERE key=value
      const mSet = text.match(/SET\s+(.+?)\s+WHERE\s+(.+)$/i);
      if (!mSet) return { ok: false, msg: 'UPDATE 문법: UPDATE SET key=val WHERE key=val' };
      const changes = parseKeyValues(mSet[1]);
      const where = parseWhere('WHERE ' + mSet[2]);
      const rows = store.select(where);
      rows.forEach(r => store.update(r.id, changes));
      return { ok: true, rows: store.select(where), msg: '업데이트 완료' };
    }
    if (verb === 'DELETE') {
      // DELETE WHERE key=value
      const where = parseWhere(text);
      const rows = store.select(where);
      rows.forEach(r => store.delete(r.id));
      return { ok: true, msg: `삭제됨: ${rows.length}건` };
    }
    return { ok: false, msg: '지원되지 않는 명령입니다' };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

function parseWhere(text) {
  const m = text.match(/WHERE\s+(.+)$/i);
  if (!m) return null;
  // support single condition key=value
  const cond = m[1].trim();
  const parts = cond.split('AND').map(s => s.trim());
  const where = {};
  parts.forEach(p => {
    const eq = p.indexOf('=');
    if (eq === -1) return;
    const k = p.slice(0, eq).trim();
    let v = p.slice(eq + 1).trim();
    v = v.replace(/^['"]|['"]$/g, '');
    where[k] = v;
  });
  return where;
}

function parseKeyValues(text) {
  // key=value, key2=value2
  const pairs = text.split(',').map(s => s.trim()).filter(Boolean);
  const obj = {};
  pairs.forEach(p => {
    const eq = p.indexOf('=');
    if (eq === -1) return;
    const k = p.slice(0, eq).trim();
    let v = p.slice(eq + 1).trim();
    v = v.replace(/^['"]|['"]$/g, '');
    // try numeric
    if (!isNaN(v) && v !== '') v = Number(v);
    obj[k] = v;
  });
  return obj;
}

btnRunSql.addEventListener('click', () => {
  const cmd = sqlInput.value.trim();
  const out = parseAndRun(cmd);
  if (out.ok) {
    if (out.rows) sqlResult.textContent = JSON.stringify(out.rows, null, 2);
    else sqlResult.textContent = out.msg || '완료';
  } else sqlResult.textContent = 'Error: ' + out.msg;
  renderTable();
});

btnClearSql.addEventListener('click', () => { sqlInput.value = ''; sqlResult.textContent = '(결과가 여기에 표시됩니다)'; });

// initial render
renderTable();

// expose store for debugging
window.__store = store;