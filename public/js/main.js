'use strict';

/* ── 2D Simplex Noise (Stefan Gustavson) ─────────────────────────────────── */
const _F2 = 0.5 * (Math.sqrt(3) - 1);
const _G2 = (3 - Math.sqrt(3)) / 6;
const _p  = new Uint8Array(512);
const _g2 = new Float32Array([1,1, -1,1, 1,-1, -1,-1, 1,0, -1,0, 0,1, 0,-1]);

function _seedNoise() {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) t[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const s = t[i]; t[i] = t[j]; t[j] = s;
  }
  for (let i = 0; i < 256; i++) _p[i] = _p[i + 256] = t[i];
}

function snoise(xin, yin) {
  const s  = (xin + yin) * _F2;
  const i  = Math.floor(xin + s);
  const j  = Math.floor(yin + s);
  const t  = (i + j) * _G2;
  const x0 = xin - (i - t), y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + _G2,    y1 = y0 - j1 + _G2;
  const x2 = x0 - 1 + 2 * _G2, y2 = y0 - 1 + 2 * _G2;
  const ii = i & 255, jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0, tt;
  tt = 0.5 - x0*x0 - y0*y0;
  if (tt >= 0) { tt *= tt; const g = (_p[ii + _p[jj]] % 8) * 2;              n0 = tt*tt*(_g2[g]*x0 + _g2[g+1]*y0); }
  tt = 0.5 - x1*x1 - y1*y1;
  if (tt >= 0) { tt *= tt; const g = (_p[ii+i1 + _p[jj+j1]] % 8) * 2;       n1 = tt*tt*(_g2[g]*x1 + _g2[g+1]*y1); }
  tt = 0.5 - x2*x2 - y2*y2;
  if (tt >= 0) { tt *= tt; const g = (_p[(ii+1) + _p[jj+1]] % 8) * 2;       n2 = tt*tt*(_g2[g]*x2 + _g2[g+1]*y2); }
  return 70 * (n0 + n1 + n2);
}

/* ── WebGL shaders ───────────────────────────────────────────────────────── */
const _VS = `
attribute vec2 a_pos;
attribute float a_sz;
attribute float a_al;
attribute float a_ti;
uniform vec2 u_res;
varying float v_al;
varying float v_ti;
void main(){
  vec2 c=(a_pos/u_res)*2.0-1.0;
  gl_Position=vec4(c.x,-c.y,0.0,1.0);
  gl_PointSize=a_sz;
  v_al=a_al;
  v_ti=a_ti;
}`;

const _FS = `
precision mediump float;
varying float v_al;
varying float v_ti;
void main(){
  vec2 uv=gl_PointCoord-0.5;
  float d=length(uv);
  float soft=smoothstep(0.5,0.15,d)*v_al;
  float core=smoothstep(0.18,0.0,d)*0.65*v_al;
  vec3 col=mix(vec3(1.0),vec3(0.70,0.90,1.0),v_ti);
  gl_FragColor=vec4(col,clamp(soft+core,0.0,1.0));
}`;

/* ── WebGL snow particle system ──────────────────────────────────────────── */
class SnowGL {
  constructor(canvas, N) {
    this.canvas = canvas;
    this.N      = N;
    this.dpr    = Math.min(devicePixelRatio || 1, 2);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, _VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, _FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    this.gl    = gl;
    this.u_res = gl.getUniformLocation(prog, 'u_res');
    this.attr  = {
      pos: gl.getAttribLocation(prog, 'a_pos'),
      sz:  gl.getAttribLocation(prog, 'a_sz'),
      al:  gl.getAttribLocation(prog, 'a_al'),
      ti:  gl.getAttribLocation(prog, 'a_ti'),
    };

    // Interleaved: [x, y, size, alpha, tint] = 5 floats = 20 bytes/particle
    this.data = new Float32Array(N * 5);
    this.buf  = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);

