/* ハグクミ ui.js — がめんの ぶひん */
'use strict';
(function (HG) {
  const U = HG.util, h = U.h;
  const UI = (HG.ui = {});
  const layer = () => document.getElementById('layer');

  UI.toast = function (text) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = h('div', { class: 'toast', role: 'status' }, text);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  };

  // したから でてくる シート
  UI.sheet = function (opts) {
    const back = h('div', { class: 'back' });
    const close = () => {
      back.remove();
      opts.onClose && opts.onClose();
      HG.bus.emit('sheet-close');
    };
    const body = h('div', { class: 'sheet-b' });
    const sheet = h(
      'div',
      { class: 'sheet', role: 'dialog', 'aria-label': opts.title },
      h('div', { class: 'sheet-h' }, h('h2', {}, opts.title), h('button', { class: 'xbtn', 'aria-label': 'とじる', html: HG.art.icon('close'), onclick: () => { HG.audio.sfx('tap'); close(); } })),
      body
    );
    back.appendChild(sheet);
    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
    layer().appendChild(back);
    const api = { el: sheet, body, close, back };
    if (typeof opts.body === 'function') opts.body(body, api);
    else if (opts.body) body.appendChild(opts.body);
    return api;
  };
  UI.closeAll = function () {
    layer().innerHTML = '';
  };

  // まんなかの ダイアログ
  UI.modal = function (opts) {
    return new Promise((resolve) => {
      const back = h('div', { class: 'back center' });
      const m = h('div', { class: 'modal', role: 'dialog' });
      if (opts.art) m.appendChild(h('div', { class: 'art', html: opts.art }));
      if (opts.title) m.appendChild(h('h2', {}, opts.title));
      if (opts.html) m.appendChild(h('div', { class: 'gap', html: opts.html }));
      if (opts.body) m.appendChild(opts.body);
      const done = (v) => {
        back.remove();
        resolve(v);
      };
      const btns = h('div', { class: 'btns' });
      (opts.buttons || [{ label: 'OK', value: true, cls: 'lime' }]).forEach((b) => {
        btns.appendChild(
          h('button', {
            class: 'btn ' + (b.cls || 'white'),
            onclick: () => {
              HG.audio.sfx('tap');
              if (b.check && !b.check()) return;
              done(b.value);
            },
          }, b.label)
        );
      });
      m.appendChild(btns);
      back.appendChild(m);
      if (opts.dismiss) back.addEventListener('click', (e) => e.target === back && done(null));
      layer().appendChild(back);
      const f = m.querySelector('input');
      if (f) setTimeout(() => f.focus(), 50);
    });
  };
  UI.confirm = (title, html, okLabel, cancelLabel, danger) =>
    UI.modal({
      title,
      html,
      buttons: [
        { label: cancelLabel || 'やめる', value: false, cls: 'white' },
        { label: okLabel || 'OK', value: true, cls: danger ? 'danger' : 'lime' },
      ],
    });

  // フルスクリーン
  UI.full = function (title, opts) {
    opts = opts || {};
    const wrap = h('div', { class: 'full' });
    const inner = h('div', { class: 'full-in' });
    const top = h('div', { class: 'full-top' });
    const ttl = h('h2', {}, title || '');
    top.appendChild(ttl);
    let closeBtn = null;
    if (opts.closable !== false) {
      closeBtn = h('button', { class: 'xbtn', 'aria-label': 'とじる', html: HG.art.icon('close') });
      top.appendChild(closeBtn);
    }
    inner.appendChild(top);
    const body = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
    inner.appendChild(body);
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    const api = {
      el: wrap,
      top,
      body,
      title: ttl,
      closeBtn,
      close() {
        wrap.remove();
      },
    };
    if (closeBtn) closeBtn.onclick = () => (opts.onClose ? opts.onClose(api) : api.close());
    return api;
  };

  // うかぶ もじ
  UI.fx = function (container, text, x, y, color) {
    const f = h('div', { class: 'fx', style: { left: x + 'px', top: y + 'px', color: color || '' } }, text);
    container.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  };

  UI.typeChip = (type) => {
    const t = HG.TYPES[type] || HG.TYPES.normal;
    return h('span', { class: 'chip', style: { background: t.color, color: t.ink } }, t.name);
  };
  UI.styleChip = (style) => {
    const s = HG.STYLES[style];
    return h('span', { class: 'chip', style: { background: '#fff' } }, h('i', { style: { width: '8px', height: '8px', borderRadius: '50%', background: s.color, display: 'inline-block' } }), s.name);
  };
  const KIND = {
    proj: 'とびどうぐ', melee: 'ちかく', dash: 'とっしん', leap: 'ジャンプ', aoe_self: 'まわり', aoe_target: 'ねらいうち',
    beam: 'ビーム', cone: 'ほうしゃ', wave: 'なみ', zone: 'ばしょ', ring: 'ひろがる わ', heal: 'かいふく', buff: 'ほじょ',
    blink: 'まわりこみ', teleport: 'いどう', trap: 'ワナ', radial: 'ぜんほうい', line: 'ながい', aura: 'まとう', beams: 'ビーム',
  };
  UI.kindName = (k) => KIND[k] || '';
  UI.moveLine = (id) => {
    const m = HG.MOVES[id];
    if (!m) return '';
    const parts = [UI.kindName(m.kind)];
    if (m.power) parts.push('いりょく ' + m.power + (m.hits ? '×' + m.hits : m.count && m.kind !== 'trap' ? '×' + m.count : ''));
    parts.push('CT ' + m.cd + 'びょう');
    if (m.wind >= 0.5) parts.push('ためが ながい');
    else if (!m.wind) parts.push('ためなし');
    return parts.join('・');
  };

  // かいわ
  UI.senseiSvg = () =>
    `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><g stroke="#23194a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40,200 C40,150 66,132 100,132 C134,132 160,150 160,200 Z" fill="#ffffff"/>
    <path d="M84,134 L100,170 L116,134" fill="#9fd8ff"/>
    <path d="M70,150 C64,170 70,184 82,186" fill="none" stroke="#3b3f58" stroke-width="5"/><circle cx="84" cy="188" r="6" fill="#c8d3e6"/>
    <circle cx="100" cy="92" r="46" fill="#ffe0c2"/>
    <path d="M54,92 C50,52 76,38 100,38 C126,38 152,50 148,96 C140,74 122,62 100,64 C84,66 66,74 54,92 Z" fill="#5a3a2a"/>
    <circle cx="100" cy="34" r="16" fill="#5a3a2a"/>
    <circle cx="82" cy="98" r="11" fill="#ffffff"/><circle cx="118" cy="98" r="11" fill="#ffffff"/><path d="M93,98 L107,98" fill="none"/>
    <circle cx="82" cy="99" r="4" fill="#23194a" stroke="none"/><circle cx="118" cy="99" r="4" fill="#23194a" stroke="none"/>
    <path d="M90,118 C95,123 105,123 110,118" fill="none"/>
    <ellipse cx="68" cy="114" rx="7" ry="4" fill="#ff9fb3" stroke="none"/><ellipse cx="132" cy="114" rx="7" ry="4" fill="#ff9fb3" stroke="none"/></g></svg>`;

  UI.talk = function (lines, ctx) {
    ctx = ctx || {};
    return new Promise((resolve) => {
      if (!lines || !lines.length) return resolve();
      const face = h('div', { class: 'face' });
      const who = h('div', { class: 'who' });
      const txt = h('div', { class: 'txt' });
      const box = h('div', { class: 'box' }, who, txt, h('div', { class: 'next' }, 'タップで つぎへ ▼'));
      const wrap = h('div', { class: 'talk' }, h('div', { class: 'talk-in' }, face, box));
      document.body.appendChild(wrap);
      let i = 0, typing = null, full = '';
      const show = () => {
        const [sp, raw] = lines[i];
        let text = raw.replace(/\{name\}/g, ctx.petName || '');
        if (sp === 'pet') {
          face.innerHTML = ctx.petSvg || '';
          who.textContent = ctx.petName || '';
          if (text === '…' || text === '…！' || text === '！' || text === '……。' || text === '…！') text = text + ' ' + (ctx.cry || '');
        } else if (sp === 'sensei') {
          face.innerHTML = UI.senseiSvg();
          who.textContent = 'モリせんせい';
        } else if (sp === 'enemy') {
          face.innerHTML = ctx.enemySvg || '';
          who.textContent = ctx.enemyName || '？？？';
        } else {
          face.innerHTML = '';
          who.textContent = '';
        }
        who.style.display = who.textContent ? '' : 'none';
        full = text;
        txt.textContent = '';
        let k = 0;
        clearInterval(typing);
        typing = setInterval(() => {
          k += 2;
          txt.textContent = full.slice(0, k);
          if (k >= full.length) {
            clearInterval(typing);
            typing = null;
          }
        }, 28);
      };
      wrap.addEventListener('click', () => {
        if (typing) {
          clearInterval(typing);
          typing = null;
          txt.textContent = full;
          return;
        }
        HG.audio.sfx('tap');
        i++;
        if (i >= lines.length) {
          wrap.remove();
          resolve();
        } else show();
      });
      show();
    });
  };

  // QRコード（SVG）
  UI.qr = function (text) {
    try {
      const q = qrcode(0, 'M');
      q.addData(text);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {
      return '';
    }
  };
})(window.HG);
