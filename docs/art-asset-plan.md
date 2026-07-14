# 《Rose Infinity》美术生图清单 · 分幕

> 目的：一次规划好整条弧线要生成的图。按"幕 → 场景图 + 两人各自的表情立绘 + 服装"列。
> 依据弧线见 `docs/writing/dialogue-style-guide.md` 0.5「关系的一生」。
> ⚠️ 剧本尚在推进，靠后的幕是**预估**，数量/表情待剧本定稿后微调。

---

## 一、通用规范（每张图都遵守）

- **风格**：水彩手绘、颜料晕染、水彩纸纹理、柔光、暖冷对比、留白、微忧郁、胶片颗粒。
- **立绘**：半身/膝上构图，**透明背景**（去背版 `_remove_bg/*_抠图。png`)；场景图为全图。
- **命名**：场景 `public/images/scenes/<名>.png`；立绘 `public/images/characters/<vera|sean>-<key>.png`。生成后丢 `generated-images/`，跑 `node scripts/organize-art.mjs` 归位。
- **防"换人"铁律**:**同一幕内**，一个角色的所有表情必须**同发型、同服装、同光线、同画风、同机位**，只变面部表情与姿态。最好用同一条 base prompt，只改"表情"那一句。

## 二、服装随剧情走（本身就是叙事）

**关键设定：他们是学生，没有同居。** 场景发生在校园 / 宿舍楼 / 商场 / 便利店 / 食堂这类地方，**不是"两个人的家"**。按"学生情侣"典型化——别照搬任何人的真实宿舍，也别把关系写成已成家的成年人（叙事红线：素材是材料，不是日记）。

衣着从"共享感"滑向"各穿各的"，从暖滑向冷——和关系同步降温：

| 阶段 | 基调 | Vera | Sean |
|---|---|---|---|
| 甜蜜期 | 松弛、暖、有呼应 | 宽松针织/卫衣，暖色 | 连帽卫衣，暖色；两人色调相近 |
| 爆发期 | 学生日常、夜里紧绷 | 日常便服（非睡衣） | 日常便服；两人色调仍相近 |
| 僵持期 | 收、冷、体面 | 扣好的衬衫/外套，灰冷色 | 外套，颜色转冷；两人不再呼应 |
| 分手夜 | 素、准备离开 | 外套 + 拎着袋子（来收东西/要走） | 卫衣，松塌 |
| 半年后 | 一点新气象 | 比从前讲究一点点（走出来了） | （多半不出场，或远景 1 张） |

---

## 三、分幕清单

### 甜蜜期

#### 幕1 · 黑客松那夜 ✅（已做 / 图已生成）
- **场景图 ×2**：黑客松会场（冷屏幕光）、楼梯间（夜、暖黄灯）。
- **Sean ×4**：`focused` 盯屏专注/略烦 · `tired` 熬夜卸防（好累）· `warm` 被接住后的柔软 · `guilty` 理亏退缩。
- **Vera ×3**：`warm` 温柔浅笑（默认）· `focused` 认真想靠近（伸手）· `composed` 压着情绪的平静（咽下委屈）。
- 服装：甜蜜期休闲暖色。

#### 幕2 · 挑衣服（甜蜜日常，预估）
> **剧情**：出门前，Vera 把 Sean 从头到脚捯饬一遍，用自己的审美给他挑一身。种子——她那句"就这件，不许换"此刻是可爱的强势，日后同一只手会变成控制。

- **场景图 ×1**：商场里的服装店 / 试衣间外。暖光、成排衣架、一面试衣镜，午后逛街的松弛。
- **服装**：甜蜜期休闲暖色；Sean 另可出"被她挑好换上的那身"1 张（可选，更整齐）。
- **Sean ×2**
  - `warm` 被摆弄的无奈宠溺笑——微摊手站着，眼神一直跟着她，嘴角松。
  - `neutral` 当模特的呆——直挺挺站好、目视前方，一点点好笑的僵。
- **Vera ×2**
  - `focused` 审美上头、认真打量——手托下巴或拽着他衣角，上下端详，眼神专注。
  - `playful` 得意宣布"就这件"——眼睛发亮、微扬下巴，小得意（但不谄媚、不撒娇）。

#### 幕3 · 分享《非暴力沟通》（甜蜜 · 互相欣赏，预估）
> **剧情**：Vera 坦白自己性子急、这阵子总冲他发脾气，想学学非暴力沟通；Sean 说很欣赏她这股肯改的劲，"其实你也一直在包容我"，让她学到什么多跟他分享。
> **反讽（本幕的魂）**：他们此刻正握着沟通的工具、还在互相欣赏地讨论怎么更好地爱——可日后 drift 里没能用上。做得到，只是撑不住。
> **种子**：Vera 承认的急脾气 = 日后查手机爆发要喷的焦虑那面；Sean 把她的"包容"当美德，没看出那是她在硬撑（自我消音）。

