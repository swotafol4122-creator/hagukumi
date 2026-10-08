/* ハグクミ net.js — スマホどうしの たいせん（PeerJS / WebRTC） */
'use strict';
(function (HG) {
  const U = HG.util, h = U.h, UI = HG.ui, P = HG.P;
  const PV = (HG.pvp = {});
  const PREFIX = 'hagukumi-v1-';
  const useLocal = /[?&]net=local/.test(location.search);

  // ───────── つうしんの しくみ ─────────
  // conn: { send(obj), onData(fn), onClose(fn), close() }
  function wrapPeerConn(conn, peer) {
    const dataFns = [], closeFns = [];
    let closed = false;
    conn.on('data', (d) => dataFns.forEach((f) => f(d)));
    const fireClose = () => {
      if (closed) return;
      closed = true;
      closeFns.forEach((f) => f());
    };
    conn.on('close', fireClose);
    conn.on('error', fireClose);
    if (peer) peer.on('disconnected', () => {});
    return {
      send(o) { try { if (conn.open) conn.send(o); } catch (e) {} },
      onData(f) { dataFns.push(f); },
      onClose(f) { closeFns.push(f); },
      close() { try { conn.close(); } catch (e) {} try { peer && peer.destroy(); } catch (e) {} fireClose(); },
    };
  }
  function peerHost(code) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('nopeer'));
      let peer;
      try { peer = new Peer(PREFIX + code, { debug: 0 }); } catch (e) { return reject(e); }
      let waiting = null;
      const api = {
        peer,
        wait: new Promise((res2, rej2) => (waiting = { res2, rej2 })),
        cancel() { try { peer.destroy(); } catch (e) {} },
      };
      peer.on('open', () => resolve(api));
      peer.on('error', (err) => {
        if (err && err.type === 'unavailable-id') reject(new Error('taken'));
        else if (waiting) waiting.rej2(err), reject(err);
      });
      peer.on('connection', (conn) => {
        conn.on('open', () => waiting && waiting.res2(wrapPeerConn(conn, peer)));
      });
    });
  }
  function peerJoin(code) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('nopeer'));
      let peer;
      try { peer = new Peer({ debug: 0 }); } catch (e) { return reject(e); }
      const timer = setTimeout(() => { reject(new Error('timeout')); try { peer.destroy(); } catch (e) {} }, 20000);
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => { clearTimeout(timer); resolve(wrapPeerConn(conn, peer)); });
        conn.on('error', (e) => { clearTimeout(timer); reject(e); });
      });
      peer.on('error', (err) => {
        clearTimeout(timer);
        reject(err && err.type === 'peer-unavailable' ? new Error('noroom') : err);
      });
    });
  }
  // おなじ たんまつの 2つの タブで ためす とき（?net=local）
  function localHost(code) {
    return Promise.resolve({
      wait: new Promise((res2) => {
        const ch = new BroadcastChannel(PREFIX + code);
        ch.onmessage = (e) => {
          if (e.data && e.data.__hello) {
            ch.postMessage({ __welcome: true });
            res2(wrapBC(ch));
          }
        };
      }),
      cancel() {},
    });
  }
  function localJoin(code) {
    return new Promise((resolve, reject) => {
      const ch = new BroadcastChannel(PREFIX + code);
      const timer = setTimeout(() => reject(new Error('noroom')), 4000);
      ch.onmessage = (e) => {
        if (e.data && e.data.__welcome) {
          clearTimeout(timer);
          resolve(wrapBC(ch));
        }
      };
      ch.postMessage({ __hello: true });
    });
  }
  function wrapBC(ch) {
    const dataFns = [], closeFns = [];
    let closed = false;
    ch.onmessage = (e) => {
      if (!e.data || e.data.__hello || e.data.__welcome) return;
      if (e.data.__bye) { if (!closed) { closed = true; closeFns.forEach((f) => f()); } return; }
      dataFns.forEach((f) => f(e.data));
    };
    window.addEventListener('pagehide', () => { try { ch.postMessage({ __bye: true }); } catch (e) {} });
    return {
      send(o) { try { ch.postMessage(o); } catch (e) {} },
      onData(f) { dataFns.push(f); },
      onClose(f) { closeFns.push(f); },
      close() { try { ch.postMessage({ __bye: true }); ch.close(); } catch (e) {} if (!closed) { closed = true; closeFns.forEach((f) => f()); } },
    };
  }
  const T = { host: (c) => (useLocal ? localHost(c) : peerHost(c)), join: (c) => (useLocal ? localJoin(c) : peerJoin(c)) };

  // ───────── データの チェック ─────────
  function mySpec(rules) {
    const s = HG.save;
    const sp = P.fighterSpec(s, { level: rules.flat ? 50 : null });
    if (rules.flat) sp.level = 50;
    sp.disc = 100;
    sp.v = HG.VERSION;
    return sp;
  }
  function cleanSpec(sp) {
    if (!sp || typeof sp !== 'object') return null;
    const n = (v, a, b) => U.clamp(Math.round(Number(v) || 0), a, b);
    const look = sp.look || {};
    const out = {
      name: String(sp.name || 'あいて').slice(0, 8),
      look: {
        stage: n(look.stage, 1, 4),
        egg: HG.EGGS[look.egg] ? look.egg : 'white',
        type: HG.TYPES[look.type] ? look.type : 'normal',
        style: HG.STYLES[look.style] ? look.style : 'cute',
        dna: n(look.dna, 0, 1e7),
        acc: {},
      },
      level: n(sp.level, 1, 50),
      stage: n(sp.stage, 1, 4),
      type: HG.TYPES[sp.type] ? sp.type : 'normal',
      style: HG.STYLES[sp.style] ? sp.style : 'cute',
      stats: {},
      moves: (Array.isArray(sp.moves) ? sp.moves : []).filter((id) => HG.MOVES[id] && !HG.MOVES[id].boss).slice(0, 4),
      bond: n(sp.bond, 0, 100),
      disc: 100,
      r: U.clamp(Number(sp.r) || 24, 16, 36),
      v: String(sp.v || ''),
    };
    ['head', 'face', 'neck'].forEach((k) => { if (look.acc && HG.ACCS[look.acc[k]]) out.look.acc[k] = look.acc[k]; });
    ['hp', 'atk', 'def', 'spd', 'int'].forEach((k) => (out.stats[k] = n(sp.stats && sp.stats[k], 1, k === 'hp' ? 1200 : 400)));
    if (!out.moves.length) out.moves = ['tackle'];
    return out;
  }

  // ───────── ロビー ─────────
  let lobby = null; // { conn, isHost, code, rules, opp, meReady, oppReady, rtt, view }
  let container = null;

  PV.page = function (c) {
    container = c;
    render();
  };
  function render() {
    if (!container || !document.body.contains(container)) return;
    container.innerHTML = '';
    const pet = HG.save.pet;
    const page = h('div', { class: 'page' }, h('h1', { class: 'page-h' }, 'たいせん'), h('p', { class: 'page-sub' }, 'ともだちの スマホと つないで リアルタイムバトル。まけても しなないよ。'));
    container.appendChild(page);
    if (window.HG_PREVIEW) {
      page.appendChild(h('div', { class: 'card gap' }, h('h3', {}, 'この プレビューでは たいせん できません'), h('p', { style: { margin: 0 } }, 'スマホどうしの たいせんは、GitHub Pages で こうかいした ページで あそべるよ（README の てじゅんを みてね）。'), h('p', { class: 'muted', style: { margin: 0 } }, 'そだてる・ミニゲーム・ストーリーバトルは ここでも ぜんぶ あそべるよ。')));
      return;
    }
    if (!lobby) return renderIdle(page, pet);
    if (lobby.view === 'hosting') return renderHosting(page);
    if (lobby.view === 'joining') return renderJoining(page);
    if (lobby.view === 'vs') return renderVs(page);
    if (lobby.view === 'connecting') {
      page.appendChild(h('div', { class: 'card center gap' }, h('h3', {}, 'つないでいます…'), h('p', { class: 'muted', style: { margin: 0 } }, 'すこし まってね'), h('button', { class: 'btn white', onclick: leave }, 'やめる')));
    }
  }
  function canFight(pet) {
    if (!pet || pet.stage < 1 || pet.dead) return 'あいぼうが いないよ';
    if (pet.asleep) return 'ねているよ。おこしてから たいせん しよう';
    if (pet.daycareUntil && HG.clock.now() < pet.daycareUntil) return 'あずかりやに いるよ';
    if (pet.sick) return 'びょうきの ときは たいせん できない';
    return null;
  }
  function renderIdle(page, pet) {
    const look = P.look(pet);
    page.appendChild(h('div', { class: 'card hero' },
      h('div', { class: 'art', html: HG.art.creature(look, { uid: 'pv', cls: 'anim-idle' }) }),
      h('div', { class: 'who' }, h('b', {}, pet.name), h('span', { class: 'muted' }, HG.formName(look) + '・Lv.' + pet.level), h('div', { class: 'chips' }, UI.typeChip(pet.type)), h('span', { class: 'small' }, 'せいせき ' + HG.save.pvp.w + 'しょう ' + HG.save.pvp.l + 'はい'))
    ));
    const flatSel = h('input', { type: 'checkbox', id: 'pv-flat' });
    const card = h('div', { class: 'card gap' },
      h('button', { class: 'btn big pink', onclick: () => host(flatSel.checked) }, 'へやを つくる'),
      h('label', { class: 'row', for: 'pv-flat', style: { justifyContent: 'space-between' } }, h('span', { class: 'small' }, 'みんな Lv.50 に そろえる（へやを つくる ひとが きめる）'), h('span', { class: 'switch' }, flatSel, h('span', {}))),
      h('button', { class: 'btn big sky', onclick: () => { lobby = { view: 'joining' }; render(); } }, 'へやに はいる')
    );
    page.appendChild(card);
    page.appendChild(h('div', { class: 'card flat gap' },
      h('h3', {}, 'つながらない ときは'),
      h('p', { class: 'small', style: { margin: 0 } }, '・2だいとも インターネットに つないでね。'),
      h('p', { class: 'small', style: { margin: 0 } }, '・おなじ Wi-Fi に つなぐか、かたほうの スマホの テザリングに もうかたほうを つなぐと つながりやすいよ。'),
      h('p', { class: 'small', style: { margin: 0 } }, '・2だいとも おなじ バージョンの ページを ひらいてね（ページを さいよみこみ）。')
    ));
  }
  function renderHosting(page) {
    const url = location.origin + location.pathname + '?room=' + lobby.code;
    const qr = h('div', { class: 'qr', html: UI.qr(url) });
    page.appendChild(h('div', { class: 'card gap center' },
      h('h3', {}, 'へやの ばんごう'),
      h('div', { class: 'code' }, lobby.code),
      lobby.local ? h('p', { class: 'muted', style: { margin: 0 } }, 'テストモード（おなじ たんまつの べつの タブで はいれる）') : qr,
      h('p', { class: 'small', style: { margin: 0 } }, 'あいてに ばんごうを おしえるか、QRコードを よみとって もらってね。'),
      h('p', { class: 'muted', style: { margin: 0 } }, lobby.rules.flat ? 'ルール：みんな Lv.50' : 'ルール：レベル そのまま'),
      h('p', { style: { margin: 0 } }, 'あいてを まっています…'),
      h('button', { class: 'btn white', onclick: leave }, 'やめる')
    ));
  }
  function renderJoining(page) {
    const input = h('input', { class: 'code-input', id: 'pv-code', inputmode: 'numeric', maxlength: '4', placeholder: '0000', autocomplete: 'off' });
    const go = h('button', { class: 'btn big sky block' }, 'はいる');
    go.onclick = () => {
      const v = input.value.replace(/\D/g, '');
      if (v.length !== 4) return UI.toast('4けたの ばんごうを いれてね');
      PV.join(v);
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go.onclick());
    page.appendChild(h('div', { class: 'card gap' }, h('h3', {}, 'へやの ばんごう'), input, go, h('button', { class: 'btn white', onclick: leave }, 'もどる')));
    setTimeout(() => input.focus(), 60);
  }
  function renderVs(page) {
    const L = lobby;
    const me = mySpec(L.rules);
    const opp = L.opp;
    const side = (sp, ready, label) => h('div', { class: 'side' },
      h('div', { class: 'art', html: sp ? HG.art.creature(sp.look, { uid: 'vs' + label, cls: 'anim-idle' }) : '' }),
      h('b', { style: { display: 'block', marginTop: '4px', overflowWrap: 'anywhere' } }, sp ? sp.name : '…'),
      h('span', { class: 'small' }, sp ? 'Lv.' + sp.level : ''),
      h('div', {}, sp ? UI.typeChip(sp.type) : null),
      h('span', { class: ready ? 'pill-ok' : 'pill-wait' }, ready ? 'じゅんびOK' : 'まってる')
    );
    page.appendChild(h('div', { class: 'card gap' },
      h('div', { class: 'vs' }, side(me, L.meReady, 'me'), h('div', { class: 'mid' }, 'VS'), side(opp, L.oppReady, 'op')),
      h('p', { class: 'muted center', style: { margin: 0 } }, (L.rules.flat ? 'ルール：みんな Lv.50' : 'ルール：レベル そのまま') + (L.rtt ? '・つうしん ' + Math.round(L.rtt) + 'ms' : '')),
      opp && opp.v && opp.v !== HG.VERSION ? h('p', { class: 'small', style: { margin: 0, color: 'var(--danger)' } }, 'あいてと バージョンが ちがうよ。うまく うごかない ときは ページを さいよみこみ してね。') : null,
      h('div', { class: 'btns' },
        h('button', { class: 'btn white', onclick: leave }, 'ぬける'),
        h('button', { class: 'btn big ' + (L.meReady ? 'white' : 'pink'), disabled: !opp || L.meReady ? true : null, onclick: ready }, L.meReady ? 'まってね…' : 'じゅんびOK！')
      )
    ));
  }

  function newCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  async function host(flat) {
    const pet = HG.save.pet;
    const why = canFight(pet);
    if (why) return UI.toast(why);
    HG.audio.sfx('select');
    for (let tries = 0; tries < 4; tries++) {
      const code = newCode();
      lobby = { view: 'connecting', isHost: true, code, rules: { flat: !!flat }, local: useLocal };
      render();
      try {
        const hd = await T.host(code);
        if (!lobby || lobby.code !== code) { hd.cancel(); return; }
        lobby.hostHandle = hd;
        lobby.view = 'hosting';
        render();
        const conn = await hd.wait;
        if (!lobby || lobby.code !== code) { conn.close(); return; }
        attach(conn);
        conn.send({ t: 'rules', rules: lobby.rules, v: HG.VERSION });
        conn.send({ t: 'ping', at: Date.now() });
        return;
      } catch (e) {
        if (e && e.message === 'taken') continue;
        fail(e);
        return;
      }
    }
    fail(new Error('busy'));
  }
  PV.join = async function (code) {
    const pet = HG.save.pet;
    const why = canFight(pet);
    if (why) { UI.toast(why); lobby = null; render(); return; }
    lobby = { view: 'connecting', isHost: false, code: String(code), rules: { flat: false } };
    render();
    try {
      const conn = await T.join(String(code));
      if (!lobby) { conn.close(); return; }
      attach(conn);
    } catch (e) {
      fail(e);
    }
  };
  function fail(e) {
    const msg = !e ? '' : e.message === 'noroom' ? 'その ばんごうの へやが みつからない' : e.message === 'timeout' ? 'じかんぎれ。もういちど ためしてね' : e.message === 'nopeer' ? 'この ばしょでは たいせん できない（GitHub Pages で ひらいてね）' : 'つながらなかった（' + (e.type || e.message || '') + '）';
    try { lobby && lobby.hostHandle && lobby.hostHandle.cancel(); } catch (x) {}
    try { lobby && lobby.conn && lobby.conn.close(); } catch (x) {}
    lobby = null;
    UI.toast(msg);
    render();
  }
  function leave() {
    HG.audio.sfx('tap');
    if (lobby) {
      try { lobby.conn && lobby.conn.send({ t: 'bye' }); } catch (e) {}
      try { lobby.conn && lobby.conn.close(); } catch (e) {}
      try { lobby.hostHandle && lobby.hostHandle.cancel(); } catch (e) {}
    }
    lobby = null;
    render();
  }
  function ready() {
    if (!lobby || !lobby.opp) return;
    const why = canFight(HG.save.pet);
    if (why) return UI.toast(why);
    HG.audio.sfx('select');
    lobby.meReady = true;
    lobby.conn.send({ t: 'ready' });
    render();
    maybeStart();
  }
  function maybeStart() {
    const L = lobby;
    if (!L || !L.isHost || !L.meReady || !L.oppReady || L.started) return;
    L.started = true;
    L.conn.send({ t: 'start' });
    setTimeout(() => begin(), Math.round((L.rtt || 80) / 2));
  }
  function attach(conn) {
    const L = lobby;
    L.conn = conn;
    L.view = 'vs';
    L.meReady = false;
    L.oppReady = false;
    L.battleFns = [];
    L.closeFns = [];
    conn.onData((m) => {
      if (!lobby || lobby.conn !== conn || !m || typeof m !== 'object') return;
      if (lobby.inBattle) { lobby.battleFns.forEach((f) => f(m)); return; }
      switch (m.t) {
        case 'rules':
          lobby.rules = { flat: !!(m.rules && m.rules.flat) };
          conn.send({ t: 'hello', spec: mySpec(lobby.rules) });
          render();
          break;
        case 'hello':
          lobby.opp = cleanSpec(m.spec);
          if (lobby.isHost && !lobby.sentHello) {
            lobby.sentHello = true;
            conn.send({ t: 'hello', spec: mySpec(lobby.rules) });
          }
          HG.audio.sfx('ok');
          render();
          break;
        case 'ping':
          conn.send({ t: 'pong', at: m.at });
          break;
        case 'pong':
          lobby.rtt = Date.now() - m.at;
          render();
          break;
        case 'ready':
          lobby.oppReady = true;
          render();
          maybeStart();
          break;
        case 'start':
          if (!lobby.isHost) begin();
          break;
        case 'bye':
          UI.toast('あいてが ぬけた');
          lobby = null;
          try { conn.close(); } catch (e) {}
          render();
          break;
      }
    });
    conn.onClose(() => {
      if (lobby && lobby.conn === conn) {
        if (lobby.inBattle) { lobby.closeFns.forEach((f) => f()); return; }
        UI.toast('つうしんが きれた');
        lobby = null;
        render();
      }
    });
    render();
  }
  function begin() {
    const L = lobby;
    if (!L || !L.opp) return;
    L.inBattle = true;
    L.started = false;
    L.battleFns = [];
    L.closeFns = [];
    const session = {
      isHost: L.isHost,
      send: (m) => L.conn.send(m),
      onMsg: (fn) => L.battleFns.push(fn),
      onClose: (fn) => L.closeFns.push(fn),
      mySpec: mySpec(L.rules),
      oppSpec: L.opp,
      startAt: Date.now(),
      after: () => {
        if (lobby !== L) { HG.screens.main('pvp'); return; }
        L.inBattle = false;
        L.meReady = false;
        L.oppReady = false;
        L.view = 'vs';
        // あいての あたらしい じょうほうを もらいなおす
        HG.screens.main('pvp');
      },
    };
    HG.battleUI.startPvp(session);
  }
})(window.HG);
