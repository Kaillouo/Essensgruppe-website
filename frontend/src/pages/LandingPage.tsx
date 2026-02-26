import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { DailyCoinsClaim } from '../components/DailyCoinsClaim';

const SECTIONS = [
  { label: 'Forum', desc: 'Threads, Diskussionen und Klassenchat', to: '/forum', locked: true, roleRequired: null as string[] | null },
  { label: 'ABI 27', desc: 'Events, Planung und Fotogalerien', to: '/events', locked: false, roleRequired: null as string[] | null },
  { label: 'Links', desc: 'Nützliche Links für Schule und Klasse', to: '/links', locked: false, roleRequired: null as string[] | null },
  { label: 'Games', desc: 'Coins, Poker, Slots und mehr', to: '/games', locked: true, roleRequired: null as string[] | null },
  { label: 'About Us', desc: 'Wer wir sind', to: '/about', locked: false, roleRequired: null as string[] | null },
  { label: 'MC', desc: 'Minecraft-Server und BlueMap', to: '/mc', locked: true, roleRequired: ['ESSENSGRUPPE_MITGLIED', 'ADMIN'] as string[] | null },
];

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  return (
    <div className="bg-gray-950">
      {/* Hero Section */}
      <motion.section
        style={{ opacity, scale }}
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black"
      >
        {/* YouTube Shorts video background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <iframe
            src="https://www.youtube.com/embed/Y2gmQFjpcsU?autoplay=1&mute=1&loop=1&playlist=Y2gmQFjpcsU&controls=0&showinfo=0&rel=0&playsinline=1&modestbranding=1"
            allow="autoplay; encrypted-media"
            className="absolute top-1/2 left-1/2 min-w-full min-h-full"
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
        </div>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          >
            Essensgruppe
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-primary-100 mb-8"
          >
            Abitur 2027 Gemeinschaftsportal
          </motion.p>

          {!isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link
                to="/login"
                className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-50 transition-all transform hover:scale-105 shadow-xl"
              >
                Ich bin Teil der Essensgruppe
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <DailyCoinsClaim autoClaim={true} />
            </motion.div>
          )}

        </div>
      </motion.section>

      {/* Sections list */}
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-xl mx-auto">
          {SECTIONS.filter(item =>
            !item.roleRequired || (isAuthenticated && item.roleRequired.includes(user?.role ?? ''))
          ).map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group"
            >
              <Link
                to={item.locked && !isAuthenticated ? '/login' : item.to}
                className="flex items-center justify-between py-5 border-b border-gray-800 transition-colors"
              >
                <div>
                  <span className="inline-block text-lg font-semibold text-gray-200 transition-all duration-200 md:group-hover:scale-110 md:group-hover:text-primary-400 origin-left">
                    {item.label}
                  </span>
                  <span className="block text-sm text-gray-600 mt-0.5 md:group-hover:text-gray-400 transition-colors duration-200">
                    {item.desc}
                  </span>
                </div>
                <span className="text-gray-700 md:group-hover:text-primary-400 transition-all duration-200 text-xl">→</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-800 to-primary-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-8"
          >
            Bist du wirklich bereit beizutreten?
          </motion.h2>
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to="/register"
                className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-50 transition-all transform hover:scale-105 shadow-xl"
              >
                Beitreten
              </Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};
