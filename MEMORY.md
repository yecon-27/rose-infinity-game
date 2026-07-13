# MEMORY · 《Rose Infinity / 玫瑰无限》协作记忆

> 供下次接手快速恢复上下文。这是一个**从旧作《过滤器》彻底转型**而来的叙事游戏项目。

## 1. 项目

- 腾讯云黑客松 2026 · 赛题三（叙事类游戏）。Next.js 14(App Router) + React 18 + TS + Tailwind + 腾讯混元(Hunyuan) 运行时 AI。pnpm。
- 提交约 7/15（也可能奔更晚的赛区路演）。要求:浏览器可运行、用 CodeBuddy 开发并导出对话留痕、AI 内容产出。

## 2. 转型：过滤器 → Rose Infinity（核心）

- **旧作《过滤器》已废弃**：旧机制是"玩家输入真心话 → AI 改写成防御版"。它把回避病理化成"说谎/压抑"，是错的模型，**整个删掉**（连同 filter-prompt/intensity/情绪天平/穿透/裂纹）。
- **新作《Rose Infinity / 玫瑰无限》**：治愈系。主题"回避的人也能学会好好爱"。玫瑰无限 = 爱是人人能学、能重来的；结局参考《花束般的恋爱》——不一定复合，是各自成长、爱在往后的人生里重开。
- 设计源头文件（**改动前必读**）：
  - `docs/writing/dialogue-style-guide.md` —— 第一部分**设计基准**(准绳) + 第二部分台词圣经。
  - `docs/writing/plot-outline.md` —— **剧情分幕源头**（美术/代码都从它派生）。
  - `docs/art-asset-plan.md` —— 分幕生图清单（服装/表情/场景）。

## 3. 设定与人物

- 玩家 = **Vera**(她, 主视角)；NPC = **Sean**(他, 广东人, 程序员)。二周目/回看视角对调。旧名 阿沉→Vera、阿默→Sean。
- 两个**学生**情侣（**没同居**！场景在校园/宿舍/商场/便利店），回避×焦虑、一体两面，**深爱却在"看起来都对"的选择里走散**。
- **铁律：没有坏人**——两人同等可理解、同等有责任、同等值得心疼。素材来自真实经历但**典型化**，不做日记、不渲染委屈（叙事红线见 0.8）。
- 一体两面驱动 = `phase`(warm/strained) × 情境（用自然语言 `direction`，**不用数值天平**）。

## 4. 弧线（关系的一生）

甜蜜 → 爆发 → 僵持 → 分手 → 半年后 → 治愈；**回看/看见**贯穿事后。母题：**"未来的小房子"**。

- 幕1 黑客松那夜（✅已实装）：她一次次伸手他没接，楼梯上一次**成功的修复**="做对的一次"范本。
- 幕2 挑衣服（商场）· 幕3 分享《非暴力沟通》（校园，反讽:握着沟通工具却没能用上）
- 幕4 查手机（爆发，不安全感，多半不是真出轨）——**适合接 LLM**
- 幕5 发烧夜（僵持，**两人都有错**：Sean 发烧要她来；Vera 被老师任务绊住+责任感当挡箭牌；Sean"结婚了工作也比家庭重要吗"）
- 幕6 分手夜（**相爱却走不下去**：有挽留有泪，但都认"在一起还会一直吵、校园恋情难有结果"。分开后 Sean 回避式麻木、半年后才痛）
- 幕7 半年后（她一个人，一句没修饰的真话，走出来一点）
- 治愈：玫瑰母题 rose-bud→rose-bloom。

## 5. 核心玩法 = 看见，不是选择

- 有限选项（无自由输入、无过滤器）。回避选项伪装成最成熟体贴的那个；落差**延后**到回看。
- **先活一遍 → 回记忆里找出没看见的"伸手"(`reach`标记) → 看清对方藏话 → 接住**。
- 回看页 `/look`：三个瞬间点亮→浮现 Sean 藏话；"接住"=不是再哄他，是互相/对自己（"这次先开口的是你"）。

## 6. 代码结构（现状）

- `lib/story.ts` —— **新场景数据模型**（我 Kiro 定的 schema，CodeBuddy 往里填内容）。
  - `Moment`: `narr` / `line`(who,text,face?) / `bg`(src) / `face`(who,emotion) / `beat`(prompt,situation,choices)。
  - `Choice`: text / reach? / face? / reply?(写死台词,带则不调LLM) / after?(分支结尾) / direction?(自然语言,留空reply时喂/api/npc)。
  - `Scene`: phase(warm/strained) / bg / veraFace? / seanFace? / pov? / onDone?(结束去向) / script。
  - `Lookback`(看见数据): intro / moments(bg,surface,hidden,who) / reachback(prompt,choice,response) / outro。
  - `STORY[]`、`LOOKBACKS`、`getStoryScene`、`getLookback`。幕1–幕7 已写入并 onDone 串接（幕2→…→幕7→"/"）。
