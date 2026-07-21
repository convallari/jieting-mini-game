import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';
const root=path.resolve('boss-entrance-assets'),errors=[];
const rows=`common_01_darken,6,512,512,0,-;common_02_entry_pulse,12,512,512,1,-;common_03_name_impact_dust,8,512,512,0,2:impact;common_04_boss_bar_drop,10,1024,512,0,-;common_05_ink_absorb,10,512,512,0,-;zh_01_red_footprint,8,512,512,0,-;zh_02_red_brush_slash,8,1024,512,0,-;zh_03_name_write,12,1024,512,0,-;zh_04_flag_drop,10,512,512,0,4:impact;zh_05_flag_flutter,12,512,512,1,-;zh_06_wei_soldier_echo,10,512,512,0,-;zh_07_boss_step_out,14,512,512,0,7:footstep;zh_08_iron_smoke_open,14,512,512,0,-;zh_09_square_scan_ring,16,512,512,0,12:rangePreviewMax;feng_01_water_reverse_tile,12,512,512,0,-;feng_02_water_crack,10,512,512,0,-;feng_03_giant_feng_slash,9,1024,512,0,5:cut;feng_04_paper_cut_open,10,1024,512,0,-;feng_05_blue_river_strip,12,1024,512,1,-;feng_06_boss_dash_stop,14,512,512,0,7:hardStop;feng_07_fan_water_burst,12,512,512,0,4:splashPeak;feng_08_water_target_line,18,1024,512,0,-;smy_01_corner_cloud,14,512,512,0,-;smy_02_star_board_appear,16,512,512,0,-;smy_03_chess_piece_drop,9,512,512,0,5:pieceHit;smy_04_long_shadow_extend,12,512,512,0,-;smy_05_boss_rise_from_shadow,16,512,512,0,9:reveal;smy_06_name_constellation,18,1024,512,0,-;smy_07_command_wave,16,512,512,0,8:commandPreview`;
const specs=new Map(rows.split(';').map(r=>{const[n,f,w,h,l,e]=r.split(',');return[n,{frames:+f,width:+w,height:+h,loop:l==='1',event:e}]}));
const terminal=new Set(['common_02_entry_pulse','common_05_ink_absorb','zh_08_iron_smoke_open','zh_09_square_scan_ring','feng_01_water_reverse_tile','feng_08_water_target_line','smy_07_command_wave']);
const roles=new Set(['zh_07_boss_step_out','feng_06_boss_dash_stop','smy_05_boss_rise_from_shadow']);let total=0;
for(const [name,s] of specs){const base=path.join(root,name);let t;try{t=JSON.parse(await fs.readFile(path.join(base,'source/timeline.json'),'utf8'));}catch{errors.push(`${name}: missing/invalid timeline`);continue;}
 if(t.fps!==12||t.frames!==s.frames||t.width!==s.width||t.height!==s.height||t.loop!==s.loop)errors.push(`${name}: exact spec mismatch`);
 if(s.event!=='-'){const[f,e]=s.event.split(':');if(String(t.eventFrames?.[e])!==f)errors.push(`${name}: missing ${e}@${f}`);}
 const notes=await fs.readFile(path.join(base,'notes.txt'),'utf8').catch(()=> '');if(roles.has(name)&&!notes.includes('不是本体动画完成'))errors.push(`${name}: runtime role placeholder disclosure`);
 const files=(await fs.readdir(path.join(base,'frames'))).filter(x=>x.endsWith('.png')).sort(),hash=[];if(files.length!==s.frames)errors.push(`${name}: frame count`);
 for(let i=0;i<files.length;i++){if(files[i]!==`${String(i+1).padStart(4,'0')}.png`)errors.push(`${name}: sequence`);const p=path.join(base,'frames',files[i]),m=await sharp(p).metadata();if(m.width!==s.width||m.height!==s.height||m.channels!==4||m.space!=='srgb')errors.push(`${name}/${files[i]}: PNG contract`);hash.push(crypto.createHash('sha1').update(await fs.readFile(p)).digest('hex'));total++;}
 if(!roles.has(name)&&new Set(hash).size<3)errors.push(`${name}: insufficient unique frames`);
 if(name==='feng_05_blue_river_strip'&&hash[0]!==hash.at(-1))errors.push(`${name}: loop endpoints differ`);
 if(terminal.has(name)){const {data}=await sharp(path.join(base,'frames',files.at(-1))).ensureAlpha().raw().toBuffer({resolveWithObject:true});let a=0;for(let i=3;i<data.length;i+=4)a+=data[i];if(a)errors.push(`${name}: final frame nontransparent`);}
 if((await fs.stat(path.join(base,'preview.mp4')).catch(()=>({size:0}))).size<1000)errors.push(`${name}: preview missing`);
}
console.log(`Strong animation audit: ${specs.size}/29 specs, ${total} frames`);for(const e of errors)console.log(`ERROR ${e}`);console.log(`Summary: ${errors.length} error(s), 0 warning(s)`);process.exitCode=errors.length?1:0;
