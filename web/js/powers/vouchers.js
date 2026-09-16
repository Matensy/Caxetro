/* Caxeta Royale — 16 Pergaminhos (vouchers passivos da sessao), cada um com versao avancada.
 * Um pergaminho avancado e armazenado como "id+" no inventario.
 */
(function (CR) {
  'use strict';
  var fx = CR.fx;
  var N = 0;
  function V(id, name, price, text, upName, upText, upPrice, art, impl) {
    return fx.register('voucher', Object.assign({
      id: id, num: ++N, name: name, price: price, text: text,
      up: { name: upName, text: upText, price: upPrice }, art: art
    }, impl || {}));
  }

  V('bolso-extra', 'Bolso Extra', 200, 'Mais um slot de Bencao.',
    'Bolso Duplo', 'Mais dois slots de Bencao.', 450, 'pocket',
    { mods: { blessingSlots: function (c, v) { return v + (c.upgraded ? 2 : 1); } } });

  V('mao-grande', 'Mao Grande', 320, 'Voce recebe 10 cartas na distribuicao.',
    'Mao Gigante', 'Voce recebe 11 cartas.', 700, 'bighand',
    { mods: { handSize: function (c, v) { return c.upgraded ? 11 : 10; } } });

  V('mercador', 'Mercador', 280, 'Tudo na lojinha sai 20% mais barato.',
    'Mercado Negro', 'Tudo na lojinha sai 35% mais barato.', 620, 'merchant',
    { mods: { shopDiscount: function (c, v) { return v + (c.upgraded ? 0.35 : 0.20); } } });

  V('olho-vivo', 'Olho Vivo', 160, 'Voce ve a segunda carta da lixeira.',
    'Raio-X', 'Voce ve as tres primeiras da lixeira.', 380, 'xray',
    { mods: { peekTrash: function (c, v) { return Math.max(v, c.upgraded ? 3 : 2); } } });

  V('maco-infinito', 'Maco Infinito', 180, 'Lixeira reembaralha como maco novo quando acaba.',
    'Maco Eterno', 'A lixeira reembaralha duas vezes antes de acabar de vez.', 400, 'infinity',
    { mods: { reshuffles: function (c, v) { return c.upgraded ? 2 : 1; } } });

  V('blefe-mestre', 'Blefe Mestre', 300, 'Pifar nunca queima.',
    'Blefe Supremo', 'Pifar nunca queima e ainda rende 10 fichas.', 650, 'bluff',
    { mods: { burnImmune: function (c, v) { return true; } },
      on: { onBurn: function (c) { if (c.upgraded && c.burned === c.owner) c.game.award(c.owner, 10, 'blefe'); } } });

  V('sortudo', 'Sortudo', 220, 'Mais 5% de chance de tirar curinga.',
    'Abencoado', 'Mais 15% de chance de tirar curinga.', 500, 'luck',
    { mods: { wildDrawChance: function (c, v) { return v + (c.upgraded ? 0.15 : 0.05); } } });

  V('corrida', 'Corrida', 240, 'Voce comeca jogando.',
    'Sprint', 'Voce comeca jogando e compra duas cartas no primeiro turno.', 540, 'run',
    { mods: { firstSeat: function (c, v) { return true; },
              extraDraws: function (c, v) { return (c.upgraded && c.turn === 1) ? v + 1 : v; } } });

  V('cofre', 'Cofre', 120, 'Mais 50 fichas no inicio da sessao.',
    'Tesouro', 'Mais 150 fichas no inicio da sessao.', 300, 'safe',
    { mods: { startChips: function (c, v) { return v + (c.upgraded ? 150 : 50); } } });

  V('resistencia', 'Resistencia', 360, 'Toda batida contra voce tira 1 vida a menos.',
    'Fortaleza', 'Tira 1 vida a menos e ainda rende 5 fichas de consolacao.', 780, 'guard',
    { mods: { penaltyIn: function (c, v) { return Math.max(0, v - 1); } },
      on: { onPenalty: function (c) { if (c.upgraded) c.game.award(c.owner, 5, 'fortaleza'); } } });

  V('coletor', 'Coletor', 260, 'Mais 20% de chance de dropar Bencoes e Astrais.',
    'Coletor Mestre', 'Mais 40% e drop garantido a cada tres batidas.', 580, 'net',
    { mods: { dropChance: function (c, v) { return v + (c.upgraded ? 0.40 : 0.20); } } });

  V('barreira', 'Barreira', 420, 'Uma vez por sessao, anula uma batida inteira.',
    'Barreira Dupla', 'Duas vezes por sessao.', 900, 'barrier',
    { mods: { penaltyIn: function (c, v) {
      var max = c.upgraded ? 2 : 1;
      var used = c.player.counters['barreira'] || 0;
      if (used >= max || v <= 0) return v;
      c.player.bump('barreira');
      c.game.log('Barreira segurou a batida de ' + (c.attacker ? c.attacker.name : '?') + '.', 'power');
      return 0;
    } } });

  V('telescopio', 'Telescopio', 200, 'Voce ve a Vira antes da distribuicao.',
    'Observatorio', 'Ve a Vira e ainda troca uma carta da mao antes de comecar.', 460, 'scope',
    { mods: { seeVira: function (c, v) { return true; },
              mulligan: function (c, v) { return c.upgraded ? true : v; } } });

  V('recuperacao', 'Recuperacao', 340, 'Sobreviveu a rodada? Recupera 1 vida.',
    'Regeneracao', 'Recupera 1 vida a cada duas rodadas sobrevividas.', 720, 'heal',
    { on: { roundEnd: function (c) {
      if (!c.owner.alive) return;
      var n = c.owner.bump('recuperacao');
      if (!c.upgraded || n % 2 === 0) c.game.applyLives(c.owner, 1, { reason: 'recuperacao' });
    } } });

  V('foco', 'Foco', 480, 'Mais um slot de Coringa Especial.',
    'Hiperfoco', 'Mais dois slots de Coringa Especial.', 980, 'focus',
    { mods: { jokerSlots: function (c, v) { return v + (c.upgraded ? 2 : 1); } } });

  V('rede-seguranca', 'Rede de Seguranca', 380, 'Caiu para 1 vida? Ganha uma Bencao de graca.',
    'Rede Dupla', 'Ganha duas Bencoes e uma Astral.', 820, 'safetynet',
    { on: { onPenalty: function (c) {
      if (c.owner.lives !== 1 || !c.owner.once('rede-seguranca')) return;
      var pool = fx.all('blessing'), g = c.game;
      var n = c.upgraded ? 2 : 1;
      for (var i = 0; i < n; i++) {
        if (c.owner.blessings.length >= g.blessingSlots(c.owner)) break;
        c.owner.blessings.push(pool[Math.floor(g.rand() * pool.length)].id);
      }
      if (c.upgraded) {
        var ap = fx.all('astral');
        CR.astral.apply(g, c.owner, ap[Math.floor(g.rand() * ap.length)].id);
      }
      g.fire('powerFlash', { player: c.owner, power: 'rede-seguranca' });
    } } });

  CR.vouchers = { list: function () { return fx.all('voucher'); } };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
