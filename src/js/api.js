// src/js/api.js
// Lightweight API client with graceful fallback when backend is unavailable.
const DEFAULT_TIMEOUT = 6000;

function withTimeout(ms, promise){
  let id;
  const timeout = new Promise((_, rej)=> id = setTimeout(()=> rej(new Error('timeout')), ms));
  return Promise.race([promise.finally(()=> clearTimeout(id)), timeout]);
}

function inferBase(){
  // Force local Spring Boot backend to avoid accidental calls to school server.
  return 'http://localhost:8080/api';
}

async function getJson(path){
  const base = inferBase();
  const url = `${base}${path}`;
  const res = await withTimeout(DEFAULT_TIMEOUT, fetch(url, { credentials: 'omit' }));
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  async health(){
    try{ return await getJson('/health'); }catch(e){ return { ok:false, error: String(e) }; }
  },
  async listMedia(){
    // Protected API: skip if not authenticated to avoid 403 noise
    const token = localStorage.getItem('token');
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json.files) ? json.files : [];
  },
  async listVideos(){
    const token = localStorage.getItem('token');
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json.videos) ? json.videos : [];
  },
  async listStreams(){
    const token = localStorage.getItem('token');
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/streams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json.streams) ? json.streams : [];
  },
  async listDetections(){
    const token = localStorage.getItem('token');
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/detections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json.detections) ? json.detections : [];
  },
  async saveVideoMeta(meta){
    const base = inferBase();
    const token = localStorage.getItem('token');
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(meta)
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async saveDetection(row){
    const base = inferBase();
    const token = localStorage.getItem('token');
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/detections`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(row)
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }
};

// Auth helpers
export const authApi = {
  async register({ username, password, birthDate }){
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, birthDate })
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async login({ username, password }){
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async me(token){
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }
};
