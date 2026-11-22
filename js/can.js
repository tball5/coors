import * as THREE from 'three';
import { LID_Y } from './metrics.js';

/** Lathe of a 12oz can: dome, chime, body, neck, seam, and lid panel. */
export function createCan(canMaterial, rimMaterial) {
  const group = new THREE.Group();
  group.name = 'can';

  const bodyGeo = new THREE.LatheGeometry(buildProfile(), 96);
  sanitizeNormals(bodyGeo);

  const body = new THREE.Mesh(bodyGeo, canMaterial);
  body.renderOrder = 6;
  group.add(body);

  const rim = new THREE.Mesh(bodyGeo, rimMaterial);
  rim.scale.set(1.028, 1, 1.028);
  rim.renderOrder = 7;
  group.add(rim);

  const lid = new THREE.Group();
  lid.rotation.y = 0.42;
  lid.add(createTab(canMaterial));
  lid.add(createRivet(canMaterial));
  lid.add(createScore(canMaterial));
  group.add(lid);

  return group;
}

function buildProfile() {
  const pts = [];
  const add = (r, y) => pts.push(new THREE.Vector2(r, y));

  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    add(Math.max(0.002, t * 0.955), 0.28 * Math.cos(t * Math.PI * 0.5));
  }

  add(0.975, 0.02);
  add(0.995, 0);
  add(1.012, 0.018);
  add(1.006, 0.055);
  add(0.988, 0.095);
  add(1, 0.16);
  add(1, 3.04);

  const neck = 0.79;
  for (let i = 1; i <= 12; i += 1) {
    const t = i / 12;
    const s = t * t * (3 - 2 * t);
    add(1 + (neck - 1) * s, 3.04 + 0.4 * t);
  }

  add(neck, 3.5);
  add(neck + 0.02, 3.545);
  add(neck + 0.055, 3.585);
  add(neck + 0.085, 3.625);
  add(neck + 0.095, 3.655);
  add(neck + 0.07, 3.69);
  add(neck + 0.03, 3.715);
  add(neck - 0.02, 3.69);
  add(neck - 0.08, 3.655);
  add(0.55, LID_Y - 0.014);
  add(0.22, LID_Y - 0.004);
  add(0.002, LID_Y);

  return pts;
}

function sanitizeNormals(geo) {
  const normal = geo.getAttribute('normal');
  for (let i = 0; i < normal.count; i += 1) {
    const x = normal.getX(i);
    const y = normal.getY(i);
    const z = normal.getZ(i);
    if (!Number.isFinite(x + y + z) || x * x + y * y + z * z < 1e-8) {
      normal.setXYZ(i, 0, 1, 0);
    }
  }
  normal.needsUpdate = true;
}

function createTab(material) {
  const shape = roundedRect(-0.3, -0.15, 0.62, 0.3, 0.13);
  const hole = new THREE.Path();
  hole.absarc(-0.1, 0, 0.072, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, LID_Y + 0.014, 0);

  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 8;
  return mesh;
}

function createRivet(material) {
  const geo = new THREE.CylinderGeometry(0.04, 0.046, 0.05, 18);
  geo.translate(0.14, LID_Y + 0.046, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 9;
  return mesh;
}

function createScore(material) {
  const shape = new THREE.Shape();
  shape.absellipse(0.16, 0, 0.34, 0.24, 0, Math.PI * 2, false, 0);
  const inner = new THREE.Path();
  inner.absellipse(0.16, 0, 0.305, 0.205, 0, Math.PI * 2, true, 0);
  shape.holes.push(inner);

  const geo = new THREE.ShapeGeometry(shape, 64);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, LID_Y + 0.006, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 8;
  return mesh;
}

function roundedRect(x, y, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
