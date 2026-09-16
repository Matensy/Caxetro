/* Caxeta Royale — telas: abertura, menu, lobby, lojinha, hot-seat, resultado. */
(function (CR) {
  'use strict';
  var U = CR.ui, S = CR.sprites, D = CR.deck;

  /* ============================================================ abertura */

  function splash(raiz) {
    U.limpa(raiz);
    raiz.appendChild(U.el('div', { class: 'splash-marca' }, [
      U.el('div', { class: 'cx', text: 'CAXETA' }),
      U.el('div', { class: 'ry', text: 'ROYALE' }),
      U.el('div', { class: 'splash-linha' }),
      U.el('p', { text: 'Baralho na mesa, poder na manga.' })
    ]));
  }

  /* ================================================================ menu */

  function menu(raiz) {
    U.limpa(raiz);
    var s = CR.save.dados;

    var placa = U.el('div', { class: 'placa' }, [
      U.el('h1', {}, [
        U.el('span', { class: 'cx', text: 'CAXETA' }),
        U.el('span', { class: 'ry', text: 'ROYALE' })
      ]),
      U.el('div', { class: 'fita' }),
      U.el('p', { class: 'sub', text: 'A caxeta de sempre, com coringa que muda a regra e lojinha entre as rodadas.' })
    ]);
    ['p1', 'p2', 'p3', 'p4'].forEach(function (p) { placa.appendChild(U.el('span', { class: 'parafuso ' + p })); });

    var carteira = U.chapa('carteira', [
      U.el('div', { class: 'valor fichas', text: U.fichas(s.fichas) }),
      U.el('div', { class: 'rotulo', text: 'Ganhas jogando. Aqui nao tem loja de dinheiro de verdade.' })
    ]);

    var tema = CR.themes.get(s.board);
    var leque = U.el('div', { class: 'leque' });
    [{ rank: 7, suit: 1 }, { rank: 12, suit: 3 }, { rank: 1, suit: 0 }].forEach(function (c) {
      leque.appendChild(U.el('div', {
        class: 'carta',
        html: S.cardFace({ rank: c.rank, suit: c.suit, red: c.suit < 2, id: 'm' + c.rank + c.suit },
          s.opcoes.naipesClassicos ? 'botequim' : s.board, false)
      }));
    });
    var mostruario = U.chapa('mostruario', [
      leque,
      U.el('div', { class: 'diz' }, [
        U.el('b', { text: tema.name }),
        U.el('span', { text: s.boards.length + ' de ' + CR.themes.list.length + ' tabuleiros' })
      ]),
      U.el('div', { style: 'font-size:11.5px;color:var(--osso-fosco);line-height:1.3', text: tema.tagline })
    ]);
    mostruario.setAttribute('role', 'button');
    mostruario.setAttribute('tabindex', '0');
    mostruario.setAttribute('aria-label', 'Trocar de tabuleiro na lojinha');
    function verTabuleiros() { CR.sfx.tocar('botao'); CR.app.ir('loja'); }
    mostruario.addEventListener('click', verTabuleiros);
    mostruario.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verTabuleiros(); }
    });

    var esq = U.el('div', { class: 'menu-esq' }, [placa, carteira, mostruario]);

    var feitos = CR.store.desafiosDeHoje().filter(function (d) { return d.feito; }).length;
    var destinos = U.el('div', { class: 'destinos' }, [
      U.chapa('destino destino--hero chapa--esmalte', [
        U.el('div', {}, [
          U.el('div', { class: 'nome', text: 'Jogar' }),
          U.el('div', { class: 'diz', text: 'Classico, rapida, campeonato ou cachetao. Ate cinco na roda, humanos e bots misturados.' })
        ]),
        U.el('div', { class: 'marca', text: '2 a 5' })
      ]),
      linkDestino('Jogar no wifi', 'Abra uma mesa e chame quem esta na mesma rede pelo codigo', 'ate 5', 'sala'),
      linkDestino('Lojinha', 'Coringas, selos, pergaminhos e tabuleiro novo', s.jokers.length + ' coringas seus', 'loja'),
      linkDestino('Desafios do dia', 'Tres tarefas, fichas na conta', feitos + ' de 3 feitos', 'desafios'),
      linkDestino('Como se joga', 'Regra da caxeta e os poderes, do zero', null, 'ajuda'),
      linkDestino('Ajustes', 'Som, naipes classicos, apagar progresso', null, 'ajustes')
    ]);
    destinos.firstChild.addEventListener('click', function () { CR.app.irParaLobby(); });
    destinos.firstChild.setAttribute('tabindex', '0');
    destinos.firstChild.setAttribute('role', 'button');
    destinos.firstChild.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); CR.app.irParaLobby(); }
    });

    raiz.appendChild(esq);
    raiz.appendChild(destinos);
    raiz.appendChild(U.el('div', { class: 'menu-rodape' }, [
      U.el('span', { html: 'Deck <b>' + CR.store.deckAtual().nome + '</b>' }),
      U.el('span', { html: '<b>' + s.stats.partidas + '</b> partidas jogadas' }),
      U.el('span', { html: '<b>' + s.stats.vitorias + '</b> mesas levadas' }),
      U.el('span', { html: '<b>' + s.stats.batidas + '</b> batidas' })
    ]));
  }

  function linkDestino(nome, diz, marca, tela) {
    var n = U.chapa('destino', [
      U.el('div', {}, [U.el('div', { class: 'nome', text: nome }), U.el('div', { class: 'diz', text: diz })]),
      marca ? U.el('div', { class: 'marca', text: marca }) : null
    ]);
    n.setAttribute('tabindex', '0');
    n.setAttribute('role', 'button');
    function ir() { CR.sfx.tocar('botao'); CR.app.ir(tela); }
    n.addEventListener('click', ir);
    n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    return n;
  }

  /* =============================================================== lobby */

  var cfg = null;
  function cfgPadrao() {
    var s = CR.save.dados;
    return {
      cadeiras: [
        { nome: s.nome || 'Voce', bot: false, nivel: 'normal' },
        { nome: 'Dona Iraci', bot: true, nivel: 'normal' },
        { nome: 'Seu Bola', bot: true, nivel: 'iniciante' }
      ],
      modo: 'campeonato', vidas: 7, timer: s.opcoes.timer || 0,
      coringas: true, bencoes: true, pergaminhos: true,
      curingasPorCombo: 1, kA2: false
    };
  }

  var NOMES_BOT = ['Dona Iraci', 'Seu Bola', 'Tia Neide', 'Zé Mirim', 'Careca', 'Dona Lurdes', 'Bigode', 'Nego Véio'];

  function lobby(raiz) {
    if (!cfg) cfg = cfgPadrao();
    var classico = cfg.modo === 'classico';
    U.limpa(raiz);

    raiz.appendChild(U.el('div', { class: 'cabeca' }, [
      U.chapa('voltar', ['Voltar']),
      U.el('h2', { text: 'Montar a mesa' }),
      U.el('span', { class: 'dica', text: 'Mesmo aparelho, passando de mao em mao.' })
    ]));
    raiz.firstChild.firstChild.addEventListener('click', function () { CR.app.ir('menu'); });

    var colA = U.chapa('lobby-col', [U.el('h3', { text: 'Quem joga' })]);
    var cadeiras = U.el('div', { class: 'cadeiras' });
    colA.appendChild(cadeiras);
    redesenharCadeiras(cadeiras);

    var addRemove = U.el('div', { class: 'pilha', style: 'margin-top:10px' }, [
      U.el('button', {
        type: 'button', text: '+ humano',
        onclick: function () { addCadeira(false); redesenharCadeiras(cadeiras); }
      }),
      U.el('button', {
        type: 'button', text: '+ bot',
        onclick: function () { addCadeira(true); redesenharCadeiras(cadeiras); }
      })
    ]);
    colA.appendChild(addRemove);

    var colB = U.chapa('lobby-col', [U.el('h3', { text: 'Regras da mesa' })]);
    var ops = U.el('div', { class: 'opcoes' });
    ops.appendChild(U.opcao('Modo', [
      { rot: 'Classico', v: 'classico' }, { rot: 'Rapida', v: 'rapida' },
      { rot: 'Campeonato', v: 'campeonato' }, { rot: 'Cachetao', v: 'cachetao' }
    ], cfg.modo, function (v) {
      cfg.modo = v;
      if (v === 'classico') { cfg.coringas = false; cfg.bencoes = false; cfg.pergaminhos = false; }
      lobby(raiz);
    }));
    ops.appendChild(U.opcao('Vidas', [
      { rot: '5', v: 5 }, { rot: '7', v: 7 }, { rot: '10', v: 10 }
    ], cfg.vidas, function (v) { cfg.vidas = v; }));
    if (classico) {
      var nota = U.el('div', { class: 'opcao', style: 'grid-column:1/-1' }, [
        U.el('span', { text: 'Poderes' }),
        U.el('div', {
          style: 'font-size:12px;color:var(--osso-fosco);line-height:1.35',
          text: 'Modo classico: sem coringas especiais, sem bencaos, sem pergaminhos e sem selos. So a caxeta, do jeito que se joga na mesa do bar.'
        })
      ]);
      ops.appendChild(nota);
    } else {
      ops.appendChild(U.opcao('Coringas Especiais', [
        { rot: 'Ligado', v: true }, { rot: 'Desligado', v: false }
      ], cfg.coringas, function (v) { cfg.coringas = v; }));
      ops.appendChild(U.opcao('Bencaos e Astrais', [
        { rot: 'Ligado', v: true }, { rot: 'Desligado', v: false }
      ], cfg.bencoes, function (v) { cfg.bencoes = v; }));
      ops.appendChild(U.opcao('Pergaminhos', [
        { rot: 'Ligado', v: true }, { rot: 'Desligado', v: false }
      ], cfg.pergaminhos, function (v) { cfg.pergaminhos = v; }));
    }
    ops.appendChild(U.opcao('Curinga por combinacao', [
      { rot: '1', v: 1 }, { rot: '2', v: 2 }
    ], cfg.curingasPorCombo, function (v) { cfg.curingasPorCombo = v; }));
    ops.appendChild(U.opcao('K-A-2', [
      { rot: 'Invalido', v: false }, { rot: 'Vale', v: true }
    ], cfg.kA2, function (v) { cfg.kA2 = v; }));
    ops.appendChild(U.opcao('Tempo por vez', [
      { rot: 'Sem', v: 0 }, { rot: '15s', v: 15 }, { rot: '30s', v: 30 }, { rot: '60s', v: 60 }
    ], cfg.timer, function (v) { cfg.timer = v; }));
    colB.appendChild(ops);

    if (!classico) {
      colB.appendChild(U.el('h3', { text: 'Seu equipamento', style: 'margin-top:14px' }));
      colB.appendChild(resumoEquipamento());
    }

    raiz.appendChild(U.el('div', { class: 'lobby-grade' }, [colA, colB]));

    var pe = U.el('div', { class: 'lobby-pe' }, [
      U.el('div', { class: 'dica', text: classico
        ? 'Tabuleiro ' + CR.themes.get(CR.save.dados.board).name + '. No classico o deck e o padrao, sem modificador.'
        : 'Tabuleiro ' + CR.themes.get(CR.save.dados.board).name + ', deck ' + CR.store.deckAtual().nome + '. Troca na lojinha.' }),
      U.el('button', { class: 'botao-grande', type: 'button', text: 'Comecar', onclick: function () { CR.app.comecarPartida(cfg); } })
    ]);
    raiz.appendChild(pe);
  }

  function addCadeira(bot) {
    if (cfg.cadeiras.length >= 5) return U.aviso('A mesa comporta cinco.', 'ruim');
    cfg.cadeiras.push({
      nome: bot ? NOMES_BOT[cfg.cadeiras.length % NOMES_BOT.length] : 'Jogador ' + (cfg.cadeiras.length + 1),
      bot: bot, nivel: 'normal'
    });
  }

  function redesenharCadeiras(box) {
    U.limpa(box);
    cfg.cadeiras.forEach(function (c, i) {
      var linha = U.el('div', { class: 'cadeira', 'data-bot': c.bot ? '' : null }, [
        U.el('span', { class: 'n', text: String(i + 1) }),
        U.el('input', {
          value: c.nome, maxlength: 16, 'aria-label': 'Nome do jogador ' + (i + 1),
          oninput: function (e) { c.nome = e.target.value; }
        })
      ]);
      var dir = U.el('div', { style: 'display:flex;gap:4px' });
      dir.appendChild(U.el('button', {
        class: 'troca', type: 'button', text: c.bot ? c.nivel : 'humano',
        onclick: function () {
          if (!c.bot) { c.bot = true; c.nivel = 'iniciante'; c.nome = NOMES_BOT[i % NOMES_BOT.length]; }
          else if (c.nivel === 'iniciante') c.nivel = 'normal';
          else if (c.nivel === 'normal') c.nivel = 'dificil';
          else { c.bot = false; c.nome = 'Jogador ' + (i + 1); }
          redesenharCadeiras(box);
        }
      }));
      if (cfg.cadeiras.length > 2) dir.appendChild(U.el('button', {
        class: 'troca', type: 'button', text: 'sai', 'aria-label': 'Tirar da mesa',
        onclick: function () { cfg.cadeiras.splice(i, 1); redesenharCadeiras(box); }
      }));
      linha.appendChild(dir);
      box.appendChild(linha);
    });
  }

  function resumoEquipamento() {
    var s = CR.save.dados;
    var box = U.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' });
    if (!s.loadout.length) {
      box.appendChild(U.el('span', { class: 'dica', text: 'Sem coringa equipado.' }));
      box.appendChild(U.el('button', {
        class: 'comprar', type: 'button', text: 'Pegar um baralho pronto',
        onclick: function () { abaAtual = 'prontos'; CR.sfx.tocar('botao'); CR.app.ir('loja'); }
      }));
      return box;
    }
    s.loadout.forEach(function (id) {
      var d = CR.fx.get('joker', id);
      if (!d) return;
      box.appendChild(U.el('div', { class: 'carta', style: 'width:52px;height:68px', html: S.powerArt(d, s.board), title: d.name }));
    });
    return box;
  }

  /* ============================================================= lojinha */

  var abaAtual = 'prontos', filtroAtual = 'todos', selDeck = null;

  function loja(raiz) {
    U.limpa(raiz);
    var s = CR.save.dados;

    var abas = U.el('div', { class: 'abas' });
    [['prontos', 'Baralhos prontos'], ['coringas', 'Coringas'], ['deck', 'Deck Builder'],
     ['pergaminhos', 'Pergaminhos'], ['cosmeticos', 'Tabuleiros e visual']]
      .forEach(function (a) {
        abas.appendChild(U.el('button', {
          class: 'aba', type: 'button', role: 'tab', text: a[1],
          'aria-selected': String(abaAtual === a[0]),
          onclick: function () { abaAtual = a[0]; filtroAtual = 'todos'; loja(raiz); }
        }));
      });
    var cabeca = U.el('div', { class: 'cabeca' }, [
      U.chapa('voltar', ['Voltar']),
      U.el('h2', { text: 'Lojinha' })
    ]);
    cabeca.firstChild.addEventListener('click', function () { CR.app.ir('menu'); });
    raiz.appendChild(cabeca);
    raiz.appendChild(abas);

    var barra = U.el('div', { class: 'loja-barra' });
    if (abaAtual === 'coringas') {
      var f = U.el('div', { class: 'filtros' });
      [['todos', 'Todos'], ['comum', 'Comuns'], ['incomum', 'Incomuns'], ['raro', 'Raros'], ['lendario', 'Lendarios'], ['meus', 'Meus']]
        .forEach(function (x) {
          f.appendChild(U.el('button', {
            type: 'button', text: x[1], 'aria-pressed': String(filtroAtual === x[0]),
            onclick: function () { filtroAtual = x[0]; loja(raiz); }
          }));
        });
      barra.appendChild(f);
    } else {
      barra.appendChild(U.el('div', { class: 'dica', text: descricaoAba() }));
    }
    var desc = CR.store.desconto();
    barra.appendChild(U.el('div', { class: 'saldo fichas' }, [
      document.createTextNode(U.fichas(s.fichas)),
      U.el('small', { text: desc > 0 ? Math.round(desc * 100) + '% de desconto ativo' : 'seu saldo' })
    ]));
    raiz.appendChild(barra);

    var vitrine = U.el('div', { class: 'vitrine', 'data-col': abaAtual === 'cosmeticos' ? '4' : '5' });
    raiz.appendChild(vitrine);

    if (abaAtual === 'prontos') vitrineProntos(vitrine, raiz);
    else if (abaAtual === 'coringas') vitrineCoringas(vitrine, raiz);
    else if (abaAtual === 'deck') vitrineDeck(vitrine, raiz);
    else if (abaAtual === 'pergaminhos') vitrinePergaminhos(vitrine, raiz);
    else vitrineCosmeticos(vitrine, raiz);
  }

  function descricaoAba() {
    if (abaAtual === 'prontos') return 'Combinacoes ja montadas. Escolha uma, aperte usar e va jogar.';
    if (abaAtual === 'deck') return 'Aplique selos e melhorias em cartas do baralho, e escolha o deck da partida.';
    if (abaAtual === 'pergaminhos') return 'Pergaminhos valem a sessao inteira. Bencaos e Astrais voce leva pra partida.';
    return 'Tabuleiro muda feltro, verso, naipes e a arte das cartas especiais.';
  }

  function itemBase(def, extras) {
    var s = CR.save.dados;
    var n = U.chapa('item rar-' + (def.rarity || 'comum'), []);
    n.innerHTML = S.powerArt(def, s.board);
    n.appendChild(U.el('div', { class: 'txt', text: def.text || def.diz || '' }));
    if (def.drawback) n.appendChild(U.el('div', { class: 'drawback', text: 'Contrapartida: ' + def.drawback }));
    n.appendChild(extras);
    return n;
  }

  /* Baralhos prontos: o caminho de entrada pra quem nao conhece os 60 coringas. */
  function vitrineProntos(vitrine, raiz) {
    var s = CR.save.dados;
    vitrine.setAttribute('data-col', '3');

    CR.prontos.lista.forEach(function (pr) {
      var falta = CR.prontos.faltando(pr);
      var temTudo = falta.length === 0;
      var usando = CR.prontos.emUso(pr);
      var custo = CR.prontos.preco(pr);

      var pecas = U.el('div', { class: 'pecas' });
      pr.jokers.forEach(function (id) {
        var d = CR.fx.get('joker', id);
        if (!d) return;
        var tem = s.jokers.indexOf(id) !== -1;
        pecas.appendChild(U.el('div', {
          class: 'peca', 'data-tem': tem ? '' : null, title: d.name + ': ' + d.text,
          html: S.emblema(d, s.board) + '<span>' + S.esc(d.name) + '</span>'
        }));
      });

      var extras = [];
      pr.vouchers.forEach(function (id) {
        var v = CR.fx.get('voucher', id); if (v) extras.push('pergaminho ' + v.name);
      });
      Object.keys(pr.astral).forEach(function (id) {
        var a = CR.fx.get('astral', id); if (a) extras.push('astral ' + a.name);
      });
      pr.blessings.forEach(function (id) {
        var b = CR.fx.get('blessing', id); if (b) extras.push('bencao ' + b.name);
      });
      var dk = CR.store.DECKS.filter(function (d) { return d.id === pr.deck; })[0];
      if (dk && dk.id !== 'padrao') extras.push('deck ' + dk.nome);

      var acao;
      if (usando) acao = U.el('span', { class: 'tem', text: 'em uso' });
      else acao = U.el('button', {
        class: temTudo ? 'equipar' : 'comprar', type: 'button',
        text: temTudo ? 'usar' : custo === 0 ? 'pegar de graca' : 'levar tudo',
        disabled: !temTudo && custo > 0 && s.fichas < custo,
        onclick: function () {
          if (!CR.prontos.adotar(pr)) return U.aviso('Fichas de menos pra esse baralho.', 'ruim');
          CR.sfx.tocar('ficha');
          U.aviso(pr.nome + ' equipado. Pode ir jogar.', 'bom');
          loja(raiz);
        }
      });

      var n = U.chapa('item pronto-item' + (usando ? ' rar-lendario' : ''), [
        U.el('h4', { text: pr.nome }),
        U.el('div', { class: 'resumo', text: pr.resumo }),
        pecas,
        extras.length ? U.el('div', { class: 'extras', text: 'Vem junto: ' + extras.join(', ') + '.' }) : null,
        U.el('div', { class: 'como', text: pr.comoJogar }),
        U.el('div', { class: 'pe' }, [
          temTudo ? U.el('span', { class: 'tem', text: usando ? '' : 'tudo seu' })
                  : U.el('span', { class: 'preco', text: custo === 0 ? 'gratis' : U.fichas(custo) }),
          acao
        ])
      ]);
      if (usando) n.setAttribute('data-meu', '');
      vitrine.appendChild(n);
    });
  }

  function vitrineCoringas(vitrine, raiz) {
    var s = CR.save.dados;
    var slots = CR.store.slotsDeCoringa();
    var lista = CR.fx.all('joker');
    if (filtroAtual === 'meus') lista = lista.filter(function (j) { return s.jokers.indexOf(j.id) !== -1; });
    else if (filtroAtual !== 'todos') lista = lista.filter(function (j) { return j.rarity === filtroAtual; });

    vitrine.parentNode.insertBefore(U.el('div', {
      class: 'dica', style: 'font-size:11.5px;color:var(--osso-fosco)',
      text: 'Equipados: ' + s.loadout.length + ' de ' + slots + ' slots. Clique em "equipar" pra montar o loadout.'
    }), vitrine);

    lista.forEach(function (def) {
      var meu = s.jokers.indexOf(def.id) !== -1;
      var eq = s.loadout.indexOf(def.id) !== -1;
      var pe = U.el('div', { class: 'pe' });
      if (meu) {
        pe.appendChild(U.el('span', { class: 'tem', text: 'seu' }));
        pe.appendChild(U.el('button', {
          class: 'equipar', type: 'button', 'data-on': eq ? '1' : '0',
          text: eq ? 'equipado' : 'equipar',
          onclick: function () {
            if (eq) s.loadout.splice(s.loadout.indexOf(def.id), 1);
            else {
              if (s.loadout.length >= CR.store.slotsDeCoringa()) return U.aviso('Sem slot livre. Desequipe outro.', 'ruim');
              s.loadout.push(def.id);
            }
            CR.save.salvar(); CR.sfx.tocar('botao'); loja(raiz);
          }
        }));
      } else {
        pe.appendChild(U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(def.price)) }));
        pe.appendChild(U.el('button', {
          class: 'comprar', type: 'button', text: 'comprar',
          disabled: !CR.store.podeComprar(def.price),
          onclick: function () {
            if (!CR.store.comprar(def.price)) return U.aviso('Fichas de menos.', 'ruim');
            s.jokers.push(def.id);
            if (s.loadout.length < CR.store.slotsDeCoringa()) s.loadout.push(def.id);
            CR.save.salvar(); CR.sfx.tocar('ficha');
            U.aviso(def.name + ' e seu.', 'bom');
            loja(raiz);
          }
        }));
      }
      var n = itemBase(def, pe);
      if (meu) n.setAttribute('data-meu', '');
      vitrine.appendChild(n);
    });
  }

  function vitrinePergaminhos(vitrine, raiz) {
    var s = CR.save.dados;
    vitrine.setAttribute('data-col', '5');

    CR.fx.all('voucher').forEach(function (def) {
      var temBase = s.vouchers.indexOf(def.id) !== -1;
      var temUp = s.vouchers.indexOf(def.id + '+') !== -1;
      var pe = U.el('div', { class: 'pe' });
      if (temUp) pe.appendChild(U.el('span', { class: 'tem', text: def.up.name }));
      else if (temBase) {
        pe.appendChild(U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(def.up.price)) }));
        pe.appendChild(U.el('button', {
          class: 'comprar', type: 'button', text: 'melhorar',
          disabled: !CR.store.podeComprar(def.up.price),
          onclick: function () {
            if (!CR.store.comprar(def.up.price)) return U.aviso('Fichas de menos.', 'ruim');
            s.vouchers.splice(s.vouchers.indexOf(def.id), 1);
            s.vouchers.push(def.id + '+');
            CR.save.salvar(); CR.sfx.tocar('ficha'); loja(raiz);
          }
        }));
      } else {
        pe.appendChild(U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(def.price)) }));
        pe.appendChild(U.el('button', {
          class: 'comprar', type: 'button', text: 'comprar',
          disabled: !CR.store.podeComprar(def.price),
          onclick: function () {
            if (!CR.store.comprar(def.price)) return U.aviso('Fichas de menos.', 'ruim');
            s.vouchers.push(def.id); CR.save.salvar(); CR.sfx.tocar('ficha'); loja(raiz);
          }
        }));
      }
      var n = itemBase(def, pe);
      n.insertBefore(U.el('div', { class: 'txt', style: 'color:var(--verdete)', text: def.up.name + ': ' + def.up.text }), pe);
      if (temBase || temUp) n.setAttribute('data-meu', '');
      vitrine.appendChild(n);
    });

    CR.fx.all('blessing').forEach(function (def) {
      var qtd = s.blessings.filter(function (x) { return x === def.id; }).length;
      var pe = U.el('div', { class: 'pe' }, [
        U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(def.price)) }),
        U.el('button', {
          class: 'comprar', type: 'button', text: qtd ? 'tem ' + qtd : 'comprar',
          disabled: !CR.store.podeComprar(def.price),
          onclick: function () {
            if (!CR.store.comprar(def.price)) return U.aviso('Fichas de menos.', 'ruim');
            s.blessings.push(def.id); CR.save.salvar(); CR.sfx.tocar('ficha'); loja(raiz);
          }
        })
      ]);
      vitrine.appendChild(itemBase(def, pe));
    });

    CR.fx.all('astral').forEach(function (def) {
      var nivel = s.astral[def.id] || 0;
      var preco = def.price * (nivel + 1);
      var pe = U.el('div', { class: 'pe' }, [
        U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(preco)) }),
        U.el('button', {
          class: 'comprar', type: 'button', text: nivel ? 'nivel ' + nivel : 'comprar',
          disabled: !CR.store.podeComprar(preco),
          onclick: function () {
            if (!CR.store.comprar(preco)) return U.aviso('Fichas de menos.', 'ruim');
            s.astral[def.id] = nivel + 1; CR.save.salvar(); CR.sfx.tocar('ficha');
            CR.store.progredir('astralSubiu', 1);
            loja(raiz);
          }
        })
      ]);
      vitrine.appendChild(itemBase(def, pe));
    });
  }

  function vitrineDeck(vitrine, raiz) {
    var s = CR.save.dados;
    vitrine.setAttribute('data-col', '1');
    vitrine.style.gridTemplateColumns = '1fr 250px';

    // Baralho completo, clicavel
    var grade = U.el('div', { class: 'deck-grade' });
    for (var suit = 0; suit < 4; suit++) {
      for (var rank = 1; rank <= 13; rank++) {
        (function (r, su) {
          var chave = r + ':' + su;
          var marca = s.cardMarks[chave] || {};
          var card = D.makeCard(r, su, 0);
          card.seal = marca.seal || null;
          card.edition = marca.edition || null;
          var slot = U.el('button', {
            class: 'slot', type: 'button', html: S.cardFace(card, s.board, false),
            'aria-label': D.rankLabel(r) + ' de ' + D.SUITS[su],
            'data-sel': selDeck === chave ? '' : null,
            onclick: function () { selDeck = chave; CR.sfx.tocar('carta'); loja(raiz); }
          });
          grade.appendChild(slot);
        })(rank, suit);
      }
    }
    var esq = U.chapa('item', [U.el('div', { class: 'txt', text: 'Escolha uma carta do baralho e aplique um selo ou uma melhoria. Cada carta aceita um de cada.' }), grade]);
    vitrine.appendChild(esq);

    var lado = U.el('div', { class: 'deck-lado' });
    lado.appendChild(U.el('h4', { text: 'Deck da partida' }));
    CR.store.DECKS.forEach(function (d) {
      var meu = s.decks.indexOf(d.id) !== -1;
      var ativo = s.deck === d.id;
      lado.appendChild(U.el('div', { class: 'opcao-selo' }, [
        U.el('div', {}, [U.el('b', { text: d.nome }), U.el('div', { style: 'color:var(--osso-fosco)', text: d.efeito })]),
        U.el('button', {
          class: meu ? 'equipar' : 'comprar', type: 'button',
          'data-on': ativo ? '1' : '0',
          text: ativo ? 'em uso' : meu ? 'usar' : U.fichas(CR.store.preco(d.preco)),
          disabled: !meu && !CR.store.podeComprar(d.preco),
          onclick: function () {
            if (!meu) {
              if (!CR.store.comprar(d.preco)) return U.aviso('Fichas de menos.', 'ruim');
              s.decks.push(d.id);
            }
            s.deck = d.id; CR.save.salvar(); CR.sfx.tocar('ficha'); loja(raiz);
          }
        })
      ]));
    });

    if (selDeck) {
      var marca = s.cardMarks[selDeck] || {};
      lado.appendChild(U.el('h4', { text: 'Carta ' + D.rankLabel(+selDeck.split(':')[0]) + ' de ' + D.SUITS[+selDeck.split(':')[1]] }));
      CR.seals.list().concat(CR.seals.editions()).forEach(function (def) {
        var tipo = def.kind === 'seal' ? 'seal' : 'edition';
        var aplicado = marca[tipo] === def.id;
        lado.appendChild(U.el('div', { class: 'opcao-selo' }, [
          U.el('div', {}, [U.el('b', { text: def.name }), U.el('div', { style: 'color:var(--osso-fosco)', text: def.text })]),
          U.el('button', {
            class: aplicado ? 'equipar' : 'comprar', type: 'button',
            'data-on': aplicado ? '1' : '0',
            text: aplicado ? 'tirar' : U.fichas(CR.store.preco(def.price)),
            disabled: !aplicado && !CR.store.podeComprar(def.price),
            onclick: function () {
              s.cardMarks[selDeck] = s.cardMarks[selDeck] || {};
              if (aplicado) { delete s.cardMarks[selDeck][tipo]; }
              else {
                if (!CR.store.comprar(def.price)) return U.aviso('Fichas de menos.', 'ruim');
                s.cardMarks[selDeck][tipo] = def.id;
              }
              CR.save.salvar(); CR.sfx.tocar('ficha'); loja(raiz);
            }
          })
        ]));
      });
    }
    vitrine.appendChild(lado);
  }

  function vitrineCosmeticos(vitrine, raiz) {
    var s = CR.save.dados;

    CR.themes.list.forEach(function (t) {
      var meu = s.boards.indexOf(t.id) !== -1;
      var ativo = s.board === t.id;
      var amostra = U.el('div', { class: 'amostra' });
      amostra.style.background = 'linear-gradient(160deg,' + t.felt[0] + ',' + t.felt[1] + ')';
      amostra.style.backgroundImage = S.feltTexture(t.id);
      amostra.style.backgroundColor = t.felt[1];
      var mini = U.el('div', { class: 'mini-cartas' });
      mini.innerHTML = S.cardBack(t.id) +
        S.cardFace({ rank: 1, suit: 1, red: true, id: 'x' }, t.id, false) +
        S.cardFace({ rank: 13, suit: 3, red: false, id: 'y' }, t.id, true);
      amostra.appendChild(mini);

      var pe = U.el('div', { class: 'pe' }, [
        meu ? U.el('span', { class: 'tem', text: ativo ? 'em uso' : 'seu' })
            : U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(t.price)) }),
        U.el('button', {
          class: meu ? 'equipar' : 'comprar', type: 'button', 'data-on': ativo ? '1' : '0',
          text: ativo ? 'na mesa' : meu ? 'usar' : 'comprar',
          disabled: (!meu && !CR.store.podeComprar(t.price)) || ativo,
          onclick: function () {
            if (!meu) {
              if (!CR.store.comprar(t.price)) return U.aviso('Fichas de menos.', 'ruim');
              s.boards.push(t.id);
            }
            s.board = t.id; CR.save.salvar(); CR.sfx.tocar('ficha');
            CR.themes.apply(t.id);
            U.aviso('Tabuleiro ' + t.name + ' na mesa.', 'bom');
            loja(raiz);
          }
        })
      ]);
      var n = U.chapa('item tabuleiro-item', [
        amostra,
        U.el('h4', { text: t.name }),
        U.el('div', { class: 'txt', text: t.tagline }),
        pe
      ]);
      if (meu) n.setAttribute('data-meu', '');
      vitrine.appendChild(n);
    });

    var grupos = { bater: 'Animacao de batida', moldura: 'Moldura de avatar', ui: 'Tema da interface', som: 'Som de batida' };
    Object.keys(grupos).forEach(function (tipo) {
      vitrine.appendChild(U.el('div', {
        style: 'grid-column:1/-1;font-family:var(--display);font-size:16px;color:var(--latao);margin-top:6px',
        text: grupos[tipo]
      }));
      CR.store.COSMETICOS.filter(function (c) { return c.tipo === tipo; }).forEach(function (c) {
        var meu = s.cosmeticos.indexOf(c.id) !== -1;
        var ativo = s.equipado[tipo] === c.id;
        var n = U.chapa('item', [
          U.el('h4', { style: 'font-family:var(--display);font-size:15px', text: c.nome }),
          U.el('div', { class: 'txt', text: c.diz }),
          U.el('div', { class: 'pe' }, [
            meu ? U.el('span', { class: 'tem', text: ativo ? 'em uso' : 'seu' })
                : U.el('span', { class: 'preco', text: U.fichas(CR.store.preco(c.preco)) }),
            U.el('button', {
              class: meu ? 'equipar' : 'comprar', type: 'button', 'data-on': ativo ? '1' : '0',
              text: ativo ? 'ativo' : meu ? 'usar' : 'comprar', disabled: ativo || (!meu && !CR.store.podeComprar(c.preco)),
              onclick: function () {
                if (!meu) {
                  if (!CR.store.comprar(c.preco)) return U.aviso('Fichas de menos.', 'ruim');
                  s.cosmeticos.push(c.id);
                }
                s.equipado[tipo] = c.id; CR.save.salvar();
                if (tipo === 'som') CR.sfx.tocar(c.id); else CR.sfx.tocar('ficha');
                if (tipo === 'ui') document.documentElement.setAttribute('data-ui', c.id);
                loja(raiz);
              }
            })
          ])
        ]);
        if (meu) n.setAttribute('data-meu', '');
        vitrine.appendChild(n);
      });
    });
  }

  /* ============================================================ desafios */

  function desafios(raiz) {
    U.limpa(raiz);
    var cab = U.el('div', { class: 'cabeca' }, [U.chapa('voltar', ['Voltar']), U.el('h2', { text: 'Desafios do dia' })]);
    cab.firstChild.addEventListener('click', function () { CR.app.ir('menu'); });
    raiz.appendChild(cab);
    raiz.appendChild(U.el('p', { style: 'font-size:13px;color:var(--osso-fosco);margin:6px 0 12px', text: 'Tres tarefas novas todo dia. Valem fichas na hora que fecham.' }));
    var lista = U.el('div', { class: 'desafios' });
    CR.store.desafiosDeHoje().forEach(function (d) {
      var pct = Math.round(Math.min(1, d.progresso / d.meta) * 100);
      lista.appendChild(U.chapa('desafio' + (d.feito ? '' : ''), [
        U.el('div', {}, [
          U.el('div', { class: 'alvo', text: d.diz }),
          U.el('div', { class: 'barra' }, [U.el('i', { style: 'width:' + pct + '%' })]),
          U.el('div', { style: 'font-size:11px;color:var(--osso-fosco);margin-top:3px', text: d.feito ? 'fechado' : d.progresso + ' de ' + d.meta })
        ]),
        U.el('div', { class: 'valor fichas', text: U.fichas(d.premio) })
      ]));
      if (d.feito) lista.lastChild.setAttribute('data-feito', '');
    });
    raiz.appendChild(lista);
  }

  /* =============================================================== ajuda */

  function ajuda(raiz) {
    U.limpa(raiz);
    raiz.className = 'tela texto-col';
    var cab = U.el('div', { class: 'cabeca' }, [U.chapa('voltar', ['Voltar']), U.el('h2', { text: 'Como se joga' })]);
    cab.firstChild.addEventListener('click', function () { CR.app.ir('menu'); });
    raiz.appendChild(cab);

    var passos = [
      ['Compre', 'No comeco da sua vez voce tira uma carta: do maco ou a de cima da lixeira.'],
      ['Monte', 'Voce quer fechar tres combinacoes com as nove cartas da mao.'],
      ['Descarte', 'Escolha uma carta e jogue na lixeira. A vez passa pra esquerda.'],
      ['Bata', 'Fechou as tres? Bate antes de descartar. Todo mundo perde vida.']
    ];
    var blocoPassos = U.el('div');
    passos.forEach(function (p, i) {
      blocoPassos.appendChild(U.el('div', { class: 'passo' }, [
        U.el('b', { text: String(i + 1) }),
        U.el('div', {}, [U.el('b', { style: 'font-family:var(--ui);font-size:14px;color:var(--osso)', text: p[0] }), U.el('p', { text: p[1] })])
      ]));
    });
    raiz.appendChild(U.el('h3', { text: 'A vez, em quatro passos' }));
    raiz.appendChild(blocoPassos);

    raiz.appendChild(U.el('h3', { text: 'O que conta como combinacao' }));
    raiz.appendChild(U.el('p', { text: 'Trinca: tres cartas do mesmo valor em naipes diferentes. Da pra dobrar um naipe ja presente pra virar quatro ou cinco.' }));
    raiz.appendChild(U.el('p', { text: 'Sequencia: tres ou mais do mesmo naipe em ordem. O As vale 1 (A-2-3) ou 14 (Q-K-A). K-A-2 nao vale.' }));

    raiz.appendChild(U.el('h3', { text: 'A Vira e o curinga' }));
    raiz.appendChild(U.el('p', { text: 'A carta virada ao lado do maco define o curinga da rodada: o valor imediatamente acima dela, na mesma cor. Vira 8 de paus, curingas sao os 9 pretos. Vira um rei, curinga e o as da mesma cor. So um curinga por combinacao, e combinacao so de curinga nao vale.' }));

    raiz.appendChild(U.el('h3', { text: 'Ta na boa, furar a fila e queimar' }));
    raiz.appendChild(U.el('p', { text: 'Quando falta uma carta so, voce pode declarar "ta na boa". A partir dai voce pode interceptar o descarte de qualquer um, fora da sua vez, pra bater na hora. Se a carta nao servir, voce queima: perde o direito de furar pelo resto da rodada. Declarar sem estar na boa e blefe (pifar) — serve pra assustar quem descarta.' }));

    raiz.appendChild(U.el('h3', { text: 'Vidas' }));
    raiz.appendChild(U.el('ul', {}, [
      U.el('li', { text: 'Bateu com 9: todo mundo perde 1 vida.' }),
      U.el('li', { text: 'Bateu com 10 (uma combinacao com ponta): todo mundo perde 2.' }),
      U.el('li', { text: 'Mao batida (ja veio fechada na distribuicao): todo mundo perde 3.' }),
      U.el('li', { text: 'Batida com tudo do mesmo naipe: 2 vidas e 50 fichas de bonus.' }),
      U.el('li', { text: 'Zerou as vidas, saiu da mesa. Ultimo de pe leva.' })
    ]));

    raiz.appendChild(U.el('h3', { text: 'Os poderes' }));
    raiz.appendChild(U.el('p', { text: 'Coringas Especiais ficam em slots proprios e valem a partida inteira. Bencaos sao de uso unico, no comeco do seu turno. Astrais melhoram um tipo de combinacao pra sempre. Pergaminhos valem a sessao. Selos e melhorias grudam em cartas especificas do seu baralho. Tudo se compra com ficha ganha jogando.' }));
  }

  /* ============================================================= ajustes */

  function ajustes(raiz) {
    U.limpa(raiz);
    raiz.className = 'tela texto-col';
    var s = CR.save.dados;
    var cab = U.el('div', { class: 'cabeca' }, [U.chapa('voltar', ['Voltar']), U.el('h2', { text: 'Ajustes' })]);
    cab.firstChild.addEventListener('click', function () { CR.app.ir('menu'); });
    raiz.appendChild(cab);

    raiz.appendChild(linhaAjuste('Seu nome', 'Aparece na mesa e no placar.',
      U.el('input', {
        value: s.nome, maxlength: 16, style: 'background:rgba(0,0,0,.3);border:1px solid rgba(242,230,206,.2);color:var(--osso);padding:6px 9px;border-radius:2px;font:inherit',
        oninput: function (e) { s.nome = e.target.value; CR.save.salvar(); }
      })));

    raiz.appendChild(linhaAjuste('Som', 'Efeitos de carta, ficha e batida.',
      U.pilha([{ rot: 'Ligado', v: true }, { rot: 'Mudo', v: false }], s.opcoes.som, function (v) {
        s.opcoes.som = v; CR.sfx.ligado = v; CR.save.salvar();
      })));

    raiz.appendChild(linhaAjuste('Naipes classicos', 'Usa ouros, copas, paus e espadas mesmo com tabuleiro tematico.',
      U.pilha([{ rot: 'Tematicos', v: false }, { rot: 'Classicos', v: true }], s.opcoes.naipesClassicos, function (v) {
        s.opcoes.naipesClassicos = v; CR.save.salvar();
      })));

    raiz.appendChild(linhaAjuste('Medidor de mao', 'Mostra quantas cartas ainda servem pra voce.',
      U.pilha([{ rot: 'Mostrar', v: true }, { rot: 'Esconder', v: false }], s.opcoes.dica, function (v) {
        s.opcoes.dica = v; CR.save.salvar();
      })));

    raiz.appendChild(U.el('h3', { text: 'Progresso' }));
    raiz.appendChild(U.el('p', {
      text: s.stats.partidas + ' partidas, ' + s.stats.vitorias + ' vitorias, ' + s.stats.batidas +
        ' batidas, ' + U.fichas(s.stats.fichasTotais) + ' ganhos no total.'
    }));
    raiz.appendChild(U.el('button', {
      class: 'comprar', style: 'margin-top:10px;background:var(--esmalte);color:#fff3ea', type: 'button',
      text: 'Apagar tudo e recomecar',
      onclick: function () {
        U.sobrepor('Apagar o progresso?', 'Fichas, coringas, tabuleiros e estatisticas somem. Nao tem volta.',
          [{ rot: 'Deixa quieto' }, {
            rot: 'Apagar', tipo: 'sim', acao: function () {
              CR.save.zerar(); U.aviso('Progresso apagado.', 'ruim'); CR.app.ir('menu');
            }
          }]);
      }
    }));
  }

  function linhaAjuste(rot, sub, controle) {
    return U.el('div', { class: 'ajuste' }, [
      U.el('div', { class: 'rot' }, [document.createTextNode(rot), U.el('small', { text: sub })]),
      controle
    ]);
  }

  /* =========================================================== hot-seat */

  function passaVez(raiz, jogador, aoConfirmar) {
    U.limpa(raiz);
    var caixa = U.chapa('passa-caixa chapa--latao', [
      U.el('div', { style: 'font-size:12px;color:var(--osso-fosco)', text: 'Passa o aparelho' }),
      U.el('div', { class: 'quem', text: jogador.name }),
      U.el('div', { class: 'aviso', text: 'So aperte quando o aparelho estiver na mao certa. As cartas do jogador anterior estao escondidas.' }),
      U.el('button', { class: 'botao-grande', type: 'button', text: 'Estou pronto', disabled: true })
    ]);
    var contagem = U.el('div', { class: 'contagem', text: 'libera em 3' });
    caixa.appendChild(contagem);
    raiz.appendChild(caixa);
    var botao = caixa.querySelector('button');
    var resta = 3;
    var t = setInterval(function () {
      resta--;
      if (resta <= 0) {
        clearInterval(t);
        botao.disabled = false;
        contagem.textContent = 'pode abrir';
        botao.focus();
      } else contagem.textContent = 'libera em ' + resta;
    }, 1000);
    botao.addEventListener('click', function () { clearInterval(t); CR.sfx.tocar('botao'); aoConfirmar(); });
  }

  /* ============================================================ fim de jogo */

  function fim(raiz, jogo, ganhos) {
    U.limpa(raiz);
    var champ = jogo.champion;
    var ordenado = jogo.players.slice().sort(function (a, b) {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.lives - a.lives;
    });
    var caixa = U.chapa('fim-caixa chapa--latao', [
      U.el('h2', { text: champ ? champ.name + ' levou a mesa' : 'Mesa encerrada' }),
      U.el('p', { style: 'color:var(--osso-fosco);font-size:13px;margin-bottom:10px', text: jogo.roundNo + ' rodadas jogadas.' })
    ]);
    ordenado.forEach(function (p, i) {
      caixa.appendChild(U.el('div', { class: 'fim-linha' }, [
        U.el('span', { class: 'pos', text: String(i + 1) }),
        U.el('span', { text: p.name + (p.isBot ? ' (' + p.botLevel + ')' : '') }),
        U.el('span', { style: 'color:var(--osso-fosco);font-size:12px', text: p.alive ? p.lives + ' vidas' : 'eliminado' }),
        U.el('span', { class: 'ganho fichas', text: '+' + U.fichas(p.chips) })
      ]));
    });
    caixa.appendChild(U.el('div', {
      style: 'margin-top:14px;font-size:13px;color:var(--latao)',
      text: 'Voce levou ' + U.fichas(ganhos) + ' pra carteira.'
    }));
    caixa.appendChild(U.el('div', { class: 'botoes', style: 'display:flex;gap:9px;margin-top:14px' }, [
      U.el('button', { class: 'botao-grande', type: 'button', text: 'Jogar de novo', onclick: function () { CR.app.irParaLobby(); } }),
      U.el('button', { class: 'comprar', style: 'padding:13px 22px', type: 'button', text: 'Lojinha', onclick: function () { CR.app.ir('loja'); } }),
      U.el('button', { class: 'equipar', style: 'padding:13px 22px', type: 'button', text: 'Menu', onclick: function () { CR.app.ir('menu'); } })
    ]));
    raiz.appendChild(caixa);
  }

  CR.screens = {
    splash: splash, menu: menu, lobby: lobby, loja: loja, desafios: desafios,
    ajuda: ajuda, ajustes: ajustes, passaVez: passaVez, fim: fim,
    get cfg() { return cfg; }
  };
})(window.CR = window.CR || {});
