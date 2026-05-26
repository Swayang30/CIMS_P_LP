/**
 * SBIHM Hotel Management Landing Page — script.js
 * Plan D Media | 2026
 *
 * Modules:
 * 1.  Sticky header shadow on scroll
 * 2.  Mobile nav drawer
 * 3.  Smooth scroll with offset for sticky header
 * 4.  Animated count-up stats
 * 5.  Testimonial carousel
 * 6.  FAQ accordion
 * 7.  Lead form validation + submission
 * 8.  Brochure download modal
 * 9.  WhatsApp button bounce (CSS-driven; JS pause on hover)
 * 10. Exit-intent modal
 * 11. Scroll-to-top button
 * 12. DataLayer / GTM event tracking
 */

'use strict';

/* ─── Webhook URL (single definition used by all form handlers) ───────────── */

var WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwkNeKtIFI9DU1UerdkMesK01P2z65JWTbLnO2xHzSll6o-Y22Mc7kbqG2BwllFGaMBHg/exec';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function pushEvent(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}

/* ─── 1. Sticky header shadow ─────────────────────────────────────────────── */

(function initStickyHeader() {
  const header = $('#site-header');
  if (!header) return;

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── 2. Mobile nav drawer ────────────────────────────────────────────────── */

(function initMobileDrawer() {
  const hamburger   = $('#hamburger');
  const drawer      = $('#mobile-drawer');
  const closeBtn    = $('#drawer-close');
  const backdrop    = $('#drawer-backdrop');
  const drawerLinks = $$('.mobile-drawer__link');

  if (!hamburger || !drawer) return;

  function openDrawer() {
    drawer.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
  }

  function closeDrawer() {
    drawer.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus();
  }

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.getAttribute('aria-hidden') === 'false';
    isOpen ? closeDrawer() : openDrawer();
  });

  closeBtn && closeBtn.addEventListener('click', closeDrawer);
  backdrop && backdrop.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));

  /* Close drawer when brochure trigger inside it is clicked */
  document.addEventListener('click', e => {
    if (e.target.closest('#mobile-drawer [data-brochure-trigger]')) closeDrawer();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
      closeDrawer();
    }
  });
})();

/* ─── 3. Smooth scroll with header offset ────────────────────────────────── */

(function initSmoothScroll() {
  function getHeaderOffset() {
    const header = $('#site-header');
    return header ? header.offsetHeight + 8 : 72;
  }

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') return;

    const target = $(targetId);
    if (!target) return;

    e.preventDefault();

    const offset = getHeaderOffset();
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    if (prefersReducedMotion()) {
      window.scrollTo(0, top);
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }

    /* Update focus for accessibility */
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });

    /* Track apply CTA clicks */
    const track = link.dataset.track;
    if (track) {
      pushEvent(track, {
        cta_location: link.dataset.ctaLocation || 'unknown',
        course: 'BHM'
      });
    }
  });
})();

/* ─── 4. Animated count-up stats ─────────────────────────────────────────── */

(function initCountUp() {
  const stats = $$('[data-target]');
  if (!stats.length || prefersReducedMotion()) {
    /* Just show final values without animation */
    stats.forEach(el => {
      el.textContent = Number(el.dataset.target).toLocaleString('en-IN') + (el.dataset.suffix || '');
    });
    return;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCount(el) {
    const target  = parseInt(el.dataset.target, 10);
    const suffix  = el.dataset.suffix || '';
    const duration = 1800;
    const start   = performance.now();

    function frame(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = Math.round(easeOutQuart(progress) * target);
      el.textContent = value.toLocaleString('en-IN') + suffix;

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  stats.forEach(el => observer.observe(el));
})();

/* ─── 5. Testimonial carousel ────────────────────────────────────────────── */

(function initCarousel() {
  const carousel  = $('#testimonials-carousel');
  const track     = $('#testimonials-track');
  const prevBtn   = $('#carousel-prev');
  const nextBtn   = $('#carousel-next');
  const dotsWrap  = $('#carousel-dots');

  if (!carousel || !track) return;

  const slides = $$('.testimonial-card', track);
  let current   = 0;
  let autoTimer = null;
  const INTERVAL = 6000;

  /* Build dot buttons */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.dataset.index = i;
    if (i === 0) dot.classList.add('active');
    dotsWrap && dotsWrap.appendChild(dot);
  });

  const dots = $$('.carousel-dot', dotsWrap);

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i !== current ? 'true' : 'false');
    });

    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function startAuto() {
    if (prefersReducedMotion()) return;
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), INTERVAL);
  }

  function stopAuto() {
    clearInterval(autoTimer);
  }

  prevBtn && prevBtn.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  nextBtn && nextBtn.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  dotsWrap && dotsWrap.addEventListener('click', e => {
    const dot = e.target.closest('.carousel-dot');
    if (dot) { goTo(parseInt(dot.dataset.index, 10)); startAuto(); }
  });

  /* Pause on hover */
  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);
  carousel.addEventListener('focusin',    stopAuto);
  carousel.addEventListener('focusout',   startAuto);

  /* Touch/swipe support */
  let touchStartX = 0;

  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
      startAuto();
    }
  }, { passive: true });

  /* Keyboard navigation */
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { goTo(current - 1); stopAuto(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); stopAuto(); }
  });

  /* Init */
  goTo(0);
  startAuto();
})();

