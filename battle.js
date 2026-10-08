/* ハグクミ battle.js — リアルタイムバトルの しくみ（エンジン・AI・びょうが） */
'use strict';
(function (HG) {
  const U = HG.util;
  const TAU = Math.PI * 2;
  const W = 600, H = 720;
  // バランスの つまみ
  HG.BAL = HG.BAL || { K: 0.32, bossHp: 1.6, bossDmg: 0.7, enemyDmg: 0.88, pairMul: 0.75 };
  const VFX_COL = { normal: '#ffffff', fire: '#ff7a2e', water: '#3fa9ff', grass: '#45c45a', elec: '#ffd400', light: '#fff1a0', dark: '#9a6bff' };

  // ───────── エンジン ─────────
  class Battle {
    constructor(opts) {
      this.W = W;
      this.H = H;
      this.mode = opts.mode;
      this.pvp = opts.mode === 'pvp';
      this.arenaKey = opts.arena || 'yard';
      this.arena = HG.ARENAS[this.arenaKey] || HG.ARENAS.yard;
      this.obstacles = (this.arena.obstacles || []).map(([x, y, r]) => ({ x, y, r }));
      this.fighters = [];
      this.attacks = [];
      this.parts = [];
      this.texts = [];
      this.time = 0;
      this.hitstop = 0;
      this.slowmo = 0;
      this.shake = 0;
      this.dim = 0;
      this.dimTarget = 0;
      this.over = false;
      this.result = null;
      this.seq = 1;
      this.listeners = [];
      this.net = opts.net || null;
      this.rng = U.mulberry32(opts.seed || Math.floor(Math.random() * 1e9));
      this.timeLimit = opts.timeLimit || 0;
    }
    on(fn) { this.listeners.push(fn); }
    emit(type, data) { this.listeners.forEach((f) => { try { f(type, data || {}); } catch (e) { console.error(e); } }); }

    addFighter(spec, side, o) {
      o = o || {};
      const f = {
        id: o.id || 'f' + this.seq++,
        side,
        spec,
        name: spec.name,
        level: spec.level,
        type: spec.type,
        stats: spec.stats,
        maxHp: spec.stats.hp,
        hp: o.hp != null ? o.hp : spec.stats.hp,
        x: o.x != null ? o.x : W / 2,
        y: o.y != null ? o.y : H / 2,
        r: spec.r || 24,
        vx: 0, vy: 0,
        face: side === 'A' ? -Math.PI / 2 : Math.PI / 2,
        flip: 1,
        moves: (spec.moves || []).filter((id) => HG.MOVES[id]).map((id) => ({ id, def: HG.MOVES[id], cd: 0.4 + Math.random() * 0.4 })),
        cast: null, dash: null, leap: null, channel: null,
        dodge: { cd: 0, t: 0, dx: 0, dy: 0 },
        iframe: 0,
        st: {},
        stunImm: 0,
        kx: 0, ky: 0,
        gauge: 0, burst: 0, canBurst: !!o.canBurst,
        potions: o.potions || 0, potionUsed: 0, usingItem: 0,
        ctrl: o.ctrl || 'ai',
        local: !!o.local,
        remote: !!o.remote,
        boss: !!spec.boss,
        phases: spec.phases ? spec.phases.map((p) => Object.assign({}, p, { done: false })) : null,
        phaseCdMul: 1,
        bond: spec.bond || 0,
        disc: spec.disc == null ? 60 : spec.disc,
        endured: false,
        dead: false,
        intent: { mx: 0, my: 0, move: -1, dodge: false, burst: false, item: false },
        ai: o.ai || null,
        target: null,
        hitFlash: 0,
        anim: Math.random() * 10,
        mist: !!o.mist,
        tame: !!spec.tame,
        windMul: (o.ai && o.ai.windMul) || 1,
        sprite: null,
        spriteW: null,
        invul: 0,
        castSeq: 0,
        netBuf: [],
      };
      this.fighters.push(f);
      return f;
    }
    foes(f) { return this.fighters.filter((o) => o.side !== f.side && !o.dead); }
    targetOf(f) {
      if (f.target && !f.target.dead && !f.target.st.hidden) return f.target;
      let best = null, bd = 1e9;
      for (const o of this.foes(f)) {
        if (o.st.hidden) continue;
        const d = U.dist(f.x, f.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) best = this.foes(f)[0] || null;
      f.target = best;
      return best;
    }
    cycleTarget(f) {
      const list = this.foes(f).filter((o) => !o.st.hidden);
      if (!list.length) return;
      const i = list.indexOf(f.target);
      f.target = list[(i + 1) % list.length];
    }

    // ── すうち ──
    speedOf(f) {
      let s = 140 + f.stats.spd * 1.6;
      if (f.st.slow) s *= 0.55;
      if (f.st.cheer) s *= 1.3;
      if (f.burst > 0) s *= 1.15;
      if (f.boss) s *= 0.9;
      return s;
    }
    cdMul(f) {
      let m = 1 - Math.min(0.3, f.stats.int / 400);
      if (f.burst > 0) m *= 0.6;
      return m * f.phaseCdMul;
    }
    atkMul(f) {
      let m = 1;
      if (f.st.charm) m *= 0.7;
      if (f.st.power) m *= 1.3;
      if (f.burst > 0) m *= 1.2;
      return m;
    }
    defMul(f) {
      let m = 1;
      if (f.st.weak) m *= 0.7;
      if (f.st.power) m *= 1.2;
      return m;
    }
    calcDamage(attStats, attLevel, attType, atkMul, def, move, power) {
      const atk = attStats.atk * atkMul;
      const dfn = def.stats.def * this.defMul(def);
      const lvl = 0.6 + attLevel * 0.045;
      const te = HG.typeEff(move.type, def.type);
      const stab = move.type === attType && move.type !== 'normal' ? 1.2 : 1;
      let d = power * lvl * Math.pow(atk / Math.max(1, dfn), 0.75) * te * stab * (0.92 + Math.random() * 0.16) * HG.BAL.K;
      if (def.st.barrier) d *= 0.5;
      return { d: Math.max(1, Math.round(d)), te };
    }

    // ── わざを はじめる ──
    aimInfo(f, def) {
      const t = this.targetOf(f);
      let tx = t ? t.x : f.x + Math.cos(f.face) * 200;
      let ty = t ? t.y : f.y + Math.sin(f.face) * 200;
      const dir = Math.atan2(ty - f.y, tx - f.x);
      const maxR = def.maxRange || def.dist || 0;
      if ((def.kind === 'aoe_target' || def.kind === 'zone' || def.kind === 'leap') && maxR) {
        const d = U.dist(f.x, f.y, tx, ty);
        if (d > maxR) { tx = f.x + Math.cos(dir) * maxR; ty = f.y + Math.sin(dir) * maxR; }
      }
      tx = U.clamp(tx, 20, W - 20);
      ty = U.clamp(ty, 20, H - 20);
      return { tx, ty, dir };
    }
    canAct(f) {
      return !f.dead && !f.cast && !f.dash && !f.leap && !f.channel && f.dodge.t <= 0 && !f.st.stun && f.usingItem <= 0;
    }
    startCast(f, slot) {
      const m = f.moves[slot];
      if (!m || m.cd > 0 || !this.canAct(f) || this.over) return false;
      const def = m.def;
      if (f.local && f.disc < 25 && Math.random() < 0.08) {
        m.cd = 0.6;
        this.text(f.x, f.y - f.r - 30, 'そっぽを むいた…', '#ffffff', 13);
        this.emit('disobey', { f });
        return false;
      }
      const aim = this.aimInfo(f, def);
      f.face = aim.dir;
      f.castSeq++;
      const cid = f.id + ':' + f.castSeq;
      f.cast = { slot, def, t: 0, wind: (def.wind || 0) * f.windMul * (f.burst > 0 ? 0.8 : 1), tx: aim.tx, ty: aim.ty, dir: aim.dir, plus: f.burst > 0, cid, seed: Math.floor(Math.random() * 1e9) };
      m.cd = def.cd * this.cdMul(f);
      this.emit('cast', { f, def, cast: f.cast });
      if (f.cast.wind <= 0) this.execCast(f);
      return true;
    }
    cancelCast(f) {
      if (!f.cast) return;
      const m = f.moves[f.cast.slot];
      if (m && !f.cast.done) m.cd = Math.min(m.cd, 0.3);
      f.cast = null;
    }
    execCast(f) {
      const c = f.cast;
      if (!c || c.done) return;
      c.done = true;
      c.rec = 0.12;
      // とびどうぐは うつ しゅんかんに ねらいなおす
      const def = c.def;
      if (def.kind === 'proj' || def.kind === 'line' || def.kind === 'melee' || def.kind === 'dash' || def.kind === 'wave') {
        const t = this.targetOf(f);
        if (t && !f.remote) c.dir = Math.atan2(t.y - f.y, t.x - f.x);
      }
      f.face = c.dir;
      this.emit('exec', { f, def, cast: c, atkMul: this.atkMul(f) });
      this.spawnMove(f, def, c, this.atkMul(f));
    }

    // ── わざの なかみ ──
    spawnMove(f, def, c, atkMul) {
      const plus = c.plus;
      const PW = plus ? 1.3 : 1, Z = plus ? 1.2 : 1;
      const power = (def.power || 0) * PW * ((f.spec && f.spec.dmgMul) || 1);
      const rng = U.mulberry32(c.seed || 1);
      const mir = c.mirror ? -1 : 1;
      const base = { owner: f, side: f.side, def, power, atkMul, cid: c.cid, plus, stats: f.stats, level: f.level, ftype: f.type };
      const add = (o, i) => {
        const a = Object.assign({ id: this.seq++, nid: c.cid + '.' + (i || 0), age: 0, delay: 0, hit: new Set(), dodged: new Set(), tickT: 0 }, base, o);
        this.attacks.push(a);
        return a;
      };
      const dir = c.dir;
      const remote = f.remote;
      switch (def.kind) {
        case 'proj': {
          const n = (def.count || 1) + (plus && def.count ? 1 : 0);
          const sp = ((def.spread || 0) * Math.PI) / 180 * (n > (def.count || 1) ? 1.2 : 1);
          for (let i = 0; i < n; i++) {
            const a = dir + (n > 1 ? -sp / 2 + (sp * i) / (n - 1) : 0);
            add({ kind: 'proj', x: f.x + Math.cos(a) * (f.r + 6), y: f.y + Math.sin(a) * (f.r + 6), vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed, r: (def.r || 10) * Z, life: (def.range || 400) / def.speed, homing: def.homing || 0, target: this.targetOf(f) }, i);
          }
          this.emit('sfx', { s: def.type === 'elec' ? 'zap' : 'shoot' });
          break;
        }
        case 'radial': {
          const n = def.count + (plus ? 4 : 0);
          const off = rng() * TAU + (c.mirror ? Math.PI : 0);
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * TAU;
            add({ kind: 'proj', x: f.x + Math.cos(a) * (f.r + 4), y: f.y + Math.sin(a) * (f.r + 4), vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed, r: (def.r || 10) * Z, life: (def.range || 400) / def.speed }, i);
          }
          if (def.heal && !remote) this.heal(f, f.maxHp * def.heal * PW);
          this.emit('sfx', { s: 'shoot' });
          break;
        }
        case 'melee': {
          const hits = def.hits || 1;
          for (let i = 0; i < hits; i++) add({ kind: 'arc', follow: f, dir, range: (def.range || 70) * Z, arc: ((def.arc || 100) * Math.PI) / 180, life: 0.12, delay: i * (def.gap || 0) }, i);
          this.emit('sfx', { s: 'whoosh' });
          break;
        }
        case 'line':
          add({ kind: 'rect', follow: f, dir, len: def.len * Z, width: def.width, life: 0.14 });
          this.emit('sfx', { s: 'whoosh' });
          break;
        case 'dash': {
          const dur = def.dist / def.speed;
          if (!remote) f.dash = { t: 0, dur, vx: Math.cos(dir) * def.speed, vy: Math.sin(dir) * def.speed, iframe: !!def.iframe, armor: !!def.armor, trail: def.trail, trailT: 0 };
          add({ kind: 'body', follow: f, r: f.r + 12, life: dur + 0.04, dir });
          this.emit('sfx', { s: 'dodge' });
          break;
        }
        case 'leap': {
          if (!remote) f.leap = { t: 0, dur: def.air, x0: f.x, y0: f.y, x1: c.tx, y1: c.ty };
          add({ kind: 'circle', x: c.tx, y: c.ty, r: def.radius * Z, delay: def.air, life: 0.15, tele: true });
          this.emit('sfx', { s: 'whoosh' });
          break;
        }
        case 'aoe_self':
          add({ kind: 'circle', x: f.x, y: f.y, r: def.radius * Z, life: 0.15 });
          if (def.heal && !remote) this.heal(f, f.maxHp * def.heal * PW);
          this.emit('sfx', { s: def.type === 'elec' ? 'zap' : 'boom' });
          this.shake = Math.max(this.shake, 6);
          break;
        case 'aoe_target': {
          const n = (def.count || 1) + (plus && def.count ? 1 : 0);
          for (let i = 0; i < n; i++) {
            let x = c.tx, y = c.ty;
            if (def.scatter && n > 1) {
              const a = rng() * TAU, d = Math.sqrt(rng()) * def.scatter;
              x += Math.cos(a) * d * mir;
              y += Math.sin(a) * d * mir;
            }
            add({ kind: 'circle', x: U.clamp(x, 10, W - 10), y: U.clamp(y, 10, H - 10), r: def.radius * Z, delay: def.delay + i * (def.stagger || 0), life: 0.15, tele: true, track: def.track && i > 0 ? this.targetOf(f) : null, trackIdx: i }, i);
          }
          this.emit('sfx', { s: 'cast' });
          break;
        }
        case 'beam':
          add({ kind: 'beam', x: f.x, y: f.y, dir, len: def.len, width: def.width * Z, life: 0.3 });
          this.emit('sfx', { s: 'zap' });
          this.shake = Math.max(this.shake, 8);
          break;
        case 'beams': {
          const n = def.count;
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * def.gap;
            const px = Math.cos(dir + Math.PI / 2) * off, py = Math.sin(dir + Math.PI / 2) * off;
            add({ kind: 'beam', x: f.x + px, y: f.y + py, dir, len: def.len, width: def.width * Z, life: 0.3 }, i);
          }
          this.emit('sfx', { s: 'zap' });
          this.shake = Math.max(this.shake, 8);
          break;
        }
        case 'cone':
          if (!remote) f.channel = { t: 0, dur: def.dur };
          add({ kind: 'cone', follow: f, dir, range: def.range * Z, arc: (def.arc * Math.PI) / 180, life: def.dur, tick: def.tick, ticking: true });
          this.emit('sfx', { s: 'whoosh' });
          break;
        case 'wave':
          add({ kind: 'wave', x: f.x, y: f.y, dir, vx: Math.cos(dir) * def.speed, vy: Math.sin(dir) * def.speed, width: def.width * Z, thick: def.thick, life: def.range / def.speed });
          this.emit('sfx', { s: 'whoosh' });
          break;
        case 'zone': {
          const n = def.count || 1;
          for (let i = 0; i < n; i++) {
            let x = c.tx, y = c.ty;
            if (n > 1) {
              const a = rng() * TAU, d = Math.sqrt(rng()) * (def.scatter || 100);
              x += Math.cos(a) * d * mir;
              y += Math.sin(a) * d * mir;
            }
            add({ kind: 'zone', x: U.clamp(x, 10, W - 10), y: U.clamp(y, 10, H - 10), r: def.radius * Z, delay: def.delay || 0, life: def.dur, tick: def.tick, ticking: true, pull: def.pull || 0, burstPower: def.burstPower ? def.burstPower * PW : 0, tele: true }, i);
          }
          this.emit('sfx', { s: 'cast' });
          break;
        }
        case 'aura':
          add({ kind: 'zone', follow: f, x: f.x, y: f.y, r: def.radius * Z, life: def.dur, tick: def.tick, ticking: true });
          this.emit('sfx', { s: 'whoosh' });
          break;
        case 'ring': {
          const n = def.count || 1;
          for (let i = 0; i < n; i++) add({ kind: 'ring', x: f.x, y: f.y, r0: f.r, r1: def.r1 * Z, dur: def.dur, thick: def.thick, life: def.dur, delay: i * (def.gap || 0), rCur: f.r }, i);
          this.emit('sfx', { s: 'boom' });
          break;
        }
        case 'heal':
          if (!remote) this.heal(f, f.maxHp * def.amount * PW);
          this.emit('sfx', { s: 'heal' });
          break;
        case 'buff': {
          if (remote) break;
          const b = def.buff;
          if (b === 'shield') f.st.shield = { t: def.dur };
          else if (b === 'barrier') f.st.barrier = { t: def.dur };
          else if (b === 'regen') f.st.regen = { t: def.dur, rate: (def.amount * f.maxHp * PW) / def.dur };
          else if (b === 'cheer') { this.heal(f, f.maxHp * def.amount * PW); f.st.cheer = { t: def.dur }; }
          else if (b === 'reflect') f.st.reflect = { t: def.dur };
          else if (b === 'power') f.st.power = { t: def.dur };
          else if (b === 'counter') f.st.counter = { t: def.dur, power: def.power * PW, radius: def.radius };
          this.emit('sfx', { s: b === 'shield' || b === 'barrier' || b === 'reflect' ? 'guard' : 'heal' });
          break;
        }
        case 'blink': {
          const t = this.targetOf(f);
          if (t && !remote) {
            const a = Math.atan2(t.y - f.y, t.x - f.x);
            const nx = U.clamp(t.x + Math.cos(a) * (t.r + f.r + 8), f.r, W - f.r);
            const ny = U.clamp(t.y + Math.sin(a) * (t.r + f.r + 8), f.r, H - f.r);
            this.puff(f.x, f.y, '#9a6bff');
            f.x = nx;
            f.y = ny;
            f.iframe = Math.max(f.iframe, 0.2);
            c.dir = Math.atan2(t.y - ny, t.x - nx);
            f.face = c.dir;
          }
          add({ kind: 'arc', follow: f, dir: c.dir, range: (def.reach || 70) * Z, arc: ((def.arc || 120) * Math.PI) / 180, life: 0.14, delay: 0.06, followDir: true });
          this.emit('sfx', { s: 'whoosh' });
          break;
        }
        case 'teleport': {
          if (remote) break;
          const t = this.targetOf(f);
          let best = null, bd = -1;
          for (let k = 0; k < 10; k++) {
            const a = Math.random() * TAU;
            const x = U.clamp(f.x + Math.cos(a) * def.dist, f.r + 10, W - f.r - 10);
            const y = U.clamp(f.y + Math.sin(a) * def.dist, f.r + 10, H - f.r - 10);
            const d = t ? U.dist(x, y, t.x, t.y) : 0;
            if (d > bd) { bd = d; best = [x, y]; }
          }
          this.puff(f.x, f.y, '#c9a8ff');
          f.x = best[0];
          f.y = best[1];
          f.iframe = Math.max(f.iframe, 0.25);
          this.puff(f.x, f.y, '#c9a8ff');
          this.emit('sfx', { s: 'whoosh' });
          break;
        }
        case 'trap': {
          const n = def.count + (plus ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const a = dir + (i - (n - 1) / 2) * 0.55;
            const d = 70 + (i % 2) * 30;
            add({ kind: 'trap', x: U.clamp(f.x + Math.cos(a) * d, 20, W - 20), y: U.clamp(f.y + Math.sin(a) * d, 20, H - 20), r: 28, blastR: def.radius * Z, life: def.life, arm: 0.5 }, i);
          }
          this.emit('sfx', { s: 'cast' });
          break;
        }
      }
    }

    heal(f, amt) {
      const before = f.hp;
      f.hp = Math.min(f.maxHp, f.hp + amt);
      const got = Math.round(f.hp - before);
      if (got > 0) this.text(f.x, f.y - f.r - 20, '+' + got, '#5dff9d', 18);
      for (let i = 0; i < 8; i++) this.parts.push({ x: f.x + U.rand(-f.r, f.r), y: f.y + U.rand(-f.r, f.r), vx: 0, vy: -60 - Math.random() * 40, life: 0.8, t: 0, col: '#7dffb0', r: 3 });
    }

    // ── ダメージ ──
    applyHit(a, t, powerOverride) {
      if (t.dead || this.over) return false;
      if (this.pvp && t.remote) return false; // あいての がめんが きめる
      if (t.iframe > 0 || t.st.hidden || t.invul > 0) {
        if (!a.dodged.has(t.id)) {
          a.dodged.add(t.id);
          if (t.dodge.t > 0 || t.iframe > 0) {
            this.text(t.x, t.y - t.r - 26, 'かわした！', '#7dfcff', 15);
            this.emit('dodged', { f: t });
          }
        }
        return false;
      }
      if (t.st.reflect && a.kind === 'proj' && a.owner !== t) {
        a.vx = -a.vx; a.vy = -a.vy; a.owner = t; a.side = t.side; a.hit = new Set(); a.age = 0; a.stats = t.stats; a.level = t.level; a.ftype = t.type; a.atkMul = this.atkMul(t);
        this.text(t.x, t.y - t.r - 26, 'はねかえした！', '#ffd8f0', 15);
        this.emit('sfx', { s: 'guard' });
        return false;
      }
      if (t.st.shield) {
        if (!a.hit.has(t.id)) {
          a.hit.add(t.id);
          this.text(t.x, t.y - t.r - 26, 'ガード！', '#ffffff', 15);
          this.emit('sfx', { s: 'guard' });
        }
        return a.kind === 'proj';
      }
      if (t.st.counter) {
        const cst = t.st.counter;
        delete t.st.counter;
        this.text(t.x, t.y - t.r - 26, 'カウンター！', '#ffcf33', 17);
        this.attacks.push({ id: this.seq++, nid: t.id + ':ctr' + this.seq, owner: t, side: t.side, def: HG.MOVES.counter, power: cst.power, atkMul: this.atkMul(t), stats: t.stats, level: t.level, ftype: t.type, kind: 'circle', x: t.x, y: t.y, r: cst.radius, age: 0, delay: 0, life: 0.15, hit: new Set(), dodged: new Set(), tickT: 0 });
        this.emit('sfx', { s: 'bighit' });
        this.emit('counter', { f: t });
        return true;
      }
      const power = powerOverride != null ? powerOverride : a.power;
      if (!power && !a.def.status) return false;
      // おなじ わざの たまが なんども あたりすぎないように
      const lim = a.def.kind === 'proj' && (a.def.count || 1) > 1 ? 2 : a.def.kind === 'radial' ? 2 : a.def.kind === 'aoe_target' && (a.def.count || 1) > 1 ? 3 : 0;
      if (lim && a.cid) {
        this.castHits = this.castHits || {};
        const key = a.cid + '>' + t.id;
        if ((this.castHits[key] || 0) >= lim) return false;
        this.castHits[key] = (this.castHits[key] || 0) + 1;
      }
      let dmg = 0, te = 1;
      if (power > 0) {
        const r = this.calcDamage(a.stats, a.level, a.ftype, a.atkMul, t, a.def, power);
        dmg = r.d;
        te = r.te;
      }
      // ふんばり
      let endured = false;
      if (dmg >= t.hp && t.hp > 1 && t.bond >= 90 && !t.endured && Math.random() < 0.3) {
        dmg = t.hp - 1;
        t.endured = true;
        endured = true;
      }
      t.hp = Math.max(0, t.hp - dmg);
      t.hitFlash = 0.12;
      if (dmg > 0) {
        const big = power >= 60 || te > 1.2;
        this.text(t.x + U.rand(-8, 8), t.y - t.r - 14, String(dmg), te > 1.2 ? '#ffd23d' : te < 0.9 ? '#c9c4dd' : '#ffffff', big ? 24 : 19);
        if (te > 1.2) this.text(t.x, t.y - t.r - 40, 'こうかばつぐん！', '#ffd23d', 15);
        else if (te < 0.9) this.text(t.x, t.y - t.r - 40, 'いまひとつ…', '#c9c4dd', 13);
        if (big) { this.hitstop = Math.max(this.hitstop, 0.06); this.shake = Math.max(this.shake, 7); }
        this.sparks(t.x, t.y, VFX_COL[a.def.type] || '#fff', big ? 14 : 8);
        this.emit('hit', { a, t, dmg, te, big });
      }
      if (endured) this.text(t.x, t.y - t.r - 52, 'ふんばった！', '#ff9fc8', 17);
      // ノックバック
      const kb = (a.def.knock || 60) * (t.boss ? 0.25 : 1) * ((t.dash && t.dash.armor) ? 0 : 1);
      if (kb) {
        let ang = Math.atan2(t.y - (a.y != null ? a.y : a.owner.y), t.x - (a.x != null ? a.x : a.owner.x));
        if (a.kind === 'proj' || a.kind === 'wave') ang = Math.atan2(a.vy, a.vx);
        if (a.kind === 'beam') ang = a.dir;
        t.kx += Math.cos(ang) * kb * 3;
        t.ky += Math.sin(ang) * kb * 3;
      }
      // じょうたい
      if (a.def.status) this.applyStatus(t, a.def.status, a.owner);
      // ゲージ
      if (dmg > 0) {
        const bm = (f) => 0.8 + (f.bond || 0) / 250;
        if (a.owner && a.owner.canBurst) a.owner.gauge = Math.min(100, a.owner.gauge + (dmg / t.maxHp) * 70 * bm(a.owner));
        if (t.canBurst) t.gauge = Math.min(100, t.gauge + (dmg / t.maxHp) * 45 * bm(t));
      }
      if (this.pvp && t.local && this.net) this.net.sendHit(a, t, dmg, te);
      if (t.hp <= 0) this.ko(t);
      else if (t.boss) this.checkPhase(t);
      return true;
    }
    applyStatus(t, status, src) {
      const intB = src ? Math.min(0.15, (src.stats ? src.stats.int : 0) / 600) : 0;
      for (const k in status) {
        if (Math.random() > status[k] + intB) continue;
        if (k === 'burn') t.st.burn = { t: 3, dps: t.maxHp * 0.022 };
        else if (k === 'slow') t.st.slow = { t: 2 };
        else if (k === 'stun') {
          if (t.stunImm > 0) continue;
          t.st.stun = { t: (t.boss ? 0.45 : 0.85) };
          this.cancelCast(t);
          t.channel = null;
          this.text(t.x, t.y - t.r - 30, 'しびれた！', '#fff36b', 14);
        } else if (k === 'charm') t.st.charm = { t: 5 };
        else if (k === 'weak') t.st.weak = { t: 5 };
      }
    }
    ko(t) {
      t.dead = true;
      t.cast = null;
      t.channel = null;
      this.sparks(t.x, t.y, '#ffffff', 22);
      this.emit('ko', { f: t });
      if (this.pvp) {
        if (t.local && this.net) this.net.sendKo();
        return;
      }
      this.slowmo = 0.9;
      const sideAlive = (s) => this.fighters.some((f) => f.side === s && !f.dead);
      if (!sideAlive('A')) this.finish('B');
      else if (!sideAlive('B')) this.finish('A');
    }
    finish(winner) {
      if (this.over) return;
      this.over = true;
      this.result = { winner };
      this.emit('end', { winner });
    }
    checkPhase(f) {
      if (!f.phases) return;
      const ratio = f.hp / f.maxHp;
      for (const ph of f.phases) {
        if (ph.done || ratio > ph.at) continue;
        ph.done = true;
        f.phaseCdMul *= ph.cdMul || 1;
        f.invul = 0.9;
        this.cancelCast(f);
        if (ph.say) this.emit('say', { f, text: ph.say });
        if (ph.add) {
          ph.add.forEach((id) => {
            if (!f.moves.some((m) => m.id === id) && HG.MOVES[id]) f.moves.push({ id, def: HG.MOVES[id], cd: 1.5 });
          });
        }
        if (ph.summon) this.emit('summon', { f, list: ph.summon });
        if (ph.dim) this.dimTarget = 0.55;
        // しょうげきは
        this.attacks.push({ id: this.seq++, nid: f.id + ':ph', owner: f, side: f.side, def: { type: f.type, knock: 260, power: 0 }, power: 0, kind: 'push', x: f.x, y: f.y, r: 170, age: 0, delay: 0, life: 0.2, hit: new Set(), dodged: new Set() });
        this.shake = 12;
        this.emit('sfx', { s: 'boom' });
      }
    }

    // ── こまかい えんしゅつ ──
    text(x, y, s, col, size) {
      this.texts.push({ x, y, s, col: col || '#fff', size: size || 16, t: 0, life: 0.9 });
    }
    sparks(x, y, col, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = 120 + Math.random() * 220;
        this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.25, t: 0, col, r: 2.5 + Math.random() * 2.5 });
      }
    }
    puff(x, y, col) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 80;
        this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, t: 0, col, r: 5 + Math.random() * 4, soft: true });
      }
    }

    // ── 1コマ ──
    step(dt) {
      this.time += dt;
      this.texts.forEach((t) => (t.t += dt));
      this.texts = this.texts.filter((t) => t.t < t.life);
      this.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
      this.parts = this.parts.filter((p) => p.t < p.life);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2);
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; }
      for (const f of this.fighters) this.updateFighter(f, dt);
      this.separate();
      for (const a of this.attacks) this.updateAttack(a, dt);
      this.attacks = this.attacks.filter((a) => !a.dead);
      if (this.timeLimit && !this.over && this.time >= this.timeLimit) this.emit('timeup', {});
    }

    updateFighter(f, dt) {
      f.anim += dt;
      f.hitFlash = Math.max(0, f.hitFlash - dt);
      if (f.dead) return;
      f.iframe = Math.max(0, f.iframe - dt);
      f.invul = Math.max(0, f.invul - dt);
      f.stunImm = Math.max(0, f.stunImm - dt);
      // じょうたい
      for (const k in f.st) {
        const s = f.st[k];
        s.t -= dt;
        if (k === 'burn' && !f.remote) {
          f.hp = Math.max(1, f.hp - s.dps * dt);
          s.tick = (s.tick || 0) + dt;
          if (s.tick > 0.5) { s.tick = 0; this.parts.push({ x: f.x + U.rand(-10, 10), y: f.y - 10, vx: 0, vy: -50, life: 0.5, t: 0, col: '#ff7a2e', r: 4 }); }
        }
        if (k === 'regen' && !f.remote) f.hp = Math.min(f.maxHp, f.hp + s.rate * dt);
        if (s.t <= 0) {
          delete f.st[k];
          if (k === 'stun') f.stunImm = 2;
        }
      }
      for (const m of f.moves) m.cd = Math.max(0, m.cd - dt);
      f.dodge.cd = Math.max(0, f.dodge.cd - dt);
      if (f.burst > 0) f.burst = Math.max(0, f.burst - dt);
      if (f.canBurst && f.burst <= 0) f.gauge = Math.min(100, f.gauge + dt * 1.2);
      if (f.usingItem > 0) {
        f.usingItem -= dt;
        if (f.usingItem <= 0) {
          this.heal(f, f.maxHp * 0.35);
          this.emit('sfx', { s: 'heal' });
        }
      }

      if (f.remote) { this.remoteMove(f, dt); return; }

      // コントローラー
      if (f.ctrl === 'ai' && f.ai) HG.AI.think(this, f, dt);
      const it = f.intent;

      // バースト・どうぐ
      if (it.burst) {
        it.burst = false;
        if (f.canBurst && f.gauge >= 100 && f.burst <= 0) {
          f.burst = 10;
          f.gauge = 0;
          this.text(f.x, f.y - f.r - 40, 'きずなバースト！', '#ff9fc8', 20);
          this.sparks(f.x, f.y, '#ff9fc8', 24);
          this.emit('burst', { f });
        }
      }
      if (it.item) {
        it.item = false;
        if (f.potions > 0 && f.potionUsed < 2 && this.canAct(f) && f.hp < f.maxHp) {
          f.potions--;
          f.potionUsed++;
          f.usingItem = 0.6;
          this.text(f.x, f.y - f.r - 30, 'きずぐすり！', '#7dffb0', 15);
          this.emit('item', { f });
        }
      }
      // かいひ
      if (it.dodge) {
        it.dodge = false;
        if (f.dodge.cd <= 0 && !f.st.stun && !f.dash && !f.leap && f.usingItem <= 0 && !this.over) {
          if (f.cast && !f.cast.done) this.cancelCast(f);
          f.channel = null;
          let dx = it.mx, dy = it.my;
          if (Math.hypot(dx, dy) < 0.2) {
            const t = this.targetOf(f);
            const a = t ? Math.atan2(f.y - t.y, f.x - t.x) + (Math.random() < 0.5 ? 0.9 : -0.9) : f.face + Math.PI;
            dx = Math.cos(a); dy = Math.sin(a);
          }
          const l = Math.hypot(dx, dy) || 1;
          f.dodge.t = 0.22;
          f.dodge.dx = dx / l;
          f.dodge.dy = dy / l;
          f.dodge.cd = Math.max(0.55, 1.15 - f.stats.spd / 250);
          f.iframe = Math.max(f.iframe, 0.27);
          this.emit('dodge', { f });
          this.emit('sfx', { s: 'dodge' });
        }
      }
      // わざ
      if (it.move >= 0) {
        const s = it.move;
        it.move = -1;
        this.startCast(f, s);
      }
      // キャスト
      if (f.cast) {
        const c = f.cast;
        if (f.st.stun) this.cancelCast(f);
        else if (!c.done) {
          c.t += dt;
          if (c.t >= c.wind) this.execCast(f);
        } else {
          c.rec -= dt;
          if (c.rec <= 0 && !f.channel) f.cast = null;
        }
      }
      if (f.channel) {
        f.channel.t += dt;
        if (f.channel.t >= f.channel.dur || f.st.stun) { f.channel = null; f.cast = null; }
      }
      // いどう
      let vx = 0, vy = 0;
      if (f.dodge.t > 0) {
        f.dodge.t -= dt;
        const sp = 130 / 0.22;
        vx = f.dodge.dx * sp;
        vy = f.dodge.dy * sp;
      } else if (f.dash) {
        const d = f.dash;
        d.t += dt;
        vx = d.vx; vy = d.vy;
        if (d.iframe) f.iframe = Math.max(f.iframe, 0.05);
        if (d.trail) {
          d.trailT -= dt;
          if (d.trailT <= 0) {
            d.trailT = 0.07;
            this.attacks.push({ id: this.seq++, nid: f.id + ':tr' + this.seq, owner: f, side: f.side, def: { type: 'fire', power: 8, status: { burn: 0.1 }, knock: 0 }, power: 8, atkMul: this.atkMul(f), stats: f.stats, level: f.level, ftype: f.type, kind: 'zone', x: f.x, y: f.y, r: 22, age: 0, delay: 0, life: 1.6, tick: 0.4, ticking: true, hit: new Set(), dodged: new Set(), tickT: 0, trail: true });
          }
        }
        if (d.t >= d.dur) f.dash = null;
      } else if (f.leap) {
        const l = f.leap;
        l.t += dt;
        const k = Math.min(1, l.t / l.dur);
        f.x = l.x0 + (l.x1 - l.x0) * k;
        f.y = l.y0 + (l.y1 - l.y0) * k;
        f.iframe = Math.max(f.iframe, 0.05);
        f.z = Math.sin(k * Math.PI) * 60;
        if (k >= 1) { f.leap = null; f.z = 0; this.shake = Math.max(this.shake, 6); }
      } else if (!f.st.stun && f.usingItem <= 0 && !(f.cast && !f.cast.done && !f.cast.def.mobile) && !f.channel && !this.over) {
        const l = Math.hypot(it.mx, it.my);
        if (l > 0.05) {
          const s = this.speedOf(f) * Math.min(1, l);
          vx = (it.mx / l) * s;
          vy = (it.my / l) * s;
          f.face = Math.atan2(vy, vx);
        }
      }
      f.vx += (vx - f.vx) * Math.min(1, dt * (f.dodge.t > 0 || f.dash ? 30 : 14));
      f.vy += (vy - f.vy) * Math.min(1, dt * (f.dodge.t > 0 || f.dash ? 30 : 14));
      if (!f.leap) {
        f.x += (f.vx + f.kx) * dt;
        f.y += (f.vy + f.ky) * dt;
      }
      f.kx *= Math.pow(0.0005, dt);
      f.ky *= Math.pow(0.0005, dt);
      if (f.cast) f.face = f.cast.dir;
      const cf = Math.cos(f.face);
      if (cf < -0.15) f.flip = -1;
      else if (cf > 0.15) f.flip = 1;
      this.bound(f);
      if (f.boss && !f.dead) this.checkPhase(f);
    }
    bound(f) {
      f.x = U.clamp(f.x, f.r, W - f.r);
      f.y = U.clamp(f.y, f.r, H - f.r);
      for (const o of this.obstacles) {
        const d = U.dist(f.x, f.y, o.x, o.y);
        const m = f.r + o.r;
        if (d < m && d > 0.01) {
          f.x = o.x + ((f.x - o.x) / d) * m;
          f.y = o.y + ((f.y - o.y) / d) * m;
        }
      }
    }
    separate() {
      const fs = this.fighters.filter((f) => !f.dead && !f.leap);
      for (let i = 0; i < fs.length; i++)
        for (let j = i + 1; j < fs.length; j++) {
          const a = fs[i], b = fs[j];
          const d = U.dist(a.x, a.y, b.x, b.y);
          const m = (a.r + b.r) * 0.8;
          if (d < m && d > 0.01) {
            const push = (m - d) / 2;
            const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
            if (!a.remote) { a.x -= nx * push; a.y -= ny * push; }
            if (!b.remote) { b.x += nx * push; b.y += ny * push; }
          }
        }
    }
    remoteMove(f, dt) {
      // あいての いちを なめらかに
      const now = performance.now() - 110;
      const buf = f.netBuf;
      while (buf.length > 2 && buf[1].at <= now) buf.shift();
      if (buf.length >= 2 && buf[0].at <= now) {
        const a = buf[0], b = buf[1];
        const k = U.clamp((now - a.at) / Math.max(1, b.at - a.at), 0, 1);
        f.x = a.x + (b.x - a.x) * k;
        f.y = a.y + (b.y - a.y) * k;
        f.face = b.face;
      } else if (buf.length) {
        const a = buf[buf.length - 1];
        f.x += (a.x - f.x) * Math.min(1, dt * 10);
        f.y += (a.y - f.y) * Math.min(1, dt * 10);
        f.face = a.face;
      }
      const cf = Math.cos(f.face);
      if (cf < -0.15) f.flip = -1;
      else if (cf > 0.15) f.flip = 1;
      if (f.cast && f.cast.done) {
        f.cast.rec -= dt;
        if (f.cast.rec <= -0.2) f.cast = null;
      } else if (f.cast) {
        f.cast.t += dt;
        if (f.cast.t > f.cast.wind + 1.5) f.cast = null;
      }
    }

    // ── こうげきの うごき ──
    updateAttack(a, dt) {
      if (a.delay > 0) {
        a.delay -= dt;
        if (a.track && a.delay > 0 && a.delay < 0.5 && !a.tracked) {
          // ついせき: おちる すこし まえに いちを きめる
          a.tracked = true;
          const t = a.track;
          if (!t.dead) { a.x = U.clamp(t.x, 10, W - 10); a.y = U.clamp(t.y, 10, H - 10); }
        }
        if (a.follow) { a.x = a.follow.x; a.y = a.follow.y; }
        if (a.delay > 0) return;
        if (a.kind === 'circle' && a.tele) {
          this.emit('sfx', { s: a.def.type === 'elec' ? 'zap' : 'boom' });
          this.shake = Math.max(this.shake, 4);
          this.sparks(a.x, a.y, VFX_COL[a.def.type] || '#fff', 10);
        }
      }
      a.age += dt;
      if (a.follow) {
        if (a.follow.dead) { a.dead = true; return; }
        a.x = a.follow.x;
        a.y = a.follow.y;
        if (a.followDir || a.kind === 'cone') a.dir = a.follow.face;
      }
      const foes = this.fighters.filter((f) => f.side !== a.side && !f.dead);
      switch (a.kind) {
        case 'proj': {
          if (a.homing && a.target && !a.target.dead) {
            const want = Math.atan2(a.target.y - a.y, a.target.x - a.x);
            const cur = Math.atan2(a.vy, a.vx);
            const d = U.clamp(U.angDiff(cur, want), -a.homing * dt, a.homing * dt);
            const sp = Math.hypot(a.vx, a.vy);
            a.vx = Math.cos(cur + d) * sp;
            a.vy = Math.sin(cur + d) * sp;
          }
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          if (a.x < -30 || a.x > W + 30 || a.y < -30 || a.y > H + 30) { a.dead = true; return; }
          for (const o of this.obstacles) if (U.dist(a.x, a.y, o.x, o.y) < o.r + a.r * 0.5) { a.dead = true; this.sparks(a.x, a.y, '#ffffff', 5); return; }
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            if (U.dist(a.x, a.y, t.x, t.y) < a.r + t.r * 0.82) {
              const r = this.applyHit(a, t);
              if (r) { a.hit.add(t.id); if (!a.def.pierce) { a.dead = true; return; } }
            }
          }
          break;
        }
        case 'arc':
        case 'cone': {
          const tickNow = a.ticking ? this.tickReady(a, dt) : true;
          for (const t of foes) {
            if (!a.ticking && a.hit.has(t.id)) continue;
            if (!tickNow) continue;
            const d = U.dist(a.x, a.y, t.x, t.y);
            if (d > a.range + t.r * 0.7) continue;
            const ang = Math.atan2(t.y - a.y, t.x - a.x);
            const tol = Math.atan2(t.r, Math.max(1, d));
            if (Math.abs(U.angDiff(a.dir, ang)) > a.arc / 2 + tol) continue;
            const r = this.applyHit(a, t);
            if (r || t.iframe > 0) a.hit.add(t.id);
          }
          break;
        }
        case 'rect':
        case 'beam': {
          if (a.kind === 'beam' && a.age > 0.12) break;
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            const dx = t.x - a.x, dy = t.y - a.y;
            const along = dx * Math.cos(a.dir) + dy * Math.sin(a.dir);
            const perp = Math.abs(-dx * Math.sin(a.dir) + dy * Math.cos(a.dir));
            if (along < -t.r || along > a.len + t.r * 0.5) continue;
            if (perp > a.width / 2 + t.r * 0.7) continue;
            const r = this.applyHit(a, t);
            if (r || t.iframe > 0) a.hit.add(t.id);
          }
          break;
        }
        case 'body': {
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            if (U.dist(a.x, a.y, t.x, t.y) < a.r + t.r * 0.8) {
              const r = this.applyHit(a, t);
              if (r || t.iframe > 0) a.hit.add(t.id);
            }
          }
          break;
        }
        case 'circle':
        case 'push': {
          if (a.age > dt * 1.5 + 0.001 && a.checked) break;
          a.checked = true;
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            if (U.dist(a.x, a.y, t.x, t.y) < a.r + t.r * 0.75) {
              if (a.kind === 'push') {
                const ang = Math.atan2(t.y - a.y, t.x - a.x);
                t.kx += Math.cos(ang) * 700;
                t.ky += Math.sin(ang) * 700;
                a.hit.add(t.id);
                continue;
              }
              const r = this.applyHit(a, t);
              if (r || t.iframe > 0) a.hit.add(t.id);
            }
          }
          break;
        }
        case 'wave': {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            const dx = t.x - a.x, dy = t.y - a.y;
            const along = Math.abs(dx * Math.cos(a.dir) + dy * Math.sin(a.dir));
            const perp = Math.abs(-dx * Math.sin(a.dir) + dy * Math.cos(a.dir));
            if (along < a.thick / 2 + t.r * 0.7 && perp < a.width / 2 + t.r * 0.5) {
              const r = this.applyHit(a, t);
              if (r || t.iframe > 0) a.hit.add(t.id);
            }
          }
          break;
        }
        case 'ring': {
          const k = Math.min(1, a.age / a.dur);
          const prev = a.rCur;
          a.rCur = a.r0 + (a.r1 - a.r0) * (1 - Math.pow(1 - k, 2));
          for (const t of foes) {
            if (a.hit.has(t.id)) continue;
            const d = U.dist(a.x, a.y, t.x, t.y);
            if (d + t.r * 0.6 >= prev - a.thick / 2 && d - t.r * 0.6 <= a.rCur + a.thick / 2) {
              const r = this.applyHit(a, t);
              if (r || t.iframe > 0) a.hit.add(t.id);
            }
          }
          break;
        }
        case 'zone': {
          const tickNow = this.tickReady(a, dt);
          for (const t of foes) {
            const d = U.dist(a.x, a.y, t.x, t.y);
            if (d > a.r + t.r * 0.6) continue;
            if (a.pull && !(this.pvp && t.remote) && d > 8) {
              t.kx += ((a.x - t.x) / d) * a.pull * dt * 6;
              t.ky += ((a.y - t.y) / d) * a.pull * dt * 6;
            }
            if (tickNow) this.applyHit(a, t);
          }
          if (a.age >= a.life && a.burstPower) {
            for (const t of foes) if (U.dist(a.x, a.y, t.x, t.y) < a.r + t.r * 0.6) this.applyHit(a, t, a.burstPower);
            this.sparks(a.x, a.y, '#9a6bff', 24);
            this.shake = 10;
            this.emit('sfx', { s: 'boom' });
          }
          break;
        }
        case 'trap': {
          if (a.age < a.arm) break;
          for (const t of foes) {
            if (U.dist(a.x, a.y, t.x, t.y) < a.r + t.r * 0.7) {
              this.attacks.push(Object.assign({}, a, { id: this.seq++, nid: a.nid + 'x', kind: 'circle', r: a.blastR, age: 0, life: 0.15, hit: new Set(), dodged: new Set(), checked: false, tele: false }));
              this.sparks(a.x, a.y, '#c9a8ff', 16);
              this.emit('sfx', { s: 'boom' });
              a.dead = true;
              return;
            }
          }
          break;
        }
      }
      if (a.age >= a.life) a.dead = true;
    }
    tickReady(a, dt) {
      a.tickT -= dt;
      if (a.tickT <= 0) { a.tickT += a.tick || 0.3; return true; }
      return false;
    }
  }
  HG.Battle = Battle;
  HG.Battle.W = W;
  HG.Battle.H = H;
  HG.VFX_COL = VFX_COL;

  // ───────── AI ─────────
  const AI = (HG.AI = {});
  AI.preset = function (lv, boss) {
    // lv: 0〜9（ストーリーの しょう）
    lv = U.clamp(lv, 0, 9);
    const p = {
      dodge: [0.0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.46, 0.52, 0.58, 0.64][lv],
      react: [0.9, 0.62, 0.55, 0.48, 0.42, 0.38, 0.34, 0.31, 0.28, 0.25][lv],
      windMul: [1.6, 1.4, 1.3, 1.2, 1.12, 1.06, 1.02, 1.0, 1.0, 1.0][lv],
      aggro: [0.5, 0.55, 0.6, 0.65, 0.7, 0.72, 0.75, 0.78, 0.8, 0.85][lv],
    };
    if (boss) { p.windMul *= 1.25; p.react *= 1.25; p.dodge *= 0.6; }
    return p;
  };
  function prefRange(f) {
    let melee = 0, ranged = 0;
    f.moves.forEach((m) => {
      const k = m.def.kind;
      if (k === 'melee' || k === 'dash' || k === 'aoe_self' || k === 'blink' || k === 'line' || k === 'aura' || k === 'cone') melee++;
      else if (k !== 'buff' && k !== 'heal' && k !== 'teleport') ranged++;
    });
    return melee > ranged ? 70 : melee === ranged ? 150 : 230;
  }
  function moveRange(def) {
    switch (def.kind) {
      case 'melee': return (def.range || 70) + 20;
      case 'line': return def.len;
      case 'dash': return def.dist + 30;
      case 'leap': return def.dist;
      case 'aoe_self': return def.radius * 0.85;
      case 'aura': return def.radius * 0.9;
      case 'cone': return def.range * 0.9;
      case 'blink': return def.range || 360;
      case 'ring': return def.r1 * 0.85;
      case 'proj': return (def.range || 400) * 0.85;
      case 'radial': return (def.range || 400) * 0.6;
      case 'beam': case 'beams': return def.len * 0.9;
      case 'wave': return def.range * 0.9;
      case 'aoe_target': case 'zone': return (def.maxRange || 380) + 40;
      case 'trap': return 160;
      default: return 9999;
    }
  }
  AI.think = function (b, f, dt) {
    const ai = f.ai;
    if (!ai.init) {
      ai.init = true;
      ai.thinkT = 0;
      ai.atkT = 0.6 + Math.random() * 0.6;
      ai.strafe = Math.random() < 0.5 ? 1 : -1;
      ai.strafeT = 1.5;
      ai.seen = new Set();
      ai.pref = prefRange(f);
      ai.mx = 0;
      ai.my = 0;
    }
    const it = f.intent;
    const t = b.targetOf(f);
    if (!t || b.over) { it.mx = it.my = 0; return; }
    if (f.canBurst && f.gauge >= 100 && f.burst <= 0) it.burst = true;
    if (f.potions > 0 && f.potionUsed < 2 && f.hp / f.maxHp < 0.35 && b.canAct(f)) it.item = true;
    ai.thinkT -= dt;
    ai.atkT -= dt;
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafeT = 1.2 + Math.random() * 2; if (Math.random() < 0.6) ai.strafe *= -1; }
    if (ai.pending && b.time >= ai.pending.at) {
      it.mx = ai.pending.dx;
      it.my = ai.pending.dy;
      it.dodge = true;
      ai.pending = null;
      return;
    }
    if (ai.thinkT > 0) { it.mx = ai.mx; it.my = ai.my; return; }
    ai.thinkT = 0.1;
    const d = U.dist(f.x, f.y, t.x, t.y);
    const tx = (t.x - f.x) / (d || 1), ty = (t.y - f.y) / (d || 1);
    // きけんを さける
    const th = AI.threat(b, f);
    let evade = null;
    if (th) {
      if (!ai.seen.has(th.key)) {
        ai.seen.add(th.key);
        const r = Math.random();
        if (r < ai.dodge && f.dodge.cd <= 0) ai.pending = { at: b.time + Math.min(ai.react * 0.6, Math.max(0, th.time - 0.18)), dx: th.ax, dy: th.ay };
        else if (r < ai.dodge + 0.3) ai.evadeT = 0.45;
      }
      if (ai.evadeT > 0) evade = th;
    }
    ai.evadeT = Math.max(0, (ai.evadeT || 0) - 0.1);
    // うごき
    let mx = 0, my = 0;
    if (evade) { mx = evade.ax; my = evade.ay; }
    else {
      const radial = d > ai.pref + 40 ? 1 : d < ai.pref - 40 ? -0.8 : 0;
      mx = tx * radial + -ty * ai.strafe * 0.75;
      my = ty * radial + tx * ai.strafe * 0.75;
      // かべ
      const m = 70;
      if (f.x < m) mx += 1;
      if (f.x > W - m) mx -= 1;
      if (f.y < m) my += 1;
      if (f.y > H - m) my -= 1;
      for (const o of b.obstacles) {
        const od = U.dist(f.x, f.y, o.x, o.y);
        if (od < o.r + f.r + 40) { mx += (f.x - o.x) / od; my += (f.y - o.y) / od; }
      }
      // なかまと はなれる
      for (const o of b.fighters) if (o !== f && o.side === f.side && !o.dead) {
        const od = U.dist(f.x, f.y, o.x, o.y);
        if (od < 90 && od > 0) { mx += ((f.x - o.x) / od) * 0.8; my += ((f.y - o.y) / od) * 0.8; }
      }
      if (f.tame) { mx *= 0.6; my *= 0.6; }
    }
    const l = Math.hypot(mx, my);
    ai.mx = l > 0.05 ? mx / Math.max(1, l) : 0;
    ai.my = l > 0.05 ? my / Math.max(1, l) : 0;
    it.mx = ai.mx;
    it.my = ai.my;
    // こうげき
    if (ai.atkT <= 0 && b.canAct(f) && !evade) {
      const opts = [];
      f.moves.forEach((m, i) => {
        if (m.cd > 0) return;
        const def = m.def;
        if (def.kind === 'heal' || (def.kind === 'buff' && (def.buff === 'regen' || def.buff === 'cheer'))) {
          if (f.hp / f.maxHp < 0.5) opts.push([i, 3]);
          return;
        }
        if (def.kind === 'buff' || def.kind === 'teleport') {
          if (def.kind === 'teleport' && d < 120) opts.push([i, 1.5]);
          else if (def.kind === 'buff' && Math.random() < 0.3) opts.push([i, 0.6]);
          return;
        }
        if (d <= moveRange(def)) {
          const w = (def.power || 30) / 40 * HG.typeEff(def.type, t.type) * (def.boss ? 1.4 : 1);
          opts.push([i, w]);
        }
      });
      if (opts.length) {
        let sum = opts.reduce((s, o) => s + o[1], 0), r = Math.random() * sum;
        let pick = opts[0][0];
        for (const o of opts) { r -= o[1]; if (r <= 0) { pick = o[0]; break; } }
        it.move = pick;
        ai.atkT = ai.react * (0.7 + Math.random() * (1.6 - ai.aggro));
      } else ai.atkT = 0.2;
    }
  };
  // いちばん あぶない こうげき
  AI.threat = function (b, f) {
    let best = null;
    const consider = (key, time, ax, ay) => {
      if (time < 0 || time > 0.9) return;
      if (!best || time < best.time) {
        const l = Math.hypot(ax, ay) || 1;
        best = { key, time, ax: ax / l, ay: ay / l };
      }
    };
    for (const a of b.attacks) {
      if (a.side === f.side) continue;
      if (a.kind === 'proj') {
        const rx = f.x - a.x, ry = f.y - a.y;
        const vv = a.vx * a.vx + a.vy * a.vy;
        const tc = (rx * a.vx + ry * a.vy) / vv;
        if (tc < 0) continue;
        const cx = a.x + a.vx * tc - f.x, cy = a.y + a.vy * tc - f.y;
        if (Math.hypot(cx, cy) < a.r + f.r + 14) {
          const s = -a.vy * rx + a.vx * ry > 0 ? 1 : -1;
          consider('p' + a.id, tc, -a.vy * s, a.vx * s);
        }
      } else if ((a.kind === 'circle' || a.kind === 'zone') && a.delay > 0) {
        const d = U.dist(f.x, f.y, a.x, a.y);
        if (d < a.r + f.r + 6) consider('c' + a.id, a.delay, f.x - a.x || 1, f.y - a.y);
      } else if (a.kind === 'ring') {
        const d = U.dist(f.x, f.y, a.x, a.y);
        if (d > (a.rCur || 0) && d < a.r1 + f.r) {
          const sp = (a.r1 - a.r0) / a.dur;
          consider('r' + a.id, (d - (a.rCur || 0)) / sp, f.x - a.x || 1, f.y - a.y);
        }
      } else if (a.kind === 'wave') {
        const rx = f.x - a.x, ry = f.y - a.y;
        const along = rx * Math.cos(a.dir) + ry * Math.sin(a.dir);
        const perp = Math.abs(-rx * Math.sin(a.dir) + ry * Math.cos(a.dir));
        if (along > 0 && perp < a.width / 2 + f.r) consider('w' + a.id, along / Math.hypot(a.vx, a.vy), -Math.sin(a.dir), Math.cos(a.dir));
      }
    }
    for (const o of b.fighters) {
      if (o.side === f.side || o.dead || !o.cast || o.cast.done) continue;
      const c = o.cast, def = c.def, left = c.wind - c.t;
      const d = U.dist(f.x, f.y, o.x, o.y);
      if (def.kind === 'aoe_self' && d < def.radius + f.r) consider('s' + c.cid, left, f.x - o.x || 1, f.y - o.y);
      else if (def.kind === 'beam' || def.kind === 'beams') {
        const rx = f.x - o.x, ry = f.y - o.y;
        const along = rx * Math.cos(c.dir) + ry * Math.sin(c.dir);
        const perp = -rx * Math.sin(c.dir) + ry * Math.cos(c.dir);
        if (along > 0 && Math.abs(perp) < (def.width / 2 + f.r) * (def.kind === 'beams' ? 3 : 1)) consider('b' + c.cid, left, -Math.sin(c.dir) * Math.sign(perp || 1), Math.cos(c.dir) * Math.sign(perp || 1));
      } else if ((def.kind === 'melee' || def.kind === 'dash' || def.kind === 'line' || def.kind === 'leap') && d < moveRange(def) + 20) {
        consider('m' + c.cid, left, -(o.y - f.y), o.x - f.x);
      } else if (def.kind === 'blink' && d < (def.range || 360)) {
        consider('k' + c.cid, left + 0.05, -(o.y - f.y), o.x - f.x);
      } else if (def.kind === 'ring' && d < def.r1) consider('g' + c.cid, left + 0.1, f.x - o.x || 1, f.y - o.y);
    }
    return best;
  };

  // ───────── びょうが ─────────
  class Renderer {
    constructor(canvas, battle, opts) {
      this.c = canvas;
      this.g = canvas.getContext('2d');
      this.b = battle;
      this.localSide = (opts && opts.localSide) || 'A';
      this.bg = null;
      this.fit();
    }
    fit() {
      const r = this.c.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cw = r.width;
      this.ch = r.height;
      this.c.width = Math.max(10, Math.round(r.width * dpr));
      this.c.height = Math.max(10, Math.round(r.height * dpr));
      this.dpr = dpr;
      this.scale = Math.min(r.width / W, r.height / H);
      this.k = 1 / this.scale;
      this.ox = (r.width - W * this.scale) / 2;
      this.oy = (r.height - H * this.scale) / 2;
    }
    toWorld(px, py) {
      return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
    }
    buildBg() {
      const a = this.b.arena;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = a.ground;
      g.fillRect(0, 0, W, H);
      const rng = U.mulberry32(U.hashStr(this.b.arenaKey));
      const deco = a.deco;
      if (deco === 'street' || deco === 'school' || deco === 'stadium' || deco === 'dream') {
        const sz = deco === 'school' ? 60 : 50;
        for (let y = 0; y < H; y += sz) for (let x = 0; x < W; x += sz) if (((x + y) / sz) % 2 === 0) { g.fillStyle = a.ground2; g.fillRect(x, y, sz, sz); }
      } else {
        for (let i = 0; i < 160; i++) {
          g.fillStyle = a.ground2;
          const x = rng() * W, y = rng() * H;
          if (deco === 'beach' || deco === 'mountain') { g.beginPath(); g.arc(x, y, 2 + rng() * 4, 0, TAU); g.fill(); }
          else if (deco === 'sky' || deco === 'festival') { g.fillStyle = 'rgba(255,255,255,' + (0.08 + rng() * 0.2) + ')'; g.beginPath(); g.arc(x, y, 1 + rng() * 2, 0, TAU); g.fill(); }
          else { g.fillRect(x, y, 3, 8); g.fillRect(x + 4, y + 2, 3, 6); }
        }
      }
      // ばしょの かざり
      g.lineWidth = 4;
      g.strokeStyle = '#23194a';
      if (deco === 'park' || deco === 'yard') {
        for (let i = 0; i < 10; i++) {
          const x = rng() * W, y = rng() * H;
          g.fillStyle = ['#ffffff', '#ffd23d', '#ff9fc8'][i % 3];
          for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos((k / 5) * TAU) * 5, y + Math.sin((k / 5) * TAU) * 5, 4, 0, TAU); g.fill(); }
          g.fillStyle = '#ffb02e';
          g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
        }
      }
      if (deco === 'river') {
        g.fillStyle = '#6fc3ff';
        g.fillRect(0, H * 0.46, W, 46);
        g.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 12; i++) g.fillRect(rng() * W, H * 0.46 + 8 + rng() * 28, 30, 3);
      }
      if (deco === 'beach') {
        g.fillStyle = '#7fd7ff';
        g.fillRect(0, 0, W, 50);
        g.fillStyle = '#ffffff';
        for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, 50, 20, 0, Math.PI); g.fill(); }
      }
      if (deco === 'festival') {
        for (let i = 0; i < 9; i++) {
          const x = 30 + i * 68;
          g.fillStyle = i % 2 ? '#ff5d5d' : '#ffb02e';
          g.beginPath(); g.ellipse(x, 22, 14, 18, 0, 0, TAU); g.fill(); g.stroke();
        }
      }
      if (deco === 'stadium') {
        g.strokeStyle = 'rgba(255,255,255,.75)';
        g.lineWidth = 5;
        g.strokeRect(14, 14, W - 28, H - 28);
        g.beginPath(); g.moveTo(14, H / 2); g.lineTo(W - 14, H / 2); g.stroke();
        g.beginPath(); g.arc(W / 2, H / 2, 70, 0, TAU); g.stroke();
      }
      // しょうがいぶつ
      this.b.obstacles.forEach((o) => {
        g.fillStyle = 'rgba(35,25,74,.2)';
        g.beginPath(); g.ellipse(o.x, o.y + o.r * 0.6, o.r * 1.05, o.r * 0.45, 0, 0, TAU); g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#23194a';
        if (deco === 'park' || deco === 'river') {
          g.fillStyle = '#9a6a3f';
          g.fillRect(o.x - o.r * 0.22, o.y - o.r * 0.1, o.r * 0.44, o.r * 0.75);
          g.strokeRect(o.x - o.r * 0.22, o.y - o.r * 0.1, o.r * 0.44, o.r * 0.75);
          g.fillStyle = '#3fae55';
          [[-0.55, -0.35, 0.7], [0.55, -0.35, 0.7], [0, -0.8, 0.8], [0, -0.2, 0.75]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(o.x + dx * o.r, o.y + dy * o.r, rr * o.r, 0, TAU); g.fill(); g.stroke(); });
          g.fillStyle = '#3fae55';
          [[-0.55, -0.35, 0.62], [0.55, -0.35, 0.62], [0, -0.8, 0.72], [0, -0.2, 0.67]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(o.x + dx * o.r, o.y + dy * o.r, rr * o.r, 0, TAU); g.fill(); });
          g.fillStyle = '#6fd078';
          g.beginPath(); g.arc(o.x - o.r * 0.25, o.y - o.r * 0.95, o.r * 0.3, 0, TAU); g.fill();
        } else if (deco === 'beach') {
          g.fillStyle = '#ffffff';
          g.beginPath(); g.arc(o.x, o.y, o.r, Math.PI, TAU); g.fill(); g.stroke();
          g.fillStyle = '#ff5d5d';
          g.beginPath(); g.moveTo(o.x, o.y); g.arc(o.x, o.y, o.r, Math.PI, Math.PI * 1.33); g.fill();
          g.beginPath(); g.moveTo(o.x, o.y); g.arc(o.x, o.y, o.r, Math.PI * 1.66, TAU); g.fill();
        } else {
          g.fillStyle = deco === 'mountain' ? '#8b8a82' : deco === 'street' ? '#ff9f5a' : '#a49ad0';
          g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.beginPath(); g.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.35, 0, TAU); g.fill();
        }
      });
      this.bg = c;
    }
    draw(extra) {
      const b = this.b, g = this.g;
      if (!this.bg) this.buildBg();
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.cw, this.ch);
      g.save();
      const sh = b.shake;
      g.translate(this.ox + (sh ? U.rand(-sh, sh) * 0.5 : 0), this.oy + (sh ? U.rand(-sh, sh) * 0.5 : 0));
      g.scale(this.scale, this.scale);
      g.beginPath();
      g.roundRect ? g.roundRect(0, 0, W, H, 18) : g.rect(0, 0, W, H);
      g.clip();
      g.drawImage(this.bg, 0, 0);
      // じめんの こうげき
      for (const a of b.attacks) this.drawGround(a);
      // ためちゅうの よこく
      for (const f of b.fighters) if (!f.dead && f.cast && !f.cast.done) this.drawTele(f);
      // いきもの
      const fs = b.fighters.slice().sort((p, q) => p.y - q.y);
      for (const f of fs) this.drawFighter(f, extra);
      // そらの こうげき
      for (const a of b.attacks) this.drawAir(a);
      // つぶ
      for (const p of b.parts) {
        const k = 1 - p.t / p.life;
        g.globalAlpha = p.soft ? k * 0.5 : k;
        g.fillStyle = p.col;
        g.beginPath(); g.arc(p.x, p.y, p.r * (p.soft ? 1 + (1 - k) : 1), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // くらやみ
      if (b.dim > 0.02) {
        g.fillStyle = 'rgba(10,4,30,' + b.dim + ')';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'destination-out';
        for (const f of b.fighters) if (!f.dead) {
          const rg = g.createRadialGradient(f.x, f.y, 10, f.x, f.y, f.local || f.side === this.localSide ? 150 : 90);
          rg.addColorStop(0, 'rgba(0,0,0,' + b.dim + ')');
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = rg;
          g.beginPath(); g.arc(f.x, f.y, 160, 0, TAU); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }
      // もじ
      g.textAlign = 'center';
      for (const t of b.texts) {
        const k = t.t / t.life;
        g.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        g.font = '400 ' + Math.round(t.size * this.k * 0.78) + "px 'Dela Gothic One', 'Hiragino Maru Gothic ProN', sans-serif";
        g.lineWidth = 4 * this.k * 0.8;
        g.strokeStyle = '#23194a';
        const y = t.y - k * 34;
        g.strokeText(t.s, t.x, y);
        g.fillStyle = t.col;
        g.fillText(t.s, t.x, y);
      }
      g.globalAlpha = 1;
      g.restore();
    }
    col(a) {
      const own = a.side === this.localSide;
      return own ? { f: 'rgba(92,197,255,.22)', s: 'rgba(92,197,255,.85)' } : { f: 'rgba(255,59,92,.24)', s: 'rgba(255,59,92,.95)' };
    }
    drawTele(f) {
      const g = this.g, c = f.cast, def = c.def;
      const k = U.clamp(c.t / Math.max(0.01, c.wind), 0, 1);
      const cl = this.col(f);
      g.lineWidth = 3;
      if (def.kind === 'aoe_self') {
        const r = def.radius * (c.plus ? 1.2 : 1);
        g.fillStyle = cl.f; g.strokeStyle = cl.s;
        g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.arc(f.x, f.y, r * k, 0, TAU); g.fill();
      } else if (def.kind === 'beam' || def.kind === 'beams') {
        const n = def.kind === 'beams' ? def.count : 1;
        for (let i = 0; i < n; i++) {
          const off = def.kind === 'beams' ? (i - (n - 1) / 2) * def.gap : 0;
          const x = f.x + Math.cos(c.dir + Math.PI / 2) * off, y = f.y + Math.sin(c.dir + Math.PI / 2) * off;
          g.save();
          g.translate(x, y);
          g.rotate(c.dir);
          g.fillStyle = cl.f;
          g.fillRect(0, (-def.width / 2) * k, def.len, def.width * k);
          g.strokeStyle = cl.s;
          g.setLineDash([10, 8]);
          g.strokeRect(0, -def.width / 2, def.len, def.width);
          g.setLineDash([]);
          g.restore();
        }
      } else if (def.kind === 'ring') {
        g.strokeStyle = cl.s;
        g.setLineDash([6, 8]);
        g.beginPath(); g.arc(f.x, f.y, def.r1 * (c.plus ? 1.2 : 1), 0, TAU); g.stroke();
        g.setLineDash([]);
      } else if (def.kind === 'cone' || def.kind === 'melee' || def.kind === 'line' || def.kind === 'blink') {
        if (c.wind < 0.2 && def.kind !== 'cone') { this.glow(f, k); return; }
        const range = (def.range || def.len || def.reach || 70) * (c.plus ? 1.2 : 1);
        g.fillStyle = cl.f; g.strokeStyle = cl.s;
        g.beginPath();
        if (def.kind === 'line') {
          g.save(); g.translate(f.x, f.y); g.rotate(c.dir); g.fillRect(0, -def.width / 2, range, def.width); g.strokeRect(0, -def.width / 2, range, def.width); g.restore();
        } else {
          const arc = ((def.arc || 90) * Math.PI) / 180;
          g.moveTo(f.x, f.y);
          g.arc(f.x, f.y, range, c.dir - arc / 2, c.dir + arc / 2);
          g.closePath();
          g.fill(); g.stroke();
        }
      } else if (def.kind === 'dash') {
        g.strokeStyle = cl.s;
        g.lineWidth = f.r * 1.2;
        g.globalAlpha = 0.25;
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + Math.cos(c.dir) * def.dist, f.y + Math.sin(c.dir) * def.dist); g.stroke();
        g.globalAlpha = 1;
      } else if (def.kind === 'leap') {
        g.fillStyle = cl.f; g.strokeStyle = cl.s;
        g.beginPath(); g.arc(c.tx, c.ty, def.radius, 0, TAU); g.fill(); g.stroke();
      } else this.glow(f, k);
    }
    glow(f, k) {
      const g = this.g;
      g.strokeStyle = 'rgba(255,255,255,' + (0.4 + k * 0.5) + ')';
      g.lineWidth = 4;
      g.beginPath(); g.arc(f.x, f.y, f.r + 8 + (1 - k) * 14, 0, TAU); g.stroke();
    }
    drawGround(a) {
      const g = this.g;
      const cl = this.col(a);
      const tc = HG.VFX_COL[a.def.type] || '#fff';
      if (a.kind === 'circle' && a.delay > 0 && a.tele) {
        const total = a.def.delay || a.def.air || 0.6;
        const k = 1 - U.clamp(a.delay / total, 0, 1);
        g.fillStyle = cl.f; g.strokeStyle = cl.s; g.lineWidth = 3;
        g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.arc(a.x, a.y, a.r * k, 0, TAU); g.fill();
      } else if (a.kind === 'circle' && a.delay <= 0) {
        const k = a.age / a.life;
        g.globalAlpha = 1 - k;
        g.fillStyle = tc;
        g.beginPath(); g.arc(a.x, a.y, a.r * (0.7 + k * 0.4), 0, TAU); g.fill();
        g.globalAlpha = 1;
      } else if (a.kind === 'zone') {
        if (a.delay > 0) {
          g.fillStyle = cl.f; g.strokeStyle = cl.s; g.lineWidth = 3;
          g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.fill(); g.stroke();
          return;
        }
        const k = a.age / a.life;
        g.globalAlpha = a.trail ? 0.5 * (1 - k) : 0.42;
        g.fillStyle = a.def.vfx === 'cloud' ? '#ffd1e8' : a.def.vfx === 'spore' ? '#b6f08a' : tc;
        g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.fill();
        g.globalAlpha = 0.85;
        g.strokeStyle = a.side === this.localSide ? cl.s : tc;
        g.lineWidth = 3;
        const rot = this.b.time * (a.pull ? 4 : 1.5);
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(a.x, a.y, a.r * (0.35 + i * 0.25), rot + i, rot + i + 2.2); g.stroke(); }
        if (a.burstPower) { g.strokeStyle = cl.s; g.setLineDash([6, 6]); g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.stroke(); g.setLineDash([]); }
        g.globalAlpha = 1;
      } else if (a.kind === 'trap') {
        g.fillStyle = a.age < a.arm ? 'rgba(201,168,255,.4)' : 'rgba(201,168,255,.85)';
        g.strokeStyle = '#23194a';
        g.lineWidth = 3;
        g.beginPath(); g.arc(a.x, a.y, 12 + Math.sin(this.b.time * 6) * 2, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = cl.s;
        g.setLineDash([4, 6]);
        g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.stroke();
        g.setLineDash([]);
      }
    }
    drawAir(a) {
      const g = this.g;
      const tc = HG.VFX_COL[a.def.type] || '#fff';
      if (a.delay > 0) return;
      if (a.kind === 'proj') {
        const v = a.def.vfx;
        g.save();
        g.translate(a.x, a.y);
        g.rotate(Math.atan2(a.vy, a.vx));
        g.lineWidth = 3;
        g.strokeStyle = '#23194a';
        if (v === 'leaf' || v === 'feather') {
          g.fillStyle = v === 'leaf' ? '#5fd36a' : '#ffffff';
          g.beginPath(); g.ellipse(0, 0, a.r * 1.5, a.r * 0.7, 0, 0, TAU); g.fill(); g.stroke();
        } else if (v === 'bubble') {
          g.fillStyle = 'rgba(160,220,255,.6)';
          g.beginPath(); g.arc(0, 0, a.r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(-a.r * 0.35, -a.r * 0.35, a.r * 0.25, 0, TAU); g.fill();
        } else if (v === 'ball') {
          g.fillStyle = '#ffffff';
          g.beginPath(); g.arc(0, 0, a.r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = '#23194a';
          g.beginPath(); g.arc(0, 0, a.r * 0.38, 0, TAU); g.fill();
        } else if (v === 'ball2') {
          g.fillStyle = a.def.type === 'light' ? '#ffd23d' : '#ffffff';
          g.beginPath(); g.arc(0, 0, a.r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = '#ff5d5d';
          g.fillRect(-a.r, -2, a.r * 2, 4);
        } else if (v === 'note') {
          g.fillStyle = '#c9b8ff';
          g.beginPath(); g.ellipse(0, a.r * 0.3, a.r * 0.8, a.r * 0.6, -0.4, 0, TAU); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(a.r * 0.6, a.r * 0.1); g.lineTo(a.r * 0.6, -a.r * 1.4); g.stroke();
        } else {
          // ふつうの たま + しっぽ
          g.globalAlpha = 0.5;
          g.fillStyle = tc;
          g.beginPath(); g.ellipse(-a.r * 1.2, 0, a.r * 1.6, a.r * 0.7, 0, 0, TAU); g.fill();
          g.globalAlpha = 1;
          g.fillStyle = tc;
          g.beginPath(); g.arc(0, 0, a.r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.75)';
          g.beginPath(); g.arc(-a.r * 0.3, -a.r * 0.3, a.r * 0.35, 0, TAU); g.fill();
        }
        g.restore();
        if (a.side !== this.localSide) {
          g.strokeStyle = 'rgba(255,59,92,.8)';
          g.lineWidth = 2;
          g.beginPath(); g.arc(a.x, a.y, a.r + 4, 0, TAU); g.stroke();
        }
      } else if (a.kind === 'beam') {
        const k = a.age / a.life;
        g.save();
        g.translate(a.x, a.y);
        g.rotate(a.dir);
        g.globalAlpha = 1 - k * 0.8;
        g.fillStyle = tc;
        g.fillRect(0, -a.width / 2, a.len, a.width);
        g.fillStyle = '#ffffff';
        g.fillRect(0, -a.width / 5, a.len, a.width / 2.5);
        g.restore();
        g.globalAlpha = 1;
      } else if (a.kind === 'arc' || a.kind === 'cone') {
        const k = a.kind === 'cone' ? 0.5 : a.age / a.life;
        g.globalAlpha = a.kind === 'cone' ? 0.55 : 1 - k;
        g.fillStyle = a.kind === 'cone' ? tc : a.def.vfx === 'heart' ? '#ff9fc8' : '#ffffff';
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.arc(a.x, a.y, a.range, a.dir - a.arc / 2, a.dir + a.arc / 2);
        g.closePath();
        g.fill();
        if (a.kind === 'cone') {
          for (let i = 0; i < 4; i++) {
            const ang = a.dir + U.rand(-a.arc / 2, a.arc / 2), d = U.rand(20, a.range);
            g.fillStyle = i % 2 ? '#ffffff' : tc;
            g.beginPath(); g.arc(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, U.rand(4, 9), 0, TAU); g.fill();
          }
        }
        g.globalAlpha = 1;
      } else if (a.kind === 'rect') {
        g.save();
        g.translate(a.x, a.y);
        g.rotate(a.dir);
        g.globalAlpha = 1 - a.age / a.life;
        g.fillStyle = '#5fd36a';
        g.strokeStyle = '#23194a';
        g.lineWidth = 3;
        g.fillRect(0, -a.width / 3, a.len, (a.width * 2) / 3);
        g.strokeRect(0, -a.width / 3, a.len, (a.width * 2) / 3);
        g.restore();
        g.globalAlpha = 1;
      } else if (a.kind === 'wave') {
        g.save();
        g.translate(a.x, a.y);
        g.rotate(a.dir);
        g.fillStyle = tc;
        g.globalAlpha = 0.75;
        g.beginPath();
        g.ellipse(0, 0, a.thick / 2, a.width / 2, 0, -Math.PI / 2, Math.PI / 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.globalAlpha = 0.6;
        g.beginPath();
        g.ellipse(a.thick * 0.15, 0, a.thick / 4, a.width / 2.4, 0, -Math.PI / 2, Math.PI / 2);
        g.fill();
        g.restore();
        g.globalAlpha = 1;
      } else if (a.kind === 'ring') {
        g.strokeStyle = tc;
        g.globalAlpha = 0.85;
        g.lineWidth = a.thick;
        g.beginPath(); g.arc(a.x, a.y, Math.max(1, a.rCur || 1), 0, TAU); g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = a.thick / 3;
        g.beginPath(); g.arc(a.x, a.y, Math.max(1, a.rCur || 1), 0, TAU); g.stroke();
        g.globalAlpha = 1;
      } else if (a.kind === 'body') {
        g.strokeStyle = tc;
        g.globalAlpha = 0.6;
        g.lineWidth = 6;
        g.beginPath(); g.arc(a.x, a.y, a.r, 0, TAU); g.stroke();
        g.globalAlpha = 1;
      }
    }
    drawFighter(f, extra) {
      const g = this.g;
      const z = f.z || 0;
      const size = f.r * (f.boss ? 3.5 : [3.6, 5.0, 4.2, 3.9, 3.8][f.spec.stage || 2] || 3.8);
      // かげ
      g.fillStyle = 'rgba(35,25,74,.22)';
      g.beginPath(); g.ellipse(f.x, f.y + f.r * 0.55, f.r * 1.05, f.r * 0.42, 0, 0, TAU); g.fill();
      if (f.dead) {
        g.globalAlpha = 0.5;
      }
      // ロックオン
      if (extra && extra.lock === f && !f.dead) {
        g.strokeStyle = '#ffd23d';
        g.lineWidth = 3;
        const rr = f.r + 12 + Math.sin(this.b.time * 6) * 2;
        for (let i = 0; i < 4; i++) {
          const a0 = (i / 4) * TAU + this.b.time;
          g.beginPath(); g.arc(f.x, f.y + f.r * 0.2, rr, a0, a0 + 0.8); g.stroke();
        }
      }
      // バースト
      if (f.burst > 0) {
        g.fillStyle = 'rgba(255,159,200,.28)';
        g.beginPath(); g.arc(f.x, f.y, f.r * 1.8 + Math.sin(this.b.time * 10) * 3, 0, TAU); g.fill();
      }
      if (f.st.shield || f.st.barrier || f.st.reflect || f.st.counter) {
        g.strokeStyle = f.st.counter ? '#ffcf33' : f.st.reflect ? '#ff9fc8' : '#9fe8ff';
        g.lineWidth = 4;
        g.globalAlpha = 0.85;
        g.beginPath(); g.arc(f.x, f.y - z, f.r * 1.5, 0, TAU); g.stroke();
        g.globalAlpha = f.dead ? 0.5 : 1;
      }
      const img = f.hitFlash > 0 && f.spriteW ? f.spriteW : f.sprite;
      const bob = f.dead ? 0 : Math.sin(f.anim * 6) * 1.5;
      let sx = 1, sy = 1;
      const moving = Math.hypot(f.vx, f.vy) > 30;
      if (moving && !f.dead) { sy = 1 + Math.sin(f.anim * 16) * 0.05; sx = 2 - sy; }
      if (f.dodge.t > 0) { sx = 1.15; sy = 0.85; }
      if (f.cast && !f.cast.done) { const k = f.cast.t / Math.max(0.01, f.cast.wind); sx = 1 + k * 0.08; sy = 1 - k * 0.08; }
      if (f.st.hidden) g.globalAlpha = 0.25;
      if (f.iframe > 0 && f.dodge.t > 0) g.globalAlpha = 0.55;
      if (img) {
        g.save();
        g.translate(f.x, f.y + f.r * 0.6 - z + bob);
        if (f.dead) g.rotate(f.flip * 1.3);
        g.scale(sx * f.flip, sy);
        g.drawImage(img, -size / 2, -size * 0.92, size, size);
        g.restore();
      } else {
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(f.x, f.y - z, f.r, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // もや
      if (f.mist && !f.dead) {
        for (let i = 0; i < 3; i++) {
          const a = this.b.time * 1.6 + i * 2.1;
          g.fillStyle = 'rgba(70,40,120,.35)';
          g.beginPath(); g.arc(f.x + Math.cos(a) * f.r * 0.9, f.y - f.r * 0.6 + Math.sin(a * 1.3) * f.r * 0.5, f.r * 0.45, 0, TAU); g.fill();
        }
      }
      // じょうたい
      if (!f.dead) {
        let ix = f.x - f.r, iy = f.y - size * 0.95 - 4;
        const icons = [];
        if (f.st.burn) icons.push(['やけど', '#ff7a2e']);
        if (f.st.slow) icons.push(['おそい', '#5cc5ff']);
        if (f.st.stun) icons.push(['しびれ', '#ffd400']);
        if (f.st.charm) icons.push(['こうげき↓', '#ff9fc8']);
        if (f.st.weak) icons.push(['ぼうぎょ↓', '#9a6bff']);
        if (f.st.power) icons.push(['パワー↑', '#ff5d5d']);
        const fk = this.k * 0.8;
        g.font = '700 ' + Math.round(11 * fk) + "px 'Zen Maru Gothic', sans-serif";
        g.textAlign = 'left';
        icons.forEach(([s, c]) => {
          const w = g.measureText(s).width + 8 * fk;
          g.fillStyle = c;
          g.fillRect(ix, iy - 11 * fk, w, 14 * fk);
          g.fillStyle = '#23194a';
          g.fillText(s, ix + 4 * fk, iy);
          ix += w + 3;
        });
        // HPバー（てき）
        if (f.side !== this.localSide && !f.boss) {
          const bw = Math.max(50, f.r * 2.4), bx = f.x - bw / 2, by = f.y + f.r * 0.8 + 8;
          const bh = 5 * this.k * 0.8;
          g.fillStyle = '#23194a';
          g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
          g.fillStyle = '#e8e3d3';
          g.fillRect(bx, by, bw, bh);
          g.fillStyle = f.hp / f.maxHp < 0.3 ? '#ff4d5e' : '#24b46a';
          g.fillRect(bx, by, (bw * f.hp) / f.maxHp, bh);
        }
      }
    }
  }
  HG.BattleRenderer = Renderer;
})(window.HG);
