import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeCameraPlacement, type Experimental3DViewPreset } from './cameraModel';
import type { Experimental3DSceneModel } from './sceneModel';
import type { Experimental3DViewportController } from './Experimental3DCanvas';

const disposeScene = (scene: THREE.Scene) => {
  scene.traverse((object) => {
    const disposable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    disposable.geometry?.dispose();
    if (Array.isArray(disposable.material)) disposable.material.forEach((material) => material.dispose());
    else disposable.material?.dispose();
  });
};

export const createThreeViewportController = (
  canvas: HTMLCanvasElement,
  model: Experimental3DSceneModel,
): Experimental3DViewportController => {
  const dark = document.documentElement.dataset.theme === 'dark';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1_000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.screenSpacePanning = true;

  const memberPositions = model.members.flatMap((member) => [...member.start, ...member.end]);
  if (memberPositions.length > 0) {
    const memberGeometry = new THREE.BufferGeometry();
    memberGeometry.setAttribute('position', new THREE.Float32BufferAttribute(memberPositions, 3));
    scene.add(new THREE.LineSegments(
      memberGeometry,
      new THREE.LineBasicMaterial({ color: dark ? 0x6ea8ff : 0x2563eb }),
    ));
  }

  const nodePositions = model.nodes.flatMap((node) => [...node.position]);
  if (nodePositions.length > 0) {
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    scene.add(new THREE.Points(
      nodeGeometry,
      new THREE.PointsMaterial({ color: dark ? 0xfbbf24 : 0xd97706, size: Math.max(model.bounds.span * 0.028, 0.08), sizeAttenuation: true }),
    ));
  }

  const gridSize = Math.max(model.bounds.span * 2.4, 10);
  const grid = new THREE.GridHelper(gridSize, 20, dark ? 0x536274 : 0x7b8798, dark ? 0x293444 : 0xd6dde8);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(model.bounds.center[0], model.bounds.center[1], -Math.max(model.bounds.span * 0.002, 0.001));
  scene.add(grid);

  const axes = new THREE.AxesHelper(Math.max(model.bounds.span * 0.24, 1));
  axes.position.set(model.bounds.min[0], model.bounds.min[1], 0.002);
  scene.add(axes);

  const target = new THREE.Vector3(...model.bounds.center);
  const render = () => renderer.render(scene, camera);

  const setView = (preset: Experimental3DViewPreset) => {
    const placement = computeCameraPlacement(model.bounds, preset);
    target.set(...placement.target);
    camera.position.set(...placement.position);
    camera.up.set(0, 1, 0);
    camera.near = placement.near;
    camera.far = placement.far;
    camera.updateProjectionMatrix();
    controls.target.set(...placement.target);
    controls.update();
    render();
  };

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };

  const zoomBy = (factor: number) => {
    const offset = camera.position.clone().sub(target);
    const currentDistance = Math.max(offset.length(), 0.001);
    const nextDistance = THREE.MathUtils.clamp(
      currentDistance * factor,
      Math.max(model.bounds.span * 0.05, 0.05),
      Math.max(model.bounds.span * 100, 100),
    );
    offset.setLength(nextDistance);
    camera.position.copy(target).add(offset);
    controls.update();
    render();
  };

  controls.addEventListener('change', render);
  setView('isometric');
  resize();

  let disposed = false;
  return {
    resize,
    setView,
    zoomBy,
    reset: () => setView('isometric'),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      controls.removeEventListener('change', render);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
