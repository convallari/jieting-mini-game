const BASE_URL = import.meta.env?.BASE_URL || "/";
const ROOT = `${BASE_URL}boss-entrance-assets/`;
const FPS = 12;

const COMMON = ["common_01_darken", "common_02_entry_pulse", "common_03_name_impact_dust", "common_04_boss_bar_drop", "common_05_ink_absorb"];
const CONFIG = {
  zhanghe: {
    index: 0, name: "张郃", skill: "压迫", hint: "阵脚受压 · 合成将被封锁", color: "#b9362f",
    duration: 2.4, roleAt: .92, role: "zh_07_boss_step_out",
    clips: [["zh_01_red_footprint",0,.45,"backdrop"],["zh_02_red_brush_slash",.38,.9,"backdrop"],["zh_03_name_write",.45,1.05,"foreground"],["zh_04_flag_drop",.72,1.5,"foreground"],["zh_05_flag_flutter",1.35,2.18,"foreground"],["zh_06_wei_soldier_echo",.82,1.55,"backdrop"],["zh_08_iron_smoke_open",.88,1.62,"foreground"],["zh_09_square_scan_ring",1.42,2.12,"foreground"]]
  },
  feng: {
    index: 1, name: "锋", skill: "断水", hint: "汲道告急 · 守住水源", color: "#416f8f",
    duration: 2.25, roleAt: .82, role: "feng_06_boss_dash_stop",
    clips: [["feng_01_water_reverse_tile",0,.5,"backdrop"],["feng_02_water_crack",.12,.72,"backdrop"],["feng_03_giant_feng_slash",.35,.92,"foreground"],["feng_04_paper_cut_open",.42,1.1,"foreground"],["feng_05_blue_river_strip",.5,1.2,"backdrop"],["feng_07_fan_water_burst",.82,1.48,"foreground"],["feng_08_water_target_line",1.25,2.03,"foreground"]]
  },
  simayi: {
    index: 2, name: "司马懿", skill: "号令", hint: "全军受令 · 敌军即将强化", color: "#1b2f69",
    duration: 2.65, roleAt: 1.02, role: "smy_05_boss_rise_from_shadow",
    clips: [["smy_01_corner_cloud",0,.72,"backdrop"],["smy_02_star_board_appear",.38,1.28,"backdrop"],["smy_03_chess_piece_drop",.5,1.28,"foreground"],["smy_04_long_shadow_extend",.92,1.62,"backdrop"],["smy_06_name_constellation",1.08,2.25,"foreground"],["smy_07_command_wave",1.48,2.32,"foreground"]]
  }
};

const manifests = new Map();
const readyManifests = new Map();
const frameImages = new Map();
const allClips = [...COMMON, ...Object.values(CONFIG).flatMap((item) => [item.role, ...item.clips.map(([name]) => name)])];

async function loadClip(name) {
  if (manifests.has(name)) return manifests.get(name);
  const promise = fetch(`${ROOT}${name}/source/timeline.json`).then((response) => {
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return response.json();
  }).then((manifest) => {
    readyManifests.set(name, manifest);
    return manifest;
  }).catch(() => null);
  manifests.set(name, promise);
  return promise;
}

function imageFor(name, frame) {
  const key = `${name}:${frame}`;
  if (!frameImages.has(key)) {
    const image = new Image();
    image.decoding = "async";
    image.src = `${ROOT}${name}/frames/${String(frame).padStart(4,"0")}.png`;
    frameImages.set(key, image);
  }
  return frameImages.get(key);
}

