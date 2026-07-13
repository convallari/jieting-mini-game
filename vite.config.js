import { defineConfig } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SAVE_PATH = "/__jieting/save-actor-pack";
const MAX_PACK_BYTES = 25 * 1024 * 1024;

function actorPackWriter() {
  return {
    name: "jieting-actor-pack-writer",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== SAVE_PATH || request.method !== "POST") return next();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        try {
          const chunks = [];
          let size = 0;
          for await (const chunk of request) {
            size += chunk.length;
            if (size > MAX_PACK_BYTES) throw new Error("动画包超过 25MB 限制");
            chunks.push(chunk);
          }
          const pack = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (pack?.format !== "jieting-actor-animation-pack" || !pack.actors) {
            throw new Error("不是有效的街亭角色动画包");
          }

          const outputDir = resolve(process.cwd(), "public", "handdrawn-glyphs");
          await mkdir(outputDir, { recursive: true });
          let layersSaved = 0;
          const manifest = structuredClone(pack);
          for (const [actorId, actor] of Object.entries(manifest.actors)) {
            if (!/^[a-z0-9._-]+$/i.test(actorId)) throw new Error(`非法资产 ID: ${actorId}`);
            for (const [layerId, layer] of Object.entries(actor.layers ?? {})) {
              if (!/^[a-z0-9_-]+$/i.test(layerId)) throw new Error(`非法图层 ID: ${layerId}`);
              if (!layer.dataUrl) continue;
              const match = /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(layer.dataUrl);
              if (!match) throw new Error(`${actorId}/${layerId} 不是 PNG 图层`);
              const file = `${actorId}_${layerId}.png`;
              await writeFile(resolve(outputDir, file), Buffer.from(match[1], "base64"));
              layer.file = file;
              delete layer.dataUrl;
              layersSaved += 1;
            }
          }
          await writeFile(
            resolve(outputDir, "jieting-actor-animation-pack.json"),
            JSON.stringify(manifest, null, 2),
            "utf8"
          );
          response.statusCode = 200;
          response.end(JSON.stringify({
            ok: true,
            actorsSaved: Object.keys(manifest.actors).length,
            layersSaved,
            directory: "public/handdrawn-glyphs"
          }));
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [actorPackWriter()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        glyphDesigner: "glyph-designer.html",
        animationLab: "animation-lab.html",
        originalAnimationReview: "original-animation-review.html",
        spineAnimationReview: "spine-animation-review.html"
      }
    }
  }
});
