/* Caxeta Royale — 60 Coringas Especiais (slots separados, efeito persistente).
 * Cada um declara `mods` (modificadores numericos) e/ou `on` (eventos).
 */
(function (CR) {
  'use strict';
  var fx = CR.fx, D = CR.deck;

  var N = 0;
  function J(id, name, rarity, type, price, text, art, impl) {
    var def = Object.assign({
      id: id, num: ++N, name: name, rarity: rarity, type: type,
      price: price, text: text, art: art
    }, impl || {});
    return fx.register('joker', def);
  }

  function isFigure(c) { return c.rank >= 11; }
  function rivals(ctx) {
    return ctx.game.alivePlayers().filter(function (p) { return p !== ctx.owner && p !== ctx.player; });
  }
  function pick(game, arr) { return arr[Math.floor(game.rand() * arr.length)]; }

  /* ============================== COMUNS (25) ============================ */

  J('olho-gato', 'Olho de Gato', 'comum', 'ofensivo', 90,
    'Ao bater, os adversarios perdem 1 vida a mais.', 'eye',
    { mods: { penaltyOut: function (c, v) { return v + 1; } } });

  J('mao-ouro', 'Mao de Ouro', 'comum', 'manipulacao', 120,
    'No seu primeiro turno da rodada voce compra 2 cartas.', 'hand',
    { mods: { extraDraws: function (c, v) { return c.turn === 1 ? v + 1 : v; } } });

  J('pe-coelho', 'Pe de Coelho', 'comum', 'sorte', 80,
    'Mais 10% de chance de tirar curinga do maco.', 'clover',
    { mods: { wildDrawChance: function (c, v) { return v + 0.10; } } });

  J('bolso-fundo', 'Bolso Fundo', 'comum', 'economico', 100,
    'Ganha 10 fichas a cada rodada jogada, mesmo perdendo.', 'coin',
    { mods: { roundChips: function (c, v) { return v + 10; } } });

  J('escudo-papel', 'Escudo de Papel', 'comum', 'defensivo', 110,
    'Uma vez por partida, voce nao perde vida quando alguem bate.', 'shield',
    { mods: { penaltyIn: function (c, v) { return c.player.once('escudo-papel') ? 0 : v; } } });

  J('dedo-rapido', 'Dedo Rapido', 'comum', 'manipulacao', 140,
    'Uma vez por rodada voce compra uma carta a mais no turno.', 'bolt',
    { mods: { extraDraws: function (c, v) { return v + 1; } } });

  J('isca', 'Isca', 'comum', 'informacao', 70,
    'Voce enxerga a segunda carta da lixeira.', 'hook',
    { mods: { peekTrash: function (c, v) { return Math.max(v, 2); } } });

  J('cara-pau', 'Cara de Pau', 'comum', 'ofensivo', 130,
    'O primeiro blefe de cada rodada nao queima.', 'mask',
    { mods: { burnImmune: function (c, v) { return c.player.onceRound('cara-pau') ? true : v; } } });

  J('moedeiro', 'Moedeiro', 'comum', 'economico', 90,
    'Cada figura que voce descarta rende 5 fichas.', 'purse',
    { on: { afterDiscard: function (c) { if (isFigure(c.card)) c.game.award(c.owner, 5, 'moedeiro'); } } });

  J('casco-duro', 'Casco Duro', 'comum', 'defensivo', 120,
    'Com 3 vidas ou mais, voce perde 1 vida a menos por batida.', 'turtle',
    { mods: { penaltyIn: function (c, v) { return c.player.lives >= 3 ? Math.max(0, v - 1) : v; } } });

  J('catador', 'Catador', 'comum', 'manipulacao', 110,
    'Voce pode comprar a segunda carta da lixeira, nao so a do topo.', 'claw',
    { mods: { trashDepth: function (c, v) { return Math.max(v, 2); }, peekTrash: function (c, v) { return Math.max(v, 2); } } });

  J('apressado', 'Apressado', 'comum', 'ofensivo', 100,
    'Bateu nas tres primeiras voltas? Os adversarios perdem 1 vida a mais.', 'rabbit',
    { mods: { penaltyOut: function (c, v) {
      var voltas = c.game.round.turnCount / Math.max(1, c.game.alivePlayers().length);
      return voltas <= 3 ? v + 1 : v; } } });

  J('reserva', 'Reserva', 'comum', 'defensivo', 150,
    'Voce comeca a partida com 1 vida extra.', 'heart',
    { mods: { startLives: function (c, v) { return v + 1; } } });

  J('trevo', 'Trevo', 'comum', 'sorte', 100,
    'Uma vez por rodada voce devolve a carta comprada do maco e tira outra.', 'clover2',
    { mods: { mulligan: function (c, v) { return true; } } });

  J('faro', 'Faro', 'comum', 'informacao', 90,
    'No inicio da rodada voce ve o valor de uma carta de cada adversario.', 'nose',
    { on: { roundStart: function (c) {
      rivals(c).forEach(function (r) {
        if (!r.hand.length) return;
        var card = pick(c.game, r.hand);
        r.revealed.push({ to: c.owner.idx, cardId: card.id, mode: 'rank' });
      });
    } } });

  J('artesao', 'Artesao', 'comum', 'manipulacao', 150,
    'Suas trincas aceitam duas cartas do mesmo naipe na base.', 'anvil',
    { mods: { loose3Suits: function (c, v) { return true; } } });

  J('comerciante', 'Comerciante', 'comum', 'economico', 130,
    'Tudo na lojinha sai 10% mais barato.', 'tag',
    { mods: { shopDiscount: function (c, v) { return v + 0.10; } } });

  J('acumulador', 'Acumulador', 'comum', 'economico', 110,
    'Quando alguem bate, cada carta que sobrou na sua mao vale 2 fichas.', 'stack',
    { on: { onLose: function (c) { c.game.award(c.owner, c.owner.hand.length * 2, 'acumulador'); } } });

  J('persistente', 'Persistente', 'comum', 'defensivo', 150,
    'Ao ser eliminado voce volta com 1 vida. Uma vez por partida.', 'phoenix-s',
    { mods: { revive: function (c, v) { return c.player.once('persistente') ? Math.max(v, 1) : v; } } });

  J('curioso', 'Curioso', 'comum', 'sorte', 80,
    'Ao comprar da lixeira voce espia a proxima carta do maco.', 'peek',
    { mods: { peekDeckOnTrash: function (c, v) { return true; } } });

  J('contador', 'Contador', 'comum', 'informacao', 60,
    'Mostra quantas cartas cada adversario tem na mao.', 'abacus',
    { mods: { showCounts: function (c, v) { return true; } } });

  J('velocista', 'Velocista', 'comum', 'ofensivo', 140,
    'Bater com 9 cartas vale como bater com 10.', 'wing',
    { mods: { penaltyOut: function (c, v) { return c.kind === 'nove' ? v + 1 : v; },
              chipsGain: function (c, v) { return c.kind === 'nove' ? v + 25 : v; } } });

  J('reciclador', 'Reciclador', 'comum', 'economico', 120,
    'Uma vez por rodada voce recupera a carta que voce mesmo descartou.', 'recycle',
    { mods: { ownDiscard: function (c, v) { return true; } } });

  J('sorriso-falso', 'Sorriso Falso', 'comum', 'manipulacao', 130,
    'Ninguem descobre se o seu "ta na boa" e blefe.', 'smile',
    { mods: { hideNaBoa: function (c, v) { return true; } } });

  J('colecionador', 'Colecionador', 'comum', 'economico', 120,
    'Bater com tres trincas rende 15 fichas extras.', 'gem',
    { on: { onBeat: function (c) {
      if (c.kinds && c.kinds.every(function (k) { return k === 'trinca'; })) c.chips += 15;
    } } });

  /* ============================= INCOMUNS (18) =========================== */

  J('baralho-marcado', 'Baralho Marcado', 'incomum', 'informacao', 260,
    'Uma carta da mao de cada adversario fica visivel para voce a rodada inteira.', 'mark',
    { on: { roundStart: function (c) {
      rivals(c).forEach(function (r) {
        if (!r.hand.length) return;
        var card = pick(c.game, r.hand);
        r.revealed.push({ to: c.owner.idx, cardId: card.id, mode: 'full' });
      });
    } } });

  J('embaralha-tudo', 'Embaralha Tudo', 'incomum', 'manipulacao', 300,
    'A cada tres turnos voce troca uma carta da mao pelo topo do maco, de graca.', 'swirl',
    { on: { turnStart: function (c) {
      var n = c.owner.bump('embaralha');
      if (n % 3 !== 0 || !c.owner.hand.length) return;
      var out = pick(c.game, c.owner.hand);
      var inc = c.game.draw();
      if (!inc) return;
      c.owner.removeCard(out.id);
      c.game.round.maco.unshift(out);
      c.owner.hand.push(inc);
      c.owner.needs = null;
      c.game.fire('powerFlash', { player: c.owner, power: 'embaralha-tudo' });
    } } });

  J('sorte-grande', 'Sorte Grande', 'incomum', 'sorte', 280,
    'Mais 15% de chance de tirar curinga do maco.', 'dice',
    { mods: { wildDrawChance: function (c, v) { return v + 0.15; } } });

  J('ladrao-sorte', 'Ladrao de Sorte', 'incomum', 'ofensivo', 320,
    'Quem declara "ta na boa" perde o direito de furar a fila ate a proxima vez dele.', 'steal',
    { on: { onNaBoa: function (c) {
      if (c.declarer === c.owner) return;
      c.declarer.blockedUntilTurn = c.game.round.turnCount + c.game.alivePlayers().length;
      c.game.fire('powerFlash', { player: c.owner, power: 'ladrao-sorte' });
    } } });

  J('muralha', 'Muralha', 'incomum', 'defensivo', 380,
    'Nenhuma batida tira mais de 1 vida sua.', 'wall',
    { mods: { penaltyIn: function (c, v) { return Math.min(v, 1); } } });

  J('espiao', 'Espiao', 'incomum', 'informacao', 240,
    'Voce ve toda a lixeira, inclusive as cartas enterradas.', 'spy',
    { mods: { seeAllDiscards: function (c, v) { return true; } } });

  J('alquimista', 'Alquimista', 'incomum', 'manipulacao', 340,
    'Uma vez por rodada voce troca o naipe de uma carta da mao.', 'flask',
    { mods: { suitSwap: function (c, v) { return v + 1; } } });

  J('seguro-vida', 'Seguro de Vida', 'incomum', 'defensivo', 360,
    'Ao cair para 1 vida voce ganha 2 de volta. Uma vez por partida.', 'cross',
    { on: { onPenalty: function (c) {
      if (c.owner.lives === 1 && c.owner.once('seguro-vida')) {
        c.game.applyLives(c.owner, 2, { reason: 'seguro' });
        c.game.fire('powerFlash', { player: c.owner, power: 'seguro-vida' });
      }
    } } });

  J('investidor', 'Investidor', 'incomum', 'economico', 300,
    'A cada cinco rodadas voce recebe 50 fichas de juros.', 'bank',
    { on: { roundEnd: function (c) {
      if (c.owner.bump('juros') % 5 === 0) c.game.award(c.owner, 50, 'juros');
    } } });

  J('sabotador', 'Sabotador', 'incomum', 'ofensivo', 340,
    'Uma vez por partida voce obriga um adversario a descartar uma carta extra.', 'bomb',
    { mods: { sabotage: function (c, v) { return c.player.flags['sabotador'] ? v : v + 1; } } });

  J('dono-mesa', 'Dono da Mesa', 'incomum', 'manipulacao', 280,
    'Voce escolhe o sentido do jogo no comeco da rodada.', 'compass',
    { on: { roundStart: function (c) { c.owner.canChooseDir = true; } } });

  J('duplicador', 'Duplicador', 'incomum', 'economico', 380,
    'Uma vez por partida voce duplica uma Carta de Bencao que tenha em maos.', 'copy',
    { on: { roundStart: function (c) {
      if (!c.owner.blessings.length) return;
      if (!c.owner.once('duplicador')) return;
      if (c.owner.blessings.length >= c.game.blessingSlots(c.owner)) return;
      c.owner.blessings.push(c.owner.blessings[0]);
      c.game.fire('powerFlash', { player: c.owner, power: 'duplicador' });
    } } });

  J('presagio', 'Presagio', 'incomum', 'informacao', 320,
    'Voce ve as tres primeiras cartas do maco no inicio da rodada.', 'crystal',
    { mods: { peekDeck: function (c, v) { return Math.max(v, 3); } } });

  J('cobrador', 'Cobrador', 'incomum', 'ofensivo', 260,
    'Quem queima ao furar a fila perde 1 vida.', 'whip',
    { on: { onBurn: function (c) {
      if (c.burned === c.owner) return;
      c.game.applyLives(c.burned, -1, { reason: 'cobrador', by: c.owner });
    } } });

  J('ima', 'Ima', 'incomum', 'manipulacao', 400,
    'Se a carta do topo da lixeira fecha uma combinacao sua, voce pega de graca.', 'magnet',
    { mods: { magnet: function (c, v) { return true; } } });

  J('armadilha', 'Armadilha', 'incomum', 'ofensivo', 240,
    'Adversario que fura a fila e bate nao leva ficha nenhuma.', 'trap',
    { mods: { rivalChips: function (c, v) { return c.furou ? 0 : v; } } });

  J('banqueiro', 'Banqueiro', 'incomum', 'economico', 360,
    'Suas fichas dobram na rodada em que alguem e eliminado.', 'vault',
    { mods: { chipsGain: function (c, v) { return (c.killed && c.killed.length) ? v * 2 : v; } } });

  J('trocador', 'Trocador', 'incomum', 'ofensivo', 320,
    'Uma vez por rodada voce troca uma carta sua por uma carta aleatoria de um adversario.', 'shuffle',
    { mods: { swapRival: function (c, v) { return v + 1; } } });

  /* =============================== RAROS (12) ============================ */

  J('mestre-vira', 'Mestre da Vira', 'raro', 'sorte', 640,
    'A carta duas posicoes acima da Vira tambem vira curinga.', 'crown-v',
    { on: { roundStart: function (c) {
      var v = c.game.round.vira;
      var r = v.rank + 2; if (r > 13) r -= 13;
      c.game.round.extraWilds.push({ rank: r, red: v.red });
    } } });

  J('olho-furacao', 'Olho do Furacao', 'raro', 'defensivo', 580,
    'Declarou "ta na boa"? Voce nao queima pelo resto da rodada.', 'storm',
    { mods: { burnImmune: function (c, v) { return c.player.naBoa ? true : v; } } });

  J('trickster', 'Trickster', 'raro', 'manipulacao', 700,
    'Seus blefes nunca queimam.', 'joker-t',
    { mods: { burnImmune: function (c, v) { return true; } } });

  J('mao-fantasma', 'Mao Fantasma', 'raro', 'manipulacao', 680,
    'Voce guarda uma carta fora da mao; ela nao conta no limite.', 'ghost',
    { mods: { stashSlots: function (c, v) { return v + 1; } } });

  J('executor', 'Executor', 'raro', 'ofensivo', 780,
    'Bater com 10 cartas custa 3 vidas aos adversarios.', 'axe',
    { mods: { penaltyOut: function (c, v) { return c.kind === 'dez' ? v + 1 : v; } } });

  J('curandeiro', 'Curandeiro', 'raro', 'defensivo', 620,
    'Toda vez que voce bate, recupera 1 vida.', 'leaf-h',
    { on: { onBeat: function (c) { c.game.applyLives(c.owner, 1, { reason: 'curandeiro' }); } } });

  J('magnata', 'Magnata', 'raro', 'economico', 560,
    'Voce comeca a partida com 200 fichas.', 'topcoin',
    { mods: { startChips: function (c, v) { return v + 200; } } });

  J('vidente', 'Vidente', 'raro', 'informacao', 720,
    'Voce ve a mao inteira de um adversario durante a rodada.', 'eye3',
    { on: { roundStart: function (c) {
      var rr = rivals(c);
      if (!rr.length) return;
      var target = rr.reduce(function (a, b) { return b.lives > a.lives ? b : a; });
      target.hand.forEach(function (card) { target.revealed.push({ to: c.owner.idx, cardId: card.id, mode: 'full' }); });
    } } });

  J('caos', 'Caos', 'raro', 'ofensivo', 660,
    'A Vira muda sozinha durante a rodada e os curingas mudam com ela.', 'chaos',
    { on: { turnStart: function (c) {
      if (c.owner.bump('caos') % 5 !== 0) return;
      var nova = c.game.draw();
      if (!nova) return;
      c.game.round.vira = nova;
      c.game.round.wild = D.wildOf(nova);
      c.game.players.forEach(function (p) { p.needs = null; });
      c.game.log('Caos: a Vira virou ' + D.cardName(nova) + '.', 'power');
      c.game.fire('viraChanged', { vira: nova });
    } } });

  J('parasita', 'Parasita', 'raro', 'ofensivo', 740,
    'Se voce esta na boa quando alguem bate, rouba 1 vida de quem bateu.', 'leech',
    { on: { onPenalty: function (c) {
      if (!c.owner.naBoa || !c.attacker) return;
      c.game.applyLives(c.attacker, -1, { reason: 'parasita', by: c.owner });
      c.game.applyLives(c.owner, 1, { reason: 'parasita' });
    } } });

  J('forja', 'Forja', 'raro', 'manipulacao', 800,
    'Voce pode usar dois curingas na mesma combinacao.', 'forge',
    { mods: { wildLimit: function (c, v) { return Math.max(v, 2); } } });

  J('oraculo', 'Oraculo', 'raro', 'informacao', 600,
    'Voce ve qual sera a Vira antes da distribuicao.', 'oracle',
    { mods: { seeVira: function (c, v) { return true; } } });

  /* ============================ LENDARIOS (5) ============================ */

  J('rei-mesa', 'Rei da Mesa', 'lendario', 'lendario', 2400,
    'Bater com 10 cartas todas do mesmo naipe elimina a mesa inteira.', 'crown-k',
    { drawback: 'Voce comeca com 2 vidas a menos.',
      mods: { startLives: function (c, v) { return v - 2; } },
      on: { onBeat: function (c) {
        if (c.kind !== 'dez' || !c.flush) return;
        c.game.log('Rei da Mesa: a mesa inteira cai.', 'power');
        c.extraOut += 99;
      } } });

  J('espelho-negro', 'Espelho Negro', 'lendario', 'lendario', 2200,
    'Copia o coringa mais forte do adversario com mais vidas.', 'mirror',
    { drawback: 'Voce perde 1 ficha a cada turno jogado.',
      on: {
        roundStart: function (c) {
          var rr = rivals(c);
          if (!rr.length) return;
          var alvo = rr.reduce(function (a, b) { return b.lives > a.lives ? b : a; });
          var best = null, ordem = { comum: 1, incomum: 2, raro: 3, lendario: 4 };
          alvo.jokers.forEach(function (id) {
            var d = fx.get('joker', id);
            if (!d || d.id === 'espelho-negro') return;
            if (!best || ordem[d.rarity] > ordem[best.rarity]) best = d;
          });
          c.owner.mirrored = best ? best.id : null;
          if (best && c.owner.jokers.indexOf(best.id) === -1) {
            c.owner.jokers.push(best.id);
            c.owner.mirroredAdded = best.id;
            c.game.fire('powerFlash', { player: c.owner, power: 'espelho-negro' });
          }
        },
        turnStart: function (c) { c.owner.chips = Math.max(0, c.owner.chips - 1); },
        roundEnd: function (c) {
          if (c.owner.mirroredAdded) {
            var i = c.owner.jokers.indexOf(c.owner.mirroredAdded);
            if (i !== -1) c.owner.jokers.splice(i, 1);
            c.owner.mirroredAdded = null;
          }
        }
      } });

  J('fenix', 'Fenix', 'lendario', 'lendario', 2500,
    'Ao ser eliminado voce ressurge com 3 vidas e mao nova.', 'phoenix',
    { drawback: 'Ocupa todos os seus slots: e o unico coringa que voce carrega.',
      mods: { revive: function (c, v) { return c.player.once('fenix') ? Math.max(v, 3) : v; },
              jokerSlots: function (c, v) { return 1; } } });

  J('midas', 'Midas', 'lendario', 'lendario', 1800,
    'Toda carta que voce compra ganha Selo Dourado.', 'midas',
    { drawback: 'Os adversarios comecam com 1 vida a mais.',
      on: { afterDraw: function (c) { if (!c.card.seal) c.card.seal = 'dourado'; },
            gameStart: function (c) {
              c.game.players.forEach(function (p) { if (p !== c.owner) p.midasBonus = 1; });
            } },
      mods: { startLives: function (c, v) { return c.player.midasBonus ? v + 1 : v; } } });

  J('coringa-supremo', 'Coringa Supremo', 'lendario', 'lendario', 2500,
    'Qualquer carta da sua mao pode fazer papel de curinga.', 'supreme',
    { drawback: 'Voce joga com 5 vidas fixas, ignorando a configuracao.',
      mods: { startLives: function (c, v) { return 5 - c.game.cfg.lives; } },
      on: {
        turnStart: function (c) { c.owner.hand.forEach(function (card) { card.forcedWild = true; }); },
        afterDiscard: function (c) { c.card.forcedWild = false; },
        roundEnd: function (c) { c.owner.hand.forEach(function (card) { card.forcedWild = false; }); }
      } });

  CR.jokers = { list: function () { return fx.all('joker'); } };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
