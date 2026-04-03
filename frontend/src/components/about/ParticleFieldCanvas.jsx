import React, { useEffect, useRef } from "react";
import {
  PARTICLE_FIELD_COUNT, PARTICLE_FIELD_SOLAR_RATIO, PARTICLE_FIELD_BG,
  PARTICLE_FIELD_ATTRACT, PARTICLE_FIELD_REPEL_RADIUS, PARTICLE_FIELD_REPEL_STR,
  PARTICLE_FIELD_CONNECT_DIST,
} from "./constants";

function ParticleFieldCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({ t: 0, particles: [] });
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      buildScene(canvas.width, canvas.height);
    };

    const buildScene = (W, H) => {
      stateRef.current.particles = Array.from({ length: PARTICLE_FIELD_COUNT }, () =>
        makeP(W, H, true)
      );
    };

    const makeP = (W, H, init) => {
      const isSolar = Math.random() < PARTICLE_FIELD_SOLAR_RATIO;
      return {
        x:    Math.random() * W,
        y:    Math.random() * H,
        vx:   (Math.random() - 0.5) * 0.18,
        vy:   (Math.random() - 0.5) * 0.18,
        r:    Math.random() * 2.2 + 0.8,
        opacity: Math.random() * 0.55 + 0.15,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.025 + 0.005,
        isSolar,
        trail: init ? [] : [],
      };
    };

    const draw = () => {
      const { t, particles } = stateRef.current;
      const W = canvas.width, H = canvas.height;

      // ── Background ────────────────────────────────────────────────
      ctx.fillStyle = PARTICLE_FIELD_BG;
      ctx.fillRect(0, 0, W, H);

      // ── Attractor: subtle glow at canvas centre ───────────────────
      const atX = W * 0.5, atY = H * 0.5;
      const atGrad = ctx.createRadialGradient(atX, atY, 0, atX, atY, W * 0.35);
      atGrad.addColorStop(0,   "rgba(0,180,200,0.10)");
      atGrad.addColorStop(0.5, "rgba(0,140,180,0.04)");
      atGrad.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = atGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Particles ─────────────────────────────────────────────────
      const mx = mouseRef.current.x - 0.5; // -0.5..0.5
      const my = mouseRef.current.y - 0.5;

      particles.forEach((p) => {
        // Drift toward attractor (very weak pull)
        const toDx = atX - p.x, toDy = atY - p.y;
        const dist  = Math.sqrt(toDx * toDx + toDy * toDy) + 1;
        p.vx += (toDx / dist) * PARTICLE_FIELD_ATTRACT;
        p.vy += (toDy / dist) * PARTICLE_FIELD_ATTRACT;

        // Cursor repulsion — particles scatter gently from cursor
        const cX = (mx + 0.5) * W, cY = (my + 0.5) * H;
        const cpDx = p.x - cX, cpDy = p.y - cY;
        const cpDist = Math.sqrt(cpDx * cpDx + cpDy * cpDy) + 1;
        if (cpDist < PARTICLE_FIELD_REPEL_RADIUS) {
          const repelStr = (1 - cpDist / PARTICLE_FIELD_REPEL_RADIUS) * PARTICLE_FIELD_REPEL_STR;
          p.vx += (cpDx / cpDist) * repelStr;
          p.vy += (cpDy / cpDist) * repelStr;
        }

        // Drag
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x  += p.vx;
        p.y  += p.vy;

        // Wrap at edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Twinkle
        const tw = p.opacity * (0.6 + 0.4 * Math.sin(t * p.twinkleSpeed + p.twinkle));

        // Draw glow
        const glowR = p.r * 2.8;
        const col = p.isSolar ? `rgba(255,180,80,` : `rgba(100,190,255,`;
        const gGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        gGrad.addColorStop(0,   `${col}${tw * 0.45})`);
        gGrad.addColorStop(0.5, `${col}${tw * 0.12})`);
        gGrad.addColorStop(1,   `${col}0)`);
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Draw core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isSolar
          ? `rgba(255,210,140,${tw})`
          : `rgba(170,215,255,${tw})`;
        ctx.fill();
      });

      // ── Draw connection lines between close particles ─────────────
      // Only connect pairs within PARTICLE_FIELD_CONNECT_DIST px
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i], pj = particles[j];
          const dx = pi.x - pj.x, dy = pi.y - pj.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < PARTICLE_FIELD_CONNECT_DIST * PARTICLE_FIELD_CONNECT_DIST) {
            const frac = 1 - Math.sqrt(d2) / PARTICLE_FIELD_CONNECT_DIST;
            const bothSolar = pi.isSolar && pj.isSolar;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = bothSolar
              ? `rgba(255,170,60,${frac * 0.18})`
              : `rgba(80,170,255,${frac * 0.14})`;
            ctx.lineWidth = frac * 1.6 + 0.3;
            ctx.stroke();
          }
        }
      }

      // ── Vignette ──────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.12, W * 0.5, H * 0.5, H * 0.88);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      stateRef.current.t += 1;
      animRef.current = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

export default ParticleFieldCanvas;
