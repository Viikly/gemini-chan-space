import React from 'react';

export default function OrbitalRings({ parallax, pulse }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 transition-transform duration-300 ease-out"
      style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }}
    >
      {/* 内环星轨 */}
      <div
        className={`relative w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full border border-purple-400/25 shadow-[inset_0_0_80px_rgba(139,92,246,0.08)] animate-[spin_50s_linear_infinite] transition-transform duration-500 ${
          pulse ? 'scale-105 border-amber-300/45' : 'scale-100'
        }`}
      >
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-300 shadow-[0_0_8px_#d8b4fe]" />
      </div>

      {/* 外环虚线星轨 */}
      <div className="absolute w-[660px] h-[660px] sm:w-[820px] sm:h-[820px] rounded-full border border-dashed border-indigo-400/20 animate-[spin_90s_linear_infinite_reverse]">
        <span className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#f472b6]" />
      </div>
    </div>
  );
}