# CodeBuddy 留痕指南（CLI 版）

> 目标：把开发过程中的 AI 对话记录保存好、能拿出来展示。这是比赛提交清单里的**必交项**
> （作品链接 + Demo 视频 + 介绍 PPT + **CodeBuddy 历史对话记录**）。

---

## 一、对话记录本身（必交）

你用的是 **CLI 版**，所有会话以 `jsonl` 存在本地：

```
~/.codebuddy/projects/<项目路径编码>/<session-id>.jsonl
```

每个文件是一个会话，含完整的 prompt、AI 回复、工具调用、时间戳——这是**最硬核的证据**，可以直接打包提交。

### 用导出脚本转成可读页面（推荐）

仓库里已备好 `scripts/export-codebuddy-sessions.mjs`，把 jsonl 转成按时间排序的 Markdown 对话页。转换脚本本身也体现工程能力。

```bash
# 先看有哪些会话（轮次、时间一目了然）
node scripts/export-codebuddy-sessions.mjs --list

# 只导出当前项目到 ./codebuddy-export/
node scripts/export-codebuddy-sessions.mjs

# 只导出某个 jsonl 或某个目录
node scripts/export-codebuddy-sessions.mjs ~/.codebuddy/projects/<目录>/

# 导出当前项目到比赛材料目录
node scripts/export-codebuddy-sessions.mjs --out docs/codebuddy-log

# 只有明确需要时才扫描全部项目
node scripts/export-codebuddy-sessions.mjs --all
```

导出器不会在当前项目匹配失败时自动扫描其他仓库。导出后 `codebuddy-export/README.md` 是索引页，每个有效会话一个 `.md`；工具调用折叠在 `<details>` 里，内部 reasoning 与文件快照不导出。

脚本会自动脱敏常见 API Key、腾讯云 SecretId / SecretKey、Bearer Token 和 URL 查询密钥，并把本机主目录替换为 `~`。正式提交前仍应再做一次敏感信息扫描。

### 补充证据

- **会话列表截图**:`codebuddy -r` 弹出的列表界面截个图，一眼看出开了多少会话、各在做什么。
- **重点会话长截图**：侧边栏/终端里把关键会话逐个滚动截长图，按时间顺序整理。

---

## 二、过程性证据（加分）

1. **录屏**：关键节点录几段——比如让 CodeBuddy 从零生成一个核心模块、或一次"失败 → 纠正 → 成功"的来回调试。剪进 Demo 视频，评委看"AI 创作说明"时最吃这套。
2. **Git 小步提交**:commit message 里标注哪些部分由 CodeBuddy 生成/重构。`git log` 的时间线能和对话记录的时间戳互相印证。
3. **`CODEBUDDY.md`**：在仓库根放一份（`/init` 生成），说明你是认真把它当工作流，不是赛后补的。

---

## 三、PPT 的"AI 创作说明"页

- 画一张**人机分工图**：哪些是你的架构决策 / prompt 设计，哪些是 CodeBuddy 生成的，迭代了几轮。
- 配几张典型对话截图，尤其是**一次完整的"失败 → 纠正 → 成功"来回**——比单纯堆聊天记录有说服力得多。

---

## 四、最重要的一条

**从第一天就有意识地留，别临提交才回头找。** 每天收工：

```bash
node scripts/export-codebuddy-sessions.mjs --out docs/codebuddy-log
```

把当天的关键会话归档一次，比赛后从几十个 session 里翻要轻松得多。

---

## 本项目当前会话概览（2026-07-15）

- 已检测到 14 个会话文件，其中 12 个包含有效对话，时间跨度 7/2–7/14。
- 新版格式完整解析后共有 785 轮对话、1183 次工具调用；轮次最多的几个会话是《Rose Infinity》的设计与开发主线。
