import { motion } from 'framer-motion';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
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
            <div className="prose max-w-none text-gray-700">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="mb-4">
                To create a unified digital space where our class can collaborate, communicate, and celebrate
                our journey to Abitur 2027. We believe in building strong connections and making our final
                school years memorable and enjoyable.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Contact</h3>
              <p className="mb-2">
                For questions, suggestions, or issues, reach out to us directly:
              </p>
              <a
                href="mailto:chef@essensgruppe.de"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                chef@essensgruppe.de
              </a>
            </div>
          </div>

          <div className="card text-center">
            <p className="text-gray-600 mb-4">Follow our journey</p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://instagram.com/thg_abi27"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Instagram
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="https://gofund.me/6c2bc4e83"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
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
