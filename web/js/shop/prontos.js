/* Caxeta Royale — Baralhos Prontos.
 * Combinacoes ja montadas, com o resumo do que fazem. Serve pra quem acabou de
 * chegar nao ter que escolher entre 60 coringas sem saber o que eles fazem.
 */
(function (CR) {
  'use strict';

  var PRONTOS = [
    {
      id: 'basico',
      nome: 'O Basico do Bar',
      resumo: 'Uma vida a mais pra voce, uma a menos pros outros, e ficha entrando toda rodada.',
      comoJogar: 'Nao tem segredo: joga a caxeta normal. Os tres coringas trabalham sozinhos, sem voce precisar apertar nada.',
      gratis: true,
      jokers: ['reserva', 'olho-gato', 'bolso-fundo'],
      blessings: ['renascimento'],
      vouchers: [],
      astral: {},
      deck: 'padrao'
    },
    {
      id: 'muralha',
      nome: 'Muralha',
      resumo: 'Ninguem te tira mais de uma vida por rodada. Voce ganha no cansaco.',
      comoJogar: 'Deixe os outros baterem. Enquanto eles perdem vidas entre si, voce so leva um arranhao por rodada e sobra na mesa.',
      jokers: ['muralha', 'casco-duro', 'escudo-papel'],
      blessings: ['protecao'],
      vouchers: ['resistencia'],
      astral: {},
      deck: 'vermelho'
    },
    {
      id: 'cara-de-pau',
      nome: 'Cara de Pau',
      resumo: 'Voce diz que ta na boa a rodada inteira e nunca queima por isso.',
      comoJogar: 'Declare "ta na boa" cedo, mesmo sem estar. A mesa trava de medo de descartar e voce compra o tempo que precisar.',
      jokers: ['trickster', 'sorriso-falso', 'olho-furacao'],
      blessings: ['invisibilidade'],
      vouchers: ['blefe-mestre'],
      astral: {},
      deck: 'blefador'
    },
    {
      id: 'executor',
      nome: 'Executor',
      resumo: 'Bater com 10 cartas derruba tres vidas de todo mundo de uma vez.',
      comoJogar: 'Nao bata com 9 se der pra esperar a ponta. Segure a mao mais um turno e feche com uma combinacao de quatro cartas.',
      jokers: ['executor', 'olho-gato', 'apressado'],
      blessings: ['ascensao'],
      vouchers: [],
      astral: { sol: 1, estrela: 1 },
      deck: 'padrao'
    },
    {
      id: 'contador',
      nome: 'Contador de Cartas',
      resumo: 'Voce joga vendo carta dos outros e as tres primeiras do maco.',
      comoJogar: 'Use o que voce ve pra escolher o descarte. Se um adversario ta na boa, segure o que ele precisa e jogue o que ele ja tem.',
      jokers: ['baralho-marcado', 'espiao', 'presagio'],
      blessings: ['olho-verdade'],
      vouchers: ['olho-vivo'],
      astral: {},
      deck: 'azul'
    },
    {
      id: 'caixa-dois',
      nome: 'Caixa Dois',
      resumo: 'Voce sai da partida com o dobro de fichas, ganhando ou perdendo.',
      comoJogar: 'Deck pra farmar. Jogue tranquilo, descarte figura sempre que puder e volte pra lojinha com o bolso cheio.',
      jokers: ['magnata', 'moedeiro', 'acumulador'],
      blessings: ['caca-tesouro'],
      vouchers: ['cofre'],
      astral: {},
      deck: 'dourado'
    }
  ];

  /** Itens do baralho pronto que o jogador ainda nao tem, com o preco de cada um. */
  function faltando(pronto) {
    var s = CR.save.dados, itens = [];
    pronto.jokers.forEach(function (id) {
      if (s.jokers.indexOf(id) === -1) {
        var d = CR.fx.get('joker', id);
        if (d) itens.push({ tipo: 'joker', id: id, nome: d.name, preco: d.price });
      }
    });
    pronto.vouchers.forEach(function (id) {
      if (s.vouchers.indexOf(id) === -1 && s.vouchers.indexOf(id + '+') === -1) {
        var v = CR.fx.get('voucher', id);
        if (v) itens.push({ tipo: 'voucher', id: id, nome: v.name, preco: v.price });
      }
    });
    pronto.blessings.forEach(function (id) {
      var b = CR.fx.get('blessing', id);
      if (b) itens.push({ tipo: 'blessing', id: id, nome: b.name, preco: b.price });
    });
    Object.keys(pronto.astral).forEach(function (id) {
      if ((s.astral[id] || 0) < pronto.astral[id]) {
        var a = CR.fx.get('astral', id);
        if (a) itens.push({ tipo: 'astral', id: id, nome: a.name, preco: a.price });
      }
    });
    if (pronto.deck && s.decks.indexOf(pronto.deck) === -1) {
      var dk = CR.store.DECKS.filter(function (d) { return d.id === pronto.deck; })[0];
      if (dk && dk.preco) itens.push({ tipo: 'deck', id: dk.id, nome: 'Deck ' + dk.nome, preco: dk.preco });
    }
    return itens;
  }

  /** Comprar tudo junto sai 25% mais barato que item a item. */
  function preco(pronto) {
    if (pronto.gratis) return 0;
    var bruto = faltando(pronto).reduce(function (t, i) { return t + i.preco; }, 0);
    return bruto ? CR.store.preco(Math.round(bruto * 0.75)) : 0;
  }

  function completo(pronto) { return faltando(pronto).length === 0; }

  function emUso(pronto) {
    var s = CR.save.dados;
    if (s.loadout.length !== pronto.jokers.length) return false;
    return pronto.jokers.every(function (id) { return s.loadout.indexOf(id) !== -1; });
  }

  /** Compra o que falta e ja equipa tudo. */
  function adotar(pronto) {
    var s = CR.save.dados;
    var custo = preco(pronto);
    if (custo > 0) {
      if (!CR.store.comprar(Math.round(custo / (1 - CR.store.desconto())))) return false;
    }
    pronto.jokers.forEach(function (id) { if (s.jokers.indexOf(id) === -1) s.jokers.push(id); });
    pronto.vouchers.forEach(function (id) {
      if (s.vouchers.indexOf(id) === -1 && s.vouchers.indexOf(id + '+') === -1) s.vouchers.push(id);
    });
    pronto.blessings.forEach(function (id) { s.blessings.push(id); });
    Object.keys(pronto.astral).forEach(function (id) {
      s.astral[id] = Math.max(s.astral[id] || 0, pronto.astral[id]);
    });
    if (pronto.deck) {
      if (s.decks.indexOf(pronto.deck) === -1) s.decks.push(pronto.deck);
      s.deck = pronto.deck;
    }
    s.loadout = pronto.jokers.slice(0, CR.store.slotsDeCoringa());
    s.pronto = pronto.id;
    CR.save.salvar();
    return true;
  }

  CR.prontos = {
    lista: PRONTOS, faltando: faltando, preco: preco,
    completo: completo, emUso: emUso, adotar: adotar,
    get: function (id) { return PRONTOS.filter(function (p) { return p.id === id; })[0]; }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
