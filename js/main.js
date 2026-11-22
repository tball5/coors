import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createArizonaCan, AZ_LABEL_Y0, AZ_LABEL_Y1, AZ_RADIUS } from './arizonaCan.js';
import { createArizonaLabelCanvas, loadArizonaFont } from './arizonaLabel.js';
import { createCan } from './can.js';
import { createLabelCanvas, loadDisplayFont } from './label.js';
import {
  createArizonaMaterial,
  createCanMaterial,
  createLabelTexture,
  createRimMaterial,
  holoMotion,
  holoTime,
} from './materials.js';
import { createStage } from './stage.js';

const SPIN_PERIOD = 15;
const HOVER = 0.13;
const BOB = 0.04;
const RESUME_MS = 1400;
const BG = 0x02060e;

const params = new URLSearchParams(location.search);
const poseName = params.get('pose');
const POSES = { front: 0, side: Math.PI / 2, back: Math.PI };
const pose = Object.prototype.hasOwnProperty.call(POSES, poseName) ? POSES[poseName] : null;
const capture = params.has('capture');

const canvas = document.querySelector('#view');
const statusEl = document.querySelector('#status');

window.__holo = { ready: false };

const FRAMES = {
  coors: { target: [0, 1.85, 0], eye: [0, 2.55, 9.15], distance: 9.35 },
  arizona: { target: [0, 2.45, 0], eye: [0, 3.15, 11.6], distance: 11.8 },
};

try {
  await loadDisplayFont();
  await loadArizonaFont();
  const labelCanvas = createLabelCanvas();
  const arizonaCanvas = createArizonaLabelCanvas();
  mount({ labelCanvas, arizonaCanvas });
} catch (error) {
  fail(error instanceof Error ? error.message : 'Projection failed');
}

function mount({ labelCanvas, arizonaCanvas }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  holoMotion.value = reduceMotion ? 0 : 1;
  if (capture) document.body.classList.add('is-capture');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    stencil: false,
  });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = pose === null && !capture;
  controls.autoRotateSpeed = 0.7;
  controls.minDistance = 4.2;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.49;
  const initialCan = params.get('can') === 'arizona' ? 'arizona' : 'coors';
  placeCamera(camera, controls, initialCan);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const labelMap = createLabelTexture(labelCanvas, anisotropy);
  const arizonaMap = createLabelTexture(arizonaCanvas, anisotropy);
  const rim = createRimMaterial();
  const cans = {
    coors: createCan(createCanMaterial(labelMap), rim),
    arizona: createArizonaCan(
      createArizonaMaterial(arizonaMap, { y0: AZ_LABEL_Y0, y1: AZ_LABEL_Y1, radius: AZ_RADIUS }),
      rim,
    ),
  };
  scene.add(cans.coors, cans.arizona);

  const brandName = document.querySelector('.brand strong');
  const brandMeta = document.querySelector('.brand em');
  const switcher = document.querySelector('#can-switch');
  let activeCan = initialCan;
  const showCan = (id, keepAngle) => {
    activeCan = id;
    cans.coors.visible = id === 'coors';
    cans.arizona.visible = id === 'arizona';
    brandName.innerHTML = id === 'coors' ? 'CO<span>ORS</span>' : 'ARI<span>ZONA</span>';
    brandMeta.textContent = id === 'coors' ? 'HOLOGRAM · 12 OZ' : 'HOLOGRAM · 23 OZ';
    canvas.setAttribute(
      'aria-label',
      id === 'coors'
        ? 'Spinning holographic projection of a Coors beer can'
        : 'Spinning holographic projection of an Arizona green tea can',
    );
    switcher.querySelectorAll('button').forEach((button) => {
      const on = button.dataset.can === id;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    placeCamera(camera, controls, id, keepAngle);
  };
  showCan(initialCan, false);
  switcher.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  switcher.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || (button.dataset.can !== 'coors' && button.dataset.can !== 'arizona')) return;
    showCan(button.dataset.can, true);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 't' && event.key !== 'T') return;
    event.preventDefault();
    showCan(activeCan === 'coors' ? 'arizona' : 'coors', true);
  });

  const stage = createStage();
  scene.add(stage.group);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,
    0.36,
    0.45,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const state = {
    mode: capture ? 'capture' : pose === null ? 'spin' : 'pose',
    time: pose === null ? 0 : 1.1,
    rotation: pose === null ? 0 : pose,
  };

  let resumeId = 0;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    window.clearTimeout(resumeId);
  });
  controls.addEventListener('end', () => {
    if (state.mode !== 'spin') return;
    window.clearTimeout(resumeId);
    resumeId = window.setTimeout(() => {
      controls.autoRotate = true;
    }, RESUME_MS);
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const apply = () => {
    const bob = state.mode === 'pose' ? 0 : Math.sin(state.time * 1.15) * BOB;
    cans.coors.position.y = HOVER + bob;
    cans.arizona.position.y = HOVER + bob;
    cans.coors.rotation.y = state.rotation;
    cans.arizona.rotation.y = state.rotation;
    holoTime.value = state.time;
    stage.update(state.time);
  };

  const render = () => {
    apply();
    controls.update();
    composer.render();
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    const dpr = pixelRatio();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
  };

  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  let running = true;

  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.mode === 'spin') {
      state.time += dt;
      state.rotation = (state.time / SPIN_PERIOD) * Math.PI * 2;
    }
    if (state.mode !== 'capture') render();
    requestAnimationFrame(frame);
  };

  render();
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  window.__holo = {
    ready: false,
    setFrame: ({ rotation, time }) => {
      state.mode = 'capture';
      state.rotation = rotation;
      state.time = time;
      render();
    },
  };

  statusEl.classList.add('is-done');
  window.setTimeout(() => {
    statusEl.remove();
    window.__holo.ready = true;
  }, reduceMotion ? 0 : 380);
}

function placeCamera(camera, controls, id, keepAngle) {
  const frame = FRAMES[id] || FRAMES.coors;
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  const distance = frame.distance * (aspect < 0.85 ? 1.12 : 1);
  if (keepAngle) {
    const offset = camera.position.clone().sub(controls.target);
    controls.target.set(frame.target[0], frame.target[1], frame.target[2]);
    if (offset.lengthSq() < 0.01) offset.set(0, frame.eye[1] - frame.target[1], distance);
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);
  } else {
    controls.target.set(frame.target[0], frame.target[1], frame.target[2]);
    const eye = frame.eye;
    const pull = aspect < 0.85 ? distance : eye[2];
    const rise = aspect < 0.85 ? eye[1] - 0.2 : eye[1];
    camera.position.set(eye[0], rise, pull);
  }
  controls.update();
}

function pixelRatio() {
  const forced = Number(params.get('dpr'));
  if (Number.isFinite(forced) && forced > 0) return Math.min(forced, 2);
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  return Math.min(window.devicePixelRatio || 1, small ? 1.35 : 1.6);
}

function fail(message) {
  statusEl.textContent = 'PROJECTION FAILED';
  statusEl.title = message;
  statusEl.classList.add('is-error');
}
