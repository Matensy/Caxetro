/* Caxeta Royale — Espelho da partida.
 *
 * Quem entrou na sala nao roda o motor: recebe do dono um retrato da mesa ja
 * filtrado (a mao alheia nunca vem junto) e monta este objeto, que responde as
 * mesmas perguntas que o CR.Game responde. A mesa nao sabe a diferenca.
 *
 * As acoes nao mudam nada aqui: viram mensagem pro dono, que e quem decide.
 */
(function (CR) {
  'use strict';
  var D = CR.deck, R = CR.rules;

  /* ------------------------------------------------------ serializacao */

  function porCarta(c) {
    return {
      id: c.id, rank: c.rank, suit: c.suit,
      seal: c.seal || null, edition: c.edition || null,
      forcedWild: !!c.forcedWild
    };
  }

  function deCarta(o) {
    return {
      id: o.id, rank: o.rank, suit: o.suit, red: D.isRed(o.suit),
      seal: o.seal || null, edition: o.edition || null,
      forcedWild: !!o.forcedWild, copy: 0
    };
  }

  /** Retrato da mesa do ponto de vista de um jogador. */
  function retratar(jogo, idx, board) {
    var r = jogo.round;
    return {
      v: (jogo._versao = (jogo._versao || 0) + 1),
      cfg: {
        mode: jogo.cfg.mode, travarCuringa: jogo.cfg.travarCuringa,
        lives: jogo.cfg.lives, turnTimer: jogo.cfg.turnTimer
      },
      board: board,
      state: jogo.state, phase: jogo.phase,
      turnIdx: jogo.turnIdx, roundNo: jogo.roundNo,
      eu: idx,
      lastDrawnId: jogo.lastDrawn ? jogo.lastDrawn.id : null,
      campeao: jogo.champion ? jogo.champion.idx : null,
      round: r ? {
        vira: porCarta(r.vira), wild: r.wild, extraWilds: r.extraWilds || [],
        wildLimit: r.wildLimit, loose3Suits: !!r.loose3Suits,
        turnCount: r.turnCount, dir: r.dir,
        macoQtd: r.maco.length,
        lixeira: r.lixeira.map(porCarta)
      } : null,
      jogadores: jogo.players.map(function (p) {
        var meu = p.idx === idx;
        return {
          idx: p.idx, name: p.name, isBot: p.isBot, botLevel: p.botLevel,
          lives: p.lives, maxLives: p.maxLives, alive: p.alive, chips: p.chips,
          naBoa: p.naBoa, naBoaHidden: !!p.naBoaHidden,
          queimado: p.queimado, folded: p.folded,
          qtdCartas: p.hand.length,
          handSize: p.handSize || 9,
          mao: meu ? p.hand.map(porCarta) : null,
          // Cartas que este jogador revelou justamente pra quem esta olhando.
          reveladas: p.revealed.filter(function (rv) { return rv.to === idx; })
            .map(function (rv) {
              var c = p.hand.filter(function (x) { return x.id === rv.cardId; })[0];
              return c ? { modo: rv.mode, carta: porCarta(c) } : null;
            }).filter(Boolean),
          jokers: meu ? p.jokers.slice() : [],
          blessings: meu ? p.blessings.slice() : [],
          temStash: !!p.stash,
          slotsCoringa: jogo.jokerSlots(p),
          slotsBencao: jogo.blessingSlots(p)
        };
      }),
      historico: jogo.history.slice(-8)
    };
  }

  /* ------------------------------------------------------------ espelho */

  function Espelho(enviarAcao) {
    this.enviarAcao = enviarAcao;
    this.listeners = {};
    this.players = [];
    this.history = [];
    this.state = 'init';
    this.phase = 'buy';
    this.turnIdx = 0;
    this.roundNo = 0;
    this.cfg = { mode: 'campeonato', travarCuringa: true, lives: 7, turnTimer: 0 };
    this.euIdx = 0;
    this.online = true;
    this.versao = -1;
  }

  Espelho.prototype.on = CR.Game.prototype.on;
  Espelho.prototype.fire = CR.Game.prototype.fire;
  Espelho.prototype.log = function () {};

  /** Aplica um retrato recebido do dono da sala. */
  Espelho.prototype.aplicar = function (snap) {
    if (snap.v <= this.versao) return false;      // retrato velho chegou atrasado
    this.versao = snap.v;
    this.cfg = snap.cfg;
    this.state = snap.state;
    this.phase = snap.phase;
    this.turnIdx = snap.turnIdx;
    this.roundNo = snap.roundNo;
    this.euIdx = snap.eu;
    this.board = snap.board;
    this.history = snap.historico || [];

    var maoAnterior = {};
    (this.players[this.euIdx] || { hand: [] }).hand.forEach(function (c) { maoAnterior[c.id] = c; });

    this.round = snap.round ? {
      vira: deCarta(snap.round.vira),
      wild: snap.round.wild,
      extraWilds: snap.round.extraWilds,
      wildLimit: snap.round.wildLimit,
      loose3Suits: snap.round.loose3Suits,
      turnCount: snap.round.turnCount,
      dir: snap.round.dir,
      maco: { length: snap.round.macoQtd },
      lixeira: snap.round.lixeira.map(deCarta),
      seen: []
    } : null;

    var self = this;
    this.players = snap.jogadores.map(function (j) {
      var mao;
      if (j.mao) {
        // Reaproveita o objeto da carta quando ela ja estava na mao, pra nao
        // perder a ordem que o jogador escolheu nem piscar a animacao.
        mao = j.mao.map(function (o) {
          var velha = maoAnterior[o.id];
          if (velha) {
            velha.seal = o.seal; velha.edition = o.edition; velha.forcedWild = o.forcedWild;
            velha.rank = o.rank; velha.suit = o.suit; velha.red = D.isRed(o.suit);
            return velha;
          }
          return deCarta(o);
        });
      } else {
        mao = [];
        for (var k = 0; k < j.qtdCartas; k++) mao.push({ oculta: true, id: 'x' + j.idx + '-' + k });
      }
      return {
        idx: j.idx, name: j.name, isBot: j.isBot, botLevel: j.botLevel,
        lives: j.lives, maxLives: j.maxLives, alive: j.alive, chips: j.chips,
        naBoa: j.naBoa, naBoaHidden: j.naBoaHidden,
        queimado: j.queimado, folded: j.folded,
        hand: mao, handSize: j.handSize,
        jokers: j.jokers, blessings: j.blessings,
        astral: {}, vouchers: [], flags: {}, roundFlags: {}, counters: {},
        revealed: [], reveladas: j.reveladas, stash: j.temStash ? { oculta: true } : null,
        slotsCoringa: j.slotsCoringa, slotsBencao: j.slotsBencao,
        once: function () { return false; },
        onceRound: function () { return false; },
        bump: function () { return 0; },
        hasJoker: function (id) { return this.jokers.indexOf(id) !== -1; },
        astralLevel: function () { return 0; },
        hasVoucher: function () { return false; }
      };
    });

    this.lastDrawn = null;
    if (snap.lastDrawnId) {
      var eu = this.players[this.euIdx];
      this.lastDrawn = eu.hand.filter(function (c) { return c.id === snap.lastDrawnId; })[0] || null;
    }
    this.champion = snap.campeao === null || snap.campeao === undefined
      ? null : this.players[snap.campeao];
    void self;
    return true;
  };

  /* -------------------------------------------- leitura que a mesa faz */

  Espelho.prototype.current = function () { return this.players[this.turnIdx]; };
  Espelho.prototype.alivePlayers = function () {
    return this.players.filter(function (p) { return p.alive; });
  };
  Espelho.prototype.jokerSlots = function (p) { return (p && p.slotsCoringa) || 3; };
  Espelho.prototype.blessingSlots = function (p) { return (p && p.slotsBencao) || 2; };
  Espelho.prototype.euSou = function () { return this.players[this.euIdx]; };
  Espelho.prototype.minhaVez = function () { return this.turnIdx === this.euIdx; };

  Espelho.prototype.needsOf = function (p) {
    // So dá pra calcular pra quem a gente ve a mao: o proprio jogador.
    if (!p || p.idx !== this.euIdx) return { keys: {}, list: [], count: 0 };
    if (!p._needs || p._needsVersao !== this.versao) {
      p._needs = R.computeNeeds(p.hand, this.round);
      p._needsVersao = this.versao;
    }
    return p._needs;
  };

  Espelho.prototype.curingaTravado = CR.Game.prototype.curingaTravado;

  /* ------------------------------------------------------------ acoes */

  function manda(self, acao, dados) {
    if (!self.minhaVez() && acao !== 'furar' && acao !== 'fold' && acao !== 'jogar') {
      CR.ui.aviso('Espera a sua vez.', 'ruim');
      return false;
    }
    self.enviarAcao(Object.assign({ acao: acao }, dados || {}));
    return true;
  }

  Espelho.prototype.drawFrom = function (fonte) { return manda(this, 'comprar', { fonte: fonte }); };
  Espelho.prototype.discard = function (id) {
    var eu = this.euSou();
    var alvo = eu.hand.filter(function (c) { return c.id === id; })[0];
    if (alvo && this.curingaTravado(eu, alvo)) {
      this.fire('descarteBloqueado', { player: eu, card: alvo });
      return false;
    }
    return manda(this, 'descartar', { id: id });
  };
  Espelho.prototype.bater = function () { return manda(this, 'bater'); };
  Espelho.prototype.declareNaBoa = function () { return manda(this, 'naboa'); };
  Espelho.prototype.mulligan = function () { return manda(this, 'mulligan'); };
  Espelho.prototype.stashCard = function (idx, id) { return manda(this, 'guardar', { id: id }); };
  Espelho.prototype.unstash = function () { return manda(this, 'desguardar'); };
  Espelho.prototype.magnetTake = function () { return false; };
  Espelho.prototype.swapSuit = function (idx, id, suit) { return manda(this, 'naipe', { id: id, suit: suit }); };
  Espelho.prototype.swapWithRival = function () { return false; };
  Espelho.prototype.sabotage = function () { return false; };
  Espelho.prototype.answerIntercept = function (idx, sim) {
    this.enviarAcao({ acao: 'furar', sim: !!sim });
    return true;
  };
  Espelho.prototype.fold = function () { this.enviarAcao({ acao: 'fold' }); return true; };
  Espelho.prototype.play = function () { this.enviarAcao({ acao: 'jogar' }); return true; };
  Espelho.prototype.nextRound = function () { this.enviarAcao({ acao: 'proxima' }); return true; };
  Espelho.prototype.advance = function () {};

  /** Bencao pedida pela mesa: manda so o id das cartas, o dono resolve. */
  Espelho.prototype.usarBencao = function (jogador, id, sel) {
    sel = sel || {};
    this.enviarAcao({
      acao: 'bencao', id: id,
      sel: {
        cardId: sel.card ? sel.card.id : null,
        cardIds: sel.cards ? sel.cards.map(function (c) { return c.id; }) : null,
        suit: sel.suit === undefined ? null : sel.suit,
        rivalIdx: sel.rival ? sel.rival.idx : null
      }
    });
    return true;
  };

  CR.Espelho = Espelho;
  CR.retrato = { retratar: retratar, porCarta: porCarta, deCarta: deCarta };
})(window.CR = window.CR || {});
