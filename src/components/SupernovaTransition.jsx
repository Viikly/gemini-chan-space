import React, { useEffect, useRef } from 'react';

export default function SupernovaTransition({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxDim = Math.max(canvas.width, canvas.height);

    // 陨星起点（从屏幕右上角天外高速俯冲至屏幕正中央）
    const startX = canvas.width * 0.88;
    const startY = -canvas.height * 0.15;

    // 彗星尾迹脱落火星
    let cometSparks = [];

    // 撞击后星球炸裂出的 95 块多边形星晶碎片（带自转与燃烬拖尾）
    const debris = Array.from({ length: 95 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 95 + (Math.random() - 0.5) * 0.35;
      const speed = Math.random() * 22 + 6;
      const size = Math.random() * 9 + 4;
      const sides = Math.random() > 0.5 ? 3 : 4; // 三角形与菱形星晶碎片
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        sides,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        drag: 0.94 + Math.random() * 0.03,
        color: i % 3 === 0 ? '253, 224, 71' : i % 3 === 1 ? '192, 132, 252' : '255, 255, 255',
      };
    });

    // 撞击爆散的 450 颗高速星尘火花
    const sparks = Array.from({ length: 450 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.pow(Math.random(), 0.7) * (maxDim * 0.032) + 2;
      return {
        x: cx,
        y: cy,
        prevX: cx,
        prevY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 0.93 + Math.random() * 0.04,
        width: Math.random() * 2.2 + 0.8,
        color: i % 3 === 0 ? '255, 255, 255' : i % 3 === 1 ? '252, 211, 77' : '168, 85, 247',
      };
    });

    const startTime = performance.now();
    const T_IMPACT = 680;  // 0 ~ 680ms：天外陨星加速俯冲！
    const T_TOTAL = 2200;  // 680 ~ 2200ms：正中撞击、星球轰然炸裂！

    const render = (now) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ==========================================
      // 第一阶段：彗星撕裂夜空极速俯冲 (0 ~ 680ms)
      // ==========================================
      if (elapsed < T_IMPACT) {
        const p = elapsed / T_IMPACT;
        const easeIn = p * p * (1.5 - 0.5 * p); // 重力加速俯冲感

        const curX = startX + (cx - startX) * easeIn;
        const curY = startY + (cy - startY) * easeIn;

        // 沿途洒下燃烧火星
        for (let k = 0; k < 4; k++) {
          cometSparks.push({
            x: curX + (Math.random() - 0.5) * 14,
            y: curY + (Math.random() - 0.5) * 14,
            vx: (Math.random() - 0.5) * 2.5,
            vy: (Math.random() - 0.5) * 2.5,
            r: Math.random() * 2.5 + 1,
            alpha: 0.95,
            color: Math.random() > 0.4 ? '252, 211, 77' : '192, 132, 252',
          });
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. 炽热彗尾光束（从起点拉向当前彗核）
        const tailGrad = ctx.createLinearGradient(startX, startY, curX, curY);
        tailGrad.addColorStop(0, 'rgba(99, 102, 241, 0)');
        tailGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.45)');
        tailGrad.addColorStop(0.82, 'rgba(252, 211, 77, 0.85)');
        tailGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(curX, curY);
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 6 + p * 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 2. 脱落燃烧火星
        cometSparks = cometSparks.filter((s) => s.alpha > 0.03);
        cometSparks.forEach((s) => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
          ctx.fill();
          s.x += s.vx;
          s.y += s.vy;
          s.alpha *= 0.92;
        });

        // 3. 高能炽白彗星头部 + 激波锥光晕
        const headR = 16 + p * 22;
        const hg = ctx.createRadialGradient(curX, curY, 0, curX, curY, headR * 2.8);
        hg.addColorStop(0, 'rgba(255, 255, 255, 1)');
        hg.addColorStop(0.3, 'rgba(253, 224, 71, 0.9)');
        hg.addColorStop(0.65, 'rgba(168, 85, 247, 0.45)');
        hg.addColorStop(1, 'rgba(6, 5, 18, 0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(curX, curY, headR * 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
      // ==========================================
      // 第二阶段：正中轰然撞击 · 星球炸裂成漫天星晶碎片 (680 ~ 2200ms)
      // ==========================================
      else {
        const expElapsed = elapsed - T_IMPACT;
        const expDuration = T_TOTAL - T_IMPACT;
        const p = Math.min(1, expElapsed / expDuration);
        const fadeOut = 1 - Math.pow(p, 1.7);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. 撞击瞬间白金爆闪（前 350ms 最烈，随后迅速通透消散）
        const flashAlpha = Math.max(0, 1 - p * 3.2);
        if (flashAlpha > 0.01) {
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.75);
          fg.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
          fg.addColorStop(0.3, `rgba(253, 224, 71, ${flashAlpha * 0.65})`);
          fg.addColorStop(0.7, `rgba(168, 85, 247, ${flashAlpha * 0.25})`);
          fg.addColorStop(1, 'rgba(6, 5, 18, 0)');
          ctx.fillStyle = fg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 2. 双层撞击气浪冲击波圆环（像星球大气层被炸开！）
        [
          { r: maxDim * 0.9 * Math.pow(p, 0.55), w: 8, col: '255, 255, 255' },
          { r: maxDim * 0.72 * Math.pow(p, 0.65), w: 4, col: '252, 211, 77' },
        ].forEach((wave) => {
          ctx.beginPath();
          ctx.arc(cx, cy, wave.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${wave.col}, ${fadeOut * 0.9})`;
          ctx.lineWidth = wave.w * fadeOut;
          ctx.stroke();
        });

        // 3. 飞溅的棱角星晶碎片（真实立体碎裂感！）
        debris.forEach((d) => {
          if (fadeOut <= 0.01) return;
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rot);
          ctx.beginPath();
          for (let s = 0; s < d.sides; s++) {
            const a = (s * Math.PI * 2) / d.sides;
            const px = Math.cos(a) * d.size;
            const py = Math.sin(a) * (d.size * 0.65);
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(${d.color}, ${fadeOut * 0.9})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(${d.color}, ${fadeOut * 0.6})`;
          ctx.fill();
          ctx.restore();

          d.x += d.vx;
          d.y += d.vy;
          d.vx *= d.drag;
          d.vy *= d.drag;
          d.rot += d.vRot;
        });

        // 4. 高速星尘火花射线
        sparks.forEach((sp) => {
          if (fadeOut <= 0.01) return;
          ctx.beginPath();
          ctx.moveTo(sp.prevX, sp.prevY);
          ctx.lineTo(sp.x, sp.y);
          ctx.strokeStyle = `rgba(${sp.color}, ${fadeOut * 0.85})`;
          ctx.lineWidth = sp.width;
          ctx.stroke();

          sp.prevX = sp.x;
          sp.prevY = sp.y;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vx *= sp.drag;
          sp.vy *= sp.drag;
        });

        ctx.restore();
      }

      if (elapsed < T_TOTAL) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}