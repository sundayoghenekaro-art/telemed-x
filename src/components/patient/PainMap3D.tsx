import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type PainSeverity = 'mild' | 'moderate' | 'severe';

export interface PainMap3DPoint {
  id: string;
  label: string;
  severity: PainSeverity;
  position3d: [number, number, number];
}

export interface PainMap3DPick {
  label: string;
  position: [number, number, number];
}

interface PainMap3DProps {
  gender: 'male' | 'female';
  points: PainMap3DPoint[];
  selectedId?: string | null;
  autoRotate?: boolean;
  onPick: (pick: PainMap3DPick) => void;
  onSelect: (id: string) => void;
  onUnavailable?: () => void;
  className?: string;
}

const SEVERITY_HEX: Record<PainSeverity, number> = {
  mild: 0xfacc15,
  moderate: 0xfb923c,
  severe: 0xf87171,
};

interface PartSpec {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  region?: string;
  front?: string;
  back?: string;
  right?: string;
  left?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildPartSpecs(gender: 'male' | 'female'): PartSpec[] {
  const female = gender === 'female';
  const shoulder = female ? 0.3 : 0.325;
  const chestX = female ? 1.08 : 1.2;
  const chestZ = female ? 0.86 : 0.9;
  const waistX = female ? 1 : 1.06;
  const waistZ = female ? 0.8 : 0.84;
  const hipX = female ? 1.24 : 1.14;
  const hipZ = female ? 0.88 : 0.82;

  const specs: PartSpec[] = [
    {
      geometry: new THREE.SphereGeometry(0.185, 28, 20),
      position: [0, 2.71, 0],
      scale: [0.98, 1.12, 1],
      region: 'Head',
    },
    {
      geometry: new THREE.CylinderGeometry(0.075, 0.092, 0.18, 18),
      position: [0, 2.47, 0],
      region: 'Neck',
    },
    {
      geometry: new THREE.CapsuleGeometry(0.25, 0.4, 10, 22),
      position: [0, 2.08, 0],
      scale: [chestX, 1, chestZ],
      front: 'Chest',
      back: 'Upper Back',
    },
    {
      geometry: new THREE.CapsuleGeometry(0.21, 0.28, 10, 22),
      position: [0, 1.62, 0],
      scale: [waistX, 1, waistZ],
      front: 'Abdomen',
      back: 'Lower Back',
    },
    {
      geometry: new THREE.SphereGeometry(0.25, 26, 18),
      position: [0, 1.31, 0],
      scale: [hipX, 0.8, hipZ],
      right: 'Right Hip',
      left: 'Left Hip',
    },
  ];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Right' : 'Left';
    const armX = sign * (shoulder + 0.03);
    specs.push(
      {
        geometry: new THREE.SphereGeometry(0.118, 18, 12),
        position: [sign * shoulder, 2.32, 0],
        scale: [1, 0.94, 0.96],
        region: `${side} Shoulder`,
      },
      {
        geometry: new THREE.CapsuleGeometry(0.083, 0.32, 8, 16),
        position: [armX, 2.05, -0.02],
        rotation: [0, 0, sign * 0.1],
        region: `${side} Arm`,
      },
      {
        geometry: new THREE.CapsuleGeometry(0.072, 0.3, 8, 16),
        position: [sign * (shoulder + 0.105), 1.64, -0.01],
        rotation: [0, 0, sign * 0.05],
        region: `${side} Arm`,
      },
      {
        geometry: new THREE.SphereGeometry(0.078, 16, 12),
        position: [sign * (shoulder + 0.16), 1.37, 0],
        scale: [0.78, 1.25, 0.52],
        region: `${side} Hand`,
      },
      {
        geometry: new THREE.CapsuleGeometry(0.137, 0.4, 8, 18),
        position: [sign * 0.155, 0.99, 0],
        rotation: [0, 0, sign * -0.015],
        region: `${side} Leg`,
      },
      {
        geometry: new THREE.SphereGeometry(0.118, 18, 14),
        position: [sign * 0.155, 0.69, 0],
        scale: [1, 0.92, 0.96],
        region: `${side} Knee`,
      },
      {
        geometry: new THREE.CapsuleGeometry(0.098, 0.36, 8, 16),
        position: [sign * 0.158, 0.38, 0],
        region: `${side} Leg`,
      },
      {
        geometry: new THREE.CapsuleGeometry(0.072, 0.15, 8, 14),
        position: [sign * 0.16, 0.06, 0.065],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.85],
        region: `${side} Foot`,
      },
    );
  }

  return specs;
}

function regionForHit(mesh: THREE.Mesh, worldPoint: THREE.Vector3): string {
  const data = mesh.userData as { region?: string; front?: string; back?: string; right?: string; left?: string };
  const local = mesh.worldToLocal(worldPoint.clone());
  if (data.front && data.back) return local.z >= 0 ? data.front : data.back;
  if (data.right && data.left) return local.x <= 0 ? data.right : data.left;
  return data.region ?? 'Body';
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
}

