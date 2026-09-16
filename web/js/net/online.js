/* Caxeta Royale — partida na rede local.
 *
 * Quem abre a sala e o dono: roda o CR.Game de verdade, toca os bots e manda
 * pra cada convidado um retrato da mesa sem a mao dos outros. Quem entra so
 * desenha o retrato e devolve jogadas.
 */
(function (CR) {
  'use strict';

  var modo = null;            // 'dono' | 'convidado'
  var jogo = null;            // CR.Game (dono) ou CR.Espelho (convidado)
  var assentos = [];          // idx -> peerId (null quando e bot)
  var peerDoIdx = {};
  var idxDoPeer = {};
  var meuIdx = 0;
  var envioAgendado = null;
  var furoPendente = null;    // peer que estamos esperando responder
  var board = 'botequim';

  function sou(papel) { return modo === papel; }

  /* =============================================================== dono */

  function abrirComoDono(cfg, jogadores, tabuleiro) {
    modo = 'dono';
    board = tabuleiro || CR.save.dados.board;
    assentos = jogadores.map(function (j) { return j.peer || null; });
    peerDoIdx = {}; idxDoPeer = {};
    assentos.forEach(function (peer, i) {
      if (!peer) return;
      peerDoIdx[i] = peer;
      idxDoPeer[peer] = i;
    });
    meuIdx = assentos.indexOf(CR.lan.sessao.peer);
    if (meuIdx < 0) meuIdx = 0;

    jogo = CR.criarPartida(cfg, jogadores, board);
    jogo.online = true;
    jogo.euIdx = meuIdx;
    ligarEspelhamento();
    return jogo;
  }

  /** Todo evento do motor vira um retrato novo pra mesa inteira. */
  function ligarEspelhamento() {
    jogo.on('*', function (e) {
      if (e.type === 'log') return;
      espalharEvento(e.type, e.data);
      agendarRetrato();
    });
  }

  var EVENTOS_PRA_MESA = {
    bater: 1, burn: 1, chips: 1, lives: 1, eliminated: 1, naBoa: 1, draw: 1,
    discard: 1, powerFlash: 1, blessingUsed: 1, roundStart: 1, roundEnd: 1,
    gameOver: 1, stalemate: 1, intercept: 1, reshuffle: 1, viraChanged: 1,
    skipTurn: 1, revive: 1, mulligan: 1
  };

  function espalharEvento(tipo, dados) {
    if (!EVENTOS_PRA_MESA[tipo]) return;
    CR.lan.enviar('evento', {
      tipo: tipo,
      jogador: dados && dados.player ? dados.player.idx : null,
      vencedor: dados && dados.winner ? dados.winner.idx : null,
      kind: dados && dados.kind, base: dados && dados.base,
      flush: dados && dados.flush, furou: dados && dados.furou,
      immune: dados && dados.immune
    });
  }

  function agendarRetrato() {
    if (envioAgendado) return;
    envioAgendado = setTimeout(function () {
      envioAgendado = null;
      mandarRetratos();
    }, 30);
  }

  function mandarRetratos() {
    if (!sou('dono') || !jogo) return;
    Object.keys(peerDoIdx).forEach(function (idx) {
      var peer = peerDoIdx[idx];
      if (peer === CR.lan.sessao.peer) return;
      CR.lan.enviar('estado', CR.retrato.retratar(jogo, +idx, board), peer);
    });
  }

  /* --------------------------------------------- jogadas dos convidados */

  function receberAcao(dados, de) {
    if (!sou('dono') || !jogo || !dados) return;
    var idx = idxDoPeer[de];
    if (idx === undefined) return;
    var p = jogo.players[idx];
    if (!p || !p.alive) return;

    // Furar a fila e resposta a uma pergunta, nao depende da vez.
    if (dados.acao === 'furar') {
      if (furoPendente !== de) return;
      furoPendente = null;
      jogo.answerIntercept(idx, !!dados.sim);
      CR.app.tocar();
      return;
    }
    if (dados.acao === 'fold') { jogo.fold(idx); CR.app.seguirFold(); return; }
    if (dados.acao === 'jogar') { jogo.play(idx); CR.app.seguirFold(); return; }

    if (jogo.turnIdx !== idx || jogo.state !== 'turn') return;

    switch (dados.acao) {
      case 'comprar': jogo.drawFrom(dados.fonte === 'lixeira' ? 'lixeira' : 'maco'); break;
      case 'descartar':
        if (jogo.discard(dados.id)) CR.app.tocar();
        break;
      case 'bater': jogo.bater(idx); break;
      case 'naboa': jogo.declareNaBoa(idx); break;
      case 'mulligan': jogo.mulligan(idx); break;
      case 'guardar': jogo.stashCard(idx, dados.id); break;
      case 'desguardar': jogo.unstash(idx); break;
      case 'naipe': jogo.swapSuit(idx, dados.id, dados.suit); break;
      case 'bencao': aplicarBencaoRemota(p, dados); break;
      default: return;
    }
    agendarRetrato();
    CR.hud.desenhar();
  }

  function aplicarBencaoRemota(p, dados) {
    var sel = dados.sel || {};
    var escolha = {};
    if (sel.cardId) escolha.card = p.hand.filter(function (c) { return c.id === sel.cardId; })[0];
    if (sel.cardIds) {
      escolha.cards = sel.cardIds.map(function (id) {
        return p.hand.filter(function (c) { return c.id === id; })[0];
      }).filter(Boolean);
    }
    if (sel.suit !== null && sel.suit !== undefined) escolha.suit = sel.suit;
    if (sel.rivalIdx !== null && sel.rivalIdx !== undefined) escolha.rival = jogo.players[sel.rivalIdx];
    CR.blessings.apply(jogo, p, dados.id, escolha);
  }

  /** Pergunta de furar a fila endereçada a quem esta em outro aparelho. */
  function perguntarFuroRemoto(d) {
    var peer = peerDoIdx[d.player.idx];
    if (!peer || peer === CR.lan.sessao.peer) return false;
    furoPendente = peer;
    CR.lan.enviar('pergunta-furo', { carta: CR.retrato.porCarta(d.card) }, peer);
    CR.ui.aviso('Esperando ' + d.player.name + ' decidir se fura a fila.', 'info');
    return true;
  }

  function ehRemoto(idx) {
    var peer = peerDoIdx[idx];
    return !!peer && peer !== CR.lan.sessao.peer;
  }

  /* ========================================================= convidado */

  function abrirComoConvidado(tabuleiro) {
    modo = 'convidado';
    board = tabuleiro || 'botequim';
    jogo = new CR.Espelho(function (acao) { CR.lan.enviar('acao', acao); });
    return jogo;
  }

  function receberEstado(snap) {
    if (!sou('convidado') || !jogo) return;
    if (!jogo.aplicar(snap)) return;
    if (snap.board && snap.board !== board) {
      board = snap.board;
      CR.hud.ligar(jogo, board);
      return;
    }
    if (!CR.hud.ativa()) CR.hud.ligar(jogo, board);
    else CR.hud.desenhar();
    if (jogo.state === 'gameOver') CR.app.fimOnline(jogo);
  }

  function receberEvento(e) {
    if (!e) return;
    if (e.tipo === 'bater') {
      CR.sfx.tocarBatida();
      CR.fxcanvas.estourar(CR.save.dados.equipado.bater);
      CR.app.cartaz(e.kind === 'maoBatida' ? 'MAO BATIDA' : e.kind === 'dez' ? 'BATEU COM 10' : 'BATEU');
    } else if (e.tipo === 'lives') CR.sfx.tocar('vida');
    else if (e.tipo === 'burn') { if (!e.immune) CR.sfx.tocar('queima'); }
    else if (e.tipo === 'chips') CR.sfx.tocar('ficha');
    else if (e.tipo === 'naBoa') CR.sfx.tocar('naboa');
    else if (e.tipo === 'draw' || e.tipo === 'discard') CR.sfx.tocar('carta');
    else if (e.tipo === 'eliminated') CR.sfx.tocar('elimina');
    else if (e.tipo === 'powerFlash' || e.tipo === 'blessingUsed') CR.sfx.tocar('poder');
  }

  /* ------------------------------------------------------------- comum */

  function ligarOuvintes() {
    CR.lan.on('acao', receberAcao);
    CR.lan.on('estado', receberEstado);
    CR.lan.on('evento', receberEvento);
    CR.lan.on('pergunta-furo', function (d) {
      if (!sou('convidado') || !jogo) return;
      CR.app.perguntarFuroLocal({
        player: jogo.euSou(),
        card: CR.retrato.deCarta(d.carta)
      });
    });
    CR.lan.on('sala-fechada', function () {
      if (!modo) return;
      CR.ui.aviso('O dono fechou a sala.', 'ruim');
      encerrar();
      CR.app.ir('menu');
    });
  }

  function encerrar() {
    modo = null; jogo = null; furoPendente = null;
    assentos = []; peerDoIdx = {}; idxDoPeer = {};
    if (envioAgendado) { clearTimeout(envioAgendado); envioAgendado = null; }
  }

  CR.online = {
    abrirComoDono: abrirComoDono, abrirComoConvidado: abrirComoConvidado,
    ligarOuvintes: ligarOuvintes, encerrar: encerrar,
    mandarRetratos: mandarRetratos, agendarRetrato: agendarRetrato,
    perguntarFuroRemoto: perguntarFuroRemoto, ehRemoto: ehRemoto,
    get modo() { return modo; },
    get ativo() { return !!modo; },
    get jogo() { return jogo; },
    get meuIdx() { return modo === 'convidado' ? (jogo ? jogo.euIdx : 0) : meuIdx; },
    get board() { return board; }
  };
})(window.CR = window.CR || {});
