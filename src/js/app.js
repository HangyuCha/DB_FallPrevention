// src/js/app.js
import { loadPage } from './pages-loader.js';
import { api, authApi } from './api.js';
// Complete, cleaned client script: datastore, UI, layout hooks
// Toggle developer debug overlay. Set to false to disable the bottom-right dev-debug box.
const SHOW_DEV_DEBUG = false;
const STORE_KEY = 'falls-db-v1';
const USER_KEY = 'falls-ui-user';
const LOGO_KEY = 'falls-ui-logo';

class DataStore {
  constructor() { this.data = []; this.load(); }
  load() {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      try { this.data = JSON.parse(raw); } catch (e) { console.error(e); this.data = []; }
    } else {
      this.data = [
        { id: this._id(), name: '김영희', age: 82, location: 'A동 201호', risk_level: 'high', last_fall: '2025-03-12', notes: '보행 보조기 사용' },
        { id: this._id(), name: '이철수', age: 76, location: 'B동 103호', risk_level: 'medium', last_fall: '2024-10-02', notes: '야간 화장실 낙상 경험' },
        { id: this._id(), name: '박순자', age: 90, location: 'C동 305호', risk_level: 'high', last_fall: '', notes: '시력 저하' }
      ];
      this.save();
    }
  }
  save() { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); }
  _id() { return Math.random().toString(36).slice(2, 9); }
  all() { return [...this.data]; }
  select(where) { if (!where) return this.all(); return this.data.filter(r => Object.entries(where).every(([k,v])=>String(r[k])===String(v))); }
  insert(obj){ const rec = { id: this._id(), ...obj }; this.data.unshift(rec); this.save(); return rec; }
  update(id, changes){ const i=this.data.findIndex(r=>r.id===id); if(i===-1) return null; this.data[i] = {...this.data[i], ...changes}; this.save(); return this.data[i]; }
  delete(id){ const i=this.data.findIndex(r=>r.id===id); if(i===-1) return false; this.data.splice(i,1); this.save(); return true; }
}
const store = new DataStore();
const TAGS_KEY = 'falls-tags-v1';

// sample datasets for pages
const SAMPLE_VIDEOS = [
  {id:'v1', name:'sample_video_01.mp4', size:'10MB', src:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'},
  {id:'v2', name:'sample_video_02.mp4', size:'23MB', src:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'}
];

const SAMPLE_DETECTIONS = [
  {time:'2025-11-05 13:22', video:'sample_video_01.mp4', type:'Suspected fall', score:0.89},
  {time:'2025-11-06 09:12', video:'sample_video_02.mp4', type:'Slip', score:0.76}
];

const SAMPLE_FEATURES = [
  {id:'f1', title:'걷기 특징', thumb:''},
  {id:'f2', title:'서기-넘어짐 특징', thumb:''}
];

// Persistent videos/detections storage helpers (fall back to SAMPLE_* if none)
const VIDEOS_KEY = 'falls-videos-v1';
const DETECTIONS_KEY = 'falls-detections-v1';
function getVideos(){
  try{
    const raw = localStorage.getItem(VIDEOS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  try{ localStorage.setItem(VIDEOS_KEY, JSON.stringify(SAMPLE_VIDEOS)); }catch(e){}
  return SAMPLE_VIDEOS.slice();
}
function getDetections(){
  try{
    const raw = localStorage.getItem(DETECTIONS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  try{ localStorage.setItem(DETECTIONS_KEY, JSON.stringify(SAMPLE_DETECTIONS)); }catch(e){}
  return SAMPLE_DETECTIONS.slice();
}

// Background sync from backend API (if available). Non-blocking – UI falls back to local data.
async function syncRemoteData(){
  try{
    // Videos from /api/media (video files only)
    try{
      const media = await api.listMedia();
      const videos = (media||[]).filter(f=>{
        const ct = (f.contentType||'').toLowerCase();
        const nm = (f.name||'').toLowerCase();
        return (ct.startsWith('video/') || nm.endsWith('.mp4') || nm.endsWith('.webm') || nm.endsWith('.mov') || nm.endsWith('.mkv'));
      }).map(f=>({
        id: f.id || f.path || f.name,
        name: f.name,
        size: f.size,
        sizeText: typeof f.size==='number' ? humanSize(f.size) : (f.size||'') ,
        src: f.url,
        uploadDate: new Date().toISOString()
      }));
      if(videos.length){ localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos)); }
    }catch(e){ /* ignore to keep UI responsive */ }

    // Detections from /api/detections
    try{
      const dets = await api.listDetections();
      const mapped = (dets||[]).map(d=>({
        id: d.id || Math.random().toString(36).slice(2,9),
        video: d.video || '',
        score: typeof d.score==='number' ? d.score : 0,
        time: d.time || new Date().toISOString(),
        frame: d.frame || '',
        type: d.type || '',
        fall: (String(d.type||'').toLowerCase().includes('fall') || d.fall===true)
      }));
      if(mapped.length){ localStorage.setItem(DETECTIONS_KEY, JSON.stringify(mapped)); }
    }catch(e){ /* ignore */ }

    // Soft refresh currently visible view if relevant nodes exist
    const hash = (window.location.hash||'').replace('#','');
    if(hash==='dashboard') renderDashboard();
    if(hash==='videos') renderVideos();
    if(hash==='detections') renderDetections();
  }catch(e){ /* swallow */ }
}

// Chart instance for the falls trend
let fallsChart = null;
function renderFallsChart(detections){
  try{
    const canvas = document.getElementById('falls-trend-chart');
    if(!canvas || typeof Chart === 'undefined') return;
    // last 7 days labels
    const labels = [];
    const counts = [];
    const now = new Date();
    for(let i=6;i>=0;i--){ const d = new Date(now); d.setDate(now.getDate()-i); labels.push(d.toLocaleDateString()); counts.push(0); }
    detections.forEach(d=>{
      const t = parseTimeString(d.time);
      if(!t) return;
      // find label index
      for(let i=0;i<labels.length;i++){
        const labelDate = new Date(); labelDate.setHours(0,0,0,0);
        const daysAgo = labels.length-1 - i; // mapping used above
      }
    });
    // simpler approach: bucket by date string
    const bucket = {};
    detections.forEach(d=>{ const t=parseTimeString(d.time); if(!t) return; const key = t.toLocaleDateString(); bucket[key] = (bucket[key]||0)+ (String(d.type||'').toLowerCase().includes('낙')|| d.fall===true || String(d.type||'').toLowerCase().includes('fall') ? 1 : 0); });
    for(let i=6;i>=0;i--){ const d = new Date(now); d.setDate(now.getDate()-i); const k = d.toLocaleDateString(); counts.push(bucket[k]||0); }

    // remove the earlier zero-filled counts (we initialized with zero and then pushed again) — normalize counts length
    // compute fresh labels/counts
    const freshLabels = [];
    const freshCounts = [];
    for(let i=6;i>=0;i--){ const d = new Date(now); d.setDate(now.getDate()-i); const k = d.toLocaleDateString(); freshLabels.push(k); freshCounts.push(bucket[k]||0); }

    if(fallsChart){ fallsChart.data.labels = freshLabels; fallsChart.data.datasets[0].data = freshCounts; fallsChart.update(); return; }
    const ctx = canvas.getContext('2d');
    fallsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: freshLabels,
        datasets: [{ label: 'Falls', data: freshCounts, backgroundColor: 'rgba(220,53,69,0.85)' }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
      }
    });
  }catch(e){ console.error('renderFallsChart failed', e); }
}


// auth
function getCurrentUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e){ return null; } }
function setCurrentUser(u){ if(!u) localStorage.removeItem(USER_KEY); else localStorage.setItem(USER_KEY, JSON.stringify(u)); }

// UI elements
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
const searchInput = document.getElementById('search-input');
// header elements are provided by layout fragments and bound after fragments-loaded
let globalSearch = null;
let notifyBadge = null;
let btnNotify = null;

// modal/login (guard element presence to avoid runtime errors when fragments are missing)
const recordModalEl = document.getElementById('recordModal');
const recordModal = recordModalEl ? new bootstrap.Modal(recordModalEl) : { show: ()=>{}, hide: ()=>{} };
const modalTitle = document.getElementById('modal-title');
const recordForm = document.getElementById('record-form');
const btnSave = document.getElementById('btn-save');
const btnDelete = document.getElementById('btn-delete');
let loginModal = null;
let registerModal = null;
let btnLoginOpen = null;
let btnLogout = null;
let loginForm = null;
let loginUserInput = null;
let loginPassInput = null;
let registerForm = null;
let regUserInput = null;
let regPassInput = null;
let regBirthInput = null;
let modalOpenRegisterBtn = null;
let modalOpenLoginBtn = null;
const navUser = document.getElementById('nav-user');
const heroSection = document.getElementById('hero-section');

