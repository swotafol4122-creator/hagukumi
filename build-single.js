// 1ファイル版（プレビュー用）を つくる: node tools/build-single.js 出力パス
// たいせん（WebRTC）は つかえない ばしょ むけ
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'hagukumi-preview.html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map((m) => m[1]).filter((f) => !f.startsWith('lib/'));
const js = scripts.map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const fonts = (html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/) || [''])[0];
const page = `<title>ハグクミ</title>
<meta name="description" content="たまごから そだてて、そだてかたで すがたが かわる いきもの そだて ＆ リアルタイムバトル">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css}
/* プレビュー（アーティファクト）よう: そとがわが セーフエリアを とってくれる */
html { box-sizing: border-box; }
#app { padding-top: 0; padding-bottom: 6px; }
</style>
<div id="app" aria-live="polite"></div>
<div id="layer"></div>
<script>window.HG_PREVIEW = true;</script>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log('wrote', out, (page.length / 1024).toFixed(0) + 'KB');
