/* ハグクミ core.js — 共通ユーティリティ */
'use strict';
window.HG = window.HG || {};
(function (HG) {
  HG.VERSION = '1.0.0';
  HG.DEBUG = /[?&]debug=1/.test(location.search);

  const U = HG.util = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  U.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  U.hashStr = (s) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  U.mulberry32 = (seed) => {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 時間の表示（ゲーム内はひらがな中心）
  U.fmtDur = (ms) => {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return m + 'ふん';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'じかん' + (m % 60 ? (m % 60) + 'ふん' : '');
    const d = Math.floor(h / 24);
    return d + 'にち' + (h % 24 ? (h % 24) + 'じかん' : '');
  };
  U.fmtDate = (ms) => {
    const d = new Date(ms);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  // DOM ヘルパー
  U.h = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const sk in v) {
            if (v[sk] == null) continue;
            if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]);
            else el.style[sk] = v[sk];
          }
        }
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  };
  U.qs = (sel, root) => (root || document).querySelector(sel);
  U.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  // 色ユーティリティ
  U.hexToHsl = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255,
      g = parseInt(hex.slice(2, 4), 16) / 255,
      b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  };
  U.hslToHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    s = U.clamp(s, 0, 100) / 100;
    l = U.clamp(l, 0, 100) / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  };
  U.shade = (hex, dl, ds, dh) => {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h + (dh || 0), s + (ds || 0), l + (dl || 0));
  };
  U.mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16),
      pb = parseInt(b.slice(1), 16);
    const ra = (pa >> 16) & 255, ga = (pa >> 8) & 255, ba = pa & 255;
    const rb = (pb >> 16) & 255, gb = (pb >> 8) & 255, bb = pb & 255;
    const r = Math.round(ra + (rb - ra) * t), g = Math.round(ga + (gb - ga) * t), b2 = Math.round(ba + (bb - ba) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b2).toString(16).slice(1);
  };

  // 保存（localStorage が使えない環境ではメモリに保存）
  const mem = {};
  HG.store = {
    ok: (() => {
      try {
        const k = '__hg_test__';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    get(key) {
      try {
        const v = this.ok ? localStorage.getItem(key) : mem[key];
        return v == null ? null : JSON.parse(v);
      } catch (e) {
        return null;
      }
    },
    set(key, obj) {
      const s = JSON.stringify(obj);
      try {
        if (this.ok) localStorage.setItem(key, s);
        else mem[key] = s;
      } catch (e) {
        mem[key] = s;
      }
    },
    del(key) {
      try {
        if (this.ok) localStorage.removeItem(key);
      } catch (e) {}
      delete mem[key];
    },
  };

  // イベントバス
  const handlers = {};
  HG.bus = {
    on(ev, fn) {
      (handlers[ev] = handlers[ev] || []).push(fn);
      return () => this.off(ev, fn);
    },
    off(ev, fn) {
      if (handlers[ev]) handlers[ev] = handlers[ev].filter((f) => f !== fn);
    },
    emit(ev, data) {
      (handlers[ev] || []).slice().forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(e);
        }
      });
    },
  };

  // 時計（デバッグ時は早送りできる）
  HG.clock = {
    offset: 0,
    now() {
      return Date.now() + this.offset;
    },
  };

  HG.vibrate = (pattern) => {
    try {
      if (HG.save && HG.save.settings && HG.save.settings.vibe === false) return;
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  };
})(window.HG);
