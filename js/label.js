import { LABEL_Y0, LABEL_Y1, labelTextureSize } from './metrics.js';

const SCRIPT = '"Yellowtail", cursive';
const CAPS = '"Bebas Neue", "Arial Narrow", Impact, sans-serif';
const WARM = '#ff7414';
const WARM_EDGE = '#ffb15a';
const INK = '#ffffff';

export async function loadDisplayFont() {
  const faces = [
    ['Bebas Neue', '../fonts/BebasNeue-Regular.woff2'],
    ['Yellowtail', '../fonts/Yellowtail-Regular.woff2'],
  ];
  await Promise.all(faces.map(async ([family, path]) => {
    const url = new URL(path, import.meta.url);
    const face = new FontFace(family, `url(${url})`, { weight: '400', style: 'normal' });
    await face.load();
    document.fonts.add(face);
  }));
}

/**
 * Banquet-style wrap, drawn as hologram ink.
 * White is cyan linework; warm pixels pick up the badge and crests.
 */
export function createLabelCanvas() {
  const { width, height } = labelTextureSize(1280);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  drawFront(ctx, width / 2, height);
  drawBackSeal(ctx, 0, height * 0.52, height * 0.16);
  drawBackSeal(ctx, width, height * 0.52, height * 0.16);

  return canvas;
}

export function labelSpan() {
  return { y0: LABEL_Y0, y1: LABEL_Y1 };
}

function drawFront(ctx, cx, height) {
  const coorsSize = fitScript(ctx, 'Coors', height * 0.9, height * 0.24);
  const coorsY = height * 0.155;
  const stroke = coorsSize * 0.03;
  drawScript(ctx, 'Coors', cx, coorsY, coorsSize, INK, stroke);

  ctx.font = `${coorsSize}px ${SCRIPT}`;
  ctx.textBaseline = 'middle';
  const inkBottom = coorsY + ctx.measureText('Coors').actualBoundingBoxDescent + stroke;
  const gap = height * 0.034;

  const badgeH = height * 0.07;
  const badgeW = Math.min(coorsSize * 1.55, height * 0.6);
  const badgeCy = inkBottom + gap + badgeH / 2;
  drawBadge(ctx, cx, badgeCy, badgeW, badgeH);

  const badgeBottom = badgeCy + badgeH / 2;
  const belowGap = height * 0.02;
  const bottomLimit = height * 0.9;
  const room = bottomLimit - badgeBottom - belowGap;
  const radius = Math.min(height * 0.108, Math.max(height * 0.078, room / 3.5));
  const sealY = badgeBottom + belowGap + radius * 1.4;

  drawArched(ctx, 'GOLDEN, COLORADO', cx, sealY, radius * 1.28, radius * 0.2);
  drawMedallion(ctx, cx, sealY, radius);
  drawCrest(ctx, cx - radius * 1.95, sealY + radius * 0.02, radius * 0.9, 1);
  drawCrest(ctx, cx + radius * 1.95, sealY + radius * 0.02, radius * 0.9, -1);

  const lineSize = radius * 0.22;
  const textY = sealY + radius + lineSize * 1.85;
  ['BREWED WITH 100%', 'ROCKY MOUNTAIN WATER', 'SINCE 1873'].forEach((line, i) => {
    drawCaps(ctx, line, cx, textY + i * lineSize * 1.35, lineSize, lineSize * 0.14);
  });
}

function drawScript(ctx, text, x, y, size, color, weight) {
  ctx.font = `${size}px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = weight;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function fitScript(ctx, text, targetWidth, start) {
  let size = start;
  ctx.font = `${size}px ${SCRIPT}`;
  const width = ctx.measureText(text).width;
  if (width > 0) size *= targetWidth / width;
  return size;
}

function drawBadge(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.translate(cx, cy);
  ribbonPath(ctx, w, h);
  ctx.fillStyle = WARM;
  ctx.fill();
  ctx.lineWidth = Math.max(3, h * 0.045);
  ctx.strokeStyle = WARM_EDGE;
  ctx.stroke();
  ctx.save();
  ribbonPath(ctx, w * 0.9, h * 0.72);
  ctx.lineWidth = Math.max(2, h * 0.03);
  ctx.stroke();
  ctx.restore();

  const size = h * 0.7;
  ctx.font = `${size}px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.04;
  ctx.strokeText('Banquet', 0, h * 0.04);
  ctx.fillText('Banquet', 0, h * 0.04);
  ctx.restore();
}

function ribbonPath(ctx, w, h) {
  const x = -w / 2;
  const y = -h / 2;
  const tip = h * 0.42;
  ctx.beginPath();
  ctx.moveTo(x + tip, y);
  ctx.lineTo(x + w - tip, y);
  ctx.lineTo(x + w, 0);
  ctx.lineTo(x + w - tip, y + h);
  ctx.lineTo(x + tip, y + h);
  ctx.lineTo(x, 0);
  ctx.closePath();
}

