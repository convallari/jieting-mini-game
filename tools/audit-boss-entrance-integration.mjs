import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(), errors=[], warnings=[];
const srcDir=path.join(root,'src');
const files=(await fs.readdir(srcDir)).filter(x=>/\.(?:js|css)$/.test(x));
const source=(await Promise.all(files.map(async f=>`\n/* ${f} */\n${await fs.readFile(path.join(srcDir,f),'utf8')}`))).join('');
const need=(label,re)=>{if(!re.test(source))errors.push(label);};
const warn=(label,re)=>{if(!re.test(source))warnings.push(label);};

need('missing independent bossEntrance state',/bossEntrance/);
need('missing entrance start lifecycle',/startBossEntrance|function\s+start\s*\(/);
need('missing entrance update lifecycle',/updateBossEntrance|function\s+update\s*\(/);
need('missing entrance finish lifecycle',/finishBossEntrance|function\s+finish\s*\(/);
need('missing full/repeat duration contract (0.65)',/0\.65/);
need('missing skip gate (0.45)',/0\.45/);
need('missing skip outro duration (0.35)',/0\.35/);
need('missing reduced-motion handling',/prefers-reduced-motion|reducedMotion/);
need('missing visibility/background handling',/visibilitychange/);
need('missing debug Boss entrance entry',/debugBossEntrance/i);
need('missing runtime role references',/zh_07_boss_step_out[\s\S]*feng_06_boss_dash_stop|feng_06_boss_dash_stop[\s\S]*zh_07_boss_step_out/);
const indexedRoleMap=false;
if(!indexedRoleMap)need('missing role mapping: Zhang He -> boss1',/boss1[\s\S]{0,160}(?:张郃|zh_07)|(?:张郃|zh_07)[\s\S]{0,160}boss1/);
need('missing glyph-only mapping: Feng',/(?:name:\s*["']锋["'][\s\S]{0,160}displayMode:\s*["']glyph["'])|(?:displayMode:\s*["']glyph["'][\s\S]{0,160}name:\s*["']锋["'])/);
if(/(?:司马懿|smy_05)[\s\S]{0,160}caoCao|caoCao[\s\S]{0,160}(?:司马懿|smy_05)/.test(source))errors.push('Sima Yi must not map to caoCao');
if(/(?:先锋|feng_06)[\s\S]{0,160}(?:boss2|caoCao|xiaHouDun|weiVanguard)|(?:boss2|caoCao|xiaHouDun|weiVanguard)[\s\S]{0,160}(?:先锋|feng_06)/.test(source))errors.push('Wei vanguard must not use another character Spine mapping');
warn('debug state should expose bossEntrance',/__jietingDebugState[\s\S]{0,3000}bossEntrance/);
warn('input path should explicitly gate on bossEntrance',/pointerDown[\s\S]{0,1000}bossEntrance|bossEntrance[\s\S]{0,1000}pointerDown/);
warn('audio fallback boss_entrance not evident near entrance code',/bossEntrance[\s\S]{0,3000}boss_entrance|boss_entrance[\s\S]{0,3000}bossEntrance/);

const assetRoot=path.join(root,'boss-entrance-assets');
const dirs=(await fs.readdir(assetRoot,{withFileTypes:true}).catch(()=>[])).filter(x=>x.isDirectory());
if(dirs.length!==29)errors.push(`animation directory count ${dirs.length}/29`);
let sequence=0,spine=0;
for(const d of dirs){
  const timeline=JSON.parse(await fs.readFile(path.join(assetRoot,d.name,'source/timeline.json'),'utf8'));
  if((timeline.externalReferences??[]).length)spine++; else sequence++;
}
if(sequence!==26||spine!==3)errors.push(`delivery boundary is ${sequence} image sequences + ${spine} runtime role references, expected 26 + 3`);
console.log(`Boss entrance integration audit: assets ${sequence}+${spine}; ${files.length} source files scanned`);
for(const e of errors)console.log(`ERROR ${e}`);
for(const w of warnings)console.log(`WARN ${w}`);
console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exitCode=errors.length?1:0;
