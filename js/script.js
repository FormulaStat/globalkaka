/* js/script.js
   GlobalstoxFX - UI enhancements
   - sticky header
   - smooth scroll with header offset
   - animated counters using IntersectionObserver
   - contact form validation & accessible feedback
   - mobile menu toggle improvements
*/

(() => {
  /* ---------- Helpers ---------- */
  const q = (sel, ctx = document) => ctx.querySelector(sel);
  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Sticky Header ---------- */
  const header = q('.site-header');
  const STICKY_OFFSET = 48; // px scrolled before adding sticky class

  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > STICKY_OFFSET) {
      header.classList.add('is-sticky');
    } else {
      header.classList.remove('is-sticky');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // init
  onScroll();

  /* ---------- Mobile Menu Toggle & Behavior ---------- */
  const menuToggle = q('.menu-toggle');
  const mainNav = q('.main-nav');

  if (menuToggle && mainNav) {
    // toggle
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      mainNav.classList.toggle('active');
      // animate icon (basic) - swap innerText from "☰" to "✕"
      menuToggle.innerText = mainNav.classList.contains('active') ? '✕' : '☰';
    });

    // Close menu when clicking a link
    qa('.main-nav a').forEach((link) => {
      link.addEventListener('click', () => {
        if (mainNav.classList.contains('active')) {
          mainNav.classList.remove('active');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.innerText = '☰';
        }
      });
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerText = '☰';
        menuToggle.focus();
      }
    });
  }

  /* ---------- Smooth Scroll with Header Offset ---------- */
  // Use smooth scroll but compensate for sticky header height.
  // Works for internal anchors (<a href="#id">).
  const navLinks = qa('a[href^="#"]');

  function getHeaderOffset() {
    if (!header) return 0;
    // compute header height (if sticky class applied, it may change size)
    return header.getBoundingClientRect().height;
  }

  navLinks.forEach((link) => {
    // ignore links that are just "#" or have "data-no-smooth"
    const href = link.getAttribute('href');
    if (!href || href === '#' || link.dataset.noSmooth !== undefined) return;

    link.addEventListener('click', (e) => {
      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return; // fallback to native behavior

      e.preventDefault();
      const headerOffset = getHeaderOffset();
      // top of target relative to document
      const targetTop = targetEl.getBoundingClientRect().top + window.scrollY;
      // final scroll position
      const scrollTo = Math.max(0, targetTop - headerOffset - 18); // small extra gap
      window.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    });
  });

  /* ---------- Animated Counters (ROI, stats) ---------- */
  // Add elements in HTML like:
  // <div class="counter" data-target="15000">0</div>
  // or <span class="counter" data-target="125">0</span>
  const counters = qa('.counter');

  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        // Get target value (number), fallback to innerText
        const raw = el.getAttribute('data-target') || el.textContent || '0';
        // allow formatting commas in data-target, remove non-digits except dot
        const numericStr = String(raw).replace(/[^0-9.\-]/g, '');
        const isFloat = numericStr.includes('.');
        const target = parseFloat(numericStr) || 0;
        const duration = Number(el.getAttribute('data-duration')) || 1500; // ms
        const start = performance.now();
        const initial = 0;
        const step = (now) => {
          const elapsed = now - start;
          const t = clamp(elapsed / duration, 0, 1);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          const current = initial + (target - initial) * eased;
          el.textContent = isFloat ? current.toFixed(2) : Math.floor(current).toLocaleString();
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            // Final value (format same as above)
            el.textContent = isFloat ? target.toFixed(2) : Math.floor(target).toLocaleString();
            // optional aria-live update
            el.setAttribute('aria-live', 'polite');
          }
        };
        requestAnimationFrame(step);
      });
    }, {
      threshold: 0.4
    });

    counters.forEach((c) => {
      // ensure counter has role and initial text
      if (!c.hasAttribute('role')) c.setAttribute('role', 'status');
      if (!c.textContent.trim()) c.textContent = '0';
      counterObserver.observe(c);
    });
  }

  /* ---------- Contact Form Validation & Accessible Feedback ---------- */
  // Targets <form aria-label="Contact Form"> from HTML
  const contactForm = q('form[aria-label="Contact Form"]') || q('form');

  function createAlertMessage(message, type = 'success') {
    // type: 'success' or 'error'
    const wrapper = document.createElement('div');
    wrapper.className = `form-alert form-alert--${type}`;
    wrapper.setAttribute('role', 'alert');
    wrapper.innerText = message;
    return wrapper;
  }

  function clearFormAlerts(form) {
    qa('.form-alert', form).forEach(el => el.remove());
    qa('.input-error', form).forEach(el => el.classList.remove('input-error'));
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      clearFormAlerts(contactForm);

      const nameEl = q('input[name="name"]', contactForm);
      const emailEl = q('input[name="email"]', contactForm);
      const messageEl = q('textarea[name="message"]', contactForm);
      const submitBtn = q('button[type="submit"]', contactForm);

      const errors = [];

      // Name validation
      const nameVal = nameEl ? nameEl.value.trim() : '';
      if (!nameVal || nameVal.length < 2) {
        errors.push({ field: nameEl, msg: 'Please enter your name (2+ characters).' });
      }

      // Email validation (basic)
      const emailVal = emailEl ? emailEl.value.trim() : '';
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRe.test(emailVal)) {
        errors.push({ field: emailEl, msg: 'Please enter a valid email address.' });
      }

      // Message validation
      const messageVal = messageEl ? messageEl.value.trim() : '';
      if (!messageVal || messageVal.length < 10) {
        errors.push({ field: messageEl, msg: 'Please enter a message (10+ characters).' });
      }

      if (errors.length) {
        // show inline errors (first) and a summary
        errors.forEach(({ field, msg }, i) => {
          if (!field) return;
          // add input-error class for styling (you can style .input-error in CSS)
          field.classList.add('input-error');
          const el = document.createElement('div');
          el.className = 'field-error';
          el.setAttribute('role', 'alert');
          el.innerText = msg;
          // insert after the field
          field.parentNode.insertBefore(el, field.nextSibling);
          if (i === 0) field.focus();
        });
        // add top summary alert
        const summary = createAlertMessage('Please fix the errors in the form and try again.', 'error');
        contactForm.insertBefore(summary, contactForm.firstChild);
        return;
      }

      // If valid: simulate sending, show success message
      if (submitBtn) {
        submitBtn.disabled = true;
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Sending...';
      }

      // Simulated send: replace this block with actual fetch to your endpoint
      setTimeout(() => {
        // show success message
        const success = createAlertMessage('Thanks! Your message has been sent. We will reply within 24 hours.', 'success');
        contactForm.insertBefore(success, contactForm.firstChild);

        // reset form
        contactForm.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Send Inquiry';
        }

        // remove success after 8s
        setTimeout(() => {
          success.remove();
        }, 8000);
      }, 900); // simulate network latency
    });

    // Remove field error when user types
    contactForm.addEventListener('input', (e) => {
      const field = e.target;
      if (field.classList.contains('input-error')) field.classList.remove('input-error');
      const next = field.parentNode.querySelector('.field-error');
      if (next) next.remove();
    });
  }

  /* ---------- Optional: Animated small UI details ---------- */
  // Add a subtle reveal on scroll for elements with .reveal
  const revealEls = qa('.reveal');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------- Debug / init log ---------- */
  // console.info('UI Enhancements initialized');
})();
