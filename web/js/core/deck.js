/* Caxeta Royale — Deck Engine
 * 2 baralhos de 52 = 104 cartas. Sem jokers fisicos: o curinga nasce da Vira.
 */
(function (CR) {
  'use strict';

  // 0 ouros, 1 copas (vermelhos) | 2 paus, 3 espadas (pretos)
  var SUITS = ['ouros', 'copas', 'paus', 'espadas'];
  var SUIT_CHAR = ['♦', '♥', '♣', '♠'];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function isRed(suit) { return suit < 2; }
  function rankLabel(rank) { return RANKS[rank - 1]; }
  function suitChar(suit) { return SUIT_CHAR[suit]; }

  var uid = 0;
  function makeCard(rank, suit, copy) {
    return {
      id: 'c' + (++uid),
      rank: rank,            // 1..13 (A=1, K=13)
      suit: suit,            // 0..3
      copy: copy || 0,       // qual dos 2 baralhos
      red: isRed(suit),
      seal: null,            // id do selo aplicado
      edition: null,         // id da melhoria aplicada
      ghost: false           // carta temporaria (Espelho, Metamorfose)
    };
  }

  /** Baralho completo: 2 x 52 cartas. */
  function buildDeck(opts) {
    opts = opts || {};
    var decks = opts.decks || 2;
    var out = [];
    for (var d = 0; d < decks; d++) {
      for (var s = 0; s < 4; s++) {
        for (var r = 1; r <= 13; r++) out.push(makeCard(r, s, d));
      }
    }
    return out;
  }

  /** Mulberry32: PRNG deterministico para partidas reproduziveis (seed/replay). */
  function rng(seed) {
    var a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(cards, rand) {
    rand = rand || Math.random;
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    return cards;
  }

  /**
   * Curinga da rodada: carta de valor imediatamente superior a Vira, mesma cor.
   * K vira A. Retorna {rank, red}.
   */
  function wildOf(vira) {
    if (!vira) return null;
    return { rank: vira.rank === 13 ? 1 : vira.rank + 1, red: vira.red };
  }

  function sameWild(card, wild) {
    return !!wild && !!card && card.rank === wild.rank && card.red === wild.red;
  }

  /** Curingas extras (Mestre da Vira, Caos, Metamorfose) entram como lista. */
  function isWild(card, round) {
    if (!card || !round) return false;
    if (card.forcedWild) return true;
    if (sameWild(card, round.wild)) return true;
    var extra = round.extraWilds;
    if (extra) for (var i = 0; i < extra.length; i++) if (sameWild(card, extra[i])) return true;
    return false;
  }

  function cardName(card) {
    return rankLabel(card.rank) + suitChar(card.suit);
  }

  /** Assinatura de valor/naipe, ignorando de qual baralho veio. */
  function key(rank, suit) { return rank * 4 + suit; }

  CR.deck = {
    SUITS: SUITS, RANKS: RANKS, SUIT_CHAR: SUIT_CHAR,
    makeCard: makeCard, buildDeck: buildDeck, shuffle: shuffle, rng: rng,
    wildOf: wildOf, isWild: isWild, sameWild: sameWild,
    isRed: isRed, rankLabel: rankLabel, suitChar: suitChar,
    cardName: cardName, key: key
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
