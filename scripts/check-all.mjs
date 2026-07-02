import sharp from "sharp";
import { readdirSync } from "node:fs";

const dir = "public/images/characters";
const files = readdirSync(dir).filter((f) => f.endsWith(".png"));

for (const f of files) {
  const file = `${dir}/${f}`;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const ch = info.channels;
  function px(x, y) {
    const i = (y * w + x) * ch;
    return `rgb(${data[i]},${data[i+1]},${data[i+2]}) α=${data[i+3]}`;
  }
  console.log(`${f}`);
  console.log(`  左上: ${px(5, 5)}`);
  console.log(`  右下: ${px(w-5, info.height-5)}`);
}
