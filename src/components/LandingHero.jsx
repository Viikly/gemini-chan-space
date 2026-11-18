import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { GEMINI_CONFIG } from '../config/geminiConfig';

export default function LandingHero({ parallax, stage, onEnter, onTriggerPulse }) {
  // stage: 'idle' | 'shooting' | 'collapse' | 'burst'
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });
  const [eggIndex, setEggIndex] = useState(0);
  const btnRef = useRef(null);

  const handleBtnMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setBtnOffset({
      x: (e.clientX - (rect.left + rect.width / 2)) * 0.22,
      y: (e.clientY - (rect.top + rect.height / 2)) * 0.22,
    });
  };

  const handleBadgeClick = (e) => {
    e.stopPropagation();
    setEggIndex((prev) => (prev + 1) % GEMINI_CONFIG.easterEggs.length);
    if (onTriggerPulse) onTriggerPulse();
  };

  const isCollapse = stage === 'collapse';
  const isBurst = stage === 'burst';

  // 舞台物理反馈：撞击瞬间先向外猛震扩张，随后被奇点一把倒吸坍缩！
  let stageStyle = {};
  if (isCollapse) {
    stageStyle = {
      animation: 'impactThenCollapse 750ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
    };
  } else if (isBurst) {
    stageStyle = {
      transform: 'scale(0)',
      opacity: 0,
      transition: 'all 150ms ease-out',
    };
  } else {
    stageStyle = {
      transform: 'scale(1)',
      opacity: 1,
      transition: 'all 500ms ease-out',
    };
  }

  return (
    <main
      style={stageStyle}
      className={`relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-6 text-center origin-center ${
        stage !== 'idle' ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      <style>{`
        @keyframes impactThenCollapse {
          0% { transform: scale(1); filter: brightness(1) blur(0px); opacity: 1; }
          28% { transform: scale(1.16); filter: brightness(2.2) blur(1px); opacity: 0.95; }
          45% { transform: scale(1.12); filter: brightness(1.6) blur(2px); opacity: 0.85; }
          100% { transform: scale(0.04) rotate(-8deg); filter: brightness(3) blur(8px); opacity: 0; }
        }
      `}</style>
      
      {/* 顶部彩蛋胶囊 */}
      <button
        onClick={handleBadgeClick}
        className="animate-reveal-1 animate-float inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-purple-500/15 border border-purple-400/25 hover:border-amber-300/40 text-xs text-purple-200 mb-7 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
        <span className="tracking-widest font-mono-tech">{GEMINI_CONFIG.easterEggs[eggIndex]}</span>
      </button>

      {/* Ma Shan Zheng 大标题 */}
      <h1
        style={{ transform: `translate(${parallax.x * -0.25}px, ${parallax.y * -0.25}px)` }}
        className="animate-reveal-2 font-serif-title text-4xl sm:text-6xl md:text-7xl tracking-[0.08em] pl-[0.08em] mb-7 leading-tight bg-gradient-to-b from-white via-purple-100 to-purple-300/80 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(168,85,247,0.28)] transition-transform duration-200 ease-out"
      >
        {GEMINI_CONFIG.heroTitle}
      </h1>

      {/* 欢迎台词 */}
      <p className="animate-reveal-3 max-w-xl text-sm sm:text-base text-slate-300/85 leading-relaxed mb-12 font-light tracking-wide">
        {GEMINI_CONFIG.welcomeLines[0]}
        <br className="hidden sm:inline" />
        {GEMINI_CONFIG.welcomeLines[1]}
      </p>

      {/* 磁吸流光按钮 */}
      <div className="animate-reveal-4 relative group">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 opacity-40 group-hover:opacity-95 blur-md transition duration-500" />
        <button
          ref={btnRef}
          onMouseMove={handleBtnMove}
          onMouseLeave={() => setBtnOffset({ x: 0, y: 0 })}
          onClick={onEnter}
          style={{ transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)` }}
          className="relative overflow-hidden flex items-center gap-3 px-9 py-4 rounded-full bg-[#0c0a1d] border border-purple-300/30 group-hover:border-amber-300/60 text-sm font-medium text-white tracking-[0.22em] pl-[calc(2.25rem+0.22em)] transition-all duration-200 ease-out cursor-pointer"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span>踏入星穹</span>
          <ArrowRight className="w-4 h-4 text-amber-300 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>
      </div>

      {/* 底部轻提示 */}
      <button
        onClick={onEnter}
        className="absolute bottom-7 flex flex-col items-center gap-2 text-[10px] text-slate-400/70 hover:text-purple-200 tracking-[0.25em] pl-[0.25em] font-mono-tech transition-all duration-300 cursor-pointer"
      >
        <span>CLICK OR SCROLL TO AWAKEN BINARY CORES</span>
        <div className="w-[1px] h-6 bg-gradient-to-b from-purple-400/70 to-transparent animate-pulse" />
      </button>
    </main>
  );
}