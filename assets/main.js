/* Aknur — site interactions (plain JS, no framework).
   v2: word reveals, pointer parallax, magnetic buttons, slow constant marquee,
   count-ups, reading highlight, playable quiz, sharing, event-photo popup + lightbox. Every effect respects
   "reduce motion" (html.no-motion) and only uses pointer effects on mouse/trackpad. */
(() => {
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  /* Translate a Kazakh UI string (assets/i18n.js); falls back to the Kazakh text. */
  const T = (s, vars) => (window.t ? window.t(s, vars) : s);
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOK = () => !root.classList.contains('no-motion');
  const pointerFX = () => motionOK() && fineMQ.matches;

  /* ---------- Split text into word spans (for mask reveals and the reading highlight) ---------- */
  const splitWords = (el, cls) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = cls;
            inner.className = `${cls}__i`;
            inner.textContent = part;
            inner.style.setProperty('--wi', i++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE && n.namespaceURI !== 'http://www.w3.org/2000/svg') {
          walk(n);
        }
      });
    };
    walk(el);
  };
  $$('[data-split]').forEach((el) => splitWords(el, 'w'));
  const scrubEl = $('[data-scrub]');
  if (scrubEl) splitWords(scrubEl, 'sw');
  const scrubWords = scrubEl ? $$('.sw', scrubEl) : [];

  /* ---------- Stagger groups: children reveal one after another ---------- */
  $$('[data-stagger]').forEach((group) => {
    const step = Number(group.dataset.stagger) || 70;
    [...group.children].forEach((child, i) => {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--d', `${i * step}ms`);
    });
  });
  $$('.mini-grid i').forEach((cell, i) => cell.style.setProperty('--i', i));

  /* ---------- Intro sequence: wait for fonts so text does not jump ---------- */
  const markReady = () => requestAnimationFrame(() => root.classList.add('is-ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(markReady);
  } else {
    markReady();
  }

  /* ---------- Toast + clipboard ---------- */
  const toastEl = $('.toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2800);
  };
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  };

  /* ---------- Navigation: scrolled state, active section, hide on scroll down ---------- */
  const nav = $('.nav');
  const links = $$('.nav__links a');
  const panelLinks = $$('.nav__panel-links a');
  const indicator = $('.nav__indicator');
  const cta = $('.nav__cta');
  const sections = $$('main section[id]');
  // Sections without their own menu item keep the nearest preceding one lit.
  const navFor = { certificate: 'portfolio', philosophy: 'portfolio' };
  let activeId = null;
  let navLockUntil = 0;

  const moveIndicator = () => {
    const current = links.find((a) => a.getAttribute('aria-current') === 'true');
    if (!current || !current.offsetParent) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = `${current.offsetWidth}px`;
    indicator.style.transform = `translateX(${current.offsetLeft}px)`;
  };

  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    [...links, ...panelLinks].forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    cta.classList.toggle('is-active', id === 'contact');
    moveIndicator();
  };

  const updateActive = () => {
    const line = innerHeight * 0.38;
    let current = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s.id;
    if (innerHeight + scrollY >= root.scrollHeight - 4) current = 'contact';
    setActive(navFor[current] || current);
  };

  // Clicking a link scrolls down; keep the bar visible while that happens.
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', () => {
    navLockUntil = performance.now() + 1400;
    nav.classList.remove('is-hidden');
  }));
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- Mobile menu ---------- */
  const toggle = $('.nav__toggle');
  const panel = $('#mobile-menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', T(open ? 'Мәзірді жабу' : 'Мәзірді ашу'));
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
    root.classList.toggle('menu-open', open);
    if (open) {
      nav.classList.remove('is-hidden');
      setTimeout(() => panelLinks[0].focus({ preventScroll: true }), 120);
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('is-open') && !e.target.closest('.nav')) setMenu(false);
  });

  /* ---------- Timeline progress ---------- */
  const timeline = $('.timeline');
  const fill = $('.timeline__fill');
  const tlItems = $$('.tl-item');
  const updateTimeline = () => {
    const r = timeline.getBoundingClientRect();
    const focus = innerHeight * 0.62;
    fill.style.transform = `scaleY(${clamp((focus - r.top - 60) / (r.height - 100))})`;
    let last = -1;
    tlItems.forEach((item, i) => {
      const on = $('.tl-marker', item).getBoundingClientRect().top < focus;
      item.classList.toggle('is-active', on);
      if (on) last = i;
    });
    tlItems.forEach((item, i) => item.classList.toggle('is-current', i === last));
  };

  /* ---------- Reading highlight for the philosophy quote ---------- */
  const updateScrub = () => {
    if (!scrubEl) return;
    if (!motionOK()) { scrubWords.forEach((w) => w.classList.add('is-lit')); return; }
    const r = scrubEl.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3));
    const lit = Math.round(p * scrubWords.length);
    scrubWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };

  /* ---------- Reading progress: top bar + back-to-top ring ---------- */
  const progressBar = $('.progress span');
  const toTop = $('.to-top');
  const updateProgress = () => {
    const p = clamp(scrollY / Math.max(1, root.scrollHeight - innerHeight));
    progressBar.style.transform = `scaleX(${p.toFixed(4)})`;
    toTop.style.setProperty('--p-off', (1 - p).toFixed(4));
    toTop.classList.toggle('is-visible', scrollY > innerHeight * 0.9);
  };

  /* ---------- Floating WhatsApp button (mobile) ---------- */
  const fab = $('.fab');
  const hero = $('#home');
  const contact = $('#contact');
  const updateFab = () => {
    const pastHero = hero.getBoundingClientRect().bottom < 80;
    const c = contact.getBoundingClientRect();
    const contactVisible = c.top < innerHeight * 0.85 && c.bottom > 0;
    fab.classList.toggle('is-visible', pastHero && !contactVisible);
  };

  /* ---------- Marquee: one slow, constant drift (ignores mouse and scroll) ---------- */
  const MARQUEE_SPEED = 30; // px per second
  const ribbon = $('.ribbon');
  const marquee = $('.marquee');
  const mq = { x: 0, w: 0, visible: false, last: 0, raf: 0 };
  const measureMarquee = () => {
    const first = marquee.firstElementChild;
    mq.w = first.offsetWidth;
    // Enough copies to cover a wide screen while one copy scrolls away.
    const need = Math.ceil((ribbon.offsetWidth * 1.1) / Math.max(1, mq.w)) + 1;
    while (marquee.children.length < need) {
      const clone = first.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[aria-hidden]').forEach((n) => n.removeAttribute('aria-hidden'));
      marquee.appendChild(clone);
    }
  };
  const marqueeTick = (now) => {
    const dt = Math.min(0.064, (now - (mq.last || now)) / 1000);
    mq.last = now;
    mq.x -= MARQUEE_SPEED * dt;
    if (mq.x <= -mq.w) mq.x += mq.w;
    marquee.style.transform = `translate3d(${mq.x.toFixed(2)}px, 0, 0)`;
    if (mq.visible && motionOK()) mq.raf = requestAnimationFrame(marqueeTick);
    else { mq.raf = 0; mq.last = 0; }
  };
  const startMarquee = () => {
    if (!mq.raf && mq.visible && motionOK()) mq.raf = requestAnimationFrame(marqueeTick);
  };
  new IntersectionObserver(([en]) => { mq.visible = en.isIntersecting; startMarquee(); }).observe(ribbon);

  /* ---------- One rAF-throttled scroll handler ---------- */
  let ticking = false;
  let lastY = scrollY;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const dy = y - lastY;
      lastY = y;
      nav.classList.toggle('is-scrolled', y > 24);
      if (root.classList.contains('menu-open') || performance.now() < navLockUntil || y < 560) nav.classList.remove('is-hidden');
      else if (dy > 6) nav.classList.add('is-hidden');
      else if (dy < -6) nav.classList.remove('is-hidden');

      updateActive();
      updateTimeline();
      updateFab();
      updateScrub();
      updateProgress();
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { moveIndicator(); measureMarquee(); onScroll(); });
  measureMarquee();
  onScroll();
  document.fonts && document.fonts.ready.then(() => { moveIndicator(); measureMarquee(); });

  /* ---------- Scroll reveal ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealIO.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ---------- Count-ups (2022 → 2026, 0 → 3, 0 → 45) ---------- */
  const counters = $$('[data-count]');
  const finishCount = (el) => { el.textContent = el.dataset.to; el.dataset.counted = '1'; };
  const runCount = (el) => {
    if (el.dataset.counted) return;
    if (!motionOK()) { finishCount(el); return; }
    el.dataset.counted = '1';
    const from = Number(el.dataset.from || 0);
    const to = Number(el.dataset.to);
    const dur = Number(el.dataset.dur || 1400);
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (motionOK()) counters.forEach((el) => { el.textContent = el.dataset.from || '0'; });
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      setTimeout(() => runCount(en.target), 250);
      countIO.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => countIO.observe(el));

  /* ---------- Certificate score ticks (45 of 50) ---------- */
  const ticks = $('.ticks');
  for (let i = 0; i < 50; i += 1) {
    const s = document.createElement('span');
    s.style.setProperty('--i', i);
    if (i < 45) s.className = 'on';
    ticks.appendChild(s);
  }
  const tickIO = new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { ticks.classList.add('is-in'); tickIO.disconnect(); }
  }, { threshold: 0.4 });
  tickIO.observe(ticks);

  /* ---------- Tool mock-ups play only while visible ---------- */
  const playIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-playing', en.isIntersecting));
  }, { threshold: 0.25 });
  $$('.tool').forEach((t) => playIO.observe(t));

  /* ---------- Hero proverb card: type a proverb, hold it, erase it, next one ----------
     Runs only while the card is on screen and the tab is visible. With reduced
     motion the whole proverb just changes every few seconds. */
  const proverb = $('[data-proverb]');
  if (proverb) {
    const lines = $$('[data-proverb-list] li', proverb).map((li) => li.textContent.trim());
    const out = $('[data-proverb-text]', proverb);
    const dots = $$('.proverb__dots i', proverb);
    let idx = 0;
    let pos = lines[0].length;
    let phase = 'hold';
    let timer = 0;
    let onScreen = false;
    const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(tick, ms); };
    const setDot = () => dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    function tick() {
      timer = 0;
      if (!onScreen || document.hidden) return;
      const line = lines[idx];
      proverb.classList.toggle('is-idle', !motionOK());
      if (!motionOK()) {
        idx = (idx + 1) % lines.length;
        pos = lines[idx].length;
        out.textContent = lines[idx];
        setDot();
        phase = 'hold';
        schedule(6500);
        return;
      }
      if (phase === 'type') {
        pos += 1;
        out.textContent = line.slice(0, pos);
        if (pos < line.length) { schedule(line[pos - 1] === ' ' ? 95 : 55); return; }
        phase = 'hold';
        schedule(4200);
      } else if (phase === 'hold') {
        phase = 'erase';
        schedule(0);
      } else {
        pos -= 1;
        out.textContent = line.slice(0, Math.max(pos, 0));
        if (pos > 0) { schedule(22); return; }
        idx = (idx + 1) % lines.length;
        setDot();
        phase = 'type';
        schedule(380);
      }
    }
    const resume = () => { if (onScreen && !document.hidden && !timer) schedule(phase === 'hold' ? 5000 : 400); };
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) resume();
    }).observe(proverb);
    document.addEventListener('visibilitychange', resume);
  }

  /* ---------- Hero: layers drift against the pointer ---------- */
  const visual = $('.hero__visual');
  const par = { tx: 0, ty: 0, x: 0, y: 0, raf: 0 };
  const parallaxTick = () => {
    par.x += (par.tx - par.x) * 0.075;
    par.y += (par.ty - par.y) * 0.075;
    visual.style.setProperty('--mx', par.x.toFixed(4));
    visual.style.setProperty('--my', par.y.toFixed(4));
    const moving = Math.abs(par.tx - par.x) > 0.001 || Math.abs(par.ty - par.y) > 0.001;
    par.raf = moving ? requestAnimationFrame(parallaxTick) : 0;
  };
  const kickParallax = () => { if (!par.raf) par.raf = requestAnimationFrame(parallaxTick); };
  hero.addEventListener('pointermove', (e) => {
    if (!pointerFX()) return;
    par.tx = e.clientX / innerWidth - 0.5;
    par.ty = e.clientY / innerHeight - 0.5;
    kickParallax();
  });
  hero.addEventListener('pointerleave', () => { par.tx = 0; par.ty = 0; kickParallax(); });

  /* ---------- Magnetic buttons ---------- */
  $$('[data-magnetic]').forEach((el) => {
    const pull = Number(el.dataset.magnetic) || 0.25;
    el.addEventListener('pointermove', (e) => {
      if (!pointerFX()) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * pull;
      const y = (e.clientY - (r.top + r.height / 2)) * pull;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  /* ---------- Competency spotlight ---------- */
  const comps = $('.competencies');
  comps && comps.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.comp');
    if (!card || !fineMQ.matches) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--sx', `${e.clientX - r.left}px`);
    card.style.setProperty('--sy', `${e.clientY - r.top}px`);
  });

  /* ---------- Portfolio cards: gentle 3D tilt + glare ---------- */
  const resetTilt = (card) => {
    card.classList.remove('is-tilting');
    ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y'].forEach((p) => card.style.removeProperty(p));
  };
  $$('.work').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (!pointerFX()) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--tilt-x', `${((0.5 - py) * 5).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${((px - 0.5) * 7).toFixed(2)}deg`);
      card.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => resetTilt(card));
  });

  /* ---------- Playable quiz (sample questions) ---------- */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const QUESTIONS = [
      { q: '«Кітап» сөзі қай сөз табына жатады?', a: ['Зат есім', 'Етістік', 'Сын есім'], ok: 0 },
      { q: '«Ғылым таппай мақтанба» өлеңінің авторы кім?', a: ['Ыбырай Алтынсарин', 'Абай Құнанбаев', 'Мағжан Жұмабаев'], ok: 1 },
      { q: '«Ә» әрпі қандай дыбысты білдіреді?', a: ['Дауыссыз', 'Үнді', 'Дауысты'], ok: 2 },
    ].map((item) => ({ ...item, q: T(item.q), a: item.a.map((x) => T(x)) }));
    const LETTERS = ['A', 'B', 'C'];
    const qEl = $('[data-quiz-q]', quiz);
    const optsEl = $('[data-quiz-opts]', quiz);
    const countEl = $('[data-quiz-count]', quiz);
    const scoreEl = $('[data-quiz-score]', quiz);
    const barEl = $('[data-quiz-bar]', quiz);
    const fbEl = $('[data-quiz-feedback]', quiz);
    let idx = 0;
    let score = 0;
    let locked = false;

    const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
    const setFeedback = (text, tone) => {
      fbEl.textContent = text;
      fbEl.classList.toggle('is-good', tone === 'good');
      fbEl.classList.toggle('is-bad', tone === 'bad');
    };
    const burst = (from) => {
      if (!motionOK()) return;
      const qr = quiz.getBoundingClientRect();
      const br = from.getBoundingClientRect();
      const b = document.createElement('span');
      b.className = 'burst';
      b.style.left = `${br.right - qr.left - 22}px`;
      b.style.top = `${br.top - qr.top + br.height / 2}px`;
      for (let i = 0; i < 12; i += 1) {
        const p = document.createElement('i');
        const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
        const d = 26 + Math.random() * 30;
        p.style.setProperty('--bx', `${(Math.cos(a) * d).toFixed(1)}px`);
        p.style.setProperty('--by', `${(Math.sin(a) * d).toFixed(1)}px`);
        p.style.setProperty('--br', `${Math.round(Math.random() * 360)}deg`);
        b.appendChild(p);
      }
      quiz.appendChild(b);
      setTimeout(() => b.remove(), 1000);
    };
    const render = () => {
      const item = QUESTIONS[idx];
      countEl.textContent = T('Сұрақ {n} / {m}', { n: idx + 1, m: QUESTIONS.length });
      scoreEl.textContent = T('Ұпай: {n}', { n: score });
      quiz.style.setProperty('--quiz-p', ((idx + 1) / QUESTIONS.length).toFixed(4));
      qEl.textContent = item.q;
      optsEl.innerHTML = item.a.map((text, i) => (
        `<button class="quiz__opt" type="button" data-i="${i}"><b>${LETTERS[i]}</b><span>${text}</span>${icon('i-check')}</button>`
      )).join('');
      setFeedback(T('Жауапты таңдап көріңіз'));
      locked = false;
    };
    const swap = (fn) => {
      quiz.classList.add('is-swapping');
      setTimeout(() => { fn(); quiz.classList.remove('is-swapping'); }, motionOK() ? 280 : 0);
    };
    const finish = () => {
      countEl.textContent = T('Тест аяқталды');
      scoreEl.textContent = T('Ұпай: {n}', { n: score });
      qEl.textContent = T(score === QUESTIONS.length ? 'Керемет! {n} / {m} дұрыс жауап.' : 'Нәтиже: {n} / {m}. Тағы бір рет көріңіз!', { n: score, m: QUESTIONS.length });
      optsEl.innerHTML = `<button class="quiz__opt quiz__restart" type="button" data-restart>${icon('i-refresh')}<span>${T('Қайта бастау')}</span></button>`;
      setFeedback(T('Сабақта осындай интерактивті тапсырмаларды қолданамын'), 'good');
    };
    optsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.hasAttribute('data-restart')) {
        idx = 0;
        score = 0;
        swap(render);
        return;
      }
      if (locked) return;
      locked = true;
      const item = QUESTIONS[idx];
      const chosen = Number(btn.dataset.i);
      const buttons = $$('.quiz__opt', optsEl);
      buttons.forEach((b) => { b.disabled = true; });
      buttons[item.ok].classList.add('is-right');
      if (chosen === item.ok) {
        score += 1;
        scoreEl.textContent = T('Ұпай: {n}', { n: score });
        setFeedback(T('Дұрыс! Жарайсыз.'), 'good');
        burst(btn);
      } else {
        btn.classList.add('is-wrong');
        setFeedback(T('Дұрыс жауап: {a}', { a: item.a[item.ok] }), 'bad');
      }
      setTimeout(() => {
        idx += 1;
        swap(idx < QUESTIONS.length ? render : finish);
      }, chosen === item.ok ? 1300 : 2000);
    });
    render();
  }

  /* ---------- Local time in Atyrau (helps recruiters in other time zones) ---------- */
  const clockEl = $('[data-clock]');
  if (clockEl) {
    try {
      const fmt = new Intl.DateTimeFormat('kk-KZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Atyrau' });
      const tick = () => { clockEl.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 20000);
      clockEl.parentElement.hidden = false;
    } catch { /* no time-zone data: keep the row without a clock */ }
  }

  /* ---------- Copy contact details ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      await copyText(text);
      const label = $('.copy-label', btn);
      btn.classList.add('is-done');
      if (label) label.textContent = T('Көшірілді');
      toast(T('Көшірілді: {text}', { text }));
      setTimeout(() => {
        btn.classList.remove('is-done');
        if (label) label.textContent = T('Көшіру');
      }, 1800);
    });
  });

  /* ---------- Sharing ---------- */
  const share = {
    title: document.title,
    text: T('Қаршыға Ақнұр — қазақ тілі мен әдебиеті пәнінің мұғалімі'),
    url: () => location.href.split('#')[0].replace(/[?&]embed\b[^&]*/, ''),
  };
  $$('[data-share]').forEach((btn) => btn.addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: share.title, text: share.text, url: share.url() }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    await copyText(share.url());
    toast(T('Сілтеме көшірілді — енді кез келген жерге жіберуге болады'));
  }));
  $$('[data-share-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    await copyText(share.url());
    toast(T('Сілтеме көшірілді'));
  }));
  const setWaHref = (a) => { a.href = `https://wa.me/?text=${encodeURIComponent(`${share.text}: ${share.url()}`)}`; };
  $$('[data-share-wa]').forEach((a) => { setWaHref(a); a.addEventListener('click', () => setWaHref(a)); });

  /* ---------- Photo / slide lightbox ----------
     Each [data-shot-group] (the event photos, each slide deck) is its own set.
     Opens out of the tile and closes back into it (FLIP; on phones the tile is a
     cover-crop, which the clip-path reproduces). Arrows, ←/→, swipe, Esc; the rest
     of the page is inert while it is open. Without JS the tiles just link to the files. */
  const lb = $('[data-lightbox]');
  const shotLinks = $$('[data-shot]');
  if (lb && shotLinks.length) {
    const EASE = 'cubic-bezier(.22, 1, .36, 1)';
    const FULL_CLIP = 'inset(0px 0px 0px 0px round 14px)';
    const lbImg = $('[data-lb-img]', lb);
    const lbStage = $('[data-lb-stage]', lb);
    const lbBackdrop = $('.lb__backdrop', lb);
    const lbBar = $('.lb__bar', lb);
    const lbClose = $('.lb__close', lb);
    const pad2 = (n) => String(n).padStart(2, '0');
    const groups = new Map();
    shotLinks.forEach((a) => {
      const img = $('img', a);
      const fig = a.closest('.shot') || $('[data-shot-frame]', a) || a; // the box the photo flies out of and back into
      const g = a.closest('[data-shot-group]') || document.body;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push({
        a, img, fig,
        full: a.getAttribute('href'),
        w: Number(img.getAttribute('width')),
        h: Number(img.getAttribute('height')),
        tag: a.dataset.capTag || $('.shot__tag', fig).lastChild.textContent.trim(),
        title: a.dataset.capTitle || $('.shot__title', fig).textContent.trim(),
      });
    });
    let items = [];
    lb.tabIndex = -1;
    const loaded = new Set();
    let cur = -1;
    let busy = false;
    let closing = false;
    let outside = [];

    const preload = (i) => {
      const it = items[(i + items.length) % items.length];
      if (loaded.has(it.full)) return;
      const im = new Image();
      im.onload = () => loaded.add(it.full);
      im.src = it.full;
    };

    // The photo fits the stage and is never blown up past its own pixels
    const fit = () => {
      if (cur < 0) return;
      const it = items[cur];
      const cs = getComputedStyle(lbStage);
      const maxW = lbStage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const maxH = lbStage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const k = Math.min(maxW / it.w, maxH / it.h, 1);
      lbImg.style.width = `${Math.round(it.w * k)}px`;
      lbImg.style.height = `${Math.round(it.h * k)}px`;
    };

    const fill = (i) => {
      cur = (i + items.length) % items.length;
      const it = items[cur];
      if (loaded.has(it.full)) {
        lbImg.src = it.full;
      } else {
        // the tile's file is already decoded: show it now, swap in the full file when it lands
        lbImg.src = it.img.currentSrc || it.full;
        const full = new Image();
        full.onload = () => { loaded.add(it.full); if (items[cur] === it) lbImg.src = it.full; };
        full.src = it.full;
      }
      lbImg.alt = it.img.alt;
      $('[data-lb-index]', lb).textContent = pad2(cur + 1);
      $('[data-lb-tag]', lb).textContent = it.tag;
      $('[data-lb-title]', lb).textContent = it.title;
      fit();
      preload(cur + 1);
      preload(cur - 1);
    };

    // Transform + clip that lay the open photo exactly over its tile
    const tileFrame = (it) => {
      const a = it.fig.getBoundingClientRect();
      if (!a.width || a.bottom < 0 || a.top > innerHeight || a.right < 0 || a.left > innerWidth) return null;
      const b = lbImg.getBoundingClientRect();
      const k = Math.max(a.width / b.width, a.height / b.height);
      const [fx, fy] = getComputedStyle(it.img).objectPosition.split(' ').map((v) => (Number.isNaN(parseFloat(v)) ? 50 : parseFloat(v)) / 100);
      const ox = b.width - a.width / k;
      const oy = b.height - a.height / k;
      const l = ox * fx;
      const r = ox - l;
      const t = oy * fy;
      const bt = oy - t;
      const rad = parseFloat(getComputedStyle(it.fig).borderTopLeftRadius) || 0;
      const dx = a.left + a.width / 2 - (b.left + b.width / 2) - (k * (l - r)) / 2;
      const dy = a.top + a.height / 2 - (b.top + b.height / 2) - (k * (t - bt)) / 2;
      return {
        transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(4)})`,
        clipPath: `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${bt.toFixed(1)}px ${l.toFixed(1)}px round ${(rad / k).toFixed(1)}px)`,
      };
    };

    const open = (list, i) => {
      items = list;
      $('.lb__total', lb).textContent = `/ ${pad2(items.length)}`;
      lb.classList.toggle('lb--single', items.length < 2); // one document: no counter, no arrows
      lb.hidden = false;
      root.classList.add('lb-open');
      // only what is not inert already (the photo popup under it keeps its own state)
      outside = [...document.body.children].filter((el) => el !== lb && !el.inert && !el.matches('script, .toast'));
      outside.forEach((el) => { el.inert = true; });
      fill(i);
      lbClose.focus({ preventScroll: true });
      if (!motionOK()) return;
      const it = items[cur];
      lbBackdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      lbBar.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 180, easing: EASE, fill: 'backwards' });
      lbClose.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 220, easing: EASE, fill: 'backwards' });
      const f = tileFrame(it);
      if (f) {
        it.fig.style.visibility = 'hidden';
        const anim = lbImg.animate([{ transform: f.transform, clipPath: f.clipPath }, { transform: 'none', clipPath: FULL_CLIP }], { duration: 640, easing: EASE });
        anim.onfinish = () => { it.fig.style.visibility = ''; };
        anim.oncancel = anim.onfinish;
      } else {
        lbImg.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
      }
    };

    const close = () => {
      if (cur < 0 || closing) return;
      const it = items[cur];
      const done = () => {
        lb.getAnimations({ subtree: true }).forEach((an) => an.cancel());
        lb.hidden = true;
        root.classList.remove('lb-open');
        outside.forEach((el) => { el.inert = false; });
        it.fig.style.visibility = '';
        lbImg.style.translate = '';
        cur = -1;
        closing = false;
        busy = false;
        it.a.focus({ preventScroll: true });
      };
      if (!motionOK()) { done(); return; }
      closing = true;
      // the slide shown last may sit outside its strip's view: bring it in so the photo can land on it
      it.a.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      lbBackdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, easing: 'ease-in', fill: 'forwards' });
      lbBar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      lbClose.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      const f = tileFrame(it);
      let anim;
      if (f) {
        it.fig.style.visibility = 'hidden';
        anim = lbImg.animate([{ transform: 'none', clipPath: FULL_CLIP }, { transform: f.transform, clipPath: f.clipPath }], { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
      } else {
        anim = lbImg.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
      }
      anim.onfinish = done;
    };

    // Next / previous: the photo slides out the way it was pushed and the new one slides in
    const go = (dir, fromX = 0) => {
      if (cur < 0 || busy || closing || items.length < 2) { lbImg.style.translate = ''; return; }
      lbImg.style.translate = '';
      if (!motionOK()) { fill(cur + dir); return; }
      busy = true;
      const out = lbImg.animate([{ opacity: 1, translate: `${fromX}px 0` }, { opacity: 0, translate: `${fromX - dir * 56}px 0` }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = async () => {
        fill(cur + dir);
        try { await lbImg.decode(); } catch { /* shown anyway */ }
        out.cancel();
        if (cur >= 0) lbImg.animate([{ opacity: 0, translate: `${dir * 56}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: EASE });
        busy = false;
      };
    };

    groups.forEach((list) => list.forEach((it, i) => it.a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // keep "open in a new tab"
      e.preventDefault();
      open(list, i);
    })));
    $('[data-lb-prev]', lb).addEventListener('click', () => go(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => go(1));
    $$('[data-lb-close]', lb).forEach((el) => el.addEventListener('click', close));
    lbStage.addEventListener('click', (e) => { if (e.target === lbStage) close(); });
    document.addEventListener('keydown', (e) => {
      if (cur < 0) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    addEventListener('resize', fit);

    // Swipe on touch screens: the photo follows the finger, a long enough flick changes it
    let drag = null;
    lbStage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || busy || closing) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0 };
    });
    lbStage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.dx = dx;
      lbImg.style.translate = `${dx}px 0`;
    });
    const endDrag = () => {
      if (!drag) return;
      const { dx } = drag;
      drag = null;
      if (Math.abs(dx) > 56) { go(dx < 0 ? 1 : -1, dx); return; }
      lbImg.style.translate = '';
      if (dx && motionOK()) lbImg.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: 280, easing: EASE });
    };
    lbStage.addEventListener('pointerup', endDrag);
    lbStage.addEventListener('pointercancel', endDrag);
  }

  /* ---------- Portfolio popups (presentations, event photos) ----------
     Each grows out of its card's picture (clip-path from the card's rect) and shrinks back
     into it. Esc / backdrop / × close it; Esc goes to the lightbox first when that is open. */
  $$('[data-evm]').forEach((evm) => {
    const evmOpen = $(`[data-evm-open][aria-controls="${evm.id}"]`);
    if (!evmOpen) return;
    const panel = $('[data-evm-panel]', evm);
    const back = $('.evm__backdrop', evm);
    const card = evmOpen.closest('.work');
    const media = card && $('.work__media', card);
    let evmOutside = [];
    let evmBusy = false;
    const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
    const cardClip = () => {
      const p = panel.getBoundingClientRect();
      const c = (media || evmOpen).getBoundingClientRect();
      const r = (v) => `${v.toFixed(1)}px`;
      return `inset(${r(c.top - p.top)} ${r(p.right - c.right)} ${r(p.bottom - c.bottom)} ${r(c.left - p.left)} round 20px)`;
    };
    const fullClip = () => `inset(0px 0px 0px 0px round ${getComputedStyle(panel).borderTopLeftRadius})`;
    const openEvm = () => {
      if (!evm.hidden || evmBusy) return;
      evm.hidden = false;
      root.classList.add('modal-open');
      evmOutside = [...document.body.children].filter((el) => el !== evm && el !== $('[data-lightbox]') && !el.inert && !el.matches('script, .toast'));
      evmOutside.forEach((el) => { el.inert = true; });
      $('[data-evm-body]', evm).scrollTop = 0;
      $('.evm__close', evm).focus({ preventScroll: true });
      if (!motionOK()) return;
      back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
      panel.animate([{ clipPath: cardClip() }, { clipPath: fullClip() }], { duration: 640, easing: EASE_OUT });
      $$('.evm__head > *', evm).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 160 + i * 60, easing: EASE_OUT, fill: 'backwards' }));
    };
    const closeEvm = () => {
      if (evm.hidden || evmBusy) return;
      const done = () => {
        evm.getAnimations({ subtree: true }).forEach((an) => an.cancel());
        evm.hidden = true;
        root.classList.remove('modal-open');
        evmOutside.forEach((el) => { el.inert = false; });
        evmBusy = false;
        evmOpen.focus({ preventScroll: true });
      };
      if (!motionOK()) { done(); return; }
      evmBusy = true;
      back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      $('.evm__head', evm).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      panel.animate([{ clipPath: fullClip() }, { clipPath: cardClip(), opacity: 1, offset: 0.85 }, { clipPath: cardClip(), opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' }).onfinish = done;
    };
    evmOpen.addEventListener('click', openEvm);
    $$('[data-evm-close]', evm).forEach((el) => el.addEventListener('click', closeEvm));
    document.addEventListener('keydown', (e) => {
      // the lightbox handler runs first and marks the event when it used it
      if (e.key === 'Escape' && !evm.hidden && !e.defaultPrevented) { e.preventDefault(); closeEvm(); }
    });
  });

  /* ---------- Motion on/off: follows the system reduced-motion setting ---------- */
  const motionBtn = $('[data-motion-toggle]');
  const applyMotion = () => {
    const off = !motionOK();
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(off));
      motionBtn.textContent = T(off ? 'Анимация: өшірулі' : 'Анимация: қосулы');
    }
    if (off) {
      $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      counters.forEach(finishCount);
      par.tx = 0; par.ty = 0;
      visual.style.removeProperty('--mx');
      visual.style.removeProperty('--my');
      $$('[data-magnetic]').forEach((el) => { el.style.translate = ''; });
      $$('.work').forEach(resetTilt);
    } else {
      startMarquee();
    }
    onScroll();
  };
  motionBtn && motionBtn.addEventListener('click', () => {
    root.classList.toggle('no-motion');
    applyMotion();
  });
  reduceMQ.addEventListener('change', () => {
    root.classList.toggle('no-motion', reduceMQ.matches);
    applyMotion();
  });
  applyMotion();
})();
