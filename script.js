/**
 * Ethereal Luxury Fragrance House - Unified Scripts
 * Vanilla JS only - No frameworks, no dependencies
 */

(function () {
  'use strict';

  // Constants
  const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
  const WEB3FORMS_ACCESS_KEY = 'dd38788d-08e6-4d7c-9d96-13631d5d9539';

  /* --------------------------------------------------------------------------
     1. DOM Ready Initialization
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initStickyHeader();
    initMobileNav();
    initScrollReveal();
    initActiveNavLinks();
    initEnquiryForms();
    handleQueryPrefill();
  });

  /* --------------------------------------------------------------------------
     2. Sticky Header with Scroll Threshold
     -------------------------------------------------------------------------- */
  function initStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 40) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial state
  }

  /* --------------------------------------------------------------------------
     3. Mobile Navigation Drawer
     -------------------------------------------------------------------------- */
  function initMobileNav() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle');
    const drawer = document.querySelector('.mobile-drawer');
    if (!toggleBtn || !drawer) return;

    const toggleMenu = (open) => {
      const isOpen = open !== undefined ? open : !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    toggleBtn.addEventListener('click', () => toggleMenu());

    // Close when clicking any nav link inside drawer
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        toggleMenu(false);
      }
    });
  }

  /* --------------------------------------------------------------------------
     4. Scroll Reveal Animations (IntersectionObserver)
     -------------------------------------------------------------------------- */
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!revealElements.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      revealElements.forEach(el => observer.observe(el));
    } else {
      // Fallback for older browsers
      revealElements.forEach(el => el.classList.add('is-revealed'));
    }
  }

  /* --------------------------------------------------------------------------
     5. Active Link Highlight
     -------------------------------------------------------------------------- */
  function initActiveNavLinks() {
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    const links = document.querySelectorAll('.nav-link, .mobile-nav-link');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      // Handle root vs nested
      const cleanHref = href.replace(/\/index\.html$/, '/');
      if (
        (cleanHref === '/' && (currentPath === '/' || currentPath === '')) ||
        (cleanHref !== '/' && currentPath.startsWith(cleanHref))
      ) {
        link.classList.add('active');
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Prefill Perfume from Query Param (e.g. ?perfume=aurora-musk)
     -------------------------------------------------------------------------- */
  function handleQueryPrefill() {
    try {
      const params = new URLSearchParams(window.location.search);
      const perfumeSlug = params.get('perfume');
      if (!perfumeSlug) return;

      const perfumeSelects = document.querySelectorAll('select[name="perfume"]');
      perfumeSelects.forEach(select => {
        const option = Array.from(select.options).find(opt => 
          opt.value.toLowerCase().includes(perfumeSlug.toLowerCase()) ||
          opt.text.toLowerCase().includes(perfumeSlug.replace('-', ' ').toLowerCase())
        );
        if (option) {
          select.value = option.value;
        }
      });
    } catch (e) {
      // Non-fatal query parsing
    }
  }

  /* --------------------------------------------------------------------------
     7. Form Validation & Web3Forms AJAX Submission
     -------------------------------------------------------------------------- */
  function initEnquiryForms() {
    const forms = document.querySelectorAll('form[data-ethereal-form], form#contact-enquiry-form, form#home-enquiry-form');
    console.log(`[Ethereal Form] Initializing ${forms.length} enquiry forms on page.`);
    forms.forEach(form => setupForm(form));
  }

  function setupForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const feedbackEl = form.querySelector('.form-feedback');

    console.log(`[Ethereal Form] Setting up listener for form #${form.id || 'unnamed'}`);

    // Real-time error clearing
    form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => clearError(input));
      input.addEventListener('change', () => clearError(input));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log(`[Ethereal Form] Submit event triggered on form #${form.id}`);

      // Check Honeypot field (spam prevention) - must check .checked, not .value
      const botField = form.querySelector('input[name="botcheck"]');
      if (botField && botField.checked) {
        console.warn('[Ethereal Form] Spam bot detected: honeypot checkbox was checked.');
        showFeedback(feedbackEl, 'Submission flagged as automated.', 'error');
        return;
      }

      // Validate Fields
      const isValid = validateForm(form);
      if (!isValid) {
        console.warn('[Ethereal Form] Validation failed on required fields.');
        showFeedback(feedbackEl, 'Please correct the highlighted fields before submitting.', 'error');
        return;
      }

      // Prepare payload
      const formData = new FormData(form);
      const jsonObject = {};
      formData.forEach((value, key) => {
        if (key !== 'botcheck') {
          jsonObject[key] = value.trim();
        }
      });

      // Ensure access key is present
      if (!jsonObject.access_key) {
        jsonObject.access_key = WEB3FORMS_ACCESS_KEY;
      }

      // Subject line and sender label for email notification
      jsonObject.subject = `New Fragrance Consultation Enquiry - ${jsonObject.perfume || 'Bespoke Request'}`;
      jsonObject.from_name = 'Ethereal Fragrance Atelier';

      console.log('[Ethereal Form] Submitting payload to Web3Forms:', {
        ...jsonObject,
        access_key: jsonObject.access_key.slice(0, 8) + '...'
      });

      // Submit State UI
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg style="animation: spin 1s linear infinite; width:16px; height:16px; margin-right:8px; vertical-align:middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#c9a24d"></path>
          </svg>
          Transmitting Enquiry...
        `;
      }
      showFeedback(feedbackEl, 'Transmitting consultation details to the atelier...', 'info');

      try {
        const response = await fetch(WEB3FORMS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(jsonObject)
        });

        console.log(`[Ethereal Form] Web3Forms HTTP status: ${response.status}`);
        const result = await response.json();
        console.log('[Ethereal Form] Web3Forms response data:', result);

        // Report diagnostic log to local server
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: response.status, result: result })
        }).catch(() => {});

        if (response.status === 200 && result.success === true) {
          console.log('[Ethereal Form] Submission succeeded! Message:', result.message);
          showFeedback(feedbackEl, result.message || 'Enquiry successfully transmitted. Redirecting...', 'success');
          form.reset();
          // Redirect to thank-you only after success === true
          setTimeout(() => {
            window.location.href = '/thank-you/';
          }, 1000);
        } else {
          console.error('[Ethereal Form] Web3Forms rejected submission:', result);
          const errorMsg = result.message || `Submission error (HTTP ${response.status}). Please contact our atelier directly.`;
          showFeedback(feedbackEl, errorMsg, 'error');
        }
      } catch (err) {
        console.error('[Ethereal Form] Fetch error:', err);
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fetchError: err.message || String(err) })
        }).catch(() => {});
        showFeedback(feedbackEl, `Network error: ${err.message || 'Could not connect'}. Please call +91 7011476807 or email etherealperfumes.official@gmail.com.`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     8. Client-side Form Validation
     -------------------------------------------------------------------------- */
  function validateForm(form) {
    let valid = true;

    // Full Name
    const nameInput = form.querySelector('input[name="name"]');
    if (nameInput) {
      const val = nameInput.value.trim();
      if (!val || val.length < 2) {
        setError(nameInput, 'Please share your full name (at least 2 characters).');
        valid = false;
      }
    }

    // Email
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
      const val = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val || !emailRegex.test(val)) {
        setError(emailInput, 'Please provide a valid email address.');
        valid = false;
      }
    }

    // Phone
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) {
      const val = phoneInput.value.trim();
      const phoneDigits = val.replace(/\D/g, '');
      if (!val || phoneDigits.length < 8) {
        setError(phoneInput, 'Please provide a valid phone number (min 8 digits).');
        valid = false;
      }
    }

    // Perfume Select
    const perfumeSelect = form.querySelector('select[name="perfume"]');
    if (perfumeSelect) {
      const val = perfumeSelect.value;
      if (!val || val === '') {
        setError(perfumeSelect, 'Please select a fragrance or consultation option.');
        valid = false;
      }
    }

    // Message
    const messageInput = form.querySelector('textarea[name="message"]');
    if (messageInput) {
      const val = messageInput.value.trim();
      if (!val || val.length < 10) {
        setError(messageInput, 'Please share a brief note (minimum 10 characters).');
        valid = false;
      }
    }

    return valid;
  }

  function setError(input, message) {
    input.classList.add('is-invalid');
    const group = input.closest('.form-group');
    if (group) {
      let errEl = group.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'form-error';
        group.appendChild(errEl);
      }
      errEl.textContent = message;
    }
  }

  function clearError(input) {
    input.classList.remove('is-invalid');
    const group = input.closest('.form-group');
    if (group) {
      const errEl = group.querySelector('.form-error');
      if (errEl) {
        errEl.textContent = '';
      }
    }
  }

  function showFeedback(feedbackEl, message, type) {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className = 'form-feedback';
    if (type === 'error') {
      feedbackEl.classList.add('is-error');
    } else if (type === 'success') {
      feedbackEl.classList.add('is-success');
    } else if (type === 'info' || message) {
      feedbackEl.classList.add('is-info');
    }
  }

})();
