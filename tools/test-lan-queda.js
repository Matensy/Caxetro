/* Um jogador fecha o celular no meio da partida: a cadeira dele vira bot e a
 * mesa continua, em vez de travar esperando pra sempre. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:8080';
const erros = [];

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const ctxB = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const dono = await ctxA.newPage();
  const amigo = await ctxB.newPage();
  dono.on('pageerror', e => erros.push('dono: ' + e.message));
  amigo.on('pageerror', e => erros.push('amigo: ' + e.message));

  for (const p of [dono, amigo]) {
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    await p.evaluate(() => { CR.bot.thinkTime = () => 30; });
  }

  await dono.evaluate(() => { CR.save.dados.nome = 'Dono'; CR.app.ir('sala'); });
  await dono.waitForSelector('.sala-cartao');
  await dono.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[0].click());
  await dono.waitForSelector('.sala-codigo .codigo');
  const codigo = await dono.textContent('.sala-codigo .codigo');

  await amigo.evaluate(() => { CR.save.dados.nome = 'Some'; CR.app.ir('sala'); });
  await amigo.waitForSelector('.codigo-campo');
  await amigo.fill('.codigo-campo', codigo);
  await amigo.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[1].click());
  await dono.waitForTimeout(800);

  await dono.evaluate(() => [...document.querySelectorAll('.lobby-pe button')].find(x => x.textContent === 'Comecar').click());
  await dono.waitForSelector('#tela-mesa[data-ativa]');
  await amigo.waitForSelector('#tela-mesa[data-ativa]');
  await dono.waitForTimeout(700);
  console.log('mesa aberta com dois humanos');

  // O amigo fecha o navegador no meio da partida.
  await ctxB.close();
  console.log('o amigo fechou o aparelho');

  // O dono deve assumir a cadeira com um bot e a mesa deve continuar andando.
  let virouBot = false;
  for (let i = 0; i < 40; i++) {
    await dono.waitForTimeout(500);
    virouBot = await dono.evaluate(() => {
      const j = CR.app.jogo;
      return !!j && j.players.some(p => p.saiu && p.isBot);
    });
    if (virouBot) break;
  }
  if (!virouBot) throw new Error('a cadeira de quem saiu nao virou bot');
  console.log('a cadeira virou bot');

  const antes = await dono.evaluate(() => CR.app.jogo.round.turnCount);
  // O dono joga a vez dele pra mesa destravar e o bot seguir sozinho.
  for (let i = 0; i < 60; i++) {
    await dono.evaluate(() => {
      const j = CR.app.jogo;
      if (!j || j.state !== 'turn' || !CR.hud.minhaVez()) return;
      const o = document.querySelector('.sobrepor');
      if (o) { (o.querySelector('.sim') || o.querySelector('.botoes button')).click(); return; }
      if (j.phase === 'buy') {
        const c = document.querySelector('.pilha-col .carta-clicavel:not([disabled])');
        if (c) c.click();
      } else {
        const cartas = [...document.querySelectorAll('.mao .carta')].filter(c => !c.hasAttribute('data-travada'));
        if (cartas.length) { cartas[0].click(); cartas[0].click(); }
      }
    });
    await dono.waitForTimeout(150);
    const fim = await dono.evaluate(() => !!document.querySelector('#tela-fim[data-ativa]'));
    if (fim) break;
  }
  const depois = await dono.evaluate(() => {
    const j = CR.app.jogo;
    return j ? j.round.turnCount + j.roundNo * 1000 : 999999;
  });
  console.log('voltas antes da queda:', antes, '| marcador depois:', depois);
  if (depois <= antes) throw new Error('a mesa travou depois que o jogador saiu');

  await browser.close();
  if (erros.length) {
    console.log('\nERROS:'); [...new Set(erros)].forEach(e => console.log(' -', e));
    process.exit(1);
  }
  console.log('\na mesa seguiu sem quem saiu.');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
