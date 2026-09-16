/* Caxeta Royale — conversa com o servidor de salas.
 * SSE pra receber, POST pra mandar. O dono da sala roda o jogo; os outros
 * mandam jogadas e recebem o estado ja filtrado.
 */
(function (CR) {
  'use strict';

  var base = '';          // vazio = mesma origem
  var sessao = null;      // {codigo, peer, token, dono}
  var fonte = null;       // EventSource
  var ouvintes = {};
  var salaAtual = [];
  var tentativas = 0;

  function url(caminho) { return (base || '') + caminho; }

  function pedir(caminho, corpo) {
    return fetch(url(caminho), {
      method: 'POST',
      // text/plain evita o preflight quando o APK chama de file://
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(corpo || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.erro || ('servidor respondeu ' + r.status));
        return j;
      });
    });
  }

  function on(tipo, fn) { (ouvintes[tipo] = ouvintes[tipo] || []).push(fn); }
  function dispara(tipo, dados, de) {
    (ouvintes[tipo] || []).forEach(function (f) { f(dados, de); });
    (ouvintes['*'] || []).forEach(function (f) { f({ tipo: tipo, dados: dados, de: de }); });
  }

  function conectar() {
    if (!sessao || fonte) return;
    var q = '?codigo=' + encodeURIComponent(sessao.codigo) +
      '&peer=' + encodeURIComponent(sessao.peer) +
      '&token=' + encodeURIComponent(sessao.token);
    fonte = new EventSource(url('/api/sala/eventos' + q));
    fonte.onopen = function () { tentativas = 0; dispara('conectado', {}); };
    fonte.onmessage = function (e) {
      var env;
      try { env = JSON.parse(e.data); } catch (err) { return; }
      if (env.tipo === 'sala') { salaAtual = env.sala || []; dispara('sala', salaAtual); return; }
      if (env.tipo === 'sala-fechada') { desligar(); dispara('sala-fechada', {}); return; }
      dispara(env.tipo, env.dados, env.de);
    };
    fonte.onerror = function () {
      // O navegador ja tenta religar sozinho; so avisamos a interface.
      tentativas++;
      dispara('instavel', { tentativas: tentativas });
    };
  }

  function desligar() {
    if (fonte) { fonte.close(); fonte = null; }
  }

  function criar(nome, endereco) {
    base = endereco || '';
    return pedir('/api/sala/criar', { nome: nome }).then(function (j) {
      sessao = { codigo: j.codigo, peer: j.peer, token: j.token, dono: true };
      conectar();
      return j;
    });
  }

  function entrar(codigo, nome, endereco) {
    base = endereco || '';
    return pedir('/api/sala/entrar', { codigo: String(codigo || '').toUpperCase().trim(), nome: nome })
      .then(function (j) {
        sessao = { codigo: j.codigo, peer: j.peer, token: j.token, dono: false };
        conectar();
        return j;
      });
  }

  /** Manda pra todo mundo, ou pra um jogador so quando `para` vem preenchido. */
  function enviar(tipo, dados, para) {
    if (!sessao) return Promise.resolve();
    return pedir('/api/sala/enviar', {
      codigo: sessao.codigo, peer: sessao.peer, token: sessao.token,
      tipo: tipo, dados: dados === undefined ? null : dados, para: para || ''
    }).catch(function (e) {
      CR.ui && CR.ui.aviso('Falhou mandar pra sala: ' + e.message, 'ruim');
    });
  }

  function sair() {
    var s = sessao;
    desligar();
    sessao = null;
    salaAtual = [];
    // Os ouvintes ficam: quem escuta ja checa em que modo esta, e limpar aqui
    // deixava a proxima sala sem ninguem ouvindo.
    if (!s) return Promise.resolve();
    return pedir('/api/sala/sair', { codigo: s.codigo, peer: s.peer, token: s.token }).catch(function () {});
  }

  function enderecos() {
    return fetch(url('/api/rede')).then(function (r) { return r.json(); })
      .then(function (j) { return j.enderecos || []; }).catch(function () { return []; });
  }

  CR.lan = {
    criar: criar, entrar: entrar, enviar: enviar, sair: sair,
    on: on, enderecos: enderecos, conectar: conectar,
    get sessao() { return sessao; },
    get sala() { return salaAtual; },
    get ligado() { return !!sessao; },
    get base() { return base; },
    set base(v) { base = v || ''; },
    /** Precisa de endereco digitado? No APK a pagina vem de file://. */
    precisaEndereco: function () {
      return typeof location !== 'undefined' && location.protocol === 'file:';
    }
  };
})(window.CR = window.CR || {});