/* ─── 6. FAQ accordion ────────────────────────────────────────────────────── */

(function initFAQ() {
  const faqList = $('#faq-list');
  if (!faqList) return;

  function openItem(item) {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    item.classList.add('faq-item--open');
    btn.setAttribute('aria-expanded', 'true');
    answer.removeAttribute('hidden');
    answer.classList.remove('faq-answer--hidden');
  }

  function closeItem(item) {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    item.classList.remove('faq-item--open');
    btn.setAttribute('aria-expanded', 'false');
    answer.setAttribute('hidden', '');
    answer.classList.add('faq-answer--hidden');
  }

  faqList.addEventListener('click', e => {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;

    const item   = btn.closest('.faq-item');
    const isOpen = item.classList.contains('faq-item--open');

    /* Close all first */
    $$('.faq-item', faqList).forEach(closeItem);

    /* Toggle clicked item */
    if (!isOpen) openItem(item);
  });

  /* Keyboard: arrow keys to navigate between items */
  faqList.addEventListener('keydown', e => {
    const btn  = e.target.closest('.faq-question');
    if (!btn) return;

    const items   = $$('.faq-item', faqList);
    const current = items.findIndex(item => item.contains(btn));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[current + 1];
      next && next.querySelector('.faq-question').focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[current - 1];
      prev && prev.querySelector('.faq-question').focus();
    }
  });
})();

/* ─── 7. Lead form validation + submission ────────────────────────────────── */

