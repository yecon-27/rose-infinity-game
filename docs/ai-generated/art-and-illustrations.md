# AI 生成原画留痕 · 角色立绘与场景背景

> 本文档记录由 CodeBuddy 调用腾讯混元生图模型(ImageGen 工具)生成的所有游戏原画。
>
> **生成工具**:CodeBuddy 内置 ImageGen 工具
> **生成模型**:腾讯混元生图模型
> **生成时间**:2026-07-02
> **对应赛题要求**:叙事类游戏 · 游戏原画 AI 完全产出(requirements.md 第三节)
> **生成方式**:在 CodeBuddy 对话中,以 prd.md 角色设定为需求输入,通过文字 prompt 直接生成图片
>
> 留痕方式:本文档记录每张图的 prompt、文件路径、用途,作为赛事评审依据。

---

## 生成记录

### #IMG-001 · 阿沉 · 角色立绘

**文件**:`public/images/characters/chen.png`
**用途**:玩家扮演的角色,显示在游戏页左侧(半透明,第一视角)
**Prompt**:

```
Hand-drawn watercolor illustration style character portrait, half-body,
neutral gender presentation, a person in their early 30s named Chen.
Calm, composed, slightly distant expression with a hint of restrained emotion.
Soft muted color palette, warm beige and grey tones.
Loose brushwork, emotional and atmospheric,
reminiscent of Florence or To the Moon game art style.
The character is wearing simple casual clothing.
Transparent background, character only, no scene.
Vertical portrait composition.
```

**风格参数**:`style: hand-drawn watercolor illustration, soft brushwork, emotional, atmospheric, muted colors`,`background: transparent`,`size: 1024x1024`
**设计意图**:对应 prd 1.2 节"两个角色性别可模糊化/可选(用中性名字、避免性别化描写),让主题落在'依恋模式'而非'性别脚本'上"。立绘视觉气质呈现回避型人物"平静但有距离感"的特征。

---

### #IMG-002 · 阿默 · 角色立绘

**文件**:`public/images/characters/amo.png`
**用途**:AI 驱动的 NPC,显示在游戏页右侧
**Prompt**:

```
Hand-drawn watercolor illustration style character portrait, half-body,
neutral gender presentation, a person in their late 20s named Mo.
Soft, composed smile that looks slightly practiced,
eyes with a hint of distance.
Gentle and put-together appearance,
but with an underlying emotional reserve.
Soft muted color palette, warm beige and dusty rose tones.
Loose brushwork, emotional and atmospheric,
reminiscent of Florence or To the Moon game art style.
The character is wearing simple casual clothing.
Transparent background, character only, no scene.
Vertical portrait composition. Same art style as companion character Chen.
```

**风格参数**:同 #IMG-001
**设计意图**:对应 prd 1.2 节"阿默看起来云淡风轻,实际同样在等、在退、在自我合理化"。"slightly practiced smile"(略显刻意的笑容)呼应人物小传 #003 中"她最擅长在人前显得亲密,人后立刻拉开距离"——她表面比阿沉更柔和,但视觉上"eyes with a hint of distance"暗示同样的回避内核。

---

### #IMG-003 · 幕一·AA 制 场景背景

**文件**:`public/images/scenes/act1_restaurant.png`
**用途**:幕一游戏页全屏背景
**Prompt**:

```
Hand-drawn watercolor illustration scene background, no characters.
A quiet mid-range restaurant interior at evening,
warm soft lighting, empty table with a white bill placed on it,
two chairs facing each other but slightly apart.
Atmosphere of restrained silence, muted warm beige and amber tones.
Loose brushwork, emotional and atmospheric,
reminiscent of Florence game art style.
Wide scene composition, horizontal.
The scene should feel still, slightly lonely,
with a sense of distance between two people who are about to have a meal.
```

**风格参数**:`style: hand-drawn watercolor illustration, soft brushwork, emotional, atmospheric, muted warm tones`,`background: opaque`,`size: 1024x1024`
**设计意图**:对应 #004 场景背景"一家不算便宜也不算贵的餐厅,灯光暖,人不多。账单放在桌上,白纸黑字,清清楚楚"。画面中两把椅子"slightly apart"对应收尾旁白"半步之外的距离"——视觉从一开始就埋下疏离的伏笔。

