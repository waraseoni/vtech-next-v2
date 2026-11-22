// Generates the V-Tech brand icon set from one SVG source.
// Run: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const NAVY = "#0b1730";
const NAVY_LIGHT = "#16305e";
const CYAN = "#4cc2ff";
const WHITE = "#f8fafc";

function svgSource({ fullBleed = false, wordmark = false } = {}) {
  const radius = fullBleed ? 0 : 112;
  const mark = wordmark
    ? `<g transform="translate(232 196) scale(14.6) translate(-12 -12)" fill="none" stroke="${WHITE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </g>
  <circle cx="392" cy="330" r="62" fill="${CYAN}"/>
  <g transform="translate(392 330) scale(3.5) translate(-12 -12)" fill="${NAVY}">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </g>
  <text x="256" y="447" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="64" font-weight="700" letter-spacing="4" fill="${WHITE}">VTECH</text>
  <text x="256" y="489" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="26" font-weight="600" letter-spacing="10" fill="${CYAN}">PRO V2</text>`
    : `<g transform="translate(238 244) scale(16.4) translate(-12 -12)" fill="none" stroke="${WHITE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </g>
  <circle cx="399" cy="399" r="78" fill="${CYAN}"/>
  <g transform="translate(399 399) scale(4.4) translate(-12 -12)" fill="${NAVY}">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY_LIGHT}"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect x="24" y="24" width="464" height="464" rx="${Math.max(radius - 18, 0)}" fill="none" stroke="${WHITE}" stroke-opacity="0.10" stroke-width="6"/>
  ${mark}
</svg>`;
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((entry, index) => {
    const slot = dir.subarray(index * 16, index * 16 + 16);
    const dim = entry.size >= 256 ? 0 : entry.size;
    slot.writeUInt8(dim, 0);
    slot.writeUInt8(dim, 1);
    slot.writeUInt8(0, 2);
    slot.writeUInt8(0, 3);
    slot.writeUInt16LE(1, 4);
    slot.writeUInt16LE(32, 6);
    slot.writeUInt32LE(entry.buffer.length, 8);
    slot.writeUInt32LE(offset, 12);
    offset += entry.buffer.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buffer)]);
}

const rounded = svgSource();
const wordmark = svgSource({ wordmark: true });
const maskable = svgSource({ fullBleed: true });

await mkdir("public/icons", { recursive: true });
await mkdir("public/brand", { recursive: true });

await writeFile("public/brand/vtech-icon.svg", rounded);
await writeFile("public/brand/vtech-wordmark.svg", wordmark);
await writeFile(path.join("src", "app", "icon.png"), await png(wordmark, 512));
await writeFile(
  path.join("src", "app", "apple-icon.png"),
  await png(wordmark, 180),
);
await writeFile("public/icons/icon-192.png", await png(wordmark, 192));
await writeFile("public/icons/icon-512.png", await png(wordmark, 512));
await writeFile("public/icons/maskable-512.png", await png(maskable, 512));

const icoEntries = [];
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, buffer: await png(rounded, size) });
}
await writeFile(path.join("src", "app", "favicon.ico"), ico(icoEntries));

console.log("icons generated");
