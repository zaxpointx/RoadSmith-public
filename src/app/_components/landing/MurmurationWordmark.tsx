'use client';

import { useEffect, useRef } from 'react';

type Point = { x: number; y: number };
type Bird = Point & {
  vx: number;
  vy: number;
  phase: number;
  size: number;
  targetX: number;
  targetY: number;
};

const WORDMARK = 'ROADSMITH';
const PARTICLE_COLOR = 'rgba(219, 208, 255, 0.82)';

function createWordPoints(width: number, height: number): Point[] {
  const source = document.createElement('canvas');
  const context = source.getContext('2d');
  if (!context) return [];

  const fontSize = Math.max(52, Math.min(150, width * 0.13));
  context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  const metrics = context.measureText(WORDMARK);
  const wordWidth = metrics.width;
  const left = (width - wordWidth) / 2;
  const top = height * 0.39;

  source.width = Math.ceil(width);
  source.height = Math.ceil(height);
  context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  context.fillStyle = '#fff';
  context.fillText(WORDMARK, left, top);

  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  const step = width < 640 ? 7 : 8;
  const points: Point[] = [];

  for (let y = 0; y < source.height; y += step) {
    for (let x = 0; x < source.width; x += step) {
      if (pixels[(y * source.width + x) * 4 + 3] > 100) points.push({ x, y });
    }
  }

  return points;
}

function createBirds(points: Point[], width: number, height: number): Bird[] {
  const count = Math.min(points.length, width < 640 ? 850 : 1500);
  const birds: Bird[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * Math.min(width, height) * 0.38;
    birds.push({
      x: width / 2 + Math.cos(angle) * distance,
      y: height * 0.36 + Math.sin(angle) * distance * 0.6,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      phase: Math.random() * Math.PI * 2,
      size: 0.7 + Math.random() * 1.15,
      targetX: width / 2,
      targetY: height / 2,
    });
  }

  return birds.map((bird, index) => ({
    ...bird,
    targetX: points[Math.floor((index / count) * points.length)]?.x ?? width / 2,
    targetY: points[Math.floor((index / count) * points.length)]?.y ?? height / 2,
  }));
}

export function MurmurationWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let birds: Bird[] = [];
    let width = 0;
    let height = 0;
    let pointer = { x: -1000, y: -1000 };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const points = createWordPoints(width, height);
      birds = createBirds(points, width, height);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = PARTICLE_COLOR;

      birds.forEach((bird) => {
        const { targetX, targetY } = bird;
        const cycle = time % 9000;
        const scattering = cycle > 7000;
        const targetPull = scattering ? 0.002 : reduceMotion ? 0.09 : 0.035 + Math.sin(time * 0.0007 + bird.phase) * 0.006;
        const dx = targetX - bird.x;
        const dy = targetY - bird.y;
        const flockDx = bird.x - width / 2;
        const flockDy = bird.y - height * 0.36;
        const pointerDx = bird.x - pointer.x;
        const pointerDy = bird.y - pointer.y;
        const pointerDistance = Math.hypot(pointerDx, pointerDy);

        bird.vx += dx * targetPull;
        bird.vy += dy * targetPull;
        if (scattering) {
          bird.vx += flockDx * 0.0007;
          bird.vy += flockDy * 0.0007;
        }
        if (pointerDistance < 100) {
          const force = (100 - pointerDistance) / 100;
          bird.vx += (pointerDx / Math.max(pointerDistance, 1)) * force * 1.8;
          bird.vy += (pointerDy / Math.max(pointerDistance, 1)) * force * 1.8;
        }
        bird.vx *= 0.91;
        bird.vy *= 0.91;
        bird.x += bird.vx;
        bird.y += bird.vy;

        context.globalAlpha = 0.38 + Math.min(0.5, Math.hypot(dx, dy) / 180);
        context.fillRect(bird.x, bird.y, bird.size, bird.size);
      });

      context.globalAlpha = 1;
      if (!reduceMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener('pointermove', onPointerMove);
    resize();
    draw(0);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="rs-murmuration" aria-hidden="true" />;
}
