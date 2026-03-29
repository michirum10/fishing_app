// アイコン生成スクリプト
// 元画像のロゴ部分（余白除去）を自動検出して高品質リサイズ
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '../icon-512.png');

async function main() {
  const srcBuf = fs.readFileSync(src);
  const { data, info } = await sharp(srcBuf).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // 紺背景色 #1a237e = rgb(26,35,126)
  // それ以外のピクセルをロゴとみなしてバウンディングボックスを検出
  const bgR = 26, bgG = 35, bgB = 126;
  const threshold = 30; // 色差しきい値

  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const dr = Math.abs(data[i]   - bgR);
      const dg = Math.abs(data[i+1] - bgG);
      const db = Math.abs(data[i+2] - bgB);
      if (dr + dg + db > threshold * 3) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 少しパディングを加える
  const pad = 16;
  const left   = Math.max(0, minX - pad);
  const top    = Math.max(0, minY - pad);
  const cropW  = Math.min(width  - left, maxX - left + pad + 1);
  const cropH  = Math.min(height - top,  maxY - top  + pad + 1);

  console.log(`ロゴ検出: x=${minX}〜${maxX}, y=${minY}〜${maxY}`);
  console.log(`クロップ: left=${left}, top=${top}, w=${cropW}, h=${cropH}`);

  const cropped = await sharp(srcBuf)
    .extract({ left, top, width: cropW, height: cropH })
    .toBuffer();

  // 正方形に整形（長い方に合わせて短い方を紺でパディング）
  const sq = Math.max(cropW, cropH);
  const padX = Math.floor((sq - cropW) / 2);
  const padY = Math.floor((sq - cropH) / 2);

  const square = await sharp(cropped)
    .extend({
      top: padY, bottom: sq - cropH - padY,
      left: padX, right: sq - cropW - padX,
      background: { r: 26, g: 35, b: 126, alpha: 1 }
    })
    .toBuffer();

  // 512x512 版（Lanczos高品質）
  await sharp(square)
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(__dirname, '../icons/icon-512.png'));
  console.log('✅ icons/icon-512.png 生成完了');

  // 192x192 版
  await sharp(square)
    .resize(192, 192, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(__dirname, '../icons/icon-192.png'));
  console.log('✅ icons/icon-192.png 生成完了');
}

main().catch(e => { console.error(e); process.exit(1); });
