// src/js/layout-loader.js
// 간단한 프래그먼트 로더: header/sidebar/footer를 동적으로 가져와 삽입합니다.
async function loadFragment(selector, url){
  const el = document.querySelector(selector);
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error(`${url} 불러오기 실패: ${res.status}`);
    const html = await res.text();
    if(el) el.innerHTML = html;
  }catch(err){
    console.error('Fragment load error', err);
    // Minimal fallback to prevent layout breakage
    if(el && !el.innerHTML){
      if(selector === '#layout-header'){
        el.innerHTML = `
          <nav class="navbar navbar-expand-lg navbar-light bg-light px-3" id="fallback-header">
            <a class="navbar-brand" href="#hero">Fall Prevention</a>
            <div class="ms-auto d-flex align-items-center gap-2">
              <a class="nav-link" href="#dashboard">Dashboard</a>
              <a class="nav-link" href="#videos">Videos</a>
              <a class="nav-link" href="#detections">Detections</a>
              <a class="nav-link" href="#settings">Settings</a>
              <button id="btn-login-open" class="btn btn-sm btn-primary">로그인</button>
              <button id="btn-logout" class="btn btn-sm btn-outline-secondary d-none">로그아웃</button>
              <span id="nav-user" class="ms-2 small text-muted"></span>
            </div>
          </nav>
        `;
      } else if(selector === '#layout-sidebar'){
        el.innerHTML = `
          <div class="list-group" id="fallback-sidebar">
            <a href="#dashboard" class="list-group-item list-group-item-action nav-link">Dashboard</a>
            <a href="#videos" class="list-group-item list-group-item-action nav-link">Videos</a>
            <a href="#detections" class="list-group-item list-group-item-action nav-link">Detections</a>
            <a href="#tags" class="list-group-item list-group-item-action nav-link">Tags</a>
            <a href="#settings" class="list-group-item list-group-item-action nav-link">Settings</a>
            <a href="#contact" class="list-group-item list-group-item-action nav-link">Contact</a>
            <a href="#auth" class="list-group-item list-group-item-action nav-link">Auth</a>
          </div>
        `;
      } else if(selector === '#layout-footer'){
        el.innerHTML = `<div class="text-center py-3 text-muted">&copy; Fall Prevention</div>`;
      }
    }
  }
}

async function loadLayout(){
  await Promise.all([
    loadFragment('#layout-header','/src/layout/header.html'),
    loadFragment('#layout-sidebar','/src/layout/sidebar.html'),
    loadFragment('#layout-footer','/src/layout/footer.html')
  ]);
  // 프래그먼트가 로드된 후 이벤트 발생 (필요 시 다른 스크립트에서 수신)
  document.dispatchEvent(new Event('fragments-loaded'));
}

// 즉시 실행
loadLayout();

export {};
