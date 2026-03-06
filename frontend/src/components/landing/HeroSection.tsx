import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DailyCoinsClaim } from '../DailyCoinsClaim';

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const { isAuthenticated } = useAuth();
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!sectionRef.current || !videoFrameRef.current || !titleRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=200%',
        scrub: 1.5,
        pin: true,
      },
    });

    // Title fades and shrinks
    tl.to(titleRef.current, {
      scale: 0.3,
      opacity: 0,
      y: -80,
      duration: 1,
      ease: 'power2.in',
    }, 0);

    // CTA fades out
    if (ctaRef.current) {
      tl.to(ctaRef.current, {
        opacity: 0,
        y: -40,
        duration: 0.5,
        ease: 'power2.in',
      }, 0);
    }

    // Video frame shrinks to reveal it's a "window"
    tl.to(videoFrameRef.current, {
      scale: 0.35,
      borderRadius: '24px',
      duration: 1.5,
      ease: 'power2.inOut',
    }, 0.3);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen flex items-center justify-center overflow-hidden bg-gray-950"
    >
      {/* Video container that shrinks into a "window" */}
      <div
        ref={videoFrameRef}
        className="absolute inset-0 overflow-hidden"
        style={{ transformOrigin: 'center center' }}
      >
        {/* YouTube video background */}
        <iframe
          src="https://www.youtube.com/embed/Y2gmQFjpcsU?autoplay=1&mute=1&loop=1&playlist=Y2gmQFjpcsU&controls=0&showinfo=0&rel=0&playsinline=1&modestbranding=1"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 min-w-full min-h-full pointer-events-none"
          style={{
            width: '177.78vh',
            height: '177.78vw',
            minWidth: '100%',
            minHeight: '100%',
            transform: 'translate(-50%, -50%)',
            border: 'none',
          }}
          title="Hintergrundvideo"
        />
        {/* Dark overlay on video */}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Title text */}
      <div ref={titleRef} className="relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.65, 0.05, 0, 1] }}
        >
          <h1 className="font-black text-white leading-[0.85] tracking-tighter select-none">
            <span className="block text-[clamp(5rem,18vw,16rem)]">ABI</span>
            <span className="block text-[clamp(5rem,18vw,16rem)]">27</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl text-gray-300 mt-4 font-light tracking-wide"
        >
          Essensgruppe · Gemeinschaftsportal
        </motion.p>
      </div>

      {/* CTA */}
      <div ref={ctaRef} className="absolute bottom-24 z-10">
        {!isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Link
              to="/login"
              className="inline-block bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all hover:scale-105"
            >
              Ich bin Teil der Essensgruppe
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <DailyCoinsClaim autoClaim={true} />
          </motion.div>
        )}
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent relative overflow-hidden">
            <div className="absolute w-full h-3 bg-white rounded-full animate-bounce" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
