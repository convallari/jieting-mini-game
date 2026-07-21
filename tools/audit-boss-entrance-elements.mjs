import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
const root = path.resolve('public/boss-entrance-elements');
const expected = [];
const add = (folder, stem, width, height, pivot = null, options = {}) => expected.push({ folder, stem, width, height, pivot, ...options });

// COMMON
add('common/common_01','be_com_01_01_corner_vignette_base',256,256,{x:0,y:0},{soft:true}); add('common/common_01','be_com_01_02_center_dim_base',256,256,{x:128,y:128},{soft:true});
add('common/common_02','be_com_02_01_ink_ring_base',384,384,{x:192,y:192}); add('common/common_02','be_com_02_02_ring_speck_base',64,64,{x:32,y:32});
add('common/common_03','be_com_03_01_dust_ring_base',384,128,{x:192,y:64}); add('common/common_03','be_com_03_02_dust_plume_left_base',128,160,null,{pivotHint:'bottom-right'}); add('common/common_03','be_com_03_03_dust_chip_base',48,48,{x:24,y:24});
add('common/common_04','be_com_04_01_bar_left_cap_base',192,112,null,{pivotHint:'right-middle'}); add('common/common_04','be_com_04_02_bar_center_stretch_base',128,96,{x:64,y:48}); add('common/common_04','be_com_04_03_bar_right_cap_base',192,112,null,{pivotHint:'left-middle'}); add('common/common_04','be_com_04_04_bar_shadow_base',768,96,{x:384,y:48},{soft:true});
add('common/common_05','be_com_05_01_ink_chip_round_base',32,32,{x:16,y:16}); add('common/common_05','be_com_05_02_ink_chip_long_base',48,24,{x:24,y:12}); add('common/common_05','be_com_05_03_ink_chip_splash_base',40,40,{x:20,y:20});

// ZHANGHE
add('zhanghe/zh_01','be_zh_01_01_boot_print_base',128,176,null,{pivotHint:'sole-center'}); add('zhanghe/zh_01','be_zh_01_02_print_ink_spike_base',80,80,{x:40,y:40});
add('zhanghe/zh_02','be_zh_02_01_brush_head_base',192,160,null,{pivotHint:'right-middle'}); add('zhanghe/zh_02','be_zh_02_02_brush_body_stretch_base',256,128,null,{pivotHint:'left-middle'}); add('zhanghe/zh_02','be_zh_02_03_brush_tail_base',160,144,null,{pivotHint:'right-middle'});
for(let i=1;i<=7;i++) add('zhanghe/zh_03',`be_zh_03_${String(i).padStart(2,'0')}_zhang_stroke_${String(i).padStart(2,'0')}_base`,null,null,null,{variable:true});
for(let i=1;i<=11;i++){ const n=i+7; add('zhanghe/zh_03',`be_zh_03_${String(n).padStart(2,'0')}_he_stroke_${String(i).padStart(2,'0')}_base`,null,null,null,{variable:true}); }
add('zhanghe/zh_03','be_zh_03_19_name_ink_glow_base',640,256,{x:320,y:128},{soft:true});
add('zhanghe/zh_04','be_zh_04_01_flag_pole_base',64,448,null,{pivotHint:'bottom-center'}); add('zhanghe/zh_04','be_zh_04_02_flag_cloth_base',224,160,{x:20,y:24}); add('zhanghe/zh_04','be_zh_04_03_flag_wei_emblem_base',112,112,{x:56,y:56}); add('zhanghe/zh_04','be_zh_04_04_pole_impact_spark_base',96,64,null,{pivotHint:'bottom-center'});
add('zhanghe/zh_05','be_zh_05_01_flag_back_shadow_base',224,160,{x:20,y:24}); add('zhanghe/zh_06','be_zh_06_01_wei_echo_base',224,256,{x:112,y:232}); add('zhanghe/zh_06','be_zh_06_02_wei_ground_shadow_base',160,48,{x:80,y:24},{soft:true});
add('zhanghe/zh_07','be_zh_07_01_step_front_dust_base',192,96,null,{pivotHint:'bottom-center'}); add('zhanghe/zh_07','be_zh_07_02_armor_glint_base',96,96,{x:48,y:48});
add('zhanghe/zh_08','be_zh_08_01_smoke_left_base',256,384,null,{pivotHint:'right-bottom',soft:true}); add('zhanghe/zh_08','be_zh_08_02_smoke_right_base',256,384,null,{pivotHint:'left-bottom',soft:true}); add('zhanghe/zh_08','be_zh_08_03_ground_mist_base',384,112,null,{pivotHint:'center-bottom',soft:true});
add('zhanghe/zh_09','be_zh_09_01_square_cell_base',64,64,{x:32,y:32}); add('zhanghe/zh_09','be_zh_09_02_square_corner_base',64,64,null,{pivotHint:'corner'}); add('zhanghe/zh_09','be_zh_09_03_scan_edge_glow_base',128,64,{x:64,y:32},{soft:true});

