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
 * 无外部依赖,纯 Node。
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const CODEBUDDY_ROOT = path.join(HOME, ".codebuddy", "projects");
const MAX_BLOCK = 4000; // 单块内容超长则截断,避免 Markdown 过大

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

// CodeBuddy 把项目路径编码成目录名(路径分隔符换成 -)
function encodeProjectDir(cwd) {
  return cwd.replace(/[\/\\]/g, "-");
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
      console.warn(
        `没找到当前项目的会话目录:\n  ${guess}\n改为扫描全部: ${CODEBUDDY_ROOT}`
      );
      walk(CODEBUDDY_ROOT);
    }
  }
  return files;
}

function truncate(s) {
  if (typeof s !== "string") s = JSON.stringify(s, null, 2);
  return s.length > MAX_BLOCK
    ? s.slice(0, MAX_BLOCK) + `\n…(截断,原文共 ${s.length} 字符)`
    : s;
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
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return truncate(content);
  const out = [];
  for (const b of content) {
    if (!b || typeof b !== "object") {
      out.push(String(b));
      continue;
    }
    switch (b.type) {
      case "text":
        out.push(b.text ?? "");
        break;
      case "thinking":
        out.push(
          `<details><summary>💭 思考</summary>\n\n${truncate(
            b.thinking ?? b.text ?? ""
          )}\n\n</details>`
        );
        break;
      case "tool_use":
        out.push(
          `<details><summary>🔧 调用工具 \`${b.name}\`</summary>\n\n\`\`\`json\n${truncate(
            b.input ?? {}
          )}\n\`\`\`\n\n</details>`
        );
        break;
      case "tool_result": {
        let r = b.content;
        if (Array.isArray(r))
          r = r.map((x) => x?.text ?? JSON.stringify(x)).join("\n");
        out.push(
          `<details><summary>📤 工具结果</summary>\n\n\`\`\`\n${truncate(
            r ?? ""
          )}\n\`\`\`\n\n</details>`
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
  const raw = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const lines = [];
  let turns = 0;
  let first = null;
  let last = null;
  const sessionId = path.basename(file, ".jsonl");
  for (const line of raw) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = obj.timestamp || obj.time || null;
    if (ts) {
      if (!first) first = ts;
      last = ts;
    }
    if (obj.type === "summary" && obj.summary) {
      lines.push(`> 📌 摘要: ${obj.summary}\n`);
      continue;
    }
    const msg = obj.message || obj;
    const role = msg.role || obj.type;
    const label = ROLE_LABEL[role];
    if (!label) continue; // 非对话事件(元数据等)跳过
    const body = renderContent(msg.content);
    if (!body) continue;
    turns++;
    lines.push(`${label}${ts ? ` \`${formatTs(ts)}\`` : ""}\n\n${body}\n`);
  }
  return { sessionId, first, last, turns, md: lines.join("\n") };
}

// ---- 主流程 ----
const files = collectJsonl();
if (!files.length) {
  console.error("没找到任何 .jsonl 会话文件。");
  process.exit(1);
}

if (listOnly) {
  console.log(`共 ${files.length} 个会话:\n`);
  for (const f of files) {
    const { sessionId, first, last, turns } = convertFile(f);
    console.log(
      `- ${sessionId}  |  ${turns} 轮  |  ${formatTs(first)} → ${formatTs(last)}`
    );
  }
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const index = [];
for (const f of files) {
  const { sessionId, first, last, turns, md } = convertFile(f);
  if (!turns) continue;
  const header =
    `# CodeBuddy 会话 · ${sessionId}\n\n` +
    `- 时间: ${formatTs(first)} → ${formatTs(last)}\n` +
    `- 轮次: ${turns}\n` +
    `- 源文件: \`${f}\`\n\n---\n\n`;
  const outFile = path.join(outDir, `${sessionId}.md`);
  fs.writeFileSync(outFile, header + md, "utf8");
  index.push({ sessionId, first, last, turns, outFile });
}

index.sort((a, b) => String(a.first).localeCompare(String(b.first)));
const idx = [
  `# CodeBuddy 对话记录索引\n`,
  `共 ${index.length} 个会话(按时间排序)。\n`,
];
for (const it of index) {
  idx.push(
    `- [${it.sessionId}](./${path.basename(it.outFile)}) — ${
      it.turns
    } 轮 — ${formatTs(it.first)}`
  );
}
fs.writeFileSync(path.join(outDir, "README.md"), idx.join("\n"), "utf8");

console.log(`✅ 已导出 ${index.length} 个会话到 ${path.resolve(outDir)}/`);
console.log(`   索引页: ${path.join(outDir, "README.md")}`);