---

### #IMG-004 · 幕二·烧烤局 场景背景

**文件**:`public/images/scenes/act2_bbq.png`
**用途**:幕二游戏页全屏背景
**Prompt**:

```
Hand-drawn watercolor illustration scene background, no characters.
An outdoor barbecue night market stall at night,
warm string lights overhead, empty plastic chairs and beer bottles
scattered on tables after a gathering. Wisp of smoke from grill.
Atmosphere of post-festivity emptiness,
a quiet street corner after friends have left.
Muted warm orange and cool blue night tones.
Loose brushwork, emotional and atmospheric,
reminiscent of Florence game art style.
Wide horizontal scene composition, slightly melancholic mood.
```

**风格参数**:`style: hand-drawn watercolor illustration, soft brushwork, emotional, atmospheric, night tones`,`background: opaque`,`size: 1024x1024`
**设计意图**:对应 #008 场景背景"散场了。朋友们各自散去"。画面"post-festivity emptiness"(散场后的空虚)直接呈现幕二的核心反差——人前的热闹 vs 人后的疏离。不画人物,只画空椅子和啤酒瓶,让"刚走开"的余韵自己说话。

---

### #IMG-005 · 幕五·终幕 场景背景

**文件**:`public/images/scenes/act5_room.png`
**用途**:幕五终幕游戏页全屏背景
**Prompt**:

```
Hand-drawn watercolor illustration scene background, no characters.
An ordinary apartment living room in daylight,
soft natural light through a window.
A half-packed cardboard box on the floor, a coat draped on a chair.
Nothing dramatic, just an ordinary weekend afternoon.
Atmosphere of silent departure, things being slowly taken away.
Muted cool grey and soft beige tones, gentle light.
Loose brushwork, emotional and atmospheric,
reminiscent of Florence game art style.
Wide horizontal scene composition,
very quiet, slightly suffocating in its ordinariness.
```

**风格参数**:`style: hand-drawn watercolor illustration, soft brushwork, emotional, atmospheric, muted grey tones, quiet`,`background: opaque`,`size: 1024x1024`
**设计意图**:对应 #011 场景背景"又是一个普通的周末。没有什么特别的事发生"。画面"a half-packed cardboard box"暗示阿默在收拾东西,但"nothing dramatic"——回避型分手的本质就是没有戏剧性,只有"搁置直至风化"。"slightly suffocating in its ordinariness"是这个画面要传达的核心情绪。

---

## 工具与流程说明

- **生成工具**:CodeBuddy 内置 ImageGen 工具(底层为腾讯混元生图模型)
- **调用方式**:通过 `DeferExecuteTool` 调用,参数包括 `prompt`、`size`、`style`、`background`、`quality`、`output_dir`、`footnote`(水印)
- **生成顺序**:阿沉立绘 → 阿默立绘 → 幕一场景 → 幕二场景 → 幕五场景(共 5 张)
- **人工介入**:无,所有图片直接采用 AI 产出
- **文件命名**:统一重命名为可读名称(chen.png / amo.png / act1_restaurant.png / act2_bbq.png / act5_room.png)

---

## 待生成(扩展阶段)

- [ ] 阿沉/阿默的表情差分(高兴/回避/沉默等)
- [ ] 第三视角合集的视觉差异化(去色/扁平化,对应"白描"风格)
- [ ] 结局报告页的视觉装饰
- [ ] UI 美术(按钮、对话框边框等)

---

## 更新记录

### 2026-07-02 · 透明背景修复 + 表情差分

**问题发现 #1**:ImageGen 工具即使传 `background: transparent` 也返回 RGB(无 alpha 通道)的 PNG,图片带白底,无法叠在场景背景上。

**解决方案 #1**:用 `sharp` 库写抠图脚本(`scripts/remove-bg.mjs`),基于颜色阈值把接近白色的像素替换为透明,边缘做羽化。所有立绘重新处理为 RGBA 透明背景。

