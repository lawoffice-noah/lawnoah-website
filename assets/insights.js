/* Progressive enhancement only. Content, links and SEO exist in the HTML. */
(() => {
  'use strict';
  const toc = document.querySelector('.ni-toc');
  if (toc && window.matchMedia('(max-width: 820px)').matches) toc.open = false;
  const menu = document.querySelector('.mobile-nav');
  const button = document.querySelector('.mobile-menu-button');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
      if (button) { button.setAttribute('aria-expanded', 'false'); button.focus(); }
    }
  });
  if (!toc || !('IntersectionObserver' in window)) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const sections = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(a => {
        if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
  }, {rootMargin: '-90px 0px -65% 0px', threshold: 0});
  sections.forEach(section => observer.observe(section));
})();
