#!/usr/bin/env node
/**
 * CodeBuddy CLI 会话导出器
 *
 * 把 ~/.codebuddy/projects/<项目>/<session>.jsonl 转成可读的 Markdown 对话记录,
 * 用于比赛"CodeBuddy 历史对话"留痕提交。
 *
 * 用法:
 *   node scripts/export-codebuddy-sessions.mjs            # 导出当前项目的所有会话
 *   node scripts/export-codebuddy-sessions.mjs --all      # 导出 ~/.codebuddy/projects 下所有项目
 *   node scripts/export-codebuddy-sessions.mjs <文件|目录> # 指定 jsonl 文件或目录
 *   node scripts/export-codebuddy-sessions.mjs --list     # 只列出会话概览,不导出
 *   node scripts/export-codebuddy-sessions.mjs --out <目录># 指定输出目录(默认 ./codebuddy-export)
 *
 * 默认只扫描当前项目；不会在匹配失败时退回扫描全部项目。
 * 导出时会脱敏常见 API Key / Secret / Bearer Token,并省略内部 reasoning 与文件快照。
 * 无外部依赖,纯 Node。
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const CODEBUDDY_ROOT = path.join(HOME, ".codebuddy", "projects");
const MAX_BLOCK = 4000; // 单块内容超长则截断,避免 Markdown 过大
let redactionCount = 0;
let privacyReplacementCount = 0;

// ---- 解析参数 ----
const argv = process.argv.slice(2);
let outDir = "codebuddy-export";
let listOnly = false;
let scanAll = false;
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--out") outDir = argv[++i];
  else if (a === "--list") listOnly = true;
  else if (a === "--all") scanAll = true;
  else inputs.push(a);
}

// CodeBuddy 把绝对路径编码成目录名：去掉根路径开头，再把分隔符换成 -。
// 例如 /Users/ava/Developer/demo → Users-ava-Developer-demo。
function encodeProjectDir(cwd) {
  return path
    .resolve(cwd)
    .replace(/^[A-Za-z]:/, "")
    .replace(/^[\/\\]+/, "")
    .replace(/[\/\\]+/g, "-");
}

// 递归收集 .jsonl 文件
function collectJsonl() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".jsonl")) files.push(full);
    }
  };
  if (inputs.length) {
    for (const inp of inputs) {
      const full = path.resolve(inp);
      if (!fs.existsSync(full)) {
        console.warn(`跳过(不存在): ${full}`);
        continue;
      }
      if (fs.statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  } else if (scanAll) {
    walk(CODEBUDDY_ROOT);
  } else {
    const guess = path.join(CODEBUDDY_ROOT, encodeProjectDir(process.cwd()));
    if (fs.existsSync(guess)) walk(guess);
    else {
      console.error(
        `没找到当前项目的 CodeBuddy 会话目录:\n  ${guess}\n` +
          `为避免混入其他项目,本次不会自动扫描全部目录。\n` +
          `如确实需要全部项目,请显式添加 --all。`
      );
    }
  }
  return [...new Set(files)].sort();
}

function redactSecrets(value) {
  let out = String(value ?? "");

  const replace = (pattern, replacement) => {
    out = out.replace(pattern, (...args) => {
      redactionCount++;
      return typeof replacement === "function"
        ? replacement(...args)
        : replacement.replace(/\$(\d)/g, (_, n) => args[Number(n)] ?? "");
    });
  };

  const keyNames =
    "HUNYUAN_API_KEY|TENCENT_SECRET_ID|TENCENT_SECRET_KEY|OPENAI_API_KEY|API_KEY|SECRET_ID|SECRET_KEY";

  replace(
    new RegExp(`(["']?(?:${keyNames})["']?\\s*:\\s*["'])([^"'\\r\\n]+)(["'])`, "gi"),
    "$1[REDACTED]$3"
  );
  replace(
    new RegExp(`((?:export\\s+)?(?:${keyNames})\\s*=\\s*)([^\\s\\r\\n]+)`, "gi"),
    "$1[REDACTED]"
  );
  replace(/(Authorization["']?\s*[:=]\s*["']?Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]");
  replace(
    /(Bearer\s+)(?!\[REDACTED\])[^\s"'`<>|]+/gi,
    "$1[REDACTED]"
  );
  replace(/\b(?:sk|ck)[_-][A-Za-z0-9*_-]{8,}\b/gi, "[REDACTED_API_KEY]");
  replace(/\bAKID[A-Za-z0-9]{8,}\b/g, "[REDACTED_SECRET_ID]");
  replace(
    /([?&](?:access_token|token|api_key|apikey|secret|key)=)[^&\s"'<>]+/gi,
    "$1[REDACTED]"
  );

  if (out.includes(HOME)) {
    privacyReplacementCount += out.split(HOME).length - 1;
    out = out.split(HOME).join("~");
  }
  return out;
}

function stringify(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && value.type === "text") {
    return typeof value.text === "string" ? value.text : JSON.stringify(value, null, 2);
  }
  return JSON.stringify(value, null, 2);
}

function truncate(value) {
  const raw = redactSecrets(stringify(value));
  return raw.length > MAX_BLOCK
    ? raw.slice(0, MAX_BLOCK) + `\n…(截断,原文共 ${raw.length} 字符)`
    : raw;
}

// 把时间戳(毫秒/秒 epoch 或 ISO 字符串)格式化成本地可读时间
function formatTs(ts) {
  if (ts == null) return "?";
  let d;
  if (typeof ts === "number" || /^\d+$/.test(String(ts))) {
    let n = Number(ts);
    if (n < 1e12) n *= 1000; // 秒 → 毫秒
    d = new Date(n);
  } else {
    d = new Date(String(ts));
  }
  if (isNaN(d.getTime())) return String(ts);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

// 把一条消息的 content(字符串或 block 数组)渲染成 Markdown
function renderContent(content) {
  if (typeof content === "string") return truncate(content).trim();
  if (content && typeof content === "object" && typeof content.text === "string") {
    return truncate(content.text).trim();
  }
  if (!Array.isArray(content)) return truncate(content);
  const out = [];
  for (const b of content) {
    if (!b || typeof b !== "object") {
      out.push(String(b));
      continue;
    }
    switch (b.type) {
      case "text":
      case "input_text":
      case "output_text":
        out.push(truncate(b.text ?? ""));
        break;
      case "thinking":
        // 内部 reasoning 不属于比赛所需的人机对话证据,不导出。
        break;
      case "tool_use":
        out.push(
          `<details><summary>🔧 调用工具 \`${redactSecrets(b.name)}\`</summary>\n\n\`\`\`\`json\n${truncate(
            b.input ?? {}
          )}\n\`\`\`\`\n\n</details>`
        );
        break;
      case "tool_result": {
        let r = b.content;
        if (Array.isArray(r))
          r = r.map((x) => x?.text ?? JSON.stringify(x)).join("\n");
        out.push(
          `<details><summary>📤 工具结果</summary>\n\n\`\`\`\`text\n${truncate(
            r ?? ""
          )}\n\`\`\`\`\n\n</details>`
        );
        break;
      }
      case "image":
        out.push(`_(图片)_`);
        break;
      default:
        out.push(truncate(b));
    }
  }
  return out.join("\n\n").trim();
}

const ROLE_LABEL = {
  user: "### 🧑 用户",
  assistant: "### 🤖 CodeBuddy",
  system: "### ⚙️ 系统",
};

function convertFile(file) {
  const raw = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const lines = [];
  let turns = 0;
  let toolCalls = 0;
  let first = null;
  let last = null;
  const sessionId = path.basename(file, ".jsonl");
  const callResults = new Map(
    raw
      .filter((obj) => obj.type === "function_call_result" && obj.callId)
      .map((obj) => [obj.callId, obj])
  );

  for (const obj of raw) {
    const ts = obj.timestamp || obj.time || null;
    if (ts) {
      if (!first) first = ts;
      last = ts;
    }
    if (obj.type === "summary" && obj.summary) {
      lines.push(`> 📌 摘要: ${truncate(obj.summary)}\n`);
      continue;
    }

    if (obj.type === "function_call") {
      const result = callResults.get(obj.callId);
      const toolName = redactSecrets(obj.name || "unknown");
      const args = obj.arguments ?? obj.message ?? {};
      const status = result?.status ? ` · ${redactSecrets(result.status)}` : "";
      lines.push(
        `<details><summary>🔧 工具调用 \`${toolName}\`${status}</summary>\n\n` +
          `**输入**\n\n\`\`\`\`json\n${truncate(args)}\n\`\`\`\`\n\n` +
          (result
            ? `**结果**\n\n\`\`\`\`text\n${truncate(result.output ?? "")}\n\`\`\`\`\n\n`
            : "") +
          `</details>\n`
      );
      toolCalls++;
      continue;
    }

    // function_call_result 已在对应调用下合并；reasoning 与文件快照不导出。
    if (
      obj.type === "function_call_result" ||
      obj.type === "reasoning" ||
      obj.type === "file-history-snapshot"
    ) {
      continue;
    }

    const role = obj.role || obj.message?.role || obj.type;
    const label = ROLE_LABEL[role];
    if (!label) continue; // 非对话事件(元数据等)跳过
    const body = renderContent(
      obj.content ?? obj.message?.content ?? obj.message ?? ""
    );
    if (!body) continue;
    turns++;
    lines.push(`${label}${ts ? ` \`${formatTs(ts)}\`` : ""}\n\n${body}\n`);
  }
  return {
    sessionId,
    first,
    last,
    turns,
    toolCalls,
    md: lines.join("\n"),
  };
}

// ---- 主流程 ----
const files = collectJsonl();
if (!files.length) {
  console.error("没找到任何 .jsonl 会话文件。");
  process.exit(1);
}

if (listOnly) {
  let nonEmpty = 0;
  let totalTurns = 0;
  let totalToolCalls = 0;
  console.log(`共检测到 ${files.length} 个会话文件:\n`);
  for (const f of files) {
    const { sessionId, first, last, turns, toolCalls } = convertFile(f);
    if (turns) nonEmpty++;
    totalTurns += turns;
    totalToolCalls += toolCalls;
    console.log(
      `- ${sessionId}  |  ${turns} 轮  |  ${toolCalls} 次工具调用  |  ${formatTs(first)} → ${formatTs(last)}`
    );
  }
  console.log(
    `\n有效会话 ${nonEmpty} 个 · 对话 ${totalTurns} 轮 · 工具调用 ${totalToolCalls} 次`
  );
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const index = [];
for (const f of files) {
  const { sessionId, first, last, turns, toolCalls, md } = convertFile(f);
  if (!turns) continue;
  const header =
    `# CodeBuddy 会话 · ${sessionId}\n\n` +
    `- 时间: ${formatTs(first)} → ${formatTs(last)}\n` +
    `- 轮次: ${turns}\n` +
    `- 工具调用: ${toolCalls}\n` +
    `- 源会话: \`${path.basename(f)}\`\n\n---\n\n`;
  const outFile = path.join(outDir, `${sessionId}.md`);
  fs.writeFileSync(outFile, header + md, "utf8");
  index.push({ sessionId, first, last, turns, toolCalls, outFile });
}

index.sort((a, b) => String(a.first).localeCompare(String(b.first)));
const totalTurns = index.reduce((sum, it) => sum + it.turns, 0);
const totalToolCalls = index.reduce((sum, it) => sum + it.toolCalls, 0);
const idx = [
  `# 《Rose Infinity》CodeBuddy 开发记录\n`,
  `> 腾讯云黑客松 2026 · CodeBuddy 历史对话提交材料\n`,
  `- 有效会话：${index.length} 个`,
  `- 对话记录：${totalTurns} 轮`,
  `- 工具调用：${totalToolCalls} 次`,
  `- 时间范围：${formatTs(index[0]?.first)} → ${formatTs(index.at(-1)?.last)}`,
  `- 安全处理：API Key / Secret / Bearer Token 已自动脱敏，本机主目录已替换为 \`~\``,
  `- 内容范围：保留用户消息、CodeBuddy 回复与工具调用；省略内部 reasoning 和文件快照\n`,
  `## 快速核验\n`,
  `- [腾讯工具使用与重点会话摘要](./SUBMISSION-NOTES.md)\n`,
  `## 会话索引\n`,
];
for (const it of index) {
  idx.push(
    `- [${it.sessionId}](./${path.basename(it.outFile)}) — ${
      it.turns
    } 轮 / ${it.toolCalls} 次工具调用 — ${formatTs(it.first)}`
  );
}
fs.writeFileSync(path.join(outDir, "README.md"), `${idx.join("\n")}\n`, "utf8");

console.log(`✅ 已导出 ${index.length} 个会话到 ${path.resolve(outDir)}/`);
console.log(`   索引页: ${path.join(outDir, "README.md")}`);
console.log(`   对话 ${totalTurns} 轮 · 工具调用 ${totalToolCalls} 次`);
console.log(
  `   脱敏 ${redactionCount} 处 · 主目录路径替换 ${privacyReplacementCount} 处`
);
