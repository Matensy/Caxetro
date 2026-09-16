/* Caxeta Royale — tweens curtos usados quando uma carta troca de lugar.
 * Tudo por FLIP: mede antes, mede depois, anima a diferenca.
 */
(function (CR) {
  'use strict';

  function medir(nos) {
    var mapa = new Map();
    nos.forEach(function (n) { mapa.set(n, n.getBoundingClientRect()); });
    return mapa;
  }

  function animarDiferenca(nos, antes, dur) {
    var reduzido = false;
    try { reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduzido) return;
    nos.forEach(function (n) {
      var a = antes.get(n);
      if (!a) return;
      var b = n.getBoundingClientRect();
      var dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      n.animate(
        [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: dur || 240, easing: 'cubic-bezier(.2,.7,.3,1)' }
      );
    });
  }

  /** Voa uma copia da carta de um ponto a outro da tela. */
  function voar(origem, destino, html, dur) {
    if (!origem || !destino) return Promise.resolve();
    var a = origem.getBoundingClientRect(), b = destino.getBoundingClientRect();
    var fantasma = document.createElement('div');
    fantasma.className = 'carta';
    fantasma.innerHTML = html;
    Object.assign(fantasma.style, {
      position: 'fixed', left: a.left + 'px', top: a.top + 'px',
      width: a.width + 'px', height: a.height + 'px', zIndex: 200, pointerEvents: 'none'
    });
    document.body.appendChild(fantasma);
    var anim = fantasma.animate([
      { transform: 'none' },
      { transform: 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + (b.width / a.width) + ')' }
    ], { duration: dur || 300, easing: 'cubic-bezier(.2,.7,.3,1)' });
    return anim.finished.then(function () { fantasma.remove(); }).catch(function () { fantasma.remove(); });
  }

  function pulsar(no) {
    if (!no) return;
    no.setAttribute('data-pulso', '');
    setTimeout(function () { no.removeAttribute('data-pulso'); }, 640);
  }

  CR.anim = { medir: medir, animarDiferenca: animarDiferenca, voar: voar, pulsar: pulsar };
})(window.CR = window.CR || {});