// View manager: show/hide main sections so the site behaves like a homepage with navigable views
const VIEW_IDS = ['hero','features','showcase','data-management','team','contact','dashboard','videos','detections','tags','settings','auth'];
const PAGE_FRAGMENTS = new Set(['dashboard','videos','detections','features','tags','settings','contact','auth']);
// Inline fallback template for dashboard (used to force-inject when fragment loading fails)
const DASHBOARD_TEMPLATE = `
<section id="dashboard" class="py-4">
  <div class="d-flex justify-content-between align-items-start mb-3">
    <h3 class="mb-0">Dashboard</h3>
    <div class="d-flex gap-2">
      <button id="dash-btn-videos" class="btn btn-sm btn-outline-primary">View Videos</button>
      <button id="dash-btn-detections" class="btn btn-sm btn-outline-secondary">Detection Details</button>
      <button id="dash-btn-settings" class="btn btn-sm btn-primary">Analysis Settings</button>
    </div>
  </div>
  <div id="kpi-cards" class="row g-3 mb-4">
    <div class="col-md-4"><div class="card p-3 shadow-sm text-center"><h6 class="mb-1">Total uploaded videos</h6><div class="h2" id="kpi-total-videos">—</div><small class="text-muted">(excluding deleted)</small></div></div>
    <div class="col-md-4"><div class="card p-3 shadow-sm text-center"><h6 class="mb-1">This week's fall detections</h6><div class="h2" id="kpi-week-falls">—</div><div class="small text-muted">Fall ratio: <span id="kpi-fall-ratio">—</span></div></div></div>
    <div class="col-md-4"><div class="card p-3 shadow-sm text-center"><h6 class="mb-1">Unreviewed detections</h6><div class="h2" id="kpi-unreviewed">—</div><small class="text-muted">(status = new)</small></div></div>
  </div>
  <div class="card mb-4"><div class="card-body d-flex flex-column flex-md-row gap-3 align-items-center"><div class="d-flex gap-2 align-items-center"><label class="mb-0 small text-muted">Period</label><select id="dash-filter-period" class="form-select form-select-sm"><option value="week">This week</option><option value="month">This month</option></select></div><div class="d-flex gap-2 align-items-center"><label class="mb-0 small text-muted">Tag</label><select id="dash-filter-tag" class="form-select form-select-sm"><option value="">All</option></select></div><div class="d-flex gap-2 align-items-center ms-md-auto"><label class="mb-0 small text-muted">User</label><select id="dash-filter-user" class="form-select form-select-sm"><option value="all">All</option></select></div></div></div>
  <div class="row mb-4"><div class="col-12"><div class="card p-3 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-2"><strong>Fall detections (7-day trend)</strong><small class="text-muted">daily counts</small></div><div style="height:220px"><canvas id="falls-trend-chart" style="max-height:200px"></canvas></div></div></div></div></div>
  <div class="row"><div class="col-lg-6 mb-3"><div class="card shadow-sm"><div class="card-header d-flex justify-content-between align-items-center"><strong>Latest fall detections</strong><small class="text-muted">(latest 5)</small></div><div class="card-body p-0"><div id="recent-falls" class="list-group list-group-flush"></div><div id="recent-falls-empty" class="p-3 text-center text-muted d-none">No fall detections available.</div></div></div></div><div class="col-lg-6 mb-3"><div class="card shadow-sm"><div class="card-header d-flex justify-content-between align-items-center"><strong>Recent uploaded videos</strong><small class="text-muted">(latest 5)</small></div><div class="card-body p-0"><div id="recent-videos" class="list-group list-group-flush"></div><div id="recent-videos-empty" class="p-3 text-center text-muted d-none">No videos available.</div></div></div></div></div>
  <div id="dashboard-error" class="alert alert-warning d-none">Failed to load dashboard data. <button id="dash-retry" class="btn btn-sm btn-outline-primary ms-2">Retry</button></div>
</section>
`;
async function showView(id){
  // lazy-load page fragment if requested view is one of the pages and not yet in DOM
  if(PAGE_FRAGMENTS.has(id) && !document.getElementById(id)){
    try{ await loadPage(id); }catch(e){ console.error('Failed to load page fragment', e);
      // if loading failed, inject a minimal fallback section to avoid missing DOM elements
      try{
        const container = document.getElementById('pages-container');
        if(container && !document.getElementById(id)){
          // if this is dashboard, inject the full inline template to force the DOM
          if(id === 'dashboard'){
            container.insertAdjacentHTML('beforeend', DASHBOARD_TEMPLATE);
          } else {
            const fallback = document.createElement('section');
            fallback.id = id;
            fallback.className = 'py-4';
            fallback.innerHTML = `<div class="alert alert-danger">Failed to load ${id} content. Try refresh.</div>`;
            container.appendChild(fallback);
          }
          // dispatch page-loaded so renderers can run
          document.dispatchEvent(new CustomEvent('page-loaded', { detail: { id } }));
        }
      }catch(iex){ console.error('Failed to inject fallback page fragment', iex); }
    }
  }
  VIEW_IDS.forEach(v=>{ const el = document.getElementById(v); if(!el) return; if(v===id){
      // Ensure the requested view is visible. Use explicit 'block' since CSS initially hides
      // all sections except the hero. Setting to 'block' forces visibility regardless of CSS.
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });
  // update active nav link
  const header = document.getElementById('layout-header');
  if(header){ header.querySelectorAll('a.nav-link').forEach(a=>{ a.classList.toggle('active', a.getAttribute('href')===('#'+id)); }); }
  // update sidebar nav active state as well (if present)
  const sidebarEl = document.getElementById('layout-sidebar');
  if(sidebarEl){
    sidebarEl.querySelectorAll('a.nav-link').forEach(a=>{ a.classList.toggle('active', a.getAttribute('href')===('#'+id)); });
  }
  // Toggle full-width (no-sidebar) when showing the hero (Home) or contact view
  try{
    if(id === 'hero' || id === 'contact') document.documentElement.classList.add('no-sidebar'); else document.documentElement.classList.remove('no-sidebar');
  }catch(e){ /* ignore */ }
  // call view-specific renderer
  try{
    if(id==='dashboard') renderDashboard();
    if(id==='videos') renderVideos();
    if(id==='detections') renderDetections();
    if(id==='features') renderFeatures();
    if(id==='data-management') renderTable();
    if(id==='tags') renderTags();
    if(id==='contact') renderContact();
    if(id==='auth') renderAuthPage();
  }catch(e){ console.error('view render error', e); }
}

async function applyInitialView(){ const hash = (window.location.hash||'').replace('#',''); if(hash && VIEW_IDS.includes(hash)) await showView(hash); else await showView('hero'); }

function onFragmentsLoaded(){
  console.debug('[app] fragments-loaded received, binding header/sidebar controls');
  globalSearch = document.getElementById('global-search');
  notifyBadge = document.getElementById('notify-badge');
  btnNotify = document.getElementById('btn-notify');

  // Requery modal and buttons after fragments injection (DOM replaced)
  const loginModalEl = document.getElementById('loginModal');
  loginModal = loginModalEl ? new bootstrap.Modal(loginModalEl) : null;
  const registerModalEl = document.getElementById('registerModal');
  registerModal = registerModalEl ? new bootstrap.Modal(registerModalEl) : null;
  btnLoginOpen = document.getElementById('btn-login-open');
  btnLogout = document.getElementById('btn-logout');
  loginForm = document.getElementById('modal-login-form');
  loginUserInput = document.getElementById('modal-login-username');
  loginPassInput = document.getElementById('modal-login-password');
  registerForm = document.getElementById('modal-register-form');
  regUserInput = document.getElementById('modal-reg-username');
  regPassInput = document.getElementById('modal-reg-password');
  regBirthInput = document.getElementById('modal-reg-birth');
  modalOpenRegisterBtn = document.getElementById('modal-open-register');
  modalOpenLoginBtn = document.getElementById('modal-open-login');

  const header = document.getElementById('layout-header');
  if(header){
    header.querySelectorAll('a.nav-link').forEach(a=>{
      a.addEventListener('click', async (e)=>{
        const href = a.getAttribute('href')||''; if(!href.startsWith('#')) return; e.preventDefault(); const id = href.replace('#',''); if(VIEW_IDS.includes(id)){ history.pushState({}, '', '#'+id); await showView(id); }
      });
    });
  }

  // sidebar links
  const sidebar = document.getElementById('layout-sidebar');
  if(sidebar){
    sidebar.querySelectorAll('a.nav-link').forEach(a=>{
      a.addEventListener('click', async (e)=>{
        const href = a.getAttribute('href')||''; if(!href.startsWith('#')) return; e.preventDefault(); const id = href.replace('#',''); if(VIEW_IDS.includes(id)){ history.pushState({}, '', '#'+id); await showView(id); }
      });
    });
  }

  if(globalSearch){ globalSearch.addEventListener('input', (e)=>{ const v = e.target.value || ''; if(searchInput) { searchInput.value = v; renderTable(); } }); }
  if(btnNotify){ btnNotify.addEventListener('click', ()=>{ alert('미처리 탐지: ' + (notifyBadge ? notifyBadge.textContent : '0') + '건'); }); }

  // Bind auth controls once (idempotent guards)
  if(btnLoginOpen && !btnLoginOpen.__bound){ btnLoginOpen.__bound = true; btnLoginOpen.addEventListener('click', ()=> loginModal?.show()); }
  if(btnLogout && !btnLogout.__bound){ btnLogout.__bound = true; btnLogout.addEventListener('click', ()=>{ setCurrentUser(null); renderAuth(); }); }
  if(loginForm && !loginForm.__bound){
    loginForm.__bound = true;
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const username = (loginUserInput?.value || '').trim();
      const password = loginPassInput?.value || '';
      if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
      try{
        showSpinner(true);
        const res = await authApi.login({ username, password });
        const token = res?.token; const user = res?.user || { username };
        if(!token) throw new Error('토큰 없음');
        localStorage.setItem('auth_token', token);
        setCurrentUser({ name: user.username || username, loggedAt: Date.now() });
        showToast('로그인 성공', 'success');
        loginModal?.hide();
        renderAuth();
        history.pushState({}, '', '#dashboard');
        await showView('dashboard');
      }catch(err){ console.error('login failed', err); showToast('로그인 실패', 'danger'); }
      finally{ showSpinner(false); }
    });
  }
  if(registerForm && !registerForm.__bound){
    registerForm.__bound = true;
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const username = (regUserInput?.value || '').trim();
      const password = regPassInput?.value || '';
      const birthDate = regBirthInput?.value || '';
      if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
      try{
        showSpinner(true);
        await authApi.register({ username, password, birthDate });
        showToast('회원가입 완료. 로그인해주세요.', 'success');
        registerModal?.hide();
        loginModal?.show();
      }catch(err){ console.error('register failed', err); showToast('회원가입 실패', 'danger'); }
      finally{ showSpinner(false); }
    });
  }
  if(modalOpenRegisterBtn && !modalOpenRegisterBtn.__bound){ modalOpenRegisterBtn.__bound = true; modalOpenRegisterBtn.addEventListener('click', ()=>{ loginModal?.hide(); registerModal?.show(); }); }
  if(modalOpenLoginBtn && !modalOpenLoginBtn.__bound){ modalOpenLoginBtn.__bound = true; modalOpenLoginBtn.addEventListener('click', ()=>{ registerModal?.hide(); loginModal?.show(); }); }

  applyInitialView();

  // Try to pull latest data from backend (non-blocking)
  syncRemoteData();
  // Optional: periodic refresh (lightweight)
  try{ if(!window.__remoteSyncInterval){ window.__remoteSyncInterval = setInterval(syncRemoteData, 60000); } }catch(e){}
}

