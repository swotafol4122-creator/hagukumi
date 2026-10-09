/* ハグクミ pet.js — そだてる しくみ（お世話・時間・しんか・ステータス） */
'use strict';
(function (HG) {
  const U = HG.util;
  const H = 3600e3, MIN = 60e3;
  const P = (HG.P = {});
  const SAVE_KEY = 'hagukumi_save_v1';

  // ───────── セーブ ─────────
  P.newSave = function () {
    return {
      v: 1,
      createdAt: HG.clock.now(),
      coins: 60,
      items: { medicine: 1, potion: 2, drink: 0 },
      accs: [],
      settings: { sound: true, bgm: true, vibe: true },
      dex: {},
      graves: [],
      best: { chapter: 0 },
      lives: 0,
      pvp: { w: 0, l: 0 },
      eggs: ['white', 'red', 'blue', 'green', 'yellow'],
      tower: { best: 0 },
      seenTutorial: false,
      migr: 103,
      pet: null,
    };
  };
  P.load = function () {
    const s = HG.store.get(SAVE_KEY);
    if (!s || s.v !== 1) return P.newSave();
    if (s.migr === undefined) s.migr = 0; // v1.0.2 までの データ
    // あとから ふえた こうもくを おぎなう
    const d = P.newSave();
    for (const k in d) if (s[k] === undefined) s[k] = d[k];
    return s;
  };
  P.persist = function () {
    if (HG.save) HG.store.set(SAVE_KEY, HG.save);
  };
  P.exportCode = function () {
    const json = JSON.stringify(HG.save);
    return 'HGK1.' + btoa(unescape(encodeURIComponent(json)));
  };
  P.importCode = function (code) {
    code = String(code || '').trim();
    if (!code.startsWith('HGK1.')) throw new Error('コードの かたちが ちがいます');
    const json = decodeURIComponent(escape(atob(code.slice(5))));
    const s = JSON.parse(json);
    if (!s || s.v !== 1) throw new Error('よみこめない データです');
    return s;
  };
  P.reset = function () {
    HG.store.del(SAVE_KEY);
  };

  // ───────── たまご・たんじょう ─────────
  P.newEgg = function (save, eggKey) {
    const now = HG.clock.now();
    const inherit = Math.min(0.25, save.graves.reduce((a, g) => a + 0.01 + 0.01 * (g.chapter || 0), 0));
    save.pet = {
      id: U.uid(),
      name: '',
      egg: eggKey,
      dna: Math.floor(Math.random() * 1e6),
      stage: 0,
      warmth: 0,
      eggAt: now,
      inherit,
    };
    return save.pet;
  };
  function freshAcc() {
    return { el: { fire: 0, water: 0, grass: 0, elec: 0, light: 0 }, dark: 0, styleP: { cute: 0, cool: 0, smart: 0, tough: 0 }, mistakes: 0, why: {} };
  }
  P.hatch = function (save, name) {
    const pet = save.pet;
    const now = HG.clock.now();
    const egg = HG.EGGS[pet.egg];
    Object.assign(pet, {
      name: name,
      stage: 1,
      bornAt: now,
      lastTick: now,
      level: 1,
      xp: 0,
      type: 'normal',
      style: 'cute',
      hunger: 80,
      mood: 70,
      clean: 100,
      sleepy: 8,
      life: 100,
      weight: 5,
      asleep: false,
      sick: false,
      poops: [],
      nextPoopAt: now + 1.6 * H,
      mistakes: 0,
      st: freshAcc(),
      prev: freshAcc(),
      tr: { hp: 0, atk: 0, def: 0, spd: 0, int: 0 },
      bond: 20,
      disc: 30,
      moves: ['tackle'],
      equip: ['tackle', null, null, null],
      acc: { head: null, face: null, neck: null },
      story: { ch: 0, node: 0 },
      wins: 0,
      battles: 0,
      pvpW: 0,
      pvpL: 0,
      alerts: {},
      counted: {},
      whim: null,
      petLog: [],
      snackLog: [],
      daycareUntil: 0,
      inBattle: null,
      log: [],
      forms: [],
      evoNote: null,
    });
    for (const k in egg.el) pet.st.el[k] += egg.el[k];
    if (egg.dark) pet.st.dark += egg.dark;
    if (pet.egg === 'star') pet.bond += 10;
    save.lives = (save.lives || 0) + 1;
    P.registerForm(save);
    P.log(pet, pet.name + ' が うまれた');
    return pet;
  };

  P.look = function (pet) {
    return { stage: pet.stage, egg: pet.egg, type: pet.type || 'normal', style: pet.style || 'cute', dna: pet.dna, acc: pet.acc || {} };
  };
  P.registerForm = function (save) {
    const pet = save.pet;
    const key = HG.formKey(P.look(pet));
    if (!save.dex[key]) save.dex[key] = { at: HG.clock.now(), by: pet.name };
    if (!pet.forms.includes(key)) pet.forms.push(key);
    return key;
  };
  P.log = function (pet, text) {
    pet.log = pet.log || [];
    pet.log.push({ t: HG.clock.now(), text });
    if (pet.log.length > 40) pet.log.shift();
  };

  // ───────── レベル・ステータス ─────────
  P.xpNeed = (L) => Math.floor(20 + L * 10 + L * L * 0.5);
  P.idealWeight = (stage) => [5, 5, 10, 20, 28][stage] || 10;
  P.trCap = (L) => 6 + L;

  const STYLE_MUL = {
    cute: { hp: 1.15, atk: 0.92, def: 1.08, spd: 1.0, int: 1.02 },
    cool: { hp: 0.94, atk: 1.12, def: 0.95, spd: 1.12, int: 0.95 },
    smart: { hp: 0.96, atk: 0.96, def: 1.0, spd: 1.0, int: 1.2 },
    tough: { hp: 1.12, atk: 1.06, def: 1.12, spd: 0.9, int: 0.9 },
  };
  const TYPE_MUL = {
    normal: {}, fire: { atk: 1.08 }, water: { hp: 1.04, def: 1.05 }, grass: { hp: 1.08 },
    elec: { spd: 1.1 }, light: { int: 1.06, def: 1.03 }, dark: { atk: 1.14, def: 0.93 },
  };
  const STAGE_MUL = [0.8, 0.85, 1.0, 1.12, 1.25];

  // pet でも てき(spec) でも つかえる
  P.calcStats = function (o, opts) {
    opts = opts || {};
    const L = opts.level || o.level || 1;
    const stage = o.stage || 1;
    const sm = STAGE_MUL[stage] || 1;
    const sM = stage >= 2 ? STYLE_MUL[o.style] || {} : {};
    const tM = TYPE_MUL[o.type] || {};
    const T = o.tr || { hp: 0, atk: 0, def: 0, spd: 0, int: 0 };
    const inh = 1 + (o.inherit || 0);
    const m = (k) => sm * (sM[k] || 1) * (tM[k] || 1) * inh;
    const s = {
      hp: (60 + L * 9 + T.hp * 3) * m('hp'),
      atk: (12 + L * 2.2 + T.atk) * m('atk'),
      def: (12 + L * 2.0 + T.def) * m('def'),
      spd: (12 + L * 1.4 + T.spd) * m('spd'),
      int: (12 + L * 1.8 + T.int) * m('int'),
    };
    if (o.weight && !opts.ignoreWeight) {
      const w = o.weight / P.idealWeight(stage);
      if (w > 1.6) s.spd *= 0.85;
      else if (w > 1.3) s.spd *= 0.93;
    }
    if (opts.mul) for (const k in opts.mul) s[k] *= opts.mul[k];
    for (const k in s) s[k] = Math.max(1, Math.round(s[k]));
    return s;
  };

  P.addXp = function (save, n) {
    const pet = save.pet;
    const res = { levels: 0, learned: [] };
    if (!pet || pet.stage < 1) return res;
    pet.xp += Math.max(0, Math.round(n));
    while (pet.level < 50 && pet.xp >= P.xpNeed(pet.level)) {
      pet.xp -= P.xpNeed(pet.level);
      pet.level++;
      res.levels++;
      res.learned.push(...P.learnForLevel(pet, pet.level));
    }
    if (pet.level >= 50) pet.xp = Math.min(pet.xp, P.xpNeed(50));
    return res;
  };
  P.learn = function (pet, id) {
    if (!id || !HG.MOVES[id] || pet.moves.includes(id)) return null;
    pet.moves.push(id);
    const empty = pet.equip.indexOf(null);
    if (empty >= 0) pet.equip[empty] = id;
    return id;
  };
  P.learnForLevel = function (pet, L) {
    const out = [];
    HG.BASE_LEARN.forEach(([lv, id]) => {
      if (lv === L && P.learn(pet, id)) out.push(id);
    });
    if (pet.stage >= 2) {
      HG.TYPE_LEARN_LV.forEach((lv, i) => {
        if (lv === L && (i < 5 || pet.stage >= 4)) {
          const id = HG.LEARN_TYPE[pet.type][i];
          if (P.learn(pet, id)) out.push(id);
        }
      });
      HG.STYLE_LEARN_LV.forEach((lv, i) => {
        if (lv === L) {
          const id = HG.LEARN_STYLE[pet.style][i];
          if (P.learn(pet, id)) out.push(id);
        }
      });
    }
    return out;
  };
  P.learnAllUpTo = function (pet) {
    const out = [];
    HG.BASE_LEARN.forEach(([lv, id]) => {
      if (lv <= pet.level && P.learn(pet, id)) out.push(id);
    });
    if (pet.stage >= 2) {
      HG.TYPE_LEARN_LV.forEach((lv, i) => {
        if (lv <= pet.level && (i < 5 || pet.stage >= 4)) {
          const id = HG.LEARN_TYPE[pet.type][i];
          if (P.learn(pet, id)) out.push(id);
        }
      });
      HG.STYLE_LEARN_LV.forEach((lv, i) => {
        if (lv <= pet.level) {
          const id = HG.LEARN_STYLE[pet.style][i];
          if (P.learn(pet, id)) out.push(id);
        }
      });
    }
    return out;
  };
  P.addTrain = function (pet, tr, mul) {
    const cap = P.trCap(pet.level);
    for (const k in tr) pet.tr[k] = Math.min(cap, (pet.tr[k] || 0) + tr[k] * (mul == null ? 1 : mul));
  };

  // ───────── じかんの けいか ─────────
  P.simulate = function (save, now) {
    const pet = save.pet;
    const ev = [];
    if (!pet || pet.stage < 1 || pet.dead) return ev;
    let t = pet.lastTick || now;
    if (now <= t) return ev;
    // あずかりや
    if (pet.daycareUntil) {
      if (now < pet.daycareUntil) {
        pet.lastTick = now;
        return ev;
      }
      if (t < pet.daycareUntil) {
        const skip = pet.daycareUntil - t;
        pet.nextPoopAt += skip;
        Object.keys(pet.alerts).forEach((k) => pet.alerts[k] && (pet.alerts[k] += skip));
        t = pet.daycareUntil;
        ev.push({ t, kind: 'daycare_end' });
      }
      pet.daycareUntil = 0;
    }
    const MAXGAP = 7 * 24 * H;
    if (now - t > MAXGAP) t = now - MAXGAP;
    while (t < now && !pet.dead) {
      const dt = Math.min(MIN, now - t);
      tick(save, pet, t, dt, ev);
      t += dt;
    }
    pet.lastTick = now;
    return ev;
  };

  function tick(save, pet, t, dt, ev) {
    const h = dt / H;
    if (pet.asleep) {
      pet.sleepy -= 15 * h;
      pet.hunger -= 0.8 * h;
      pet.mood -= 0.3 * h;
      pet.clean -= 0.5 * h;
      // ねている あいだは よばない（おせわミスの とけいも とめる）
      for (const k in pet.alerts || {}) if (pet.alerts[k]) pet.alerts[k] += dt;
      // よる（21じ〜6じ）は ねむけが なくなっても あさまで ねている
      if (pet.sleepy <= 0) {
        pet.sleepy = 0;
        if (!P.isNight(t)) {
          pet.asleep = false;
          pet.dozed = false;
          ev.push({ t, kind: 'woke' });
        }
      }
      if (t >= pet.nextPoopAt) pet.nextPoopAt = t + 20 * MIN;
    } else {
      pet.sleepy += 5.5 * h;
      pet.hunger -= 5 * h;
      let md = 3.5;
      if (pet.hunger < 20) md += 2;
      if (pet.poops.length > 2) md += 1 * (pet.poops.length - 2);
      if (pet.sick) md += 2;
      if (pet.clean < 30) md += 1;
      pet.mood -= md * h;
      pet.clean -= 2 * h;
      // うごいて いると すこしずつ やせる
      const wMin = P.idealWeight(pet.stage) * 0.8;
      if (pet.weight > wMin) pet.weight = Math.max(wMin, pet.weight - 0.12 * h);
      if (t >= pet.nextPoopAt) {
        if (pet.poops.length < 8) {
          pet.poops.push({ id: U.uid(), x: U.rand(0.12, 0.88), y: U.rand(0, 1) });
          ev.push({ t, kind: 'poop' });
        }
        pet.clean -= 10;
        pet.nextPoopAt = t + U.rand(4.5, 6) * H;
      }
      if (pet.sleepy >= 100) {
        pet.sleepy = 100;
        pet.asleep = true;
        pet.dozed = true;
        pet.mood -= 8;
        ev.push({ t, kind: 'dozed' });
      }
    }
    clampNeeds(pet);
    // びょうき
    if (!pet.sick) {
      let r = 0.003;
      r += 0.025 * Math.max(0, pet.poops.length - 2);
      if (pet.clean < 25) r += 0.04;
      if (pet.hunger < 10) r += 0.03;
      const snacks = (pet.snackLog || []).filter((s) => t - s < 2 * H).length;
      if (snacks > 3) r += 0.06 * (snacks - 3);
      if (pet.weight > P.idealWeight(pet.stage) * 1.5) r += 0.01;
      if (pet.asleep) r *= 0.3;
      if (Math.random() < 1 - Math.exp(-r * h)) {
        pet.sick = true;
        pet.sickAt = t;
        ev.push({ t, kind: 'sick' });
      }
    }
    // いのち
    let drain = 0;
    if (pet.hunger <= 0) drain += 4;
    if (pet.sick) drain += 2.5;
    if (pet.mood <= 0) drain += 1;
    if (pet.clean <= 0) drain += 1;
    if (pet.asleep) drain *= 0.5;
    const regen = pet.sick || pet.hunger <= 0 ? 0 : pet.hunger > 30 && pet.mood > 15 ? 3 : 1.5;
    pet.life = U.clamp(pet.life + (regen - drain) * h, 0, 100);
    // おせわミス（ねている あいだは よばない）
    if (!pet.asleep) {
      alert(save, pet, 'hunger', pet.hunger <= 0, t, ev);
      alert(save, pet, 'mood', pet.mood <= 0, t, ev);
      alert(save, pet, 'sick', pet.sick, t, ev);
      alert(save, pet, 'poop', pet.poops.length >= 4, t, ev);
    }
    // かんぺきな おせわ → ひかり
    if (pet.hunger > 50 && pet.mood > 50 && pet.clean > 50 && !pet.sick && pet.poops.length === 0) pet.st.el.light += 0.6 * h;
    // わがまま
    if (!pet.asleep && !pet.whim && pet.hunger > 40 && pet.mood > 40 && !pet.sick && pet.poops.length < 2) {
      if (Math.random() < 1 - Math.exp(-0.22 * h)) {
        pet.whim = { at: t };
        ev.push({ t, kind: 'whim' });
      }
    }
    if (pet.whim && t - pet.whim.at > 30 * MIN) {
      pet.whim = null;
      pet.disc = Math.max(0, pet.disc - 2);
    }
    if (pet.life <= 0) {
      let cause = 'さびしさ';
      if (pet.sick) cause = 'びょうき';
      else if (pet.hunger <= 0) cause = 'くうふく';
      P.die(save, cause, t);
      ev.push({ t, kind: 'death', cause });
    }
  }
  P.isNight = (t) => {
    const hr = new Date(t).getHours();
    return hr >= 21 || hr < 6;
  };
  function clampNeeds(pet) {
    ['hunger', 'mood', 'clean', 'sleepy', 'bond', 'disc'].forEach((k) => (pet[k] = U.clamp(pet[k], 0, 100)));
    pet.weight = Math.max(1, pet.weight);
  }
  P.clampNeeds = clampNeeds;
  function alert(save, pet, key, cond, t, ev) {
    pet.alerts = pet.alerts || {};
    pet.counted = pet.counted || {};
    if (cond) {
      if (!pet.alerts[key]) {
        pet.alerts[key] = t;
        pet.counted[key] = 0;
        ev.push({ t, kind: 'call', key });
      }
      const since = t - pet.alerts[key];
      const should = since >= 15 * MIN ? 1 + Math.floor((since - 15 * MIN) / (12 * H)) : 0;
      while (pet.counted[key] < should) {
        pet.counted[key]++;
        P.mistake(pet, key, t);
        ev.push({ t, kind: 'mistake', key });
      }
    } else if (pet.alerts[key]) {
      pet.alerts[key] = 0;
      pet.counted[key] = 0;
    }
  }
  P.MISTAKE_SHORT = { hunger: 'おなか', mood: 'ごきげん', sick: 'びょうき', poop: 'うんち', flee: 'にげた' };
  P.MISTAKE_TEXT = { hunger: 'おなかが ぺこぺこの まま', mood: 'ごきげんが 0の まま', sick: 'びょうきの まま', poop: 'うんちが 4こ いじょう', flee: 'バトルの とちゅうで いなくなった' };
  P.why = (pet) => (pet.st.why = pet.st.why || {});
  P.mistake = function (pet, key, t) {
    pet.mistakes++;
    pet.st.mistakes++;
    pet.st.dark += 10;
    const w = P.why(pet);
    w[key] = (w[key] || 0) + 1;
    pet.mlog = pet.mlog || [];
    pet.mlog.push({ t: t || HG.clock.now(), key });
    if (pet.mlog.length > 30) pet.mlog.shift();
    pet.bond = Math.max(0, pet.bond - 4);
  };

  P.die = function (save, cause, t, foe) {
    const pet = save.pet;
    if (!pet || pet.dead) return;
    pet.dead = { cause, at: t || HG.clock.now(), foe: foe || null };
    const chapter = Math.max(0, pet.story ? pet.story.ch - 1 : 0);
    save.graves.unshift({
      name: pet.name,
      look: P.look(pet),
      bornAt: pet.bornAt,
      diedAt: pet.dead.at,
      cause,
      foe: foe || null,
      level: pet.level,
      chapter: pet.story ? Math.max(0, pet.story.ch - 1) : 0,
      wins: pet.wins,
      mistakes: pet.mistakes,
      pvp: [pet.pvpW || 0, pet.pvpL || 0],
    });
    if (save.graves.length > 60) save.graves.length = 60;
    if (!save.eggs.includes('shadow')) save.eggs.push('shadow');
    return chapter;
  };

  // ───────── いまの ようす ─────────
  P.calls = function (pet) {
    const c = [];
    if (!pet || pet.stage < 1 || pet.dead) return c;
    if (pet.daycareUntil && HG.clock.now() < pet.daycareUntil) return c;
    if (pet.sick) c.push('sick');
    if (pet.hunger < 15) c.push('hunger');
    if (pet.poops.length >= 3) c.push('poop');
    if (pet.mood < 15) c.push('mood');
    if (!pet.asleep && pet.sleepy >= 85) c.push('sleepy');
    if (pet.whim) c.push('whim');
    return c;
  };
  P.condition = function (pet) {
    const l = pet.life;
    if (l >= 70) return { text: 'げんき', lv: 0 };
    if (l >= 40) return { text: 'ちょっと よわってる', lv: 1 };
    if (l >= 15) return { text: 'よわってる', lv: 2 };
    return { text: 'あぶない！', lv: 3 };
  };
  P.expr = function (pet) {
    if (pet.asleep) return 'sleep';
    if (pet.sick) return 'sick';
    if (pet.mood < 20 || pet.hunger < 10) return 'sad';
    return 'normal';
  };
  P.age = (pet) => HG.clock.now() - (pet.bornAt || HG.clock.now());

  // ───────── おせわ ─────────
  const R = (ok, msg, extra) => Object.assign({ ok, msg }, extra || {});
  function busy(pet) {
    if (pet.daycareUntil && HG.clock.now() < pet.daycareUntil) return 'あずかりやに いるよ';
    if (pet.asleep) return 'すやすや ねているよ';
    return null;
  }
  P.feed = function (save, foodId) {
    const pet = save.pet;
    const b = busy(pet);
    if (b) return R(false, b);
    const f = HG.foodById(foodId);
    if (!f) return R(false, '？');
    if (save.coins < f.price) return R(false, 'おこづかいが たりない');
    if (f.kind === 'meal' && pet.hunger >= 95) return R(false, 'もう おなか いっぱい', { refuse: true });
    if (f.kind === 'snack' && pet.hunger >= 100 && pet.mood >= 100) return R(false, 'もう いらないって', { refuse: true });
    save.coins -= f.price;
    const t = HG.clock.now();
    pet.hunger += f.hunger;
    pet.mood += f.mood;
    pet.weight += f.weight;
    for (const k in f.el) pet.st.el[k] += f.el[k];
    if (f.style) for (const k in f.style) pet.st.styleP[k] += f.style[k];
    P.addTrain(pet, f.tr || {}, 1);
    if (f.kind === 'snack') {
      pet.snackLog = (pet.snackLog || []).filter((s) => t - s < 3 * H);
      pet.snackLog.push(t);
    }
    pet.bond += 1;
    if (pet.nextPoopAt > t + 3 * H) pet.nextPoopAt = t + U.rand(1.5, 3) * H;
    clampNeeds(pet);
    const lv = P.addXp(save, 2);
    let msg = f.kind === 'snack' ? 'おいしい！' : 'もぐもぐ…';
    if (f.kind === 'snack' && pet.snackLog.length > 3) msg = 'おやつの たべすぎに ちゅうい';
    return R(true, msg, { lv });
  };
  P.cleanUp = function (save) {
    const pet = save.pet;
    if (pet.daycareUntil && HG.clock.now() < pet.daycareUntil) return R(false, 'あずかりやに いるよ');
    const n = pet.poops.length;
    pet.poops = [];
    pet.clean = Math.min(100, pet.clean + 25 + n * 5);
    if (n) pet.mood += 3;
    clampNeeds(pet);
    const lv = n ? P.addXp(save, 2) : null;
    return R(true, n ? 'ピカピカに なった！' : 'もう きれいだよ', { n, lv });
  };
  P.bath = function (save) {
    const pet = save.pet;
    const b = busy(pet);
    if (b) return R(false, b);
    const t = HG.clock.now();
    if (pet.lastBath && t - pet.lastBath < 20 * MIN) return R(false, 'さっき はいったよ');
    pet.lastBath = t;
    pet.clean = 100;
    let msg = 'さっぱり！';
    if (pet.type === 'water') { pet.mood += 14; msg = 'おふろ だいすき！'; }
    else if (pet.type === 'fire') { pet.mood -= 6; msg = 'ちょっと にがて みたい…'; }
    else pet.mood += 5;
    pet.st.el.water += 1.5;
    clampNeeds(pet);
    const lv = P.addXp(save, 3);
    return R(true, msg, { lv });
  };
  P.medicine = function (save) {
    const pet = save.pet;
    if (pet.daycareUntil && HG.clock.now() < pet.daycareUntil) return R(false, 'あずかりやに いるよ');
    if (!pet.sick) return R(false, 'びょうきじゃ ないよ');
    if (!save.items.medicine) return R(false, 'くすりが ない。ショップで かえるよ', { needShop: true });
    save.items.medicine--;
    pet.mood -= 4;
    if (Math.random() < 0.75) {
      pet.sick = false;
      clampNeeds(pet);
      return R(true, 'なおった！');
    }
    clampNeeds(pet);
    return R(true, 'まだ ちょっと つらそう。もう 1かい！', { again: true });
  };
  P.pat = function (save) {
    const pet = save.pet;
    const b = busy(pet);
    if (b) return R(false, b);
    const t = HG.clock.now();
    pet.petLog = (pet.petLog || []).filter((s) => t - s < 10 * MIN);
    if (pet.petLog.length >= 3) return R(false, 'もう まんぞく みたい', { full: true });
    pet.petLog.push(t);
    pet.bond += 2;
    pet.mood += 4;
    pet.st.styleP.cute += 0.4;
    pet.st.el.light += 0.6;
    clampNeeds(pet);
    return R(true, 'うれしそう！');
  };
  P.scold = function (save) {
    const pet = save.pet;
    const b = busy(pet);
    if (b) return R(false, b);
    if (pet.whim) {
      pet.whim = null;
      pet.disc += 20;
      clampNeeds(pet);
      return R(true, 'はんせい したみたい', { fair: true });
    }
    pet.mood -= 15;
    pet.bond -= 6;
    pet.st.dark += 4;
    P.why(pet).scold = (P.why(pet).scold || 0) + 1;
    clampNeeds(pet);
    return R(true, 'なにも してないのに…。かなしそう', { fair: false });
  };
  P.sleep = function (save) {
    const pet = save.pet;
    if (pet.asleep) return R(false, 'もう ねているよ');
    if (pet.sleepy < 25) return R(false, 'まだ ねむくない みたい');
    pet.asleep = true;
    pet.dozed = false;
    pet.mood += 3;
    clampNeeds(pet);
    return R(true, 'おやすみなさい');
  };
  P.wake = function (save) {
    const pet = save.pet;
    if (!pet.asleep) return R(false, 'おきているよ');
    pet.asleep = false;
    if (pet.sleepy > 40) {
      pet.mood -= 10;
      clampNeeds(pet);
      return R(true, 'まだ ねむいのに…', { grumpy: true });
    }
    return R(true, 'おはよう！');
  };
  P.drink = function (save) {
    const pet = save.pet;
    const b = busy(pet);
    if (b) return R(false, b);
    if (!save.items.drink) return R(false, 'げんきドリンクが ない', { needShop: true });
    save.items.drink--;
    pet.sleepy -= 40;
    clampNeeds(pet);
    return R(true, 'シャキッと した！');
  };
  P.daycare = function (save, hours, price) {
    const pet = save.pet;
    if (save.coins < price) return R(false, 'おこづかいが たりない');
    save.coins -= price;
    pet.daycareUntil = HG.clock.now() + hours * H;
    pet.asleep = false;
    return R(true, U.fmtDur(hours * H) + ' あずけたよ');
  };
  P.pickup = function (save) {
    const pet = save.pet;
    pet.daycareUntil = 0;
    pet.lastTick = HG.clock.now();
    return R(true, 'おかえり！');
  };

  // ミニゲームの けっか
  P.applyMinigame = function (save, gameId, perf) {
    const pet = save.pet;
    const mg = HG.MINIGAMES.find((g) => g.id === gameId);
    perf = U.clamp(perf, 0, 1);
    const style = HG.MG_CATS[mg.cat].style;
    pet.hunger -= 6;
    pet.mood += 10 + 8 * perf;
    pet.sleepy += 1;
    pet.weight -= mg.cat === 'sports' ? 1 : 0.4;
    pet.weight = Math.max(P.idealWeight(pet.stage) * 0.6, pet.weight);
    pet.st.styleP[style] += 2 + 3 * perf;
    P.addTrain(pet, mg.tr, 0.5 + perf);
    pet.bond += 2;
    clampNeeds(pet);
    const xp = Math.round((18 + 32 * perf) * (1 + 0.07 * pet.level));
    const coins = Math.round(5 + 20 * perf);
    save.coins += coins;
    const lv = P.addXp(save, xp);
    return { xp, coins, lv, style };
  };

  // バトルの けっか
  P.applyBattle = function (save, r) {
    const pet = save.pet;
    pet.battles++;
    pet.hunger -= r.mode === 'pvp' ? 6 : 10;
    pet.sleepy += 1.5;
    pet.mood += r.win ? 10 : -8;
    if (r.mode !== 'pvp') pet.st.styleP.tough += r.boss ? 4 : 2;
    let xp = 0, coins = 0;
    if (r.mode === 'story') {
      if (r.win) {
        xp = (30 + r.enemyLv * 12) * (r.boss ? 2 : 1);
        coins = (15 + r.enemyLv * 3) * (r.boss ? 2 : 1);
      }
    } else if (r.mode === 'spar') {
      xp = Math.round((12 + pet.level * 4) * (r.win ? 1 : 0.4));
      coins = r.win ? 10 : 0;
    } else if (r.mode === 'tower') {
      xp = r.win ? Math.round(20 + r.floor * 8) : 0;
      coins = r.win ? 8 + r.floor * 2 : 0;
    } else if (r.mode === 'pvp') {
      coins = r.win ? 30 : 10;
      xp = r.win ? 40 : 15;
    } else if (r.mode === 'tutorial') {
      xp = 30;
      coins = 20;
    }
    if (r.win) {
      pet.wins++;
      pet.bond += 3;
    }
    clampNeeds(pet);
    save.coins += coins;
    const lv = P.addXp(save, xp);
    return { xp, coins, lv };
  };

  // ───────── しんか ─────────
  P.evoState = function (pet) {
    if (!pet || pet.stage < 1 || pet.stage >= 4 || pet.dead) return null;
    const S = HG.STAGES[pet.stage];
    if (pet.level < S.evoLv) return null;
    const wait = S.minAge - P.age(pet);
    if (wait > 0) return { ready: false, wait };
    return { ready: true };
  };
  function sumAcc(pet) {
    const el = {};
    HG.ELEM_KEYS.forEach((k) => (el[k] = pet.st.el[k] + pet.prev.el[k] * 0.3));
    const sp = {};
    HG.STYLE_KEYS.forEach((k) => (sp[k] = pet.st.styleP[k] + pet.prev.styleP[k] * 0.3));
    const dark = pet.st.dark + pet.prev.dark * 0.3;
    return { el, sp, dark };
  }
  P.predict = function (pet) {
    const { el, sp, dark } = sumAcc(pet);
    let best = null, bv = 0;
    for (const k of HG.ELEM_KEYS) if (el[k] > bv) { bv = el[k]; best = k; }
    let type;
    if (dark >= 30 && dark >= bv) type = 'dark';
    else if (bv < 4) type = pet.stage >= 2 && pet.type !== 'dark' ? pet.type : 'normal';
    else type = best;
    let style = null, sv = 0;
    for (const k of HG.STYLE_KEYS) if (sp[k] > sv) { sv = sp[k]; style = k; }
    if (sv < 3) style = pet.stage >= 2 ? pet.style : 'cute';
    return { type, style, el, sp, dark };
  };
  // やみを のぞいて、さいごの しんかの ときの そだてかたで タイプを きめなおす
  P.retypeGuess = function (pet) {
    const src = pet.prev && pet.prev.el ? pet.prev.el : pet.st.el;
    let best = 'normal', bv = 3.999;
    for (const k of HG.ELEM_KEYS) if ((src[k] || 0) > bv) { bv = src[k]; best = k; }
    return best;
  };
  P.retype = function (save, type) {
    const pet = save.pet;
    const old = pet.type;
    if (old === type) return [];
    pet.type = type;
    const learned = P.learnAllUpTo(pet);
    // いれていた まえの タイプの わざを、あたらしい タイプの わざと いれかえる
    const pool = pet.moves.filter((id) => HG.MOVES[id].type === type && HG.MOVES[id].power > 0 && !pet.equip.includes(id));
    pet.equip = pet.equip.map((id) => (id && HG.MOVES[id].type === old && pool.length ? pool.shift() : id));
    P.registerForm(save);
    P.log(pet, HG.TYPES[type].name + 'タイプに なおした');
    return learned;
  };
  P.evolve = function (save) {
    const pet = save.pet;
    const pr = P.predict(pet);
    const from = P.look(pet);
    const oldType = pet.type, oldStyle = pet.style;
    pet.type = pr.type;
    pet.style = pr.style;
    pet.stage++;
    // りゆう
    const why = [];
    const tr = {
      dark: 'おせわミスが おおかったので やみタイプに',
      light: 'あいじょう たっぷりに そだったので ひかりタイプに',
      fire: 'おにくを よく たべたので ほのおタイプに',
      water: 'おさかなや おふろが すきなので みずタイプに',
      grass: 'サラダを よく たべたので くさタイプに',
      elec: 'パチパチキャンディが すきなので でんきタイプに',
      normal: 'なんでも バランスよく そだったので ノーマルタイプに',
    };
    if (pet.stage === 2 || pet.type !== oldType) why.push(tr[pet.type]);
    else why.push(HG.TYPES[pet.type].name + 'タイプの まま');
    if (pet.stage === 2 || pet.style !== oldStyle) why.push(HG.STYLES[pet.style].from + 'ので ' + HG.STYLES[pet.style].name + ' すがたに');
    else why.push(HG.STYLES[pet.style].name + ' すがたの まま');
    // ためた ポイントを ひきつぐ
    pet.prev = JSON.parse(JSON.stringify(pet.st));
    const keepEggDark = 0;
    pet.st = freshAcc();
    pet.st.dark = keepEggDark;
    pet.life = 100;
    pet.mood = Math.min(100, pet.mood + 20);
    pet.weight = Math.max(pet.weight, P.idealWeight(pet.stage) * 0.8);
    const learned = P.learnAllUpTo(pet);
    // あたらしい タイプの わざを、きほんの わざと いれかえる
    const basic = ['tackle', 'scratch', 'quick'];
    learned.filter((id) => HG.MOVES[id].power > 0 && !pet.equip.includes(id)).slice(0, 2).forEach((id) => {
      const i = pet.equip.findIndex((e) => e && basic.includes(e));
      if (i >= 0) pet.equip[i] = id;
    });
    const key = P.registerForm(save);
    const name = HG.formName(P.look(pet));
    P.log(pet, name + ' に しんか');
    pet.evoNote = null;
    return { from, to: P.look(pet), name, why, learned, key };
  };

  // ───────── バトルに つかう データ ─────────
  P.fighterSpec = function (save, opts) {
    const pet = save.pet;
    opts = opts || {};
    const stats = P.calcStats(pet, { level: opts.level });
    return {
      name: pet.name,
      look: P.look(pet),
      level: opts.level || pet.level,
      stage: pet.stage,
      type: pet.type,
      style: pet.style,
      stats,
      moves: pet.equip.filter(Boolean),
      bond: pet.bond,
      disc: pet.disc,
      r: HG.STAGES[pet.stage].r || 24,
    };
  };
  // こうげき 3つ ＋ ほじょ 1つ くらいに する
  P.pickMoves = function (list, type) {
    const M = HG.MOVES;
    const atk = list.filter((id) => M[id].power > 0).sort((a, b) => (M[b].power * (M[b].type === type ? 1.2 : 1) * (M[b].count || 1) ** 0.5) / Math.sqrt(M[b].cd) - (M[a].power * (M[a].type === type ? 1.2 : 1) * (M[a].count || 1) ** 0.5) / Math.sqrt(M[a].cd));
    const sup = list.filter((id) => !(M[id].power > 0));
    const out = atk.slice(0, sup.length ? 3 : 4);
    if (sup.length) out.push(sup[sup.length - 1]);
    while (out.length < 4 && atk.length > out.length) out.push(atk[out.length]);
    return out.slice(0, 4);
  };
  // てきの データ
  P.enemySpec = function (id, level, opts) {
    const d = HG.ENEMIES[id];
    opts = opts || {};
    const look = d.look;
    const stage = look ? look.stage : 3;
    const type = look ? look.type : d.type;
    const style = look ? look.style : d.style;
    const o = { level, stage, type, style, tr: { hp: level * 0.8, atk: level * 0.8, def: level * 0.8, spd: level * 0.6, int: level * 0.8 } };
    let stats = P.calcStats(o);
    const BAL = HG.BAL || {};
    let dmgMul = BAL.enemyDmg || 0.88;
    if (d.boss) {
      stats.hp = Math.round(stats.hp * (BAL.bossHp || 2.3));
      stats.spd = Math.round(stats.spd * 0.85);
      dmgMul = BAL.bossDmg || 0.75;
    }
    if (opts.minion) stats.hp = Math.round(stats.hp * 0.6);
    if (opts.pair) {
      stats.hp = Math.round(stats.hp * (BAL.pairMul || 0.75));
      dmgMul *= BAL.pairMul || 0.75;
    }
    if (d.tame) {
      stats.hp = Math.round(stats.hp * 1.4);
      stats.atk = Math.round(stats.atk * 0.5);
    }
    let moves = d.moves;
    if (!moves) {
      // そだてた いきものと おなじ ルールで おぼえて、つよい わざを えらぶ
      const tmp = { level, stage, type, style, moves: [], equip: [null, null, null, null] };
      P.learnAllUpTo(tmp);
      moves = P.pickMoves(tmp.moves, type);
    }
    return {
      id,
      name: d.name,
      look,
      art: d.art,
      level,
      stage,
      type,
      style,
      stats,
      moves: moves.slice(0, d.boss ? 6 : 4),
      boss: !!d.boss,
      dmgMul,
      phases: d.phases || null,
      r: d.size ? d.size * (d.boss ? 0.74 : 0.62) : HG.STAGES[stage].r || 24,
      tame: !!d.tame,
    };
  };
})(window.HG);
