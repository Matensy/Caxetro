/* Simulacao completa: partidas so de bots, para achar travamentos e desbalanceamento. */
['core/deck','core/rules','core/player','powers/effects','powers/jokers','powers/blessings',
 'powers/astral','powers/seals','powers/vouchers','core/game','ai/bot'].forEach(function (m) {
  require('../web/js/' + m + '.js');
});

var levels = ['iniciante', 'normal', 'dificil'];
var jokerIds = CR.fx.all('joker').map(function (j) { return j.id; });
var blessIds = CR.fx.all('blessing').map(function (b) { return b.id; });
var voucherIds = CR.fx.all('voucher').map(function (v) { return v.id; });

var GAMES = parseInt(process.argv[2] || '60', 10);
var wins = {}, kinds = {}, totalRounds = 0, errors = 0, stalls = 0, maxTurns = 0;
var t0 = Date.now();

for (var g = 0; g < GAMES; g++) {
  var n = 2 + (g % 4);
  var seats = [];
  for (var i = 0; i < n; i++) {
    seats.push({
      name: 'Bot' + i, isBot: true, botLevel: levels[(g + i) % 3],
      jokers: [jokerIds[(g * 7 + i * 13) % jokerIds.length], jokerIds[(g * 3 + i * 5 + 17) % jokerIds.length]],
      blessings: [blessIds[(g + i) % blessIds.length]],
      vouchers: [voucherIds[(g * 2 + i) % voucherIds.length]],
      astral: {}
    });
  }
  var game = new CR.Game({
    seats: seats, mode: ['campeonato', 'cachetao', 'campeonato', 'rapida'][g % 4],
    lives: [5, 7, 10][g % 3], seed: 1000 + g
  });
  game.on('bater', function (d) { kinds[d.kind] = (kinds[d.kind] || 0) + 1; });

  try {
    game.start();
    var guard = 0;
    while (game.state !== 'gameOver' && guard++ < 6000) {
      if (game.state === 'fold') {
        game.alivePlayers().forEach(function (p) {
          if (game.state !== 'fold') return;
          if (CR.bot.decideFold(game, p)) game.fold(p.idx); else game.play(p.idx);
        });
        continue;
      }
      if (game.state === 'roundEnd') { game.nextRound(); continue; }
      if (game.state !== 'turn') break;
      var p = game.current();
      if (!p || !p.alive) { game.advance(); continue; }
      var before = game.phase + ':' + game.round.turnCount;
      CR.bot.step(game, p);
      if (game.state === 'turn' && before === game.phase + ':' + game.round.turnCount && game.phase === 'buy') {
        stalls++; break;
      }
    }
    if (guard >= 6000) stalls++;
    if (guard > maxTurns) maxTurns = guard;
    totalRounds += game.roundNo;
    var champ = game.champion;
    if (champ) {
      champ.jokers.forEach(function (id) { wins[id] = (wins[id] || 0) + 1; });
    }
  } catch (e) {
    errors++;
    console.log('ERRO no jogo ' + g + ': ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n'));
  }
}

console.log('\npartidas: ' + GAMES + ' | rodadas: ' + totalRounds +
  ' | media ' + (totalRounds / GAMES).toFixed(1) + ' rodadas/partida');
console.log('tipos de batida:', kinds);
console.log('erros: ' + errors + ' | travamentos: ' + stalls + ' | passos max: ' + maxTurns);
console.log('tempo: ' + (Date.now() - t0) + 'ms');
var top = Object.keys(wins).sort(function (a, b) { return wins[b] - wins[a]; }).slice(0, 8);
console.log('coringas mais vitoriosos:', top.map(function (k) { return k + '(' + wins[k] + ')'; }).join(', '));
process.exit(errors || stalls ? 1 : 0);
