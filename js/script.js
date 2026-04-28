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
     CONFIRMATION PAGE: PKCE code exchange
     supabase_flutter uses AuthFlowType.pkce, so Supabase
     redirects here with ?code=PKCE_CODE instead of the old
     implicit #access_token=... hash. The code MUST be
     exchanged with Supabase to mark the user as confirmed.
  ---------------------------------------------------------- */
  const usernameEl  = document.getElementById('display-username');
  const emailEl     = document.getElementById('display-email');
  const welcomeEl   = document.getElementById('display-welcome');

  if (usernameEl && emailEl) {
    const loadingEl  = document.getElementById('confirm-loading');
    const errorEl    = document.getElementById('confirm-error');
    const errorMsgEl = document.getElementById('confirm-error-msg');
    const successEl  = document.getElementById('confirm-success');
    const iconWrapEl = document.getElementById('confirm-icon-wrap');

    function sanitise(str) {
      if (!str) return null;
      var tmp = document.createElement('div');
      tmp.appendChild(document.createTextNode(String(str)));
      return tmp.innerHTML;
    }

    function decodeJwtPayload(token) {
      try {
        var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        var json = decodeURIComponent(
          atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    }

    function showSuccess(username, email) {
      if (loadingEl)  loadingEl.style.display  = 'none';
      if (errorEl)    errorEl.style.display    = 'none';
      if (successEl)  successEl.style.display  = 'block';
      if (iconWrapEl) iconWrapEl.style.display = 'flex';

      var name = sanitise(username) || 'User';
      var mail = sanitise(email)    || '—';
      usernameEl.textContent = name;
      emailEl.textContent    = mail;
      if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + name + '! \uD83C\uDF89';
    }

    function showError(msg) {
      if (loadingEl)  loadingEl.style.display  = 'none';
      if (successEl)  successEl.style.display  = 'none';
      if (iconWrapEl) iconWrapEl.style.display = 'none';
      if (errorEl)    errorEl.style.display    = 'block';
      if (errorMsgEl) errorMsgEl.textContent   =
        msg || 'This confirmation link has expired or is invalid.';
    }

    var params = new URLSearchParams(window.location.search);
    var code   = params.get('code');

    if (code) {
      // PKCE flow: exchange the auth code to confirm the user server-side
      if (window.supabase) {
        var client = window.supabase.createClient(
          'https://dilhsyykvfxdieswqolm.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpbGhzeXlrdmZ4ZGllc3dxb2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzM2NjgsImV4cCI6MjA4NjEwOTY2OH0.4E04DDIgkvEJm7Ff2OlqYNTS64NVIC6RvBhtOfYyMtQ',
          { auth: { flowType: 'pkce', detectSessionInUrl: false } }
        );
        client.auth.exchangeCodeForSession(code)
          .then(function (result) {
            if (result.error) {
              showError('Verification failed: ' + result.error.message +
                '. Please sign up again.');
            } else if (result.data && result.data.session) {
              var user     = result.data.session.user;
              var email    = user.email || '—';
              var username = (user.user_metadata && user.user_metadata.username)
                             || email.split('@')[0];
              showSuccess(username, email);
            } else {
              showError('Verification failed. Please sign up again or contact support.');
            }
          })
          .catch(function () {
            showError('Network error during verification. Please check your connection and try again.');
          });
      } else {
        // SDK not yet loaded — reload once after a short delay
        setTimeout(function () {
          if (window.supabase) {
            window.location.reload();
          } else {
            showError('Failed to load the verification library. Please refresh this page.');
          }
        }, 2500);
      }
    } else {
      // Fallback: implicit flow — tokens in hash (older Supabase configs)
      var hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      var accessToken = hashParams.get('access_token');

      if (accessToken) {
        var payload  = decodeJwtPayload(accessToken);
        var email    = (payload && payload.email) || '—';
        var username = (payload && payload.user_metadata && payload.user_metadata.username)
                       || (email !== '—' ? email.split('@')[0] : 'User');
        showSuccess(username, email);
      } else {
        showError('No confirmation code found. Please use the original link from your email.');
      }
    }
  }

  /* ----------------------------------------------------------
     OPEN APP DEEP LINK
     Tries funnecta://auth-callback first.
     If the app is not installed the device won't respond,
     so after 2 s we show the APK download fallback link.
  ---------------------------------------------------------- */
  window.openApp = function () {
    var fallbackEl = document.getElementById('app-fallback');
    var deepLink   = 'funnecta://auth-callback';

    // Attempt to open the app via custom URI scheme
    window.location.href = deepLink;

    // If the app didn't open within 2 s, reveal the download fallback
    setTimeout(function () {
      if (fallbackEl) { fallbackEl.style.display = 'block'; }
    }, 2000);
  };

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