(function initLeadForm() {
  const form       = $('#apply-form');
  const submitBtn  = $('#submit-btn');
  const formWrap   = $('#apply-form-wrap');
  const thankyou   = $('#apply-thankyou');
  const nameField  = thankyou && $('#thankyou-name', thankyou);
  const errBanner  = $('#form-error-message');

  if (!form) return;

  const validators = {
    name:   v => v.trim().length >= 2 ? null : 'Please enter your full name.',
    phone:  v => /^[6-9][0-9]{9}$/.test(v.replace(/\s/g, '')) ? null : 'Please enter a valid 10-digit Indian mobile number.',
    email:  v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Please enter a valid email address.',
    city:   v => v.trim().length >= 2 ? null : 'Please enter your city.',
    stream: v => v !== '' ? null : 'Please select your Class 12 stream.',
  };

  function validateField(fieldName, value) {
    return validators[fieldName] ? validators[fieldName](value) : null;
  }

  function showFieldError(input, message) {
    const errId  = input.id ? `error-${input.name}` : null;
    const errEl  = errId ? $(`#${errId}`) : null;
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    if (errEl) errEl.textContent = message;
  }

  function clearFieldError(input) {
    const errId = input.id ? `error-${input.name}` : null;
    const errEl = errId ? $(`#${errId}`) : null;
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    if (errEl) errEl.textContent = '';
  }

  /* Blur-time validation */
  $$('input, select', form).forEach(input => {
    input.addEventListener('blur', () => {
      if (!input.name || input.type === 'radio' || input.type === 'checkbox') return;
      const err = validateField(input.name, input.value);
      err ? showFieldError(input, err) : clearFieldError(input);
    });

    input.addEventListener('input', () => {
      if (input.classList.contains('error')) {
        const err = validateField(input.name, input.value);
        err ? showFieldError(input, err) : clearFieldError(input);
      }
    });
  });

  function getCampusValue() {
    const hidden = form.querySelector('input[name="campus"]');
    return hidden ? hidden.value : '';
  }

  function validateAll() {
    let valid = true;
    const errors = [];

    ['name', 'phone', 'email', 'city', 'stream'].forEach(name => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      const err = validateField(name, input.value);
      if (err) {
        showFieldError(input, err);
        if (valid) { input.focus(); }
        valid = false;
        errors.push(err);
      } else {
        clearFieldError(input);
      }
    });

    return valid;
  }

  function setButtonLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Submitting…' : 'Apply Now & Get Brochure →';
  }

  function showError(message) {
    if (!errBanner) return;
    errBanner.textContent = message;
    errBanner.removeAttribute('hidden');
    errBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    if (!errBanner) return;
    errBanner.setAttribute('hidden', '');
    errBanner.textContent = '';
  }

  /* Check honeypot */
  function isBot() {
    const hp = form.querySelector('[name="_honey"]');
    return hp && hp.value.length > 0;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideError();

    if (isBot()) {
      e.stopImmediatePropagation();
      return;
    }

    if (!validateAll()) {
      e.stopImmediatePropagation();
      return;
    }

    pushEvent('lead_submit', {
      course: 'HM-CIMS',
      campus: getCampusValue(),
      source: form.querySelector('[name="source"]')?.value || '',
    });
  });
})();

/* ─── 7b. Hero Enquiry Form (in-hero form) ────────────────────────────────── */

(function initHeroForm() {
  const form        = $('#hero-enquiry-form');
  const submitBtn   = $('#hf-submit-btn');
  const formContainer = $('#hero-form-container');
  const successEl   = $('#hero-form-success');

  if (!form) return;

  /* ── Validators ── */
  const validators = {
    name:  v => v.trim().length >= 2 ? null : 'Please enter your full name.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Please enter a valid email address.',
    phone: v => /^[6-9][0-9]{9}$/.test(v.replace(/\s/g, '')) ? null : 'Enter a valid 10-digit mobile number.',
  };

  /* ── Helpers ── */
  function setError(groupId, message) {
    const group = $(`#${groupId}`);
    const errEl = $(`#err-${groupId.replace('field-', '')}`);
    if (group) group.classList.add('hero-form__group--error');
    if (errEl) errEl.textContent = message || '';
  }

  function clearError(groupId) {
    const group = $(`#${groupId}`);
    const errEl = $(`#err-${groupId.replace('field-', '')}`);
    if (group) group.classList.remove('hero-form__group--error');
    if (errEl) errEl.textContent = '';
  }

  function validateField(name, value) {
    return validators[name] ? validators[name](value) : null;
  }

  function getCampusValues() {
    const hidden = form ? form.querySelector('input[name="campus"]') : null;
    return hidden ? [hidden.value] : [];
  }

  /* ── Blur-time validation ── */
  $$('input:not([type="checkbox"]), select', form).forEach(input => {
    input.addEventListener('blur', () => {
      const name = input.name;
      const groupId = `field-${name === 'name' ? 'fullname' : name}`;
      const err = validateField(name, input.value);
      err ? setError(groupId, err) : clearError(groupId);
    });

    input.addEventListener('input', () => {
      const name = input.name;
      const groupId = `field-${name === 'name' ? 'fullname' : name}`;
      const group = $(`#${groupId}`);
      if (group && group.classList.contains('hero-form__group--error')) {
        const err = validateField(name, input.value);
        err ? setError(groupId, err) : clearError(groupId);
      }
    });
  });

  /* Phone field — digits only */
  const phoneInput = $('#hf-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
  }

  /* Campus is a single hidden field — no checkbox listener needed */

  /* ── Full validation ── */
  function validateAll() {
    let firstInvalid = null;
    let valid = true;

    /* Text/select fields */
    const fieldMap = [
      { name: 'name', group: 'field-fullname' },
      { name: 'email',    group: 'field-email' },
      { name: 'phone',    group: 'field-phone' },
    ];

    fieldMap.forEach(({ name, group }) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      const err = validateField(name, input.value);
      if (err) {
        setError(group, err);
        if (!firstInvalid) firstInvalid = input;
        valid = false;
      } else {
        clearError(group);
      }
    });

    if (firstInvalid) firstInvalid.focus();
    return valid;
  }

  /* ── Submit ── */
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!validateAll()) {
      e.stopImmediatePropagation();
      return;
    }

    pushEvent('hero_lead_submit', {
      course: 'HM-CIMS',
      campus: getCampusValues().join(', '),
    });
  });

  /* ── Toast dismiss logic ── */
  function dismissToast() {
    if (!successEl || successEl.hasAttribute('hidden')) return;
    successEl.classList.add('toast--dismissing');
    successEl.addEventListener('animationend', () => {
      successEl.setAttribute('hidden', '');
      successEl.classList.remove('toast--dismissing');
    }, { once: true });
  }

  const toastCloseBtn = $('#toast-close-btn');
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', () => {
      clearTimeout(window.__toastTimer);
      dismissToast();
    });
  }

  /* Pause auto-dismiss on hover */
  if (successEl) {
    successEl.addEventListener('mouseenter', () => {
      clearTimeout(window.__toastTimer);
      const progressBar = successEl.querySelector('.success-toast__progress');
      if (progressBar) progressBar.style.animationPlayState = 'paused';
    });

    successEl.addEventListener('mouseleave', () => {
      const progressBar = successEl.querySelector('.success-toast__progress');
      if (progressBar) progressBar.style.animationPlayState = 'running';
      window.__toastTimer = setTimeout(() => dismissToast(), 4000);
    });
  }
})();

