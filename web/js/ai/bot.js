/* Caxeta Royale — IA dos bots (iniciante, normal, dificil) */
(function (CR) {
  'use strict';
  var D = CR.deck, R = CR.rules;

  /** Quanto uma carta conversa com o resto da mao. */
  function connectivity(card, hand, round) {
    if (D.isWild(card, round)) return 100;
    var score = 0;
    for (var i = 0; i < hand.length; i++) {
      var o = hand[i];
      if (o === card) continue;
      if (D.isWild(o, round)) { score += 1; continue; }
      if (o.rank === card.rank) score += o.suit === card.suit ? 2 : 6;
      else if (o.suit === card.suit) {
        var d = Math.abs(o.rank - card.rank);
        if (d === 1) score += 5;
        else if (d === 2) score += 3;
        // As fecha ponta alta
        if ((card.rank === 1 && o.rank >= 12) || (o.rank === 1 && card.rank >= 12)) score += 4;
      }
    }
    return score;
  }

  function handScore(hand, round) {
    var heat = R.handHeat(hand, round) * 10, s = 0;
    for (var i = 0; i < hand.length; i++) s += connectivity(hand[i], hand, round);
    return heat + s;
  }

  /** Cartas perigosas: o que os adversarios provavelmente querem. */
  function dangerMap(game, me) {
    var map = {};
    game.alivePlayers().forEach(function (p) {
      if (p === me) return;
      if (!p.naBoa) return;
      // Nao vemos a mao: usamos os descartes dele como pista negativa.
      p.hand.forEach(function () {});
    });
    // Valores ja descartados sao menos perigosos (menos copias vivas).
    game.round.seen.forEach(function (c) {
      var k = c.rank;
      map[k] = (map[k] || 0) - 1;
    });
    return map;
  }

  function chooseDiscard(game, p) {
    var round = game.round, level = p.botLevel;
    var best = null, bestScore = Infinity;
    var danger = level === 'dificil' ? dangerMap(game, p) : null;

    for (var i = 0; i < p.hand.length; i++) {
      var card = p.hand[i];
      if (D.isWild(card, round)) continue;             // nunca joga curinga fora
      var rest = p.hand.slice(); rest.splice(i, 1);
      var score = handScore(rest, round);
      if (danger) {
        // Penaliza descartar carta que algum "na boa" pode estar esperando.
        var risk = 0;
        game.alivePlayers().forEach(function (o) {
          if (o === p || !o.naBoa || o.queimado) return;
          risk += 12;
          if ((danger[card.rank] || 0) >= 0) risk += 6;
        });
        score -= risk / 10;
      }
      if (score > bestScore || best === null) { /* maximiza o que sobra */ }
      if (best === null || score > bestScore) { best = card; bestScore = score; }
    }
    if (!best) best = p.hand[p.hand.length - 1];
    return best;
  }

  function lixeiraHelps(game, p) {
    var lix = game.round.lixeira;
    if (!lix.length) return false;
    var top = lix[lix.length - 1];
    if (p.lixeiraLocked) return false;
    var before = handScore(p.hand, game.round);
    var after = handScore(p.hand.concat([top]), game.round) - connectivity(top, p.hand, game.round) * 0;
    if (R.findMelds(p.hand.concat([top]), game.round)) return true;
    return after > before + 8;
  }

  function maybeUseBlessing(game, p) {
    if (!p.blessings.length || p.botLevel === 'iniciante') return false;
    var id = p.blessings[0];
    var simple = { 'renascimento': 1, 'caca-tesouro': 1, 'purificacao': 1, 'bencao-maco': 1 };
    if (p.botLevel === 'normal' && !simple[id]) return false;
    if (id === 'renascimento' && p.lives >= p.maxLives) return false;
    if (id === 'purificacao' && !p.queimado) return false;
    var sel = {};
    var def = CR.fx.get('blessing', id);
    if (!def) return false;
    if (def.target === 'card' || def.target === 'card+suit') {
      // usa na carta menos conectada
      var worst = null, ws = Infinity;
      p.hand.forEach(function (c) {
        var s = connectivity(c, p.hand, game.round);
        if (s < ws) { ws = s; worst = c; }
      });
      sel.card = worst;
    } else if (def.target === 'rival') {
      var rr = game.alivePlayers().filter(function (x) { return x !== p; });
      sel.rival = rr[0];
    } else if (def.target === 'twoCards') {
      sel.cards = p.hand.slice(0, 2);
    }
    return CR.blessings.apply(game, p, id, sel);
  }

  /** Executa um passo do turno do bot. Retorna a acao tomada. */
  function step(game, p) {
    if (game.phase === 'buy') {
      // Bater com 9 antes de comprar?
      if (R.findMelds(p.hand, game.round)) { game.bater(p.idx); return 'bater'; }
      if (p.botLevel !== 'iniciante') maybeUseBlessing(game, p);
      if (game.magnetTake(p.idx)) { /* pegou de graca */ }

      var useLix;
      if (p.botLevel === 'iniciante') useLix = game.rand() < 0.5 && game.round.lixeira.length > 0;
      else useLix = lixeiraHelps(game, p);
      if (!game.drawFrom(useLix ? 'lixeira' : 'maco')) game.drawFrom('maco');
      return 'draw';
    }

    if (game.phase === 'discard') {
      if (R.findMelds(p.hand, game.round)) { game.bater(p.idx); return 'bater'; }
      if (p.botLevel !== 'iniciante' && game.lastDrawn) {
        var needs = R.computeNeeds(p.hand.filter(function (c) { return c !== game.lastDrawn; }), game.round);
        if (needs.count === 0) game.mulligan(p.idx);
      }
      var card = chooseDiscard(game, p);

      // Declarar "ta na boa"
      if (p.botLevel !== 'iniciante' && !p.naBoa && !p.queimado) {
        var rest = p.hand.filter(function (c) { return c.id !== card.id; });
        var needs2 = R.computeNeeds(rest, game.round);
        if (needs2.count > 0) game.declareNaBoa(p.idx);
        else if (p.botLevel === 'dificil' && R.handHeat(rest, game.round) >= 2 && game.rand() < 0.22) game.declareNaBoa(p.idx);
        else if (p.botLevel === 'normal' && game.rand() < 0.10) game.declareNaBoa(p.idx);
      }
      game.discard(card.id);
      return 'discard';
    }
    return null;
  }

  function wantsIntercept(game, p, card) {
    if (p.queimado) return false;
    var needs = game.needsOf(p);
    if (R.needsServes(needs, card)) return true;
    // Bot dificil so arrisca queimar se ja esta contra a parede.
    if (p.botLevel === 'dificil' && p.lives === 1 && game.rand() < 0.15) return true;
    return false;
  }

  function decideFold(game, p) {
    if (p.botLevel === 'iniciante') return false;
    var heat = R.handHeat(p.hand, game.round);
    if (p.lives <= 2 && heat === 0) return true;
    if (p.botLevel === 'dificil' && heat === 0 && game.rand() < 0.4) return true;
    return false;
  }

  function thinkTime(p) {
    if (p.botLevel === 'iniciante') return 700 + Math.random() * 500;
    if (p.botLevel === 'normal') return 550 + Math.random() * 450;
    return 380 + Math.random() * 260;
  }

  CR.bot = {
    step: step, wantsIntercept: wantsIntercept, decideFold: decideFold,
    thinkTime: thinkTime, connectivity: connectivity, handScore: handScore,
    chooseDiscard: chooseDiscard
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
