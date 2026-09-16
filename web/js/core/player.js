/* Caxeta Royale — Player Entity */
(function (CR) {
  'use strict';

  function Player(opts) {
    this.idx = opts.idx;
    this.name = opts.name;
    this.isBot = !!opts.isBot;
    this.botLevel = opts.botLevel || 'normal';   // iniciante | normal | dificil
    this.avatar = opts.avatar || 0;
    this.frame = opts.frame || 'bronze';

    this.lives = opts.lives || 7;
    this.maxLives = opts.lives || 7;
    this.chips = 0;                 // fichas ganhas nesta sessao
    this.alive = true;

    this.hand = [];
    this.jokers = [];               // ids de coringas especiais equipados
    this.blessings = [];            // ids de bencaos em mao
    this.astral = {};               // id -> nivel
    this.vouchers = [];             // ids de pergaminhos ativos
    this.deckSkin = opts.deckSkin || 'botequim';

    this.naBoa = false;             // declarou
    this.naBoaReal = false;         // realmente falta 1 carta
    this.queimado = false;
    this.folded = false;            // cachetao
    this.needs = null;              // cache de computeNeeds
    this.melds = null;              // combinacoes da batida
    this.flags = {};                // usos unicos de poderes
    this.counters = {};             // contadores de poderes
    this.revealed = [];             // cartas reveladas a adversarios
    this.stats = { baterNove: 0, baterDez: 0, maoBatida: 0, rodadas: 0, kills: 0 };
  }

  Player.prototype.resetRound = function () {
    this.hand = [];
    this.naBoa = false;
    this.naBoaReal = false;
    this.queimado = false;
    this.folded = false;
    this.needs = null;
    this.melds = null;
    this.revealed = [];
    this.roundFlags = {};
  };

  Player.prototype.hasJoker = function (id) { return this.jokers.indexOf(id) !== -1; };
  Player.prototype.hasVoucher = function (id) { return this.vouchers.indexOf(id) !== -1; };
  Player.prototype.astralLevel = function (id) { return this.astral[id] || 0; };

  Player.prototype.once = function (key) {
    if (this.flags[key]) return false;
    this.flags[key] = true;
    return true;
  };
  Player.prototype.onceRound = function (key) {
    this.roundFlags = this.roundFlags || {};
    if (this.roundFlags[key]) return false;
    this.roundFlags[key] = true;
    return true;
  };
  Player.prototype.bump = function (key, n) {
    this.counters[key] = (this.counters[key] || 0) + (n === undefined ? 1 : n);
    return this.counters[key];
  };

  Player.prototype.removeCard = function (cardId) {
    for (var i = 0; i < this.hand.length; i++) {
      if (this.hand[i].id === cardId) return this.hand.splice(i, 1)[0];
    }
    return null;
  };

  CR.Player = Player;
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
