import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const videos = [
  "C:/Users/zhangxiaoyu/xwechat_files/wxid_37jee7eu6pkt22_e280/msg/video/2026-07/5e6672b680af9115e03d4c04ed5d63ea.mp4",
  "C:/Users/zhangxiaoyu/xwechat_files/wxid_37jee7eu6pkt22_e280/msg/video/2026-07/0f049627fb66ac43fad9e52cdf3e30eb.mp4"
];

const outputRoot = "output/video-frames";
mkdirSync(outputRoot, { recursive: true });

for (const video of videos) {
  const name = basename(video, ".mp4");
  const outDir = join(outputRoot, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const overview = spawnSync(ffmpeg, [
    "-hide_banner",
    "-y",
    "-i",
    video,
    "-vf",
    "fps=1/2,scale=360:-1",
    join(outDir, "overview-%03d.jpg")
  ], { stdio: "inherit" });

  if (overview.status !== 0) process.exit(overview.status ?? 1);

  const bursts = [
    ["start", "00:00:01.000"],
    ["mid", "00:00:08.000"],
    ["late", "00:00:16.000"]
  ];

  for (const [label, start] of bursts) {
    const burst = spawnSync(ffmpeg, [
      "-hide_banner",
      "-y",
      "-ss",
      start,
      "-i",
      video,
      "-t",
      "1.2",
      "-vf",
      "fps=12,scale=360:-1",
      join(outDir, `${label}-%03d.jpg`)
    ], { stdio: "inherit" });

    if (burst.status !== 0) process.exit(burst.status ?? 1);
  }
}
