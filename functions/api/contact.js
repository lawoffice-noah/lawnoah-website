const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const clean = (v, max) => String(v || '').trim().slice(0, max);
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === 'https://lawnoah.com' || origin === 'https://www.lawnoah.com') return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && (hostname === 'lawnoah.pages.dev' || hostname.endsWith('.lawnoah.pages.dev'));
  } catch {
    return false;
  }
};

async function verifyTurnstile(secret, token, remoteip) {
  if (!secret || !token) return { success: false };
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteip) body.set('remoteip', remoteip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!res.ok) return { success: false };
  return await res.json();
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) return json({ error: 'Invalid origin' }, 403);

    const type = request.headers.get('content-type') || '';
    if (!type.includes('application/json')) return json({ error: 'Unsupported content type' }, 415);

    const data = await request.json();
    if (clean(data.website, 200)) return json({ ok: true }); // honeypot

    const startedAt = Number(data.startedAt || 0);
    const elapsed = Date.now() - startedAt;
    if (!startedAt || elapsed < 500 || elapsed > 2 * 60 * 60 * 1000) {
      return json({ error: 'Invalid form session' }, 400);
    }

    const lang = clean(data.lang, 2) === 'en' ? 'en' : 'ko';
    const name = clean(data.name, 100);
    const email = clean(data.email, 254);
    const matter = clean(data.matter, 120);
    const message = clean(data.message, 3000);
    const organization = clean(data.organization, 150);
    const position = clean(data.position, 100);
    const country = clean(data.country, 100);

    if (!name || !validEmail(email) || !matter || message.length < 10) {
      return json({ error: 'Invalid required fields' }, 400);
    }
    if (data.consentPrivacy !== true || data.consentTransfer !== true) {
      return json({ error: 'Consent required' }, 400);
    }

    // Turnstile is enforced only after TURNSTILE_ENABLED=true is explicitly configured.
    // This prevents a secret key left in the environment from breaking the form before
    // the matching public site key has been added to contact.html.
    const turnstileEnabled = ['true', '1', 'yes'].includes(clean(env.TURNSTILE_ENABLED, 10).toLowerCase());
    if (turnstileEnabled) {
      const turnstileSecret = clean(env.TURNSTILE_SECRET_KEY, 300);
      const turnstileToken = clean(data.turnstileToken, 3000);
      if (!turnstileSecret) return json({ error: 'Bot verification is not configured' }, 503);
      const remoteip = request.headers.get('CF-Connecting-IP') || '';
      const turnstile = await verifyTurnstile(turnstileSecret, turnstileToken, remoteip);
      if (!turnstile.success) return json({ error: 'Bot verification failed' }, 403);
    }

    const resendApiKey = clean(env.RESEND_API_KEY, 500);
    if (!resendApiKey) return json({ error: 'Mail service is not configured' }, 503);

    const subject = lang === 'en'
      ? `[Law Office Noah Inquiry] ${name} · ${matter}`
      : `[법률사무소 노아 상담문의] ${name} · ${matter}`;

    const lines = lang === 'en'
      ? [
          `Name: ${name}`,
          `Email: ${email}`,
          `Matter: ${matter}`,
          organization ? `Company / Organization: ${organization}` : '',
          position ? `Position: ${position}` : '',
          country ? `Country: ${country}` : '',
          '',
          'Inquiry:',
          message
        ]
      : [
          `이름: ${name}`,
          `회신 이메일: ${email}`,
          `상담 분야: ${matter}`,
          '',
          '문의 내용:',
          message
        ];

    const text = lines.filter((line, i) => line !== '' || (i > 0 && lines[i - 1] !== '')).join('\n');
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Law Office Noah <info@lawnoah.com>',
        to: 'info@lawnoah.com',
        reply_to: email,
        subject,
        text
      })
    });

    if (!resendResponse.ok) {
      console.error('Resend request failed with status', resendResponse.status);
      return json({ error: 'Mail delivery failed' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('Contact form server error', error?.message || 'unknown');
    return json({ error: 'Server error' }, 500);
  }
}
