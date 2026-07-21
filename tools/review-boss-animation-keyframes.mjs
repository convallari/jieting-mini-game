import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('boss-entrance-assets');
const selections = {
  common_02_entry_pulse:[1,2,6,11,12], common_04_boss_bar_drop:[1,4,7,10],
  zh_02_red_brush_slash:[1,3,6,8], zh_03_name_write:[5,10,11,12],
  zh_04_flag_drop:[1,4,5,7,10], zh_05_flag_flutter:[1,4,7,10,12],
  zh_08_iron_smoke_open:[1,7,13,14], zh_09_square_scan_ring:[1,6,12,16],
  feng_03_giant_feng_slash:[1,3,5,7,9], feng_04_paper_cut_open:[1,4,7,10],
  feng_07_fan_water_burst:[1,4,7,12], smy_02_star_board_appear:[1,8,12,16],
  smy_03_chess_piece_drop:[1,3,5,7,9], smy_04_long_shadow_extend:[1,6,10,12],
  smy_06_name_constellation:[1,6,14,15,18], smy_07_command_wave:[1,8,15,16]
};
const cellW=260, cellH=170, labelH=32, cols=5;
const rows=Object.keys(selections).length;
const W=cellW*cols, H=rows*(cellH+labelH);
const checker=await sharp({create:{width:cellW,height:cellH,channels:4,background:'#eee'}})
  .composite(Array.from({length:9*6},(_,i)=>({input:{create:{width:32,height:32,channels:4,background:(i%9+Math.floor(i/9))%2?'#d3d3d3':'#eeeeee'}},left:(i%9)*32,top:Math.floor(i/9)*32}))).png().toBuffer();
const layers=[];let row=0;
for(const [name,frames] of Object.entries(selections)){
  layers.push({input:Buffer.from(`<svg width="${W}" height="${labelH}"><rect width="100%" height="100%" fill="#17191d"/><text x="8" y="22" font-family="Arial,sans-serif" font-size="17" fill="white">${name}</text></svg>`),left:0,top:row*(cellH+labelH)});
  for(let c=0;c<cols;c++){
    if(c>=frames.length) continue;
    const f=frames[c], p=path.join(root,name,'frames',`${String(f).padStart(4,'0')}.png`);
    const im=await sharp(p).resize(cellW,cellH,{fit:'contain'}).png().toBuffer();
    const base=await sharp(checker).composite([{input:im,left:0,top:0},{input:Buffer.from(`<svg width="${cellW}" height="24"><rect width="62" height="24" fill="#000b"/><text x="6" y="18" font-family="Arial" font-size="16" fill="white">f${f}</text></svg>`),left:0,top:0}]).png().toBuffer();
    layers.push({input:base,left:c*cellW,top:row*(cellH+labelH)+labelH});
  }
  row++;
}
await fs.mkdir('output',{recursive:true});
await sharp({create:{width:W,height:H,channels:4,background:'#111'}}).composite(layers).png().toFile('output/boss-animation-keyframes-round2.png');
console.log('output/boss-animation-keyframes-round2.png');
