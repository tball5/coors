import * as THREE from 'three';
import { createBeamMaterial, createConeMaterial, createGridMaterial } from './materials.js';

export function createStage() {
  const group = new THREE.Group();
  group.name = 'stage';

  const grid = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), createGridMaterial());
  grid.rotation.x = -Math.PI / 2;
  grid.renderOrder = 0;
  group.add(grid);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), glowMaterial(glowTexture()));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  glow.renderOrder = 1;
  group.add(glow);

  const rings = [
    ring(0.62, 0.012, 0xdef8ff, 1, 0.02),
    ring(1.05, 0.006, 0x8adfff, 0.75, 0.025),
    ring(1.55, 0.005, 0x5ecfff, 0.55, 0.03),
    ring(2.15, 0.008, 0xb8f3ff, 0.7, 0.028),
  ];
  rings.forEach((mesh) => group.add(mesh));

  const arcs = [
    arc(1.72, 0.011, Math.PI * 1.25, 0.35),
    arc(1.28, 0.008, Math.PI * 0.85, -0.55),
  ];
  arcs.forEach((entry) => group.add(entry.mesh));

  const pingGeo = new THREE.RingGeometry(0.96, 1.02, 96);
  pingGeo.rotateX(-Math.PI / 2);
  const pingMat = glowMaterial(null, 0x9aefff, 0.45);
  const ping = new THREE.Mesh(pingGeo, pingMat);
  ping.position.y = 0.04;
  ping.renderOrder = 3;
  group.add(ping);

  const coneGeo = new THREE.CylinderGeometry(1.15, 2.6, 4.6, 72, 1, true);
  coneGeo.translate(0, 2.3, 0);
  const cone = new THREE.Mesh(coneGeo, createConeMaterial());
  cone.renderOrder = 2;
  group.add(cone);

  const streakGeo = new THREE.CylinderGeometry(0.016, 0.028, 4.05, 8, 1, true);
  streakGeo.translate(0, 2.02, 0);
  const streakMat = createBeamMaterial();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const streak = new THREE.Mesh(streakGeo, streakMat);
    streak.position.set(Math.cos(a) * 1.48, 0, Math.sin(a) * 1.48);
    streak.renderOrder = 3;
    group.add(streak);
  }

  return {
    group,
    update(time) {
      arcs[0].mesh.rotation.y = time * arcs[0].speed;
      arcs[1].mesh.rotation.y = time * arcs[1].speed;
      const t = time * 0.28 % 1;
      const scale = 0.5 + t * 1.85;
      ping.scale.setScalar(scale);
      pingMat.opacity = (1 - t) * (1 - t) * 0.55;
    },
  };
}

function ring(radius, tube, color, opacity, y) {
  const geo = new THREE.TorusGeometry(radius, tube, 12, 96);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, glowMaterial(null, color, opacity));
  mesh.position.y = y;
  mesh.renderOrder = 2;
  return mesh;
}

function arc(radius, tube, length, speed) {
  const geo = new THREE.TorusGeometry(radius, tube, 8, 80, length);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, glowMaterial(null, 0xd8fbff, 0.9));
  mesh.position.y = 0.035;
  mesh.renderOrder = 3;
  return { mesh, speed };
}

function glowMaterial(map, color = 0xffffff, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 8, 256, 256, 250);
  g.addColorStop(0, 'rgba(210, 245, 255, 0.55)');
  g.addColorStop(0.18, 'rgba(70, 190, 255, 0.22)');
  g.addColorStop(0.46, 'rgba(16, 70, 130, 0.06)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
