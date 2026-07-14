#!/usr/bin/env node
/**
 * 美术整理器
 *
 * 把 generated-images/ 里 CodeBuddy 生成的图,按代码友好的命名拷进 public/images/。
 * - 角色立绘用去背版(*_remove_bg/*_抠图.png,透明背景)。
 * - 场景用全图。
 * - 原始图留在 generated-images/ 当档案,本脚本只拷贝、不移动,可反复运行。
 *
 * 用法: node scripts/organize-art.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** [源目录, 源文件名或前缀, 目标路径] —— 目录里没有精确同名文件时,按前缀匹配第一个 */
const COPIES = [
  // ── Vera 立绘(去背) ──
  ["generated-images/vera_remove_bg", "温柔浅笑版_抠图.png", "public/images/characters/vera-warm.png"],
  ["generated-images/vera_remove_bg", "认真专注版_抠图.png", "public/images/characters/vera-focused.png"],
  ["generated-images/vera_remove_bg", "压着情绪的平静版_抠图.png", "public/images/characters/vera-composed.png"],
  ["generated-images/vera_remove_bg", "回忆里的怅然版_抠图.png", "public/images/characters/vera-wistful.png"],
  // ── Vera 立绘 · 2026-07-14 工单新增(见 docs/art-asset-plan.md 第五节) ──
  ["generated-images/vera_remove_bg", "不安版_抠图.png", "public/images/characters/vera-anxious.png"],
  ["generated-images/vera_remove_bg", "撕扯版_抠图.png", "public/images/characters/vera-torn.png"],
  ["generated-images/vera_remove_bg", "含泪版_抠图.png", "public/images/characters/vera-crying.png"],
  ["generated-images/vera_remove_bg", "质问版_抠图.png", "public/images/characters/vera-accusing.png"],
  ["generated-images/vera_remove_bg", "破防版_抠图.png", "public/images/characters/vera-hurt.png"],
  ["generated-images/vera_remove_bg", "释然版_抠图.png", "public/images/characters/vera-calm.png"],
  // ── Sean 立绘(去背) ──
  ["generated-images/sean_remove_bg", "温柔版_抠图.png", "public/images/characters/sean-warm.png"],
  ["generated-images/sean_remove_bg", "盯屏幕的专注版_抠图.png", "public/images/characters/sean-focused.png"],
  ["generated-images/sean_remove_bg", "熬夜的累版_抠图.png", "public/images/characters/sean-tired.png"],
  ["generated-images/sean_remove_bg", "愧疚版_抠图.png", "public/images/characters/sean-guilty.png"],
  // ── Sean 立绘 · 2026-07-14 工单新增(见 docs/art-asset-plan.md 第五节) ──
  ["generated-images/sean_remove_bg", "被刺伤版_抠图.png", "public/images/characters/sean-wounded.png"],
  ["generated-images/sean_remove_bg", "发烧版_抠图.png", "public/images/characters/sean-sick.png"],
  ["generated-images/sean_remove_bg", "落泪版_抠图.png", "public/images/characters/sean-grieving.png"],
  ["generated-images/sean_remove_bg", "冷下来版_抠图.png", "public/images/characters/sean-cold.png"],
  ["generated-images/sean_remove_bg", "挽留版_抠图.png", "public/images/characters/sean-pleading.png"],
  // ── 场景(全图,按前缀匹配) ──
  ["generated-images/scenes", "黑客松夜会场_", "public/images/scenes/hackathon-venue.png"],
  ["generated-images/scenes", "黑客松夜楼梯间_", "public/images/scenes/hackathon-stairs.png"],
  ["generated-images/scenes", "暖的室内_", "public/images/scenes/warm-room.png"],
  ["generated-images/scenes", "未来的公寓_", "public/images/scenes/future-apartment.png"],
  ["generated-images/scenes", "半年后的便利店_", "public/images/scenes/konbini-later.png"],
  ["generated-images/scenes", "半年后的便利店_", "public/images/scenes/konbini-night.png"],
  ["generated-images/scenes", "商场服装店试衣间外", "public/images/scenes/mall-fitting.png"],
];

function resolveSource(dir, nameOrPrefix) {
  const exact = path.join(ROOT, dir, nameOrPrefix);
  if (fs.existsSync(exact)) return exact;
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return null;
  const hit = fs
    .readdirSync(full)
    .find((f) => f.startsWith(nameOrPrefix) && f.endsWith(".png"));
  return hit ? path.join(full, hit) : null;
}

let ok = 0;
let miss = 0;
for (const [dir, nameOrPrefix, target] of COPIES) {
  const src = resolveSource(dir, nameOrPrefix);
  if (!src) {
    console.warn(`⚠️  找不到源: ${dir}/${nameOrPrefix}*`);
    miss++;
    continue;
  }
  const dest = path.join(ROOT, target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`✓ ${path.basename(src)}  →  ${target}`);
  ok++;
}

console.log(`\n完成: ${ok} 拷贝${miss ? `, ${miss} 缺失` : ""}。`);