function drawMedallion(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(3, r * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.018);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
  ctx.clip();

  const base = cy + r * 0.42;
  ridge(ctx, cx - r * 0.7, base, r * 1.4, r * 0.72, [0.15, 0.42, 0.22, 0.7, 0.28, 0.95, 0.36, 0.62, 0.18]);
  ctx.globalAlpha = 0.85;
  pine(ctx, cx - r * 0.42, base + r * 0.02, r * 0.28);
  pine(ctx, cx + r * 0.4, base - r * 0.02, r * 0.32);
  pine(ctx, cx - r * 0.22, base + r * 0.08, r * 0.2);
  pine(ctx, cx + r * 0.2, base + r * 0.06, r * 0.18);
  ctx.globalAlpha = 1;

  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.05);
  ctx.lineTo(cx - r * 0.04, base - r * 0.02);
  ctx.moveTo(cx + r * 0.03, cy + r * 0.08);
  ctx.lineTo(cx + r * 0.08, base);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const yy = cy + r * 0.22 + i * r * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.1, yy);
    ctx.lineTo(cx, yy + r * 0.07);
    ctx.lineTo(cx + r * 0.1, yy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(cx, base + r * 0.02, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function ridge(ctx, x, baseline, w, h, peaks) {
  ctx.beginPath();
  peaks.forEach((p, i) => {
    const px = x + (i / (peaks.length - 1)) * w;
    const py = baseline - p * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.lineTo(x + w, baseline + h * 0.2);
  ctx.lineTo(x, baseline + h * 0.2);
  ctx.closePath();
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = Math.max(2, h * 0.04);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  peaks.forEach((p, i) => {
    const px = x + (i / (peaks.length - 1)) * w;
    const py = baseline - p * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

function pine(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.34, y);
  ctx.lineTo(x - s * 0.34, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.45);
  ctx.lineTo(x + s * 0.26, y - s * 0.48);
  ctx.lineTo(x - s * 0.26, y - s * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - s * 0.05, y - s * 0.08, s * 0.1, s * 0.22);
}

function drawArched(ctx, text, cx, cy, radius, size) {
  ctx.font = `${size}px ${CAPS}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const spread = Math.min(2.2, 0.42 + chars.length * 0.11);
  const start = -Math.PI / 2 - spread / 2;
  const step = spread / (chars.length - 1);
  chars.forEach((ch, i) => {
    const a = start + step * i;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

function drawCaps(ctx, text, x, y, size, tracking) {
  ctx.font = `${size}px ${CAPS}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (text.length - 1);
  let cursor = x - total / 2;
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], cursor, y);
    cursor += widths[i] + tracking;
  }
}

function drawCrest(ctx, x, y, s, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = WARM;
  ctx.strokeStyle = WARM_EDGE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, s * 0.045);

  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.26, s * 0.15, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.16, -s * 0.1, s * 0.11, s * 0.16, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.26, -s * 0.32, s * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = WARM;
  for (let i = 0; i < 6; i += 1) {
    const a = -2.4 + i * 0.42;
    ctx.beginPath();
    ctx.moveTo(s * 0.26 + Math.cos(a) * s * 0.08, -s * 0.32 + Math.sin(a) * s * 0.08);
    ctx.lineTo(s * 0.26 + Math.cos(a) * s * 0.2, -s * 0.32 + Math.sin(a) * s * 0.2);
    ctx.stroke();
  }

  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, s * 0.14);
  ctx.lineTo(-s * 0.16, s * 0.42);
  ctx.moveTo(s * 0.08, s * 0.14);
  ctx.lineTo(s * 0.12, s * 0.42);
  ctx.moveTo(s * 0.2, s * 0.02);
  ctx.lineTo(s * 0.34, s * 0.16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-s * 0.24, -s * 0.02);
  ctx.quadraticCurveTo(-s * 0.48, -s * 0.18, -s * 0.36, -s * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-s * 0.36, -s * 0.44, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = WARM_EDGE;
  ctx.lineWidth = Math.max(2, s * 0.03);
  ctx.beginPath();
  ctx.arc(-s * 0.02, -s * 0.48, s * 0.16, Math.PI * 0.15, Math.PI * 1.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.08, -s * 0.58, s * 0.08, 0.2, Math.PI * 1.7);
  ctx.stroke();
  ctx.restore();
}

function drawBackSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, r * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ridge(ctx, cx - r * 0.62, cy + r * 0.28, r * 1.24, r * 0.55, [0.2, 0.55, 0.25, 0.9, 0.3, 0.6, 0.18]);
  ctx.font = `${r * 0.22}px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Coors', cx, cy - r * 0.42);
  ctx.font = `${r * 0.16}px ${CAPS}`;
  ctx.fillText('1873', cx, cy + r * 0.55);
  ctx.restore();
}
