/* Caxeta Royale — Organizador de mao.
 * Le a mao e diz, em portugues, o que ja fechou, o que falta uma carta e o que
 * esta sobrando — deixando claro quando o grupo depende do curinga.
 */
(function (CR) {
  'use strict';
  var D = CR.deck, R = CR.rules;

  var CORES = ['#4fd1a5', '#62a8ff', '#ffa45b', '#c08bff'];
  var LETRAS = ['A', 'B', 'C', 'D'];

  function sumSet(cards) {
    var m = 0;
    for (var i = 0; i < cards.length; i++) m |= 1 << cards[i]._i;
    return m;
  }

  function indexar(hand) {
    hand.forEach(function (c, i) { c._i = i; });
  }

  /* ----------------------------------------------------------- rotulos */

  function nomeNaipe(suit) {
    return ['ouros', 'copas', 'paus', 'espadas'][suit];
  }

  function naturais(cards, round) {
    return cards.filter(function (c) { return !D.isWild(c, round); });
  }

  function ordenarSequencia(cards, round) {
    var nat = naturais(cards, round).slice();
    var alto = nat.some(function (x) { return x.rank >= 12; });
    nat.sort(function (a, b) {
      return valorNaSequencia(a, alto) - valorNaSequencia(b, alto);
    });
    return nat;
  }

  function valorNaSequencia(card, asAlto) {
    return card.rank === 1 && asAlto ? 14 : card.rank;
  }

  function rotuloDeValor(v) { return D.rankLabel(v === 14 ? 1 : v); }

  /**
   * Faixas de valores que a sequencia pode ocupar. Com curinga na ponta existe
   * mais de uma — e o rotulo precisa dizer isso, nao inventar uma.
   */
  function janelasDeSequencia(cards, round) {
    var n = cards.length;
    var nat = naturais(cards, round);
    var w = n - nat.length;
    var ases = nat.filter(function (c) { return c.rank === 1; }).length;
    var fixos = nat.filter(function (c) { return c.rank !== 1; }).map(function (c) { return c.rank; });
    var janelas = [];
    for (var v = 0; v < (1 << ases); v++) {
      var ranks = fixos.slice();
      for (var i = 0; i < ases; i++) ranks.push((v >> i) & 1 ? 14 : 1);
      if (!ranks.length) continue;
      var min = Math.min.apply(null, ranks), max = Math.max.apply(null, ranks);
      if (max - min + 1 > n) continue;
      var repetido = ranks.some(function (r, k) { return ranks.indexOf(r) !== k; });
      if (repetido) continue;
      for (var s = Math.max(1, max - n + 1); s <= Math.min(min, 14 - n + 1); s++) {
        var chave = s + '-' + (s + n - 1);
        if (janelas.indexOf(chave) === -1) janelas.push(chave);
      }
    }
    void w;
    return janelas.map(function (k) {
      var p = k.split('-');
      return [+p[0], +p[1]];
    });
  }

  function rotularCompleto(cards, round) {
    var tipo = R.comboKind(cards, round);
    var nat = naturais(cards, round);
    if (tipo === 'trinca') {
      return 'Trinca de ' + D.rankLabel(nat[0].rank) + (cards.length > 3 ? ' com ' + cards.length + ' cartas' : '');
    }
    var ord = ordenarSequencia(cards, round);
    var naipe = ord.length ? nomeNaipe(ord[0].suit) : '';
    var janelas = janelasDeSequencia(cards, round);
    if (janelas.length === 1) {
      return 'Sequencia de ' + naipe + ', ' + rotuloDeValor(janelas[0][0]) + ' ao ' + rotuloDeValor(janelas[0][1]);
    }
    // Curinga na ponta: a sequencia pode cair de dois jeitos.
    var alto = ord.some(function (x) { return x.rank >= 12; });
    var lista = ord.map(function (c) { return rotuloDeValor(valorNaSequencia(c, alto)); }).join(', ');
    return 'Sequencia de ' + naipe + ' com ' + lista + ' e curinga na ponta';
  }

  /** Separa "um curinga" do resto: o curinga fecha quase tudo e poluiria a lista. */
  function separarCuringa(precisa, round) {
    var curinga = false, resto = [];
    precisa.forEach(function (p) {
      if (D.sameWild({ rank: p.rank, red: D.isRed(p.suit) }, round.wild)) { curinga = true; return; }
      var extra = (round.extraWilds || []).some(function (w) {
        return D.sameWild({ rank: p.rank, red: D.isRed(p.suit) }, w);
      });
      if (extra) { curinga = true; return; }
      resto.push(p);
    });
    return { curinga: curinga, resto: resto };
  }

  /** Lista, em texto curto, as cartas que fechariam um grupo parcial. */
  function textoDoQueFalta(precisa, round) {
    var sep = separarCuringa(precisa, round);
    var porRank = {};
    sep.resto.forEach(function (p) { (porRank[p.rank] = porRank[p.rank] || []).push(p.suit); });
    var partes = Object.keys(porRank).map(function (r) {
      var suits = porRank[r];
      // "um 7" le melhor que "7 de ouros, 7 de copas, 7 de paus".
      if (suits.length >= 3) return 'um ' + D.rankLabel(+r);
      return suits.map(function (s) { return D.rankLabel(+r) + D.suitChar(s); }).join(' ou ');
    });
    if (partes.length > 3) partes = partes.slice(0, 3).concat(['mais ' + (partes.length - 3)]);
    if (sep.curinga) partes.push('o curinga');
    return partes.join(' ou ');
  }

  function rotularParcial(cards, round, precisa) {
    var nat = naturais(cards, round);
    var mesmoRank = nat.length >= 2 && nat.every(function (c) { return c.rank === nat[0].rank; });
    var base;
    if (mesmoRank) base = 'Par de ' + D.rankLabel(nat[0].rank);
    else if (nat.length >= 2 && nat.every(function (c) { return c.suit === nat[0].suit; })) {
      var ord = ordenarSequencia(cards, round);
      base = D.rankLabel(ord[0].rank) + ' e ' + D.rankLabel(ord[ord.length - 1].rank) + ' de ' + nomeNaipe(ord[0].suit);
    } else base = nat.map(function (c) { return D.cardName(c); }).join(' e ');
    var falta = textoDoQueFalta(precisa, round);
    return base + (falta ? ' — falta ' + falta : '');
  }

  /* -------------------------------------------------- escolha dos grupos */

  /** Melhor conjunto de ate 3 combinacoes completas e disjuntas. */
  function melhoresCompletos(hand, round) {
    var todos = [];
    for (var k = 3; k <= Math.min(5, hand.length); k++) {
      R.meldsOfSize(hand, k, round).forEach(function (m) {
        todos.push({ cards: m.cards, mask: sumSet(m.cards), curingas: R.countWilds(m.cards, round) });
      });
    }
    if (!todos.length) return [];

    var melhor = { grupos: [], nota: -1 };
    function nota(sel) {
      var cartas = 0, curingas = 0;
      sel.forEach(function (g) { cartas += g.cards.length; curingas += g.curingas; });
      // Prioriza numero de grupos, depois cartas cobertas, e por fim economizar curinga.
      return sel.length * 1000 + cartas * 10 - curingas;
    }
    function busca(inicio, usado, sel) {
      var n = nota(sel);
      if (n > melhor.nota) melhor = { grupos: sel.slice(), nota: n };
      if (sel.length === 3) return;
      for (var i = inicio; i < todos.length; i++) {
        if (todos[i].mask & usado) continue;
        sel.push(todos[i]);
        busca(i + 1, usado | todos[i].mask, sel);
        sel.pop();
      }
    }
    busca(0, 0, []);
    return melhor.grupos;
  }

  /** Grupos parciais: duas cartas que viram combinacao com mais uma. */
  function melhoresParciais(sobra, round, limite) {
    var pares = [];
    for (var i = 0; i < sobra.length; i++) {
      for (var j = i + 1; j < sobra.length; j++) {
        var par = [sobra[i], sobra[j]];
        var chaves = {};
        R.completionsOf(par, round, chaves);
        var precisa = Object.keys(chaves).map(function (k) {
          return { rank: Math.floor(k / 4), suit: k % 4 };
        });
        if (!precisa.length) continue;
        pares.push({
          cards: par, mask: sumSet(par), precisa: precisa,
          curingas: R.countWilds(par, round), forca: precisa.length
        });
      }
    }
    pares.sort(function (a, b) { return b.forca - a.forca; });
    var saida = [], usado = 0;
    for (var p = 0; p < pares.length && saida.length < limite; p++) {
      if (pares[p].mask & usado) continue;
      usado |= pares[p].mask;
      saida.push(pares[p]);
    }
    return saida;
  }

  /* ---------------------------------------------------------- analise */

  function analisar(hand, round) {
    if (!hand || !hand.length || !round) {
      return { grupos: [], ordem: hand || [], fechados: 0, porCarta: {} };
    }
    indexar(hand);

    var completos = melhoresCompletos(hand, round);
    var usado = 0;
    completos.forEach(function (g) { usado |= g.mask; });
    var sobra = hand.filter(function (c) { return !(usado & (1 << c._i)); });
    var parciais = melhoresParciais(sobra, round, Math.max(0, 3 - completos.length));
    var usado2 = usado;
    parciais.forEach(function (g) { usado2 |= g.mask; });
    var soltas = hand.filter(function (c) { return !(usado2 & (1 << c._i)); });

    var grupos = [], porCarta = {};
    completos.forEach(function (g) {
      grupos.push({
        cards: g.cards, completo: true,
        tipo: R.comboKind(g.cards, round),
        curinga: g.curingas > 0,
        rotulo: rotularCompleto(g.cards, round)
      });
    });
    parciais.forEach(function (g) {
      grupos.push({
        cards: g.cards, completo: false,
        tipo: null, curinga: g.curingas > 0, precisa: g.precisa,
        rotulo: rotularParcial(g.cards, round, g.precisa)
      });
    });

    grupos.forEach(function (g, i) {
      g.cor = CORES[i % CORES.length];
      g.letra = LETRAS[i % LETRAS.length];
      g.cards.forEach(function (c) { porCarta[c.id] = i; });
    });

    var ordem = [];
    grupos.forEach(function (g) { ordem = ordem.concat(g.cards); });
    ordem = ordem.concat(soltas);

    return {
      grupos: grupos, soltas: soltas, ordem: ordem, porCarta: porCarta,
      fechados: completos.length,
      curingasNaMao: hand.filter(function (c) { return D.isWild(c, round); }).length
    };
  }

  /** Reordena a mao no lugar, agrupando o que conversa entre si. */
  function organizar(hand, round) {
    var a = analisar(hand, round);
    hand.length = 0;
    a.ordem.forEach(function (c) { hand.push(c); });
    return a;
  }

  CR.organizador = { analisar: analisar, organizar: organizar, CORES: CORES, LETRAS: LETRAS };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
