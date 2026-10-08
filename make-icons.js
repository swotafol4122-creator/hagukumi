// アイコンを つくる: node tools/make-icons.js
const fs = require('fs'); const vm = require('vm'); const path = require('path');
const root = path.join(__dirname, '..');
global.window = global; global.location = { search: '' };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = { createElement: () => ({ getContext: () => ({}) }) }; global.navigator = {};
for (const f of ['core', 'data', 'art']) vm.runInThisContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'));
const sharp = require('/opt/npm-tools/node_modules/sharp');
const inner = HG.art.creature({ stage: 2, egg: 'red', type: 'fire', style: 'cute', dna: 4 }, { uid: 'ic', expr: 'happy' })
  .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="hg-creature">', '').replace(/<\/svg>$/, '');
function iconSvg(pad) {
  const s = 512, c = 512 - pad * 2;
  let dots = '';
  for (let i = 0; i < 40; i++) dots += `<circle cx="${(i * 97) % 512}" cy="${(i * 53 + 31) % 512}" r="5" fill="#ffffff" opacity=".08"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b5ff2"/><stop offset="1" stop-color="#3c25a6"/></linearGradient></defs>
  <rect width="${s}" height="${s}" fill="url(#g)"/>${dots}
  <ellipse cx="256" cy="${pad + c * 0.86}" rx="${c * 0.3}" ry="${c * 0.05}" fill="#23194a" opacity=".35"/>
  <svg x="${pad}" y="${pad - c * 0.02}" width="${c}" height="${c}" viewBox="0 0 200 200">${inner}</svg></svg>`;
}
(async () => {
  const icons = path.join(root, 'icons');
  fs.mkdirSync(icons, { recursive: true });
  const any = Buffer.from(iconSvg(40));
  const mask = Buffer.from(iconSvg(96));
  await sharp(any).resize(512, 512).png().toFile(path.join(icons, 'icon-512.png'));
  await sharp(any).resize(192, 192).png().toFile(path.join(icons, 'icon-192.png'));
  await sharp(any).resize(180, 180).png().toFile(path.join(icons, 'apple-touch-icon.png'));
  await sharp(mask).resize(512, 512).png().toFile(path.join(icons, 'maskable-512.png'));
  console.log('icons ok');
})();
