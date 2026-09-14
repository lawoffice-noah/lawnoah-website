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
  } else {
    revealEls.forEach(el => el.classList.add('show'));
  }

  // Practice cards use the same calm colour-shift interaction as the Insights cards.
  // JS also mirrors hover on keyboard focus; CSS :hover remains as a no-JS fallback.
  document.querySelectorAll('.practice-preview-grid a, .practice-card').forEach(card => {
    const on = () => card.classList.add('hover-active');
    const off = () => card.classList.remove('hover-active');
    card.addEventListener('mouseenter', on);
    card.addEventListener('mouseleave', off);
    card.addEventListener('focusin', on);
    card.addEventListener('focusout', off);
  });

  const f = document.getElementById('contactForm');
  if (!f) return;

  const s = document.getElementById('formStatus');
  const startedAt = document.getElementById('startedAt');
  const message = f.querySelector('textarea[name="message"]');
  const counter = document.getElementById('messageCount');
  const submitButton = f.querySelector('button[type="submit"]');

  const resetSession = () => {
    if (startedAt) startedAt.value = String(Date.now());
  };
  resetSession();

  if (message && counter) {
    const updateCount = () => { counter.textContent = String(message.value.length); };
    message.addEventListener('input', updateCount);
    updateCount();
  }

  // Turnstile activates only after a real public site key replaces the placeholder.
  const mount = document.getElementById('turnstileMount');
  if (mount) {
    const sitekey = (mount.dataset.sitekey || '').trim();
    if (sitekey && !sitekey.startsWith('REPLACE_')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      mount.classList.add('cf-turnstile');
      mount.dataset.theme = 'light';
      document.head.appendChild(script);
    } else {
      mount.hidden = true;
    }
  }

  const messages = {
    ko: {
      sending: '전송 중입니다.',
      success: '문의가 전송되었습니다. 확인 후 회신드리겠습니다.',
      generic: '전송 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 info@lawnoah.com으로 문의해 주세요.',
      'Invalid form session': '폼 세션이 만료되었거나 너무 빠르게 제출되었습니다. 페이지를 새로고침한 뒤 다시 제출해 주세요.',
      'Invalid required fields': '필수 항목을 확인해 주세요. 문의 내용은 10자 이상 입력해 주세요.',
      'Consent required': '필수 개인정보 동의 항목을 모두 확인해 주세요.',
      'Bot verification failed': '스팸 방지 확인에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
      'Bot verification is not configured': '스팸 방지 설정 오류가 있습니다. 이메일(info@lawnoah.com)로 문의해 주세요.',
      'Mail service is not configured': '메일 전송 설정 오류가 있습니다. 이메일(info@lawnoah.com)로 직접 문의해 주세요.',
      'Mail delivery failed': '메일 전송에 실패했습니다. 잠시 후 다시 시도하거나 info@lawnoah.com으로 직접 문의해 주세요.'
    },
    en: {
      sending: 'Sending…',
      success: 'Your inquiry has been sent. We will review it and respond as appropriate.',
      generic: 'The inquiry could not be sent. Please try again later or email info@lawnoah.com.',
      'Invalid form session': 'The form session expired or was submitted too quickly. Please refresh the page and try again.',
      'Invalid required fields': 'Please check the required fields. The inquiry must contain at least 10 characters.',
      'Consent required': 'Please complete the required privacy consent items.',
      'Bot verification failed': 'Bot verification failed. Please refresh the page and try again.',
      'Bot verification is not configured': 'Bot verification is not configured correctly. Please email info@lawnoah.com.',
      'Mail service is not configured': 'The mail service is not configured correctly. Please email info@lawnoah.com directly.',
      'Mail delivery failed': 'Email delivery failed. Please try again later or email info@lawnoah.com directly.'
    }
  };

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lang = f.elements.lang?.value === 'en' ? 'en' : 'ko';
    const copy = messages[lang];

    if (s) s.className = 'form-status';
    if (!f.reportValidity()) return;

    if (submitButton) submitButton.disabled = true;
    if (s) s.textContent = copy.sending;

    const fd = new FormData(f);
    const payload = Object.fromEntries(fd.entries());
    payload.consentPrivacy = fd.get('consentPrivacy') === 'on';
    payload.consentTransfer = fd.get('consentTransfer') === 'on';
    payload.turnstileToken = fd.get('cf-turnstile-response') || '';

    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      let result = {};
      try { result = await r.json(); } catch (_) {}

      if (!r.ok || result.ok !== true) {
        const apiError = typeof result.error === 'string' ? result.error : '';
        const err = new Error(apiError || 'send-failed');
        err.apiError = apiError;
        throw err;
      }

      f.reset();
      resetSession();
      if (counter) counter.textContent = '0';
      if (s) {
        s.classList.add('success');
        s.textContent = copy.success;
      }
      if (window.turnstile) {
        try { window.turnstile.reset(); } catch (_) {}
      }
    } catch (err) {
      if (s) {
        s.classList.add('error');
        const key = err?.apiError || err?.message || '';
        s.textContent = copy[key] || copy.generic;
      }
      console.error('Contact form submission failed:', err?.apiError || err?.message || err);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
