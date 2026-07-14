#!/usr/bin/env tsx
/**
 * 配音批量生成器 · 腾讯云 TTS（TextToVoice）
 *
 * 遍历 lib/story.ts 全部台词/旁白/回看 → 离线合成 mp3 → public/audio/<hash>.mp3 + manifest.json。
 * 幂等：已有的文件跳过，改了剧本重跑即可，只补新增的句子。
 *
 * 前置：
 *   1. 腾讯云开通「语音合成 TTS」，拿 SecretId / SecretKey
 *   2. .env.local 里配 TENCENT_SECRET_ID / TENCENT_SECRET_KEY（可选 TENCENT_REGION，默认 ap-guangzhou）
 *   3. pnpm gen:voice
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STORY, LOOKBACKS } from "../lib/story";
import {
  VOICE_TYPES,
  VoiceSpeaker,
  normalizeForVoice,
  voiceHash,
} from "../lib/voice-core";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "audio");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

/* ── 读 .env.local（不引 dotenv） ── */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<
    string,
    string
  >;
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2];
    }
  }
  return env;
}
const env = loadEnv();
const SECRET_ID = env.TENCENT_SECRET_ID;
const SECRET_KEY = env.TENCENT_SECRET_KEY;
const REGION = env.TENCENT_REGION || "ap-guangzhou";
const DRY = process.argv.includes("--dry");

/* ── 收集全部待配音句子 ── */
interface Utt {
  who: VoiceSpeaker;
  text: string;
}
const utts: Utt[] = [];
function push(who: VoiceSpeaker | string, text: string) {
  const w = (who === "vera" || who === "sean" ? who : "narr") as VoiceSpeaker;
  if (normalizeForVoice(text)) utts.push({ who: w, text });
}

for (const scene of STORY) {
  const player: VoiceSpeaker = scene.pov === "sean" ? "sean" : "vera";
  for (const m of scene.script) {
    if (m.kind === "narr") push("narr", m.text);
    else if (m.kind === "line") push(m.who, m.text);
    else if (m.kind === "beat") {
      push("narr", m.prompt);
      for (const c of m.choices) {
        push(player, c.say ?? c.text);
        for (const r of c.reply ?? []) push(r.who, r.text);
        for (const a of c.after ?? []) push(a.who, a.text);
      }
    }
  }
}
for (const lb of Object.values(LOOKBACKS)) {
  for (const t of lb.intro) push("narr", t);
  for (const mo of lb.moments) {
    push("narr", mo.surface);
    push(mo.who, mo.hidden);
  }
  if (lb.reachback) {
    push("narr", lb.reachback.prompt);
    push("narr", lb.reachback.choice);
    for (const t of lb.reachback.response) push("narr", t);
  }
  for (const t of lb.outro) push("narr", t);
}

/* ── 腾讯云 API v3（TC3-HMAC-SHA256）签名与调用 ── */
function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}
function hmac(key: crypto.BinaryLike, msg: string): Buffer {
  return crypto.createHmac("sha256", key).update(msg, "utf-8").digest();
}

