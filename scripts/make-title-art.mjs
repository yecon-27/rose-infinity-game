/**
 * 标题页主视觉合成
 *
 * 用已有的 AI 生成素材(混元生图:餐厅场景 + 阿沉/阿默立绘)排版合成一张
 * 1920x1080 的标题 key art:两个人分立画面两侧,中间留出大片空白给标题
 * ——距离本身就是构图,呼应"过滤器横在两人之间"的主题。
 *
 * 用法:pnpm exec node scripts/make-title-art.mjs
 * 输出:public/images/scenes/title_keyart.png
 */

import sharp from "sharp";

const W = 1920;
const H = 1080;

// 背景:餐厅场景铺满,轻微虚化压暗,保留暖光氛围
const bg = await sharp("public/images/scenes/act1_restaurant.png")
  .resize(W, H, { fit: "cover" })
  .blur(3)
  .modulate({ brightness: 0.55, saturation: 0.85 })
  .toBuffer();

// 立绘:裁掉透明边距,压到 700 高,再裁掉底部 90px 让人物"沉"进画面下缘,
// 只露出头肩——留出上半幅给标题,中间的空隙就是"距离"
const PORTRAIT_H = 700;
const SINK = 90;
async function portrait(file, brightness) {
  const trimmed = await sharp(file).trim().toBuffer();
  const resized = await sharp(trimmed)
    .resize({ height: PORTRAIT_H })
    .modulate({ brightness })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  return sharp(resized)
    .extract({
      left: 0,
      top: 0,
      width: meta.width,
      height: PORTRAIT_H - SINK,
    })
    .toBuffer();
}
const chen = await portrait("public/images/characters/chen.png", 0.72);
const amo = await portrait("public/images/characters/amo.png", 0.72);

const chenMeta = await sharp(chen).metadata();
const amoMeta = await sharp(amo).metadata();

// 暗角 + 中央压暗渐变(给标题文字留可读性),SVG 叠加
const overlay = Buffer.from(`
<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.7"/>
    </linearGradient>
    <radialGradient id="edge" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect width="${W}" height="${H}" fill="url(#edge)"/>
</svg>`);

await sharp(bg)
  .composite([
    {
      input: chen,
      left: 60,
      top: H - (chenMeta.height ?? PORTRAIT_H),
    },
    {
      input: amo,
      left: W - (amoMeta.width ?? PORTRAIT_H) - 60,
      top: H - (amoMeta.height ?? PORTRAIT_H),
    },
    { input: overlay, left: 0, top: 0 },
  ])
  .png()
  .toFile("public/images/scenes/title_keyart.png");

console.log("✓ 已生成 public/images/scenes/title_keyart.png (1920x1080)");
