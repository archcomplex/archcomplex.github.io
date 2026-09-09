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
document.addEventListener('DOMContentLoaded', initCatNav);