- `app/game/page.tsx` —— 新引擎（打字机、moment 播放、选择、立绘交叉淡入、进场"记忆对焦"转场、beat 无 reply 则调 `/api/npc`、选择记 localStorage `rose:choices`、onDone 跳转）。
- `app/look/page.tsx` —— 看见/回看（立绘编排:前两瞬左侧Sean、第三瞬右侧Vera淡入左侧淡出；接住后立绘淡出、**延时**再让玫瑰盛放，不同时出现）。
- `app/prologue/page.tsx` —— "回到记忆"开场；`app/page.tsx` —— 标题，点开始"虚化下沉"到序章（不切黑）。
- `lib/npc-prompt.ts` + `app/api/npc` + `app/api/reveal` + `lib/banned-words.ts` —— **CodeBuddy 负责**：Sean/Vera 双人设、direction 驱动、禁词分级。
- `lib/hunyuan.ts`(混元客户端) + `app/api/test`。
- `app/globals.css`：暗底 `#0a0a0a`(修了模糊边缘白角) + fade-in/memory-focus/memory-title 等动画。
- `next.config.mjs`：dev 下 `images.unoptimized`（换同名图即时生效）。
- **已删**：filter-prompt.ts / intensity.ts / playthrough.ts / scenes.ts / api/filter / 旧 ending 页 / 6 个旧美术脚本 / 全部 .DS_Store。

## 7. 美术

- 流程：`generated-images/`(原始, 中文长名) → `scripts/organize-art.mjs` → `public/images/`(干净名)。去背用 `scripts/remove-bg.mjs`。
- 立绘：`vera-{warm,focused,composed,wistful}`、`sean-{warm,focused,tired,guilty}`。
- 场景：`hackathon-venue/stairs`、`mall-fitting`、`konbini-night/later`、`warm-room`、`future-apartment` = 真图；**`campus-bench`/`dorm-room-night`/`fever-night`/`dorm-doorway` = 占位图**（源图未生成，暂用 warm-room/act5_room 顶着，待生成后同名覆盖）。
- `generated-images/scenes/title-keyart-new.png` 未迁移（是否换上首页待定）。
- ⚠️ CodeBuddy 越界改了 `game/page.tsx`：把 `VERA_FACES`→`VERA_EMOTIONS`、删了 `focused`、默认表情改 `composed`。表情/图 = **最后统一 polish**（新表情 key 如 anxious/pleading 会优雅回退，不崩）。

## 8. 协作模型 & 教训

- **分工**：Kiro = 引擎/页面/结构 + story.ts 数据；CodeBuddy = npc-prompt/api + 美术生成 + 剧本填充。
- **留痕**：CodeBuddy CLI 会话在 `~/.codebuddy/projects/`，用 `scripts/export-codebuddy-sessions.mjs` 转 Markdown；指南见 `docs/codebuddy-留痕指南.md`。
- **⚠️ 教训**：CodeBuddy 数次越界改了 `app/` 下的页面/引擎，造成冲突（表情系统打架、场景图对不上名）。**协调铁律**：同一时刻只一个 agent 动手；改完提交、工作区干净再切；**CodeBuddy 只碰 story.ts 数据 / npc-prompt / api / 美术，别碰 app/ 页面**。用户手动提交。

## 9. 当前状态 / 待办

- ✅ 结构：幕1 全实装 + 回看/接住；幕2–幕7 已由 CodeBuddy 写成写死台词的骨架并串接；所有引用背景图磁盘上都在（2 真 + 4 占位）。`pnpm build` 绿。
- ⏳ **幕1 → 幕2 的衔接未接**（幕1 onDone 现在去 `/look` 然后回首页；需把主线串成 幕1→回看→幕2→…）——Kiro TODO。
- ⏳ Polish（留到最后）：爆发/发烧幕接 LLM 智能回应；补新表情+真图（含 4 张占位场景）；表情映射统一；title 是否换新。
- ⏳ 部署：Vercel / Cloud Studio，环境变量配 `HUNYUAN_API_KEY / BASE_URL / MODEL`（没配则 /api/npc 走兜底，写死台词的幕不受影响）。
- 旧文件 `prd.md` = 过滤器时代 PRD，已被新文档取代（可删，待用户确认）。
