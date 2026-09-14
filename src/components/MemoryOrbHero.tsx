import { useEffect, useId, useState } from 'react';

export type OrbState = 'idle' | 'urgent' | 'processing' | 'success' | 'calm';

type RingDef = {
  rx: number;
  ry: number;
  rotate: number;
  strokeWidth: number;
  opacity: number;
  gradient: string;
  spin: 'spin-slow' | 'spin-slower';
};

/**
 * Living Memory Planet — a small, Saturn-like world.
 *
 * Structure (back → front):
 *   1. ambient bleed glow
 *   2. back ring layer (full ellipses, sits behind the sphere)
 *   3. moon — "behind" pass (visible for half of its orbit)
 *   4. the planet sphere
 *   5. moon — "ahead" pass (visible for the other half, crossing in front)
 *   6. front ring layer (same ellipses, clipped to only their lower arc,
 *      so they visibly sweep across the planet's face)
 *
 * The front/back ring split is a static clip (the rings only spin in-plane,
 * so the horizon line never moves), which keeps the occlusion correct at
 * every frame without any JS-driven z-index juggling. The moon instead
 * genuinely revolves in 3D (rotateX/rotateZ tilt + animated rotateY), so its
 * two layered copies fade across each other in sync with its real position
 * to sell the pass-behind / pass-in-front illusion.
 */
export function MemoryOrbHero({
  reducedMotion,
  state = 'idle',
  compact = false,
  intensity = 'calm',
}: {
  reducedMotion: boolean;
  state?: OrbState;
  compact?: boolean;
  /** cinematic = Welcome; calm = Home */
  intensity?: 'calm' | 'cinematic' | 'active';
}) {
  const uid = useId().replace(/:/g, '');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let t0 = performance.now();
    let alive = true;
    const loop = (now: number) => {
      if (!alive) return;
      const t = (now - t0) / 1000;
      setPulse(Math.sin(t * 0.35) * 0.5 + 0.5);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVis = () => {
      if (document.hidden) {
        alive = false;
        cancelAnimationFrame(raf);
      } else {
        alive = true;
        t0 = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reducedMotion]);

  const breathe = reducedMotion ? 1 : 1 + pulse * (state === 'urgent' ? 0.02 : 0.012);
  const glow = reducedMotion
    ? 0.65
    : 0.5 + pulse * 0.28 + (state === 'processing' ? 0.12 : 0) + (state === 'urgent' ? 0.1 : 0);

  const idRingGold = `ringGold-${uid}`;
  const idRingBlue = `ringBlue-${uid}`;
  const idRingPale = `ringPale-${uid}`;

  // 1–3 physical rings, sharing gradients between the back/front render pass.
  const rings: RingDef[] = [
    { rx: 118, ry: 44, rotate: -32, strokeWidth: 1.25, opacity: 0.75, gradient: idRingGold, spin: 'spin-slow' },
    { rx: 128, ry: 50, rotate: 24, strokeWidth: 1, opacity: 0.5, gradient: idRingBlue, spin: 'spin-slower' },
    { rx: 105, ry: 38, rotate: 8, strokeWidth: 0.8, opacity: 0.4, gradient: idRingPale, spin: 'spin-slow' },
  ];

  const renderRings = () => (
    <>
      {rings.map((r, i) => (
        // The <g> carries the ring's fixed tilt; the <ellipse> inside carries
        // the slow in-place spin. Keeping these on separate elements matters:
        // the CSS spin animation sets the `transform` property, which would
        // otherwise wipe out the ellipse's own static tilt attribute.
        <g key={i} transform={`rotate(${r.rotate} 160 160)`}>
          <ellipse
            className={reducedMotion ? 'orb-ring' : `orb-ring ${r.spin}`}
            cx="160"
            cy="160"
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke={`url(#${r.gradient})`}
            strokeWidth={r.strokeWidth}
            opacity={r.opacity}
          />
        </g>
      ))}
    </>
  );

  return (
    <div
      className={`orb-hero-wrap orb-state-${state}${compact ? ' orb-compact' : ''} orb-intensity-${intensity}`}
      style={{ transform: `scale(${breathe})` }}
      aria-hidden
    >
      <div className="orb-hero-bleed" style={{ opacity: glow }} />

      {/* Gradient defs shared by both ring passes */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={idRingGold} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,180,80,0)" />
            <stop offset="40%" stopColor="rgba(255,200,110,0.7)" />
            <stop offset="70%" stopColor="rgba(120,180,255,0.4)" />
            <stop offset="100%" stopColor="rgba(100,180,255,0)" />
          </linearGradient>
          <linearGradient id={idRingBlue} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(80,180,255,0)" />
            <stop offset="45%" stopColor="rgba(130,200,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,170,60,0)" />
          </linearGradient>
          <linearGradient id={idRingPale} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(180,210,255,0)" />
            <stop offset="50%" stopColor="rgba(180,210,255,0.35)" />
            <stop offset="100%" stopColor="rgba(180,210,255,0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Back ring pass — full ellipses, painted behind the planet */}
      <svg className="orb-hero-rings orb-rings-back" viewBox="0 0 320 320" aria-hidden>
        {renderRings()}
      </svg>

      {/* Moon — "behind" pass */}
      <div className="orb-moon-layer orb-moon-behind" data-reduced={reducedMotion ? '1' : '0'}>
        <div className={`orb-moon-orbit orb-moon-orbit-solo ${reducedMotion ? 'is-static' : ''}`}>
          <div className="orb-moon-arm">
            <div className="orb-moon-face">
              <div className="orb-moon orb-moon-warm">
                <span className="orb-moon-hl" />
                <span className="orb-moon-sh" />
                <span className="orb-moon-rim" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The planet */}
      <div className="orb-hero-sphere">
        <div className="orb-hero-shade" />
        <div className="orb-hero-core-shift" />
        <div className="orb-hero-inner" />
        <div className="orb-hero-highlight" />
        <div className="orb-hero-warm" />
        <div className="orb-hero-rim" />
      </div>

      {/* Moon — "ahead" pass, same orbit, opposite half visible */}
      <div className="orb-moon-layer orb-moon-ahead" data-reduced={reducedMotion ? '1' : '0'}>
        <div className={`orb-moon-orbit orb-moon-orbit-solo ${reducedMotion ? 'is-static' : ''}`}>
          <div className="orb-moon-arm">
            <div className="orb-moon-face">
              <div className="orb-moon orb-moon-warm orb-moon-near">
                <span className="orb-moon-hl" />
                <span className="orb-moon-sh" />
                <span className="orb-moon-rim" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Front ring pass — same ellipses, clipped to their lower arc so they
          visibly sweep in front of the planet's face */}
      <svg className="orb-hero-rings orb-rings-front" viewBox="0 0 320 320" aria-hidden>
        {renderRings()}
      </svg>
    </div>
  );
}