/* ─── 8. Brochure gate modal ──────────────────────────────────────────────── */

var BROCHURE_URL      = 'assets/campus/Prospectus%20CIMS%202026.pdf';
var BROCHURE_FILENAME = 'CIMS-Allied-Health-Science-Prospectus-2026.pdf';

function openBrochureModal() {
  const modal = $('#brochure-modal');
  if (!modal) return;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  const firstInput = modal.querySelector('input:not([type="hidden"])');
  firstInput && firstInput.focus();
  pushEvent('brochure_modal_open', { course: 'CIMS-Paramedical' });
}

function closeBrochureModal() {
  const modal = $('#brochure-modal');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

(function initBrochureModal() {
  /* Open modal on any [data-brochure-trigger] click */
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-brochure-trigger]')) {
      e.preventDefault();
      openBrochureModal();
    }
  });

  const closeBtn = $('#brochure-modal-close');
  const backdrop = $('#brochure-modal-backdrop');
  const form     = $('#brochure-form');

  closeBtn && closeBtn.addEventListener('click', closeBrochureModal);
  backdrop && backdrop.addEventListener('click', closeBrochureModal);

  document.addEventListener('keydown', e => {
    const modal = $('#brochure-modal');
    if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) closeBrochureModal();
  });

  if (!form) return;

  /* Phone — digits only */
  const phoneInput = $('#brochure-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
  }

  /* Clear error on input */
  ['brochure-name', 'brochure-phone', 'brochure-email'].forEach(id => {
    const el = $(`#${id}`);
    if (!el) return;
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const errId = id.replace('brochure-', 'brochure-error-');
      const errEl = $(`#${errId}`);
      if (errEl) errEl.textContent = '';
    });
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const nameEl      = $('#brochure-name');
    const phoneEl     = $('#brochure-phone');
    const emailEl     = $('#brochure-email');
    const submitBtn   = $('#brochure-submit-btn');
    let firstInvalid  = null;
    let valid         = true;

    function setErr(el, errId, msg) {
      el.classList.add('error');
      const errEl = $(`#${errId}`);
      if (errEl) errEl.textContent = msg;
      if (!firstInvalid) firstInvalid = el;
      valid = false;
    }

    if (!nameEl.value.trim() || nameEl.value.trim().length < 2) {
      setErr(nameEl, 'brochure-error-name', 'Please enter your full name.');
    }
    if (!/^[6-9][0-9]{9}$/.test(phoneEl.value.replace(/\s/g, ''))) {
      setErr(phoneEl, 'brochure-error-phone', 'Enter a valid 10-digit mobile number.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
      setErr(emailEl, 'brochure-error-email', 'Please enter a valid email address.');
    }

    if (!valid) {
      firstInvalid && firstInvalid.focus();
      return;
    }

    /* Loading state */
    const btnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Downloading…'; }

    pushEvent('brochure_download', { course: 'CIMS-Paramedical' });

    /* Send lead to webhook (fire-and-forget — don't block the download on it) */
    var fd = new FormData(form);
    fetch(WEBHOOK_URL, { method: 'POST', body: fd, mode: 'no-cors' })
      .catch(function() { /* silent — download still proceeds */ });

    /* Trigger PDF download */
    var a = document.createElement('a');
    a.href     = BROCHURE_URL;
    a.download = BROCHURE_FILENAME;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    closeBrochureModal();
    form.reset();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = btnText; }
  });
})();

