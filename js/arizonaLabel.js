import { AZ_LABEL_Y0, AZ_LABEL_Y1, AZ_RADIUS } from './arizonaCan.js';

const WORD = '"Alfa Slab One", "Arial Black", serif';
const CAPS = '"Bebas Neue", "Arial Narrow", Impact, sans-serif';
const MINT = 'rgba(126, 214, 186, 0.42)';
const PINK = 'rgba(255, 150, 186, 0.96)';
const WHITE = '#ffffff';
const PETAL = 'rgba(255, 228, 236, 0.94)';
const STEM = 'rgba(236, 255, 246, 0.8)';

export async function loadArizonaFont() {
  const url = new URL('../fonts/AlfaSlabOne-Regular.woff2', import.meta.url);
  const face = new FontFace('Alfa Slab One', `url(${url})`, { weight: '400', style: 'normal' });
  await face.load();
  document.fonts.add(face);
}

/** Procedural Green Tea label. Mint field, blossoms, and the AriZona lockup. */
export function createArizonaLabelCanvas() {
  const span = AZ_LABEL_Y1 - AZ_LABEL_Y0;
  const height = 1500;
  const width = Math.round((height * (Math.PI * 2 * AZ_RADIUS)) / span);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = MINT;
  ctx.fillRect(0, 0, width, height);

  drawBlossomField(ctx, width, height);
  drawFront(ctx, width / 2, height);
  drawBackMark(ctx, 0, height * 0.48, height);
  drawBackMark(ctx, width, height * 0.48, height);

  return canvas;
}

function drawFront(ctx, cx, height) {
  const wordSize = fitWidth(ctx, 'AriZona', WORD, height * 0.78, height * 0.16);
  drawWordmark(ctx, cx, height * 0.28, wordSize);

  ctx.fillStyle = WHITE;
  ctx.fillRect(cx - wordSize * 1.15, height * 0.36, wordSize * 2.3, 4);

  const tea = fitWidth(ctx, 'GREEN TEA', CAPS, wordSize * 2.05, wordSize * 0.42);
  drawCaps(ctx, 'GREEN TEA', cx, height * 0.43, tea, tea * 0.12);
  const sub = fitWidth(ctx, 'WITH GINSENG AND HONEY', CAPS, wordSize * 2.05, tea * 0.46);
  drawCaps(ctx, 'WITH GINSENG AND HONEY', cx, height * 0.5, sub, sub * 0.14);
  drawCaps(ctx, '23 FL OZ', cx, height * 0.57, sub * 0.85, sub * 0.2);
}

function drawWordmark(ctx, cx, y, size) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = WHITE;
  ctx.font = `${size}px ${WORD}`;
  const ari = ctx.measureText('Ari').width;
  const ona = ctx.measureText('ona').width;
  const zSize = size * 1.08;
  ctx.font = `${zSize}px ${WORD}`;
  const zWidth = ctx.measureText('Z').width;
  const gap = size * 0.03;
  const total = ari + ona + zWidth + gap * 2;
  let x = cx - total / 2;
  ctx.font = `${size}px ${WORD}`;
  ctx.fillText('Ari', x, y);
  x += ari + gap;
  ctx.font = `${zSize}px ${WORD}`;
  ctx.fillText('Z', x, y + size * 0.03);
  x += zWidth + gap;
  ctx.font = `${size}px ${WORD}`;
  ctx.fillText('ona', x, y);
}

function drawBlossomField(ctx, width, height) {
  const branches = [
    [width * 0.08, height * 0.08, width * 0.28, height * 0.2, width * 0.46, height * 0.1],
    [width * 0.92, height * 0.06, width * 0.7, height * 0.22, width * 0.52, height * 0.12],
    [width * 0.02, height * 0.62, width * 0.18, height * 0.42, width * 0.34, height * 0.7],
    [width * 0.98, height * 0.58, width * 0.8, height * 0.78, width * 0.64, height * 0.6],
    [width * 0.18, height * 0.92, width * 0.4, height * 0.78, width * 0.62, height * 0.94],
    [width * 0.12, height * 0.34, width * 0.22, height * 0.22, width * 0.3, height * 0.4],
    [width * 0.88, height * 0.36, width * 0.76, height * 0.24, width * 0.68, height * 0.42],
  ];
  branches.forEach(([x0, y0, x1, y1, x2, y2], index) => {
    limb(ctx, x0, y0, x1, y1, x2, y2, 7);
    blossom(ctx, x0, y0, 38 + (index % 3) * 8, index % 2 === 0);
    blossom(ctx, x2, y2, 32 + (index % 2) * 10, index % 2 === 1);
    blossom(ctx, (x0 + x2) / 2, (y0 + y2) / 2 - 16, 28, index % 3 !== 0);
    blossom(ctx, x1, y1 + 8, 24, true);
  });
}

function limb(ctx, x0, y0, x1, y1, x2, y2, width) {
  ctx.strokeStyle = STEM;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x1, y1, x2, y2);
  ctx.stroke();
  ctx.lineWidth = width * 0.45;
  ctx.beginPath();
  ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
  ctx.quadraticCurveTo(x1 - 30, y1 + 40, x1 - 10, y1 + 70);
  ctx.stroke();
}

function blossom(ctx, x, y, radius, pink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = pink ? PINK : PETAL;
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(radius * 0.55, 0, radius * 0.46, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pink ? 'rgba(255, 214, 150, 0.95)' : 'rgba(255, 170, 196, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackMark(ctx, cx, cy, height) {
  blossom(ctx, cx - height * 0.08, cy - height * 0.12, 30, true);
  blossom(ctx, cx + height * 0.1, cy + height * 0.02, 24, false);
  blossom(ctx, cx, cy + height * 0.16, 20, true);
  ctx.font = `${height * 0.045}px ${WORD}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AriZona', cx, cy - height * 0.02);
  ctx.font = `${height * 0.02}px ${CAPS}`;
  ctx.fillText('GREEN TEA', cx, cy + height * 0.05);
}

function fitWidth(ctx, text, family, target, start) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  const width = ctx.measureText(text).width;
  if (width > 0) size *= target / width;
  return size;
}

function drawCaps(ctx, text, x, y, size, tracking) {
  ctx.font = `${size}px ${CAPS}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, text.length - 1);
  let cursor = x - total / 2;
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], cursor, y);
    cursor += widths[i] + tracking;
  }
}
