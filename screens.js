/* ハグクミ screens.js — がめん */
'use strict';
(function (HG) {
  const U = HG.util, h = U.h, P = HG.P, UI = HG.ui;
  const S = (HG.screens = {});
  const app = () => document.getElementById('app');
  HG.state = HG.state || { tab: 'home', busy: false };

  const save = () => HG.save;
  const pet = () => HG.save.pet;
  const persist = () => P.persist();

  // ───────── ルーター ─────────
  S.render = function () {
    UI.closeAll();
    const s = save();
    if (!s.pet) {
      if (s.lives === 0 && !s.started) return S.title();
      return S.eggSelect();
    }
    if (s.pet.dead) return S.death();
    if (s.pet.stage === 0) return S.hatch();
    S.main(HG.state.tab || 'home');
  };

  // ───────── タイトル ─────────
  S.title = function () {
    HG.audio.bgm('home');
    const el = app();
    el.innerHTML = '';
    const eggs = h('div', { class: 'eggs-row', html: ['red', 'white', 'blue'].map((e, i) => `<div class="egg-idle" style="animation-delay:${i * 0.4}s">${HG.art.egg(e, { uid: 't' + i })}</div>`).join('') });
    el.appendChild(
      h('div', { class: 'title' },
        eggs,
        h('h1', { class: 'logo' }, 'ハグクミ'),
        h('p', { class: 'tagline' }, 'たまごから そだてて、そだてかたで すがたが かわる。いっしょに ぼうけんして、ともだちと たいせん しよう。'),
        h('button', { class: 'btn big pink', onclick: () => { HG.audio.sfx('select'); save().started = true; persist(); S.eggSelect(); } }, 'はじめる'),
        h('button', { class: 'btn small white', onclick: () => S.importSheet() }, 'データを よみこむ'),
        HG.install && HG.install.evt && !HG.isApp() ? h('button', { class: 'appbtn', style: { alignSelf: 'center', marginTop: '4px' }, onclick: () => HG.doInstall(), html: HG.art.icon('phone') + '<span>アプリにする</span>' }) : null
      )
    );
  };

  // ───────── たまご えらび ─────────
  S.eggSelect = async function () {
    HG.audio.bgm('home');
    const s = save();
    const el = app();
    el.innerHTML = '';
    const grid = h('div', { class: 'egg-pick' });
    HG.EGG_KEYS.forEach((k, i) => {
      const e = HG.EGGS[k];
      const open = s.eggs.includes(k);
      const tile = h('button', { class: 'tile', disabled: open ? null : true, 'aria-label': e.name },
        h('div', { html: HG.art.egg(k, { uid: 'p' + i }), class: open ? 'egg-idle' : '', style: open ? {} : { filter: 'grayscale(1) opacity(.5)' } }),
        h('b', {}, open ? e.name : '？？？'),
        h('small', {}, open ? e.desc : e.unlock || '')
      );
      if (open)
        tile.onclick = async () => {
          HG.audio.sfx('select');
          const ok = await UI.confirm(e.name, `<p>${e.desc}。この たまごを そだてる？</p>`, 'そだてる', 'やめる');
          if (!ok) return;
          P.newEgg(s, k);
          persist();
          S.hatch();
        };
      grid.appendChild(tile);
    });
    el.appendChild(
      h('div', { class: 'page', style: { paddingTop: '16px' } },
        h('h1', { class: 'page-h' }, 'たまごを えらぼう'),
        h('p', { class: 'page-sub' }, 'うまれた あとの そだてかたで、タイプや すがたが きまるよ。'),
        h('div', { class: 'card' }, grid),
        s.graves.length ? h('p', { class: 'page-sub' }, 'まえの あいぼうの おもいでが、あたらしい いのちを すこし つよく するよ。') : null
      )
    );
    if (!s.introDone) {
      s.introDone = true;
      persist();
      await U.sleep(250);
      await UI.talk([
        ['sensei', 'こんにちは。わたしは まちの どうぶつびょういんの モリ。'],
        ['sensei', 'この たまごたちは「くろいもや」の せいで、おやと はぐれて しまったの。'],
        ['sensei', 'ひとつ そだてて くれない？ おせわを わすれると… いのちに かかわるから、たいせつにね。'],
      ]);
    }
  };

  // ───────── ふか ─────────
  S.hatch = function () {
    HG.audio.bgm('home');
    const s = save(), p = pet();
    const el = app();
    el.innerHTML = '';
    p.warmth = p.warmth || 0;
    const box = h('div', { class: 'eggbox egg-idle', role: 'button', 'aria-label': 'たまごを あたためる', html: HG.art.egg(p.egg, { crack: p.warmth / 100, uid: 'h' }) });
    const bar = h('i', { style: { width: p.warmth + '%' } });
    const msg = h('p', { class: 'tagline' }, 'たまごを タップして あたためよう');
    let done = false;
    box.addEventListener('pointerdown', async (e) => {
      if (done) return;
      HG.audio.unlock();
      p.warmth = Math.min(100, p.warmth + 7 + Math.random() * 4);
      bar.style.width = p.warmth + '%';
      box.innerHTML = HG.art.egg(p.egg, { crack: p.warmth / 100, uid: 'h' });
      box.classList.remove('egg-idle', 'egg-wobble');
      void box.offsetWidth;
      box.classList.add('egg-wobble');
      HG.audio.sfx(p.warmth > 30 ? 'crack' : 'tap');
      HG.vibrate(15);
      if (p.warmth > 30) msg.textContent = 'うごいた！ もうすこし！';
      if (p.warmth >= 100) {
        done = true;
        persist();
        await U.sleep(300);
        HG.audio.sfx('hatch');
        box.innerHTML = '';
        box.classList.remove('egg-wobble');
        const tmp = { stage: 1, egg: p.egg, type: 'normal', style: 'cute', dna: p.dna };
        box.innerHTML = HG.art.creature(tmp, { uid: 'hb', expr: 'happy', cls: 'anim-hop' });
        msg.textContent = 'うまれた！';
        await U.sleep(900);
        S.nameIt();
      }
    });
    el.appendChild(h('div', { class: 'hatch' }, h('h1', { class: 'page-h' }, HG.EGGS[p.egg].name), box, h('div', { class: 'warm' }, bar), msg));
  };

  S.nameIt = async function () {
    const s = save(), p = pet();
    const input = h('input', { class: 'name-input', id: 'pet-name', maxlength: '8', placeholder: 'なまえ', autocomplete: 'off' });
    const body = h('div', { class: 'gap' },
      input,
      h('button', { class: 'btn small white', onclick: () => { input.value = U.pick(HG.NAME_IDEAS); HG.audio.sfx('tap'); } }, 'おまかせで きめる'),
      h('p', { class: 'muted' }, '8もじ まで。あとから かえられないよ。')
    );
    const tmp = { stage: 1, egg: p.egg, type: 'normal', style: 'cute', dna: p.dna };
    await UI.modal({
      art: HG.art.creature(tmp, { uid: 'nm', expr: 'happy' }),
      title: 'なまえを つけてね',
      body,
      buttons: [{ label: 'これに する', cls: 'pink', value: true, check: () => { if (!input.value.trim()) { input.focus(); UI.toast('なまえを いれてね'); return false; } return true; } }],
    });
    const name = input.value.trim().slice(0, 8);
    P.hatch(s, name);
    persist();
    HG.state.tab = 'home';
    S.main('home');
    await U.sleep(300);
    if (s.lives <= 1) {
      await UI.talk(
        [
          ['sensei', name + '。いい なまえね。おせわの しかたを おしえるわ。'],
          ['sensei', 'おなかが へったら「ごはん」。うんちを したら「おそうじ」。びょうきに なったら「くすり」。'],
          ['sensei', '「あそぶ」で ミニゲーム。ままごとを すれば かわいく、スポーツを すれば かっこよく そだつの。'],
          ['sensei', 'なにを たべさせるかで タイプも かわる。おにくなら ほのお、おさかなは みず、サラダは くさ…。'],
          ['sensei', 'それと… おせわを わすれつづけると、やみに そまったり、しんで しまう ことも あるわ。'],
          ['pet', '…！'],
        ],
        S.talkCtx()
      );
    }
  };

  S.talkCtx = function (enemy) {
    const p = pet();
    const ctx = {};
    if (p && p.stage >= 1) {
      ctx.petName = p.name;
      ctx.petSvg = HG.art.creature(P.look(p), { uid: 'tk', expr: 'normal' });
      ctx.cry = p.stage <= 1 ? HG.CRY.baby : HG.CRY[p.style];
    }
    if (enemy) {
      ctx.enemySvg = HG.art.enemy(enemy, { uid: 'te' });
      ctx.enemyName = enemy.name;
    }
    return ctx;
  };

  // ───────── メイン ─────────
  const TABS = [
    ['home', 'おうち', 'house'],
    ['story', 'ぼうけん', 'sword'],
    ['pvp', 'たいせん', 'vs'],
    ['dex', 'ずかん', 'book'],
    ['menu', 'メニュー', 'menu'],
  ];
  S.main = function (tab) {
    HG.state.tab = tab;
    const el = app();
    el.innerHTML = '';
    el.appendChild(S.topbar());
    const content = h('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' } });
    el.appendChild(content);
    const nav = h('nav', { class: 'tabbar', 'aria-label': 'メニュー' });
    TABS.forEach(([k, label, icon]) => {
      nav.appendChild(
        h('button', {
          class: 'tab' + (k === tab ? ' on' : ''),
          'aria-current': k === tab ? 'page' : null,
          onclick: () => { HG.audio.sfx('tap'); S.main(k); },
          html: HG.art.icon(icon) + `<span>${label}</span>` + (k === 'home' && tab !== 'home' && P.calls(pet()).length ? '<i class="dot"></i>' : ''),
        })
      );
    });
    el.appendChild(nav);
    if (tab === 'home') S.home(content);
    else if (tab === 'story') S.story(content);
    else if (tab === 'pvp') HG.pvp.page(content);
    else if (tab === 'dex') S.dex(content);
    else if (tab === 'menu') S.menu(content);
    HG.audio.bgm(tab === 'story' ? 'map' : 'home');
  };

  S.topbar = function () {
    const p = pet();
    const need = P.xpNeed(p.level);
    const who = h('button', { class: 'tb-who', onclick: () => S.statusSheet(), 'aria-label': 'ステータスを ひらく' },
      h('span', { class: 'tb-name' }, p.name),
      h('span', { class: 'tb-sub' },
        h('span', {}, 'Lv.' + p.level),
        h('span', { class: 'xpbar' }, h('i', { style: { width: Math.round((p.xp / need) * 100) + '%' } })),
        UI.typeChip(p.type),
        h('span', {}, HG.STAGES[p.stage].name)
      )
    );
    const coins = h('div', { class: 'coins', html: HG.art.icon('coin') + `<span id="coin-n">${save().coins}</span>`, title: 'おこづかい' });
    const app = HG.install && HG.install.evt && !HG.isApp() ? h('button', { class: 'appbtn', onclick: () => HG.doInstall(), html: HG.art.icon('phone') + '<span>アプリにする</span>' }) : null;
    return h('header', { class: 'topbar' }, who, app, coins);
  };
  S.refreshTop = function () {
    const old = document.querySelector('.topbar');
    if (old && pet() && pet().stage >= 1 && !pet().dead) old.replaceWith(S.topbar());
  };

  // ───────── おうち ─────────
  let homeRefs = null;
  S.home = function (c) {
    const p = pet();
    const room = h('div', { class: 'room' });
    room.innerHTML = `<div class="wall"></div><div class="window"><div class="cel"></div></div><div class="frame"></div><div class="shelf"></div><div class="floor"></div><div class="rug"></div><div class="ball"></div><div class="night"></div>`;
    const petEl = h('div', { class: 'pet' }, h('div', { class: 'shadow' }));
    const svgBox = h('div', { style: { position: 'absolute', inset: '0' } });
    petEl.appendChild(svgBox);
    room.appendChild(petEl);
    const poops = h('div', { style: { position: 'absolute', inset: '0', zIndex: 2, pointerEvents: 'none' } });
    room.appendChild(poops);
    const meters = h('div', { class: 'meters' });
    room.appendChild(meters);
    const cond = h('div', { class: 'condition' });
    const age = h('div', { class: 'age' });
    room.appendChild(cond);
    room.appendChild(age);
    const bubble = h('div', { class: 'bubble', style: { display: 'none' } });
    room.appendChild(bubble);
    const zzz = h('div', { class: 'zzz', style: { display: 'none' } }, 'Z z');
    room.appendChild(zzz);
    const daycare = h('div', { style: { position: 'absolute', inset: '0', zIndex: 9, display: 'none', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', background: 'rgba(255,253,245,.92)', textAlign: 'center', padding: '16px' } });
    room.appendChild(daycare);
    c.appendChild(h('div', { class: 'screen' }, room));

    // ボタン
    const care = h('div', { class: 'care' });
    const B = {};
    const mk = (key, label, icon, color, fn) => {
      const b = h('button', { class: 'cbtn', 'aria-label': label, onclick: () => { HG.audio.unlock(); HG.audio.sfx('tap'); fn(); } },
        h('span', { class: 'knob', style: { '--k': color }, html: HG.art.icon(icon) }), h('span', {}, label));
      B[key] = b;
      care.appendChild(b);
    };
    mk('food', 'ごはん', 'food', 'var(--sun)', () => S.foodSheet());
    mk('play', 'あそぶ', 'play', 'var(--lime)', () => S.playSheet());
    mk('clean', 'おそうじ', 'clean', 'var(--sky)', () => S.doClean());
    mk('bath', 'おふろ', 'bath', 'var(--mint)', () => S.act(P.bath(save()), 'bath', 'hop'));
    mk('pill', 'くすり', 'pill', '#ff9fc0', () => S.doMedicine());
    mk('pat', 'なでる', 'heart', '#ffc6d9', () => S.doPat());
    mk('scold', 'しかる', 'scold', '#ffffff', () => S.doScold());
    mk('sleep', 'ねる', 'moon', '#c4b5ff', () => S.doSleep());
    c.appendChild(care);

    // さわる・なでる
    let down = null, moved = 0, lastPat = 0;
    petEl.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; moved = 0; HG.audio.unlock(); });
    petEl.addEventListener('pointermove', (e) => {
      if (!down) return;
      moved += Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
      down = { x: e.clientX, y: e.clientY };
      if (moved > 120 && Date.now() - lastPat > 900) {
        lastPat = Date.now();
        moved = 0;
        S.doPat(true);
      }
    });
    const up = () => {
      if (down && moved < 12) S.pokePet();
      down = null;
    };
    petEl.addEventListener('pointerup', up);
    petEl.addEventListener('pointerleave', () => (down = null));

    homeRefs = { room, petEl, svgBox, poops, meters, cond, age, bubble, zzz, daycare, B, lastKey: '', anim: '', say: null, sayUntil: 0 };
    S.updateHome(true);
  };

  S.setAnim = function (cls, ms) {
    if (!homeRefs) return;
    homeRefs.anim = cls;
    homeRefs.animUntil = Date.now() + (ms || 1200);
    homeRefs.lastKey = '';
    S.updateHome();
  };
  S.say = function (text, ms) {
    if (!homeRefs) return;
    homeRefs.say = text;
    homeRefs.sayUntil = Date.now() + (ms || 2200);
    S.updateHome();
  };

  const CALL_TEXT = { sick: 'くるしい…', hunger: 'おなか すいた…', poop: 'うんち…', mood: 'あそんで…', sleepy: 'ねむい…', whim: 'かまって〜！' };
  S.updateHome = function (force) {
    if (!homeRefs || !document.body.contains(homeRefs.room)) return;
    const p = pet();
    if (!p || p.dead || p.stage < 1) return;
    const R = homeRefs;
    const now = Date.now();
    const inDaycare = p.daycareUntil && HG.clock.now() < p.daycareUntil;
    // まど（げんじつの じかん）
    const hr = new Date().getHours();
    let sky = '#8fdcff', cel = '#ffe066';
    if (hr >= 5 && hr < 9) { sky = '#ffd6a5'; cel = '#ffb84d'; }
    else if (hr >= 16 && hr < 19) { sky = '#ffb08a'; cel = '#ff7a45'; }
    else if (hr >= 19 || hr < 5) { sky = '#2b2f6e'; cel = '#fff3c4'; }
    R.room.style.setProperty('--sky-color', sky);
    R.room.style.setProperty('--cel', cel);
    R.room.classList.toggle('dark', !!p.asleep);
    // サイズ
    const size = [0, 34, 42, 50, 56][p.stage];
    R.petEl.style.setProperty('--pet-size', size + '%');
    R.room.style.setProperty('--pet-h', size + '%');
    // いきもの
    if (R.anim && now > R.animUntil) { R.anim = ''; }
    let expr = P.expr(p);
    if (R.anim === 'anim-eat') expr = 'eat';
    else if (R.anim === 'anim-hop') expr = 'happy';
    else if (R.anim === 'love') expr = 'love';
    else if (R.anim === 'anim-shake') expr = 'angry';
    const animCls = R.anim === 'love' ? 'anim-hop' : R.anim || (p.asleep ? 'anim-sleep' : 'anim-idle');
    const key = JSON.stringify([P.look(p), expr, animCls]);
    if (key !== R.lastKey || force) {
      R.lastKey = key;
      R.svgBox.innerHTML = HG.art.creature(P.look(p), { uid: 'home', expr, cls: animCls + (expr === 'normal' ? ' blink' : '') });
    }
    R.petEl.style.display = inDaycare ? 'none' : '';
    // うんち
    const pk = p.poops.map((x) => x.id).join(',');
    if (R.poopKey !== pk) {
      R.poopKey = pk;
      R.poops.innerHTML = '';
      p.poops.forEach((pp, i) => {
        const left = pp.x < 0.5 ? 6 + pp.x * 40 : 62 + (pp.x - 0.5) * 50;
        R.poops.appendChild(h('div', { class: 'poop', style: { left: left + '%', bottom: 6 + (pp.y || 0) * 14 + '%' }, html: HG.art.poop() }));
      });
    }
    // メーター
    const segs = (v, col, inv) => {
      const n = Math.ceil(v / 20);
      let s = '';
      for (let i = 0; i < 5; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`;
      return `<div class="segs" style="--mcol:${col}">${s}</div>`;
    };
    const mk = (label, v, col, warn) => `<div class="meter${warn ? ' warn' : ''}"><b>${label}</b>${segs(v, col)}</div>`;
    R.meters.innerHTML =
      mk('おなか', p.hunger, '#ff9a3d', p.hunger < 15) +
      mk('ごきげん', p.mood, '#ff5c8a', p.mood < 15) +
      mk('せいけつ', p.clean, '#3fb3ff', p.clean < 20 || p.poops.length >= 3) +
      mk('ねむけ', p.sleepy, '#8b6bff', !p.asleep && p.sleepy >= 85);
    const c = P.condition(p);
    R.cond.className = 'condition lv' + c.lv;
    R.cond.textContent = (p.sick ? 'びょうき・' : '') + c.text;
    const days = Math.floor(P.age(p) / (24 * 3600e3));
    R.age.textContent = days + 'さい';
    // ふきだし
    const calls = P.calls(p);
    let say = null, isCall = false;
    if (R.say && now < R.sayUntil) say = R.say;
    else if (p.asleep) say = null;
    else if (calls.length) { say = CALL_TEXT[calls[0]]; isCall = true; }
    R.bubble.style.display = say && !inDaycare ? '' : 'none';
    if (say) {
      R.bubble.textContent = say;
      R.bubble.classList.toggle('call', isCall);
    }
    R.zzz.style.display = p.asleep && !inDaycare ? '' : 'none';
    // ボタンの しるし
    const dot = (b, on) => {
      const d = b.querySelector('.dot');
      if (on && !d) b.appendChild(h('i', { class: 'dot' }));
      else if (!on && d) d.remove();
    };
    dot(R.B.food, calls.includes('hunger'));
    dot(R.B.clean, calls.includes('poop'));
    dot(R.B.pill, calls.includes('sick'));
    dot(R.B.play, calls.includes('mood'));
    dot(R.B.sleep, calls.includes('sleepy'));
    dot(R.B.scold, calls.includes('whim'));
    const sl = R.B.sleep;
    sl.querySelector('.knob').innerHTML = HG.art.icon(p.asleep ? 'sun' : 'moon');
    sl.lastChild.textContent = p.asleep ? 'おこす' : 'ねる';
    Object.values(R.B).forEach((b) => (b.disabled = !!inDaycare));
    // あずかりや
    if (inDaycare) {
      R.daycare.style.display = 'flex';
      if (!R.daycare.dataset.on) {
        R.daycare.dataset.on = '1';
        R.daycare.innerHTML = '';
        R.daycare.appendChild(h('div', { style: { width: '110px', height: '110px' }, html: HG.art.creature(P.look(p), { uid: 'dc', expr: 'happy' }) }));
        R.daycare.appendChild(h('b', {}, p.name + ' は あずかりやに いるよ'));
        R.daycare.appendChild(h('span', { class: 'muted', id: 'dc-left' }, ''));
        R.daycare.appendChild(h('button', { class: 'btn lime', onclick: () => { P.pickup(save()); persist(); R.daycare.dataset.on = ''; S.updateHome(true); UI.toast('おかえり！'); } }, 'むかえに いく'));
      }
      const left = R.daycare.querySelector('#dc-left');
      if (left) left.textContent = 'のこり ' + U.fmtDur(p.daycareUntil - HG.clock.now()) + '（あずけている あいだは じかんが とまる）';
    } else {
      R.daycare.style.display = 'none';
      R.daycare.dataset.on = '';
    }
  };

  // ───────── おせわの うごき ─────────
  S.act = function (res, sfx, anim) {
    if (!res.ok) {
      HG.audio.sfx('ng');
      UI.toast(res.msg);
      if (res.needShop) S.shopSheet();
      return false;
    }
    if (sfx) HG.audio.sfx(sfx);
    if (anim) S.setAnim('anim-' + anim, 1300);
    S.say(res.msg);
    persist();
    S.afterXp(res.lv);
    S.updateHome();
    S.refreshTop();
    return true;
  };
  S.afterXp = function (lv) {
    if (!lv) return;
    if (lv.levels) {
      HG.audio.sfx('levelup');
      UI.toast('レベル ' + pet().level + ' に あがった！');
    }
    if (lv.learned && lv.learned.length) {
      setTimeout(() => {
        lv.learned.forEach((id, i) => setTimeout(() => UI.toast('あたらしい わざ「' + HG.MOVES[id].name + '」を おぼえた！'), i * 2400));
      }, lv.levels ? 2300 : 0);
    }
    S.refreshTop();
  };
  S.doClean = function () {
    const r = P.cleanUp(save());
    if (r.ok && r.n) {
      HG.audio.sfx('clean');
      const R = homeRefs;
      if (R) U.qsa('.poop', R.room).forEach((pp) => { pp.style.transition = 'transform .4s, opacity .4s'; pp.style.transform = 'translateX(60px) rotate(40deg)'; pp.style.opacity = '0'; });
      setTimeout(() => S.act(r, null, 'hop'), 380);
    } else S.act(r);
  };
  S.doMedicine = function () {
    const r = P.medicine(save());
    if (S.act(r, r.ok ? 'cure' : null, r.ok && !r.again ? 'hop' : null)) {
      if (r.again) S.setAnim('anim-shake', 800);
    }
  };
  S.doPat = function (byHand) {
    const r = P.pat(save());
    if (!r.ok) {
      if (!byHand || !r.full) UI.toast(r.msg);
      else S.say(r.msg, 1200);
      return;
    }
    HG.audio.sfx('happy');
    S.setAnim('love', 1200);
    S.say(r.msg, 1400);
    if (homeRefs) {
      const rc = homeRefs.room.getBoundingClientRect();
      for (let i = 0; i < 3; i++) setTimeout(() => UI.fx(homeRefs.room, '♥', rc.width * (0.4 + Math.random() * 0.2), rc.height * 0.4, '#ff4f8b'), i * 150);
    }
    persist();
  };
  S.doScold = async function () {
    const p = pet();
    if (!p.whim && !p.asleep) {
      const ok = await UI.confirm('しかる？', '<p>いまは わがままを いって いないよ。りゆうも なく しかると かなしんで、こころが やみに ちかづくよ。</p>', 'しかる', 'やめる', true);
      if (!ok) return;
    }
    const r = P.scold(save());
    if (!r.ok) return UI.toast(r.msg);
    HG.audio.sfx('scold');
    S.setAnim('anim-shake', 900);
    S.say(r.msg, 2200);
    persist();
  };
  S.doSleep = function () {
    const p = pet();
    const r = p.asleep ? P.wake(save()) : P.sleep(save());
    if (!r.ok) return UI.toast(r.msg);
    HG.audio.sfx(p.asleep ? 'tap' : r.grumpy ? 'sad' : 'happy');
    S.say(r.msg, 1800);
    persist();
    S.updateHome(true);
  };
  S.pokePet = function () {
    const p = pet();
    if (p.asleep) return S.say('すやすや…', 1200);
    HG.audio.sfx('happy');
    S.setAnim('anim-hop', 1000);
    S.say(p.stage <= 1 ? HG.CRY.baby : HG.CRY[p.style], 1200);
  };

  // ───────── ごはん ─────────
  S.foodSheet = function () {
    const p = pet();
    UI.sheet({
      title: 'ごはん',
      body: (b, api) => {
        b.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'たべものの しゅるいで タイプが かわるよ。おやつの たべすぎは びょうきの もと。'));
        const grid = h('div', { class: 'grid' });
        HG.FOODS.forEach((f) => {
          const t = h('button', { class: 'tile', disabled: save().coins < f.price ? true : null },
            h('span', { class: 'em' }, f.emoji), h('b', {}, f.name), h('small', {}, f.note),
            h('span', { class: 'price', html: f.price ? HG.art.icon('coin', 'ic-s').replace('class="ic', 'style="width:14px;height:14px;display:inline-block;vertical-align:-2px;color:#c79100" class="ic') + ' ' + f.price : 'ただ' })
          );
          t.onclick = () => {
            const r = P.feed(save(), f.id);
            if (!r.ok) {
              HG.audio.sfx('ng');
              UI.toast(r.msg);
              if (r.refuse) { api.close(); S.setAnim('anim-shake', 800); S.say(r.msg); }
              return;
            }
            api.close();
            HG.audio.sfx('eat');
            S.setAnim('anim-eat', 1400);
            S.say(f.emoji + ' ' + r.msg, 1800);
            if (homeRefs) {
              const rc = homeRefs.room.getBoundingClientRect();
              UI.fx(homeRefs.room, f.emoji, rc.width * 0.62, rc.height * 0.5);
            }
            persist();
            S.afterXp(r.lv);
            S.refreshTop();
          };
          grid.appendChild(t);
        });
        b.appendChild(grid);
        if (save().items.drink) {
          b.appendChild(h('button', { class: 'btn white block', onclick: () => { api.close(); S.act(P.drink(save()), 'cure', 'hop'); } }, '🧃 げんきドリンクを のませる（のこり ' + save().items.drink + '）'));
        }
      },
    });
  };

  // ───────── あそぶ ─────────
  S.playSheet = function () {
    const p = pet();
    if (p.asleep) return UI.toast('ねているよ。おこしてから あそぼう');
    UI.sheet({
      title: 'あそぶ',
      body: (b, api) => {
        b.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'あそびの しゅるいで すがたと のうりょくが かわるよ。'));
        Object.keys(HG.MG_CATS).forEach((cat) => {
          const C = HG.MG_CATS[cat];
          const card = h('div', { class: 'card flat', style: { padding: '10px 12px' } }, h('h3', {}, C.name + ' けい'), h('p', { class: 'muted', style: { margin: '-4px 0 6px' } }, C.note));
          const list = h('div', { class: 'list' });
          HG.MINIGAMES.filter((g) => g.cat === cat).forEach((g) => {
            const trs = Object.keys(g.tr).map((k) => ({ hp: 'たいりょく', atk: 'こうげき', def: 'ぼうぎょ', spd: 'すばやさ', int: 'かしこさ' }[k])).join('・');
            list.appendChild(h('button', { class: 'li', onclick: () => { api.close(); S.startMinigame(g.id); } },
              h('span', { class: 'lic', style: { '--k': C.color, color: '#fff' }, html: HG.art.icon(cat === 'sports' ? 'play' : cat === 'play' ? 'heart' : 'star') }),
              h('span', { class: 'lt' }, h('b', {}, g.name), h('span', {}, g.desc), h('span', { style: { color: C.color, fontWeight: 900 } }, trs + ' が のびる'))
            ));
          });
          card.appendChild(list);
          b.appendChild(card);
        });
      },
    });
  };
  S.startMinigame = function (id) {
    const p = pet();
    if (p.hunger < 6) return UI.toast('おなかが すいて あそべない…');
    if (p.sick) return UI.toast('びょうきで あそべない…');
    HG.state.busy = true;
    HG.mg.start(id, (perf) => {
      HG.state.busy = false;
      if (perf == null) { S.main('home'); return; }
      const r = P.applyMinigame(save(), id, perf);
      persist();
      S.main('home');
      HG.audio.sfx('coin');
      UI.toast('けいけんち +' + r.xp + '　おこづかい +' + r.coins);
      setTimeout(() => S.afterXp(r.lv), 2300);
      S.checkEvolution();
    });
  };

  // ───────── ステータス ─────────
  const STAT_NAMES = { hp: 'たいりょく', atk: 'こうげき', def: 'ぼうぎょ', spd: 'すばやさ', int: 'かしこさ' };
  S.statusSheet = function () {
    const p = pet();
    UI.sheet({
      title: 'ステータス',
      body: (b, api) => {
        const look = P.look(p);
        b.appendChild(h('div', { class: 'hero' },
          h('div', { class: 'art', html: HG.art.creature(look, { uid: 'st', cls: 'anim-idle' }) }),
          h('div', { class: 'who' },
            h('b', {}, p.name),
            h('span', { class: 'muted' }, HG.formName(look)),
            h('div', { class: 'chips' }, UI.typeChip(p.type), p.stage >= 2 ? UI.styleChip(p.style) : null, h('span', { class: 'chip' }, HG.STAGES[p.stage].name)),
            h('span', { class: 'small' }, 'Lv.' + p.level + '　つぎまで ' + (P.xpNeed(p.level) - p.xp))
          )
        ));
        // しんか
        const evo = h('div', { class: 'card flat' });
        if (p.stage >= 4) evo.appendChild(h('p', { style: { margin: 0 } }, 'さいごの すがた「きわみ」まで そだったよ。'));
        else {
          const S2 = HG.STAGES[p.stage];
          const pr = P.predict(p);
          const st = P.evoState(p);
          let line = 'Lv.' + S2.evoLv + ' に なると しんかするよ。';
          if (st && !st.ready) line = 'レベルは じゅうぶん！ あと ' + U.fmtDur(st.wait) + ' たつと しんかするよ。';
          evo.appendChild(h('h3', {}, 'つぎの しんか'));
          evo.appendChild(h('p', { style: { margin: '0 0 4px' } }, line));
          evo.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'いまの そだてかただと… ' + HG.TYPES[pr.type].name + 'タイプ・' + HG.STYLES[pr.style].name + ' すがたに なりそう'));
        }
        b.appendChild(evo);
        // のうりょく
        const stats = P.calcStats(p);
        const card = h('div', { class: 'card flat gap' }, h('h3', {}, 'のうりょく'));
        const ref = P.calcStats({ level: Math.max(p.level, 5), stage: p.stage, type: 'normal', style: 'cute', tr: { hp: 0, atk: 0, def: 0, spd: 0, int: 0 } });
        const cap = P.trCap(p.level);
        Object.keys(STAT_NAMES).forEach((k) => {
          const pct = U.clamp((stats[k] / (ref[k] * 1.6)) * 100, 4, 100);
          card.appendChild(h('div', { class: 'stat-row' }, h('span', {}, STAT_NAMES[k]), h('div', { class: 'bar', style: { '--bc': k === 'hp' ? 'var(--ok)' : k === 'atk' ? 'var(--pink)' : k === 'def' ? 'var(--sky)' : k === 'spd' ? 'var(--sun)' : '#9b6bff' } }, h('i', { style: { width: pct + '%' } })), h('span', { style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, stats[k])));
        });
        const trTxt = Object.keys(STAT_NAMES).map((k) => STAT_NAMES[k] + ' ' + Math.floor(p.tr[k]) + (p.tr[k] >= cap ? '(MAX)' : '')).join('・');
        card.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'きたえた ぶん：' + trTxt + '（いまの げんかい ' + cap + '）'));
        b.appendChild(card);
        // わざ
        const mv = h('div', { class: 'card flat gap' }, h('h3', {}, 'わざ（バトルで つかう 4つ）'));
        p.equip.forEach((id, i) => {
          const m = id && HG.MOVES[id];
          const slot = h('button', { class: 'move-slot' + (m ? '' : ' empty') },
            h('span', { class: 'mt', style: { '--k': m ? HG.TYPES[m.type].color : '#eee' } }),
            h('span', { class: 'mb' }, h('b', {}, m ? m.name : 'からっぽ'), h('span', {}, m ? UI.moveLine(id) + '　' + m.desc : 'タップで わざを いれる'))
          );
          slot.onclick = () => S.movePicker(i, () => { api.close(); S.statusSheet(); });
          mv.appendChild(slot);
        });
        mv.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'おぼえた わざ ' + p.moves.length + 'こ。タップして いれかえ。'));
        b.appendChild(mv);
        // そだてメモ
        const pr = P.predict(p);
        const memo = h('div', { class: 'card flat gap' }, h('h3', {}, 'そだてメモ（この だんかい）'));
        const smax = Math.max(10, ...Object.values(pr.sp));
        HG.STYLE_KEYS.forEach((k) => memo.appendChild(h('div', { class: 'stat-row' }, h('span', {}, HG.STYLES[k].name), h('div', { class: 'mini-bar', style: { '--bc': HG.STYLES[k].color } }, h('i', { style: { width: (pr.sp[k] / smax) * 100 + '%' } })), h('span', {}, ''))));
        const emax = Math.max(10, ...Object.values(pr.el), pr.dark);
        HG.ELEM_KEYS.concat(['dark']).forEach((k) => {
          const v = k === 'dark' ? pr.dark : pr.el[k];
          memo.appendChild(h('div', { class: 'stat-row' }, h('span', {}, HG.TYPES[k].name), h('div', { class: 'mini-bar', style: { '--bc': HG.TYPES[k].color } }, h('i', { style: { width: (v / emax) * 100 + '%' } })), h('span', {}, '')));
        });
        memo.appendChild(h('dl', { class: 'kv' },
          h('dt', {}, 'なかよし'), h('dd', {}, Math.round(p.bond) + ' / 100' + (p.bond >= 90 ? '（ピンチで ふんばるかも）' : '')),
          h('dt', {}, 'しつけ'), h('dd', {}, Math.round(p.disc) + ' / 100' + (p.disc < 25 ? '（バトルで いうことを きかない ことが ある）' : '')),
          h('dt', {}, 'おせわミス'), h('dd', {}, 'この だんかい ' + p.st.mistakes + '　ぜんぶで ' + p.mistakes),
          h('dt', {}, 'やみポイント'), h('dd', {}, S.darkLine(p.st, Math.round(pr.dark))),
          h('dt', {}, 'たいじゅう'), h('dd', {}, Math.round(p.weight) + 'g（ちょうどいい のは ' + P.idealWeight(p.stage) + 'g くらい）'),
          h('dt', {}, 'ねんれい'), h('dd', {}, Math.floor(P.age(p) / 86400e3) + 'さい（' + U.fmtDur(P.age(p)) + '）'),
          h('dt', {}, 'バトル'), h('dd', {}, p.wins + 'しょう / ' + p.battles + 'かい')
        ));
        // おせわミスの きろく
        const ml = (p.mlog || []).slice(-6).reverse();
        const mcard = h('div', { class: 'card flat gap' }, h('h3', {}, 'おせわミスの きろく'));
        if (!ml.length) mcard.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, p.mistakes ? 'きろくは まだ ないよ（v1.0.3 から のこるように なったよ）' : 'まだ いちども ないよ。すごい！'));
        ml.forEach((m) => mcard.appendChild(h('p', { class: 'small', style: { margin: 0 } }, U.fmtTime(m.t) + '　' + (P.MISTAKE_TEXT[m.key] || m.key))));
        if (p.stage >= 2 && p.prev && p.prev.dark) mcard.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'まえの だんかい：' + S.darkLine(p.prev, Math.round(p.prev.dark))));
        mcard.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'おなか・ごきげんが 0、びょうき、うんち 4こ いじょう を 15ふん ほうっておくと ミス（ねている あいだは かぞえない）。やみポイントが 30 いじょうで、ほかの タイプより おおいと やみタイプに なるよ。'));
        b.appendChild(mcard);
      },
    });
  };
  // v1.0.3: まえの ばんの ふぐあいで やみに なった かもしれない子への おわび
  S.darkFix = async function () {
    const p = pet();
    const to = P.retypeGuess(p);
    const v = await UI.modal({
      art: HG.art.creature(P.look(p), { uid: 'df', expr: 'sad' }),
      title: 'ゲームの ふぐあいの おしらせ',
      html: `<p>まえの バージョンでは、1日2かい ちゃんと おせわしても、うんちや びょうきで おせわミスが ふえすぎて、やみタイプに なりやすく なっていたよ（なおしたよ）。</p><p>${U.esc(p.name)} の タイプを、やみを のぞいた そだてかたで きめなおせるよ。</p>`,
      buttons: [{ label: 'やみの まま', cls: 'white', value: 0 }, { label: HG.TYPES[to].name + 'タイプに なおす', cls: 'lime', value: 1 }],
    });
    if (v !== 1) return;
    P.retype(save(), to);
    persist();
    S.render();
    UI.toast(HG.TYPES[to].name + 'タイプに なったよ');
  };
  // やみポイントの うちわけ
  S.darkLine = function (acc, total) {
    const w = acc.why || {};
    const parts = [];
    Object.keys(P.MISTAKE_SHORT).forEach((k) => { if (w[k]) parts.push(P.MISTAKE_SHORT[k] + '×' + w[k]); });
    if (w.scold) parts.push('いらない しかる×' + w.scold);
    if (!parts.length && acc.mistakes) parts.push('おせわミス×' + acc.mistakes);
    return total + (parts.length ? '（' + parts.join('・') + '）' : '');
  };
  S.movePicker = function (slot, after) {
    const p = pet();
    UI.sheet({
      title: 'わざを えらぶ',
      body: (b, api) => {
        const list = h('div', { class: 'gap' });
        p.moves.forEach((id) => {
          const m = HG.MOVES[id];
          const inSlot = p.equip.indexOf(id);
          const btn = h('button', { class: 'move-slot' + (inSlot === slot ? ' sel' : '') },
            h('span', { class: 'mt', style: { '--k': HG.TYPES[m.type].color } }),
            h('span', { class: 'mb' }, h('b', {}, m.name + (inSlot >= 0 ? '（' + (inSlot + 1) + 'ばん）' : '')), h('span', {}, HG.TYPES[m.type].name + '・' + UI.moveLine(id)), h('span', {}, m.desc))
          );
          btn.onclick = () => {
            const prev = p.equip[slot];
            if (inSlot >= 0) p.equip[inSlot] = prev;
            p.equip[slot] = id;
            persist();
            HG.audio.sfx('select');
            api.close();
            after && after();
          };
          list.appendChild(btn);
        });
        b.appendChild(list);
      },
    });
  };

  // ───────── ショップ ─────────
  S.shopSheet = function (tab) {
    UI.sheet({
      title: 'ショップ',
      body: (b, api) => {
        const coinsLine = h('p', { style: { margin: 0 } }, 'おこづかい ' + save().coins);
        b.appendChild(coinsLine);
        const items = h('div', { class: 'card flat' }, h('h3', {}, 'どうぐ'));
        const list = h('div', { class: 'list' });
        Object.keys(HG.ITEMS).forEach((k) => {
          const it = HG.ITEMS[k];
          const row = h('button', { class: 'li' },
            h('span', { class: 'lic' }, it.emoji),
            h('span', { class: 'lt' }, h('b', {}, it.name + '（もっている ' + (save().items[k] || 0) + '）'), h('span', {}, it.desc)),
            h('span', { class: 'lr' }, it.price)
          );
          row.onclick = () => {
            if (save().coins < it.price) { HG.audio.sfx('ng'); return UI.toast('おこづかいが たりない'); }
            save().coins -= it.price;
            save().items[k] = (save().items[k] || 0) + 1;
            persist();
            HG.audio.sfx('coin');
            UI.toast(it.name + ' を かった');
            api.close();
            S.shopSheet();
            S.refreshTop();
          };
          list.appendChild(row);
        });
        items.appendChild(list);
        b.appendChild(items);
        const accCard = h('div', { class: 'card flat' }, h('h3', {}, 'きせかえ'), h('p', { class: 'muted', style: { margin: '-2px 0 6px' } }, 'かった ものは「メニュー → きせかえ」で つけかえ できるよ。'));
        const al = h('div', { class: 'list' });
        Object.keys(HG.ACCS).forEach((k) => {
          const a = HG.ACCS[k];
          const owned = save().accs.includes(k);
          const row = h('button', { class: 'li', disabled: owned ? true : null },
            h('span', { class: 'lic', html: HG.art.icon('shirt') }),
            h('span', { class: 'lt' }, h('b', {}, a.name), h('span', {}, { head: 'あたま', face: 'かお', neck: 'くび' }[a.slot] + 'に つける')),
            h('span', { class: 'lr' }, owned ? 'もっている' : a.price)
          );
          if (!owned)
            row.onclick = () => {
              if (save().coins < a.price) { HG.audio.sfx('ng'); return UI.toast('おこづかいが たりない'); }
              save().coins -= a.price;
              save().accs.push(k);
              pet().acc[a.slot] = k;
              persist();
              HG.audio.sfx('coin');
              UI.toast(a.name + ' を かって つけたよ');
              api.close();
              S.refreshTop();
              S.updateHome(true);
            };
          al.appendChild(row);
        });
        accCard.appendChild(al);
        b.appendChild(accCard);
      },
    });
  };
  S.dressSheet = function () {
    const p = pet();
    UI.sheet({
      title: 'きせかえ',
      body: (b, api) => {
        const art = h('div', { style: { width: '150px', height: '150px', margin: '0 auto' } });
        const draw = () => (art.innerHTML = HG.art.creature(P.look(p), { uid: 'dr', cls: 'anim-idle' }));
        draw();
        b.appendChild(art);
        if (!save().accs.length) b.appendChild(h('p', { class: 'muted' }, 'まだ きせかえを もっていないよ。ショップで かえるよ。'));
        ['head', 'face', 'neck'].forEach((slot) => {
          const owned = save().accs.filter((k) => HG.ACCS[k].slot === slot);
          if (!owned.length) return;
          const row = h('div', { class: 'grid' });
          const opt = (k) => {
            const t = h('button', { class: 'tile' + (p.acc[slot] === k ? ' sel' : '') }, h('b', {}, k ? HG.ACCS[k].name : 'なし'));
            t.onclick = () => { p.acc[slot] = k; persist(); HG.audio.sfx('select'); api.close(); S.dressSheet(); S.updateHome(true); };
            return t;
          };
          row.appendChild(opt(null));
          owned.forEach((k) => row.appendChild(opt(k)));
          b.appendChild(h('div', { class: 'card flat' }, h('h3', {}, { head: 'あたま', face: 'かお', neck: 'くび' }[slot]), row));
        });
      },
    });
  };

  // ───────── あずかりや ─────────
  S.daycareSheet = function () {
    const p = pet();
    UI.sheet({
      title: 'あずかりや',
      body: (b, api) => {
        b.appendChild(h('p', { style: { margin: 0 } }, 'るすに する ときは あずけよう。あずけている あいだは おなかも へらず、じかんが とまるよ（そだちも とまる）。'));
        const list = h('div', { class: 'list card flat' });
        [[6, 20], [12, 35], [24, 60], [72, 150]].forEach(([hrs, price]) => {
          list.appendChild(h('button', { class: 'li', onclick: async () => {
            const ok = await UI.confirm(U.fmtDur(hrs * 3600e3) + ' あずける？', '<p>はやく むかえに いっても おかねは もどらないよ。</p>', 'あずける');
            if (!ok) return;
            const r = P.daycare(save(), hrs, price);
            if (!r.ok) return UI.toast(r.msg);
            persist();
            api.close();
            S.main('home');
            UI.toast(r.msg);
          } }, h('span', { class: 'lic', html: HG.art.icon('house') }), h('span', { class: 'lt' }, h('b', {}, U.fmtDur(hrs * 3600e3))), h('span', { class: 'lr' }, price)));
        });
        b.appendChild(list);
      },
    });
  };

  // ───────── メニュー ─────────
  S.menu = function (c) {
    const s = save();
    const page = h('div', { class: 'page' }, h('h1', { class: 'page-h' }, 'メニュー'));
    const card = h('div', { class: 'card' });
    const list = h('div', { class: 'list' });
    const row = (icon, title, sub, fn, color) =>
      list.appendChild(h('button', { class: 'li', onclick: () => { HG.audio.sfx('tap'); fn(); } }, h('span', { class: 'lic', style: { '--k': color || 'var(--screen)' }, html: HG.art.icon(icon) }), h('span', { class: 'lt' }, h('b', {}, title), h('span', {}, sub))));
    row('stats', 'ステータス', 'のうりょく・わざの いれかえ・そだてメモ', () => S.statusSheet(), '#d9ecff');
    row('shop', 'ショップ', 'くすり・きずぐすり・きせかえ', () => S.shopSheet(), '#fff1b8');
    row('shirt', 'きせかえ', 'かった アクセサリーを つける', () => S.dressSheet(), '#ffd9e6');
    row('train', 'とっくん', 'れんしゅうバトル。まけても しなない', () => S.spar(), '#dff7c9');
    if (s.best.chapter >= 8) row('tower', 'ゆめの とう', 'クリアご の チャレンジ。ゆめの なかなので しなない', () => S.tower(), '#e6dcff');
    row('house', 'あずかりや', 'るすの あいだ じかんを とめる', () => S.daycareSheet(), '#ffe2c9');
    if (HG.isApp && HG.isApp()) row('phone', 'アプリとして ひらいています', 'ホーム画面から あそべているよ', () => UI.toast('いまは アプリとして ひらいているよ'), '#dff7c9');
    else row('phone', 'アプリにする', HG.install && HG.install.evt ? 'タップで ホーム画面に いれる' : 'ホーム画面に いれる ほうほう', () => HG.doInstall(), '#d6f5ff');
    row('gear', 'せってい', 'おと・バックアップ・データ', () => S.settingsSheet(), '#eeeeee');
    row('help', 'あそびかた', 'そだてかたと バトルの コツ', () => S.helpSheet(), '#eeeeee');
    card.appendChild(list);
    page.appendChild(card);
    page.appendChild(h('p', { class: 'page-sub', style: { margin: '0 4px' } }, 'ハグクミ v' + HG.VERSION + '　いままで そだてた かず ' + s.lives));
    c.appendChild(page);
  };

  S.spar = async function () {
    const p = pet();
    if (p.asleep) return UI.toast('ねているよ');
    if (p.hunger < 8) return UI.toast('おなかが すいて たたかえない…');
    // じぶんと おなじくらいの あいて
    const types = HG.TYPE_KEYS.filter((t) => t !== 'normal');
    const stage = Math.max(1, Math.min(4, p.stage));
    const look = { stage, egg: U.pick(['red', 'blue', 'green', 'yellow', 'white']), type: stage >= 2 ? U.pick(types) : 'normal', style: U.pick(HG.STYLE_KEYS), dna: U.randi(1, 9999) };
    HG.ENEMIES._spar = { name: 'とっくん あいて', look };
    const ok = await UI.confirm('とっくん', '<p>れんしゅうバトルだよ。まけても しなないけど、おなかは へるよ。</p>', 'はじめる');
    if (!ok) return;
    HG.battleUI.start({ mode: 'spar', arena: 'yard', enemies: [['_spar', Math.max(1, p.level + U.randi(-1, 1))]] });
  };
  S.tower = async function () {
    const s = save();
    const floor = (s.tower.cur || 0) + 1;
    const ok = await UI.confirm('ゆめの とう ' + floor + 'かい', '<p>ゆめの なかの たたかい。まけても しなないけど、1かいから やりなおし。いままでの さいこうは ' + (s.tower.best || 0) + 'かい。</p>', 'のぼる');
    if (!ok) return;
    const types = HG.TYPE_KEYS.filter((t) => t !== 'normal');
    const lv = Math.min(60, 20 + floor * 2);
    const n = floor % 5 === 0 ? 2 : 1;
    const ens = [];
    for (let i = 0; i < n; i++) {
      HG.ENEMIES['_tw' + i] = { name: 'ゆめの いきもの', look: { stage: floor > 6 ? 4 : 3, egg: 'white', type: U.pick(types), style: U.pick(HG.STYLE_KEYS), dna: U.randi(1, 9999) } };
      ens.push(['_tw' + i, lv]);
    }
    HG.battleUI.start({ mode: 'tower', arena: 'dream', enemies: ens, floor });
  };

  // ───────── アプリにする ほうほう ─────────
  S.installHelp = function () {
    UI.sheet({
      title: 'アプリにする',
      body: (b) => {
        const sec = (t, lines) => b.appendChild(h('div', { class: 'card flat gap' }, h('h3', {}, t), ...lines.map((l) => h('p', { style: { margin: 0 }, class: 'small' }, l))));
        sec('Android（Chrome）', ['うえに みどりの「アプリにする」ボタンが でたら、それを おしてね。', 'でない ときは ︙ メニュー →「ホーム画面に追加」→「インストール」。', 'おわると ホーム画面や アプリいちらんに「ハグクミ」が でるよ。1ぷんくらい かかる ことが あるよ。']);
        sec('iPhone（Safari）', ['きょうゆうボタン →「ホーム画面に追加」。']);
        sec('「すでに インストールされています」と でて ひらけない とき', [
          'おなじ サイト（' + location.host + '）の べつの ゲームを アプリに していると、Chrome の メニューからは こう でて しまうよ。Chrome の しくみで、URL の まちがいでは ないよ。',
          'この ときは、うえに でる みどりの「アプリにする」ボタンから いれてね。ページを ひらいて 30びょう くらい あそぶと でてくるよ。',
          'それでも でない ときは、スマホの せってい → アプリ → Chrome →「強制停止」してから、このページを ひらきなおしてね。セーブデータは きえないよ。',
          'どうしても だめな ときは「ホーム画面に追加」→「ショートカットを作成」でも あそべるよ（Chrome の なかで ひらきます）。',
        ]);
      },
    });
  };

  // ───────── せってい ─────────
  S.settingsSheet = function () {
    const s = save();
    UI.sheet({
      title: 'せってい',
      body: (b, api) => {
        const sw = (label, key, after) => {
          const input = h('input', { type: 'checkbox', id: 'set-' + key });
          input.checked = s.settings[key] !== false;
          input.onchange = () => { s.settings[key] = input.checked; persist(); after && after(); };
          return h('label', { class: 'row', for: 'set-' + key, style: { justifyContent: 'space-between', padding: '6px 0' } }, h('span', {}, label), h('span', { class: 'switch' }, input, h('span', {})));
        };
        b.appendChild(h('div', { class: 'card flat' },
          sw('こうかおん', 'sound'),
          sw('BGM', 'bgm', () => HG.audio.refresh()),
          sw('ぶるぶる（たいおう きしゅ）', 'vibe')
        ));
        const ta = h('textarea', { class: 'ta', id: 'export-code', readonly: true });
        b.appendChild(h('div', { class: 'card flat gap' },
          h('h3', {}, 'バックアップ'),
          h('p', { class: 'muted', style: { margin: 0 } }, 'データは この ブラウザに ほぞん されるよ。きしゅへんこう する ときは コードを コピーして、あたらしい きしゅで よみこもう。'),
          h('button', { class: 'btn white', onclick: async () => {
            ta.value = P.exportCode();
            ta.select();
            try { await navigator.clipboard.writeText(ta.value); UI.toast('コピーしたよ'); } catch (e) { UI.toast('コードを えらんで コピーしてね'); }
          } }, 'コードを つくって コピー'),
          ta,
          h('button', { class: 'btn white', onclick: () => { api.close(); S.importSheet(); } }, 'コードを よみこむ')
        ));
        b.appendChild(h('div', { class: 'card flat gap' },
          h('h3', {}, 'さいしょから'),
          h('p', { class: 'muted', style: { margin: 0 } }, 'ぜんぶの データが きえます。もとに もどせません。'),
          h('button', { class: 'btn danger', onclick: async () => {
            const ok = await UI.confirm('ほんとうに けす？', '<p>あいぼうも、ずかんも、おもいでも ぜんぶ きえるよ。</p>', 'けす', 'やめる', true);
            if (!ok) return;
            const ok2 = await UI.confirm('さいごの かくにん', '<p>ほんとうに いいの？</p>', 'ぜんぶ けす', 'やめる', true);
            if (!ok2) return;
            P.reset();
            HG.save = P.newSave();
            persist();
            api.close();
            S.render();
          } }, 'データを ぜんぶ けす')
        ));
        b.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, 'つうしんには PeerJS（MIT ライセンス）、QRコードには qrcode-generator（MIT ライセンス）を つかっています。'));
      },
    });
  };
  S.importSheet = function () {
    UI.sheet({
      title: 'データを よみこむ',
      body: (b, api) => {
        const ta = h('textarea', { class: 'ta', id: 'import-code', placeholder: 'HGK1. で はじまる コードを はりつけ' });
        b.appendChild(ta);
        b.appendChild(h('button', { class: 'btn lime', onclick: async () => {
          try {
            const s = P.importCode(ta.value);
            const ok = await UI.confirm('よみこむ？', '<p>いまの データは うわがき されるよ。</p>', 'よみこむ');
            if (!ok) return;
            HG.save = s;
            persist();
            api.close();
            S.render();
            UI.toast('よみこんだよ');
          } catch (e) {
            UI.toast(e.message || 'よみこめなかった');
          }
        } }, 'よみこむ'));
      },
    });
  };
  S.helpSheet = function () {
    UI.sheet({
      title: 'あそびかた',
      body: (b) => {
        const sec = (t, lines) => b.appendChild(h('div', { class: 'card flat gap' }, h('h3', {}, t), ...lines.map((l) => h('p', { style: { margin: 0 }, class: 'small' }, l))));
        sec('おせわ', [
          'おなか・ごきげん・せいけつ・ねむけ を みて おせわしよう。あさと よる、1日2かい みてあげれば あんしん。',
          'おなかや ごきげんが 0、びょうき、うんち 4こ いじょう を 15ふん ほうっておくと「おせわミス」。ミスが つづくと からだが よわって、やみタイプにも なりやすい。いのちが 0に なると しんで しまうよ。',
          'よる 9じ〜あさ 6じは、ねむけが なくなっても あさまで ねているよ。ねている あいだは おせわミスに ならない。',
          'るすに する ときは「あずかりや」に あずけよう。',
          'なにも ほしくないのに「かまって〜！」と よぶのは わがまま。そんな ときは「しかる」で しつけよう（わがままじゃ ない ときに しかると、かなしくて やみに ちかづくよ）。しつけが ひくいと バトルで いうことを きかない ことが あるよ。',
          'ねむけが いっぱいに なると かってに ねむる。ねている あいだは あそべないので、よるに「ねる」で ねかせて あげよう。',
        ]);
        sec('すがたと タイプ', [
          'しんかの とき、それまでの そだてかたで きまるよ。',
          'すがた：ままごと → かわいい、スポーツ → かっこいい、あたまの あそび → かしこい、バトル → たくましい。',
          'タイプ：おにく → ほのお、おさかな・おふろ → みず、サラダ → くさ、パチパチキャンディ → でんき、こんぺいとう・なでる・かんぺきな おせわ → ひかり。おせわミスが おおいと やみ。',
          ...HG.TYPE_HINT,
        ]);
        sec('バトル', [
          'ひだりした で いどう。みぎの ボタンで わざ。わざには「ため」と「クールタイム」が あるよ。',
          'あかい はんいや とんでくる たまは「よける」で かわせる。よけている しゅんかんは むてき。',
          'こうげきしたり うけたり すると「きずなゲージ」が たまる。いっぱいで「きずなバースト」！ しばらく つよくなる。',
          'ストーリーで まけると、あいぼうは しんで しまう。じゅんびを してから いこう。たいせんと とっくんでは しなない。',
          'パソコン：WASD・やじるし で いどう、J K L ; か 1〜4 で わざ、スペースで よける、E で バースト、Q で きずぐすり。',
        ]);
        sec('たいせん', [
          'かたほうが「へやを つくる」、もうかたほうが コードか QRコードで はいる。',
          'つながりにくい ときは、おなじ Wi-Fi に つなぐか、かたほうの スマホの テザリングに もうかたほうを つなぐと つながりやすいよ。',
        ]);
      },
    });
  };

  // ───────── ずかん・おもいで ─────────
  S.dex = function (c, sub) {
    sub = sub || HG.state.dexTab || 'dex';
    HG.state.dexTab = sub;
    const s = save();
    const page = h('div', { class: 'page' });
    const tabs = h('div', { class: 'seg-tabs' },
      h('button', { class: sub === 'dex' ? 'on' : '', onclick: () => { c.innerHTML = ''; S.dex(c, 'dex'); } }, 'ずかん'),
      h('button', { class: sub === 'graves' ? 'on' : '', onclick: () => { c.innerHTML = ''; S.dex(c, 'graves'); } }, 'おもいで')
    );
    page.appendChild(tabs);
    if (sub === 'dex') {
      const all = [];
      HG.EGG_KEYS.forEach((e) => all.push({ stage: 1, egg: e, type: 'normal', style: 'cute', dna: 7 }));
      [2, 3, 4].forEach((st) => HG.STYLE_KEYS.forEach((style) => HG.TYPE_KEYS.forEach((type) => all.push({ stage: st, egg: 'white', type, style, dna: 7 }))));
      const got = all.filter((l) => s.dex[HG.formKey(l)]).length;
      page.appendChild(h('h1', { class: 'page-h' }, 'ずかん ' + got + ' / ' + all.length));
      const groups = [[1, 'ベビー'], [2, 'こども'], [3, 'おとな'], [4, 'きわみ']];
      let idx = 0;
      groups.forEach(([st, name]) => {
        const grid = h('div', { class: 'dex' });
        all.filter((l) => l.stage === st).forEach((l) => {
          const key = HG.formKey(l);
          const rec = s.dex[key];
          const d = h('button', { class: 'd' + (rec ? '' : ' no'), 'aria-label': rec ? HG.formName(l) : 'まだ みつけていない' });
          d.innerHTML = HG.art.creature(l, { uid: 'dx' + idx++ });
          d.onclick = () => {
            if (!rec) return UI.toast(st === 1 ? 'この たまごから うまれると わかるよ' : 'まだ みつけていない すがた');
            UI.modal({ art: HG.art.creature(l, { uid: 'dxm', cls: 'anim-idle' }), title: HG.formName(l), html: `<p class="muted">${U.fmtDate(rec.at)} に ${U.esc(rec.by || '')} が はじめて なった すがた</p>`, dismiss: true });
          };
          grid.appendChild(d);
        });
        page.appendChild(h('div', { class: 'card' }, h('h3', {}, name), grid));
      });
    } else {
      page.appendChild(h('h1', { class: 'page-h' }, 'おもいでの おか'));
      if (!s.graves.length) page.appendChild(h('div', { class: 'card' }, h('p', { style: { margin: 0 } }, 'まだ だれも ねむっていないよ。この ページが ずっと からっぽだと いいね。')));
      s.graves.forEach((g, i) => {
        page.appendChild(h('div', { class: 'card grave' },
          h('div', { class: 'art', html: HG.art.creature(g.look, { uid: 'gv' + i, expr: 'sleep' }) }),
          h('div', { class: 'grow', style: { minWidth: 0 } },
            h('b', { style: { fontSize: '17px' } }, g.name),
            h('div', { class: 'muted' }, HG.formName(g.look) + '・Lv.' + g.level),
            h('div', { class: 'small' }, U.fmtDate(g.bornAt) + ' 〜 ' + U.fmtDate(g.diedAt) + '（' + U.fmtDur(g.diedAt - g.bornAt) + '）'),
            h('div', { class: 'small' }, 'さいご：' + (g.cause === 'バトル' ? (g.foe ? g.foe + ' との ' : '') + 'たたかい' : g.cause === 'くうふく' ? 'おなかが すきすぎた' : g.cause === 'びょうき' ? 'びょうき' : g.cause === 'さびしさ' ? 'さびしさ' : g.cause) + (g.chapter ? '・ぼうけん ' + g.chapter + 'しょう まで クリア' : ''))
          )
        ));
      });
    }
    c.appendChild(page);
  };

  // ───────── ぼうけん ─────────
  S.story = function (c) {
    const p = pet();
    const page = h('div', { class: 'page' }, h('h1', { class: 'page-h' }, 'ぼうけん'), h('p', { class: 'page-sub' }, 'くろいもやを はらって まちを すくおう。ストーリーで まけると しんで しまうよ。'));
    HG.STORY.forEach((ch) => {
      const state = p.story.ch > ch.id ? 'done' : p.story.ch === ch.id ? 'now' : 'lock';
      const steps = h('div', { class: 'steps' });
      ch.battles.forEach((bt, i) => {
        const done = p.story.ch > ch.id || (p.story.ch === ch.id && p.story.node > i);
        steps.appendChild(h('span', { class: 'st' + (done ? ' on' : '') + (i === ch.battles.length - 1 && ch.id > 0 ? ' boss' : '') }));
      });
      const card = h('button', { class: 'card chapter ' + state, disabled: state === 'lock' ? true : null },
        h('span', { class: 'num', style: { '--k': state === 'now' ? 'var(--pink)' : '' } }, ch.id === 0 ? '★' : String(ch.id)),
        h('span', { class: 'grow', style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('b', { style: { fontSize: '16px' } }, ch.title),
          h('span', { class: 'muted' }, HG.ARENAS[ch.arena].name + '・おすすめ Lv.' + ch.rec + (state === 'done' ? '・クリア！' : '')),
          steps
        )
      );
      if (state === 'now') card.onclick = () => S.chapterSheet(ch);
      else if (state === 'done') card.onclick = () => UI.toast('クリアずみ！');
      page.appendChild(card);
    });
    if (p.story.ch > 8) page.appendChild(h('div', { class: 'card' }, h('h3', {}, 'ぜんぶ クリア！'), h('p', { style: { margin: 0 } }, 'メニューの「ゆめの とう」に いけるように なったよ。')));
    c.appendChild(page);
  };
  S.chapterSheet = async function (ch) {
    const p = pet();
    const s = save();
    if (p.story.node === 0 && !p.story.seenIntro) {
      p.story.seenIntro = true;
      persist();
      const boss = ch.battles[ch.battles.length - 1].enemies[0][0];
      await UI.talk(ch.intro, S.talkCtx(HG.ENEMIES[boss]));
    }
    const bt = ch.battles[p.story.node];
    UI.sheet({
      title: ch.title,
      body: (b, api) => {
        const isBoss = ch.id > 0 && p.story.node === ch.battles.length - 1;
        b.appendChild(h('p', { class: 'muted', style: { margin: 0 } }, (ch.battles.length > 1 ? 'バトル ' + (p.story.node + 1) + ' / ' + ch.battles.length : 'バトル') + (isBoss ? '・ボス' : '')));
        const foes = h('div', { class: 'gap' });
        bt.enemies.forEach(([id, lv]) => {
          const d = HG.ENEMIES[id];
          const sp = P.enemySpec(id, lv);
          foes.appendChild(h('div', { class: 'hero' },
            h('div', { class: 'art', style: { width: '84px', height: '84px' }, html: HG.art.enemy(d, { uid: 'f' + id }) }),
            h('div', { class: 'who' }, h('b', { style: { fontSize: '17px' } }, d.name), h('div', { class: 'chips' }, UI.typeChip(sp.type), h('span', { class: 'chip' }, 'Lv.' + lv)))
          ));
        });
        b.appendChild(h('div', { class: 'card flat' }, foes));
        const lethal = bt.lethal !== false && !ch.tutorial;
        if (lethal) {
          b.appendChild(h('div', { class: 'warnbox', html: HG.art.icon('grave') + `<span>まけると ${U.esc(p.name)} は しんで しまいます。いまの Lv.${p.level}。とちゅうで アプリが とじても、つぎに ひらいた とき つづきから たたかうよ。</span>` }));
        }
        const go = h('button', { class: 'btn big ' + (lethal ? 'pink' : 'lime') + ' block' }, 'たたかう');
        go.onclick = async () => {
          if (p.asleep) return UI.toast('ねているよ。おこしてから いこう');
          if (p.hunger < 8) return UI.toast('おなかが すいて たたかえない…');
          if (p.sick) return UI.toast('びょうきの ときは たたかえない');
          if (lethal && p.level < bt.enemies[0][1] - 2) {
            const ok = await UI.confirm('あいての ほうが つよそう', '<p>あいては Lv.' + bt.enemies[0][1] + '。もうすこし そだててから の ほうが いいかも。それでも いく？</p>', 'いく', 'やめる', true);
            if (!ok) return;
          }
          api.close();
          if (bt.pre) await UI.talk(bt.pre, S.talkCtx(HG.ENEMIES[bt.enemies[0][0]]));
          HG.battleUI.start({ mode: ch.tutorial ? 'tutorial' : 'story', arena: ch.arena, enemies: bt.enemies, chapter: ch.id, node: p.story.node, lethal, boss: isBoss });
        };
        b.appendChild(go);
      },
    });
  };
  // ストーリーの しょうり
  // かった ことを すぐ きろくする（バトルの すぐ あと）
  S.storyAdvance = function (ch, node) {
    const p = pet();
    const s = save();
    const chapter = HG.STORY[ch];
    if (!p || !chapter || p.story.ch !== ch || p.story.node !== node) return { done: false };
    p.story.node = node + 1;
    if (p.story.node < chapter.battles.length) return { done: false };
    p.story.ch = ch + 1;
    p.story.node = 0;
    p.story.seenIntro = false;
    s.best.chapter = Math.max(s.best.chapter, ch);
    if (ch >= 4 && !s.eggs.includes('star')) s.eggs.push('star');
    if (chapter.final) P.log(p, 'わすれものの くにを すくった');
    return { done: true };
  };
  S.storyWin = async function (ch, node) {
    const r = S.storyAdvance(ch, node);
    persist();
    if (r.done) await S.storyOutro(ch);
  };
  S.storyOutro = async function (ch) {
    const p = pet();
    const chapter = HG.STORY[ch];
    {
      const boss = chapter.battles[chapter.battles.length - 1].enemies[0][0];
      const enemy = HG.ENEMIES[boss];
      const ctx = S.talkCtx(enemy);
      ctx.enemySvg = HG.art.enemy(enemy, { uid: 'ow', expr: 'happy' });
      let lines = chapter.outro.slice();
      if (chapter.final && p.type === 'dark') lines.splice(1, 0, ['enemy', '…おまえも、わすれられた ことが あるんだな。それでも ここまで きたのか。']);
      await UI.talk(lines, ctx);
      if (chapter.final) {
        await UI.modal({ art: HG.art.creature(P.look(p), { uid: 'fin', expr: 'happy', cls: 'anim-hop' }), title: 'ぜんぶ クリア！', html: `<p>${U.esc(p.name)} と いっしょに まちを すくったよ。メニューに「ゆめの とう」が ふえた。</p>`, buttons: [{ label: 'やったね', cls: 'pink', value: 1 }] });
      }
    }
    persist();
  };

  // ───────── しんか ─────────
  S.checkEvolution = async function () {
    const p = pet();
    if (!p || p.dead || HG.state.busy || HG.state.evolving) return;
    const st = P.evoState(p);
    if (!st || !st.ready) return;
    HG.state.evolving = true;
    try {
      await S.playEvolution();
    } finally {
      HG.state.evolving = false;
    }
  };
  S.playEvolution = async function () {
    const s = save(), p = pet();
    const fromLook = P.look(p);
    const res = P.evolve(s);
    persist();
    HG.audio.stopBgm();
    HG.audio.sfx('evolve');
    const big = h('div', { class: 'cine-art' });
    const a = h('div', { class: 'sil', style: { position: 'absolute', inset: '0' }, html: HG.art.creature(fromLook, { uid: 'ev1' }) });
    const b2 = h('div', { class: 'sil', style: { position: 'absolute', inset: '0', opacity: '0' }, html: HG.art.creature(res.to, { uid: 'ev2' }) });
    big.appendChild(a);
    big.appendChild(b2);
    const title = h('h2', {}, 'おや…？ ' + p.name + ' の ようすが…！');
    const msg = h('p', {}, '');
    const btn = h('button', { class: 'btn big lime', style: { visibility: 'hidden' } }, 'すごい！');
    const cine = h('div', { class: 'cine' }, big, title, msg, btn);
    document.body.appendChild(cine);
    for (let i = 0; i < 9; i++) {
      await U.sleep(Math.max(90, 300 - i * 25));
      const on = i % 2 === 0;
      a.style.opacity = on ? '0' : '1';
      b2.style.opacity = on ? '1' : '0';
    }
    a.style.opacity = '0';
    b2.style.opacity = '1';
    await U.sleep(300);
    b2.classList.remove('sil');
    b2.innerHTML = HG.art.creature(res.to, { uid: 'ev3', expr: 'happy', cls: 'anim-hop' });
    HG.vibrate([30, 40, 60]);
    title.textContent = p.name + ' は「' + res.name + '」に しんかした！';
    msg.innerHTML = res.why.map((w) => U.esc(w)).join('<br>') + (res.learned.length ? '<br>あたらしい わざ：' + res.learned.map((id) => HG.MOVES[id].name).join('、') : '');
    btn.style.visibility = 'visible';
    await new Promise((r) => (btn.onclick = r));
    HG.audio.sfx('tap');
    cine.remove();
    S.main(HG.state.tab || 'home');
  };

  // ───────── おわかれ ─────────
  S.death = async function () {
    const s = save(), p = pet();
    if (HG.state.deathShown) return;
    HG.state.deathShown = true;
    UI.closeAll();
    U.qsa('.full').forEach((x) => x.remove());
    HG.audio.bgm('sad');
    const look = P.look(p);
    const big = h('div', { class: 'cine-art' });
    const petArt = h('div', { style: { position: 'absolute', inset: '0' }, html: HG.art.creature(look, { uid: 'dd', expr: 'sleep' }) });
    big.appendChild(petArt);
    const star = h('div', { class: 'twinkle', html: `<svg viewBox="-12 -12 24 24"><path d="${HG.art.starPath(0, 0, 11, 4.5)}" fill="#fff3a8"/></svg>` });
    const title = h('h2', {}, p.name + ' は…');
    const cause = p.dead.cause;
    const foe = p.dead.foe;
    const causeText = { 'くうふく': 'おなかが すきすぎて、うごけなく なって しまった。', 'びょうき': 'びょうきが なおらないまま、ちからつきて しまった。', 'さびしさ': 'ずっと ひとりで、げんきが なくなって しまった。', 'バトル': (foe ? foe + ' との ' : '') + 'たたかいで、ちからつきて しまった。' }[cause] || 'たおれて しまった。';
    const msg = h('p', {}, causeText);
    const btn = h('button', { class: 'btn big white', style: { visibility: 'hidden' } }, 'おもいでに のこす');
    const cine = h('div', { class: 'cine night' }, h('div', { class: 'stars-bg' }), star, big, title, msg, btn);
    document.body.appendChild(cine);
    await U.sleep(2200);
    petArt.classList.add('rise');
    title.textContent = p.name + ' は おほしさまに なりました。';
    await U.sleep(3200);
    const g = s.graves[0];
    msg.innerHTML = `${U.esc(HG.formName(look))}・Lv.${p.level}<br>${U.fmtDur((g && g.diedAt - g.bornAt) || 0)} いっしょに いた。` + (p.wins ? `<br>${p.wins}かい いっしょに かった。` : '');
    btn.style.visibility = 'visible';
    await new Promise((r) => (btn.onclick = r));
    HG.audio.sfx('tap');
    s.pet = null;
    persist();
    cine.remove();
    HG.state.deathShown = false;
    HG.state.tab = 'home';
    await UI.talk([['sensei', 'つらかったわね…。' + p.name + ' の ことは、ずっと わすれないで いてあげて。'], ['sensei', 'もやの せいで ひとりぼっちの たまごが、まだ いるの。…また いつか、そだてて くれる？']]);
    S.eggSelect();
  };

  // ───────── るすの あいだ ─────────
  S.showAway = function (ev, ms) {
    const p = pet();
    if (!p || p.dead || p.stage < 1) return;
    const cnt = (k) => ev.filter((e) => e.kind === k).length;
    const lines = [];
    if (cnt('poop')) lines.push('うんちを ' + cnt('poop') + 'かい した');
    if (cnt('sick')) lines.push('びょうきに なった');
    if (cnt('dozed')) lines.push('ねむくて、そのまま ねむって しまった');
    if (cnt('woke')) lines.push('ひとりで おきた');
    if (cnt('mistake')) {
      const ks = [...new Set(ev.filter((e) => e.kind === 'mistake').map((e) => P.MISTAKE_SHORT[e.key] || e.key))];
      lines.push('おせわミス ＋' + cnt('mistake') + '（' + ks.join('・') + '）');
    }
    if (p.hunger < 15) lines.push('おなかが ぺこぺこ');
    if (cnt('daycare_end')) lines.push('あずかりやから かえってきた');
    if (!lines.length) return;
    UI.modal({
      title: U.fmtDur(ms) + ' ぶりだね',
      art: HG.art.creature(P.look(p), { uid: 'aw', expr: P.expr(p) }),
      html: '<p>るすの あいだに…</p><p>' + lines.map((l) => '・' + U.esc(l)).join('<br>') + '</p>',
      buttons: [{ label: 'おせわ する', cls: 'lime', value: 1 }],
    });
  };
})(window.HG);
