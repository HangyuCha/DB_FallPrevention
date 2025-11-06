// src/js/layout-loader.js
// 간단한 프래그먼트 로더: header/sidebar/footer를 동적으로 가져와 삽입합니다.
async function loadFragment(selector, url){
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error(`${url} 불러오기 실패: ${res.status}`);
    const html = await res.text();
    const el = document.querySelector(selector);
    if(el) el.innerHTML = html;
  }catch(err){ console.error('Fragment load error', err); }
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
