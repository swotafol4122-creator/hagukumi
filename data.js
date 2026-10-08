/* ハグクミ data.js — ゲームデータ */
'use strict';
(function (HG) {
  // ───────── タイプ（ぞくせい） ─────────
  HG.TYPES = {
    normal: { name: 'ノーマル', color: '#b9a48f', ink: '#ffffff' },
    fire: { name: 'ほのお', color: '#ff6b35', ink: '#ffffff' },
    water: { name: 'みず', color: '#2f93f5', ink: '#ffffff' },
    grass: { name: 'くさ', color: '#36b25a', ink: '#ffffff' },
    elec: { name: 'でんき', color: '#ffc80a', ink: '#3b2a00' },
    light: { name: 'ひかり', color: '#ffe9a6', ink: '#7a5200' },
    dark: { name: 'やみ', color: '#5b3fa6', ink: '#ffffff' },
  };
  HG.TYPE_KEYS = ['normal', 'fire', 'water', 'grass', 'elec', 'light', 'dark'];
  HG.ELEM_KEYS = ['fire', 'water', 'grass', 'elec', 'light'];

  // こうげきタイプ → ぼうぎょタイプ の ばいりつ
  const C = {
    fire: { grass: 1.6, water: 0.6, fire: 0.8 },
    water: { fire: 1.6, grass: 0.6, water: 0.8 },
    grass: { water: 1.6, fire: 0.6, grass: 0.8, elec: 1.25 },
    elec: { water: 1.6, grass: 0.6, elec: 0.8 },
    light: { dark: 1.6 },
    dark: { light: 1.6 },
    normal: {},
  };
  HG.typeEff = (atk, def) => (C[atk] && C[atk][def]) || 1;
  HG.TYPE_HINT = [
    'ほのお は くさ に つよい・みず に よわい',
    'みず は ほのお に つよい・くさ と でんき に よわい',
    'くさ は みず に つよい・ほのお に よわい',
    'でんき は みず に つよい・くさ に よわい',
    'ひかり と やみ は おたがいに こうかばつぐん',
  ];

  // ───────── スタイル（みため） ─────────
  HG.STYLES = {
    cute: { name: 'かわいい', color: '#ff7eb6', from: 'ままごとで よく あそんだ' },
    cool: { name: 'かっこいい', color: '#3d8bff', from: 'スポーツで よく あそんだ' },
    smart: { name: 'かしこい', color: '#9b6bff', from: 'あたまの あそびを よく した' },
    tough: { name: 'たくましい', color: '#e0662f', from: 'バトルを たくさん がんばった' },
  };
  HG.STYLE_KEYS = ['cute', 'cool', 'smart', 'tough'];

  // ───────── たまご ─────────
  HG.EGGS = {
    white: { name: 'しろい たまご', shell: '#fbf6ec', spot: '#e8d9bf', body: '#f3e2c4', el: {}, desc: 'なにいろにも そまる' },
    red: { name: 'あかい たまご', shell: '#ffd9cf', spot: '#ff7a59', body: '#ffb8a3', el: { fire: 6 }, desc: 'ほんのり あたたかい' },
    blue: { name: 'あおい たまご', shell: '#d6ecff', spot: '#55a8ff', body: '#a9d6ff', el: { water: 6 }, desc: 'ひんやり すずしい' },
    green: { name: 'みどりの たまご', shell: '#dcf5d2', spot: '#5cc46b', body: '#b9e8a6', el: { grass: 6 }, desc: 'はっぱの においが する' },
    yellow: { name: 'きいろい たまご', shell: '#fff4c4', spot: '#ffc62e', body: '#ffe58c', el: { elec: 6 }, desc: 'ときどき ピリッと する' },
    star: { name: 'ほしの たまご', shell: '#fffbe8', spot: '#ffcf3f', body: '#fff1c4', el: { light: 8 }, desc: 'よるに ひかる', unlock: 'ストーリー 4しょうを クリアすると みつかる' },
    shadow: { name: 'くろい たまご', shell: '#cfc4e6', spot: '#6b51b0', body: '#bba9de', el: {}, dark: 8, desc: 'かなしい きおくの たまご', unlock: 'あいぼうを みおくると みつかる' },
  };
  HG.EGG_KEYS = ['white', 'red', 'blue', 'green', 'yellow', 'star', 'shadow'];

  // ───────── たべもの ─────────
  // kind: meal（ごはん） / snack（おやつ）
  HG.FOODS = [
    { id: 'onigiri', name: 'おにぎり', emoji: '🍙', kind: 'meal', price: 0, hunger: 25, mood: 3, weight: 1, el: {}, tr: {}, note: 'ただ。いつでも たべられる' },
    { id: 'meat', name: 'おにく', emoji: '🍖', kind: 'meal', price: 12, hunger: 32, mood: 5, weight: 1, el: { fire: 4 }, tr: { atk: 0.6 }, note: 'ほのお・こうげき' },
    { id: 'fish', name: 'おさかな', emoji: '🐟', kind: 'meal', price: 12, hunger: 32, mood: 5, weight: 1, el: { water: 4 }, tr: { def: 0.6 }, note: 'みず・ぼうぎょ' },
    { id: 'salad', name: 'サラダ', emoji: '🥗', kind: 'meal', price: 12, hunger: 30, mood: 3, weight: 0, el: { grass: 4 }, tr: { hp: 0.6 }, note: 'くさ・たいりょく' },
    { id: 'milk', name: 'ぎゅうにゅう', emoji: '🥛', kind: 'meal', price: 8, hunger: 18, mood: 3, weight: 1, el: {}, tr: { hp: 0.3, def: 0.3 }, note: 'たいりょく・ぼうぎょ' },
    { id: 'candy', name: 'パチパチキャンディ', emoji: '🍬', kind: 'snack', price: 15, hunger: 6, mood: 16, weight: 2, el: { elec: 4 }, tr: { spd: 0.6 }, note: 'でんき・すばやさ' },
    { id: 'konpeito', name: 'ほしの こんぺいとう', emoji: '🌟', kind: 'snack', price: 20, hunger: 6, mood: 16, weight: 1, el: { light: 4 }, tr: { int: 0.6 }, note: 'ひかり・かしこさ' },
    { id: 'cake', name: 'ショートケーキ', emoji: '🍰', kind: 'snack', price: 25, hunger: 10, mood: 28, weight: 3, el: {}, tr: {}, style: { cute: 2 }, note: 'ごきげん だいアップ' },
  ];
  HG.foodById = (id) => HG.FOODS.find((f) => f.id === id);

  // ───────── どうぐ ─────────
  HG.ITEMS = {
    medicine: { name: 'くすり', emoji: '💊', price: 30, desc: 'びょうきを なおす' },
    potion: { name: 'きずぐすり', emoji: '🩹', price: 50, desc: 'バトルちゅうに HPを 35% かいふく（1かいの バトルで 2こまで）' },
    drink: { name: 'げんきドリンク', emoji: '🧃', price: 30, desc: 'ねむけを 40 へらす（ねる じかんを とばせる）' },
  };

  // ───────── きせかえ ─────────
  HG.ACCS = {
    cap: { name: 'ぼうし', slot: 'head', price: 120 },
    ribbon: { name: 'おおきな リボン', slot: 'head', price: 120 },
    flower: { name: 'おはなかざり', slot: 'head', price: 100 },
    headphones: { name: 'ヘッドホン', slot: 'head', price: 200 },
    crown: { name: 'おうかん', slot: 'head', price: 400 },
    glasses: { name: 'まるめがね', slot: 'face', price: 100 },
    sunglasses: { name: 'サングラス', slot: 'face', price: 180 },
    scarf: { name: 'マフラー', slot: 'neck', price: 150 },
    bowtie: { name: 'ちょうネクタイ', slot: 'neck', price: 120 },
  };

  // ───────── せいちょう だんかい ─────────
  HG.STAGES = [
    { name: 'たまご' },
    { name: 'ベビー', evoLv: 5, minAge: 15 * 60e3, r: 20 },
    { name: 'こども', evoLv: 15, minAge: 3 * 3600e3, r: 24 },
    { name: 'おとな', evoLv: 30, minAge: 24 * 3600e3, r: 28 },
    { name: 'きわみ', r: 31 },
  ];

  // すがたの なまえ = タイプの ことば + スタイルの ことば
  HG.TYPE_ADJ = { normal: 'ふつうの', fire: 'もえる', water: 'しずくの', grass: 'もりの', elec: 'ピリピリ', light: 'ひかりの', dark: 'やみの' };
  HG.STYLE_NOUN = {
    2: { cute: 'ぷにっこ', cool: 'ちびナイト', smart: 'ちびはかせ', tough: 'わんぱく' },
    3: { cute: 'アイドル', cool: 'ナイト', smart: 'まほうつかい', tough: 'ファイター' },
    4: { cute: 'てんし', cool: 'ドラゴン', smart: 'だいけんじゃ', tough: 'はおう' },
  };
  HG.formKey = (look) => (look.stage <= 1 ? 'b_' + look.egg : look.stage + '_' + look.type + '_' + look.style);
  HG.formName = (look) => {
    if (look.stage === 0) return 'たまご';
    if (look.stage === 1) return HG.EGGS[look.egg].name.replace(' たまご', '').replace('の', '') + ' ベビー';
    return HG.TYPE_ADJ[look.type] + ' ' + HG.STYLE_NOUN[look.stage][look.style];
  };

  // ───────── わざ ─────────
  // kind: proj(とびどうぐ) melee(ちかく) dash(とっしん) aoe_self(まわり) aoe_target(ねらった ばしょ)
  //       beam(ビーム) cone(ほうしゃ) wave(なみ) zone(ばに のこる) ring(ひろがる わ) heal buff blink burrow trap radial
  // wind = ためじかん（びょう） cd = クールタイム（びょう）
  const M = (HG.MOVES = {
    // ノーマル
    tackle: { name: 'たいあたり', type: 'normal', kind: 'dash', power: 40, cd: 2.2, wind: 0.12, dist: 150, speed: 900, knock: 170, desc: 'まっすぐ ぶつかる' },
    scratch: { name: 'ひっかく', type: 'normal', kind: 'melee', power: 34, cd: 1.3, wind: 0.16, range: 70, arc: 110, knock: 90, desc: 'めのまえを ひっかく' },
    quick: { name: 'でんこうせっか', type: 'normal', kind: 'dash', power: 30, cd: 3.4, wind: 0, dist: 210, speed: 1300, iframe: true, knock: 120, desc: 'ためなしで すばやく とつげき。むてき つき' },
    stomp: { name: 'ジャンプふみつけ', type: 'normal', kind: 'leap', power: 62, cd: 6, wind: 0.3, dist: 230, air: 0.45, radius: 82, knock: 220, desc: 'とびあがって あいての ところに ふりおりる' },
    megapunch: { name: 'メガトンパンチ', type: 'normal', kind: 'melee', power: 95, cd: 7, wind: 0.45, range: 78, arc: 90, knock: 320, desc: 'ためて おもいっきり なぐる' },
    roar: { name: 'おたけび', type: 'normal', kind: 'aoe_self', power: 0, cd: 12, wind: 0.3, radius: 170, status: { charm: 1 }, desc: 'まわりの あいての こうげきを さげる' },
    protect: { name: 'まもる', type: 'normal', kind: 'buff', buff: 'shield', dur: 0.9, cd: 9, wind: 0, desc: 'すこしの あいだ どんな こうげきも ふせぐ' },
    hyper: { name: 'はかいこうせん', type: 'normal', kind: 'beam', power: 135, cd: 15, wind: 1.1, len: 620, width: 50, desc: 'ながく ためて ふとい ビーム' },

    // ほのお
    hinoko: { name: 'ひのこ', type: 'fire', kind: 'proj', power: 32, cd: 1.5, wind: 0.14, speed: 520, r: 10, range: 430, status: { burn: 0.15 }, vfx: 'fire', desc: 'ちいさな ひのたまを とばす' },
    funka: { name: 'ふんか', type: 'fire', kind: 'aoe_target', power: 82, cd: 8, wind: 0.25, delay: 0.75, radius: 82, maxRange: 380, status: { burn: 0.3 }, vfx: 'fire', desc: 'あいての あしもとを ばくはつ させる' },
    kaen: { name: 'かえんほうしゃ', type: 'fire', kind: 'cone', power: 18, cd: 7, wind: 0.25, dur: 0.8, tick: 0.16, range: 175, arc: 50, status: { burn: 0.12 }, vfx: 'fire', desc: 'ほのおを ふきつづける' },
    flare: { name: 'フレアドライブ', type: 'fire', kind: 'dash', power: 80, cd: 8, wind: 0.28, dist: 240, speed: 1000, trail: 'fire', knock: 260, vfx: 'fire', desc: 'ほのおを まとって つっこむ。あとに ほのおが のこる' },
    meteor: { name: 'メテオ', type: 'fire', kind: 'aoe_target', power: 52, cd: 14, wind: 0.4, delay: 0.85, stagger: 0.12, count: 5, scatter: 120, radius: 58, maxRange: 420, status: { burn: 0.2 }, vfx: 'fire', desc: 'いんせきを たくさん ふらせる' },
    firering: { name: 'ほのおのわ', type: 'fire', kind: 'ring', power: 72, cd: 12, wind: 0.35, r1: 240, dur: 0.6, thick: 28, status: { burn: 0.35 }, vfx: 'fire', desc: 'ほのおの わが ひろがる' },

    // みず
    mizudeppou: { name: 'みずでっぽう', type: 'water', kind: 'proj', power: 30, cd: 1.3, wind: 0.12, speed: 600, r: 10, range: 420, knock: 150, vfx: 'water', desc: 'いきおいよく みずを とばす' },
    bubble: { name: 'バブルこうせん', type: 'water', kind: 'proj', power: 22, cd: 4, wind: 0.2, speed: 260, r: 14, range: 380, count: 3, spread: 34, status: { slow: 0.4 }, vfx: 'bubble', desc: 'ゆっくり すすむ あわを 3つ。あたると おそくなる' },
    oonami: { name: 'おおなみ', type: 'water', kind: 'wave', power: 74, cd: 9, wind: 0.35, speed: 330, width: 230, thick: 40, range: 440, knock: 280, vfx: 'water', desc: 'はばの ひろい なみで おしながす' },
    aquaring: { name: 'アクアリング', type: 'water', kind: 'buff', buff: 'regen', dur: 4, amount: 0.24, cd: 16, wind: 0.2, desc: 'すこしずつ HPが かいふくする' },
    uzushio: { name: 'うずしお', type: 'water', kind: 'zone', power: 14, cd: 13, wind: 0.3, delay: 0.4, radius: 90, dur: 3, tick: 0.4, pull: 120, maxRange: 380, status: { slow: 0.5 }, vfx: 'water', desc: 'うずまきで すいよせる' },
    hydro: { name: 'ハイドロカノン', type: 'water', kind: 'beam', power: 128, cd: 15, wind: 0.9, len: 600, width: 46, knock: 300, vfx: 'water', desc: 'ためて すごい みずの ビーム' },

    // くさ
    happa: { name: 'はっぱカッター', type: 'grass', kind: 'proj', power: 19, cd: 2, wind: 0.16, speed: 480, r: 9, range: 420, count: 3, spread: 22, vfx: 'leaf', desc: 'はっぱを 3まい とばす' },
    muchi: { name: 'つるのムチ', type: 'grass', kind: 'line', power: 48, cd: 3.5, wind: 0.22, len: 175, width: 26, status: { slow: 0.25 }, knock: 160, vfx: 'grass', desc: 'ながい つるで たたく' },
    nemuri: { name: 'ねむりごな', type: 'grass', kind: 'zone', power: 6, cd: 12, wind: 0.3, delay: 0.5, radius: 82, dur: 2.5, tick: 0.5, maxRange: 360, status: { stun: 0.35 }, vfx: 'spore', desc: 'ねむくなる こなを まく' },
    kougousei: { name: 'こうごうせい', type: 'grass', kind: 'heal', amount: 0.28, cd: 18, wind: 0.5, desc: 'おひさまの ちからで かいふく' },
    solar: { name: 'ソーラービーム', type: 'grass', kind: 'beam', power: 138, cd: 14, wind: 1.1, len: 620, width: 54, vfx: 'grass', desc: 'ながく ためて ふとい ひかりの ビーム' },
    hanafubuki: { name: 'はなふぶき', type: 'grass', kind: 'aura', power: 16, cd: 16, wind: 0.2, radius: 140, dur: 3, tick: 0.3, vfx: 'petal', desc: 'まわりに はなびらの あらしを まとう' },

    // でんき
    shock: { name: 'でんきショック', type: 'elec', kind: 'aoe_target', power: 28, cd: 1.4, wind: 0.08, delay: 0.2, radius: 34, maxRange: 240, status: { stun: 0.1 }, vfx: 'elec', desc: 'ちかくの あいてに すぐ でんきを おとす' },
    houden: { name: 'ほうでん', type: 'elec', kind: 'aoe_self', power: 68, cd: 7, wind: 0.42, radius: 128, status: { stun: 0.2 }, vfx: 'elec', desc: 'まわり ぜんぶに でんきを はなつ' },
    eleball: { name: 'エレキボール', type: 'elec', kind: 'proj', power: 42, cd: 5, wind: 0.25, speed: 330, r: 15, range: 620, homing: 2.2, vfx: 'elec', desc: 'あいてを おいかける でんきの たま' },
    inazuma: { name: 'いなずまダッシュ', type: 'elec', kind: 'dash', power: 55, cd: 6, wind: 0.08, dist: 270, speed: 1450, iframe: true, knock: 180, vfx: 'elec', desc: 'むてきで いっきに かけぬける' },
    kaminari: { name: 'かみなり', type: 'elec', kind: 'aoe_target', power: 104, cd: 10, wind: 0.3, delay: 0.65, radius: 56, maxRange: 420, status: { stun: 0.3 }, vfx: 'elec', desc: 'ねらった ばしょに かみなりを おとす' },
    raijin: { name: 'らいじんらっか', type: 'elec', kind: 'aoe_target', power: 44, cd: 15, wind: 0.3, delay: 0.5, stagger: 0.42, count: 6, track: true, radius: 50, maxRange: 480, status: { stun: 0.12 }, vfx: 'elec', desc: 'あいてを おいかけて かみなりを 6かい おとす' },

    // ひかり
    hikaridama: { name: 'ひかりのたま', type: 'light', kind: 'proj', power: 34, cd: 1.8, wind: 0.18, speed: 360, r: 11, range: 520, homing: 2.4, vfx: 'light', desc: 'あいてを すこし おいかける ひかり' },
    flash: { name: 'フラッシュ', type: 'light', kind: 'melee', power: 14, cd: 11, wind: 0.3, range: 165, arc: 70, status: { stun: 1 }, vfx: 'light', desc: 'まぶしい ひかりで うごきを とめる' },
    hoshifuru: { name: 'ほしふる', type: 'light', kind: 'aoe_target', power: 34, cd: 11, wind: 0.3, delay: 0.6, stagger: 0.1, count: 5, scatter: 110, radius: 42, maxRange: 420, vfx: 'star', desc: 'ほしを たくさん ふらせる' },
    iyashi: { name: 'いやしのひかり', type: 'light', kind: 'heal', amount: 0.3, cd: 18, wind: 0.4, desc: 'HPを かいふくする' },
    kabe: { name: 'ひかりのかべ', type: 'light', kind: 'buff', buff: 'barrier', dur: 4, cd: 15, wind: 0.15, desc: 'うける ダメージを はんぶんに する' },
    tenshi: { name: 'てんしのはね', type: 'light', kind: 'radial', power: 26, cd: 14, wind: 0.35, count: 12, speed: 420, r: 10, range: 380, heal: 0.1, vfx: 'feather', desc: 'まわりに はねを とばして すこし かいふく' },

    // やみ
    shadowball: { name: 'シャドーボール', type: 'dark', kind: 'proj', power: 55, cd: 2.8, wind: 0.3, speed: 400, r: 15, range: 460, status: { weak: 0.2 }, vfx: 'dark', desc: 'かげの たまを とばす' },
    kageuchi: { name: 'かげうち', type: 'dark', kind: 'blink', power: 52, cd: 6.5, wind: 0.15, range: 360, arc: 120, reach: 70, vfx: 'dark', desc: 'あいての うしろに まわりこんで こうげき' },
    yaminouzu: { name: 'やみのうず', type: 'dark', kind: 'zone', power: 12, cd: 13, wind: 0.3, delay: 0.35, radius: 95, dur: 3.2, tick: 0.35, pull: 160, maxRange: 400, vfx: 'dark', desc: 'すいこむ やみの うずを つくる' },
    noroi: { name: 'のろい', type: 'dark', kind: 'aoe_target', power: 20, cd: 12, wind: 0.3, delay: 0.5, radius: 70, maxRange: 400, status: { weak: 1, charm: 1 }, vfx: 'dark', desc: 'あいての こうげきと ぼうぎょを さげる' },
    akumu: { name: 'あくむのわ', type: 'dark', kind: 'ring', power: 72, cd: 12, wind: 0.5, r1: 270, dur: 0.75, thick: 30, vfx: 'dark', desc: 'あくむの わが ひろがる' },
    darkhole: { name: 'ダークホール', type: 'dark', kind: 'zone', power: 0, burstPower: 120, cd: 16, wind: 0.35, delay: 0.6, radius: 120, dur: 2.4, tick: 0.3, pull: 200, maxRange: 420, vfx: 'dark', desc: 'すいこんで さいごに ばくはつ' },

    // スタイルの わざ — かわいい
    meromero: { name: 'メロメロ', type: 'normal', kind: 'melee', power: 10, cd: 10, wind: 0.25, range: 185, arc: 60, status: { charm: 1, slow: 1 }, vfx: 'heart', style: 'cute', desc: 'あいての こうげきと すばやさを さげる' },
    ouen: { name: 'おうえんダンス', type: 'normal', kind: 'buff', buff: 'cheer', dur: 4, amount: 0.15, cd: 16, wind: 0.3, style: 'cute', desc: 'HPかいふく ＋ すばやさ アップ' },
    punipuni: { name: 'ぷにぷにバリア', type: 'normal', kind: 'buff', buff: 'reflect', dur: 1.6, cd: 14, wind: 0, style: 'cute', desc: 'とびどうぐを はねかえす' },
    kirakira: { name: 'キラキラシャワー', type: 'light', kind: 'aoe_self', power: 52, cd: 11, wind: 0.3, radius: 145, heal: 0.1, vfx: 'star', style: 'cute', desc: 'まわりに キラキラ。すこし かいふく' },
    // かっこいい
    shoot: { name: 'スーパーシュート', type: 'normal', kind: 'proj', power: 70, cd: 6, wind: 0.35, speed: 760, r: 16, range: 520, knock: 360, vfx: 'ball', style: 'cool', desc: 'ボールを おもいきり けりこむ' },
    renzoku: { name: 'れんぞくキック', type: 'normal', kind: 'melee', power: 22, cd: 4, wind: 0.12, range: 76, arc: 100, hits: 3, gap: 0.12, knock: 60, style: 'cool', desc: '3かい つづけて けりを いれる' },
    dashstrike: { name: 'ダッシュストライク', type: 'normal', kind: 'dash', power: 70, cd: 6.5, wind: 0.1, dist: 250, speed: 1200, iframe: true, knock: 240, style: 'cool', desc: 'むてきで つっこんで きりさく' },
    overhead: { name: 'オーバーヘッド', type: 'normal', kind: 'leap', power: 96, cd: 10, wind: 0.25, dist: 260, air: 0.5, radius: 76, knock: 300, style: 'cool', desc: 'とびあがって ボールを たたきこむ' },
    // かしこい
    teleport: { name: 'テレポート', type: 'normal', kind: 'teleport', cd: 7, wind: 0, dist: 230, style: 'smart', desc: 'あいてから はなれた ばしょに しゅんかんいどう' },
    psywave: { name: 'サイコウェーブ', type: 'normal', kind: 'ring', power: 50, cd: 9, wind: 0.3, r1: 230, dur: 0.55, thick: 26, status: { slow: 0.6 }, vfx: 'psy', style: 'smart', desc: 'ふしぎな なみが ひろがる' },
    barrier: { name: 'バリア', type: 'normal', kind: 'buff', buff: 'shield', dur: 1.2, cd: 10, wind: 0, style: 'smart', desc: 'しばらく こうげきを ふせぐ' },
    trap: { name: 'ふしぎなワナ', type: 'normal', kind: 'trap', power: 46, cd: 12, wind: 0.2, count: 3, radius: 62, life: 9, status: { stun: 0.6 }, vfx: 'psy', style: 'smart', desc: 'ちかづくと ばくはつする ワナを 3つ おく' },
    // たくましい
    bulkup: { name: 'ビルドアップ', type: 'normal', kind: 'buff', buff: 'power', dur: 6, cd: 15, wind: 0.3, style: 'tough', desc: 'こうげきと ぼうぎょを アップ' },
    jinarashi: { name: 'じならし', type: 'normal', kind: 'aoe_self', power: 70, cd: 9, wind: 0.55, radius: 155, status: { slow: 1 }, knock: 160, vfx: 'rock', style: 'tough', desc: 'じめんを ゆらして まわりを おそくする' },
    butikamashi: { name: 'ぶちかまし', type: 'normal', kind: 'dash', power: 86, cd: 8, wind: 0.3, dist: 210, speed: 950, armor: true, knock: 380, style: 'tough', desc: 'ふっとばす たいあたり。とちゅうで ひるまない' },
    counter: { name: 'カウンター', type: 'normal', kind: 'buff', buff: 'counter', dur: 0.9, power: 92, radius: 100, cd: 12, wind: 0, style: 'tough', desc: 'こうげきを うけとめて やりかえす' },

    // ボスせんよう
    b_acorn: { name: 'どんぐりあめ', type: 'grass', kind: 'aoe_target', power: 40, cd: 5, wind: 0.35, delay: 0.95, stagger: 0.1, count: 4, scatter: 120, radius: 46, maxRange: 480, vfx: 'acorn', boss: true },
    b_roll: { name: 'ごろごろローリング', type: 'grass', kind: 'dash', power: 62, cd: 6, wind: 0.6, dist: 340, speed: 760, knock: 260, boss: true },
    b_tama: { name: 'たまはっしゃ', type: 'light', kind: 'radial', power: 26, cd: 5, wind: 0.5, count: 10, speed: 280, r: 12, range: 520, vfx: 'ball2', boss: true },
    b_bell: { name: 'あたりの かね', type: 'light', kind: 'ring', power: 55, cd: 7, wind: 0.55, r1: 280, dur: 0.8, thick: 30, vfx: 'light', boss: true },
    b_gold: { name: 'きんの たま', type: 'light', kind: 'proj', power: 50, cd: 4, wind: 0.3, speed: 300, r: 16, range: 640, homing: 2.2, vfx: 'ball2', boss: true },
    b_jishin: { name: 'じしん', type: 'water', kind: 'aoe_self', power: 70, cd: 7.5, wind: 1.0, radius: 180, status: { slow: 1 }, knock: 200, vfx: 'rock', boss: true },
    b_spread: { name: 'みずでっぽうれんしゃ', type: 'water', kind: 'proj', power: 22, cd: 3, wind: 0.3, speed: 520, r: 11, range: 520, count: 5, spread: 60, vfx: 'water', boss: true },
    b_keys: { name: 'けんばんビーム', type: 'dark', kind: 'beams', power: 64, cd: 6, wind: 0.85, len: 640, width: 36, count: 3, gap: 110, vfx: 'dark', boss: true },
    b_note: { name: 'おんぷの たま', type: 'dark', kind: 'proj', power: 30, cd: 4, wind: 0.3, speed: 300, r: 12, range: 620, count: 3, spread: 50, homing: 1.6, vfx: 'note', boss: true },
    b_heat: { name: 'ねっせんビーム', type: 'fire', kind: 'beam', power: 92, cd: 7, wind: 0.8, len: 640, width: 44, status: { burn: 0.5 }, vfx: 'fire', boss: true },
    b_flare: { name: 'サンフレア', type: 'fire', kind: 'radial', power: 34, cd: 6, wind: 0.6, count: 16, speed: 300, r: 12, range: 560, status: { burn: 0.2 }, vfx: 'fire', boss: true },
    b_taiko: { name: 'たいこショック', type: 'elec', kind: 'ring', power: 38, cd: 6, wind: 0.5, r1: 300, dur: 0.7, thick: 30, count: 1, gap: 0.5, status: { stun: 0.15 }, vfx: 'elec', boss: true },
    b_cloud: { name: 'わたぐも', type: 'light', kind: 'zone', power: 10, cd: 8, wind: 0.4, delay: 0.5, radius: 90, dur: 4, tick: 0.5, count: 3, scatter: 160, maxRange: 480, status: { slow: 1 }, vfx: 'cloud', boss: true },
    b_sweet: { name: 'あまあまビーム', type: 'light', kind: 'beam', power: 88, cd: 7, wind: 0.75, len: 640, width: 48, status: { charm: 0.5 }, vfx: 'light', boss: true },
    b_shadow3: { name: 'かげの さんれんだん', type: 'dark', kind: 'proj', power: 38, cd: 3.4, wind: 0.35, speed: 420, r: 15, range: 620, count: 3, spread: 36, vfx: 'dark', boss: true },
    b_kage: { name: 'かげわたり', type: 'dark', kind: 'blink', power: 50, cd: 6.5, wind: 0.55, range: 400, arc: 140, reach: 84, vfx: 'dark', boss: true },
    b_forget: { name: 'わすれさせる', type: 'dark', kind: 'radial', power: 36, cd: 6, wind: 0.7, count: 20, speed: 260, r: 12, range: 600, vfx: 'dark', boss: true },
  });
  for (const id in M) M[id].id = id;

  // おぼえる わざ
  HG.LEARN_TYPE = {
    normal: ['stomp', 'quick', 'megapunch', 'roar', 'protect', 'hyper'],
    fire: ['hinoko', 'funka', 'kaen', 'flare', 'meteor', 'firering'],
    water: ['mizudeppou', 'bubble', 'oonami', 'aquaring', 'uzushio', 'hydro'],
    grass: ['happa', 'muchi', 'nemuri', 'kougousei', 'solar', 'hanafubuki'],
    elec: ['shock', 'houden', 'eleball', 'inazuma', 'kaminari', 'raijin'],
    light: ['hikaridama', 'flash', 'hoshifuru', 'iyashi', 'kabe', 'tenshi'],
    dark: ['shadowball', 'kageuchi', 'yaminouzu', 'noroi', 'akumu', 'darkhole'],
  };
  HG.TYPE_LEARN_LV = [5, 8, 15, 21, 27, 30];
  HG.LEARN_STYLE = {
    cute: ['meromero', 'ouen', 'punipuni', 'kirakira'],
    cool: ['shoot', 'renzoku', 'dashstrike', 'overhead'],
    smart: ['teleport', 'psywave', 'barrier', 'trap'],
    tough: ['bulkup', 'jinarashi', 'butikamashi', 'counter'],
  };
  HG.STYLE_LEARN_LV = [10, 18, 24, 35];
  HG.BASE_LEARN = [
    [1, 'tackle'],
    [3, 'scratch'],
    [12, 'quick'],
    [40, 'protect'],
  ];

  // ───────── ミニゲーム ─────────
  HG.MG_CATS = {
    sports: { name: 'スポーツ', color: '#3d8bff', style: 'cool', note: 'かっこいい すがたに なりやすい' },
    play: { name: 'ままごと', color: '#ff7eb6', style: 'cute', note: 'かわいい すがたに なりやすい' },
    brain: { name: 'あたま', color: '#9b6bff', style: 'smart', note: 'かしこい すがたに なりやすい' },
  };
  HG.MINIGAMES = [
    { id: 'pk', name: 'PKキック', cat: 'sports', tr: { atk: 2, spd: 0.6 }, desc: 'ねらいと つよさを きめて ゴールを ねらう' },
    { id: 'rope', name: 'なわとび', cat: 'sports', tr: { spd: 2, hp: 0.6 }, desc: 'なわが したに きた ときに タップで ジャンプ' },
    { id: 'dodge', name: 'ドッジボール', cat: 'sports', tr: { spd: 1, def: 1.6 }, desc: 'とんでくる ボールを よけつづける' },
    { id: 'cook', name: 'おりょうりごっこ', cat: 'play', tr: { hp: 2, int: 0.6 }, desc: 'レシピの じゅんばんに ざいりょうを いれる' },
    { id: 'shop', name: 'おみせやさんごっこ', cat: 'play', tr: { def: 2, int: 0.6 }, desc: 'おきゃくさんの ちゅうもんを ふくろに つめる' },
    { id: 'dress', name: 'おめかしごっこ', cat: 'play', tr: { hp: 1, def: 1, int: 0.6 }, desc: 'みせてもらった おしゃれを おぼえて まねする' },
    { id: 'memory', name: 'しんけいすいじゃく', cat: 'brain', tr: { int: 2.4 }, desc: 'おなじ えの カードを そろえる' },
    { id: 'math', name: 'けいさんレース', cat: 'brain', tr: { int: 1.8, atk: 0.6 }, desc: 'けいさんの こたえを えらぶ' },
  ];

  // ───────── バトルの ばしょ ─────────
  HG.ARENAS = {
    yard: { name: 'おうちの にわ', ground: '#9fdc7c', ground2: '#8fcf6b', deco: 'yard' },
    park: { name: 'こうえん', ground: '#a8dd7a', ground2: '#96d066', deco: 'park', obstacles: [[140, 200, 26], [470, 430, 26]] },
    street: { name: 'しょうてんがい', ground: '#e9d6b8', ground2: '#dcc5a2', deco: 'street', obstacles: [[300, 150, 22]] },
    river: { name: 'かわら', ground: '#b7d98a', ground2: '#a3cb74', deco: 'river', obstacles: [[150, 470, 24], [460, 210, 24]] },
    school: { name: 'よるの がっこう', ground: '#8a6a5a', ground2: '#7d5e4f', deco: 'school', dark: true },
    beach: { name: 'なつの うみ', ground: '#ffe2a8', ground2: '#f8d590', deco: 'beach', obstacles: [[120, 160, 22], [490, 480, 22]] },
    mountain: { name: 'かみなりやま', ground: '#a4a39c', ground2: '#96958d', deco: 'mountain', obstacles: [[300, 330, 30]] },
    festival: { name: 'なつまつりの よる', ground: '#5b4a7a', ground2: '#52436f', deco: 'festival', dark: true },
    sky: { name: 'わすれものの くに', ground: '#3d3466', ground2: '#352d5a', deco: 'sky', dark: true },
    dream: { name: 'ゆめの とう', ground: '#c9b8ff', ground2: '#bba8f7', deco: 'dream' },
    stadium: { name: 'たいせん スタジアム', ground: '#8fd3c8', ground2: '#7cc6ba', deco: 'stadium' },
  };

  // ───────── てき ─────────
  // look があるものは ジェネレーターで えがく。art があるものは ボスの えを つかう
  HG.ENEMIES = {
    robo: { name: 'とっくんロボ', art: 'robo', type: 'normal', style: 'tough', moves: ['b_spread_t', 'b_drop_t'], size: 30, tame: true },
    nora_puni: { name: 'ノラぷに', look: { stage: 1, egg: 'white', type: 'normal', style: 'cute', dna: 3 } },
    nora_leaf: { name: 'ノラはっぱ', look: { stage: 2, egg: 'green', type: 'grass', style: 'cute', dna: 8 } },
    donguri: { name: 'どんぐりだいおう', art: 'donguri', type: 'grass', style: 'tough', boss: true, size: 46, moves: ['b_acorn', 'b_roll', 'happa'], phases: [{ at: 0.5, cdMul: 0.8, say: 'どんぐりを なめるなー！' }] },

    nora_biri: { name: 'ノラびりり', look: { stage: 2, egg: 'yellow', type: 'elec', style: 'cool', dna: 5 } },
    nora_pika: { name: 'ノラぴかり', look: { stage: 2, egg: 'star', type: 'light', style: 'cute', dna: 9 } },
    nora_bo: { name: 'ノラぼっ', look: { stage: 2, egg: 'red', type: 'fire', style: 'tough', dna: 4 } },
    garagara: { name: 'ガラガラくじだいおう', art: 'garagara', type: 'light', style: 'smart', boss: true, size: 48, moves: ['b_tama', 'b_bell', 'b_gold'], phases: [{ at: 0.5, cdMul: 0.75, say: 'だいあたりを だしてやる！', add: ['hoshifuru'] }] },

    nora_shizuku: { name: 'ノラしずく', look: { stage: 2, egg: 'blue', type: 'water', style: 'smart', dna: 6 } },
    nora_pocha: { name: 'ノラぽちゃ', look: { stage: 2, egg: 'blue', type: 'water', style: 'cute', dna: 12 } },
    nora_kusa: { name: 'ノラくさ', look: { stage: 2, egg: 'green', type: 'grass', style: 'tough', dna: 7 } },
    namazu: { name: 'かわのヌシ オオナマズ', art: 'namazu', type: 'water', style: 'tough', boss: true, size: 52, moves: ['b_jishin', 'b_spread', 'oonami'], phases: [{ at: 0.5, cdMul: 0.8, say: 'かわを わすれた ものたちめ…！', add: ['uzushio'] }] },

    nora_kage: { name: 'ノラかげ', look: { stage: 3, egg: 'shadow', type: 'dark', style: 'smart', dna: 2 } },
    nora_kirari: { name: 'ノラきらり', look: { stage: 3, egg: 'star', type: 'light', style: 'cool', dna: 14 } },
    nora_kagechibi: { name: 'ノラかげっこ', look: { stage: 2, egg: 'shadow', type: 'dark', style: 'cute', dna: 15 } },
    piano: { name: 'おんがくしつの ピアノおばけ', art: 'piano', type: 'dark', style: 'smart', boss: true, size: 50, moves: ['b_keys', 'b_note', 'akumu'], phases: [{ at: 0.5, cdMul: 0.75, say: 'もっと ひいて… もっと きいて…！', add: ['yaminouzu'] }] },

    nora_nami: { name: 'ノラなみのこ', look: { stage: 3, egg: 'blue', type: 'water', style: 'cool', dna: 21 } },
    nora_homura: { name: 'ノラほむら', look: { stage: 3, egg: 'red', type: 'fire', style: 'cute', dna: 22 } },
    nora_midori: { name: 'ノラみどり', look: { stage: 3, egg: 'green', type: 'grass', style: 'smart', dna: 23 } },
    sun: { name: 'まなつの たいようくん', art: 'sun', type: 'fire', style: 'cool', boss: true, size: 52, moves: ['meteor', 'b_heat', 'firering'], phases: [{ at: 0.5, cdMul: 0.75, say: 'みんな そとで あそべー！', add: ['b_flare'] }] },

    nora_ikazuchi: { name: 'ノラいかずち', look: { stage: 3, egg: 'yellow', type: 'elec', style: 'tough', dna: 31 } },
    nora_tsurara: { name: 'ノラつらら', look: { stage: 3, egg: 'blue', type: 'water', style: 'tough', dna: 32 } },
    nora_biribiri: { name: 'ノラびりびり', look: { stage: 3, egg: 'yellow', type: 'elec', style: 'cute', dna: 33 } },
    raijin: { name: 'らいじんドラム', art: 'raijin', type: 'elec', style: 'tough', boss: true, size: 52, moves: ['raijin', 'houden', 'b_taiko', 'eleball'], phases: [{ at: 0.5, cdMul: 0.75, say: 'ドンドコ ドーン！', add: ['kaminari'] }] },

    nora_chochin: { name: 'ノラちょうちん', look: { stage: 3, egg: 'red', type: 'fire', style: 'smart', dna: 41 } },
    nora_kingyo: { name: 'ノラきんぎょ', look: { stage: 3, egg: 'red', type: 'water', style: 'cute', dna: 42 } },
    nora_hanabi: { name: 'ノラはなび', look: { stage: 3, egg: 'red', type: 'fire', style: 'cool', dna: 43 } },
    wataame: { name: 'わたあめドラゴン', art: 'wataame', type: 'light', style: 'cute', boss: true, size: 54, moves: ['b_cloud', 'b_sweet', 'hoshifuru'], phases: [{ at: 0.5, cdMul: 0.75, say: 'ふわふわ だいすき でしょ？', add: ['tenshi'] }] },

    lost_plush: { name: 'わすれられた ぬいぐるみ', look: { stage: 4, egg: 'shadow', type: 'dark', style: 'cute', dna: 51 } },
    lost_robo: { name: 'こわれた おもちゃロボ', look: { stage: 4, egg: 'yellow', type: 'elec', style: 'tough', dna: 52 } },
    lost_kasa: { name: 'わすれられた かさ', look: { stage: 4, egg: 'blue', type: 'water', style: 'smart', dna: 53 } },
    king: {
      name: 'ワスレモノの王', art: 'king', type: 'dark', style: 'smart', boss: true, size: 60, moves: ['b_shadow3', 'b_kage', 'yaminouzu'],
      phases: [
        { at: 0.66, cdMul: 0.85, say: 'わすれられた ものたちよ… きて くれ！', summon: ['lost_kasa'], add: ['darkhole', 'akumu'] },
        { at: 0.33, cdMul: 0.7, say: 'わすれられるのは… もう いやなんだ！', add: ['b_forget'], dim: true },
      ],
    },
  };
  // とっくんロボ用
  M.b_spread_t = { id: 'b_spread_t', name: 'ゴムだん', type: 'normal', kind: 'proj', power: 12, cd: 3.4, wind: 0.6, speed: 240, r: 12, range: 520, count: 3, spread: 50, vfx: 'ball2', boss: true };
  M.b_drop_t = { id: 'b_drop_t', name: 'おもりおとし', type: 'normal', kind: 'aoe_target', power: 14, cd: 4.6, wind: 0.4, delay: 1.3, radius: 62, maxRange: 600, vfx: 'rock', boss: true };

  // ───────── ストーリー ─────────
  // かいわの ばめん: who = 'sensei' | 'pet' | 'enemy' | 'narr'
  HG.STORY = [
    {
      id: 0, title: 'はじめての とっくん', arena: 'yard', rec: 1, tutorial: true,
      intro: [
        ['sensei', 'わたしは どうぶつびょういんの モリ。きょうから よろしくね。'],
        ['sensei', 'さいきん まちに「くろいもや」が でるの。もやに のまれた いきものは あばれだして しまう。'],
        ['sensei', 'たたかって もやを はらって あげて。…でもね、もやの なかで たおれたら、もう かえって これないの。'],
        ['sensei', 'だから まずは とっくん。この ロボは たおれても だいじょうぶ。'],
        ['narr', 'ジョイスティックで うごく。わざボタンで こうげき。あかい はんいが でたら「よける」で かわそう。'],
      ],
      battles: [{ enemies: [['robo', 2]], lethal: false }],
      outro: [['sensei', 'じょうずね！ じゅんびが できたら こうえんに いってみて。もやが でたって きいたの。']],
    },
    {
      id: 1, title: 'こうえんの くろいもや', arena: 'park', rec: 4,
      intro: [
        ['narr', 'こうえんの すなばに、くろいもやが ただよっている。'],
        ['pet', '…！'],
        ['sensei', 'もやの なかの いきものは、ほんとうは わるくないの。たおせば もやが はれるわ。'],
      ],
      battles: [
        { enemies: [['nora_puni', 3]] },
        { enemies: [['nora_leaf', 4], ['nora_puni', 3]], pre: [['narr', 'ブランコの うしろから もう 2ひき！']] },
        { enemies: [['donguri', 5]], pre: [['enemy', 'だれも どんぐりを ひろわなく なった…。ひろわない なら、ふらせて やるー！']] },
      ],
      outro: [
        ['enemy', '…あれ？ ぼく、なにを してたんだっけ。'],
        ['sensei', 'もやが はれたわ！ どんぐりだいおうは、わすれられて さびしかったのね。'],
        ['sensei', 'つぎは しょうてんがい。くじびきの あたりで もやが でたって。'],
      ],
    },
    {
      id: 2, title: 'しょうてんがいの ガラガラ', arena: 'street', rec: 8,
      intro: [
        ['narr', 'しょうてんがいの はしっこ。むかしの くじびきじょうに もやが たまっている。'],
        ['sensei', 'いまは みんな スマホで くじを ひくから、あの きかいは ずっと しまわれた ままだったの。'],
      ],
      battles: [
        { enemies: [['nora_biri', 7]] },
        { enemies: [['nora_pika', 7], ['nora_bo', 7]] },
        { enemies: [['garagara', 10]], pre: [['enemy', 'ガラガラ ガラ…！ はずれ！ はずれ！ ぜんぶ はずれ！ …あ、いまの あたりだった。']] },
      ],
      outro: [
        ['enemy', 'ひさしぶりに まわして もらえた…。いい おとが するだろ？'],
        ['sensei', 'しょうてんがいの ひとたちが、また くじびきを やろうって！'],
        ['sensei', 'つぎは かわら。ゆうがたに なると、かわが くろく にごるらしいの。'],
      ],
    },
    {
      id: 3, title: 'ゆうぐれの かわら', arena: 'river', rec: 12,
      intro: [
        ['narr', 'ゆうやけの かわら。みずの なかで なにかが おおきく うごいた。'],
        ['sensei', 'むかしは ここで みんな つりを していたの。いまは だれも こないけど。'],
      ],
      battles: [
        { enemies: [['nora_shizuku', 11]] },
        { enemies: [['nora_pocha', 11], ['nora_kusa', 11]] },
        { enemies: [['namazu', 14]], pre: [['enemy', 'ゴゴゴ…。だれも こない かわなど、ゆらして しまえ…！']] },
      ],
      outro: [
        ['enemy', '…ひさしぶりに だれかと あそんだ きが するのう。'],
        ['sensei', 'あなたたち、どんどん つよく なってる。でも むりは しないでね。'],
        ['sensei', 'つぎは がっこう。よるの おんがくしつから ピアノの おとが するって…。'],
      ],
    },
    {
      id: 4, title: 'よるの がっこう', arena: 'school', rec: 16,
      intro: [
        ['narr', 'よるの ろうか。どこからか、まちがえた ドレミが きこえる。'],
        ['pet', '……。'],
        ['sensei', 'あたらしい キーボードが きてから、ふるい ピアノは だれにも ひかれて いないの。'],
      ],
      battles: [
        { enemies: [['nora_kage', 15]] },
        { enemies: [['nora_kirari', 15], ['nora_kagechibi', 14]] },
        { enemies: [['piano', 18]], pre: [['enemy', 'ド… レ… ミ…。だれか、もう いちど ひいて…！']] },
      ],
      outro: [
        ['enemy', 'ポロン…。いまの、ちょっと じょうず だった？'],
        ['sensei', 'あしたの おんがくの じかん、あの ピアノを つかうって せんせいが いってたわ。'],
        ['sensei', 'つぎは うみ。なつなのに、ビーチが あつすぎて だれも いないの。'],
      ],
    },
    {
      id: 5, title: 'まなつの うみ', arena: 'beach', rec: 21,
      intro: [
        ['narr', 'ジリジリと てりつける たいよう。すなが やけるように あつい。'],
        ['sensei', 'みんな エアコンの きいた へやに いるのね…。'],
      ],
      battles: [
        { enemies: [['nora_nami', 19]] },
        { enemies: [['nora_homura', 19], ['nora_midori', 19]] },
        { enemies: [['sun', 23]], pre: [['enemy', 'なつだぞ！ そとで あそべ！ あそばない なら、もっと あつく してやる！']] },
      ],
      outro: [
        ['enemy', 'はぁ…はぁ…。いい たたかいだった。あした みんなで すいかわり しような。'],
        ['sensei', 'たいようまで さびしかった なんてね。'],
        ['sensei', 'つぎは やま。かみなりの たいこが なりやまないの。'],
      ],
    },
    {
      id: 6, title: 'かみなりやま', arena: 'mountain', rec: 26,
      intro: [
        ['narr', 'ゴロゴロと そらが なる。いわの うえで、たいこを たたく かげが みえた。'],
        ['sensei', 'むかしは かみなりまつりで、みんなが あの たいこの おとを ききに きたそうよ。'],
      ],
      battles: [
        { enemies: [['nora_ikazuchi', 24]] },
        { enemies: [['nora_tsurara', 24], ['nora_biribiri', 24]] },
        { enemies: [['raijin', 28]], pre: [['enemy', 'だれも きかぬ たいこを、なぜ たたくか わかるか！ ……わからん！ だから たたく！']] },
      ],
      outro: [
        ['enemy', 'ふう。ひさびさに ほめて もらえる たたかいだった。'],
        ['sensei', 'あと すこし。もやの でどころが わかったわ。'],
        ['sensei', 'なつまつりの よる、わたあめの きかいから もやが そらへ のぼって いくの。'],
      ],
    },
    {
      id: 7, title: 'なつまつりの よる', arena: 'festival', rec: 31,
      intro: [
        ['narr', 'ちょうちんの あかり。でみせの まんなかで、あまい においの くもが うずまいている。'],
        ['pet', '！'],
      ],
      battles: [
        { enemies: [['nora_chochin', 29]] },
        { enemies: [['nora_kingyo', 29], ['nora_hanabi', 29]] },
        { enemies: [['wataame', 33]], pre: [['enemy', 'ふわふわ ふわふわ…。わたしを わすれた こには、もう あげないんだから！']] },
      ],
      outro: [
        ['enemy', 'ごめんね…。そらの うえの「あのかた」に、もやを はこんで いたの。'],
        ['sensei', 'そらの うえ…？ わすれものの くに、って むかしばなしで きいた ことが あるわ。'],
        ['sensei', 'いよいよ ね。ここまで いっしょに きた あいぼうを、しんじて。'],
      ],
    },
    {
      id: 8, title: 'わすれものの くに', arena: 'sky', rec: 38, final: true,
      intro: [
        ['narr', 'くもの うえ。かたっぽの てぶくろ、こわれた かさ、ふるい ぬいぐるみ。わすれられた ものが どこまでも ならんでいる。'],
        ['enemy', 'よく きたな。ここは だれにも おもいだされない ものたちの くにだ。'],
      ],
      battles: [
        { enemies: [['lost_plush', 34]] },
        { enemies: [['lost_robo', 35], ['lost_kasa', 35]] },
        { enemies: [['king', 39]], pre: [['enemy', 'わすれられる くらいなら、まちごと もやで つつんで しまえば いい。そうすれば だれも、なにも、なくさない！']] },
      ],
      outro: [
        ['enemy', '……その いきもの、おまえを ずっと みている。わすれられる なんて、かんがえても いない かおだ。'],
        ['enemy', 'わたしも むかし、だれかの たいせつな ものだった。…おもいだしたよ。'],
        ['narr', 'もやが はれていく。わすれものたちは、ひとつずつ もとの ばしょへ かえっていった。'],
        ['sensei', 'おかえりなさい！ ふたりとも、ほんとうに よく がんばったわね。'],
        ['narr', 'おしまい。…でも、まいにちの おせわは これからも つづく。'],
      ],
    },
  ];

  // あいぼうの なきごえ（スタイルで かわる）
  HG.CRY = { baby: 'きゅい！', cute: 'きゅるん！', cool: 'フッ…！', smart: 'ふむふむ。', tough: 'ガウッ！' };

  // おまかせ なまえ
  HG.NAME_IDEAS = ['ポポ', 'モチ', 'タロ', 'ミルク', 'コロ', 'ピノ', 'ソラ', 'ハク', 'ルル', 'ゴン', 'マメ', 'キキ', 'ナッツ', 'ココ', 'ジロ', 'ププ', 'ラム', 'ちくわ', 'おもち', 'だいふく'];
})(window.HG);
