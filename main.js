/* ハグクミ main.js — はじまり と まいびょうの しょり */
'use strict';
(function (HG) {
  const P = HG.P, S = HG.screens, U = HG.util, UI = HG.ui;
  let lastSave = 0, lastBeep = 0, hiddenAt = 0;

  // ───────── アプリとして いれる ─────────
  HG.install = { evt: null };
  HG.isApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  // Chrome は 「⋮ → ホーム画面に追加」で おなじ ドメインの べつの アプリを
  // 「インストールずみ」と まちがえる ことが あるので、ゲームの なかに ボタンを だす。
  HG.install.refresh = () => {
    if (HG.state.busy || HG.state.inBattle) return;
    if (document.querySelector('.title')) return S.title();
    S.refreshTop();
    if (HG.state.tab === 'menu' && document.querySelector('.topbar') && !document.querySelector('.back,.full')) S.main('menu');
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    HG.install.evt = e;
    HG.install.refresh();
  });
  window.addEventListener('appinstalled', () => {
    HG.install.evt = null;
    UI.toast('アプリに なったよ！ ホーム画面を みてね');
    HG.install.refresh();
  });
  HG.doInstall = async () => {
    const e = HG.install.evt;
    if (!e) return S.installHelp();
    HG.install.evt = null;
    try {
      await e.prompt();
      const r = await e.userChoice;
      if (r && r.outcome === 'accepted') UI.toast('インストールちゅう… すこし まってね');
    } catch (er) {
      S.installHelp();
    }
    HG.install.refresh();
  };

  function boot() {
    // デバッグ: ?ff=じかん で じかんを すすめる
    if (HG.DEBUG) {
      const ff = parseFloat(new URLSearchParams(location.search).get('ff') || '0');
      const off = parseFloat(HG.store.get('hg_dbg_off') || 0);
      HG.clock.offset = off + ff * 3600e3;
      if (ff) HG.store.set('hg_dbg_off', HG.clock.offset);
    }
    HG.save = P.load();
    const s = HG.save, p = s.pet;
    const now = HG.clock.now();
    let awayEv = null, awayMs = 0, resume = null;
    if (p && p.stage >= 1 && !p.dead) {
      if (p.inBattle) {
        // ストーリーの バトルの とちゅうで とじた → つづきから（にげた ことには しない）
        if (p.inBattle.lethal && p.inBattle.opts) resume = p.inBattle;
        else p.inBattle = null;
      }
      awayMs = now - (p.lastTick || now);
      awayEv = P.simulate(s, now, awayMs < 10 * 60e3);
      if (p.dead) {
        resume = null;
        p.inBattle = null;
      }
    }
    // v1.0.3 で タイプを なおして しまった 子は、やみに もどす
    const undone = (s.migr || 0) < 104 && P.undoRetype(s);
    s.migr = 104;
    P.persist();
    S.render();
    (async () => {
      if (undone) UI.toast('やみタイプに もどしたよ（やみは もう もどらない）');
      if (resume) {
        HG.state.busy = true;
        await UI.modal({ title: 'バトルの つづき', html: `<p>バトルの とちゅうで とじたので、つづきから たたかうよ。HPは とじた ときの まま。</p>`, buttons: [{ label: 'たたかう', cls: 'pink', value: 1 }] });
        HG.state.busy = false;
        if (s.pet && !s.pet.dead) HG.battleUI.start(Object.assign({}, resume.opts, { resume: resume.snap || { me: 1, foes: null, pot: 0 } }));
        else if (s.pet) {
          s.pet.inBattle = null;
          P.persist();
        }
      } else if (awayEv && awayMs > 10 * 60e3) S.showAway(awayEv, awayMs);
    })();

    document.addEventListener('pointerdown', () => HG.audio.unlock(), { capture: true });
    document.addEventListener('keydown', () => HG.audio.unlock(), { capture: true });
    setInterval(tick, 1000);
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.HG_PREVIEW) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // QRコードから きたとき
    const room = new URLSearchParams(location.search).get('room');
    if (room && !resume && s.pet && s.pet.stage >= 1 && !s.pet.dead) {
      history.replaceState(null, '', location.pathname);
      HG.state.tab = 'pvp';
      S.main('pvp');
      setTimeout(() => HG.pvp.join(room), 300);
    }
  }

  function tick() {
    const s = HG.save, p = s && s.pet;
    if (!p || p.stage < 1) return;
    if (p.dead) {
      if (!HG.state.inBattle && !HG.state.busy && !document.querySelector('.full')) S.death();
      return;
    }
    const ev = P.simulate(s, HG.clock.now(), !document.hidden && HG.clock.now() - (p.lastTick || 0) < 5 * 60e3);
    if (p.dead) {
      P.persist();
      if (!HG.state.inBattle && !HG.state.busy) S.death();
      return;
    }
    const miss = ev.filter((e) => e.kind === 'mistake');
    if (miss.length && !document.hidden && !HG.state.inBattle) {
      UI.toast('おせわミス…（' + [...new Set(miss.map((e) => P.MISTAKE_SHORT[e.key] || e.key))].join('・') + '）');
    }
    if (ev.some((e) => e.kind === 'call' || e.kind === 'whim' || e.kind === 'sick')) {
      if (!document.hidden && !HG.state.inBattle && Date.now() - lastBeep > 20000) {
        lastBeep = Date.now();
        HG.audio.sfx('beep');
        HG.vibrate([60, 60, 60]);
      }
    }
    if (HG.state.tab === 'home' && !HG.state.busy) S.updateHome();
    if (Date.now() - lastSave > 5000) {
      P.persist();
      lastSave = Date.now();
    }
    if (!HG.state.busy && !HG.state.inBattle && !document.querySelector('.back,.talk,.cine,.full')) S.checkEvolution();
    document.title = P.calls(p).length ? '（！）ハグクミ' : 'ハグクミ';
  }

  window.addEventListener('pagehide', () => P.persist());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      P.persist();
    } else if (hiddenAt) {
      const s = HG.save, p = s && s.pet;
      const away = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (!p || p.stage < 1 || p.dead) return;
      const ev = P.simulate(s, HG.clock.now(), away < 10 * 60e3);
      P.persist();
      if (p.dead) {
        if (!HG.state.inBattle) S.death();
        return;
      }
      if (away > 10 * 60e3 && !HG.state.inBattle && !HG.state.busy) S.showAway(ev, away);
      if (HG.state.tab === 'home') S.updateHome(true);
    }
  });

  // デバッグよう
  HG.debug = {
    ff(hours) {
      HG.clock.offset += hours * 3600e3;
      HG.store.set('hg_dbg_off', HG.clock.offset);
      tick();
    },
    xp(n) {
      const r = P.addXp(HG.save, n);
      P.persist();
      S.afterXp(r);
      S.refreshTop();
    },
    coins(n) {
      HG.save.coins += n;
      P.persist();
      S.refreshTop();
    },
  };

  boot();
})(window.HG);
