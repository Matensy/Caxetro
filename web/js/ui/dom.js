/* Caxeta Royale — utilitarios de DOM e navegacao entre telas */
(function (CR) {
  'use strict';

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
    if (filhos) [].concat(filhos).forEach(function (f) {
      if (f === null || f === undefined || f === false) return;
      n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  function limpa(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return [].slice.call((raiz || document).querySelectorAll(sel)); }

  var telaAtual = null;
  function mostrarTela(id) {
    $$('.tela').forEach(function (t) { t.removeAttribute('data-ativa'); });
    var alvo = document.getElementById('tela-' + id);
    if (alvo) alvo.setAttribute('data-ativa', '');
    telaAtual = id;
    CR.ui.telaAtual = id;
    if (id !== 'mesa') CR.fxcanvas.desligar();
    return alvo;
  }

  var avisosEl = null;
  function aviso(txt, tipo) {
    if (!avisosEl) avisosEl = document.getElementById('avisos');
    if (!avisosEl) return;
    var n = el('div', { class: 'aviso', 'data-t': tipo || 'info', text: txt });
    avisosEl.appendChild(n);
    setTimeout(function () {
      n.style.transition = 'opacity 260ms, transform 260ms';
      n.style.opacity = '0'; n.style.transform = 'translateY(8px)';
      setTimeout(function () { n.remove(); }, 280);
    }, tipo === 'ruim' ? 3200 : 2400);
  }

  /** Placa esmaltada com parafusos nos quatro cantos. */
  function chapa(classe, filhos, comParafusos) {
    var n = el('div', { class: 'chapa ' + (classe || '') }, filhos);
    if (comParafusos) ['p1', 'p2', 'p3', 'p4'].forEach(function (p) {
      n.appendChild(el('span', { class: 'parafuso ' + p }));
    });
    return n;
  }

  function fichas(n) {
    return Math.round(n).toLocaleString('pt-BR') + '₣';
  }

  /** Grupo de botoes exclusivos (usado no lobby e nos ajustes). */
  function pilha(opcoes, valor, aoTrocar) {
    var box = el('div', { class: 'pilha' });
    opcoes.forEach(function (o) {
      var b = el('button', {
        type: 'button', text: o.rot,
        'aria-pressed': String(o.v === valor),
        onclick: function () {
          [].slice.call(box.children).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          CR.sfx.tocar('botao');
          aoTrocar(o.v);
        }
      });
      box.appendChild(b);
    });
    return box;
  }

  function opcao(rotulo, opcoes, valor, aoTrocar) {
    return el('label', { class: 'opcao' }, [el('span', { text: rotulo }), pilha(opcoes, valor, aoTrocar)]);
  }

  /** Confirmacao/escolha sobre a mesa. */
  function sobrepor(titulo, texto, botoes, extra) {
    var mesa = document.getElementById('tela-mesa');
    var antigo = mesa.querySelector('.sobrepor');
    if (antigo) antigo.remove();
    var caixa = chapa('caixa chapa--latao', [el('h3', { text: titulo })]);
    if (texto) caixa.appendChild(el('p', { text: texto }));
    if (extra) caixa.appendChild(extra);
    var linha = el('div', { class: 'botoes' });
    botoes.forEach(function (b) {
      linha.appendChild(el('button', {
        class: b.tipo || '', text: b.rot, type: 'button',
        onclick: function () { fechar(); CR.sfx.tocar('botao'); b.acao && b.acao(); }
      }));
    });
    caixa.appendChild(linha);
    var over = el('div', { class: 'sobrepor' }, [caixa]);
    mesa.appendChild(over);
    function fechar() { over.remove(); }
    over.fechar = fechar;
    return over;
  }

  CR.ui = {
    el: el, limpa: limpa, $: $, $$: $$, mostrarTela: mostrarTela, aviso: aviso,
    chapa: chapa, fichas: fichas, pilha: pilha, opcao: opcao, sobrepor: sobrepor,
    telaAtual: null
  };
})(window.CR = window.CR || {});
