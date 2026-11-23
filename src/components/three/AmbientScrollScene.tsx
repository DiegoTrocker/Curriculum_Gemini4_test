import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  createAfterDrawScheduler,
  detectSoftwareGl,
} from './threeUtils.ts';

interface AmbientScrollSceneProps {
  isDark: boolean;
}

const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _mat4 = new THREE.Matrix4();

export function AmbientScrollScene({ isDark }: AmbientScrollSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    isDark,
    targetScroll: 0,
    pointerX: 0,
    pointerY: 0,
  });

  useEffect(() => {
    stateRef.current.isDark = isDark;
  }, [isDark]);

  useEffect(() => {
    const updateScroll = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      stateRef.current.targetScroll = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
    };
    const updatePointer = (e: PointerEvent) => {
      stateRef.current.pointerX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      stateRef.current.pointerY = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', updatePointer);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const lightBgHex = 0xe8eff8;
    const darkBgHex = 0x0f172a;
    const initialBg = stateRef.current.isDark ? darkBgHex : lightBgHex;
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.FogExp2(initialBg, 0.036);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 13.5);

    // Warm/cool architectural studio lighting
    const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.85);
    keyLight.position.set(7, 9, 6);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 1.05);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.35);
    rimLight.position.set(-8, 4, -5);
    scene.add(rimLight);

    const alloyMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.25,
      clearcoat: 0.3,
    });
    const cobaltMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.45,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      metalness: 0.05,
      roughness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.38 : 1,
      ior: 1.55,
      thickness: 1.0,
      clearcoat: 1.0,
      depthWrite: !isSoftwareGl,
    });

    // 1. Background Sculptural Gyro & Prism Assembly (left-flank depth)
    const gyroCluster = new THREE.Group();
    gyroCluster.position.set(-5.6, 1.8, -3.5);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.06, 18, 72), alloyMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.045, 16, 60), cobaltMat);
    innerRing.rotation.x = Math.PI / 3;
    const centerOcta = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), glassMat);
    gyroCluster.add(outerRing, innerRing, centerOcta);
    scene.add(gyroCluster);

    // 2. Right-Flank Architectural Helix / Monolith Cluster
    const prismCluster = new THREE.Group();
    prismCluster.position.set(6.0, -1.6, -2.8);
    const ringTrack = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.05, 16, 64), cobaltMat);
    ringTrack.rotation.y = Math.PI / 4;
    const prismCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), alloyMat);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 32), glassMat);
    collar.rotation.z = Math.PI / 6;
    prismCluster.add(ringTrack, prismCore, collar);
    scene.add(prismCluster);

    // 3. Instanced Scroll-Reactive Architectural Node Field (96 Nodes)
    const nodeCount = 96;
    const nodeGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.55,
      roughness: 0.35,
    });
    const instancedField = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    instancedField.frustumCulled = false;

    const fieldSeeds = Array.from({ length: nodeCount }, (_, i) => {
      const col = i % 12;
      const row = Math.floor(i / 12);
      return {
        baseX: (col - 5.5) * 2.25 + ((row % 2) * 0.9 - 0.45),
        baseY: (row - 3.5) * 3.1,
        baseZ: -6.5 - ((i * 17) % 11) * 0.85,
        phase: i * 0.42,
        scale: 0.72 + ((i * 7) % 5) * 0.16,
      };
    });

    const cLight = new THREE.Color(0x94a3b8);
    const cCobalt = new THREE.Color(0x3b82f6);
    for (let i = 0; i < nodeCount; i++) {
      instancedField.setColorAt(i, cLight.clone().lerp(cCobalt, (i % 5) / 4));
    }
    if (instancedField.instanceColor) instancedField.instanceColor.needsUpdate = true;
    instancedField.computeBoundingSphere();
    scene.add(instancedField);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const clock = new THREE.Clock();
    const scheduler = createAfterDrawScheduler(renderer);
    let animId = 0;
    let smoothScroll = stateRef.current.targetScroll;
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let lastDark = stateRef.current.isDark;

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = prefersReduced ? 0 : clock.getElapsedTime();

      if (stateRef.current.isDark !== lastDark) {
        lastDark = stateRef.current.isDark;
        const targetHex = lastDark ? darkBgHex : lightBgHex;
        (scene.background as THREE.Color).setHex(targetHex);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(targetHex);
        }
      }

      smoothScroll = THREE.MathUtils.damp(smoothScroll, stateRef.current.targetScroll, 5.5, delta);
      smoothPtrX = THREE.MathUtils.damp(smoothPtrX, stateRef.current.pointerX, 4.5, delta);
      smoothPtrY = THREE.MathUtils.damp(smoothPtrY, stateRef.current.pointerY, 4.5, delta);

      // Scroll-driven camera glide & gentle pointer parallax
      camera.position.x = smoothPtrX * 0.65 + Math.sin(smoothScroll * Math.PI * 1.4) * 1.25;
      camera.position.y = 1.4 - smoothScroll * 5.2 + smoothPtrY * 0.45;
      camera.lookAt(0, -smoothScroll * 4.4, -2.5);

      // Scroll + time choreography on sculptural assemblies
      gyroCluster.position.y = 1.8 - smoothScroll * 4.8 + Math.sin(elapsed * 0.5) * 0.25;
      gyroCluster.rotation.y = elapsed * 0.18 + smoothScroll * Math.PI * 1.8;
      gyroCluster.rotation.x = smoothScroll * 1.2 + smoothPtrY * 0.2;
      innerRing.rotation.z = elapsed * 0.35;
      centerOcta.rotation.y = -elapsed * 0.45;

      prismCluster.position.y = -1.6 - smoothScroll * 3.8 + Math.cos(elapsed * 0.45) * 0.28;
      prismCluster.rotation.y = -elapsed * 0.22 - smoothScroll * Math.PI * 1.5;
      prismCluster.rotation.z = smoothScroll * 0.9;
      prismCore.rotation.x = elapsed * 0.3;

      // Update instanced field nodes with wave drift + scroll elevation
      for (let i = 0; i < nodeCount; i++) {
        const s = fieldSeeds[i];
        const wave = Math.sin(elapsed * 0.75 + s.phase + smoothScroll * 4.0) * 0.45;
        _vec3.set(
          s.baseX + Math.cos(elapsed * 0.35 + s.phase) * 0.18,
          s.baseY - smoothScroll * 4.2 + wave,
          s.baseZ + Math.sin(smoothScroll * Math.PI + s.phase) * 0.6
        );
        _euler.set(elapsed * 0.25 + s.phase, elapsed * 0.3 + smoothScroll * 2.2, 0);
        _quat.setFromEuler(_euler);
        _scale.setScalar(s.scale);
        _mat4.compose(_vec3, _quat, _scale);
        instancedField.setMatrixAt(i, _mat4);
      }
      instancedField.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduler.scheduleNext(tick);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      scheduler.cancel();
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
