# 街亭角色与字形动画统一资产标准 v3

## 统一原则

字形、将领阵型、敌兵、Boss、地形标记都属于 `actor`，使用同一个 `jieting-actor-animation-pack`。单字与组合将领是不同资产：`glyph.zhao`、`glyph.yun`各占一格，连续排列后由`general.zhaoyun`统一驱动组合动画。

## 将领阵型

- 每个单字永远是独立棋盘 actor、独占一格并可单独拖动。
- 单字将领字形使用 `generalGlyph` 状态表，本身不战斗。
- 横向从左到右连续匹配姓名后建立 `generalFormation`，只有阵型参与战斗。
- 赵云占两格；诸葛占两格；诸葛亮必须按“诸、葛、亮”占三格。
- 拖走任一成员立即拆阵，其他成员保持原位；重新排好后恢复阵型。
- 组合 `neutral` 可引用成员单字静态合成；组合动画只有一个状态机和一条统一进度。
- 稳定 ID 使用 `glyph.zhao`、`general.zhaoyun` 等英文标识，中文仅作显示名。

## 源结构保留

- 统一语义状态不等于拍平源素材。一个 `attack` 可以包含多个 part source clip，但所有 part 必须共享起点、归一化进度和事件。
- 赵云等旧 Spine 保留左右字骨骼与 `attack1/attack2`、`zhan1/zhan2` 的配套关系；设计台以 part 轨道展示和同步播放。
- 现有枪 PNG 是完整烘焙序列，登记为 `bakedComposite`，同时保留“木/仓”逻辑 parts；在没有原始分层文件时不得伪造独立可编辑层。
- 导出包使用 `sourceStructures` 记录 `spineParts / layered / bakedComposite`、part ID、源 clip 和是否可编辑。
- 合成 PNG、缩略图和游戏缓存只是派生物，不得覆盖或替代源骨骼、插槽、图层及其命名。
- 制作和审阅默认 `sourceFirst`：禁止为了界面整齐而隐式拆分、裁切、拼接或合并源资产。
- 多实例源资产以完整原生实例并排展示，不对单个实例做半幅裁切；烘焙图集始终按完整帧展示。
- 组合展示必须显式标记 `derivedComposite`，并同时提供返回各源资产的入口。

## 画布与坐标

- 逻辑画布固定 `512 x 512`，透明背景，安全留白 `48px`。
- 原点位于左上角；旋转与缩放默认围绕 `pivot`，标准支点为 `{ x: 256, y: 300 }`。
- 所有关键帧使用逻辑像素，不受设计台显示尺寸和游戏缩放影响。
- 主体必须在 `64 x 64` 的游戏预览中仍可辨认。

## 统一图层

- `ink`：必需。字形或角色主体，承担主要动作和受击反馈。
- `accent`：可选。服饰、阵营色、印章、武器装饰，可延迟跟随主体。
- `shadow`：可选。飞白、投影、冲刺拖影和死亡残影。
- `fx`：可选。蓄力光、符光、火星；只放角色附着特效。

纸牌底、等级数字、弹道、命中爆点、全屏特效不进入角色包，由游戏特效配方管理。

文件命名统一为 `{token}_{layer}.png`，例如 `masu_ink.png`、`masu_accent.png`。双字角色可以每个字一个 actor，也可以共用一个 `512 x 512` actor；同一角色内不得混用两种方式。

## 动作剪辑

所有 actor 使用以下标准动作名：

- `idle`：必需，默认 `12fps / 24帧 / loop`。
- `attack`：必需，默认 `12fps / 18帧`。
- `hit`：必需，默认 `12fps / 8帧`。
- `death`：必需，默认 `12fps / 24帧`。
- `skill`：将领与 Boss 必需，普通单位可选，默认 `12fps / 30帧`。

每个图层独立记录 `x / y / scale / rotation / opacity`。补间只允许 `linear`、`easeInOut`、`step`。普通动作优先使用变换关键帧；只有笔画轮廓必须改变时才制作替换帧。

## 关键帧制作量

- `idle`：2-3 个关键帧，幅度不超过主体高度的 `3%`。
- `attack`：4-6 个关键帧，依次为预备、蓄力、出手、接触、回收。
- `hit`：3-4 个关键帧，受击偏移不超过主体宽度的 `10%`。
- `death`：4-6 个关键帧，可使用旋转、下沉、透明度和散墨。
- `skill`：5-8 个关键帧，蓄力和释放必须有清晰区别。

一个动作不要求逐帧手绘。能由位移、旋转、缩放和图层错位表达的部分由设计台自动补间。

## 事件帧

动画只描述角色自身，战斗效果通过事件触发：

- `attackStart`：进入出手阶段。
- `contact`：近战接触或伤害结算。
- `projectile`：生成箭、枪气等弹道。
- `skillCast`：释放技能配方。
- `footstep`：冲锋落脚与烟尘。
- `deathEnd`：允许回收角色实例。

事件帧不包含贴图，只记录 `{ frame, event, payload }`，由 `effectRecipes` 和音效映射消费。

## 角色类型与预设

- `glyph`：单字兵种，强调字形可读；默认复用 `meleeSlash / spearPierce / bowVolley / cavalryRush`。
- `general`：双字将领或大牌，允许更多装饰层；复用 `commandAura` 等预设。
- `enemy`：敌兵和 Boss，与 glyph/general 使用相同动作契约。
- `terrain`：山、水、营等标记，通常只提供 `idle / hit`。
- `prop`：拒马、伏火、疑兵墨阵，按需要提供 `idle / attack / death`。

Spine 和序列帧是同一 actor 协议的渲染后端。它们必须映射相同动作名与事件名，游戏逻辑不得依赖 Spine 内部动画名称。

