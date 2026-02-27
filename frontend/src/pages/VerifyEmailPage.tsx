import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiService } from '../services/api.service';
import { motion } from 'framer-motion';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invocation in dev
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Kein Token gefunden. Bitte nutze den Link aus der E-Mail.');
      return;
    }

    ApiService.verifyEmail(token)
      .then((res: any) => {
        setStatus('success');
        setMessage(res.message || 'E-Mail erfolgreich bestätigt!');
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Bestätigung fehlgeschlagen.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-6">
              <svg className="animate-spin h-12 w-12 text-primary-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-700">E-Mail wird bestätigt...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Account aktiviert!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/login"
              className="btn btn-primary w-full py-3 text-center block"
            >
              Jetzt einloggen
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Bestätigung fehlgeschlagen</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/register"
              className="btn btn-primary w-full py-3 text-center block"
            >
              Neu registrieren
            </Link>
            <div className="mt-4">
              <Link to="/" className="text-gray-500 text-sm hover:text-gray-700">
                ← Zurück zur Startseite
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
