/* Cruza o computeNeeds rapido com uma forca bruta ingenua em maos aleatorias. */
require('../web/js/core/deck.js'); require('../web/js/core/rules.js');
var D = CR.deck, R = CR.rules;

function bruteNeeds(hand, round) {
  var keys = {};
  for (var r = 1; r <= 13; r++) for (var s = 0; s < 4; s++) {
    var probe = D.makeCard(r, s, 0);
    var ten = hand.concat([probe]);
    var ok = !!R.findMelds(ten, round);
    for (var i = 0; i < ten.length && !ok; i++) {
      if (ten[i] === probe) continue;
      var nine = ten.slice(); nine.splice(i, 1);
      if (R.findMelds(nine, round)) ok = true;
    }
    if (ok) keys[D.key(r, s)] = true;
  }
  return keys;
}

var rand = D.rng(4242), diffs = 0, hands = 0, withNeeds = 0;
for (var t = 0; t < 4000; t++) {
  var deck = D.shuffle(D.buildDeck(), rand);
  var vira = deck.pop();
  var round = { vira: vira, wild: D.wildOf(vira), extraWilds: [], wildLimit: 1 };
  var hand = deck.slice(0, 9);
  // Metade dos testes usa maos "plantadas" pra ter combinacoes de verdade.
  if (t % 2 === 0) {
    hand = [D.makeCard(7,0,0), D.makeCard(7,1,0), D.makeCard(7,2,0),
            D.makeCard(2,3,0), D.makeCard(3,3,0), D.makeCard(4,3,0),
            deck[20], deck[21], deck[22]];
  }
  hands++;
  var fast = R.computeNeeds(hand, round).keys;
  var slow = bruteNeeds(hand, round);
  var all = {}; Object.keys(fast).forEach(k => all[k]=1); Object.keys(slow).forEach(k => all[k]=1);
  var bad = Object.keys(all).filter(k => !!fast[k] !== !!slow[k]);
  if (Object.keys(slow).length) withNeeds++;
  if (bad.length) {
    diffs++;
    if (diffs <= 3) console.log('divergencia', hand.map(D.cardName).join(' '), 'vira', D.cardName(vira), bad);
  }
}
console.log(hands + ' maos testadas, ' + withNeeds + ' com batida a 1 carta, ' + diffs + ' divergencias');
process.exit(diffs ? 1 : 0);
