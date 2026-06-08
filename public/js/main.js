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
  float a=smoothstep(0.5,0.16,length(uv))*v_al;
  vec3 col=mix(vec3(1.0),vec3(0.72,0.91,1.0),v_ti);
  gl_FragColor=vec4(col,a);
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
    return {
      x:  Math.random() * w,
      y:  scatter ? Math.random() * h : -Math.random() * 24,
      sz: (Math.random() * 2.6 + 0.9) * this.dpr,
      al: Math.random() * 0.52 + 0.2,
      sp: Math.random() * 0.52 + 0.35,
      ox: Math.random() * 800,
    };
  }

  resize() {
    this.dpr           = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width  = Math.round(this.canvas.clientWidth  * this.dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.pts.forEach(p => { p.sz = (Math.random() * 2.6 + 0.9) * this.dpr; });
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

    // Scale noise to CSS-pixel space so density is DPR-independent
    const S  = 0.0007 / dpr;
    const T  = this.time * 0.00022;
    const MR = 130 * dpr;

    for (let i = 0; i < this.N; i++) {
      const p   = this.pts[i];
      const nx  = snoise(p.x * S + p.ox * 0.0005, p.y * S + T);
      const ny  = snoise(p.x * S + p.ox * 0.0005 + 50, p.y * S + T + 50);
      const spd = p.sp * dt * 0.044;

      p.x += nx * spd * 0.75;
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

      // Aurora tint: top 45% of hero gets an ice-blue shift
      const tint = Math.max(0, 1 - (p.y / h) / 0.45) * 0.58;
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

  const N      = window.innerWidth < 640 ? 160 : 420;
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
  function update() { nav.classList.toggle('nav--solid', window.scrollY > THRESHOLD); ticking = false; }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSnow();
  initScrollNav();
});