export default function PainMap3D({
  gender,
  points,
  selectedId,
  autoRotate = true,
  onPick,
  onSelect,
  onUnavailable,
  className,
}: PainMap3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick);
  const selectRef = useRef(onSelect);
  const unavailableRef = useRef(onUnavailable);
  const apiRef = useRef<{
    setPoints: (next: PainMap3DPoint[], selected: string | null | undefined) => void;
    snap: (angle: number) => void;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<'front' | 'side' | 'back' | null>('front');
  const viewRef = useRef<'front' | 'side' | 'back' | null>('front');
  const autoRotateRef = useRef(autoRotate);

  pickRef.current = onPick;
  selectRef.current = onSelect;
  unavailableRef.current = onUnavailable;
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setFailed(true);
      unavailableRef.current?.();
      return;
    }
    if (!renderer.getContext()) {
      setFailed(true);
      unavailableRef.current?.();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 1.62, 4.55);
    camera.lookAt(0, 1.5, 0);

    scene.add(new THREE.HemisphereLight(0xcffafe, 0x04121f, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(2.4, 4.2, 3.4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x22d3ee, 2.2);
    rimLight.position.set(-3.2, 2.4, -2.6);
    scene.add(rimLight);
    const glowLight = new THREE.PointLight(0x5eead4, 6, 7, 2);
    glowLight.position.set(0, 1.4, 2.6);
    scene.add(glowLight);

    const body = new THREE.Group();
    body.position.y = -0.05;
    scene.add(body);

    const textured = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0f766e,
      emissiveIntensity: 0.35,
      metalness: 0.18,
      roughness: 0.28,
      transmission: 0.18,
      thickness: 0.4,
      clearcoat: 0.9,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    const wire = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });

    const bodyMeshes: THREE.Mesh[] = [];
    for (const spec of buildPartSpecs(gender)) {
      const mesh = new THREE.Mesh(spec.geometry, textured);
      mesh.position.set(...spec.position);
      if (spec.rotation) mesh.rotation.set(...spec.rotation);
      if (spec.scale) mesh.scale.set(...spec.scale);
      mesh.userData = {
        region: spec.region,
        front: spec.front,
        back: spec.back,
        right: spec.right,
        left: spec.left,
      };
      body.add(mesh);
      bodyMeshes.push(mesh);

      const shell = new THREE.Mesh(spec.geometry, wire);
      shell.position.copy(mesh.position);
      shell.rotation.copy(mesh.rotation);
      shell.scale.copy(mesh.scale).multiplyScalar(1.008);
      shell.raycast = () => {};
      body.add(shell);
    }

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.92, 64),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    body.add(floor);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 0.94, 64),
      new THREE.MeshBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.055;
    body.add(halo);

    const scan = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.005, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending }),
    );
    scan.rotation.x = Math.PI / 2;
    body.add(scan);

    const particleCount = 90;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 2.6;
      particlePositions[i * 3 + 1] = Math.random() * 3.2;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x67e8f9,
        size: 0.017,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(particles);

    const markerGroup = new THREE.Group();
    body.add(markerGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const cameraQuaternion = new THREE.Quaternion();
    const bodyQuaternion = new THREE.Quaternion();

    const setPoints = (next: PainMap3DPoint[], selected: string | null | undefined) => {
      for (const child of [...markerGroup.children]) {
        markerGroup.remove(child);
        disposeObject(child);
      }
      next.forEach((point, index) => {
        const group = new THREE.Group();
        group.position.set(...point.position3d);
        const color = SEVERITY_HEX[point.severity];

        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.042, 16, 12),
          new THREE.MeshBasicMaterial({ color }),
        );
        dot.userData.pointId = point.id;

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.062, 0.082, 28),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
        );
        ring.userData.pointId = point.id;
        ring.userData.isRing = true;
        ring.userData.phase = index * 0.9;
        ring.userData.baseScale = 1;

        if (selected === point.id) {
          ring.userData.baseScale = 1.45;
          (ring.material as THREE.MeshBasicMaterial).opacity = 1;
        }

        group.add(dot, ring);
        markerGroup.add(group);
      });
    };
    apiRef.current = { setPoints, snap: () => undefined };

    let rotY = 0;
    let rotX = 0;
    let targetY = 0;
    let targetX = 0;
    let lastInteraction = 0;
    let draggingNow = false;
    let activePointer: number | null = null;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let hoveredRegion = '';

    const clearView = () => {
      if (viewRef.current) {
        viewRef.current = null;
        setView(null);
      }
    };

    const now = () => performance.now() / 1000;

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      activePointer = event.pointerId;
      draggingNow = false;
      downX = event.clientX;
      downY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      lastInteraction = now();
      canvas.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointer === event.pointerId) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 6) {
          if (!draggingNow) {
            draggingNow = true;
            setDragging(true);
            clearView();
          }
        }
        if (draggingNow) {
          targetY += dx * 0.009;
          targetX = clamp(targetX + dy * 0.005, -0.32, 0.45);
        }
        lastX = event.clientX;
        lastY = event.clientY;
        lastInteraction = now();
        return;
      }

      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(bodyMeshes, false);
      const label = hits.length ? regionForHit(hits[0].object as THREE.Mesh, hits[0].point) : '';
      if (label !== hoveredRegion) {
        hoveredRegion = label;
        if (hoverRef.current) {
          hoverRef.current.textContent = label;
          hoverRef.current.style.opacity = label ? '1' : '0';
        }
        canvas.style.cursor = label ? 'crosshair' : 'grab';
      }
      if (label && hoverRef.current) {
        const rect = container.getBoundingClientRect();
        hoverRef.current.style.transform = `translate3d(${event.clientX - rect.left}px, ${event.clientY - rect.top - 14}px, 0) translate(-50%, -100%)`;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      canvas.releasePointerCapture?.(event.pointerId);
      if (draggingNow) {
        draggingNow = false;
        setDragging(false);
        lastInteraction = now();
        return;
      }

      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);

      const markerHits = raycaster.intersectObjects(markerGroup.children, true);
      if (markerHits.length) {
        const hit = markerHits[0].object;
        if (hit.userData.pointId) {
          selectRef.current(hit.userData.pointId as string);
          return;
        }
      }

      const hits = raycaster.intersectObjects(bodyMeshes, false);
      if (hits.length) {
        const hit = hits[0];
        const mesh = hit.object as THREE.Mesh;
        const local = body.worldToLocal(hit.point.clone());
        pickRef.current({
          label: regionForHit(mesh, hit.point),
          position: [local.x, local.y, local.z],
        });
      }
    };

    const onPointerCancel = () => {
      activePointer = null;
      draggingNow = false;
      setDragging(false);
    };

    const onPointerLeave = () => {
      if (hoverRef.current) hoverRef.current.style.opacity = '0';
      hoveredRegion = '';
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = now();
      rotY += (targetY - rotY) * 0.12;
      rotX += (targetX - rotX) * 0.12;
      body.rotation.y = rotY;
      body.rotation.x = rotX;

      if (autoRotateRef.current && !draggingNow && time - lastInteraction > 6) {
        targetY += 0.0032;
        lastInteraction = time - 5.9;
        clearView();
      }

      scan.position.y = 0.1 + ((time * 0.33) % 1) * 2.45;
      (scan.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(time * 2.2) * 0.08;
      particles.rotation.y = time * 0.04;

      body.getWorldQuaternion(bodyQuaternion);
      camera.getWorldQuaternion(cameraQuaternion);
      const billboard = bodyQuaternion.invert().multiply(cameraQuaternion);

      markerGroup.children.forEach((child) => {
        child.children.forEach((part) => {
          if (!part.userData.isRing) return;
          part.quaternion.copy(billboard);
          const pulse = 1 + Math.sin(time * 2.6 + (part.userData.phase as number)) * 0.09;
          part.scale.setScalar((part.userData.baseScale as number) * pulse);
        });
      });

      renderer.render(scene, camera);
    };
    animate();

    apiRef.current = {
      setPoints,
      snap: (angle: number) => {
        targetY = angle;
        targetX = 0;
        lastInteraction = now();
      },
    };

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      disposeObject(body);
      disposeObject(particles);
      textured.dispose();
      wire.dispose();
      renderer.dispose();
      apiRef.current = null;
    };
  }, [gender]);

  useEffect(() => {
    apiRef.current?.setPoints(points, selectedId);
  }, [points, selectedId, gender]);

  if (failed) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-2 p-6 text-center ${className ?? ''}`}>
        <p className="text-sm font-medium text-cyan-100">3D view isn’t available on this device</p>
        <p className="max-w-xs text-xs text-cyan-200/70">
          WebGL could not start. Switch to the 2D map to mark pain.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full ${className ?? ''}`}
      role="img"
      aria-label="Interactive 3D body map. Drag to rotate, tap a body part to mark pain. Switch to the 2D map for keyboard access."
    >
      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} style={{ touchAction: 'pan-y' }} className={dragging ? 'block h-full w-full cursor-grabbing' : 'block h-full w-full cursor-grab'} />
      </div>

      <div ref={hoverRef} className="pointer-events-none absolute left-0 top-0 z-10 rounded-full border border-cyan-300/30 bg-slate-950/85 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 opacity-0 transition-opacity duration-150" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className="rounded-full border border-cyan-300/30 bg-cyan-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur">
          3D body
        </span>
        <div className="pointer-events-auto flex gap-1 rounded-full border border-white/15 bg-slate-950/60 p-1 backdrop-blur">
          {([
            ['Front', 0],
            ['Side', -Math.PI / 2.4],
            ['Back', Math.PI],
          ] as const).map(([label, angle]) => {
            const id = label.toLowerCase() as 'front' | 'side' | 'back';
            const active = view === id;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  viewRef.current = id;
                  setView(id);
                  apiRef.current?.snap(angle);
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  active
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.45)]'
                    : 'text-cyan-100/80 hover:bg-cyan-400/20 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <p className="rounded-full border border-cyan-300/20 bg-slate-950/70 px-3 py-1 text-[10px] text-cyan-100/80 backdrop-blur">
          Drag to rotate · tap a region to mark pain
        </p>
      </div>
    </div>
  );
}
