import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { holoMotion, holoTime } from './materials.js';

/** Cream/gold/red and mint/teal/pink, taken from the two can labels. */
export const TEXT_PALETTES = {
  coors: { a: '#fff1d0', b: '#ffb15a', c: '#ff3b32' },
  arizona: { a: '#d8fff1', b: '#2fe0c5', c: '#ff86b4' },
};

const textVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vLocal = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const textFragment = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;

  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.15);
    float rim = pow(fres, 2.4);

    float coord = vWorld.y * 11.0 - uTime * 3.2;
    float fw = max(fwidth(coord), 0.001);
    float dist = min(fract(coord), 1.0 - fract(coord));
    float scan = 1.0 - smoothstep(0.02, 0.02 + fw * 1.6, dist);

    float sweep = fract(uTime * 0.13);
    float along = clamp((vWorld.y - 0.1) / 3.1, 0.0, 1.0);
    float bar = smoothstep(0.045, 0.0, abs(along - sweep));

    float flick = 0.93 + 0.07 * sin(uTime * 17.0) * sin(uTime * 2.7);
    flick = mix(1.0, flick, uMotion);

    float gate = step(0.975, fract(sin(floor(uTime * 1.6) * 47.13) * 913.7));
    gate *= uMotion;
    float glitch = smoothstep(0.018, 0.0, abs(fract(vWorld.y * 6.5 + uTime * 0.7) - 0.42));

    float h = clamp((vWorld.y - 0.15) / 3.05, 0.0, 1.0);
    vec3 face = mix(uC, uB, smoothstep(0.08, 0.48, h));
    face = mix(face, uA, smoothstep(0.42, 0.92, h));

    vec3 col = face * (0.22 + fres * 0.9);
    col += uA * rim * 0.62;
    col += face * scan * 0.28;
    col += uB * bar * 0.55;
    col += uA * smoothstep(0.72, 1.0, abs(N.y)) * 0.18;
    col += mix(uA, uC, 0.35) * gate * glitch * 0.7;
    float shade = mix(0.42, 1.0, scan);
    col *= shade;
    col *= flick;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function loadGifFont() {
  const url = new URL('../fonts/BebasNeue-Bold.typeface.json', import.meta.url);
  return new FontLoader().loadAsync(url.href);
}

/** Two extruded lines, "IT'S A" over a larger "GIF", centered on the pad. */
export function createGifText(font) {
  const uniforms = {
    uTime: holoTime,
    uMotion: holoMotion,
    uA: { value: new THREE.Color(TEXT_PALETTES.coors.a) },
    uB: { value: new THREE.Color(TEXT_PALETTES.coors.b) },
    uC: { value: new THREE.Color(TEXT_PALETTES.coors.c) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'HologramText',
    uniforms,
    vertexShader: textVertex,
    fragmentShader: textFragment,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });

  const gif = makeLine(font, 'GIF', 1.72, 0.32);
  const its = makeLine(font, "IT'S A", 0.7, 0.18);
  const gap = 0.22;
  const total = gif.height + gap + its.height;
  const gifMesh = new THREE.Mesh(gif.geo, material);
  const itsMesh = new THREE.Mesh(its.geo, material);
  gifMesh.position.y = gif.height / 2;
  itsMesh.position.y = gif.height + gap + its.height / 2;
  gifMesh.renderOrder = 6;
  itsMesh.renderOrder = 6;

  const group = new THREE.Group();
  group.name = 'gif';
  group.add(gifMesh, itsMesh);
  group.userData.setPalette = (name) => {
    const palette = TEXT_PALETTES[name] || TEXT_PALETTES.coors;
    uniforms.uA.value.set(palette.a);
    uniforms.uB.value.set(palette.b);
    uniforms.uC.value.set(palette.c);
  };
  return group;
}

function makeLine(font, text, size, depth) {
  const geo = new TextGeometry(text, {
    font,
    size,
    height: depth,
    curveSegments: 10,
    bevelEnabled: true,
    bevelThickness: size * 0.04,
    bevelSize: size * 0.022,
    bevelOffset: 0,
    bevelSegments: 3,
  });
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