// Remove duplicate elements with the same id for `hero` (defensive fix).
// Some build/processes or fragment injections might accidentally duplicate the hero section.
function removeDuplicateHero(){
  try{
    const nodes = document.querySelectorAll('#hero');
    if(nodes && nodes.length>1){
      // Keep the first occurrence, remove the rest (assumed to be duplicates appended later)
      for(let i=1;i<nodes.length;i++) nodes[i].remove();
      console.info('[app] removed duplicate #hero elements, kept first');
    }
  }catch(e){ console.error('removeDuplicateHero failed', e); }
}

// Attempt removal on initial load and after fragments-loaded
document.addEventListener('fragments-loaded', ()=> setTimeout(removeDuplicateHero, 50));
window.addEventListener('load', ()=> setTimeout(removeDuplicateHero, 50));

// Listen for fragments-loaded dispatched by layout-loader (listen on both window and document)
window.addEventListener('fragments-loaded', onFragmentsLoaded);
document.addEventListener('fragments-loaded', onFragmentsLoaded);
// If fragments already present, init soon
if(document.getElementById('layout-header') && document.getElementById('layout-header').innerHTML.trim()) setTimeout(onFragmentsLoaded, 10);

// --- small development debug panel (visual aid when dashboard appears blank) ---
function ensureDevDebug(){
  if(!SHOW_DEV_DEBUG) return null;
  if(document.getElementById('dev-debug')) return document.getElementById('dev-debug');
  const box = document.createElement('div');
  box.id = 'dev-debug';
  box.style.position = 'fixed';
  box.style.right = '12px';
  box.style.bottom = '12px';
  box.style.zIndex = 1050;
  box.style.background = 'rgba(0,0,0,0.75)';
  box.style.color = '#fff';
  box.style.fontSize = '12px';
  box.style.padding = '8px 10px';
  box.style.borderRadius = '6px';
  box.style.maxWidth = '320px';
  box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
  box.innerHTML = '<strong>dev-debug</strong><div id="dev-debug-body" style="margin-top:6px"></div>';
  document.body.appendChild(box);
  return box;
}

function updateDevDebug(info){
  if(!SHOW_DEV_DEBUG) return;
  try{
    const box = ensureDevDebug();
    if(!box) return;
    const body = box.querySelector('#dev-debug-body');
    const hash = window.location.hash || '(no-hash)';
    const sections = ['hero','dashboard','videos','detections','data-management'];
    const states = sections.map(s=>{ const el = document.getElementById(s); return `${s}: ${el ? getComputedStyle(el).display : 'missing'}`; }).join('<br>');
    body.innerHTML = `hash: <code>${escapeHtml(hash)}</code><br>videos: ${info.videos}, detections: ${info.detections}<br>${states}<br>missing: ${JSON.stringify(info.missing)}`;
  }catch(e){ console.error('dev-debug update failed', e); }
}

// Global spinner & toast helpers
function showSpinner(on){
  const el = document.getElementById('global-spinner');
  if(!el) return; if(on) el.classList.remove('d-none'); else el.classList.add('d-none');
}

function showToast(msg, variant='dark'){
  try{
    const toastEl = document.getElementById('global-toast');
    const toastBody = document.getElementById('global-toast-body');
    if(!toastEl || !toastBody) return;
    toastBody.textContent = msg;
    // set bootstrap bg class
    toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
    const bs = new bootstrap.Toast(toastEl);
    bs.show();
  }catch(e){ console.error('showToast failed', e); }
}

// update debug panel on hash change too
window.addEventListener('hashchange', ()=>{ try{ const vidLen = (typeof SAMPLE_VIDEOS !== 'undefined')? SAMPLE_VIDEOS.length:0; const detLen = (typeof SAMPLE_DETECTIONS !== 'undefined')? SAMPLE_DETECTIONS.length:0; updateDevDebug({videos:vidLen,detections:detLen,missing:[]}); }catch(e){} });

// When a page fragment is injected, ensure its renderer runs (safe, idempotent)
document.addEventListener('page-loaded', (ev)=>{
  try{
    const id = ev?.detail?.id;
    if(!id) return;
    showSpinner(false);
    showToast(`${id} loaded`, 'success');
    // if the loaded page matches current hash, trigger renderer; otherwise still call renderer to initialize bindings
    if(id==='dashboard') typeof renderDashboard === 'function' && renderDashboard();
    if(id==='videos') typeof renderVideos === 'function' && renderVideos();
    if(id==='detections') typeof renderDetections === 'function' && renderDetections();
    if(id==='features') typeof renderFeatures === 'function' && renderFeatures();
    if(id==='tags') typeof renderTags === 'function' && renderTags();
    if(id==='settings') typeof renderSettings === 'function' && renderSettings();
    if(id==='contact') typeof renderContact === 'function' && renderContact();
    if(id==='auth') typeof renderAuthPage === 'function' && renderAuthPage();
  }catch(err){ console.error('page-loaded handler error', err); }
});

// wire contact page form and actions after fragment load (idempotent)
document.addEventListener('page-loaded', (ev)=>{
  try{
    if(ev?.detail?.id !== 'contact') return;
    const form = document.getElementById('contact-form');
    const submit = document.getElementById('contact-submit');
    if(form && !form.__bound){
      form.__bound = true;
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const name = (document.getElementById('contact-name')?.value || '').trim();
        const email = (document.getElementById('contact-email')?.value || '').trim();
        const msg = (document.getElementById('contact-message')?.value || '').trim();
        if(!name || !email || !msg){ showToast('Please fill all fields', 'danger'); return; }
        const arr = loadContactsFromStorage();
        arr.push({ id: Math.random().toString(36).slice(2,9), name, email, message: msg, createdAt: new Date().toISOString() });
        saveContactsToStorage(arr);
        showToast('Message submitted. Thank you!', 'success');
        form.reset();
        renderContact();
      });
    }
    // initial render
    renderContact();
  }catch(e){ console.error('contact page-loaded handler failed', e); }
});

document.addEventListener('page-load-start', (ev)=>{ try{ showSpinner(true); }catch(e){} });
document.addEventListener('page-load-failed', (ev)=>{ try{ showSpinner(false); const d = ev?.detail || {}; showToast(`Failed to load ${d.id||''}: ${d.error||'unknown'}`, 'danger'); }catch(e){} });