// FENG
[['long',256,64],['mid',176,56],['short',112,48]].forEach(([n,w,h],i)=>add('feng/feng_01',`be_feng_01_0${i+1}_water_ripple_${n}_base`,w,h,{x:w/2,y:h/2})); add('feng/feng_01','be_feng_01_04_water_foam_base',64,48,{x:32,y:24});
add('feng/feng_02','be_feng_02_01_crack_trunk_base',64,288,{x:32,y:144}); add('feng/feng_02','be_feng_02_02_crack_branch_a_base',128,96,null,{pivotHint:'root'}); add('feng/feng_02','be_feng_02_03_crack_branch_b_base',112,80,null,{pivotHint:'root'}); add('feng/feng_02','be_feng_02_04_crack_chip_base',48,48,{x:24,y:24});
add('feng/feng_03','be_feng_03_01_feng_glyph_base',448,448,{x:224,y:224}); add('feng/feng_03','be_feng_03_02_feng_afterimage_base',448,448,{x:224,y:224},{soft:true}); add('feng/feng_03','be_feng_03_03_cut_chip_base',64,64,{x:32,y:32});
add('feng/feng_04','be_feng_04_01_torn_edge_upper_base',768,128,null,{pivotHint:'left-middle'}); add('feng/feng_04','be_feng_04_02_torn_edge_lower_base',768,128,null,{pivotHint:'left-middle'}); add('feng/feng_04','be_feng_04_03_torn_fiber_base',64,64,null,{pivotHint:'root'});
add('feng/feng_05','be_feng_05_01_river_base_tile',256,128,null,{pivotHint:'left-middle',tileX:true}); add('feng/feng_05','be_feng_05_02_river_highlight_tile',256,64,null,{pivotHint:'left-middle',tileX:true}); add('feng/feng_05','be_feng_05_03_river_bubble_base',48,48,{x:24,y:24});
add('feng/feng_06','be_feng_06_01_speed_streak_base',256,48,null,{pivotHint:'right-middle'}); add('feng/feng_06','be_feng_06_02_stop_ground_mark_base',224,80,null,{pivotHint:'right-bottom'});
add('feng/feng_07','be_feng_07_01_wave_left_base',256,256,null,{pivotHint:'right-bottom'}); add('feng/feng_07','be_feng_07_02_wave_right_base',256,256,null,{pivotHint:'left-bottom'}); add('feng/feng_07','be_feng_07_03_water_drop_round_base',40,48,{x:20,y:24}); add('feng/feng_07','be_feng_07_04_water_drop_long_base',32,64,{x:16,y:32}); add('feng/feng_07','be_feng_07_05_foam_crown_base',96,64,null,{pivotHint:'bottom'});
add('feng/feng_08','be_feng_08_01_dash_segment_base',64,24,{x:32,y:12}); add('feng/feng_08','be_feng_08_02_target_water_drop_base',96,128,null,{pivotHint:'bottom-center'}); add('feng/feng_08','be_feng_08_03_target_glow_base',160,160,{x:80,y:80},{soft:true});

