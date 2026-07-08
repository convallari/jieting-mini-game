import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";

const videos = {
  v1: "C:/Users/zhangxiaoyu/xwechat_files/wxid_37jee7eu6pkt22_e280/msg/video/2026-07/5e6672b680af9115e03d4c04ed5d63ea.mp4",
  v2: "C:/Users/zhangxiaoyu/xwechat_files/wxid_37jee7eu6pkt22_e280/msg/video/2026-07/0f049627fb66ac43fad9e52cdf3e30eb.mp4"
};

const clips = [
  // Static camp cells: baseline shapes before board animation touches the glyph.
  { name: "v1-camp-empty-row", video: "v1", ss: "00:01:48.000", t: "1.2", crop: "300:86:64:690", fps: 12 },

  // Board units around active combat. These are the important deformation references.
  { name: "v2-board-qiang-dao-gong", video: "v2", ss: "00:01:19.650", t: "1.6", crop: "232:92:138:690", fps: 30 },
  { name: "v2-board-qi-huangzhong", video: "v2", ss: "00:01:19.650", t: "1.6", crop: "222:84:142:760", fps: 30 },
  { name: "v2-top-dao-gong-qi", video: "v2", ss: "00:01:19.650", t: "1.6", crop: "222:160:214:258", fps: 30 },
  { name: "v2-enemy-zei-right", video: "v2", ss: "00:01:19.650", t: "1.6", crop: "74:170:500:294", fps: 30 },
  { name: "v1-board-weapon-cluster", video: "v1", ss: "00:01:47.650", t: "1.6", crop: "278:116:102:246", fps: 30 },
  { name: "v1-board-lower-row", video: "v1", ss: "00:01:47.650", t: "1.6", crop: "278:116:102:462", fps: 30 },
  { name: "v1-enemy-bing-dou", video: "v1", ss: "00:01:47.650", t: "1.6", crop: "60:170:372:356", fps: 30 }
];

const root = "output/reference/animation-frames";
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

for (const clip of clips) {
  const dir = join(root, clip.name);
  mkdirSync(dir, { recursive: true });
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-y",
    "-ss",
    clip.ss,
    "-i",
    videos[clip.video],
    "-t",
    clip.t,
    "-vf",
    `fps=${clip.fps},crop=${clip.crop}`,
    join(dir, "frame-%03d.png")
  ], { stdio: "inherit" });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Animation reference frames written to output/reference/animation-frames.");
