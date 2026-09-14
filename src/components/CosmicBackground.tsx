import { useEffect, useRef } from 'react';

/**
 * Atmospheric deep-space background.
 * sparse=true → quieter stars/nebula for dashboard (supports UI, not competes).
 *
 * The dominant visual is a planetary limb — the glowing curved horizon of a
 * world seen from orbit, blue near the top-left terminator, warming to
 * ivory/gold where it catches the "sun" — with the dark planet body filling
 * below it. Stars only render in the sky above the limb.
 */
export function CosmicBackground({
  reducedMotion,
  sparse = false,
}: {
  reducedMotion: boolean;
  sparse?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;
    let curveSamples: { x: number; y: number }[] = [];

    type Star = { x: number; y: number; r: number; a: number; s: number };
    let stars: Star[] = [];

    const starDensity = sparse ? 9000 : 2800;
    const nebulaMul = sparse ? 0.45 : 1;
    const supportsBlur = typeof ctx.filter === 'string';

    // Quadratic-bezier limb path, sampled once per resize. Sags from the
    // upper-left down toward the lower-right, like a horizon seen at a
    // gentle bank angle from orbit.
    const buildCurve = (yShift: number) => {
      const p0 = { x: -w * 0.08, y: h * (0.3 + yShift) };
      const p1 = { x: w * 0.55, y: h * (0.6 + yShift) };
      const p2 = { x: w * 1.08, y: h * (0.94 + yShift) };
      const n = 64;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= n; i++) {
        const tt = i / n;
        const it = 1 - tt;
        const x = it * it * p0.x + 2 * it * tt * p1.x + tt * tt * p2.x;
        const y = it * it * p0.y + 2 * it * tt * p1.y + tt * tt * p2.y;
        pts.push({ x, y });
      }
      return pts;
    };

    const yAt = (pts: { x: number; y: number }[], x: number) => {
      // pts.x is monotonic increasing — linear-scan is fine at this size.
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].x >= x) {
          const a = pts[i - 1];
          const b = pts[i];
          const f = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
          return a.y + (b.y - a.y) * f;
        }
      }
      return pts[pts.length - 1].y;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      curveSamples = buildCurve(0);
      stars = Array.from({ length: Math.max(12, Math.floor((w * h) / starDensity)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * (sparse ? 1.0 : 1.4) + 0.25,
        a: Math.random() * (sparse ? 0.4 : 0.7) + (sparse ? 0.08 : 0.15),
        s: Math.random() * 0.1 + 0.015,
      }));
    };

    const draw = () => {
      t += reducedMotion ? 0 : sparse ? 0.0012 : 0.0025;
      ctx.clearRect(0, 0, w, h);

      // Base sky gradient
      const g = ctx.createRadialGradient(w * 0.5, h * 0.28, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.9);
      g.addColorStop(0, sparse ? '#080e1c' : '#0a1228');
      g.addColorStop(0.5, '#050510');
      g.addColorStop(1, '#020208');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const drawNebula = (cx: number, cy: number, radius: number, color: string, alpha: number) => {
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        ng.addColorStop(0, color);
        ng.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha * nebulaMul;
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      const drift = reducedMotion ? 0 : Math.sin(t) * (sparse ? 6 : 12);
      const drift2 = reducedMotion ? 0 : Math.cos(t * 0.7) * (sparse ? 8 : 18);
      drawNebula(w * 0.3 + drift, h * 0.18, w * 0.4, 'rgba(40, 70, 140, 0.28)', 0.5);
      drawNebula(w * 0.75 + drift2, h * 0.3, w * 0.35, 'rgba(50, 40, 100, 0.22)', 0.4);
      if (!sparse) {
        drawNebula(w * 0.15, h * 0.65, w * 0.3, 'rgba(180, 100, 40, 0.12)', 0.35);
      } else {
        drawNebula(w * 0.2, h * 0.55, w * 0.25, 'rgba(160, 100, 40, 0.08)', 0.25);
      }

      // Stars — sky only, drawn before the limb so the planet body cleanly
      // covers the ones that would otherwise fall "below the horizon".
      for (const star of stars) {
        if (!reducedMotion && !sparse) {
          star.y += star.s * 0.12;
          if (star.y > h) star.y = 0;
        }
        const twinkle = reducedMotion || sparse
          ? star.a
          : star.a * (0.75 + 0.25 * Math.sin(t * 2.5 + star.x));
        ctx.beginPath();
        ctx.fillStyle = `rgba(220, 230, 255, ${twinkle})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Planetary limb ────────────────────────────────────────────
      // Extremely slow vertical breathing so the horizon never looks static.
      const limbDrift = reducedMotion ? 0 : Math.sin(t * 0.18) * h * 0.004;
      const pts = curveSamples.length ? curveSamples : buildCurve(0);

      const tracePath = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + limbDrift);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + limbDrift);
      };

      // Planet body — fills everything below the limb.
      tracePath();
      ctx.lineTo(w * 1.1, h * 1.1);
      ctx.lineTo(-w * 0.1, h * 1.1);
      ctx.closePath();
      const bodyTopY = yAt(pts, w * 0.5) + limbDrift;
      const bodyGrad = ctx.createLinearGradient(0, bodyTopY, 0, h);
      bodyGrad.addColorStop(0, 'rgba(10, 20, 42, 0.96)');
      bodyGrad.addColorStop(0.25, 'rgba(6, 12, 26, 0.98)');
      bodyGrad.addColorStop(1, '#020204');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Warm bloom where the "sunlight" grazes the limb, bled upward into
      // the sky and downward onto the planet body.
      const sunT = 0.72;
      const sunX = pts[Math.floor(sunT * (pts.length - 1))].x;
      const sunY = yAt(pts, sunX) + limbDrift;
      ctx.globalCompositeOperation = 'lighter';
      const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(w, h) * (sparse ? 0.32 : 0.4));
      bloom.addColorStop(0, sparse ? 'rgba(255, 200, 140, 0.16)' : 'rgba(255, 205, 145, 0.22)');
      bloom.addColorStop(0.45, 'rgba(220, 160, 110, 0.08)');
      bloom.addColorStop(1, 'transparent');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      // Glow gradient along the limb line: cool blue → pale → warm gold.
      const limbGrad = ctx.createLinearGradient(0, 0, w, 0);
      limbGrad.addColorStop(0, 'rgba(110, 165, 235, 0.85)');
      limbGrad.addColorStop(0.45, 'rgba(190, 210, 245, 0.9)');
      limbGrad.addColorStop(0.72, 'rgba(255, 215, 165, 0.95)');
      limbGrad.addColorStop(1, 'rgba(255, 180, 110, 0.85)');

      const glowPasses: [number, number, number][] = [
        [46, 34, 0.1],
        [20, 16, 0.18],
        [7, 6, 0.32],
      ];
      for (const [width, blur, alpha] of glowPasses) {
        tracePath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = limbGrad;
        ctx.globalAlpha = alpha * (sparse ? 0.8 : 1);
        if (supportsBlur) ctx.filter = `blur(${blur}px)`;
        ctx.stroke();
        if (supportsBlur) ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      // Crisp core line on top.
      tracePath();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = limbGrad;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const vg = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, sparse ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    if (!reducedMotion) raf = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      if (reducedMotion) draw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion, sparse]);

  return <canvas ref={ref} className="cosmic-canvas" aria-hidden />;
}
