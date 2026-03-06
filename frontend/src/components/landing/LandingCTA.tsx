import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

gsap.registerPlugin(ScrollTrigger);

export function LandingCTA() {
  const { isAuthenticated } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 60, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1,
        },
      }
    );
  }, []);

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center bg-gray-950">
      <div ref={ref} className="text-center px-6">
        <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
          Bist du bereit?
        </h2>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          Tritt der Essensgruppe bei und erlebe alles selbst.
        </p>
        {!isAuthenticated && (
          <Link
            to="/register"
            className="inline-block bg-white text-gray-950 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all hover:scale-105"
          >
            Jetzt beitreten
          </Link>
        )}
        {isAuthenticated && (
          <Link
            to="/forum"
            className="inline-block bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all hover:scale-105"
          >
            Zum Forum
          </Link>
        )}
      </div>
    </section>
  );
}
