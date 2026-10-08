/* ハグクミ art.js — いきものの え（SVGを その場で つくる） */
'use strict';
(function (HG) {
  const U = HG.util;
  const A = (HG.art = {});

  // タイプごとの いろ
  const TYPE_PAL = {
    fire: { body: '#ff8d52', accent: '#ffd84a', accent2: '#ff5a2c' },
    water: { body: '#5cb6ff', accent: '#c9f2ff', accent2: '#2c7fe0' },
    grass: { body: '#6fd078', accent: '#ff9fc8', accent2: '#3c9e4f' },
    elec: { body: '#ffd53f', accent: '#fff7cf', accent2: '#ff9a1f' },
    light: { body: '#fff4da', accent: '#ffcd36', accent2: '#ffe6a3' },
    dark: { body: '#7c62c4', accent: '#ff4f7b', accent2: '#40297e' },
  };
  const SCARF = { fire: '#3a56d4', water: '#ff6b3d', grass: '#ffc933', elec: '#4a3fb3', light: '#ff6fa8', dark: '#e8414f', normal: '#e8414f' };

  function palette(look) {
    const egg = HG.EGGS[look.egg] || HG.EGGS.white;
    const rng = U.mulberry32((look.dna || 1) * 7919 + 13);
    const tp = look.stage >= 2 && TYPE_PAL[look.type];
    let base = tp ? tp.body : egg.body;
    let [h, s, l] = U.hexToHsl(base);
    h += (rng() - 0.5) * 14;
    l += (rng() - 0.5) * 6;
    if (look.stage >= 2) {
      if (look.style === 'cute') { s -= 6; l += 7; }
      else if (look.style === 'cool') { s += 8; l -= 3; }
      else if (look.style === 'smart') { h += 7; s -= 6; }
      else if (look.style === 'tough') { l -= 7; s += 4; }
    }
    l = U.clamp(l, 22, 93);
    const body = U.hslToHex(h, s, l);
    const line = U.hslToHex(h - 8, U.clamp(s * 0.7 + 18, 20, 70), U.clamp(l - 50, 16, 40));
    const shadeC = U.hslToHex(h - 4, s + 4, l - 10);
    const belly = U.mix(body, '#ffffff', 0.55);
    const accent = tp ? tp.accent : egg.spot;
    const accent2 = tp ? tp.accent2 : U.shade(egg.spot, -12);
    const inner = tp ? U.mix(accent, '#ffffff', 0.2) : U.mix(egg.spot, '#ffffff', 0.45);
    let iris = '#3a2a4a';
    if (look.type === 'dark' && look.stage >= 2) iris = '#ff3b5c';
    else if (look.style === 'cool' && look.stage >= 2) iris = U.shade(tp ? tp.accent2 : egg.spot, -8);
    return { body, line, shade: shadeC, belly, accent, accent2, inner, iris, egg, rng, h, s, l };
  }
  A.palette = palette;

  // ───────── からだの かたち ─────────
  function bodyBaby() {
    return {
      path: 'M58,150 C58,116 78,100 100,100 C122,100 142,116 142,150 C142,174 124,184 100,184 C76,184 58,174 58,150 Z',
      belly: [100, 160, 26, 17], headTop: [100, 101], headW: 40,
      eyes: { y: 140, dx: 15, r: 6.5 }, mouth: 154, cheeks: { y: 153, dx: 27 },
      ears: [], tail: [140, 165], neck: { y: 166, w: 34 }, feet: [[82, 183], [118, 183]], footR: [10, 6],
    };
  }
  const CHILD = {
    cute: () => ({
      path: 'M48,146 C48,110 72,94 100,94 C128,94 152,110 152,146 C152,172 130,184 100,184 C70,184 48,172 48,146 Z',
      belly: [100, 162, 30, 17], headTop: [100, 95], headW: 50,
      eyes: { y: 137, dx: 20, r: 10.5 }, mouth: 155, cheeks: { y: 153, dx: 36 },
      ears: [[70, 104, -32], [130, 104, 32]], earScale: [1.05, 0.95], tail: [149, 160], neck: { y: 168, w: 44 },
      feet: [[78, 184], [122, 184]], footR: [12, 7],
    }),
    cool: () => ({
      path: 'M100,62 C118,80 142,108 142,146 C142,170 124,184 100,184 C76,184 58,170 58,146 C58,108 82,80 100,62 Z',
      belly: [100, 161, 23, 18], headTop: [100, 66], headW: 36,
      eyes: { y: 126, dx: 16, r: 10 }, mouth: 148, cheeks: { y: 142, dx: 30 },
      ears: [[82, 90, -24], [118, 90, 24]], earScale: [0.95, 1.25], tail: [139, 164], neck: { y: 165, w: 52 },
      feet: [[82, 184], [118, 184]], footR: [12, 7],
    }),
    smart: () => ({
      path: 'M54,104 C54,78 74,60 100,60 C126,60 146,78 146,104 C146,130 126,148 100,148 C74,148 54,130 54,104 Z',
      body2: 'M70,166 C70,152 84,142 100,142 C116,142 130,152 130,166 C130,180 116,186 100,186 C84,186 70,180 70,166 Z',
      belly: [100, 170, 16, 12], headTop: [100, 61], headW: 46,
      eyes: { y: 106, dx: 18, r: 9 }, mouth: 128, cheeks: { y: 124, dx: 32 },
      ears: [[64, 84, -48], [136, 84, 48]], earScale: [1, 1], tail: [128, 172], neck: { y: 146, w: 40 },
      feet: [[87, 186], [113, 186]], footR: [10, 6], arms: [[70, 164, 8, 11], [130, 164, 8, 11]],
    }),
    tough: () => ({
      path: 'M58,120 C58,100 74,92 100,92 C126,92 142,100 142,120 L145,162 C145,178 130,186 100,186 C70,186 55,178 55,162 Z',
      belly: [100, 162, 28, 17], headTop: [100, 93], headW: 44,
      eyes: { y: 128, dx: 17, r: 6.5 }, mouth: 150, cheeks: { y: 146, dx: 32 },
      ears: [[68, 102, -28], [132, 102, 28]], earScale: [0.85, 0.8], tail: [144, 170], neck: { y: 166, w: 60 },
      feet: [[80, 186], [120, 186]], footR: [14, 7], arms: [[52, 148, 12, 16], [148, 148, 12, 16]],
    }),
  };
  const ADULT = {
    cute: () => ({
      path: 'M40,132 C40,92 68,74 100,74 C132,74 160,92 160,132 C160,168 134,186 100,186 C66,186 40,168 40,132 Z',
      belly: [100, 158, 36, 22], headTop: [100, 75], headW: 56,
      eyes: { y: 124, dx: 23, r: 13 }, mouth: 146, cheeks: { y: 145, dx: 42 },
      ears: [[64, 86, -34], [136, 86, 34]], earScale: [1.3, 1.25], tail: [158, 152], neck: { y: 164, w: 60 },
      feet: [[76, 186], [124, 186]], footR: [15, 8], arms: [[45, 146, 11, 9], [155, 146, 11, 9]],
    }),
    cool: () => ({
      path: 'M66,78 C66,58 82,46 100,46 C118,46 134,58 134,78 C134,94 124,104 112,107 C124,114 128,130 124,154 C122,166 112,170 100,170 C88,170 78,166 76,154 C72,130 76,114 88,107 C76,104 66,94 66,78 Z',
      belly: [100, 138, 15, 22], headTop: [100, 47], headW: 34,
      eyes: { y: 80, dx: 14, r: 9.5 }, mouth: 96, cheeks: { y: 92, dx: 26 },
      ears: [[78, 58, -22], [122, 58, 22]], earScale: [1.1, 1.45], tail: [122, 158], neck: { y: 108, w: 36 },
      legs: [[86, 170, 9, 14], [114, 170, 9, 14]], feet: [[84, 186], [116, 186]], footR: [13, 6],
      arms: [[70, 128, 8, 19, 18], [130, 128, 8, 19, -18]], fists: [[66, 145], [134, 145]], emblem: [100, 128],
    }),
    smart: () => ({
      path: 'M66,92 C66,72 82,58 100,58 C118,58 134,72 134,92 C134,110 120,122 100,122 C80,122 66,110 66,92 Z',
      robe: 'M100,112 C82,112 72,128 64,186 L136,186 C128,128 118,112 100,112 Z',
      belly: [100, 160, 12, 16], headTop: [100, 59], headW: 36,
      eyes: { y: 94, dx: 14, r: 8 }, mouth: 110, cheeks: { y: 106, dx: 26 },
      ears: [[67, 92, -62], [133, 92, 62]], earScale: [0.95, 0.9], tail: [132, 178], neck: { y: 120, w: 34 },
      arms: [[70, 142, 11, 18, 22], [130, 142, 11, 18, -22]], fists: [[64, 158], [136, 158]], feet: [[86, 187], [114, 187]], footR: [11, 5],
    }),
    tough: () => ({
      path: 'M58,96 C58,76 76,64 100,64 C124,64 142,76 142,96 L150,156 C150,176 132,186 100,186 C68,186 50,176 50,156 Z',
      belly: [100, 150, 30, 24], headTop: [100, 65], headW: 44,
      eyes: { y: 102, dx: 17, r: 6.8 }, mouth: 124, cheeks: { y: 118, dx: 34 },
      ears: [[68, 74, -30], [132, 74, 30]], earScale: [0.9, 0.85], tail: [150, 174], neck: { y: 140, w: 70 },
      arms: [[44, 126, 15, 26, 14], [156, 126, 15, 26, -14]], fists: [[38, 154], [162, 154]], feet: [[80, 187], [120, 187]], footR: [17, 8],
      pads: true,
    }),
  };

  // ───────── パーツ ─────────
  const EAR = {
    normal: (p) => `<path d="M-13,4 C-15,-14 -7,-28 0,-28 C7,-28 15,-14 13,4 Z" fill="${p.body}"/><path d="M-6,1 C-7,-10 -3,-19 0,-19 C3,-19 7,-10 6,1 Z" fill="${p.inner}" stroke="none"/>`,
    fire: (p) => `<path d="M-12,4 C-16,-8 -10,-16 -9,-26 C-4,-20 0,-22 -1,-34 C8,-26 14,-16 12,4 Z" fill="${p.body}"/><path d="M-6,1 C-8,-6 -5,-10 -4,-16 C-1,-12 2,-13 2,-20 C7,-14 8,-6 6,1 Z" fill="${p.accent}" stroke="none"/>`,
    water: (p) => `<path d="M-3,4 L-15,-24 C-8,-31 8,-31 15,-24 L3,4 Z" fill="${p.accent}"/><path d="M0,2 L-8,-24 M0,2 L0,-27 M0,2 L8,-24" fill="none" stroke="${p.accent2}" stroke-width="2.4"/>`,
    grass: (p) => `<path d="M0,4 C-15,-6 -14,-28 0,-40 C14,-28 15,-6 0,4 Z" fill="${p.accent2}"/><path d="M0,0 L0,-32 M0,-12 L-6,-18 M0,-20 L6,-26" fill="none" stroke="${U.mix(p.accent2, '#ffffff', 0.45)}" stroke-width="2.2"/>`,
    elec: (p) => `<path d="M-11,4 C-11,-10 -8,-22 -3,-36 L1,-26 L6,-34 C10,-20 12,-8 11,4 Z" fill="${p.body}"/><path d="M-5,1 C-5,-8 -3,-15 -1,-22 L2,-16 L4,-20 C6,-13 7,-6 5,1 Z" fill="${p.accent2}" stroke="none"/>`,
    light: (p) => `<path d="M-10,4 C-14,-14 -10,-36 0,-40 C10,-36 14,-14 10,4 Z" fill="${p.body}"/><path d="M-5,0 C-7,-12 -5,-26 0,-30 C5,-26 7,-12 5,0 Z" fill="${p.accent2}" stroke="none"/><path d="M0,-40 C3,-36 6,-34 9,-33" fill="none" stroke="${p.accent}" stroke-width="3"/>`,
    dark: (p) => `<path d="M-13,4 C-14,-12 -12,-24 -8,-38 C-2,-30 5,-25 13,-23 C13,-12 13,-4 12,4 Z" fill="${p.body}"/><path d="M-6,1 C-7,-8 -6,-17 -4,-26 C0,-22 4,-19 7,-18 C7,-10 7,-4 6,1 Z" fill="${p.accent}" stroke="none" opacity=".75"/>`,
  };

  function crest(type, style, stage, p, x, y) {
    const t = `translate(${x},${y})`;
    if (type === 'normal') {
      return `<path transform="${t}" d="M-3,4 C-12,-6 -4,-22 8,-18 C1,-15 -1,-9 4,-2" fill="none" stroke-width="5"/>`;
    }
    if (type === 'fire') {
      return `<g transform="${t}"><path d="M-15,6 C-19,-8 -9,-14 -9,-26 C-3,-18 0,-22 2,-35 C8,-24 13,-25 15,-14 C17,-6 15,0 15,6 Z" fill="${p.accent2}"/><path d="M-8,5 C-10,-3 -5,-7 -4,-14 C-1,-10 2,-12 3,-20 C7,-12 9,-8 8,5 Z" fill="${p.accent}" stroke="none"/></g>`;
    }
    if (type === 'water') {
      return `<g transform="${t}"><path d="M0,-30 C8,-18 12,-10 12,-3 C12,5 6,9 0,9 C-6,9 -12,5 -12,-3 C-12,-10 -8,-18 0,-30 Z" fill="${p.accent}"/><path d="M-5,-4 C-5,-9 -3,-13 -1,-16" fill="none" stroke="#ffffff" stroke-width="3"/></g>`;
    }
    if (type === 'grass') {
      if (style === 'cute') {
        let petals = '';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          petals += `<circle cx="${(Math.cos(a) * 9).toFixed(1)}" cy="${(-14 + Math.sin(a) * 9).toFixed(1)}" r="7" fill="${p.accent}"/>`;
        }
        return `<g transform="${t}"><path d="M0,6 L0,-6" fill="none"/>${petals}<circle cx="0" cy="-14" r="5" fill="#ffd84a"/></g>`;
      }
      return `<g transform="${t}"><path d="M0,6 L0,-12" fill="none"/><path d="M0,-11 C-5,-24 -20,-25 -23,-17 C-15,-10 -6,-9 0,-11 Z" fill="${p.accent2}"/><path d="M0,-11 C5,-24 20,-25 23,-17 C15,-10 6,-9 0,-11 Z" fill="${p.accent2}"/></g>`;
    }
    if (type === 'elec') {
      const big = stage >= 3 ? 1.2 : 1;
      return `<g transform="${t} scale(${big})"><path d="M0,6 L0,-14" fill="none"/><rect x="-5" y="-18" width="10" height="6" rx="2" fill="#b9c2cf"/><circle cx="0" cy="-26" r="9" fill="#fffbe2"/><path d="M-3,-25 L0,-29 L3,-25" fill="none" stroke="${p.accent2}" stroke-width="2.2"/><circle cx="0" cy="-26" r="15" fill="#fff6a8" stroke="none" opacity=".35"/></g>`;
    }
    if (type === 'light') {
      if (stage >= 3) {
        return `<ellipse cx="${x}" cy="${y - 18}" rx="26" ry="7" fill="none" stroke="${p.accent}" stroke-width="5"/><ellipse cx="${x}" cy="${y - 18}" rx="26" ry="7" fill="none" stroke="#fffbe0" stroke-width="1.6"/>`;
      }
      return `<path transform="translate(${x},${y - 16})" d="${starPath(0, 0, 11, 5)}" fill="${p.accent}"/>`;
    }
    if (type === 'dark') {
      const dx = stage >= 3 ? 20 : 15;
      return `<g transform="${t}"><path d="M${-dx},6 C${-dx - 2},-6 ${-dx + 2},-16 ${-dx + 9},-22 C${-dx + 7},-12 ${-dx + 8},-3 ${-dx + 8},6 Z" fill="${p.accent2}"/><path d="M${dx},6 C${dx + 2},-6 ${dx - 2},-16 ${dx - 9},-22 C${dx - 7},-12 ${dx - 8},-3 ${dx - 8},6 Z" fill="${p.accent2}"/></g>`;
    }
    return '';
  }

  function starPath(cx, cy, R, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return d + 'Z';
  }
  A.starPath = starPath;

  function tail(type, p, x, y, flip) {
    const t = `translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`;
    switch (type) {
      case 'fire':
        return `<g transform="${t}"><path d="M-2,2 C10,-2 16,-16 12,-32 C21,-24 28,-18 27,-5 C33,-11 37,-3 34,7 C30,19 12,19 -2,9 Z" fill="${p.accent2}"/><path d="M4,6 C12,4 17,-6 15,-17 C21,-11 24,-6 23,1 C27,-2 29,3 27,8 C24,15 13,14 4,6 Z" fill="${p.accent}" stroke="none"/></g>`;
      case 'water':
        return `<g transform="${t}"><path d="M-4,0 C8,4 18,0 24,-10" fill="none" stroke-width="9"/><path d="M-4,0 C8,4 18,0 24,-10" fill="none" stroke="${p.body}" stroke-width="3"/><path d="M22,-9 L40,-24 C43,-12 43,-3 40,6 Z" fill="${p.accent}"/></g>`;
      case 'grass':
        return `<g transform="${t}"><path d="M-4,0 C8,2 16,-6 18,-16" fill="none" stroke-width="5"/><path d="M18,-14 C10,-28 22,-40 36,-38 C36,-24 28,-14 18,-14 Z" fill="${p.accent2}"/><path d="M19,-15 L32,-34" fill="none" stroke="${U.mix(p.accent2, '#ffffff', 0.45)}" stroke-width="2"/></g>`;
      case 'elec':
        return `<g transform="${t}"><path d="M-4,0 C6,8 12,-6 20,0 C26,5 28,-4 30,-8" fill="none" stroke-width="4.5"/><rect x="27" y="-20" width="16" height="13" rx="3" fill="#f2f2f6"/><path d="M31,-20 L31,-27 M39,-20 L39,-27" fill="none" stroke-width="3.5"/></g>`;
      case 'light':
        return `<g transform="${t}"><path d="M-4,0 C8,2 14,-8 16,-16" fill="none" stroke-width="5"/><path d="${starPath(18, -22, 11, 5)}" fill="${p.accent}"/></g>`;
      case 'dark':
        return `<g transform="${t}"><path d="M-4,0 C10,4 14,-10 24,-14" fill="none" stroke-width="5"/><path d="M22,-24 L38,-18 L24,-6 Z" fill="${p.accent2}"/></g>`;
      default:
        return `<circle cx="${x + 6}" cy="${y - 2}" r="10" fill="${p.belly}"/>`;
    }
  }

  function wing(type, p, x, y, flip, big) {
    const s = big ? 1.15 : 0.62;
    const t = `translate(${x},${y}) scale(${flip ? -s : s},${s})`;
    switch (type) {
      case 'fire':
        return `<g transform="${t}"><path d="M0,0 C-20,-10 -40,-30 -46,-56 C-36,-46 -30,-46 -24,-44 C-30,-54 -30,-62 -26,-72 C-14,-56 -2,-40 4,-20 Z" fill="${p.accent2}"/><path d="M-6,-8 C-18,-16 -30,-30 -34,-46 C-26,-40 -22,-40 -18,-38 C-22,-46 -21,-52 -19,-58 C-10,-44 -2,-32 0,-18 Z" fill="${p.accent}" stroke="none"/></g>`;
      case 'water':
        return `<g transform="${t}"><path d="M0,0 C-24,-6 -50,-20 -58,-46 C-40,-44 -24,-36 -12,-24 C-14,-36 -10,-48 -2,-56 C4,-38 6,-18 0,0 Z" fill="${p.accent}"/><path d="M-4,-4 C-20,-12 -36,-24 -46,-40 M-4,-6 C-6,-20 -6,-34 -3,-46" fill="none" stroke="${p.accent2}" stroke-width="2.4"/></g>`;
      case 'grass':
        return `<g transform="${t}"><path d="M0,0 C-20,-4 -50,-20 -56,-52 C-28,-50 -8,-30 0,0 Z" fill="${p.accent2}"/><path d="M0,0 C-10,-20 -4,-46 10,-62 C16,-40 12,-18 0,0 Z" fill="${p.accent2}"/><path d="M-2,-2 L-46,-44 M0,-2 L8,-52" fill="none" stroke="${U.mix(p.accent2, '#ffffff', 0.45)}" stroke-width="2.2"/></g>`;
      case 'elec':
        return `<g transform="${t}"><path d="M2,0 L-30,-14 L-22,-22 L-54,-40 L-34,-42 L-60,-66 L-14,-42 L-22,-35 L6,-18 Z" fill="${p.body}"/><path d="M-6,-10 L-28,-26 L-36,-40" fill="none" stroke="${p.accent2}" stroke-width="3"/></g>`;
      case 'light':
        return `<g transform="${t}"><path d="M0,0 C-18,-2 -46,-12 -58,-40 C-50,-38 -46,-44 -50,-50 C-40,-46 -34,-52 -38,-60 C-24,-54 -10,-40 -2,-20 Z" fill="#ffffff"/><path d="M-10,-6 C-24,-12 -36,-22 -44,-34 M-8,-14 C-18,-24 -24,-36 -28,-46" fill="none" stroke="${p.accent2}" stroke-width="2.4"/></g>`;
      case 'dark':
        return `<g transform="${t}"><path d="M0,-6 L-20,-40 L-58,-48 C-52,-40 -50,-32 -52,-22 C-46,-28 -38,-28 -32,-22 C-30,-30 -22,-32 -16,-26 C-12,-18 -6,-10 0,0 Z" fill="${p.accent2}"/><path d="M-2,-6 L-20,-40 L-34,-24 M-20,-40 L-48,-38" fill="none" stroke="${U.mix(p.accent2, '#ffffff', 0.3)}" stroke-width="2"/></g>`;
      default:
        return `<g transform="${t}"><path d="M0,0 C-16,-4 -34,-16 -36,-32 C-24,-34 -10,-24 0,-10 Z" fill="${p.belly}"/></g>`;
    }
  }

  // め
  function eyes(look, p, B, expr) {
    const { y, dx } = B.eyes;
    let r = B.eyes.r;
    const xs = [100 - dx, 100 + dx];
    const st = look.stage <= 1 ? 'baby' : look.style;
    const L = p.line;
    let out = '';
    if (expr === 'happy' || expr === 'eat') {
      xs.forEach((x) => (out += `<path d="M${x - r},${y + 2} C${x - r * 0.5},${y - r * 0.9} ${x + r * 0.5},${y - r * 0.9} ${x + r},${y + 2}" fill="none" stroke="${L}" stroke-width="4"/>`));
      return out;
    }
    if (expr === 'sleep') {
      xs.forEach((x) => (out += `<path d="M${x - r},${y} C${x - r * 0.5},${y + r * 0.6} ${x + r * 0.5},${y + r * 0.6} ${x + r},${y}" fill="none" stroke="${L}" stroke-width="4"/>`));
      return out;
    }
    if (expr === 'angry') {
      out += `<path d="M${xs[0] - r},${y - r * 0.7} L${xs[0] + r * 0.7},${y} L${xs[0] - r},${y + r * 0.7}" fill="none" stroke="${L}" stroke-width="4"/>`;
      out += `<path d="M${xs[1] + r},${y - r * 0.7} L${xs[1] - r * 0.7},${y} L${xs[1] + r},${y + r * 0.7}" fill="none" stroke="${L}" stroke-width="4"/>`;
      return out;
    }
    if (expr === 'love') {
      xs.forEach((x) => (out += `<path transform="translate(${x},${y}) scale(${r / 10})" d="M0,8 C-10,0 -12,-6 -8,-9 C-5,-11 -2,-9 0,-6 C2,-9 5,-11 8,-9 C12,-6 10,0 0,8 Z" fill="#ff4f8b" stroke="${L}" stroke-width="2.5"/>`));
      return out;
    }
    if (expr === 'sick') {
      xs.forEach((x) => (out += `<path d="M${x - r * 0.8},${y - r * 0.6} L${x + r * 0.8},${y + r * 0.6} M${x + r * 0.8},${y - r * 0.6} L${x - r * 0.8},${y + r * 0.6}" fill="none" stroke="${L}" stroke-width="3.6"/>`));
      return out;
    }
    const sad = expr === 'sad';
    if (st === 'baby' || st === 'cute') {
      xs.forEach((x, i) => {
        out += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 1.1).toFixed(1)}" fill="${p.iris}" stroke="none"/>`;
        out += `<circle cx="${(x + r * 0.32).toFixed(1)}" cy="${(y - r * 0.42).toFixed(1)}" r="${(r * 0.4).toFixed(1)}" fill="#fff" stroke="none"/>`;
        out += `<circle cx="${(x - r * 0.34).toFixed(1)}" cy="${(y + r * 0.38).toFixed(1)}" r="${(r * 0.17).toFixed(1)}" fill="#fff" stroke="none"/>`;
        if (look.stage >= 3 && st === 'cute') {
          const s = i ? 1 : -1;
          out += `<path d="M${x + s * r * 0.8},${y - r * 0.7} L${x + s * (r + 5)},${y - r - 3}" fill="none" stroke="${L}" stroke-width="3"/>`;
        }
      });
    } else if (st === 'cool') {
      xs.forEach((x, i) => {
        const s = i ? 1 : -1; // そとがわ
        const w = r * 1.05, hh = r * 0.78;
        out += `<path d="M${x - s * w * 0.95},${y + hh * 0.2} C${x - s * w * 0.5},${y - hh} ${x + s * w * 0.5},${y - hh * 1.15} ${x + s * w},${y - hh * 0.55} C${x + s * w * 0.6},${y + hh * 0.85} ${x - s * w * 0.4},${y + hh} ${x - s * w * 0.95},${y + hh * 0.2} Z" fill="#fff" stroke="${L}" stroke-width="3"/>`;
        out += `<circle cx="${x + s * 1}" cy="${y}" r="${(r * 0.52).toFixed(1)}" fill="${p.iris}" stroke="none"/>`;
        if (look.type === 'dark') out += `<ellipse cx="${x + s * 1}" cy="${y}" rx="1.6" ry="${(r * 0.42).toFixed(1)}" fill="#1a1020" stroke="none"/>`;
        else out += `<circle cx="${x + s * 1}" cy="${y}" r="${(r * 0.24).toFixed(1)}" fill="#1a1020" stroke="none"/>`;
        out += `<circle cx="${(x + s * 1 + r * 0.2).toFixed(1)}" cy="${(y - r * 0.22).toFixed(1)}" r="${(r * 0.16).toFixed(1)}" fill="#fff" stroke="none"/>`;
        out += `<path d="M${x - s * w * 0.6},${y - hh - 6 + (sad ? 4 : 0)} L${x + s * w},${y - hh - (sad ? 0 : 10)}" fill="none" stroke="${L}" stroke-width="4"/>`;
      });
    } else if (st === 'smart') {
      xs.forEach((x) => {
        out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.iris}" stroke="none"/>`;
        out += `<circle cx="${(x + r * 0.3).toFixed(1)}" cy="${(y - r * 0.15).toFixed(1)}" r="${(r * 0.3).toFixed(1)}" fill="#fff" stroke="none"/>`;
        out += `<path d="M${x - r - 1},${y - r * 0.15} C${x - r * 0.6},${y - r * 1.25} ${x + r * 0.6},${y - r * 1.25} ${x + r + 1},${y - r * 0.15} Z" fill="${p.body}" stroke="none"/>`;
        out += `<path d="M${x - r - 1},${y - r * 0.15} L${x + r + 1},${y - r * 0.15}" fill="none" stroke="${L}" stroke-width="3.2"/>`;
      });
    } else {
      // たくましい
      xs.forEach((x, i) => {
        const s = i ? 1 : -1;
        out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${L}" stroke-width="3"/>`;
        out += `<circle cx="${x - s * 1.2}" cy="${y + 0.5}" r="${(r * 0.55).toFixed(1)}" fill="${p.iris}" stroke="none"/>`;
        out += `<path d="M${x - s * (r + 4)},${y - r - 7 + (sad ? 5 : 0)} L${x + s * (r + 3)},${y - r - (sad ? 0 : 1)}" fill="none" stroke="${L}" stroke-width="6"/>`;
      });
    }
    if (sad) {
      out += `<path d="M${xs[1] + r * 0.6},${y + r + 2} C${xs[1] + r * 0.2},${y + r + 8} ${xs[1] + r * 1.2},${y + r + 10} ${xs[1] + r * 0.8},${y + r + 2}" fill="#8fd3ff" stroke="none"/>`;
    }
    return out;
  }

  function mouth(look, p, B, expr) {
    const y = B.mouth;
    const L = p.line;
    const st = look.stage <= 1 ? 'baby' : look.style;
    if (expr === 'happy') return `<path d="M91,${y - 2} C93,${y + 9} 107,${y + 9} 109,${y - 2} Z" fill="#8a2c43"/><path d="M95,${y + 3} C98,${y + 7} 102,${y + 7} 105,${y + 3}" fill="#ff7d93" stroke="none"/>`;
    if (expr === 'eat') return `<ellipse cx="100" cy="${y + 2}" rx="8" ry="7" fill="#8a2c43"/>`;
    if (expr === 'sleep') return `<ellipse cx="100" cy="${y + 1}" rx="3" ry="2.6" fill="#8a2c43" stroke-width="2.5"/>`;
    if (expr === 'sad' || expr === 'sick' || expr === 'angry') return `<path d="M93,${y + 4} C96,${y - 2} 104,${y - 2} 107,${y + 4}" fill="none" stroke-width="3.5"/>`;
    if (expr === 'love') return `<path d="M93,${y - 1} C95,${y + 6} 105,${y + 6} 107,${y - 1}" fill="none" stroke-width="3.5"/>`;
    if (st === 'cute') return `<path d="M92,${y} C94,${y + 5} 99,${y + 5} 100,${y} C101,${y + 5} 106,${y + 5} 108,${y}" fill="none" stroke-width="3.2"/>`;
    if (st === 'cool') return `<path d="M93,${y + 1} C98,${y + 4} 104,${y + 3} 108,${y - 2}" fill="none" stroke-width="3.2"/><path d="M103,${y + 2.6} L105,${y + 7} L106.5,${y + 1.6}" fill="#fff" stroke-width="1.8"/>`;
    if (st === 'smart') return `<path d="M95,${y} C98,${y + 4} 102,${y + 4} 105,${y}" fill="none" stroke-width="3.2"/>`;
    if (st === 'tough') return `<path d="M88,${y - 1} C93,${y + 9} 107,${y + 9} 112,${y - 1} Z" fill="#7a2638"/><path d="M91,${y - 0.5} L93.5,${y + 5} L96,${y + 0.6} Z M104,${y + 0.6} L106.5,${y + 5} L109,${y - 0.5} Z" fill="#fff" stroke-width="1.6"/>`;
    return `<path d="M95,${y} C98,${y + 4} 102,${y + 4} 105,${y}" fill="none" stroke-width="3.2"/>`;
  }

  function cheeks(look, p, B, expr) {
    const { y, dx } = B.cheeks;
    if (look.type === 'elec' && look.stage >= 2) {
      return `<g fill="none" stroke="${p.accent2}" stroke-width="3"><path d="M${100 - dx - 4},${y} L${100 - dx + 4},${y} M${100 - dx},${y - 4} L${100 - dx},${y + 4}"/><path d="M${100 + dx - 4},${y} L${100 + dx + 4},${y}"/></g>`;
    }
    if (look.stage <= 1 || look.style === 'cute' || expr === 'happy' || expr === 'love' || expr === 'eat') {
      return `<ellipse cx="${100 - dx}" cy="${y}" rx="7.5" ry="4.5" fill="#ff8fab" stroke="none" opacity=".6"/><ellipse cx="${100 + dx}" cy="${y}" rx="7.5" ry="4.5" fill="#ff8fab" stroke="none" opacity=".6"/>`;
    }
    return '';
  }

  function pattern(look, p, B) {
    const [cx, cy, rx, ry] = B.belly;
    const t = look.type;
    if (look.stage <= 1) {
      // ベビー: たまごの もよう
      return `<circle cx="${cx - 18}" cy="${cy - 26}" r="4" fill="${p.accent}" stroke="none" opacity=".7"/><circle cx="${cx + 22}" cy="${cy - 18}" r="3" fill="${p.accent}" stroke="none" opacity=".7"/>`;
    }
    if (t === 'water') return `<path d="M${cx - rx + 4},${cy + 2} C${cx - rx / 2},${cy - 6} ${cx - 4},${cy + 8} ${cx},${cy} C${cx + 4},${cy - 8} ${cx + rx / 2},${cy + 6} ${cx + rx - 4},${cy - 2}" fill="none" stroke="${p.accent2}" stroke-width="3" opacity=".7"/>`;
    if (t === 'elec') return `<path d="M${cx - rx + 6},${cy - 2} L${cx - 8},${cy - 2} L${cx - 2},${cy - 9} L${cx + 4},${cy + 2} L${cx + rx - 6},${cy + 2}" fill="none" stroke="${p.accent2}" stroke-width="3.4" opacity=".85"/>`;
    if (t === 'fire') return `<path d="M${cx},${cy + ry - 4} C${cx - 10},${cy + ry - 8} ${cx - 10},${cy - 4} ${cx - 4},${cy - 10} C${cx - 2},${cy - 4} ${cx + 2},${cy - 4} ${cx + 3},${cy - 12} C${cx + 10},${cy - 2} ${cx + 10},${cy + ry - 8} ${cx},${cy + ry - 4} Z" fill="${p.accent}" stroke="none" opacity=".8"/>`;
    if (t === 'grass') return `<ellipse cx="${cx - 10}" cy="${cy}" rx="6" ry="3.2" transform="rotate(-30 ${cx - 10} ${cy})" fill="${p.accent2}" stroke="none" opacity=".55"/><ellipse cx="${cx + 9}" cy="${cy + 6}" rx="5" ry="2.8" transform="rotate(25 ${cx + 9} ${cy + 6})" fill="${p.accent2}" stroke="none" opacity=".55"/>`;
    if (t === 'light') return `<path d="${starPath(cx, cy, 7, 3)}" fill="${p.accent}" stroke="none" opacity=".85"/>`;
    if (t === 'dark') return `<path d="M${cx - 6},${cy - 7} C${cx - 14},${cy + 2} ${cx - 2},${cy + 12} ${cx + 8},${cy + 5} C${cx},${cy + 6} ${cx - 8},${cy - 1} ${cx - 6},${cy - 7} Z" fill="${p.accent}" stroke="none" opacity=".8"/>`;
    return `<circle cx="${cx - 12}" cy="${cy - 4}" r="4" fill="${p.accent}" stroke="none" opacity=".6"/><circle cx="${cx + 10}" cy="${cy + 4}" r="3" fill="${p.accent}" stroke="none" opacity=".6"/>`;
  }

  function bow(x, y, s, color, line) {
    const c2 = U.shade(color, -12);
    return `<g transform="translate(${x},${y}) scale(${s})"><path d="M0,0 C-8,-12 -24,-14 -24,0 C-24,14 -8,12 0,0 Z" fill="${color}" stroke="${line}"/><path d="M0,0 C8,-12 24,-14 24,0 C24,14 8,12 0,0 Z" fill="${color}" stroke="${line}"/><path d="M-16,-2 C-13,-6 -8,-6 -5,-2 M16,-2 C13,-6 8,-6 5,-2" fill="none" stroke="${c2}" stroke-width="2.4"/><circle cx="0" cy="0" r="6" fill="${c2}" stroke="${line}"/></g>`;
  }
  function glasses(B, line, dark) {
    const { y, dx, r } = B.eyes;
    const rr = r + 5;
    const fill = dark ? '#2b2440' : 'rgba(255,255,255,.25)';
    const lens = dark
      ? `<path d="M${100 - dx - rr},${y - rr * 0.6} L${100 - dx + rr},${y - rr * 0.6} C${100 - dx + rr},${y + rr * 0.9} ${100 - dx - rr},${y + rr * 0.9} ${100 - dx - rr},${y - rr * 0.6} Z M${100 + dx - rr},${y - rr * 0.6} L${100 + dx + rr},${y - rr * 0.6} C${100 + dx + rr},${y + rr * 0.9} ${100 + dx - rr},${y + rr * 0.9} ${100 + dx - rr},${y - rr * 0.6} Z" fill="${fill}" stroke="${line}" stroke-width="3.4"/>`
      : `<circle cx="${100 - dx}" cy="${y}" r="${rr}" fill="${fill}" stroke="${line}" stroke-width="3.4"/><circle cx="${100 + dx}" cy="${y}" r="${rr}" fill="${fill}" stroke="${line}" stroke-width="3.4"/>`;
    return lens + `<path d="M${100 - dx + rr},${y - (dark ? rr * 0.45 : 1)} C${100 - 4},${y - 5} ${100 + 4},${y - 5} ${100 + dx - rr},${y - (dark ? rr * 0.45 : 1)}" fill="none" stroke="${line}" stroke-width="3.2"/>` + (dark ? `<path d="M${100 - dx - 4},${y - 2} L${100 - dx + 2},${y - 6}" stroke="#fff" stroke-width="2" opacity=".6"/>` : '');
  }
  function wizardHat(x, y, s, color, band, line) {
    return `<g transform="translate(${x},${y}) scale(${s})"><path d="M-28,2 C-12,-4 2,-30 8,-62 C12,-44 20,-26 30,2 Z" fill="${color}" stroke="${line}"/><path d="M8,-62 C14,-66 20,-64 22,-58" fill="none" stroke="${line}"/><path d="M-26,-6 C-10,-12 12,-12 28,-6 L30,2 C12,-4 -10,-4 -28,2 Z" fill="${band}" stroke="${line}"/><ellipse cx="0" cy="2" rx="44" ry="9" fill="${color}" stroke="${line}"/><path d="${starPath(4, -32, 7, 3)}" fill="#ffe066" stroke="none"/></g>`;
  }
  function scarf(B, color, line, flowing) {
    const y = B.neck.y, w = B.neck.w / 2;
    const dark = U.shade(color, -14);
    let s = `<path d="M${100 - w},${y - 6} C${100 - w * 0.4},${y + 2} ${100 + w * 0.4},${y + 2} ${100 + w},${y - 6} L${100 + w},${y + 4} C${100 + w * 0.4},${y + 12} ${100 - w * 0.4},${y + 12} ${100 - w},${y + 4} Z" fill="${color}" stroke="${line}"/>`;
    if (flowing) s = `<path d="M${100 - w * 0.6},${y} C${100 - w - 16},${y + 4} ${100 - w - 30},${y - 8} ${100 - w - 42},${y + 6} L${100 - w - 30},${y + 14} C${100 - w - 20},${y + 6} ${100 - w - 10},${y + 16} ${100 - w * 0.4},${y + 9} Z" fill="${dark}" stroke="${line}"/>` + s;
    else s += `<path d="M${100 + w * 0.3},${y + 6} L${100 + w * 0.5},${y + 22} L${100 + w * 0.9},${y + 4} Z" fill="${dark}" stroke="${line}"/>`;
    return s;
  }

  // きせかえ
  function cosmetic(id, B, line) {
    const [hx, hy] = B.headTop;
    const hw = B.headW;
    switch (id) {
      case 'cap':
        return `<g><path d="M${hx - hw * 0.62},${hy + 10} C${hx - hw * 0.62},${hy - 14} ${hx + hw * 0.62},${hy - 14} ${hx + hw * 0.62},${hy + 10} Z" fill="#ff5d5d" stroke="${line}"/><path d="M${hx + hw * 0.3},${hy + 8} C${hx + hw * 0.7},${hy + 4} ${hx + hw * 1.05},${hy + 6} ${hx + hw * 1.1},${hy + 12} C${hx + hw * 0.8},${hy + 14} ${hx + hw * 0.5},${hy + 13} ${hx + hw * 0.3},${hy + 8} Z" fill="#e24444" stroke="${line}"/><circle cx="${hx}" cy="${hy - 10}" r="3.5" fill="#ffffff" stroke="${line}" stroke-width="2"/></g>`;
      case 'ribbon':
        return bow(hx + hw * 0.35, hy + 4, 0.9, '#ff3f6c', line);
      case 'flower': {
        let pe = '';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          pe += `<circle cx="${(hx - hw * 0.4 + Math.cos(a) * 8).toFixed(1)}" cy="${(hy + 6 + Math.sin(a) * 8).toFixed(1)}" r="6.5" fill="#ffffff" stroke="${line}" stroke-width="2.5"/>`;
        }
        return pe + `<circle cx="${hx - hw * 0.4}" cy="${hy + 6}" r="5.5" fill="#ffcf33" stroke="${line}" stroke-width="2.5"/>`;
      }
      case 'headphones':
        return `<path d="M${hx - hw * 0.8},${hy + 26} C${hx - hw * 0.8},${hy - 14} ${hx + hw * 0.8},${hy - 14} ${hx + hw * 0.8},${hy + 26}" fill="none" stroke="#3a3f58" stroke-width="7"/><rect x="${hx - hw * 0.8 - 9}" y="${hy + 16}" width="16" height="24" rx="7" fill="#43d6b5" stroke="${line}"/><rect x="${hx + hw * 0.8 - 7}" y="${hy + 16}" width="16" height="24" rx="7" fill="#43d6b5" stroke="${line}"/>`;
      case 'crown':
        return `<path d="M${hx - 22},${hy + 4} L${hx - 26},${hy - 22} L${hx - 12},${hy - 10} L${hx},${hy - 28} L${hx + 12},${hy - 10} L${hx + 26},${hy - 22} L${hx + 22},${hy + 4} Z" fill="#ffcf33" stroke="${line}"/><circle cx="${hx}" cy="${hy - 6}" r="4.5" fill="#ff4f7b" stroke="${line}" stroke-width="2"/>`;
      case 'glasses':
        return glasses(B, '#3b2a4a', false);
      case 'sunglasses':
        return glasses(B, '#1e1a2a', true);
      case 'scarf':
        return scarf(B, '#4fb6ff', line, false);
      case 'bowtie': {
        const y = B.neck.y;
        return `<path d="M100,${y} L86,${y - 8} L86,${y + 8} Z M100,${y} L114,${y - 8} L114,${y + 8} Z" fill="#ff3f6c" stroke="${line}" stroke-width="3"/><circle cx="100" cy="${y}" r="4" fill="#d92e57" stroke="${line}" stroke-width="2.5"/>`;
      }
    }
    return '';
  }

  // ───────── いきもの ─────────
  // look = { stage, egg, type, style, dna, acc:{head,face,neck} }
  // opt = { expr, aura(boolean), mist(boolean), size }
  A.creature = function (look, opt) {
    opt = opt || {};
    const expr = opt.expr || 'normal';
    if (look.stage === 0) return A.egg(look.egg, opt);
    const p = palette(look);
    const stage = look.stage;
    const style = look.style || 'cute';
    const type = stage <= 1 ? 'normal' : look.type || 'normal';
    let B;
    if (stage <= 1) B = bodyBaby();
    else if (stage === 2) B = CHILD[style]();
    else B = ADULT[style]();
    const L = p.line;
    const acc = look.acc || {};
    const back = [], front = [], top = [];
    const ult = stage >= 4;
    const sw = stage <= 1 ? 4.2 : 4.6;

    // オーラ
    if (ult || opt.aura) {
      const ac = type === 'normal' ? p.accent : TYPE_PAL[type] ? TYPE_PAL[type].accent2 : p.accent;
      back.push(`<circle cx="100" cy="118" r="${ult ? 92 : 80}" fill="url(#aura${opt.uid || ''})" stroke="none"/>`);
      back.unshift(`<defs><radialGradient id="aura${opt.uid || ''}"><stop offset="40%" stop-color="${ac}" stop-opacity=".45"/><stop offset="100%" stop-color="${ac}" stop-opacity="0"/></radialGradient></defs>`);
    }
    // つばさ
    const wingY = stage === 3 && style === 'cool' ? 112 : B.headTop[1] + 48;
    if (ult || (stage === 3 && (type === 'light' || type === 'dark'))) {
      back.push(wing(type, p, 76, wingY, false, ult));
      back.push(wing(type, p, 124, wingY, true, ult));
    }
    // マント（かっこいい きわみ）
    if (ult && style === 'cool') {
      back.push(`<path d="M76,108 C60,140 54,170 58,190 L142,190 C146,170 140,140 124,108 Z" fill="${SCARF[type]}" stroke="${L}" stroke-width="${sw}"/>`);
    }
    // しっぽ
    if (stage >= 2) back.push(tail(type, p, B.tail[0], B.tail[1], false));
    else back.push(`<circle cx="${B.tail[0] + 2}" cy="${B.tail[1]}" r="7" fill="${p.belly}"/>`);
    // みみ
    if (B.ears.length) {
      const [sx, sy] = B.earScale;
      const k = ult ? 1.12 : 1;
      const ear = EAR[type] || EAR.normal;
      B.ears.forEach(([x, y, a], i) => {
        back.push(`<g transform="translate(${x},${y}) rotate(${a}) scale(${(i ? -sx : sx) * k},${sy * k})">${ear(p)}</g>`);
      });
    }
    // からだ
    let body = '';
    if (B.robe) body += `<path d="${B.robe}" fill="${U.shade(p.body, -6)}"/>`;
    if (B.legs) B.legs.forEach(([x, y, rx, ry]) => (body += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${p.shade}"/>`));
    if (B.feet) B.feet.forEach(([x, y]) => (body += `<ellipse cx="${x}" cy="${y}" rx="${B.footR[0]}" ry="${B.footR[1]}" fill="${p.shade}"/>`));
    if (B.body2) body += `<path d="${B.body2}" fill="${p.body}"/>`;
    // かっこいい おとな は うでを からだの うしろに
    if (B.arms && stage >= 3 && style === 'cool') {
      B.arms.forEach(([x, y, rx, ry, rot]) => (body += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot || 0} ${x} ${y})" fill="${p.body}"/>`));
      B.fists.forEach(([x, y]) => (body += `<circle cx="${x}" cy="${y}" r="8" fill="${p.body}"/>`));
    }
    body += `<path d="${B.path}" fill="${p.body}"/>`;
    // かげ（ハイライト）
    body += `<path d="${B.path}" fill="url(#shine${opt.uid || ''})" stroke="none"/>`;
    // おなか
    const [bx, by, brx, bry] = B.belly;
    body += `<ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}" fill="${p.belly}" stroke="none"/>`;
    if (B.body2) body += `<ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}" fill="${p.belly}" stroke="none"/>`;
    body += pattern(look, p, B);
    // うで
    if (B.arms && !(stage >= 3 && style === 'cool')) {
      B.arms.forEach(([x, y, rx, ry, rot]) => (body += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot || 0} ${x} ${y})" fill="${style === 'smart' && stage >= 3 ? U.shade(p.body, -6) : p.body}"/>`));
      if (B.fists) B.fists.forEach(([x, y]) => (body += `<circle cx="${x}" cy="${y}" r="${style === 'tough' ? 15 : 8}" fill="${p.body}"/>`));
    }
    // たくましい: かたあて
    if (B.pads) {
      const padC = ult ? '#b9c3d6' : '#8d97ab';
      if (ult) body += `<path d="M34,92 L26,66 L46,84 Z M48,86 L50,62 L60,86 Z M166,92 L174,66 L154,84 Z M152,86 L150,62 L140,86 Z" fill="#eef1f7"/>`;
      body += `<path d="M24,114 C22,92 34,82 50,84 C63,86 69,97 67,111 C54,104 37,106 24,114 Z" fill="${padC}"/>`;
      body += `<path d="M176,114 C178,92 166,82 150,84 C137,86 131,97 133,111 C146,104 163,106 176,114 Z" fill="${padC}"/>`;
      body += `<path d="M34,100 C40,94 50,93 56,96 M166,100 C160,94 150,93 144,96" fill="none" stroke="#ffffff" stroke-width="2.4" opacity=".6"/>`;
    }
    // かっこいい: エンブレム
    if (B.emblem && stage >= 3) {
      body += `<circle cx="${B.emblem[0]}" cy="${B.emblem[1]}" r="7" fill="${p.accent}" stroke-width="3"/>`;
    }
    // かお
    let face = '';
    face += cheeks(look, p, B, expr);
    face += eyes(look, p, B, expr);
    face += mouth(look, p, B, expr);
    // たくましい こども: ばんそうこう / おとな: きず
    if (style === 'tough' && stage === 2) {
      face += `<g transform="translate(${100 + B.cheeks.dx - 4},${B.cheeks.y - 4}) rotate(-25)"><rect x="-9" y="-4" width="18" height="8" rx="3" fill="#ffe0bd" stroke-width="2.4"/><path d="M-2,-2 L-2,2 M2,-2 L2,2" stroke-width="1.6"/></g>`;
    }
    if (style === 'tough' && stage >= 3) {
      const ex = 100 - B.eyes.dx, ey = B.eyes.y;
      face += `<path d="M${ex - 6},${ey - 14} L${ex + 6},${ey + 10}" fill="none" stroke="#ff7f8f" stroke-width="3"/>`;
    }
    // あたまの かざり
    let headDeco = crest(type, style, stage, p, B.headTop[0], B.headTop[1] + 4);
    if (stage <= 1) {
      // ベビー: たまごの からを かぶっている
      const egg = HG.EGGS[look.egg] || HG.EGGS.white;
      headDeco = `<g transform="translate(${B.headTop[0]},${B.headTop[1] + 6})"><path d="M-24,4 L-18,-3 L-12,4 L-6,-3 L0,4 L6,-3 L12,4 L18,-3 L24,4 C24,-14 13,-24 0,-24 C-13,-24 -24,-14 -24,4 Z" fill="${egg.shell}"/><circle cx="-8" cy="-12" r="3.2" fill="${egg.spot}" stroke="none"/><circle cx="9" cy="-8" r="2.4" fill="${egg.spot}" stroke="none"/></g>`;
    }
    // スタイルの かざり（きせかえが あれば うわがき）
    let styleHead = '', styleFace = '', styleNeck = '';
    if (stage >= 2) {
      if (style === 'cute') {
        if (ult) {
          const [hx, hy] = B.headTop;
          styleHead = `<path d="M${hx - 20},${hy + 2} L${hx - 22},${hy - 14} L${hx - 10},${hy - 6} L${hx},${hy - 22} L${hx + 10},${hy - 6} L${hx + 22},${hy - 14} L${hx + 20},${hy + 2} Z" fill="#ffd94a"/><circle cx="${hx}" cy="${hy - 6}" r="4" fill="#5ec8ff" stroke-width="2"/>`;
        } else if (stage === 3) styleHead = bow(B.headTop[0] + 30, B.headTop[1] + 10, 0.85, U.mix('#ff6fa8', p.accent, 0.25), L);
        else styleHead = bow(B.ears[1][0] - 2, B.ears[1][1] + 2, 0.55, U.mix('#ff6fa8', p.accent, 0.25), L);
      } else if (style === 'cool') {
        if (stage === 2) styleNeck = scarf(B, SCARF[type], L, false);
        else styleNeck = scarf(B, SCARF[type], L, true);
        if (ult) styleHead = `<path transform="translate(100,${B.headTop[1] + 18})" d="M0,-6 L6,0 L0,6 L-6,0 Z" fill="#5ef0ff" stroke-width="2.4"/>`;
      } else if (style === 'smart') {
        styleFace = glasses(B, L, false);
        if (stage >= 3) {
          styleHead = wizardHat(B.headTop[0], B.headTop[1] + 8, ult ? 1.05 : 0.92, ult ? '#4a3aa8' : '#5b4bd1', TYPE_PAL[type] ? TYPE_PAL[type].accent2 : p.accent, L);
          headDeco = type === 'light' ? crest(type, style, stage, p, B.headTop[0], B.headTop[1] - 34) : '';
        }
        if (stage >= 3) front.push(`<g transform="translate(152,${ult ? 120 : 132})"><circle r="${ult ? 11 : 9}" fill="${p.accent}" stroke="${L}" stroke-width="3.4"/><circle cx="-3" cy="-3" r="3" fill="#ffffff" stroke="none" opacity=".8"/></g>`);
        if (ult) back.push(`<ellipse cx="100" cy="132" rx="84" ry="22" fill="none" stroke="${p.accent}" stroke-width="3" stroke-dasharray="10 8" opacity=".9"/>`);
      } else if (style === 'tough') {
        if (ult) {
          headDeco = `<g transform="translate(${B.headTop[0]},${B.headTop[1] + 8})"><path d="M-24,4 C-34,-8 -36,-24 -30,-40 C-24,-26 -16,-16 -10,-6 Z" fill="#f4ead2"/><path d="M24,4 C34,-8 36,-24 30,-40 C24,-26 16,-16 10,-6 Z" fill="#f4ead2"/></g>` + headDeco;
        }
      }
    }
    if (acc.head) { styleHead = cosmetic(acc.head, B, L); if (style === 'smart' && stage >= 3) headDeco = crest(type, style, stage, p, B.headTop[0], B.headTop[1] + 4); }
    if (acc.face) styleFace = cosmetic(acc.face, B, L);
    if (acc.neck) styleNeck = cosmetic(acc.neck, B, L);

    // きわみ: キラキラ
    if (ult) {
      const ac = TYPE_PAL[type] ? TYPE_PAL[type].accent : p.accent;
      top.push(`<path d="${starPath(40, 70, 7, 2.6)}" fill="${ac}" stroke="none"/><path d="${starPath(166, 96, 6, 2.2)}" fill="${ac}" stroke="none"/><path d="${starPath(30, 140, 5, 2)}" fill="${ac}" stroke="none"/>`);
    }
    // びょうき・ねむり
    let over = '';
    if (expr === 'sick') {
      over += `<path d="${B.path}" fill="#7bd389" stroke="none" opacity=".25"/>`;
      over += `<path d="M${B.headTop[0] + B.headW * 0.7},${B.headTop[1] + 18} C${B.headTop[0] + B.headW * 0.7 + 6},${B.headTop[1] + 28} ${B.headTop[0] + B.headW * 0.7 - 6},${B.headTop[1] + 34} ${B.headTop[0] + B.headW * 0.7},${B.headTop[1] + 18} Z" fill="#8fd3ff" stroke="${L}" stroke-width="2"/>`;
    }

    const shine = `<defs><linearGradient id="shine${opt.uid || ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".1"/></linearGradient></defs>`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="hg-creature${opt.cls ? ' ' + opt.cls : ''}">` +
      shine +
      `<g stroke="${L}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">` +
      `<g class="hg-back">${back.join('')}</g>` +
      `<g class="hg-body">${body}<g class="hg-face">${face}</g>${over}${styleNeck}${styleFace}${headDeco}${styleHead}${front.join('')}</g>` +
      top.join('') +
      `</g></svg>`;
    return svg;
  };

  // ───────── たまご ─────────
  A.egg = function (eggKey, opt) {
    opt = opt || {};
    const e = HG.EGGS[eggKey] || HG.EGGS.white;
    const line = U.shade(e.spot, -38);
    const crack = opt.crack || 0;
    let spots = '';
    if (eggKey === 'red') spots = `<circle cx="80" cy="96" r="9" fill="${e.spot}"/><circle cx="118" cy="120" r="12" fill="${e.spot}"/><circle cx="90" cy="148" r="7" fill="${e.spot}"/><circle cx="122" cy="80" r="6" fill="${e.spot}"/>`;
    else if (eggKey === 'blue') spots = `<path d="M58,110 C72,100 86,120 100,110 C114,100 128,120 142,110" fill="none" stroke="${e.spot}" stroke-width="9"/><path d="M62,146 C76,136 90,156 104,146 C118,136 130,152 138,146" fill="none" stroke="${e.spot}" stroke-width="7"/>`;
    else if (eggKey === 'green') spots = `<path d="M84,84 C78,96 86,104 96,100 C96,90 92,86 84,84 Z" fill="${e.spot}"/><path d="M114,124 C106,138 116,146 128,142 C128,130 124,126 114,124 Z" fill="${e.spot}"/><path d="M76,140 C72,150 78,156 86,154 C86,146 82,142 76,140 Z" fill="${e.spot}"/>`;
    else if (eggKey === 'yellow') spots = `<path d="M60,118 L78,106 L92,120 L108,106 L122,120 L140,108" fill="none" stroke="${e.spot}" stroke-width="8"/>`;
    else if (eggKey === 'star') spots = `<path d="${starPath(86, 104, 13, 6)}" fill="${e.spot}"/><path d="${starPath(120, 140, 9, 4)}" fill="${e.spot}"/><path d="${starPath(116, 84, 6, 3)}" fill="${e.spot}"/>`;
    else if (eggKey === 'shadow') spots = `<path d="M84,90 C72,104 84,124 104,118 C90,118 82,106 84,90 Z" fill="${e.spot}"/><circle cx="120" cy="146" r="6" fill="${e.spot}"/><circle cx="82" cy="150" r="4" fill="${e.spot}"/>`;
    else spots = `<circle cx="84" cy="100" r="6" fill="${e.spot}"/><circle cx="116" cy="128" r="8" fill="${e.spot}"/><circle cx="90" cy="150" r="5" fill="${e.spot}"/>`;
    let cracks = '';
    if (crack > 0.3) cracks += `<path d="M78,108 L88,116 L84,124 L96,130" fill="none" stroke="${line}" stroke-width="3.4"/>`;
    if (crack > 0.6) cracks += `<path d="M120,96 L112,106 L122,112 L114,122" fill="none" stroke="${line}" stroke-width="3.4"/>`;
    if (crack > 0.85) cracks += `<path d="M96,130 L104,124 L110,132 L122,126" fill="none" stroke="${line}" stroke-width="3.4"/>`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="hg-egg">` +
      `<defs><clipPath id="eggclip${opt.uid || ''}"><path d="M100,40 C138,40 154,98 154,130 C154,166 130,186 100,186 C70,186 46,166 46,130 C46,98 62,40 100,40 Z"/></clipPath></defs>` +
      `<g class="hg-body">` +
      `<path d="M100,40 C138,40 154,98 154,130 C154,166 130,186 100,186 C70,186 46,166 46,130 C46,98 62,40 100,40 Z" fill="${e.shell}"/>` +
      `<g clip-path="url(#eggclip${opt.uid || ''})">${spots}<ellipse cx="78" cy="84" rx="10" ry="18" transform="rotate(20 78 84)" fill="#ffffff" opacity=".55"/></g>` +
      `<path d="M100,40 C138,40 154,98 154,130 C154,166 130,186 100,186 C70,186 46,166 46,130 C46,98 62,40 100,40 Z" fill="none" stroke="${line}" stroke-width="5"/>` +
      cracks +
      `</g></svg>`
    );
  };

  // ───────── ボス・とくべつな てき ─────────
  const BOSS = {};
  BOSS.robo = (o) => `<g stroke="#3b3550" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M100,52 L100,36" fill="none"/><circle cx="100" cy="32" r="7" fill="#ff5d5d"/>
    <rect x="58" y="52" width="84" height="66" rx="16" fill="#c8d3e6"/>
    <rect x="70" y="66" width="60" height="34" rx="8" fill="#2f3b55"/>
    <circle cx="86" cy="83" r="${o.expr === 'happy' ? 0 : 6}" fill="#7dfcc0" stroke="none"/><circle cx="114" cy="83" r="${o.expr === 'happy' ? 0 : 6}" fill="#7dfcc0" stroke="none"/>
    ${o.expr === 'happy' ? '<path d="M80,86 C83,80 89,80 92,86 M108,86 C111,80 117,80 120,86" fill="none" stroke="#7dfcc0"/>' : ''}
    <rect x="66" y="120" width="68" height="50" rx="14" fill="#aab8d0"/>
    <circle cx="100" cy="144" r="10" fill="#ffd84a"/>
    <rect x="40" y="124" width="22" height="34" rx="10" fill="#c8d3e6"/><rect x="138" y="124" width="22" height="34" rx="10" fill="#c8d3e6"/>
    <rect x="72" y="168" width="22" height="18" rx="6" fill="#7d8aa6"/><rect x="106" y="168" width="22" height="18" rx="6" fill="#7d8aa6"/></g>`;
  BOSS.donguri = (o) => `<g stroke="#4a2b14" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M52,104 C52,62 148,62 148,104 C148,170 120,188 100,188 C80,188 52,170 52,104 Z" fill="#d79a52"/>
    <path d="M60,108 C70,120 130,120 140,108" fill="none" stroke="#b97a3a" stroke-width="4"/>
    <path d="M44,104 C40,70 70,48 100,48 C130,48 160,70 156,104 C140,112 60,112 44,104 Z" fill="#8a5a2b"/>
    <path d="M56,92 L64,84 M76,96 L84,86 M96,98 L104,88 M116,96 L124,86 M136,92 L144,84" fill="none" stroke="#6b421d" stroke-width="3.5"/>
    <path d="M100,48 C98,38 104,30 112,30" fill="none" stroke-width="6"/>
    <path d="M70,52 L64,30 L80,42 L92,24 L100,40 L110,24 L120,42 L136,30 L130,52 Z" fill="#ffcf33"/>
    ${faceSimple(o, 100, 136, 18, '#4a2b14', 'fierce')}
    <ellipse cx="78" cy="186" rx="13" ry="6" fill="#8a5a2b"/><ellipse cx="122" cy="186" rx="13" ry="6" fill="#8a5a2b"/></g>`;
  BOSS.garagara = (o) => `<g stroke="#5a1a1a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <rect x="62" y="150" width="76" height="34" rx="6" fill="#8a5a2b"/>
    <path d="M100,60 L140,77 L156,116 L140,155 L100,172 L60,155 L44,116 L60,77 Z" fill="#e8414f"/>
    <path d="M100,76 L128,88 L140,116 L128,144 L100,156 L72,144 L60,116 L72,88 Z" fill="#ff6b6b"/>
    <path d="M156,116 L176,116 L176,82" fill="none" stroke-width="7"/><circle cx="176" cy="78" r="8" fill="#ffcf33"/>
    ${faceSimple(o, 100, 112, 18, '#5a1a1a', 'grin')}
    <path d="M70,70 L62,44 L82,58 L100,36 L118,58 L138,44 L130,70 Z" fill="#ffcf33"/>
    <circle cx="146" cy="168" r="9" fill="#ffd84a"/><circle cx="160" cy="178" r="7" fill="#ffffff"/></g>`;
  BOSS.namazu = (o) => `<g stroke="#1e3550" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M20,120 C30,96 46,108 50,118 C50,108 46,92 34,86 C46,82 60,96 62,110" fill="#5f7fa6"/>
    <path d="M44,124 C44,80 82,60 120,62 C160,64 186,92 186,124 C186,162 156,180 118,180 C76,180 44,164 44,124 Z" fill="#7d9cc4"/>
    <path d="M70,140 C90,166 150,170 176,140 C160,176 90,178 70,140 Z" fill="#c8d8ee" stroke="none"/>
    <path d="M118,62 C122,48 136,44 146,52 C138,56 132,62 130,66" fill="#5f7fa6"/>
    <circle cx="146" cy="106" r="9" fill="#ffffff"/><circle cx="148" cy="106" r="5" fill="#1e2a40" stroke="none"/>
    <path d="M150,132 C164,140 176,140 186,136" fill="none" stroke-width="5"/>
    <path d="M156,124 C170,118 186,120 196,128" fill="none" stroke-width="4"/><path d="M156,140 C170,150 182,160 186,174" fill="none" stroke-width="4"/>
    ${o.expr === 'happy' ? '<path d="M138,104 C142,98 150,98 154,104" fill="none"/>' : '<path d="M134,94 L156,100" fill="none" stroke-width="5"/>'}
    <circle cx="90" cy="100" r="5" fill="#5f7fa6" stroke="none"/><circle cx="104" cy="88" r="4" fill="#5f7fa6" stroke="none"/><circle cx="80" cy="120" r="4" fill="#5f7fa6" stroke="none"/></g>`;
  BOSS.piano = (o) => `<g stroke="#120a1c" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40,90 C40,58 80,40 120,44 C150,48 168,64 168,90 L168,120 L40,120 Z" fill="#2a1d3d"/>
    <path d="M52,96 C56,70 90,56 120,58 C142,60 156,72 156,96 Z" fill="#3c2a58" stroke="none"/>
    <rect x="34" y="118" width="140" height="30" rx="6" fill="#2a1d3d"/>
    <rect x="44" y="124" width="120" height="22" rx="3" fill="#f6f2ff"/>
    <path d="M56,124 L56,136 M68,124 L68,136 M86,124 L86,136 M98,124 L98,136 M110,124 L110,136 M128,124 L128,136 M140,124 L140,136 M152,124 L152,136" stroke-width="5"/>
    <path d="M52,148 L48,186 M156,148 L160,186 M104,148 L104,182" fill="none" stroke-width="7"/>
    <circle cx="86" cy="88" r="11" fill="${o.expr === 'happy' ? '#ffd84a' : '#ff4f7b'}"/><circle cx="128" cy="88" r="11" fill="${o.expr === 'happy' ? '#ffd84a' : '#ff4f7b'}"/>
    <circle cx="86" cy="88" r="4" fill="#120a1c" stroke="none"/><circle cx="128" cy="88" r="4" fill="#120a1c" stroke="none"/>
    <path d="M150,34 L150,10 L166,14 L166,30" fill="none" stroke="#c9b8ff" stroke-width="4"/><circle cx="146" cy="36" r="6" fill="#c9b8ff" stroke="none"/><circle cx="162" cy="32" r="6" fill="#c9b8ff" stroke="none"/></g>`;
  BOSS.sun = (o) => {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 100 + Math.cos(a) * 62, y1 = 112 + Math.sin(a) * 62;
      const x2 = 100 + Math.cos(a + 0.13) * 88, y2 = 112 + Math.sin(a + 0.13) * 88;
      const x3 = 100 + Math.cos(a + 0.26) * 62, y3 = 112 + Math.sin(a + 0.26) * 62;
      rays += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} Z" fill="#ffb02e"/>`;
    }
    return `<g stroke="#a23a12" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${rays}
    <circle cx="100" cy="112" r="64" fill="#ffd23f"/>
    <circle cx="100" cy="112" r="64" fill="url(#sunG)" stroke="none"/>
    <defs><radialGradient id="sunG"><stop offset=".55" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ff7b2e" stop-opacity=".45"/></radialGradient></defs>
    ${o.expr === 'happy' ? '<path d="M70,104 C76,96 86,96 92,104 M108,104 C114,96 124,96 130,104" fill="none"/>' : '<path d="M62,98 L94,98 C94,114 66,116 62,98 Z M106,98 L138,98 C134,116 106,114 106,98 Z" fill="#2b2440"/><path d="M94,100 L106,100" fill="none"/><path d="M68,102 L80,102" stroke="#ffffff" stroke-width="2.5" opacity=".7"/>'}
    <path d="M80,132 C88,144 112,144 120,132" fill="#a23a12"/>
    <ellipse cx="70" cy="124" rx="9" ry="5" fill="#ff7b5a" stroke="none" opacity=".6"/><ellipse cx="130" cy="124" rx="9" ry="5" fill="#ff7b5a" stroke="none" opacity=".6"/></g>`;
  };
  BOSS.raijin = (o) => `<g stroke="#2b2240" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M30,150 C14,150 12,124 32,122 C30,100 58,96 66,112 C72,92 104,90 110,110 C120,94 150,98 150,118 C172,114 184,138 166,150 Z" fill="#8a86a6"/>
    <circle cx="36" cy="80" r="17" fill="#ff7b3d"/><circle cx="164" cy="80" r="17" fill="#ff7b3d"/><circle cx="36" cy="80" r="7" fill="#ffd84a"/><circle cx="164" cy="80" r="7" fill="#ffd84a"/>
    <path d="M60,124 C60,84 140,84 140,124 C140,150 120,160 100,160 C80,160 60,150 60,124 Z" fill="#5fc0ff"/>
    <path d="M74,92 L68,64 L86,84 Z M126,92 L132,64 L114,84 Z" fill="#fff4cf"/>
    <path d="M64,96 C60,80 70,66 84,70" fill="none" stroke="#2b2240" stroke-width="5"/>
    ${faceSimple(o, 100, 120, 16, '#2b2240', 'fierce')}
    <path d="M86,170 L96,156 L92,170 L106,152" fill="none" stroke="#ffd84a" stroke-width="5"/>
    <path d="M58,124 L40,110 M142,124 L160,110" fill="none" stroke-width="6"/></g>`;
  BOSS.wataame = (o) => `<g stroke="#a04878" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M150,170 C176,166 186,140 168,128" fill="none" stroke-width="10" stroke="#ffb3d6"/>
    <path d="M40,150 C22,148 20,120 40,116 C34,90 64,80 76,96 C82,72 118,70 124,92 C140,78 168,92 158,116 C180,120 178,152 156,154 C150,176 116,182 100,172 C82,184 46,176 40,150 Z" fill="#ffc8e3"/>
    <path d="M60,138 C66,128 78,128 82,136 M112,148 C118,138 132,138 136,148 M88,112 C94,104 106,104 110,112" fill="none" stroke="#ff9ccb" stroke-width="3.5"/>
    <path d="M86,82 C80,60 96,44 116,48 C136,52 142,72 132,86 C122,98 96,98 86,82 Z" fill="#ffe1ef"/>
    <path d="M94,54 L86,38 L100,48 Z M122,52 L132,38 L126,56 Z" fill="#ffffff"/>
    <circle cx="104" cy="70" r="${o.expr === 'happy' ? 0 : 5}" fill="#3a2a4a" stroke="none"/><circle cx="124" cy="70" r="${o.expr === 'happy' ? 0 : 5}" fill="#3a2a4a" stroke="none"/>
    ${o.expr === 'happy' ? '<path d="M98,72 C101,66 107,66 110,72 M118,72 C121,66 127,66 130,72" fill="none" stroke="#3a2a4a" stroke-width="3.5"/>' : ''}
    <path d="M110,82 C114,86 118,86 122,82" fill="none" stroke="#3a2a4a" stroke-width="3"/>
    <path d="M100,176 L96,196" fill="none" stroke="#e6d2a6" stroke-width="8"/></g>`;
  BOSS.king = (o) => `<g stroke="#120a22" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40,196 C40,120 62,84 100,84 C138,84 160,120 160,196 Z" fill="#3a2a6a"/>
    <path d="M58,130 L84,124 L80,150 L56,156 Z" fill="#6b5aa0"/><path d="M120,140 L146,136 L148,164 L122,166 Z" fill="#4c7a8f"/><path d="M84,160 L112,158 L110,186 L86,188 Z" fill="#8a5a7a"/>
    <path d="M58,130 L84,124 L80,150 L56,156 Z M120,140 L146,136 L148,164 L122,166 Z M84,160 L112,158 L110,186 L86,188 Z" fill="none" stroke="#c9b8ff" stroke-width="2" stroke-dasharray="4 4"/>
    <circle cx="100" cy="82" r="36" fill="#4a3a7e"/>
    <circle cx="86" cy="80" r="10" fill="${o.expr === 'happy' ? '#ffd84a' : '#ff4f7b'}"/><circle cx="86" cy="80" r="4" fill="#120a22" stroke="none"/>
    <circle cx="116" cy="80" r="9" fill="#e9e0ff"/><path d="M110,74 L122,86 M122,74 L110,86" fill="none" stroke-width="3"/>
    <path d="M88,100 C94,96 106,96 112,100" fill="none"/>
    <path d="M66,56 L60,24 L78,42 L88,16 L100,40 L112,14 L122,42 L140,24 L134,56 Z" fill="#8a7a4a"/>
    <circle cx="88" cy="40" r="4" fill="#5fc0ff" stroke="none"/><circle cx="114" cy="38" r="4" fill="#ff7b9c" stroke="none"/>
    <path d="M40,150 C24,140 18,118 28,104 M160,150 C176,140 182,118 172,104" fill="none" stroke="#3a2a6a" stroke-width="12"/>
    <path d="M40,150 C24,140 18,118 28,104 M160,150 C176,140 182,118 172,104" fill="none" stroke="#120a22" stroke-width="3"/></g>`;

  function faceSimple(o, cx, cy, dx, ink, kind) {
    if (o.expr === 'happy')
      return `<path d="M${cx - dx - 6},${cy} C${cx - dx - 2},${cy - 7} ${cx - dx + 6},${cy - 7} ${cx - dx + 8},${cy}" fill="none"/><path d="M${cx + dx - 8},${cy} C${cx + dx - 6},${cy - 7} ${cx + dx + 2},${cy - 7} ${cx + dx + 6},${cy}" fill="none"/><path d="M${cx - 9},${cy + 14} C${cx - 5},${cy + 22} ${cx + 5},${cy + 22} ${cx + 9},${cy + 14}" fill="none"/>`;
    let s = `<circle cx="${cx - dx}" cy="${cy}" r="8" fill="#ffffff"/><circle cx="${cx + dx}" cy="${cy}" r="8" fill="#ffffff"/><circle cx="${cx - dx + 1}" cy="${cy + 1}" r="4" fill="${ink}" stroke="none"/><circle cx="${cx + dx - 1}" cy="${cy + 1}" r="4" fill="${ink}" stroke="none"/>`;
    if (kind === 'fierce') s += `<path d="M${cx - dx - 10},${cy - 14} L${cx - dx + 8},${cy - 8} M${cx + dx + 10},${cy - 14} L${cx + dx - 8},${cy - 8}" fill="none" stroke-width="6"/><path d="M${cx - 10},${cy + 18} C${cx - 4},${cy + 13} ${cx + 4},${cy + 13} ${cx + 10},${cy + 18}" fill="none"/>`;
    else s += `<path d="M${cx - 14},${cy + 14} C${cx - 6},${cy + 26} ${cx + 6},${cy + 26} ${cx + 14},${cy + 14} Z" fill="${ink}"/>`;
    return s;
  }

  A.boss = function (key, opt) {
    opt = opt || {};
    const f = BOSS[key];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="hg-creature">${f ? f(opt) : ''}</svg>`;
  };

  // てきの え（look か art か）
  A.enemy = function (def, opt) {
    if (def.art) return A.boss(def.art, opt);
    return A.creature(def.look, opt);
  };

  // ───────── うんち ─────────
  A.poop = () =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" class="hg-poop"><g stroke="#5a3a22" stroke-width="3" stroke-linejoin="round"><path d="M10,52 C4,52 4,42 12,40 C8,32 16,26 22,30 C20,20 30,14 36,22 C40,18 48,22 44,30 C52,30 54,40 48,42 C56,44 54,52 48,52 Z" fill="#a8743f"/><path d="M18,40 C24,36 34,36 40,40" fill="none" stroke="#7a512b"/></g><circle cx="24" cy="46" r="2.4" fill="#3a2a1a"/><circle cx="36" cy="46" r="2.4" fill="#3a2a1a"/></svg>`;

  // ───────── UI アイコン ─────────
  const ICONS = {
    home: '<path d="M4 12 L12 4 L20 12 M6 10 V20 H18 V10" fill="none"/><path d="M10 20 V14 H14 V20" fill="none"/>',
    sword: '<path d="M5 19 L14 10 M14 10 L19 5 L19 8 L16 11 Z M7 15 L9 17 M4 20 L6 18" fill="none"/>',
    vs: '<circle cx="8" cy="9" r="4" fill="none"/><circle cx="16" cy="15" r="4" fill="none"/><path d="M11 12 L13 12" fill="none"/>',
    book: '<path d="M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z M12 6 V20" fill="none"/>',
    menu: '<path d="M5 7 H19 M5 12 H19 M5 17 H19" fill="none"/>',
    food: '<path d="M7 4 V11 M5 4 V9 C5 10 6 11 7 11 C8 11 9 10 9 9 V4 M7 11 V20 M16 4 C14 6 14 10 16 12 V20 M16 4 C18 6 18 10 16 12" fill="none"/>',
    play: '<circle cx="12" cy="12" r="8" fill="none"/><path d="M12 4 C9 8 9 16 12 20 M4.5 10 C9 11 15 11 19.5 10" fill="none"/>',
    clean: '<path d="M14 4 L10 12 M6 20 C6 16 8 12 10 12 L14 14 C14 17 12 20 10 21 Z M8 17 L11 18" fill="none"/>',
    bath: '<path d="M4 12 H20 V14 C20 18 17 20 12 20 C7 20 4 18 4 14 Z M7 12 V6 C7 4.5 8 4 9 4 C10 4 11 5 11 6" fill="none"/><circle cx="15" cy="8" r="1.5" fill="currentColor"/><circle cx="18" cy="5" r="1" fill="currentColor"/>',
    pill: '<rect x="4" y="9" width="16" height="7" rx="3.5" transform="rotate(-35 12 12.5)" fill="none"/><path d="M10 9 L14 16" fill="none"/>',
    heart: '<path d="M12 19 C6 15 4 12 4 9 C4 6 6 5 8 5 C10 5 11 6 12 7.5 C13 6 14 5 16 5 C18 5 20 6 20 9 C20 12 18 15 12 19 Z" fill="none"/>',
    scold: '<path d="M6 13 V8 C6 7 7 6 8 6 C9 6 10 7 10 8 V11 M10 9 V6 C10 5 11 4 12 4 C13 4 14 5 14 6 V11 M14 8 C14 7 15 6 16 6 C17 6 18 7 18 8 V14 C18 18 15 20 12 20 C9 20 6 18 6 14 V13" fill="none"/>',
    moon: '<path d="M15 4 C10 5 7 9 7 13 C7 17 10 20 14 20 C17 20 19 18 20 16 C18 17 16 17 14 16 C11 14 10 10 12 6 C13 5 14 4 15 4 Z" fill="none"/>',
    sun: '<circle cx="12" cy="12" r="4" fill="none"/><path d="M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6" fill="none"/>',
    shop: '<path d="M4 9 L6 4 H18 L20 9 Z M5 9 V20 H19 V9 M10 20 V14 H14 V20" fill="none"/>',
    stats: '<path d="M5 20 V12 M10 20 V6 M15 20 V10 M20 20 V14" fill="none"/>',
    gear: '<circle cx="12" cy="12" r="3" fill="none"/><path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.8 7.8 M16.2 16.2 L18.4 18.4 M5.6 18.4 L7.8 16.2 M16.2 7.8 L18.4 5.6" fill="none"/>',
    grave: '<path d="M7 20 V10 C7 6 9 4 12 4 C15 4 17 6 17 10 V20 Z M4 20 H20 M12 8 V14 M9.5 10.5 H14.5" fill="none"/>',
    coin: '<circle cx="12" cy="12" r="8" fill="none"/><path d="M12 7 V17 M9.5 9.5 C10 8.5 14 8.5 14.5 10 C15 12 9 12 9.5 14 C10 15.5 14 15.5 14.5 14.5" fill="none"/>',
    back: '<path d="M15 5 L8 12 L15 19" fill="none"/>',
    close: '<path d="M6 6 L18 18 M18 6 L6 18" fill="none"/>',
    house: '<path d="M4 12 L12 5 L20 12 V20 H4 Z" fill="none"/><path d="M9 20 V15 H15 V20" fill="none"/>',
    sound: '<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M16 9 C17.5 10.5 17.5 13.5 16 15 M18.5 6.5 C21.5 9.5 21.5 14.5 18.5 17.5" fill="none"/>',
    mute: '<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M16 9 L21 15 M21 9 L16 15" fill="none"/>',
    star: '<path d="' + 'M12 3 L14.6 9 L21 9.5 L16 13.6 L17.6 20 L12 16.6 L6.4 20 L8 13.6 L3 9.5 L9.4 9 Z' + '" fill="none"/>',
    tower: '<path d="M8 20 V8 L12 4 L16 8 V20 Z M6 20 H18 M10 12 H14 M10 16 H14" fill="none"/>',
    train: '<path d="M6 12 H18 M4 9 V15 M20 9 V15 M7 7 V17 M17 7 V17" fill="none"/>',
    hand: '<path d="M8 13 V6 C8 5 9 4 10 4 C11 4 12 5 12 6 V11 M12 7 C12 6 13 5 14 5 C15 5 16 6 16 7 V12 M16 9 C16 8 17 7 18 7 C19 7 20 8 20 9 V14 C20 18 17 21 13 21 C10 21 8 19 6 16 L4 12 C3.5 11 4 10 5 10 C6 10 7 11 8 13" fill="none"/>',
    shirt: '<path d="M8 4 L4 7 L6 11 L8 10 V20 H16 V10 L18 11 L20 7 L16 4 C15 6 9 6 8 4 Z" fill="none"/>',
    help: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M9.5 9.5 C9.5 7 14.5 7 14.5 9.5 C14.5 11.5 12 11.5 12 14" fill="none"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  };
  A.icon = (name, cls) =>
    `<svg viewBox="0 0 24 24" class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

  // ───────── SVG → キャンバス用の がぞう ─────────
  const imgCache = new Map();
  A.toImage = function (svg, size) {
    const key = size + ':' + svg.length + ':' + U.hashStr(svg);
    if (imgCache.has(key)) return imgCache.get(key);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, size, size);
        resolve(c);
      };
      img.onerror = () => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        resolve(c);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    imgCache.set(key, p);
    return p;
  };
  // しろく ひかる バージョン（ダメージを うけた とき）
  A.whiteOf = function (canvas) {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext('2d');
    g.drawImage(canvas, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };
})(window.HG);
