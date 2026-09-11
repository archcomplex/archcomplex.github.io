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

/*
 * Round prev/next buttons over the project image ("Предыдущий/Следующий
 * проект"). These are real <a href="..."> links to a neighbouring project
 * page, kept as real links on purpose (SEO, "open in new tab", no-JS
 * fallback). The problem: because they are a full page navigation, the
 * browser tears down and reloads the whole document just to swap one photo,
 * and in the process the viewport resets to the top of the new page —
 * visible as a "jump" / refresh even though only the image should change.
 *
 * Fix: intercept the click, fetch the target project page in the
 * background, and swap just the parts of the DOM that differ (hero image +
 * nav links, title, description, breadcrumb, related projects) into the
 * current, already-rendered page. No navigation happens, so nothing
 * reloads and the scroll position / button position never move. The
 * address bar and document.title are updated via history.pushState so the
 * URL, back/forward button and page title still stay correct.
 * If anything goes wrong (network error, fetch unsupported, cross-origin),
 * it falls back to a normal link click.
 */
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

    // The DOM swap above is the part that actually matters for the "page
    // jumps to top" bug. Some mobile browsers (e.g. pages opened inside an
    // in-app/sandboxed webview) throw a SecurityError on pushState. That
    // should not undo a swap that already succeeded, so it gets its own
    // try/catch instead of sharing one with the fetch above.
    try{
      history.pushState({projectNav: true}, '', href);
    }catch(pushStateErr){
      console.error('project-nav: history.pushState failed', pushStateErr);
    }

    // Newly inserted prev/next links need their own click handler.
    bindLinks(document);
  }

  bindLinks(document);

  // Keep the back/forward buttons correct: a full reload of whatever URL
  // the browser has now put in the address bar is the simplest way to
  // guarantee the page matches history state exactly.
  window.addEventListener('popstate', e=>{
    if(e.state && e.state.projectNav) window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  initCatNav();
  initProjectNav();
});
