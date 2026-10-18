"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// --- CONFIGURATION OBJECT V3.0 ---
// This version focuses on a dynamic, interactive particle system.
const config = {
  // Particle system properties
  particles: {
    count: 50000, // Number of particles in the simulation
    size: 0.02, // Base size of each particle
    boxSize: 5, // The cubic volume where particles are generated
  },
  // Colors for the scene
  colors: {
    // Using HSL for easier color manipulation and vibrant results
    baseHue: 200, // Base hue for particles (200 is a cyan/blue)
    hueVariance: 20, // How much the hue can vary between particles
  },
  // Animation and simulation properties
  simulation: {
    // Curl noise parameters for organic, swirling motion
    noiseSpeed: 0.1,
    noiseScale: 1.2,
    // How strongly the particles are pushed away from the mouse
    mouseRepulsion: 0.005,
    // How quickly particles return to their original path
    friction: 0.95,
  },
  // Post-processing bloom effect for the glow
  bloom: {
    strength: 0.6, // Intensity of the glow
    radius: 0.4, // How far the glow spreads
    threshold: 0.1, // Brightness threshold to trigger the bloom
  },
  // Camera settings
  camera: {
    initialDistance: 5,
    parallaxIntensity: 0.005,
  },
};

// v3.0: Interactive Particle Nebula Scene
export default function GenerativeArtSceneV3() {
  const mountRef = useRef<HTMLDivElement>(null);
  // Refs for Three.js objects that need to be accessed across renders
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0)); // Using a Vector2 for mouse position

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- CORE THREE.JS & POST-PROCESSING SETUP ---

    // 1. Scene and Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = config.camera.initialDistance;
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    // 3. Post-Processing Composer for Bloom Effect
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight),
      config.bloom.strength,
      config.bloom.radius,
      config.bloom.threshold
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- PARTICLE SYSTEM CREATION ---
    const particleCount = config.particles.count;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3).fill(0); // For physics simulation
    const baseColor = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      // Position particles randomly within a box
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * config.particles.boxSize;
      positions[i3 + 1] = (Math.random() - 0.5) * config.particles.boxSize;
      positions[i3 + 2] = (Math.random() - 0.5) * config.particles.boxSize;

      // Assign a unique, vibrant color to each particle
      const hue =
        (config.colors.baseHue +
          (Math.random() - 0.5) * config.colors.hueVariance) /
        360;
      baseColor.setHSL(hue, 1.0, 0.6);
      colors[i3] = baseColor.r;
      colors[i3 + 1] = baseColor.g;
      colors[i3 + 2] = baseColor.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    // --- SHADER MATERIAL FOR PARTICLES ---
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_pointSize: {
          value: config.particles.size * renderer.getPixelRatio(),
        },
      },
      vertexShader: `
                attribute vec3 color;
                varying vec3 vColor;
                uniform float u_pointSize;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = u_pointSize * (10.0 / -mvPosition.z); // Make particles appear smaller further away
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: `
                varying vec3 vColor;
                void main() {
                    // Create a soft, circular shape for each particle
                    float strength = distance(gl_PointCoord, vec2(0.5));
                    strength = 1.0 - step(0.5, strength);
                    if (strength < 0.01) discard; // Discard transparent fragments for performance

                    gl_FragColor = vec4(vColor, strength);
                }
            `,
      transparent: true,
      blending: THREE.AdditiveBlending, // Brightens where particles overlap
      depthWrite: false, // Important for correct blending
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // --- ANIMATION & SIMULATION LOOP ---
    let frameId: number;
    const clock = new THREE.Clock();

    // --- CPU-based Particle Simulation ---
    // A simplified force field standing in for GPU curl noise, cheap enough for the CPU loop.
    const curlNoiseFn = (p: THREE.Vector3, speed: number, scale: number) => {
      const noiseVec = new THREE.Vector3(
        Math.sin(p.y * scale + speed),
        Math.cos(p.z * scale + speed),
        Math.sin(p.x * scale + speed)
      ).normalize();
      return noiseVec;
    };

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      const positionsArr = particleSystem.geometry.attributes.position
        .array as Float32Array;

      // Update each particle's position based on forces
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const p = new THREE.Vector3(
          positionsArr[i3],
          positionsArr[i3 + 1],
          positionsArr[i3 + 2]
        );

        // 1. Curl Noise Force for swirling
        const curlForce = curlNoiseFn(
          p,
          elapsedTime * config.simulation.noiseSpeed,
          config.simulation.noiseScale
        );

        // 2. Mouse Repulsion Force
        const mouseForce = new THREE.Vector3();
        const mouseTarget = new THREE.Vector3(
          mouseRef.current.x * (config.particles.boxSize / 2),
          mouseRef.current.y * (config.particles.boxSize / 2),
          0
        );
        const distanceToMouse = p.distanceTo(mouseTarget);
        if (distanceToMouse < 2) {
          // Only react if close to the mouse
          mouseForce
            .subVectors(p, mouseTarget)
            .normalize()
            .multiplyScalar(1 / (distanceToMouse + 0.1));
        }

        // Update velocity
        velocities[i3] +=
          curlForce.x * 0.001 + mouseForce.x * config.simulation.mouseRepulsion;
        velocities[i3 + 1] +=
          curlForce.y * 0.001 + mouseForce.y * config.simulation.mouseRepulsion;
        velocities[i3 + 2] +=
          curlForce.z * 0.001 + mouseForce.z * config.simulation.mouseRepulsion;

        // Apply friction
        velocities[i3] *= config.simulation.friction;
        velocities[i3 + 1] *= config.simulation.friction;
        velocities[i3 + 2] *= config.simulation.friction;

        // Update position
        positionsArr[i3] += velocities[i3];
        positionsArr[i3 + 1] += velocities[i3 + 1];
        positionsArr[i3 + 2] += velocities[i3 + 2];

        // Boundary check: wrap particles around the box
        if (Math.abs(positionsArr[i3]) > config.particles.boxSize / 2)
          positionsArr[i3] *= -1;
        if (Math.abs(positionsArr[i3 + 1]) > config.particles.boxSize / 2)
          positionsArr[i3 + 1] *= -1;
        if (Math.abs(positionsArr[i3 + 2]) > config.particles.boxSize / 2)
          positionsArr[i3 + 2] *= -1;
      }

      particleSystem.geometry.attributes.position.needsUpdate = true; // Crucial!

      // Camera Parallax
      camera.position.x +=
        (mouseRef.current.x * config.camera.parallaxIntensity -
          camera.position.x) *
        0.02;
      camera.position.y +=
        (-mouseRef.current.y * config.camera.parallaxIntensity -
          camera.position.y) *
        0.02;
      camera.lookAt(scene.position);

      // Use the composer to render the scene with post-processing
      composer.render();
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // --- EVENT HANDLERS & CLEANUP ---
    const handleResize = () => {
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />;
}
