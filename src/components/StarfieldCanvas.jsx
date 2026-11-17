import React, { useEffect, useRef } from 'react';

// 辅助函数：绘制带旋转角度的锐利四角星 (✦)
function drawFourPointStar(ctx, x, y, r, rotation, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  const inner = r * 0.28;
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const nextAngle = angle + Math.PI / 4;
    if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    ctx.lineTo(Math.cos(nextAngle) * inner, Math.sin(nextAngle) * inner);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  ctx.shadowBlur = 10;
  ctx.shadowColor = `rgba(${color}, ${alpha})`;
  ctx.fill();
  ctx.restore();
}

export default function StarfieldCanvas({ mouseRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
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

    const colors = ['167, 139, 250', '129, 140, 248', '252, 211, 77', '244, 114, 182'];
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      baseR: Math.random() * 1.4 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      baseAlpha: Math.random() * 0.4 + 0.15,
    }));

    let trail = [];
    let meteors = [];
    let bursts = [];
    let shockwaves = []; // 引力冲击波光环
    let lastPos = { x: -1000, y: -1000 };

    const handlePointerDown = (e) => {
      const { clientX: cx, clientY: cy } = e;

      // 1. 生成双层扩散光环（中心闪光 + 外扩星环）
      shockwaves.push({ x: cx, y: cy, r: 4, maxR: 130, alpha: 0.85, color: '252, 211, 77', lineWidth: 2 });
      shockwaves.push({ x: cx, y: cy, r: 2, maxR: 180, alpha: 0.6, color: '168, 85, 247', lineWidth: 1.2 });

      // 2. 生成 28 颗带运动拉丝尾巴 + 四角星芒的爆发粒子
      const count = 28;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
        const speed = Math.random() * 7 + 2.5;
        bursts.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 4 + 3,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.15,
          isStar: i % 3 === 0, // 三分之一为锐利四角星，其余为流线星尘
          alpha: 1,
          decay: Math.random() * 0.02 + 0.022,
          color: i % 2 === 0 ? '252, 211, 77' : '192, 132, 252',
        });
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my, active } = mouseRef.current;

      // 鼠标移动星尘拖尾
      if (active && Math.hypot(mx - lastPos.x, my - lastPos.y) > 4) {
        trail.push({
          x: mx + (Math.random() - 0.5) * 8,
          y: my + (Math.random() - 0.5) * 8,
          r: Math.random() * 2.2 + 1,
          alpha: 0.85,
          color: Math.random() > 0.35 ? '192, 132, 252' : '252, 211, 77',
        });
        lastPos = { x: mx, y: my };
      }

      // 偶发流星
      if (Math.random() < 0.008 && meteors.length < 2) {
        meteors.push({
          x: Math.random() * canvas.width * 1.2,
          y: -20,
          len: Math.random() * 90 + 60,
          speed: Math.random() * 7 + 6,
          alpha: 0.8,
        });
      }

      // 鼠标星云光晕
      if (active) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.24)');
        grad.addColorStop(0.45, 'rgba(99, 102, 241, 0.1)');
        grad.addColorStop(1, 'rgba(6, 5, 18, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 绘制鼠标拖尾
      trail = trail.filter((t) => t.alpha > 0.02);
      trail.forEach((t) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${t.color}, ${t.alpha})`;
        ctx.fill();
        t.alpha *= 0.92;
        t.r *= 0.96;
      });

      // 绘制点击扩散引力光环
      shockwaves = shockwaves.filter((sw) => sw.alpha > 0.02);
      shockwaves.forEach((sw) => {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sw.color}, ${sw.alpha})`;
        ctx.lineWidth = sw.lineWidth;
        ctx.stroke();
        sw.r += (sw.maxR - sw.r) * 0.12;
        sw.alpha *= 0.9;
      });

      // 绘制点击绽放星芒 + 拉丝尾迹
      bursts = bursts.filter((b) => b.alpha > 0.02);
      bursts.forEach((b) => {
        // 运动流线尾迹
        ctx.beginPath();
        ctx.moveTo(b.prevX, b.prevY);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${b.color}, ${b.alpha * 0.7})`;
        ctx.lineWidth = b.isStar ? 1.8 : 1.3;
        ctx.stroke();

        // 四角星或高亮星核
        if (b.isStar) {
          drawFourPointStar(ctx, b.x, b.y, b.r * 1.8, b.rotation, b.color, b.alpha);
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
          ctx.fill();
        }

        b.prevX = b.x;
        b.prevY = b.y;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.92;
        b.vy *= 0.92;
        b.rotation += b.vRot;
        b.alpha -= b.decay;
      });

      // 绘制流星
      meteors = meteors.filter((m) => m.alpha > 0.02 && m.y < canvas.height + 100);
      meteors.forEach((m) => {
        const tailX = m.x + m.len * 0.7;
        const tailY = m.y - m.len * 0.7;
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
        grad.addColorStop(0.4, `rgba(192, 132, 252, ${m.alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(192, 132, 252, 0)');

        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        m.x -= m.speed;
        m.y += m.speed;
        m.alpha *= 0.985;
      });

      // 绘制背景星尘与鼠标引力连线
      stars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        const dx = mx - s.x;
        const dy = my - s.y;
        const dist = Math.hypot(dx, dy);
        let alpha = s.baseAlpha;
        let radius = s.baseR;

        if (active && dist < 180) {
          const factor = 1 - dist / 180;
          alpha = Math.min(0.95, s.baseAlpha + factor * 0.7);
          radius = s.baseR + factor * 1.8;

          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(${s.color}, ${factor * 0.3})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          s.x += dx * 0.008 * factor;
          s.y += dy * 0.008 * factor;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animId);
    };
  }, [mouseRef]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}