/* Sai da sala e abre outra: os ouvintes tem que continuar de pe. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctxA = await b.newContext({ viewport: { width: 960, height: 540 } });
  const ctxB = await b.newContext({ viewport: { width: 960, height: 540 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  const erros = [];
  A.on('pageerror', e => erros.push('A: ' + e.message));
  B.on('pageerror', e => erros.push('B: ' + e.message));
  for (const p of [A, B]) {
    await p.goto(process.env.BASE || 'http://localhost:8080', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    await p.evaluate(() => { CR.bot.thinkTime = () => 30; });
  }

  async function montarSala(rodada) {
    await A.evaluate(() => CR.app.ir('sala'));
    await A.waitForSelector('.sala-cartao');
    await A.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[0].click());
    await A.waitForSelector('.sala-codigo .codigo');
    const codigo = await A.textContent('.sala-codigo .codigo');
    await B.evaluate(() => CR.app.ir('sala'));
    await B.waitForSelector('.codigo-campo');
    await B.fill('.codigo-campo', codigo);
    await B.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[1].click());
    await A.waitForTimeout(800);
    const n = await A.evaluate(() => CR.lan.sala.length);
    console.log('rodada ' + rodada + ': sala ' + codigo + ' com ' + n + ' jogadores');
    if (n !== 2) throw new Error('rodada ' + rodada + ': a sala nao juntou os dois');
    await A.evaluate(() => [...document.querySelectorAll('.lobby-pe button')].find(x => x.textContent === 'Comecar').click());
    await A.waitForSelector('#tela-mesa[data-ativa]');
    await B.waitForSelector('#tela-mesa[data-ativa]');
    await B.waitForTimeout(1000);
    const maoB = await B.evaluate(() => {
      const j = CR.app.jogo;
      return j && j.players[CR.online.meuIdx] ? j.players[CR.online.meuIdx].hand.filter(c => c.rank).length : 0;
    });
    console.log('rodada ' + rodada + ': o convidado recebeu ' + maoB + ' cartas');
    if (maoB !== 9) throw new Error('rodada ' + rodada + ': o convidado nao recebeu a mao');
  }

  await montarSala(1);

  // Todo mundo sai e monta de novo.
  for (const p of [B, A]) {
    await p.evaluate(() => { CR.online.encerrar(); CR.lan.sair(); CR.app.ir('menu'); });
    await p.waitForTimeout(400);
  }
  await A.waitForTimeout(600);
  await montarSala(2);

  await b.close();
  if (erros.length) { console.log('ERROS:'); [...new Set(erros)].forEach(e => console.log(' -', e)); process.exit(1); }
  console.log('\nsegunda sala funcionou igual a primeira.');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
