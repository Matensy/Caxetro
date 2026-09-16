/* Joga a partida de verdade pelo DOM: clica, descarta, espera bot, chega ao fim. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });

  await page.goto(process.env.BASE || 'http://localhost:8080', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  // Bots pensam rapido no teste, senao a partida nao cabe no tempo.
  await page.evaluate(() => { CR.bot.thinkTime = () => 24; });

  // Menu -> lobby -> mesa, tudo por clique
  await page.click('.destino--hero');
  await page.waitForSelector('#tela-lobby[data-ativa]');

  const cenario = process.env.CENARIO || 'padrao';
  if (cenario !== 'padrao') {
    await page.evaluate(c => {
      const cfg = CR.screens.cfg;
      if (c === 'cachetao') { cfg.modo = 'cachetao'; cfg.vidas = 5; }
      if (c === 'hotseat') {
        cfg.cadeiras = [
          { nome: 'Ana', bot: false }, { nome: 'Bruno', bot: false },
          { nome: 'Bot Careca', bot: true, nivel: 'dificil' }
        ];
        cfg.vidas = 5;
      }
      if (c === 'sempoderes') { cfg.coringas = false; cfg.bencoes = false; cfg.pergaminhos = false; cfg.vidas = 5; }
    }, cenario);
  }
  await page.click('.lobby-pe .botao-grande');
  await page.waitForSelector('#tela-mesa[data-ativa]');
  console.log('cenario ' + cenario + ': mesa aberta');

  let jogadas = 0, rodadas = 0;
  const limite = parseInt(process.env.PASSOS || '1500', 10);
  while (jogadas < limite) {
    jogadas++;
    const estado = await page.evaluate(() => {
      const j = CR.app.jogo;
      if (!j) return { fim: true };
      return {
        state: j.state, phase: j.phase, bot: j.current() ? j.current().isBot : true,
        rodada: j.roundNo, mao: j.current() ? j.current().hand.length : 0,
        sobrepor: !!document.querySelector('.sobrepor'),
        passa: !!document.querySelector('#tela-passa[data-ativa]')
      };
    });
    if (estado.fim) { await page.waitForTimeout(1300); break; }  // a tela final entra com atraso
    rodadas = Math.max(rodadas, estado.rodada);

    if (estado.passa) {
      await page.waitForTimeout(3300);  // a tela de passar o aparelho trava 3s de proposito
      await page.evaluate(() => {
        const b = document.querySelector('#tela-passa button:not([disabled])');
        if (b) b.click();
      });
      await page.waitForTimeout(300);
      continue;
    }
    if (estado.sobrepor) {
      // sempre escolhe a opcao afirmativa quando existe
      await page.evaluate(() => {
        const o = document.querySelector('.sobrepor');
        const b = o.querySelector('.sim') || o.querySelector('.botoes button');
        if (b) b.click();
      });
      await page.waitForTimeout(80);
      continue;
    }
    if (estado.bot || estado.state !== 'turn') { await page.waitForTimeout(60); continue; }

    if (estado.phase === 'buy') {
      const podeBater = await page.evaluate(() => !document.querySelector('.acao--bater').disabled);
      if (podeBater) { await page.click('.acao--bater'); await page.waitForTimeout(120); continue; }
      await page.evaluate(() => {
        const b = document.querySelector('.pilha-col .carta-clicavel:not([disabled])');
        if (b) b.click();
      });
      await page.waitForTimeout(40);
    } else if (estado.phase === 'discard') {
      const podeBater = await page.evaluate(() => !document.querySelector('.acao--bater').disabled);
      if (podeBater) { await page.click('.acao--bater'); await page.waitForTimeout(120); continue; }
      // de vez em quando declara na boa
      await page.evaluate(() => {
        const b = document.querySelector('.acao--boa');
        if (b && !b.disabled && Math.random() < 0.25) b.click();
      });
      await page.waitForTimeout(40);
      await page.evaluate(() => {
        const o = document.querySelector('.sobrepor');
        if (o) (o.querySelector('.botoes button') || {}).click?.();
      });
      await page.waitForTimeout(40);
      // A mao e redesenhada entre cliques, entao mira sempre por indice.
      const n = await page.evaluate(() => document.querySelectorAll('.mao .carta').length);
      if (!n) { await page.waitForTimeout(300); continue; }
      const i = Math.floor(Math.random() * n);
      await page.evaluate(k => document.querySelectorAll('.mao .carta')[k].click(), i);
      await page.waitForTimeout(25);
      await page.evaluate(k => {
        const c = document.querySelectorAll('.mao .carta')[k];
        if (c) c.click();
      }, i);
      await page.waitForTimeout(40);
    } else {
      await page.waitForTimeout(300);
    }

    const acabou = await page.evaluate(() => !!document.querySelector('#tela-fim[data-ativa]'));
    if (acabou) { console.log('partida terminou na rodada ' + rodadas); break; }
  }

  const fim = await page.evaluate(() => ({
    telaFim: !!document.querySelector('#tela-fim[data-ativa]'),
    fichas: CR.save.dados.fichas,
    partidas: CR.save.dados.stats.partidas,
    batidas: CR.save.dados.stats.batidas
  }));
  console.log('passos:', jogadas, '| rodadas:', rodadas, '| tela final:', fim.telaFim,
    '| fichas:', fim.fichas, '| batidas:', fim.batidas);

  await browser.close();
  if (erros.length) {
    console.log('\nERROS (' + erros.length + '):');
    [...new Set(erros)].slice(0, 20).forEach(e => console.log(' -', e));
    process.exit(1);
  }
  if (!fim.telaFim) { console.log('\nA partida nao chegou ao fim em ' + limite + ' passos.'); process.exit(2); }
  console.log('\nsem erros.');
})();
