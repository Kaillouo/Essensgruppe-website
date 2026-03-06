// Room 2: Links — Simple portal with text
export function LinksRoom() {
  return (
    <div className="relative w-full h-full min-h-[45vh] flex items-center justify-center overflow-hidden">
      {/* Portal ring image — centered, glowing, large */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/images/portal.png"
          alt=""
          className="w-[85%] max-w-[550px] object-contain opacity-35 select-none pointer-events-none"
          style={{
            filter: 'brightness(1.3) hue-rotate(260deg) saturate(1.5)',
            animation: 'portalPulse 4s ease-in-out infinite',
          }}
          draggable={false}
        />
      </div>

      {/* Purple ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, transparent 55%)' }}
      />

      {/* Central text */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
        <p className="text-purple-300/80 text-base md:text-lg font-light tracking-wide">
          Alle wichtigen Online-Links für die Schule
        </p>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-purple-400/25"
            style={{
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
              animation: `portalParticle ${3 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes portalPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.04); opacity: 0.45; }
        }
        @keyframes portalParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          50% { transform: translateY(-12px) translateX(4px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
