import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ApiService } from '../services/api.service';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ApiService.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Anfrage fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">E-Mail gesendet!</h1>
            <p className="text-gray-600 mb-6">
              Falls ein Account mit <strong>{email}</strong> existiert, erhältst du in Kürze einen Link zum Zurücksetzen deines Passworts.
            </p>
            <Link to="/login" className="btn btn-primary w-full py-3 text-center block">
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Passwort vergessen?</h1>
              <p className="text-gray-500 text-sm">Gib deine E-Mail ein — wir senden dir einen Reset-Link.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="deine@email.de"
                  className="input-field w-full"
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
                ← Zurück zum Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
