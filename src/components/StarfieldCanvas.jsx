import React, { useEffect, useRef } from 'react';

function createSoftStarSprite(rgb, withSpikes = false) {
  const size = 128;
  const half = size / 2;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');

  const grad = octx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.12, `rgba(${rgb}, 0.85)`);
  grad.addColorStop(0.35, `rgba(${rgb}, 0.28)`);
  grad.addColorStop(0.7, `rgba(${rgb}, 0.05)`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  octx.fillStyle = grad;
  octx.fillRect(0, 0, size, size);

  if (withSpikes) {
    const spikeGradH = octx.createLinearGradient(0, half, size, half);
    spikeGradH.addColorStop(0, 'rgba(255,255,255,0)');
    spikeGradH.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    spikeGradH.addColorStop(1, 'rgba(255,255,255,0)');
    octx.fillStyle = spikeGradH;
    octx.beginPath();
    octx.ellipse(half, half, half * 0.95, 1.8, 0, 0, Math.PI * 2);
    octx.fill();

    const spikeGradV = octx.createLinearGradient(half, 0, half, size);
    spikeGradV.addColorStop(0, 'rgba(255,255,255,0)');
    spikeGradV.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    spikeGradV.addColorStop(1, 'rgba(255,255,255,0)');
    octx.fillStyle = spikeGradV;
    octx.beginPath();
    octx.ellipse(half, half, 1.8, half * 0.95, 0, 0, Math.PI * 2);
    octx.fill();
  }

  return off;
}

