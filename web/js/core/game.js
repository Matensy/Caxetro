/* Caxeta Royale — Game Controller
 * Maquina de estados: INIT -> DEALING -> TURN(buy/discard) -> CHECK -> ROUND_END -> ...
 */
(function (CR) {
  'use strict';
  var D = CR.deck, R = CR.rules;

  var DEFAULTS = {
    seats: [],                 // [{name,isBot,botLevel,jokers,blessings,vouchers,astral,deckSkin}]
    mode: 'campeonato',        // rapida | campeonato | cachetao | solo
    lives: 7,
    handSize: 9,
    wildLimit: 1,
    allowKA2: false,
    turnTimer: 0,
    jokersOn: true,
    blessingsOn: true,
    vouchersOn: true,
    board: 'botequim',
    seed: 0,
    defer: function (fn, ms) { return setTimeout(fn, ms); }
  };

  function Game(cfg) {
    this.cfg = Object.assign({}, DEFAULTS, cfg || {});
    this.rand = D.rng(this.cfg.seed || (Date.now() & 0x7fffffff));
    this.listeners = {};
    this.history = [];
    this.state = 'init';
    this.roundNo = 0;
    this.players = [];
    this.pendingIntercept = null;
    this.result = null;

    for (var i = 0; i < this.cfg.seats.length; i++) {
      var s = this.cfg.seats[i];
      var p = new CR.Player({
        idx: i, name: s.name, isBot: s.isBot, botLevel: s.botLevel,
        avatar: s.avatar, frame: s.frame, lives: this.cfg.lives, deckSkin: s.deckSkin
      });
      p.jokers = this.cfg.jokersOn ? (s.jokers || []).slice(0, 3) : [];
      p.vouchers = this.cfg.vouchersOn ? (s.vouchers || []).slice() : [];
      p.astral = this.cfg.blessingsOn ? Object.assign({}, s.astral || {}) : {};
      p.pendingBlessings = this.cfg.blessingsOn ? (s.blessings || []).slice() : [];
      this.players.push(p);
    }
    this.dealerIdx = 0;
  }

  /* ------------------------------------------------------------ eventos */

  Game.prototype.on = function (evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
    return this;
  };
  Game.prototype.fire = function (evt, data) {
    var l = this.listeners[evt];
    if (l) for (var i = 0; i < l.length; i++) l[i](data || {});
    var any = this.listeners['*'];
    if (any) for (var j = 0; j < any.length; j++) any[j]({ type: evt, data: data || {} });
  };
  Game.prototype.log = function (text, tag) {
    var entry = { text: text, tag: tag || 'info', round: this.roundNo, t: Date.now() };
    this.history.push(entry);
    if (this.history.length > 200) this.history.shift();
    this.fire('log', entry);
  };

  /* ------------------------------------------------------------- inicio */

  Game.prototype.start = function () {
    var self = this;
    this.players.forEach(function (p) {
      var extra = CR.fx.mod(self, p, 'startLives', 0, {});
      p.lives = Math.max(1, self.cfg.lives + extra);
      p.maxLives = p.lives;
      p.chips = CR.fx.mod(self, p, 'startChips', 0, {});
      p.blessings = (p.pendingBlessings || []).slice(0, self.blessingSlots(p));
    });
    CR.fx.emit(this, 'gameStart', {});
    this.state = 'dealing';
    this.log('Mesa aberta. ' + this.players.length + ' na roda.', 'system');
    this.fire('gameStart', {});
    this.nextRound();
    return this;
  };

  Game.prototype.blessingSlots = function (p) { return CR.fx.mod(this, p, 'blessingSlots', 2, {}); };
  Game.prototype.jokerSlots = function (p) { return CR.fx.mod(this, p, 'jokerSlots', 3, {}); };

  Game.prototype.alivePlayers = function () {
    return this.players.filter(function (p) { return p.alive; });
  };

  /* -------------------------------------------------------------- rodada */

  Game.prototype.nextRound = function () {
    var self = this;
    this.roundNo++;
    var alive = this.alivePlayers();
    if (alive.length <= 1) return this.endGame();

    var cards = D.shuffle(D.buildDeck(), this.rand);
    var vira = cards.pop();

    this.round = {
      no: this.roundNo,
      vira: vira,
      wild: D.wildOf(vira),
      extraWilds: [],
      maco: cards,
      lixeira: [],
      wildLimit: this.cfg.wildLimit,
      loose3Suits: false,
      dir: 1,
      reshuffles: 0,
      turnCount: 0,
      firstTurns: {},
      seen: []
    };

    alive.forEach(function (p) {
      p.resetRound();
      p.round = self.round;
      var extraWild = CR.fx.mod(self, p, 'wildLimit', self.cfg.wildLimit, {});
      if (extraWild > self.round.wildLimit) self.round.wildLimit = extraWild;
      if (CR.fx.mod(self, p, 'loose3Suits', false, {})) self.round.loose3Suits = true;
    });

    CR.fx.emit(this, 'beforeDeal', { round: this.round });

    // Distribuicao: uma a uma, alternadamente.
    var order = this.seatOrder();
    var sizes = {};
    order.forEach(function (p) { sizes[p.idx] = CR.fx.mod(self, p, 'handSize', self.cfg.handSize, {}); });
    var maxSize = Math.max.apply(null, order.map(function (p) { return sizes[p.idx]; }));
    for (var n = 0; n < maxSize; n++) {
      for (var i = 0; i < order.length; i++) {
        if (order[i].hand.length < sizes[order[i].idx]) order[i].hand.push(this.draw());
      }
    }

    order.forEach(function (p) {
      p.handSize = sizes[p.idx];
      var made = R.findMelds(p.hand, self.round);
      p.dealtMade = !!made;
      if (made) p.dealtMelds = made;
      p.needs = null;
    });

    this.turnIdx = this.nextSeatFrom(this.dealerIdx);
    this.state = this.cfg.mode === 'cachetao' ? 'fold' : 'turn';
    this.log('Rodada ' + this.roundNo + '. Vira: ' + D.cardName(vira) +
      ' — curinga e ' + D.RANKS[this.round.wild.rank - 1] + ' ' + (this.round.wild.red ? 'vermelho' : 'preto') + '.', 'round');
    CR.fx.emit(this, 'roundStart', { round: this.round });
    this.fire('roundStart', { round: this.round });

    if (this.state === 'fold') this.fire('foldPhase', {});
    else this.beginTurn();
  };

  /** Ordem dos assentos comecando pelo jogador a esquerda do distribuidor. */
  Game.prototype.seatOrder = function () {
    var out = [], n = this.players.length;
    for (var i = 1; i <= n; i++) {
      var p = this.players[(this.dealerIdx + i) % n];
      if (p.alive) out.push(p);
    }
    return out;
  };

  Game.prototype.nextSeatFrom = function (idx) {
    var n = this.players.length;
    for (var i = 1; i <= n; i++) {
      var k = ((idx + i * this.round.dir) % n + n) % n;
      if (this.players[k].alive && !this.players[k].folded) return k;
    }
    return idx;
  };

  Game.prototype.current = function () { return this.players[this.turnIdx]; };

  /* --------------------------------------------------------- compra/maco */

  Game.prototype.draw = function () {
    if (!this.round.maco.length) this.refillMaco();
    if (!this.round.maco.length) return null;
    return this.round.maco.pop();
  };

  Game.prototype.refillMaco = function () {
    var lix = this.round.lixeira;
    if (lix.length <= 1) return;
    var top = lix.pop();
    this.round.maco = D.shuffle(lix.slice(), this.rand);
    this.round.lixeira = [top];
    this.round.reshuffles++;
    this.log('Maco acabou. Lixeira reembaralhada.', 'system');
    this.fire('reshuffle', {});
  };

  /* ---------------------------------------------------------- fold/cachetao */

  Game.prototype.fold = function (idx) {
    var p = this.players[idx];
    if (!p || !p.alive || this.state !== 'fold') return false;
    p.folded = true;
    this.applyLives(p, -1, { reason: 'correu' });
    this.log(p.name + ' correu.', 'fold');
    this.fire('fold', { player: p });
    return this.checkFoldDone();
  };

  Game.prototype.play = function (idx) {
    var p = this.players[idx];
    if (!p || !p.alive || this.state !== 'fold') return false;
    p.decided = true;
    return this.checkFoldDone();
  };

  Game.prototype.checkFoldDone = function () {
    var pending = this.alivePlayers().filter(function (p) { return !p.folded && !p.decided; });
    if (pending.length) return false;
    var playing = this.alivePlayers().filter(function (p) { return !p.folded; });
    this.alivePlayers().forEach(function (p) { p.decided = false; });
    if (playing.length <= 1) {
      this.log('Todo mundo correu. Rodada anulada.', 'round');
      return this.endRound(null, null);
    }
    this.state = 'turn';
    this.turnIdx = this.nextSeatFrom(this.dealerIdx);
    this.beginTurn();
    return true;
  };

  /* --------------------------------------------------------------- turno */

  Game.prototype.beginTurn = function () {
    var p = this.current();
    if (!p || !p.alive) { this.advance(); return; }
    // Mesa travada: ninguem bate, o baralho so gira. Rodada anulada.
    if (this.round.turnCount > this.alivePlayers().length * 30) {
      this.log('Ninguem bateu. Rodada empatada, ninguem perde vida.', 'round');
      this.fire('stalemate', {});
      return this.endRound(null, { kind: 'empate' });
    }
    if (p.skipTurn) {
      p.skipTurn = false;
      this.log(p.name + ' esta congelado e perde a vez.', 'power');
      this.fire('skipTurn', { player: p });
      this.turnIdx = this.nextSeatFrom(this.turnIdx);
      return this.beginTurn();
    }
    this.expireReveals();
    this.phase = 'buy';
    this.round.turnCount++;
    this.turnStartedAt = Date.now();
    p.stats.rodadas = p.stats.rodadas;
    if (this.round.firstTurns[p.idx] === undefined) this.round.firstTurns[p.idx] = this.round.turnCount;
    p.needs = null;
    CR.fx.emitFor(this, p, 'turnStart', { round: this.round });
    this.log('Vez de ' + p.name + '.', 'turn');
    this.fire('turnStart', { player: p, phase: 'buy' });
  };

  Game.prototype.needsOf = function (p) {
    if (!p.needs) p.needs = R.computeNeeds(p.hand, this.round);
    return p.needs;
  };

  Game.prototype.canBater = function (p) {
    return !!R.findMelds(p.hand, this.round);
  };

  Game.prototype.drawFrom = function (source) {
    var p = this.current();
    if (this.phase !== 'buy' || !p) return false;
    var card = null;
    if (source === 'lixeira') {
      if (!this.round.lixeira.length) return false;
      if (p.lixeiraLocked) { p.lixeiraLocked = false; this.fire('lixeiraLocked', { player: p }); return false; }
      var depth = Math.min(arguments[1] || 0, CR.fx.mod(this, p, 'trashDepth', 1, {}) - 1);
      card = this.round.lixeira.splice(this.round.lixeira.length - 1 - depth, 1)[0];
    } else {
      card = this.draw();
      if (!card) { this.log('Maco vazio.', 'system'); return false; }
    }
    p.hand.push(card);
    p.needs = null;
    this.phase = 'discard';
    this.lastDrawn = card;
    CR.fx.emitFor(this, p, 'afterDraw', { card: card, from: source });
    this.log(p.name + ' comprou ' + (source === 'lixeira' ? 'da lixeira (' + D.cardName(card) + ')' : 'do maco') + '.', 'draw');
    this.fire('draw', { player: p, card: card, from: source });

    // Compra extra (Mao de Ouro, Dedo Rapido, voucher Sprint)
    var extra = CR.fx.mod(this, p, 'extraDraws', 0, { turn: this.round.firstTurns[p.idx] });
    if (extra > 0 && p.onceRound('extraDraw')) {
      for (var i = 0; i < extra; i++) {
        var c2 = this.draw();
        if (c2) { p.hand.push(c2); this.fire('draw', { player: p, card: c2, from: 'maco', extra: true }); }
      }
      p.needs = null;
      this.log(p.name + ' comprou carta extra.', 'power');
    }
    return true;
  };

  Game.prototype.discard = function (cardId) {
    var p = this.current();
    if (this.phase !== 'discard' || !p) return false;
    var card = p.removeCard(cardId);
    if (!card) return false;
    this.round.lixeira.push(card);
    this.round.seen.push(card);
    p.needs = null;
    CR.fx.emitFor(this, p, 'afterDiscard', { card: card });
    CR.fx.emit(this, 'anyDiscard', { card: card, from: p });
    if (card.seal) CR.seals.onDiscard(this, p, card);
    this.log(p.name + ' descartou ' + D.cardName(card) + '.', 'discard');
    this.fire('discard', { player: p, card: card });

    // Atualiza "na boa real" de todo mundo antes da janela de furo.
    this.refreshNaBoa();
    var cands = this.interceptCandidates(card, p);
    if (cands.length) {
      this.phase = 'intercept';
      this.pendingIntercept = { card: card, from: p, queue: cands, idx: 0 };
      this.fire('interceptWindow', this.pendingIntercept);
      this.resolveIntercept();
      return true;
    }
    this.advance();
    return true;
  };

  Game.prototype.refreshNaBoa = function () {
    var self = this;
    this.alivePlayers().forEach(function (p) {
      if (p.folded) return;
      if (p.hand.length === 9) {
        p.needs = p.needs || R.computeNeeds(p.hand, self.round);
        p.naBoaReal = p.needs.count > 0;
      }
    });
  };

  Game.prototype.interceptCandidates = function (card, from) {
    var self = this;
    return this.alivePlayers().filter(function (p) {
      if (p === from || p.folded || p.queimado) return false;
      if (!p.naBoa) return false;
      if (p.hand.length !== 9) return false;
      if (p.blockedUntilTurn && self.round.turnCount < p.blockedUntilTurn) return false;
      if (!CR.rules.needsServes(self.needsOf(p), card) && !p.bluffing) {
        // Sem blefe e sem serventia, nem pergunta.
        return false;
      }
      return true;
    });
  };

  /** Pergunta a cada candidato (bots decidem sozinhos; humano espera resposta da UI). */
  Game.prototype.resolveIntercept = function () {
    var pi = this.pendingIntercept;
    if (!pi) return;
    if (pi.idx >= pi.queue.length) {
      this.pendingIntercept = null;
      this.fire('interceptClosed', {});
      this.advance();
      return;
    }
    var p = pi.queue[pi.idx];
    if (p.isBot) {
      var wants = CR.bot.wantsIntercept(this, p, pi.card);
      this.answerIntercept(p.idx, wants);
    } else {
      this.fire('askIntercept', { player: p, card: pi.card });
    }
  };

  Game.prototype.answerIntercept = function (playerIdx, yes) {
    var pi = this.pendingIntercept;
    if (!pi) return false;
    var p = this.players[playerIdx];
    if (pi.queue[pi.idx] !== p) return false;
    if (!yes) { pi.idx++; return this.resolveIntercept(); }

    // Furou: pega a carta da lixeira e tenta bater com 10.
    var card = this.round.lixeira.pop();
    p.hand.push(card);
    p.needs = null;
    var melds = R.findMelds(p.hand, this.round);
    if (melds) {
      this.log(p.name + ' furou a fila e bateu!', 'bater');
      this.fire('intercept', { player: p, card: card, ok: true });
      this.pendingIntercept = null;
      return this.doBater(p, melds, { furou: true });
    }
    // Queimou — a menos que algum poder segure a barra.
    p.removeCard(card.id);
    this.round.lixeira.push(card);
    var immune = CR.fx.mod(this, p, 'burnImmune', false, {});
    if (!immune) { p.queimado = true; p.naBoa = false; }
    this.log(p.name + ' furou a fila e ' + (immune ? 'escapou da queima.' : 'queimou.'), 'queima');
    CR.fx.emit(this, 'onBurn', { burned: p, immune: immune });
    this.fire('burn', { player: p, card: card, immune: immune });
    pi.idx++;
    return this.resolveIntercept();
  };

  Game.prototype.declareNaBoa = function (idx, bluff) {
    var p = this.players[idx];
    if (!p || !p.alive || p.naBoa) return false;
    if (p.cursedUntil && this.roundNo <= p.cursedUntil) return false;
    p.needs = p.needs || R.computeNeeds(p.hand, this.round);
    p.naBoaReal = p.needs.count > 0;
    p.naBoa = true;
    p.bluffing = !p.naBoaReal;
    var hidden = CR.fx.mod(this, p, 'hideNaBoa', false, {});
    p.naBoaHidden = hidden;
    // O registro nunca pode dizer se e blefe: e exatamente isso que o pifar compra.
    this.log(p.name + ' avisou que ta na boa.', 'naboa');
    CR.fx.emit(this, 'onNaBoa', { declarer: p });
    this.fire('naBoa', { player: p, bluff: p.bluffing });
    return true;
  };

  Game.prototype.advance = function () {
    var winner = null;
    if (this.state !== 'turn') return;
    this.turnIdx = this.nextSeatFrom(this.turnIdx);
    this.beginTurn();
    return winner;
  };

  /* -------------------------------------------------------------- bater */

  Game.prototype.bater = function (idx) {
    var p = this.players[idx === undefined ? this.turnIdx : idx];
    if (!p || !p.alive) return false;
    var melds = R.findMelds(p.hand, this.round);
    if (!melds) { this.fire('baterFail', { player: p }); return false; }
    return this.doBater(p, melds, {});
  };

  Game.prototype.doBater = function (p, melds, opts) {
    opts = opts || {};
    var self = this;
    p.melds = melds;
    var ponta = melds.some(function (m) { return m.length >= 4; });
    var maoBatida = p.dealtMade && this.round.firstTurns[p.idx] === undefined;
    var flush = R.isFlushBater(melds, this.round);
    var wilds = R.usedWilds(melds, this.round);
    var kinds = melds.map(function (m) { return R.comboKind(m, self.round); });

    var kind = maoBatida ? 'maoBatida' : (p.hand.length >= 10 || ponta ? 'dez' : 'nove');
    var base = kind === 'maoBatida' ? 3 : kind === 'dez' ? 2 : 1;
    if (flush && base < 2) base = 2;
    if (this.cfg.mode === 'cachetao' && base < 2) base = 2;

    var ctx = {
      winner: p, melds: melds, kind: kind, ponta: ponta, flush: flush,
      wilds: wilds, kinds: kinds, base: base, chips: 0, extraOut: 0
    };
    base = CR.fx.mod(this, p, 'penaltyOut', base, ctx);
    CR.fx.emitFor(this, p, 'onBeat', ctx);
    CR.fx.emit(this, 'anyBeat', { winner: p, melds: melds, kind: kind });
    base += ctx.extraOut;

    // Fichas do vencedor
    var chips = 50;
    if (kind === 'dez') chips += 25;
    if (kind === 'maoBatida') chips += 50;
    if (flush) chips += 50;
    if (kinds.every(function (k) { return k === 'trinca'; })) chips += 30;
    if (wilds === 0) chips += 20;
    chips += ctx.chips;
    ctx.furou = !!(opts && opts.furou);
    chips = Math.round(CR.fx.mod(this, p, 'chipsGain', chips, ctx));
    this.alivePlayers().forEach(function (o) {
      if (o === p) return;
      chips = Math.round(CR.fx.mod(self, o, 'rivalChips', chips, ctx));
    });
    if (p.chipsMult) { chips = Math.round(chips * p.chipsMult); p.chipsMult = 0; }

    var killed = [];
    this.alivePlayers().forEach(function (o) {
      if (o === p) return;
      if (o.folded) return;               // ja perdeu 1 ao correr
      var amt = CR.fx.mod(self, o, 'penaltyIn', base, { attacker: p, kind: kind, player: o });
      amt -= CR.seals.handShield(o);
      amt = Math.max(0, Math.round(amt));
      if (amt > 0) {
        self.applyLives(o, -amt, { reason: 'batida', by: p });
        if (!o.alive) killed.push(o);
      }
      CR.fx.emitFor(self, o, 'onPenalty', { amount: amt, attacker: p });
      // Consolacao de cartas na mao (Acumulador, selo Ametista)
      CR.fx.emitFor(self, o, 'onLose', { attacker: p, kind: kind });
      CR.seals.onRoundLoss(self, o);
    });

    ctx.killed = killed;
    if (killed.length) chips = Math.round(CR.fx.mod(this, p, 'chipsGain', chips, ctx));
    chips += killed.length * 40;
    p.stats.kills += killed.length;
    this.award(p, chips, 'batida');
    CR.seals.onBeat(this, p, melds);
    if (kind === 'nove') p.stats.baterNove++;
    else if (kind === 'dez') p.stats.baterDez++;
    else p.stats.maoBatida++;

    var label = kind === 'maoBatida' ? 'MAO BATIDA' : kind === 'dez' ? 'bateu com 10' : 'bateu com 9';
    this.log(p.name + ' ' + label + (flush ? ' (flush!)' : '') + ' — todos perdem ' + base + '.', 'bater');
    this.fire('bater', {
      player: p, melds: melds, kind: kind, base: base, chips: chips,
      flush: flush, killed: killed, furou: !!opts.furou
    });
    return this.endRound(p, { kind: kind, melds: melds, base: base, chips: chips, flush: flush, killed: killed });
  };

  Game.prototype.applyLives = function (p, delta, meta) {
    if (!p.alive) return;
    if (delta < 0 && p.immune && meta && meta.by && meta.by !== p && meta.reason !== 'batida') return;
    var before = p.lives;
    p.lives = Math.max(0, Math.min(p.maxLives + 6, p.lives + delta));
    if (p.lives !== before) this.fire('lives', { player: p, delta: p.lives - before, meta: meta || {} });
    if (p.lives <= 0) {
      var revive = CR.fx.mod(this, p, 'revive', 0, { meta: meta });
      if (revive > 0) {
        p.lives = revive;
        this.log(p.name + ' voltou dos mortos com ' + revive + '.', 'power');
        this.fire('revive', { player: p });
        return;
      }
      p.alive = false;
      this.log(p.name + ' saiu da mesa.', 'elim');
      CR.fx.emit(this, 'onEliminate', { victim: p, by: meta && meta.by });
      this.fire('eliminated', { player: p, by: meta && meta.by });
    }
  };

  Game.prototype.award = function (p, amount, reason) {
    amount = Math.round(amount);
    if (!amount) return 0;
    p.chips += amount;
    this.fire('chips', { player: p, amount: amount, reason: reason });
    return amount;
  };

  /* ---------------------------------------------------------- fim rodada */

  Game.prototype.endRound = function (winner, summary) {
    var self = this;
    this.state = 'roundEnd';
    this.alivePlayers().forEach(function (p) {
      p.stats.rodadas++;
      self.award(p, CR.fx.mod(self, p, 'roundChips', 5, { winner: winner }), 'rodada');
      CR.fx.emitFor(self, p, 'roundEnd', { winner: winner });
    });
    this.players.forEach(function (p) {
      p.immune = false; p.naBoaHidden = false; p.lixeiraLocked = false;
      p.blockedUntilTurn = 0; p.stash = null;
      p.hand.forEach(function (c) { c.forcedWild = false; });
    });
    this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
    this.result = { winner: winner, summary: summary, roundNo: this.roundNo };
    this.fire('roundEnd', this.result);
    if (this.cfg.mode === 'rapida' || this.alivePlayers().length <= 1) {
      return this.endGame();
    }
    return true;
  };

  Game.prototype.endGame = function () {
    if (this.state === 'gameOver') return true;   // endRound e nextRound podem chamar os dois
    this.state = 'gameOver';
    var alive = this.alivePlayers();
    var champ = alive.length ? alive.reduce(function (a, b) { return b.lives > a.lives ? b : a; }) : null;
    this.champion = champ;
    this.log(champ ? champ.name + ' levou a mesa.' : 'Mesa encerrada.', 'system');
    this.fire('gameOver', { champion: champ, players: this.players });
    return true;
  };

  /* ----------------------------------------------------- acoes de poder */

  Game.prototype.expireReveals = function () {
    var t = this.round.turnCount, self = this;
    this.players.forEach(function (p) {
      p.revealed = p.revealed.filter(function (r) { return !r.until || r.until > t; });
    });
  };

  /** Mao Fantasma: guarda uma carta fora da mao. */
  Game.prototype.stashCard = function (idx, cardId) {
    var p = this.players[idx];
    if (!p || p.stash) return false;
    if (CR.fx.mod(this, p, 'stashSlots', 0, {}) < 1) return false;
    var c = p.removeCard(cardId);
    if (!c) return false;
    p.stash = c; p.needs = null;
    this.fire('stash', { player: p, card: c });
    return true;
  };

  Game.prototype.unstash = function (idx) {
    var p = this.players[idx];
    if (!p || !p.stash) return false;
    p.hand.push(p.stash); p.stash = null; p.needs = null;
    this.fire('unstash', { player: p });
    return true;
  };

  /** Trevo / Observatorio: devolve a carta comprada e tira outra. */
  Game.prototype.mulligan = function (idx) {
    var p = this.players[idx];
    if (!p || this.phase !== 'discard' || !this.lastDrawn) return false;
    if (!CR.fx.mod(this, p, 'mulligan', false, {})) return false;
    if (!p.onceRound('mulligan')) return false;
    var c = p.removeCard(this.lastDrawn.id);
    if (!c) return false;
    this.round.maco.unshift(c);
    var n = this.draw();
    if (n) p.hand.push(n);
    this.lastDrawn = n; p.needs = null;
    this.log(p.name + ' devolveu a carta e tirou outra.', 'power');
    this.fire('mulligan', { player: p, card: n });
    return true;
  };

  /** Alquimista: troca o naipe de uma carta. */
  Game.prototype.swapSuit = function (idx, cardId, suit) {
    var p = this.players[idx];
    if (!p || CR.fx.mod(this, p, 'suitSwap', 0, {}) < 1) return false;
    if (!p.onceRound('suitSwap')) return false;
    var c = null;
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].id === cardId) c = p.hand[i];
    if (!c) return false;
    c.suit = suit; c.red = D.isRed(suit); p.needs = null;
    this.log(p.name + ' converteu uma carta para ' + D.SUITS[suit] + '.', 'power');
    this.fire('powerFlash', { player: p, power: 'alquimista' });
    return true;
  };

  /** Trocador: troca uma carta sua por uma aleatoria de um adversario. */
  Game.prototype.swapWithRival = function (idx, cardId, rivalIdx) {
    var p = this.players[idx], r = this.players[rivalIdx];
    if (!p || !r || r === p || !r.alive) return false;
    if (CR.fx.mod(this, p, 'swapRival', 0, {}) < 1 || !p.onceRound('swapRival')) return false;
    var mine = p.removeCard(cardId);
    if (!mine) return false;
    var theirs = r.hand.splice(Math.floor(this.rand() * r.hand.length), 1)[0];
    p.hand.push(theirs); r.hand.push(mine);
    p.needs = null; r.needs = null;
    this.log(p.name + ' trocou uma carta com ' + r.name + '.', 'power');
    this.fire('powerFlash', { player: p, power: 'trocador' });
    return true;
  };

  /** Sabotador: forca descarte extra de um adversario. */
  Game.prototype.sabotage = function (idx, rivalIdx) {
    var p = this.players[idx], r = this.players[rivalIdx];
    if (!p || !r || r === p) return false;
    if (CR.fx.mod(this, p, 'sabotage', 0, {}) < 1 || !p.once('sabotador')) return false;
    if (r.hand.length < 2) return false;
    var c = r.hand.splice(Math.floor(this.rand() * r.hand.length), 1)[0];
    this.round.lixeira.push(c); r.needs = null;
    this.log(p.name + ' sabotou ' + r.name + '.', 'power');
    this.fire('powerFlash', { player: p, power: 'sabotador' });
    return true;
  };

  /** Ima: pega o topo da lixeira de graca se fechar combinacao. */
  Game.prototype.magnetTake = function (idx) {
    var p = this.players[idx];
    if (!p || !CR.fx.mod(this, p, 'magnet', false, {})) return false;
    if (!this.round.lixeira.length || !p.onceRound('magnet')) return false;
    var top = this.round.lixeira[this.round.lixeira.length - 1];
    if (!R.needsServes(this.needsOf(p), top)) return false;
    p.hand.push(this.round.lixeira.pop());
    p.needs = null;
    this.log(p.name + ' puxou ' + D.cardName(top) + ' com o Ima.', 'power');
    this.fire('powerFlash', { player: p, power: 'ima' });
    return true;
  };

  Game.prototype.useBlessing = function (idx, id, sel) {
    var p = this.players[idx];
    if (!p) return false;
    return CR.blessings.apply(this, p, id, sel);
  };

  CR.Game = Game;
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
