/* Caxeta Royale — camada de particulas do tabuleiro (Canvas 2D, 60fps). */
(function (CR) {
  'use strict';

  var cv, ctx, W = 960, H = 540, parts = [], rodando = false, tema = null, ultimo = 0, acumulado = 0;
  var reduzido = false;

  function iniciar(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: true });
    redimensionar();
    try {
      reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    window.addEventListener('resize', redimensionar);
  }

  function redimensionar() {
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hexRgb(h) {
    h = (h || '#ffffff').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ------------------------------------------------- tipos de particula */

  var AMBIENTE = {
    motes: function (t) { return novo(t, { tipo: 'mote', vy: -0.12, r: [0.7, 2.1], alpha: [.16, .5] }); },
    bats: function (t) { return novo(t, { tipo: 'bat', vy: 0.03, vx: [-0.55, 0.55], r: [6, 13], alpha: [.18, .42] }); },
    leaves: function (t) { return novo(t, { tipo: 'leaf', vy: 0.26, vx: [-0.3, 0.3], r: [4, 9], alpha: [.25, .55] }); },
    snow: function (t) { return novo(t, { tipo: 'snow', vy: 0.42, vx: [-0.16, 0.16], r: [1.1, 2.9], alpha: [.4, .9] }); },
    smoke: function (t) { return novo(t, { tipo: 'smoke', vy: -0.22, vx: [-0.1, 0.1], r: [14, 40], alpha: [.03, .09] }); },
    sparks: function (t) { return novo(t, { tipo: 'spark', vy: -0.4, vx: [-0.25, 0.25], r: [0.8, 2], alpha: [.3, .85] }); },
    confetti: function (t) { return novo(t, { tipo: 'flag', vy: 0.3, vx: [-0.4, 0.4], r: [3, 7], alpha: [.35, .8] }); },
    stars: function (t) { return novo(t, { tipo: 'star', vy: 0.02, vx: [0.02, 0.1], r: [0.6, 1.8], alpha: [.25, .95] }); },
    bubbles: function (t) { return novo(t, { tipo: 'bubble', vy: -0.5, vx: [-0.12, 0.12], r: [2, 7], alpha: [.12, .35] }); },
    dust: function (t) { return novo(t, { tipo: 'mote', vy: -0.05, vx: [0.1, 0.5], r: [0.8, 2.6], alpha: [.1, .34] }); }
  };

  function faixa(v) { return Array.isArray(v) ? v[0] + Math.random() * (v[1] - v[0]) : v; }

  function novo(t, cfg) {
    return {
      tipo: cfg.tipo,
      x: Math.random() * W,
      y: cfg.vy < 0 ? H + 20 : -20,
      vx: faixa(cfg.vx || 0),
      vy: faixa(cfg.vy) * (0.7 + Math.random() * 0.8),
      r: faixa(cfg.r),
      a: faixa(cfg.alpha),
      fase: Math.random() * Math.PI * 2,
      giro: (Math.random() - 0.5) * 0.04,
      ang: Math.random() * Math.PI * 2,
      cor: t.glow,
      vida: Infinity
    };
  }

  function desenha(p) {
    var c = hexRgb(p.cor);
    ctx.globalAlpha = p.a;
    switch (p.tipo) {
      case 'mote': case 'snow': case 'star':
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
        break;
      case 'spark':
        ctx.strokeStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.lineWidth = p.r * 0.8;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8); ctx.stroke();
        break;
      case 'bubble':
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + p.a + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.stroke();
        break;
      case 'smoke':
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + p.a + ')');
        g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
        break;
      case 'leaf':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.42, 0, 0, 6.284); ctx.fill();
        ctx.restore();
        break;
      case 'flag':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.beginPath(); ctx.moveTo(-p.r, -p.r); ctx.lineTo(p.r, -p.r); ctx.lineTo(0, p.r); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      case 'bat':
        ctx.save(); ctx.translate(p.x, p.y);
        var bat = Math.sin(p.fase) * 0.4;
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-p.r * 0.6, -p.r * bat - p.r * 0.4, -p.r, p.r * 0.1);
        ctx.quadraticCurveTo(-p.r * 0.5, p.r * 0.2, 0, p.r * 0.35);
        ctx.quadraticCurveTo(p.r * 0.5, p.r * 0.2, p.r, p.r * 0.1);
        ctx.quadraticCurveTo(p.r * 0.6, -p.r * bat - p.r * 0.4, 0, 0);
        ctx.fill();
        ctx.restore();
        break;
    }
    ctx.globalAlpha = 1;
  }

  function move(p, dt) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.fase += 0.06 * dt;
    p.ang += p.giro * dt;
    if (p.tipo === 'leaf' || p.tipo === 'flag' || p.tipo === 'snow') p.x += Math.sin(p.fase * 0.4) * 0.3;
    if (p.tipo === 'star') p.a = 0.25 + Math.abs(Math.sin(p.fase * 0.25)) * 0.7;
    if (p.tipo === 'smoke') { p.r += 0.09 * dt; p.a *= 0.998; }
    if (p.vida !== Infinity) { p.vida -= dt; p.a = Math.max(0, p.a - 0.012 * dt); }
  }

  function foraDaMesa(p) {
    if (p.vida !== Infinity) return p.vida <= 0;
    return p.y < -60 || p.y > H + 60 || p.x < -80 || p.x > W + 80;
  }

  /* ------------------------------------------------------- loop */

  function quadro(t) {
    if (!rodando) return;
    var dt = Math.min(3, (t - ultimo) / 16.67) || 1;
    ultimo = t;
    ctx.clearRect(0, 0, W, H);

    if (tema && !reduzido) {
      var gerador = AMBIENTE[tema.fx];
      acumulado += dt;
      var limite = tema.fx === 'smoke' ? 14 : tema.fx === 'stars' ? 70 : 40;
      if (gerador && parts.length < limite && acumulado > 6) {
        acumulado = 0;
        parts.push(gerador(tema));
      }
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      move(parts[i], dt);
      if (foraDaMesa(parts[i])) parts.splice(i, 1);
      else desenha(parts[i]);
    }
    requestAnimationFrame(quadro);
  }

  function ligar(temaId) {
    tema = CR.themes.get(temaId);
    parts.length = 0;
    // Pre-popula pra mesa nao comecar vazia.
    var g = AMBIENTE[tema.fx];
    if (g && !reduzido) for (var i = 0; i < 18; i++) {
      var p = g(tema); p.y = Math.random() * H; parts.push(p);
    }
    if (!rodando) { rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); }
  }

  function desligar() { rodando = false; parts.length = 0; if (ctx) ctx.clearRect(0, 0, W, H); }

  /* ------------------------------------------------- estouros de batida */

  var ESTOURO = {
    'bater-confete': function (t) { jorra(48, t, ['#e8c547', '#c8322f', '#2e7d6b', '#f2e6ce'], 'flag', 7, 4); },
    'bater-explosao': function (t) { jorra(40, t, ['#ff9a3c', '#ffd166', '#c8322f'], 'smoke', 16, 6); },
    'bater-raios': function (t) { jorra(34, t, ['#9fe8ff', '#ffffff', '#5fb8ff'], 'spark', 3, 11); },
    'bater-fogos': function (t) { jorra(60, t, ['#ff5fa2', '#5fe0ff', '#b6ff5f', '#e8c547'], 'star', 2.6, 8); },
    'bater-po': function (t) { jorra(56, t, ['#e8c547', '#f0dfa8', '#8a6a12'], 'mote', 2.4, 5); }
  };

  function jorra(n, t, cores, tipo, r, vel) {
    if (reduzido) n = Math.min(n, 10);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (0.3 + Math.random()) * vel;
      parts.push({
        tipo: tipo, x: W / 2 + (Math.random() - .5) * 90, y: H / 2 - 30 + (Math.random() - .5) * 50,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.4,
        r: r * (0.5 + Math.random()), a: 0.9, fase: Math.random() * 6,
        giro: (Math.random() - .5) * 0.3, ang: Math.random() * 6,
        cor: cores[Math.floor(Math.random() * cores.length)], vida: 60 + Math.random() * 40
      });
    }
  }

  function estourar(id) {
    var fn = ESTOURO[id] || ESTOURO['bater-confete'];
    fn(tema || CR.themes.get('botequim'));
  }

  CR.fxcanvas = {
    iniciar: iniciar, ligar: ligar, desligar: desligar, estourar: estourar,
    get particulas() { return parts.length; }
  };
})(window.CR = window.CR || {});
