import fs from "node:fs";
import path from "node:path";

const sourceFile = path.resolve("output/reference/original-web/bundle-readable3.js");
const outputFile = path.resolve("output/reference/original-web/maps-decoded.json");
const source = fs.readFileSync(sourceFile, "utf8");
const names = ["te", "le", "ce", "ue"];
const maps = [];

for (const name of names) {
  const pattern = new RegExp(`this\\['${name}'\\]=JSON\\['parse'\\]\\(_0x99ab\\(("(?:\\\\.|[^"\\\\])*")\\)\\)`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Unable to locate original map block ${name}`);
  const jsonText = JSON.parse(match[1]);
  const config = JSON.parse(jsonText);
  maps.push({
    id: name,
    ...config,
    leftPath: findPath(config.map, config.ie, config.he),
    rightPath: findPath(config.map, config.ae, config.ne)
  });
}

fs.writeFileSync(outputFile, `${JSON.stringify({ cellWidth: 80, cellHeight: 80, maps }, null, 2)}\n`);
console.log(`Decoded ${maps.length} original maps to ${path.relative(process.cwd(), outputFile)}`);

function findPath(grid, start, end) {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (point) => `${point.x},${point.y}`;
  const passable = (x, y) => grid[x]?.[y] === "0_0" || grid[x]?.[y] === "0_1";
  const open = [{ ...start, g: 0, h: manhattan(start, end), parent: null }];
  const openByKey = new Map([[key(start), open[0]]]);
  const closed = new Set();

  while (open.length) {
    open.sort((a, b) => a.g + a.h - (b.g + b.h));
    const current = open.shift();
    openByKey.delete(key(current));
    if (current.x === end.x && current.y === end.y) {
      const path = [];
      for (let node = current; node; node = node.parent) path.unshift({ x: node.x, y: node.y });
      return path;
    }
    closed.add(key(current));
    for (const [dx, dy] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      const nextKey = `${x},${y}`;
      if (x < 0 || x >= rows || y < 0 || y >= cols || !passable(x, y) || closed.has(nextKey)) continue;
      const g = current.g + 1;
      const existing = openByKey.get(nextKey);
      if (existing && existing.g <= g) continue;
      const node = { x, y, g, h: manhattan({ x, y }, end), parent: current };
      if (existing) open.splice(open.indexOf(existing), 1);
      open.push(node);
      openByKey.set(nextKey, node);
    }
  }
  throw new Error(`No path from ${key(start)} to ${key(end)}`);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
