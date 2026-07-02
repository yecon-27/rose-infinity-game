import sharp from "sharp";

async function analyzeHeadRegion(file, label) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  // 头部区域:图片上 1/3 的中间 40%
  const headTop = Math.floor(h * 0.05);
  const headBottom = Math.floor(h * 0.35);
  const headLeft = Math.floor(w * 0.3);
  const headRight = Math.floor(w * 0.7);

  let transparentCount = 0;
  let semiTransparentCount = 0;
  let opaqueCount = 0;
  let totalPixels = 0;
  let lightPixelCount = 0; // 不透明但颜色浅(可能被误抠)

  for (let y = headTop; y < headBottom; y++) {
    for (let x = headLeft; x < headRight; x++) {
      const idx = (y * w + x) * ch;
      const alpha = data[idx + 3];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      totalPixels++;
      if (alpha < 50) transparentCount++;
      else if (alpha < 200) semiTransparentCount++;
      else {
        opaqueCount++;
        const lightness = (r + g + b) / 3;
        if (lightness > 200) lightPixelCount++;
      }
    }
  }

  console.log(`\n=== ${label} (${file}) ===`);
  console.log(`  头部区域: ${totalPixels} 像素`);
  console.log(`  完全透明: ${transparentCount} (${(transparentCount/totalPixels*100).toFixed(1)}%)`);
  console.log(`  半透明: ${semiTransparentCount} (${(semiTransparentCount/totalPixels*100).toFixed(1)}%)`);
  console.log(`  不透明: ${opaqueCount} (${(opaqueCount/totalPixels*100).toFixed(1)}%)`);
  console.log(`  其中浅色像素: ${lightPixelCount} (${(lightPixelCount/totalPixels*100).toFixed(1)}%)`);
}

await analyzeHeadRegion("public/images/characters/chen.png", "chen.png(默认,用户没说光头)");
await analyzeHeadRegion("public/images/characters/chen-avoidant.png", "chen-avoidant.png(第二幕用,用户说光头)");
