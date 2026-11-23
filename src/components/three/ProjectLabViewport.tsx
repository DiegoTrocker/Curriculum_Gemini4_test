import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Play, RotateCcw } from 'lucide-react';
import {
  applyStudioEnvironment,
  createAfterDrawScheduler,
  createPrecisionGridTexture,
  detectSoftwareGl,
} from './threeUtils.ts';

export type LabModuleId = 'wave-terrain' | 'orbital-swarm' | 'vector-dodge';

interface ProjectLabViewportProps {
  activeLab: LabModuleId;
  onSelectLab: (lab: LabModuleId) => void;
  isDark: boolean;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

export function ProjectLabViewport({ activeLab, onSelectLab, isDark }: ProjectLabViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Wave Terrain controls
  const [waveAmp, setWaveAmp] = useState(0.55);
  const [waveFreq, setWaveFreq] = useState(1.1);

  // Orbital Swarm controls
  const [swarmSpeed, setSwarmSpeed] = useState(1.0);
  const [swarmSpread, setSwarmSpread] = useState(2.2);

  // Vector Dodge Mini-Game state
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const paramsRef = useRef({
    activeLab,
    isDark,
    waveAmp,
    waveFreq,
    swarmSpeed,
    swarmSpread,
    gameState,
    steerInput: 0,
  });

  useEffect(() => {
    paramsRef.current.activeLab = activeLab;
  }, [activeLab]);
  useEffect(() => {
    paramsRef.current.isDark = isDark;
  }, [isDark]);
  useEffect(() => {
    paramsRef.current.waveAmp = waveAmp;
  }, [waveAmp]);
  useEffect(() => {
    paramsRef.current.waveFreq = waveFreq;
  }, [waveFreq]);
  useEffect(() => {
    paramsRef.current.swarmSpeed = swarmSpeed;
  }, [swarmSpeed]);
  useEffect(() => {
    paramsRef.current.swarmSpread = swarmSpread;
  }, [swarmSpread]);
  useEffect(() => {
    paramsRef.current.gameState = gameState;
  }, [gameState]);

  const resetGameRef = useRef<(() => void) | null>(null);

  const startOrRestartGame = () => {
    resetGameRef.current?.();
    setScore(0);
    setGameState('playing');
  };

  useEffect(() => {
    const keys = new Set<string>();
    const updateSteer = () => {
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      paramsRef.current.steerInput = (right ? 1 : 0) - (left ? 1 : 0);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (paramsRef.current.activeLab !== 'vector-dodge') return;
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
        keys.add(e.code);
        updateSteer();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      updateSteer();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = paramsRef.current.isDark ? 0x131c31 : 0xe8eff8;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.036);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.set(0, 4.2, 7.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(6, 9, 5);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.95);
    scene.add(hemiLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const gridTex = createPrecisionGridTexture(paramsRef.current.isDark, maxAniso);

    // --- MODULE 1: Procedural GLSL Wave Terrain (onBeforeCompile PBR) ---
    const waveGroup = new THREE.Group();
    const waveUniforms = {
      uTime: { value: 0 },
      uAmp: { value: paramsRef.current.waveAmp },
      uFreq: { value: paramsRef.current.waveFreq },
    };
    const terrainGeo = new THREE.PlaneGeometry(11, 11, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waveUniforms.uTime;
      shader.uniforms.uAmp = waveUniforms.uAmp;
      shader.uniforms.uFreq = waveUniforms.uFreq;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uAmp;
           uniform float uFreq;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float h = sin(transformed.x * uFreq + uTime * 1.6) * cos(transformed.z * uFreq + uTime * 1.2) * uAmp;
           transformed.y += h;`
        );
    };
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    waveGroup.add(terrainMesh);
    scene.add(waveGroup);

    // --- MODULE 2: Orbital Kinematics Instanced Swarm ---
    const swarmGroup = new THREE.Group();
    const attractorGroup = new THREE.Group();
    const attractorMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      metalness: 0.75,
      roughness: 0.2,
      clearcoat: 0.8,
    });
    const coreRingA = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 16, 48), attractorMat);
    const coreRingB = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 16, 48), attractorMat);
    coreRingB.rotation.x = Math.PI / 2;
    const coreSphere = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.9, roughness: 0.18 })
    );
    attractorGroup.add(coreRingA, coreRingB, coreSphere);
    swarmGroup.add(attractorGroup);

    const swarmCount = 180;
    const swarmGeo = new THREE.BoxGeometry(0.11, 0.11, 0.22);
    const swarmMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.6,
    });
    const swarmMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, swarmCount);
    swarmMesh.frustumCulled = false;

    const swarmOrbits = Array.from({ length: swarmCount }, (_, i) => {
      const seed = (i * 1.6180339) % 1;
      return {
        phase: (i / swarmCount) * Math.PI * 2,
        inclination: (seed - 0.5) * 1.4,
        radiusFactor: 0.55 + ((i * 7) % 19) / 19,
        speedFactor: 0.7 + ((i * 11) % 13) / 16,
      };
    });
    const colorA = new THREE.Color(0x2563eb);
    const colorB = new THREE.Color(0xa1a1aa);
    for (let i = 0; i < swarmCount; i++) {
      swarmMesh.setColorAt(i, colorA.clone().lerp(colorB, (i % 7) / 7));
    }
    if (swarmMesh.instanceColor) swarmMesh.instanceColor.needsUpdate = true;
    swarmMesh.computeBoundingSphere();
    swarmGroup.add(swarmMesh);
    scene.add(swarmGroup);

    // --- MODULE 3: Playable 3D Mini-Game ("Vector Dodge") ---
    const gameGroup = new THREE.Group();
    const laneFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 46),
      new THREE.MeshStandardMaterial({
        map: gridTex,
        roughness: 0.7,
        metalness: 0.1,
      })
    );
    laneFloor.rotation.x = -Math.PI / 2;
    laneFloor.position.set(0, 0, -14);
    gameGroup.add(laneFloor);

    // Procedural Composite Glider (5-part THREE.Group)
    const glider = new THREE.Group();
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0xe4e4e7,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 0.6,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.5,
      roughness: 0.35,
    });
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.05, 6), hullMat);
    fuselage.rotation.x = -Math.PI / 2;
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.35), wingMat);
    leftWing.position.set(-0.38, -0.02, 0.16);
    leftWing.rotation.y = 0.25;
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.35), wingMat);
    rightWing.position.set(0.38, -0.02, 0.16);
    rightWing.rotation.y = -0.25;
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.15 })
    );
    canopy.position.set(0, 0.11, -0.05);
    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.8 })
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0, 0.55);
    glider.add(fuselage, leftWing, rightWing, canopy, thruster);
    glider.position.set(0, 0.35, 3.2);
    gameGroup.add(glider);

    const obstacleGeo = new THREE.BoxGeometry(0.85, 1.35, 0.85);
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.55,
    });
    const obstacles: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    for (let i = 0; i < 14; i++) {
      const obs = new THREE.Mesh(obstacleGeo, obstacleMat);
      obs.position.set(((i * 37) % 9) - 4, 0.68, -6 - i * 3.1);
      obstacles.push({ mesh: obs, speed: 9.5 });
      gameGroup.add(obs);
    }

    let gameElapsed = 0;
    let gliderX = 0;
    let lastReportedScore = 0;

    resetGameRef.current = () => {
      gliderX = 0;
      glider.position.x = 0;
      glider.rotation.z = 0;
      gameElapsed = 0;
      lastReportedScore = 0;
      obstacles.forEach((o, i) => {
        o.mesh.position.set((Math.sin(i * 2.17) * 3.6), 0.68, -8 - i * 3.2);
      });
    };

    scene.add(gameGroup);

    const clock = new THREE.Clock();
    const scheduler = createAfterDrawScheduler(renderer);
    let animId = 0;
    let prevLab: LabModuleId | null = null;
    let prevDark = paramsRef.current.isDark;

    const configureCameraForLab = (lab: LabModuleId) => {
      if (lab === 'vector-dodge') {
        camera.position.set(0, 2.8, 7.6);
        controls.target.set(0, 0.4, -2.5);
        controls.enabled = false;
      } else if (lab === 'orbital-swarm') {
        camera.position.set(0, 2.6, 6.2);
        controls.target.set(0, 0, 0);
        controls.enabled = true;
      } else {
        camera.position.set(0, 4.4, 7.2);
        controls.target.set(0, 0, 0);
        controls.enabled = true;
      }
      controls.update();
    };

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const { activeLab: lab, isDark: dark } = paramsRef.current;

      if (dark !== prevDark) {
        prevDark = dark;
        const bg = dark ? 0x131c31 : 0xe8eff8;
        (scene.background as THREE.Color).setHex(bg);
        if (scene.fog instanceof THREE.FogExp2) scene.fog.color.setHex(bg);
      }

      if (lab !== prevLab) {
        prevLab = lab;
        waveGroup.visible = lab === 'wave-terrain';
        swarmGroup.visible = lab === 'orbital-swarm';
        gameGroup.visible = lab === 'vector-dodge';
        configureCameraForLab(lab);
      }

      if (lab === 'wave-terrain') {
        waveUniforms.uTime.value = elapsed;
        waveUniforms.uAmp.value = paramsRef.current.waveAmp;
        waveUniforms.uFreq.value = paramsRef.current.waveFreq;
        terrainMesh.rotation.y = elapsed * 0.06;
      } else if (lab === 'orbital-swarm') {
        const speed = paramsRef.current.swarmSpeed;
        const spread = paramsRef.current.swarmSpread;
        attractorGroup.rotation.y += delta * 0.7 * speed;
        attractorGroup.rotation.x += delta * 0.35 * speed;

        for (let i = 0; i < swarmCount; i++) {
          const orb = swarmOrbits[i];
          const t = elapsed * speed * orb.speedFactor + orb.phase;
          const r = spread * orb.radiusFactor;
          _vec3.set(
            Math.cos(t) * r,
            Math.sin(t * 1.3) * r * 0.45 * Math.sin(orb.inclination + elapsed * 0.2),
            Math.sin(t) * r
          );
          _euler.set(t * 0.5, -t, 0);
          _quat.setFromEuler(_euler);
          _scale.setScalar(1);
          _mat4.compose(_vec3, _quat, _scale);
          swarmMesh.setMatrixAt(i, _mat4);
        }
        swarmMesh.instanceMatrix.needsUpdate = true;
      } else if (lab === 'vector-dodge') {
        if (paramsRef.current.gameState === 'playing') {
          gameElapsed += delta;
          const speedBoost = 9.5 + Math.min(gameElapsed * 0.35, 11);
          gliderX = THREE.MathUtils.clamp(
            gliderX + paramsRef.current.steerInput * delta * 6.5,
            -4.1,
            4.1
          );
          glider.position.x = THREE.MathUtils.damp(glider.position.x, gliderX, 12, delta);
          glider.rotation.z = THREE.MathUtils.damp(
            glider.rotation.z,
            -paramsRef.current.steerInput * 0.35,
            10,
            delta
          );
          gridTex.offset.y -= delta * (speedBoost * 0.14);

          const nextScore = Math.floor(gameElapsed * 15);
          if (nextScore !== lastReportedScore) {
            lastReportedScore = nextScore;
            setScore(nextScore);
            setBestScore((prev) => Math.max(prev, nextScore));
          }

          for (const obs of obstacles) {
            obs.mesh.position.z += delta * speedBoost;
            if (obs.mesh.position.z > 5.5) {
              obs.mesh.position.z = -38 - Math.random() * 6;
              obs.mesh.position.x = (Math.random() - 0.5) * 8.2;
            }
            const dx = Math.abs(obs.mesh.position.x - glider.position.x);
            const dz = Math.abs(obs.mesh.position.z - glider.position.z);
            if (dx < 0.68 && dz < 0.72) {
              setGameState('over');
              break;
            }
          }
        } else {
          glider.position.y = 0.35 + Math.sin(elapsed * 2.5) * 0.05;
        }
      }

      if (controls.enabled) controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduler.scheduleNext(tick);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      scheduler.cancel();
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      envTex.dispose();
      gridTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {(
            [
              { id: 'wave-terrain', label: '01. GLSL Wave Terrain' },
              { id: 'orbital-swarm', label: '02. Orbital Swarm' },
              { id: 'vector-dodge', label: '03. Vector Dodge Game' },
            ] as Array<{ id: LabModuleId; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectLab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeLab === tab.id
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          {activeLab === 'wave-terrain' && 'MeshStandardMaterial.onBeforeCompile · PBR Vertex Shader'}
          {activeLab === 'orbital-swarm' && 'THREE.InstancedMesh · 180 Nodes · Zero-GC Loop'}
          {activeLab === 'vector-dodge' && `Score ${score} · Best ${bestScore}`}
        </div>
      </div>

      <div className="relative h-[430px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <div ref={mountRef} className="h-full w-full" aria-label="Interactive Three.js Project Lab" />

        {activeLab === 'vector-dodge' && gameState !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 p-6 text-center text-white">
            <p className="text-xs font-mono uppercase tracking-wider text-blue-300">
              {gameState === 'over' ? 'Collision Detected' : 'Interactive 3D Mini-Game'}
            </p>
            <h4 className="mt-1 font-display text-2xl font-semibold">
              {gameState === 'over' ? `Final Score: ${score}` : 'Vector Dodge 3D'}
            </h4>
            <p className="mt-2 max-w-sm text-xs text-zinc-300">
              Steer with A / D, Left / Right arrows, or the dock steer buttons to dodge incoming monoliths.
            </p>
            <button
              type="button"
              onClick={startOrRestartGame}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              {gameState === 'over' ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{gameState === 'over' ? 'Play Again' : 'Start Run'}</span>
            </button>
          </div>
        )}

        {/* Collapsible Bottom Control Dock */}
        <div className="pointer-events-none absolute right-4 bottom-4 left-4 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white/95 px-3 py-1 text-xs font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200 whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{dockCollapsed ? 'Show Lab Controls' : 'Hide Lab Controls'}</span>
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto flex w-full max-w-[640px] flex-wrap items-center justify-center gap-5 rounded-lg border border-zinc-200 bg-white/95 px-5 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
              {activeLab === 'wave-terrain' && (
                <>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span>Amplitude</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1.3}
                      step={0.05}
                      value={waveAmp}
                      onChange={(e) => setWaveAmp(Number(e.target.value))}
                      className="w-28 accent-blue-600"
                    />
                    <span className="font-mono tabular-nums text-zinc-500">{waveAmp.toFixed(2)}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span>Frequency</span>
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.1}
                      value={waveFreq}
                      onChange={(e) => setWaveFreq(Number(e.target.value))}
                      className="w-28 accent-blue-600"
                    />
                    <span className="font-mono tabular-nums text-zinc-500">{waveFreq.toFixed(1)}</span>
                  </label>
                </>
              )}

              {activeLab === 'orbital-swarm' && (
                <>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span>Velocity</span>
                    <input
                      type="range"
                      min={0.2}
                      max={2.5}
                      step={0.1}
                      value={swarmSpeed}
                      onChange={(e) => setSwarmSpeed(Number(e.target.value))}
                      className="w-28 accent-blue-600"
                    />
                    <span className="font-mono tabular-nums text-zinc-500">{swarmSpeed.toFixed(1)}x</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span>Orbit Radius</span>
                    <input
                      type="range"
                      min={1.2}
                      max={3.5}
                      step={0.1}
                      value={swarmSpread}
                      onChange={(e) => setSwarmSpread(Number(e.target.value))}
                      className="w-28 accent-blue-600"
                    />
                    <span className="font-mono tabular-nums text-zinc-500">{swarmSpread.toFixed(1)}</span>
                  </label>
                </>
              )}

              {activeLab === 'vector-dodge' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onPointerDown={() => (paramsRef.current.steerInput = -1)}
                    onPointerUp={() => (paramsRef.current.steerInput = 0)}
                    onPointerLeave={() => (paramsRef.current.steerInput = 0)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 active:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-200 dark:active:bg-zinc-800"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Steer Left</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => (paramsRef.current.steerInput = 1)}
                    onPointerUp={() => (paramsRef.current.steerInput = 0)}
                    onPointerLeave={() => (paramsRef.current.steerInput = 0)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 active:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-200 dark:active:bg-zinc-800"
                  >
                    <span>Steer Right</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={startOrRestartGame}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
