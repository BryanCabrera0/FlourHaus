"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspectUv = uv;
    aspectUv.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime * 0.08;
    vec2 flow = vec2(
      fbm(aspectUv * 2.2 + vec2(0.0, t)),
      fbm(aspectUv * 2.2 + vec2(5.2, -t))
    );

    float d = distance(uv, uMouse);
    float ripple = exp(-9.0 * d) * sin(18.0 * d - uTime * 1.8);

    uv += (flow - 0.5) * 0.06;
    uv += normalize((uv - uMouse) + 0.0001) * ripple * 0.01;

    vec3 pink = vec3(0.980, 0.816, 0.769);   // #FAD0C4
    vec3 cream = vec3(1.000, 0.945, 0.922);  // #FFF1EB
    vec3 blue = vec3(0.631, 0.549, 0.820);   // #A18CD1

    float gradientA = smoothstep(0.0, 1.0, uv.y + flow.x * 0.24);
    float gradientB = smoothstep(0.1, 0.95, uv.x + flow.y * 0.18);

    vec3 col = mix(cream, pink, gradientA);
    col = mix(col, blue, gradientB * 0.55);

    float shine = smoothstep(0.72, 1.0, fbm(aspectUv * 3.0 + t * 2.0));
    col += shine * 0.06;

    float vignette = smoothstep(1.2, 0.2, distance(vUv, vec2(0.5)));
    col *= mix(0.92, 1.0, vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FluidPlane() {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseCurrent = useRef(new THREE.Vector2(0.5, 0.5));
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  );

  useEffect(() => {
    const updateMouse = (clientX: number, clientY: number) => {
      const x = clientX / window.innerWidth;
      const y = 1 - clientY / window.innerHeight;
      mouseTarget.current.set(x, y);
    };

    const onMouseMove = (event: MouseEvent) => updateMouse(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      if (!event.touches[0]) return;
      updateMouse(event.touches[0].clientX, event.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useFrame((_, delta) => {
    if (!materialRef.current) return;

    const shaderUniforms = materialRef.current.uniforms;
    shaderUniforms.uTime.value += delta;
    shaderUniforms.uResolution.value.set(size.width, size.height);

    const smoothing = 1.0 - Math.exp(-delta * 6.0);
    mouseCurrent.current.lerp(mouseTarget.current, smoothing);
    shaderUniforms.uMouse.value.copy(mouseCurrent.current);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function FluidBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 1] }}
      >
        <AdaptiveDpr pixelated />
        <FluidPlane />
      </Canvas>
    </div>
  );
}
