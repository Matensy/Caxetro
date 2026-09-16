/* Caxeta Royale — lojinha, economia e desafios diarios */
(function (CR) {
  'use strict';
  var fx = CR.fx;

  /* ------------------------------------------------- decks tematicos */

  var DECKS = [
    { id: 'padrao', nome: 'Padrao', preco: 0, efeito: 'Sem modificador nenhum.', mods: {} },
    { id: 'vermelho', nome: 'Vermelho', preco: 100, efeito: 'Duas vidas a mais, um slot de coringa a menos.', mods: { lives: 2, jokerSlots: -1 } },
    { id: 'azul', nome: 'Azul', preco: 100, efeito: 'Comeca com uma Bencao aleatoria.', mods: { bencaoGratis: 1 } },
    { id: 'dourado', nome: 'Dourado', preco: 200, efeito: 'Cem fichas de entrada, duas vidas a menos.', mods: { lives: -2, chips: 100 } },
    { id: 'fantasma', nome: 'Fantasma', preco: 300, efeito: 'Astrais aparecem muito mais. Uma vida a menos.', mods: { lives: -1, dropAstral: 0.35 } },
    { id: 'caos', nome: 'Caos', preco: 400, efeito: 'A Vira muda a cada cinco turnos.', mods: { viraCaos: 5 } },
    { id: 'minimalista', nome: 'Minimalista', preco: 300, efeito: 'Sete cartas na mao e curinga conta por duas.', mods: { handSize: 7, wildDouble: true } },
    { id: 'zodiaco', nome: 'Zodiaco', preco: 500, efeito: 'Comeca com uma Astral e um Pergaminho de graca.', mods: { astralGratis: 1, voucherGratis: 1 } },
    { id: 'blefador', nome: 'Blefador', preco: 350, efeito: 'Pifar nunca queima. Um slot de Bencao a menos.', mods: { burnImmune: true, blessingSlots: -1 } },
    { id: 'lendario', nome: 'Lendario', preco: 1000, efeito: 'Um coringa lendario garantido, tres vidas a menos.', mods: { lives: -3, lendarioGratis: 1 } }
  ];

  /* ------------------------------------------------------ cosmeticos */

  var COSMETICOS = [
    { id: 'bater-confete', nome: 'Confete', tipo: 'bater', preco: 0, diz: 'Chuva de papel picado.' },
    { id: 'bater-explosao', nome: 'Explosao', tipo: 'bater', preco: 120, diz: 'A mesa treme.' },
    { id: 'bater-raios', nome: 'Raios', tipo: 'bater', preco: 160, diz: 'Descarga em cima da mesa.' },
    { id: 'bater-fogos', nome: 'Fogos', tipo: 'bater', preco: 200, diz: 'Fogos de artificio de bairro.' },
    { id: 'bater-po', nome: 'Po dourado', tipo: 'bater', preco: 250, diz: 'Poeira de latao no ar.' },

    { id: 'moldura-bronze', nome: 'Bronze', tipo: 'moldura', preco: 0, diz: 'Moldura de entrada.' },
    { id: 'moldura-prata', nome: 'Prata', tipo: 'moldura', preco: 60, diz: 'Prata escovada.' },
    { id: 'moldura-ouro', nome: 'Ouro', tipo: 'moldura', preco: 110, diz: 'Latao polido.' },
    { id: 'moldura-diamante', nome: 'Diamante', tipo: 'moldura', preco: 150, diz: 'Facetado.' },
    { id: 'moldura-chamas', nome: 'Chamas', tipo: 'moldura', preco: 150, diz: 'Pega fogo quando voce bate.' },

    { id: 'ui-escuro', nome: 'Escuro', tipo: 'ui', preco: 0, diz: 'Latao sobre verde garrafa.' },
    { id: 'ui-claro', nome: 'Claro', tipo: 'ui', preco: 60, diz: 'Papel e tinta preta.' },
    { id: 'ui-retro', nome: 'Retro', tipo: 'ui', preco: 90, diz: 'Cartaz de circo dos anos 60.' },
    { id: 'ui-neon', nome: 'Neon', tipo: 'ui', preco: 110, diz: 'Letreiro de gas ligado.' },
    { id: 'ui-pastel', nome: 'Pastel', tipo: 'ui', preco: 120, diz: 'Sorveteria de esquina.' },

    { id: 'som-classico', nome: 'Classico', tipo: 'som', preco: 0, diz: 'Baque de carta na mesa.' },
    { id: 'som-moedas', nome: 'Moedas', tipo: 'som', preco: 40, diz: 'Ficha caindo no bolso.' },
    { id: 'som-trovao', nome: 'Trovao', tipo: 'som', preco: 60, diz: 'Estouro grave.' },
    { id: 'som-sino', nome: 'Sino', tipo: 'som', preco: 80, diz: 'Sininho de balcao.' },
    { id: 'som-aplausos', nome: 'Aplausos', tipo: 'som', preco: 100, diz: 'A mesa inteira bate palma.' }
  ];

  /* ------------------------------------------------ desafios diarios */

  var DESAFIOS = [
    { id: 'd1', diz: 'Bata tres vezes usando curinga', meta: 3, premio: 100, chave: 'baterCuringa' },
    { id: 'd2', diz: 'Vença uma partida sem usar Bencao', meta: 1, premio: 150, chave: 'vitoriaSemBencao' },
    { id: 'd3', diz: 'Elimine dois adversarios numa sessao', meta: 2, premio: 120, chave: 'eliminacoes' },
    { id: 'd4', diz: 'Bata com mao batida', meta: 1, premio: 200, chave: 'maoBatida' },
    { id: 'd5', diz: 'Use cinco Cartas de Bencao', meta: 5, premio: 80, chave: 'bencoesUsadas' },
    { id: 'd6', diz: 'Vença usando o deck Minimalista', meta: 1, premio: 150, chave: 'vitoriaMinimalista' },
    { id: 'd7', diz: 'Bata com 10 cartas duas vezes', meta: 2, premio: 120, chave: 'baterDez' },
    { id: 'd8', diz: 'Fure a fila e bata', meta: 1, premio: 140, chave: 'furouBateu' },
    { id: 'd9', diz: 'Termine uma partida sem queimar', meta: 1, premio: 90, chave: 'semQueimar' },
    { id: 'd10', diz: 'Bata com tres trincas', meta: 1, premio: 110, chave: 'tresTrincas' },
    { id: 'd11', diz: 'Bata com flush completo', meta: 1, premio: 180, chave: 'flush' },
    { id: 'd12', diz: 'Junte 400 fichas numa sessao', meta: 400, premio: 100, chave: 'fichasSessao' },
    { id: 'd13', diz: 'Declare "ta na boa" cinco vezes', meta: 5, premio: 70, chave: 'naBoa' },
    { id: 'd14', diz: 'Vença contra tres bots dificeis', meta: 1, premio: 200, chave: 'vitoriaDificil' },
    { id: 'd15', diz: 'Suba uma Carta Astral de nivel', meta: 1, premio: 90, chave: 'astralSubiu' },
    { id: 'd16', diz: 'Jogue dez rodadas', meta: 10, premio: 80, chave: 'rodadas' },
    { id: 'd17', diz: 'Bata sem usar nenhum curinga', meta: 1, premio: 130, chave: 'baterLimpo' },
    { id: 'd18', diz: 'Vença uma partida no modo Cachetao', meta: 1, premio: 160, chave: 'vitoriaCachetao' },
    { id: 'd19', diz: 'Equipe tres coringas e vença', meta: 1, premio: 140, chave: 'vitoriaTresCoringas' },
    { id: 'd20', diz: 'Compre qualquer item na lojinha', meta: 1, premio: 60, chave: 'comprou' }
  ];

  /* ---------------------------------------------------------- ganhos */

  var GANHOS = {
    bater: 50, baterDez: 25, maoBatida: 50, rodada: 5,
    desafio: 100, combo: 30, primeiroDoDia: 20, eliminacao: 40
  };

  function hojeStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function sorteioDoDia() {
    var s = CR.save.dados;
    var hoje = hojeStr();
    if (s.desafios.dia === hoje && s.desafios.lista.length === 3) return s.desafios.lista;
    var seed = 0;
    for (var i = 0; i < hoje.length; i++) seed = (seed * 31 + hoje.charCodeAt(i)) >>> 0;
    var rand = CR.deck.rng(seed);
    var pool = DESAFIOS.slice(), escolhidos = [];
    for (var k = 0; k < 3; k++) escolhidos.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id);
    s.desafios = { dia: hoje, lista: escolhidos, feitos: {}, progresso: {} };
    CR.save.salvar();
    return escolhidos;
  }

  function desafiosDeHoje() {
    return sorteioDoDia().map(function (id) {
      var d = DESAFIOS.filter(function (x) { return x.id === id; })[0];
      var s = CR.save.dados.desafios;
      return Object.assign({}, d, {
        progresso: (s.progresso && s.progresso[id]) || 0,
        feito: !!(s.feitos && s.feitos[id])
      });
    });
  }

  function progredir(chave, quanto) {
    var s = CR.save.dados.desafios;
    if (!s.progresso) s.progresso = {};
    var ganhou = 0;
    desafiosDeHoje().forEach(function (d) {
      if (d.chave !== chave || d.feito) return;
      s.progresso[d.id] = Math.min(d.meta, (s.progresso[d.id] || 0) + (quanto || 1));
      if (s.progresso[d.id] >= d.meta) {
        s.feitos[d.id] = true;
        creditar(d.premio);
        ganhou += d.premio;
        CR.ui && CR.ui.aviso('Desafio concluido: ' + d.diz + ' (+' + d.premio + '₣)', 'bom');
      }
    });
    CR.save.salvar();
    return ganhou;
  }

  /* -------------------------------------------------------- economia */

  function creditar(n) {
    var s = CR.save.dados;
    s.fichas += Math.round(n);
    s.stats.fichasTotais += Math.max(0, Math.round(n));
    CR.save.salvar();
    return s.fichas;
  }

  function bonusPrimeiroDoDia() {
    var s = CR.save.dados;
    if (s.stats.ultimoDia === hojeStr()) return 0;
    s.stats.ultimoDia = hojeStr();
    creditar(GANHOS.primeiroDoDia);
    return GANHOS.primeiroDoDia;
  }

  /** Desconto vindo de Comerciante, Mercador e derivados do loadout salvo. */
  function desconto() {
    var s = CR.save.dados, d = 0;
    var falso = { jokers: s.loadout, vouchers: s.vouchers, astral: {} };
    d = fx.mod(null, falso, 'shopDiscount', 0, {});
    return Math.min(0.5, d);
  }

  function preco(base) {
    return Math.max(10, Math.round(base * (1 - desconto())));
  }

  function podeComprar(base) { return CR.save.dados.fichas >= preco(base); }

  function comprar(base) {
    var p = preco(base);
    if (CR.save.dados.fichas < p) return false;
    CR.save.dados.fichas -= p;
    CR.save.salvar();
    progredir('comprou', 1);
    return true;
  }

  /* --------------------------------------------------------- catalogo */

  function catalogo(aba, filtro) {
    if (aba === 'coringas') {
      var l = fx.all('joker');
      if (filtro && filtro !== 'todos') l = l.filter(function (j) { return j.rarity === filtro; });
      return l;
    }
    if (aba === 'pergaminhos') {
      return fx.all('voucher').concat(fx.all('blessing')).concat(fx.all('astral'));
    }
    if (aba === 'deck') return fx.all('seal').concat(fx.all('edition'));
    if (aba === 'cosmeticos') return CR.themes.list.concat(COSMETICOS);
    return [];
  }

  function slotsDeCoringa() {
    var s = CR.save.dados;
    var falso = { jokers: s.loadout, vouchers: s.vouchers, astral: {} };
    var base = fx.mod(null, falso, 'jokerSlots', 3, {});
    var deck = DECKS.filter(function (d) { return d.id === s.deck; })[0];
    if (deck && deck.mods.jokerSlots) base += deck.mods.jokerSlots;
    return Math.max(1, base + CR.seals.extraJokerSlots(s));
  }

  CR.store = {
    DECKS: DECKS, COSMETICOS: COSMETICOS, DESAFIOS: DESAFIOS, GANHOS: GANHOS,
    catalogo: catalogo, preco: preco, comprar: comprar, podeComprar: podeComprar,
    creditar: creditar, desconto: desconto, slotsDeCoringa: slotsDeCoringa,
    desafiosDeHoje: desafiosDeHoje, progredir: progredir, bonusPrimeiroDoDia: bonusPrimeiroDoDia,
    deckAtual: function () {
      var s = CR.save.dados;
      return DECKS.filter(function (d) { return d.id === s.deck; })[0] || DECKS[0];
    },
    cosmetico: function (id) { return COSMETICOS.filter(function (c) { return c.id === id; })[0]; }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
