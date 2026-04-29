(function () {
  'use strict';

  /* ── Navbar scroll shadow ── */
  var navbar = document.getElementById('navbar');
  window.addEventListener('scroll', function () {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  /* ── Hamburger toggle ── */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      }
    });
    /* Close mobile menu on link click */
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }

  /* ── Active nav link on scroll ── */
  var sections = document.querySelectorAll('section[id], footer[id]');
  var navLinks  = document.querySelectorAll('.nav-link');
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(function (s) { sectionObserver.observe(s); });

  /* ── Hero stagger animation ── */
  document.querySelectorAll('.hero-anim').forEach(function (el) {
    var delay = parseFloat(el.dataset.delay || 0);
    setTimeout(function () { el.classList.add('animated'); }, delay * 1000);
  });

  /* ── Scroll reveal (reveal-el, slide-left, slide-right) ── */
  var revealEls = document.querySelectorAll('.reveal-el, .slide-left, .slide-right');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var delay = parseFloat(el.style.getPropertyValue('--delay') || 0);
        setTimeout(function () { el.classList.add('visible'); }, delay * 1000);
        revealObserver.unobserve(el);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  /* ── FAQ accordion ── */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (i) { i.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ── Newsletter ── */
  window.handleNewsletter = function (e) {
    e.preventDefault();
    var form = e.target;
    var input = form.querySelector('input[type="email"]');
    if (!input || !input.value.includes('@')) return;
    var btn = form.querySelector('.newsletter-btn');
    if (btn) { btn.textContent = 'Subscribed ✓'; btn.disabled = true; }
    if (input) { input.disabled = true; }
  };

  /* ── iOS coming-soon toast ── */
  window.showIosComingSoon = function () {
    var toast = document.getElementById('ios-toast');
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  };

  /* ── Smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 70;
      var top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ----------------------------------------------------------
     CONFIRMATION PAGE
     Supports three flows (tried in priority order):
       1. token_hash  - Direct link from updated Supabase email
                        template using {{ .TokenHash }}. Calls
                        verifyOtp() - no PKCE, no allowlist needed.
       2. code        - PKCE code (when redirect URL is allowlisted).
                        Calls exchangeCodeForSession().
       3. access_token in hash - Implicit/legacy flow fallback.
  ---------------------------------------------------------- */
  var usernameEl  = document.getElementById('display-username');
  var emailEl     = document.getElementById('display-email');
  var welcomeEl   = document.getElementById('display-welcome');

  if (usernameEl && emailEl) {
    var loadingEl  = document.getElementById('confirm-loading');
    var errorEl    = document.getElementById('confirm-error');
    var errorMsgEl = document.getElementById('confirm-error-msg');
    var successEl  = document.getElementById('confirm-success');
    var iconWrapEl = document.getElementById('confirm-icon-wrap');

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
        var json = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(json);
      } catch (e) { return null; }
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
      if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + name + '! 🎉';
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
      if (msgEl) msgEl.textContent = 'Your email has been confirmed. Open the Funnecta app and log in to continue.';
    }
    function showError(msg) {
      if (loadingEl)  loadingEl.style.display  = 'none';
      if (successEl)  successEl.style.display  = 'none';
      if (iconWrapEl) iconWrapEl.style.display = 'none';
      if (errorEl)    errorEl.style.display    = 'block';
      if (errorMsgEl) errorMsgEl.textContent   = msg || 'This confirmation link has expired or is invalid.';
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
      setTimeout(function () { window.location.reload(); }, 2000);
    } else if (tokenHash) {
      getSupabaseClient().auth.verifyOtp({ token_hash: tokenHash, type: type })
        .then(function (result) {
          if (result.error) {
            showError('Verification failed: ' + result.error.message + '. The link may have expired — please sign up again.');
          } else {
            var user = extractUser(result);
            if (user) {
              showSuccess((user.user_metadata && user.user_metadata.username) || user.email.split('@')[0], user.email || '—');
            } else { showSoftSuccess(); }
          }
        })
        .catch(function () { showError('Network error. Please check your connection and try again.'); });
    } else if (code) {
      getSupabaseClient().auth.exchangeCodeForSession(code)
        .then(function (result) {
          if (result.error) { showSoftSuccess(); }
          else {
            var user = extractUser(result);
            if (user) showSuccess((user.user_metadata && user.user_metadata.username) || user.email.split('@')[0], user.email || '—');
            else showSoftSuccess();
          }
        })
        .catch(function () { showSoftSuccess(); });
    } else {
      var hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      var accessToken = hashParams.get('access_token');
      if (accessToken) {
        var payload  = decodeJwtPayload(accessToken);
        var payEmail = (payload && payload.email) || '—';
        var payUser  = (payload && payload.user_metadata && payload.user_metadata.username) || (payEmail !== '—' ? payEmail.split('@')[0] : 'User');
        showSuccess(payUser, payEmail);
      } else { showSoftSuccess(); }
    }
  }

  /* ── Open App Deep Link ── */
  window.openApp = function () {
    var fallbackEl = document.getElementById('app-fallback');
    window.location.href = 'funnecta://auth-callback';
    setTimeout(function () {
      if (fallbackEl) { fallbackEl.style.display = 'block'; }
    }, 2000);
  };

})();
