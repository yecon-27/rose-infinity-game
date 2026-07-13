# 玫瑰无限 · Rose Infinity

> 腾讯云黑客松 2026 · 赛题三（叙事类游戏）
> 一个关于"回避的人也能学会好好爱"的治愈系互动叙事。你先亲历一段温暖的关系如何在一连串"看起来都对"的选择里悄悄流走；再回到记忆里，找出当年没看见的那些瞬间，学着把遗憾接回来。

技术栈：Next.js 14 (App Router) + React 18 + TypeScript + Tailwind + 腾讯混元（Hunyuan）运行时 AI。

---

## 运行 / 预览

```bash
pnpm install          # 首次
pnpm dev              # 开发服务器 → http://localhost:3000
pnpm build            # 只想查编译错误
```

- 需要 `.env.local`（参照 `.env.local.example`）填入混元 API key。
- 起服务后访问 `/api/test` 可确认混元连通。

设计基准见 `docs/writing/dialogue-style-guide.md`（第一部分是准绳，第二部分是台词圣经）。
CodeBuddy 留痕见 `docs/codebuddy-留痕指南。md`。

---

## 重构路线图（从旧作《过滤器》→《Rose Infinity》）

本作由旧的"过滤器"机制彻底转型。三方并行推进：

| 谁 | 负责 | 状态 |
|---|---|---|
| 作者 | 美术生图（混元） | ✅ 已生成 Vera/Sean 立绘、场景图 |
| CodeBuddy | `lib/npc-prompt.ts` 双人设 + `api/npc` + `api/reveal`（她那一侧） | ✅ 首版已提交 |
| Kiro | 改名 / 去过滤器 / 场景 / 前端 / 结局 | 🔧 入口页已改，其余进行中 |

### 阶段 1 · 去过滤器 + 改名（地基，P0）
- 全局 阿沉→Vera、阿默→Sean（除 CodeBuddy 负责的 3 个文件）。
- 撤掉玩家可见的"过滤器 / 情绪天平 / 裂纹 / 穿透"——`app/game/page.tsx` 里的天平条、裂纹 SVG、相关 toast 与 hint。
- `lib/intensity.ts`、`lib/filter-prompt.ts`、`app/api/filter` 等纯过滤器逻辑：删或改造。
- 完成标准：旧流程仍能跑，但已无任何"过滤器"痕迹，人物是 Vera/Sean。

### 阶段 2 · 场景重写 `lib/scenes.ts`（内容，P0）
按新弧线搭：
1. **甜蜜期**——黑客松那夜（锚点）、挑衣服、聊哲学；"未来的小房子"为贯穿母题。
2. **爆发期**——查手机（不安全感，多半不是真出轨）。
3. **僵持期**——圆滑躲闪 + 体面收住的冷对话（复用旧的克制笔法）。
4. **风干 / 分手** → **半年后（痛与看懂）** → **治愈**。
- 对齐 CodeBuddy 生成的立绘/场景图文件名。
- 3 天现实版：先保证 甜蜜 1–2 幕 + 僵持 + 分手 + 事后 能串成完整闭环。

### 阶段 3 · 新核心"看见 / 找出"（玩法灵魂，P1）
- "先活一遍 → 回记忆里重新看"的两段结构。
- 倒带 / 放慢 / 盯帧 / 接住的交互（先在一个场景做出亮点）。
- 依赖 `api/reveal` 生成"她那一侧"。

### 阶段 4 · 结局 + 收尾（P1）
- 四种收束：风化 / 清醒告别 / 玫瑰开 / "无限"门。重写 `app/ending/page.tsx`。

### 阶段 5 · 部署 + 提交物（P0，最后）
- 部署上线；Demo 视频；介绍 PPT；导出 CodeBuddy 留痕。

---

## 协作接口（Kiro 前端 ↔ CodeBuddy prompt 的对齐点）

1. **`NpcContext`**:`persona: "sean" | "vera"`、`phase: "warm" | "strained"`、`partnerSpoken`、`situation`、`direction`。
   - 兼容：`api/npc` 暂时也接受旧字段（`chenSpoken`/`amoDirection`/`spokenTone`/`persona:"chen"|"amo"`)，前端迁移完成后可移除。
2. **`api/reveal` 输入/输出**：输入 `{ sceneBrief, situation, herCircumstance, herSpoken, phase }`；输出 `{ inner }`。
3. **美术文件名**：场景引用图片前，先核对 `public/images/` 下 CodeBuddy 生成的实际文件名。

---

## 协作纪律

- Kiro 与 CodeBuddy **共用一个工作目录、同一分支 `rose-infinity`**。
- **同一时刻只让一个 agent 动手**：一方改完提交、工作区干净，再切另一方。
- 各自只碰自己负责的文件，减少冲突。

---

## 待办任务 (TODO · 滚动）

### 交给 CodeBuddy
- [ ] **npc 改"情境驱动"**（明天做）:`lib/npc-prompt.ts` 里废弃 `balance: -100~+100` 数值和 `Tone` 枚举驱动，改为 **`phase`（温度） + `direction`（自然语言表演指示，喂给 LLM) + 场景侧 `reach` 标记**（只标"伸手"的拍，服务"看见"机制）。删掉 `balanceNote()`。依据见 `docs/writing/dialogue-style-guide.md` 0.3 末「一体两面怎么驱动」。
  - **难度：低。** 主要是删 `balanceNote`/`balance`、让 prompt 显著注入已存在的 `direction` 字段；`reach` 只是在 scene 类型里加个布尔字段（scenes 反正要重写）。真正难的"消费 reach 的看见机制"是阶段 3，与本改动无关。
- [ ] warm 段照更新后的禁词表分级放开（允许长句/会闹会贫/感叹号/两人共享的旧梗；仍禁撒娇、自知可爱、网文梗）。

### Kiro（我）
- [ ] **阶段 1：去过滤器 + 改名**(`game/page.tsx`、`scenes.ts`、`intensity.ts`、`filter-prompt.ts`、`playthrough.ts`、`prologue`、`ending`)——**尚未做**，当前这些文件里 阿沉/阿默/过滤器/天平/裂纹/穿透 都还在。
- [ ] 阶段 2：场景按新弧线重写。
- [ ] 阶段 3/4/5：见上方路线图。
