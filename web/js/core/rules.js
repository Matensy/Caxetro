/* Caxeta Royale — Rules Engine
 * Validacao de trincas, sequencias, batidas (9 e 10), mao batida e "na boa".
 */
(function (CR) {
  'use strict';
  var D = CR.deck;

  /* ---------------------------------------------------------------- utils */

  function countWilds(cards, round) {
    var n = 0;
    for (var i = 0; i < cards.length; i++) if (D.isWild(cards[i], round)) n++;
    return n;
  }

  function wildLimit(round) {
    return (round && round.wildLimit) || 1;
  }

  /* --------------------------------------------------------------- trinca */
  /**
   * Trinca: 3+ cartas do mesmo valor, naipes diferentes.
   * 4a/5a carta so entra se o naipe ja estiver presente (dobrada).
   * Maximo de curingas: round.wildLimit (1 por padrao).
   */
  function isTrinca(cards, round) {
    var n = cards.length;
    if (n < 3 || n > 5) return false;

    var naturals = [], wilds = 0, i;
    for (i = 0; i < n; i++) {
      if (D.isWild(cards[i], round)) wilds++; else naturals.push(cards[i]);
    }
    if (wilds > wildLimit(round)) return false;
    if (naturals.length === 0) return false;           // so curinga: proibido

    var rank = naturals[0].rank;
    var suits = {}, distinct = 0;
    for (i = 0; i < naturals.length; i++) {
      if (naturals[i].rank !== rank) {
        // Carta Selvagem conta como qualquer naipe, mas nao como qualquer valor
        return false;
      }
      if (!suits[naturals[i].suit]) { suits[naturals[i].suit] = 1; distinct++; }
      else suits[naturals[i].suit]++;
    }

    // Artesao (joker 16) libera 2 cartas do mesmo naipe na base da trinca.
    var needDistinct = round && round.loose3Suits ? 2 : 3;
    if (distinct + wilds < needDistinct) return false;

    // Nenhum naipe pode aparecer mais de 2x (1 original + 1 dobrada).
    for (var s in suits) if (suits[s] > 2) return false;
    return true;
  }

  /* ------------------------------------------------------------ sequencia */
  /**
   * Sequencia: 3+ cartas do mesmo naipe em ordem.
   * As vale 1 (A-2-3) ou 14 (Q-K-A). K-A-2 invalido.
   */
  function isSequencia(cards, round) {
    var n = cards.length;
    if (n < 3) return false;

    var naturals = [], wilds = 0, i;
    for (i = 0; i < n; i++) {
      if (D.isWild(cards[i], round)) wilds++; else naturals.push(cards[i]);
    }
    if (wilds > wildLimit(round)) return false;
    if (naturals.length === 0) return false;

    // Todas do mesmo naipe (Carta Selvagem: edition 'selvagem' aceita qualquer).
    var suit = -1;
    for (i = 0; i < naturals.length; i++) {
      if (naturals[i].edition === 'selvagem') continue;
      if (suit === -1) suit = naturals[i].suit;
      else if (naturals[i].suit !== suit) return false;
    }

    // Ases podem valer 1 ou 14: testa cada combinacao.
    var aces = [], fixed = [];
    for (i = 0; i < naturals.length; i++) {
      if (naturals[i].rank === 1) aces.push(i); else fixed.push(naturals[i].rank);
    }
    if (aces.length > 2) return false; // 3 ases nunca formam sequencia

    var variants = 1 << aces.length;
    for (var v = 0; v < variants; v++) {
      var ranks = fixed.slice();
      for (i = 0; i < aces.length; i++) ranks.push((v >> i) & 1 ? 14 : 1);
      if (fitsWindow(ranks, n, wilds)) return true;
    }
    return false;
  }

  /** Existe janela de n valores consecutivos que contenha todos os ranks, sem repetir? */
  function fitsWindow(ranks, n, wilds) {
    if (ranks.length + wilds !== n) return false;
    var seen = {}, min = 99, max = 0;
    for (var i = 0; i < ranks.length; i++) {
      if (seen[ranks[i]]) return false;                 // valor repetido
      seen[ranks[i]] = 1;
      if (ranks[i] < min) min = ranks[i];
      if (ranks[i] > max) max = ranks[i];
    }
    if (max - min + 1 > n) return false;
    // A janela [start, start+n-1] precisa conter [min,max] e caber em 1..14.
    var lo = Math.max(1, max - n + 1);
    var hi = Math.min(min, 14 - n + 1);
    return lo <= hi;
  }

  function isCombo(cards, round) {
    return isTrinca(cards, round) || isSequencia(cards, round);
  }

  function comboKind(cards, round) {
    if (isTrinca(cards, round)) return 'trinca';
    if (isSequencia(cards, round)) return 'sequencia';
    return null;
  }

  /* ---- Enumeracao por bitmask: rapida o bastante pra rodar a cada turno ---- */

  function subsets(n, k, cb) {
    var idx = [], i;
    if (k > n) return false;
    for (i = 0; i < k; i++) idx.push(i);
    while (true) {
      var mask = 0;
      for (i = 0; i < k; i++) mask |= 1 << idx[i];
      if (cb(mask, idx)) return true;
      var j = k - 1;
      while (j >= 0 && idx[j] === n - k + j) j--;
      if (j < 0) return false;
      idx[j]++;
      for (i = j + 1; i < k; i++) idx[i] = idx[i - 1] + 1;
    }
  }

  function pickMask(cards, mask) {
    var out = [];
    for (var i = 0; i < cards.length; i++) if (mask & (1 << i)) out.push(cards[i]);
    return out;
  }

  /** Todas as combinacoes validas de tamanho k dentro da mao. */
  function meldsOfSize(cards, k, round) {
    var out = [];
    subsets(cards.length, k, function (mask) {
      var g = pickMask(cards, mask);
      if (isCombo(g, round)) out.push({ mask: mask, cards: g });
      return false;
    });
    return out;
  }

  /**
   * Procura 3 combinacoes cobrindo a mao inteira.
   * 9 cartas = 3+3+3, 10 = 4+3+3. Com o pergaminho Mao Grande a mao cresce,
   * entao as particoes possiveis sao geradas conforme o tamanho.
   */
  function findMelds(cards, round) {
    var n = cards.length;
    if (n < 9 || n > 13) return null;
    var full = (1 << n) - 1;
    var cache = {};
    function melds(k) {
      if (!cache[k]) cache[k] = meldsOfSize(cards, k, round);
      return cache[k];
    }
    if (melds(3).length < 2 && n < 12) return null;

    for (var s1 = n - 6; s1 >= 3; s1--) {
      var A = melds(s1);
      if (!A.length) continue;
      for (var s2 = Math.min(s1, n - s1 - 3); s2 >= 3; s2--) {
        var s3 = n - s1 - s2;
        if (s3 < 3 || s3 > s2) continue;
        var B = melds(s2), C = melds(s3);
        if (!B.length || !C.length) continue;
        for (var i = 0; i < A.length; i++) {
          for (var j = 0; j < B.length; j++) {
            if (A[i].mask & B[j].mask) continue;
            var rest = full & ~(A[i].mask | B[j].mask);
            for (var k = 0; k < C.length; k++) {
              if (C[k].mask === rest) return [A[i].cards, B[j].cards, C[k].cards];
            }
          }
        }
      }
    }
    return null;
  }

  function canBater9(hand, round) {
    if (hand.length !== 9) return null;
    return findMelds(hand, round);
  }

  function canBater10(hand, round) {
    if (hand.length !== 10) return null;
    return findMelds(hand, round);
  }

  function evaluateBater(hand, round) {
    var melds = findMelds(hand, round);
    if (!melds) return null;
    var big = melds.some(function (m) { return m.length >= 4; });
    return {
      melds: melds,
      kind: hand.length === 10 ? 'dez' : 'nove',
      ponta: big,
      kinds: melds.map(function (m) { return comboKind(m, round); })
    };
  }

  /* -------------------------------------------------------------- na boa */

  /** Cartas que completam o grupo parcial formando uma combinacao valida. */
  function completionsOf(partial, round, out) {
    for (var r = 1; r <= 13; r++) {
      for (var su = 0; su < 4; su++) {
        var kk = D.key(r, su);
        if (out[kk]) continue;
        var probe = D.makeCard(r, su, 0);
        if (isCombo(partial.concat([probe]), round)) out[kk] = true;
      }
    }
  }

  /**
   * Cartas que fariam o jogador bater no proximo turno.
   *
   * Tanto o 3+3+3 (compra e descarta) quanto o 4+3+3 exigem que duas das tres
   * combinacoes venham so de cartas que ja estao na mao. Entao basta enumerar
   * pares de combinacoes de 3 e testar o que completa o que sobrou.
   */
  function computeNeeds(hand, round) {
    var keys = {}, list = [], count = 0;
    var n = hand.length;
    if (n < 9 || n > 12) return { keys: keys, list: list, count: 0 };

    var full = (1 << n) - 1, cache = {};
    function melds(k) {
      if (!cache[k]) cache[k] = meldsOfSize(hand, k, round);
      return cache[k];
    }

    for (var a = 3; a <= n - 5; a++) {
      var A = melds(a);
      for (var b = 3; b <= n - a - 2; b++) {
        var B = melds(b);
        for (var i = 0; i < A.length; i++) {
          for (var j = 0; j < B.length; j++) {
            if (A[i].mask & B[j].mask) continue;
            if (a === b && B[j].mask < A[i].mask) continue;
            var L = pickMask(hand, full & ~(A[i].mask | B[j].mask));
            if (L.length >= 2) completionsOf(L, round, keys);           // sem descartar
            if (L.length >= 3) {                                        // compra e descarta 1
              for (var d = 0; d < L.length; d++) {
                var P = L.slice(); P.splice(d, 1);
                completionsOf(P, round, keys);
              }
            }
          }
        }
      }
    }
    for (var kk in keys) {
      count++;
      list.push({ rank: Math.floor(kk / 4), suit: kk % 4 });
    }
    return { keys: keys, list: list, count: count };
  }

  function needsServes(needs, card) {
    return !!(needs && needs.keys && needs.keys[D.key(card.rank, card.suit)]);
  }

  /** Quao perto a mao esta de bater — usado pela IA e pelo medidor da HUD. */
  function handHeat(hand, round) {
    var best = 0, i, j, k;
    for (i = 0; i < hand.length; i++)
      for (j = i + 1; j < hand.length; j++)
        for (k = j + 1; k < hand.length; k++) {
          var g = [hand[i], hand[j], hand[k]];
          if (isCombo(g, round)) best++;
        }
    return best;
  }

  /** Flush total: todas as cartas da batida do mesmo naipe. */
  function isFlushBater(melds, round) {
    var suit = -1;
    for (var i = 0; i < melds.length; i++)
      for (var j = 0; j < melds[i].length; j++) {
        var c = melds[i][j];
        if (D.isWild(c, round)) continue;
        if (suit === -1) suit = c.suit;
        else if (c.suit !== suit) return false;
      }
    return suit !== -1;
  }

  function usedWilds(melds, round) {
    var n = 0;
    for (var i = 0; i < melds.length; i++) n += countWilds(melds[i], round);
    return n;
  }

  CR.rules = {
    isTrinca: isTrinca, isSequencia: isSequencia, isCombo: isCombo, comboKind: comboKind,
    findMelds: findMelds, canBater9: canBater9, canBater10: canBater10, meldsOfSize: meldsOfSize,
    evaluateBater: evaluateBater, computeNeeds: computeNeeds, needsServes: needsServes,
    handHeat: handHeat, isFlushBater: isFlushBater, usedWilds: usedWilds,
    countWilds: countWilds, subsets: subsets, completionsOf: completionsOf
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
