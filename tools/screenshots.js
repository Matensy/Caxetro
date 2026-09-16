/* Percorre o jogo no Chromium e guarda as fotos das telas em docs/imagens. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'docs', 'imagens');
const BASE = process.env.BASE || 'http://localhost:8080';
fs.mkdirSync(OUT, { recursive: true });

const erros = [];

async function shot(page, nome) {
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(OUT, nome + '.png') });
  console.log('  ->', nome + '.png');
}

(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  page.on('pageerror', e => erros.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n')[1]));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await shot(page, '01-abertura');

  await page.waitForTimeout(1200);
  await shot(page, '02-menu');

  // Lojinha: as quatro abas
  await page.evaluate(() => CR.save.dados.fichas = 99999);
  await page.evaluate(() => CR.app.ir('loja'));
  await shot(page, '14-loja-prontos');

  await page.evaluate(() => { CR.ui.$$('.aba')[1].click(); });
  await page.waitForTimeout(400);
  await shot(page, '03-loja-coringas');

  await page.evaluate(() => { CR.ui.$$('.aba')[4].click(); });
  await page.waitForTimeout(400);
  await shot(page, '04-loja-tabuleiros');

  await page.evaluate(() => { CR.ui.$$('.aba')[2].click(); });
  await page.waitForTimeout(400);
  await shot(page, '05-loja-deck');

  await page.evaluate(() => { CR.ui.$$('.aba')[3].click(); });
  await page.waitForTimeout(400);
  await shot(page, '06-loja-pergaminhos');

  // Desafios e ajuda
  await page.evaluate(() => CR.app.ir('desafios'));
  await shot(page, '07-desafios');
  await page.evaluate(() => CR.app.ir('ajuda'));
  await shot(page, '08-como-joga');

  // Lobby, e o modo classico
  await page.evaluate(() => CR.app.ir('lobby'));
  await shot(page, '09-lobby');
  await page.evaluate(() => {
    [...document.querySelectorAll('.pilha button')].find(b => b.textContent === 'Classico').click();
  });
  await page.waitForTimeout(400);
  await shot(page, '15-lobby-classico');
  await page.evaluate(() => {
    [...document.querySelectorAll('.pilha button')].find(b => b.textContent === 'Campeonato').click();
  });
  await page.waitForTimeout(300);

  // Sala na rede local
  await page.evaluate(() => CR.app.ir('sala'));
  await page.waitForTimeout(400);
  await shot(page, '16-sala-entrada');

  // Mesa, tabuleiro botequim
  await page.evaluate(() => {
    CR.save.dados.loadout = ['olho-gato', 'mao-ouro', 'muralha'];
    CR.save.dados.blessings = ['ascensao', 'olho-verdade'];
    CR.app.comecarPartida({
      cadeiras: [
        { nome: 'Voce', bot: false },
        { nome: 'Dona Iraci', bot: true, nivel: 'normal' },
        { nome: 'Seu Bola', bot: true, nivel: 'dificil' }
      ],
      modo: 'campeonato', vidas: 7, timer: 0,
      coringas: true, bencoes: true, pergaminhos: true, curingasPorCombo: 1, kA2: false
    });
  });
  await page.waitForTimeout(900);
  await shot(page, '10-mesa-botequim');

  // Organizador de mao, ja com uma carta comprada
  await page.evaluate(() => {
    const j = CR.app.jogo;
    j.turnIdx = 0; j.beginTurn(); j.drawFrom('maco'); CR.hud.desenhar();
  });
  await page.waitForTimeout(500);
  await shot(page, '17-organizador');

  // Mesa com outros tabuleiros
  for (const board of ['halloween', 'floresta', 'natal', 'noir', 'neon', 'junino', 'cosmos', 'mar', 'cangaco', 'azulejo', 'dourado']) {
    await page.evaluate(b => {
      CR.save.dados.board = b;
      CR.save.dados.boards.push(b);
      CR.hud.ligar(CR.app.jogo, b);
    }, board);
    await page.waitForTimeout(700);
    await shot(page, '11-mesa-' + board);
  }

  // Volta pro botequim e joga alguns turnos de verdade
  await page.evaluate(() => { CR.save.dados.board = 'botequim'; CR.hud.ligar(CR.app.jogo, 'botequim'); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const j = CR.app.jogo;
    if (j.phase === 'buy' && !j.current().isBot) CR.ui.$('.pilha-col .carta-clicavel').click();
  });
  await page.waitForTimeout(700);
  await shot(page, '12-mesa-turno');

  // Vitrine de todos os tabuleiros em uma foto
  await page.evaluate(() => { CR.ui.$$('.aba') && CR.app.ir('loja'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { CR.ui.$$('.aba')[3].click(); });
  await page.waitForTimeout(600);
  await shot(page, '13-tabuleiros-vitrine');

  await browser.close();
  if (erros.length) {
    console.log('\nERROS ENCONTRADOS (' + erros.length + '):');
    [...new Set(erros)].slice(0, 25).forEach(e => console.log(' -', e));
    process.exit(1);
  }
  console.log('\nsem erros de console.');
})();
