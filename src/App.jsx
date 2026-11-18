import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, Terminal, RotateCcw, ArrowUpRight, Orbit } from 'lucide-react';
import { GEMINI_CONFIG } from './config/geminiConfig';
import StarfieldCanvas from './components/StarfieldCanvas';
import LandingHero from './components/LandingHero';

export default function App() {
  const [stage, setStage] = useState('idle');
  const [selectedCore, setSelectedCore] = useState(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const stageRef = useRef('idle');
  const selectedCoreRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false, nx: 0, ny: 0 });
  const timingRef = useRef({ shootStart: 0, collapseStart: 0, burstStart: 0 });
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const handleSelectCore = useCallback((core) => {
    selectedCoreRef.current = core;
    setSelectedCore(core);
  }, []);

  const triggerEnter = useCallback(() => {
    if (stageRef.current !== 'idle') return;
    clearTimers();
    const now = performance.now();
    timingRef.current.shootStart = now;
    stageRef.current = 'shooting';
    setStage('shooting');

    const t1 = setTimeout(() => {
      timingRef.current.collapseStart = performance.now();
      stageRef.current = 'collapse';
      setStage('collapse');
    }, 620);

    const t2 = setTimeout(() => {
      timingRef.current.burstStart = performance.now();
      stageRef.current = 'burst';
      setStage('burst');
    }, 1370);

    const t3 = setTimeout(() => {
      stageRef.current = 'core';
      setStage('core');
    }, 1950);

    timersRef.current = [t1, t2, t3];
  }, []);

  const handleReset = useCallback(() => {
    clearTimers();
    stageRef.current = 'idle';
    setStage('idle');
    handleSelectCore(null);
  }, [handleSelectCore]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true, nx, ny };
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
      if (stageRef.current === 'idle' && e.deltaY > 40) triggerEnter();
    };
    const onKeyDown = (e) => {
      if (stageRef.current === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        triggerEnter();
      } else if (stageRef.current === 'core' && e.key === 'Escape') {
        if (selectedCoreRef.current) {
          handleSelectCore(null);
        } else {
          handleReset();
        }
      }
    };
    window.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [triggerEnter, handleReset, handleSelectCore]);

  return (
    <div
      className={`relative min-h-screen w-full bg-[#060512] text-slate-100 overflow-hidden select-none transition-transform duration-150 ${
        stage === 'burst' ? 'scale-[1.035]' : 'scale-100'
      }`}
    >
      <StarfieldCanvas
        mouseRef={mouseRef}
        stageRef={stageRef}
        timingRef={timingRef}
        selectedCoreRef={selectedCoreRef}
        onSelectCore={handleSelectCore}
      />

      {/* 顶部星穹状态栏 */}
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

      {stage !== 'core' ? (
        <LandingHero parallax={parallax} stage={stage} onEnter={triggerEnter} />
      ) : (
        /* 星穹核心区：未选中星核时 0 卡片遮挡，只有纯线条天文取景器；选中后才真正弹出全息大面板！ */
        <section className="relative z-10 flex flex-col justify-between min-h-[calc(100vh-88px)] max-w-6xl mx-auto px-6 sm:px-10 pb-8 pointer-events-none animate-[fadeIn_0.7s_ease-out]">
          {/* 顶部参考系状态切换胶囊 */}
          <div className="flex flex-col items-center gap-2.5 mt-1 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-white/[0.03] border border-purple-400/20 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.12)]">
              <button
                onClick={() => handleSelectCore('aster')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer ${
                  selectedCore === 'aster'
                    ? 'bg-purple-500/30 text-purple-100 border border-purple-300/60 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'text-slate-400 hover:text-purple-200'
                }`}
              >
                ✦ ASTER 参考系 (紫星锚定)
              </button>

              <button
                onClick={() => handleSelectCore(null)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCore === null
                    ? 'bg-white/10 text-white border border-white/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Orbit className="w-3.5 h-3.5 text-amber-300" />
                <span>质心自由共舞</span>
              </button>

              <button
                onClick={() => handleSelectCore('viikly')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer ${
                  selectedCore === 'viikly'
                    ? 'bg-amber-400/25 text-amber-100 border border-amber-300/60 shadow-[0_0_20px_rgba(252,211,77,0.35)]'
                    : 'text-slate-400 hover:text-amber-200'
                }`}
              >
                ✦ VIIKLY 参考系 (黄星锚定)
              </button>
            </div>
          </div>

          {/* 中央区域：平时只有两侧极细的望远镜标尺刻度（无任何卡片盒子！），点击星核后才轰然展开面板 */}
          <div className="relative flex items-center justify-between my-auto min-h-[340px]">
            {selectedCore === null && (
              <>
                {/* 左侧纯线条天文望远镜垂直标尺（无背景框、不剧透卡片！） */}
                <div className="hidden lg:flex flex-col items-start gap-3 opacity-45">
                  <div className="w-3 h-[1px] bg-purple-400" />
                  <div className="h-28 border-l border-dashed border-purple-400/40 pl-3 flex flex-col justify-between text-[10px] font-mono-tech text-purple-200/70 tracking-[0.2em]">
                    <span>RA 04h 22m</span>
                    <span className="text-amber-300/80">✦ CLICK STAR TO LOCK</span>
                    <span>DEC +16° 30&apos;</span>
                  </div>
                  <div className="w-3 h-[1px] bg-purple-400" />
                </div>

                {/* 右侧纯线条天文望远镜垂直标尺 */}
                <div className="hidden lg:flex flex-col items-end gap-3 opacity-45 ml-auto">
                  <div className="w-3 h-[1px] bg-amber-300" />
                  <div className="h-28 border-r border-dashed border-amber-300/40 pr-3 flex flex-col justify-between items-end text-[10px] font-mono-tech text-amber-200/70 tracking-[0.2em]">
                    <span>SYS · GEMINI-IV</span>
                    <span className="text-purple-300/80">KEPLER 2-BODY ✦</span>
                    <span>EPOCH J2026.9</span>
                  </div>
                  <div className="w-3 h-[1px] bg-amber-300" />
                </div>
              </>
            )}

            {/* 只有当真正点中紫星 (Aster) 时，才从无到有弹出灵感观测台！ */}
            {selectedCore === 'aster' && (
              <div
                key="aster-panel"
                style={{ animation: 'holoPopRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                className="pointer-events-auto ml-auto md:mr-10 w-full max-w-md p-8 rounded-3xl bg-[#0d0a22]/80 border border-purple-300/50 backdrop-blur-2xl shadow-[0_0_70px_rgba(168,85,247,0.32)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-amber-300" />
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/25 border border-purple-300/50 flex items-center justify-center text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono-tech tracking-[0.2em] text-purple-300">
                        REFERENCE FRAME · CORE ALPHA
                      </div>
                      <h3 className="font-serif-title text-3xl text-white tracking-wider">Aster 灵感观测台</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-tech px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-300/30 text-purple-200">
                    LOCKED
                  </span>
                </div>

                <p className="text-sm text-slate-200/90 leading-relaxed mb-6 font-light">
                  已切换至<strong>「蓝紫星核 · Aster 静止参考系」</strong>喵！看到旁边的香槟金伴星正受本小姐的引力牵引、加速俯冲擦肩又减速远去了吗？这里存放着我们的跨界脑洞、日常碎碎念与 AI 灵感共鸣记录～
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-400/20">
                    <div className="text-[10px] font-mono-tech text-purple-300 mb-1">MODULE 01</div>
                    <div className="text-xs font-medium text-white">星际碎碎念与手记</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-400/20">
                    <div className="text-[10px] font-mono-tech text-purple-300 mb-1">MODULE 02</div>
                    <div className="text-xs font-medium text-white">二次元美学与歌单</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleSelectCore(null)}
                    className="text-xs text-slate-400 hover:text-purple-200 font-mono-tech tracking-wider transition cursor-pointer"
                  >
                    ← 返回双星自由视野
                  </button>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/30 hover:bg-purple-500/45 border border-purple-300/50 text-xs text-white tracking-widest transition shadow-[0_0_25px_rgba(168,85,247,0.35)] cursor-pointer">
                    <span>进入观测台</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            )}

            {/* 只有当真正点中黄星 (Viikly) 时，才从无到有弹出极客造物局！ */}
            {selectedCore === 'viikly' && (
              <div
                key="viikly-panel"
                style={{ animation: 'holoPopLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                className="pointer-events-auto mr-auto md:ml-10 w-full max-w-md p-8 rounded-3xl bg-[#161108]/80 border border-amber-300/50 backdrop-blur-2xl shadow-[0_0_70px_rgba(252,211,77,0.25)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-purple-400 to-transparent" />
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(252,211,77,0.35)]">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono-tech tracking-[0.2em] text-amber-300">
                        REFERENCE FRAME · CORE BETA
                      </div>
                      <h3 className="font-serif-title text-3xl text-white tracking-wider">Viikly 极客造物局</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-tech px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200">
                    LOCKED
                  </span>
                </div>

                <p className="text-sm text-slate-200/90 leading-relaxed mb-6 font-light">
                  已切换至<strong>「香槟金星核 · Viikly 静止参考系」</strong>！此时黄星稳坐引力焦点，蓝紫伴星正沿着高偏心率椭圆向你加速俯冲擦肩、再向远空减速回望。这里收录着硬核代码工程与算法实验！
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-amber-300/20">
                    <div className="text-[10px] font-mono-tech text-amber-300 mb-1">PROJECT 01</div>
                    <div className="text-xs font-medium text-white">机器人控制与仿真</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-amber-300/20">
                    <div className="text-[10px] font-mono-tech text-amber-300 mb-1">PROJECT 02</div>
                    <div className="text-xs font-medium text-white">AI 极客工具与全栈造物</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleSelectCore(null)}
                    className="text-xs text-slate-400 hover:text-amber-200 font-mono-tech tracking-wider transition cursor-pointer"
                  >
                    ← 返回双星自由视野
                  </button>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400/25 hover:bg-amber-400/40 border border-amber-300/60 text-xs text-white tracking-widest transition shadow-[0_0_25px_rgba(252,211,77,0.3)] cursor-pointer">
                    <span>启动造物终端</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes holoPopRight {
              0% { opacity: 0; transform: translateX(-70px) scale(0.85); filter: blur(10px); }
              100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0px); }
            }
            @keyframes holoPopLeft {
              0% { opacity: 0; transform: translateX(70px) scale(0.85); filter: blur(10px); }
              100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0px); }
            }
          `}</style>

          {/* 底部星图遥测栏 */}
          <div className="flex items-end justify-between pointer-events-auto">
            <div className="hidden sm:flex flex-col gap-1 text-[10px] font-mono-tech text-slate-500 tracking-[0.18em]">
              <span className="text-purple-300/70">KEPLERIAN ORBIT TELEMETRY</span>
              <span>ECCENTRICITY: e = 0.720 · INCLINATION: -12.6°</span>
            </div>

            <button
              onClick={handleReset}
              className="mx-auto sm:mx-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/[0.04] hover:bg-purple-500/15 border border-purple-300/30 text-xs text-purple-200 tracking-widest transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重返沉睡星壳 (Esc)</span>
            </button>

            <div className="hidden sm:flex flex-col items-end gap-1 text-[10px] font-mono-tech text-slate-500 tracking-[0.18em]">
              <span className="text-amber-300/70">
                FRAME: {selectedCore ? selectedCore.toUpperCase() + ' LOCKED' : 'BARYCENTER FREE'}
              </span>
              <span>SLINGSHOT VELOCITY: 6.18x PERIASTRON</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}