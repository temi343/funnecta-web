/* ============================================================
   FUNNECTA – script.js
   ============================================================ */
(function () {
  'use strict';

  /* ── Navbar scroll shadow ── */
  var navbar    = document.getElementById('navbar');
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');

  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Hamburger / mobile menu ── */
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      }
    });
  }

  /* ── Active nav link via IntersectionObserver ── */
  var navLinks = document.querySelectorAll('.nav-link');
  var sections = document.querySelectorAll('section[id]');
  if (sections.length && navLinks.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ── Hero stagger animations ── */
  document.querySelectorAll('.hero-anim').forEach(function (el) {
    var delay = parseFloat(el.dataset.delay || 0) * 1000;
    setTimeout(function () { el.classList.add('animated'); }, delay);
  });

  /* ── Scroll reveal (reveal-el, slide-left, slide-right) ── */
  var revOpts = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };
  var revObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revObs.unobserve(entry.target);
      }
    });
  }, revOpts);
  document.querySelectorAll('.reveal-el, .slide-left, .slide-right').forEach(function (el) {
    revObs.observe(el);
  });

  /* ── FAQ accordion ── */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentElement;
      var wasOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(function (i) {
        i.classList.remove('open');
      });
      // Open clicked if it was closed
      if (!wasOpen) { item.classList.add('open'); }
    });
  });

  /* ── Smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      var top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ── Newsletter ── */
  window.handleNewsletter = function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('.newsletter-btn');
    var input = e.target.querySelector('.newsletter-input');
    if (!input.value || !input.value.includes('@')) {
      input.focus();
      return;
    }
    btn.textContent = 'Subscribed \u2713';
    btn.style.background = '#16a34a';
    btn.disabled = true;
    input.disabled = true;
  };

  /* ── iOS coming-soon toast ── */
  window.showIosComingSoon = function () {
    var toast = document.getElementById('ios-toast');
    if (!toast) return;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.style.transition = 'opacity 0.4s';
      toast.style.opacity = '0';
      setTimeout(function () { toast.style.display = 'none'; toast.style.transition = ''; }, 420);
    }, 3500);
  };


  /* ----------------------------------------------------------
     CONFIRMATION PAGE
     Supports three flows (tried in priority order):
       1. token_hash  ΓÇô Direct link from updated Supabase email
                        template using {{ .TokenHash }}. Calls
                        verifyOtp() ΓÇô no PKCE, no allowlist needed.
       2. code        ΓÇô PKCE code (when redirect URL is allowlisted).
                        Calls exchangeCodeForSession().
       3. access_token in hash ΓÇô Implicit/legacy flow fallback.
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

    var SUPABASE_URL  = 'https://dilhsyykvfxdieswqolm.supabase.co';
    var SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpbGhzeXlrdmZ4ZGllc3dxb2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzM2NjgsImV4cCI6MjA4NjEwOTY2OH0.4E04DDIgkvEJm7Ff2OlqYNTS64NVIC6RvBhtOfYyMtQ';

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
      var mail = sanitise(email)    || 'ΓÇö';
      usernameEl.textContent = name;
      emailEl.textContent    = mail;
      if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + name + '! \uD83C\uDF89';
    }

    function showSoftSuccess() {
      if (loadingEl)  loadingEl.style.display  = 'none';
      if (errorEl)    errorEl.style.display    = 'none';
      if (successEl)  successEl.style.display  = 'block';
      if (iconWrapEl) iconWrapEl.style.display = 'flex';
      var detailsEl = document.querySelector('.confirm-details');
      if (detailsEl) detailsEl.style.display = 'none';
      if (welcomeEl) welcomeEl.textContent = '';
      var msgEl = document.querySelector('.confirm-message');
      if (msgEl) msgEl.textContent =
        'Your email has been confirmed. Open the Funnecta app and log in to continue.';
    }

    function showError(msg) {
      if (loadingEl)  loadingEl.style.display  = 'none';
      if (successEl)  successEl.style.display  = 'none';
      if (iconWrapEl) iconWrapEl.style.display = 'none';
      if (errorEl)    errorEl.style.display    = 'block';
      if (errorMsgEl) errorMsgEl.textContent   =
        msg || 'This confirmation link has expired or is invalid.';
    }

    function getSupabaseClient() {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
        { auth: { persistSession: false, detectSessionInUrl: false } }
      );
    }

    function extractUser(result) {
      var user = (result.data && (result.data.user || (result.data.session && result.data.session.user)));
      return user || null;
    }

    var params    = new URLSearchParams(window.location.search);
    var tokenHash = params.get('token_hash');
    var type      = params.get('type') || 'signup';
    var code      = params.get('code');

    if (!window.supabase) {
      // SDK CDN not yet loaded ΓÇö wait briefly then retry
      setTimeout(function () { window.location.reload(); }, 2000);
    } else if (tokenHash) {
      /* ΓöÇΓöÇ Flow 1: token_hash (preferred ΓÇô set in Supabase email template) ΓöÇΓöÇ */
      getSupabaseClient().auth.verifyOtp({ token_hash: tokenHash, type: type })
        .then(function (result) {
          if (result.error) {
            showError('Verification failed: ' + result.error.message +
              '. The link may have expired ΓÇö please sign up again.');
          } else {
            var user = extractUser(result);
            if (user) {
              var email    = user.email || 'ΓÇö';
              var username = (user.user_metadata && user.user_metadata.username)
                             || email.split('@')[0];
              showSuccess(username, email);
            } else {
              showSoftSuccess();
            }
          }
        })
        .catch(function () {
          showError('Network error. Please check your connection and try again.');
        });

    } else if (code) {
      /* ΓöÇΓöÇ Flow 2: PKCE code (when confirm.html is in Supabase redirect allowlist) ΓöÇΓöÇ */
      getSupabaseClient().auth.exchangeCodeForSession(code)
        .then(function (result) {
          if (result.error) {
            // PKCE verifier mismatch is common when exchange is from a different
            // client ΓÇö fall through to soft success since email is confirmed.
            showSoftSuccess();
          } else {
            var user = extractUser(result);
            if (user) {
              var email    = user.email || 'ΓÇö';
              var username = (user.user_metadata && user.user_metadata.username)
                             || email.split('@')[0];
              showSuccess(username, email);
            } else {
              showSoftSuccess();
            }
          }
        })
        .catch(function () { showSoftSuccess(); });

    } else {
      /* ΓöÇΓöÇ Flow 3: implicit ΓÇô access_token in hash ΓöÇΓöÇ */
      var hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      var accessToken = hashParams.get('access_token');
      if (accessToken) {
        var payload  = decodeJwtPayload(accessToken);
        var email    = (payload && payload.email) || 'ΓÇö';
        var username = (payload && payload.user_metadata && payload.user_metadata.username)
                       || (email !== 'ΓÇö' ? email.split('@')[0] : 'User');
        showSuccess(username, email);
      } else {
        // No auth params at all ΓÇö show soft success so user can open the app
        showSoftSuccess();
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

})();