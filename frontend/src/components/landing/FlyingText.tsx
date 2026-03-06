import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface FlyingTextProps {
  text: string;
  color: string;
  trigger: string; // ScrollTrigger trigger selector
}

export function FlyingText({ text, color, trigger }: FlyingTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;

    // Phase 1: Text starts tiny (far away) and grows to readable size
    // Starts early — well before the room section enters the viewport
    gsap.fromTo(
      ref.current,
      { scale: 0.03, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        ease: 'power1.in',
        scrollTrigger: {
          trigger,
          start: 'top+=50% bottom', // starts when bottom of viewport hits halfway down the PREVIOUS section
          end: 'top 40%',
          scrub: 1.2,
        },
      }
    );

    // Phase 2: Text keeps growing huge and flies past camera
    gsap.fromTo(
      ref.current,
      { scale: 1, opacity: 1 },
      {
        scale: 12,
        opacity: 0,
        ease: 'power2.in',
        scrollTrigger: {
          trigger,
          start: 'top 35%',
          end: 'top -10%',
          scrub: 1,
        },
      }
    );
  }, [trigger]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
    >
      <h2
        className="font-black text-[clamp(1.5rem,8vw,6rem)] leading-none tracking-tight whitespace-nowrap select-none"
        style={{ color, textShadow: `0 0 60px ${color}40, 0 0 120px ${color}20` }}
      >
        {text}
      </h2>
    </div>
  );
}
