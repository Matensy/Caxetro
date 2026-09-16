/* Dois navegadores numa sala: abre, entra pelo codigo, joga e confere que a
 * mao de um nunca chega no aparelho do outro. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:8080';

const erros = [];
function vigiar(p, quem) {
  p.on('pageerror', e => erros.push(quem + ' pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error') erros.push(quem + ' console: ' + m.text()); });
}

async function abrir(browser, quem) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const p = await ctx.newPage();
  vigiar(p, quem);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => { CR.bot.thinkTime = () => 30; });
  return p;
}

async function estado(p) {
  return p.evaluate(() => {
    const j = CR.app.jogo;
    if (!j) return { semJogo: true };
    return {
      state: j.state, phase: j.phase, turnIdx: j.turnIdx, roundNo: j.roundNo,
      voltas: j.round ? j.round.turnCount : 0,
      lixeira: j.round ? j.round.lixeira.length : 0,
      maco: j.round ? j.round.maco.length : 0,
      vidas: j.players.map(p => p.lives).join('/'),
      eu: CR.online.meuIdx, modo: CR.online.modo,
      minhaVez: CR.hud.minhaVez(),
      mao: (j.players[CR.online.meuIdx] || {}).hand?.length || 0,
      sobrepor: !!document.querySelector('.sobrepor'),
      mesa: !!document.querySelector('#tela-mesa[data-ativa]')
    };
  });
}

async function jogarVez(p) {
  const st = await estado(p);
  if (st.semJogo || !st.minhaVez || st.state !== 'turn') return false;
  if (st.phase === 'buy') {
    const bateu = await p.evaluate(() => {
      const b = document.querySelector('.acao--bater');
      if (b && !b.disabled) { b.click(); return true; }
      const c = document.querySelector('.pilha-col .carta-clicavel:not([disabled])');
      if (c) c.click();
      return false;
    });
    return bateu || true;
  }
  if (st.phase === 'discard') {
    await p.evaluate(() => {
      const b = document.querySelector('.acao--bater');
      if (b && !b.disabled) { b.click(); return; }
      // Descarta como um jogador razoavel descartaria, pra chegar numa batida.
      const j = CR.app.jogo;
      const eu = j.players[CR.online.meuIdx];
      let alvo = null;
      try { alvo = CR.bot.chooseDiscard(j, eu); } catch (e) { alvo = null; }
      const cartas = [...document.querySelectorAll('.mao .carta')];
      let el = alvo && cartas.find(c => c.getAttribute('data-id') === alvo.id);
      if (!el || el.hasAttribute('data-travada')) el = cartas.find(c => !c.hasAttribute('data-travada'));
      if (!el) return;
      el.click(); el.click();
    });
    return true;
  }
  return false;
}

async function fecharSobrepor(p) {
  await p.evaluate(() => {
    const o = document.querySelector('.sobrepor');
    if (!o) return;
    const b = o.querySelector('.sim') || o.querySelector('.botoes button');
    if (b) b.click();
  });
}

(async () => {
  const browser = await chromium.launch();
  const dono = await abrir(browser, 'dono');
  const amigo = await abrir(browser, 'amigo');

  // Dono abre a mesa
  await dono.evaluate(() => { CR.save.dados.nome = 'Matheus'; CR.app.ir('sala'); });
  await dono.waitForSelector('.sala-cartao');
  await dono.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[0].click());
  await dono.waitForSelector('.sala-codigo .codigo', { timeout: 8000 });
  const codigo = await dono.textContent('.sala-codigo .codigo');
  console.log('sala aberta com o codigo', codigo);

  // Amigo entra
  await amigo.evaluate(() => { CR.save.dados.nome = 'Ana'; CR.app.ir('sala'); });
  await amigo.waitForSelector('.codigo-campo');
  await amigo.fill('.codigo-campo', codigo);
  await amigo.evaluate(() => document.querySelectorAll('.sala-cartao .botao-grande')[1].click());
  await amigo.waitForSelector('.sala-codigo .codigo', { timeout: 8000 });
  await dono.waitForTimeout(700);

  const naMesa = await dono.evaluate(() => CR.lan.sala.map(j => j.nome));
  console.log('na sala:', naMesa.join(', '));
  if (naMesa.length !== 2) throw new Error('a sala nao juntou os dois');

  // Dono poe um bot na mesa antes de comecar
  await dono.evaluate(() => {
    const b = [...document.querySelectorAll('.sala-lista button')].find(x => x.textContent === '+ bot');
    if (b) b.click();
  });
  await dono.waitForTimeout(250);

  // Dono comeca
  await dono.evaluate(() => {
    const b = [...document.querySelectorAll('.lobby-pe button')].find(x => x.textContent === 'Comecar');
    b.click();
  });
  await dono.waitForSelector('#tela-mesa[data-ativa]', { timeout: 8000 });
  await amigo.waitForSelector('#tela-mesa[data-ativa]', { timeout: 8000 });
  await amigo.waitForTimeout(900);
  console.log('mesa aberta nos dois aparelhos');

  // A mao do amigo nunca pode aparecer no aparelho do dono e vice-versa.
  const vazamento = await dono.evaluate(() => {
    const j = CR.app.jogo;
    const outro = j.players[1 - CR.online.meuIdx];
    return { nome: outro.name, cartasVisiveis: outro.hand.filter(c => c.rank !== undefined).length };
  });
  const vazamento2 = await amigo.evaluate(() => {
    const j = CR.app.jogo;
    const outro = j.players[1 - CR.online.meuIdx];
    return { nome: outro.name, cartasVisiveis: outro.hand.filter(c => c.rank !== undefined).length };
  });
  console.log('no aparelho do amigo, a mao de', vazamento2.nome, 'tem', vazamento2.cartasVisiveis, 'cartas legiveis');
  if (vazamento2.cartasVisiveis > 0) throw new Error('VAZOU a mao do dono pro convidado');

  // Joga alguns turnos alternados
  let passos = 0, rodadas = 0;
  for (let i = 0; i < 260; i++) {
    for (const p of [dono, amigo]) {
      const st = await estado(p);
      if (st.semJogo) continue;
      rodadas = Math.max(rodadas, st.roundNo);
      if (st.sobrepor) { await fecharSobrepor(p); await p.waitForTimeout(150); continue; }
      if (await jogarVez(p)) passos++;
    }
    await dono.waitForTimeout(90);
    const fim = await dono.evaluate(() => !!document.querySelector('#tela-fim[data-ativa]'));
    if (fim) break;
  }

  // Os retratos chegam com atraso: espera assentar antes de comparar.
  let final, finalAmigo;
  for (let t = 0; t < 12; t++) {
    await dono.waitForTimeout(250);
    final = await estado(dono);
    finalAmigo = await estado(amigo);
    if (final.semJogo || finalAmigo.state === 'gameOver') break;
    if (final.voltas === finalAmigo.voltas && final.lixeira === finalAmigo.lixeira) break;
  }
  const acabou = final.semJogo || final.state === 'gameOver' || finalAmigo.state === 'gameOver';
  const batidas = await dono.evaluate(() => CR.app.jogo ? CR.app.jogo.history.filter(h => h.tag === 'bater').length : 0);
  console.log('jogadas feitas:', passos, '| rodadas:', rodadas, '| batidas vistas:', batidas);
  console.log('dono:', JSON.stringify(final));
  console.log('amigo:', JSON.stringify(finalAmigo));
  // voltas zera a cada rodada, entao o que mostra avanco e o numero de rodadas.
  if (rodadas < 2) throw new Error('a mesa quase nao andou: ' + rodadas + ' rodada(s)');
  if (acabou) {
    console.log('a partida chegou ao fim nos dois aparelhos');
  } else {
    if (final.roundNo !== finalAmigo.roundNo) throw new Error('os dois aparelhos ficaram em rodadas diferentes');
    if (final.voltas !== finalAmigo.voltas) throw new Error('dessincronizaram: ' + final.voltas + ' contra ' + finalAmigo.voltas);
    if (final.lixeira !== finalAmigo.lixeira) throw new Error('lixeira diferente entre os aparelhos');
    console.log('os dois aparelhos terminaram no mesmo estado');
  }

  await browser.close();
  if (erros.length) {
    console.log('\nERROS (' + erros.length + '):');
    [...new Set(erros)].slice(0, 20).forEach(e => console.log(' -', e));
    process.exit(1);
  }
  console.log('\nsem erros nos dois aparelhos.');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
