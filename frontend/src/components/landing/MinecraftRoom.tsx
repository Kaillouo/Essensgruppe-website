// Room 5: Minecraft — Parallax sky with real MC screenshot
export function MinecraftRoom() {
  return (
    <div className="relative w-full h-full min-h-[45vh] flex items-center justify-center overflow-hidden">
      {/* Minecraft build screenshot — large background */}
      <div className="absolute inset-0">
        <img
          src="/images/minecraftbg.png"
          alt=""
          className="w-full h-full object-cover opacity-30 select-none pointer-events-none"
          style={{
            filter: 'brightness(0.7) saturate(1.1)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
          }}
          draggable={false}
        />
      </div>

      {/* Sky gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,10,30,0.6) 0%, rgba(0,20,40,0.3) 40%, rgba(0,255,148,0.04) 100%)' }}
      />

      {/* Blocky clouds — parallax-style layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Far clouds (slower, more transparent) */}
        <div className="absolute top-[10%] w-full" style={{ animation: 'cloudDriftSlow 40s linear infinite' }}>
          <div className="flex gap-[20vw]">
            <div className="w-24 h-5 bg-white/[0.06] rounded-sm" />
            <div className="w-32 h-6 bg-white/[0.05] rounded-sm" />
            <div className="w-20 h-5 bg-white/[0.04] rounded-sm" />
            <div className="w-28 h-5 bg-white/[0.06] rounded-sm" />
          </div>
        </div>

        {/* Near clouds (faster, more opaque) */}
        <div className="absolute top-[20%] w-full" style={{ animation: 'cloudDriftFast 25s linear infinite' }}>
          <div className="flex gap-[15vw]">
            <div className="w-20 h-6 bg-white/[0.1] rounded-sm" />
            <div className="w-28 h-7 bg-white/[0.08] rounded-sm" />
            <div className="w-16 h-5 bg-white/[0.09] rounded-sm" />
            <div className="w-24 h-6 bg-white/[0.07] rounded-sm" />
          </div>
        </div>
      </div>

      {/* Green ambient glow at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,255,148,0.06) 0%, transparent 100%)' }}
      />

      {/* Central content: server text + blocky pixel players */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Pixel art player figures */}
        <div className="flex gap-5 md:gap-8 items-end">
          {[
            { color: 'rgba(0,255,148,0.5)', h: 'h-8 md:h-10' },
            { color: 'rgba(0,200,120,0.4)', h: 'h-9 md:h-11' },
            { color: 'rgba(0,255,148,0.45)', h: 'h-7 md:h-9' },
            { color: 'rgba(100,255,180,0.4)', h: 'h-8 md:h-10' },
          ].map((player, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ animation: `mcBob ${2.5 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
            >
              {/* Head (blocky) */}
              <div
                className="w-4 h-4 md:w-5 md:h-5 rounded-[2px]"
                style={{ background: player.color, boxShadow: `0 0 8px ${player.color}` }}
              />
              {/* Body */}
              <div
                className={`w-3.5 md:w-4 ${player.h} rounded-[1px] mt-px`}
                style={{ background: player.color.replace(/[\d.]+\)$/, '0.3)') }}
              />
              {/* Arms */}
              <div className="flex gap-3 md:gap-4 -mt-6 md:-mt-7">
                <div className="w-1.5 h-4 md:h-5 rounded-[1px]" style={{ background: player.color.replace(/[\d.]+\)$/, '0.25)') }} />
                <div className="w-1.5 h-4 md:h-5 rounded-[1px]" style={{ background: player.color.replace(/[\d.]+\)$/, '0.25)') }} />
              </div>
            </div>
          ))}
        </div>

        {/* Server IP hint */}
        <div
          className="px-4 py-2 rounded-md border"
          style={{
            borderColor: 'rgba(0,255,148,0.15)',
            background: 'rgba(0,255,148,0.03)',
            boxShadow: '0 0 20px rgba(0,255,148,0.05)',
          }}
        >
          <span
            className="font-mono text-sm md:text-base tracking-wider select-none"
            style={{ color: 'rgba(0,255,148,0.6)' }}
          >
            mc.essensgruppe.de
          </span>
        </div>
      </div>

      {/* Terrain silhouette at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end pointer-events-none">
        {[3, 5, 4, 7, 5, 3, 6, 4, 5, 8, 6, 4, 3, 5, 7, 4, 3, 5, 6, 4].map((h, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${h * 6}px`,
              background: 'linear-gradient(to top, rgba(0,255,148,0.12) 0%, rgba(0,255,148,0.04) 100%)',
              borderTop: '1px solid rgba(0,255,148,0.1)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes cloudDriftSlow {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes cloudDriftFast {
          from { transform: translateX(-25%); }
          to { transform: translateX(-75%); }
        }
        @keyframes mcBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
