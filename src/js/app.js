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
const SETTINGS_KEY = 'falls-settings-v1';
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

function saveDetectionsToStorage(arr){
  try{
    localStorage.setItem(DETECTIONS_KEY, JSON.stringify(arr));
  }catch(err){
    console.error('saveDetectionsToStorage failed', err);
  }
}

function showSpinner(active){
  const el = document.getElementById('global-spinner');
  if(!el) return;
  if(active) el.classList.remove('d-none');
  else el.classList.add('d-none');
}

function showToast(message, variant='info'){
  const toastEl = document.getElementById('global-toast');
  const bodyEl = document.getElementById('global-toast-body');
  if(!toastEl || !bodyEl){
    alert(message);
    return;
  }
  bodyEl.textContent = message;
  const base = 'toast align-items-center border-0';
  const map = {
    success: 'text-bg-success',
    danger: 'text-bg-danger',
    warning: 'text-bg-warning text-dark',
    info: 'text-bg-primary',
    dark: 'text-bg-dark'
  };
  const variantClass = map[variant] || map.dark;
  toastEl.className = `${base} ${variantClass}`;
  bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

function getDefaultUserSettings(){
  return {
    frame_interval: 5,
    notification_enabled: true,
    default_policy: 'balanced',
    notification_channels: { web: true, pwa: false, email: false },
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
  }catch(e){
    console.error('loadUserSettings failed', e);
    return getDefaultUserSettings();
  }
}

function mapRemoteSettingsToLocal(remote){
  if(!remote || typeof remote !== 'object') return null;
  const mapped = {};
  if(typeof remote.frameInterval === 'number'){ mapped.frame_interval = remote.frameInterval; }
  else if(typeof remote.frame_interval === 'number'){ mapped.frame_interval = remote.frame_interval; }
  if(typeof remote.notificationOption === 'string'){ mapped.notification_option = remote.notificationOption; }
  else if(typeof remote.notification_option === 'string'){ mapped.notification_option = remote.notification_option; }
  if(typeof remote.notificationEnabled === 'boolean'){ mapped.notification_enabled = remote.notificationEnabled; }
  else if(typeof remote.notification_enabled === 'boolean'){ mapped.notification_enabled = remote.notification_enabled; }
  return Object.keys(mapped).length ? mapped : null;
}

async function refreshSettingsFromBackend(){
  const token = localStorage.getItem('auth_token');
  if(!token) return null;
  try{
    const remote = await api.getAnalysisSettings();
    const mapped = mapRemoteSettingsToLocal(remote);
    if(mapped){
      const merged = Object.assign({}, loadUserSettings(), mapped);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    }
  }catch(err){ console.warn('refreshSettingsFromBackend failed', err); }
  return null;
}

async function saveSettingsToBackend(state){
  const token = localStorage.getItem('auth_token');
  if(!token) throw new Error('not authenticated');
  const payload = {
    frameInterval: state.frame_interval,
    notificationOption: state.notification_option,
    notificationEnabled: !!state.notification_enabled
  };
  const remote = await api.saveAnalysisSettings(payload);
  const mapped = mapRemoteSettingsToLocal(remote);
  if(mapped){
    const merged = Object.assign({}, state, mapped);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  }
  return state;
}

function populateSettingsForm(state){
  if(!state) return;
  const fi = document.getElementById('setting-frame-interval'); if(fi){ fi.value = state.frame_interval ?? ''; }
  const notifOption = document.getElementById('setting-notification-option'); if(notifOption){ notifOption.value = state.notification_option || 'off'; }
}

function renderSettings(){
  try{
    const localSettings = loadUserSettings();
    const fi = document.getElementById('setting-frame-interval');
    const policy = document.getElementById('setting-default-policy');
    const chWeb = document.getElementById('setting-notify-web');
    const chPwa = document.getElementById('setting-notify-pwa');
    const chEmail = document.getElementById('setting-notify-email');
    const notifOption = document.getElementById('setting-notification-option');
    const saveBtn = document.getElementById('btn-save-analysis-settings');
    const statusEl = document.getElementById('settings-save-status');
    const deleteInput = document.getElementById('delete-account-confirm');
    const deleteBtn = document.getElementById('btn-delete-account');

    populateSettingsForm(localSettings);
    if(policy){ policy.value = localSettings.default_policy || 'balanced'; }
    if(chWeb){ chWeb.checked = !!(localSettings.notification_channels && localSettings.notification_channels.web); }
    if(chPwa){ chPwa.checked = !!(localSettings.notification_channels && localSettings.notification_channels.pwa); }
    if(chEmail){ chEmail.checked = !!(localSettings.notification_channels && localSettings.notification_channels.email); }
    if(notifOption && !notifOption.value){ notifOption.value = localSettings.notification_option || 'on_high'; }
    if(statusEl) statusEl.textContent = 'Loaded: ' + new Date().toLocaleTimeString();

    refreshSettingsFromBackend().then(remote => {
      if(remote){
        populateSettingsForm(remote);
        if(statusEl) statusEl.textContent = 'Synced: ' + new Date().toLocaleTimeString();
      }
    });

    if(renderSettings.__bound) return;
    renderSettings.__bound = true;

    if(fi){ fi.addEventListener('change', ()=>{
      const v = Number(fi.value||0);
      if(!v || v<=0){ fi.classList.add('is-invalid'); showToast('Frame interval must be an integer >= 1', 'danger'); return; }
      fi.classList.remove('is-invalid');
    }); }

    if(saveBtn){
      const defaultLabel = saveBtn.textContent;
      saveBtn.addEventListener('click', async ()=>{
        const token = localStorage.getItem('auth_token');
        if(!token){ showToast('로그인 후 이용해주세요.', 'danger'); return; }
        const frameValue = Number(fi?.value || 0);
        if(!Number.isFinite(frameValue) || frameValue <= 0){ fi?.classList.add('is-invalid'); showToast('Frame interval must be an integer >= 1', 'danger'); return; }
        fi?.classList.remove('is-invalid');
        const optionVal = notifOption?.value || 'off';
        const pending = Object.assign({}, loadUserSettings(), {
          frame_interval: Math.max(1, Math.floor(frameValue)),
          notification_option: optionVal,
          notification_enabled: optionVal !== 'off'
        });
        saveUserSettings(pending, { silent: true });
        try{
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
          const saved = await saveSettingsToBackend(pending);
          populateSettingsForm(saved);
          if(statusEl) statusEl.textContent = 'Saved to server: ' + new Date().toLocaleTimeString();
          showToast('설정이 서버에 저장되었습니다.', 'success');
        }catch(err){
          console.error('saveSettingsToBackend failed', err);
          showToast('설정 저장 실패', 'danger');
        }finally{
          saveBtn.disabled = false;
          saveBtn.textContent = defaultLabel;
        }
      });
    }

    if(deleteBtn){
      const defaultLabel = deleteBtn.textContent;
      deleteBtn.addEventListener('click', async ()=>{
        const confirmation = (deleteInput?.value || '').trim().toLowerCase();
        if(confirmation !== '탈퇴'){
          deleteInput?.classList.add('is-invalid');
          showToast('탈퇴라고 입력해 주세요.', 'warning');
          deleteInput?.focus();
          return;
        }
        deleteInput?.classList.remove('is-invalid');
        if(!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        try{
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Processing...';
          try{ await api.deleteAccount(); }
          catch(apiErr){
            const status = Number(apiErr?.message);
            if(status === 401){
              showToast('로그인이 만료되었습니다. 다시 로그인해주세요.', 'warning');
              deleteBtn.disabled = false;
              deleteBtn.textContent = defaultLabel;
              return;
            }
            throw apiErr;
          }
          localStorage.removeItem('auth_token');
          localStorage.removeItem(SETTINGS_KEY);
          setCurrentUser(null);
          if(deleteInput) deleteInput.value = '';
          showToast('회원탈퇴가 완료되었습니다.', 'success');
          history.pushState({}, '', '#hero');
          await showView('hero');
          renderAuth();
        }catch(err){
          console.error('delete account failed', err);
          showToast('회원탈퇴에 실패했습니다.', 'danger');
        }finally{
          deleteBtn.disabled = false;
          deleteBtn.textContent = defaultLabel;
        }
      });
    }

  }catch(e){ console.error('renderSettings failed', e); }
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
let navUser = document.getElementById('nav-user');
const heroSection = document.getElementById('hero-section');

// View manager: show/hide main sections so the site behaves like a homepage with navigable views
const VIEW_IDS = ['hero','features','showcase','data-management','team','contact','search','videos','detections','tags','settings','auth'];
const PAGE_FRAGMENTS = new Set(['search','videos','detections','features','tags','settings','contact','auth']);
async function showView(id){
  // lazy-load page fragment if requested view is one of the pages and not yet in DOM
  if(PAGE_FRAGMENTS.has(id) && !document.getElementById(id)){
    try{ await loadPage(id); }catch(e){ console.error('Failed to load page fragment', e);
      // if loading failed, inject a minimal fallback section to avoid missing DOM elements
      try{
        const container = document.getElementById('pages-container');
        if(container && !document.getElementById(id)){
          const fallback = document.createElement('section');
          fallback.id = id;
          fallback.className = 'py-4';
          fallback.innerHTML = `<div class="alert alert-danger">Failed to load ${id} content. Try refresh.</div>`;
          container.appendChild(fallback);
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
    if(id==='search') renderVideoSearch();
    if(id==='videos') renderVideos();
    if(id==='detections') renderDetections();
    if(id==='settings') renderSettings();
    if(id==='features') renderFeatures();
    if(id==='data-management') renderTable();
    if(id==='tags') renderTags();
    if(id==='contact') renderContact();
    if(id==='auth') renderAuthPage();
  }catch(e){ console.error('view render error', e); }
}

function resolveViewFromHash(){
  const hash = (window.location.hash||'').replace('#','');
  return (hash && VIEW_IDS.includes(hash)) ? hash : 'hero';
}

async function applyInitialView(){ await showView(resolveViewFromHash()); }

window.addEventListener('hashchange', ()=>{
  try{ showView(resolveViewFromHash()); }
  catch(e){ console.error('hashchange navigation failed', e); }
});

function onFragmentsLoaded(){
  console.debug('[app] fragments-loaded received, binding header/sidebar controls');
  globalSearch = document.getElementById('global-search');
  notifyBadge = document.getElementById('notify-badge');
  btnNotify = document.getElementById('btn-notify');
  navUser = document.getElementById('nav-user');

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
  bindAuthControls();
  renderAuth();
}

function saveUserSettings(obj, options={}){
  try{
    const silent = !!options.silent;
    // validate
    const n = Number(obj.frame_interval || 0);
    if(!Number.isFinite(n) || n <= 0){ showToast('frame_interval must be an integer >= 1', 'danger'); return false; }
    obj.frame_interval = Math.max(1, Math.floor(n));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
    const statusEl = document.getElementById('settings-save-status'); if(statusEl) statusEl.textContent = `Saved: ${new Date().toLocaleTimeString()}`;
    if(!silent){ showToast('Settings saved', 'success'); }
    return true;
  }catch(e){ console.error('saveUserSettings failed', e); showToast('Failed to save settings', 'danger'); return false; }
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
          try{ await syncRemoteData(); }catch(e){ console.warn('post-login sync failed', e); }
          history.pushState({}, '', '#data-management');
          await showView('data-management');
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

function bindAuthControls(){
  if(btnLoginOpen){
    btnLoginOpen.onclick = ()=> loginModal?.show();
  }
  if(btnLogout){
    btnLogout.onclick = ()=>{ setCurrentUser(null); renderAuth(); };
  }
  if(modalOpenRegisterBtn && !modalOpenRegisterBtn.__bound){
    modalOpenRegisterBtn.__bound = true;
    modalOpenRegisterBtn.addEventListener('click', ()=>{ loginModal?.hide(); registerModal?.show(); });
  }
  if(modalOpenLoginBtn && !modalOpenLoginBtn.__bound){
    modalOpenLoginBtn.__bound = true;
    modalOpenLoginBtn.addEventListener('click', ()=>{ registerModal?.hide(); loginModal?.show(); });
  }
  if(loginForm){
    loginForm.onsubmit = async (e)=>{
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
        try{ await syncRemoteData(); }catch(e){ console.warn('post-login sync failed', e); }
        history.pushState({}, '', '#data-management');
        await showView('data-management');
      }catch(err){ console.error('login failed', err); showToast('로그인 실패', 'danger'); }
      finally{ showSpinner(false); }
    };
  }
  if(registerForm){
    registerForm.onsubmit = async (e)=>{
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
    };
  }
}

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
const VIDEO_MODAL_TEMPLATE = `
  <div class="modal fade" id="uploadVideoModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="uploadVideoModalTitle">Upload Video</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="upload-video-form">
            <input type="hidden" id="upload-video-id" />
            <div class="mb-3">
              <label class="form-label">Choose file</label>
              <input id="upload-video-file" type="file" accept="video/*" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Title (optional)</label>
              <input id="upload-video-title" class="form-control" placeholder="Optional title" />
            </div>
            <div class="mb-3">
              <label class="form-label">Description (optional)</label>
              <textarea id="upload-video-desc" class="form-control" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="btn-delete-video" class="btn btn-outline-danger me-auto d-none">Delete</button>
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button id="btn-save-video" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
`;
let uploadModalBound = false;

function ensureUploadModal(){
  if(document.getElementById('uploadVideoModal')){
    bindUploadModalActions();
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = VIDEO_MODAL_TEMPLATE.trim();
  const modalEl = wrapper.firstElementChild;
  if(modalEl){
    document.body.appendChild(modalEl);
    bindUploadModalActions();
  }
}

function bindUploadModalActions(){
  if(uploadModalBound) return;
  const saveBtn = document.getElementById('btn-save-video');
  const deleteBtn = document.getElementById('btn-delete-video');
  if(!saveBtn || !deleteBtn) return;
  saveBtn.addEventListener('click', async () => {
    const ok = await addOrUpdateVideoFromForm();
    if(ok){
      const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal'));
      modal?.hide();
    }
  });
  deleteBtn.addEventListener('click', async () => {
    const id = document.getElementById('upload-video-id')?.value;
    if(id) await deleteVideoById(id);
    const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal'));
    modal?.hide();
  });
  uploadModalBound = true;
}

function loadVideosFromStorage(){
  try{
    const raw = localStorage.getItem(VIDEOS_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch(e){
    return [];
  }
}

function saveVideosToStorage(arr){
  try{
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(arr));
  }catch(e){
    console.error('saveVideos failed', e);
  }
}

function humanSize(bytes){
  if(!bytes) return '0 B';
  const thresh = 1024;
  if(bytes < thresh) return bytes + ' B';
  const units = ['KB','MB','GB','TB'];
  let u = -1;
  do {
    bytes /= thresh;
    u++;
  } while(bytes >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

function normalizeServerVideo(video){
  if(!video) return null;
  const sizeValue = typeof video.fileSize === 'number'
    ? video.fileSize
    : (typeof video.size === 'number' ? video.size : 0);
  return {
    id: String(video.id ?? video.uuid ?? Math.random().toString(36).slice(2,9)),
    name: video.title || video.name || video.originalFilename || 'Untitled video',
    originalFilename: video.originalFilename,
    desc: video.description || video.desc || '',
    size: sizeValue,
    sizeText: humanSize(sizeValue),
    uploadDate: video.uploadDate || video.createdAt || new Date().toISOString(),
    streamUrl: video.streamUrl || video.streamPath || video.url || '',
    source: 'server'
  };
}

async function refreshVideosFromBackend(){
  const token = localStorage.getItem('auth_token');
  if(!token) return;
  try{
    const serverVideos = await api.listVideos();
    if(!Array.isArray(serverVideos)) return;
    const normalized = serverVideos.map(normalizeServerVideo).filter(Boolean);
    const existingLocals = loadVideosFromStorage().filter(v => !v.streamUrl);
    saveVideosToStorage([...normalized, ...existingLocals]);
    renderVideos();
    if(document.getElementById('video-search-results')) renderVideoSearch();
  }catch(err){
    console.error('refreshVideosFromBackend failed', err);
  }
}

async function syncRemoteData(){
  const token = localStorage.getItem('auth_token');
  if(!token) return;
  const [videosResult, detectionsResult, settingsResult] = await Promise.allSettled([
    api.listVideos(),
    api.listDetections(),
    api.getAnalysisSettings().catch(err => {
      if(String(err?.message || err) === 'not authenticated') return null;
      throw err;
    })
  ]);

  if(videosResult.status === 'fulfilled' && Array.isArray(videosResult.value)){
    const normalized = videosResult.value.map(normalizeServerVideo).filter(Boolean);
    const locals = loadVideosFromStorage().filter(v => !v.streamUrl && v.source !== 'server');
    saveVideosToStorage([...normalized, ...locals]);
    if(document.getElementById('videos-list')) renderVideos();
    if(document.getElementById('video-search-results')) renderVideoSearch();
  }

  if(detectionsResult.status === 'fulfilled'){
    const fromServer = Array.isArray(detectionsResult.value)
      ? detectionsResult.value
      : (Array.isArray(detectionsResult.value?.detections) ? detectionsResult.value.detections : null);
    if(fromServer){
      saveDetectionsToStorage(fromServer);
      if(document.querySelector('#detections-table tbody')) renderDetections();
    }
  }

  if(settingsResult.status === 'fulfilled' && settingsResult.value){
    const mapped = mapRemoteSettingsToLocal(settingsResult.value);
    if(mapped){
      const merged = Object.assign({}, loadUserSettings(), mapped);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      populateSettingsForm(merged);
    }
  }
}

function openUploadModal(video){
  ensureUploadModal();
  const modalEl = document.getElementById('uploadVideoModal');
  if(!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);
  const idInput = document.getElementById('upload-video-id');
  const titleInput = document.getElementById('upload-video-title');
  const descInput = document.getElementById('upload-video-desc');
  const fileInput = document.getElementById('upload-video-file');
  const titleEl = document.getElementById('uploadVideoModalTitle');
  const delBtn = document.getElementById('btn-delete-video');
  if(idInput) idInput.value = video?.id || '';
  if(titleInput) titleInput.value = video?.name || '';
  if(descInput) descInput.value = video?.desc || '';
  if(fileInput) fileInput.value = '';
  if(titleEl) titleEl.textContent = video ? 'Edit Video' : 'Upload Video';
  if(delBtn){
    if(video) delBtn.classList.remove('d-none');
    else delBtn.classList.add('d-none');
  }
  modal.show();
}

async function addOrUpdateVideoFromForm(){
  const id = document.getElementById('upload-video-id')?.value || null;
  const title = (document.getElementById('upload-video-title')?.value || '').trim();
  const desc = (document.getElementById('upload-video-desc')?.value || '').trim();
  const fileInput = document.getElementById('upload-video-file');
  const file = fileInput?.files?.[0];

  if(id){
    try{
      await api.updateVideo(id, { title: title || undefined, description: desc });
      await refreshVideosFromBackend();
      return true;
    }catch(err){
      console.error('updateVideo failed', err);
      alert('Failed to update video: ' + err.message);
      return false;
    }
  }

  if(!file){
    alert('Please select a video file to upload');
    return false;
  }

  try{
    await api.uploadVideo({ file, title, description: desc });
    await refreshVideosFromBackend();
    return true;
  }catch(err){
    console.error('uploadVideo failed', err);
    alert('Failed to upload video: ' + err.message);
    return false;
  }
}

async function deleteVideoById(id){
  if(!id) return;
  if(!confirm('Are you sure you want to delete this video?')) return;
  const token = localStorage.getItem('auth_token');
  if(token){
    try{
      await api.deleteVideo(id);
      await refreshVideosFromBackend();
      return;
    }catch(err){
      console.error('deleteVideo failed', err);
      alert('Failed to delete video from server. Falling back to local removal.');
    }
  }
  const videos = loadVideosFromStorage();
  const idx = videos.findIndex(v => v.id === id);
  if(idx === -1) return;
  videos.splice(idx, 1);
  saveVideosToStorage(videos);
  renderVideos();
  if(document.getElementById('video-search-results')) renderVideoSearch();
}

function buildVideoSource(video){
  if(video?.src) return video.src;
  if(video?.streamUrl){
    const token = localStorage.getItem('auth_token');
    if(!token) return '';
    const sep = video.streamUrl.includes('?') ? '&' : '?';
    return `${video.streamUrl}${sep}token=${encodeURIComponent(token)}`;
  }
  return '';
}

function renderVideos(){
  try{
    const container = document.getElementById('videos-list');
    if(!container) return;
    const videos = loadVideosFromStorage();
    container.innerHTML = '';
    if(videos.length === 0){
      container.innerHTML = '<div class="col-12 text-center text-muted p-4">No uploaded videos.</div>';
      return;
    }
    videos.forEach(video => {
      const col = document.createElement('div');
      col.className = 'col-xl-4 col-md-6';
      const card = document.createElement('div');
      card.className = 'card h-100';
      const videoSrc = buildVideoSource(video);
      const uploadedDate = video.uploadDate ? new Date(video.uploadDate) : null;
      const uploadedAt = uploadedDate && !Number.isNaN(uploadedDate.getTime()) ? uploadedDate.toLocaleString() : '—';
      const sizeText = video.sizeText || (typeof video.size === 'number' ? humanSize(video.size) : '—');
      const preview = videoSrc
        ? `<video muted playsinline preload="metadata" src="${videoSrc}" style="width:100%;height:100%;object-fit:cover"></video>`
        : '<div class="w-100 h-100 bg-light d-flex align-items-center justify-content-center text-muted small">Sign in to preview</div>';
      card.innerHTML = `
        <div class="ratio ratio-16x9">
          ${preview}
        </div>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${escapeHtml(video.name)}</h6>
          <div class="text-muted small mb-2">${escapeHtml(sizeText)} • ${escapeHtml(uploadedAt)}</div>
          <div class="mt-auto">
            <button class="btn btn-sm btn-primary w-100 btn-play-video" data-id="${video.id}">Play</button>
            <small class="text-muted d-block mt-2">Editing is available from the Search tab.</small>
          </div>
        </div>
      `;
      col.appendChild(card);
      container.appendChild(col);
    });

    container.querySelectorAll('.btn-play-video').forEach(btn => {
      btn.addEventListener('click', () => {
        const player = document.getElementById('video-player');
        if(!player) return;
        const video = loadVideosFromStorage().find(v => v.id === btn.dataset.id);
        const src = buildVideoSource(video);
        if(!src){
          alert('Please login to stream this video.');
          return;
        }
        player.src = src;
        const modalEl = document.getElementById('videoModal');
        if(modalEl){
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      });
    });
    if(document.getElementById('video-search-results')) renderVideoSearch();
  }catch(e){
    console.error('renderVideos failed', e);
  }
}

function renderVideoSearch(){
  try{
    const resultsEl = document.getElementById('video-search-results');
    if(!resultsEl) return;
    const input = document.getElementById('video-search-input');
    const countEl = document.getElementById('video-search-count');
    const queryRaw = (input?.value || '').trim();
    const query = queryRaw.toLowerCase();
    const videos = loadVideosFromStorage();
    resultsEl.innerHTML = '';

    if(!query){
      if(countEl) countEl.textContent = '0';
      const empty = document.createElement('div');
      empty.className = 'col-12';
      empty.innerHTML = '<div class="border rounded text-center text-muted py-5">Enter a search term above to view matching videos.</div>';
      resultsEl.appendChild(empty);
      return;
    }

    const filtered = videos.filter(v => [v.name, v.desc, v.originalFilename].some(field => String(field || '').toLowerCase().includes(query)));
    if(countEl) countEl.textContent = filtered.length;
    if(filtered.length === 0){
      const empty = document.createElement('div');
      empty.className = 'col-12';
      empty.innerHTML = `<div class="border rounded text-center text-muted py-5">No videos found for "${escapeHtml(queryRaw)}".</div>`;
      resultsEl.appendChild(empty);
      return;
    }
    filtered.forEach(video => {
      const col = document.createElement('div');
      col.className = 'col-xl-4 col-md-6';
      const card = document.createElement('div');
      card.className = 'card h-100 shadow-sm';
      const uploadedDate = video.uploadDate ? new Date(video.uploadDate) : null;
      const uploadedAt = uploadedDate && !Number.isNaN(uploadedDate.getTime()) ? uploadedDate.toLocaleString() : '—';
      const sizeText = video.sizeText || (typeof video.size === 'number' ? humanSize(video.size) : '—');
      card.innerHTML = `
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0">${escapeHtml(video.name || 'Untitled video')}</h6>
            <span class="badge text-bg-light">${escapeHtml(sizeText)}</span>
          </div>
          <div class="small mb-2 ${video.desc ? '' : 'text-muted'}">${video.desc ? escapeHtml(video.desc) : 'No description provided.'}</div>
          <div class="small text-muted mb-3">
            ${escapeHtml(video.originalFilename || '—')}<br/>
            ${escapeHtml(uploadedAt)}
          </div>
          <div class="mt-auto d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-primary flex-fill btn-edit-video" data-id="${video.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger flex-fill btn-del-video" data-id="${video.id}">Delete</button>
            <button class="btn btn-sm btn-secondary flex-fill btn-play-video" data-id="${video.id}">Play</button>
          </div>
        </div>
      `;
      col.appendChild(card);
      resultsEl.appendChild(col);
    });

    resultsEl.querySelectorAll('.btn-edit-video').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const video = loadVideosFromStorage().find(v => v.id === id);
        if(video) openUploadModal(video);
      });
    });
    resultsEl.querySelectorAll('.btn-del-video').forEach(btn => {
      btn.addEventListener('click', async () => {
        await deleteVideoById(btn.dataset.id);
      });
    });
    resultsEl.querySelectorAll('.btn-play-video').forEach(btn => {
      btn.addEventListener('click', () => {
        const player = document.getElementById('video-player');
        if(!player) return;
        const video = loadVideosFromStorage().find(v => v.id === btn.dataset.id);
        const src = buildVideoSource(video);
        if(!src){
          alert('Please login to stream this video.');
          return;
        }
        player.src = src;
        const modalEl = document.getElementById('videoModal');
        if(modalEl){
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      });
    });
  }catch(err){
    console.error('renderVideoSearch failed', err);
  }
}

document.addEventListener('page-loaded', ev => {
  try{
    const id = ev?.detail?.id;
    if(id === 'videos'){
      ensureUploadModal();
      bindUploadModalActions();
      document.getElementById('btn-open-upload')?.addEventListener('click', () => openUploadModal(null));
      renderVideos();
      refreshVideosFromBackend().catch(() => {});
    }
    if(id === 'search'){
      ensureUploadModal();
      bindUploadModalActions();
      document.getElementById('btn-open-upload-search')?.addEventListener('click', () => openUploadModal(null));
      const input = document.getElementById('video-search-input');
      input?.addEventListener('input', () => renderVideoSearch());
      document.getElementById('video-search-clear')?.addEventListener('click', () => {
        if(input) input.value = '';
        renderVideoSearch();
      });
      renderVideoSearch();
      refreshVideosFromBackend().catch(() => {});
    }
  }catch(err){
    console.error('videos/search page-loaded handler failed', err);
  }
});

/* --- Detections renderer + helpers --- */
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

/* --- Shared helpers --- */
function parseTimeString(s){ // tries to parse 'YYYY-MM-DD HH:MM' or ISO
  const t = s && s.replace(/\./g,'-'); const parsed = new Date(t); return isNaN(parsed) ? null : parsed;
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

document.getElementById('hero-cta')?.addEventListener('click', ()=>{ const user = getCurrentUser(); if(!user) loginModal.show(); else document.getElementById('records-table').scrollIntoView({behavior:'smooth'}); });

const logoInput = document.getElementById('logo-input'); const btnUploadLogo = document.getElementById('btn-upload-logo'); const btnResetLogo = document.getElementById('btn-reset-logo');
btnUploadLogo?.addEventListener('click', ()=> logoInput?.click());
logoInput?.addEventListener('change',(ev)=>{ const f = ev.target.files && ev.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = (e)=>{ localStorage.setItem(LOGO_KEY, e.target.result); renderAuth(); alert('Logo uploaded'); }; reader.readAsDataURL(f); });
btnResetLogo?.addEventListener('click', ()=>{ if(confirm('Reset logo to default?')){ localStorage.removeItem(LOGO_KEY); renderAuth(); } });

globalSearch?.addEventListener('input', (e)=>{ const v = e.target.value || ''; if(searchInput) { searchInput.value = v; renderTable(); } });

btnNotify?.addEventListener('click', ()=>{ alert('미처리 탐지: ' + (notifyBadge ? notifyBadge.textContent : '0') + '건'); });

searchInput?.addEventListener('input', ()=> renderTable());

document.addEventListener('fragments-loaded', onFragmentsLoaded);
if(typeof window !== 'undefined' && window.__fragmentsReady){
  try{ onFragmentsLoaded(); }
  catch(e){ console.error('onFragmentsLoaded immediate run failed', e); }
}

// ensure initial view is applied immediately (before potential fragment load)
try{ applyInitialView(); }catch(e){}
renderTable(); renderAuth();
syncRemoteData().catch(()=>{});

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