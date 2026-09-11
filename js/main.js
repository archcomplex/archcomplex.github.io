/* ============================================================
   Плавное появление изображений + гашение шиммера
   ============================================================ */
function initImageFade(scope){
  const root = scope || document;
  root.querySelectorAll(
    '.thumb img, .project-hero .ph-media img, .project-hero-full .ph-media-full img'
  ).forEach(img=>{
    const container = img.closest(
      '.thumb, .project-hero .ph-media, .project-hero-full .ph-media-full'
    );
    if(!container || container.classList.contains('img-loaded')) return;

    const markLoaded = ()=> container.classList.add('img-loaded');
    const markFailed = ()=> container.classList.add('img-loaded', 'img-failed');

    if(img.complete && img.naturalWidth > 0){
      // Уже в кэше — показываем сразу
      markLoaded();
    }else if(img.complete && img.naturalWidth === 0){
      // Загрузилось, но битое
      markFailed();
    }else{
      img.addEventListener('load', markLoaded, {once: true});
      img.addEventListener('error', markFailed, {once: true});
    }
  });
}

/* ============================================================
   Горизонтальная карусель категорий
   ============================================================ */
function initCatNav(){
  document.querySelectorAll('.cat-scroll').forEach(wrap=>{
    const grid = wrap.querySelector('.cat-grid');
    const prev = wrap.querySelector('.cat-nav.prev');
    const next = wrap.querySelector('.cat-nav.next');
    if(!grid) return;
    const step = ()=>{
      const card = grid.querySelector('.cat-card');
      return (card ? card.offsetWidth : 220) + 16;
    };
    if(prev) prev.addEventListener('click', ()=> grid.scrollBy({left: -step(), behavior: 'smooth'}));
    if(next) next.addEventListener('click', ()=> grid.scrollBy({left: step(), behavior: 'smooth'}));
  });
}

/* ============================================================
   Бесшовная навигация между проектами (SPA-стиль)
   ============================================================ */
function initProjectNav(){
  const SWAP_SELECTORS = [
    '.project-hero-full',
    '.project-title-row',
    '.content.project-body-wide',
    'nav.breadcrumb',
    '#main .grid'
  ];

  function bindLinks(scope){
    scope.querySelectorAll('.project-nav[href]').forEach(link=>{
      if(link.dataset.projectNavBound) return;
      link.dataset.projectNavBound = '1';
      link.addEventListener('click', onNavClick);
    });
  }

  function onNavClick(e){
    const link = e.currentTarget;
    const href = link.getAttribute('href');
    if(!href) return;
    e.preventDefault();
    loadProject(href).catch(err=>{
      console.error('project-nav: falling back to normal navigation', err);
      window.location.href = href;
    });
  }

  async function loadProject(href){
    const res = await fetch(href, {credentials: 'same-origin', cache: 'no-store'});
    if(!res.ok) throw new Error('Network response was not ok: ' + res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    SWAP_SELECTORS.forEach(sel=>{
      const current = document.querySelector(sel);
      const incoming = doc.querySelector(sel);
      if(current && incoming){
        current.innerHTML = incoming.innerHTML;
      }
    });

    const newTitle = doc.querySelector('title');
    if(newTitle) document.title = newTitle.textContent;

    const canonical = document.querySelector('link[rel="canonical"]');
    const newCanonical = doc.querySelector('link[rel="canonical"]');
    if(canonical && newCanonical){
      canonical.setAttribute('href', newCanonical.getAttribute('href'));
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    const newMetaDesc = doc.querySelector('meta[name="description"]');
    if(metaDesc && newMetaDesc){
      metaDesc.setAttribute('content', newMetaDesc.getAttribute('content'));
    }

    try{
      history.pushState({projectNav: true}, '', href);
    }catch(pushStateErr){
      console.error('project-nav: history.pushState failed', pushStateErr);
    }

    bindLinks(document);
    initImageFade(document);
  }

  bindLinks(document);

  window.addEventListener('popstate', e=>{
    if(e.state && e.state.projectNav) window.location.reload();
  });
}

/* ============================================================
   Запуск
   ============================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  initCatNav();
  initProjectNav();
  initImageFade();
});