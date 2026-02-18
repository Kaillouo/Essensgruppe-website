import { motion } from 'framer-motion';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">About Essensgruppe</h1>

          <div className="card mb-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Abitur 2027</h2>
              <p className="text-gray-600">Our Journey Together</p>
            </div>

            <div className="prose max-w-none text-gray-700">
              <p className="mb-4">
                Welcome to Essensgruppe, the official community portal for the Abitur 2027 class.
                This platform brings together our entire class to connect, share, plan events, and create memories together.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">What We Offer</h3>
              <ul className="space-y-2 mb-4">
                <li><strong>Forum:</strong> Discuss ideas, share thoughts, and stay connected</li>
                <li><strong>Event Planning:</strong> Organize class events, trips, and celebrations</li>
                <li><strong>Resources:</strong> Access teacher contacts, schedules, and important links</li>
                <li><strong>Minecraft Server:</strong> Play together on our dedicated server</li>
                <li><strong>Games:</strong> Have fun with friendly gambling games and competitions</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Our Mission</h3>
              <p className="mb-4">
                To create a unified digital space where our class can collaborate, communicate, and celebrate
                our journey to Abitur 2027. We believe in building strong connections and making our final
                school years memorable and enjoyable.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Contact</h3>
              <p className="mb-4">
                For questions, suggestions, or issues, please reach out to the admin team through the platform
                or contact us directly through your class representatives.
              </p>
            </div>
          </div>

          <div className="card text-center">
            <p className="text-gray-600 mb-4">Follow our journey</p>
            <div className="flex justify-center space-x-4">
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                TikTok
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                Instagram
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                GoFundMe
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
