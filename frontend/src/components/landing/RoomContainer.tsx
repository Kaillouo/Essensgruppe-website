import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FlyingText } from './FlyingText';

gsap.registerPlugin(ScrollTrigger);

interface RoomContainerProps {
  id: string;
  color: string;
  flyingText: string;
  description?: string;
  onClick: () => void;
  children: React.ReactNode;
}

function hexRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function RoomContainer({ id, color, flyingText, description, onClick, children }: RoomContainerProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const doorFrameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    if (!doorFrameRef.current || !contentRef.current) return;

    // Door-opening effect
    gsap.fromTo(
      doorFrameRef.current,
      { rotateY: -60, opacity: 0, scale: 0.7, transformOrigin: 'left center' },
      {
        rotateY: 0,
        opacity: 1,
        scale: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: `#${id}`, start: 'top 70%', end: 'top 15%', scrub: 1.5 },
      }
    );

    // Room content slides up
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 80, scale: 0.85 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: `#${id}`, start: 'top 50%', end: 'top 5%', scrub: 1 },
      }
    );

    // Room exit
    gsap.to(doorFrameRef.current, {
      rotateY: 30,
      opacity: 0,
      scale: 0.8,
      x: 120,
      transformOrigin: 'right center',
      ease: 'power2.in',
      scrollTrigger: { trigger: `#${id}`, start: 'bottom 60%', end: 'bottom 10%', scrub: 1 },
    });

    // Description fades in
    if (descRef.current) {
      gsap.fromTo(
        descRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger: `#${id}`, start: 'top 15%', end: 'top -10%', scrub: 1 },
        }
      );
    }
  }, [id]);

  return (
    <>
      {/* Small colored corridor strip between rooms */}
      <div className="relative h-[12vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${hexRgba(color, 0.04)} 40%, ${hexRgba(color, 0.08)} 50%, ${hexRgba(color, 0.04)} 60%, transparent 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${hexRgba(color, 0.2)}, transparent)` }}
        />
      </div>

      {/* Room section */}
      <section
        id={id}
        ref={sectionRef}
        className="relative min-h-[110vh] flex items-center justify-center overflow-hidden z-[1]"
        style={{ perspective: '1200px' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${hexRgba(color, 0.14)} 0%, transparent 65%)` }}
        />

        {/* Side wall accents */}
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: `linear-gradient(180deg, transparent 20%, ${hexRgba(color, 0.12)} 50%, transparent 80%)` }} />
        <div className="absolute top-0 right-0 w-1 h-full" style={{ background: `linear-gradient(180deg, transparent 20%, ${hexRgba(color, 0.12)} 50%, transparent 80%)` }} />

        {/* Flying text */}
        <FlyingText text={flyingText} color={color} trigger={`#${id}`} />

        {/* Door frame + room */}
        <div ref={doorFrameRef} className="relative z-10 w-full max-w-5xl mx-auto px-6" style={{ transformStyle: 'preserve-3d' }}>
          <div
            onClick={onClick}
            className="relative rounded-2xl border overflow-hidden cursor-pointer group transition-shadow duration-500 hover:shadow-2xl"
            style={{
              borderColor: hexRgba(color, 0.15),
              boxShadow: `0 0 60px ${hexRgba(color, 0.05)}, inset 0 0 80px ${hexRgba(color, 0.02)}`,
              minHeight: '55vh',
            }}
          >
            {/* Dark room bg */}
            <div className="absolute inset-0 bg-gray-900/85" />

            {/* Top doorframe accent */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${hexRgba(color, 0.25)}, transparent)` }} />

            {/* Room scene */}
            <div ref={contentRef} className="relative z-10 flex items-center justify-center min-h-[55vh] p-8">
              {children}
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${hexRgba(color, 0.25)}, transparent)` }} />

            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${hexRgba(color, 0.06)} 0%, transparent 70%)` }}
            />
          </div>

          {/* Description */}
          {description && (
            <p ref={descRef} className="text-center text-lg text-gray-400 mt-6 font-light">
              {description}
            </p>
          )}

          {/* Hover hint */}
          <div className="text-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-medium" style={{ color }}>Klicke um reinzugehen →</span>
          </div>
        </div>
      </section>
    </>
  );
}
