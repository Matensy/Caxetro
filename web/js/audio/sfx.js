/* Caxeta Royale — som proceduraL via Web Audio. Zero arquivo, zero peso no APK. */
(function (CR) {
  'use strict';
  var ac = null, ganhoMestre = null, ligado = true;

  function ctx() {
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      ganhoMestre = ac.createGain();
      ganhoMestre.gain.value = 0.28;
      ganhoMestre.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function env(no, t0, ataque, queda, pico) {
    no.gain.setValueAtTime(0.0001, t0);
    no.gain.exponentialRampToValueAtTime(pico, t0 + ataque);
    no.gain.exponentialRampToValueAtTime(0.0001, t0 + ataque + queda);
  }

  function tom(freq, dur, tipo, pico, quando, slide) {
    var a = ctx(); if (!a || !ligado) return;
    var t0 = a.currentTime + (quando || 0);
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    env(g, t0, 0.008, dur, pico || 0.5);
    osc.connect(g); g.connect(ganhoMestre);
    osc.start(t0); osc.stop(t0 + dur + 0.06);
  }

  function ruido(dur, pico, filtro, quando) {
    var a = ctx(); if (!a || !ligado) return;
    var t0 = a.currentTime + (quando || 0);
    var n = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = a.createBufferSource(); src.buffer = buf;
    var bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = filtro || 1800; bp.Q.value = 0.9;
    var g = a.createGain(); env(g, t0, 0.004, dur, pico || 0.4);
    src.connect(bp); bp.connect(g); g.connect(ganhoMestre);
    src.start(t0);
  }

  var SONS = {
    carta: function () { ruido(0.11, 0.35, 2400); tom(180, 0.07, 'triangle', 0.18, 0, 90); },
    compra: function () { ruido(0.09, 0.3, 3200); },
    descarte: function () { ruido(0.13, 0.4, 1500); },
    botao: function () { tom(520, 0.05, 'square', 0.12); },
    virar: function () { ruido(0.08, 0.25, 4000); tom(760, 0.05, 'sine', 0.1); },
    naboa: function () { tom(660, 0.1, 'sine', 0.3); tom(880, 0.14, 'sine', 0.26, 0.09); },
    queima: function () { tom(220, 0.22, 'sawtooth', 0.28, 0, 70); ruido(0.18, 0.2, 700, 0.02); },
    vida: function () { tom(300, 0.16, 'square', 0.22, 0, 140); },
    ficha: function () { tom(1180, 0.06, 'square', 0.12); tom(1560, 0.07, 'square', 0.1, 0.05); },
    poder: function () { tom(440, 0.1, 'sine', 0.2); tom(660, 0.1, 'sine', 0.2, 0.07); tom(880, 0.16, 'sine', 0.22, 0.14); },
    elimina: function () { tom(180, 0.4, 'sawtooth', 0.3, 0, 60); },
    'som-classico': function () { tom(320, 0.1, 'triangle', 0.4); ruido(0.2, 0.35, 900, 0.02); },
    'som-moedas': function () { for (var i = 0; i < 6; i++) tom(900 + Math.random() * 900, 0.08, 'square', 0.14, i * 0.05); },
    'som-trovao': function () { ruido(0.7, 0.5, 180); tom(60, 0.6, 'sine', 0.4); },
    'som-sino': function () { [880, 1320, 1760].forEach(function (f, i) { tom(f, 0.7, 'sine', 0.22 - i * 0.05, i * 0.01); }); },
    'som-aplausos': function () { for (var i = 0; i < 26; i++) ruido(0.05, 0.12, 1200 + Math.random() * 2600, Math.random() * 0.8); }
  };

  function tocar(nome) {
    if (!ligado) return;
    var f = SONS[nome];
    if (f) try { f(); } catch (e) {}
  }

  function tocarBatida() {
    var s = CR.save.dados;
    tocar(s.equipado.som || 'som-classico');
  }

  CR.sfx = {
    tocar: tocar, tocarBatida: tocarBatida,
    set ligado(v) { ligado = !!v; },
    get ligado() { return ligado; },
    volume: function (v) { if (ganhoMestre) ganhoMestre.gain.value = v; },
    despertar: function () { ctx(); }
  };
})(window.CR = window.CR || {});
