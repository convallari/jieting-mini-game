export const STATE_PROFILES = {
  generalGlyph: ["neutral", "idle", "drag", "drop", "link", "unlink"],
  generalFormation: ["neutral", "form", "idle", "attack", "hit", "death", "skill", "break"],
  unit: ["neutral", "idle", "drag", "drop", "merge", "attack", "hit", "death", "sleep"],
  enemy: ["neutral", "move", "attack", "cast", "hit", "death"],
  terrain: ["neutral", "idle", "activate", "damaged", "destroy"],
  prop: ["neutral", "place", "armed", "trigger", "expire"],
  effect: ["play"]
};

export const GLYPH_ACTORS = {
  "马": { id: "glyph.ma", displayName: "马" }, "谡": { id: "glyph.su", displayName: "谡" },
  "王": { id: "glyph.wang", displayName: "王" }, "平": { id: "glyph.ping", displayName: "平" },
  "诸": { id: "glyph.zhu", displayName: "诸" }, "葛": { id: "glyph.ge", displayName: "葛" },
  "亮": { id: "glyph.liang", displayName: "亮" }, "赵": { id: "glyph.zhao", displayName: "赵" },
  "云": { id: "glyph.yun", displayName: "云" }, "张": { id: "glyph.zhang", displayName: "张" },
  "飞": { id: "glyph.fei", displayName: "飞" }, "超": { id: "glyph.chao", displayName: "超" },
  "黄": { id: "glyph.huang", displayName: "黄" }, "忠": { id: "glyph.zhong", displayName: "忠" }
};

export const FORMATION_RECIPES = [
  { id: "general.zhugeliang", displayName: "诸葛亮", members: ["诸", "葛", "亮"], span: 3 },
  { id: "general.masu", displayName: "马谡", members: ["马", "谡"], span: 2 },
  { id: "general.wangping", displayName: "王平", members: ["王", "平"], span: 2 },
  { id: "general.zhuge", displayName: "诸葛", members: ["诸", "葛"], span: 2 },
  { id: "general.zhaoyun", displayName: "赵云", members: ["赵", "云"], span: 2 },
  { id: "general.zhangfei", displayName: "张飞", members: ["张", "飞"], span: 2 },
  { id: "general.machao", displayName: "马超", members: ["马", "超"], span: 2 },
  { id: "general.huangzhong", displayName: "黄忠", members: ["黄", "忠"], span: 2 }
];

export const LEGACY_ACTOR_ALIASES = Object.fromEntries([
  ...Object.entries(GLYPH_ACTORS).map(([name, actor]) => [name, actor.id]),
  ...FORMATION_RECIPES.map((recipe) => [recipe.displayName, recipe.id]),
  ["zhaoYun", "general.zhaoyun"], ["zhangFei", "general.zhangfei"], ["maChao", "general.machao"]
]);

export const SOURCE_STRUCTURES = {
  "unit.qiang": {
    kind: "bakedComposite",
    logicalParts: ["radical.mu", "radical.cang"],
    editableParts: false,
    note: "现有PNG序列已合成，但保留木/仓双部件语义；不可把烘焙帧误报为独立图层。"
  },
  "general.zhaoyun": {
    kind: "spineParts",
    editableParts: true,
    parts: [
      { id: "glyph.zhao", idle: "zhan1", attack: "attack1" },
      { id: "glyph.yun", idle: "zhan2", attack: "attack2" }
    ],
    synchronization: "sharedSemanticStateAndNormalizedProgress"
  },
  "general.zhangfei": {
    kind: "spineParts", editableParts: true,
    parts: [{ id: "glyph.zhang", idle: "zhan1", attack: "attack1" }, { id: "glyph.fei", idle: "zhan2", attack: "attack2" }],
    synchronization: "sharedSemanticStateAndNormalizedProgress"
  },
  "general.machao": {
    kind: "spineParts", editableParts: true,
    parts: [{ id: "glyph.ma", idle: "zhan1", attack: "attack1" }, { id: "glyph.chao", idle: "zhan2", attack: "attack2" }],
    synchronization: "sharedSemanticStateAndNormalizedProgress"
  }
};

export const SOURCE_DISPLAY_POLICY = {
  mode: "sourceFirst",
  allowImplicitSplit: false,
  allowImplicitMerge: false,
  derivedCompositeRequiresDeclaration: true,
  preserveNativeBonesSlotsLayersAndFrames: true
};

export function stateMatrixForActor(actorType, available = []) {
  const applicable = new Set(STATE_PROFILES[actorType] ?? []);
  const authored = new Set(available);
  const allStates = [...new Set(Object.values(STATE_PROFILES).flat())];
  return Object.fromEntries(allStates.map((state) => [state, {
    status: !applicable.has(state) ? "notApplicable" : authored.has(state) ? "authored" : state === "neutral" ? "source" : "missing"
  }]));
}
