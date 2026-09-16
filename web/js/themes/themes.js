/* Caxeta Royale — Tabuleiros tematicos.
 * Cada tabuleiro troca o feltro, o verso, a paleta da carta e os quatro naipes.
 * As familias "vermelho" e "preto" sempre existem, porque a regra do curinga
 * (carta acima da Vira, mesma cor) depende de ler a cor no olho.
 */
(function (CR) {
  'use strict';

  function T(o) { return o; }

  var THEMES = [

    T({ id: 'botequim', name: 'Botequim', price: 0,
      tagline: 'Feltro gasto, luz amarela, carta de bar.',
      felt: ['#245243', '#12312a'], pattern: 'weave', rail: '#5b3a22', railInk: '#c79a5c',
      paper: '#f4eddd', ink: '#1e2521', red: '#c0342e', black: '#1e2521',
      back: 'sign', backA: '#1f5346', backB: '#0f2f28', backInk: '#e8c547',
      glow: '#e8c547', fx: 'motes',
      suits: ['ouros', 'copas', 'paus', 'espadas'] }),

    T({ id: 'halloween', name: 'Halloween', price: 350,
      tagline: 'Abobora na janela e morcego no lustre.',
      felt: ['#341a42', '#150a1d'], pattern: 'cobweb', rail: '#4a2a0e', railInk: '#e2711d',
      paper: '#f6e7c8', ink: '#2b1338', red: '#e2711d', black: '#3d1e52',
      back: 'bats', backA: '#3b1c4d', backB: '#1a0c24', backInk: '#ff8a2b',
      glow: '#ff8a2b', fx: 'bats',
      suits: ['abobora', 'coracao_partido', 'aranha', 'caveira'] }),

    T({ id: 'floresta', name: 'Floresta', price: 300,
      tagline: 'Musgo, cogumelo e luz coada entre folhas.',
      felt: ['#2c4c33', '#16281c'], pattern: 'canopy', rail: '#4b3521', railInk: '#9bc53d',
      paper: '#efe6cf', ink: '#22331f', red: '#b43b2e', black: '#2c4a2e',
      back: 'fern', backA: '#2a4a30', backB: '#16281c', backInk: '#9bc53d',
      glow: '#9bc53d', fx: 'leaves',
      suits: ['flor', 'cogumelo', 'pinha', 'folha'] }),

    T({ id: 'natal', name: 'Natalino', price: 350,
      tagline: 'Pinheiro aceso e neve que nao derrete.',
      felt: ['#14483a', '#0a2a21'], pattern: 'knit', rail: '#7a1f22', railInk: '#f0d68a',
      paper: '#fbf3e2', ink: '#153024', red: '#c4152c', black: '#14432f',
      back: 'knit', backA: '#8c2226', backB: '#0f3a2e', backInk: '#f0d68a',
      glow: '#e8c547', fx: 'snow',
      suits: ['estrela', 'sino', 'pinheiro', 'presente'] }),

    T({ id: 'noir', name: 'Noir', price: 400,
      tagline: 'Fumaca, navalha e ninguem olhando nos olhos.',
      felt: ['#232327', '#0d0d10'], pattern: 'plain', rail: '#2a2a2e', railInk: '#9aa3ad',
      paper: '#e4e1da', ink: '#101014', red: '#8e1b21', black: '#101014',
      back: 'smoke', backA: '#1d1d21', backB: '#0a0a0d', backInk: '#8e1b21',
      glow: '#9aa3ad', fx: 'smoke',
      suits: ['rosa_negra', 'coracao_partido', 'fumaca', 'navalha'] }),

    T({ id: 'neon', name: 'Fliperama', price: 450,
      tagline: 'Moeda na maquina, CRT quente, madrugada.',
      felt: ['#1c0640', '#07011a'], pattern: 'grid', rail: '#2b0b4e', railInk: '#2de2e6',
      paper: '#150c28', ink: '#f2e9ff', red: '#ff3e8a', black: '#2de2e6', darkFace: true,
      back: 'grid', backA: '#2b0b4e', backB: '#0d0322', backInk: '#2de2e6',
      glow: '#2de2e6', fx: 'sparks',
      suits: ['pixel_coracao', 'raio', 'chip', 'alien'] }),

    T({ id: 'junino', name: 'Arraia', price: 300,
      tagline: 'Bandeirinha, fogueira e milho na brasa.',
      felt: ['#b23a2e', '#8e2c22'], pattern: 'xadrez', rail: '#6a4a22', railInk: '#f2b705',
      paper: '#fff6de', ink: '#3b2411', red: '#d1402e', black: '#2e5d3a',
      back: 'flags', backA: '#2e5d3a', backB: '#b23a2e', backInk: '#f2b705',
      glow: '#f2b705', fx: 'confetti',
      suits: ['balao', 'fogueira', 'espiga', 'bandeirinha'] }),

    T({ id: 'cosmos', name: 'Cosmos', price: 500,
      tagline: 'Mesa posta no meio de uma nebulosa.',
      felt: ['#1a1548', '#060418'], pattern: 'nebula', rail: '#2a2560', railInk: '#b0a0ff',
      paper: '#120e2e', ink: '#e8e6ff', red: '#ff7a59', black: '#6c7bff', darkFace: true,
      back: 'stars', backA: '#241e5c', backB: '#0a0722', backInk: '#b0a0ff',
      glow: '#b0a0ff', fx: 'stars',
      suits: ['cometa', 'estrela8', 'planeta', 'lua'] }),

    T({ id: 'mar', name: 'Fundo do Mar', price: 400,
      tagline: 'Luz que desce torta e som abafado.',
      felt: ['#11485c', '#072430'], pattern: 'ripple', rail: '#14586b', railInk: '#58c6c0',
      paper: '#eaf4f2', ink: '#0d3843', red: '#d4564b', black: '#12505e',
      back: 'scales', backA: '#11485c', backB: '#072430', backInk: '#58c6c0',
      glow: '#58c6c0', fx: 'bubbles',
      suits: ['concha', 'peixe', 'onda', 'ancora'] }),

    T({ id: 'cangaco', name: 'Cangaco', price: 450,
      tagline: 'Couro, caatinga e estrela de oito pontas.',
      felt: ['#8a6b3f', '#5e4529'], pattern: 'cracked', rail: '#4a3418', railInk: '#e0a526',
      paper: '#f1e3c6', ink: '#33301f', red: '#a8362a', black: '#33301f',
      back: 'leather', backA: '#6b5030', backB: '#402d16', backInk: '#e0a526',
      glow: '#e0a526', fx: 'dust',
      suits: ['sol_sertao', 'estrela_couro', 'mandacaru', 'chapeu'] }),

    T({ id: 'azulejo', name: 'Azulejo', price: 400,
      tagline: 'Parede fria de ladrilho, carta de porcelana.',
      felt: ['#e9eef3', '#cfdae5'], pattern: 'azulejo', rail: '#2c4e7a', railInk: '#f6f9fc',
      paper: '#ffffff', ink: '#12325a', red: '#c24b3a', black: '#1e4e8c', light: true,
      back: 'tile', backA: '#1e4e8c', backB: '#12325a', backInk: '#eaf1f8',
      glow: '#1e6fb8', fx: 'motes',
      suits: ['roseta', 'flor_lis', 'quadrifolio', 'caravela'] }),

    T({ id: 'dourado', name: 'Ouro', price: 700,
      tagline: 'Mesa alta, ficha pesada, ninguem de bermuda.',
      felt: ['#221708', '#0c0904'], pattern: 'guilloche', rail: '#8a6a1e', railInk: '#f0dfa8',
      paper: '#1a1409', ink: '#f0dfa8', red: '#e0b23c', black: '#9fa4ab', darkFace: true,
      back: 'guilloche', backA: '#3a2c0c', backB: '#120d04', backInk: '#e8c547',
      glow: '#e8c547', fx: 'motes',
      suits: ['moeda', 'coroa', 'ficha', 'dado'] })
  ];

  var byId = {};
  THEMES.forEach(function (t) { byId[t.id] = t; });

  CR.themes = {
    list: THEMES,
    get: function (id) { return byId[id] || byId.botequim; },
    /** Aplica as variaveis CSS do tabuleiro ao documento. */
    apply: function (id, root) {
      var t = CR.themes.get(id);
      var el = root || document.documentElement;
      el.style.setProperty('--felt-a', t.felt[0]);
      el.style.setProperty('--felt-b', t.felt[1]);
      el.style.setProperty('--rail', t.rail);
      el.style.setProperty('--rail-ink', t.railInk);
      el.style.setProperty('--card-paper', t.paper);
      el.style.setProperty('--card-ink', t.ink);
      el.style.setProperty('--suit-red', t.red);
      el.style.setProperty('--suit-black', t.black);
      el.style.setProperty('--board-glow', t.glow);
      el.setAttribute('data-board', t.id);
      el.setAttribute('data-board-light', t.light ? 'yes' : 'no');
      return t;
    }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
