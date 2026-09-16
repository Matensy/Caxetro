/* Caxeta Royale — Geracao de arte: cartas, versos, feltro e emblemas dos poderes.
 * Tudo e SVG montado na hora e cacheado por chave, pra caber no APK sem bitmaps.
 */
(function (CR) {
  'use strict';
  var D = CR.deck;
  var cache = {};

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function seeded(str) {
    var s = hash(str);
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function dataUri(svg) {
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }

  /* ------------------------------------------------------------- naipes */

  function suitKey(theme, suit) { return theme.suits[suit]; }
  function suitColor(theme, suit) { return D.isRed(suit) ? theme.red : theme.black; }

  /** Glifo do naipe como <svg> pronto pra colocar em qualquer lugar. */
  function suitSvg(theme, suit, size, color) {
    var d = CR.glyphs[suitKey(theme, suit)];
    return '<svg class="glyph" viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" aria-hidden="true"><path d="' + d + '" fill="' + (color || suitColor(theme, suit)) + '"/></svg>';
  }

  /* -------------------------------------------------------------- carta */

  var W = 64, H = 92;

  function corner(theme, card, x, y, flip) {
    var col = suitColor(theme, card.suit);
    var label = D.rankLabel(card.rank);
    var g = CR.glyphs[suitKey(theme, card.suit)];
    var t = flip ? 'rotate(180 ' + x + ' ' + y + ')' : '';
    return '<g transform="' + t + '">' +
      '<text x="' + x + '" y="' + (y + 1) + '" fill="' + col + '" class="rk"' +
      ' font-size="' + (label.length > 1 ? 11 : 13) + '">' + label + '</text>' +
      '<g transform="translate(' + (x - 3.4) + ',' + (y + 2.2) + ') scale(0.068)">' +
      '<path d="' + g + '" fill="' + col + '"/></g></g>';
  }

  /** Face da carta. `wild` desenha o anel de curinga. */
  function cardFace(card, themeId, wild) {
    var theme = CR.themes.get(themeId);
    var key = 'f' + themeId + card.rank + card.suit + (wild ? 'w' : '') + (card.seal || '') + (card.edition || '');
    if (cache[key]) return cache[key];

    var col = suitColor(theme, card.suit);
    var g = CR.glyphs[suitKey(theme, card.suit)];
    var isCourt = card.rank >= 11;
    var isAce = card.rank === 1;
    var mid = '';

    if (isCourt) {
      // Figura: medalhao com a letra grande e o naipe orbitando.
      mid =
        '<circle cx="32" cy="48" r="19" fill="none" stroke="' + col + '" stroke-width="1.1" opacity=".55"/>' +
        '<circle cx="32" cy="48" r="15.5" fill="' + col + '" opacity=".09"/>' +
        '<text x="32" y="55" text-anchor="middle" class="court" fill="' + col + '" font-size="23">' +
        D.rankLabel(card.rank) + '</text>' +
        '<g transform="translate(26,25) scale(0.12)"><path d="' + g + '" fill="' + col + '"/></g>' +
        '<g transform="translate(26,59) scale(0.12)"><path d="' + g + '" fill="' + col + '"/></g>';
    } else if (isAce) {
      mid = '<g transform="translate(13,28) scale(0.38)"><path d="' + g + '" fill="' + col + '"/></g>';
    } else {
      mid = '<g transform="translate(17,32) scale(0.30)"><path d="' + g + '" fill="' + col + '"/></g>';
    }

    var sealMark = card.seal ? sealDot(card.seal) : '';
    var edMark = card.edition ? editionOverlay(card.edition, theme) : '';
    var ring = wild ?
      '<rect x="1.6" y="1.6" width="' + (W - 3.2) + '" height="' + (H - 3.2) + '" rx="6"' +
      ' fill="none" stroke="' + theme.glow + '" stroke-width="2.4" opacity=".95"/>' +
      '<g transform="translate(' + (W - 17) + ',4) scale(0.9)">' +
      '<rect width="13" height="9" rx="2.5" fill="' + theme.glow + '"/>' +
      '<text x="6.5" y="7" text-anchor="middle" font-size="6.4" font-weight="700" fill="' + theme.paper + '">C</text></g>' : '';

    var svg = '<svg class="card-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(D.rankLabel(card.rank) + ' de ' + D.SUITS[card.suit]) + '">' +
      '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) + '" rx="6.5" fill="' + theme.paper + '"/>' +
      '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) + '" rx="6.5" fill="none"' +
      ' stroke="' + theme.ink + '" stroke-opacity=".22" stroke-width="1"/>' +
      edMark + mid + corner(theme, card, 8, 13, false) + corner(theme, card, W - 8, H - 13, true) +
      sealMark + ring + '</svg>';
    cache[key] = svg;
    return svg;
  }

  var SEAL_COLORS = { dourado: '#e8c547', rubi: '#d0352f', safira: '#2f6fd0', esmeralda: '#2fa86a', ametista: '#8a52c9' };
  function sealDot(id) {
    var c = SEAL_COLORS[id] || '#e8c547';
    return '<circle cx="' + (W - 9) + '" cy="11" r="4.2" fill="' + c + '"/>' +
      '<circle cx="' + (W - 9) + '" cy="11" r="4.2" fill="none" stroke="#000" stroke-opacity=".25"/>';
  }

  function editionOverlay(id, theme) {
    if (id === 'selvagem') return '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) +
      '" rx="6.5" fill="' + theme.glow + '" opacity=".13"/>';
    if (id === 'vidro') return '<path d="M8 2 L22 90 M30 2 L46 90" stroke="#9fd8ff" stroke-width="2" opacity=".35" fill="none"/>';
    if (id === 'holografica') return '<defs><linearGradient id="holo" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ff5fa2"/><stop offset=".5" stop-color="#5fe0ff"/><stop offset="1" stop-color="#b6ff5f"/>' +
      '</linearGradient></defs><rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) +
      '" rx="6.5" fill="url(#holo)" opacity=".2"/>';
    if (id === 'negativa') return '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) +
      '" rx="6.5" fill="#0b0b12" opacity=".82"/>';
    if (id === 'aco') return '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) +
      '" rx="5" fill="none" stroke="#9aa3ad" stroke-width="2.4" opacity=".7"/>';
    if (id === 'dourada') return '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6) +
      '" rx="6.5" fill="#e8c547" opacity=".22"/>';
    return '';
  }

  /* -------------------------------------------------------------- verso */

  var BACKS = {
    sign: function (t) {
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' +
        '<rect x="5" y="5" width="54" height="82" rx="4" fill="none" stroke="' + t.backInk + '" stroke-width="1.4" opacity=".8"/>' +
        '<rect x="9" y="9" width="46" height="74" rx="3" fill="' + t.backB + '"/>' +
        '<g fill="' + t.backInk + '" opacity=".85"><circle cx="32" cy="46" r="12" fill="none" stroke="' + t.backInk + '" stroke-width="1.4"/>' +
        '<text x="32" y="51" text-anchor="middle" font-size="13" font-weight="700">CR</text></g>' +
        '<circle cx="10" cy="10" r="1.6" fill="' + t.backInk + '" opacity=".6"/><circle cx="54" cy="10" r="1.6" fill="' + t.backInk + '" opacity=".6"/>' +
        '<circle cx="10" cy="82" r="1.6" fill="' + t.backInk + '" opacity=".6"/><circle cx="54" cy="82" r="1.6" fill="' + t.backInk + '" opacity=".6"/>';
    },
    bats: function (t) { return tiled(t, CR.glyphs.morcego, 0.10, 4, 5); },
    fern: function (t) { return tiled(t, CR.glyphs.folha, 0.11, 4, 5); },
    knit: function (t) {
      var rows = '';
      for (var y = 0; y < 8; y++) for (var x = 0; x < 6; x++)
        rows += '<path d="M' + (4 + x * 10) + ' ' + (8 + y * 11) + ' l5 6 l5 -6" fill="none" stroke="' +
          t.backInk + '" stroke-width="1.6" opacity="' + (y % 2 ? '.55' : '.85') + '"/>';
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + rows +
        '<rect x="4" y="4" width="56" height="84" rx="4.5" fill="none" stroke="' + t.backInk + '" stroke-width="1.2" opacity=".6"/>';
    },
    smoke: function (t) {
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' +
        '<g opacity=".5" fill="none" stroke="' + t.backInk + '" stroke-width="1.3">' +
        '<path d="M8 74c14-6 8-18 0-24s-2-18 10-22"/><path d="M22 80c16-8 10-22 0-28s0-20 12-24"/>' +
        '<path d="M38 82c16-10 12-24 2-30s2-18 14-22"/></g>' +
        '<rect x="4" y="4" width="56" height="84" rx="4.5" fill="none" stroke="' + t.backInk + '" stroke-width="1" opacity=".5"/>';
    },
    grid: function (t) {
      var g = '';
      for (var i = 1; i < 8; i++) g += '<line x1="0" y1="' + i * 11.5 + '" x2="64" y2="' + i * 11.5 + '" stroke="' + t.backInk + '" stroke-width=".6" opacity=".5"/>';
      for (var j = 1; j < 6; j++) g += '<line x1="' + j * 10.6 + '" y1="0" x2="' + j * 10.6 + '" y2="92" stroke="' + t.backInk + '" stroke-width=".6" opacity=".5"/>';
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + g +
        '<circle cx="32" cy="46" r="13" fill="' + t.backB + '" stroke="' + t.backInk + '" stroke-width="1.4"/>' +
        '<text x="32" y="51" text-anchor="middle" font-size="12" font-weight="700" fill="' + t.backInk + '">CR</text>';
    },
    flags: function (t) {
      var f = '';
      for (var r = 0; r < 5; r++) {
        f += '<line x1="2" y1="' + (10 + r * 18) + '" x2="62" y2="' + (14 + r * 18) + '" stroke="' + t.backInk + '" stroke-width=".8"/>';
        for (var c = 0; c < 4; c++) {
          var x = 6 + c * 14, y = 10 + r * 18 + c;
          f += '<path d="M' + x + ' ' + y + 'h10l-5 9z" fill="' + (c % 2 ? t.backInk : t.backB) + '" opacity=".9"/>';
        }
      }
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + f;
    },
    stars: function (t) {
      var r = seeded('stars' + t.id), s = '';
      for (var i = 0; i < 46; i++) {
        s += '<circle cx="' + (r() * 60 + 2).toFixed(1) + '" cy="' + (r() * 88 + 2).toFixed(1) +
          '" r="' + (r() * 1.3 + .3).toFixed(2) + '" fill="' + t.backInk + '" opacity="' + (.3 + r() * .7).toFixed(2) + '"/>';
      }
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + s +
        '<g transform="translate(20,34) scale(0.24)"><path d="' + CR.glyphs.estrela8 + '" fill="' + t.backInk + '" opacity=".9"/></g>';
    },
    scales: function (t) {
      var s = '';
      for (var y = 0; y < 10; y++) for (var x = 0; x < 7; x++)
        s += '<path d="M' + (x * 10 - (y % 2 ? 5 : 0)) + ' ' + (y * 10) + ' a5 5 0 0 0 10 0" fill="none" stroke="' +
          t.backInk + '" stroke-width="1.1" opacity=".55"/>';
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + s;
    },
    leather: function (t) {
      var r = seeded('leather'), s = '';
      for (var i = 0; i < 30; i++)
        s += '<circle cx="' + (r() * 58 + 3).toFixed(1) + '" cy="' + (r() * 86 + 3).toFixed(1) +
          '" r="' + (r() * 3 + 1).toFixed(1) + '" fill="' + t.backInk + '" opacity=".08"/>';
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + s +
        '<rect x="5" y="5" width="54" height="82" rx="4" fill="none" stroke="' + t.backInk +
        '" stroke-width="1.2" stroke-dasharray="4 3" opacity=".8"/>' +
        '<g transform="translate(20,34) scale(0.24)"><path d="' + CR.glyphs.estrela_couro + '" fill="' + t.backInk + '" opacity=".9"/></g>';
    },
    tile: function (t) { return tiled(t, CR.glyphs.quadrifolio, 0.095, 3, 4); },
    guilloche: function (t) {
      var s = '';
      for (var i = 0; i < 9; i++)
        s += '<ellipse cx="32" cy="46" rx="' + (6 + i * 3) + '" ry="' + (10 + i * 4.4) + '" fill="none" stroke="' +
          t.backInk + '" stroke-width=".5" opacity="' + (.65 - i * .05).toFixed(2) + '" transform="rotate(' + (i * 20) + ' 32 46)"/>';
      return '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>' + s +
        '<rect x="4" y="4" width="56" height="84" rx="4.5" fill="none" stroke="' + t.backInk + '" stroke-width="1.2" opacity=".8"/>';
    }
  };

  function tiled(t, path, scale, cols, rows) {
    var s = '<rect width="64" height="92" rx="6.5" fill="' + t.backA + '"/>';
    var dx = 64 / cols, dy = 92 / rows;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var ox = x * dx + (y % 2 ? dx / 2 : 0) - dx * 0.24;
      s += '<g transform="translate(' + ox.toFixed(1) + ',' + (y * dy + 2).toFixed(1) + ') scale(' + scale + ')">' +
        '<path d="' + path + '" fill="' + t.backInk + '" opacity=".6"/></g>';
    }
    return s + '<rect x="3.5" y="3.5" width="57" height="85" rx="5" fill="none" stroke="' + t.backInk + '" stroke-width="1.2" opacity=".85"/>';
  }

  function cardBack(themeId) {
    var key = 'b' + themeId;
    if (cache[key]) return cache[key];
    var t = CR.themes.get(themeId);
    var fn = BACKS[t.back] || BACKS.sign;
    var svg = '<svg class="card-svg" viewBox="0 0 64 92" aria-hidden="true">' + fn(t) + '</svg>';
    cache[key] = svg;
    return svg;
  }

  /* ------------------------------------------------------------- feltro */

  var FELTS = {
    weave: function (t) { return '<rect width="40" height="40" fill="' + t.felt[1] + '"/><path d="M0 0h40v2H0zM0 20h40v2H0zM0 0h2v40H0zM20 0h2v40h-2z" fill="' + t.felt[0] + '" opacity=".5"/>'; },
    cobweb: function (t) { return '<rect width="80" height="80" fill="' + t.felt[1] + '"/><g fill="none" stroke="' + t.felt[0] + '" stroke-width="1" opacity=".55"><path d="M0 0 80 80M80 0 0 80M40 0v80M0 40h80"/><circle cx="40" cy="40" r="14"/><circle cx="40" cy="40" r="26"/></g>'; },
    canopy: function (t) { return '<rect width="70" height="70" fill="' + t.felt[1] + '"/><g fill="' + t.felt[0] + '" opacity=".45"><path d="' + CR.glyphs.folha + '" transform="translate(6,6) scale(0.32)"/><path d="' + CR.glyphs.folha + '" transform="translate(40,36) rotate(150) scale(0.26)"/></g>'; },
    knit: function (t) { return '<rect width="24" height="24" fill="' + t.felt[1] + '"/><path d="M0 12l6 6 6-6 6 6 6-6" fill="none" stroke="' + t.felt[0] + '" stroke-width="2" opacity=".6"/>'; },
    plain: function (t) { return '<rect width="20" height="20" fill="' + t.felt[1] + '"/><circle cx="4" cy="4" r=".8" fill="' + t.felt[0] + '" opacity=".6"/>'; },
    grid: function (t) { return '<rect width="32" height="32" fill="' + t.felt[1] + '"/><path d="M0 0h32M0 0v32" stroke="' + t.felt[0] + '" stroke-width="1.4" opacity=".9"/>'; },
    xadrez: function (t) { return '<rect width="40" height="40" fill="' + t.felt[0] + '"/><path d="M0 0h20v20H0zM20 20h20v20H20z" fill="#f7f0dd" opacity=".82"/>'; },
    nebula: function (t) { return '<rect width="90" height="90" fill="' + t.felt[1] + '"/><circle cx="26" cy="30" r="24" fill="' + t.felt[0] + '" opacity=".5"/><circle cx="66" cy="66" r="18" fill="' + t.felt[0] + '" opacity=".35"/><circle cx="12" cy="74" r="1.4" fill="#fff" opacity=".8"/><circle cx="72" cy="18" r="1.1" fill="#fff" opacity=".7"/>'; },
    ripple: function (t) { return '<rect width="60" height="30" fill="' + t.felt[1] + '"/><path d="M0 20c10-12 20-12 30 0s20 12 30 0" fill="none" stroke="' + t.felt[0] + '" stroke-width="2" opacity=".6"/>'; },
    cracked: function (t) { return '<rect width="60" height="60" fill="' + t.felt[1] + '"/><g fill="none" stroke="' + t.felt[0] + '" stroke-width="1.2" opacity=".55"><path d="M0 14 22 22 40 8 60 18M0 44 18 38 34 52 60 44M22 22 18 38M40 8 34 52"/></g>'; },
    azulejo: function (t) { return '<rect width="48" height="48" fill="' + t.felt[0] + '"/><g fill="' + t.rail + '" opacity=".5"><path d="' + CR.glyphs.quadrifolio + '" transform="translate(9,9) scale(0.3)"/></g><rect width="48" height="48" fill="none" stroke="' + t.rail + '" stroke-opacity=".35"/>'; },
    guilloche: function (t) { return '<rect width="60" height="60" fill="' + t.felt[1] + '"/><g fill="none" stroke="' + t.felt[0] + '" stroke-width=".8" opacity=".8"><circle cx="30" cy="30" r="10"/><circle cx="30" cy="30" r="18"/><circle cx="0" cy="0" r="14"/><circle cx="60" cy="60" r="14"/></g>'; }
  };

  function feltTexture(themeId) {
    var t = CR.themes.get(themeId);
    var fn = FELTS[t.pattern] || FELTS.plain;
    var body = fn(t);
    var m = body.match(/width="(\d+)" height="(\d+)"/);
    var w = m ? m[1] : 40, h = m ? m[2] : 40;
    return dataUri('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' + body + '</svg>');
  }

  /* --------------------------------------------- emblemas dos poderes */

  /** Nome longo nao pode vazar da moldura: 9px cabe ~15 caracteres. */
  function tamanhoNome(nome) {
    var n = (nome || '').length;
    if (n <= 13) return 9;
    if (n <= 16) return 7.8;
    return 6.9;
  }

  var EMBLEM = {
    // Punhal: a ponta pra cima, o cabo embaixo.
    ofensivo: 'M50 4 62 40v22H38V40zM30 62h40v9H30zM44 71h12v25l-6 8-6-8z',
    defensivo: 'M50 6 88 20v30c0 22-16 36-38 44C28 86 12 72 12 50V20Z',
    economico: 'M50 8a42 42 0 110 84 42 42 0 010-84zm0 14a28 28 0 100 56 28 28 0 000-56zm-4 10h8v6h8v8H46v6h12v20h-8v6h-8v-6h-8v-8h16v-6H42V38h4z',
    manipulacao: 'M50 8c24 0 42 18 42 40S74 88 50 88 8 70 8 48c0-14 10-26 24-26s22 10 22 20-8 16-16 16-12-6-12-10h10c0 2 1 3 3 3 3 0 5-3 5-9 0-8-7-14-16-14s-18 8-18 20c0 16 16 28 34 28s32-14 32-28S70 18 50 18Z',
    informacao: 'M50 20c26 0 44 18 48 30-4 12-22 30-48 30S6 62 2 50c4-12 22-30 48-30zm0 12a18 18 0 100 36 18 18 0 000-36zm0 10a8 8 0 110 16 8 8 0 010-16z',
    sorte: 'M50 88c-2-16-6-22-14-26 6 8 6 16 4 22-14-4-22-14-22-26 0-10 8-18 18-18 6 0 10 2 14 6 4-4 8-6 14-6 10 0 18 8 18 18 0 12-8 22-22 26-2-6-2-14 4-22-8 4-12 10-14 26z',
    lendario: 'M10 32l20 16 20-34 20 34 20-16-10 50H20zM18 88h64v8H18z',
    // Bases extras pra bencaos e astrais, que nao tem "tipo" de coringa.
    chave: 'M62 8a30 30 0 110 60 30 30 0 010-60zm0 14a16 16 0 100 32 16 16 0 000-32zM40 50 8 82v10h14v-9h9v-9h9l10-10z',
    ampulheta: 'M18 6h64v10L58 48l24 32v10H18V80l24-32L18 16zm14 14 18 24 18-24zm18 40-18 24h36z',
    chama: 'M50 4c6 18-6 26-6 38 0 8 6 12 10 8 6-6 4-18 0-24 16 12 24 28 24 42 0 18-14 30-28 30S22 86 22 68c0-24 20-38 28-64z',
    onda3: 'M4 34c14-18 26-18 40 0s26 18 40 0v16c-14 18-26 18-40 0s-26-18-40 0zm0 34c14-18 26-18 40 0s26 18 40 0v16c-14 18-26 18-40 0s-26-18-40 0z',
    olho3: 'M50 8 92 82H8Zm0 24L30 70h40z'
  };

  var BASES = Object.keys(EMBLEM);

  /** Coringa usa o emblema do tipo; o resto sorteia um do conjunto pelo id. */
  function baseEmblema(def) {
    if (def.type && EMBLEM[def.type]) return EMBLEM[def.type];
    return EMBLEM[BASES[hash(def.kind + ':' + def.id) % BASES.length]];
  }

  var RARITY = {
    comum: { a: '#5c6470', b: '#2c323b', ink: '#d7dde5', label: 'Comum' },
    incomum: { a: '#2f8f5b', b: '#12built', ink: '#d6ffe7', label: 'Incomum' },
    raro: { a: '#2f6bd0', b: '#14315e', ink: '#d9e8ff', label: 'Raro' },
    lendario: { a: '#e8c547', b: '#7a5a0c', ink: '#fff6d8', label: 'Lendario' }
  };
  RARITY.incomum.b = '#124a2e';

  /** Sigilo procedural: emblema do tipo + anel semeado pelo id. */
  function sigil(def, tint) {
    var r = seeded(def.id);
    var pts = 5 + Math.floor(r() * 7);
    var rad = 34 + r() * 6;
    var rot = r() * 60;
    var ring = '';
    for (var i = 0; i < pts; i++) {
      var a = (i / pts) * Math.PI * 2 + rot;
      var x = 50 + Math.cos(a) * rad, y = 50 + Math.sin(a) * rad;
      var size = 2 + r() * 2.6;
      ring += r() > .5
        ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + size.toFixed(1) + '"/>'
        : '<rect x="' + (x - size).toFixed(1) + '" y="' + (y - size).toFixed(1) + '" width="' + (size * 2).toFixed(1) +
          '" height="' + (size * 2).toFixed(1) + '" transform="rotate(45 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    }
    var rays = '';
    var nrays = 8 + Math.floor(r() * 10);
    for (var k = 0; k < nrays; k++) {
      var ang = (k / nrays) * 360;
      rays += '<rect x="49.2" y="4" width="1.6" height="' + (5 + r() * 7).toFixed(1) +
        '" transform="rotate(' + ang.toFixed(0) + ' 50 50)"/>';
    }
    var base = baseEmblema(def);
    return '<g opacity=".28" fill="' + tint + '">' + rays + '</g>' +
      '<g opacity=".5" fill="' + tint + '">' + ring + '</g>' +
      '<g transform="translate(25,25) scale(0.5)"><path d="' + base + '" fill="' + tint + '"/></g>';
  }

  /** Arte de um Coringa Especial. */
  function jokerArt(def, themeId) {
    var t = CR.themes.get(themeId), rr = RARITY[def.rarity] || RARITY.comum;
    var key = 'j' + def.id + themeId;
    if (cache[key]) return cache[key];
    var svg = '<svg class="power-art" viewBox="0 0 100 130" role="img" aria-label="' + esc(def.name) + '">' +
      '<defs><linearGradient id="g' + def.id + '" x1="0" y1="0" x2=".3" y2="1">' +
      '<stop offset="0" stop-color="' + rr.a + '"/><stop offset="1" stop-color="' + rr.b + '"/></linearGradient></defs>' +
      '<rect width="100" height="130" rx="9" fill="url(#g' + def.id + ')"/>' +
      '<rect x="3" y="3" width="94" height="124" rx="7" fill="none" stroke="' + rr.ink + '" stroke-opacity=".5" stroke-width="1.2"/>' +
      '<rect x="8" y="8" width="84" height="84" rx="5" fill="#000" fill-opacity=".28"/>' +
      '<g transform="translate(8,8) scale(0.84)">' + sigil(def, rr.ink) + '</g>' +
      '<text x="50" y="106" text-anchor="middle" class="pw-name" fill="' + rr.ink + '" font-size="' +
      tamanhoNome(def.name) + '">' + esc(def.name) + '</text>' +
      '<text x="50" y="118" text-anchor="middle" class="pw-rar" fill="' + rr.ink + '" fill-opacity=".72" font-size="6.6">' +
      esc(rr.label + ', ' + def.type) + '</text>' +
      '<g transform="translate(78,100) scale(0.16)"><path d="' + CR.glyphs[t.suits[0]] + '" fill="' + t.glow + '" opacity=".85"/></g>' +
      '</svg>';
    cache[key] = svg;
    return svg;
  }

  /** Arte de uma Carta de Bencao: mandala girada em volta de um emblema. */
  function blessingArt(def, themeId) {
    var t = CR.themes.get(themeId);
    var key = 'bl' + def.id + themeId;
    if (cache[key]) return cache[key];
    var r = seeded('b' + def.id);
    var petals = 6 + Math.floor(r() * 6), mand = '';
    for (var i = 0; i < petals; i++) {
      mand += '<ellipse cx="50" cy="28" rx="' + (5 + r() * 4).toFixed(1) + '" ry="18" transform="rotate(' +
        (i * 360 / petals).toFixed(1) + ' 50 50)"/>';
    }
    var svg = '<svg class="power-art bless" viewBox="0 0 100 130" role="img" aria-label="' + esc(def.name) + '">' +
      '<rect width="100" height="130" rx="9" fill="' + t.felt[1] + '"/>' +
      '<rect x="3" y="3" width="94" height="124" rx="7" fill="none" stroke="' + t.glow + '" stroke-width="1.3" opacity=".9"/>' +
      '<g fill="' + t.glow + '" opacity=".33">' + mand + '</g>' +
      '<circle cx="50" cy="50" r="16" fill="none" stroke="' + t.glow + '" stroke-width="1.6"/>' +
      '<g transform="translate(38,38) scale(0.24)"><path d="' + CR.glyphs[t.suits[1]] + '" fill="' + t.glow + '"/></g>' +
      '<text x="50" y="104" text-anchor="middle" class="pw-name" fill="' + t.glow + '" font-size="' +
      tamanhoNome(def.name) + '">' + esc(def.name) + '</text>' +
      '<text x="50" y="116" text-anchor="middle" class="pw-rar" fill="' + t.glow + '" fill-opacity=".7" font-size="6.6">Bencao</text>' +
      '</svg>';
    cache[key] = svg;
    return svg;
  }

  /** Arte de uma Carta Astral: diagrama de orbita. */
  function astralArt(def, themeId) {
    var t = CR.themes.get(themeId);
    var key = 'as' + def.id + themeId;
    if (cache[key]) return cache[key];
    var r = seeded('a' + def.id), orbits = '';
    var n = 2 + Math.floor(r() * 3);
    for (var i = 0; i < n; i++) {
      var rx = 14 + i * 11 + r() * 5, ry = rx * (0.4 + r() * 0.5), rot = r() * 180;
      orbits += '<ellipse cx="50" cy="48" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) +
        '" transform="rotate(' + rot.toFixed(0) + ' 50 48)" fill="none" stroke="#dfe6ff" stroke-opacity=".55" stroke-width="1"/>';
      var a = r() * Math.PI * 2;
      orbits += '<circle cx="' + (50 + Math.cos(a) * rx).toFixed(1) + '" cy="' + (48 + Math.sin(a) * ry).toFixed(1) +
        '" r="' + (2 + r() * 2).toFixed(1) + '" fill="#dfe6ff"/>';
    }
    var svg = '<svg class="power-art astral" viewBox="0 0 100 130" role="img" aria-label="' + esc(def.name) + '">' +
      '<defs><radialGradient id="ag' + def.id + '"><stop offset="0" stop-color="#2b2a6b"/><stop offset="1" stop-color="#080716"/></radialGradient></defs>' +
      '<rect width="100" height="130" rx="9" fill="url(#ag' + def.id + ')"/>' +
      '<rect x="3" y="3" width="94" height="124" rx="7" fill="none" stroke="#9d9bff" stroke-opacity=".6" stroke-width="1.2"/>' +
      orbits + '<circle cx="50" cy="48" r="7" fill="' + t.glow + '"/>' +
      '<text x="50" y="104" text-anchor="middle" class="pw-name" fill="#e6e4ff" font-size="' +
      tamanhoNome(def.name) + '">' + esc(def.name) + '</text>' +
      '<text x="50" y="116" text-anchor="middle" class="pw-rar" fill="#e6e4ff" fill-opacity=".7" font-size="6.6">' + esc(def.combo) + '</text>' +
      '</svg>';
    cache[key] = svg;
    return svg;
  }

  /** Arte de Pergaminho. */
  function voucherArt(def, themeId) {
    var t = CR.themes.get(themeId);
    var key = 'v' + def.id + themeId;
    if (cache[key]) return cache[key];
    var r = seeded('v' + def.id), lines = '';
    for (var i = 0; i < 7; i++)
      lines += '<rect x="24" y="' + (34 + i * 7) + '" width="' + (20 + r() * 32).toFixed(0) + '" height="2.2" rx="1" fill="' + t.ink + '" opacity=".35"/>';
    var svg = '<svg class="power-art scroll" viewBox="0 0 100 130" role="img" aria-label="' + esc(def.name) + '">' +
      '<rect width="100" height="130" rx="9" fill="' + t.paper + '"/>' +
      '<path d="M0 14h100v6H0zM0 110h100v6H0z" fill="' + t.rail + '"/>' +
      '<rect x="14" y="20" width="72" height="90" fill="' + t.paper + '" stroke="' + t.ink + '" stroke-opacity=".25"/>' +
      lines +
      '<g transform="translate(40,84) scale(0.2)"><path d="' + CR.glyphs[t.suits[2]] + '" fill="' + t.red + '" opacity=".8"/></g>' +
      '<text x="50" y="30" text-anchor="middle" class="pw-name" fill="' + t.ink + '" font-size="' +
      Math.min(8.4, tamanhoNome(def.name)) + '">' + esc(def.name) + '</text>' +
      '</svg>';
    cache[key] = svg;
    return svg;
  }

  /**
   * Versao quadrada e sem texto, pros slots pequenos da mesa.
   * O nome aparece no toque, nao numa legenda ilegivel de 4px.
   */
  function emblema(def, themeId) {
    var key = 'em' + def.id + themeId;
    if (cache[key]) return cache[key];
    var t = CR.themes.get(themeId);
    var rr = RARITY[def.rarity] || null;
    var fundoA = rr ? rr.a : t.felt[0], fundoB = rr ? rr.b : t.felt[1];
    var tinta = rr ? rr.ink : t.glow;
    if (def.kind === 'blessing') { fundoA = t.felt[0]; fundoB = t.felt[1]; tinta = t.glow; }
    if (def.kind === 'astral') { fundoA = '#2b2a6b'; fundoB = '#080716'; tinta = '#dfe6ff'; }
    var svg = '<svg class="power-emblema" viewBox="0 0 100 100" role="img" aria-label="' + esc(def.name) + '">' +
      '<defs><linearGradient id="e' + def.id + '" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="' + fundoA + '"/><stop offset="1" stop-color="' + fundoB + '"/></linearGradient></defs>' +
      '<rect width="100" height="100" rx="8" fill="url(#e' + def.id + ')"/>' +
      '<rect x="2.5" y="2.5" width="95" height="95" rx="6" fill="none" stroke="' + tinta + '" stroke-opacity=".55" stroke-width="1.6"/>' +
      '<g transform="translate(6,6) scale(0.88)">' + sigil(def, tinta) + '</g></svg>';
    cache[key] = svg;
    return svg;
  }

  function powerArt(def, themeId) {
    if (def.kind === 'joker') return jokerArt(def, themeId);
    if (def.kind === 'blessing') return blessingArt(def, themeId);
    if (def.kind === 'astral') return astralArt(def, themeId);
    if (def.kind === 'voucher') return voucherArt(def, themeId);
    return jokerArt(def, themeId);
  }

  CR.sprites = {
    cardFace: cardFace, cardBack: cardBack, suitSvg: suitSvg, suitColor: suitColor,
    feltTexture: feltTexture, powerArt: powerArt, jokerArt: jokerArt, emblema: emblema,
    blessingArt: blessingArt, astralArt: astralArt, voucherArt: voucherArt,
    RARITY: RARITY, dataUri: dataUri, hash: hash, seeded: seeded, esc: esc,
    clearCache: function () { cache = {}; }
  };
})(typeof window !== 'undefined' ? (window.CR = window.CR || {}) : (global.CR = global.CR || {}));