function drawSoftHaloWave(ctx, x, y, radius, thickness, rgb, alpha, squash = 0.35, tilt = -0.25) {
  if (alpha <= 0.005 || radius <= 2) return;
  const innerR = Math.max(0, radius - thickness);
  const outerR = radius + thickness;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1, squash);

  const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
  grad.addColorStop(0, `rgba(${rgb}, 0)`);
  grad.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.65})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.9})`);
  grad.addColorStop(0.55, `rgba(${rgb}, ${alpha * 0.65})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function StarfieldCanvas({
  mouseRef,
  stageRef,
  timingRef,
  selectedCoreRef,
  onSelectCore,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const sprites = {
      purpleDot: createSoftStarSprite('192, 132, 252', false),
      goldDot: createSoftStarSprite('253, 224, 71', false),
      whiteDot: createSoftStarSprite('255, 255, 255', false),
      purpleStar: createSoftStarSprite('192, 132, 252', true),
      goldStar: createSoftStarSprite('253, 224, 71', true),
      whiteStar: createSoftStarSprite('255, 255, 255', true),
    };

    const colors = ['167, 139, 250', '129, 140, 248', '252, 211, 77', '244, 114, 182'];
    const bgStars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      baseR: Math.random() * 1.3 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      color: colors[Math.floor(Math.random() * colors.length)],
      baseAlpha: Math.random() * 0.4 + 0.15,
    }));

    let particles = [];
    let haloWaves = [];
    let collapseStreaks = [];
    let morphProgress = 0;

    // 历史轨迹存储相对位移向量，切换参考系时拖尾丝滑跟随不断裂！
    let relHistory = [];
    let binaryInitialized = false;
    let collapseSpawned = false;

    // 参考系平滑插值权重：wA=1 表示以紫星为静止参考系，wB=1 表示以黄星为静止参考系
    let weightA = 0;
    let weightB = 0;
    let anchorShiftX = 0; // 选中星核后，把静止主星平滑移向屏幕黄金侧位，给弹出面板留出舞台

    // 实时记录两颗星核的屏幕坐标，供鼠标悬停/点击捕获判定
    const starScreenPos = {
      ax: -1000,
      ay: -1000,
      bx: -1000,
      by: -1000,
      hovered: null, // 'aster' | 'viikly' | null
    };

    const onPointerDown = (e) => {
      const { clientX: x, clientY: y } = e;

      // 如果在核心区点击了某颗星核，直接切换为该星核的静止引力参考系！
      if (stageRef.current === 'core') {
        const distA = Math.hypot(x - starScreenPos.ax, y - starScreenPos.ay);
        const distB = Math.hypot(x - starScreenPos.bx, y - starScreenPos.by);
        if (distA < 68 && distA <= distB) {
          onSelectCore(selectedCoreRef.current === 'aster' ? null : 'aster');
          haloWaves.push({ x: starScreenPos.ax, y: starScreenPos.ay, r: 10, maxR: 220, thickness: 40, speed: 0.12, alpha: 0.75, color: '192, 132, 252', squash: 0.45, tilt: -0.22 });
          return;
        }
        if (distB < 68 && distB < distA) {
          onSelectCore(selectedCoreRef.current === 'viikly' ? null : 'viikly');
          haloWaves.push({ x: starScreenPos.bx, y: starScreenPos.by, r: 10, maxR: 220, thickness: 40, speed: 0.12, alpha: 0.75, color: '253, 224, 71', squash: 0.45, tilt: -0.22 });
          return;
        }
      }

      // 日常点击星芒烟花
      for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3;
        const spd = Math.random() * 5 + 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: Math.random() * 18 + 10,
          alpha: 0.9,
          decay: 0.024,
          drag: 0.94,
          sprite: i % 3 === 0 ? sprites.goldStar : i % 2 === 0 ? sprites.goldDot : sprites.purpleDot,
        });
      }
    };
    window.addEventListener('pointerdown', onPointerDown);

    const render = (now) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);

      ctx.clearRect(0, 0, w, h);

      const curStage = stageRef.current;
      const selectedCore = selectedCoreRef.current; // 'aster' | 'viikly' | null
      const { x: mx, y: my, active: mActive, nx = 0, ny = 0 } = mouseRef.current;

      // 1. 鼠标柔和深空星云光晕
      if (mActive) {
        const mGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 270);
        mGrad.addColorStop(0, 'rgba(168, 85, 247, 0.17)');
        mGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.06)');
        mGrad.addColorStop(1, 'rgba(6, 5, 18, 0)');
        ctx.fillStyle = mGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. 背景微星群
      bgStars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (curStage === 'collapse') {
          s.x += (cx - s.x) * 0.045;
          s.y += (cy - s.y) * 0.045;
        }
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        if (s.y > h) s.y = 0;

        const dx = mx - s.x;
        const dy = my - s.y;
        const dist = Math.hypot(dx, dy);
        let alpha = s.baseAlpha;
        let radius = s.baseR;

        if (mActive && dist < 175) {
          const factor = 1 - dist / 175;
          alpha = Math.min(0.95, s.baseAlpha + factor * 0.65);
          radius = s.baseR + factor * 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(${s.color}, ${factor * 0.25})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          s.x += dx * 0.007 * factor;
          s.y += dy * 0.007 * factor;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
        ctx.fill();
      });

      // ==========================================================
      // 3. 原位背景星轨（跟随当前参考系中心平滑移动）
      // ==========================================================
      const isPostShooting = curStage === 'collapse' || curStage === 'burst' || curStage === 'core';
      const targetMorph = isPostShooting ? 1 : 0;
      morphProgress += (targetMorph - morphProgress) * 0.09;

      // 计算参考系锚点偏移：选中紫星时锚点左移，选中黄星时锚点右移，在另一侧弹出卡片！
      const targetShiftX =
        selectedCore === 'aster' ? -Math.min(w * 0.22, 260) : selectedCore === 'viikly' ? Math.min(w * 0.22, 260) : 0;
      anchorShiftX += (targetShiftX - anchorShiftX) * 0.07;

      const baseR1 = minDim * 0.265;
      const baseR2 = minDim * 0.365;
      const squash = 1 - morphProgress * 0.56;
      const tilt = -0.24 * morphProgress;

      ctx.save();
      ctx.translate(cx + anchorShiftX + nx * -10, cy + ny * -10);
      ctx.rotate(tilt);

      const ringAlpha1 = 0.24 * (1 - morphProgress * 0.65);
      ctx.beginPath();
      ctx.ellipse(0, 0, baseR1, baseR1 * squash, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(168, 85, 247, ${ringAlpha1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const ringAlpha2 = 0.14 * (1 - morphProgress * 0.65);
      ctx.beginPath();
      ctx.ellipse(0, 0, baseR2, baseR2 * squash, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(252, 211, 77, ${ringAlpha2})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (morphProgress < 0.4) {
        const satAlpha = 1 - morphProgress * 2.5;
        const a1 = now * 0.00045;
        const a2 = -now * 0.0003 + 1.8;
        ctx.globalAlpha = satAlpha;
        ctx.drawImage(sprites.goldDot, Math.cos(a1) * baseR1 - 10, Math.sin(a1) * baseR1 * squash - 10, 20, 20);
        ctx.drawImage(sprites.purpleDot, Math.cos(a2) * baseR2 - 9, Math.sin(a2) * baseR2 * squash - 9, 18, 18);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // ==========================================================
      // 4. 第一幕：纤细流光弧线划落 (0 ~ 620ms)
      // ==========================================================
      if (curStage === 'shooting') {
        binaryInitialized = false;
        collapseSpawned = false;
        relHistory = [];

        const p = Math.min(1, (now - timingRef.current.shootStart) / 620);
        const ease = p * p * (1.6 - 0.6 * p);

        const p0x = w * 0.88, p0y = h * 0.06;
        const p1x = w * 0.60, p1y = h * 0.22;
        const u = 1 - ease;
        const hx = u * u * p0x + 2 * u * ease * p1x + ease * ease * cx;
        const hy = u * u * p0y + 2 * u * ease * p1y + ease * ease * cy;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const samples = 28;
        for (let i = 0; i < samples; i++) {
          const fi = i / samples;
          const tS = Math.max(0, ease - fi * 0.24);
          const uS = 1 - tS;
          const sx = uS * uS * p0x + 2 * uS * tS * p1x + tS * tS * cx;
          const sy = uS * uS * p0y + 2 * uS * tS * p1y + tS * tS * cy;
          const sz = (1 - fi) * 26 + 4;
          ctx.globalAlpha = Math.pow(1 - fi, 1.8) * 0.65;
          ctx.drawImage(i < 8 ? sprites.goldDot : sprites.purpleDot, sx - sz / 2, sy - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites.whiteStar, hx - 32, hy - 32, 64, 64);
        ctx.restore();
      }

      // ==========================================================
      // 5. 第二幕：真·空气感宽银幕镜头眩光 + 错落流光雨破壳倒吸
      // ==========================================================
      if (curStage === 'collapse') {
        const elapsedMs = now - timingRef.current.collapseStart;
        const cp = Math.min(1, elapsedMs / 750);

        if (!collapseSpawned) {
          collapseSpawned = true;
          haloWaves.push({
            x: cx,
            y: cy,
            r: 20,
            maxR: maxDim * 0.78,
            thickness: 75,
            speed: 0.14,
            alpha: 0.65,
            color: '192, 132, 252',
            squash: 0.42,
            tilt: -0.24,
          });

          collapseStreaks = Array.from({ length: 85 }, (_, i) => ({
            angle: (Math.PI * 2 * i) / 85 + (Math.random() - 0.5) * 0.18,
            maxDist: Math.random() * maxDim * 0.48 + minDim * 0.1,
            streakLen: Math.random() * 130 + 40,
            width: Math.random() * 2.8 + 0.8,
            delay: Math.random() * 0.12,
            color: i % 3 === 0 ? '255, 255, 255' : i % 2 === 0 ? '253, 224, 71' : '192, 132, 252',
            hasStarHead: i % 5 === 0,
          }));
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const flareA = cp < 0.38 ? Math.pow(1 - cp / 0.38, 1.4) : Math.pow((cp - 0.38) / 0.62, 2.8);
        if (flareA > 0.02) {
          const drawSoftFlareStreak = (angle, len, thick, sprite, alpha) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, -len / 2, -thick * 1.8, len, thick * 3.6);
            ctx.drawImage(sprites.whiteDot, -len * 0.4, -thick * 0.45, len * 0.8, thick * 0.9);
            ctx.restore();
          };

          drawSoftFlareStreak(-0.08, w * (0.95 * flareA + 0.25), 28 * flareA + 6, sprites.purpleDot, flareA * 0.9);
          drawSoftFlareStreak(0.42, w * (0.55 * flareA + 0.15), 18 * flareA + 4, sprites.goldDot, flareA * 0.65);
        }

        collapseStreaks.forEach((st) => {
          const localCp = Math.max(0, Math.min(1, (cp - st.delay) / (1 - st.delay)));
          let posFactor, tailDir;
          if (localCp < 0.42) {
            const tOut = localCp / 0.42;
            posFactor = 1 - Math.pow(1 - tOut, 2.8);
            tailDir = -1;
          } else {
            const tIn = (localCp - 0.42) / 0.58;
            posFactor = Math.max(0.005, 1 - Math.pow(tIn, 2.4));
            tailDir = 1;
          }

          const headR = st.maxDist * posFactor;
          const curLen = st.streakLen * Math.sin(localCp * Math.PI);
          const tailR = Math.max(0, headR + tailDir * curLen);

          const hx = cx + Math.cos(st.angle) * headR;
          const hy = cy + Math.sin(st.angle) * headR;
          const tx = cx + Math.cos(st.angle) * tailR;
          const ty = cy + Math.sin(st.angle) * tailR;

          const stGrad = ctx.createLinearGradient(hx, hy, tx, ty);
          stGrad.addColorStop(0, `rgba(${st.color}, 0.92)`);
          stGrad.addColorStop(0.35, `rgba(${st.color}, 0.35)`);
          stGrad.addColorStop(1, `rgba(${st.color}, 0)`);

          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = stGrad;
          ctx.lineWidth = st.width;
          ctx.lineCap = 'round';
          ctx.stroke();

          if (st.hasStarHead && headR > 25) {
            ctx.globalAlpha = Math.sin(localCp * Math.PI);
            ctx.drawImage(sprites.whiteStar, hx - 14, hy - 14, 28, 28);
          }
        });

        ctx.globalAlpha = 1;
        const glowS = 180 + flareA * 240;
        ctx.drawImage(sprites.purpleDot, cx - glowS / 2, cy - glowS / 2, glowS, glowS);
        const centerStarS = 130 + flareA * 200;
        ctx.drawImage(sprites.whiteStar, cx - centerStarS / 2, cy - centerStarS / 2, centerStarS, centerStarS);
        ctx.restore();
      }

      // ==========================================================
      // 6. 第三幕：伽利略引力参考系切换 + 开普勒高偏心率双子星！
      // ==========================================================
      const isPostBurst = curStage === 'burst' || curStage === 'core';
      if (isPostBurst) {
        const postSec = (now - timingRef.current.burstStart) * 0.001;

        if (!binaryInitialized) {
          binaryInitialized = true;
          haloWaves.push({ x: cx, y: cy, r: 15, maxR: maxDim * 0.78, thickness: 55, speed: 0.07, alpha: 0.65, color: '253, 224, 71', squash: 0.38, tilt: -0.22 });
          haloWaves.push({ x: cx, y: cy, r: 10, maxR: maxDim * 0.60, thickness: 45, speed: 0.06, alpha: 0.55, color: '192, 132, 252', squash: 0.38, tilt: -0.22 });

          for (let i = 0; i < 95; i++) {
            const ang = (Math.PI * 2 * i) / 95 + (Math.random() - 0.5) * 0.2;
            const spd = Math.random() * 15 + 3;
            particles.push({
              x: cx,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd * 0.6,
              size: Math.random() * 24 + 10,
              alpha: 0.95,
              decay: Math.random() * 0.014 + 0.01,
              drag: 0.95,
              sprite: i % 4 === 0 ? sprites.whiteStar : i % 2 === 0 ? sprites.goldDot : sprites.purpleDot,
            });
          }
        }

        // 平滑插值伽利略参考系权重：
        // - 未选中 (null)：weightA = 0, weightB = 0（质心参考系，双星对称绕转）
        // - 选中紫星 ('aster')：weightA -> 1, weightB -> 0（紫星定格不动，黄星以 1.65 倍相对椭圆跨度绕紫星加速靠近、减速远离！）
        // - 选中黄星 ('viikly')：weightA -> 0, weightB -> 1（黄星定格不动，紫星以 1.65 倍相对椭圆跨度绕黄星加速靠近、减速远离！）
        const targetWA = selectedCore === 'aster' ? 1 : 0;
        const targetWB = selectedCore === 'viikly' ? 1 : 0;
        weightA += (targetWA - weightA) * 0.08;
        weightB += (targetWB - weightB) * 0.08;

        const unfold = 1 - Math.exp(-postSec * 1.8);

        const e = 0.72;
        const M = postSec * 2.05;
        let E = M + e * Math.sin(M) + 0.5 * e * e * Math.sin(2 * M);
        for (let iter = 0; iter < 2; iter++) {
          E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        }

        const a = minDim * 0.175 * unfold;
        const b = a * Math.sqrt(1 - e * e);
        const orbX = a * (Math.cos(E) - e);
        const orbY = b * Math.sin(E);

        const precession = postSec * 0.26 + 0.35;
        const cp = Math.cos(precession), sp = Math.sin(precession);
        const planeX = orbX * cp - orbY * sp;
        const planeZ = orbX * sp + orbY * cp;

        const normZ = Math.max(-1, Math.min(1, planeZ / (a * 1.8 + 1)));
        const tiltAngle = -0.22;
        const cs = Math.cos(tiltAngle), sn = Math.sin(tiltAngle);

        // 基础单星位移矢量 R (2D 屏幕投影)
        const baseDx = planeX * cs - planeZ * 0.48 * sn;
        const baseDy = planeX * sn + planeZ * 0.48 * cs;

        // 记录历史基础位移矢量（用于实时合成任意参考系下的丝滑拖尾！）
        relHistory.unshift({ dx: baseDx, dy: baseDy, z: normZ });
        if (relHistory.length > 42) relHistory.pop();

        // 核心伽利略参考系变换公式：
        // 当 weightB = 1 (选中黄星) 时：factorB = 0 (黄星完全静止！)，factorA = 1.65 (紫星围绕黄星做完整的开普勒加减速运动！)
        // 当 weightA = 1 (选中紫星) 时：factorA = 0 (紫星完全静止！)，factorB = -1.65 (黄星围绕紫星做完整的开普勒加减速运动！)
        const factorA = (1 - weightA) + 0.65 * weightB;
        const factorB = -(1 - weightB) - 0.65 * weightA;

        const originX = cx + anchorShiftX + nx * -12;
        const originY = cy + ny * -12;

        const starAx = originX + baseDx * factorA;
        const starAy = originY + baseDy * factorA;
        const starBx = originX + baseDx * factorB;
        const starBy = originY + baseDy * factorB;

        starScreenPos.ax = starAx;
        starScreenPos.ay = starAy;
        starScreenPos.bx = starBx;
        starScreenPos.by = starBy;

        // 检测鼠标是否悬停在某颗星核上（改变鼠标手势并给出捕获光圈提示）
        const distMouseA = Math.hypot(mx - starAx, my - starAy);
        const distMouseB = Math.hypot(mx - starBx, my - starBy);
        if (curStage === 'core' && (distMouseA < 60 || distMouseB < 60)) {
          document.body.style.cursor = 'pointer';
          starScreenPos.hovered = distMouseA <= distMouseB ? 'aster' : 'viikly';
        } else {
          document.body.style.cursor = 'default';
          starScreenPos.hovered = null;
        }

        // 伴生细微闪烁星粉（仅运动中的星核大量抛洒，静止主星优雅呼吸）
        if (Math.random() > 0.25) {
          particles.push({
            x: starAx + (Math.random() - 0.5) * 8,
            y: starAy + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: Math.random() * 12 + 6,
            alpha: 0.65,
            decay: 0.018,
            drag: 0.98,
            sprite: sprites.purpleDot,
          });
          particles.push({
            x: starBx + (Math.random() - 0.5) * 8,
            y: starBy + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: Math.random() * 12 + 6,
            alpha: 0.65,
            decay: 0.018,
            drag: 0.98,
            sprite: sprites.goldDot,
          });
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. 绘制随当前参考系实时变换的丝绸流光拖尾（静止主星拖尾自动收拢为光晕，运动伴星拖出长长的开普勒彗尾！）
        const drawFrameTrail = (factor, rgb) => {
          if (Math.abs(factor) < 0.03) return; // 已定格为静止参考系主星，不画尾巴
          for (let i = 0; i < relHistory.length - 1; i++) {
            const ratio = 1 - i / relHistory.length;
            const h1 = relHistory[i];
            const h2 = relHistory[i + 1];
            ctx.beginPath();
            ctx.moveTo(originX + h1.dx * factor, originY + h1.dy * factor);
            ctx.lineTo(originX + h2.dx * factor, originY + h2.dy * factor);
            ctx.strokeStyle = `rgba(${rgb}, ${Math.pow(ratio, 2.2) * 0.68 * Math.min(1, Math.abs(factor))})`;
            ctx.lineWidth = Math.pow(ratio, 1.4) * 7.8;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        };
        drawFrameTrail(factorA, '192, 132, 252');
        drawFrameTrail(factorB, '253, 224, 71');

        // 2. 近星点贴脸擦肩瞬间：运动伴星高速掠过静止主星身旁时，激发出强烈的引力潮汐电弧！
        const distAB = Math.hypot(starAx - starBx, starAy - starBy);
        if (distAB < 120 && postSec > 0.3) {
          const slingSpark = Math.pow(1 - distAB / 120, 1.5);
          ctx.beginPath();
          ctx.moveTo(starAx, starAy);
          ctx.lineTo(starBx, starBy);
          ctx.strokeStyle = `rgba(255, 255, 255, ${slingSpark * 0.92})`;
          ctx.lineWidth = 1.5 + slingSpark * 2.8;
          ctx.stroke();

          const midX = (starAx + starBx) / 2;
          const midY = (starAy + starBy) / 2;
          const flareS = 50 * slingSpark;
          ctx.drawImage(sprites.whiteStar, midX - flareS / 2, midY - flareS / 2, flareS, flareS);
        }

        // 3. 绘制双子星核本体与参考系锁定光环
        const isHoverA = starScreenPos.hovered === 'aster' || selectedCore === 'aster';
        const isHoverB = starScreenPos.hovered === 'viikly' || selectedCore === 'viikly';

        const zA = normZ * (1 - weightA);
        const zB = -normZ * (1 - weightB);
        const sizeA = (84 + 18 * zA) * (selectedCore === 'aster' ? 1.48 : isHoverA ? 1.25 : 1);
        const sizeB = (84 + 18 * zB) * (selectedCore === 'viikly' ? 1.48 : isHoverB ? 1.25 : 1);

        // 被锁定为参考系主星时，周围浮现一层柔和的恒星引力锚定光晕
        if (weightA > 0.05) {
          drawSoftHaloWave(ctx, starAx, starAy, 46 * weightA, 18, '192, 132, 252', weightA * 0.45, 1, 0);
        }
        if (weightB > 0.05) {
          drawSoftHaloWave(ctx, starBx, starBy, 46 * weightB, 18, '253, 224, 71', weightB * 0.45, 1, 0);
        }

        ctx.drawImage(sprites.purpleStar, starAx - sizeA / 2, starAy - sizeA / 2, sizeA, sizeA);
        ctx.drawImage(sprites.goldStar, starBx - sizeB / 2, starBy - sizeB / 2, sizeB, sizeB);

        // 4. 在未选中任何星核时，在两颗星核下方显示轻盈的随动星标名，引导用户点击捕获！
        if (curStage === 'core' && !selectedCore && postSec > 0.6) {
          ctx.font = "500 11px 'JetBrains Mono', monospace";
          ctx.textAlign = 'center';
          ctx.fillStyle = isHoverA ? 'rgba(243, 232, 255, 0.95)' : 'rgba(216, 180, 254, 0.55)';
          ctx.fillText('✦ ASTER [CLICK]', starAx, starAy + 36);

          ctx.fillStyle = isHoverB ? 'rgba(254, 249, 195, 0.95)' : 'rgba(253, 224, 71, 0.55)';
          ctx.fillText('✦ VIIKLY [CLICK]', starBx, starBy + 36);
        }

        ctx.restore();
      }

      // 7. 统一渲染柔光气浪环与羽化星尘精灵
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      haloWaves = haloWaves.filter((hw) => hw.alpha > 0.008);
      haloWaves.forEach((hw) => {
        drawSoftHaloWave(ctx, hw.x, hw.y, hw.r, hw.thickness, hw.color, hw.alpha, hw.squash, hw.tilt);
        hw.r += (hw.maxR - hw.r) * hw.speed;
        hw.alpha *= 0.94;
      });

      particles = particles.filter((pt) => pt.alpha > 0.015);
      particles.forEach((pt) => {
        ctx.globalAlpha = pt.alpha;
        ctx.drawImage(pt.sprite, pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= pt.drag;
        pt.vy *= pt.drag;
        pt.alpha -= pt.decay;
      });
      ctx.globalAlpha = 1;

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      document.body.style.cursor = 'default';
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animId);
    };
  }, [mouseRef, stageRef, timingRef, selectedCoreRef, onSelectCore]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-screen h-screen pointer-events-none z-[1]" />;
}