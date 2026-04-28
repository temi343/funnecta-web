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
     CONFIRMATION PAGE: robust URL param extraction
     Sources tried in order:
       1. Query string  (?username=...&email=...)
       2. Hash fragment (#username=...&email=...)
       3. Supabase JWT  (access_token email claim)
  ---------------------------------------------------------- */
  const usernameEl  = document.getElementById('display-username');
  const emailEl     = document.getElementById('display-email');
  const welcomeEl   = document.getElementById('display-welcome');

  if (usernameEl && emailEl) {

    // Sanitise: strip HTML to prevent XSS
    function sanitise(str) {
      if (!str) return null;
      var tmp = document.createElement('div');
      tmp.appendChild(document.createTextNode(decodeURIComponent(str)));
      return tmp.innerHTML;
    }

    // Decode a JWT and return its payload object (no verification needed here)
    function decodeJwtPayload(token) {
      try {
        var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        var json   = decodeURIComponent(
          atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    }

    // 1 — Query string
    var searchParams = new URLSearchParams(window.location.search);
    var username     = searchParams.get('username');
    var email        = searchParams.get('email');

    // 2 — Hash fragment (Supabase appends #access_token=...&... here)
    if (!username || !email) {
      var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      username = username || hashParams.get('username');
      email    = email    || hashParams.get('email');

      // 3 — Decode email from Supabase JWT access_token
      if (!email) {
        var accessToken = hashParams.get('access_token');
        if (accessToken) {
          var payload = decodeJwtPayload(accessToken);
          if (payload) {
            email    = email    || payload.email || null;
            username = username || (payload.user_metadata && payload.user_metadata.username) || null;
          }
        }
      }
    }

    usernameEl.textContent = sanitise(username) || 'User';
    emailEl.textContent    = sanitise(email)    || '—';

    // Personalised welcome greeting
    if (welcomeEl) {
      var displayName = sanitise(username) || 'there';
      welcomeEl.textContent = 'Welcome, ' + displayName + '! 🎉';
    }
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