// --- Settings persistence and UI binding (user_analysis_settings) ---
const SETTINGS_KEY = 'user_analysis_settings';
function getDefaultUserSettings(){
  return {
    frame_interval: 5,
    notification_enabled: true,
    default_policy: 'balanced',
    notification_channels: { web: true, pwa: false, email: false },
    // new options
    notification_option: 'on_high',
    notification_threshold: 0.8,
    notification_time_limit: 0
  };
}
function loadUserSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(!raw) return getDefaultUserSettings();
    const obj = JSON.parse(raw);
    return Object.assign(getDefaultUserSettings(), obj);
  }catch(e){ console.error('loadUserSettings failed', e); return getDefaultUserSettings(); }
}
function saveUserSettings(obj){
  try{
    // validate
    const n = Number(obj.frame_interval || 0);
    if(!Number.isFinite(n) || n <= 0){ showToast('frame_interval must be an integer >= 1', 'danger'); return false; }
    obj.frame_interval = Math.max(1, Math.floor(n));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
    const statusEl = document.getElementById('settings-save-status'); if(statusEl) statusEl.textContent = `Saved: ${new Date().toLocaleTimeString()}`;
    showToast('Settings saved', 'success');
    return true;
  }catch(e){ console.error('saveUserSettings failed', e); showToast('Failed to save settings', 'danger'); return false; }
}

function renderSettings(){
  try{
    const s = loadUserSettings();
    // populate input values (always update values on every call)
    const fi = document.getElementById('setting-frame-interval'); if(fi){ fi.value = s.frame_interval; }
    const notify = document.getElementById('setting-notification-enabled'); if(notify){ notify.checked = !!s.notification_enabled; }
    const policy = document.getElementById('setting-default-policy'); if(policy){ policy.value = s.default_policy || 'balanced'; }
    const chWeb = document.getElementById('setting-notify-web'); const chPwa = document.getElementById('setting-notify-pwa'); const chEmail = document.getElementById('setting-notify-email');
    if(chWeb){ chWeb.checked = !!(s.notification_channels && s.notification_channels.web); }
    if(chPwa){ chPwa.checked = !!(s.notification_channels && s.notification_channels.pwa); }
    if(chEmail){ chEmail.checked = !!(s.notification_channels && s.notification_channels.email); }

    const notifOption = document.getElementById('setting-notification-option'); if(notifOption){ notifOption.value = s.notification_option || 'on_high'; }
    const notifThreshold = document.getElementById('setting-notification-threshold'); if(notifThreshold){ notifThreshold.value = (s.notification_threshold!=null)? s.notification_threshold : 0.8; }
    const notifTime = document.getElementById('setting-notification-time-limit'); if(notifTime){ notifTime.value = s.notification_time_limit || 0; }

    const statusEl = document.getElementById('settings-save-status'); if(statusEl) statusEl.textContent = 'Loaded: ' + new Date().toLocaleTimeString();

    // Bind event listeners only once to avoid multiple handlers leading to flicker
    if(renderSettings.__bound) return;
    renderSettings.__bound = true;

    if(fi){ fi.addEventListener('change', ()=>{
      const cur = loadUserSettings(); const v = Number(fi.value||0);
      if(!v || v<=0){ fi.classList.add('is-invalid'); showToast('Frame interval must be an integer >= 1', 'danger'); return; }
      fi.classList.remove('is-invalid'); cur.frame_interval = Math.floor(v); saveUserSettings(cur);
    }); }

    if(notify){ notify.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.notification_enabled = !!notify.checked; saveUserSettings(cur); }); }
    if(policy){ policy.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.default_policy = policy.value; saveUserSettings(cur); }); }

    if(chWeb){ chWeb.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.notification_channels = cur.notification_channels || {}; cur.notification_channels.web = !!chWeb.checked; saveUserSettings(cur); }); }
    if(chPwa){ chPwa.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.notification_channels = cur.notification_channels || {}; cur.notification_channels.pwa = !!chPwa.checked; saveUserSettings(cur); }); }
    if(chEmail){ chEmail.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.notification_channels = cur.notification_channels || {}; cur.notification_channels.email = !!chEmail.checked; saveUserSettings(cur); }); }

    if(notifOption){ notifOption.addEventListener('change', ()=>{ const cur = loadUserSettings(); cur.notification_option = notifOption.value; saveUserSettings(cur); }); }
    if(notifThreshold){ notifThreshold.addEventListener('change', ()=>{ const cur = loadUserSettings(); const v = parseFloat(notifThreshold.value); if(isNaN(v) || v<0 || v>1){ showToast('Notification threshold must be between 0 and 1', 'danger'); return; } cur.notification_threshold = v; saveUserSettings(cur); }); }
    if(notifTime){ notifTime.addEventListener('change', ()=>{ const cur = loadUserSettings(); let v = Number(notifTime.value||0); if(isNaN(v) || v<0){ showToast('Notification time limit must be >= 0', 'danger'); return; } cur.notification_time_limit = Math.max(0, Math.floor(v)); saveUserSettings(cur); }); }

    // personal info modal wiring (bind once)
    const openPersonalBtn = document.getElementById('btn-open-personal-info'); if(openPersonalBtn){ openPersonalBtn.addEventListener('click', ()=>{
      const user = getCurrentUser() || {};
      const nameEl = document.getElementById('personal-name'); const emailEl = document.getElementById('personal-email'); const dobEl = document.getElementById('personal-dob'); const pwEl = document.getElementById('personal-password'); const pwcEl = document.getElementById('personal-password-confirm');
      if(nameEl) nameEl.value = user.name || '';
      if(emailEl) emailEl.value = user.email || '';
      if(dobEl) dobEl.value = user.dob || '';
      if(pwEl) pwEl.value = '';
      if(pwcEl) pwcEl.value = '';
      const modalEl = document.getElementById('personalInfoModal'); if(modalEl){ const m = new bootstrap.Modal(modalEl); m.show(); }
    }); }

    const savePersonalBtn = document.getElementById('btn-save-personal-info'); if(savePersonalBtn){ savePersonalBtn.addEventListener('click', ()=>{
      const name = document.getElementById('personal-name')?.value.trim() || '';
      const email = document.getElementById('personal-email')?.value.trim() || '';
      const dob = document.getElementById('personal-dob')?.value || '';
      const pw = document.getElementById('personal-password')?.value || '';
      const pwc = document.getElementById('personal-password-confirm')?.value || '';
      if(pw || pwc){ if(pw !== pwc){ showToast('Passwords do not match', 'danger'); return; } else { showToast('Password changed (local demo only)', 'success'); } }
      setCurrentUser({ name, email, dob, loggedAt: Date.now() }); renderAuth(); const bs = bootstrap.Modal.getInstance(document.getElementById('personalInfoModal')); bs && bs.hide();
    }); }

  }catch(e){ console.error('renderSettings failed', e); }
}

function renderAuth(){
  const user = getCurrentUser();
  // navUser may not exist yet if header fragment hasn't loaded — guard it
  if(navUser){
    if(user){
      navUser.textContent = `환영합니다, ${user.name}`;
    } else {
      navUser.textContent = '';
    }
  }

  // toggle login/logout buttons and hero visibility safely
  if(user){
    btnLoginOpen?.classList.add('d-none');
    btnLogout?.classList.remove('d-none');
    heroSection?.classList.add('d-none');
  } else {
    btnLoginOpen?.classList.remove('d-none');
    btnLogout?.classList.add('d-none');
    heroSection?.classList.remove('d-none');
  }
  const logoEl = document.getElementById('site-logo');
  const stored = localStorage.getItem(LOGO_KEY);
  if(logoEl){ if(stored) logoEl.src = stored; else logoEl.src = logoEl.getAttribute('data-default') || logoEl.src; }
  if(notifyBadge) notifyBadge.textContent = String(Math.floor(Math.random()*3));
}

// Auth page renderer: wires login/register to backend
function renderAuthPage(){
  try{
    const page = document.getElementById('auth'); if(!page) return;
    // Elements
    const loginFormEl = document.getElementById('login-form');
    const loginUserEl = document.getElementById('auth-username');
    const loginPassEl = document.getElementById('auth-password');
    const regToggleBtn = document.getElementById('btn-register');
    const regFormEl = document.getElementById('register-form');
    const regUserEl = document.getElementById('reg-username');
    const regPassEl = document.getElementById('reg-password');
    const regBirthEl = document.getElementById('reg-birth');
    const regCancelBtn = document.getElementById('btn-register-cancel');

    // Bind once
    if(loginFormEl && !loginFormEl.__bound){
      loginFormEl.__bound = true;
      loginFormEl.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const username = (loginUserEl?.value || '').trim();
        const password = loginPassEl?.value || '';
        if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
        try{
          showSpinner(true);
          const res = await authApi.login({ username, password });
          const token = res?.token; const user = res?.user || { name: username };
          if(!token){ throw new Error('토큰 없음'); }
          localStorage.setItem('auth_token', token);
          setCurrentUser({ name: user.username || user.name || username, loggedAt: Date.now() });
          showToast('로그인 성공', 'success');
          renderAuth();
          history.pushState({}, '', '#dashboard');
          await showView('dashboard');
        }catch(err){ console.error('login failed', err); showToast('로그인 실패', 'danger'); }
        finally{ showSpinner(false); }
      });
    }

    if(regToggleBtn && !regToggleBtn.__bound){
      regToggleBtn.__bound = true;
      regToggleBtn.addEventListener('click', ()=>{
          if(regFormEl){ regFormEl.classList.toggle('d-none'); }
      });
    }

    if(regFormEl && !regFormEl.__bound){
      regFormEl.__bound = true;
      regFormEl.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const username = (regUserEl?.value || '').trim();
        const password = regPassEl?.value || '';
        const birthDate = regBirthEl?.value || '';
        if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
        try{
          showSpinner(true);
          await authApi.register({ username, password, birthDate });
          showToast('회원가입 완료. 로그인해주세요.', 'success');
          // switch back to login box
          regFormEl && regFormEl.classList.add('d-none');
        }catch(err){ console.error('register failed', err); showToast('회원가입 실패', 'danger'); }
        finally{ showSpinner(false); }
      });
    }

    if(regCancelBtn && !regCancelBtn.__bound){
      regCancelBtn.__bound = true;
      regCancelBtn.addEventListener('click', ()=>{ regFormEl && regFormEl.classList.add('d-none'); });
    }

  }catch(e){ console.error('renderAuthPage failed', e); }
}