    const stride = 20;
    gl.enableVertexAttribArray(this.attr.pos); gl.vertexAttribPointer(this.attr.pos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.attr.sz);  gl.vertexAttribPointer(this.attr.sz,  1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(this.attr.al);  gl.vertexAttribPointer(this.attr.al,  1, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(this.attr.ti);  gl.vertexAttribPointer(this.attr.ti,  1, gl.FLOAT, false, stride, 16);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    this.mouse = { x: -9999, y: -9999 };
    this.time  = 0;
    this.pts   = Array.from({ length: N }, () => this._newPt(true));
  }

  _newPt(scatter) {
    const w = this.canvas.width || 800, h = this.canvas.height || 600;
    // depth 0 = background (tiny, fast, dim)  depth 1 = foreground (large, slow, bright)
    const depth = Math.pow(Math.random(), 0.65); // slight bias toward foreground
    const d2    = depth * depth;
    const szMin = 0.6  + d2 * 2.9;
    const szMax = 1.6  + d2 * 7.4;
    const sz    = Math.min((szMin + Math.random() * (szMax - szMin)) * this.dpr, 11 * this.dpr);
    const al    = Math.min(0.10 + depth * 0.38 + Math.random() * (0.15 + depth * 0.25), 0.88);
    const sp    = (1.10 - depth * 0.82) * (Math.random() * 0.32 + 0.76);
    return {
      x: Math.random() * w,
      y: scatter ? Math.random() * h : -(Math.random() * 28 + sz / this.dpr),
      sz, al, sp, depth,
      ox: Math.random() * 800,
    };
  }

  resize() {
    this.dpr           = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width  = Math.round(this.canvas.clientWidth  * this.dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.pts.forEach(p => {
      const d2 = p.depth * p.depth;
      const szMin = 0.6 + d2 * 2.9, szMax = 1.6 + d2 * 7.4;
      p.sz = Math.min((szMin + Math.random() * (szMax - szMin)) * this.dpr, 11 * this.dpr);
    });
  }

  scatter() {
    const w = this.canvas.width, h = this.canvas.height;
    this.pts.forEach(p => {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
    });
  }

  onMouse(cssX, cssY) {
    this.mouse.x = cssX * this.dpr;
    this.mouse.y = cssY * this.dpr;
  }

  tick(dt) {
    if (!this.gl) return;
    const { gl, canvas, dpr } = this;
    const w = canvas.width, h = canvas.height;
    this.time += dt;

    const S  = 0.0007 / dpr;
    const T  = this.time * 0.00022;
    const MR = 130 * dpr;

    // Slow sinusoidal wind gust — period ~11s. Deeper/fg flakes carry more on the wind.
    const wind = Math.sin(this.time * 0.000571) * 0.55 + snoise(this.time * 0.000065, 77) * 0.28;

    for (let i = 0; i < this.N; i++) {
      const p   = this.pts[i];
      const nx  = snoise(p.x * S + p.ox * 0.0005, p.y * S + T);
      const ny  = snoise(p.x * S + p.ox * 0.0005 + 50, p.y * S + T + 50);
      const spd = p.sp * dt * 0.044;
      const wf  = 0.28 + p.depth * 0.72; // fg particles caught more by wind

      p.x += (nx * 0.75 + wind * wf) * spd;
      p.y += (ny * 0.4 + 0.6) * spd; // 60% downward gravity bias

      // Mouse repulsion (quadratic falloff)
      const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < MR * MR && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = (1 - d / MR) * (1 - d / MR) * 1.7 * dt * 0.055;
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }

      if      (p.y > h + 8)  { Object.assign(p, this._newPt(false)); p.x = Math.random() * w; }
      else if (p.x < -8)     p.x = w + 8;
      else if (p.x > w + 8)  p.x = -8;

      // Aurora tint: top 62% of hero gets ice-blue shift, stronger than before
      const tint = Math.max(0, 1 - (p.y / h) / 0.62) * 0.72;
      const o    = i * 5;
      this.data[o]     = p.x;
      this.data[o + 1] = p.y;
      this.data[o + 2] = p.sz;
      this.data[o + 3] = p.al;
      this.data[o + 4] = tint;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u_res, w, h);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
    gl.drawArrays(gl.POINTS, 0, this.N);
  }
}

/* ── Snow init (WebGL → canvas-2D fallback) ──────────────────────────────── */
function initSnow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('snow');
  if (!canvas) return;

  _seedNoise();

  const N      = window.innerWidth < 640 ? 260 : 680;
  const snowgl = new SnowGL(canvas, N);