function fitDraw(ctx, image, viewport, alpha = 1) {
  if (!image?.complete || !image.naturalWidth) return;
  const scale = Math.min(viewport.w / image.naturalWidth, viewport.h / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(image, viewport.x + (viewport.w-w)/2, viewport.y + (viewport.h-h)/2, w, h);
  ctx.restore();
}

export function createBossEntrance({ reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches, onAudio, onShake, onRole, onEvent, onFinish } = {}) {
  const seen = new Set();
  let state = null;
  Promise.all(allClips.map(loadClip)).then(() => {
    for (const name of allClips) imageFor(name, 1);
  });

  function start(key, enemy, options = {}) {
    const config = CONFIG[key];
    if (!config) return false;
    const repeat = options.repeat ?? seen.has(key);
    seen.add(key);
    const duration = repeat ? .65 : config.duration;
    state = { key, config, enemy, age: 0, duration, repeat, reducedMotion: options.reducedMotion ?? reducedMotion,
      phase: "omen", skipping: false, finishLeft: 0, events: new Set(), roleShown: false };
    onAudio?.("boss_entrance", .3);
    return true;
  }

  function skip() {
    if (!state || state.age < .45 || state.skipping) return false;
    state.skipping = true; state.finishLeft = .35; state.phase = "finish";
    return true;
  }

  function update(dt) {
    if (!state) return false;
    if (state.skipping) {
      state.finishLeft -= dt;
      state.age = Math.max(state.age, state.duration - Math.max(0,state.finishLeft));
      if (state.finishLeft <= 0) finish();
      return true;
    }
    state.age += dt;
    triggerTimelineEvents();
    const ratio = state.age / state.duration;
    state.phase = ratio < .19 ? "omen" : ratio < .43 ? "name" : ratio < .64 ? "role" : ratio < .86 ? "threat" : "finish";
    const roleAt = state.repeat ? .22 : state.config.roleAt;
    if (!state.roleShown && state.age >= roleAt) {
      state.roleShown = true;
      onRole?.(state.config, state.enemy, state.repeat ? .43 : Math.max(.5, state.duration-roleAt));
      if (!state.reducedMotion) onShake?.(.16, state.key === "feng" ? 2 : 3);
    }
    if (state.age >= state.duration) finish();
    return Boolean(state);
  }

  function triggerTimelineEvents() {
    if (!state || state.reducedMotion) return;
    const scale = state.repeat ? state.config.duration / .65 : 1;
    const age = state.age * scale;
    for (const [name,startAt,endAt] of state.config.clips) {
      const manifest = readyManifests.get(name);
      if (!manifest) continue;
      for (const [eventName, frameText] of Object.entries(manifest.eventFrames ?? {})) {
        const at = startAt + ((Number(frameText)-1) / Math.max(1,manifest.frames-1)) * (endAt-startAt);
        const key = `${name}:${eventName}`;
        if (age >= at && !state.events.has(key)) { state.events.add(key); onEvent?.(eventName,state.config); }
      }
    }
    const roleManifest = readyManifests.get(state.config.role);
    for (const [eventName,frameText] of Object.entries(roleManifest?.eventFrames ?? {})) {
      const at = state.config.roleAt + (Number(frameText)-1)/FPS;
      const key = `${state.config.role}:${eventName}`;
      if (age >= at && !state.events.has(key)) { state.events.add(key); onEvent?.(eventName,state.config); }
    }
  }

  function finish() {
    if (!state) return;
    const ended = state; state = null;
    onRole?.(null, ended.enemy, 0);
    onFinish?.(ended);
  }

  function drawLayer(ctx, viewport, layer) {
    if (!state) return;
    const { config } = state;
    const shortScale = state.repeat ? config.duration / .65 : 1;
    const age = state.age * shortScale;
    const clips = layer === "backdrop" ? [["common_01_darken",0,.55,"backdrop"],["common_02_entry_pulse",0,.7,"backdrop"],...config.clips] : [["common_03_name_impact_dust",.62,1.35,"foreground"],["common_04_boss_bar_drop",.2,1.1,"foreground"],["common_05_ink_absorb",config.duration-.55,config.duration,"foreground"],...config.clips];
    for (const [name,startAt,endAt,clipLayer] of clips) {
      if (clipLayer !== layer || age < startAt || age > endAt) continue;
      const manifest = readyManifests.get(name); if (!manifest) continue;
      const local = Math.max(0,Math.min(1,(age-startAt)/Math.max(.01,endAt-startAt)));
      const frame = state.reducedMotion ? Math.max(1,Math.round(manifest.frames*.72)) : Math.min(manifest.frames, 1 + Math.floor(local * (manifest.frames-1)));
      drawPlaced(ctx, name, imageFor(name, frame), viewport, state.reducedMotion ? Math.min(1,local*3) : 1);
    }
    if (layer === "foreground") drawHud(ctx, viewport);
  }

  function drawPlaced(ctx,name,image,v,alpha) {
    const anchors=v.anchors ?? {};
    const drawAt=(p,w=Math.min(v.w,v.h)*.55,a=alpha)=>{
      if(!p||!image?.complete||!image.naturalWidth)return;
      const scale=w/image.naturalWidth,h=image.naturalHeight*scale;
      ctx.save();ctx.globalAlpha*=a;ctx.drawImage(image,p.x-w/2,p.y-h/2,w,h);ctx.restore();
    };
    if(name==="zh_01_red_footprint") { (anchors.path??[]).slice(0,3).forEach((p,i)=>drawAt(p,Math.min(v.w,v.h)*.24,alpha*(.62+i*.18))); return; }
    if(name==="zh_06_wei_soldier_echo") { for(let i=0;i<6;i++){const side=i%2?-1:1,row=Math.floor(i/2);drawAt({x:(anchors.entrance?.x??v.w*.18)+side*(45+row*28),y:(anchors.entrance?.y??v.h*.36)+row*34},Math.min(v.w,v.h)*.3,alpha*.55);} return; }
    if(name==="smy_01_corner_cloud") { const pts=[[v.x,v.y],[v.x+v.w,v.y],[v.x,v.y+v.h],[v.x+v.w,v.y+v.h]]; pts.forEach(p=>drawAt(p,Math.min(v.w,v.h)*.78,alpha*.7)); return; }
    if(name==="smy_03_chess_piece_drop") { [anchors.entrance,anchors.water,anchors.camp].filter(Boolean).forEach((p,i)=>drawAt(p,Math.min(v.w,v.h)*.2,alpha*(.65+i*.14))); return; }
    if(name==="feng_01_water_reverse_tile"||name==="feng_02_water_crack") { (anchors.waters??[anchors.water]).filter(Boolean).forEach(p=>drawAt(p,Math.min(v.w,v.h)*.2,alpha)); return; }
    if(name==="feng_08_water_target_line") { fitDraw(ctx,image,v,alpha); [anchors.entrance,anchors.water,anchors.supply].filter(Boolean).forEach(p=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=state.config.color;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.restore();}); return; }
    if(name==="common_02_entry_pulse") { drawAt(anchors.entrance??{x:v.w*.12,y:v.h*.25},Math.min(v.w,v.h)*.5); return; }
    if(name==="zh_04_flag_drop"||name==="zh_05_flag_flutter"||name==="zh_08_iron_smoke_open"||name==="zh_09_square_scan_ring"||name==="feng_07_fan_water_burst"||name==="smy_04_long_shadow_extend"||name==="smy_07_command_wave") { drawAt(anchors.displayEntrance??anchors.entrance??{x:v.w*.3,y:v.h*.35},Math.min(v.w,v.h)*.72); return; }
    fitDraw(ctx,image,v,alpha);
  }

  function drawHud(ctx, v) {
    if (!state) return;
    const a = Math.min(1,state.age*5) * Math.min(1,(state.skipping ? state.finishLeft/.35 : (state.duration-state.age)/.18));
    const w = Math.min(v.w*.72, 650), x=v.x+(v.w-w)/2, y=Math.max(v.y+48,(v.anchors?.hudBottom ?? v.y+v.h*.075)+4);
    ctx.save(); ctx.globalAlpha=Math.max(.08,a);
    ctx.fillStyle="rgba(24,19,18,.9)"; ctx.fillRect(x,y,w,54);
    ctx.fillStyle=state.config.color; ctx.fillRect(x+10,y+39,w-20,6);
    ctx.fillStyle="#f5ead4"; ctx.textBaseline="middle"; ctx.font=`800 ${Math.max(17,Math.min(25,v.w*.027))}px serif`;
    ctx.textAlign="left"; ctx.fillText(state.config.name,x+18,y+22);
    ctx.textAlign="right"; ctx.font=`700 ${Math.max(12,Math.min(16,v.w*.018))}px sans-serif`; ctx.fillText(`${state.config.skill} · ${state.repeat ? "再临" : state.config.hint}`,x+w-18,y+22);
    ctx.restore();
  }

  return { start, update, drawBackdrop:(ctx,v)=>drawLayer(ctx,v,"backdrop"), drawForeground:(ctx,v)=>drawLayer(ctx,v,"foreground"), skip, finish,
    get active(){return Boolean(state);}, get snapshot(){return state ? {key:state.key,bossId:state.enemy?.id,variant:state.repeat?"repeat":"full",age:state.age,duration:state.duration,phase:state.phase,repeat:state.repeat,skipping:state.skipping,roleShown:state.roleShown}:null;} };
}