**问题发现 #2**:固定阈值(235)方案失败。ImageGen 每次生成的背景色不固定——有的纯白(255,255,255),有的浅灰(207,211,204),有的中灰(172,163,157)。固定阈值只对纯白有效,导致 `chen-avoidant.png` 等图片背景完全没被抠掉,人物被淹没在灰色背景里(用户反馈为"第二幕左边人物变成光头")。

**解决方案 #2**:重写 `scripts/remove-bg.mjs`,改为**自动检测边缘背景色 + 基于距离抠图**:
1. 采样图片四边(每边 20px 宽)的所有像素,计算平均 RGB 作为背景色
2. 对每个像素计算到背景色的曼哈顿距离
3. 距离 < 40 → 完全透明;距离 40-80 → 线性过渡到透明
4. 距离 > 80 → 保留原 alpha

这样不管 ImageGen 给的背景是白、灰还是其他浅色,都能正确识别并抠掉。所有 6 张立绘用新脚本重新抠图,最终背景 alpha 全部降到 0(或羽化边缘的 26-64,视觉上透明)。

**新增表情差分**(共 4 张):

| 文件 | 角色 | 表情 | 触发场景 |
|---|---|---|---|
| `chen-avoidant.png` | 阿沉 | 回避(目光下移、面无表情) | 高强度过滤(完全回避) |
| `chen-vulnerable.png` | 阿沉 | 暴露(眼含泪光、嘴唇微张) | 低强度过滤(漏出一半) |
| `amo-distant.png` | 阿默 | 疏离微笑(人前表演) | 幕二烧烤局 |
| `amo-resigned.png` | 阿默 | 沉默决断(无笑、嘴抿成线) | 幕五终幕 |

**动态切换逻辑**:
- 阿沉立绘根据最后一次玩家输入的过滤强度切换:高强度→回避表情,低强度→脆弱表情
- 阿默立绘根据场景切换:幕一/默认→普通,幕二→疏离微笑,幕五→沉默决断

**新增文件**:
- `scripts/remove-bg.mjs` — 智能抠图脚本(自动检测背景色,通用工具)
- `scripts/analyze-head.mjs` — 头部区域透明度分析(调试用)
- `scripts/check-corners.mjs` / `scripts/check-all.mjs` — 角落像素检查(调试用)

---

## 待生成(扩展阶段)

- [x] 阿沉/阿默的表情差分(已完成 4 张)
- [ ] 第三视角合集的视觉差异化(去色/扁平化,对应"白描"风格)
- [ ] 结局报告页的视觉装饰
- [ ] UI 美术(按钮、对话框边框等)

---

### #IMG-010 · 标题页主视觉(合成)

**文件**:`public/images/scenes/title_keyart.png`(1920x1080)
**用途**:标题页全屏背景
**生成方式**:用已有 AI 生成素材(#IMG-001 阿沉立绘、#IMG-002 阿默立绘、#IMG-004 餐厅场景)通过 `scripts/make-title-art.mjs` 程序化排版合成——两人分立画面两侧,中间留出大片空白给标题。**中间的空隙就是"距离",构图本身即主题**。
**处理参数**:背景 blur(3) + 亮度 0.55;立绘裁透明边、压暗至 0.72、底部下沉 90px 只露头肩;叠加纵向渐变 + 径向暗角。
**复现**:`pnpm exec node scripts/make-title-art.mjs`

**后续替换方案(单张重新生成)**:如需一张一体化 key art,在 CodeBuddy ImageGen 中用以下 prompt 生成后直接覆盖同名文件即可:

```
Hand-drawn watercolor illustration, game title key art, cinematic wide composition.
Two people sitting at opposite ends of a long restaurant table at night,
a wide empty space between them, warm dim lighting, large window behind
showing a quiet street. Both figures calm, not looking at each other.
Soft muted palette, warm beige/grey with dusty rose accents. Loose brushwork,
melancholic and atmospheric, reminiscent of Florence / To the Moon game art.
Large negative space in the upper-middle area for title text.
16:9 landscape, 1920x1080.
```

