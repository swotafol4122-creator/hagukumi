/* ハグクミ battle-ui.js — バトルの がめん と ながれ */
'use strict';
(function (HG) {
  const U = HG.util, h = U.h, UI = HG.ui, P = HG.P;
  const BU = (HG.battleUI = {});
  const W = HG.Battle.W, H = HG.Battle.H;

  async function spriteFor(f, look, art) {
    const svg = art ? HG.art.boss(art, {}) : HG.art.creature(look, { uid: 'b' + f.id });
    const img = await HG.art.toImage(svg, 220);
    f.sprite = img;
    f.spriteW = HG.art.whiteOf(img);
  }

  // ───────── がめんを つくる ─────────
  function buildScreen(opts) {
    const full = UI.full('', { closable: false });
    full.el.classList.add('battle');
    full.top.remove();
    const top = h('div', { class: 'bt-top' });
    const foeName = h('b', { class: 'bt-name' });
    const foeChips = h('span', { class: 'chips' });
    const foeBar = h('div', { class: 'bt-hp' }, h('i'));
    const pauseBtn = h('button', { class: 'xbtn', 'aria-label': 'ポーズ', html: '<svg viewBox="0 0 24 24" class="ic" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M9 6 V18 M15 6 V18"/></svg>' });
    top.append(h('div', { class: 'grow' }, h('div', { class: 'row', style: { gap: '6px' } }, foeName, foeChips), foeBar), pauseBtn);
    const stage = h('div', { class: 'bt-stage' });
    const canvas = h('canvas');
    stage.appendChild(canvas);
    const banner = h('div', { class: 'bt-banner', style: { display: 'none' } });
    stage.appendChild(banner);
    const center = h('div', { class: 'mg-msg', style: { display: 'none' } });
    stage.appendChild(center);
    const me = h('div', { class: 'bt-me' });
    const myName = h('b', { class: 'bt-name' });
    const myBar = h('div', { class: 'bt-hp mine' }, h('i'));
    const gauge = h('div', { class: 'bt-gauge' }, h('i'));
    me.append(h('div', { class: 'row', style: { gap: '8px' } }, myName, h('span', { class: 'small', style: { opacity: 0.85 } }, 'きずな'), gauge), myBar);
    const ctrl = h('div', { class: 'bt-ctrl' });
    const joy = h('div', { class: 'bt-joy' }, h('div', { class: 'joy-base' }, h('div', { class: 'joy-knob' })), h('span', { class: 'joy-hint' }, 'ここを なぞって いどう'));
    const pad = h('div', { class: 'bt-pad' });
    ctrl.append(joy, pad);
    full.body.append(top, stage, me, ctrl);
    return { full, top, foeName, foeChips, foeBar, pauseBtn, stage, canvas, banner, center, me, myName, myBar, gauge, ctrl, joy, pad };
  }

  // ───────── そうさ ─────────
  function setupInput(ui, b, me, state) {
    const it = me.intent;
    const keys = {};
    // ジョイスティック
    const base = ui.joy.querySelector('.joy-base');
    const knob = ui.joy.querySelector('.joy-knob');
    let jid = null, jx = 0, jy = 0;
    const R = 46;
    ui.joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jid = e.pointerId;
      ui.joy.setPointerCapture(e.pointerId);
      const r = ui.joy.getBoundingClientRect();
      jx = e.clientX - r.left;
      jy = e.clientY - r.top;
      base.style.left = jx + 'px';
      base.style.top = jy + 'px';
      base.classList.add('on');
      knob.style.transform = 'translate(-50%,-50%)';
      ui.joy.classList.add('used');
    });
    ui.joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== jid) return;
      const r = ui.joy.getBoundingClientRect();
      let dx = e.clientX - r.left - jx, dy = e.clientY - r.top - jy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      state.joyX = dx / R;
      state.joyY = dy / R;
      if (state.onMove) state.onMove();
    });
    const end = (e) => {
      if (e.pointerId !== jid) return;
      jid = null;
      state.joyX = state.joyY = 0;
      base.classList.remove('on');
      knob.style.transform = 'translate(-50%,-50%)';
    };
    ui.joy.addEventListener('pointerup', end);
    ui.joy.addEventListener('pointercancel', end);
    // ボタン
    const btns = [];
    const mkBtn = (cls, label, sub, fn) => {
      const b2 = h('button', { class: 'bt-btn ' + cls }, h('span', { class: 'cd' }), h('span', { class: 'lb' }, label), sub ? h('small', {}, sub) : null);
      b2.addEventListener('pointerdown', (e) => { e.preventDefault(); HG.audio.unlock(); fn(); });
      ui.pad.appendChild(b2);
      return b2;
    };
    me.moves.forEach((m, i) => {
      const def = m.def;
      const b2 = mkBtn('mv m' + i, def.name.length > 6 ? def.name.slice(0, 6) : def.name, null, () => { it.move = i; state.onAttack && state.onAttack(); });
      b2.style.setProperty('--k', HG.TYPES[def.type].color);
      b2.style.setProperty('--ki', HG.TYPES[def.type].ink);
      btns[i] = b2;
    });
    for (let i = me.moves.length; i < 4; i++) {
      const b2 = mkBtn('mv m' + i + ' empty', '—', null, () => {});
      b2.disabled = true;
    }
    const dodge = mkBtn('dodge', 'よける', null, () => { it.dodge = true; state.onDodge && state.onDodge(); });
    const burst = mkBtn('burst', 'バースト', null, () => (it.burst = true));
    const item = mkBtn('item', '', String(me.potions), () => (it.item = true));
    item.querySelector('.lb').innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" fill="#ffd9b0" stroke="#23194a" stroke-width="2"/><rect x="9" y="9" width="6" height="6" rx="1.5" transform="rotate(-35 12 12)" fill="#ffffff" stroke="#23194a" stroke-width="1.6"/></svg>';
    if (!me.potions) item.style.visibility = 'hidden';
    // キーボード
    const kd = (e) => {
      if (e.repeat) return;
      keys[e.code] = true;
      const map = { KeyJ: 0, Digit1: 0, KeyK: 1, Digit2: 1, KeyL: 2, Digit3: 2, Semicolon: 3, Digit4: 3 };
      if (e.code in map) { it.move = map[e.code]; state.onAttack && state.onAttack(); }
      if (e.code === 'Space') { e.preventDefault(); it.dodge = true; state.onDodge && state.onDodge(); }
      if (e.code === 'KeyE') it.burst = true;
      if (e.code === 'KeyQ') it.item = true;
      if (e.code === 'Tab') { e.preventDefault(); b.cycleTarget(me); }
    };
    const ku = (e) => (keys[e.code] = false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    // ロックオン（タップ）
    ui.canvas.addEventListener('pointerdown', (e) => {
      const r = ui.canvas.getBoundingClientRect();
      const w = state.renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
      let best = null, bd = 90;
      b.foes(me).forEach((f) => { const d = U.dist(w.x, w.y, f.x, f.y); if (d < bd) { bd = d; best = f; } });
      if (best) { me.target = best; HG.audio.sfx('select'); }
    });
    state.readInput = () => {
      const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      const ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      let mx = state.joyX || 0, my = state.joyY || 0;
      if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; if (state.onMove) state.onMove(); }
      it.mx = mx;
      it.my = my;
    };
    state.cleanupInput = () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    state.btns = { moves: btns, dodge, burst, item };
  }

  function updateHud(ui, b, me, state) {
    const t = b.targetOf(me);
    const boss = b.fighters.find((f) => f.boss && !f.dead && f.side !== me.side);
    const show = boss || t;
    if (show) {
      if (state.hudFoe !== show) {
        state.hudFoe = show;
        ui.foeName.textContent = show.name + '  Lv.' + show.level;
        ui.foeChips.innerHTML = '';
        ui.foeChips.appendChild(UI.typeChip(show.type));
      }
      const k = show.hp / show.maxHp;
      const i = ui.foeBar.firstChild;
      i.style.width = k * 100 + '%';
      i.style.background = k < 0.3 ? 'var(--danger)' : boss ? '#ff9f1c' : 'var(--ok)';
    }
    ui.myName.textContent = me.name + '  Lv.' + me.level;
    const mk = me.hp / me.maxHp;
    ui.myBar.firstChild.style.width = mk * 100 + '%';
    ui.myBar.firstChild.style.background = mk < 0.3 ? 'var(--danger)' : 'var(--ok)';
    ui.myBar.dataset.hp = Math.ceil(me.hp) + ' / ' + me.maxHp;
    ui.gauge.firstChild.style.width = (me.burst > 0 ? (me.burst / 10) * 100 : me.gauge) + '%';
    ui.gauge.classList.toggle('full', me.gauge >= 100 || me.burst > 0);
    const B = state.btns;
    me.moves.forEach((m, i) => {
      const btn = B.moves[i];
      const k = m.cd > 0 ? m.cd / (m.def.cd * b.cdMul(me)) : 0;
      btn.querySelector('.cd').style.setProperty('--p', Math.min(1, k) * 360 + 'deg');
      btn.classList.toggle('cool', m.cd > 0);
      btn.classList.toggle('plus', me.burst > 0);
    });
    const dk = me.dodge.cd > 0 ? me.dodge.cd / Math.max(0.55, 1.15 - me.stats.spd / 250) : 0;
    B.dodge.querySelector('.cd').style.setProperty('--p', Math.min(1, dk) * 360 + 'deg');
    B.dodge.classList.toggle('cool', me.dodge.cd > 0);
    B.burst.classList.toggle('ready', me.gauge >= 100 && me.burst <= 0);
    B.burst.disabled = !(me.gauge >= 100 && me.burst <= 0);
    const sub = B.item.querySelector('small');
    if (sub) sub.textContent = String(Math.min(me.potions, 2 - me.potionUsed));
    B.item.disabled = me.potions <= 0 || me.potionUsed >= 2;
  }

  function banner(ui, text, ms) {
    ui.banner.textContent = text;
    ui.banner.style.display = '';
    clearTimeout(ui._bt);
    ui._bt = setTimeout(() => (ui.banner.style.display = 'none'), ms || 2200);
  }
  async function countdown(ui, words) {
    ui.center.style.display = '';
    for (const w of words || ['3', '2', '1']) {
      ui.center.textContent = w;
      HG.audio.sfx('countdown');
      await U.sleep(600);
    }
    ui.center.textContent = 'バトル スタート！';
    HG.audio.sfx('go');
    await U.sleep(600);
    ui.center.style.display = 'none';
  }

  function hookSounds(b, me) {
    b.on((type, d) => {
      if (type === 'sfx') HG.audio.sfx(d.s);
      else if (type === 'hit') {
        HG.audio.sfx(d.big ? 'bighit' : 'hit');
        if (d.t === me) HG.vibrate(d.big ? 60 : 25);
      } else if (type === 'burst') HG.audio.sfx('evolve');
      else if (type === 'ko') HG.audio.sfx('bighit');
      else if (type === 'disobey') HG.audio.sfx('ng');
    });
  }

  // ───────── ストーリー・とっくん・とう ─────────
  BU.start = async function (opts) {
    const s = HG.save, pet = s.pet;
    HG.state.inBattle = true;
    HG.state.busy = true;
    const lethal = opts.mode === 'story' && opts.lethal !== false;
    pet.inBattle = { lethal, at: Date.now(), ch: opts.chapter, node: opts.node };
    P.persist();
    UI.closeAll();
    const b = new HG.Battle({ mode: opts.mode, arena: opts.arena });
    const spec = P.fighterSpec(s);
    const me = b.addFighter(spec, 'A', { x: W / 2, y: H * 0.8, local: true, ctrl: 'input', canBurst: true, potions: Math.min(2, s.items.potion || 0) });
    let aiLv = opts.mode === 'story' || opts.mode === 'tutorial' ? opts.chapter || 0 : Math.min(8, Math.floor(pet.level / 5));
    if (opts.mode === 'tower') aiLv = Math.min(9, 6 + Math.floor((opts.floor || 1) / 4));
    const foes = [];
    const n = opts.enemies.length;
    opts.enemies.forEach(([id, lv], i) => {
      const es = P.enemySpec(id, lv, { pair: n > 1 });
      const x = n === 1 ? W / 2 : W * (0.3 + (0.4 * i) / (n - 1));
      const f = b.addFighter(es, 'B', { x, y: H * 0.22, ai: HG.AI.preset(aiLv, es.boss), mist: opts.mode === 'story' && !es.tame });
      f.face = Math.PI / 2;
      f.flip = -1;
      foes.push([f, HG.ENEMIES[id]]);
    });
    const ui = buildScreen(opts);
    const r = new HG.BattleRenderer(ui.canvas, b, { localSide: 'A' });
    const state = { renderer: r };
    BU.current = { b, me };
    setupInput(ui, b, me, state);
    hookSounds(b, me);
    await Promise.all([spriteFor(me, spec.look)].concat(foes.map(([f, d]) => spriteFor(f, d.look, d.art))));
    HG.audio.bgm(opts.boss || foes.some(([f]) => f.boss) ? 'boss' : 'battle');
    let paused = false, running = false, ended = false, raf = 0;
    // チュートリアル
    let tut = opts.mode === 'tutorial' ? 0 : -1;
    const tutText = ['ひだりしたを なぞって うごいてみよう', 'みぎの わざボタンで こうげき！', 'あかい はんいや たまが きたら「よける」！ よけている あいだは むてき', 'ゲージが たまったら「バースト」で パワーアップ！', 'その ちょうし！ たおしてみよう'];
    if (tut >= 0) {
      banner(ui, tutText[0], 60000);
      state.onMove = () => { if (tut === 0) { tut = 1; banner(ui, tutText[1], 60000); } };
      state.onAttack = () => { if (tut === 1) { tut = 2; setTimeout(() => banner(ui, tutText[2], 60000), 800); } };
      state.onDodge = () => { if (tut === 2) { tut = 3; banner(ui, tutText[4], 4000); } };
    }
    b.on((type, d) => {
      if (type === 'say') {
        const ed = foes.find(([f]) => f === d.f);
        banner(ui, d.f.name + '「' + d.text + '」', 2600);
      } else if (type === 'summon') {
        d.list.forEach((id, i) => {
          const es = P.enemySpec(id, Math.max(1, d.f.level - 4), { minion: true });
          const f = b.addFighter(es, 'B', { x: i % 2 ? 80 : W - 80, y: 90, ai: HG.AI.preset(aiLv), mist: true });
          spriteFor(f, HG.ENEMIES[id].look, HG.ENEMIES[id].art);
        });
      } else if (type === 'item' && d.f === me) {
        s.items.potion = Math.max(0, (s.items.potion || 0) - 1);
        P.persist();
      } else if (type === 'end') {
        if (ended) return;
        ended = true;
        setTimeout(() => finish(d.winner === 'A'), 1300);
      }
    });
    // ポーズ
    ui.pauseBtn.onclick = async () => {
      if (ended) return;
      paused = true;
      const canQuit = opts.mode !== 'story';
      const btns = [{ label: 'つづける', cls: 'lime', value: 'go' }];
      if (canQuit) btns.unshift({ label: 'やめる', cls: 'white', value: 'quit' });
      const v = await UI.modal({ title: 'ポーズ', html: canQuit ? '<p>やめると しょうぶは なしに なるよ。</p>' : '<p>ストーリーの たたかいは とちゅうで やめられないよ。</p>', buttons: btns });
      if (v === 'quit') { ended = true; cleanup(); return; }
      paused = false;
    };
    function cleanup() {
      running = false;
      cancelAnimationFrame(raf);
      state.cleanupInput();
      window.removeEventListener('resize', onResize);
      ui.full.close();
      HG.state.inBattle = false;
      HG.state.busy = false;
      if (s.pet) s.pet.inBattle = null;
      P.persist();
      if (s.pet && s.pet.dead) return HG.screens.death();
      HG.screens.main(opts.mode === 'story' || opts.mode === 'tutorial' ? 'story' : 'home');
    }
    async function finish(win) {
      running = false;
      cancelAnimationFrame(raf);
      HG.audio.stopBgm();
      const mainFoe = foes[foes.length - 1][0];
      const enemyLv = Math.max(...opts.enemies.map((e) => e[1]));
      if (!win && lethal) {
        // しんで しまう
        HG.audio.sfx('lose');
        P.die(s, 'バトル', null, mainFoe.name);
        P.persist();
        await U.sleep(600);
        state.cleanupInput();
        ui.full.close();
        HG.state.inBattle = false;
        HG.state.busy = false;
        HG.screens.death();
        return;
      }
      HG.audio.sfx(win ? 'win' : 'lose');
      let res = { xp: 0, coins: 0, lv: null };
      if (opts.mode === 'tower') {
        if (win) {
          s.tower.cur = opts.floor;
          s.tower.best = Math.max(s.tower.best || 0, opts.floor);
        } else s.tower.cur = 0;
        res = P.applyBattle(s, { mode: 'tower', win, floor: opts.floor });
      } else if (opts.mode === 'tutorial') {
        res = win ? P.applyBattle(s, { mode: 'tutorial', win }) : res;
      } else res = P.applyBattle(s, { mode: opts.mode, win, enemyLv, boss: !!opts.boss });
      P.persist();
      // けっか
      const card = h('div', { class: 'mg-dom', style: { background: 'rgba(255,253,245,.95)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 20 } },
        h('div', { style: { width: '130px', height: '130px' }, html: HG.art.creature(spec.look, { uid: 'res', expr: win ? 'happy' : 'sad', cls: win ? 'anim-hop' : '' }) }),
        h('h2', { style: { margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '30px' } }, win ? 'かった！' : 'まけちゃった…'),
        h('p', { style: { margin: 0 } }, (res.xp ? 'けいけんち +' + res.xp + '　' : '') + (res.coins ? 'おこづかい +' + res.coins : '') || (opts.mode === 'tutorial' ? 'もういちど ちょうせん しよう' : '')),
        h('button', { class: 'btn big lime' }, 'もどる')
      );
      ui.stage.appendChild(card);
      await new Promise((rs) => (card.querySelector('button').onclick = rs));
      HG.audio.sfx('tap');
      const wasStory = (opts.mode === 'story' || opts.mode === 'tutorial') && win;
      cleanup();
      if (wasStory) await HG.screens.storyWin(opts.chapter, opts.node);
      if (res.lv) HG.screens.afterXp(res.lv);
      if (s.pet && !s.pet.dead) HG.screens.main(opts.mode === 'story' || opts.mode === 'tutorial' ? 'story' : 'home');
    }
    const onResize = () => r.fit();
    window.addEventListener('resize', onResize);
    r.draw({ lock: me.target });
    await countdown(ui);
    running = true;
    let last = performance.now(), acc = 0;
    const frame = (t) => {
      if (!running) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (!paused) {
        state.readInput();
        acc += dt;
        while (acc >= 1 / 60) {
          b.step(1 / 60);
          acc -= 1 / 60;
        }
      }
      r.draw({ lock: b.targetOf(me) });
      updateHud(ui, b, me, state);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };

  // ───────── たいせん ─────────
  // session: net.js が わたす。{ isHost, send(msg), onMsg(fn), opp:{spec,look}, rules, startAt }
  BU.startPvp = async function (session) {
    const s = HG.save, pet = s.pet;
    HG.state.inBattle = true;
    HG.state.busy = true;
    UI.closeAll();
    const b = new HG.Battle({ mode: 'pvp', arena: 'stadium', timeLimit: 120 });
    const mySpec = session.mySpec;
    const oppSpec = session.oppSpec;
    // ホストは した、ゲストは うえ… ではなく、どちらも じぶんが した に みえるように ざひょうを はんてんする
    const flip = !session.isHost;
    const me = b.addFighter(mySpec, 'A', { id: session.isHost ? 'H' : 'G', x: W / 2, y: H * 0.8, local: true, ctrl: 'input', canBurst: true });
    const opp = b.addFighter(oppSpec, 'B', { id: session.isHost ? 'G' : 'H', x: W / 2, y: H * 0.2, remote: true, ctrl: 'remote', canBurst: true });
    opp.face = Math.PI / 2;
    // つうしん
    const tx = (x) => (flip ? W - x : x), ty = (y) => (flip ? H - y : y);
    const ta = (a) => (flip ? a + Math.PI : a);
    b.net = {
      sendHit(a, t, dmg, te) {
        session.send({ t: 'hit', nid: a.nid, dmg, te, hp: Math.round(t.hp), x: tx(t.x), y: ty(t.y) });
      },
      sendKo() {
        session.send({ t: 'ko' });
      },
    };
    b.on((type, d) => {
      if (d.f !== me) return;
      if (type === 'cast') {
        const c = d.cast;
        session.send({ t: 'cast', slot: c.slot, mv: c.def.id, tx: tx(c.tx), ty: ty(c.ty), dir: ta(c.dir), wind: c.wind, cid: c.cid, plus: c.plus ? 1 : 0 });
      } else if (type === 'exec') {
        const c = d.cast;
        session.send({ t: 'exec', mv: c.def.id, cid: c.cid, x: tx(me.x), y: ty(me.y), tx: tx(c.tx), ty: ty(c.ty), dir: ta(c.dir), seed: c.seed, plus: c.plus ? 1 : 0, am: d.atkMul });
      } else if (type === 'burst') session.send({ t: 'burst' });
      else if (type === 'dodge') session.send({ t: 'dodge' });
    });
    const remoteCasts = {};
    session.onMsg((m) => {
      if (m.t === 'st') {
        opp.netBuf.push({ at: performance.now(), x: tx(m.x), y: ty(m.y), face: ta(m.f) });
        if (opp.netBuf.length > 30) opp.netBuf.shift();
        opp.hp = m.hp;
        opp.st = {};
        (m.s || '').split(',').forEach((k) => k && (opp.st[k] = { t: 0.3 }));
        opp.burst = m.b ? 1 : 0;
        opp.iframe = m.i ? 0.1 : 0;
        if (m.d) opp.dodge.t = 0.1;
      } else if (m.t === 'cast') {
        const def = HG.MOVES[m.mv];
        if (!def) return;
        const c = { slot: m.slot, def, t: 0, wind: m.wind, tx: tx(m.tx), ty: ty(m.ty), dir: ta(m.dir), plus: !!m.plus, cid: m.cid };
        remoteCasts[m.cid] = c;
        opp.cast = c;
        opp.face = c.dir;
      } else if (m.t === 'exec') {
        const def = HG.MOVES[m.mv];
        if (!def) return;
        const c = remoteCasts[m.cid] || { def, plus: !!m.plus, cid: m.cid };
        c.done = true;
        c.rec = 0.12;
        c.tx = tx(m.tx);
        c.ty = ty(m.ty);
        c.dir = ta(m.dir);
        c.seed = m.seed;
        c.plus = !!m.plus;
        c.mirror = true;
        opp.x = tx(m.x);
        opp.y = ty(m.y);
        opp.cast = c;
        b.spawnMove(opp, def, c, m.am || 1);
        delete remoteCasts[m.cid];
      } else if (m.t === 'hit') {
        // じぶんの こうげきが あたった（あいての がめんで）
        const a = b.attacks.find((x) => x.nid === m.nid);
        if (a && a.kind === 'proj' && !a.def.pierce) a.dead = true;
        opp.hp = m.hp;
        opp.hitFlash = 0.12;
        b.text(opp.x, opp.y - opp.r - 14, String(m.dmg), m.te > 1.2 ? '#ffd23d' : '#ffffff', m.dmg > 40 ? 24 : 19);
        if (m.te > 1.2) b.text(opp.x, opp.y - opp.r - 40, 'こうかばつぐん！', '#ffd23d', 15);
        b.sparks(opp.x, opp.y, '#ffffff', 8);
        HG.audio.sfx('hit');
        const bm = 0.8 + (me.bond || 0) / 250;
        me.gauge = Math.min(100, me.gauge + (m.dmg / opp.maxHp) * 70 * bm);
      } else if (m.t === 'burst') {
        b.text(opp.x, opp.y - opp.r - 40, 'きずなバースト！', '#ff9fc8', 20);
        b.sparks(opp.x, opp.y, '#ff9fc8', 20);
      } else if (m.t === 'ko') {
        opp.hp = 0;
        opp.dead = true;
        b.sparks(opp.x, opp.y, '#ffffff', 22);
        if (!ended) end(true);
      } else if (m.t === 'end') {
        if (!ended) end(m.win === (session.isHost ? 'G' : 'H') ? true : m.win === 'draw' ? null : false);
      } else if (m.t === 'bye') {
        if (!ended) { banner(ui, 'あいてが いなくなった', 3000); end(true, 'あいてが ぬけたので しょうり'); }
      }
    });
    session.onClose(() => {
      if (!ended) { banner(ui, 'つうしんが きれた', 3000); end(null, 'つうしんが きれた'); }
    });

    const ui = buildScreen({});
    ui.pauseBtn.innerHTML = HG.art.icon('close');
    ui.pauseBtn.setAttribute('aria-label', 'こうさん');
    const r = new HG.BattleRenderer(ui.canvas, b, { localSide: 'A' });
    const state = { renderer: r };
    BU.current = { b, me, opp };
    setupInput(ui, b, me, state);
    hookSounds(b, me);
    await Promise.all([spriteFor(me, mySpec.look), spriteFor(opp, oppSpec.look)]);
    HG.audio.bgm('battle');
    let ended = false, running = false, raf = 0, sendT = 0;
    ui.pauseBtn.onclick = async () => {
      if (ended) return;
      const ok = await UI.confirm('こうさん する？', '<p>まけに なるよ（しには しない）。</p>', 'こうさん', 'つづける', true);
      if (ok && !ended) { session.send({ t: 'ko' }); end(false); }
    };
    // じかんぎれ（ホストが きめる）
    b.on((type) => {
      if (type === 'timeup' && session.isHost && !ended) {
        const mk = me.hp / me.maxHp, ok = opp.hp / opp.maxHp;
        const win = Math.abs(mk - ok) < 0.01 ? 'draw' : mk > ok ? 'H' : 'G';
        session.send({ t: 'end', win });
        end(win === 'draw' ? null : win === 'H');
      }
    });
    b.on((type, d) => {
      if (type === 'ko' && d.f === me && !ended) end(false);
    });
    async function end(win, note) {
      if (ended) return;
      ended = true;
      setTimeout(async () => {
        running = false;
        cancelAnimationFrame(raf);
        HG.audio.stopBgm();
        HG.audio.sfx(win ? 'win' : 'lose');
        let res = { xp: 0, coins: 0 };
        if (win !== null) {
          res = P.applyBattle(s, { mode: 'pvp', win: !!win });
          if (win) { s.pvp.w++; pet.pvpW = (pet.pvpW || 0) + 1; } else { s.pvp.l++; pet.pvpL = (pet.pvpL || 0) + 1; }
        }
        P.persist();
        const card = h('div', { class: 'mg-dom', style: { background: 'rgba(255,253,245,.95)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 20 } },
          h('div', { style: { width: '120px', height: '120px' }, html: HG.art.creature(mySpec.look, { uid: 'pres', expr: win ? 'happy' : 'sad', cls: win ? 'anim-hop' : '' }) }),
          h('h2', { style: { margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '30px' } }, win ? 'しょうり！' : win === null ? 'ひきわけ' : 'まけ…'),
          note ? h('p', { class: 'muted', style: { margin: 0 } }, note) : null,
          h('p', { style: { margin: 0 } }, (res.xp ? 'けいけんち +' + res.xp + '　' : '') + (res.coins ? 'おこづかい +' + res.coins : '')),
          h('p', { class: 'muted', style: { margin: 0 } }, 'たいせんで まけても しなないよ'),
          h('button', { class: 'btn big lime' }, 'もどる')
        );
        ui.stage.appendChild(card);
        await new Promise((rs) => (card.querySelector('button').onclick = rs));
        state.cleanupInput();
        ui.full.close();
        HG.state.inBattle = false;
        HG.state.busy = false;
        session.after && session.after();
        if (res.lv) HG.screens.afterXp(res.lv);
      }, 1200);
    }
    r.draw({ lock: opp });
    // いっしょに スタート
    const wait = Math.max(0, session.startAt - Date.now());
    if (wait > 2000) await U.sleep(wait - 1900);
    await countdown(ui, ['3', '2', '1'].slice(0));
    running = true;
    let last = performance.now(), acc = 0;
    const frame = (t) => {
      if (!running) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      state.readInput();
      acc += dt;
      while (acc >= 1 / 60) {
        b.step(1 / 60);
        acc -= 1 / 60;
      }
      sendT -= dt;
      if (sendT <= 0 && !ended) {
        sendT = 0.05;
        const st = Object.keys(me.st).join(',');
        session.send({ t: 'st', x: Math.round(tx(me.x)), y: Math.round(ty(me.y)), f: +ta(me.face).toFixed(2), hp: Math.ceil(me.hp), s: st, b: me.burst > 0 ? 1 : 0, i: me.iframe > 0 ? 1 : 0, d: me.dodge.t > 0 ? 1 : 0 });
      }
      r.draw({ lock: opp });
      updateHud(ui, b, me, state);
      ui.foeName.textContent = opp.name + '  Lv.' + opp.level;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
})(window.HG);
