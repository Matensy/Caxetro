/* Caxeta Royale — salas na rede local: criar, entrar pelo codigo e esperar a mesa encher. */
(function (CR) {
  'use strict';
  var U = CR.ui;

  var enderecoServidor = '';   // so usado quando a pagina vem de file:// (APK)
  var equipamentos = {};       // peer -> equipamento que o aparelho leva
  var botsDaSala = [];         // bots que o dono adicionou
  var cfgSala = null;
  var jaLigado = false;

  function cfgPadraoSala() {
    return {
      modo: 'campeonato', vidas: 7, timer: 30,
      coringas: true, bencoes: true, pergaminhos: true,
      curingasPorCombo: 1, kA2: false, cadeiras: []
    };
  }

  /* ------------------------------------------------------------- tela */

  function sala(raiz) {
    U.limpa(raiz);
    if (!cfgSala) cfgSala = cfgPadraoSala();
    ligarUmaVez();

    var cab = U.el('div', { class: 'cabeca' }, [U.chapa('voltar', ['Voltar']), U.el('h2', { text: 'Jogar no wifi' })]);
    cab.firstChild.addEventListener('click', function () {
      if (CR.lan.ligado) return confirmarSaida();
      CR.app.ir('menu');
    });
    raiz.appendChild(cab);

    if (CR.lan.ligado) desenharEspera(raiz);
    else desenharEntrada(raiz);
  }

  function ligarUmaVez() {
    if (jaLigado) return;
    jaLigado = true;
    CR.lan.on('sala', function () {
      if (U.telaAtual === 'sala') sala(document.getElementById('tela-sala'));
      // Cada aparelho anuncia o que leva pra mesa sempre que a sala muda.
      if (CR.lan.sessao && !CR.lan.sessao.dono) mandarEquipamento();
    });
    CR.lan.on('equipamento', function (d, de) { equipamentos[de] = d; });
    CR.lan.on('comecar', receberComeco);
    CR.lan.on('sala-fechada', function () {
      botsDaSala = []; equipamentos = {};
      if (U.telaAtual === 'sala') sala(document.getElementById('tela-sala'));
    });
    CR.lan.on('instavel', function () {
      U.aviso('Conexao com a sala oscilando. Tentando de novo...', 'ruim');
    });
  }

  function mandarEquipamento() {
    var classico = cfgSala && cfgSala.modo === 'classico';
    CR.lan.enviar('equipamento', CR.app.meuEquipamento(classico));
  }

  /* --------------------------------------------------------- entrada */

  function desenharEntrada(raiz) {
    var s = CR.save.dados;
    var precisa = CR.lan.precisaEndereco();

    var campoEndereco = precisa ? U.el('label', { class: 'campo' }, [
      U.el('span', { text: 'Endereco do aparelho que abriu a sala' }),
      U.el('input', {
        value: enderecoServidor, placeholder: 'http://192.168.0.10:8080', inputmode: 'url',
        oninput: function (e) { enderecoServidor = e.target.value.trim(); }
      })
    ]) : null;

    var nome = U.el('input', {
      value: s.nome || 'Voce', maxlength: 16, 'aria-label': 'Seu nome',
      oninput: function (e) { s.nome = e.target.value; CR.save.salvar(); }
    });

    var criar = U.chapa('sala-cartao', [
      U.el('h3', { text: 'Abrir uma mesa' }),
      U.el('p', { text: 'Seu aparelho vira o dono da mesa. Os outros entram com o codigo que aparece aqui.' }),
      U.el('label', { class: 'campo' }, [U.el('span', { text: 'Seu nome' }), nome]),
      campoEndereco,
      U.el('button', {
        class: 'botao-grande', type: 'button', text: 'Abrir mesa',
        onclick: function () {
          CR.sfx.tocar('botao');
          CR.lan.criar(nome.value, enderecoServidor)
            .then(function () { sala(raiz); })
            .catch(function (e) { U.aviso('Nao consegui abrir: ' + e.message, 'ruim'); });
        }
      })
    ]);

    var codigo = U.el('input', {
      maxlength: 4, placeholder: 'ABCD', class: 'codigo-campo',
      'aria-label': 'Codigo da sala', autocapitalize: 'characters',
      oninput: function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }
    });
    var nome2 = U.el('input', {
      value: s.nome || 'Voce', maxlength: 16, 'aria-label': 'Seu nome',
      oninput: function (e) { s.nome = e.target.value; CR.save.salvar(); }
    });
    var campoEndereco2 = precisa ? U.el('label', { class: 'campo' }, [
      U.el('span', { text: 'Endereco do aparelho que abriu a sala' }),
      U.el('input', {
        value: enderecoServidor, placeholder: 'http://192.168.0.10:8080', inputmode: 'url',
        oninput: function (e) { enderecoServidor = e.target.value.trim(); }
      })
    ]) : null;

    var entrar = U.chapa('sala-cartao', [
      U.el('h3', { text: 'Entrar numa mesa' }),
      U.el('p', { text: 'Peça o codigo de quatro letras pra quem abriu a mesa. Voces precisam estar no mesmo wifi.' }),
      U.el('label', { class: 'campo' }, [U.el('span', { text: 'Codigo' }), codigo]),
      U.el('label', { class: 'campo' }, [U.el('span', { text: 'Seu nome' }), nome2]),
      campoEndereco2,
      U.el('button', {
        class: 'botao-grande', type: 'button', text: 'Entrar',
        onclick: function () {
          if (codigo.value.length !== 4) return U.aviso('O codigo tem quatro letras.', 'ruim');
          CR.sfx.tocar('botao');
          CR.lan.entrar(codigo.value, nome2.value, enderecoServidor)
            .then(function () { sala(raiz); })
            .catch(function (e) { U.aviso(e.message, 'ruim'); });
        }
      })
    ]);

    raiz.appendChild(U.el('div', { class: 'sala-grade' }, [criar, entrar]));
    raiz.appendChild(U.el('p', {
      class: 'sala-rodape',
      text: 'Tudo acontece dentro da sua rede: nada sai pra internet e nao precisa de conta.'
    }));
  }

  /* ----------------------------------------------------------- espera */

  function desenharEspera(raiz) {
    var ses = CR.lan.sessao;
    var lista = CR.lan.sala;
    var dono = ses.dono;

    var painel = U.chapa('sala-codigo chapa--latao', [
      U.el('div', { class: 'rot', text: 'Codigo da mesa' }),
      U.el('div', { class: 'codigo', text: ses.codigo })
    ]);

    var caixaEnd = U.el('div', { class: 'enderecos', text: 'procurando o endereco...' });
    var comoEntrar = U.el('div', { class: 'como-entrar' }, [
      U.el('div', { class: 'passo-txt', text: 'Como os outros entram:' }),
      U.el('ol', { class: 'receita' }, [
        U.el('li', {}, [U.el('b', { text: '1' }),
          U.el('span', { html: 'Conecte todo mundo no <em>mesmo wifi</em> que este aparelho.' })]),
        U.el('li', {}, [U.el('b', { text: '2' }),
          U.el('span', { html: 'No celular de cada um, abra este endereco no navegador:' })]),
        U.el('li', {}, [U.el('b', { text: '3' }),
          U.el('span', { html: 'La dentro: <em>Jogar no wifi</em>, <em>Entrar numa mesa</em> e digite <em>' +
            ses.codigo + '</em>.' })])
      ])
    ]);
    comoEntrar.querySelectorAll('li')[1].lastChild.appendChild(caixaEnd);
    CR.lan.enderecos().then(function (lista2) {
      U.limpa(caixaEnd);
      if (!lista2.length) {
        caixaEnd.appendChild(U.el('span', { text: 'Use o IP deste aparelho na rede, com a porta 8080.' }));
        return;
      }
      lista2.forEach(function (e) { caixaEnd.appendChild(U.el('code', { text: e })); });
    });

    var jogadores = U.el('div', { class: 'sala-jogadores' });
    lista.forEach(function (j, i) {
      jogadores.appendChild(U.el('div', { class: 'sala-jog' + (j.id === ses.peer ? ' eu' : '') }, [
        U.el('span', { class: 'n', text: String(i + 1) }),
        U.el('span', { class: 'nome', text: j.nome }),
        U.el('span', { class: 'papel', text: j.dono ? 'dono da mesa' : (j.id === ses.peer ? 'voce' : 'pronto') })
      ]));
    });
    botsDaSala.forEach(function (b, i) {
      jogadores.appendChild(U.el('div', { class: 'sala-jog bot' }, [
        U.el('span', { class: 'n', text: String(lista.length + i + 1) }),
        U.el('span', { class: 'nome', text: b.nome }),
        dono ? U.el('button', {
          class: 'papel troca', type: 'button', text: b.nivel,
          onclick: function () {
            b.nivel = b.nivel === 'iniciante' ? 'normal' : b.nivel === 'normal' ? 'dificil' : 'iniciante';
            sala(raiz);
          }
        }) : U.el('span', { class: 'papel', text: b.nivel })
      ]));
      if (dono) {
        jogadores.lastChild.appendChild(U.el('button', {
          class: 'papel troca', type: 'button', text: 'sai',
          onclick: function () { botsDaSala.splice(i, 1); sala(raiz); }
        }));
      }
    });

    var esq = U.el('div', { class: 'sala-col' }, [painel, comoEntrar]);
    var dir = U.chapa('sala-col sala-lista', [
      U.el('h3', { text: 'Na mesa (' + (lista.length + botsDaSala.length) + ' de 5)' }),
      jogadores
    ]);

    if (dono) {
      dir.appendChild(U.el('button', {
        class: 'equipar', style: 'margin-top:8px;padding:6px 12px', type: 'button', text: '+ bot',
        onclick: function () {
          if (lista.length + botsDaSala.length >= 5) return U.aviso('A mesa comporta cinco.', 'ruim');
          botsDaSala.push({ nome: 'Bot ' + (botsDaSala.length + 1), nivel: 'normal' });
          sala(raiz);
        }
      }));
      dir.appendChild(U.el('h3', { text: 'Regras', style: 'margin-top:12px' }));
      var ops = U.el('div', { class: 'opcoes' });
      ops.appendChild(U.opcao('Modo', [
        { rot: 'Classico', v: 'classico' }, { rot: 'Campeonato', v: 'campeonato' },
        { rot: 'Rapida', v: 'rapida' }, { rot: 'Cachetao', v: 'cachetao' }
      ], cfgSala.modo, function (v) {
        cfgSala.modo = v;
        if (v === 'classico') { cfgSala.coringas = false; cfgSala.bencoes = false; cfgSala.pergaminhos = false; }
        else { cfgSala.coringas = true; cfgSala.bencoes = true; cfgSala.pergaminhos = true; }
      }));
      ops.appendChild(U.opcao('Vidas', [
        { rot: '5', v: 5 }, { rot: '7', v: 7 }, { rot: '10', v: 10 }
      ], cfgSala.vidas, function (v) { cfgSala.vidas = v; }));
      ops.appendChild(U.opcao('Tempo por vez', [
        { rot: 'Sem', v: 0 }, { rot: '30s', v: 30 }, { rot: '60s', v: 60 }
      ], cfgSala.timer, function (v) { cfgSala.timer = v; }));
      dir.appendChild(ops);
    } else {
      dir.appendChild(U.el('p', { class: 'sala-espera-txt', text: 'Esperando ' +
        (lista.filter(function (j) { return j.dono; })[0] || { nome: 'o dono' }).nome + ' comecar a mesa.' }));
    }

    raiz.appendChild(U.el('div', { class: 'sala-grade' }, [esq, dir]));

    var pe = U.el('div', { class: 'lobby-pe' }, [
      U.el('button', {
        class: 'voltar chapa', style: 'padding:9px 16px', type: 'button',
        text: dono ? 'Fechar a mesa' : 'Sair da mesa',
        onclick: confirmarSaida
      })
    ]);
    if (dono) {
      var total = lista.length + botsDaSala.length;
      pe.appendChild(U.el('button', {
        class: 'botao-grande', type: 'button', text: 'Comecar',
        disabled: total < 2,
        onclick: comecar
      }));
      if (total < 2) pe.insertBefore(U.el('span', { class: 'dica', text: 'Faltam jogadores: a mesa abre com dois.' }), pe.lastChild);
    }
    raiz.appendChild(pe);
  }

  function confirmarSaida() {
    var dono = CR.lan.sessao && CR.lan.sessao.dono;
    U.sobrepor(dono ? 'Fechar a mesa?' : 'Sair da mesa?',
      dono ? 'Todo mundo volta pro menu.' : 'Voce pode entrar de novo com o mesmo codigo.',
      [{ rot: 'Ficar' }, {
        rot: dono ? 'Fechar' : 'Sair', tipo: 'sim', acao: function () {
          CR.online.encerrar();
          CR.lan.sair();
          botsDaSala = []; equipamentos = {};
          CR.app.ir('menu');
        }
      }]);
  }

  /* ---------------------------------------------------------- comecar */

  function montarAssentos() {
    var lista = CR.lan.sala;
    var ses = CR.lan.sessao;
    var out = lista.map(function (j) {
      return {
        peer: j.id, nome: j.nome, bot: false,
        equipamento: j.id === ses.peer
          ? CR.app.meuEquipamento(cfgSala.modo === 'classico')
          : (cfgSala.modo === 'classico' ? null : equipamentos[j.id] || null)
      };
    });
    botsDaSala.forEach(function (b) {
      out.push({ peer: null, nome: b.nome, bot: true, nivel: b.nivel, equipamento: null });
    });
    return out;
  }

  function comecar() {
    var assentos = montarAssentos();
    if (assentos.length < 2) return U.aviso('A mesa abre com dois jogadores.', 'ruim');
    var board = CR.save.dados.board;
    CR.sfx.tocar('botao');

    // Avisa a mesa antes de comecar, pra todo mundo abrir a tela junto.
    CR.lan.enviar('comecar', {
      cfg: cfgSala, board: board,
      assentos: assentos.map(function (a) {
        return { peer: a.peer, nome: a.nome, bot: a.bot, nivel: a.nivel };
      })
    });

    var jogo = CR.online.abrirComoDono(cfgSala, assentos, board);
    CR.app.jogo = jogo;
    CR.app.cfgAtual = cfgSala;
    var raiz = U.mostrarTela('mesa');
    CR.hud.montar(raiz);
    jogo.start();
    CR.hud.ligar(jogo, board);
    CR.online.mandarRetratos();
    CR.app.tocar();
  }

  function receberComeco(d) {
    if (!CR.lan.sessao || CR.lan.sessao.dono) return;
    cfgSala = d.cfg;
    var jogo = CR.online.abrirComoConvidado(d.board);
    CR.app.jogo = jogo;
    CR.app.cfgAtual = d.cfg;
    var raiz = U.mostrarTela('mesa');
    CR.hud.montar(raiz);
    U.aviso('A mesa comecou.', 'bom');
  }

  CR.salaTela = { sala: sala, get bots() { return botsDaSala; } };
})(window.CR = window.CR || {});