// SIMAYI
add('simayi/smy_01','be_smy_01_01_cloud_body_base',384,384,{x:0,y:0},{soft:true}); add('simayi/smy_01','be_smy_01_02_cloud_curl_a_base',128,128,{x:64,y:64},{soft:true}); add('simayi/smy_01','be_smy_01_03_cloud_curl_b_base',112,112,{x:56,y:56},{soft:true}); add('simayi/smy_01','be_smy_01_04_cloud_speck_base',64,64,{x:32,y:32});
add('simayi/smy_02','be_smy_02_01_orbit_outer_base',448,448,{x:224,y:224}); add('simayi/smy_02','be_smy_02_02_orbit_middle_base',336,336,{x:168,y:168}); add('simayi/smy_02','be_smy_02_03_orbit_inner_base',208,208,{x:104,y:104}); add('simayi/smy_02','be_smy_02_04_radial_line_base',24,192,null,{pivotHint:'bottom-center'}); add('simayi/smy_02','be_smy_02_05_star_dot_small_base',24,24,{x:12,y:12}); add('simayi/smy_02','be_smy_02_06_star_dot_large_base',40,40,{x:20,y:20});
add('simayi/smy_03','be_smy_03_01_chess_piece_base',112,112,{x:56,y:56}); add('simayi/smy_03','be_smy_03_02_piece_shadow_base',112,40,{x:56,y:20},{soft:true}); add('simayi/smy_03','be_smy_03_03_piece_impact_ring_base',192,96,{x:96,y:48}); add('simayi/smy_03','be_smy_03_04_piece_afterimage_base',96,192,null,{pivotHint:'bottom-center',soft:true});
add('simayi/smy_04','be_smy_04_01_shadow_body_stretch_base',192,256,null,{pivotHint:'top-center'}); add('simayi/smy_04','be_smy_04_02_shadow_tip_base',96,160,null,{pivotHint:'top-center',soft:true}); add('simayi/smy_04','be_smy_04_03_shadow_blue_edge_base',192,256,null,{pivotHint:'same-as-body',soft:true});
add('simayi/smy_05','be_smy_05_01_body_reveal_mask_base',320,416,null,{pivotHint:'bottom-center',soft:true}); add('simayi/smy_05','be_smy_05_02_robe_mist_base',320,112,null,{pivotHint:'bottom-center',soft:true});
add('simayi/smy_06','be_smy_06_01_name_star_small_base',24,24,{x:12,y:12}); add('simayi/smy_06','be_smy_06_02_name_star_large_base',40,40,{x:20,y:20}); add('simayi/smy_06','be_smy_06_03_name_line_short_base',64,16,null,{pivotHint:'left-middle'}); add('simayi/smy_06','be_smy_06_04_name_line_long_base',160,16,null,{pivotHint:'left-middle'}); add('simayi/smy_06','be_smy_06_05_name_complete_glow_base',768,256,{x:384,y:128},{soft:true});
add('simayi/smy_07','be_smy_07_01_command_ring_thick_base',384,384,{x:192,y:192}); add('simayi/smy_07','be_smy_07_02_command_ring_thin_base',384,384,{x:192,y:192}); add('simayi/smy_07','be_smy_07_03_command_ring_dotted_base',384,384,{x:192,y:192}); add('simayi/smy_07','be_smy_07_04_command_star_chip_base',48,48,{x:24,y:24});

const errors=[]; const warnings=[]; const ok=[];
// Semantic margin exemptions. These assets intentionally consume an edge or use
// a sub-minimum-height canvas mandated by the art spec; each reason is explicit.
const marginExemptions = new Map([
  ['be_feng_04_01_torn_edge_upper_base','paper tear must touch both horizontal tile edges'],
  ['be_feng_04_02_torn_edge_lower_base','paper tear must touch both horizontal tile edges'],
  ['be_feng_05_01_river_base_tile','base tile must be horizontally seamless'],
  ['be_feng_05_02_river_highlight_tile','highlight endpoints must touch for horizontal seamless tiling'],
  ['be_zh_06_02_wei_ground_shadow_base','48px canvas cannot contain a non-empty row with 24px on both sides'],
  ['be_smy_03_02_piece_shadow_base','40px canvas cannot contain a non-empty row with 24px on both sides'],
  ['be_smy_06_03_name_line_short_base','16px canvas cannot contain a visible line with 8px on both sides'],
  ['be_smy_06_04_name_line_long_base','16px canvas cannot contain a visible line with 8px on both sides'],
]);
const err=(s)=>errors.push(s), warn=(s)=>warnings.push(s);
async function exists(p){ try{await fs.access(p); return true;}catch{return false;} }
function svgAttrs(text){ const m=text.match(/<svg\b([^>]*)>/i); if(!m)return null; const get=n=>m[1].match(new RegExp(`\\b${n}=["']([^"']+)["']`,'i'))?.[1]; return {width:Number(get('width')),height:Number(get('height')),viewBox:get('viewBox')}; }
function pngInfo(buffer, decode=false){
  if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw new Error('invalid PNG signature');
  let off=8,width,height,bitDepth,colorType,interlace,idat=[],hasSrgb=false,hasIcc=false;
  while(off<buffer.length){ const len=buffer.readUInt32BE(off), type=buffer.toString('ascii',off+4,off+8), data=buffer.subarray(off+8,off+8+len); off+=12+len;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
    else if(type==='IDAT') idat.push(data); else if(type==='sRGB') hasSrgb=true; else if(type==='iCCP') hasIcc=true; else if(type==='IEND') break;
  }
  const channels={0:1,2:3,3:1,4:2,6:4}[colorType]; const result={width,height,bitDepth,colorType,channels,hasAlpha:colorType===4||colorType===6,space:hasSrgb||hasIcc?'srgb':'unknown'};
  if(!decode)return result; if(bitDepth!==8||colorType!==6||interlace!==0) throw new Error(`unsupported PNG decode format depth=${bitDepth} type=${colorType} interlace=${interlace}`);
  const packed=zlib.inflateSync(Buffer.concat(idat)), stride=width*4, raw=Buffer.alloc(stride*height); let src=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=packed[src++]; for(let x=0;x<stride;x++){const v=packed[src++], left=x>=4?raw[y*stride+x-4]:0, up=y?raw[(y-1)*stride+x]:0, ul=y&&x>=4?raw[(y-1)*stride+x-4]:0; raw[y*stride+x]=(v+([0,()=>left,()=>up,()=>Math.floor((left+up)/2),()=>paeth(left,up,ul)][filter] instanceof Function?[0,()=>left,()=>up,()=>Math.floor((left+up)/2),()=>paeth(left,up,ul)][filter]():0))&255; }}
  return {...result,data:raw};
}

