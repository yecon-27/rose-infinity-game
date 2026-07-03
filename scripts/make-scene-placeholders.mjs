/**
 * 新场景占位背景合成(便利店夜宵 / 雨天共伞)
 *
 * 用现有 AI 生成素材调色得到氛围相近的占位图,保证游戏可跑;
 * 正式图用 CodeBuddy ImageGen 生成后同名覆盖即可(prompt 见 docs/ai-generated/art-and-illustrations.md)。
 *
 * 用法:pnpm exec node scripts/make-scene-placeholders.mjs
 */

import sharp from "sharp";

// 便利店夜宵:餐厅图 → 提亮偏冷,加白炽灯感
await sharp("public/images/scenes/act1_restaurant.png")
  .modulate({ brightness: 1.05, saturation: 0.8, hue: 200 })
  .tint({ r: 220, g: 235, b: 255 })
  .blur(1.5)
  .png()
  .toFile("public/images/scenes/act2_konbini.png");
console.log("✓ act2_konbini.png(占位)");

// 雨天共伞:烧烤街景 → 压暗偏蓝,重虚化模拟雨夜
const rain = Buffer.from(`
<svg width="1024" height="1024">
  ${Array.from({ length: 90 })
    .map(() => {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const len = 24 + Math.random() * 36;
      return `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + len}" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>`;
    })
    .join("")}
</svg>`);

await sharp("public/images/scenes/act2_bbq.png")
  .modulate({ brightness: 0.6, saturation: 0.55, hue: 210 })
  .tint({ r: 150, g: 175, b: 220 })
  .blur(2.5)
  .composite([{ input: rain, left: 0, top: 0 }])
  .png()
  .toFile("public/images/scenes/act4_umbrella.png");
console.log("✓ act4_umbrella.png(占位,含雨丝)");
