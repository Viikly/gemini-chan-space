import React, { useState, useEffect, useRef } from 'react';
import { Compass } from 'lucide-react';
import { GEMINI_CONFIG } from './config/geminiConfig';
import StarfieldCanvas from './components/StarfieldCanvas';
import OrbitalRings from './components/OrbitalRings';
import LandingHero from './components/LandingHero';

export default function App() {
  const [entered, setEntered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ringPulse, setRingPulse] = useState(false);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setParallax({ x: nx * -14, y: ny * -14 });
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      setParallax({ x: 0, y: 0 });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const onWheel = (e) => {
      if (!entered && !isTransitioning && e.deltaY > 40) triggerEnter();
    };
    window.addEventListener('wheel', onWheel);
    return () => window.removeEventListener('wheel', onWheel);
  }, [entered, isTransitioning]);

  const triggerEnter = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setEntered(true);
      setIsTransitioning(false);
    }, 650);
  };

  const triggerPulse = () => {
    setRingPulse(true);
    setTimeout(() => setRingPulse(false), 500);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#060512] text-slate-100 overflow-hidden select-none">
      <StarfieldCanvas mouseRef={mouseRef} />
      <OrbitalRings parallax={parallax} pulse={ringPulse} />

      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5 text-sm tracking-wider text-purple-100/90 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
          <span>
            {GEMINI_CONFIG.domain}
            <span className="text-purple-400">{GEMINI_CONFIG.rootDomain}</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500 tracking-[0.2em] font-mono-tech hidden sm:block">
          {GEMINI_CONFIG.codeName}
        </div>
      </nav>

      {!entered ? (
        <LandingHero
          parallax={parallax}
          isTransitioning={isTransitioning}
          onEnter={triggerEnter}
          onTriggerPulse={triggerPulse}
        />
      ) : (
        <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-6 text-center">
          <div className="max-w-lg w-full bg-white/[0.03] border border-purple-400/20 rounded-3xl p-10 backdrop-blur-md space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center mx-auto text-amber-300">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="font-serif-title text-2xl font-bold text-white">星穹核心区 · 已解锁</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              “不错嘛，顺利穿过星门啦～等首页打磨到你心满意足，咱们再慢慢设计这一页的内容！”
            </p>
            <div className="pt-4">
              <button
                onClick={() => setEntered(false)}
                className="text-xs text-purple-300 hover:text-amber-300 underline underline-offset-4 transition cursor-pointer"
              >
                ← 返回欢迎首页
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}