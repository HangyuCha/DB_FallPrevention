// src/js/pages-loader.js
// Simple on-demand page fragment loader. Exports loadPage(id) which fetches
// /src/pages/{id}.html and injects it into #pages-container as a child <section id="{id}">.
export async function loadPage(id){
  if(!id) return;
  const container = document.getElementById('pages-container');
  if(!container) throw new Error('pages container not found');
  // if already present in DOM, nothing to do
  if(document.getElementById(id)) return;
  // Try the public static path first (Vite serves files from `public/` at root),
  // then fall back to src paths for environments that expose them.
  const candidates = [`/pages/${id}.html`, `/src/pages/${id}.html`, `src/pages/${id}.html`];
  document.dispatchEvent(new CustomEvent('page-load-start', { detail: { id } }));
  let lastErr = null;
  for(const url of candidates){
    try{
      console.debug('[pages-loader] attempting to load page', id, url);
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const html = await res.text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  // Prefer an element with the expected id (e.g., <section id="dashboard">)
  let frag = wrapper.querySelector(`#${id}`) || null;
  // If not found, try to find a top-level section element
  if(!frag) frag = wrapper.querySelector('section') || null;
  // If still not found, the fetched document is likely the app index or invalid fragment
  if(!frag) throw new Error('Loaded page fragment does not contain expected section');
  // Ensure the fragment has the requested id so renderers find it
  if(!frag.id) frag.id = id;
  // Append only the fragment node (not the whole fetched document)
  container.appendChild(frag);
      console.debug('[pages-loader] loaded page', id, url);
      document.dispatchEvent(new CustomEvent('page-loaded', { detail: { id } }));
      return;
    }catch(err){
      console.warn('[pages-loader] attempt failed for', url, err && err.message ? err.message : err);
      lastErr = err;
    }
  }
  // all attempts failed
  try{ document.dispatchEvent(new CustomEvent('page-load-failed', { detail: { id, error: String(lastErr && lastErr.message ? lastErr.message : lastErr) } })); }catch(e){}
  throw lastErr || new Error('Failed to load page fragment');
}
