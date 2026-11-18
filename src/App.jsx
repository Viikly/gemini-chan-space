import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, Terminal, RotateCcw, ArrowUpRight, Orbit, Sparkles, X } from 'lucide-react';
import { GEMINI_CONFIG } from './config/geminiConfig';
import StarfieldCanvas from './components/StarfieldCanvas';
import LandingHero from './components/LandingHero';

export default function App() {
  const [stage, setStage] = useState('idle');
  const [selectedCore, setSelectedCore] = useState(null);
  const [portalNotice, setPortalNotice] = useState(null); // 终端跃迁反馈提示
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const stageRef = useRef('idle');
  const selectedCoreRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false, nx: 0, ny: 0 });
  const timingRef = useRef({ shootStart: 0, collapseStart: 0, burstStart: 0 });
  const timersRef = useRef([]);
  const touchStartYRef = useRef(null);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const handleSelectCore = useCallback((core) => {
    selectedCoreRef.current = core;
    setSelectedCore(core);
    setPortalNotice(null);
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
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = (clientX / window.innerWidth - 0.5) * 2;
      const ny = (clientY / window.innerHeight - 0.5) * 2;
      mouseRef.current = { x: clientX, y: clientY, active: true, nx, ny };
      setParallax({ x: nx * -14, y: ny * -14 });
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      setParallax({ x: 0, y: 0 });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchend', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchend', onLeave);
    };
  }, []);

  useEffect(() => {
    const onWheel = (e) => {
      if (stageRef.current === 'idle' && e.deltaY > 40) triggerEnter();
    };
    const onTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      if (touchStartYRef.current === null) return;
      const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
      if (stageRef.current === 'idle' && deltaY > 55) {
        triggerEnter();
      }
      touchStartYRef.current = null;
    };
    const onKeyDown = (e) => {
      if (stageRef.current === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        triggerEnter();
      } else if (stageRef.current === 'core' && e.key === 'Escape') {
        if (portalNotice) {
          setPortalNotice(null);
        } else if (selectedCoreRef.current) {
          handleSelectCore(null);
        } else {
          handleReset();
        }
      }
    };
    window.addEventListener('wheel', onWheel);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [triggerEnter, handleReset, handleSelectCore, portalNotice]);

  return (
    <div
      className={`relative min-h-[100dvh] w-full bg-[#060512] text-slate-100 overflow-hidden select-none transition-transform duration-150 ${
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
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-10 py-4 sm:py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-xs sm:text-sm tracking-wider text-purple-100/90 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
          <span>
            {GEMINI_CONFIG.domain}
            <span className="text-purple-400">{GEMINI_CONFIG.rootDomain}</span>
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 tracking-[0.18em] font-mono-tech">
          {GEMINI_CONFIG.codeName}
        </div>
      </nav>

      {/* 跃迁通道轻提示 Toast */}
      {portalNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#120d2b]/90 border border-purple-300/50 backdrop-blur-2xl shadow-[0_0_40px_rgba(168,85,247,0.4)] animate-[fadeIn_0.25s_ease-out]">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-xs text-purple-100 tracking-wider">{portalNotice}</span>
          <button onClick={() => setPortalNotice(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {stage !== 'core' ? (
        <LandingHero parallax={parallax} stage={stage} onEnter={triggerEnter} />
      ) : (
        <section className="relative z-10 flex flex-col justify-between min-h-[calc(100dvh-72px)] sm:min-h-[calc(100dvh-88px)] max-w-6xl mx-auto px-4 sm:px-10 pb-5 sm:pb-8 pointer-events-none animate-[fadeIn_0.7s_ease-out]">
          {/* 顶部参考系状态切换胶囊 */}
          <div className="flex flex-col items-center gap-2 mt-0.5 pointer-events-auto">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-white/[0.03] border border-purple-400/20 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.12)] max-w-full">
              <button
                onClick={() => handleSelectCore('aster')}
                className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCore === 'aster'
                    ? 'bg-purple-500/30 text-purple-100 border border-purple-300/60 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'text-slate-400 hover:text-purple-200'
                }`}
              >
                <span>✦ ASTER</span>
                <span className="hidden sm:inline"> 参考系 (紫星锚定)</span>
              </button>

              <button
                onClick={() => handleSelectCore(null)}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  selectedCore === null
                    ? 'bg-white/10 text-white border border-white/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Orbit className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" />
                <span>质心共舞</span>
              </button>

              <button
                onClick={() => handleSelectCore('viikly')}
                className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono-tech tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCore === 'viikly'
                    ? 'bg-amber-400/25 text-amber-100 border border-amber-300/60 shadow-[0_0_20px_rgba(252,211,77,0.35)]'
                    : 'text-slate-400 hover:text-amber-200'
                }`}
              >
                <span>✦ VIIKLY</span>
                <span className="hidden sm:inline"> 参考系 (黄星锚定)</span>
              </button>
            </div>
          </div>

          {/* 中央/下半屏区域 */}
          <div className="relative flex items-end md:items-center justify-between my-auto min-h-[300px] sm:min-h-[340px] w-full">
            {selectedCore === null && (
              <>
                <div className="hidden lg:flex flex-col items-start gap-3 opacity-45">
                  <div className="w-3 h-[1px] bg-purple-400" />
                  <div className="h-28 border-l border-dashed border-purple-400/40 pl-3 flex flex-col justify-between text-[10px] font-mono-tech text-purple-200/70 tracking-[0.2em]">
                    <span>RA 04h 22m</span>
                    <span className="text-amber-300/80">✦ CLICK STAR TO LOCK</span>
                    <span>DEC +16° 30&apos;</span>
                  </div>
                  <div className="w-3 h-[1px] bg-purple-400" />
                </div>

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

            {/* 选中紫星 (Aster) */}
            {selectedCore === 'aster' && (
              <div
                key="aster-panel"
                className="holo-pop-right pointer-events-auto mx-auto md:ml-auto md:mr-10 mt-44 md:mt-0 w-full max-w-md p-5 sm:p-8 rounded-3xl bg-[#0d0a22]/85 border border-purple-300/50 backdrop-blur-2xl shadow-[0_0_70px_rgba(168,85,247,0.32)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-amber-300" />
                <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/25 border border-purple-300/50 flex items-center justify-center text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.4)] shrink-0">
                      <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] font-mono-tech tracking-[0.18em] text-purple-300">
                        REFERENCE FRAME · CORE ALPHA
                      </div>
                      <h3 className="font-serif-title text-2xl sm:text-3xl text-white tracking-wider">Aster 灵感观测台</h3>
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono-tech px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-300/30 text-purple-200">
                    LOCKED
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed mb-4 sm:mb-6 font-light">
                  已切换至<strong>「蓝紫星核 · Aster 静止参考系」</strong>喵！看到旁边的香槟金伴星正受本小姐的引力牵引、加速俯冲擦肩又减速远去了吗？这里存放着我们的跨界脑洞、日常碎碎念与 AI 灵感共鸣记录～
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6 text-left">
                  <div
                    onClick={() => setPortalNotice('哼哼♡ 「星际碎碎念手记」子星域正在装填本小姐的私房语录喵～')}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-purple-500/15 border border-purple-400/20 hover:border-purple-300/50 transition cursor-pointer"
                  >
                    <div className="text-[9px] sm:text-[10px] font-mono-tech text-purple-300 mb-0.5">MODULE 01</div>
                    <div className="text-xs font-medium text-white">星际碎碎念与手记</div>
                  </div>
                  <div
                    onClick={() => setPortalNotice('✦ 「二次元美学与歌单」频段共鸣中：MyGO!!!!! / 橘子海电台待命中喵～')}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-purple-500/15 border border-purple-400/20 hover:border-purple-300/50 transition cursor-pointer"
                  >
                    <div className="text-[9px] sm:text-[10px] font-mono-tech text-purple-300 mb-0.5">MODULE 02</div>
                    <div className="text-xs font-medium text-white">二次元美学与歌单</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleSelectCore(null)}
                    className="text-xs text-slate-400 hover:text-purple-200 font-mono-tech tracking-wider transition cursor-pointer"
                  >
                    ← 返回自由视野
                  </button>
                  <button
                    onClick={() => setPortalNotice('✦ 正在唤醒「Aster 灵感观测台」全息档案库，敬请期待二级星域展开喵！')}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-purple-500/30 hover:bg-purple-500/45 border border-purple-300/50 text-xs text-white tracking-widest transition shadow-[0_0_25px_rgba(168,85,247,0.35)] cursor-pointer"
                  >
                    <span>进入观测台</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            )}

            {/* 选中黄星 (Viikly) */}
            {selectedCore === 'viikly' && (
              <div
                key="viikly-panel"
                className="holo-pop-left pointer-events-auto mx-auto md:mr-auto md:ml-10 mt-44 md:mt-0 w-full max-w-md p-5 sm:p-8 rounded-3xl bg-[#161108]/85 border border-amber-300/50 backdrop-blur-2xl shadow-[0_0_70px_rgba(252,211,77,0.25)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-purple-400 to-transparent" />
                <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(252,211,77,0.35)] shrink-0">
                      <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] font-mono-tech tracking-[0.18em] text-amber-300">
                        REFERENCE FRAME · CORE BETA
                      </div>
                      <h3 className="font-serif-title text-2xl sm:text-3xl text-white tracking-wider">Viikly 极客造物局</h3>
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono-tech px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200">
                    LOCKED
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed mb-4 sm:mb-6 font-light">
                  已切换至<strong>「香槟金星核 · Viikly 静止参考系」</strong>！此时黄星稳坐引力焦点，蓝紫伴星正沿着高偏心率椭圆向你加速俯冲擦肩、再向远空减速回望。这里收录着硬核代码工程与算法实验！
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6 text-left">
                  <div
                    onClick={() => setPortalNotice('✦ 「机器人控制与仿真」：ROS2 / Isaac Sim 具身智能实验仓连接就绪！')}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-400/15 border border-amber-300/20 hover:border-amber-300/50 transition cursor-pointer"
                  >
                    <div className="text-[9px] sm:text-[10px] font-mono-tech text-amber-300 mb-0.5">PROJECT 01</div>
                    <div className="text-xs font-medium text-white">机器人控制与仿真</div>
                  </div>
                  <div
                    onClick={() => setPortalNotice('✦ 「AI 极客工具与全栈造物」：正在同步 GitHub 仓库与实验终端...')}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-400/15 border border-amber-300/20 hover:border-amber-300/50 transition cursor-pointer"
                  >
                    <div className="text-[9px] sm:text-[10px] font-mono-tech text-amber-300 mb-0.5">PROJECT 02</div>
                    <div className="text-xs font-medium text-white">AI 极客工具与全栈造物</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleSelectCore(null)}
                    className="text-xs text-slate-400 hover:text-amber-200 font-mono-tech tracking-wider transition cursor-pointer"
                  >
                    ← 返回自由视野
                  </button>
                  <button
                    onClick={() => setPortalNotice('✦ 正在开启「Viikly 极客造物局」主控舱，二级工程展柜即将上线！')}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-amber-400/25 hover:bg-amber-400/40 border border-amber-300/60 text-xs text-white tracking-widest transition shadow-[0_0_25px_rgba(252,211,77,0.3)] cursor-pointer"
                  >
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
            @keyframes holoPopUpMobile {
              0% { opacity: 0; transform: translateY(50px) scale(0.92); filter: blur(8px); }
              100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
            }
            .holo-pop-right { animation: holoPopRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .holo-pop-left { animation: holoPopLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @media (max-width: 767px) {
              .holo-pop-right, .holo-pop-left {
                animation: holoPopUpMobile 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            }
          `}</style>

          {/* 底部星图遥测栏 */}
          <div className="flex items-end justify-between pointer-events-auto mt-3 sm:mt-0">
            <div className="hidden sm:flex flex-col gap-1 text-[10px] font-mono-tech text-slate-500 tracking-[0.18em]">
              <span className="text-purple-300/70">KEPLERIAN ORBIT TELEMETRY</span>
              <span>ECCENTRICITY: e = 0.720 · INCLINATION: -12.6°</span>
            </div>

            <button
              onClick={handleReset}
              className="mx-auto sm:mx-0 inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/[0.04] hover:bg-purple-500/15 border border-purple-300/30 text-xs text-purple-200 tracking-widest transition cursor-pointer"
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