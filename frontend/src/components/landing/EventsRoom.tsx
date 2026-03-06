// Room 3: Abi 27 Events — Dark school + mastermind planning scene
export function EventsRoom() {
  return (
    <div className="relative w-full h-full min-h-[45vh] flex items-center justify-center overflow-hidden">
      {/* School classroom background — dark, moody */}
      <div className="absolute inset-0">
        <img
          src="/images/school.png"
          alt=""
          className="w-full h-full object-cover opacity-20 select-none pointer-events-none"
          style={{
            filter: 'brightness(0.5) saturate(0.3) sepia(0.2) hue-rotate(10deg)',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
          draggable={false}
        />
      </div>

      {/* Orange ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center bottom, rgba(255,107,53,0.08) 0%, transparent 60%)' }}
      />

      {/* Central planning table area */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Mastermind figure — centered above the table */}
        <div
          className="relative"
          style={{ animation: 'mastermindSway 6s ease-in-out infinite' }}
        >
          <img
            src="/images/mastermind.png"
            alt="Mastermind"
            className="h-[clamp(80px,16vh,160px)] object-contain select-none pointer-events-none"
            style={{
              filter: 'brightness(0.9) drop-shadow(0 0 25px rgba(255,107,53,0.2))',
            }}
            draggable={false}
          />
        </div>

        {/* Blueprint / planning board */}
        <div
          className="relative w-64 md:w-80 h-32 md:h-40 rounded-lg border overflow-hidden"
          style={{
            borderColor: 'rgba(255,107,53,0.2)',
            background: 'linear-gradient(135deg, rgba(255,107,53,0.04) 0%, rgba(255,107,53,0.01) 100%)',
            boxShadow: '0 0 30px rgba(255,107,53,0.06)',
          }}
        >
          {/* Grid pattern on the blueprint */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,107,53,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,107,53,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Dashed planning lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160">
            <line x1="40" y1="40" x2="280" y2="40" stroke="rgba(255,107,53,0.3)" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="40" y1="80" x2="280" y2="80" stroke="rgba(255,107,53,0.2)" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="40" y1="120" x2="280" y2="120" stroke="rgba(255,107,53,0.15)" strokeWidth="1" strokeDasharray="6 4" />
            <rect x="60" y="50" width="80" height="60" rx="4" fill="none" stroke="rgba(255,107,53,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <rect x="180" y="50" width="80" height="60" rx="4" fill="none" stroke="rgba(255,107,53,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <text x="100" y="85" textAnchor="middle" fill="rgba(255,107,53,0.35)" fontSize="10" fontFamily="monospace">EVENT A</text>
            <text x="220" y="85" textAnchor="middle" fill="rgba(255,107,53,0.35)" fontSize="10" fontFamily="monospace">EVENT B</text>
            {/* Measurement marks */}
            <line x1="60" y1="45" x2="60" y2="35" stroke="rgba(255,107,53,0.2)" strokeWidth="0.5" />
            <line x1="140" y1="45" x2="140" y2="35" stroke="rgba(255,107,53,0.2)" strokeWidth="0.5" />
            <line x1="180" y1="45" x2="180" y2="35" stroke="rgba(255,107,53,0.2)" strokeWidth="0.5" />
            <line x1="260" y1="45" x2="260" y2="35" stroke="rgba(255,107,53,0.2)" strokeWidth="0.5" />
          </svg>

          {/* Slow rotation glow overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255,107,53,0.04), transparent, rgba(255,107,53,0.04))',
              animation: 'blueprintRotate 12s linear infinite',
            }}
          />
        </div>

        {/* Silhouette figures seated around (simple CSS) */}
        <div className="flex gap-4 md:gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ animation: `figureBob ${3 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
            >
              {/* Head */}
              <div
                className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                style={{ background: 'rgba(255,107,53,0.25)', boxShadow: '0 0 8px rgba(255,107,53,0.1)' }}
              />
              {/* Body */}
              <div
                className="w-2.5 h-5 md:w-3 md:h-6 rounded-t-sm mt-0.5"
                style={{ background: 'linear-gradient(180deg, rgba(255,107,53,0.2) 0%, rgba(255,107,53,0.08) 100%)' }}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes mastermindSway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(0.3deg); }
        }
        @keyframes blueprintRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes figureBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