async function ttsOnce(text: string, voiceType: number): Promise<Buffer> {
  const host = "tts.tencentcloudapi.com";
  const payload = JSON.stringify({
    Text: text,
    SessionId: crypto.randomUUID(),
    VoiceType: voiceType,
    Codec: "mp3",
    SampleRate: 16000,
    ModelType: 1,
    Speed: 0,
  });
  const ts = Math.floor(Date.now() / 1000);
  const date = new Date(ts * 1000).toISOString().slice(0, 10);
  const ct = "application/json; charset=utf-8";
  const canonical = [
    "POST",
    "/",
    "",
    `content-type:${ct}\nhost:${host}\n`,
    "content-type;host",
    sha256hex(payload),
  ].join("\n");
  const scope = `${date}/tts/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(ts),
    scope,
    sha256hex(canonical),
  ].join("\n");
  const kSigning = hmac(hmac(hmac(`TC3${SECRET_KEY}`, date), "tts"), "tc3_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf-8")
    .digest("hex");

  const res = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      Authorization: `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${scope}, SignedHeaders=content-type;host, Signature=${signature}`,
      "Content-Type": ct,
      "X-TC-Action": "TextToVoice",
      "X-TC-Timestamp": String(ts),
      "X-TC-Version": "2019-08-23",
      "X-TC-Region": REGION,
    },
    body: payload,
  });
  const data = (await res.json()) as {
    Response?: { Audio?: string; Error?: { Code: string; Message: string } };
  };
  if (data.Response?.Error)
    throw new Error(
      `${data.Response.Error.Code}: ${data.Response.Error.Message}`
    );
  if (!data.Response?.Audio) throw new Error("TTS 无音频返回");
  return Buffer.from(data.Response.Audio, "base64");
}

/** 基础音色单次上限约 150 字：按句切 ≤110 字的块，逐块合成后拼接 mp3 */
function chunks(text: string): string[] {
  if (text.length <= 110) return [text];
  const parts = text.split(/(?<=[。！？；…])/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 110) {
      if (cur) out.push(cur);
      cur = p;
      while (cur.length > 110) {
        out.push(cur.slice(0, 110));
        cur = cur.slice(110);
      }
    } else cur += p;
  }
  if (cur) out.push(cur);
  return out;
}

async function synth(text: string, voiceType: number): Promise<Buffer> {
  const bufs: Buffer[] = [];
  for (const c of chunks(text)) bufs.push(await ttsOnce(c, voiceType));
  return Buffer.concat(bufs);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── 主流程：去重、跳过已有、生成、写清单 ── */
async function main() {
  const dedup = new Map<string, Utt>();
  for (const u of utts) dedup.set(voiceHash(u.who, u.text), u);

  if (DRY) {
    const stats: Record<string, { n: number; chars: number }> = {};
    for (const u of dedup.values()) {
      const s = (stats[u.who] ??= { n: 0, chars: 0 });
      s.n++;
      s.chars += normalizeForVoice(u.text).length;
    }
    console.log("── 配音预览（--dry，不调用 API）──");
    for (const [who, s] of Object.entries(stats))
      console.log(`${who}: ${s.n} 句 · ${s.chars} 字`);
    console.log(`合计 ${dedup.size} 句（已按内容去重）。`);
    return;
  }

  if (!SECRET_ID || !SECRET_KEY) {
    console.error(
      "缺少 TENCENT_SECRET_ID / TENCENT_SECRET_KEY，请在 .env.local 里配置（见 .env.local.example）。预览用 pnpm gen:voice --dry。"
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest: Record<string, 1> = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf-8"))
    : {};

  const seen = dedup;

  let made = 0;
  let skipped = 0;
  let failed = 0;
  let i = 0;
  for (const [hash, u] of seen) {
    i++;
    const file = path.join(OUT_DIR, `${hash}.mp3`);
    if (fs.existsSync(file)) {
      manifest[hash] = 1;
      skipped++;
      continue;
    }
    const spoken = normalizeForVoice(u.text);
    try {
      const buf = await synth(spoken, VOICE_TYPES[u.who]);
      fs.writeFileSync(file, buf);
      manifest[hash] = 1;
      made++;
      console.log(
        `✓ [${i}/${seen.size}] ${u.who} ${spoken.slice(0, 24)}${spoken.length > 24 ? "…" : ""}`
      );
      await sleep(120);
    } catch (e) {
      failed++;
      console.error(`✗ [${i}/${seen.size}] ${u.who} ${spoken.slice(0, 24)}…  ${e}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
  console.log(
    `\n完成：新生成 ${made}，已有跳过 ${skipped}，失败 ${failed}，清单共 ${Object.keys(manifest).length} 条。`
  );
  if (failed) process.exitCode = 1;
}

main();
