/* Caxeta Royale — 5 Selos + 6 Melhorias aplicaveis a cartas do deck */
(function (CR) {
  'use strict';
  var fx = CR.fx;

  function S(id, name, price, text, art, impl) {
    return fx.register('seal', Object.assign({ id: id, name: name, price: price, text: text, art: art }, impl || {}));
  }
  function E(id, name, price, text, art, impl) {
    return fx.register('edition', Object.assign({ id: id, name: name, price: price, text: text, art: art }, impl || {}));
  }

  /* --------------------------------------------------------------- selos */

  S('dourado', 'Selo Dourado', 30, 'Rende 5 fichas quando entra numa batida.', 'seal-gold',
    { onBeat: function (g, p) { g.award(p, 5, 'selo-dourado'); } });

  S('rubi', 'Selo Rubi', 80, 'Conta como duas cartas dentro da combinacao.', 'seal-ruby',
    { doubles: true, onBeat: function (g, p) { g.award(p, 10, 'selo-rubi'); } });

  S('safira', 'Selo Safira', 60, 'Ao ser descartada, voce ganha uma bencao aleatoria.', 'seal-sapphire',
    { onDiscard: function (g, p) {
      var pool = fx.all('blessing');
      if (p.blessings.length >= g.blessingSlots(p)) return;
      var b = pool[Math.floor(g.rand() * pool.length)];
      p.blessings.push(b.id);
      g.log(p.name + ' achou ' + b.name + ' no descarte.', 'power');
      g.fire('blessingDrop', { player: p, def: b });
    } });

  S('esmeralda', 'Selo Esmeralda', 70, 'Ao ser descartada, trava a lixeira para o proximo jogador.', 'seal-emerald',
    { onDiscard: function (g, p) {
      var next = g.players[g.nextSeatFrom(p.idx)];
      if (next) next.lixeiraLocked = true;
    } });

  S('ametista', 'Selo Ametista', 40, 'Se estiver na sua mao quando alguem bate, rende 10 fichas.', 'seal-amethyst',
    { onRoundLoss: function (g, p) { g.award(p, 10, 'selo-ametista'); } });

  /* ----------------------------------------------------------- melhorias */

  E('selvagem', 'Carta Selvagem', 50, 'Conta como qualquer naipe.', 'ed-wild', {});

  E('vidro', 'Carta de Vidro', 100, 'Bater com ela tira 2 vidas a mais, mas ela pode quebrar.', 'ed-glass',
    { onBeat: function (g, p, card, ctx) {
      ctx.extraOut += 2;
      if (g.rand() < 0.5) { card.broken = true; g.log('Uma Carta de Vidro se quebrou.', 'power'); }
    } });

  E('holografica', 'Carta Holografica', 60, 'Rende 10 fichas quando entra numa batida.', 'ed-holo',
    { onBeat: function (g, p) { g.award(p, 10, 'holografica'); } });

  E('negativa', 'Carta Negativa', 200, 'Libera um slot extra de Coringa Especial.', 'ed-negative',
    { jokerSlot: 1 });

  E('aco', 'Carta de Aco', 120, 'Na sua mao, reduz em 1 a vida perdida na batida alheia.', 'ed-steel',
    { shield: 1 });

  E('dourada', 'Carta Dourada', 40, 'Sobrou na sua mao no fim da rodada? Rende 3 fichas.', 'ed-golden',
    { onRoundLoss: function (g, p) { g.award(p, 3, 'carta-dourada'); } });

  /* ------------------------------------------------------------ ganchos */

  function eachMeldCard(melds, fn) {
    for (var i = 0; i < melds.length; i++)
      for (var j = 0; j < melds[i].length; j++) fn(melds[i][j]);
  }

  CR.seals = {
    list: function () { return fx.all('seal'); },
    editions: function () { return fx.all('edition'); },

    onBeat: function (game, player, melds) {
      var ctx = { extraOut: 0 };
      eachMeldCard(melds, function (card) {
        var s = card.seal && fx.get('seal', card.seal);
        if (s && s.onBeat) s.onBeat(game, player, card, ctx);
        var e = card.edition && fx.get('edition', card.edition);
        if (e && e.onBeat) e.onBeat(game, player, card, ctx);
      });
      return ctx;
    },

    onDiscard: function (game, player, card) {
      var s = card.seal && fx.get('seal', card.seal);
      if (s && s.onDiscard) s.onDiscard(game, player, card);
      var e = card.edition && fx.get('edition', card.edition);
      if (e && e.onDiscard) e.onDiscard(game, player, card);
    },

    onRoundLoss: function (game, player) {
      player.hand.forEach(function (card) {
        var s = card.seal && fx.get('seal', card.seal);
        if (s && s.onRoundLoss) s.onRoundLoss(game, player, card);
        var e = card.edition && fx.get('edition', card.edition);
        if (e && e.onRoundLoss) e.onRoundLoss(game, player, card);
      });
    },

    /** Reducao de penalidade vinda de Cartas de Aco na mao. */
    handShield: function (player) {
      var n = 0;
      player.hand.forEach(function (c) {
        var e = c.edition && fx.get('edition', c.edition);
        if (e && e.shield) n += e.shield;
      });
      return n;
    },

    extraJokerSlots: function (inventory) {
      var n = 0, marks = (inventory && inventory.cardMarks) || {};
      for (var k in marks) if (marks[k].edition === 'negativa') n++;
      return n;
    }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
