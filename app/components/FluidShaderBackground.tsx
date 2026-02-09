"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

const VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uMouse;        // normalized 0..1
  uniform vec2 uResolution;   // px

  varying vec2 vUv;

  float hash(vec2 p) {
    // Cheap-ish 2D hash: stable and good enough for smooth value noise.
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, -1.2, 1.2, 1.6);

    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.52;
    }
    return v;
  }

  void main() {
    // Aspect-correct coordinates centered around 0.
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime * 0.08; // slow

    // Mouse: normalized, centered, gentle influence radius.
    vec2 m = (uMouse - 0.5);
    m.x *= uResolution.x / max(uResolution.y, 1.0);

    // Domain-warped noise for fluid-ish motion.
    float n1 = fbm(p * 2.2 + vec2(t, -t));
    float n2 = fbm(p * 2.0 + vec2(-t, t) + n1);
    vec2 warp = vec2(n1, n2);

    float d = length(p - m * 0.65);
    float influence = exp(-d * 3.2);
    warp += influence * 0.55 * vec2(sin(t * 2.0), cos(t * 1.7));

    float n = fbm(p * 3.0 + warp * 1.35 + t);

    // Pastel palette (from your swatch):
    vec3 cBlue    = vec3(204.0, 241.0, 255.0) / 255.0; // #CCF1FF
    vec3 cLav     = vec3(224.0, 215.0, 255.0) / 255.0; // #E0D7FF
    vec3 cPink    = vec3(255.0, 204.0, 225.0) / 255.0; // #FFCCE1
    vec3 cIce     = vec3(215.0, 238.0, 255.0) / 255.0; // #D7EEFF
    vec3 cButter  = vec3(250.0, 255.0, 199.0) / 255.0; // #FAFFC7

    float a = smoothstep(0.10, 0.95, n);
    float b = smoothstep(0.25, 0.90, n2);
    float c = smoothstep(0.35, 0.92, n1);

    vec3 col = mix(cIce, cLav, a);
    col = mix(col, cPink, b * 0.75);
    col = mix(col, cBlue, (1.0 - a) * 0.4);
    col = mix(col, cButter, c * 0.35);

    // Subtle vignette to keep center readable.
    float vign = smoothstep(1.15, 0.25, length(p));
    col = mix(col, vec3(1.0), (1.0 - vign) * 0.10);

    // Keep it soft/pastel: slight desaturation towards white.
    col = mix(col, vec3(1.0), 0.18);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FluidPlane() {
  const { viewport, size } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      transparent: false,
      depthTest: false,
      depthWrite: false,
    });
  }, []);

  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    materialRef.current?.uniforms.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height]);

  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseTarget.current.set(
        e.clientX / Math.max(window.innerWidth, 1),
        1.0 - e.clientY / Math.max(window.innerHeight, 1),
      );
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;

    mat.uniforms.uTime.value = clock.getElapsedTime();
    mouse.current.lerp(mouseTarget.current, 0.075);
    mat.uniforms.uMouse.value.copy(mouse.current);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default function FluidShaderBackground() {
  return (
    <div className="fh-fluid-bg" aria-hidden="true">
      <Canvas
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 1], fov: 50 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <FluidPlane />
      </Canvas>
    </div>
  );
}
