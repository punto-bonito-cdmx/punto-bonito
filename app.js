(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_QTY = 100;
  // Temas de temporada: el servidor dice cuál está activo (fijo o programado por fechas).
  const TEMAS = {
    halloween: {
      emoji: '🎃', eyebrow: '🎃 Edición Halloween',
      marquee: ['Antojos de miedo', 'Entrega de noche', 'Transferencia o efectivo'], marks: ['🎃', '👻', '🦇'],
    },
    revolucion: {
      emoji: '🚂', eyebrow: '🚂 Edición Revolución',
      marquee: ['Antojos que hacen revolución', 'Edición 20 de noviembre', 'Entrega a domicilio', 'Transferencia o efectivo'], marks: ['🚂', '✦'],
    },
  };
  // Siluetas dibujadas a mano (sin fotos ni personajes reales): pies en y=40, centro en x=0.
  function trenSVG() {
    const adelita = `<g id="pb-adelita"><ellipse cx="0" cy="11" rx="9" ry="2.2"/><path d="M-4 11Q0 3 4 11Z"/>
      <circle cx="0" cy="14.6" r="3.3"/><path d="M2.6 15.5q3 4.5.6 9.5" fill="none" class="linea" stroke-width="1.6"/>
      <path d="M-4 18h8l1.2 9h-10.4z"/><path d="M-5.2 26 -10.5 40h21L5.2 26z"/>
      <path d="M-4 18.5 5 27M4 18.5-5 27" class="hueco-l"/><path d="M-4 19-9.5 13" class="linea" stroke-width="2" stroke-linecap="round"/></g>`;
    const revo = `<g id="pb-revo"><ellipse cx="0" cy="11" rx="12.5" ry="2.6"/><path d="M-4.6 11Q0 .5 4.6 11Z"/>
      <circle cx="0" cy="14.6" r="3.3"/><path d="M-4.6 18h9.2l-.5 11h-8.2z"/>
      <path d="M-4.2 18.5 4.2 29M4.2 18.5-4.2 29" class="hueco-l"/>
      <rect x="-4.1" y="28.5" width="3.3" height="11.5"/><rect x=".8" y="28.5" width="3.3" height="11.5"/>
      <path d="M-7 31 8 6" class="linea" stroke-width="1.7" stroke-linecap="round"/></g>`;
    const rueda = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" class="hueco"/>`;
    const vagon = (x, gente) => `<g transform="translate(${x} 0)">
      <rect x="-8" y="72" width="8" height="3"/><g class="caja"><rect x="0" y="41" width="88" height="37" rx="2"/>
      <rect x="-2" y="37.5" width="92" height="4.5" rx="1.5"/></g><rect x="30" y="47" width="28" height="26" class="hueco" opacity=".3"/>
      <rect x="2" y="78" width="84" height="4"/>${rueda(18, 86, 8)}${rueda(70, 86, 8)}
      ${gente.map(([quien, fx]) => `<g class="gente" transform="translate(${fx} -2.5) translate(0 40) scale(1.4) translate(0 -40)"><use href="#pb-${quien}"/></g>`).join('')}</g>`;
    return `<svg class="tren" viewBox="0 -18 512 118" aria-hidden="true"><defs>${adelita}${revo}</defs>
      <g class="humo"><circle cx="31" cy="20" r="5"/><circle cx="31" cy="20" r="5"/><circle cx="31" cy="20" r="5"/></g>
      <rect x="16" y="48" width="64" height="26" rx="6"/><path d="M26 48 22 28h18l-4 20z"/><rect x="20" y="24" width="22" height="5" rx="1.5"/>
      <path d="M50 48a8 8 0 0 1 16 0z"/><rect x="10" y="52" width="7" height="8" rx="1"/>
      <rect x="78" y="32" width="34" height="42" rx="2"/><rect x="74" y="28" width="42" height="6" rx="1.5"/>
      <rect x="86" y="39" width="16" height="13" rx="1.5" class="hueco"/><path d="M16 68 2 86h16z"/>
      <rect x="8" y="74" width="106" height="6" rx="1"/>${rueda(32, 87, 7)}${rueda(52, 87, 7)}${rueda(96, 84, 10)}
      <rect x="30" y="85.5" width="68" height="3" rx="1.5"/>
      ${vagon(124, [['adelita', 22], ['revo', 62]])}${vagon(222, [['revo', 24], ['adelita', 60]])}
      ${vagon(320, [['adelita', 26], ['adelita', 58]])}${vagon(418, [['revo', 30], ['adelita', 64]])}</svg>`;
  }
  const OTRA = '__otra'; // valor de "Mi colonia no está en la lista"
  // Modo estático (GitHub Pages): sin servidor. El menú sale de catalogo.json, las fechas
  // se calculan aquí y el pedido llega por correo (settings.correoPedidos, vía FormSubmit).
  const ESTATICO = document.documentElement.dataset.modo === 'estatico';
  const TZ = 'America/Mexico_City';
  const DAYS =['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const state = {
    settings: {},
    items: [],
    byId: new Map(),
    category: 'all',
    section: 'postres', // postres | articulos
    cart: recall('postres-pedido', {}), // id -> cantidad
    view: 'home',
    gridReady: false,
    sheetId: null,
    sheetPushed: false,
    sheetQty: 1,
    tipo: 'domicilio',
  };

  // ------------------------------------------------------------ utilidades

  function recall(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado */ }
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const cover = (it) => (it.images && it.images[0]) || null;

  let money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  let moneyCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const fmt = (n) => (Number.isInteger(n) ? money : moneyCents).format(n || 0);
  const priceLabel = (it) => (it.price ? fmt(it.price) : 'Precio por confirmar');
  const dayLabel = (ymd) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${ymd}T12:00:00Z`));
  const igUrl = (u) => `https://instagram.com/${encodeURIComponent(u)}`;
  // settings.facebook acepta el usuario de la Página ("puntobonito"), "profile.php?id=…" o la URL completa.
  const fbUrl = (f) => (/^https?:\/\//i.test(f) ? f : `https://www.facebook.com/${String(f).replace(/^\/+/, '')}`);
  const fbId = (f) => {
    const m = String(f).match(/[?&]id=(\d+)/);
    if (m) return m[1];
    return String(f).replace(/^https?:\/\/[^/]+\//i, '').split(/[/?#]/)[0];
  };
  // Messenger de la Página: el cliente escribe a "Punto Bonito", nunca ve un número personal.
  const msgUrl = (s) => s.messenger || (s.facebook ? `https://m.me/${encodeURIComponent(fbId(s.facebook))}` : '');
  const waUrl = (text) => `https://wa.me/${state.settings.whatsapp}?text=${encodeURIComponent(text)}`;

  // Sin foto todavía: ilustración de color por tipo de postre.
  const ART = [
    [/muffin|mantecad|panque/, '🧁', 330],
    [/lim[oó]n/, '🍋', 52],
    [/durazno|melocot/, '🍑', 28],
    [/zarzamora|mora|frutos|blueberr|arandano/, '🫐', 280],
    [/pay|pie|tarta|pastel|cheese/, '🥧', 20],
    [/donas?\b|donitas?|donut/, '🍩', 345],
    [/chocolatin|croissant|cuernito|strudel|hojaldre/, '🥐', 32],
  ];
  function art(it) {
    let h = 0; for (const c of it.id) h = (h * 31 + c.charCodeAt(0)) % 360;
    if ((it.seccion || 'postres') === 'articulos') return { emoji: '🎁', h };
    const key = norm(`${it.title} ${it.category}`);
    const hit = ART.find(([re]) => re.test(key));
    if (hit) return { emoji: hit[1], h: hit[2] };
    return { emoji: '🍰', h };
  }
  function pic(it, lazy = true) {
    if (cover(it)) return `<img src="${esc(cover(it))}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async" draggable="false">`;
    const a = art(it);
    const fallback = (it.seccion || 'postres') === 'articulos' ? 'Artículo' : 'Postre';
    return `<div class="noimg ph-art" style="--h:${a.h}"><i class="ph-emoji">${a.emoji}</i><b>${esc(it.category || fallback)}</b><span>Foto en camino</span></div>`;
  }

  let toastTimer;
  function toast(msg, icon = 'i-check') {
    const t = $('#toast');
    t.innerHTML = `<svg><use href="#${icon}"/></svg><span>${esc(msg)}</span>`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  const itemUrl = (id) => `${location.origin}${location.pathname}#/item/${id}`;

  // ------------------------------------------------------------ tema

  function currentTheme() {
    return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function paintThemeIcon() {
    $('#theme-btn use').setAttribute('href', currentTheme() === 'dark' ? '#i-sun' : '#i-moon');
  }
  $('#theme-btn').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => { document.documentElement.dataset.theme = next; paintThemeIcon(); };
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply); else apply();
    try { localStorage.setItem('postres-theme', next); } catch { /* sin almacenamiento */ }
  });
  paintThemeIcon();

  // ------------------------------------------------------------ carga

  // Lo que en la versión con servidor calcula server.js: fechas de entrega, tema activo, etc.
  function prepararEstatico(s) {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const mas = (n) => new Date(Date.parse(`${hoy}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const desde = s.anticipacionDias ?? 1;
    const todas = Array.from({ length: 22 - desde }, (_, i) => mas(desde + i));
    s.fechas = todas.filter((d) => (s.diasEntrega || []).includes(new Date(`${d}T12:00:00Z`).getUTCDay()));
    s.fechasAnticipada = s.entregaAnticipada ? todas : [];
    const p = s.temporadaProgramada;
    if (p && p.tema && p.desde <= hoy && (!p.hasta || hoy <= p.hasta)) s.temporada = p.tema;
    // Transferencia puede ofrecerse sin CLABE publicada: los datos se mandan al confirmar.
    s.transferencia = s.transferencia ?? Boolean(s.clabe);
    return s;
  }

  async function fetchCatalog() {
    const res = await fetch(ESTATICO ? 'catalogo.json' : '/api/catalog', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (ESTATICO) prepararEstatico(data.settings);
    state.settings = data.settings;
    state.items = data.items;
    state.byId = new Map(data.items.map((it) => [it.id, it]));
    // Lo que ya no está en el menú sale del pedido guardado.
    for (const key of Object.keys(state.cart)) {
      const { id, pack } = parseKey(key);
      const it = state.byId.get(id);
      if (!it || it.status !== 'disponible' || (pack && !hasPromo(it))) delete state.cart[key];
      else if (state.cart[key] > maxForKey(it, pack)) state.cart[key] = maxForKey(it, pack); // el stock bajó
      if (state.cart[key] === 0) delete state.cart[key];
    }
    store('postres-pedido', state.cart);
    try {
      money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: data.settings.currency, maximumFractionDigits: 0 });
      moneyCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: data.settings.currency });
    } catch { /* moneda no reconocida: se queda MXN */ }
  }

  async function load() {
    try {
      await fetchCatalog();
      renderAll();
    } catch {
      $('#grid').innerHTML = '';
      const empty = $('#empty');
      empty.hidden = false;
      $('h3', empty).textContent = 'No se pudo cargar el menú';
      $('p', empty).textContent = 'Revisa tu conexión e inténtalo otra vez.';
      $('#clear-filters').textContent = 'Reintentar';
      $('#clear-filters').onclick = () => location.reload();
    }
  }

  function renderAll() {
    const s = state.settings;
    // ?tema=revolucion (o halloween, o ninguno) permite ver un tema antes de su fecha.
    const preview = new URLSearchParams(location.search).get('tema');
    if (preview === 'ninguno') s.temporada = '';
    else if (TEMAS[preview]) s.temporada = preview;
    const tema = TEMAS[s.temporada];
    for (const k of Object.keys(TEMAS)) document.body.classList.toggle(`tema-${k}`, s.temporada === k);
    $('.spooky').hidden = s.temporada !== 'halloween';
    $('.papel-picado').hidden = s.temporada !== 'revolucion';
    if (s.temporada === 'revolucion' && !$('.papel-picado').children.length) {
      // Tren revolucionario con adelitas y revolucionarios en los techos, cruzando un paisaje
      // de cerros y magueyes (el contenedor conserva su nombre viejo, .papel-picado).
      $('.papel-picado').innerHTML = trenSVG();
    }
    document.title = `${s.storeName} · postres y artículos a domicilio${tema ? ` ${tema.emoji}` : ''}`;
    $$('[data-store-name]').forEach((el) => { el.textContent = s.storeName; });
    renderHero();
    renderMarquee();
    renderSecTabs();
    renderChips();
    renderGrid();
    renderHow();
    renderCartUI();
    renderFooter();
    $('#closed-bar').hidden = s.abierto;
    state.gridReady = true;
    route();
  }

  // ------------------------------------------------------------ hero

  function diasText() {
    const d = state.settings.diasEntrega || [];
    const names = [1, 2, 3, 4, 5, 6, 0].filter((x) => d.includes(x)).map((x) => DAYS[x]);
    if (!names.length) return '';
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  }

  function renderHero() {
    const s = state.settings;
    const words = (s.tagline || s.storeName).split(' ');
    const last = words.pop();
    $('#hero-title').innerHTML = `${esc(words.join(' '))} <em>${esc(last)}</em>`;
    const horas = (s.horarios || []).join(' o ');
    $('#eyebrow-text').textContent = !s.abierto ? 'Pedidos en pausa'
      : TEMAS[s.temporada] ? `${TEMAS[s.temporada].eyebrow} · ${diasText()}${horas ? `, ${horas}` : ''}`
        : `Entregas ${diasText() || 'en tu colonia'}${horas ? `, ${horas}` : ''}`;

    const avail = state.items.filter((i) => i.status === 'disponible');
    const priced = avail.filter((i) => i.price);
    const nPostres = avail.filter((i) => secOf(i) === 'postres').length;
    const nArt = avail.filter((i) => secOf(i) === 'articulos').length;
    const stats = [];
    stats.push(`<li style="--i:0"><b>${nPostres}</b> ${nPostres === 1 ? 'postre' : 'postres'}${nArt ? ` · <b>${nArt}</b> ${nArt === 1 ? 'artículo' : 'artículos'}` : ''}</li>`);
    if (priced.length) stats.push(`<li style="--i:1">desde <b>${fmt(Math.min(...priced.map((i) => i.price)))}</b></li>`);
    stats.push(`<li style="--i:2"><b>${s.transferencia ? 'Transferencia' : 'Efectivo'}</b>${s.transferencia ? ' o efectivo' : ' al recibir'}</li>`);
    if (s.envioGratisDesde) stats.push(`<li style="--i:3">envío gratis desde <b>${fmt(s.envioGratisDesde)}</b></li>`);
    else if (!s.costoEnvio) stats.push('<li style="--i:3"><b>Envío gratis</b> en la zona</li>');
    $('#hero-stats').innerHTML = state.items.length ? stats.join('') : '<li style="--i:0">Muy pronto estará el menú aquí</li>';

    if (s.instagram) {
      $('#ig-cta').href = igUrl(s.instagram);
      $('#ig-cta').hidden = false;
      $('#ig-top').href = igUrl(s.instagram);
      $('#ig-top').hidden = false;
    }
    const fbTop = $('#fb-top');
    if (fbTop && s.facebook) { fbTop.href = fbUrl(s.facebook); fbTop.hidden = false; }
    const msgCta = $('#msg-cta');
    if (msgCta && msgUrl(s)) { msgCta.href = msgUrl(s); msgCta.hidden = false; }

    const featured = state.items.filter((i) => i.featured && i.status === 'disponible');
    const slides = (featured.length ? featured : avail).slice(0, 6);
    $('#hero-show').hidden = !slides.length;
    $('#carousel').innerHTML = slides.map((it, i) => `
      <a class="slide${i === 0 ? ' is-active' : ''}" href="#/item/${it.id}" data-open="${it.id}" aria-label="${esc(it.title)}, ${esc(priceLabel(it))}">
        ${pic(it, i > 0)}
        <div class="slide-info">
          <span class="slide-kicker">${it.featured ? 'El favorito' : 'En el menú'}${it.category ? ` · ${esc(it.category)}` : ''}</span>
          <h3>${esc(it.title)}</h3>
          <div class="slide-row"><span class="price-tag">${esc(priceLabel(it))}</span><span class="slide-go"><svg><use href="#i-right"/></svg></span></div>
        </div>
      </a>`).join('');
    $('#carousel-dots').innerHTML = slides.length > 1
      ? slides.map((_, i) => `<button class="${i === 0 ? 'is-on' : ''}" aria-label="Destacado ${i + 1}"></button>`).join('')
      : '';
    startCarousel(slides.length);
  }

  let carTimer = null;
  let carIndex = 0;
  let carPausedUntil = 0;
  const CAR_MS = 5200;

  function startCarousel(n) {
    clearInterval(carTimer);
    carIndex = 0;
    if (n < 2 || reduceMotion) return;
    carTimer = setInterval(() => {
      if (Date.now() < carPausedUntil || document.hidden || state.view !== 'home' || state.sheetId) return;
      goSlide((carIndex + 1) % n);
    }, CAR_MS);
  }

  function goSlide(i) {
    const car = $('#carousel');
    const slide = car.children[i];
    if (!slide) return;
    car.scrollTo({ left: slide.offsetLeft - (car.clientWidth - slide.clientWidth) / 2, behavior: 'smooth' });
  }

  function markSlide() {
    const car = $('#carousel');
    const mid = car.scrollLeft + car.clientWidth / 2;
    let best = 0; let bestD = Infinity;
    [...car.children].forEach((el, i) => {
      const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (!car.children[best] || (best === carIndex && car.children[best].classList.contains('is-active'))) return;
    carIndex = best;
    [...car.children].forEach((el, i) => el.classList.toggle('is-active', i === best));
    [...$('#carousel-dots').children].forEach((d, i) => {
      d.classList.remove('is-on');
      if (i === best) { void d.offsetWidth; d.classList.add('is-on'); }
    });
  }

  let carRaf = 0;
  $('#carousel').addEventListener('scroll', () => { cancelAnimationFrame(carRaf); carRaf = requestAnimationFrame(markSlide); }, { passive: true });
  const pauseCarousel = () => {
    carPausedUntil = Date.now() + 9000;
    $('#carousel-dots').classList.add('paused');
    setTimeout(() => { if (Date.now() >= carPausedUntil) $('#carousel-dots').classList.remove('paused'); }, 9100);
  };
  $('#carousel').addEventListener('pointerdown', pauseCarousel);
  $('#carousel').addEventListener('wheel', pauseCarousel, { passive: true });
  $('#carousel-dots').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    pauseCarousel();
    goSlide([...b.parentNode.children].indexOf(b));
  });

  $('#to-grid').addEventListener('click', () => {
    if (state.section !== 'postres') { location.hash = '#/'; return; }
    $('#toolbar').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // ------------------------------------------------------------ marquesina y categorías

  const secOf = (it) => it.seccion || 'postres';
  const inSection = () => state.items.filter((it) => secOf(it) === state.section);

  function categories() {
    const counts = new Map();
    for (const it of inSection()) if (it.category) counts.set(it.category, (counts.get(it.category) || 0) + 1);
    return [...counts.entries()];
  }

  function renderSecTabs() {
    $$('#sec-tabs a').forEach((a) => {
      a.classList.toggle('is-on', a.dataset.sec === state.section);
      $('small', a).textContent = state.items.filter((it) => secOf(it) === a.dataset.sec).length || '';
    });
  }

  function setSection(sec) {
    if (state.section === sec) return;
    state.section = sec;
    state.category = 'all';
    renderSecTabs();
    renderChips();
    renderGrid();
  }

  function renderMarquee() {
    const names = state.items.map((i) => i.title);
    const tema = TEMAS[state.settings.temporada];
    const extra = tema ? tema.marquee : ['Entrega a domicilio', 'Transferencia o efectivo', 'Escríbenos por Messenger'];
    const marks = tema ? tema.marks : ['✦'];
    const run = [...names, ...extra].map((w, i) => `${esc(w)} <i>${marks[i % marks.length]}</i>`).join(' ');
    $('.marquee-track').innerHTML = `<span>${run}</span><span>${run}</span>`;
    $('#marquee').hidden = !state.items.length;
  }

  function renderChips() {
    const cats = categories();
    $('#toolbar').hidden = !state.items.length;
    $('#chips').hidden = cats.length < 2;
    const chip = (value, label, n) =>
      `<button class="chip${state.category === value ? ' is-on' : ''}" data-cat="${esc(value)}" role="tab" aria-selected="${state.category === value}">${esc(label)}<small>${n}</small></button>`;
    $('#chips').innerHTML = chip('all', 'Todo', inSection().length) + cats.map(([c, n]) => chip(c, c, n)).join('');
  }

  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.category = b.dataset.cat;
    $$('.chip', $('#chips')).forEach((c) => { c.classList.toggle('is-on', c === b); c.setAttribute('aria-selected', c === b); });
    b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    renderGrid();
  });

  $('#clear-filters').addEventListener('click', () => {
    if (!inSection().length && state.section === 'articulos') { location.hash = '#/'; return; }
    state.category = 'all';
    renderChips();
    renderGrid();
  });

  // Promoción "N por $X" (it.promo): el cliente elige entre pieza suelta o paquete. En el carrito
  // cada opción es un renglón: la clave es el id (suelto) o id + PACK (paquetes; qty = paquetes).
  const PACK = '~p';
  const hasPromo = (it) => Boolean(it && it.promo && it.promo.cantidad > 1 && it.promo.precio > 0);
  const keyOf = (id, pack) => (pack ? id + PACK : id);
  const parseKey = (k) => ({ id: k.endsWith(PACK) ? k.slice(0, -PACK.length) : k, pack: k.endsWith(PACK) });
  const piecesOf = (it, pack) => (pack && hasPromo(it) ? it.promo.cantidad : 1);
  const unitPrice = (it, pack) => (pack && hasPromo(it) ? it.promo.precio : it.price);
  const lineTotal = (it, qty, pack = false) => unitPrice(it, pack) * qty;
  const optLabel = (it, pack) => (pack ? `Paquete de ${it.promo.cantidad}` : `1 ${it.unit || 'pieza'}`);
  const promoText = (it) => (hasPromo(it) ? `${it.promo.cantidad} por ${fmt(it.promo.precio)}` : '');
  const promoTag = (it) => (hasPromo(it) ? `<small class="off">${it.promo.cantidad}×${fmt(it.promo.precio)}</small>` : '');

  // Stock: null = sin contar (solo aplica el máximo por pedido). Con promoción, suelto y paquete
  // comparten el mismo stock en piezas.
  function piecesInCart(id, exceptKey) {
    const it = state.byId.get(id);
    return Object.entries(state.cart).reduce((sum, [k, q]) => {
      const p = parseKey(k);
      return p.id === id && k !== exceptKey ? sum + q * piecesOf(it, p.pack) : sum;
    }, 0);
  }
  function maxForKey(it, pack = false) {
    const n = piecesOf(it, pack);
    if (!Number.isInteger(it.stock)) return MAX_QTY;
    const libres = it.stock - piecesInCart(it.id, keyOf(it.id, pack));
    return Math.max(0, Math.min(MAX_QTY, Math.floor(libres / n)));
  }
  const maxFor = (it) => maxForKey(it, false);
  const stockTag = (it) => (Number.isInteger(it.stock) && it.status === 'disponible' && it.stock <= 10
    ? `<span class="stock-tag">${it.stock === 1 ? '¡Queda 1!' : `Quedan ${it.stock}`}</span>` : '');

  // ------------------------------------------------------------ menú

  function visibleItems() {
    return inSection()
      .filter((it) => state.category === 'all' || it.category === state.category)
      .sort((a, b) => (a.status === 'agotado') - (b.status === 'agotado'));
  }

  function shapeFor(it, i) {
    if (it.status === 'agotado') return '';
    if (i === 0) return 'wide';
    return '';
  }

  function addControl(it) {
    if (it.status !== 'disponible' || !state.settings.abierto) return '';
    if (hasPromo(it)) {
      // Con promoción el + abre la ficha para elegir entre suelto o paquete.
      const n = (state.cart[it.id] || 0) + (state.cart[keyOf(it.id, true)] || 0);
      return `<button class="card-add" data-open="${it.id}" aria-label="Elegir ${esc(it.title)}"><svg><use href="#i-plus"/></svg>${n ? `<span class="count">${n}</span>` : ''}</button>`;
    }
    const q = state.cart[it.id] || 0;
    if (!q) return `<button class="card-add" data-add="${it.id}" aria-label="Agregar ${esc(it.title)}"><svg><use href="#i-plus"/></svg></button>`;
    return `<div class="stepper card-step" data-stepper="${it.id}">
      <button type="button" data-dec="${it.id}" aria-label="Menos"><svg><use href="#i-minus"/></svg></button>
      <output>${q}</output>
      <button type="button" data-inc="${it.id}" aria-label="Más" ${q >= maxFor(it) ? 'disabled' : ''}><svg><use href="#i-plus"/></svg></button>
    </div>`;
  }

  function cardHTML(it, i, entering) {
    const sold = it.status === 'agotado';
    return `
      <article class="card ${shapeFor(it, i)}${sold ? ' is-sold' : ''}${entering ? '' : ' in'}" data-id="${it.id}" style="--d:${(i % 6) * 70}">
        <div class="card-tilt">
          ${pic(it)}
          ${sold ? '<span class="sold-stamp">Agotado</span>' : `<span class="price-tag${it.price ? '' : ' tbd'}">${it.price ? fmt(it.price) : 'Por confirmar'}${promoTag(it)}</span>`}
          ${it.featured && !sold ? '<span class="sticker s-nuevo">Favorito</span>' : ''}
          <button class="card-open" data-open="${it.id}" aria-label="Ver ${esc(it.title)}"></button>
          <div class="card-info">
            <div>
              <h3>${esc(it.title)}</h3>
              <p class="meta">${it.unit ? `<span>${esc(it.unit)}</span>` : it.category ? `<span>${esc(it.category)}</span>` : ''}${stockTag(it)}</p>
            </div>
            ${addControl(it)}
          </div>
        </div>
      </article>`;
  }

  let revealer = null;
  function renderGrid() {
    const list = visibleItems();
    const grid = $('#grid');
    const entering = !state.gridReady;
    grid.innerHTML = list.map((it, i) => cardHTML(it, i, entering)).join('');
    const all = inSection();
    const empty = $('#empty');
    empty.hidden = list.length > 0;
    $('.empty-art use', empty).setAttribute('href', state.section === 'articulos' ? '#i-gift' : '#i-cake');
    if (!all.length) {
      const art = state.section === 'articulos';
      $('h3', empty).textContent = art ? 'Muy pronto: artículos bonitos' : 'El menú está por salir del horno';
      $('p', empty).textContent = art ? 'Estamos preparando esta sección. Mientras, échale un ojo a los postres.' : 'Vuelve pronto o síguenos en Instagram.';
      $('#clear-filters').textContent = art ? 'Ver postres' : 'Ver todo';
      $('#clear-filters').hidden = !art;
    } else {
      $('h3', empty).textContent = 'Nada por aquí';
      $('p', empty).textContent = 'Prueba otra categoría.';
      $('#clear-filters').textContent = 'Ver todo';
      $('#clear-filters').hidden = false;
    }
    const avail = all.filter((i) => i.status === 'disponible').length;
    const noun = state.section === 'articulos' ? 'artículos' : 'postres';
    $('#result-line').textContent = all.length ? `${avail} de ${all.length} ${noun} disponibles para la próxima entrega` : '';

    if (entering) {
      revealer?.disconnect();
      revealer = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
      }, { rootMargin: '0px 0px -8% 0px' });
      $$('.card', grid).forEach((c) => revealer.observe(c));
    }
  }

  function repaintCard(id) {
    const card = $(`#grid .card[data-id="${id}"]`);
    const it = state.byId.get(id);
    if (!card || !it) return;
    const info = $('.card-info', card);
    $('.card-add, .card-step', info)?.remove();
    info.insertAdjacentHTML('beforeend', addControl(it));
  }

  // Clics delegados en todo el documento.
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); setQty(add.dataset.add, 1, true); return; }
    const inc = e.target.closest('[data-inc]');
    if (inc) { e.preventDefault(); setQty(inc.dataset.inc, (state.cart[inc.dataset.inc] || 0) + 1); return; }
    const dec = e.target.closest('[data-dec]');
    if (dec) { e.preventDefault(); setQty(dec.dataset.dec, (state.cart[dec.dataset.dec] || 0) - 1); return; }
    const open = e.target.closest('[data-open]');
    if (open) { e.preventDefault(); openItem(open.dataset.open); return; }
    if (e.target.closest('[data-open-list]')) { openList(); return; }
    if (e.target.closest('[data-close-sheet]')) { closeItem(); return; }
    if (e.target.closest('[data-close-list]')) closeList();
    if (e.target.closest('[data-close-ap]')) closeCheckout();
  });

  // ------------------------------------------------------------ pedido (carrito)

  // key = id del producto (suelto) o id + PACK (paquete de promoción).
  function setQty(key, qty, announce = false) {
    const { id, pack } = parseKey(key);
    const it = state.byId.get(id);
    if (!it) return;
    const q = clamp(Math.round(qty), 0, maxForKey(it, pack));
    const before = state.cart[key] || 0;
    if (qty > q && q === before) toast(it.stock ? `Solo quedan ${it.stock} piezas` : 'Se agotó', 'i-info');
    if (q) state.cart[key] = q; else delete state.cart[key];
    store('postres-pedido', state.cart);
    if (announce && q > before) toast(`${it.title}${hasPromo(it) ? ` · ${optLabel(it, pack)}` : ''} en tu pedido`, 'i-bag');
    repaintCard(id);
    renderCartUI(q > before);
  }

  const cartLines = () => Object.entries(state.cart)
    .map(([key, qty]) => {
      const { id, pack } = parseKey(key);
      const it = state.byId.get(id);
      return { key, it, qty, pack: pack && hasPromo(it) };
    })
    .filter((l) => l.it);
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);

  function totals(tipo = 'domicilio', anticipada = false, fuera = false) {
    const s = state.settings;
    const lines = cartLines().filter((l) => l.it.status === 'disponible');
    const subtotal = lines.reduce((sum, l) => sum + lineTotal(l.it, l.qty, l.pack), 0);
    const pending = lines.some((l) => !l.it.price);
    const envio = tipo === 'domicilio' && s.costoEnvio && !(s.envioGratisDesde && subtotal >= s.envioGratisDesde) ? s.costoEnvio : 0;
    const extra = anticipada ? s.extraAnticipada || 0 : 0;
    const extraZona = fuera && tipo === 'domicilio' ? s.extraFueraZona || 0 : 0;
    return { lines, subtotal, envio, extra, extraZona, total: subtotal + envio + extra + extraZona, pending };
  }

  function clauseText() {
    const s = state.settings;
    return `Cláusula de entrega anticipada: nuestro horario de entrega es ${diasText()} de ${(s.horarios || []).join(' o ')}. `
      + `Si quieres tu pedido otro día o antes de las 8:00 pm, se cobra un cargo extra de ${fmt(s.extraAnticipada || 0)} por pedido, `
      + 'sujeto a disponibilidad. Te contactamos para confirmarlo antes de aceptarlo.';
  }

  function renderCartUI(bump = false) {
    const n = cartCount();
    $$('[data-list-count]').forEach((c) => {
      c.hidden = !n;
      c.textContent = n;
      if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    });
    if (!$('#drawer').hidden) renderCartBody();
  }

  function renderCartBody() {
    const lines = cartLines();
    const body = $('#list-body');
    const s = state.settings;
    $('#list-foot').hidden = !lines.length;
    const n = cartCount();
    $('#list-sub').textContent = n ? `${n} ${n === 1 ? 'postre' : 'postres'} · revisa antes de continuar.` : 'Lo que vas a pedir.';
    if (!lines.length) {
      body.innerHTML = `
        <div class="list-empty">
          <div class="empty-art"><svg><use href="#i-bag"/></svg></div>
          <h3>Tu pedido está vacío</h3>
          <p>Toca <b>+</b> en los postres que se te antojen.</p>
        </div>`;
      return;
    }
    body.innerHTML = lines.map(({ key, it, qty, pack }, i) => `
      <div class="li" style="--i:${i}" data-li="${esc(key)}">
        <button class="li-img" data-open="${it.id}" aria-label="Ver ${esc(it.title)}">${pic(it)}</button>
        <div class="li-main">
          <b>${esc(it.title)}</b>
          ${it.status === 'disponible'
            ? `<span>${hasPromo(it) ? `<em class="li-opt">${esc(optLabel(it, pack))}</em> · ` : ''}${it.price ? `${fmt(unitPrice(it, pack))} ${pack ? 'c/paquete' : 'c/u'}` : 'Precio por confirmar'}${qty > 1 && it.price ? ` · <b>${fmt(lineTotal(it, qty, pack))}</b>` : ''}</span>`
            : '<span class="warn">Se agotó · quítalo para continuar</span>'}
        </div>
        <div class="stepper sm">
          <button type="button" data-dec="${esc(key)}" aria-label="Menos"><svg><use href="#i-${qty === 1 ? 'trash' : 'minus'}"/></svg></button>
          <output>${qty}</output>
          <button type="button" data-inc="${esc(key)}" aria-label="Más" ${qty >= maxForKey(it, pack) ? 'disabled' : ''}><svg><use href="#i-plus"/></svg></button>
        </div>
      </div>`).join('');
    const t = totals();
    const rows = [`<div class="total-row"><span>Subtotal</span><b>${fmt(t.subtotal)}</b></div>`];
    if (s.costoEnvio) {
      rows.push(`<div class="total-row"><span>Envío a domicilio</span><b>${t.envio ? fmt(t.envio) : 'Gratis'}</b></div>`);
    }
    rows.push(`<div class="total"><span>Total</span><strong>${fmt(t.total)}</strong></div>`);
    $('#list-totals').innerHTML = rows.join('');
    const hints = [];
    if (t.pending) hints.push('Algunos precios están por confirmar: te decimos el total al confirmar tu pedido.');
    if (s.envioGratisDesde && t.subtotal < s.envioGratisDesde && s.costoEnvio) hints.push(`Te faltan ${fmt(s.envioGratisDesde - t.subtotal)} para el envío gratis.`);
    if (s.pedidoMinimo && !t.pending && t.subtotal < s.pedidoMinimo) hints.push(`El pedido mínimo es de ${fmt(s.pedidoMinimo)}.`);
    if (!s.abierto) hints.push('Por ahora no estamos tomando pedidos en línea.');
    $('#list-hint').textContent = hints.join(' ');
    $('#list-hint').hidden = !hints.length;
    const blocked = !s.abierto || lines.some((l) => l.it.status !== 'disponible') || (s.pedidoMinimo && !t.pending && t.subtotal < s.pedidoMinimo);
    $('#to-checkout').disabled = Boolean(blocked);
  }

  $('#list-clear').addEventListener('click', () => {
    const ids = Object.keys(state.cart);
    state.cart = {};
    store('postres-pedido', {});
    ids.forEach(repaintCard);
    renderCartUI();
    toast('Pedido vacío', 'i-trash');
  });

  function openList() {
    const d = $('#drawer');
    renderCartBody();
    d.hidden = false;
    document.body.classList.add('lock');
    void d.offsetWidth;
    d.classList.add('open');
  }
  function closeList() {
    const d = $('#drawer');
    if (d.hidden) return;
    d.classList.remove('open');
    setTimeout(() => { d.hidden = true; if (!state.sheetId && $('#ap').hidden) document.body.classList.remove('lock'); }, 450);
  }

  // ------------------------------------------------------------ detalle

  function openItem(id) {
    if (state.sheetId === id) return;
    if (state.sheetId) { history.replaceState(null, '', `#/item/${id}`); showSheet(id); return; }
    state.sheetPushed = true;
    location.hash = `#/item/${id}`;
  }

  function closeItem() {
    if (!state.sheetId) return;
    if (state.sheetPushed) history.back();
    else { history.replaceState(null, '', '#/'); hideSheet(); }
  }

  function showSheet(id) {
    const it = state.byId.get(id);
    if (!it) {
      toast('Ese postre ya no está en el menú', 'i-info');
      history.replaceState(null, '', '#/');
      hideSheet();
      return;
    }
    if (!$('#drawer').hidden) closeList();
    state.sheetId = id;
    const s = state.settings;

    const imgs = it.images && it.images.length ? it.images : [null];
    $('#g-track').innerHTML = it.images && it.images.length
      ? imgs.map((src, i) => `<img src="${esc(src)}" alt="" ${i > 0 ? 'loading="lazy"' : ''} decoding="async" draggable="false">`).join('')
      : pic(it, false);
    $('#g-track').scrollLeft = 0;
    $('#g-dots').innerHTML = imgs.length > 1 ? imgs.map((_, i) => `<span class="${i === 0 ? 'is-on' : ''}"></span>`).join('') : '';
    $('#g-prev').hidden = $('#g-next').hidden = imgs.length < 2;
    paintGalleryNav();

    $('#d-chips').innerHTML = [it.category, it.featured ? 'Favorito' : ''].filter(Boolean).map((c) => `<span>${esc(c)}</span>`).join('');
    $('#d-title').textContent = it.title;
    $('#d-price').textContent = priceLabel(it);
    $('#d-price').classList.toggle('tbd', !it.price);
    $('#d-unit').textContent = [it.unit ? `por ${it.unit}` : '', promoText(it),
      Number.isInteger(it.stock) && it.status === 'disponible' ? `${it.stock} disponibles` : ''].filter(Boolean).join(' · ');
    const st = $('#d-status');
    st.className = `status-pill st-${it.status === 'disponible' ? 'disponible' : 'vendido'}`;
    st.textContent = it.status === 'disponible' ? 'Disponible' : 'Agotado';
    $('#d-desc').textContent = it.description || '';
    $('#d-desc').hidden = !it.description;
    const fechas = s.fechas || [];
    const horas = (s.horarios || []).join(' o ');
    $('#d-note-text').textContent = (fechas.length ? ` Próxima entrega: ${dayLabel(fechas[0])}${horas ? `, ${horas}` : ''}. ` : ' ')
      + (s.avisoPedido || '')
      + (s.entregaAnticipada ? ` ¿Lo quieres antes? Cargo extra de ${fmt(s.extraAnticipada || 0)}.` : '');

    const rel = state.items.filter((x) => x.id !== it.id && x.status === 'disponible').slice(0, 6);
    $('#related').hidden = !rel.length;
    $('#related-track').innerHTML = rel.map((x) => `
      <a class="mini" href="#/item/${x.id}" data-open="${x.id}">
        <div class="mini-img">${pic(x)}</div>
        <b>${esc(priceLabel(x))}</b><span>${esc(x.title)}</span>
      </a>`).join('');

    const can = it.status === 'disponible' && s.abierto;
    // Con promoción se elige suelto o paquete; por omisión, el paquete (es lo que conviene).
    const opts = $('#d-opts');
    if (opts) opts.hidden = !hasPromo(it) || !can;
    if (opts && hasPromo(it)) {
      opts.innerHTML = [false, true].map((pack) => `
        <button type="button" data-pack="${pack ? 1 : 0}">
          <b>${esc(optLabel(it, pack))}</b><small>${fmt(unitPrice(it, pack))}${pack ? ` · ${fmt(unitPrice(it, pack) / it.promo.cantidad)} c/u` : ''}</small>
        </button>`).join('');
    }
    state.sheetPack = hasPromo(it) && !state.cart[id];
    sheetSync();
    paintSheetAdd(can);

    $('#sheet-body').scrollTop = 0;
    $('.d-info').scrollTop = 0;
    const sheet = $('#sheet');
    if (sheet.hidden) {
      sheet.hidden = false;
      document.body.classList.add('lock');
      void sheet.offsetWidth;
      sheet.classList.add('open');
      setTimeout(() => $('.sheet-close').focus({ preventScroll: true }), 60);
    }
  }

  const sheetKey = () => keyOf(state.sheetId, state.sheetPack);

  // Cantidad inicial de la ficha según la opción elegida (lo que ya hay en el pedido, o 1).
  function sheetSync() {
    const it = state.byId.get(state.sheetId);
    if (!it) return;
    state.sheetQty = clamp(state.cart[sheetKey()] || 1, 1, Math.max(1, maxForKey(it, state.sheetPack)));
    $$('#d-opts button').forEach((b) => b.classList.toggle('is-on', b.dataset.pack === (state.sheetPack ? '1' : '0')));
  }

  // ?. : un index.html viejo en caché no trae #d-opts; la ficha sigue funcionando sin él.
  $('#d-opts')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pack]');
    if (!b) return;
    state.sheetPack = b.dataset.pack === '1';
    sheetSync();
    paintSheetAdd(true);
  });

  function paintSheetAdd(can) {
    const it = state.byId.get(state.sheetId);
    const inCart = state.cart[sheetKey()] || 0;
    if (can && it && maxForKey(it, state.sheetPack) < 1) can = false; // ya no alcanza el stock para esta opción
    $('#d-stepper').hidden = !can;
    $('#d-qty').textContent = state.sheetQty;
    const btn = $('#d-add');
    btn.disabled = !can;
    $('span', btn).textContent = !can
      ? (!state.settings.abierto ? 'Pedidos en pausa' : it && it.status === 'disponible' ? 'Sin piezas suficientes' : 'Agotado')
      : inCart ? (inCart === state.sheetQty ? 'Ver mi pedido' : 'Actualizar pedido')
        : `Agregar${it && it.price ? ` · ${fmt(lineTotal(it, state.sheetQty, state.sheetPack))}` : ' al pedido'}`;
  }

  $('#d-stepper').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const it = state.byId.get(state.sheetId);
    state.sheetQty = clamp(state.sheetQty + Number(b.dataset.step), 1, Math.max(1, it ? maxForKey(it, state.sheetPack) : MAX_QTY));
    paintSheetAdd(true);
  });

  $('#d-add').addEventListener('click', () => {
    if (!state.sheetId) return;
    const key = sheetKey();
    if ((state.cart[key] || 0) === state.sheetQty) { closeItem(); setTimeout(openList, 350); return; }
    setQty(key, state.sheetQty, true);
    paintSheetAdd(true);
  });

  function hideSheet() {
    const sheet = $('#sheet');
    state.sheetId = null;
    state.sheetPushed = false;
    if (sheet.hidden) return;
    sheet.classList.remove('open');
    sheet.style.removeProperty('--drag');
    setTimeout(() => {
      if (state.sheetId) return;
      sheet.hidden = true;
      if ($('#drawer').hidden && $('#ap').hidden) document.body.classList.remove('lock');
    }, 450);
  }

  $('#d-share').addEventListener('click', async () => {
    const it = state.byId.get(state.sheetId);
    if (!it) return;
    const url = itemUrl(it.id);
    if (navigator.share) {
      try { await navigator.share({ title: it.title, text: `${it.title} — ${priceLabel(it)}`, url }); } catch { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch { prompt('Copia el enlace:', url); }
  });

  // galería
  const gTrack = $('#g-track');
  function paintGalleryNav() {
    const i = Math.round(gTrack.scrollLeft / (gTrack.clientWidth || 1));
    const n = gTrack.children.length;
    $$('#g-dots span').forEach((d, k) => d.classList.toggle('is-on', k === i));
    $('#g-prev').disabled = i <= 0;
    $('#g-next').disabled = i >= n - 1;
  }
  gTrack.addEventListener('scroll', () => requestAnimationFrame(paintGalleryNav), { passive: true });
  $('#g-prev').addEventListener('click', () => gTrack.scrollBy({ left: -gTrack.clientWidth, behavior: 'smooth' }));
  $('#g-next').addEventListener('click', () => gTrack.scrollBy({ left: gTrack.clientWidth, behavior: 'smooth' }));

  // Arrastrar la hoja hacia abajo para cerrarla (móvil).
  (() => {
    const grab = $('#sheet-grab');
    const sheet = $('#sheet');
    let startY = null; let dy = 0; let t0 = 0;
    grab.addEventListener('pointerdown', (e) => {
      startY = e.clientY; dy = 0; t0 = performance.now();
      grab.setPointerCapture(e.pointerId);
      sheet.classList.add('dragging');
    });
    grab.addEventListener('pointermove', (e) => {
      if (startY === null) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.setProperty('--drag', `${dy}px`);
    });
    const end = () => {
      if (startY === null) return;
      startY = null;
      sheet.classList.remove('dragging');
      const fast = dy > 40 && dy / (performance.now() - t0) > 0.6;
      if (dy > 130 || fast) closeItem();
      else sheet.style.removeProperty('--drag');
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  })();

  // ------------------------------------------------------------ entrega y pago

  const apForm = $('#ap-form');
  const F = apForm.elements;

  $('#to-checkout').addEventListener('click', () => { closeList(); setTimeout(openCheckout, 200); });

  function fillSelect(sel, options, placeholder) {
    const prev = sel.value;
    sel.innerHTML = (placeholder ? `<option value="">${esc(placeholder)}</option>` : '')
      + options.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');
    if (options.some(([v]) => v === prev)) sel.value = prev;
  }

  function openCheckout() {
    const s = state.settings;
    const n = cartCount();
    $('#ap-item').textContent = `${n} ${n === 1 ? 'postre' : 'postres'}`;
    $('#ap-error').hidden = true;
    apForm.hidden = false;
    $('#ap-done').hidden = true;

    fillSelect(F.colonia, [...(s.colonias || []).map((c) => [c, c]),
      ...(s.fueraZona ? [[OTRA, `Mi colonia no está en la lista (+${fmt(s.extraFueraZona || 0)})`]] : [])], 'Elige tu colonia');
    $('#zona-clause').textContent = zonaClause();
    paintZona();
    fillSelect(F.horario, (s.horarios || []).map((h) => [h, h]));
    $('#anticipada-box').hidden = !s.entregaAnticipada;
    $('[data-extra]').textContent = fmt(s.extraAnticipada || 0);
    $('#anticipada-clause').textContent = clauseText();
    if (!s.entregaAnticipada) F.anticipada.checked = false;
    setAnticipada(F.anticipada.checked);
    $('#tipo-seg').hidden = !s.puntoEntrega;
    $('#pickup-info').textContent = s.puntoEntrega ? `Recoges en: ${s.puntoEntrega}` : '';
    $('[data-pay="transferencia"]').hidden = !s.transferencia;
    $('#transf-hint').textContent = s.clabe ? 'Te damos la CLABE al terminar' : 'Te mandamos los datos al confirmar';
    if (!s.transferencia) F.pago.value = 'efectivo';
    setTipo(state.tipo === 'recoger' && s.puntoEntrega ? 'recoger' : 'domicilio');

    const saved = recall('postres-contacto', {});
    for (const k of ['nombre', 'telefono', 'instagram', 'colonia', 'coloniaOtra', 'direccion', 'referencias']) {
      if (saved[k] && !F[k].value) F[k].value = saved[k];
    }
    paintPay();
    paintZona();

    const d = $('#ap');
    d.hidden = false;
    document.body.classList.add('lock');
    void d.offsetWidth;
    d.classList.add('open');
    setTimeout(() => (F.nombre.value ? F.telefono : F.nombre).focus({ preventScroll: true }), 120);
  }

  function closeCheckout() {
    const d = $('#ap');
    if (d.hidden) return;
    d.classList.remove('open');
    setTimeout(() => { d.hidden = true; if (!state.sheetId && $('#drawer').hidden) document.body.classList.remove('lock'); }, 450);
  }

  function setTipo(t) {
    state.tipo = t;
    $$('#tipo-seg button').forEach((b) => b.classList.toggle('is-on', b.dataset.tipo === t));
    $('#addr-fields').hidden = t !== 'domicilio';
    $('#pickup-info').hidden = t !== 'recoger';
    paintSummary();
  }
  $('#tipo-seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTipo(b.dataset.tipo); });

  // Entrega anticipada: cualquier día y hora libre, con la cláusula y el cargo a la vista.
  function setAnticipada(on) {
    const s = state.settings;
    fillSelect(F.fecha, ((on ? s.fechasAnticipada : s.fechas) || []).map((d) => [d, dayLabel(d)]));
    $('#horario-field').hidden = on;
    $('#hora-field').hidden = !on;
    $('#anticipada-clause').hidden = !on;
    $('#anticipada-box').classList.toggle('is-on', on);
    paintSummary();
  }

  function zonaClause() {
    const s = state.settings;
    return `Entrega fuera de zona: si tu colonia no está en la lista, podemos llevar tu pedido con un cargo extra de ${fmt(s.extraFueraZona || 0)}, `
      + 'sujeto a la distancia y a que te lo confirmemos. Si no llegamos a tu colonia, te avisamos y no se cobra nada.';
  }

  function paintZona() {
    const otra = F.colonia.value === OTRA;
    $('#otra-zona').hidden = !otra;
    paintSummary();
  }

  apForm.addEventListener('change', (e) => {
    if (e.target.name !== 'pagoExacto') return;
    F.pagaCon.disabled = e.target.checked;
    if (e.target.checked) F.pagaCon.value = '';
  });

  function paintPay() {
    $('#cambio-field').hidden = F.pago.value !== 'efectivo';
    $$('.pay-opt').forEach((o) => o.classList.toggle('is-on', $('input', o).checked));
  }
  apForm.addEventListener('change', (e) => {
    if (e.target.name === 'pago') paintPay();
    if (e.target.name === 'anticipada') setAnticipada(e.target.checked);
    if (e.target.name === 'colonia') paintZona();
  });

  function paintSummary() {
    const t = totals(state.tipo, F.anticipada.checked, F.colonia.value === OTRA);
    const rows = [`<div><span>Subtotal</span><strong>${fmt(t.subtotal)}</strong></div>`];
    if (state.settings.costoEnvio && state.tipo === 'domicilio') rows.push(`<div><span>Envío</span><strong>${t.envio ? fmt(t.envio) : 'Gratis'}</strong></div>`);
    if (t.extra) rows.push(`<div><span>Entrega anticipada</span><strong>${fmt(t.extra)}</strong></div>`);
    if (t.extraZona) rows.push(`<div><span>Fuera de zona</span><strong>${fmt(t.extraZona)}</strong></div>`);
    rows.push(`<div class="grand"><span>Total${t.pending ? ' (más precios por confirmar)' : ''}</span><strong>${fmt(t.total)}</strong></div>`);
    $('#ap-sum').innerHTML = rows.join('');
  }

  apForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#ap-error');
    const fail = (msg, field) => { err.textContent = msg; err.hidden = false; field?.focus(); if (!field) err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    err.hidden = true;
    const tel = F.telefono.value.replace(/\D/g, '').slice(-10);
    if (!F.nombre.value.trim()) return fail('Escribe tu nombre.', F.nombre);
    if (tel.length !== 10) return fail('Tu WhatsApp debe tener 10 dígitos.', F.telefono);
    if (state.tipo === 'domicilio' && !F.colonia.value) return fail('Elige tu colonia.', F.colonia);
    if (state.tipo === 'domicilio' && F.colonia.value === OTRA && !F.coloniaOtra.value.trim()) return fail('Escribe el nombre de tu colonia.', F.coloniaOtra);
    if (state.tipo === 'domicilio' && !F.direccion.value.trim()) return fail('Escribe calle y número.', F.direccion);
    if (!F.fecha.value) return fail('No hay días de entrega disponibles. Escríbenos por Instagram.');
    if (F.anticipada.checked && !F.horaAnticipada.value.trim()) return fail('Escribe a qué hora quieres la entrega anticipada.', F.horaAnticipada);
    if (!F.pago.value) return fail('Elige cómo vas a pagar.');
    if (F.pago.value === 'efectivo' && !F.pagoExacto.checked) {
      const con = Number(F.pagaCon.value) || 0;
      const total = totals(state.tipo, F.anticipada.checked, F.colonia.value === OTRA).total;
      if (!con) return fail('Dinos con cuánto vas a pagar para llevarte cambio, o marca "Pago exacto".', F.pagaCon);
      if (total && con < total) return fail(`Tu pedido es de ${fmt(total)}: el monto con el que pagas no alcanza.`, F.pagaCon);
    }

    const btn = $('#ap-send');
    btn.disabled = true;
    $('span', btn).textContent = 'Enviando…';
    try {
      const pedido = {
        lineas: cartLines().map((l) => ({ id: l.it.id, qty: l.qty, pack: l.pack })),
        nombre: F.nombre.value, telefono: tel, instagram: F.instagram.value,
        tipo: state.tipo, colonia: F.colonia.value, direccion: F.direccion.value, referencias: F.referencias.value,
        fueraZona: F.colonia.value === OTRA, coloniaOtra: F.coloniaOtra.value,
        fecha: F.fecha.value, horario: F.horario.value,
        anticipada: F.anticipada.checked, horaAnticipada: F.horaAnticipada.value,
        pago: F.pago.value, pagaCon: F.pagaCon.value, pagoExacto: F.pagoExacto.checked,
        notas: F.notas.value, website: F.website.value,
      };
      let res;
      if (ESTATICO) {
        const local = pedidoLocal(pedido);
        if (state.settings.correoPedidos) {
          try {
            await enviarCorreo(local, pedido);
            local.enviado = true;
          } catch (ex) {
            return fail(`No pudimos enviar tu pedido (${ex.message}). Inténtalo de nuevo en un momento.`);
          }
        }
        res = { ok: true, status: 200, json: async () => local };
      } else {
        res = await fetch('/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        fail(data.error || 'No se pudo enviar. Inténtalo otra vez.');
        if (res.status === 409) refreshCatalog();
        return;
      }
      store('postres-contacto', {
        nombre: F.nombre.value.trim(), telefono: tel, instagram: F.instagram.value.trim(),
        colonia: F.colonia.value, coloniaOtra: F.coloniaOtra.value.trim(), direccion: F.direccion.value.trim(), referencias: F.referencias.value.trim(),
      });
      showDone(data);
      const ids = Object.keys(state.cart);
      state.cart = {};
      store('postres-pedido', {});
      ids.forEach(repaintCard);
      renderCartUI();
    } catch {
      fail('Sin conexión. Revisa tu internet e inténtalo otra vez.');
    } finally {
      btn.disabled = false;
      $('span', btn).textContent = 'Hacer pedido';
    }
  });

  // Manda el pedido al correo del negocio con FormSubmit (formsubmit.co): sin servidor propio.
  // La primera vez FormSubmit pide activar el correo con un enlace que llega a esa bandeja.
  async function enviarCorreo(data, p) {
    const s = state.settings;
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(s.correoPedidos)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Pedido ${data.folio} · ${p.nombre.trim()} · ${fmt(data.total)}`,
        _template: 'box',
        _captcha: 'false',
        _honey: p.website,
        Folio: data.folio,
        Cliente: p.nombre.trim(),
        Teléfono: p.telefono,
        Instagram: p.instagram.trim(),
        Entrega: `${data.fecha} · ${data.horario}`,
        Pago: p.pago,
        Total: fmt(data.total),
        Pedido: data.resumen,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || `Error ${res.status}`);
  }

  // Arma el pedido en el navegador con las mismas reglas que server.js (modo estático).
  function pedidoLocal(p) {
    const s = state.settings;
    const fuera = p.tipo === 'domicilio' && p.fueraZona && s.fueraZona;
    const t = totals(p.tipo, p.anticipada && s.entregaAnticipada, fuera);
    const ahora = new Date();
    const folio = `PB-${new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit', day: '2-digit' }).format(ahora).replace('-', '')}`
      + `-${String(ahora.getTime() % 10000).padStart(4, '0')}`;
    const horario = p.anticipada ? p.horaAnticipada.trim() : p.horario;
    const colonia = fuera ? p.coloniaOtra.trim() : p.colonia;
    const pagaCon = p.pago === 'efectivo' ? Number(p.pagaCon) || 0 : 0;
    const resumen = [
      `Pedido ${folio}`,
      '',
      ...t.lines.map((l) => `  ${l.qty} × ${l.it.title}${hasPromo(l.it) ? ` (${l.pack ? `paquete de ${l.it.promo.cantidad}` : 'suelta'})` : ''}`
        + `${l.it.price ? ` — ${fmt(lineTotal(l.it, l.qty, l.pack))}` : ' — precio por confirmar'}`),
      '',
      `Subtotal: ${fmt(t.subtotal)}`,
      t.envio ? `Envío: ${fmt(t.envio)}` : null,
      t.extra ? `Entrega anticipada: ${fmt(t.extra)}` : null,
      t.extraZona ? `Fuera de zona (por confirmar): ${fmt(t.extraZona)}` : null,
      `Total: ${fmt(t.total)}${t.pending ? ' (hay precios por confirmar)' : ''}`,
      '',
      `Cliente: ${p.nombre.trim()} · ${p.telefono}${p.instagram.trim() ? ` · IG @${p.instagram.trim().replace(/^@/, '')}` : ''}`,
      p.tipo === 'recoger' ? `Recoge en: ${s.puntoEntrega}` : `Entrega: ${p.direccion.trim()}, ${colonia}${p.referencias.trim() ? ` (${p.referencias.trim()})` : ''}`,
      `Día: ${dayLabel(p.fecha)} · ${horario}${p.anticipada ? ' (entrega anticipada)' : ''}`,
      `Pago: ${p.pago}${p.pago === 'efectivo' ? (p.pagoExacto ? ' (pago exacto)' : pagaCon ? ` (paga con ${fmt(pagaCon)} · llevar cambio de ${fmt(Math.max(0, pagaCon - t.total))})` : '') : ''}`,
      p.notas.trim() ? `Notas: ${p.notas.trim()}` : null,
    ].filter((l) => l !== null).join('\n');
    const out = {
      ok: true, folio, total: t.total, envio: t.envio, extra: t.extra, extraZona: t.extraZona, fueraZona: fuera,
      anticipada: p.anticipada, precioPendiente: t.pending, resumen, fecha: dayLabel(p.fecha), horario, local: true,
      pago: p.pago, telefono: p.telefono,
    };
    if (p.pago === 'transferencia' && s.clabe) out.banco = { beneficiario: s.beneficiario, clabe: s.clabe, banco: s.banco };
    return out;
  }

  function showDone(data) {
    const s = state.settings;
    if (data.local && data.enviado) {
      // El pedido ya llegó por correo: se le avisa al cliente que lo contactaremos.
      const tel = data.telefono.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
      $('#ap-done h2').textContent = '¡Pedido recibido!';
      $('#ap-done-text').innerHTML = `Tu folio es <b>${esc(data.folio)}</b>. Entrega el <b>${esc(data.fecha)}</b>, <b>${esc(data.horario)}</b>. `
        + `Total: <b>${fmt(data.total)}</b>${data.precioPendiente ? ' más los precios por confirmar' : ''}. `
        + `Te contactamos al <b>${esc(tel)}</b> para confirmar.`
        + (data.pago === 'transferencia' && !data.banco ? ' Al confirmar te enviamos los datos para la transferencia.' : '');
    } else if (data.local) {
      // Sin correo configurado: el cliente copia su pedido y nos lo manda.
      $('#ap-done h2').textContent = s.whatsapp ? '¡Ya casi! Envíanos tu pedido' : 'Tu pedido está listo';
      $('#ap-done-text').innerHTML = s.whatsapp
        ? `Toca <b>Enviar por WhatsApp</b> para que nos llegue tu pedido <b>${esc(data.folio)}</b> (${esc(data.fecha)}, ${esc(data.horario)}). Total: <b>${fmt(data.total)}</b>${data.precioPendiente ? ' más los precios por confirmar' : ''}.`
        : `Copia este resumen y mándanoslo por mensaje:<textarea class="resumen" readonly rows="10">${esc(data.resumen)}</textarea>`;
    } else {
      $('#ap-done h2').textContent = '¡Pedido recibido!';
    $('#ap-done-text').innerHTML = `Tu folio es <b>${esc(data.folio)}</b>. Entrega el <b>${esc(data.fecha)}</b>, <b>${esc(data.horario)}</b>`
      + `${data.anticipada ? ` (anticipada, incluye ${fmt(data.extra)} extra)` : ''}. `
      + `${data.fueraZona ? `Tu colonia está fuera de nuestra zona: incluye ${fmt(data.extraZona)} extra y te confirmamos por WhatsApp si llegamos; si no, no se cobra nada. ` : ''}`
      + `Total: <b>${fmt(data.total)}</b>${data.precioPendiente ? ' más los precios por confirmar' : ''}. Te escribimos por WhatsApp para confirmar.`;
    }
    const bank = $('#bank');
    bank.hidden = !data.banco;
    if (data.banco) {
      bank.innerHTML = `
        <p class="bank-title">Datos para tu transferencia</p>
        <dl>
          ${data.banco.beneficiario ? `<dt>Beneficiario</dt><dd>${esc(data.banco.beneficiario)}</dd>` : ''}
          <dt>CLABE</dt><dd class="clabe">${esc(data.banco.clabe)} <button type="button" class="copy" data-copy="${esc(data.banco.clabe)}" aria-label="Copiar CLABE"><svg><use href="#i-copy"/></svg></button></dd>
          ${data.banco.banco ? `<dt>Banco</dt><dd>${esc(data.banco.banco)}</dd>` : ''}
          <dt>Concepto</dt><dd>${esc(data.folio)}</dd>
        </dl>
        <p class="hint">Mándanos tu comprobante cuando te contactemos.</p>`;
    }
    const wa = $('#done-wa');
    wa.hidden = !s.whatsapp || Boolean(data.enviado);
    if (s.whatsapp) wa.href = waUrl(`¡Hola! ${data.local ? 'Quiero hacer este pedido' : 'Acabo de hacer mi pedido en la página'}.\n\n${data.resumen}`);
    const ig = $('#done-ig');
    ig.hidden = !s.instagram;
    if (s.instagram) ig.href = igUrl(s.instagram);
    const fb = $('#done-fb');
    if (fb) { fb.hidden = !s.facebook; if (s.facebook) fb.href = fbUrl(s.facebook); }
    apForm.hidden = true;
    $('#ap-done').hidden = false;
  }

  $('#bank').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('CLABE copiada'); } catch { prompt('Copia la CLABE:', b.dataset.copy); }
  });

  async function refreshCatalog() {
    try {
      await fetchCatalog();
      renderHero();
      renderGrid();
      renderCartUI();
      if (state.sheetId && state.byId.has(state.sheetId)) showSheet(state.sheetId);
    } catch { /* se queda lo que hay */ }
  }

  // ------------------------------------------------------------ cómo pedir y pie

  function renderHow() {
    const s = state.settings;
    $('#how-aviso').textContent = s.avisoPedido || '';
    const dias = diasText();
    $('#how-dias').textContent = `${dias ? `Entregamos ${dias}` : 'Elige el día que te acomode'}${s.horarios?.length ? `, en horario de ${s.horarios.join(' o ')}` : ''}.`;
    $('#how-pago').textContent = s.transferencia
      ? `Transferencia (${s.clabe ? 'te damos la CLABE al terminar tu pedido' : 'te mandamos los datos al confirmar'}) o efectivo al recibir. Si pagas en efectivo, dinos con cuánto pagas para llevarte cambio.`
      : 'Efectivo al recibir. Dinos con cuánto pagas para llevarte cambio.';
    $('#how-early').hidden = !s.entregaAnticipada;
    $('#how-clause').textContent = clauseText();
    $('#how-zona').textContent = s.zona || '';
    $('#how-colonias').innerHTML = (s.colonias || []).map((c) => `<li>${esc(c)}</li>`).join('');
    $('#how-zona-card').hidden = !s.fueraZona;
    $('#how-zona-clause').hidden = !s.fueraZona;
    $('#how-zona-clause').textContent = zonaClause();
    const btns = [];
    if (s.whatsapp) btns.push(`<a class="btn btn-primary btn-wa" href="${esc(waUrl('¡Hola! Quiero saber si entregan en mi colonia: '))}" target="_blank" rel="noopener"><svg><use href="#i-chat"/></svg>WhatsApp</a>`);
    if (msgUrl(s)) btns.push(`<a class="btn btn-primary" href="${esc(msgUrl(s))}" target="_blank" rel="noopener"><svg><use href="#i-msg"/></svg>Messenger</a>`);
    if (s.instagram) btns.push(`<a class="btn btn-ghost" href="${esc(igUrl(s.instagram))}" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Instagram</a>`);
    $('#how-zona-btns').innerHTML = btns.join('');

    // Escríbenos: solo Messenger / Facebook / Instagram. Sin número personal ni formulario por correo
    // (se quitó el 2026-11-11; los pedidos sí siguen llegando al correo por FormSubmit).
    const cbtns = [];
    if (msgUrl(s)) cbtns.push(`<a class="btn btn-primary" href="${esc(msgUrl(s))}" target="_blank" rel="noopener"><svg><use href="#i-msg"/></svg>Messenger</a>`);
    if (s.facebook) cbtns.push(`<a class="btn btn-ghost" href="${esc(fbUrl(s.facebook))}" target="_blank" rel="noopener"><svg><use href="#i-fb"/></svg>Facebook</a>`);
    if (s.instagram) cbtns.push(`<a class="btn btn-ghost" href="${esc(igUrl(s.instagram))}" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>@${esc(s.instagram)}</a>`);
    const cb = $('#contact-btns');
    if (cb) cb.innerHTML = cbtns.join('');
    const card = $('#how-contact');
    if (card) card.hidden = !cbtns.length;
    renderFaq();
  }

  // Preguntas frecuentes: salen de settings para no desfasarse del catálogo.
  // Mismas respuestas que la base de Messenger (vault: "Punto Bonito — Base de respuestas").
  function renderFaq() {
    const s = state.settings;
    const list = $('#faq-list');
    if (!list) return;
    const dias = diasText();
    const horas = (s.horarios || []).join(' o ');
    const colonias = s.colonias || [];
    const ant = s.anticipacionDias || 0;
    const faq = [
      ['¿Qué tienen hoy?',
        'Todo lo disponible está en el menú con su precio. Si algo dice “Agotado”, se nos acabó: vuelve pronto 💛'],
      ['¿Entregan en mi colonia?',
        colonias.length
          ? `Entregamos en ${colonias.length > 1 ? `${colonias.slice(0, -1).join(', ')} y ${colonias[colonias.length - 1]}` : colonias[0]}. Por ahora no llegamos a otras colonias; te avisamos en cuanto ampliemos la zona.`
          : s.zona || ''],
      ['¿Qué días y a qué hora entregan?',
        dias ? `${dias[0].toUpperCase()}${dias.slice(1)}${horas ? `, de ${horas}` : ''}.` : ''],
      ['¿Con cuánta anticipación pido?',
        ant ? `Con ${ant === 1 ? 'un día' : `${ant} días`} de anticipación.` : 'Puedes pedir para el siguiente día de entrega.'],
      ['¿Puedo recibirlo otro día o más temprano?',
        s.entregaAnticipada
          ? `Sí, como entrega anticipada, con un cargo extra de ${fmt(s.extraAnticipada || 0)} por pedido. Te confirmamos si se puede antes de aceptarlo.`
          : ''],
      ['¿Cuánto cuesta el envío?',
        !s.costoEnvio
          ? `Es gratis dentro de nuestras colonias${s.pedidoMinimo ? `, con pedido mínimo de ${fmt(s.pedidoMinimo)}` : ' y no hay pedido mínimo'}.`
          : `${fmt(s.costoEnvio)}${s.envioGratisDesde ? `; gratis en pedidos desde ${fmt(s.envioGratisDesde)}` : ''}.`],
      ['¿Cómo pago?',
        s.transferencia
          ? 'En efectivo al recibir o por transferencia. Si pagas en efectivo, dinos con cuánto pagas para llevarte cambio; los datos para transferir te los damos al confirmar tu pedido.'
          : 'En efectivo al recibir. Dinos con cuánto pagas para llevarte cambio.'],
      ['¿Hacen pedidos grandes o para fiestas?',
        '¡Claro que lo vemos! Cuéntanos para cuántas personas y para qué fecha, y te confirmamos opciones y precio.'],
      ['¿Cómo se conservan?',
        'Las rebanadas de pastel y cheesecake van en refrigeración. Los muffins, donas y chocolatines se disfrutan mejor el mismo día o al siguiente.'],
      ['¿Tienen tienda física?',
        'No, somos tienda a domicilio: pides aquí o por Messenger y te lo llevamos a tu puerta.'],
    ].filter(([, a]) => a);
    list.innerHTML = faq.map(([q, a]) => `
      <details class="faq-item"><summary>${esc(q)}<svg><use href="#i-right"/></svg></summary><p>${esc(a)}</p></details>`).join('');
  }

  function renderFooter() {
    const s = state.settings;
    $('#foot-zona').textContent = s.zona || '';
    const links = [];
    if (s.facebook) links.push(`<a href="${esc(fbUrl(s.facebook))}" target="_blank" rel="noopener">Facebook</a>`);
    if (msgUrl(s)) links.push(`<a href="${esc(msgUrl(s))}" target="_blank" rel="noopener">Messenger</a>`);
    if (s.instagram) links.push(`<a href="${esc(igUrl(s.instagram))}" target="_blank" rel="noopener">Instagram @${esc(s.instagram)}</a>`);
    if (s.whatsapp) links.push(`<a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`);
    $('#foot-links').innerHTML = links.join(' · ');
  }

  // ------------------------------------------------------------ vistas y rutas

  function showView(name) {
    if (state.view === name && !$(`#view-${name}`).hidden) return;
    const prev = state.view;
    state.view = name;
    $$('.view').forEach((v) => { v.hidden = v.dataset.view !== name; v.classList.toggle('is-active', v.dataset.view === name); });
    paintNav();
    if (prev !== name) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Pestañas y dock: Postres · Artículos · Cómo pedir.
  function paintNav() {
    const key = state.view === 'how' ? 'how' : state.section;
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === key));
    $('.dock').style.setProperty('--pos', { postres: 0, articulos: 1, how: 2 }[key]);
  }

  function route() {
    const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
    if (view === 'item' && id) {
      if (!$(`#view-${state.view}`) || $(`#view-${state.view}`).hidden) showView(state.view || 'home');
      showSheet(id);
      return;
    }
    hideSheet();
    if (view === 'como-pedir') {
      showView('how');
      if (id === 'preguntas') {
        const faq = $('#how-faq');
        const first = $('#faq-list details');
        if (first) first.open = true;
        requestAnimationFrame(() => faq?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
      }
      return;
    }
    const sec = view === 'articulos' ? 'articulos' : 'postres';
    const fromHow = state.view === 'how';
    const changed = sec !== state.section;
    showView('home');
    setSection(sec);
    paintNav();
    // Al cambiar de sección, la lista queda a la vista en lugar de volver a la portada.
    if (changed || (fromHow && sec === 'articulos')) {
      requestAnimationFrame(() => $('#toolbar').scrollIntoView({ behavior: reduceMotion || fromHow ? 'auto' : 'smooth' }));
    }
  }
  window.addEventListener('hashchange', () => { if (state.gridReady) route(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.sheetId) return closeItem();
    if (!$('#ap').hidden) return closeCheckout();
    if (!$('#drawer').hidden) closeList();
  });

  const onScroll = () => {
    $('.topbar').classList.toggle('scrolled', window.scrollY > 8);
    const tb = $('#toolbar');
    if (!tb.hidden) tb.classList.toggle('stuck', tb.getBoundingClientRect().top <= parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) + 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  load();
})();