btnLoginOpen?.addEventListener('click', ()=> loginModal?.show());
btnLogout?.addEventListener('click', ()=>{ setCurrentUser(null); renderAuth(); });
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = (loginUserInput?.value || '').trim();
  const password = loginPassInput?.value || '';
  if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
  try{
    showSpinner(true);
    const res = await authApi.login({ username, password });
    const token = res?.token; const user = res?.user || { username };
    if(!token) throw new Error('토큰 없음');
    localStorage.setItem('auth_token', token);
    setCurrentUser({ name: user.username || username, loggedAt: Date.now() });
    showToast('로그인 성공', 'success');
    loginModal?.hide();
    renderAuth();
    history.pushState({}, '', '#dashboard');
    await showView('dashboard');
  }catch(err){ console.error('login failed', err); showToast('로그인 실패', 'danger'); }
  finally{ showSpinner(false); }
});

registerForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = (regUserInput?.value || '').trim();
  const password = regPassInput?.value || '';
  const birthDate = regBirthInput?.value || '';
  if(!username || !password){ showToast('아이디/비밀번호를 입력하세요', 'danger'); return; }
  try{
    showSpinner(true);
    await authApi.register({ username, password, birthDate });
    showToast('회원가입 완료. 로그인해주세요.', 'success');
    registerModal?.hide();
    loginModal?.show();
  }catch(err){ console.error('register failed', err); showToast('회원가입 실패', 'danger'); }
  finally{ showSpinner(false); }
});

modalOpenRegisterBtn?.addEventListener('click', ()=>{ loginModal?.hide(); registerModal?.show(); });
modalOpenLoginBtn?.addEventListener('click', ()=>{ registerModal?.hide(); loginModal?.show(); });

