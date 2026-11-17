
(function (R) {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const abs = (p) => new URL(p, document.baseURI).href;

  const card = new R.HoloCard($('#mount'), {
    engine: 'css',
    onZoom: (z) => document.body.classList.toggle('is-zoomed', z),
  });
  $('#veil').addEventListener('click', () => card.deactivate());

  

  const DEFAULT_FILES = {
    card: 'img/card.webp',
    mask: 'img/card_mask.webp',
    foil: 'img/card_foil.webp',
    back: 'img/card_back.webp',
  };

  
  const slots = {
    card: { url: abs(DEFAULT_FILES.card), thumb: abs(DEFAULT_FILES.card), custom: false, blob: null },
    mask: { url: null, maskUrl: null, thumb: abs(DEFAULT_FILES.mask), custom: false, blob: null },
    foil: { url: abs(DEFAULT_FILES.foil), thumb: abs(DEFAULT_FILES.foil), custom: false, blob: null },
    back: { url: abs(DEFAULT_FILES.back), thumb: abs(DEFAULT_FILES.back), custom: false, blob: null },
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = src;
    });

  
  const MASK_MAX = window.matchMedia('(pointer: coarse)').matches ? 768 : 1024;

  async function buildMask(src) {
    const img = await loadImage(src);
    const k = Math.min(1, MASK_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h); 
    const px = data.data;
    let translucent = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) translucent++;
    const hasAlpha = translucent > (w * h) * 0.005;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      px[i + 3] = hasAlpha ? px[i + 3] : lum;
      px[i] = px[i + 1] = px[i + 2] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
  }

  
  function dataUrlToBlobUrl(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: head.slice(5, head.indexOf(';')) }));
  }

  let defaultMask = null; 
  const defaultMaskReady = buildMask(abs(DEFAULT_FILES.mask))
    .catch(() => (window.RIBI_DEFAULT_MASK ? dataUrlToBlobUrl(window.RIBI_DEFAULT_MASK) : null)) 
    .then((u) => { defaultMask = u; return u; });

  function paintTiles() {
    let anyCustom = false;
    for (const name of Object.keys(slots)) {
      const s = slots[name];
      const el = $(`.slot[data-slot="${name}"]`);
      const img = $('img', el);
      const empty = name === 'mask' ? !s.maskUrl && !s.thumb : name === 'foil' ? !s.url : false;
      if (s.thumb) img.src = s.thumb;
      el.toggleAttribute('data-empty', !!empty || !s.thumb);
      const removable = (name === 'mask' || name === 'foil') && !!s.thumb;
      el.toggleAttribute('data-removable', removable);
      if (s.custom) anyCustom = true;
    }
    $('#reset').hidden = !anyCustom;
  }

  function applyImages() {
    card.setImages({
      front: slots.card.url,
      back: slots.back.url,
      foil: slots.foil.url,
      mask: slots.mask.maskUrl,
    });
  }

  function releaseMask(s) {
    if (s.maskOwned && s.maskUrl && s.maskUrl.startsWith('blob:')) URL.revokeObjectURL(s.maskUrl);
    s.maskOwned = false;
  }

  function releaseBlob(s) {
    if (s.blob) { URL.revokeObjectURL(s.blob); s.blob = null; }
  }

  const tokens = { card: 0, mask: 0, foil: 0, back: 0 };

  async function setSlotFile(name, file) {
    if (!file || !(file.type || '').startsWith('image/')) return;
    const token = ++tokens[name];
    const blob = URL.createObjectURL(file);
    const s = slots[name];
    if (name === 'mask') {
      let maskUrl = null;
      try { maskUrl = await buildMask(blob); } catch (e) { console.warn('Mask could not be processed', e); }
      if (token !== tokens[name]) { URL.revokeObjectURL(blob); return; }
      releaseBlob(s);
      releaseMask(s);
      s.blob = blob; s.thumb = blob; s.maskUrl = maskUrl; s.maskOwned = !!maskUrl; s.custom = true;
    } else {
      releaseBlob(s);
      s.blob = blob; s.url = blob; s.thumb = blob; s.custom = true;
    }
    paintTiles();
    applyImages();
  }

  function clearSlot(name) {
    tokens[name]++;
    const s = slots[name];
    releaseBlob(s);
    if (name === 'mask') {
      releaseMask(s);
      s.maskUrl = null; s.thumb = null; s.custom = true;
    } else if (name === 'foil') {
      s.url = null; s.thumb = null; s.custom = true;
    } else {
      s.url = s.thumb = abs(DEFAULT_FILES[name]); s.custom = false;
    }
    paintTiles();
    applyImages();
  }

  async function resetAll() {
    for (const name of Object.keys(slots)) {
      tokens[name]++;
      const s = slots[name];
      releaseBlob(s);
      s.custom = false;
      s.thumb = abs(DEFAULT_FILES[name]);
      if (name === 'mask') { releaseMask(s); s.maskUrl = await defaultMaskReady; }
      else s.url = s.thumb;
    }
    paintTiles();
    applyImages();
  }

  $$('.slot').forEach((el) => {
    const name = el.dataset.slot;
    const input = $('input', el);
    const drop = $('.slot__drop', el);
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { setSlotFile(name, input.files[0]); input.value = ''; });
    const clear = $('.slot__clear', el);
    if (clear) clear.addEventListener('click', () => clearSlot(name)); 
    ['dragenter', 'dragover'].forEach((t) => el.addEventListener(t, (e) => { e.preventDefault(); el.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => el.addEventListener(t, (e) => { e.preventDefault(); el.classList.remove('is-over'); }));
    el.addEventListener('drop', (e) => setSlotFile(name, e.dataTransfer.files[0]));
  });
  
  ['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => e.preventDefault()));
  $('#reset').addEventListener('click', resetAll);

  

  
  
  if (window.RIBI_FILE_MASKS) {
    const m = window.RIBI_FILE_MASKS;
    const style = document.createElement('style');
    style.textContent = `.card[data-rarity$="pokeball holo"], .card[data-rarity$="masterball holo"] {
      --pokeball: url(${m['pokeball-outer']}); --pokeball-inner: url(${m['pokeball-inner']});
      --masterball: url(${m['masterball-outer']}); --masterball-inner: url(${m['masterball-inner']}); }`;
    document.head.appendChild(style);
  }

  let currentEngine = 'css';
  let styleToken = 0;
  let currentStyle = null;

  async function loadEngine(engine) {
    if (engine === currentEngine) return;
    const cfg = R.ENGINES[engine];
    const anchor = $('#app-css');
    const olds = $$('link[data-engine]');
    const fresh = cfg.files.map((file) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.engine = engine;
      link.href = cfg.dir + file;
      anchor.before(link);
      return new Promise((resolve) => { link.onload = link.onerror = resolve; });
    });
    await Promise.all(fresh);
    olds.forEach((l) => l.remove());
    currentEngine = engine;
  }

  async function applyStyle(id) {
    const style = R.STYLES.find((s) => s.id === id);
    if (!style) return;
    const token = ++styleToken;
    await loadEngine(style.engine);
    if (token !== styleToken) return;
    currentStyle = style;
    card.setEngine(style.engine);
    card.setAttrs(style.attrs);
    $('#style-value').textContent = style.label;
    $$('.select__opt').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.id === id)));
  }

  

  const select = $('#style');
  const btn = $('.select__btn', select);
  const menu = $('.select__menu', select);
  let activeIndex = -1;

  for (const key of Object.keys(R.ENGINES)) {
    const g = document.createElement('li');
    g.className = 'select__group';
    g.setAttribute('role', 'presentation');
    g.textContent = R.ENGINES[key].label;
    menu.appendChild(g);
    R.STYLES.filter((s) => s.engine === key).forEach((s) => {
      const li = document.createElement('li');
      li.className = 'select__opt';
      li.id = 'opt-' + s.id.replace(/[^a-z0-9]+/gi, '-');
      li.dataset.id = s.id;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.textContent = s.label;
      menu.appendChild(li);
    });
  }
  const opts = $$('.select__opt', menu);

  function setActive(i, scroll = true) {
    activeIndex = Math.max(0, Math.min(opts.length - 1, i));
    opts.forEach((o, n) => o.classList.toggle('is-active', n === activeIndex));
    menu.setAttribute('aria-activedescendant', opts[activeIndex].id);
    if (scroll) opts[activeIndex].scrollIntoView({ block: 'nearest' });
  }
  const selectedIndex = () => opts.findIndex((o) => o.dataset.id === (currentStyle && currentStyle.id));

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, selectedIndex()));
    menu.focus({ preventScroll: true });
  }
  function closeMenu(refocus = true) {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus({ preventScroll: true });
  }
  function choose(i) {
    applyStyle(opts[i].dataset.id);
    closeMenu();
  }

  btn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.max(0, Math.min(opts.length - 1, selectedIndex() + (e.key === 'ArrowDown' ? 1 : -1)));
      applyStyle(opts[i].dataset.id); 
    }
  });
  menu.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(opts.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(activeIndex); }
    else if (k === 'Escape' || k === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  menu.addEventListener('pointermove', (e) => {
    const o = e.target.closest('.select__opt');
    if (o) setActive(opts.indexOf(o), false);
  });
  menu.addEventListener('click', (e) => {
    const o = e.target.closest('.select__opt');
    if (o) choose(opts.indexOf(o));
  });
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !select.contains(e.target)) closeMenu(false); });

  

  const auto = $('#auto');
  const AMPLITUDE = 13;  
  const FREQUENCY = 0.35; 

  auto.addEventListener('input', () => card.setAuto({ enabled: auto.checked, amp: AMPLITUDE, freq: FREQUENCY }));

  

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const metaTheme = $('#theme-color');
  const THEME_COLOR = { light: '#E8EAE6', dark: '#25282A' };
  let themeMode = 'system';

  function applyTheme() {
    const scheme = themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode;
    document.documentElement.dataset.scheme = scheme;
    metaTheme.content = THEME_COLOR[scheme];
    $$('.theme button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === themeMode)));
  }
  $$('.theme button').forEach((b) => b.addEventListener('click', () => { themeMode = b.dataset.theme; applyTheme(); }));
  media.addEventListener('change', () => { if (themeMode === 'system') applyTheme(); });
  applyTheme();

  

  auto.checked = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  card.setAuto({ enabled: auto.checked, amp: AMPLITUDE, freq: FREQUENCY });

  paintTiles();
  applyStyle(R.DEFAULT_STYLE);
  card.setImages({ front: slots.card.url, back: slots.back.url, foil: slots.foil.url });
  defaultMaskReady.then((u) => {
    if (slots.mask.custom) return;
    slots.mask.maskUrl = u;
    applyImages();
  });
})(window.Ribi);
