(() => {
  const current = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop();
    if (href === current) a.classList.add('active');
  });

  const menuBtn = document.querySelector('.mobile-menu-button');
  const mobileNav = document.querySelector('.mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('show'); });
    }, { threshold: .12 });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('show'));

  const f = document.getElementById('contactForm');
  if (!f) return;
  const s = document.getElementById('formStatus');
  const startedAt = document.getElementById('startedAt');
  const message = f.querySelector('textarea[name="message"]');
  const counter = document.getElementById('messageCount');
  if (startedAt) startedAt.value = String(Date.now());
  if (message && counter) message.addEventListener('input', () => counter.textContent = String(message.value.length));

  // Turnstile is enabled automatically once a real public site key replaces the placeholder.
  const mount = document.getElementById('turnstileMount');
  if (mount) {
    const sitekey = (mount.dataset.sitekey || '').trim();
    if (sitekey && !sitekey.startsWith('REPLACE_')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true; script.defer = true;
      mount.classList.add('cf-turnstile');
      mount.dataset.theme = 'light';
      document.head.appendChild(script);
    } else {
      mount.hidden = true;
    }
  }

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    s.className = 'form-status';
    if (!f.reportValidity()) return;
    if (s) s.textContent = f.elements.lang.value === 'en' ? 'Sending…' : '전송 중입니다.';
    const fd = new FormData(f);
    const payload = Object.fromEntries(fd.entries());
    payload.consentPrivacy = fd.get('consentPrivacy') === 'on';
    payload.consentTransfer = fd.get('consentTransfer') === 'on';
    payload.turnstileToken = fd.get('cf-turnstile-response') || '';
    try {
      const r = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!r.ok) throw new Error('send-failed');
      f.reset();
      if (startedAt) startedAt.value = String(Date.now());
      if (counter) counter.textContent = '0';
      if (s) { s.classList.add('success'); s.textContent = payload.lang === 'en' ? 'Your inquiry has been sent. We will review it and respond as appropriate.' : '문의가 전송되었습니다. 확인 후 회신드리겠습니다.'; }
      if (window.turnstile) try { window.turnstile.reset(); } catch(_) {}
    } catch(err) {
      if (s) { s.classList.add('error'); s.textContent = fd.get('lang') === 'en' ? 'The inquiry could not be sent. Please try again later or email info@lawnoah.com.' : '전송 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 info@lawnoah.com으로 문의해 주세요.'; }
    }
  });
})();
