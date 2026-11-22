import * as THREE from 'three';

/** 23 oz tall can: slimmer than the 12 oz can and about 2.66 diameters tall. */
export const AZ_RADIUS = 0.92;
export const AZ_LABEL_Y0 = 0.42;
export const AZ_LABEL_Y1 = 4.08;
export const AZ_LID_Y = 4.88;

export function createArizonaCan(canMaterial, rimMaterial) {
  const group = new THREE.Group();
  group.name = 'arizona';

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
  lid.rotation.y = -0.35;
  lid.add(tab(canMaterial));
  lid.add(rivet(canMaterial));
  lid.add(score(canMaterial));
  group.add(lid);

  return group;
}

function buildProfile() {
  const r = AZ_RADIUS;
  const pts = [];
  const add = (radius, y) => pts.push(new THREE.Vector2(radius, y));

  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    add(Math.max(0.002, t * r * 0.955), 0.26 * Math.cos(t * Math.PI * 0.5));
  }

  add(r * 0.975, 0.02);
  add(r * 0.995, 0);
  add(r * 1.01, 0.016);
  add(r * 1.004, 0.05);
  add(r * 0.988, 0.09);
  add(r, 0.15);
  add(r, 4.2);

  const neck = r * 0.8;
  for (let i = 1; i <= 12; i += 1) {
    const t = i / 12;
    const s = t * t * (3 - 2 * t);
    add(r + (neck - r) * s, 4.2 + 0.4 * t);
  }

  add(neck, 4.66);
  add(neck + 0.02, 4.7);
  add(neck + 0.05, 4.74);
  add(neck + 0.08, 4.78);
  add(neck + 0.09, 4.81);
  add(neck + 0.065, 4.845);
  add(neck + 0.028, 4.868);
  add(neck - 0.02, 4.845);
  add(neck - 0.08, 4.812);
  add(0.5, AZ_LID_Y - 0.012);
  add(0.2, AZ_LID_Y - 0.004);
  add(0.002, AZ_LID_Y);

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

function tab(material) {
  const shape = roundedRect(-0.27, -0.14, 0.56, 0.28, 0.12);
  const hole = new THREE.Path();
  hole.absarc(-0.09, 0, 0.066, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, AZ_LID_Y + 0.012, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 8;
  return mesh;
}

function rivet(material) {
  const geo = new THREE.CylinderGeometry(0.036, 0.042, 0.046, 18);
  geo.translate(0.12, AZ_LID_Y + 0.042, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 9;
  return mesh;
}

function score(material) {
  const shape = new THREE.Shape();
  shape.absellipse(0.14, 0, 0.3, 0.21, 0, Math.PI * 2, false, 0);
  const inner = new THREE.Path();
  inner.absellipse(0.14, 0, 0.268, 0.178, 0, Math.PI * 2, true, 0);
  shape.holes.push(inner);
  const geo = new THREE.ShapeGeometry(shape, 48);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, AZ_LID_Y + 0.005, 0);
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
