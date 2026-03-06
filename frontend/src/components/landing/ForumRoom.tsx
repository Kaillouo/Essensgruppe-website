// Room 1: Forum — Greek parliament + philosopher statues scene
export function ForumRoom() {
  return (
    <div className="relative w-full h-full min-h-[45vh] flex items-end justify-center overflow-hidden">
      {/* Parliament building background — centered, faded */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/images/parliament.png"
          alt=""
          className="w-[80%] max-w-[600px] object-contain opacity-25 select-none pointer-events-none"
          style={{
            filter: 'brightness(0.7) saturate(0.3) sepia(0.3) hue-rotate(160deg)',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          }}
          draggable={false}
        />
      </div>

      {/* Ambient cyan fog at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,229,255,0.06) 0%, transparent 100%)' }}
      />

      {/* CSS marble columns */}
      <div className="absolute inset-0 flex justify-between px-[8%] items-end pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative"
            style={{
              width: 'clamp(12px, 2vw, 22px)',
              height: 'clamp(120px, 25vh, 220px)',
            }}
          >
            {/* Column shaft */}
            <div
              className="absolute inset-0 rounded-t-sm"
              style={{
                background: 'linear-gradient(90deg, rgba(0,229,255,0.08) 0%, rgba(0,229,255,0.2) 40%, rgba(0,229,255,0.08) 100%)',
                boxShadow: '0 0 15px rgba(0,229,255,0.05)',
              }}
            />
            {/* Column capital (top) */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm"
              style={{
                width: 'clamp(18px, 3vw, 32px)',
                height: '6px',
                background: 'linear-gradient(90deg, rgba(0,229,255,0.1), rgba(0,229,255,0.25), rgba(0,229,255,0.1))',
              }}
            />
            {/* Column base */}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm"
              style={{
                width: 'clamp(16px, 2.5vw, 28px)',
                height: '4px',
                background: 'rgba(0,229,255,0.15)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Philosopher 1 — Socrates (left side, floating) */}
      <div
        className="absolute bottom-4 left-[12%] md:left-[18%] z-10"
        style={{ animation: 'forumFloat1 5s ease-in-out infinite' }}
      >
        <img
          src="/images/philosoph1.png"
          alt="Philosoph"
          className="h-[clamp(100px,20vh,200px)] object-contain select-none pointer-events-none"
          style={{
            filter: 'brightness(0.85) drop-shadow(0 0 20px rgba(0,229,255,0.15))',
          }}
          draggable={false}
        />
      </div>

      {/* Philosopher 2 — Two debating (right side, floating) */}
      <div
        className="absolute bottom-4 right-[8%] md:right-[14%] z-10"
        style={{ animation: 'forumFloat2 6s ease-in-out infinite' }}
      >
        <img
          src="/images/philosoph2.png"
          alt="Philosophen im Diskurs"
          className="h-[clamp(90px,18vh,180px)] object-contain select-none pointer-events-none"
          style={{
            filter: 'brightness(0.85) drop-shadow(0 0 20px rgba(0,229,255,0.15))',
          }}
          draggable={false}
        />
      </div>

      {/* Particle dust (floating dots) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${10 + Math.random() * 80}%`,
              top: `${20 + Math.random() * 60}%`,
              background: `rgba(0,229,255,${0.1 + Math.random() * 0.2})`,
              animation: `forumDust ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes forumFloat1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes forumFloat2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-0.5deg); }
        }
        @keyframes forumDust {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          50% { transform: translateY(-15px) translateX(5px); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
