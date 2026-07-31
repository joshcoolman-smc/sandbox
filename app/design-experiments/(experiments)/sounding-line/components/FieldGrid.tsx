// A "magnetic" backdrop layered beneath the mesh: a lattice of short segments
// that rotate to wrap tangentially around the pointer (iron-filings look). It
// reads pointer position only — never the terrain — so sculpting the mesh leaves
// this layer untouched.
//
// Carried over from seismic-mesh, retoned. There the field was bright red
// against a transient quake; here the terrain is permanent and the sweep line
// owns the eye, so the field drops to a cool slate that reads as instrument
// backing rather than alarm.
'use client';

import { useEffect, useRef } from 'react';
import { CELL_SIZE, meshGrid } from '../meshLayout';

const SEG_LEN = CELL_SIZE * 0.6;
const EASE = 0.12; // angle settle per frame: 1 = instant snap, lower = gentler
const TONE = 'rgba(120,150,185,0.20)';
const LINE_WIDTH = 1;

type Seg = { x: number; y: number; angle: number };

// Rotate `from` toward `to` by `t`, taking the shortest path around the circle.
function easeAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  else if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

export function FieldGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let segs: Seg[] = [];
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let raf = 0;

    function build() {
      if (!canvas || !ctx) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
      segs = meshGrid(W, H).points.map(p => ({ x: p.x, y: p.y, angle: 0 }));
    }
    build();
    window.addEventListener('resize', build);

    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
    window.addEventListener('pointermove', onPointerMove);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.strokeStyle = TONE;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const h = SEG_LEN / 2;
      for (const seg of segs) {
        const target = Math.atan2(seg.y - pointer.y, seg.x - pointer.x) + Math.PI / 2;
        seg.angle = easeAngle(seg.angle, target, EASE);
        const c = Math.cos(seg.angle);
        const s = Math.sin(seg.angle);
        ctx.moveTo(seg.x - c * h, seg.y - s * h);
        ctx.lineTo(seg.x + c * h, seg.y + s * h);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="sl-field-canvas" />;
}
