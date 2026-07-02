import sharp from "sharp";

const file = process.argv[2];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const ch = info.channels;

// 头部区域:上 5%-35%,中间 30%-70%
let headOpaque = 0, headTransparent = 0, headTotal = 0;
for (let y = Math.floor(h*0.05); y < h*0.35; y++) {
  for (let x = Math.floor(w*0.3); x < w*0.7; x++) {
    const i = (y*w+x)*ch;
    headTotal++;
    if (data[i+3] < 50) headTransparent++;
    else headOpaque++;
  }
}
console.log(`文件: ${file}`);
console.log(`头部区域: ${headTotal} 像素`);
console.log(`不透明: ${headOpaque} (${(headOpaque/headTotal*100).toFixed(1)}%)`);
console.log(`透明: ${headTransparent} (${(headTransparent/headTotal*100).toFixed(1)}%)`);
console.log(`四角:`);
for (const [x,y,lbl] of [[5,5,'左上'],[w-5,5,'右上'],[5,h-5,'左下'],[w-5,h-5,'右下']]) {
  const i = (y*w+x)*ch;
  console.log(`  ${lbl}: α=${data[i+3]}`);
}
