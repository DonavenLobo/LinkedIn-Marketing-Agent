"use client";

import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const NODE_COUNT = 1000;
const ACCENT_COLOR = new THREE.Color(0x0a66c2);
const ACCENT_GLOW = new THREE.Color(0x3b9eff);
const BASE_COLOR = new THREE.Color(0xd0d5dd);

interface SignalNodesProps {
  generating: boolean;
  mousePos: React.MutableRefObject<{ x: number; y: number }>;
}

function SignalNodes({ generating, mousePos }: SignalNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl } = useThree();

  const positions = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + (Math.random() - 0.5) * 0.8;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  const phases = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT);
    for (let i = 0; i < NODE_COUNT; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArr = useMemo(() => new Float32Array(NODE_COUNT * 3), []);
  const pulseStartRef = useRef(-1);
  const prevGenerating = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        gl.setAnimationLoop(null);
      } else {
        gl.setAnimationLoop(gl.render.bind(gl, gl.domElement as unknown as THREE.Scene, {} as THREE.Camera));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gl]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    if (generating && !prevGenerating.current) {
      pulseStartRef.current = t;
    }
    prevGenerating.current = generating;

    const pulseProgress =
      pulseStartRef.current > 0
        ? Math.min((t - pulseStartRef.current) / 1.5, 1)
        : 0;

    const tiltX = mousePos.current.y * 0.08;
    const tiltY = mousePos.current.x * 0.08;

    for (let i = 0; i < NODE_COUNT; i++) {
      const ix = i * 3;
      const px = positions[ix];
      const py = positions[ix + 1];
      const pz = positions[ix + 2];
      const phase = phases[i];

      const breathe = 1 + Math.sin(t * 0.6 + phase) * 0.04;
      const dist = Math.sqrt(px * px + py * py + pz * pz);
      const normDist = dist / 2.2;

      const pulseWave =
        pulseProgress > 0
          ? Math.max(0, 1 - Math.abs(normDist - pulseProgress) * 4) *
            (1 - pulseProgress * 0.5)
          : 0;

      const scale = (0.012 + pulseWave * 0.025) * breathe;

      dummy.position.set(
        px * breathe + tiltX * 0.3,
        py * breathe + tiltY * 0.3,
        pz * breathe
      );
      dummy.scale.setScalar(scale);
      dummy.rotation.set(t * 0.1 + tiltX, t * 0.15 + tiltY, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const accentMix = pulseWave * 0.9 + Math.sin(t * 0.4 + phase) * 0.1;
      const color = new THREE.Color().lerpColors(
        BASE_COLOR,
        accentMix > 0.3 ? ACCENT_COLOR : BASE_COLOR,
        accentMix
      );

      if (pulseWave > 0.5) {
        color.lerp(ACCENT_GLOW, (pulseWave - 0.5) * 2);
      }

      colorArr[ix] = color.r;
      colorArr[ix + 1] = color.g;
      colorArr[ix + 2] = color.b;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    const colorAttr = meshRef.current.geometry.getAttribute("color");
    if (colorAttr) {
      (colorAttr as THREE.BufferAttribute).set(colorArr);
      colorAttr.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, NODE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArr, 3]}
        />
      </sphereGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}

function CameraRig({ mousePos }: { mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
  useFrame(({ camera }) => {
    camera.position.x += (mousePos.current.x * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (mousePos.current.y * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

interface SignalCoreProps {
  generating: boolean;
}

export function SignalCore({ generating }: SignalCoreProps) {
  const mousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePos.current = {
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * -2,
    };
  }, []);

  if (reducedMotion) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 320 320"
          fill="none"
          className="opacity-30"
        >
          <circle cx="160" cy="160" r="120" stroke="var(--accent)" strokeWidth="0.5" opacity="0.4" />
          <circle cx="160" cy="160" r="80" stroke="var(--accent)" strokeWidth="0.5" opacity="0.6" />
          <circle cx="160" cy="160" r="40" stroke="var(--accent)" strokeWidth="1" opacity="0.8" />
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const r = 40 + Math.random() * 80;
            const cx = 160 + Math.cos(angle) * r;
            const cy = 160 + Math.sin(angle) * r;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={1.5 + Math.random() * 1.5}
                fill="var(--accent)"
                opacity={0.3 + Math.random() * 0.4}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        frameloop="always"
      >
        <SignalNodes generating={generating} mousePos={mousePos} />
        <CameraRig mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