/* ─── 11. Scroll-to-top button ────────────────────────────────────────────── */

(function initScrollToTop() {
  const btn = $('#scroll-to-top');
  if (!btn) return;

  function onScroll() {
    const shouldShow = window.scrollY > 600;
    if (shouldShow) {
      btn.removeAttribute('hidden');
    } else {
      btn.setAttribute('hidden', '');
    }
  }

  btn.addEventListener('click', () => {
    if (prefersReducedMotion()) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── 12. Event tracking — click delegation ───────────────────────────────── */

(function initTracking() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-track]');
    if (!el) return;

    const track = el.dataset.track;

    switch (track) {
      case 'phone_click':
        pushEvent('phone_click', { course: 'BHM' });
        break;
      case 'whatsapp_click':
        pushEvent('whatsapp_click', { course: 'BHM' });
        break;
      case 'apply_cta_click':
        pushEvent('apply_cta_click', {
          course: 'BHM',
          cta_location: el.dataset.ctaLocation || 'unknown',
        });
        break;
    }
  });
})();

/* ─── Active nav highlighting on scroll ───────────────────────────────────── */

(function initNavHighlight() {
  const sections = $$('section[id], div[id="apply"]');
  const navLinks = $$('.site-nav__link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;

      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${id}`);
        link.setAttribute('aria-current', href === `#${id}` ? 'page' : 'false');
      });
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  sections.forEach(sec => observer.observe(sec));
})();

/* ===== CIMS Lead Capture — Google Apps Script Webhook ===== */
(function () {
  'use strict';

  var THANK_YOU_URL = 'thankyou.html';

  function showError(form, btn, btnHTML) {
    var banner = form.querySelector('#form-error-message, .form-error-banner');
    var msg    = 'Something went wrong. Please call us at +91 8158881234 or try again.';
    if (banner) {
      banner.textContent = msg;
      banner.removeAttribute('hidden');
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      var errEl = form.querySelector('.hero-form__error');
      if (errEl) errEl.textContent = msg;
    }
    if (btn) { btn.disabled = false; btn.innerHTML = btnHTML; }
  }

  function handleSubmit(form) {
    return function (e) {
      e.preventDefault();

      var btn     = form.querySelector('[type="submit"]');
      var btnHTML = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Submitting…'; }

      var body = new FormData(form);
      /* Ensure wa_optin sends Yes/No explicitly regardless of checkbox state */
      var waOptin = form.querySelector('[name="wa_optin"]');
      if (waOptin) body.set('wa_optin', waOptin.checked ? 'Yes' : 'No');

      fetch(WEBHOOK_URL, {
        method: 'POST',
        body: body,
        mode: 'no-cors',
        keepalive: true
      })
      .then(function () {
        /* Fetch resolved = request delivered and processed = success.
           In no-cors mode the response is opaque and cannot be read,
           so we redirect on resolve rather than parsing the body. */
        window.location.href = THANK_YOU_URL;
      })
      .catch(function () {
        /* Genuine network failure — do not redirect */
        showError(form, btn, btnHTML);
      });
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[data-cims-lead]').forEach(function (form) {
      form.addEventListener('submit', handleSubmit(form));
    });
  });
})();
