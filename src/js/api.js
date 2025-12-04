// src/js/api.js
// Lightweight API client with graceful fallback when backend is unavailable.
const DEFAULT_TIMEOUT = 6000;

function withTimeout(ms, promise){
  let id;
  const timeout = new Promise((_, rej)=> id = setTimeout(()=> rej(new Error('timeout')), ms));
  return Promise.race([promise.finally(()=> clearTimeout(id)), timeout]);
}

function inferBase(){
  const base = import.meta?.env?.VITE_API_BASE?.trim();
  if(base) return base.replace(/\/$/, '') + '/api';
  return 'http://localhost:8080/api';
}

function getAuthToken(){
  return localStorage.getItem('auth_token');
}

export function getApiBase(){
  return inferBase();
}

async function getJson(path){
  const base = inferBase();
  const url = `${base}${path}`;
  const token = getAuthToken();
  const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
  const res = await withTimeout(DEFAULT_TIMEOUT, fetch(url, { headers, credentials: 'omit' }));
  if(res.status === 401) throw new Error('401');
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  async health(){
    try{ return await getJson('/health'); }catch(e){ return { ok:false, error: String(e) }; }
  },
  async listMedia(){
    // Protected API: skip if not authenticated to avoid 403 noise
    const token = getAuthToken();
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
    const token = getAuthToken();
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  },
  async listStreams(){
    const token = getAuthToken();
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
    const token = getAuthToken();
    if(!token) return [];
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/detections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return Array.isArray(json.detections) ? json.detections : [];
  },
  async getAnalysisSettings(){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/settings/analysis`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(res.status === 404) return null;
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async saveAnalysisSettings(payload){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/settings/analysis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async deleteAccount(){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/auth/me`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(res.status !== 204) throw new Error(`${res.status}`);
    return true;
  },
  async saveVideoMeta(meta){
    console.warn('saveVideoMeta is deprecated. Use uploadVideo instead.');
    return Promise.reject(new Error('saveVideoMeta deprecated'));
  },
  async uploadVideo({ file, title, description }){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const form = new FormData();
    form.append('file', file);
    if(title) form.append('title', title);
    if(description) form.append('description', description);
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async updateVideo(id, { title, description }){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description })
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  async deleteVideo(id){
    const token = getAuthToken();
    if(!token) throw new Error('not authenticated');
    const base = inferBase();
    const res = await withTimeout(DEFAULT_TIMEOUT, fetch(`${base}/videos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if(!res.ok) throw new Error(`${res.status}`);
    return true;
  },
  async saveDetection(row){
    const base = inferBase();
    const token = getAuthToken();
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