for(const a of expected){
  const dir=path.join(root,a.folder), base=path.join(dir,a.stem); let complete=true;
  for(const ext of ['.svg','.png','.json']) if(!await exists(base+ext)){err(`MISSING ${a.folder}/${a.stem}${ext}`); complete=false;}
  if(!complete) continue;
  try{
    const meta=JSON.parse(await fs.readFile(base+'.json','utf8'));
    if(meta.id!==a.stem) err(`JSON id ${a.stem}: ${meta.id}`);
    for(const k of ['pivot','tintable','defaultOpacity','notes']) if(meta[k]===undefined || meta[k]===null || meta[k]==='') err(`JSON field ${a.stem}: missing ${k}`);
    if(!a.variable && (meta.width!==a.width || meta.height!==a.height)) err(`JSON size ${a.stem}: ${meta.width}x${meta.height}, expected ${a.width}x${a.height}`);
    if(a.variable && (meta.width>240 || meta.height>240)) err(`VARIABLE size ${a.stem}: longest edge must be <=240`);
    if(a.pivot && (meta.pivot?.x!==a.pivot.x || meta.pivot?.y!==a.pivot.y)) err(`PIVOT ${a.stem}: (${meta.pivot?.x},${meta.pivot?.y}), expected (${a.pivot.x},${a.pivot.y})`);
    const svg=await fs.readFile(base+'.svg','utf8'), attrs=svgAttrs(svg); const ew=a.variable?meta.width:a.width, eh=a.variable?meta.height:a.height;
    if(!attrs || attrs.width!==ew || attrs.height!==eh || attrs.viewBox?.trim()!==`0 0 ${ew} ${eh}`) err(`SVG canvas ${a.stem}: ${JSON.stringify(attrs)}, expected ${ew}x${eh}`);
    if(/<image\b/i.test(svg)) err(`SVG external/embedded image forbidden: ${a.stem}`); if(/<text\b/i.test(svg)) err(`SVG live text forbidden: ${a.stem}`);
    const info=pngInfo(await fs.readFile(base+'.png'),true);
    if(info.width!==ew || info.height!==eh) err(`PNG size ${a.stem}: ${info.width}x${info.height}, expected ${ew}x${eh}`);
    if(info.channels!==4 || info.hasAlpha!==true) err(`PNG RGBA ${a.stem}: channels=${info.channels} alpha=${info.hasAlpha}`);
    if(info.space!=='srgb') err(`PNG colorspace ${a.stem}: ${info.space}, expected srgb`);
    const {data}=info; let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) if(data[(y*info.width+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    const corners=[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]]; if(corners.some(([x,y])=>data[(y*info.width+x)*4+3]!==0)) err(`PNG transparent corners ${a.stem}`);
    if(maxX<0) err(`PNG empty ${a.stem}`); else { const margins=[minX,minY,info.width-1-maxX,info.height-1-maxY], need=a.soft?24:8; if(margins.some(v=>v<need) && !marginExemptions.has(a.stem)) warn(`MARGIN ${a.stem}: [${margins.join(',')}], expected >=${need}px${a.soft?' for soft effect':''}`); }
    ok.push(a.stem);
  }catch(e){err(`READ ${a.folder}/${a.stem}: ${e.message}`);}
}

for(const folder of [...new Set(expected.map(a=>a.folder))]){
  const p=path.join(root,folder,'contact-sheet.png'); if(!await exists(p)){err(`MISSING ${folder}/contact-sheet.png`); continue;} const i=pngInfo(await fs.readFile(p)); if(i.width!==1600||i.height!==900) err(`CONTACT ${folder}: ${i.width}x${i.height}, expected 1600x900`);
}
const layout=path.join(root,'simayi/smy_06/be_smy_06_layout_reference.png'); if(!await exists(layout)) err('MISSING simayi/smy_06/be_smy_06_layout_reference.png'); else { const i=pngInfo(await fs.readFile(layout)); if(i.width!==1024||i.height!==512) err(`LAYOUT reference: ${i.width}x${i.height}, expected 1024x512`); }

console.log(`Boss entrance audit: ${ok.length}/${expected.length} asset triples readable`);
for(const s of errors) console.log(`ERROR ${s}`); for(const s of warnings) console.log(`WARN  ${s}`);
console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`); process.exitCode=errors.length?1:0;
