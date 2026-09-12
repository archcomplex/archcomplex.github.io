function showImageFallback(container, img){
  if(container.querySelector('.img-fallback')) return;
  const fallback = document.createElement('div');
  fallback.className = 'img-fallback';

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<rect x="3" y="4.5" width="18" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
    '<circle cx="8.5" cy="9.5" r="1.6" fill="currentColor"/>' +
    '<path d="M4 16.5l5-5 3.5 3.5L16 11l4 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';

  const text = document.createElement('span');
  text.textContent = img.getAttribute('alt') || 'Изображение недоступно';

  fallback.appendChild(icon);
  fallback.appendChild(text);
  container.appendChild(fallback);
}

const MIN_SKELETON_MS = 500;

function initImageFade(scope){
  const root = scope || document;
  root.querySelectorAll('.thumb img, .project-hero .ph-media img, .project-hero-full .ph-media-full img').forEach(img=>{
    const container = img.closest('.thumb, .project-hero .ph-media, .project-hero-full .ph-media-full');
    if(!container || container.classList.contains('img-loaded')) return;

    const startedAt = performance.now();
    const runAfterMinDelay = (fn)=>{
      const elapsed = performance.now() - startedAt;
      const remaining = MIN_SKELETON_MS - elapsed;
      if(remaining > 0){
        setTimeout(fn, remaining);
      }else{
        fn();
      }
    };

    const markLoaded = ()=> runAfterMinDelay(()=> container.classList.add('img-loaded'));
    const markError = ()=> runAfterMinDelay(()=>{
      container.classList.add('img-loaded', 'img-error');
      showImageFallback(container, img);
    });

    if(img.complete && img.naturalWidth > 0){
      markLoaded();
    }else if(img.complete){
      markError();
    }else{
      img.addEventListener('load', markLoaded, {once: true});
      img.addEventListener('error', markError, {once: true});
    }
  });
}

function initHeroParallax(scope){
  const root = scope || document;
  const media = root.querySelector('.project-hero-full .ph-media-full');
  if(!media || media.dataset.parallaxBound) return;
  media.dataset.parallaxBound = '1';

  const img = media.querySelector(':scope > img');
  if(!img) return;

  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wrap = document.createElement('div');
  wrap.className = 'ph-scale-wrap';
  media.insertBefore(wrap, img);
  wrap.appendChild(img);

  let ticking = false;
  const update = ()=>{
    const rect = media.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const center = rect.top + rect.height / 2;
    const progress = 1 - Math.min(Math.max(center / vh, 0), 1);
    const scale = 1 + progress * 0.1;
    const shift = progress * 14;
    img.style.transform = `scale(${scale}) translateY(${shift}px)`;
    ticking = false;
  };
  update();
  window.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, {passive: true});
  window.addEventListener('resize', update);
}

function animateCounter(el){
  const raw = el.textContent.trim();
  const match = raw.match(/^(\d+)(.*)$/);
  if(!match) return;
  const target = parseInt(match[1], 10);
  const suffix = match[2] || '';
  const DURATION = 1400;
  const start = performance.now();

  const step = (now)=>{
    const elapsed = now - start;
    const t = Math.min(elapsed / DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if(t < 1){
      window.requestAnimationFrame(step);
    }else{
      el.textContent = target + suffix;
    }
  };
  window.requestAnimationFrame(step);
}

function initStatCounters(scope){
  const root = scope || document;
  const items = root.querySelectorAll('.side-stat b:not(.counter-bound)');
  if(!items.length) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach(el=> el.classList.add('counter-bound'));

  if(prefersReducedMotion || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries, obs)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, {threshold: 0.4});

  items.forEach(el=> observer.observe(el));
}

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
    initHeroParallax(document);
  }

  bindLinks(document);

  window.addEventListener('popstate', e=>{
    if(e.state && e.state.projectNav) window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  initCatNav();
  initProjectNav();
  initImageFade();
  initHeroParallax();
  initStatCounters();
});
