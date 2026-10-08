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
    let awayEv = null, awayMs = 0, fled = null;
    if (p && p.stage >= 1 && !p.dead) {
      if (p.inBattle) {
        // バトルの とちゅうで とじた
        if (p.inBattle.lethal) {
          fled = p.inBattle;
          p.bond = Math.max(0, p.bond - 20);
          p.mood = Math.max(0, p.mood - 30);
          for (let i = 0; i < 3; i++) P.mistake(p, 'flee');
        }
        p.inBattle = null;
      }
      awayMs = now - (p.lastTick || now);
      awayEv = P.simulate(s, now);
    }
    P.persist();
    S.render();
    if (fled) {
      UI.modal({ title: 'たたかいから にげだした…', html: `<p>バトルの とちゅうで いなくなったので、${U.esc(p.name)} は ひとりで にげかえって きた。こころに きずが のこった みたい。</p><p class="muted">なかよし −20・おせわミス ＋3</p>`, buttons: [{ label: 'ごめんね', cls: 'white', value: 1 }] });
    } else if (awayEv && awayMs > 10 * 60e3) S.showAway(awayEv, awayMs);

    document.addEventListener('pointerdown', () => HG.audio.unlock(), { capture: true });
    document.addEventListener('keydown', () => HG.audio.unlock(), { capture: true });
    setInterval(tick, 1000);
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.HG_PREVIEW) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // QRコードから きたとき
    const room = new URLSearchParams(location.search).get('room');
    if (room && s.pet && s.pet.stage >= 1 && !s.pet.dead) {
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
    const ev = P.simulate(s, HG.clock.now());
    if (p.dead) {
      P.persist();
      if (!HG.state.inBattle && !HG.state.busy) S.death();
      return;
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
      const ev = P.simulate(s, HG.clock.now());
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
