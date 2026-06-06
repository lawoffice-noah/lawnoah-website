const revealTargets = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    } else {
      entry.target.classList.remove('show');
    }
  });
}, {
  threshold: 0.18,
  rootMargin: '0px 0px -40px 0px'
});

revealTargets.forEach((target) => observer.observe(target));

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (formStatus) {
      formStatus.textContent = '전송 중입니다.';
    }

    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send');
      }

      contactForm.reset();
      if (formStatus) {
        formStatus.textContent = '문의가 전송되었습니다. 확인 후 연락드리겠습니다.';
      }
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = '전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      }
    }
  });
}
