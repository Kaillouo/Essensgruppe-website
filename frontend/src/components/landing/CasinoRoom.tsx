// Room 4: Casino / Games — Full casino scene with real images
export function CasinoRoom() {
  return (
    <div className="relative w-full h-full min-h-[45vh] flex items-center justify-center overflow-hidden">
      {/* Casino interior background */}
      <div className="absolute inset-0">
        <img
          src="/images/casino.png"
          alt=""
          className="w-full h-full object-cover opacity-35 select-none pointer-events-none"
          style={{
            filter: 'brightness(0.6) saturate(1.2) contrast(1.1)',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
          draggable={false}
        />
      </div>

      {/* Neon red ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.1) 0%, transparent 55%)' }}
      />

      {/* Neon overhead sign: CASINO */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        <span
          className="font-black text-2xl md:text-4xl tracking-[0.3em] select-none"
          style={{
            color: '#FF2D55',
            textShadow: '0 0 10px #FF2D55, 0 0 30px #FF2D5580, 0 0 60px #FF2D5540, 0 0 100px #FF2D5520',
            animation: 'neonFlicker 3s ease-in-out infinite',
          }}
        >
          CASINO
        </span>
      </div>

      {/* BIG floating poker chips — right side */}
      <div
        className="absolute top-[8%] right-[3%] md:right-[6%] z-10"
        style={{ animation: 'chipsFloat 5s ease-in-out infinite' }}
      >
        <img
          src="/images/coins for casino.png"
          alt=""
          className="w-36 md:w-52 lg:w-60 object-contain opacity-70 select-none pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 25px rgba(255,45,85,0.35))' }}
          draggable={false}
        />
      </div>

      {/* BIG floating poker chips — left side */}
      <div
        className="absolute bottom-[8%] left-[2%] md:left-[5%] z-10"
        style={{ animation: 'chipsFloat2 6s ease-in-out infinite' }}
      >
        <img
          src="/images/coins for casino.png"
          alt=""
          className="w-32 md:w-44 lg:w-52 object-contain opacity-55 select-none pointer-events-none rotate-[25deg]"
          style={{ filter: 'drop-shadow(0 0 20px rgba(255,45,85,0.25))' }}
          draggable={false}
        />
      </div>

      {/* Central card suits display */}
      <div className="relative z-10 flex items-center gap-4 md:gap-8">
        {['♠', '♥', '♦', '♣'].map((suit, i) => (
          <div
            key={i}
            className="relative"
            style={{ animation: `cardFloat ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
          >
            <span
              className="text-5xl md:text-7xl select-none"
              style={{
                color: suit === '♥' || suit === '♦' ? '#FF2D55' : '#ffffff',
                textShadow: suit === '♥' || suit === '♦'
                  ? '0 0 15px #FF2D5580, 0 0 40px #FF2D5540'
                  : '0 0 15px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            >
              {suit}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom felt table edge hint */}
      <div
        className="absolute bottom-0 left-[5%] right-[5%] h-16 rounded-t-[50%] pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(34,139,34,0.15) 0%, transparent 100%)',
          borderTop: '1px solid rgba(34,139,34,0.15)',
        }}
      />

      <style>{`
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          5% { opacity: 0.85; }
          10% { opacity: 1; }
          50% { opacity: 0.95; }
          55% { opacity: 1; }
          80% { opacity: 0.9; }
          85% { opacity: 1; }
        }
        @keyframes chipsFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        @keyframes chipsFloat2 {
          0%, 100% { transform: translateY(0) rotate(25deg); }
          50% { transform: translateY(-10px) rotate(30deg); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
