/* Caxeta Royale — 20 Cartas de Bencao (consumiveis de uso unico) */
(function (CR) {
  'use strict';
  var fx = CR.fx, D = CR.deck, R = CR.rules;

  var N = 0;
  function B(id, name, price, target, text, art, use) {
    return fx.register('blessing', {
      id: id, num: ++N, name: name, price: price, target: target,
      text: text, art: art, use: use
    });
  }
  function rivals(g, p) { return g.alivePlayers().filter(function (x) { return x !== p; }); }
  function pick(g, a) { return a[Math.floor(g.rand() * a.length)]; }
  function refresh(g) { g.players.forEach(function (p) { p.needs = null; }); }

  B('troca-divina', 'Troca Divina', 90, 'card+suit',
    'Troca o naipe de uma carta da mao.', 'swap',
    function (g, p, sel) {
      var c = sel.card; if (!c) return false;
      c.suit = sel.suit === undefined ? (c.suit + 1) % 4 : sel.suit;
      c.red = D.isRed(c.suit);
      refresh(g); return true;
    });

  B('ascensao', 'Ascensao', 80, 'card',
    'Sobe uma carta um valor (5 vira 6, Q vira K).', 'up',
    function (g, p, sel) {
      var c = sel.card; if (!c || c.rank >= 13) return false;
      c.rank++; refresh(g); return true;
    });

  B('queda', 'Queda', 80, 'card',
    'Desce uma carta um valor (8 vira 7, 3 vira 2).', 'down',
    function (g, p, sel) {
      var c = sel.card; if (!c || c.rank <= 1) return false;
      c.rank--; refresh(g); return true;
    });

  B('espelho-b', 'Espelho', 140, 'card',
    'Duplica uma carta da mao. Voce fica com 10.', 'twin',
    function (g, p, sel) {
      var c = sel.card; if (!c) return false;
      var copy = D.makeCard(c.rank, c.suit, c.copy);
      copy.ghost = true; copy.seal = c.seal; copy.edition = c.edition;
      p.hand.push(copy); refresh(g); return true;
    });

  B('purificacao', 'Purificacao', 70, 'none',
    'Tira o seu status de queimado na hora.', 'water',
    function (g, p) { p.queimado = false; return true; });

  B('olho-verdade', 'Olho da Verdade', 120, 'rival',
    'Mostra a mao inteira de um adversario por dois turnos.', 'eye2',
    function (g, p, sel) {
      var t = sel.rival || pick(g, rivals(g, p)); if (!t) return false;
      t.hand.forEach(function (c) { t.revealed.push({ to: p.idx, cardId: c.id, mode: 'full', until: g.round.turnCount + 2 * g.alivePlayers().length }); });
      return true;
    });

  B('destruicao', 'Destruicao', 110, 'card',
    'Queima uma carta da mao e compra duas do maco.', 'fire',
    function (g, p, sel) {
      var c = sel.card; if (!c) return false;
      p.removeCard(c.id);
      for (var i = 0; i < 2; i++) { var n = g.draw(); if (n) p.hand.push(n); }
      refresh(g); return true;
    });

  B('roda-fortuna', 'Roda da Fortuna', 100, 'none',
    'Cara: suas fichas da rodada dobram. Coroa: viram metade.', 'wheel',
    function (g, p) {
      var win = g.rand() < 0.5;
      p.chipsMult = win ? 2 : 0.5;
      g.fire('powerFlash', { player: p, power: win ? 'fortuna-boa' : 'fortuna-ruim' });
      return true;
    });

  B('congelamento', 'Congelamento', 130, 'none',
    'O proximo adversario pula a vez.', 'ice',
    function (g, p) {
      var next = g.players[g.nextSeatFrom(p.idx)];
      if (!next || next === p) return false;
      next.skipTurn = true; return true;
    });

  B('terremoto', 'Terremoto', 110, 'none',
    'Todo mundo, voce incluso, descarta uma carta aleatoria.', 'quake',
    function (g, p) {
      g.alivePlayers().forEach(function (x) {
        if (x.hand.length <= 1) return;
        var c = pick(g, x.hand);
        x.removeCard(c.id); g.round.lixeira.push(c); x.needs = null;
      });
      return true;
    });

  B('renascimento', 'Renascimento', 160, 'none',
    'Voce recupera 1 vida, ate o seu maximo.', 'sprout',
    function (g, p) {
      if (p.lives >= p.maxLives) return false;
      g.applyLives(p, 1, { reason: 'renascimento' }); return true;
    });

  B('metamorfose', 'Metamorfose', 180, 'card',
    'Uma carta da mao vira curinga ate o fim da rodada.', 'morph',
    function (g, p, sel) {
      var c = sel.card; if (!c) return false;
      c.forcedWild = true; refresh(g); return true;
    });

  B('invisibilidade', 'Invisibilidade', 90, 'none',
    'Seu "ta na boa" fica oculto por uma rodada.', 'veil',
    function (g, p) { p.naBoaHidden = true; return true; });

  B('teleporte', 'Teleporte', 100, 'twoCards',
    'Troca duas cartas suas por duas do maco, no escuro.', 'portal',
    function (g, p, sel) {
      var cards = sel.cards || []; if (cards.length !== 2) return false;
      cards.forEach(function (c) { p.removeCard(c.id); g.round.maco.unshift(c); });
      for (var i = 0; i < 2; i++) { var n = g.draw(); if (n) p.hand.push(n); }
      refresh(g); return true;
    });

  B('bencao-maco', 'Bencao do Maco', 120, 'none',
    'Nas proximas tres compras voce ve a carta antes de decidir.', 'lantern',
    function (g, p) { p.peekCharges = (p.peekCharges || 0) + 3; return true; });

  B('reversao', 'Reversao', 90, 'none',
    'Inverte o sentido do jogo por uma rodada.', 'arrows',
    function (g, p) { g.round.dir *= -1; g.fire('dirChanged', { dir: g.round.dir }); return true; });

  B('duplicata', 'Duplicata', 150, 'none',
    'Repete o efeito da ultima bencao usada na mesa.', 'echo',
    function (g, p, sel) {
      var last = g.lastBlessing;
      if (!last || last === 'duplicata') return false;
      var def = fx.get('blessing', last);
      return def ? def.use(g, p, sel || {}) : false;
    });

  B('protecao', 'Protecao', 170, 'none',
    'Uma rodada inteira imune aos coringas dos adversarios.', 'aegis',
    function (g, p) { p.immune = true; return true; });

  B('caca-tesouro', 'Caca ao Tesouro', 60, 'none',
    'Trinta fichas na hora.', 'chest',
    function (g, p) { g.award(p, 30, 'caca-tesouro'); return true; });

  B('maldicao', 'Maldicao', 140, 'rival',
    'Um adversario fica duas rodadas sem poder declarar "ta na boa".', 'curse',
    function (g, p, sel) {
      var t = sel.rival || pick(g, rivals(g, p)); if (!t) return false;
      t.cursedUntil = g.roundNo + 2; t.naBoa = false; return true;
    });

  /* Aplicacao com efeitos colaterais comuns a todas as bencaos. */
  CR.blessings = {
    list: function () { return fx.all('blessing'); },
    apply: function (game, player, id, sel) {
      var def = fx.get('blessing', id);
      if (!def) return false;
      var i = player.blessings.indexOf(id);
      if (i === -1) return false;
      var ok = def.use(game, player, sel || {});
      if (!ok) return false;
      player.blessings.splice(i, 1);
      game.lastBlessing = id;
      player.bump('bencoesUsadas');
      game.log(player.name + ' usou ' + def.name + '.', 'power');
      game.fire('blessingUsed', { player: player, def: def });
      return true;
    }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
