
window.Ribi = window.Ribi || {};

(function (R) {
  const { spring, clamp, round, adjust } = R;

  const springInteractSettings = { stiffness: 0.066, damping: 0.25 };
  const springPopoverSettings = { stiffness: 0.033, damping: 0.45 };
  
  
  const ZOOM_WIDTH = { wide: 630, portrait: 470 };
  
  const springSpinSettings = { stiffness: 0.012, damping: 0.27 };

  
  
  const ROTATE_DIVISOR = { css: 3.5, '151': 3.5 };

  const BLEND_MS = 1200;
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  class HoloCard {
    constructor(mount, { engine = 'css', onZoom = () => {} } = {}) {
      this.mount = mount;
      this.engine = engine;
      this.onZoom = onZoom;

      this.randomSeed = { x: Math.random(), y: Math.random() };
      this.bgPosition1 = {
        x: Math.floor(this.randomSeed.x * 734),
        y: Math.floor(this.randomSeed.y * 1280),
      };
      this.bgPosition2 = {
        x: Math.floor(Math.random() * 734),
        y: Math.floor(Math.random() * 1280),
      };

      this.hover = false;
      this.active = false;
      this.layoutScale = 1; 
      this.zoomTarget = 1; 
      this.turnToken = 0; 
      this.turn = null; 
      this.canZoom = !!(window.CSS && CSS.supports && CSS.supports('zoom', '2')); 

      this.dirty = false;
      this.settleTimer = null;
      this.pending = null;
      this.pendingRaf = null;

      this.auto = { enabled: false, amp: 13, freq: 0.35, phase: 0 };
      this.blend = null;
      this.autoRaf = null;
      this.lastAutoT = 0;

      const mk = (v, s) => spring(v, s, () => this.markDirty());
      this.springRotate = mk({ x: 0, y: 0 }, springInteractSettings);
      this.springGlare = mk({ x: 50, y: 50, o: 0 }, springInteractSettings);
      this.springBackground = mk({ x: 50, y: 50 }, springInteractSettings);
      this.springRotateDelta = mk({ x: 0, y: 0 }, springPopoverSettings);
      this.springTranslate = mk({ x: 0, y: 0 }, springPopoverSettings);
      this.springScale = mk(1, springPopoverSettings);

      this.build();
      this.bind();
      this.updateLayout();
      if (window.ResizeObserver) new ResizeObserver(() => this.updateLayout()).observe(this.mount);
      R.afterFrame.add(() => this.flushIfDirty());
      this.flush();
    }

    

    build() {
      const root = document.createElement('div');
      root.className = 'card interactive loading';
      root.innerHTML = `
        <div class="card__translater">
          <button class="card__rotator" type="button" aria-label="Expand the card">
            <img class="card__back" alt="" width="660" height="921" draggable="false" />
            <div class="card__front">
              <img class="card__front-img" alt="" width="660" height="921" draggable="false" />
              <div class="card__shine"></div>
              <div class="card__glare"></div>
            </div>
          </button>
        </div>`;
      this.root = root;
      this.rotator = root.querySelector('.card__rotator');
      this.backImg = root.querySelector('.card__back');
      this.front = root.querySelector('.card__front');
      this.frontImg = root.querySelector('.card__front-img');
      this.mount.appendChild(root);
      this.layers();
    }

    
    layers() {
      this.front.querySelectorAll('.card__glitter, .card__glare2').forEach((n) => n.remove());
      const shine = this.front.querySelector('.card__shine');
      const glare = this.front.querySelector('.card__glare');
      if (this.engine === '151') {
        const glitter = document.createElement('div');
        glitter.className = 'card__glitter';
        shine.after(glitter);
        const glare2 = document.createElement('div');
        glare2.className = 'card__glare2';
        glare.after(glare2);
      }
      this.root.classList.toggle('is-scaled', this.engine === '151' && this.springScale.value > 1);
    }

    bind() {
      this.rotator.addEventListener('pointerenter', (e) => this.enter(e));
      this.rotator.addEventListener('pointermove', (e) => this.interact(e));
      this.rotator.addEventListener('pointerleave', () => this.leave());
      this.rotator.addEventListener('click', () => this.toggle());
      window.addEventListener('resize', () => this.updateLayout());
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.active) this.deactivate(); });
      document.addEventListener('visibilitychange', () => { this.lastAutoT = 0; });
    }

    

    setEngine(engine) {
      this.engine = engine;
      this.layers();
      this.markDirty();
    }

    
    setAttrs({ rarity = 'common', supertype = 'pokémon', subtypes = 'basic', number = '', set = '', gallery = false, types = '' } = {}) {
      const r = this.root;
      r.dataset.number = String(number).toLowerCase();
      r.dataset.set = set;
      r.dataset.subtypes = String(subtypes).toLowerCase();
      r.dataset.supertype = String(supertype).toLowerCase();
      r.dataset.rarity = String(rarity).toLowerCase();
      r.dataset.trainerGallery = String(!!gallery);
      r.className = r.className.replace(/\b(water|fire|grass|lightning|psychic|fighting|darkness|metal|dragon|fairy)\b/g, '').replace(/\s+/g, ' ').trim();
      if (types) r.classList.add(...String(types).toLowerCase().split(' '));
    }

    
    setImages({ front, back, foil, mask } = {}) {
      const st = this.root.style;
      if (back !== undefined) this.backImg.src = back;
      if (foil !== undefined) st.setProperty('--foil', foil ? `url("${foil}")` : 'none');
      if (mask !== undefined) {
        st.setProperty('--mask', mask ? `url("${mask}")` : 'none');
        this.root.classList.toggle('masked', !!mask);
      }
      if (front !== undefined) {
        const probe = new Image();
        const done = () => {
          this.frontImg.src = front;
          this.root.classList.remove('loading');
        };
        probe.onload = () => (probe.decode ? probe.decode().then(done, done) : done());
        probe.onerror = done;
        probe.src = front;
      }
    }

    

    markDirty() {
      this.dirty = true;
      if (!R.frameScheduled()) requestAnimationFrame(() => this.flushIfDirty());
    }

    flushIfDirty() {
      if (this.dirty) this.flush();
    }

    flush() {
      this.dirty = false;
      const g = this.springGlare.value;
      const rot = this.springRotate.value;
      const delta = this.springRotateDelta.value;
      const bg = this.springBackground.value;
      const tr = this.springTranslate.value;
      const sc = this.springScale.value;
      this.checkReveal(rot.x + delta.x);
      const is151 = this.engine === '151';
      const px = is151 ? clamp(g.x) : g.x;
      const py = is151 ? clamp(g.y) : g.y;
      const set = (k, v) => this.root.style.setProperty(k, v);

      set('--seedx', this.randomSeed.x);
      set('--seedy', this.randomSeed.y);
      set('--cosmosbg', `${this.bgPosition1.x}px ${this.bgPosition1.y}px`);
      set('--birthdaybg', `${this.bgPosition2.x}px ${this.bgPosition2.y}px`);

      set('--pointer-x', `${px}%`);
      set('--pointer-y', `${py}%`);
      set('--pointer-from-center', clamp(Math.sqrt((g.y - 50) * (g.y - 50) + (g.x - 50) * (g.x - 50)) / 50, 0, 1));
      set('--pointer-from-top', g.y / 100);
      set('--pointer-from-left', g.x / 100);
      set('--card-opacity', g.o);
      set('--rotate-x', `${rot.x + delta.x}deg`);
      set('--rotate-y', `${rot.y + delta.y}deg`);
      set('--rotate-delta', `${delta.x}deg`);
      set('--background-x', `${is151 ? clamp(bg.x) : bg.x}%`);
      set('--background-y', `${is151 ? clamp(bg.y) : bg.y}%`);
      set('--card-scale', sc);
      set('--card-xform-scale', sc / this.layoutScale);
      set('--translate-x', `${tr.x}px`);
      set('--translate-y', `${tr.y}px`);
      if (is151) this.root.classList.toggle('is-scaled', sc > 1);
    }

    

    updateSprings(background, rotate, glare) {
      for (const s of [this.springBackground, this.springRotate, this.springGlare]) {
        s.stiffness = springInteractSettings.stiffness;
        s.damping = springInteractSettings.damping;
      }
      this.springBackground.set(background);
      this.springRotate.set(rotate);
      this.springGlare.set(glare);
    }

    enter(e) {
      this.hover = true;
      this.blend = null; 
      clearTimeout(this.settleTimer);
      this.interact(e);
    }

    interact(e) {
      if (document.visibilityState !== 'visible') return;
      if (!this.hover) this.enter(e);
      this.root.classList.add('interacting');

      const rect = this.rotator.getBoundingClientRect();
      const absolute = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const percent = {
        x: clamp(round((100 / rect.width) * absolute.x)),
        y: clamp(round((100 / rect.height) * absolute.y)),
      };
      const center = { x: percent.x - 50, y: percent.y - 50 };
      const d = ROTATE_DIVISOR[this.engine];

      this.pending = {
        background: { x: adjust(percent.x, 0, 100, 37, 63), y: adjust(percent.y, 0, 100, 33, 67) },
        rotate: { x: round(-(center.x / d)), y: round(center.y / d) },
        glare: { x: round(percent.x), y: round(percent.y), o: 1 },
      };
      if (this.pendingRaf === null) {
        this.pendingRaf = requestAnimationFrame(() => {
          this.pendingRaf = null;
          if (this.pending && this.hover) {
            this.updateSprings(this.pending.background, this.pending.rotate, this.pending.glare);
          }
          this.pending = null;
        });
      }
    }

    leave() {
      this.hover = false;
      if (this.pendingRaf !== null) { cancelAnimationFrame(this.pendingRaf); this.pendingRaf = null; }
      this.pending = null;
      this.settle(this.auto.enabled ? 0 : 500);
    }

    
    settle(delay = 500) {
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => {
        if (this.hover) return;
        this.root.classList.remove('interacting');
        if (this.auto.enabled) { this.startBlend(); return; }
        const snapStiff = 0.01;
        const snapDamp = 0.06;
        for (const [s, rest] of [
          [this.springRotate, { x: 0, y: 0 }],
          [this.springGlare, { x: 50, y: 50, o: 0 }],
          [this.springBackground, { x: 50, y: 50 }],
        ]) {
          s.stiffness = snapStiff;
          s.damping = snapDamp;
          s.set(rest, { soft: 1 });
        }
      }, delay);
    }

    

    setAuto(opts) {
      const was = this.auto.enabled;
      Object.assign(this.auto, opts);
      if (this.auto.enabled && !was) {
        this.auto.phase = 0;
        this.lastAutoT = 0;
        if (!this.hover) this.startBlend();
        if (this.autoRaf === null) this.autoRaf = requestAnimationFrame((t) => this.autoTick(t));
      } else if (!this.auto.enabled && was) {
        this.blend = null;
        if (!this.hover) this.settle(0);
      }
    }

    
    startBlend() {
      const r = this.springRotate.value;
      const g = this.springGlare.value;
      const b = this.springBackground.value;
      this.blend = {
        start: performance.now(),
        from: { rot: { ...r }, glare: { ...g }, bg: { ...b } },
      };
    }

    autoTargets() {
      const { amp, phase } = this.auto;
      const th = phase * Math.PI;
      
      
      const rot = { x: Math.cos(th) * amp, y: Math.sin(th) * amp * 0.6 };
      const d = ROTATE_DIVISOR[this.engine];
      const px = clamp(50 - rot.x * d);
      const py = clamp(50 + rot.y * d);
      return {
        rot,
        glare: { x: px, y: py, o: 1 },
        bg: { x: adjust(px, 0, 100, 37, 63), y: adjust(py, 0, 100, 33, 67) },
      };
    }

    autoTick(t) {
      if (!this.auto.enabled) { this.autoRaf = null; return; }
      this.autoRaf = requestAnimationFrame((n) => this.autoTick(n));
      const dt = this.lastAutoT ? Math.min((t - this.lastAutoT) / 1000, 0.1) : 0;
      this.lastAutoT = t;
      
      this.auto.phase += dt * this.auto.freq;
      if (this.hover) return; 

      const a = this.autoTargets();
      let rot = a.rot, glare = a.glare, bg = a.bg;
      if (this.blend) {
        const k = smooth(clamp((performance.now() - this.blend.start) / BLEND_MS, 0, 1));
        const f = this.blend.from;
        rot = { x: lerp(f.rot.x, a.rot.x, k), y: lerp(f.rot.y, a.rot.y, k) };
        glare = { x: lerp(f.glare.x, a.glare.x, k), y: lerp(f.glare.y, a.glare.y, k), o: lerp(f.glare.o, a.glare.o, k) };
        bg = { x: lerp(f.bg.x, a.bg.x, k), y: lerp(f.bg.y, a.bg.y, k) };
        if (k >= 1) this.blend = null;
      }
      this.updateSprings(bg, rot, glare);
    }

    

    toggle() {
      if (this.active) this.deactivate(); else this.activate();
    }

    activate() {
      this.active = true;
      this.root.classList.add('active');
      this.popover(true);
      this.onZoom(true);
    }

    deactivate() {
      if (!this.active) return;
      this.active = false;
      this.root.classList.remove('active');
      this.retreat();
      this.onZoom(false);
    }

    setCenter() {
      const rect = this.mount.getBoundingClientRect(); 
      const view = document.documentElement;
      this.springTranslate.set({
        x: round(view.clientWidth / 2 - rect.x - rect.width / 2),
        y: round(view.clientHeight / 2 - rect.y - rect.height / 2),
      });
    }

    
    slotWidth() {
      return this.mount.clientWidth;
    }

    
    zoomScale() {
      const w = this.slotWidth();
      const h = this.mount.clientHeight;
      if (!w || !h) return 1;
      const target = (window.matchMedia('(max-width: 880px)').matches ? ZOOM_WIDTH.portrait : ZOOM_WIDTH.wide) / w;
      
      return Math.max(1, Math.min(target, (window.innerWidth * 0.9) / w, (window.innerHeight * 0.9) / h));
    }

    
    updateLayout() {
      const target = this.zoomScale();
      this.zoomTarget = target;
      const scale = this.canZoom ? target : 1;
      this.layoutScale = scale;
      this.root.style.setProperty('--card-layout-scale', scale);
      this.root.classList.toggle('is-sized', scale !== 1);
      this.root.style.width = scale === 1 ? '' : `${this.slotWidth() * scale}px`;
      if (this.active) {
        this.setCenter();
        this.springScale.set(target);
      }
      this.markDirty();
    }

    popover(spin) {
      this.setCenter();
      if (spin) {
        const token = this.beginTurn();
        Promise.all([this.springRotateDelta.set({ x: 360, y: 0 }), this.springScale.set(this.zoomTarget)]).then(() => this.endTurn(token));
      } else {
        this.springScale.set(this.zoomTarget);
      }
      this.settle(spin ? 1000 : 100);
    }

    retreat() {
      this.springRotateDelta.stiffness = springPopoverSettings.stiffness;
      this.springRotateDelta.damping = springPopoverSettings.damping;
      
      if (this.turn) this.endTurn(this.turn.token);
      this.springScale.set(1, { soft: true });
      this.springTranslate.set({ x: 0, y: 0 }, { soft: true });
      this.springRotateDelta.set({ x: 0, y: 0 }, { soft: true });
      this.settle(100);
    }

    
    beginTurn() {
      const token = ++this.turnToken;
      clearTimeout(this.revealTimer);
      this.root.classList.remove('is-revealing');
      this.root.classList.add('is-turning');
      this.turn = { token, sawBack: false };
      setTimeout(() => this.endTurn(token), 3500); 
      return token;
    }

    checkReveal(rotateYDeg) {
      if (!this.turn) return;
      const facing = Math.cos((rotateYDeg * Math.PI) / 180); 
      if (facing < 0) this.turn.sawBack = true;
      
      const remaining = Math.abs(this.springScale.value - this.springScale.target) / Math.max(0.05, this.zoomTarget - 1);
      if (this.turn.sawBack && facing > 0.5 && remaining < 0.08) this.endTurn(this.turn.token);
    }

    endTurn(token) {
      if (token !== this.turnToken || !this.root.classList.contains('is-turning')) return;
      this.turn = null;
      this.root.classList.remove('is-turning');
      this.root.classList.add('is-revealing');
      this.revealTimer = setTimeout(() => this.root.classList.remove('is-revealing'), 600);
    }
  }

  R.HoloCard = HoloCard;
})(window.Ribi);
