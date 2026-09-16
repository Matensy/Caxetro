/* Caxeta Royale — Barramento de efeitos
 * Coringas, Bencaos, Astrais, Selos e Pergaminhos se registram aqui.
 * O jogo nunca conhece um poder pelo nome: pergunta modificadores e dispara eventos.
 */
(function (CR) {
  'use strict';

  var reg = {
    jokers: {}, jokerList: [],
    blessings: {}, blessingList: [],
    astral: {}, astralList: [],
    seals: {}, sealList: [],
    editions: {}, editionList: [],
    vouchers: {}, voucherList: []
  };

  var PLURAL = {
    joker: 'jokers', blessing: 'blessings', astral: 'astral',
    seal: 'seals', edition: 'editions', voucher: 'vouchers'
  };

  function register(kind, def) {
    var k = PLURAL[kind];
    reg[k][def.id] = def;
    reg[k.replace(/s$/, '') === k ? k + 'List' : (kind + 'List')].push(def);
    def.kind = kind;
    return def;
  }

  function get(kind, id) { return reg[PLURAL[kind]][id] || null; }
  function all(kind) { return reg[kind + 'List']; }

  /** Poderes ativos de um jogador, em ordem de aplicacao. */
  function activeOf(player) {
    var out = [], i;
    if (!player) return out;
    for (i = 0; i < player.jokers.length; i++) {
      var j = reg.jokers[player.jokers[i]];
      if (j) out.push({ def: j, source: 'joker' });
    }
    for (i = 0; i < player.vouchers.length; i++) {
      var raw = player.vouchers[i];
      var base = raw.replace(/\+$/, '');
      var v = reg.vouchers[base];
      if (v) out.push({ def: v, source: 'voucher', upgraded: raw !== base });
    }
    for (var id in player.astral) {
      var a = reg.astral[id];
      if (a && player.astral[id] > 0) out.push({ def: a, source: 'astral', level: player.astral[id] });
    }
    return out;
  }

  /**
   * Soma modificadores numericos (ou dobra booleanos) de todos os poderes do jogador.
   * def.mods[name] = function(ctx, value) -> novo valor
   */
  function mod(game, player, name, value, ctx) {
    var list = activeOf(player);
    ctx = ctx || {};
    ctx.game = game; ctx.player = player; ctx.modName = name;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.def.mods && typeof e.def.mods[name] === 'function') {
        ctx.upgraded = !!e.upgraded;
        ctx.level = e.level || 0;
        ctx.def = e.def;
        var next = e.def.mods[name](ctx, value);
        if (next !== undefined) value = next;
      }
    }
    return value;
  }

  /** Dispara um evento para os poderes de um jogador. */
  function emitFor(game, player, evt, ctx) {
    var list = activeOf(player);
    ctx = ctx || {};
    ctx.game = game; ctx.owner = player; ctx.event = evt;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.def.on && typeof e.def.on[evt] === 'function') {
        ctx.upgraded = !!e.upgraded;
        ctx.level = e.level || 0;
        ctx.def = e.def;
        try {
          e.def.on[evt](ctx);
        } catch (err) {
          if (game && game.log) game.log('erro em ' + e.def.id + ': ' + err.message, 'debug');
        }
      }
    }
  }

  /** Dispara para todos os jogadores vivos da mesa. */
  function emit(game, evt, ctx) {
    for (var i = 0; i < game.players.length; i++) {
      var p = game.players[i];
      if (!p.alive && evt !== 'onEliminate' && evt !== 'gameStart') continue;
      emitFor(game, p, evt, Object.assign({}, ctx || {}));
    }
  }

  CR.powers = reg;
  CR.fx = {
    register: register, get: get, all: all,
    mod: mod, emit: emit, emitFor: emitFor, activeOf: activeOf
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
