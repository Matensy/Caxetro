/* Caxeta Royale — bootstrap, navegacao e o laco que toca a partida. */
(function (CR) {
  'use strict';
  var U = CR.ui, R = CR.rules, D = CR.deck;

  var jogo = null, cfgAtual = null, ultimoHumano = null, timerVez = null, pausado = false;

  /* ------------------------------------------------------------ palco */

  function escalar() {
    var stage = document.getElementById('stage');
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / 960, h / 540);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.round((w - 960 * s) / 2) + 'px';
    stage.style.top = Math.round((h - 540 * s) / 2) + 'px';
    stage.style.position = 'absolute';
  }

  /* ------------------------------------------------------- navegacao */

  function ir(tela) {
    var raiz = U.mostrarTela(tela);
    if (!raiz) return;
    if (tela === 'menu') { raiz.className = 'tela'; CR.screens.menu(raiz); }
    else if (tela === 'lobby') { raiz.className = 'tela'; CR.screens.lobby(raiz); }
    else if (tela === 'sala') { raiz.className = 'tela'; CR.salaTela.sala(raiz); }
    else if (tela === 'loja') { raiz.className = 'tela'; CR.screens.loja(raiz); }
    else if (tela === 'desafios') { raiz.className = 'tela texto-col'; CR.screens.desafios(raiz); }
    else if (tela === 'ajuda') CR.screens.ajuda(raiz);
    else if (tela === 'ajustes') CR.screens.ajustes(raiz);
    raiz.setAttribute('data-ativa', '');
  }

  function irParaLobby() { ir('lobby'); }

  /* ---------------------------------------------------- iniciar partida */

  /** Equipamento que este aparelho leva pra mesa. */
  function meuEquipamento(classico) {
    var s = CR.save.dados;
    if (classico) return { jokers: [], blessings: [], vouchers: [], astral: {}, deck: 'padrao' };
    return {
      jokers: s.loadout.slice(),
      blessings: s.blessings.slice(0, 2),
      vouchers: s.vouchers.slice(),
      astral: Object.assign({}, s.astral),
      deck: s.deck
    };
  }

  /**
   * Monta o CR.Game a partir da configuracao da mesa e da lista de jogadores.
   * Serve tanto pro jogo local quanto pro dono da sala na rede.
   */
  function criarPartida(cfg, jogadores, board) {
    var classico = cfg.modo === 'classico';
    var deckId = (jogadores[0] && jogadores[0].equipamento && jogadores[0].equipamento.deck) || 'padrao';
    var deck = classico ? CR.store.DECKS[0]
      : (CR.store.DECKS.filter(function (d) { return d.id === deckId; })[0] || CR.store.DECKS[0]);

    var assentos = jogadores.map(function (j, i) {
      var eq = classico ? null : j.equipamento;
      return {
        name: j.nome || (j.bot ? 'Bot ' + (i + 1) : 'Jogador ' + (i + 1)),
        isBot: !!j.bot, botLevel: j.nivel,
        jokers: eq ? (eq.jokers || []).slice() : (j.bot && !classico ? loadoutDeBot(j.nivel, i) : []),
        blessings: eq ? (eq.blessings || []).slice() : [],
        vouchers: eq ? (eq.vouchers || []).slice() : [],
        astral: eq ? Object.assign({}, eq.astral || {}) : {},
        deckSkin: board
      };
    });

    // Bonus de deck valem pra quem escolheu o deck: o dono da mesa.
    if (!classico && assentos.length) {
      if (deck.mods.lendarioGratis) {
        var lend = CR.fx.all('joker').filter(function (j) { return j.rarity === 'lendario'; });
        assentos[0].jokers.push(lend[Math.floor(Math.random() * lend.length)].id);
      }
      if (deck.mods.bencaoGratis) {
        var bs = CR.fx.all('blessing');
        assentos[0].blessings.push(bs[Math.floor(Math.random() * bs.length)].id);
      }
      if (deck.mods.astralGratis) {
        var as = CR.fx.all('astral');
        assentos[0].astral[as[Math.floor(Math.random() * as.length)].id] = 1;
      }
      if (deck.mods.voucherGratis) {
        var vs = CR.fx.all('voucher');
        assentos[0].vouchers.push(vs[Math.floor(Math.random() * vs.length)].id);
      }
    }

    var g = new CR.Game({
      seats: assentos,
      mode: cfg.modo,
      lives: Math.max(2, cfg.vidas + (deck.mods.lives || 0)),
      handSize: deck.mods.handSize || 9,
      wildLimit: cfg.curingasPorCombo,
      allowKA2: cfg.kA2,
      turnTimer: cfg.timer,
      jokersOn: !classico && cfg.coringas,
      blessingsOn: !classico && cfg.bencoes,
      vouchersOn: !classico && cfg.pergaminhos,
      board: board
    });
    if (!classico) aplicarMarcas(g);
    ligarEventos(g);
    return g;
  }

  function comecarPartida(cfg) {
    var s = CR.save.dados;
    cfgAtual = cfg;
    var classico = cfg.modo === 'classico';
    if (classico) { cfg.coringas = false; cfg.bencoes = false; cfg.pergaminhos = false; }
    var eu = primeiroHumano(cfg);

    var jogadores = cfg.cadeiras.map(function (c, i) {
      return {
        nome: c.nome, bot: c.bot, nivel: c.nivel,
        equipamento: i === eu ? meuEquipamento(classico) : null
      };
    });
    // O dono do aparelho escolhe o deck, entao ele vai no primeiro lugar da lista.
    if (eu !== 0) {
      var t = jogadores[0]; jogadores[0] = jogadores[eu]; jogadores[eu] = t;
    }

    jogo = criarPartida(cfg, jogadores, s.board);

    var raiz = U.mostrarTela('mesa');
    CR.hud.montar(raiz);
    jogo.start();
    CR.hud.ligar(jogo, s.board);
    ultimoHumano = null;
    s.stats.partidas++;
    CR.store.bonusPrimeiroDoDia();
    CR.save.salvar();
    tocar();
  }

  function primeiroHumano(cfg) {
    for (var i = 0; i < cfg.cadeiras.length; i++) if (!cfg.cadeiras[i].bot) return i;
    return 0;
  }

  function loadoutDeBot(nivel, semente) {
    var pool = CR.fx.all('joker').filter(function (j) {
      if (nivel === 'iniciante') return j.rarity === 'comum';
      if (nivel === 'normal') return j.rarity === 'comum' || j.rarity === 'incomum';
      return j.rarity !== 'lendario';
    });
    var quantos = nivel === 'iniciante' ? 1 : nivel === 'normal' ? 2 : 3;
    var out = [];
    for (var i = 0; i < quantos; i++) {
      out.push(pool[(semente * 7 + i * 13 + Math.floor(Math.random() * pool.length)) % pool.length].id);
    }
    return out;
  }

  function aplicarMarcas(g) {
    var marcas = CR.save.dados.cardMarks;
    if (!marcas || !Object.keys(marcas).length) return;
    var antigo = g.nextRound.bind(g);
    g.nextRound = function () {
      var r = antigo();
      if (g.round && g.round.maco) {
        g.round.maco.forEach(function (c) {
          var m = marcas[c.rank + ':' + c.suit];
          if (m) { c.seal = m.seal || null; c.edition = m.edition || null; }
        });
      }
      return r;
    };
  }

  /* -------------------------------------------------------- eventos */

  function ligarEventos(g) {
    g.on('bater', function (d) {
      CR.sfx.tocarBatida();
      CR.fxcanvas.estourar(CR.save.dados.equipado.bater);
      cartaz(d.kind === 'maoBatida' ? 'MAO BATIDA' : d.kind === 'dez' ? 'BATEU COM 10' : 'BATEU');
      registrarDesafios(d);
    });
    g.on('lives', function (d) {
      if (d.delta < 0) CR.sfx.tocar('vida');
      var box = document.querySelector('.jog[data-idx="' + d.player.idx + '"]');
      if (box) { box.setAttribute('data-treme', ''); setTimeout(function () { box.removeAttribute('data-treme'); }, 340); }
    });
    g.on('eliminated', function () { CR.sfx.tocar('elimina'); });
    g.on('burn', function (d) { if (!d.immune) CR.sfx.tocar('queima'); });
    g.on('chips', function () { CR.sfx.tocar('ficha'); });
    g.on('powerFlash', function () { CR.sfx.tocar('poder'); });
    g.on('blessingUsed', function () { CR.sfx.tocar('poder'); });
    g.on('askIntercept', perguntarFuro);
    g.on('roundEnd', fimDeRodada);
    g.on('gameOver', fimDeJogo);
    g.on('foldPhase', faseDeFold);
    g.on('turnStart', function () { CR.hud.desenhar(); });
    g.on('stalemate', function () { U.aviso('Rodada empatada: ninguem conseguiu bater.', 'info'); });
  }

  function cartaz(txt) {
    var mesa = document.getElementById('tela-mesa');
    var n = U.el('div', { class: 'bate-cartaz' }, [U.el('span', { text: txt })]);
    mesa.appendChild(n);
    setTimeout(function () { n.remove(); }, 1200);
  }

  function registrarDesafios(d) {
    if (!d.player.isBot) {
      CR.store.progredir('baterDez', d.kind === 'dez' ? 1 : 0);
      if (d.kind === 'maoBatida') CR.store.progredir('maoBatida', 1);
      if (d.flush) CR.store.progredir('flush', 1);
      if (d.furou) CR.store.progredir('furouBateu', 1);
      var wilds = R.usedWilds(d.melds, jogo.round);
      if (wilds > 0) CR.store.progredir('baterCuringa', 1);
      else CR.store.progredir('baterLimpo', 1);
      var kinds = d.melds.map(function (m) { return R.comboKind(m, jogo.round); });
      if (kinds.every(function (k) { return k === 'trinca'; })) CR.store.progredir('tresTrincas', 1);
      CR.save.dados.stats.batidas++;
      if (d.kind === 'maoBatida') CR.save.dados.stats.maosBatidas++;
      if (d.killed.length) CR.store.progredir('eliminacoes', d.killed.length);
      CR.save.salvar();
    }
  }

  /* -------------------------------------------------------- o laco */

  function humanosNaMesa() {
    return jogo.players.filter(function (p) { return !p.isBot && p.alive; }).length;
  }

  function tocar() {
    if (!jogo || pausado) return;
    // Janela de furo aberta: quem decide e o jogador, nao o laco.
    if (jogo.pendingIntercept) return;
    limparTimer();
    if (jogo.state === 'fold') return;
    if (jogo.state !== 'turn') return;

    var p = jogo.current();
    if (!p || !p.alive) { jogo.advance(); return tocar(); }

    if (p.isBot) {
      CR.hud.desenhar();
      setTimeout(function () {
        if (!jogo || jogo.state !== 'turn' || jogo.current() !== p) return;
        CR.bot.step(jogo, p);
        CR.hud.desenhar();
        tocar();
      }, CR.bot.thinkTime(p));
      return;
    }

    // Na rede cada um tem o proprio aparelho: nada de tela de passar a vez,
    // e este cliente so desenha quando a vez e de quem esta nele.
    if (CR.online.ativo) {
      CR.hud.desenhar();
      if (p.idx === CR.online.meuIdx) armarTimer(p);
      return;
    }

    // Humano: passa o aparelho se for outra pessoa.
    if (humanosNaMesa() > 1 && ultimoHumano !== null && ultimoHumano !== p.idx) {
      var tela = U.mostrarTela('passa');
      CR.screens.passaVez(tela, p, function () {
        ultimoHumano = p.idx;
        U.mostrarTela('mesa');
        CR.hud.desenhar();
        armarTimer(p);
      });
      return;
    }
    ultimoHumano = p.idx;
    CR.hud.desenhar();
    armarTimer(p);
  }

  function armarTimer(p) {
    limparTimer();
    if (!cfgAtual || !cfgAtual.timer) return;
    var resta = cfgAtual.timer;
    timerVez = setInterval(function () {
      resta--;
      if (!jogo) { limparTimer(); return; }
      if (resta <= 0) {
        limparTimer();
        U.aviso('Tempo esgotado. Jogada automatica.', 'ruim');
        CR.bot.step(jogo, p);
        CR.hud.desenhar();
        tocar();
      }
    }, 1000);
  }
  function limparTimer() { if (timerVez) { clearInterval(timerVez); timerVez = null; } }

  /* ------------------------------------------------------- furar a fila */

  function perguntarFuro(d) {
    if (!jogo) return;
    // Dono da sala: se o jogador esta em outro aparelho, a pergunta vai pra la.
    if (CR.online.modo === 'dono' && CR.online.ehRemoto(d.player.idx)) {
      if (CR.online.perguntarFuroRemoto(d)) return;
    }
    perguntarFuroLocal(d);
  }

  function perguntarFuroLocal(d) {
    if (!jogo) return;
    var serve = R.needsServes(jogo.needsOf(d.player), d.card);
    var linha = U.el('div', { class: 'cartas-linha' }, [CR.hud.cartaEl(d.card)]);
    U.sobrepor(
      d.player.name + ', furar a fila?',
      serve ? 'Essa carta fecha sua mao. Pegue e bata na hora.'
            : 'Se essa carta nao fechar sua mao voce queima e perde o direito de furar nesta rodada.',
      [
        { rot: 'Deixa passar', acao: function () { jogo.answerIntercept(d.player.idx, false); CR.hud.desenhar(); tocar(); } },
        { rot: 'Furar', tipo: 'sim', acao: function () { jogo.answerIntercept(d.player.idx, true); CR.hud.desenhar(); tocar(); } }
      ], linha);
  }

  /* ---------------------------------------------------------- cachetao */

  function faseDeFold() {
    if (!jogo || jogo.state !== 'fold') return;
    var pendentes = jogo.alivePlayers().filter(function (p) { return !p.folded && !p.decided; });
    if (!pendentes.length) return;
    var p = pendentes[0];
    if (p.isBot) {
      setTimeout(function () {
        if (!jogo || jogo.state !== 'fold') return;
        if (CR.bot.decideFold(jogo, p)) jogo.fold(p.idx); else jogo.play(p.idx);
        seguirFold();
      }, 420);
      return;
    }
    CR.hud.desenhar();
    U.sobrepor(p.name + ', joga ou corre?',
      'Correr custa 1 vida na hora. Jogar e perder custa 2.',
      [
        { rot: 'Correr', acao: function () { jogo.fold(p.idx); seguirFold(); } },
        { rot: 'Jogar', tipo: 'sim', acao: function () { jogo.play(p.idx); seguirFold(); } }
      ]);
  }
  function seguirFold() {
    if (!jogo) return;
    CR.hud.desenhar();
    if (jogo.state === 'fold') faseDeFold(); else tocar();
  }

  /* -------------------------------------------------------- fim rodada */

  function fimDeRodada(res) {
    limparTimer();
    if (jogo.state === 'gameOver') return;
    var vencedor = res.winner;
    var extra = null;
    if (vencedor && res.summary && res.summary.melds) {
      extra = U.el('div', { class: 'combo-linha' });
      res.summary.melds.forEach(function (m) {
        var c = U.el('div', { class: 'combo' });
        m.forEach(function (card) { c.appendChild(CR.hud.cartaEl(card)); });
        extra.appendChild(c);
      });
    }
    var eliminados = (res.summary && res.summary.killed) || [];
    var souConvidado = CR.online.modo === 'convidado';
    var botoes = [souConvidado ? {
      rot: 'Fechar', acao: function () {}
    } : {
      rot: 'Proxima rodada', tipo: 'sim', acao: function () {
        if (!jogo) return;
        jogo.nextRound();
        CR.hud.desenhar();
        tocar();
      }
    }];
    if (eliminados.length && !souConvidado) botoes.unshift({
      rot: 'Passar na lojinha', acao: function () {
        pausado = true;
        CR.app.abrirLojaEntreRodadas();
      }
    });

    var titulo = vencedor ? vencedor.name + (res.summary.kind === 'maoBatida' ? ' veio com a mao batida' :
      res.summary.kind === 'dez' ? ' bateu com 10' : ' bateu') : 'Rodada sem batida';
    var texto = (souConvidado ? 'Esperando o dono da sala comecar a proxima. ' : '') + (vencedor
      ? 'Todo mundo na mesa perde ' + res.summary.base + (res.summary.base > 1 ? ' vidas.' : ' vida.') +
        (eliminados.length ? ' ' + eliminados.map(function (p) { return p.name; }).join(' e ') + ' saiu da mesa.' : '')
      : 'O baralho girou demais e ninguem fechou. Ninguem perde vida.');
    U.sobrepor(titulo, texto, botoes, extra);
  }

  function abrirLojaEntreRodadas() {
    ir('loja');
    var raiz = document.getElementById('tela-loja');
    var voltar = U.el('button', {
      class: 'botao-grande', style: 'position:absolute;right:22px;bottom:16px;padding:10px 22px;font-size:18px',
      type: 'button', text: 'Voltar pra mesa',
      onclick: function () {
        pausado = false;
        if (!jogo) return ir('menu');
        U.mostrarTela('mesa');
        jogo.nextRound();
        CR.hud.ligar(jogo, CR.save.dados.board);
        tocar();
      }
    });
    raiz.appendChild(voltar);
  }

  /* --------------------------------------------------------- fim jogo */

  function fimDeJogo(d) {
    if (!jogo) return;
    limparTimer();
    var partida = jogo;
    var s = CR.save.dados;
    var eu = partida.players.filter(function (p) { return !p.isBot; })[0];
    var ganho = eu ? eu.chips : 0;
    if (eu) {
      CR.store.creditar(ganho);
      if (d.champion === eu) {
        s.stats.vitorias++;
        CR.store.progredir('vitoriaSemBencao', eu.counters.bencoesUsadas ? 0 : 1);
        if (s.deck === 'minimalista') CR.store.progredir('vitoriaMinimalista', 1);
        if (partida.cfg.mode === 'cachetao') CR.store.progredir('vitoriaCachetao', 1);
        if (eu.jokers.length >= 3) CR.store.progredir('vitoriaTresCoringas', 1);
        var dificeis = partida.players.filter(function (p) { return p.isBot && p.botLevel === 'dificil'; });
        if (dificeis.length >= 3) CR.store.progredir('vitoriaDificil', 1);
        if (!eu.queimado) CR.store.progredir('semQueimar', 1);
      }
      CR.store.progredir('rodadas', eu.stats.rodadas);
      CR.store.progredir('fichasSessao', ganho);
      CR.save.salvar();
    }
    jogo = null;
    setTimeout(function () {
      var raiz = U.mostrarTela('fim');
      CR.screens.fim(raiz, partida, ganho);
    }, 900);
  }

  /** Convidado: o Espelho avisou que a partida acabou. */
  function fimOnline(espelho) {
    limparTimer();
    var raiz = U.mostrarTela('fim');
    var eu = espelho.euSou();
    CR.screens.fim(raiz, espelho, eu ? eu.chips : 0);
    if (eu) CR.store.creditar(eu.chips);
  }

  /* ------------------------------------------------------------- boot */

  function boot() {
    CR.save.carregar();
    var s = CR.save.dados;
    CR.sfx.ligado = s.opcoes.som !== false;
    CR.themes.apply(s.board);
    document.documentElement.setAttribute('data-ui', s.equipado.ui || 'ui-escuro');
    escalar();
    window.addEventListener('resize', escalar);
    window.addEventListener('orientationchange', function () { setTimeout(escalar, 120); });
    ['pointerdown', 'keydown'].forEach(function (e) {
      window.addEventListener(e, function once() {
        CR.sfx.despertar();
        window.removeEventListener(e, once);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && U.telaAtual !== 'menu' && U.telaAtual !== 'mesa') ir('menu');
    });

    CR.online.ligarOuvintes();
    CR.screens.splash(document.getElementById('tela-splash'));
    U.mostrarTela('splash');
    setTimeout(function () { ir('menu'); }, 1100);
  }

  CR.criarPartida = criarPartida;

  CR.app = {
    ir: ir, irParaLobby: irParaLobby, comecarPartida: comecarPartida,
    abrirLojaEntreRodadas: abrirLojaEntreRodadas, escalar: escalar,
    criarPartida: criarPartida, meuEquipamento: meuEquipamento,
    cartaz: cartaz, perguntarFuroLocal: perguntarFuroLocal,
    seguirFold: function () { seguirFold(); },
    fimOnline: fimOnline,
    get jogo() { return jogo; },
    set jogo(v) { jogo = v; },
    set cfgAtual(v) { cfgAtual = v; },
    tocar: function () { tocar(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.CR = window.CR || {});
