import React, { useEffect, useRef } from "react";
import {
  EARTH_X_FRAC, EARTH_Y_FRAC, EARTH_R_FRAC,
  SUN_X_FRAC, SUN_Y_FRAC,
  RAY_COUNT, RAY_SPREAD, RAY_LEN_FRAC, RAY_OPACITY_BASE, RAY_OPACITY_PULSE,
  VEHICLE_TRAIL_LEN, VEHICLE_PLANE_SPEED, VEHICLE_SAT_SPEED,
  VEHICLE_CAM_ELEV, VEHICLE_PLANE_ORBIT, VEHICLE_SAT_ORBIT_MIN, VEHICLE_SAT_ORBIT_MAX,
  PARTICLE_COUNT, PARTICLE_FREE_COUNT, PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX,
  PARALLAX_STAR_STR, PARALLAX_MID_STR, PARALLAX_NEAR_STR,
  STAR_COUNT,
} from "./constants";

function CinematicBackground() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    t: 0,
    stars: [],
    particles: [],
    freeParticles: [],
    vehicles: [], 
    mouse: { x: 0.5, y: 0.5 },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const onMouseMove = (e) => {
      stateRef.current.mouse.x = e.clientX / window.innerWidth;
      stateRef.current.mouse.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      buildScene(canvas.width, canvas.height);
    };

    const buildScene = (W, H) => {
      const s = stateRef.current;

      // Stars
      s.stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        opacity: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      }));

      // Solar Ray particles
      s.particles = Array.from({ length: PARTICLE_COUNT }, () =>
        makeParticle(W, H, true)
      );

      // Smaller Solar Particles
      s.freeParticles = Array.from({ length: PARTICLE_FREE_COUNT }, () =>
        makeFreeParticle(W, H, true)
      );

      const eX = W * EARTH_X_FRAC, eY = H * EARTH_Y_FRAC, eR = Math.min(W, H) * EARTH_R_FRAC;
      const P = Math.PI;
      const mkV = (type, orbitR, angSpeed, angle, inc, lan) => ({
        type, orbitR, angSpeed, angle, inc, lan, ex: eX, ey: eY,
        trail: [],
      });

      const rA = () => Math.random() * Math.PI * 2;
      s.vehicles = [
        // ── Planes — full spread of directions ──────────────────────────────
        mkV("plane", eR * VEHICLE_PLANE_ORBIT,          0.0090 * VEHICLE_PLANE_SPEED, rA(), P * 0.05, P * 0.00),
        mkV("plane", eR * VEHICLE_PLANE_ORBIT,          0.0075 * VEHICLE_PLANE_SPEED, rA(), P * 0.50, P * 0.25),
        mkV("plane", eR * (VEHICLE_PLANE_ORBIT + 0.02), 0.0100 * VEHICLE_PLANE_SPEED, rA(), P * 0.25, P * 0.50),
        mkV("plane", eR * (VEHICLE_PLANE_ORBIT - 0.02), 0.0060 * VEHICLE_PLANE_SPEED, rA(), P * 0.25, P * 1.00),
        mkV("plane", eR * (VEHICLE_PLANE_ORBIT + 0.03), 0.0080 * VEHICLE_PLANE_SPEED, rA(), P * 0.12, P * 1.50),
        mkV("plane", eR * (VEHICLE_PLANE_ORBIT - 0.01), 0.0095 * VEHICLE_PLANE_SPEED, rA(), P * 0.38, P * 1.75),
        // ── Satellites — varied inclinations ────────────────────────────────
        mkV("sat",   eR * VEHICLE_SAT_ORBIT_MIN,          0.0055 * VEHICLE_SAT_SPEED, rA(), P * 0.50, P * 0.17),
        mkV("sat",   eR * (VEHICLE_SAT_ORBIT_MIN + 0.12), 0.0040 * VEHICLE_SAT_SPEED, rA(), P * 0.08, P * 0.83),
        mkV("sat",   eR * (VEHICLE_SAT_ORBIT_MAX - 0.10), 0.0050 * VEHICLE_SAT_SPEED, rA(), P * 0.30, P * 1.30),
        mkV("sat",   eR * VEHICLE_SAT_ORBIT_MAX,          0.0035 * VEHICLE_SAT_SPEED, rA(), P * 0.20, P * 1.83),
      ];
    };

    const makeParticle = (W, H, init) => {
      // Particles originate from upper-right (Sun side) and stream toward Earth
      const startFraction = init ? Math.random() : 0;
      return {
        progress: startFraction,
        speed: Math.random() * PARTICLE_SPEED_MAX + PARTICLE_SPEED_MIN,
        // random offset from the main ray axis
        lateralOffset: (Math.random() - 0.5) * H * 0.55,
        opacity: Math.random() * 0.7 + 0.2,
        size: Math.random() * 1.8 + 0.6,
        hue: Math.random() > 0.5 ? 35 : 20, // orange-white solar
      };
    };

    const makeFreeParticle = (W, H, init) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        distance: init ? Math.random() * W * 0.6 : 0,
        speed: Math.random() * 1.0 + 0.4,
        opacity: Math.random() * 0.5 + 0.15,
        size: Math.random() * 1.4 + 0.5,
        hue: Math.random() > 0.6 ? 40 : 25,
        maxDist: W * (0.5 + Math.random() * 0.7),
      };
    };

    // ── draw frame ──────────────────────────────────────────────────────────
    const draw = () => {
      const { t, stars, particles, freeParticles } = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Deep space gradient
      const bg = ctx.createRadialGradient(
        W * 0.62, H * 0.42, 0,
        W * 0.62, H * 0.42, W * 0.85
      );
      bg.addColorStop(0, "#0a0f1a");
      bg.addColorStop(0.4, "#06090f");
      bg.addColorStop(1, "#010205");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Parallax offset (mouse-driven) ────────────────────────────────────
      const mx = stateRef.current.mouse.x - 0.5; // -0.5..0.5
      const my = stateRef.current.mouse.y - 0.5;
      // Layer strengths: stars (far) = 8px, nebula (mid) = 4px, earth (near) = 2px
      const pxStar = { x: mx * PARALLAX_STAR_STR, y: my * PARALLAX_STAR_STR };
      const pxMid  = { x: mx * PARALLAX_MID_STR,  y: my * PARALLAX_MID_STR  };
      const pxNear = { x: mx * PARALLAX_NEAR_STR, y: my * PARALLAX_NEAR_STR };

      // ── Stars (far layer) ──────────────────────────────────────────────────
      stars.forEach((star) => {
        const twinkle =
          star.opacity *
          (0.7 + 0.3 * Math.sin(t * star.twinkleSpeed + star.twinklePhase));
        ctx.beginPath();
        ctx.arc(star.x + pxStar.x, star.y + pxStar.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fill();
      });

      // ── Sun glow (off-canvas upper-right, mid-layer parallax) ────────────
      const sunX = W * SUN_X_FRAC + pxMid.x;
      const sunY = -H * SUN_Y_FRAC + pxMid.y;

      // Outer corona
      const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.65);
      corona.addColorStop(0, "rgba(255,210,100,0.22)");
      corona.addColorStop(0.3, "rgba(255,160,40,0.09)");
      corona.addColorStop(0.6, "rgba(255,120,20,0.04)");
      corona.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = corona;
      ctx.fillRect(0, 0, W, H);

      // Inner bright core
      const sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.22);
      sunCore.addColorStop(0, "rgba(255,240,200,0.55)");
      sunCore.addColorStop(0.25, "rgba(255,190,60,0.18)");
      sunCore.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sunCore;
      ctx.fillRect(0, 0, W, H);

      // ── Solar rays (dramatic, directional) ────────────────────────────────
      const earthX = W * EARTH_X_FRAC;
      const earthY = H * EARTH_Y_FRAC;
      const rayCount = RAY_COUNT;

      for (let i = 0; i < rayCount; i++) {
        const spreadAngle = (i / (rayCount - 1) - 0.5) * RAY_SPREAD;
        const baseAngle = Math.atan2(earthY - sunY, earthX - sunX);
        const angle = baseAngle + spreadAngle;

        const rayLen = W * RAY_LEN_FRAC;
        const ex = sunX + Math.cos(angle) * rayLen;
        const ey = sunY + Math.sin(angle) * rayLen;

        const pulseOpacity =
          RAY_OPACITY_BASE + RAY_OPACITY_PULSE * Math.sin(t * 0.015 + i * 0.9);
        const rayW = 20 + i * 10; 

        // Compute perpendicular for ribbon width
        const dx = ex - sunX;
        const dy = ey - sunY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = (-dy / len) * rayW;
        const py = (dx / len) * rayW;

        const rayGrad = ctx.createLinearGradient(sunX, sunY, ex, ey);
        rayGrad.addColorStop(0, `rgba(255,200,80,${pulseOpacity * 3})`);
        rayGrad.addColorStop(0.3, `rgba(255,160,40,${pulseOpacity * 1.5})`);
        rayGrad.addColorStop(1, "rgba(255,100,20,0)");

        ctx.beginPath();
        ctx.moveTo(sunX + px, sunY + py);
        ctx.lineTo(ex + px * 0.1, ey + py * 0.1);
        ctx.lineTo(ex - px * 0.1, ey - py * 0.1);
        ctx.lineTo(sunX - px, sunY - py);
        ctx.closePath();
        ctx.fillStyle = rayGrad;
        ctx.fill();
      }

      // ── Solar wind particles (Earth-directed) — drawn as short streaks ─────
      {
        const baseAngle = Math.atan2(earthY - sunY, earthX - sunX);
        const perpX = -Math.sin(baseAngle);
        const perpY =  Math.cos(baseAngle);
        // Ray direction unit vector (sun→earth)
        const rayDX = Math.cos(baseAngle);
        const rayDY = Math.sin(baseAngle);

        particles.forEach((p) => {
          const interp = p.progress;
          const x = sunX + (earthX - sunX) * 1.8 * interp + perpX * p.lateralOffset;
          const y = sunY + (earthY - sunY) * 1.8 * interp + perpY * p.lateralOffset;
          const opacity = p.opacity * (1 - Math.abs(interp - 0.5) * 1.2);
          const alpha = Math.max(0, opacity);
          if (alpha < 0.01) { p.progress += p.speed; return; }

          // Streak length proportional to particle speed — faster = longer streak
          const streakLen = (p.size * 6 + p.speed * 1200) * 0.5;
          // Head of streak (in direction of travel = toward Earth)
          const x2 = x + rayDX * streakLen * 0.5;
          const y2 = y + rayDY * streakLen * 0.5;
          // Tail
          const x1 = x - rayDX * streakLen * 0.5;
          const y1 = y - rayDY * streakLen * 0.5;

          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0,   `hsla(${p.hue},90%,92%,0)`);
          grad.addColorStop(0.4, `hsla(${p.hue},90%,88%,${alpha})`);
          grad.addColorStop(1,   `hsla(${p.hue},90%,80%,${alpha * 0.3})`);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = grad;
          ctx.lineWidth   = p.size * 0.7;
          ctx.lineCap     = "round";
          ctx.stroke();

          p.progress += p.speed;
          if (p.progress > 1) Object.assign(p, makeParticle(W, H, false));
        });
      }

      // Free solar wind particles (all directions) — also as short streaks
      freeParticles.forEach((p) => {
        const px  = sunX + Math.cos(p.angle) * p.distance;
        const py  = sunY + Math.sin(p.angle) * p.distance;
        const fade = 1 - p.distance / p.maxDist;
        const alpha = Math.max(0, p.opacity * fade);
        if (alpha < 0.01) { p.distance += p.speed; return; }

        const streakLen = p.size * 5 + 4;
        const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
        const x1 = px - dx * streakLen * 0.4, y1 = py - dy * streakLen * 0.4;
        const x2 = px + dx * streakLen * 0.6, y2 = py + dy * streakLen * 0.6;

        const fGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        fGrad.addColorStop(0,   `hsla(${p.hue},90%,88%,0)`);
        fGrad.addColorStop(0.5, `hsla(${p.hue},90%,84%,${alpha})`);
        fGrad.addColorStop(1,   `hsla(${p.hue},90%,78%,0)`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = fGrad;
        ctx.lineWidth   = p.size * 0.65;
        ctx.lineCap     = "round";
        ctx.stroke();

        p.distance += p.speed;
        if (p.distance > p.maxDist) Object.assign(p, makeFreeParticle(W, H, false));
      });

      // ── Earth ─────────────────────────────────────────────────────────────
      // Apply near-layer parallax shift to Earth + vehicles
      const earthXp = earthX + pxNear.x;
      const earthYp = earthY + pxNear.y;
      const earthR = Math.min(W, H) * EARTH_R_FRAC;

      // Deep space shadow side
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthXp, earthYp, earthR, 0, Math.PI * 2);
      ctx.clip();

      // Base ocean deep blue
      const earthBase = ctx.createRadialGradient(
        earthXp - earthR * 0.25, earthYp - earthR * 0.2, 0,
        earthXp, earthYp, earthR
      );
      earthBase.addColorStop(0, "#1a4a8a");
      earthBase.addColorStop(0.35, "#0d2d5a");
      earthBase.addColorStop(0.65, "#071a38");
      earthBase.addColorStop(1, "#020a18");
      ctx.fillStyle = earthBase;
      ctx.fillRect(earthXp - earthR, earthYp - earthR, earthR * 2, earthR * 2);

      // Sunlit side — warm illumination from upper-right
      const litSide = ctx.createRadialGradient(
        earthXp + earthR * 0.38, earthYp - earthR * 0.3, 0,
        earthXp + earthR * 0.38, earthYp - earthR * 0.3, earthR * 1.5
      );
      litSide.addColorStop(0, "rgba(100,160,255,0.55)");
      litSide.addColorStop(0.3, "rgba(60,120,220,0.25)");
      litSide.addColorStop(0.7, "rgba(20,60,140,0.08)");
      litSide.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = litSide;
      ctx.fillRect(earthXp - earthR, earthYp - earthR, earthR * 2, earthR * 2);

      // Land masses (stylised brown/green patches)
      const landPatches = [
        { cx: 0.1, cy: -0.25, rx: 0.28, ry: 0.18 }, // North America
        { cx: 0.35, cy: -0.15, rx: 0.14, ry: 0.22 }, // Europe
        { cx: 0.42, cy: 0.15, rx: 0.18, ry: 0.28 },  // Africa
        { cx: -0.3, cy: 0.0, rx: 0.2, ry: 0.12 },    // South America
        { cx: 0.5, cy: -0.18, rx: 0.25, ry: 0.16 },  // Asia
        { cx: 0.38, cy: 0.42, rx: 0.14, ry: 0.09 },  // Australia
      ];

      landPatches.forEach(({ cx, cy, rx, ry }) => {
        const lx = earthXp + cx * earthR;
        const ly = earthYp + cy * earthR;
        const landGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, rx * earthR);
        landGrad.addColorStop(0, "rgba(80,110,60,0.55)");
        landGrad.addColorStop(0.5, "rgba(55,80,40,0.3)");
        landGrad.addColorStop(1, "rgba(30,50,20,0)");
        ctx.fillStyle = landGrad;
        ctx.beginPath();
        ctx.ellipse(lx, ly, rx * earthR, ry * earthR, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ice cap
      const iceCap = ctx.createRadialGradient(
        earthXp, earthYp - earthR * 0.75, 0,
        earthXp, earthYp - earthR * 0.75, earthR * 0.38
      );
      iceCap.addColorStop(0, "rgba(220,235,255,0.6)");
      iceCap.addColorStop(0.5, "rgba(180,210,255,0.25)");
      iceCap.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = iceCap;
      ctx.fillRect(earthXp - earthR, earthYp - earthR, earthR * 2, earthR * 2);

      ctx.restore();


      // ── Atmosphere / thin air layer ───────────────────────────────────────
      const atmoGrad = ctx.createRadialGradient(
        earthXp, earthYp, earthR * 0.95,
        earthXp, earthYp, earthR * 1.18
      );
      atmoGrad.addColorStop(0, "rgba(80,160,255,0.0)");
      atmoGrad.addColorStop(0.4, "rgba(60,140,255,0.18)");
      atmoGrad.addColorStop(0.75, "rgba(40,100,200,0.08)");
      atmoGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(earthXp, earthYp, earthR * 1.18, 0, Math.PI * 2);
      ctx.fill();


      // ── Magnetosphere / bow shock ──────────────────────────────────────────
      // Compressed on sunlit side, stretched on night side
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.02 * Math.sin(t * 0.01);
      const magGrad = ctx.createRadialGradient(
        earthXp + earthR * 0.6, earthYp, 0,
        earthXp, earthYp, earthR * 2.8
      );
      magGrad.addColorStop(0, "rgba(100,180,255,0.8)");
      magGrad.addColorStop(0.5, "rgba(60,120,255,0.3)");
      magGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = magGrad;
      ctx.beginPath();
      ctx.ellipse(earthXp + earthR * 0.35, earthYp, earthR * 2.5, earthR * 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Beams strike the LIT hemisphere (sun-facing side) of Earth.
      const atmoContactR = earthR * 1.12;

      // Sun direction vector (normalized, FROM sun TO earth)
      const sunDirX = earthXp - sunX;
      const sunDirY = earthYp - sunY;
      const sunDirLen = Math.sqrt(sunDirX * sunDirX + sunDirY * sunDirY);
      const sunDirNX = sunDirX / sunDirLen;
      const sunDirNY = sunDirY / sunDirLen;

      // earthToSunAngle: direction FROM earth TOWARD sun — this is the center of the lit hemisphere
      const earthToSunAngle = Math.atan2(sunY - earthYp, sunX - earthXp);

      // angOffsets span the lit hemisphere: ±0.5 radians from the earth-to-sun direction
      const impactBeams = [
        { angOffset: -0.45, phaseOffset: 0.0 },
        { angOffset: -0.25, phaseOffset: 1.1 },
        { angOffset: -0.08, phaseOffset: 2.3 },
        { angOffset:  0.10, phaseOffset: 0.7 },
        { angOffset:  0.28, phaseOffset: 1.8 },
        { angOffset:  0.46, phaseOffset: 3.1 },
      ];

      impactBeams.forEach((beam, beamIndex) => {
        // Contact point on the LIT side of atmosphere
        const contactAngle = earthToSunAngle + beam.angOffset;
        const contactX = earthXp + Math.cos(contactAngle) * atmoContactR;
        const contactY = earthYp + Math.sin(contactAngle) * atmoContactR;

        // Beam ray direction: FROM sun TOWARD contactPoint
        const rayDirX = contactX - sunX;
        const rayDirY = contactY - sunY;
        const rayDirLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
        const rayDirNX = rayDirX / rayDirLen;
        const rayDirNY = rayDirY / rayDirLen;

        // Origin near/at sun (start close to sun, off-screen upper-right)
        const beamLength = Math.sqrt(W * W + H * H) * 1.2;
        const originX = sunX - rayDirNX * beamLength * 0.15;
        const originY = sunY - rayDirNY * beamLength * 0.15;

        // Perpendicular for ribbon width
        const perpX = -rayDirNY;
        const perpY =  rayDirNX;
        const ribbonHalfAtContact = 2.0;
        const ribbonHalfAtOrigin  = 3.5;

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.02 + beamIndex * 1.1);

        // Gradient: bright near origin (sun), fades toward contact
        const beamGrad = ctx.createLinearGradient(originX, originY, contactX, contactY);
        beamGrad.addColorStop(0,    `rgba(255,220,100,${0.55 * pulse})`);
        beamGrad.addColorStop(0.4,  `rgba(255,190,60,${0.35 * pulse})`);
        beamGrad.addColorStop(0.75, `rgba(255,150,30,${0.18 * pulse})`);
        beamGrad.addColorStop(1,    `rgba(255,140,20,${0.08})`);

        ctx.beginPath();
        ctx.moveTo(originX + perpX * ribbonHalfAtOrigin,  originY + perpY * ribbonHalfAtOrigin);
        ctx.lineTo(contactX + perpX * ribbonHalfAtContact, contactY + perpY * ribbonHalfAtContact);
        ctx.lineTo(contactX - perpX * ribbonHalfAtContact, contactY - perpY * ribbonHalfAtContact);
        ctx.lineTo(originX - perpX * ribbonHalfAtOrigin,  originY - perpY * ribbonHalfAtOrigin);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();

        // ── Scatter glow at contact point ────────────────────────────────────
        const scatterPulse = 0.6 + 0.4 * Math.sin(t * 0.02 + beamIndex * 1.1);
        const scatterRadiusA = earthR * 0.30;
        const scatterRadiusB = earthR * 0.16;

        ctx.save();
        ctx.translate(contactX, contactY);
        ctx.rotate(contactAngle + Math.PI / 2);
        const scatterGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scatterRadiusA);
        scatterGrad.addColorStop(0,    `hsla(35,100%,70%,${0.55 * scatterPulse})`);
        scatterGrad.addColorStop(0.35, `hsla(35,100%,65%,${0.28 * scatterPulse})`);
        scatterGrad.addColorStop(0.75, `hsla(30,90%,55%,${0.10 * scatterPulse})`);
        scatterGrad.addColorStop(1,    `hsla(25,80%,45%,0)`);
        ctx.scale(1, scatterRadiusB / scatterRadiusA);
        ctx.beginPath();
        ctx.arc(0, 0, scatterRadiusA, 0, Math.PI * 2);
        ctx.fillStyle = scatterGrad;
        ctx.fill();
        ctx.restore();

        // ── Channeling arc along the atmosphere (using earthToSunAngle base) ──
        const arcDrift = t * 0.008 + beam.phaseOffset;
        const arcStart = contactAngle + 0.05 + 0.12 * Math.sin(arcDrift * 0.6);
        const arcSpan  = 0.45 + 0.18 * Math.sin(arcDrift * 0.4 + 1.2);
        const arcEnd   = arcStart + arcSpan;
        const arcR     = atmoContactR;
        const arcAlpha = (0.18 + 0.12 * Math.sin(arcDrift)) * scatterPulse;

        ctx.save();
        ctx.beginPath();
        ctx.arc(earthXp, earthYp, arcR, arcStart, arcEnd);
        ctx.strokeStyle = `hsla(170,80%,65%,${arcAlpha})`;
        ctx.lineWidth = 1.8 + 1.2 * Math.sin(arcDrift * 0.7);
        ctx.shadowColor = "hsla(170,80%,65%,0.5)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
      });
      // ── End Solar Ray Atmosphere Impact Effect ────────────────────────────

      // ── Solar impact glow on atmosphere ───────────────────────────────────
      const impactAngle = Math.atan2(sunY - earthYp, sunX - earthXp);
      const impX = earthXp + Math.cos(impactAngle) * earthR;
      const impY = earthYp + Math.sin(impactAngle) * earthR;
      const impactGlow = ctx.createRadialGradient(impX, impY, 0, impX, impY, earthR * 0.9);
      const impPulse = 0.22 + 0.08 * Math.sin(t * 0.025);
      impactGlow.addColorStop(0, `rgba(255,200,60,${impPulse})`);
      impactGlow.addColorStop(0.4, `rgba(255,140,30,${impPulse * 0.4})`);
      impactGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = impactGlow;
      ctx.fillRect(0, 0, W, H);

      const { vehicles } = stateRef.current;

      // Increase for longer contrails, decrease for shorter ones.
      const TRAIL_LEN = VEHICLE_TRAIL_LEN;
      const CAM_ELEV = VEHICLE_CAM_ELEV;
      const ce = Math.cos(CAM_ELEV);
      const se = Math.sin(CAM_ELEV);

      // orb3D — compute screen position + depth for orbital angle `a`
      // World frame: X=right, Y=up, Z=toward viewer (pre-tilt)
      // Camera tilt rotates around X: new_screenY = wy*ce - wz*se
      //                               depth        = wy*se + wz*ce
      const orb3D = (v, a) => {
        const u  = v.orbitR * Math.cos(a);
        const vv = v.orbitR * Math.sin(a);
        const ci = Math.cos(v.inc), si = Math.sin(v.inc);
        const cl = Math.cos(v.lan), sl = Math.sin(v.lan);
        // world coords (X right, Y up, Z toward viewer)
        const wx = u * cl  - vv * si * sl;
        const wy = vv * ci;
        const wz = u * sl  + vv * si * cl;
        // apply camera elevation tilt (rotate world around X axis)
        const sy_world = wy * ce - wz * se;   // "up" on screen after tilt
        const sz       = wy * se + wz * ce;   // depth toward viewer after tilt
        return {
          sx: earthXp + wx,
          sy: earthYp - sy_world,  // canvas Y is down, so subtract
          sz,
        };
      };

      const project3D = (v) => orb3D(v, v.angle);

      // heading3D — analytical tangent direction in screen space
      // d(wx)/da = -sin(a)*cl - cos(a)*si*sl
      // d(wy)/da =  cos(a)*ci
      // d(wz)/da = -sin(a)*sl + cos(a)*si*cl
      // Then apply the same camera tilt to the derivative.
      const heading3D = (v) => {
        const a  = v.angle;
        const ci = Math.cos(v.inc), si = Math.sin(v.inc);
        const cl = Math.cos(v.lan), sl = Math.sin(v.lan);
        // analytical world-space velocity direction (unnormalised)
        const dwx = -Math.sin(a) * cl  - Math.cos(a) * si * sl;
        const dwy =  Math.cos(a) * ci;
        const dwz = -Math.sin(a) * sl  + Math.cos(a) * si * cl;
        // project through camera tilt
        const dsx =  dwx;
        const dsy =  dwy * ce - dwz * se;  // same rotation as position
        // screen tangent: (dsx right, -dsy down on canvas)
        return Math.atan2(-dsy, dsx);
      };

      // ── Step 1: Advance all orbits and push trail points ─────────────────
      // Do this before any drawing so trail data is fresh for both passes.
      vehicles.forEach((v) => {
        v.angle += v.angSpeed;
        const { sx, sy, sz } = project3D(v);
        v.trail.push({ sx, sy, sz });
        if (v.trail.length > TRAIL_LEN) v.trail.shift();
      });

      // ── Clipping helpers ─────────────────────────────────────────────────
      // clipOutsideEarth() — restrict drawing to the region OUTSIDE the Earth.
      // Used so that "behind" segments are hidden by the Earth disk.
      const clipOutsideEarth = () => {
        ctx.beginPath();
        // Large rectangle covering the whole canvas
        ctx.rect(0, 0, W, H);
        // Earth circle path wound in opposite direction = "hole" punch
        ctx.arc(earthXp, earthYp, earthR * 0.97, 0, Math.PI * 2, true); // CCW = hole
        ctx.clip("evenodd");
      };

      // isSegmentBehind(pt) — true when a trail point is geometrically behind
      // the Earth disk (negative depth AND inside the disk silhouette).
      const isSegmentBehind = (pt) => {
        if (pt.sz >= 0) return false;
        const dx = pt.sx - earthXp;
        const dy = pt.sy - earthYp;
        return (dx * dx + dy * dy) < (earthR * 0.97) * (earthR * 0.97);
      };

      // ── Step 2: Draw trails ───────────────────────────────────────────────
      // Each segment is drawn individually. Segments whose MIDPOINT is behind
      // Earth are clipped to outside the Earth disk, so they vanish cleanly.
      vehicles.forEach((v) => {
        if (!v.trail || v.trail.length < 2) return;
        const isPlane = v.type === "plane";

        for (let ti = 1; ti < v.trail.length; ti++) {
          const tp = v.trail[ti - 1];
          const tc = v.trail[ti];
          const frac = ti / v.trail.length; // 0=oldest→faint, 1=newest→bright

          const midBehind = isSegmentBehind(tc) || isSegmentBehind(tp);

          ctx.save();
          if (midBehind) {
            // Clip this segment to outside the Earth: it will be hidden where
            // it passes through the Earth disk, creating a natural occlusion.
            clipOutsideEarth();
          }

          const a = frac * (isPlane ? 0.70 : 0.55);
          ctx.beginPath();
          ctx.moveTo(tp.sx, tp.sy);
          ctx.lineTo(tc.sx, tc.sy);
          ctx.strokeStyle = isPlane
            ? `rgba(255,215,140,${a})`
            : `rgba(140,215,255,${a})`;
          ctx.lineWidth = isPlane ? 2.2 * frac + 0.4 : 1.6 * frac + 0.25;
          ctx.shadowColor = isPlane ? "rgba(255,190,90,0.7)" : "rgba(80,180,255,0.6)";
          ctx.shadowBlur  = isPlane ? 6 : 5;
          ctx.stroke();
          ctx.restore();
        }
      });

      // ── Step 3: Draw vehicles ─────────────────────────────────────────────
      // Behind-Earth vehicles are drawn with clipOutsideEarth() so they are
      // naturally occluded by the Earth disk — no sudden disappear.
      vehicles.forEach((v) => {
        const trail = v.trail;
        if (!trail.length) return;
        const last = trail[trail.length - 1];
        const { sx, sy, sz } = last;

        const depthN   = sz / v.orbitR;
        const behind   = isSegmentBehind(last);

        const scale     = 0.80 + depthN * 0.20;
        const baseAlpha = behind ? 0.0 : (0.50 + Math.max(depthN, 0) * 0.35);

        const headingAngle = heading3D(v);

        ctx.save();
        if (behind) {
          // Clip to outside Earth — vehicle is occluded by the Earth disk
          clipOutsideEarth();
        }
        ctx.translate(sx, sy);
        ctx.rotate(headingAngle);
        ctx.scale(scale, scale);

        if (v.type === "plane") {
          ctx.globalAlpha = baseAlpha;
          ctx.shadowColor = behind ? "transparent" : "rgba(230,210,160,0.7)";
          ctx.shadowBlur  = behind ? 0 : 6;

          ctx.fillStyle = "rgba(232,240,255,0.93)";
          ctx.beginPath();
          ctx.moveTo( 10,  0);
          ctx.lineTo(  6, -1.0);
          ctx.lineTo( -8, -1.5);
          ctx.lineTo(-10, -0.6);
          ctx.lineTo(-10,  0.6);
          ctx.lineTo( -8,  1.5);
          ctx.lineTo(  6,  1.0);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "rgba(210,228,255,0.82)";
          ctx.beginPath();
          ctx.moveTo( 2, -1.2);
          ctx.lineTo(-3, -1.2);
          ctx.lineTo(-7, -9.5);
          ctx.lineTo(-3, -9.0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo( 2,  1.2);
          ctx.lineTo(-3,  1.2);
          ctx.lineTo(-7,  9.5);
          ctx.lineTo(-3,  9.0);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "rgba(192,215,255,0.68)";
          ctx.beginPath();
          ctx.moveTo(-6.5, -0.8);
          ctx.lineTo(-9.0, -0.8);
          ctx.lineTo(-10.5, -4.2);
          ctx.lineTo(-8.5,  -4.0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-6.5,  0.8);
          ctx.lineTo(-9.0,  0.8);
          ctx.lineTo(-10.5,  4.2);
          ctx.lineTo(-8.5,   4.0);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "rgba(155,200,255,0.55)";
          ctx.fillRect(-1.0, -7.5, 3.8, 1.1);
          ctx.fillRect(-1.0,  6.4, 3.8, 1.1);

        } else {
          ctx.globalAlpha = behind ? 0.0 : (0.50 + Math.max(depthN, 0) * 0.30);
          ctx.shadowColor = behind ? "transparent" : "rgba(180,220,255,0.7)";
          ctx.shadowBlur  = behind ? 0 : 5;
          ctx.fillStyle = "rgba(200,225,255,0.85)";
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = "rgba(100,180,255,0.65)";
          ctx.fillRect(-14, -1.5, 10, 3);
          ctx.fillRect(  4, -1.5, 10, 3);
          ctx.fillStyle = "rgba(220,240,255,0.55)";
          ctx.fillRect(-0.5, -7, 1, 4);
        }

        ctx.restore();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // ── Subtle vignette ───────────────────────────────────────────────────
      const vignette = ctx.createRadialGradient(
        W * 0.5, H * 0.5, H * 0.2,
        W * 0.5, H * 0.5, H * 0.85
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vignette;
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
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}

export default CinematicBackground;