- **场景图 ×1**：校园长椅 / 宿舍楼下 / 咖啡馆，两人并肩，手里一本《非暴力沟通》。暖光、松弛、有书。（"未来的小房子"憧憬可用 `future-apartment` 作可选插入镜头）
- **服装**：甜蜜期休闲暖色，两人色调相互呼应。
- **Sean ×2**
  - `warm` 欣赏地看着她——侧头、眼神软而专注。
  - `thoughtful` 认真接话、在想——微仰头，若有所思。
- **Vera ×2**
  - `earnest` 认真坦白、想改的真诚——微前倾、眼神亮而恳切。
  - `warm` 被他接住后的松弛笑。

### 爆发期

#### 幕4 · 查手机（2026-07-14 对齐新剧本）
> **剧情（已定稿）**：他大四，下周去外地实习报到；Vera 来他宿舍帮他收拾行李（室友已回家）。他下楼取快递（新买的行李箱）时手机亮了，她越查越信，质问、爆发。收尾他送她回去，一路隔着半步。

- **场景图**：复用 `dorm-room-night.png`（已生成）。
- **服装**：学生日常便服（不是睡衣）；两人色调仍相近，靠光线与表情区分紧张。
- **Sean（新表情）**
  - `wounded`（必做）被不信任刺到的委屈——眼神沉、抿嘴、垂眼。
  - `cold`（加分）关上的冷——面无表情、别开脸，下线。
- **Vera（新表情）**
  - `anxious`（必做）翻手机时的不安——眉紧、身体前倾、指尖发紧。
  - `hurt`（加分）破防——强撑着，眼眶红、嘴角抖。
  - `accusing`（加分）质问带刺——眼神发利、下巴微抬。

### 僵持期

#### 幕5 · 发烧夜（2026-07-14 对齐新剧本）
> **剧情（已定稿）**：Sean 在实习城市的宿舍发烧（床垫还是新的）；**Vera 在便利店上夜班**，柜台只有她一个人，走不开。"以后结婚了，工作也比家庭重要吗？"

- **场景图**：他那侧复用 `fever-night.png`；她那侧**复用 `konbini-night.png`**（幕中 `bg` 切换即可制造分屏感，无需新图）。
- **服装**：僵持期转冷。Sean 病中松散、脸色发白；**Vera 便利店工装/围裙**（这身也是幕7 呼应的一部分）。
- **Sean（新表情）**
  - `sick`（必做）发烧的虚弱——脸白、眼神发飘、裹着被子/毯子。
- **Vera（新表情）**
  - `torn`（必做）被撕扯——围裙解到一半的那三秒，眉心紧。

### 结束 & 事后

#### 幕6 · 好天气（原"分手夜"，2026-07-14 对齐新剧本）
> **剧情（已定稿）**：他实习后头一次回校的周末。有挽留（"要不，我们再试试"）、有眼泪，但"在一起还是会吵个不停"横在中间。哭着把话说明白，好好放手。他当晚翻相册、把有她的朋友圈一条条藏起来，带着泪痕睡着。

- **场景图**：复用 `dorm-doorway.png`（已生成）。
- **服装**：Vera 外套 + 拎着袋子；Sean 卫衣、松塌。
- **Sean（新表情）**
  - `grieving`（必做）站在灯下无声落泪——眼眶红、别过脸。剧本里有"你第一次看见他哭"，现在只能用 guilty 顶着，这张最值得补。
  - `pleading`（加分）挽留——往前半步、眼神急。
- **Vera（新表情）**
  - `crying`（必做）落泪但清醒——含泪点头。

#### 幕7 · 半年后
> **剧情（已定稿）**：还是那家便利店（她打过夜班的那家），柜台后站着新来的兼职生。"要，谢谢。今天有点冷。"收银台边有一小桶九块九的单支玫瑰，她看了两眼，没买。

- **场景图**：复用 `konbini-night.png`（已生成）。
- **Vera（新表情，加分）**
  - `calm` 平静/一点释然——松、眼神稳、淡淡的，不苦。穿得比从前讲究一点点。

#### 甜蜜期补漏
- **Vera `focused`（必做）**：幕2 挑衣服、幕3 各引用了 `face: "focused"`，但 `vera-focused.png` 当前缺失（引擎回退到默认脸，表情不到位）。`organize-art.mjs` 里"认真专注版"的归位映射还在，出图即接上。

#### 治愈 / 尾声 · 玫瑰母题
- 无需人物立绘。用已生成的 `rose-bud`（花苞）、`rose-bloom`（盛放）母题。

### 回看（看见机制）
- **不需要新图**：复用对应幕的场景图。

---

## 四、数量汇总（2026-07-14 更新）

