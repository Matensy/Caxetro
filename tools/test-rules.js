/* Testes do motor de regras — node tools/test-rules.js */
require('../web/js/core/deck.js');
require('../web/js/core/rules.js');
var D = CR.deck, R = CR.rules;
var OUROS = 0, COPAS = 1, PAUS = 2, ESPADAS = 3;
var pass = 0, fail = 0;
function c(rank, suit) { return D.makeCard(rank, suit, 0); }
function round(viraRank, viraSuit, extra) {
  var vira = c(viraRank, viraSuit);
  var r = { vira: vira, wild: D.wildOf(vira), wildLimit: 1 };
  if (extra) for (var k in extra) r[k] = extra[k];
  return r;
}
function ok(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log('  FALHOU: ' + name + ' -> ' + got + ' (esperado ' + want + ')'); }
}

var rd = round(8, PAUS); // curinga = 9 preto (9♣ e 9♠)
console.log('curinga:', rd.wild);

// --- curinga
ok('9♣ e curinga', D.isWild(c(9, PAUS), rd), true);
ok('9♠ e curinga', D.isWild(c(9, ESPADAS), rd), true);
ok('9♥ nao e curinga', D.isWild(c(9, COPAS), rd), false);
var rdK = round(13, COPAS);
ok('vira K♥ -> curinga A vermelho', D.isWild(c(1, OUROS), rdK), true);

// --- trincas
ok('trinca 3 naipes', R.isTrinca([c(5,COPAS),c(5,PAUS),c(5,OUROS)], rd), true);
ok('trinca 2 naipes iguais invalida', R.isTrinca([c(5,COPAS),c(5,COPAS),c(5,PAUS)], rd), false);
ok('trinca com curinga', R.isTrinca([c(5,COPAS),c(5,PAUS),c(9,ESPADAS)], rd), true);
ok('trinca so curinga invalida', R.isTrinca([c(9,PAUS),c(9,ESPADAS),c(9,PAUS)], rd), false);
ok('trinca dobrada 4', R.isTrinca([c(5,COPAS),c(5,PAUS),c(5,OUROS),c(5,OUROS)], rd), true);
ok('trinca dobrada 5', R.isTrinca([c(5,COPAS),c(5,PAUS),c(5,OUROS),c(5,OUROS),c(5,PAUS)], rd), true);
ok('trinca triplicando naipe invalida', R.isTrinca([c(5,OUROS),c(5,OUROS),c(5,OUROS),c(5,PAUS),c(5,COPAS)], rd), false);
ok('trinca valores diferentes', R.isTrinca([c(5,COPAS),c(6,PAUS),c(5,OUROS)], rd), false);
ok('2 curingas acima do limite', R.isTrinca([c(5,COPAS),c(9,PAUS),c(9,ESPADAS)], rd), false);
var rd2 = round(8, PAUS, { wildLimit: 2 });
ok('2 curingas com Forja', R.isTrinca([c(5,COPAS),c(9,PAUS),c(9,ESPADAS)], rd2), true);

// --- sequencias
ok('7-8-9 espadas', R.isSequencia([c(7,ESPADAS),c(8,ESPADAS),c(9,ESPADAS)], round(2,COPAS)), true);
ok('10-J-Q-K copas', R.isSequencia([c(10,COPAS),c(11,COPAS),c(12,COPAS),c(13,COPAS)], round(2,PAUS)), true);
ok('A-2-3 ouros (as baixo)', R.isSequencia([c(1,OUROS),c(2,OUROS),c(3,OUROS)], round(7,PAUS)), true);
ok('Q-K-A paus (as alto)', R.isSequencia([c(12,PAUS),c(13,PAUS),c(1,PAUS)], round(7,COPAS)), true);
ok('K-A-2 invalido', R.isSequencia([c(13,OUROS),c(1,OUROS),c(2,OUROS)], round(7,PAUS)), false);
ok('naipes misturados', R.isSequencia([c(7,ESPADAS),c(8,PAUS),c(9,ESPADAS)], round(2,COPAS)), false);
var rdv = round(2, COPAS); // curinga = 3 vermelho
ok('sequencia com buraco + curinga', R.isSequencia([c(7,ESPADAS),c(9,ESPADAS),c(3,COPAS)], rdv), true);
ok('curinga estendendo a ponta', R.isSequencia([c(6,ESPADAS),c(7,ESPADAS),c(3,OUROS)], rdv), true);
ok('curinga do proprio naipe ainda e curinga', D.isWild(c(3,OUROS), rdv), true);
ok('valores repetidos', R.isSequencia([c(7,ESPADAS),c(7,ESPADAS),c(8,ESPADAS)], round(2,COPAS)), false);
ok('so 2 cartas', R.isSequencia([c(7,ESPADAS),c(8,ESPADAS)], round(2,COPAS)), false);
ok('Q-K-A-2 invalido (da a volta)', R.isSequencia([c(12,PAUS),c(13,PAUS),c(1,PAUS),c(2,PAUS)], round(7,COPAS)), false);

// --- bater com 9
var r9 = round(4, ESPADAS); // curinga = 5 preto
var mao9 = [c(7,COPAS),c(7,PAUS),c(7,OUROS), c(2,OUROS),c(3,OUROS),c(4,OUROS), c(11,PAUS),c(12,PAUS),c(13,PAUS)];
ok('bate com 9 (3 combinacoes)', !!R.canBater9(mao9, r9), true);
var maoRuim = [c(7,COPAS),c(7,PAUS),c(2,OUROS), c(5,COPAS),c(3,OUROS),c(4,COPAS), c(11,PAUS),c(12,OUROS),c(13,ESPADAS)];
ok('mao sem batida', !!R.canBater9(maoRuim, r9), false);

// --- bater com 10 (4+3+3)
var mao10 = [c(7,COPAS),c(7,PAUS),c(7,OUROS),c(7,ESPADAS), c(2,OUROS),c(3,OUROS),c(4,OUROS), c(11,PAUS),c(12,PAUS),c(13,PAUS)];
var ev10 = R.evaluateBater(mao10, r9);
ok('bate com 10', !!ev10, true);
ok('bate com 10 tem ponta', ev10 ? ev10.ponta : false, true);

// --- na boa
var quase = [c(7,COPAS),c(7,PAUS),c(7,OUROS), c(2,OUROS),c(3,OUROS),c(4,OUROS), c(11,PAUS),c(12,PAUS),c(9,COPAS)];
var needs = R.computeNeeds(quase, r9);
ok('na boa: K♣ serve', R.needsServes(needs, c(13,PAUS)), true);
ok('na boa: 10♣ serve', R.needsServes(needs, c(10,PAUS)), true);
ok('na boa: 6♥ nao serve', R.needsServes(needs, c(6,COPAS)), false);
console.log('  cartas que servem:', needs.count);

// --- flush
var flush = [[c(2,OUROS),c(3,OUROS),c(4,OUROS)],[c(6,OUROS),c(7,OUROS),c(8,OUROS)],[c(10,OUROS),c(11,OUROS),c(12,OUROS)]];
ok('flush total', R.isFlushBater(flush, r9), true);

// --- performance
var t0 = Date.now();
for (var i = 0; i < 20; i++) R.computeNeeds(quase, r9);
console.log('  computeNeeds x20: ' + (Date.now()-t0) + 'ms');

console.log('\n' + pass + ' passaram, ' + fail + ' falharam');
process.exit(fail ? 1 : 0);
