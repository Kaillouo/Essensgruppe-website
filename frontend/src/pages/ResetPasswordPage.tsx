import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ApiService } from '../services/api.service';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Ungültiger Link</h1>
          <p className="text-gray-600 mb-6">Kein Token gefunden. Bitte nutze den Link aus der E-Mail.</p>
          <Link to="/forgot-password" className="btn btn-primary w-full py-3 text-center block">
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Passwort muss mindestens 6 Zeichen lang sein.');
    }
    if (newPassword !== confirm) {
      return setError('Passwörter stimmen nicht überein.');
    }

    setLoading(true);
    try {
      await ApiService.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Zurücksetzen fehlgeschlagen.');
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
        {success ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Passwort geändert!</h1>
            <p className="text-gray-600 mb-6">Du wirst in Kürze zum Login weitergeleitet...</p>
            <Link to="/login" className="btn btn-primary w-full py-3 text-center block">
              Jetzt einloggen
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Neues Passwort</h1>
              <p className="text-gray-500 text-sm">Wähle ein sicheres neues Passwort.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
                  Neues Passwort
                </label>
                <input
                  id="pw"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mindestens 6 Zeichen"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Nochmal eingeben"
                  className="input-field w-full"
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};