function renderTable(rows=null){
  const data = rows || store.all();
  const term = (searchInput?.value || '').trim().toLowerCase();
  const visible = term ? data.filter(r => [r.name, r.location, r.notes, r.risk_level].some(v=>String(v||'').toLowerCase().includes(term))) : data;
  tableBody.innerHTML = '';
  visible.forEach((r,i)=>{
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
  countEl.textContent = visible.length;
  const countHero = document.getElementById('record-count-hero'); if(countHero) countHero.textContent = visible.length;
}

/* --- Videos renderer + upload/edit/delete helpers --- */
function loadVideosFromStorage(){
  try{ const raw = localStorage.getItem(VIDEOS_KEY); if(!raw) return []; return JSON.parse(raw); }catch(e){ return []; }
}
function saveVideosToStorage(arr){ try{ localStorage.setItem(VIDEOS_KEY, JSON.stringify(arr)); }catch(e){ console.error('saveVideos failed', e); } }
function humanSize(bytes){ if(!bytes) return '0 B'; const thresh = 1024; if(bytes < thresh) return bytes+' B'; const units=['KB','MB','GB','TB']; let u=-1; do{ bytes/=thresh; u++; } while(bytes>=thresh && u<units.length-1); return bytes.toFixed(1)+' '+units[u]; }

function openUploadModal(video){
  const modalEl = document.getElementById('uploadVideoModal');
  const bs = new bootstrap.Modal(modalEl);
  document.getElementById('upload-video-id').value = video?.id || '';
  document.getElementById('upload-video-title').value = video?.name || '';
  document.getElementById('upload-video-desc').value = video?.desc || '';
  document.getElementById('upload-video-file').value = '';
  // show delete button only for existing
  const delBtn = document.getElementById('btn-delete-video'); if(video){ delBtn.classList.remove('d-none'); } else { delBtn.classList.add('d-none'); }
  bs.show();
}

async function addOrUpdateVideoFromForm(){
  const id = document.getElementById('upload-video-id').value || null;
  const title = (document.getElementById('upload-video-title').value||'').trim();
  const desc = (document.getElementById('upload-video-desc').value||'').trim();
  const fileInput = document.getElementById('upload-video-file');
  const file = fileInput && fileInput.files && fileInput.files[0];
  const videos = loadVideosFromStorage();
  if(id){
    // update metadata only
    const idx = videos.findIndex(v=>v.id===id);
    if(idx!==-1){ videos[idx].name = title || videos[idx].name; videos[idx].desc = desc; videos[idx].updated = Date.now(); saveVideosToStorage(videos); renderVideos(); }
    return true;
  }
  if(!file){ alert('Please select a video file to upload'); return false; }
  // read file as data URL
  const reader = new FileReader();
  return new Promise((resolve,reject)=>{
    reader.onload = function(e){
      try{
        const dataUrl = e.target.result;
        const nowIso = new Date().toISOString();
        const obj = { id: Math.random().toString(36).slice(2,9), name: title || file.name, size: file.size, sizeText: humanSize(file.size), src: dataUrl, uploadDate: nowIso, desc };
        videos.unshift(obj); saveVideosToStorage(videos); renderVideos(); const bs = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal')); bs && bs.hide(); resolve(true);
        // Try to persist metadata to backend DB (best-effort)
        api.saveVideoMeta({ name: obj.name, size: obj.size, url: obj.src, uploaded_at: nowIso }).catch(()=>{});
      }catch(er){ console.error('file read error', er); reject(er); }
    };
    reader.onerror = function(err){ console.error('file read error', err); reject(err); };
    reader.readAsDataURL(file);
  });
}

function deleteVideoById(id){ if(!confirm('Are you sure you want to delete this video?')) return; const videos = loadVideosFromStorage(); const idx = videos.findIndex(v=>v.id===id); if(idx===-1) return; videos.splice(idx,1); saveVideosToStorage(videos); renderVideos(); }

function renderVideos(){
  try{
    const container = document.getElementById('videos-list'); if(!container) return;
    const vids = loadVideosFromStorage();
    container.innerHTML = '';
  if(vids.length===0){ container.innerHTML = '<div class="col-12 text-center text-muted p-4">No uploaded videos.</div>'; return; }
    vids.forEach(v=>{
      const col = document.createElement('div'); col.className='col-md-4';
      const card = document.createElement('div'); card.className='card h-100';
      card.innerHTML = `
        <div class="ratio ratio-16x9">
          <video muted playsinline preload="metadata" src="${v.src}" style="width:100%;height:100%;object-fit:cover"></video>
        </div>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${escapeHtml(v.name)}</h6>
          <div class="text-muted small mb-2">${escapeHtml(v.sizeText || humanSize(v.size))} • ${new Date(v.uploadDate).toLocaleString()}</div>
            <div class="mt-auto d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary btn-edit-video" data-id="${v.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger btn-del-video" data-id="${v.id}">Delete</button>
            <button class="btn btn-sm btn-primary ms-auto btn-play-video" data-src="${v.src}">Play</button>
          </div>
        </div>
      `;
      col.appendChild(card); container.appendChild(col);
    });

    // wire buttons
    container.querySelectorAll('.btn-edit-video').forEach(b=> b.addEventListener('click', (e)=>{ const id = b.dataset.id; const vids = loadVideosFromStorage(); const v = vids.find(x=>x.id===id); if(v) openUploadModal(v); }));
    container.querySelectorAll('.btn-del-video').forEach(b=> b.addEventListener('click', (e)=>{ const id = b.dataset.id; deleteVideoById(id); }));
    container.querySelectorAll('.btn-play-video').forEach(b=> b.addEventListener('click', (e)=>{ const src = b.dataset.src; const player = document.getElementById('video-player'); if(player){ player.src = src; const vm = new bootstrap.Modal(document.getElementById('videoModal')); vm.show(); } }));
  }catch(e){ console.error('renderVideos failed', e); }
}

// hook upload modal buttons after fragment load
document.addEventListener('page-loaded', (ev)=>{
  try{
    if(ev?.detail?.id !== 'videos') return;
    document.getElementById('btn-open-upload')?.addEventListener('click', ()=> openUploadModal(null));
    document.getElementById('btn-save-video')?.addEventListener('click', async ()=> { await addOrUpdateVideoFromForm(); const bs = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal')); bs && bs.hide(); });
    document.getElementById('btn-delete-video')?.addEventListener('click', ()=>{ const id = document.getElementById('upload-video-id').value; if(id) deleteVideoById(id); const bs = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal')); bs && bs.hide(); });
    // initial render
    renderVideos();
  }catch(e){ console.error('videos page-loaded handler failed', e); }
});

/* --- Detections renderer + helpers --- */
function saveDetectionsToStorage(arr){ try{ localStorage.setItem(DETECTIONS_KEY, JSON.stringify(arr)); }catch(e){ console.error('saveDetections failed', e); } }

// --- Contact submissions storage (falls-contacts-v1) ---
const CONTACTS_KEY = 'falls-contacts-v1';
function loadContactsFromStorage(){ try{ const raw = localStorage.getItem(CONTACTS_KEY); if(!raw) return []; return JSON.parse(raw); }catch(e){ console.error('loadContactsFromStorage failed', e); return []; } }
function saveContactsToStorage(arr){ try{ localStorage.setItem(CONTACTS_KEY, JSON.stringify(arr)); }catch(e){ console.error('saveContactsToStorage failed', e); } }

function renderContact(){
  try{
    const el = document.getElementById('contact-submissions-count');
    if(el){ el.textContent = String(loadContactsFromStorage().length); }
  }catch(e){ console.error('renderContact failed', e); }
}

function renderDetectionsChart(detections){
  try{
    const canvas = document.getElementById('detections-trend-chart'); if(!canvas || typeof Chart === 'undefined') return;
    // bucket by day
    const counts = {};
    const now = new Date();
    const days = 30; // show 30 days
    const labels = [];
    for(let i=days-1;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const k = d.toISOString().slice(0,10); labels.push(k); counts[k]=0; }
    detections.forEach(d=>{ if(d.hidden) return; const t = parseTimeString(d.time); const k = t? t.toISOString().slice(0,10) : null; if(k && counts[k]!==undefined) counts[k]++; });
    const data = labels.map(l=>counts[l]||0);
    // chart reuse
    if(window.__detectionsChart){ window.__detectionsChart.data.labels = labels; window.__detectionsChart.data.datasets[0].data = data; window.__detectionsChart.update(); return; }
    const ctx = canvas.getContext('2d');
    window.__detectionsChart = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Detections', data, borderColor:'rgba(13,110,253,0.9)', backgroundColor:'rgba(13,110,253,0.12)', fill:true }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } } });
  }catch(e){ console.error('renderDetectionsChart failed', e); }
}

function renderDetections(){
  try{
    const table = document.querySelector('#detections-table tbody'); if(!table) return;
    const all = getDetections() || [];
    // apply filters
    const periodDays = Number(document.getElementById('det-filter-period')?.value || 7);
    const resultFilter = document.getElementById('det-filter-result')?.value || 'all';
    const minConf = parseFloat(document.getElementById('det-filter-minconf')?.value || 0);
    const maxConf = parseFloat(document.getElementById('det-filter-maxconf')?.value || 1);
    const tag = document.getElementById('det-filter-tag')?.value || '';
    const now = new Date(); const cutoff = periodDays>0 ? new Date(now.getTime() - (periodDays*24*60*60*1000)) : null;
    let rows = all.filter(d=> !d.hidden);
    rows = rows.filter(d=> { const t = parseTimeString(d.time); if(cutoff && t && t < cutoff) return false; return true; });
    rows = rows.filter(d=> { const conf = typeof d.score==='number' ? d.score : (d.confidence||0); if(conf < minConf || conf > maxConf) return false; if(resultFilter==='fall') return String(d.type||'').toLowerCase().includes('낙') || d.fall===true || String(d.type||'').toLowerCase().includes('fall'); if(resultFilter==='no-fall') return !(String(d.type||'').toLowerCase().includes('낙') || d.fall===true || String(d.type||'').toLowerCase().includes('fall')); return true; });
    if(tag) rows = rows.filter(d=> (d.tags||[]).includes(tag));
    // sort by time desc
    rows.sort((a,b)=>{ const ta=parseTimeString(a.time)||0; const tb=parseTimeString(b.time)||0; return tb-ta; });
    table.innerHTML = '';
    rows.forEach(d=>{
      const tr = document.createElement('tr');
      const isFall = (String(d.type||'').toLowerCase().includes('suspected') || d.fall===true || String(d.type||'').toLowerCase().includes('fall'));
      tr.innerHTML = `
        <td>${escapeHtml(d.id||'')}</td>
        <td>${escapeHtml(d.video||d.videoId||'')}</td>
        <td>${isFall? '<span class="badge bg-danger">Fall</span>' : '<span class="badge bg-secondary">No-fall</span>'}</td>
        <td>${(Math.round((d.score||d.confidence||0)*100)/100).toFixed(2)}</td>
        <td>${escapeHtml(d.frame||'')}</td>
        <td>${escapeHtml(d.time||'')}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary btn-det-view" data-id="${escapeHtml(d.id||'')}">View</button>
            <button class="btn btn-sm btn-outline-secondary btn-det-edit" data-id="${escapeHtml(d.id||'')}">Memo</button>
            <button class="btn btn-sm btn-outline-danger btn-det-del" data-id="${escapeHtml(d.id||'')}">Delete</button>
          </div>
        </td>
      `;
      table.appendChild(tr);
    });

    // wire buttons
    table.querySelectorAll('.btn-det-view').forEach(b=> b.addEventListener('click', ()=> openDetectionModal(b.dataset.id)));
    table.querySelectorAll('.btn-det-edit').forEach(b=> b.addEventListener('click', ()=> openDetectionModal(b.dataset.id)));
    table.querySelectorAll('.btn-det-del').forEach(b=> b.addEventListener('click', ()=>{ const id=b.dataset.id; if(confirm('이 탐지를 삭제하시겠습니까?')){ const arr = getDetections(); const i = arr.findIndex(x=>x.id===id); if(i>-1){ arr.splice(i,1); saveDetectionsToStorage(arr); renderDetections(); } } }));

    // populate tag filter options
    try{ const tagSel = document.getElementById('det-filter-tag'); if(tagSel){ const allTags = new Set(); const vids = getVideos(); vids.forEach(v=> (v.tags||[]).forEach(t=>allTags.add(t))); const existing = Array.from(tagSel.querySelectorAll('option')).map(o=>o.value); tagSel.innerHTML = '<option value="">All</option>'; Array.from(allTags).forEach(t=>{ const opt = document.createElement('option'); opt.value=t; opt.textContent=t; tagSel.appendChild(opt); }); } }catch(e){}

    // render chart
    renderDetectionsChart(all);
  }catch(e){ console.error('renderDetections failed', e); }
}

function openDetectionModal(id){
  try{
    const arr = getDetections(); const d = arr.find(x=>x.id===id); if(!d) return;
    document.getElementById('det-modal-id').value = d.id || '';
    document.getElementById('det-analysis-details').value = d.analysis_details || '';
    const featEl = document.getElementById('det-related-features'); featEl.innerHTML = '';
    // show up to 5 related features if present
    const related = d.related_features || [];
    if(related.length===0){ featEl.innerHTML = '<div class="text-muted">No related features available.</div>'; }
    else{ related.slice(0,5).forEach(fid=>{ const f = SAMPLE_FEATURES.find(x=>x.id===fid); const el = document.createElement('div'); el.className='badge bg-light text-dark me-1 mb-1'; el.textContent = f? f.title : fid; featEl.appendChild(el); }); }
    const bs = new bootstrap.Modal(document.getElementById('detectionDetailModal')); bs.show();
  }catch(e){ console.error('openDetectionModal failed', e); }
}

// modal actions
document.addEventListener('page-loaded', (ev)=>{
  try{
    if(ev?.detail?.id !== 'detections') return;
    document.getElementById('det-filter-apply')?.addEventListener('click', ()=> renderDetections());
    document.getElementById('btn-save-detection')?.addEventListener('click', ()=>{
      const id = document.getElementById('det-modal-id').value; const text = document.getElementById('det-analysis-details').value; const arr = getDetections(); const idx = arr.findIndex(x=>x.id===id); if(idx>-1){ arr[idx].analysis_details = text; arr[idx].updated = Date.now(); saveDetectionsToStorage(arr); renderDetections(); }
      const bs = bootstrap.Modal.getInstance(document.getElementById('detectionDetailModal')); bs && bs.hide();
    });
    document.getElementById('btn-hide-detection')?.addEventListener('click', ()=>{
      const id = document.getElementById('det-modal-id').value; const arr = getDetections(); const idx = arr.findIndex(x=>x.id===id); if(idx>-1){ arr[idx].hidden = true; saveDetectionsToStorage(arr); renderDetections(); }
      const bs = bootstrap.Modal.getInstance(document.getElementById('detectionDetailModal')); bs && bs.hide();
    });
    document.getElementById('btn-delete-detection')?.addEventListener('click', ()=>{
      const id = document.getElementById('det-modal-id').value; if(!confirm('Are you sure you want to delete this detection?')) return; const arr = getDetections(); const idx = arr.findIndex(x=>x.id===id); if(idx>-1){ arr.splice(idx,1); saveDetectionsToStorage(arr); renderDetections(); }
      const bs = bootstrap.Modal.getInstance(document.getElementById('detectionDetailModal')); bs && bs.hide();
    });
    // initial render
    renderDetections();
  }catch(e){ console.error('detections page-loaded handler failed', e); }
});

/* --- Dashboard renderer + helpers --- */
function formatDate(d){ if(!d) return '—'; const dt = new Date(d); if(isNaN(dt)) return d; return dt.toLocaleString(); }
function parseTimeString(s){ // tries to parse 'YYYY-MM-DD HH:MM' or ISO
  const t = s && s.replace(/\./g,'-'); const parsed = new Date(t); return isNaN(parsed) ? null : parsed;
}

function safeNum(n){ return typeof n==='number' && !isNaN(n) ? n : 0; }

function renderDashboard(){
  try{
    // reset retry counter on successful start
    renderDashboard.__dashboard_render_retries = 0;
    console.debug('[dashboard] renderDashboard called');
  // data sources (prefer persisted store, fallback to samples)
  const videos = getVideos();
  const dets = getDetections();
  console.debug('[dashboard] data lengths', { videos: videos.length, detections: dets.length });

    // quick element presence checks to help diagnose missing DOM
    const requiredIds = ['kpi-total-videos','kpi-week-falls','kpi-fall-ratio','kpi-unreviewed','recent-falls','recent-videos'];
    const missing = requiredIds.filter(id=> !document.getElementById(id));
    const info = { videos: videos.length, detections: dets.length, missing };
    updateDevDebug(info);
    if(missing.length){
      // race condition: fragment may not yet be in DOM. Retry a few times before giving up.
      console.warn('[dashboard] missing DOM elements (will retry):', missing);
      const retryKey = '__dashboard_render_retries';
      const maxRetries = 6;
      // store retry count on the function object (safe in this single-page app)
      renderDashboard[retryKey] = (renderDashboard[retryKey] || 0) + 1;
      if(renderDashboard[retryKey] <= maxRetries){
        setTimeout(()=>{
          try{ renderDashboard(); }catch(e){ console.error('retry renderDashboard failed', e); }
        }, 120);
        return;
      }
      // exhausted retries: show error to user
      console.error('[dashboard] required DOM elements still missing after retries:', missing);
      const errEl = document.getElementById('dashboard-error');
      if(errEl){ errEl.classList.remove('d-none'); errEl.textContent = 'Dashboard 요소가 일부 누락되었습니다. 새로고침하거나 콘솔을 확인하세요.'; }
      // reset retry counter for future attempts
      renderDashboard[retryKey] = 0;
      return;
    }

    // KPI: total uploaded videos
    const totalVideos = videos.length;
    document.getElementById('kpi-total-videos').textContent = String(totalVideos);

    // KPI: this week's falls
    const period = document.getElementById('dash-filter-period')?.value || 'week';
    const now = new Date();
    const weekAgo = new Date(); weekAgo.setDate(now.getDate()-7);
    const monthAgo = new Date(); monthAgo.setMonth(now.getMonth()-1);
    const cutoff = period==='month' ? monthAgo : weekAgo;

    const fallDetections = dets.filter(d => {
      const t = parseTimeString(d.time);
      const isFall = (String(d.type||'').toLowerCase().includes('낙') || d.fall===true || String(d.type||'').toLowerCase().includes('fall'));
      if(!isFall) return false;
      if(!t) return true;
      return t >= cutoff;
    });
    const fallCount = fallDetections.length;
    const totalDetsPeriod = dets.filter(d=>{ const t=parseTimeString(d.time); return !t || t>=cutoff; }).length || dets.length;
    const fallRatio = totalDetsPeriod? (fallCount/totalDetsPeriod):0;
    document.getElementById('kpi-week-falls').textContent = String(fallCount);
    document.getElementById('kpi-fall-ratio').textContent = (fallRatio>0? (Math.round(fallRatio*1000)/10 + '%') : '0%');

    // KPI: unreviewed
    const unreviewed = dets.filter(d=> d.status===undefined ? false : d.status==='new').length;
    document.getElementById('kpi-unreviewed').textContent = String(unreviewed);

    // Recent falls list (latest 5 by time)
    const recentFallsContainer = document.getElementById('recent-falls');
    const recentFallsEmpty = document.getElementById('recent-falls-empty');
    recentFallsContainer.innerHTML = '';
    const sortedFalls = dets.filter(d=> (String(d.type||'').toLowerCase().includes('낙') || d.fall===true || String(d.type||'').toLowerCase().includes('fall')) ).sort((a,b)=>{ const ta=parseTimeString(a.time)||0; const tb=parseTimeString(b.time)||0; return tb-ta; }).slice(0,5);
    if(sortedFalls.length===0){ recentFallsEmpty.classList.remove('d-none'); recentFallsContainer.classList.add('d-none'); }
    else{ recentFallsEmpty.classList.add('d-none'); recentFallsContainer.classList.remove('d-none'); sortedFalls.forEach(d=>{ const li = document.createElement('div'); li.className='list-group-item d-flex justify-content-between align-items-center'; li.innerHTML = `<div><div><strong>${escapeHtml(d.video||d.videoId||'–')}</strong> <small class="text-muted">${escapeHtml(d.time||'')}</small></div><div class="small text-muted">Confidence: ${Math.round((d.score||d.confidence||0)*100)/100} Frame: ${escapeHtml(d.frame||'–')}</div></div><div><button class="btn btn-sm btn-link dash-open-detection" data-id="${escapeHtml(d.id||'')}">View</button></div>`; recentFallsContainer.appendChild(li); }); }

  // Recent videos list (latest 5)
    const recentVideosContainer = document.getElementById('recent-videos');
    const recentVideosEmpty = document.getElementById('recent-videos-empty');
    recentVideosContainer.innerHTML = '';
    const recentVideos = videos.slice().reverse().slice(0,5); // assume array order oldest->newest so reverse
    if(recentVideos.length===0){ recentVideosEmpty.classList.remove('d-none'); recentVideosContainer.classList.add('d-none'); }
    else{ recentVideosEmpty.classList.add('d-none'); recentVideosContainer.classList.remove('d-none'); recentVideos.forEach(v=>{ const tags = (v.tags||[]).map(t=>`<span class="badge bg-light text-dark me-1">${escapeHtml(t)}</span>`).join(' '); const li = document.createElement('div'); li.className = 'list-group-item'; li.innerHTML = `<div class="d-flex justify-content-between align-items-start"><div><div><strong>${escapeHtml(v.name||v.id||'–')}</strong></div><div class="small text-muted">Uploaded: ${escapeHtml(v.uploadDate||v.uploaded||'–')}</div><div class="mt-1">${tags}</div></div><div class="text-end"><button class="btn btn-sm btn-outline-primary dash-open-video" data-id="${escapeHtml(v.id||'')}">Watch</button></div></div>`; recentVideosContainer.appendChild(li); }); }

    // populate tag filter
    const tagSelect = document.getElementById('dash-filter-tag'); if(tagSelect){ const allTags = new Set(); videos.forEach(v=> (v.tags||[]).forEach(t=>allTags.add(t))); const existing = Array.from(tagSelect.querySelectorAll('option')).map(o=>o.value); tagSelect.innerHTML = '<option value="">All</option>'; Array.from(allTags).forEach(t=>{ const opt = document.createElement('option'); opt.value = t; opt.textContent = t; tagSelect.appendChild(opt); }); }

    // user filter (demo: show current user only)
    const userSelect = document.getElementById('dash-filter-user'); if(userSelect){ userSelect.innerHTML = '<option value="all">All</option>'; const user = getCurrentUser(); if(user) { const o = document.createElement('option'); o.value = user.name; o.textContent = user.name; userSelect.appendChild(o); userSelect.value = user.name; } }

    // wire buttons
    document.getElementById('dash-btn-videos')?.addEventListener('click', ()=>{ history.pushState({},'', '#videos'); showView('videos'); });
    document.getElementById('dash-btn-detections')?.addEventListener('click', ()=>{ history.pushState({},'', '#detections'); showView('detections'); });
    document.getElementById('dash-btn-settings')?.addEventListener('click', ()=>{ history.pushState({},'', '#settings'); showView('settings'); });

    // wiring for quick open from lists
    document.querySelectorAll('.dash-open-video').forEach(b=> b.addEventListener('click', (e)=>{ const id = b.dataset.id; // find video and open modal
      const vid = getVideos().find(x=>x.id===id); if(vid){ const player = document.getElementById('video-player'); if(player){ player.src = vid.src || ''; const vm = new bootstrap.Modal(document.getElementById('videoModal')); vm.show(); } }
    }));
    document.querySelectorAll('.dash-open-detection').forEach(b=> b.addEventListener('click', (e)=>{ /* open detection detail - navigate to detections view */ history.pushState({},'', '#detections'); showView('detections'); }));

  // render chart for last 7 days
  try{ renderFallsChart(dets); }catch(e){ console.error('chart render error', e); }

  // retry handler
  document.getElementById('dash-retry')?.addEventListener('click', ()=> renderDashboard());

    // Update DB KPIs from backend (best-effort)
    (async()=>{
      try{
        const [dbVideos, dbDets] = await Promise.all([
          api.listVideos().catch(()=>[]),
          api.listDetections().catch(()=>[])
        ]);
        const vEl = document.getElementById('kpi-db-videos'); if(vEl) vEl.textContent = String(Array.isArray(dbVideos)? dbVideos.length: 0);
        const dEl = document.getElementById('kpi-db-detections'); if(dEl) dEl.textContent = String(Array.isArray(dbDets)? dbDets.length: 0);
      }catch(e){ /* ignore */ }
    })();

  }catch(err){ console.error('dashboard render error', err); document.getElementById('dashboard-error')?.classList.remove('d-none'); }
}


function badgeClass(level){ if(!level) return 'bg-secondary'; if(level==='high') return 'bg-danger'; if(level==='medium') return 'bg-warning text-dark'; return 'bg-success'; }
function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

btnAdd?.addEventListener('click', ()=> openModalFor());
function openModalFor(record=null){
  if(record){
    modalTitle.textContent = '레코드 수정';
    document.getElementById('record-id').value = record.id;
    document.getElementById('field-name').value = record.name || '';
    document.getElementById('field-age').value = record.age || '';
    document.getElementById('field-location').value = record.location || '';
    document.getElementById('field-risk').value = record.risk_level || 'low';
    document.getElementById('field-lastfall').value = record.last_fall || '';
    document.getElementById('field-notes').value = record.notes || '';
    btnDelete.classList.remove('d-none');
  } else {
    modalTitle.textContent = '레코드 추가'; recordForm.reset(); document.getElementById('record-id').value=''; btnDelete.classList.add('d-none');
  }
  recordModal.show();
}

btnSave?.addEventListener('click', ()=>{
  const id = document.getElementById('record-id').value;
  const payload = { name: document.getElementById('field-name').value.trim(), age: Number(document.getElementById('field-age').value||0), location: document.getElementById('field-location').value.trim(), risk_level: document.getElementById('field-risk').value, last_fall: document.getElementById('field-lastfall').value, notes: document.getElementById('field-notes').value.trim() };
  if(!payload.name){ alert('Please enter a name'); return; }
  if(id) store.update(id, payload); else store.insert(payload);
  recordModal.hide(); renderTable();
});

btnDelete?.addEventListener('click', ()=>{ const id = document.getElementById('record-id').value; if(!id) return; if(!confirm('이 레코드를 정말 삭제할까요?')) return; store.delete(id); recordModal.hide(); renderTable(); });

tableBody?.addEventListener('click', (e)=>{ const edit = e.target.closest('.btn-edit'); const del = e.target.closest('.btn-del'); if(edit){ const id = edit.dataset.id; const rec = store.all().find(r=>r.id===id); if(rec) openModalFor(rec); } else if(del){ const id = del.dataset.id; if(confirm('정말 삭제하시겠습니까?')){ store.delete(id); renderTable(); } } });

btnExport?.addEventListener('click', ()=>{ const data = JSON.stringify(store.all(), null, 2); const blob = new Blob([data], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'falls-data.json'; a.click(); URL.revokeObjectURL(url); });

btnImport?.addEventListener('click', ()=> fileInput?.click());
fileInput?.addEventListener('change', (ev)=>{ const f = ev.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = (e)=>{ try{ const json = JSON.parse(e.target.result); if(!Array.isArray(json)) throw new Error('JSON은 배열이어야 합니다'); json.forEach(item=>{ const rec = { id: item.id || undefined, name: item.name || '이름 없음', age: item.age || 0, location: item.location || '', risk_level: item.risk_level || 'low', last_fall: item.last_fall || '', notes: item.notes || '' }; if(rec.id && store.all().some(r=>r.id===rec.id)) store.update(rec.id, rec); else store.insert(rec); }); renderTable(); alert('가져오기 완료'); }catch(err){ alert('가져오기 실패: '+err.message); } }; reader.readAsText(f); });

function parseAndRun(command){ const text = (command||'').trim(); if(!text) return {ok:false, msg:'명령을 입력하세요'}; const tokens = text.split(/\s+/); const verb = tokens[0].toUpperCase(); try{ if(verb==='SELECT'){ const where = parseWhere(text); const rows = store.select(where); return {ok:true, rows}; } if(verb==='INSERT'){ const rest = text.slice(6).trim(); const obj = parseKeyValues(rest); const rec = store.insert(obj); return {ok:true, rows:[rec], msg:'삽입됨'} } if(verb==='UPDATE'){ const m = text.match(/SET\s+(.+?)\s+WHERE\s+(.+)$/i); if(!m) return {ok:false, msg:'UPDATE 문법: UPDATE SET key=val WHERE key=val'}; const changes = parseKeyValues(m[1]); const where = parseWhere('WHERE '+m[2]); const rows = store.select(where); rows.forEach(r=>store.update(r.id, changes)); return {ok:true, rows: store.select(where), msg:'업데이트 완료'} } if(verb==='DELETE'){ const where = parseWhere(text); const rows = store.select(where); rows.forEach(r=>store.delete(r.id)); return {ok:true, msg:`삭제됨: ${rows.length}건`} } return {ok:false, msg:'지원되지 않는 명령입니다'} }catch(e){ return {ok:false, msg:e.message} } }

function parseWhere(text){ const m = text.match(/WHERE\s+(.+)$/i); if(!m) return null; const cond = m[1].trim(); const parts = cond.split('AND').map(s=>s.trim()); const where = {}; parts.forEach(p=>{ const eq = p.indexOf('='); if(eq===-1) return; const k = p.slice(0,eq).trim(); let v = p.slice(eq+1).trim(); v = v.replace(/^['\"]|['\"]$/g,''); where[k]=v; }); return where; }
function parseKeyValues(text){ const pairs = text.split(',').map(s=>s.trim()).filter(Boolean); const obj = {}; pairs.forEach(p=>{ const eq = p.indexOf('='); if(eq===-1) return; const k = p.slice(0,eq).trim(); let v = p.slice(eq+1).trim(); v = v.replace(/^['\"]|['\"]$/g,''); if(!isNaN(v) && v!=='') v = Number(v); obj[k]=v; }); return obj; }

btnRunSql?.addEventListener('click', ()=>{ const cmd = sqlInput.value.trim(); const out = parseAndRun(cmd); if(out.ok){ if(out.rows) sqlResult.textContent = JSON.stringify(out.rows,null,2); else sqlResult.textContent = out.msg||'완료'; } else sqlResult.textContent = 'Error: '+out.msg; renderTable(); });
btnClearSql?.addEventListener('click', ()=>{ sqlInput.value=''; sqlResult.textContent='(결과가 여기에 표시됩니다)'; });

document.getElementById('hero-cta')?.addEventListener('click', ()=>{ const user = getCurrentUser(); if(!user) loginModal.show(); else document.getElementById('records-table').scrollIntoView({behavior:'smooth'}); });

const logoInput = document.getElementById('logo-input'); const btnUploadLogo = document.getElementById('btn-upload-logo'); const btnResetLogo = document.getElementById('btn-reset-logo');
btnUploadLogo?.addEventListener('click', ()=> logoInput?.click());
logoInput?.addEventListener('change',(ev)=>{ const f = ev.target.files && ev.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = (e)=>{ localStorage.setItem(LOGO_KEY, e.target.result); renderAuth(); alert('Logo uploaded'); }; reader.readAsDataURL(f); });
btnResetLogo?.addEventListener('click', ()=>{ if(confirm('Reset logo to default?')){ localStorage.removeItem(LOGO_KEY); renderAuth(); } });

globalSearch?.addEventListener('input', (e)=>{ const v = e.target.value || ''; if(searchInput) { searchInput.value = v; renderTable(); } });

btnNotify?.addEventListener('click', ()=>{ alert('미처리 탐지: ' + (notifyBadge ? notifyBadge.textContent : '0') + '건'); });

searchInput?.addEventListener('input', ()=> renderTable());

// ensure initial view is applied immediately (before potential fragment load)
try{ applyInitialView(); }catch(e){}
renderTable(); renderAuth();

window.__store = store;

// Splash screen helper: hide splash when app is ready
function hideSplash(){
  try{
    const s = document.getElementById('splash-screen');
    if(!s) return;
    s.classList.add('hidden');
    // remove from DOM after transition to avoid intercepting clicks
    setTimeout(()=> s.remove(), 350);
  }catch(e){}
}

// Hide splash after fragments loaded or after window load; fallback timeout
// Keep the splash visible a bit longer so it's noticeable to users.
// Hide after fragments-loaded (short delay) or window.load (slightly longer),
// with a longer fallback to avoid disappearing too quickly.
document.addEventListener('fragments-loaded', ()=> setTimeout(hideSplash, 800));
window.addEventListener('load', ()=> setTimeout(hideSplash, 1500));
// fallback: ensure splash is removed after 7s even if events didn't fire
setTimeout(hideSplash, 7000);