| 优先级 | 立绘 | 说明 |
|---|---|---|
| 必做 ×7 | vera-focused / vera-anxious / vera-torn / vera-crying / sean-wounded / sean-sick / sean-grieving | 每幕情绪高点各有一张"对的脸"；场景图零新增 |
| 加分 ×5 | vera-accusing / vera-hurt / vera-calm / sean-cold / sean-pleading | 有余力再出 |

> 场景图**一张都不用新生成**：幕5 的分屏感用幕中 bg 切换（fever-night ↔ konbini-night）实现。

---

## 五、生图工单（直接贴 CodeBuddy · 2026-07-14）

> 用法：每张图 = **基底段 + 那一行表情差分**拼一起贴。同一角色所有图共用基底段，只换表情行，这就是"防换人铁律"的落实。
> 出图后丢 `generated-images/vera_remove_bg|sean_remove_bg/`（抠图版）按下表命名，跑 `node scripts/organize-art.mjs` 归位。

### Vera 基底段（照现有 vera-warm 特征写，勿改）

```
Hand-drawn watercolor illustration, character portrait, half-body, vertical composition.
A Chinese female college student in her early 20s, long straight black hair falling past
her shoulders, soft natural face, gentle composed presence. Soft muted watercolor palette,
loose brushwork, paper texture, white background, transparent-friendly, character only,
no scene. Same art style, same face, same hairstyle as previous portraits of this character.
```

| 表情差分（追加一行） | 服装行（追加一行） | 存为（抠图后） |
|---|---|---|
| `Expression: attentive and focused, leaning in slightly, bright appraising eyes, sizing something up with fond concentration.` | `Wearing: cream knitted sweater, warm tone.`（与现有一致） | `认真专注版_抠图.png` → vera-focused |
| `Expression: anxious and tense, brows knitted, eyes fixed downward as if on a phone screen, fingertips tight, breath held.` | `Wearing: everyday casual student clothes, slightly cooler tone.` | `不安版_抠图.png` → vera-anxious |
| `Expression: torn and conflicted, half-turned as if about to leave, pained hesitation in the eyes, lips pressed.` | `Wearing: convenience store staff apron over a plain shirt, night shift, cold fluorescent light feel.` | `撕扯版_抠图.png` → vera-torn |
| `Expression: crying quietly but clear-eyed, tears on cheeks, chin steady, nodding through tears, heartbroken yet resolved.` | `Wearing: light coat, muted cold tone.` | `含泪版_抠图.png` → vera-crying |
| `Expression: sharp accusing gaze, chin slightly raised, eyes bright and cutting.`（加分） | 同 anxious 服装行 | `质问版_抠图.png` → vera-accusing |
| `Expression: on the verge of breaking, forcing composure, reddened eyes, trembling mouth corner.`（加分） | 同 anxious 服装行 | `破防版_抠图.png` → vera-hurt |
| `Expression: calm and gently released, soft steady gaze, faint peaceful ease, quietly grown.`（加分） | `Wearing: slightly more put-together outfit, a small sign of new life.` | `释然版_抠图.png` → vera-calm |

### Sean 基底段（照现有 sean-warm 特征写，勿改）

```
Hand-drawn watercolor illustration, character portrait, half-body, vertical composition.
A Chinese male college student in his early 20s, short black hair, boyish honest face,
lean build. Soft muted watercolor palette, loose brushwork, paper texture, white background,
transparent-friendly, character only, no scene. Same art style, same face, same hairstyle
as previous portraits of this character.
```

| 表情差分（追加一行） | 服装行（追加一行） | 存为（抠图后） |
|---|---|---|
| `Expression: wounded by distrust, eyes lowered and dark, lips pressed thin, quietly hurt, shoulders drawn back half a step.` | `Wearing: everyday casual student clothes, slightly cooler tone.` | `被刺伤版_抠图.png` → sean-wounded |
| `Expression: feverish and weak, pale face, unfocused glassy eyes, wrapped in a blanket, exhausted.` | `Wearing: loose home clothes, blanket over shoulders, sickly pale.` | `发烧版_抠图.png` → sean-sick |
| `Expression: silent tears under a doorway light, reddened eyes, face slightly turned away, grief held with dignity.` | `Wearing: loose hoodie, slumped, muted cold tone.` | `落泪版_抠图.png` → sean-grieving |
| `Expression: shut down and cold, expressionless, face turned aside, emotionally offline.`（加分） | 同 wounded 服装行 | `冷下来版_抠图.png` → sean-cold |
| `Expression: pleading, half a step forward, urgent hopeful eyes, about to say "let's try again".`（加分） | 同 grieving 服装行 | `挽留版_抠图.png` → sean-pleading |

### 出图自查（每张过一遍）

1. 和现有 vera-warm / sean-warm 摆在一起，是同一个人吗（发型、脸型、画风）？
2. 半身、竖构图、白底、无场景元素？
3. 表情读得出目标情绪，且**不夸张**（这游戏的表演是收着的）？
