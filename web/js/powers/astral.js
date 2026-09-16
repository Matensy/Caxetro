/* Caxeta Royale — 12 Cartas Astrais (upgrades permanentes por nivel) */
(function (CR) {
  'use strict';
  var fx = CR.fx;
  var N = 0;
  function A(id, name, combo, price, text, art, impl) {
    return fx.register('astral', Object.assign({
      id: id, num: ++N, name: name, combo: combo, price: price, text: text, art: art
    }, impl));
  }
  function kindsOf(c) { return c.kinds || []; }
  function hasLong(c) { return (c.melds || []).some(function (m) { return m.length >= 4 && CR.rules.comboKind(m, c.game.round) === 'sequencia'; }); }

  A('lua', 'Lua', 'Trinca simples', 140,
    'Bateu com trinca? Voce recupera 1 vida por nivel.', 'moon',
    { on: { onBeat: function (c) {
      if (kindsOf(c).indexOf('trinca') === -1) return;
      c.game.applyLives(c.owner, c.level, { reason: 'lua' });
    } } });

  A('sol', 'Sol', 'Sequencia longa', 160,
    'Cada sequencia de 4 ou mais tira 1 vida extra por nivel.', 'sun',
    { on: { onBeat: function (c) { if (hasLong(c)) c.extraOut += c.level; } } });

  A('estrela', 'Estrela', 'Bater com 10', 180,
    'Bater com 10 dobra as fichas por nivel.', 'star',
    { mods: { chipsGain: function (c, v) {
      return c.kind === 'dez' ? v * (1 + c.level) : v; } } });

  A('cometa', 'Cometa', 'Mao Batida', 220,
    'Mao batida rende 5 vezes mais fichas por nivel.', 'comet',
    { mods: { chipsGain: function (c, v) {
      return c.kind === 'maoBatida' ? v * (1 + 4 * c.level) : v; } } });

  A('venus', 'Venus', 'Trinca de figuras', 170,
    'Trinca de J, Q ou K tira 1 vida extra por nivel.', 'venus',
    { on: { onBeat: function (c) {
      var has = (c.melds || []).some(function (m) {
        return CR.rules.comboKind(m, c.game.round) === 'trinca' &&
          m.some(function (card) { return card.rank >= 11; });
      });
      if (has) c.extraOut += c.level;
    } } });

  A('marte', 'Marte', 'Sequencia com curinga', 150,
    'Curinga dentro de sequencia conta em dobro nas fichas.', 'mars',
    { mods: { chipsGain: function (c, v) {
      return c.wilds ? v + 15 * c.level * c.wilds : v; } } });

  A('jupiter', 'Jupiter', 'Trinca de Ases', 200,
    'Trinca de ases derruba 1 vida extra por nivel e rende 40 fichas.', 'jupiter',
    { on: { onBeat: function (c) {
      var has = (c.melds || []).some(function (m) {
        return CR.rules.comboKind(m, c.game.round) === 'trinca' && m[0] && m.every(function (card) {
          return card.rank === 1 || CR.deck.isWild(card, c.game.round); });
      });
      if (has) { c.extraOut += c.level; c.chips += 40 * c.level; }
    } } });

  A('saturno', 'Saturno', 'Sequencia baixa', 130,
    'Sequencia comecando em As ou 2 rende 20 fichas por nivel.', 'saturn',
    { on: { onBeat: function (c) {
      var low = (c.melds || []).some(function (m) {
        if (CR.rules.comboKind(m, c.game.round) !== 'sequencia') return false;
        return m.some(function (card) { return card.rank === 1 || card.rank === 2; });
      });
      if (low) c.chips += 20 * c.level;
    } } });

  A('urano', 'Urano', 'Tres do mesmo tipo', 210,
    'Bater com 3 trincas ou 3 sequencias tira 2 vidas extras por nivel.', 'uranus',
    { on: { onBeat: function (c) {
      var k = kindsOf(c);
      if (k.length === 3 && k[0] && k.every(function (x) { return x === k[0]; })) c.extraOut += 2 * c.level;
    } } });

  A('netuno', 'Netuno', 'Curinga nas tres', 190,
    'Cada curinga usado na batida tira 1 vida extra por nivel.', 'neptune',
    { on: { onBeat: function (c) { if (c.wilds >= 3) c.extraOut += c.wilds * c.level; } } });

  A('plutao', 'Plutao', 'Batida limpa', 160,
    'Bater sem nenhum curinga rende 50 fichas por nivel.', 'pluto',
    { on: { onBeat: function (c) { if (!c.wilds) c.chips += 50 * c.level; } } });

  A('buraco-negro', 'Buraco Negro', 'Todas', 320,
    'Qualquer batida recupera 1 vida e rende 10 fichas por nivel.', 'blackhole',
    { on: { onBeat: function (c) {
      c.game.applyLives(c.owner, c.level, { reason: 'buraco-negro' });
      c.chips += 10 * c.level;
    } } });

  CR.astral = {
    list: function () { return fx.all('astral'); },
    apply: function (game, player, id) {
      var def = fx.get('astral', id);
      if (!def) return false;
      player.astral[id] = (player.astral[id] || 0) + 1;
      game.log(player.name + ' subiu ' + def.name + ' para o nivel ' + player.astral[id] + '.', 'power');
      game.fire('astralUsed', { player: player, def: def, level: player.astral[id] });
      return true;
    }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
