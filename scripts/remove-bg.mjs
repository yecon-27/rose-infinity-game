#!/usr/bin/env node
/**
 * 智能抠图 v4:边缘密度保护 + 颜色 flood fill
 *
 * 核心思路:
 *   人物内部有头发/五官/衣领/褶皱等细节,边缘密度高;
 *   背景平坦,边缘密度低。
 *   高密度区膨胀形成"保护罩",覆盖整个人物(含纯色衣服)。
 *   保护罩外才用颜色 flood fill 扣背景。
 *
 * 这样人物内部任何颜色(包括和背景同色的浅色衣服)都不会被误扣。
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

  // ---- 1. 亮度通道 ----
  const lum = new Float32Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += ch) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // ---- 2. Sobel 边缘 ----
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = lum[(y - 1) * w + (x - 1)];
      const tc = lum[(y - 1) * w + x];
      const tr = lum[(y - 1) * w + (x + 1)];
      const ml = lum[y * w + (x - 1)];
      const mr = lum[y * w + (x + 1)];
      const bl = lum[(y + 1) * w + (x - 1)];
      const bc = lum[(y + 1) * w + x];
      const br = lum[(y + 1) * w + (x + 1)];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      edge[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // ---- 3. 强边缘二值图 ----
  const EDGE_THRESHOLD = 30;
  const bin = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (edge[p] > EDGE_THRESHOLD) bin[p] = 1;
  }

  // ---- 4. 积分图算邻域边缘密度 ----
  const integ = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      integ[(y + 1) * (w + 1) + (x + 1)] =
        bin[y * w + x] +
        integ[y * (w + 1) + (x + 1)] +
        integ[(y + 1) * (w + 1) + x] -
        integ[y * (w + 1) + x];
    }
  }
  const DENS_RADIUS = 12; // 25x25 邻域
  function density(x, y) {
    const x0 = Math.max(0, x - DENS_RADIUS);
    const x1 = Math.min(w - 1, x + DENS_RADIUS);
    const y0 = Math.max(0, y - DENS_RADIUS);
    const y1 = Math.min(h - 1, y + DENS_RADIUS);
    const sum =
      integ[(y1 + 1) * (w + 1) + (x1 + 1)] -
      integ[y0 * (w + 1) + (x1 + 1)] -
      integ[(y1 + 1) * (w + 1) + x0] +
      integ[y0 * (w + 1) + x0];
    return sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
  }

  // ---- 5. 高密度区 = 保护种子,膨胀形成保护罩 ----
  const DENS_THRESHOLD = 0.08;
  const protectSeed = new Uint8Array(w * h);
  let seedCount = 0;
  for (let p = 0; p < w * h; p++) {
    const x = p % w;
    const y = (p - x) / w;
    if (density(x, y) > DENS_THRESHOLD) {
      protectSeed[p] = 1;
      seedCount++;
    }
  }
  console.log(`保护种子像素: ${seedCount} / ${w * h} (${(seedCount / (w * h) * 100).toFixed(1)}%)`);

  const PROTECT_DILATE = 40; // 膨胀覆盖纯色衣服
  const protect = dilateSeparable(protectSeed, w, h, PROTECT_DILATE);
  const protectCount = protect.reduce((a, b) => a + b, 0);
  console.log(`保护罩像素(膨胀后): ${protectCount} / ${w * h} (${(protectCount / (w * h) * 100).toFixed(1)}%)`);

  // ---- 6. 采样四边背景色 ----
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  const edgeBand = 15;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onEdge = x < edgeBand || x >= w - edgeBand || y < edgeBand || y >= h - edgeBand;
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

  // ---- 7. flood fill 从四边:只在(非保护罩 + 颜色接近背景)扩散 ----
  const COLOR_TOL = 40;
  function colorDist(idx) {
    const i = idx * ch;
    return Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB);
  }

  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);
  const queue = [];

  function seed(x, y) {
    const idx = y * w + x;
    if (visited[idx] || protect[idx]) return;
    visited[idx] = 1;
    if (colorDist(idx) < COLOR_TOL) {
      isBg[idx] = 1;
      queue.push(idx);
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }

  let bgPixelCount = 0;
  while (queue.length > 0) {
    const idx = queue.shift();
    bgPixelCount++;
    const cx = idx % w;
    const cy = (idx - cx) / w;
    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx] || protect[nidx]) continue;
      visited[nidx] = 1;
      if (colorDist(nidx) < COLOR_TOL) {
        isBg[nidx] = 1;
        queue.push(nidx);
      }
    }
  }
  console.log(`flood fill 标记背景像素: ${bgPixelCount} / ${w * h} (${(bgPixelCount / (w * h) * 100).toFixed(1)}%)`);

  // ---- 8. 校验:中心区域被误扣比例 ----
  const cx0 = Math.floor(w * 0.3), cx1 = Math.floor(w * 0.7);
  const cy0 = Math.floor(h * 0.3), cy1 = Math.floor(h * 0.7);
  let centerBg = 0, centerTotal = 0;
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      centerTotal++;
      if (isBg[y * w + x]) centerBg++;
    }
  }
  console.log(`中心 40% 区域被扣像素: ${centerBg} / ${centerTotal} (${(centerBg / centerTotal * 100).toFixed(2)}%)  ← 应接近 0`);

  // ---- 9. 写入 alpha:背景透明,边缘羽化 ----
  const FEATHER_RADIUS = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!isBg[idx]) continue;
      let hasFgNeighbor = false;
      for (let dy = -FEATHER_RADIUS; dy <= FEATHER_RADIUS && !hasFgNeighbor; dy++) {
        for (let dx = -FEATHER_RADIUS; dx <= FEATHER_RADIUS && !hasFgNeighbor; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (!isBg[ny * w + nx]) hasFgNeighbor = true;
        }
      }
      const i = idx * ch;
      if (hasFgNeighbor) {
        data[i + 3] = Math.min(data[i + 3], 80);
      } else {
        data[i + 3] = 0;
      }
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: ch } })
    .png()
    .toFile(output);

  console.log(`✓ 抠图完成: ${input} → ${output}`);
}

// 可分离 1D 膨胀:先 x 方向再 y 方向,等价菱形膨胀,够用
function dilateSeparable(mask, w, h, r) {
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let found = 0;
      for (let dx = -r; dx <= r && !found; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        if (mask[row + nx]) found = 1;
      }
      tmp[row + x] = found;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let found = 0;
      for (let dy = -r; dy <= r && !found; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        if (tmp[ny * w + x]) found = 1;
      }
      out[y * w + x] = found;
    }
  }
  return out;
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
