/* ============================================================
   FUNNECTA – script.js
   Handles: navbar scroll, mobile menu, scroll animations,
            Intersection Observer reveals, confirm page params
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     NAVBAR: scroll shadow + mobile menu toggle
  ---------------------------------------------------------- */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile menu when a link inside it is clicked
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close mobile menu on outside click
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----------------------------------------------------------
     INTERSECTION OBSERVER: scroll-triggered reveals
  ---------------------------------------------------------- */
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  };

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay ? parseInt(el.dataset.delay, 10) : 0;

        if (delay > 0) {
          setTimeout(function () { el.classList.add('visible'); }, delay);
        } else {
          el.classList.add('visible');
        }

        revealObserver.unobserve(el); // Animate once
      }
    });
  }, observerOptions);

  // Elements to observe
  const revealSelectors = [
    '.reveal',
    '.reveal-card',
    '.slide-left',
    '.slide-right',
    '.reveal-section'
  ];

  revealSelectors.forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      revealObserver.observe(el);
    });
  });

  /* ----------------------------------------------------------
     STAGGERED CARD DELAYS (how-it-works section)
     Additional JS-driven delay variation for smoothness
  ---------------------------------------------------------- */
  document.querySelectorAll('.reveal-card').forEach(function (card, index) {
    if (!card.dataset.delay) {
      card.dataset.delay = (index * 150).toString();
    }
  });

  /* ----------------------------------------------------------
     CONFIRMATION PAGE: URL param extraction
  ---------------------------------------------------------- */
  const usernameEl = document.getElementById('display-username');
  const emailEl    = document.getElementById('display-email');

  if (usernameEl && emailEl) {
    const params   = new URLSearchParams(window.location.search);
    const username = params.get('username');
    const email    = params.get('email');

    // Sanitise: strip HTML to prevent XSS
    function sanitise(str) {
      if (!str) return null;
      const tmp = document.createElement('div');
      tmp.appendChild(document.createTextNode(str));
      return tmp.innerHTML;
    }

    usernameEl.textContent = sanitise(username) || 'Unknown';
    emailEl.textContent    = sanitise(email)    || 'Unknown';
  }

  /* ----------------------------------------------------------
     SMOOTH ANCHOR SCROLL (augment native behavior on older
     browsers and account for fixed navbar height)
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
        10
      ) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

})();
