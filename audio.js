/* ハグクミ audio.js — こうかおん と BGM（その場で おとを つくる） */
'use strict';
(function (HG) {
  const A = (HG.audio = {});
  let ctx = null, master, sfxG, bgmG, noiseBuf;
  A.ready = false;

  A.unlock = function () {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
        sfxG = ctx.createGain();
        sfxG.gain.value = 0.7;
        sfxG.connect(master);
        bgmG = ctx.createGain();
        bgmG.gain.value = 0.22;
        bgmG.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        A.ready = true;
        if (pendingBgm) A.bgm(pendingBgm);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  };
  const soundOn = () => !HG.save || !HG.save.settings || HG.save.settings.sound !== false;
  const bgmOn = () => !HG.save || !HG.save.settings || HG.save.settings.bgm !== false;

  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function freq(n) {
    const m = /^([A-G][#b]?)(\d)$/.exec(n);
    if (!m) return 440;
    const midi = (parseInt(m[2]) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function tone(f, t, dur, type, vol, dest, slideTo, attack) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const a = attack || 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || sfxG);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, type, f0, f1, dest) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type || 'lowpass';
    fl.frequency.setValueAtTime(f0 || 2000, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(dest || sfxG);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  const SFX = {
    tap: (t) => tone(1046, t, 0.05, 'square', 0.12),
    select: (t) => { tone(784, t, 0.05, 'square', 0.1); tone(1175, t + 0.05, 0.06, 'square', 0.1); },
    beep: (t) => { for (let i = 0; i < 3; i++) tone(2093, t + i * 0.13, 0.08, 'square', 0.1); },
    eat: (t) => { for (let i = 0; i < 3; i++) { noise(t + i * 0.16, 0.07, 0.35, 'bandpass', 900); tone(220 - i * 20, t + i * 0.16, 0.06, 'square', 0.08); } },
    clean: (t) => noise(t, 0.4, 0.3, 'bandpass', 400, 4000),
    bath: (t) => { for (let i = 0; i < 5; i++) tone(500 + Math.random() * 400, t + i * 0.09, 0.08, 'sine', 0.2, null, 1400); },
    cure: (t) => [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.07, 0.12, 'triangle', 0.18)),
    happy: (t) => { tone(880, t, 0.08, 'square', 0.12); tone(1318, t + 0.08, 0.12, 'square', 0.12); },
    sad: (t) => tone(660, t, 0.4, 'triangle', 0.18, null, 330),
    scold: (t) => { tone(196, t, 0.12, 'square', 0.15); tone(185, t + 0.14, 0.18, 'square', 0.15); },
    levelup: (t) => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'square', 0.12)),
    evolve: (t) => { tone(220, t, 1.4, 'sawtooth', 0.08, null, 1760, 0.3); [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + 1.3 + i * 0.08, 0.3, 'triangle', 0.16)); },
    hit: (t) => { noise(t, 0.12, 0.5, 'lowpass', 3000, 300); tone(140, t, 0.1, 'square', 0.2, null, 60); },
    bighit: (t) => { noise(t, 0.3, 0.7, 'lowpass', 4000, 150); tone(110, t, 0.25, 'square', 0.25, null, 40); },
    dodge: (t) => noise(t, 0.18, 0.25, 'highpass', 800, 5000),
    shoot: (t) => tone(1400, t, 0.12, 'square', 0.08, null, 300),
    boom: (t) => { noise(t, 0.5, 0.6, 'lowpass', 1200, 80); tone(90, t, 0.35, 'sine', 0.35, null, 30); },
    zap: (t) => { tone(160, t, 0.22, 'sawtooth', 0.12, null, 900); noise(t, 0.2, 0.2, 'highpass', 3000); },
    heal: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.16, 'sine', 0.18)),
    cast: (t) => tone(440, t, 0.14, 'triangle', 0.1, null, 880),
    guard: (t) => { tone(1568, t, 0.12, 'square', 0.1); tone(2093, t + 0.04, 0.12, 'square', 0.08); },
    coin: (t) => { tone(988, t, 0.07, 'square', 0.12); tone(1318, t + 0.07, 0.18, 'square', 0.12); },
    ok: (t) => { tone(1046, t, 0.07, 'square', 0.12); tone(1568, t + 0.07, 0.1, 'square', 0.12); },
    ng: (t) => tone(220, t, 0.25, 'square', 0.14, null, 160),
    win: (t) => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * (i < 4 ? 0.1 : 0.14), i === 6 ? 0.5 : 0.14, 'square', 0.13)),
    lose: (t) => [523, 466, 415, 349].forEach((f, i) => tone(f, t + i * 0.22, 0.3, 'triangle', 0.18)),
    crack: (t) => { noise(t, 0.06, 0.5, 'highpass', 2500); tone(1800, t, 0.03, 'square', 0.1); },
    hatch: (t) => { noise(t, 0.2, 0.5, 'highpass', 1500); [1046, 1318, 1568, 2093, 2637].forEach((f, i) => tone(f, t + 0.15 + i * 0.06, 0.2, 'triangle', 0.15)); },
    countdown: (t) => tone(880, t, 0.12, 'square', 0.12),
    go: (t) => tone(1760, t, 0.3, 'square', 0.12),
    whoosh: (t) => noise(t, 0.35, 0.25, 'bandpass', 300, 3000),
  };
  A.sfx = function (name) {
    if (!ctx || !soundOn()) return;
    const f = SFX[name];
    if (f) try { f(ctx.currentTime + 0.005); } catch (e) {}
  };

  // ───────── BGM ─────────
  // 1マス = 8ぶおんぷ。'-' は のばす、'.' は やすみ
  const TR = {
    home: {
      bpm: 100,
      lead: 'C5 E5 G5 E5 C6 - G5 - A5 G5 E5 C5 D5 - - . F5 A5 C6 A5 G5 - E5 - F5 E5 D5 E5 C5 - - .',
      bass: 'C3 - G2 - C3 - G2 - A2 - E2 - G2 - D3 - F2 - C3 - E2 - C3 - F2 - G2 - C3 - G2 -',
      wave: 'triangle', drums: 'k...h...k...h...k...h...k...h...',
    },
    map: {
      bpm: 116,
      lead: 'G4 B4 D5 G5 F#5 D5 B4 D5 E5 G5 E5 C5 D5 - - . G4 B4 D5 G5 A5 G5 F#5 E5 D5 C5 B4 A4 G4 - - .',
      bass: 'G2 G3 G2 G3 D3 D2 D3 D2 C3 C2 C3 C2 D3 D2 D3 D2 G2 G3 G2 G3 E2 E3 E2 E3 C3 C2 D3 D2 G2 - - .',
      wave: 'square', drums: 'k.h.s.h.k.h.s.hhk.h.s.h.k.h.s.hh',
    },
    battle: {
      bpm: 152,
      lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 E5 D5 C5 B4 C5 D5 E5 A4 C5 E5 A5 B5 A5 G5 E5 F5 G5 A5 G5 E5 - - .',
      bass: 'A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 E2 E2 E3 E2 F2 F2 G2 G2 A2 A2 E2 E2',
      wave: 'square', drums: 'k.hsk.hsk.hsk.hsk.hsk.hsk.hskshs',
    },
    boss: {
      bpm: 162,
      lead: 'D5 F5 A5 D5 C#5 E5 A5 C#5 D5 F5 A5 C6 Bb5 A5 G5 F5 E5 G5 Bb5 E5 D5 F5 A5 D5 C#5 E5 G5 A5 D6 - C#6 -',
      bass: 'D2 D3 D2 D3 A2 A3 A2 A3 D2 D3 D2 D3 Bb2 Bb3 Bb2 Bb3 G2 G3 G2 G3 D2 D3 D2 D3 A2 A3 A2 A3 A2 A2 A2 A2',
      wave: 'sawtooth', drums: 'kshskshskshskshskshskshskshsksks',
    },
    mini: {
      bpm: 132,
      lead: 'C5 C5 G5 - E5 C5 D5 E5 F5 F5 A5 - G5 F5 E5 D5 C5 C5 G5 - E5 G5 C6 B5 A5 F5 G5 B4 C5 - - .',
      bass: 'C3 G2 C3 G2 C3 G2 C3 G2 F2 C3 F2 C3 G2 D3 G2 D3 C3 G2 C3 G2 A2 E3 A2 E3 F2 C3 G2 D3 C3 G2 C3 .',
      wave: 'square', drums: 'k.h.s.h.k.h.s.h.k.h.s.h.k.h.s.hh',
    },
    sad: {
      bpm: 66,
      lead: 'A5 - E5 - C5 - E5 - D5 - - - C5 - B4 - A4 - C5 - E5 - A5 - G5 - - - - - . .',
      bass: 'A2 - - - E3 - - - F2 - - - E2 - - - A2 - - - C3 - - - E2 - - - A2 - - -',
      wave: 'triangle', drums: '',
    },
  };
  function parse(str) {
    const tok = str.trim().split(/\s+/);
    const ev = [];
    for (let i = 0; i < tok.length; i++) {
      const t = tok[i];
      if (t === '-' || t === '.') continue;
      let len = 1;
      while (tok[i + len] === '-') len++;
      ev.push({ step: i, f: freq(t), len });
    }
    return { len: tok.length, ev };
  }
  const parsed = {};
  for (const k in TR) parsed[k] = { lead: parse(TR[k].lead), bass: parse(TR[k].bass) };

  let cur = null, timer = null, pendingBgm = null;
  A.bgm = function (name) {
    pendingBgm = name;
    if (!ctx) return;
    if (cur && cur.name === name) return;
    A.stopBgm(true);
    pendingBgm = name;
    if (!bgmOn() || !TR[name]) return;
    const tr = TR[name];
    const p = parsed[name];
    cur = { name, step: 0, next: ctx.currentTime + 0.08, dur: 60 / tr.bpm / 2, tr, p };
    timer = setInterval(sched, 30);
  };
  A.stopBgm = function (keepPending) {
    if (timer) clearInterval(timer);
    timer = null;
    cur = null;
    if (!keepPending) pendingBgm = null;
  };
  A.refresh = function () {
    const n = pendingBgm;
    A.stopBgm(true);
    if (n && bgmOn()) A.bgm(n);
  };
  function sched() {
    if (!cur || !ctx) return;
    if (ctx.state !== 'running') return;
    const { tr, p } = cur;
    const L = p.lead.len;
    while (cur.next < ctx.currentTime + 0.15) {
      const s = cur.step % L;
      const t = cur.next;
      const le = p.lead.ev.find((e) => e.step === s);
      if (le) tone(le.f, t, le.len * cur.dur * 0.92, tr.wave, 0.16, bgmG, null, 0.01);
      const be = p.bass.ev.find((e) => e.step === s % p.bass.len);
      if (be) tone(be.f, t, be.len * cur.dur * 0.85, 'triangle', 0.3, bgmG, null, 0.005);
      const d = tr.drums && tr.drums[s % tr.drums.length];
      if (d === 'k') tone(150, t, 0.12, 'sine', 0.5, bgmG, 45);
      else if (d === 's') noise(t, 0.1, 0.22, 'highpass', 1500, null, bgmG);
      else if (d === 'h') noise(t, 0.03, 0.08, 'highpass', 6000, null, bgmG);
      cur.next += cur.dur;
      cur.step++;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend && ctx.suspend();
    else ctx.resume && ctx.resume();
  });
})(window.HG);
