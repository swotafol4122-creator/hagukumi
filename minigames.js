/* ハグクミ minigames.js — ミニゲーム 8しゅ */
'use strict';
(function (HG) {
  const U = HG.util, h = U.h, UI = HG.ui;
  const MG = (HG.mg = {});
  const GAMES = {};

  // ───────── きょうつう ─────────
  MG.start = function (id, done) {
    const meta = HG.MINIGAMES.find((g) => g.id === id);
    const game = GAMES[id];
    HG.audio.bgm('mini');
    let finished = false, cleanup = [];
    const full = UI.full(meta.name, {
      onClose: async () => {
        if (finished) return;
        const ok = await UI.confirm('やめる？', '<p>とちゅうで やめると、けいけんちは もらえないよ。</p>', 'やめる', 'つづける', true);
        if (!ok) return;
        finish(null);
      },
    });
    const hud = h('div', { class: 'mg-hud' });
    const scoreEl = h('b', {}, '0');
    const infoEl = h('span', {}, '');
    hud.appendChild(h('span', {}, h('span', { class: 'small' }, 'スコア '), scoreEl));
    hud.appendChild(infoEl);
    const stage = h('div', { class: 'mg-stage' });
    full.body.appendChild(hud);
    full.body.appendChild(stage);
    const help = h('p', { style: { color: 'var(--on-shell)', margin: '8px 4px 0', fontSize: '13px', textAlign: 'center' } }, meta.desc);
    full.body.appendChild(help);

    const pet = HG.save.pet;
    const look = HG.P.look(pet);
    const ctx = {
      stage, full, look,
      petSvg: (expr) => HG.art.creature(look, { uid: 'mg' + (expr || ''), expr: expr || 'normal' }),
      score(v) { scoreEl.textContent = v; },
      info(t) { infoEl.textContent = t; },
      onEnd(fn) { cleanup.push(fn); },
      msg(text, ms) {
        const m = h('div', { class: 'mg-msg' }, text);
        stage.appendChild(m);
        setTimeout(() => m.remove(), ms || 900);
      },
      end(perf, line) {
        if (finished) return;
        finished = true;
        cleanup.forEach((f) => { try { f(); } catch (e) {} });
        cleanup = [];
        HG.audio.sfx(perf >= 0.5 ? 'win' : 'ok');
        const stars = perf >= 0.85 ? 3 : perf >= 0.5 ? 2 : perf >= 0.2 ? 1 : 0;
        const card = h('div', { class: 'mg-dom', style: { background: 'rgba(255,253,245,.94)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 20 } },
          h('div', { style: { width: '120px', height: '120px' }, html: HG.art.creature(look, { uid: 'mgend', expr: stars >= 2 ? 'happy' : 'normal', cls: stars >= 2 ? 'anim-hop' : 'anim-idle' }) }),
          h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '34px', color: 'var(--sun)', WebkitTextStroke: '1.5px var(--ink)', letterSpacing: '4px' } }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
          h('b', { style: { fontSize: '18px' } }, line || ''),
          h('button', { class: 'btn big lime', onclick: () => finish(perf) }, 'おわる')
        );
        stage.appendChild(card);
      },
    };
    function finish(perf) {
      finished = true;
      cleanup.forEach((f) => { try { f(); } catch (e) {} });
      full.close();
      done(perf);
    }
    // カウントダウン
    (async () => {
      const cd = h('div', { class: 'mg-msg' }, '');
      stage.appendChild(cd);
      game.prepare && (await game.prepare(ctx));
      for (const t of ['3', '2', '1']) {
        cd.textContent = t;
        HG.audio.sfx('countdown');
        await U.sleep(520);
        if (!document.body.contains(stage)) return;
      }
      cd.textContent = 'スタート！';
      HG.audio.sfx('go');
      setTimeout(() => cd.remove(), 500);
      game.run(ctx);
    })();
  };

  // キャンバス
  function makeCanvas(stage) {
    const c = h('canvas');
    stage.appendChild(c);
    const g = c.getContext('2d');
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(10, Math.round(r.width * dpr));
      c.height = Math.max(10, Math.round(r.height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    };
    return { c, g, fit };
  }
  function loop(fn) {
    let last = performance.now(), on = true;
    const step = (t) => {
      if (!on) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      fn(dt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => (on = false);
  }
  const INK = '#23194a';

  // ───────── PKキック ─────────
  GAMES.pk = {
    async prepare(ctx) {
      ctx.petImg = await HG.art.toImage(ctx.petSvg(), 160);
      const kl = { stage: 2, egg: 'white', type: U.pick(['fire', 'water', 'grass', 'elec']), style: 'tough', dna: U.randi(1, 999) };
      ctx.keeperImg = await HG.art.toImage(HG.art.creature(kl, { uid: 'kp' }), 160);
    },
    run(ctx) {
      const { c, g, fit } = makeCanvas(ctx.stage);
      let W = 0, H = 0;
      const resize = () => ({ w: W, h: H } = fit());
      resize();
      window.addEventListener('resize', resize);
      ctx.onEnd(() => window.removeEventListener('resize', resize));
      let kick = 0, goals = 0, bonus = 0;
      let phase = 'aim', t = 0, aimX = 0, power = 0, shot = null, keeper = { x: 0.5, tx: 0.5, dive: 0 }, resultT = 0, result = '';
      ctx.info('のこり 5かい');
      const speed = () => 1.6 + kick * 0.35;
      const tap = () => {
        if (phase === 'aim') { phase = 'power'; t = 0; HG.audio.sfx('select'); }
        else if (phase === 'power') {
          phase = 'shot';
          HG.audio.sfx('shoot');
          // キーパーの よみ
          const err = U.rand(-0.32, 0.32) * (1 - kick * 0.08);
          const guess = U.clamp(aimX + err, 0.12, 0.88);
          keeper.tx = Math.random() < 0.25 ? U.pick([0.25, 0.5, 0.75]) : guess;
          shot = { t: 0, x: aimX, p: power };
        } else if (phase === 'done') return;
      };
      c.addEventListener('pointerdown', tap);
      const stop = loop((dt) => {
        t += dt;
        const gx0 = W * 0.14, gx1 = W * 0.86, gy = H * 0.2, gh = H * 0.16;
        if (phase === 'aim') aimX = 0.5 + Math.sin(t * speed()) * 0.42;
        if (phase === 'power') power = (Math.sin(t * (2.4 + kick * 0.3) - Math.PI / 2) + 1) / 2;
        if (phase === 'shot') {
          shot.t += dt / 0.55;
          keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * (5 + kick * 0.7));
          if (shot.t >= 1) {
            const over = shot.p > 0.93;
            const weak = shot.p < 0.22;
            const dx = Math.abs(keeper.x - shot.x);
            const reach = 0.13 + (weak ? 0.12 : 0);
            if (over) { result = 'ふかした…'; HG.audio.sfx('ng'); }
            else if (dx < reach) { result = 'とめられた！'; HG.audio.sfx('ng'); }
            else {
              result = 'ゴール！';
              goals++;
              if (shot.x < 0.24 || shot.x > 0.76) bonus += 0.04;
              HG.audio.sfx('ok');
              HG.vibrate(30);
            }
            ctx.score(goals);
            phase = 'result';
            resultT = 0;
          }
        }
        if (phase === 'result') {
          resultT += dt;
          if (resultT > 1.1) {
            kick++;
            ctx.info('のこり ' + (5 - kick) + 'かい');
            if (kick >= 5) {
              phase = 'done';
              ctx.end(Math.min(1, goals / 5 + bonus), goals + ' / 5 ゴール');
              stop();
              return;
            }
            phase = 'aim'; t = U.rand(0, 3); keeper = { x: 0.5, tx: 0.5 }; shot = null; result = '';
          }
        }
        // えがく
        g.fillStyle = '#7fd36a';
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#75c95f' : '#7fd36a';
          g.fillRect(0, H * (i / 8), W, H / 8);
        }
        // ゴール
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(gx0 + ((gx1 - gx0) * i) / 12, gy - gh); g.lineTo(gx0 + ((gx1 - gx0) * i) / 12, gy); g.stroke(); }
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(gx0, gy - gh + (gh * i) / 4); g.lineTo(gx1, gy - gh + (gh * i) / 4); g.stroke(); }
        g.lineWidth = 7;
        g.strokeStyle = INK;
        g.beginPath(); g.moveTo(gx0, gy + 4); g.lineTo(gx0, gy - gh); g.lineTo(gx1, gy - gh); g.lineTo(gx1, gy + 4); g.stroke();
        g.lineWidth = 4;
        g.strokeStyle = '#ffffff';
        g.beginPath(); g.moveTo(gx0, gy + 4); g.lineTo(gx0, gy - gh); g.lineTo(gx1, gy - gh); g.lineTo(gx1, gy + 4); g.stroke();
        g.beginPath(); g.moveTo(0, gy + 2); g.lineTo(W, gy + 2); g.stroke();
        // キーパー
        const ks = Math.min(W * 0.26, 110);
        const kx = gx0 + (gx1 - gx0) * keeper.x;
        g.save();
        g.translate(kx, gy - ks * 0.45);
        if (phase === 'shot' || phase === 'result') g.rotate((keeper.tx - 0.5) * 0.9);
        g.drawImage(ctx.keeperImg, -ks / 2, -ks / 2, ks, ks);
        g.restore();
        // ねらい
        if (phase === 'aim' || phase === 'power') {
          const ax = gx0 + (gx1 - gx0) * aimX;
          g.strokeStyle = '#ff3f6c';
          g.lineWidth = 4;
          g.beginPath(); g.arc(ax, gy - gh * 0.5, 14, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(ax - 20, gy - gh * 0.5); g.lineTo(ax + 20, gy - gh * 0.5); g.moveTo(ax, gy - gh * 0.5 - 20); g.lineTo(ax, gy - gh * 0.5 + 20); g.stroke();
        }
        // パワー
        if (phase === 'power') {
          const bx = W - 34, by = H * 0.35, bh = H * 0.4;
          g.fillStyle = '#ffffff';
          g.strokeStyle = INK;
          g.lineWidth = 3;
          g.fillRect(bx, by, 20, bh);
          g.fillStyle = '#b4ef3a';
          g.fillRect(bx, by + bh * (1 - 0.88), 20, bh * (0.88 - 0.5));
          g.fillStyle = '#ff4d5e';
          g.fillRect(bx, by, 20, bh * 0.07);
          g.strokeRect(bx, by, 20, bh);
          g.fillStyle = INK;
          g.fillRect(bx - 6, by + bh * (1 - power) - 3, 32, 6);
        }
        // ボール
        const bx0 = W * 0.5, by0 = H * 0.8;
        let bx = bx0, by = by0, br = 13;
        if (shot) {
          const tt = Math.min(1, shot.t);
          const tx = gx0 + (gx1 - gx0) * shot.x;
          const ty = gy - gh * (shot.p > 0.93 ? 1.6 : 0.2 + shot.p * 0.6);
          bx = bx0 + (tx - bx0) * tt;
          by = by0 + (ty - by0) * tt - Math.sin(tt * Math.PI) * 30;
          br = 13 - tt * 6;
        }
        // いきもの
        const ps = Math.min(W * 0.3, 120);
        g.drawImage(ctx.petImg, bx0 - ps * 0.9, by0 - ps * 0.7, ps, ps);
        g.fillStyle = '#ffffff';
        g.strokeStyle = INK;
        g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = INK;
        g.beginPath(); g.arc(bx, by, br * 0.35, 0, Math.PI * 2); g.fill();
        if (phase === 'aim' || phase === 'power') {
          g.fillStyle = 'rgba(255,255,255,.9)';
          g.font = '700 15px ' + getComputedStyle(document.body).fontFamily;
          g.textAlign = 'center';
          g.fillText(phase === 'aim' ? 'タップで ねらいを きめる' : 'タップで つよさを きめる（みどりが ちょうどいい）', W / 2, H * 0.95);
        }
        if (phase === 'result') {
          g.font = '400 36px ' + "'Dela Gothic One', sans-serif";
          g.textAlign = 'center';
          g.lineWidth = 6;
          g.strokeStyle = INK;
          g.strokeText(result, W / 2, H * 0.5);
          g.fillStyle = result === 'ゴール！' ? '#ffd23d' : '#ffffff';
          g.fillText(result, W / 2, H * 0.5);
        }
      });
      ctx.onEnd(stop);
    },
  };

  // ───────── なわとび ─────────
  GAMES.rope = {
    async prepare(ctx) {
      ctx.petImg = await HG.art.toImage(ctx.petSvg(), 180);
    },
    run(ctx) {
      const { c, g, fit } = makeCanvas(ctx.stage);
      let W = 0, H = 0;
      ({ w: W, h: H } = fit());
      let phi = Math.PI, omega = 3.0, jumps = 0, lives = 3, time = 30, y = 0, vy = 0, onGround = true, hitCool = 0, passed = false, over = false;
      const GRAV = 2600;
      ctx.info('のこり 30びょう・♥♥♥');
      const jump = () => {
        if (!onGround || over) return;
        vy = -Math.max(560, 760 - omega * 22);
        onGround = false;
        HG.audio.sfx('tap');
      };
      c.addEventListener('pointerdown', jump);
      const key = (e) => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
      window.addEventListener('keydown', key);
      ctx.onEnd(() => window.removeEventListener('keydown', key));
      const stop = loop((dt) => {
        if (over) return;
        time -= dt;
        hitCool -= dt;
        phi += omega * dt;
        if (phi > Math.PI * 2) { phi -= Math.PI * 2; passed = false; }
        // ジャンプ
        if (!onGround) {
          vy += GRAV * dt;
          y += vy * dt;
          if (y >= 0) { y = 0; vy = 0; onGround = true; }
        }
        // なわが あしもとを とおる（phi ≒ 0）
        const nearBottom = Math.abs(U.angDiff(0, phi)) < 0.28;
        if (nearBottom && !passed) {
          if (y > -26 && hitCool <= 0) {
            lives--;
            hitCool = 0.6;
            passed = true;
            HG.audio.sfx('ng');
            HG.vibrate(60);
            ctx.msg('ひっかかった！', 600);
            omega = Math.max(3.0, omega - 0.6);
          } else if (y <= -26) {
            passed = true;
            jumps++;
            ctx.score(jumps);
            omega = Math.min(7.6, omega + 0.12);
            if (jumps % 5 === 0) HG.audio.sfx('ok');
          }
        }
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう・' + '♥'.repeat(Math.max(0, lives)));
        if (lives <= 0 || time <= 0) {
          over = true;
          ctx.end(Math.min(1, jumps / 32), jumps + 'かい とんだ！');
          stop();
          return;
        }
        // えがく
        g.fillStyle = '#ffe9c4';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#ffd59a';
        g.fillRect(0, H * 0.72, W, H * 0.28);
        const cx = W / 2, groundY = H * 0.74;
        const ps = Math.min(W * 0.42, 170);
        const R = ps * 0.62;
        const ropeY = groundY - ps * 0.42 + Math.cos(phi) * R;
        const front = Math.cos(phi) > 0;
        const drawRope = () => {
          g.strokeStyle = '#ff4f7b';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(cx - ps * 0.85, groundY - ps * 0.42);
          g.quadraticCurveTo(cx, ropeY + (ropeY - (groundY - ps * 0.42)) * 0.3, cx + ps * 0.85, groundY - ps * 0.42);
          g.stroke();
        };
        // もちて
        g.fillStyle = INK;
        g.fillRect(cx - ps * 0.85 - 6, groundY - ps * 0.42 - 12, 12, 24);
        g.fillRect(cx + ps * 0.85 - 6, groundY - ps * 0.42 - 12, 12, 24);
        if (!front) drawRope();
        // かげ
        g.fillStyle = 'rgba(35,25,74,.18)';
        g.beginPath();
        g.ellipse(cx, groundY, ps * 0.3 * (1 + y / 400), 8, 0, 0, Math.PI * 2);
        g.fill();
        g.drawImage(ctx.petImg, cx - ps / 2, groundY - ps + y, ps, ps);
        if (front) drawRope();
        g.fillStyle = INK;
        g.font = '700 14px ' + getComputedStyle(document.body).fontFamily;
        g.textAlign = 'center';
        g.fillText('なわが したに くる まえに タップ！', W / 2, H * 0.93);
      });
      ctx.onEnd(stop);
    },
  };

  // ───────── ドッジボール ─────────
  GAMES.dodge = {
    async prepare(ctx) {
      ctx.petImg = await HG.art.toImage(ctx.petSvg(), 140);
      ctx.thImg = await HG.art.toImage(HG.art.creature({ stage: 2, egg: 'white', type: U.pick(['fire', 'water', 'elec']), style: 'cool', dna: U.randi(1, 999) }, { uid: 'th' }), 120);
    },
    run(ctx) {
      const { c, g, fit } = makeCanvas(ctx.stage);
      let W = 0, H = 0;
      ({ w: W, h: H } = fit());
      let px = W / 2, py = H * 0.78, tx = px, ty = py, time = 30, lives = 3, inv = 0, balls = [], spawn = 1.0, dodged = 0, over = false, elapsed = 0;
      const pr = Math.min(W, H) * 0.07;
      const move = (e) => {
        const r = c.getBoundingClientRect();
        tx = U.clamp(e.clientX - r.left, pr, W - pr);
        ty = U.clamp(e.clientY - r.top - pr * 1.6, H * 0.45, H - pr);
      };
      c.addEventListener('pointerdown', move);
      c.addEventListener('pointermove', (e) => e.buttons || e.pointerType === 'touch' ? move(e) : null);
      const keys = {};
      const kd = (e) => (keys[e.code] = true), ku = (e) => (keys[e.code] = false);
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      ctx.onEnd(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
      const stop = loop((dt) => {
        if (over) return;
        time -= dt;
        elapsed += dt;
        inv -= dt;
        const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
        const ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
        if (kx || ky) { tx = U.clamp(px + kx * 30, pr, W - pr); ty = U.clamp(py + ky * 30, H * 0.45, H - pr); }
        px += (tx - px) * Math.min(1, dt * 14);
        py += (ty - py) * Math.min(1, dt * 14);
        spawn -= dt;
        if (spawn <= 0) {
          const fromX = U.rand(W * 0.15, W * 0.85);
          const aimX = px + U.rand(-30, 30), aimY = py;
          const ang = Math.atan2(aimY - H * 0.1, aimX - fromX);
          const sp = 300 + elapsed * 9 + U.rand(0, 60);
          balls.push({ x: fromX, y: H * 0.1, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, warn: 0.45, r: Math.min(W, H) * 0.035, counted: false });
          spawn = Math.max(0.35, 1.0 - elapsed * 0.022) * U.rand(0.7, 1.2);
        }
        balls.forEach((b) => {
          if (b.warn > 0) { b.warn -= dt; return; }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (!b.hit && inv <= 0 && U.dist(b.x, b.y, px, py) < b.r + pr * 0.8) {
            b.hit = true;
            lives--;
            inv = 1.0;
            HG.audio.sfx('hit');
            HG.vibrate(80);
          }
          if (!b.counted && b.y > py + pr && !b.hit) { b.counted = true; dodged++; ctx.score(dodged); }
        });
        balls = balls.filter((b) => b.y < H + 40 && b.x > -40 && b.x < W + 40);
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう・' + '♥'.repeat(Math.max(0, lives)));
        if (lives <= 0 || time <= 0) {
          over = true;
          const surv = Math.min(1, elapsed / 30);
          ctx.end(Math.min(1, surv * 0.6 + Math.min(1, dodged / 26) * 0.4), dodged + 'こ よけた！');
          stop();
          return;
        }
        // えがく
        g.fillStyle = '#ffd9a8';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 4;
        g.strokeRect(10, 10, W - 20, H - 20);
        g.beginPath(); g.moveTo(10, H * 0.4); g.lineTo(W - 10, H * 0.4); g.stroke();
        const ts = Math.min(W * 0.18, 70);
        [0.25, 0.75].forEach((f) => g.drawImage(ctx.thImg, W * f - ts / 2, 4, ts, ts));
        balls.forEach((b) => {
          if (b.warn > 0) {
            g.strokeStyle = 'rgba(255,60,90,.55)';
            g.lineWidth = 3;
            g.setLineDash([8, 8]);
            g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + b.vx * 1.2, b.y + b.vy * 1.2); g.stroke();
            g.setLineDash([]);
            return;
          }
          g.fillStyle = '#ff5c5c';
          g.strokeStyle = INK;
          g.lineWidth = 3;
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); g.stroke();
          g.beginPath(); g.arc(b.x, b.y, b.r, -0.6, 0.6); g.stroke();
        });
        if (inv <= 0 || Math.floor(inv * 12) % 2) {
          const ps = pr * 3.2;
          g.drawImage(ctx.petImg, px - ps / 2, py - ps * 0.62, ps, ps);
        }
      });
      ctx.onEnd(stop);
    },
  };

  // ───────── おりょうりごっこ ─────────
  const RECIPES = [
    ['たまごやき', '🍳', ['🥚', '🥛', '🧂']],
    ['おにぎり', '🍙', ['🍚', '🧂', '🐟']],
    ['サンドイッチ', '🥪', ['🍞', '🥬', '🍅', '🧀']],
    ['ホットケーキ', '🥞', ['🥚', '🥛', '🍯', '🍓']],
    ['カレーライス', '🍛', ['🍚', '🥕', '🥔', '🧅', '🍖']],
    ['やさいスープ', '🍲', ['🥕', '🧅', '🥔', '🌽', '🍄']],
    ['フルーツパフェ', '🍨', ['🥛', '🍓', '🍌', '🍫', '🍒']],
    ['オムライス', '🍳', ['🍚', '🍅', '🧅', '🥚', '🍅']],
  ];
  const INGS = ['🍚', '🥕', '🥔', '🧅', '🍖', '🥚', '🍅', '🧀', '🍞', '🥬', '🍓', '🍌', '🍫', '🥛', '🐟', '🍄', '🌽', '🍯', '🧂', '🍒'];
  GAMES.cook = {
    run(ctx) {
      const dom = h('div', { class: 'mg-dom', style: { background: '#fff3df' } });
      ctx.stage.appendChild(dom);
      let time = 45, dishes = 0, miss = 0, level = 0, over = false;
      const card = h('div', { class: 'speech', style: { textAlign: 'center', minHeight: '86px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } });
      const pot = h('div', { style: { margin: '6px auto 0', width: '72%', minHeight: '78px', background: '#fff', border: '3px solid var(--ink)', borderRadius: '10px 10px 70px 70px', boxShadow: 'inset 0 -8px 0 #e9e1d0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', fontSize: '26px', gap: '2px', padding: '6px 10px' } });
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: 'auto' } });
      dom.append(card, pot, grid);
      let recipe = null, idx = 0, showing = false;
      const next = async () => {
        if (over) return;
        const pool = RECIPES.filter((r) => r[2].length <= 3 + Math.floor(level / 1.5) + 1);
        recipe = U.pick(pool.slice(Math.max(0, pool.length - 4)));
        idx = 0;
        pot.textContent = '';
        showing = true;
        card.innerHTML = `<b style="font-size:17px">${recipe[1]} ${recipe[0]} の つくりかた</b><div style="font-size:30px;letter-spacing:6px">${recipe[2].join('')}</div><span class="muted">じゅんばんを おぼえてね</span>`;
        grid.innerHTML = '';
        const opts = U.shuffle(Array.from(new Set(recipe[2].concat(U.shuffle(INGS.filter((x) => !recipe[2].includes(x))).slice(0, 8)))).slice(0, 8));
        opts.forEach((em) => {
          const b = h('button', { class: 'mg-btn' }, em);
          b.onclick = () => pick(em, b);
          grid.appendChild(b);
        });
        await U.sleep(Math.max(1400, 2600 - level * 150) + recipe[2].length * 150);
        if (over) return;
        showing = false;
        card.innerHTML = `<b style="font-size:17px">${recipe[1]} ${recipe[0]}</b><span class="muted">じゅんばんに ざいりょうを タップ！</span>`;
      };
      const pick = (em, b) => {
        if (over || showing) return;
        if (em === recipe[2][idx]) {
          idx++;
          pot.textContent += em;
          HG.audio.sfx('tap');
          b.classList.add('ok');
          setTimeout(() => b.classList.remove('ok'), 200);
          if (idx >= recipe[2].length) {
            dishes++;
            level++;
            ctx.score(dishes);
            HG.audio.sfx('ok');
            ctx.msg(recipe[1] + ' できた！', 800);
            setTimeout(next, 700);
          }
        } else {
          miss++;
          time -= 2;
          HG.audio.sfx('ng');
          b.classList.add('ng');
          setTimeout(() => b.classList.remove('ng'), 300);
          ctx.msg('ちがうよ！', 500);
        }
      };
      const iv = setInterval(() => {
        if (over) return;
        time -= 0.25;
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう');
        if (time <= 0) {
          over = true;
          clearInterval(iv);
          ctx.end(U.clamp(dishes / 6 - miss * 0.02, 0, 1), dishes + 'しな つくった！');
        }
      }, 250);
      ctx.onEnd(() => { over = true; clearInterval(iv); });
      next();
    },
  };

  // ───────── おみせやさんごっこ ─────────
  const GOODS = [['🍎', 'りんご'], ['🍞', 'パン'], ['🥛', 'ぎゅうにゅう'], ['🍌', 'バナナ'], ['🍬', 'あめ'], ['🍙', 'おにぎり'], ['🥚', 'たまご'], ['🍪', 'クッキー']];
  GAMES.shop = {
    run(ctx) {
      const dom = h('div', { class: 'mg-dom', style: { background: '#e9f7ff' } });
      ctx.stage.appendChild(dom);
      let time = 50, served = 0, wrong = 0, over = false, order = null, bag = {};
      const custBox = h('div', { class: 'row' });
      const custArt = h('div', { style: { width: '84px', height: '84px', flex: '0 0 auto' } });
      const speech = h('div', { class: 'speech grow' });
      custBox.append(custArt, speech);
      const bagEl = h('div', { class: 'speech', style: { minHeight: '50px', fontSize: '24px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' } });
      const shelf = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' } });
      const give = h('button', { class: 'btn lime block' }, 'どうぞ！');
      dom.append(custBox, h('span', { class: 'small' }, 'ふくろ（タップで もどす）'), bagEl, shelf, give);
      GOODS.forEach(([em, name]) => {
        const b = h('button', { class: 'mg-btn', style: { aspectRatio: 'auto', padding: '6px 2px' } }, em, h('small', {}, name));
        b.onclick = () => { if (over) return; bag[em] = (bag[em] || 0) + 1; HG.audio.sfx('tap'); drawBag(); };
        shelf.appendChild(b);
      });
      const drawBag = () => {
        bagEl.innerHTML = '';
        Object.keys(bag).forEach((em) => {
          if (!bag[em]) return;
          const chip = h('button', { class: 'chip', style: { fontSize: '20px', padding: '2px 8px' } }, em + '×' + bag[em]);
          chip.onclick = () => { bag[em]--; drawBag(); };
          bagEl.appendChild(chip);
        });
        if (!bagEl.children.length) bagEl.appendChild(h('span', { class: 'muted' }, 'からっぽ'));
      };
      const newCustomer = () => {
        const kinds = Math.min(3, 1 + Math.floor(served / 2));
        const picks = U.shuffle(GOODS).slice(0, kinds);
        order = {};
        picks.forEach(([em]) => (order[em] = U.randi(1, Math.min(3, 1 + Math.floor(served / 3)))));
        bag = {};
        drawBag();
        const look = { stage: U.randi(1, 3), egg: U.pick(HG.EGG_KEYS.slice(0, 5)), type: U.pick(['fire', 'water', 'grass', 'elec', 'light']), style: U.pick(HG.STYLE_KEYS), dna: U.randi(1, 9999) };
        custArt.innerHTML = HG.art.creature(look, { uid: 'cu', cls: 'anim-idle' });
        speech.innerHTML = picks.map(([em, name]) => `${name}${em} を <b>${order[em]}こ</b>`).join('、') + ' ください！';
      };
      give.onclick = () => {
        if (over) return;
        const ok = Object.keys(order).every((em) => bag[em] === order[em]) && Object.keys(bag).every((em) => !bag[em] || order[em]);
        if (ok) {
          served++;
          ctx.score(served);
          HG.audio.sfx('coin');
          ctx.msg('ありがとう！', 700);
        } else {
          wrong++;
          time -= 3;
          HG.audio.sfx('ng');
          ctx.msg('ちがうよ〜', 700);
        }
        setTimeout(newCustomer, 500);
      };
      const iv = setInterval(() => {
        if (over) return;
        time -= 0.25;
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう');
        if (time <= 0) {
          over = true;
          clearInterval(iv);
          ctx.end(U.clamp(served / 7 - wrong * 0.03, 0, 1), served + 'にん に うった！');
        }
      }, 250);
      ctx.onEnd(() => { over = true; clearInterval(iv); });
      newCustomer();
    },
  };

  // ───────── おめかしごっこ ─────────
  GAMES.dress = {
    run(ctx) {
      const dom = h('div', { class: 'mg-dom', style: { background: '#fff0f6' } });
      ctx.stage.appendChild(dom);
      const SL = { head: [null, 'cap', 'ribbon', 'flower', 'crown'], face: [null, 'glasses', 'sunglasses'], neck: [null, 'scarf', 'bowtie'] };
      const SN = { head: 'あたま', face: 'かお', neck: 'くび' };
      let round = 0, hits = 0, total = 0, over = false, target = null, choice = {}, time = 55;
      const top = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
      const model = h('div', { style: { width: '42%', aspectRatio: '1', background: '#fff', border: '3px solid var(--ink)', borderRadius: '16px', position: 'relative' } });
      const mine = h('div', { style: { width: '42%', aspectRatio: '1', background: '#fff', border: '3px solid var(--ink)', borderRadius: '16px' } });
      const mid = h('div', { style: { flex: '1', textAlign: 'center', fontSize: '13px' } }, '→');
      top.append(model, mid, mine);
      const rows = h('div', { class: 'gap', style: { gap: '6px' } });
      const ok = h('button', { class: 'btn lime block' }, 'できた！');
      dom.append(top, rows, ok);
      const modelLook = { stage: 3, egg: 'white', type: U.pick(['water', 'grass', 'light']), style: 'cute', dna: U.randi(1, 999) };
      const drawMine = () => (mine.innerHTML = HG.art.creature(Object.assign({}, ctx.look, { acc: choice }), { uid: 'dm' }));
      const buildRows = (lock) => {
        rows.innerHTML = '';
        Object.keys(SL).forEach((slot) => {
          const r = h('div', { style: { display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { class: 'small', style: { width: '40px', flex: '0 0 auto' } }, SN[slot]));
          SL[slot].forEach((k) => {
            const b = h('button', { class: 'chip', style: { padding: '6px 8px', fontSize: '12px', background: choice[slot] === k ? 'var(--sun)' : '#fff' }, disabled: lock ? true : null }, k ? HG.ACCS[k].name : 'なし');
            b.onclick = () => { choice[slot] = k; HG.audio.sfx('tap'); drawMine(); buildRows(false); };
            r.appendChild(b);
          });
          rows.appendChild(r);
        });
      };
      const nextRound = async () => {
        if (over) return;
        round++;
        target = { head: U.pick(SL.head.slice(1)), face: U.pick(SL.face), neck: U.pick(SL.neck) };
        if (round <= 2) target.neck = null;
        choice = { head: null, face: null, neck: null };
        model.innerHTML = HG.art.creature(Object.assign({}, modelLook, { acc: target }), { uid: 'md', cls: 'anim-idle' });
        mid.textContent = 'おぼえてね';
        drawMine();
        buildRows(true);
        ok.disabled = true;
        await U.sleep(Math.max(1600, 3000 - round * 180));
        if (over) return;
        model.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-size:40px;color:var(--ink-soft)">？</div>';
        mid.textContent = 'おなじに しよう';
        buildRows(false);
        ok.disabled = false;
      };
      ok.onclick = () => {
        if (over) return;
        let n = 0;
        ['head', 'face', 'neck'].forEach((k) => { total++; if ((choice[k] || null) === (target[k] || null)) n++; });
        hits += n;
        ctx.score(hits);
        model.innerHTML = HG.art.creature(Object.assign({}, modelLook, { acc: target }), { uid: 'md2' });
        HG.audio.sfx(n === 3 ? 'ok' : 'ng');
        ctx.msg(n === 3 ? 'ぴったり！' : n + ' / 3', 800);
        ok.disabled = true;
        setTimeout(nextRound, 1000);
      };
      const iv = setInterval(() => {
        if (over) return;
        time -= 0.25;
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう');
        if (time <= 0) {
          over = true;
          clearInterval(iv);
          ctx.end(total ? U.clamp((hits / total) * Math.min(1, round / 5), 0, 1) : 0, hits + 'こ あたり！');
        }
      }, 250);
      ctx.onEnd(() => { over = true; clearInterval(iv); });
      nextRound();
    },
  };

  // ───────── しんけいすいじゃく ─────────
  GAMES.memory = {
    run(ctx) {
      const dom = h('div', { class: 'mg-dom', style: { background: '#efe8ff', justifyContent: 'center' } });
      ctx.stage.appendChild(dom);
      const pool = U.shuffle(['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐧', '🐤', '🦊', '🐨', '🐯', '🐮']).slice(0, 8);
      const deck = U.shuffle(pool.concat(pool));
      let open = [], matched = 0, time = 50, over = false, lock = false, flips = 0;
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', width: '100%', maxWidth: '360px', margin: '0 auto' } });
      dom.appendChild(grid);
      deck.forEach((em, i) => {
        const b = h('button', { class: 'mg-btn', style: { background: 'var(--shell)', color: 'transparent' }, 'aria-label': 'カード' }, em);
        b.onclick = () => {
          if (over || lock || b.dataset.done || open.includes(b)) return;
          b.style.background = '#fff';
          b.style.color = '';
          HG.audio.sfx('tap');
          open.push(b);
          if (open.length === 2) {
            flips++;
            lock = true;
            const [a, c] = open;
            if (a.textContent === c.textContent) {
              a.dataset.done = c.dataset.done = '1';
              a.classList.add('ok');
              c.classList.add('ok');
              matched++;
              ctx.score(matched);
              HG.audio.sfx('ok');
              open = [];
              lock = false;
              if (matched === 8) {
                over = true;
                clearInterval(iv);
                ctx.end(U.clamp(0.7 + time / 50 * 0.3 - Math.max(0, flips - 12) * 0.01, 0, 1), 'ぜんぶ そろえた！');
              }
            } else {
              setTimeout(() => {
                [a, c].forEach((x) => { x.style.background = 'var(--shell)'; x.style.color = 'transparent'; });
                open = [];
                lock = false;
              }, 650);
            }
          }
        };
        grid.appendChild(b);
      });
      const iv = setInterval(() => {
        if (over) return;
        time -= 0.25;
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう');
        if (time <= 0) {
          over = true;
          clearInterval(iv);
          ctx.end(U.clamp((matched / 8) * 0.75, 0, 1), matched + 'くみ そろえた');
        }
      }, 250);
      ctx.onEnd(() => { over = true; clearInterval(iv); });
    },
  };

  // ───────── けいさんレース ─────────
  GAMES.math = {
    run(ctx) {
      const dom = h('div', { class: 'mg-dom', style: { background: '#eaffe4', justifyContent: 'center' } });
      ctx.stage.appendChild(dom);
      let time = 35, correct = 0, wrong = 0, over = false, q = null;
      const qEl = h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '44px', textAlign: 'center', margin: '8px 0 14px' } });
      const opts = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '340px', margin: '0 auto' } });
      dom.append(h('div', { style: { width: '90px', height: '90px', margin: '0 auto' }, html: ctx.petSvg() }), qEl, opts);
      const make = () => {
        const lv = correct;
        let a, b, op, ans;
        if (lv < 4) { a = U.randi(1, 9); b = U.randi(1, 9); op = '+'; ans = a + b; }
        else if (lv < 8) { a = U.randi(5, 19); b = U.randi(1, a); op = U.pick(['+', '−']); ans = op === '+' ? a + b : a - b; }
        else if (lv < 12) { a = U.randi(2, 9); b = U.randi(2, 9); op = '×'; ans = a * b; }
        else { a = U.randi(11, 49); b = U.randi(2, 30); op = U.pick(['+', '−']); if (op === '−' && b > a) [a, b] = [b, a]; ans = op === '+' ? a + b : a - b; }
        const set = new Set([ans]);
        while (set.size < 4) set.add(Math.max(0, ans + U.randi(-6, 6)));
        q = { text: `${a} ${op} ${b}`, ans, opts: U.shuffle(Array.from(set)) };
        qEl.textContent = q.text + ' = ?';
        opts.innerHTML = '';
        q.opts.forEach((v) => {
          const btn = h('button', { class: 'mg-btn', style: { aspectRatio: 'auto', fontFamily: 'var(--font-display)', fontSize: '30px', padding: '10px' } }, String(v));
          btn.onclick = () => {
            if (over) return;
            if (v === q.ans) { correct++; ctx.score(correct); HG.audio.sfx('ok'); btn.classList.add('ok'); setTimeout(make, 150); }
            else { wrong++; time -= 2; HG.audio.sfx('ng'); btn.classList.add('ng'); ctx.msg('ざんねん', 400); }
          };
          opts.appendChild(btn);
        });
      };
      const iv = setInterval(() => {
        if (over) return;
        time -= 0.25;
        ctx.info('のこり ' + Math.ceil(Math.max(0, time)) + 'びょう');
        if (time <= 0) {
          over = true;
          clearInterval(iv);
          ctx.end(U.clamp(correct / 16 - wrong * 0.02, 0, 1), correct + 'もん せいかい！');
        }
      }, 250);
      ctx.onEnd(() => { over = true; clearInterval(iv); });
      make();
    },
  };
})(window.HG);
