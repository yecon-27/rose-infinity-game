#!/usr/bin/env node
/**
 * 智能抠图:自动检测边缘背景色,扣掉接近背景色的像素。
 *
 * 解决问题:ImageGen 生成的图片背景色不固定
 * (有时纯白,有时浅灰 RGB~210),固定阈值无法覆盖。
 *
 * 算法:
 * 1. 采样图片四边(每边 20px 宽)的像素,计算平均背景色
 * 2. 对每个像素,计算到背景色的曼哈顿距离
 * 3. 距离 < 40 → 完全透明
 * 4. 距离 40-80 → 线性过渡到透明
 * 5. 距离 > 80 → 保留原 alpha
 *
 * 用法:node scripts/remove-bg.mjs <input.png> [output.png]
 */

import sharp from "sharp";
import { argv } from "node:process";
import { existsSync } from "node:fs";

async function removeBackground(input, output) {
  if (!existsSync(input)) {
    console.error(`输入文件不存在: ${input}`);
    process.exit(1);
  }

  const image = sharp(input);
  const { width = 0, height = 0 } = await image.metadata();
  if (width === 0 || height === 0) {
    console.error("无法读取图片尺寸");
    process.exit(1);
  }

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  // 1. 采样四边各 20 像素宽的边带,计算平均背景色
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  const edge = 20;
  function sample(x, y) {
    const i = (y * w + x) * ch;
    bgR += data[i];
    bgG += data[i + 1];
    bgB += data[i + 2];
    bgCount++;
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < edge; y++) sample(x, y);          // 上边
    for (let y = h - edge; y < h; y++) sample(x, y);       // 下边
  }
  for (let y = edge; y < h - edge; y++) {
    for (let x = 0; x < edge; x++) sample(x, y);           // 左边
    for (let x = w - edge; x < w; x++) sample(x, y);       // 右边
  }
  bgR = Math.round(bgR / bgCount);
  bgG = Math.round(bgG / bgCount);
  bgB = Math.round(bgB / bgCount);
  console.log(`检测到背景色: RGB(${bgR}, ${bgG}, ${bgB})`);

  // 2. 基于到背景色的距离抠图
  const CUTOFF = 40;      // 距离 < 40 → 完全透明
  const FEATHER = 80;     // 距离 40-80 → 渐变透明

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

    if (dist < CUTOFF) {
      data[i + 3] = 0;
    } else if (dist < FEATHER) {
      // 线性过渡:dist=40 → alpha=0,dist=80 → alpha=255
      const alpha = Math.round(((dist - CUTOFF) / (FEATHER - CUTOFF)) * 255);
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
    // dist >= 80 保留原 alpha
  }

  await sharp(data, { raw: { width: w, height: h, channels: ch } })
    .png()
    .toFile(output);

  console.log(`✓ 抠图完成: ${input} → ${output}`);
}

const input = argv[2];
const output = argv[3];
if (!input) {
  console.error("用法: node scripts/remove-bg.mjs <input.png> [output.png]");
  process.exit(1);
}
const out = output || input.replace(/\.png$/i, "-transparent.png");
removeBackground(input, out).catch((err) => {
  console.error(err);
  process.exit(1);
});