  if (snowgl.gl) {
    snowgl.resize();
    snowgl.scatter(); // redistribute after canvas is properly sized
    window.addEventListener('resize', () => snowgl.resize(), { passive: true });

    const hero = canvas.closest('.hero');
    if (hero) {
      hero.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        snowgl.onMouse(e.clientX - r.left, e.clientY - r.top);
      }, { passive: true });
      hero.addEventListener('mouseleave', () => snowgl.onMouse(-9999, -9999), { passive: true });
    }

    let last = 0;
    function frame(ts) {
      const dt = last ? Math.min(ts - last, 50) : 16;
      last = ts;
      snowgl.tick(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } else {
    _canvas2DSnow(canvas);
  }
}

function _canvas2DSnow(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const flakes = Array.from({ length: 90 }, () => _rf({}, canvas));

  function _rf(f, c) {
    f.x = Math.random() * c.width; f.y = Math.random() * c.height;
    f.r = Math.random() * 2.2 + 0.5; f.speed = Math.random() * 0.7 + 0.3;
    f.drift = Math.random() * 0.22 - 0.06; f.opacity = Math.random() * 0.5 + 0.25;
    return f;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    flakes.forEach(f => {
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.opacity})`; ctx.fill();
      f.y += f.speed; f.x += f.drift;
      if (f.y > canvas.height + 4) _rf(f, canvas);
      if (f.x > canvas.width) f.x = 0;
      if (f.x < 0) f.x = canvas.width;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Nav solidifies on scroll ────────────────────────────────────────────── */
function initScrollNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const THRESHOLD = 40;
  let ticking = false;

  function update() {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;

    // Class-based morph fallback (Firefox + older browsers)
    nav.classList.toggle('nav--solid', scrolled > THRESHOLD);

    // Progress line: drives ::after width via CSS custom property
    // (overridden to transform-based in browsers with animation-timeline: scroll())
    if (total > 0) {
      nav.style.setProperty('--scroll-pct', Math.min(scrolled / total, 1));
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update(); // set initial state
}

/* ── Price counter ───────────────────────────────────────────────────────── */
function initPriceCounter() {
  const priceEl = document.querySelector('.val-s__price');
  const stateEl = document.querySelector('.val-s--value');
  const panel   = document.querySelector('.val-panel');
  if (!priceEl || !stateEl || !panel) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const CYCLE  = 12000; // ms — must match CSS animation-duration
  const FROM   = 0.71;
  const TO     = 0.79;
  const TARGET = 420;
  let   rafId  = null;

  function frame() {
    const anim    = stateEl.getAnimations()?.[0];
    const rawTime = anim?.currentTime;
    if (rawTime != null) {
      const pct = (rawTime % CYCLE) / CYCLE;
      if (pct >= FROM && pct < TO) {
        const t     = (pct - FROM) / (TO - FROM);
        const eased = 1 - Math.pow(1 - t, 3);
        priceEl.textContent = '$' + Math.round(eased * TARGET);
      } else if (pct >= TO && pct < 0.985) {
        priceEl.textContent = '$' + TARGET;
      } else {
        priceEl.textContent = '$0';
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  // Only run the rAF loop while the panel is visible in the viewport
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!rafId) rafId = requestAnimationFrame(frame);
      } else {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    });
  }, { threshold: 0.1 }).observe(panel);
}

/* ── Magnetic CTA ────────────────────────────────────────────────────────── */
function initMagneticCta() {
  const cta = document.querySelector('.nav__cta');
  if (!cta || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const RADIUS = 88;  // px — field radius beyond button edges
  const PULL   = 0.38; // strength (fraction of offset to apply)

  function onMove(e) {
    const r  = cta.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < RADIUS) {
      const falloff = (1 - dist / RADIUS) * (1 - dist / RADIUS); // quadratic ease
      cta.style.transform = `translate(${dx * PULL * falloff}px, ${dy * PULL * falloff}px)`;
    } else {
      cta.style.transform = '';
    }
  }

  document.addEventListener('mousemove', onMove, { passive: true });
}

/* ── Scroll reveal ───────────────────────────────────────────────────────── */
function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('reveal--visible');
      io.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    const d = el.dataset.delay;
    if (d) el.style.transitionDelay = d + 'ms';
    el.classList.add('reveal--ready');
    io.observe(el);
  });
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSnow();
  initScrollNav();
  initPriceCounter();
  initMagneticCta();
  initReveal();
});
