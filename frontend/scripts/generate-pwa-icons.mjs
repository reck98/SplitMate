import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const iconSvg = (size, isMaskable) => {
  const padding = isMaskable ? Math.round(size * 0.1) : 0;
  const inner = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2 - 2;
  const clockSize = isMaskable ? inner * 0.85 : inner;
  const cSize = clockSize;
  const cr = cSize / 2 - 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>
  <g transform="translate(${(size - clockSize) / 2}, ${(size - clockSize) / 2})">
    <circle cx="${cr}" cy="${cr}" r="${cr}" fill="none" stroke="white" stroke-width="${Math.max(2, Math.round(clockSize * 0.08))}"/>
    <line x1="${cr}" y1="${cr}" x2="${cr}" y2="${Math.round(cr * 0.4)}" stroke="white" stroke-width="${Math.max(2, Math.round(clockSize * 0.08))}" stroke-linecap="round"/>
    <line x1="${cr}" y1="${cr}" x2="${Math.round(cr + cr * 0.5)}" y2="${cr}" stroke="white" stroke-width="${Math.max(2, Math.round(clockSize * 0.08))}" stroke-linecap="round"/>
  </g>
</svg>`;
};

const sizes = {
  "pwa-192x192.png": { size: 192, isMaskable: false },
  "pwa-512x512.png": { size: 512, isMaskable: false },
  "pwa-192x192-maskable.png": { size: 192, isMaskable: true },
  "pwa-512x512-maskable.png": { size: 512, isMaskable: true },
  "apple-touch-icon.png": { size: 180, isMaskable: false },
};

for (const [filename, { size, isMaskable }] of Object.entries(sizes)) {
  const svg = iconSvg(size, isMaskable);
  const outputPath = join(publicDir, filename);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  console.log(`Generated ${filename} (${size}x${size})`);
}

console.log("All PWA icons generated successfully.");
