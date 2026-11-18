export function createGlowSprite(size, innerColor, midColor, outerColor) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.4, midColor);
  grad.addColorStop(0.75, outerColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return off;
}

// 绘制深邃漆黑奇点 + 扭曲的琥珀金/极光紫双层引力透镜光子环
export function drawBlackHoleCore(ctx, cx, cy, p, elapsed) {
  // 随坍缩进度先扩张吞噬再急剧收束
  const swallowCurve = Math.sin(p * Math.PI * 0.85);
  const horizonR = Math.max(4, (35 + swallowCurve * 95) * (1 - Math.pow(p, 3) * 0.92));

  ctx.save();
  ctx.translate(cx, cy);

  // 1. 外围旋转电离星云旋臂（柔和丝滑，无锯齿线段）
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 3; arm++) {
    ctx.save();
    ctx.rotate((arm * Math.PI * 2) / 3 + elapsed * 0.005 * (1 + p * 2.5));
    const armGrad = ctx.createLinearGradient(0, 0, horizonR * 3.4, 0);
    armGrad.addColorStop(0, `rgba(252, 211, 77, ${0.45 * p})`);
    armGrad.addColorStop(0.45, `rgba(168, 85, 247, ${0.3 * p})`);
    armGrad.addColorStop(1, 'rgba(6, 5, 18, 0)');

    ctx.beginPath();
    ctx.ellipse(horizonR * 1.1, 0, horizonR * 2.2, horizonR * 0.55, 0.25, 0, Math.PI * 2);
    ctx.fillStyle = armGrad;
    ctx.fill();
    ctx.restore();
  }

  // 2. 引力透镜上下弯曲光弧（标志性黑洞立体视觉！）
  ctx.beginPath();
  ctx.ellipse(0, 0, horizonR * 2.35, horizonR * 0.42, -0.18 + p * 0.4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(253, 224, 71, ${0.4 + p * 0.6})`;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(252, 211, 77, 0.9)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, horizonR * 1.18, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(192, 132, 252, ${0.5 + p * 0.5})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 25;
  ctx.shadowColor = 'rgba(168, 85, 247, 0.95)';
  ctx.stroke();
  ctx.restore();

  // 3. 最核心：绝对漆黑的事件视界（吞噬一切光线，告别死白手电筒！）
  ctx.beginPath();
  ctx.arc(0, 0, horizonR, 0, Math.PI * 2);
  ctx.fillStyle = '#030208';
  ctx.fill();

  // 事件视界边缘一圈极细的白金光子刃
  ctx.beginPath();
  ctx.arc(0, 0, horizonR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + p * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}