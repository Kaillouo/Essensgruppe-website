import { motion } from 'framer-motion';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0e1a] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Hero with background image */}
          <div
            className="relative rounded-2xl overflow-hidden mb-8 h-72 flex items-center justify-center"
            style={{
              backgroundImage: 'url(/the-people.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 text-center text-white px-6">
              <h1 className="text-5xl font-bold mb-2 drop-shadow-lg">Essensgruppe</h1>
              <p className="text-xl text-gray-200 drop-shadow">Abitur 2027 · Theodor-Heuss-Gymnasium Freiburg</p>
            </div>
          </div>

          <div className="card mb-6">
            <div className="prose max-w-none text-white/70">
              <h3 className="text-xl font-bold text-white mb-3">Unsere Mission</h3>
              <p className="mb-4">
                Wir wollen einen einheitlichen digitalen Raum schaffen, in dem unsere Klasse zusammenarbeiten,
                kommunizieren und unsere Reise zum Abitur 2027 feiern kann. Wir glauben an starke Verbindungen
                und möchten unsere letzten Schuljahre unvergesslich und genießbar machen.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Kontakt</h3>
              <p className="mb-2">
                Bei Fragen, Vorschlägen oder Problemen kannst du uns direkt erreichen:
              </p>
              <a
                href="mailto:chef@essensgruppe.de"
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                chef@essensgruppe.de
              </a>
            </div>
          </div>

          <div className="card text-center">
            <p className="text-white/50 mb-4">Folge unserer Reise</p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://instagram.com/thg_abi27"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                Instagram
              </a>
              <span className="text-white/20">•</span>
              <a
                href="https://gofund.me/6c2bc4e83"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                GoFundMe
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