已有资产通过 `source` 适配层进入同一编辑器：

- 横向序列帧图集按原始 `frames / frameWidth / frameHeight` 播放。
- Spine 保留原骨骼、皮肤和内部时间轴，并把原动作映射到标准 clip。
- 静态贴图视为单帧 bitmap source。
- 对已有资产的调整保存为 `sourceOverrides`，只记录标准动作映射、外层变换、附加图层和事件，不覆盖源文件。

## 导出包

设计台输出 v4 `jieting-actor-animation-pack.json`，每个 actor 至少包含：

```json
{
  "token": "masu",
  "actorType": "generalFormation",
  "stateProfile": "generalFormation",
  "members": ["glyph.ma", "glyph.su"],
  "span": 2,
  "canvas": { "width": 512, "height": 512 },
  "pivot": { "x": 256, "y": 300 },
  "layers": {},
  "clips": {
    "attack": { "fps": 12, "duration": 18, "loop": false, "tracks": {}, "events": [] }
  }
}
```

目标目录为 `public/handdrawn-glyphs/`。游戏接入时只读取 pack，不从文件名猜测动作和图层。

## 验收

- `idle / attack / hit / death` 完整；将领和 Boss 另有 `skill`。
- `attack` 至少存在一个 `contact` 或 `projectile` 事件。
- 任何关键帧不能让主体完全越过安全区，死亡动作除外。
- `64 x 64` 预览保持字形或角色轮廓可辨。
- `npm run check` 验证 token、图层、动作、事件、特效配方和文件完整性。

## 设计台

- 入口：`glyph-designer.html`。
- 主稿图层：`ink / accent / shadow / fx`。
- 对象工具：选择、框选、自由曲线、直线、橡皮。自由曲线、直线、拼装件和精细特效均保存为可编辑对象；框选工具可拖出矩形批量选择，切回“↖ 选择”后整体移动或删除。单个对象仍用右下角手柄缩放、上方圆柄旋转。
- 彩墨条：保留玄墨、蜀红、魏蓝、山青、水青、军金、烟灰、亮白快捷色；完整调色板按墨与纸、蜀军红、魏军蓝、山林青、水与玉、军金火焰、奇术紫分组，支持 HEX、自定义色和最近使用色。选中矢量对象时颜色直接作用于对象。
- 拼装条：军旗、盾纹、刀光、枪芒、箭矢、阵环、墨爆、烟尘、水纹、火星；选择后自动切换到推荐图层，点击画布盖入，可调尺寸与旋转。
- 精细素材条：使用项目原作的刀击、枪击、箭爆、骑尘、火焰、流星、墨爆、星芒、引导光和脚印；插入后仍保留素材 ID、所在图层、位置、缩放、旋转和透明度。
- 动画面板：选择动作、帧率、总帧，逐图层添加变换关键帧并自动补间。
- 制作清单：右侧按 actor 类型列出必做与建议状态；点击状态直接切换到对应时间轴。
- 素材库：已有字形、命中特效、Spine 角色、道具和个人分层稿可作为参考或并排比较。
- 素材库中的每张素材卡都可直接拖入主画布，落点生成独立可编辑对象；默认进入与素材用途匹配的 `ink / accent / fx` 图层，再用“↖ 选择”移动、缩放、旋转或删除。
- 素材卡 `E`：把已有序列帧、Spine 或静态贴图载入统一时间轴进行播放和非破坏性编辑。
- 左侧资产树分为单字、组合将领、兵种与道具；组合资产提供真实占格和拆阵模拟。
- 单字画布为 `512 x 512`；双字组合画布为 `1024 x 512` 两格；三字组合画布为 `1536 x 512` 三格。每格用分隔线和“字 · 1格”标签明确标识。
- 多字将领的 `neutral` 基础姿态由成员单字最新静态稿自动派生，一字一格排列并统一着军金色 `#d7aa3a`；派生基础层参与预览和导出，但不回写、不改色单字源稿。
- 对象缩放固定左上角锚点，拖动右下角缩放柄或修改缩放数值时，左上角位置保持不变；旋转仍围绕对象中心。

### 各类资产制作位置

| 资产类型 | 必做状态 | 建议状态 | 制作位置 |
| --- | --- | --- | --- |
| 单字将领 `generalGlyph` | `neutral` | `idle / drag / drop / link / unlink` | `neutral` 在主画布；动作在下方时间轴 |
| 组合将领 `generalFormation` | `neutral / form / idle / attack / hit / death / skill / break` | 无 | 主画布完成组合基准；其余在时间轴 |
| 兵种 `unit` | `neutral / idle / attack / hit / death` | `drag / drop / merge / sleep` | 主画布 + 时间轴 |
| 敌军/Boss `enemy` | `neutral / move / attack / hit / death` | `cast`，Boss 必做 | 主画布 + 时间轴 |
| 地形 `terrain` | `neutral` | `idle / activate / damaged / destroy` | 主画布 + 时间轴 |
| 道具 `prop` | `neutral / place / trigger / expire` | `armed` | 主画布 + 时间轴 |
| 特效 `effect` | `play` | 无 | `fx` 图层 + 时间轴 |

主字形和静态轮廓在中央主画布制作；阵营装饰放 `accent`，烟尘拖影放 `shadow`，攻击光与元素特效放 `fx`。所有位移、旋转、缩放、透明度动画都在下方时间轴制作，不为同一语义状态另建独立字形资产。

可编辑对象随角色元数据保存，结构至少包含 `id / kind / layer / x / y / scale / rotation / opacity`。曲线另含相对坐标 `points`，精细素材另含稳定 `assetId`。写入游戏时会生成无选择框的分层 PNG，设计台重新打开时仍读取对象数据，不能用合成 PNG 反向覆盖可编辑源数据。
