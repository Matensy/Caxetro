/* Caxeta Royale — a mesa: placar, pilhas, mao, acoes. */
(function (CR) {
  'use strict';
  var U = CR.ui, D = CR.deck, R = CR.rules, S = CR.sprites;

  var jogo = null, boardId = 'botequim', selecionada = null, arrastando = null;
  var refs = {}, analise = null;

  function montar(raiz) {
    U.limpa(raiz);
    // Mesa nova: solta a anterior, senao ligar() nao roda na segunda partida.
    jogo = null;
    analise = null;
    selecionada = null;
    refs.feltro = U.el('div', { class: 'mesa-feltro' }, [U.el('div', { class: 'borda' })]);
    refs.canvas = U.el('canvas', { id: 'fx-canvas', width: 960, height: 540, 'aria-hidden': 'true' });
    refs.placar = U.el('div', { class: 'placar' });
    refs.trilhoE = U.el('div', { class: 'trilho' });
    refs.trilhoD = U.el('div', { class: 'trilho' });
    refs.pilhas = U.el('div', { class: 'pilhas' });
    refs.acoes = U.el('div', { class: 'acoes' });
    refs.grupos = U.el('div', { class: 'grupos', 'aria-live': 'polite' });
    refs.mao = U.el('div', { class: 'mao' });
    refs.medidor = U.el('div', { class: 'medidor' });
    refs.registro = U.el('div', { class: 'registro', 'aria-live': 'polite' });

    var miolo = U.el('div', { class: 'miolo' }, [refs.trilhoE, refs.pilhas, refs.trilhoD]);
    var maoArea = U.el('div', { class: 'mao-area' }, [refs.grupos, refs.mao, refs.medidor]);
    var rodape = U.el('div', { class: 'rodape-mesa' }, [refs.acoes, maoArea, U.el('div')]);
    var conteudo = U.el('div', { class: 'mesa-conteudo' }, [refs.placar, miolo, rodape]);

    raiz.appendChild(refs.feltro);
    raiz.appendChild(refs.canvas);
    raiz.appendChild(conteudo);
    raiz.appendChild(refs.registro);
    CR.fxcanvas.iniciar(refs.canvas);
  }

  function ligar(g, board) {
    jogo = g;
    boardId = board || 'botequim';
    selecionada = null;
    CR.themes.apply(boardId);
    refs.feltro.style.setProperty('--felt-textura', S.feltTexture(boardId));
    refs.feltro.style.backgroundImage = S.feltTexture(boardId);
    CR.fxcanvas.ligar(boardId);
    desenhar();
  }

  /* ------------------------------------------------------ quem esta vendo */

  /**
   * Quem esta olhando pra tela. No hot-seat e o humano da vez; na rede e
   * sempre o dono deste aparelho, mesmo quando a vez e de outro.
   */
  function visivel() {
    if (!jogo) return null;
    if (jogo.online) {
      var eu = jogo.players[CR.online.meuIdx];
      return eu && eu.alive ? eu : null;
    }
    var p = jogo.current();
    if (p && !p.isBot && p.alive) return p;
    return null;
  }

  /** Como o placar chama cada um: "voce" e so quem esta neste aparelho. */
  function papelDe(p) {
    if (p.isBot) return p.botLevel;
    if (jogo.online) return p.idx === CR.online.meuIdx ? 'voce' : 'na rede';
    return 'voce';
  }

  /** Da pra agir agora? Na rede, so na propria vez. */
  function minhaVez() {
    if (!jogo) return false;
    if (!jogo.online) return true;
    return jogo.turnIdx === CR.online.meuIdx;
  }

  function classicos() { return CR.save.dados.opcoes.naipesClassicos; }
  function temaDaCarta() { return classicos() ? 'botequim' : boardId; }

  function cartaEl(card, opcoes) {
    opcoes = opcoes || {};
    var wild = jogo && D.isWild(card, jogo.round);
    var n = U.el(opcoes.botao ? 'button' : 'div', {
      class: 'carta' + (opcoes.classe ? ' ' + opcoes.classe : ''),
      html: S.cardFace(card, temaDaCarta(), wild),
      'data-id': card.id,
      type: opcoes.botao ? 'button' : null
    });
    return n;
  }

  function versoEl(extra) {
    return U.el('div', { class: 'carta' + (extra ? ' ' + extra : ''), html: S.cardBack(temaDaCarta()) });
  }

  /* -------------------------------------------------------------- placar */

  function desenharPlacar() {
    U.limpa(refs.placar);
    var eu = visivel();
    jogo.players.forEach(function (p) {
      var vidas = U.el('div', { class: 'vidas' });
      var total = Math.max(p.maxLives, p.lives);
      for (var i = 0; i < total; i++) {
        vidas.appendChild(U.el('span', { class: 'vida', 'data-perdida': i >= p.lives ? '' : null }));
      }
      var selos = U.el('div', { class: 'selos' });
      if (p.naBoa && (!p.naBoaHidden || p === eu)) selos.appendChild(U.el('span', { class: 'selo-boa', text: 'ta na boa' }));
      if (p.queimado) selos.appendChild(U.el('span', { class: 'selo-queimado', text: 'queimado' }));
      if (p.folded) selos.appendChild(U.el('span', { class: 'selo-correu', text: 'correu' }));

      var mostrarCont = eu && CR.fx.mod(jogo, eu, 'showCounts', false, {});
      var box = U.el('div', {
        class: 'jog', 'data-vez': jogo.current() === p ? '' : null,
        'data-morto': p.alive ? null : '', 'data-idx': p.idx
      }, [
        U.el('div', { class: 'linha1' }, [
          U.el('span', { class: 'nome', text: p.name }),
          U.el('span', { class: 'tipo', text: papelDe(p) })
        ]),
        vidas, selos,
        mostrarCont ? U.el('div', { class: 'cartas-cont', text: p.hand.length + ' cartas' }) : null
      ]);
      refs.placar.appendChild(box);
    });
  }

  /* -------------------------------------------------------------- pilhas */

  function desenharPilhas() {
    U.limpa(refs.pilhas);
    var eu = visivel();
    var podeComprar = eu && jogo.phase === 'buy' && minhaVez();
    var r = jogo.round;

    // Maco
    var maco = U.el('div', { class: 'pilha-col' });
    var monte = U.el('div', { class: 'monte carta' });
    monte.appendChild(U.el('div', { class: 'sombra' }));
    monte.appendChild(U.el('div', { class: 'sombra' }));
    var topo = U.el('button', {
      class: 'carta carta-clicavel', html: S.cardBack(temaDaCarta()), type: 'button',
      'aria-label': 'Comprar do maco', disabled: !podeComprar,
      onclick: function () { acaoComprar('maco'); }
    });
    topo.style.position = 'absolute'; topo.style.inset = '0';
    monte.appendChild(topo);
    maco.appendChild(U.el('div', { class: 'rot', text: 'Maco' }));
    maco.appendChild(monte);
    maco.appendChild(U.el('div', { class: 'sub', text: r.maco.length + ' cartas' }));
    refs.pilhas.appendChild(maco);

    // Lixeira
    var lix = U.el('div', { class: 'pilha-col' });
    lix.appendChild(U.el('div', { class: 'rot', text: 'Lixeira' }));
    if (r.lixeira.length) {
      var top = r.lixeira[r.lixeira.length - 1];
      var b = U.el('button', {
        class: 'carta carta-clicavel', html: S.cardFace(top, temaDaCarta(), D.isWild(top, r)),
        type: 'button', 'aria-label': 'Comprar da lixeira', disabled: !podeComprar,
        onclick: function () { acaoComprar('lixeira'); }
      });
      lix.appendChild(b);
    } else {
      lix.appendChild(U.el('div', { class: 'vazio', text: 'vazia' }));
    }
    var prof = eu ? CR.fx.mod(jogo, eu, 'peekTrash', 1, {}) : 1;
    var extra = [];
    for (var i = 2; i <= prof && r.lixeira.length >= i; i++) {
      extra.push(D.cardName(r.lixeira[r.lixeira.length - i]));
    }
    lix.appendChild(U.el('div', { class: 'sub', text: extra.length ? 'debaixo: ' + extra.join(', ') : r.lixeira.length + ' descartadas' }));
    refs.pilhas.appendChild(lix);

    // Vira
    var vira = U.el('div', { class: 'pilha-col vira-caixa' });
    vira.appendChild(U.el('div', { class: 'rot', text: 'Vira' }));
    vira.appendChild(cartaEl(r.vira));
    vira.appendChild(U.el('div', {
      class: 'curinga-diz',
      html: 'curinga: ' + D.RANKS[r.wild.rank - 1] + ' ' + (r.wild.red ? 'vermelho' : 'preto')
    }));
    refs.pilhas.appendChild(vira);
  }

  /* -------------------------------------------------------------- poderes */

  function slotPoder(def, aoClicar) {
    if (!def) return U.el('div', { class: 'slot-poder', text: 'vazio' });
    var n = U.el('button', {
      class: 'slot-poder cheio', type: 'button',
      title: def.name + ': ' + def.text, 'aria-label': def.name,
      onclick: aoClicar || null
    });
    n.innerHTML = S.emblema(def, boardId);
    n.appendChild(U.el('span', { class: 'slot-nome', text: def.name }));
    return n;
  }

  function desenharTrilhos() {
    U.limpa(refs.trilhoE); U.limpa(refs.trilhoD);
    var eu = visivel() || jogo.players.filter(function (p) { return !p.isBot; })[0];
    refs.trilhoE.appendChild(U.el('h4', { text: 'Coringas' }));
    var slots = jogo.jokerSlots(eu || jogo.players[0]);
    for (var i = 0; i < Math.min(4, slots); i++) {
      var id = eu && eu.jokers[i];
      refs.trilhoE.appendChild(slotPoder(id ? CR.fx.get('joker', id) : null, id ? function () {
        var d = CR.fx.get('joker', id);
        U.sobrepor(d.name, d.text + (d.drawback ? ' Contrapartida: ' + d.drawback : ''), [{ rot: 'Fechei', tipo: 'sim' }]);
      } : null));
    }

    refs.trilhoD.appendChild(U.el('h4', { text: 'Bencaos' }));
    var nb = eu ? jogo.blessingSlots(eu) : 2;
    for (var j = 0; j < Math.min(4, nb); j++) {
      (function (idx) {
        var bid = eu && eu.blessings[idx];
        var def = bid ? CR.fx.get('blessing', bid) : null;
        refs.trilhoD.appendChild(slotPoder(def, def ? function () { usarBencao(eu, bid, def); } : null));
      })(j);
    }
  }

  /* --------------------------------------------------------------- acoes */

  function desenharAcoes() {
    U.limpa(refs.acoes);
    var eu = visivel();
    if (!eu) {
      refs.acoes.appendChild(U.el('div', { class: 'acao', text: 'Bot pensando...', disabled: true }));
      return;
    }
    if (!minhaVez()) {
      var davez = jogo.current();
      refs.acoes.appendChild(U.el('div', {
        class: 'acao', disabled: true,
        html: 'Vez de ' + S.esc(davez ? davez.name : '?') + '<small>voce joga na sua vez</small>'
      }));
      refs.acoes.appendChild(botaoOrganizar(eu));
      return;
    }
    var podeBater = !!R.findMelds(eu.hand, jogo.round);
    refs.acoes.appendChild(U.el('button', {
      class: 'acao acao--bater', type: 'button', disabled: !podeBater,
      html: 'Bater!<small>' + (podeBater ? 'sua mao fecha tres combinacoes' : 'ainda nao fecha') + '</small>',
      onclick: function () { acaoBater(); }
    }));

    var podeBoa = !eu.naBoa && !eu.queimado && jogo.phase === 'discard';
    refs.acoes.appendChild(U.el('button', {
      class: 'acao acao--boa', type: 'button', disabled: !podeBoa,
      html: 'To na boa<small>' + (eu.naBoa ? 'ja declarou' : 'avisa a mesa e libera furar a fila') + '</small>',
      onclick: function () { acaoNaBoa(eu); }
    }));

    if (jogo.phase === 'discard' && selecionada) {
      refs.acoes.appendChild(U.el('button', {
        class: 'acao', type: 'button',
        html: 'Descartar<small>' + D.cardName(selecionada) + '</small>',
        onclick: function () { acaoDescartar(selecionada.id); }
      }));
    }

    refs.acoes.appendChild(botaoOrganizar(eu));
    if (CR.fx.mod(jogo, eu, 'mulligan', false, {}) && jogo.phase === 'discard') {
      refs.acoes.appendChild(U.el('button', {
        class: 'acao', type: 'button',
        html: 'Devolver<small>troca a carta comprada</small>',
        onclick: function () { if (jogo.mulligan(eu.idx)) { CR.sfx.tocar('compra'); desenhar(); } else U.aviso('Ja usou nesta rodada.', 'ruim'); }
      }));
    }
    if (CR.fx.mod(jogo, eu, 'stashSlots', 0, {}) > 0 && jogo.phase === 'discard' && selecionada) {
      refs.acoes.appendChild(U.el('button', {
        class: 'acao', type: 'button',
        html: 'Guardar<small>fora do limite de mao</small>',
        onclick: function () { if (jogo.stashCard(eu.idx, selecionada.id)) { selecionada = null; desenhar(); } }
      }));
    }
  }

  function botaoOrganizar(eu) {
    var auto = CR.save.dados.opcoes.organizar !== false;
    return U.el('button', {
      class: 'acao', type: 'button',
      html: 'Organizar<small>' + (auto ? 'agrupando sozinho' : 'agrupar agora') + '</small>',
      onclick: function () {
        CR.save.dados.opcoes.organizar = true;
        CR.save.salvar();
        CR.organizador.organizar(eu.hand, jogo.round);
        CR.sfx.tocar('carta');
        desenharMao();
        desenharAcoes();
      }
    });
  }

  /* ----------------------------------------------------------------- mao */

  /** Curinga da rodada nao pode ir pra lixeira. */
  function travada(card) {
    if (!jogo.cfg.travarCuringa) return false;
    if (card.forcedWild) return false;              // Coringa Supremo faria travar a mao inteira
    return D.isWild(card, jogo.round);
  }

  function desenharGrupos() {
    U.limpa(refs.grupos);
    if (!analise) return;
    if (!analise.grupos.length) {
      refs.grupos.appendChild(U.el('span', { class: 'nada', text: 'Nenhuma combinacao ainda. Junte tres do mesmo valor ou tres do mesmo naipe em sequencia.' }));
      return;
    }
    analise.grupos.forEach(function (g) {
      var chip = U.el('div', {
        class: 'grupo-chip', 'data-parcial': g.completo ? null : '',
        style: '--cor-grupo:' + g.cor, title: g.rotulo
      }, [
        U.el('span', { class: 'letra', text: g.letra }),
        U.el('span', { text: g.rotulo })
      ]);
      if (g.curinga) chip.appendChild(U.el('span', { class: 'curinga-tag', text: 'curinga' }));
      refs.grupos.appendChild(chip);
    });
  }

  function desenharMao() {
    U.limpa(refs.mao);
    var eu = visivel();
    if (!eu) {
      analise = null;
      desenharGrupos();
      var p = jogo.current();
      for (var k = 0; k < (p ? p.hand.length : 9); k++) refs.mao.appendChild(versoEl());
      U.limpa(refs.medidor);
      return;
    }

    if (CR.save.dados.opcoes.organizar !== false) CR.organizador.organizar(eu.hand, jogo.round);
    analise = CR.organizador.analisar(eu.hand, jogo.round);
    desenharGrupos();

    var grupoAnterior = null;
    eu.hand.forEach(function (card, i) {
      var gi = analise.porCarta[card.id];
      var g = gi === undefined ? null : analise.grupos[gi];
      var n = cartaEl(card);
      if (selecionada === card) n.setAttribute('data-sel', '');
      if (card === jogo.lastDrawn) n.setAttribute('data-nova', '');
      if (g) {
        n.setAttribute('data-grupo', g.letra);
        n.style.setProperty('--cor-grupo', g.cor);
        if (!g.completo) n.setAttribute('data-parcial', '');
        if (g !== grupoAnterior) {
          n.setAttribute('data-letra', g.letra);
          if (i > 0) n.setAttribute('data-inicio-grupo', '');
        }
      } else if (grupoAnterior && i > 0) n.setAttribute('data-inicio-grupo', '');
      grupoAnterior = g;

      if (travada(card)) {
        n.setAttribute('data-travada', '');
        n.appendChild(U.el('span', {
          class: 'cadeado', title: 'Curinga da rodada: essa carta nao vai pra lixeira',
          html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1a1405" d="M7 10V7a5 5 0 0 1 10 0v3h1.5a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V7a2.5 2.5 0 0 0-5 0z"/></svg>'
        }));
      }

      n.setAttribute('draggable', 'true');
      n.setAttribute('tabindex', '0');
      n.setAttribute('role', 'button');
      n.setAttribute('aria-label', D.rankLabel(card.rank) + ' de ' + D.SUITS[card.suit] +
        (g ? ', grupo ' + g.letra + ', ' + g.rotulo : ', sem grupo') +
        (travada(card) ? ', curinga travado' : ''));
      n.addEventListener('click', function () { escolher(card); });
      n.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(card); }
      });
      n.addEventListener('dragstart', function (e) {
        arrastando = i; n.setAttribute('data-arrastando', '');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.id); } catch (err) {}
      });
      n.addEventListener('dragend', function () { arrastando = null; desenharMao(); });
      n.addEventListener('dragover', function (e) { e.preventDefault(); n.setAttribute('data-alvo', ''); });
      n.addEventListener('dragleave', function () { n.removeAttribute('data-alvo'); });
      n.addEventListener('drop', function (e) {
        e.preventDefault();
        if (arrastando === null || arrastando === i) return;
        var moved = eu.hand.splice(arrastando, 1)[0];
        eu.hand.splice(i, 0, moved);
        arrastando = null;
        // Mexeu na mao de proposito: para de reorganizar sozinho.
        CR.save.dados.opcoes.organizar = false;
        CR.save.salvar();
        CR.sfx.tocar('carta');
        desenharMao();
        desenharAcoes();
      });
      refs.mao.appendChild(n);
    });

    desenharMedidor(eu);
  }

  function desenharMedidor(eu) {
    U.limpa(refs.medidor);
    if (CR.save.dados.opcoes.dica === false) return;
    var fechados = analise ? analise.fechados : 0;
    var pct = Math.min(100, Math.round(fechados / 3 * 100));
    var needs = eu.hand.length === eu.handSize ? jogo.needsOf(eu) : null;
    refs.medidor.appendChild(U.el('span', { text: fechados + ' de 3' }));
    var trilha = U.el('div', { class: 'trilha' });
    trilha.appendChild(U.el('i', { style: 'width:' + pct + '%' }));
    refs.medidor.appendChild(trilha);
    refs.medidor.appendChild(U.el('span', {
      text: needs && needs.count ? 'falta 1 carta, e ' + needs.count + ' do baralho servem' :
        fechados === 3 ? 'da pra bater' :
        fechados === 2 ? 'duas combinacoes fechadas' :
        fechados === 1 ? 'uma combinacao fechada' : 'nenhuma combinacao fechada'
    }));
  }

  function escolher(card) {
    var eu = visivel();
    if (!eu) return;
    if (!minhaVez()) { U.aviso('Ainda nao e a sua vez.', 'ruim'); return; }
    if (jogo.phase === 'discard' && travada(card)) {
      U.aviso('O curinga da rodada fica na mao. Escolha outra carta.', 'ruim');
      return;
    }
    if (jogo.phase === 'discard') {
      if (selecionada === card) acaoDescartar(card.id);
      else { selecionada = card; CR.sfx.tocar('carta'); desenharMao(); desenharAcoes(); }
    } else {
      selecionada = selecionada === card ? null : card;
      desenharMao();
    }
  }

  /* -------------------------------------------------------------- acoes */

  function acaoComprar(fonte) {
    var eu = visivel(); if (!eu) return;
    if (fonte === 'lixeira' && eu.lixeiraLocked) { U.aviso('Lixeira travada neste turno.', 'ruim'); }
    if (jogo.drawFrom(fonte)) {
      CR.sfx.tocar(fonte === 'maco' ? 'compra' : 'carta');
      selecionada = null;
      desenhar();
    }
  }

  function acaoDescartar(id) {
    if (!jogo.discard(id)) {
      U.aviso('Essa carta nao pode ir pra lixeira agora.', 'ruim');
      desenhar();
      return;
    }
    CR.sfx.tocar('descarte');
    selecionada = null;
    desenhar();
    // O descarte passa a vez: e aqui que o laco volta a rodar.
    if (!jogo.online || CR.online.modo === 'dono') CR.app.tocar();
  }

  function acaoNaBoa(eu) {
    var needs = jogo.needsOf(eu);
    if (needs.count > 0) {
      jogo.declareNaBoa(eu.idx);
      CR.sfx.tocar('naboa');
      CR.store.progredir('naBoa', 1);
      desenhar();
      return;
    }
    U.sobrepor('Ta na boa mesmo?', 'Voce ainda precisa de mais de uma carta. Declarar agora e blefe: se voce furar a fila e nao bater, voce queima.',
      [{ rot: 'Deixa quieto' }, {
        rot: 'Blefar', tipo: 'sim', acao: function () {
          jogo.declareNaBoa(eu.idx, true);
          CR.sfx.tocar('naboa');
          CR.store.progredir('naBoa', 1);
          desenhar();
        }
      }]);
  }

  function acaoBater() {
    var eu = visivel(); if (!eu) return;
    if (!jogo.bater(eu.idx)) U.aviso('Sua mao ainda nao fecha tres combinacoes.', 'ruim');
  }

  function usarBencao(eu, id, def) {
    if (def.target === 'card' || def.target === 'card+suit' || def.target === 'twoCards') {
      escolherCartas(def, eu, function (sel) {
        if (jogo.usarBencao(eu, id, sel)) { CR.sfx.tocar('poder'); CR.store.progredir('bencoesUsadas', 1); desenhar(); }
      });
      return;
    }
    if (def.target === 'rival') {
      escolherRival(def, eu, function (r) {
        if (jogo.usarBencao(eu, id, { rival: r })) { CR.sfx.tocar('poder'); CR.store.progredir('bencoesUsadas', 1); desenhar(); }
      });
      return;
    }
    U.sobrepor(def.name, def.text, [{ rot: 'Agora nao' }, {
      rot: 'Usar', tipo: 'sim', acao: function () {
        if (jogo.usarBencao(eu, id, {})) { CR.sfx.tocar('poder'); CR.store.progredir('bencoesUsadas', 1); desenhar(); }
        else U.aviso('Nao deu pra usar agora.', 'ruim');
      }
    }]);
  }

  function escolherCartas(def, eu, pronto) {
    var quantas = def.target === 'twoCards' ? 2 : 1;
    var escolhidas = [];
    var linha = U.el('div', { class: 'cartas-linha' });
    eu.hand.forEach(function (c) {
      var n = cartaEl(c);
      n.classList.add('carta-clicavel');
      n.addEventListener('click', function () {
        var i = escolhidas.indexOf(c);
        if (i >= 0) { escolhidas.splice(i, 1); n.removeAttribute('data-sel'); }
        else if (escolhidas.length < quantas) { escolhidas.push(c); n.setAttribute('data-sel', ''); }
      });
      linha.appendChild(n);
    });
    U.sobrepor(def.name, def.text + ' Escolha ' + (quantas > 1 ? 'duas cartas' : 'uma carta') + '.',
      [{ rot: 'Agora nao' }, {
        rot: 'Usar', tipo: 'sim', acao: function () {
          if (escolhidas.length !== quantas) return U.aviso('Escolha ' + quantas + '.', 'ruim');
          pronto(quantas > 1 ? { cards: escolhidas } : { card: escolhidas[0] });
        }
      }], linha);
  }

  function escolherRival(def, eu, pronto) {
    var rivais = jogo.alivePlayers().filter(function (p) { return p !== eu; });
    var escolhido = rivais[0];
    var linha = U.el('div', { class: 'botoes' });
    rivais.forEach(function (r) {
      var b = U.el('button', {
        text: r.name, type: 'button', 'aria-pressed': String(r === escolhido),
        onclick: function () {
          escolhido = r;
          [].slice.call(linha.children).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
        }
      });
      linha.appendChild(b);
    });
    U.sobrepor(def.name, def.text + ' Escolha o alvo.', [{ rot: 'Agora nao' }, {
      rot: 'Usar', tipo: 'sim', acao: function () { pronto(escolhido); }
    }], linha);
  }

  /* ------------------------------------------------------------ registro */

  /** Humano eliminado continua vendo a mesa, mas sem mao e sem acoes. */
  function desenharEspectador() {
    var raiz = document.getElementById('tela-mesa');
    var antigo = raiz.querySelector('.espectando');
    var mortos = jogo.players.filter(function (p) { return !p.isBot && !p.alive; });
    var vivos = jogo.players.filter(function (p) { return !p.isBot && p.alive; });
    if (!mortos.length || vivos.length) { if (antigo) antigo.remove(); return; }
    if (antigo) return;
    raiz.appendChild(U.el('div', { class: 'espectando', text: mortos[0].name + ' saiu da mesa — agora e so assistir' }));
  }

  function desenharRegistro() {
    U.limpa(refs.registro);
    jogo.history.slice(-8).forEach(function (h) {
      refs.registro.appendChild(U.el('div', { 'data-tag': h.tag, text: h.text }));
    });
  }

  function desenhar() {
    if (!jogo || !jogo.round || jogo.state === 'gameOver') return;
    desenharEspectador();
    desenharPlacar();
    desenharPilhas();
    desenharTrilhos();
    desenharAcoes();
    desenharMao();
    desenharRegistro();
  }

  CR.hud = {
    montar: montar, ligar: ligar, desenhar: desenhar, cartaEl: cartaEl, versoEl: versoEl,
    ativa: function () { return !!jogo; }, minhaVez: minhaVez,
    get refs() { return refs; },
    set selecionada(v) { selecionada = v; },
    temaDaCarta: temaDaCarta
  };
})(window.CR = window.CR || {});
