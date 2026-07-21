import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const refFontBytes = await fs.readFile('C:/Windows/Fonts/simkai.ttf');
const refFont = opentype.parse(refFontBytes.buffer.slice(refFontBytes.byteOffset, refFontBytes.byteOffset + refFontBytes.byteLength));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = path.join(root, 'public/boss-entrance-elements');
async function findFolders(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  if (entries.some((entry) => entry.isFile() && entry.name.endsWith('.svg'))) result.push(dir);
  for (const entry of entries) if (entry.isDirectory()) result.push(...await findFolders(path.join(dir, entry.name)));
  return result;
}
const folders = await findFolders(assetRoot);
let assetsRendered = 0;

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function checkerSvg(width, height, cell = 12) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><pattern id="c" width="${cell * 2}" height="${cell * 2}" patternUnits="userSpaceOnUse">
      <rect width="${cell * 2}" height="${cell * 2}" fill="#e8e8e8"/>
      <path d="M0 0h${cell}v${cell}H0zM${cell} ${cell}h${cell}v${cell}H${cell}z" fill="#d2d2d2"/>
    </pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
}

async function renderFolder(folder) {
  const names = (await fs.readdir(folder)).filter((name) => name.endsWith('.svg')).sort();
  const assets = [];
  for (const name of names) {
    const svgPath = path.join(folder, name);
    const pngPath = svgPath.replace(/\.svg$/, '.png');
    // SVG CSS pixels are logical game pixels; 72 DPI prevents sharp/libvips
    // from applying the 96/72 print-density enlargement.
    await sharp(svgPath, { density: 72 }).withIccProfile('srgb').png().toFile(pngPath);
    const image = sharp(pngPath);
    const info = await image.metadata();
    const meta = JSON.parse(await fs.readFile(svgPath.replace(/\.svg$/, '.json'), 'utf8'));
    if (info.width !== meta.width || info.height !== meta.height) throw new Error(`${name}: dimensions ${info.width}x${info.height} != ${meta.width}x${meta.height}`);
    if (info.channels !== 4 || info.space !== 'srgb') throw new Error(`${name}: expected sRGB RGBA PNG`);
    const { data, info: rawInfo } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const corners = [3, (rawInfo.width - 1) * 4 + 3, (rawInfo.height - 1) * rawInfo.width * 4 + 3, rawInfo.width * rawInfo.height * 4 - 1];
    if (corners.some((offset) => data[offset] !== 0)) throw new Error(`${name}: a corner pixel is not transparent`);
    assets.push({ name: path.basename(name, '.svg'), pngPath, meta });
    assetsRendered += 1;
  }

  const overlays = [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const cols = assets.length > 12 ? 6 : assets.length > 6 ? 4 : 3;
    const rows = Math.ceil(assets.length / cols);
    const cardW = Math.floor(1480 / cols);
    const cardH = Math.floor(720 / rows);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 60 + col * cardW;
    const y = 105 + row * cardH;
    const image = sharp(asset.pngPath);
    const info = await image.metadata();
    const previewW = cardW - 22;
    const previewH = Math.max(85, cardH - 72);
    const scale = Math.min((previewW - 12) / info.width, (previewH - 12) / info.height, 1.5);
    const width = Math.max(1, Math.round(info.width * scale));
    const height = Math.max(1, Math.round(info.height * scale));
    const preview = await sharp(checkerSvg(previewW, previewH))
      .composite([{ input: await image.resize(width, height).png().toBuffer(), left: Math.round((previewW - width) / 2), top: Math.round((previewH - height) / 2) }])
      .png().toBuffer();
    overlays.push({ input: preview, left: x, top: y });
    const p = asset.meta.pivot;
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${previewW}" height="66">
      <style>text{font-family:'Microsoft YaHei',Arial,sans-serif;fill:#222}.a{font-size:${cols > 4 ? 12 : 15}px}.b{font-size:${cols > 4 ? 12 : 14}px;fill:#555}</style>
      <text class="a" x="0" y="20">${escapeXml(asset.name)}</text>
      <text class="b" x="0" y="46">${asset.meta.width}×${asset.meta.height}  pivot=(${p.x},${p.y})</text>
    </svg>`);
    overlays.push({ input: label, left: x, top: y + previewH + 4 });
  }

  const title = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="900">
    <style>text{font-family:'Microsoft YaHei',Arial,sans-serif;fill:#222}</style>
    <text x="60" y="72" font-size="34">Boss Entrance Elements / ${path.basename(folder)}</text>
    <text x="1080" y="865" font-size="18" fill="#555">制作：Codex　日期：2026-07-19　状态：通过</text>
  </svg>`);
  overlays.push({ input: title, left: 0, top: 0 });
  await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#eeeeee' } })
    .composite(overlays).png().toFile(path.join(folder, 'contact-sheet.png'));
}

for (const folder of folders) await renderFolder(folder);
const layoutPath = path.join(assetRoot, 'simayi/smy_06/be_smy_06_layout_reference.png');
const nodes=[[95,145],[210,145],[95,225],[210,225],[95,305],[210,305],[152,110],[152,350],[365,130],[495,130],[385,215],[475,215],[375,300],[485,300],[430,355],[650,120],[780,120],[715,175],[635,235],[795,235],[650,300],[780,300],[715,355],[900,180],[900,310]];
const lines=[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[10,15],[16,17],[17,18],[19,20],[21,22],[18,23],[24,25]];
const p=(ch,x)=>refFont.getPath(ch,x,370,300).toPathData(2);
const guide = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512"><rect width="1024" height="512" fill="#171b2b"/><g fill="#405177" opacity=".28"><path d="${p('司',60)}"/><path d="${p('马',350)}"/><path d="${p('懿',625)}"/></g><g stroke="#92a9d7" stroke-width="3">${lines.map(([a,b],i)=>`<path d="M${nodes[a-1][0]} ${nodes[a-1][1]}L${nodes[b-1][0]} ${nodes[b-1][1]}"/><text x="${(nodes[a-1][0]+nodes[b-1][0])/2}" y="${(nodes[a-1][1]+nodes[b-1][1])/2-6}" fill="#f1d58b" stroke="none" font-size="14">${i+1}</text>`).join('')}</g><g>${nodes.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="7" fill="#edf3ff"/><text x="${x+9}" y="${y-8}" fill="#dce4f5" font-size="12">${i+1} (${x},${y})</text>`).join('')}</g><g fill="#dce4f5" font-family="Arial" font-size="18"><text x="36" y="40">SMY-06 司马懿 star layout — numbered coordinates and connection order</text><text x="36" y="486">Line labels indicate reveal order; pale outlines are alignment guides only.</text></g></svg>`);
await sharp(guide).withIccProfile('srgb').png().toFile(layoutPath);
console.log(`rendered and validated ${assetsRendered} assets in ${folders.length} folders`);
