#!/usr/bin/env node
/**
 * 智能抠图 v2:基于 flood fill 的连通性检测
 *
 * 解决问题(v1 的 bug):
 *   v1 只看"到背景色的距离",但水彩人物皮肤(浅米色、淡粉)
 *   有时也接近浅灰背景,被误判为背景扣掉,导致"脸被抠掉"。
 *
 * v2 算法:
 *   1. 采样图片四边,计算平均背景色
 *   2. 从四边的"背景种子点"做 BFS flood fill 向内扩散
 *   3. 只把"能从边缘连通到的、且颜色接近背景"的像素标记为背景
 *   4. 被人物包围的内部浅色区域(如皮肤)不会被波及,因为连通路径被人物轮廓阻断
 *   5. 边缘做 alpha 羽化,避免锯齿
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

  // 1. 采样四边各 15px 宽的边带,计算平均背景色
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  const edge = 15;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onEdge = x < edge || x >= w - edge || y < edge || y >= h - edge;
      if (!onEdge) continue;
      const i = (y * w + x) * ch;
      bgR += data[i];
      bgG += data[i + 1];
      bgB += data[i + 2];
      bgCount++;
    }
  }
  bgR = Math.round(bgR / bgCount);
  bgG = Math.round(bgG / bgCount);
  bgB = Math.round(bgB / bgCount);
  console.log(`检测到背景色: RGB(${bgR}, ${bgG}, ${bgB})`);

  // 2. 判断像素是否"接近背景色"
  const TOLERANCE = 60; // 到背景色的曼哈顿距离阈值
  function isBackground(x, y) {
    const i = (y * w + x) * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
    return dist < TOLERANCE;
  }

  // 3. BFS flood fill 从四边种子点向内扩散
  //    visited: 是否已访问过
  //    isBg: 是否被标记为背景(能从边缘连通)
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);
  const queue = [];

  // 把四边的背景像素作为种子点入队
  for (let x = 0; x < w; x++) {
    if (isBackground(x, 0)) {
      const idx = 0 * w + x;
      if (!visited[idx]) { visited[idx] = 1; isBg[idx] = 1; queue.push([x, 0]); }
    }
    if (isBackground(x, h - 1)) {
      const idx = (h - 1) * w + x;
      if (!visited[idx]) { visited[idx] = 1; isBg[idx] = 1; queue.push([x, h - 1]); }
    }
  }
  for (let y = 0; y < h; y++) {
    if (isBackground(0, y)) {
      const idx = y * w + 0;
      if (!visited[idx]) { visited[idx] = 1; isBg[idx] = 1; queue.push([0, y]); }
    }
    if (isBackground(w - 1, y)) {
      const idx = y * w + (w - 1);
      if (!visited[idx]) { visited[idx] = 1; isBg[idx] = 1; queue.push([w - 1, y]); }
    }
  }

  // BFS 扩散:从种子点向内,只把"颜色接近背景"的相邻像素加入背景
  // 宽容度稍大一些(50),允许越过轻微的颜色过渡(如发丝边缘)
  // 注意:不能太大,否则会通过人物内部的浅色区域(如皮肤)渗入把脸扣掉
  const FLOOD_TOLERANCE = 50;
  function isBackgroundFlood(x, y) {
    const i = (y * w + x) * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
    return dist < FLOOD_TOLERANCE;
  }

  let bgPixelCount = 0;
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    bgPixelCount++;
    // 4 邻接
    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx]) continue;
      visited[nidx] = 1;
      // 只有接近背景色的像素才继续扩散
      if (isBackgroundFlood(nx, ny)) {
        isBg[nidx] = 1;
        queue.push([nx, ny]);
      }
    }
  }
  console.log(`flood fill 标记背景像素: ${bgPixelCount} / ${w * h} (${(bgPixelCount/(w*h)*100).toFixed(1)}%)`);

  // 4. 写入 alpha:被标记为背景的像素 → 透明,边缘做羽化
  //    羽化:如果一个背景像素的 4 邻接里有非背景像素,降低 alpha 而不是完全透明
  const FEATHER_RADIUS = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!isBg[idx]) continue;

      // 检查是否有非背景邻居(边缘像素)
      let hasFgNeighbor = false;
      for (let dy = -FEATHER_RADIUS; dy <= FEATHER_RADIUS && !hasFgNeighbor; dy++) {
        for (let dx = -FEATHER_RADIUS; dx <= FEATHER_RADIUS && !hasFgNeighbor; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (!isBg[ny * w + nx]) hasFgNeighbor = true;
        }
      }

      const i = idx * ch;
      if (hasFgNeighbor) {
        // 边缘像素:半透明(羽化)
        data[i + 3] = Math.min(data[i + 3], 80);
      } else {
        // 内部背景:完全透明
        data[i + 3] = 0;
      }
    }
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
