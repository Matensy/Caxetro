/* Caxeta Royale — persistencia: LocalStorage com espelho opcional no servidor Go. */
(function (CR) {
  'use strict';
  var CHAVE = 'caxeta-royale:v1';

  var vazio = {
    versao: 1,
    fichas: 500,
    jokers: [],            // coringas comprados
    loadout: [],           // coringas equipados (ate jokerSlots)
    blessings: [],         // bencaos em estoque
    astral: {},            // id -> nivel comprado
    vouchers: [],          // pergaminhos (id ou "id+")
    boards: ['botequim'],
    board: 'botequim',
    decks: ['padrao'],
    deck: 'padrao',
    cosmeticos: ['bater-confete', 'moldura-bronze', 'ui-escuro', 'som-classico'],
    equipado: { bater: 'bater-confete', moldura: 'moldura-bronze', ui: 'ui-escuro', som: 'som-classico' },
    cardMarks: {},         // "rank:suit" -> {seal, edition}
    nome: 'Voce',
    opcoes: { som: true, musica: true, naipesClassicos: false, dica: true, timer: 0, organizar: true },
    desafios: { dia: '', lista: [], feitos: {} },
    stats: { partidas: 0, vitorias: 0, batidas: 0, maosBatidas: 0, fichasTotais: 0, ultimoDia: '' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function mescla(base, salvo) {
    var out = clone(base);
    for (var k in salvo) {
      if (salvo[k] && typeof salvo[k] === 'object' && !Array.isArray(salvo[k]) && out[k]) {
        out[k] = Object.assign({}, out[k], salvo[k]);
      } else if (salvo[k] !== undefined) out[k] = salvo[k];
    }
    return out;
  }

  var dados = clone(vazio);

  function carregar() {
    try {
      var raw = localStorage.getItem(CHAVE);
      if (raw) dados = mescla(vazio, JSON.parse(raw));
    } catch (e) { /* modo anonimo, cota cheia: joga com o padrao */ }
    return dados;
  }

  var pendente = null;
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) { /* segue o jogo */ }
    if (pendente) clearTimeout(pendente);
    pendente = setTimeout(espelhar, 2500);
  }

  /** Copia de seguranca no servidor Go, quando ele estiver de pe. */
  function espelhar() {
    pendente = null;
    if (typeof fetch !== 'function' || location.protocol === 'file:') return;
    try {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      }).catch(function () {});
    } catch (e) {}
  }

  function restaurar() {
    if (typeof fetch !== 'function' || location.protocol === 'file:') return Promise.resolve(null);
    return fetch('/api/save').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.versao) { dados = mescla(vazio, j); salvar(); }
        return j;
      }).catch(function () { return null; });
  }

  function zerar() { dados = clone(vazio); salvar(); return dados; }

  CR.save = {
    get dados() { return dados; },
    carregar: carregar, salvar: salvar, zerar: zerar, restaurar: restaurar,
    padrao: vazio
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
