import * as THREE from 'three';
import { BODY_RADIUS, LABEL_Y0, LABEL_Y1 } from './metrics.js';

/** Shared clock so every hologram surface flickers together. */
export const holoTime = { value: 0 };
export const holoMotion = { value: 1 };

const canVertex = /* glsl */ `
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

const canFragment = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform sampler2D uLabel;
  uniform float uY0;
  uniform float uY1;
  uniform float uRadius;
  uniform float uColorful;

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
    float along = clamp(vWorld.y / 4.3, 0.0, 1.0);
    float bar = smoothstep(0.045, 0.0, abs(along - sweep));

    float flick = 0.93 + 0.07 * sin(uTime * 17.0) * sin(uTime * 2.7);
    flick = mix(1.0, flick, uMotion);

    float gate = step(0.975, fract(sin(floor(uTime * 1.6) * 47.13) * 913.7));
    gate *= uMotion;
    float glitch = smoothstep(0.018, 0.0, abs(fract(vWorld.y * 6.5 + uTime * 0.7) - 0.42));

    vec3 deep = vec3(0.012, 0.05, 0.12);
    vec3 mid = vec3(0.12, 0.5, 0.95);
    vec3 hot = vec3(0.72, 0.94, 1.0);

    vec3 col = deep;
    col += mid * fres * 0.5;
    col += hot * rim * 0.32;
    col += mid * scan * 0.14;
    col += hot * bar * 0.12;
    col += hot * smoothstep(0.72, 1.0, abs(N.y)) * 0.16;
    col += hot * gate * glitch * 0.45;
    float shade = mix(0.38, 1.0, scan);
    col *= shade;
    col *= flick;

    float span = max(uY1 - uY0, 0.001);
    float v = (vLocal.y - uY0) / span;
    float radial = length(vLocal.xz);
    if (v > 0.0 && v < 1.0 && abs(radial - uRadius) < 0.16) {
      float u = atan(vLocal.x, vLocal.z) * 0.159154943 + 0.5;
      vec4 lab = texture2D(uLabel, vec2(u, v));
      float ink = lab.a;
      float warmth = smoothstep(0.05, 0.32, lab.r - lab.b);
      vec3 tint = mix(hot, vec3(1.0, 0.64, 0.2), warmth);
      float gain = mix(0.72, 0.58, warmth);
      if (uColorful > 0.5) {
        tint = mix(hot, lab.rgb, 0.8);
        gain = 0.46 + 0.4 * smoothstep(0.25, 0.9, max(lab.r, max(lab.g, lab.b)));
      }
      float edge = smoothstep(0.0, 0.025, v) * smoothstep(1.0, 0.975, v);
      col += tint * ink * edge * shade * gain;
      col += mid * ink * edge * 0.08;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const rimVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const rimFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - abs(dot(N, V)), 2.6);
    float scan = 0.75 + 0.25 * sin(vWorld.y * 22.0 - uTime * 4.0);
    vec3 col = vec3(0.28, 0.75, 1.0) * fres * scan * 0.38;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const beamVertex = /* glsl */ `
  varying float vH;
  varying vec3 vWorld;
  void main() {
    vH = uv.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const beamFragment = /* glsl */ `
  uniform float uTime;
  varying float vH;
  varying vec3 vWorld;

  void main() {
    float fade = pow(1.0 - clamp(vH, 0.0, 1.0), 1.35);
    float twinkle = 0.65 + 0.35 * sin(uTime * 1.8 + vWorld.x * 2.0 + vWorld.z);
    vec3 col = vec3(0.3, 0.72, 1.0) * fade * twinkle * 0.14;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const coneVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vH;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    vH = uv.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const coneFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vH;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - abs(dot(N, V)), 1.7);
    float fade = pow(1.0 - clamp(vH, 0.0, 1.0), 1.15);
    vec3 col = vec3(0.22, 0.62, 1.0) * fres * fade * 0.07;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const gridVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const gridFragment = /* glsl */ `
  varying vec3 vWorld;

  float lineGrid(vec2 p, float scale) {
    vec2 q = p * scale;
    vec2 fw = max(fwidth(q), vec2(0.0001));
    vec2 g = abs(fract(q - 0.5) - 0.5);
    float lx = 1.0 - smoothstep(0.0, fw.x * 1.25, g.x);
    float ly = 1.0 - smoothstep(0.0, fw.y * 1.25, g.y);
    return clamp(max(lx, ly), 0.0, 1.0);
  }

  void main() {
    float minor = lineGrid(vWorld.xz, 1.25);
    float major = lineGrid(vWorld.xz, 0.3125);
    float dist = length(vWorld.xz);
    float fade = smoothstep(18.0, 3.2, dist);
    float pool = smoothstep(6.2, 0.35, dist);
    vec3 col = vec3(0.05, 0.28, 0.48) * minor * 0.22;
    col += vec3(0.12, 0.5, 0.8) * major * 0.34;
    col += vec3(0.12, 0.5, 0.82) * pool * 0.14;
    col *= fade;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function additive(material) {
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;
  material.toneMapped = false;
  return material;
}

export function createLabelTexture(canvas, anisotropy) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createCanMaterial(labelMap) {
  const material = new THREE.ShaderMaterial({
    name: 'HologramCan',
    uniforms: {
      uTime: holoTime,
      uMotion: holoMotion,
      uLabel: { value: labelMap },
      uY0: { value: LABEL_Y0 },
      uY1: { value: LABEL_Y1 },
      uRadius: { value: BODY_RADIUS },
      uColorful: { value: 0 },
    },
    vertexShader: canVertex,
    fragmentShader: canFragment,
    depthWrite: true,
  });
  return additive(material);
}

export function createArizonaMaterial(labelMap, { y0, y1, radius }) {
  const material = new THREE.ShaderMaterial({
    name: 'HologramArizona',
    uniforms: {
      uTime: holoTime,
      uMotion: holoMotion,
      uLabel: { value: labelMap },
      uY0: { value: y0 },
      uY1: { value: y1 },
      uRadius: { value: radius },
      uColorful: { value: 1 },
    },
    vertexShader: canVertex,
    fragmentShader: canFragment,
    depthWrite: true,
  });
  return additive(material);
}

export function createRimMaterial() {
  const material = new THREE.ShaderMaterial({
    name: 'HologramRim',
    uniforms: { uTime: holoTime },
    vertexShader: rimVertex,
    fragmentShader: rimFragment,
    side: THREE.BackSide,
    depthTest: true,
  });
  return additive(material);
}

export function createBeamMaterial() {
  return additive(new THREE.ShaderMaterial({
    name: 'HoloBeam',
    uniforms: { uTime: holoTime },
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    side: THREE.DoubleSide,
  }));
}

export function createConeMaterial() {
  return additive(new THREE.ShaderMaterial({
    name: 'HoloCone',
    vertexShader: coneVertex,
    fragmentShader: coneFragment,
    side: THREE.DoubleSide,
    depthTest: true,
  }));
}

export function createGridMaterial() {
  return additive(new THREE.ShaderMaterial({
    name: 'HoloGrid',
    vertexShader: gridVertex,
    fragmentShader: gridFragment,
    depthWrite: true,
  }));
}
