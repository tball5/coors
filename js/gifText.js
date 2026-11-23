import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { holoMotion, holoTime } from './materials.js';

const PINK = new THREE.Color('#ff4d8d');
const CORE = new THREE.Color('#fff6fa');

const textVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const textFragment = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform vec3 uCore;
  uniform vec3 uPink;
  uniform float uHalo;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.1);
    float rim = smoothstep(0.58, 0.9, fres);
    float groove = smoothstep(0.22, 0.58, fres) * (1.0 - rim);

    float coord = vWorld.y * 14.0 - uTime * 3.2;
    float fw = max(fwidth(coord), 0.001);
    float dist = min(fract(coord), 1.0 - fract(coord));
    float scan = 1.0 - smoothstep(0.02, 0.02 + fw * 1.4, dist);
    float shade = mix(0.92, 1.0, scan);

    float flick = 0.97 + 0.03 * sin(uTime * 17.0) * sin(uTime * 2.7);
    flick = mix(1.0, flick, uMotion);

    vec3 face = uCore * (0.42 + pow(ndv, 1.15) * 0.9);
    face = mix(face, uPink * 0.2, groove);
    face += mix(uCore, vec3(1.0), 0.45) * rim;

    vec3 halo = uPink * (0.1 + fres * 0.22);
    vec3 col = mix(face, halo, uHalo);
    col *= shade * flick;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function loadGifFont() {
  const url = new URL('../fonts/BebasNeue-Bold.typeface.json', import.meta.url);
  return new FontLoader().loadAsync(url.href);
}

/** Italic neon tubing: "IT'S A" over a larger "GIF". */
export function createGifText(font) {
  const shared = {
    uTime: holoTime,
    uMotion: holoMotion,
    uCore: { value: CORE },
    uPink: { value: PINK },
  };
  const coreMat = makeMaterial(shared, 0);
  const haloMat = makeMaterial(shared, 1);

  const gif = makeLine(font, 'GIF', 1.72, 0.16, 0.2);
  const its = makeLine(font, "IT'S A", 0.7, 0.09, 0.08);
  const gap = 0.24;
  const gifCore = new THREE.Mesh(gif.geo, coreMat);
  const itsCore = new THREE.Mesh(its.geo, coreMat);
  const gifHalo = new THREE.Mesh(gif.geo, haloMat);
  const itsHalo = new THREE.Mesh(its.geo, haloMat);
  gifCore.position.y = gif.height / 2;
  itsCore.position.y = gif.height + gap + its.height / 2;
  gifHalo.position.copy(gifCore.position);
  itsHalo.position.copy(itsCore.position);
  gifHalo.scale.setScalar(1.02);
  itsHalo.scale.setScalar(1.028);
  [gifHalo, itsHalo].forEach((mesh) => {
    mesh.renderOrder = 5;
  });
  [gifCore, itsCore].forEach((mesh) => {
    mesh.renderOrder = 7;
  });

  const group = new THREE.Group();
  group.name = 'gif';
  group.add(gifHalo, itsHalo, gifCore, itsCore);
  return group;
}

function makeMaterial(shared, halo) {
  return new THREE.ShaderMaterial({
    name: halo ? 'NeonHalo' : 'NeonCore',
    uniforms: {
      uTime: shared.uTime,
      uMotion: shared.uMotion,
      uCore: shared.uCore,
      uPink: shared.uPink,
      uHalo: { value: halo },
    },
    vertexShader: textVertex,
    fragmentShader: textFragment,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
}

function makeLine(font, text, size, depth, tracking) {
  const parts = [];
  let cursor = 0;
  for (const ch of text) {
    if (ch === ' ') {
      cursor += size * 0.38;
      continue;
    }
    const geo = new TextGeometry(ch, {
      font,
      size,
      height: depth,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: size * 0.05,
      bevelSize: size * 0.035,
      bevelOffset: 0,
      bevelSegments: 4,
    });
    italicize(geo, 0.32);
    const box = geo.boundingBox;
    const width = box.max.x - box.min.x;
    geo.translate(cursor - box.min.x, 0, 0);
    parts.push(geo);
    const gap = ch === "'" ? tracking * 0.35 : tracking;
    cursor += width + size * gap;
  }
  const geo = mergeGeometries(parts, false);
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  geo.translate(
    -(box.max.x + box.min.x) / 2,
    -(box.max.y + box.min.y) / 2,
    -(box.max.z + box.min.z) / 2,
  );
  return {
    geo,
    height: box.max.y - box.min.y,
    width: box.max.x - box.min.x,
  };
}

function italicize(geo, slant) {
  geo.computeBoundingBox();
  const midY = (geo.boundingBox.max.y + geo.boundingBox.min.y) / 2;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setX(i, pos.getX(i) + (pos.getY(i) - midY) * slant);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  geo.translate(
    -(box.max.x + box.min.x) / 2,
    -(box.max.y + box.min.y) / 2,
    -(box.max.z + box.min.z) / 2,
  );
}
