import sharp from "sharp";

async function checkCorners(file, label) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  function px(x, y) {
    const i = (y * w + x) * ch;
    return `(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]})`;
  }

  console.log(`\n=== ${label} ===`);
  console.log(`  左上: ${px(10, 10)}`);
  console.log(`  右上: ${px(w-10, 10)}`);
  console.log(`  左下: ${px(10, h-10)}`);
  console.log(`  右下: ${px(w-10, h-10)}`);
  console.log(`  中心: ${px(Math.floor(w/2), Math.floor(h/2))}`);
}

await checkCorners("public/images/characters/chen.png", "chen.png");
await checkCorners("public/images/characters/chen-avoidant.png", "chen-avoidant.png");
await checkCorners("public/images/characters/amo.png", "amo.png");
