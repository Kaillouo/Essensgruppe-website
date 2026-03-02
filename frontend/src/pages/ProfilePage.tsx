import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { motion } from 'framer-motion';
import { AvatarCropModal } from '../components/AvatarCropModal';
import { NotificationPreference, UserBlock, ChatUser } from '../types';

export const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [blockSearch, setBlockSearch] = useState('');
  const [blockResults, setBlockResults] = useState<ChatUser[]>([]);
  const [blockSearching, setBlockSearching] = useState(false);

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null);
    setAvatarUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const updated: any = await ApiService.uploadAvatar(blob);
      updateUser(updated);
      setMessage({ type: 'success', text: 'Profilbild aktualisiert!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    ApiService.getProfile().then((data: any) => {
      setStats(data._count);
    });
    ApiService.getTransactions().then((data: any) => {
      setTransactions(data.slice(0, 5));
    });
    ApiService.getNotificationPreferences().then(setNotifPrefs).catch(() => {});
    ApiService.getBlocks().then(setBlocks).catch(() => {});
  }, []);

  const handleTogglePref = async (key: keyof NotificationPreference) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      const saved = await ApiService.updateNotificationPreferences(updated);
      setNotifPrefs(saved);
    } catch {
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleBlockSearch = async () => {
    if (!blockSearch.trim()) return;
    setBlockSearching(true);
    try {
      const results = await ApiService.searchChatUsers(blockSearch) as ChatUser[];
      setBlockResults(results.filter(u => u.id !== user?.id && !blocks.some(b => b.blockedId === u.id)));
    } catch {
      setBlockResults([]);
    } finally {
      setBlockSearching(false);
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await ApiService.blockUser(userId);
      const updated = await ApiService.getBlocks();
      setBlocks(updated);
      setBlockResults(prev => prev.filter(u => u.id !== userId));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await ApiService.unblockUser(userId);
      setBlocks(prev => prev.filter(b => b.blockedId !== userId));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      const updated: any = await ApiService.updateProfile(formData);
      updateUser(updated);
      setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert' });
      setIsEditing(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Neue Passwörter stimmen nicht überein' });
      return;
    }
    try {
      await ApiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: 'Passwort erfolgreich geändert' });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Bist du sicher, dass du deinen Account löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      try {
        await ApiService.deleteAccount();
        logout();
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message });
      }
    }
  };

  return (
    <>
    {cropFile && (
      <AvatarCropModal
        file={cropFile}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropFile(null)}
      />
    )}
    <div className="min-h-screen bg-[#0a0e1a] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-8"
        >
          Mein Profil
        </motion.h1>

        {/* Message */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent"
                title="Klicke um Profilbild zu ändern"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  {avatarUploading ? (
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </button>

              <div className="ml-4">
                <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
                <p className="text-white/50">{user?.role}</p>
                <p className="text-xs text-white/30 mt-0.5">Klicke auf das Profilbild um es zu ändern</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/50">E-Mail</label>
                  <p className="text-white/80">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/50">Mitglied seit</label>
                  <p className="text-white/80">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <button onClick={() => setIsEditing(true)} className="btn btn-outline w-full">
                  Profil bearbeiten
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Benutzername</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input" required />
                </div>
                {user?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">E-Mail</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" required />
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1">Speichern</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary flex-1">Abbrechen</button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-white mb-4">Statistiken</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-white/50">Spielguthaben</span>
                <span className="text-2xl font-bold text-yellow-400">{user?.balance} Coins</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-white/50">Forumsbeiträge</span>
                <span className="text-xl font-bold text-white">{stats?.posts || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-white/50">Kommentare</span>
                <span className="text-xl font-bold text-white">{stats?.comments || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-white/50">Abgegebene Votes</span>
                <span className="text-xl font-bold text-white">{stats?.votes || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mt-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Letzte Transaktionen</h3>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0">
                  <div>
                    <p className="font-medium text-white/80">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-white/40">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40">Noch keine Transaktionen</p>
          )}
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mt-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Passwort ändern</h3>
          {!isChangingPassword ? (
            <button onClick={() => setIsChangingPassword(true)} className="btn btn-outline">
              Passwort ändern
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Aktuelles Passwort</label>
                <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Neues Passwort</label>
                <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="input" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Passwort bestätigen</label>
                <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="input" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">Passwort aktualisieren</button>
                <button type="button" onClick={() => setIsChangingPassword(false)} className="btn btn-secondary flex-1">Abbrechen</button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card mt-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Benachrichtigungseinstellungen</h3>
          {notifPrefs ? (
            <div className="space-y-3">
              {([
                { key: 'newPost' as const, label: 'Neue Forenbeiträge', emoji: '\ud83d\udce2' },
                { key: 'newPrediction' as const, label: 'Neue Vorhersagen', emoji: '\ud83d\udd2e' },
                { key: 'predictionClosed' as const, label: 'Vorhersage abgeschlossen', emoji: '\ud83c\udfc1' },
                { key: 'predictionReminder' as const, label: 'Vorhersage-Erinnerung', emoji: '\u23f0' },
                { key: 'newEvent' as const, label: 'Neue Events', emoji: '\ud83d\udcc5' },
                { key: 'eventStatusChanged' as const, label: 'Event-Status geändert', emoji: '\ud83d\udd04' },
                { key: 'dailyCoins' as const, label: 'Tägliche Münzen', emoji: '\ud83e\ude99' },
                { key: 'newMessage' as const, label: 'Neue Nachrichten', emoji: '\ud83d\udcac' },
              ]).map(({ key, label, emoji }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
                  <span className="text-white/70">{emoji} {label}</span>
                  <button
                    onClick={() => handleTogglePref(key)}
                    disabled={notifSaving}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifPrefs[key] ? 'bg-primary-500' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
              <p className="text-xs text-white/30 mt-2">\ud83d\udce3 Admin-Benachrichtigungen können nicht deaktiviert werden.</p>
            </div>
          ) : (
            <p className="text-white/40">Laden...</p>
          )}
        </motion.div>

        {/* Blocked Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card mt-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Blockierte Nutzer</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBlockSearch()}
              placeholder="Nutzer suchen..."
              className="input flex-1"
            />
            <button onClick={handleBlockSearch} disabled={blockSearching} className="btn btn-outline">
              Suchen
            </button>
          </div>
          {blockResults.length > 0 && (
            <div className="mb-4 space-y-2">
              {blockResults.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.04] rounded-lg">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">{u.username.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="text-white/80">{u.username}</span>
                  </div>
                  <button onClick={() => handleBlock(u.id)} className="text-sm text-red-400 hover:text-red-300">Blockieren</button>
                </div>
              ))}
            </div>
          )}
          {blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.04] rounded-lg">
                  <div className="flex items-center gap-2">
                    {b.blocked.avatarUrl ? (
                      <img src={b.blocked.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">{b.blocked.username.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="text-white/80">{b.blocked.username}</span>
                  </div>
                  <button onClick={() => handleUnblock(b.blockedId)} className="text-sm text-green-400 hover:text-green-300">Entsperren</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40">Keine blockierten Nutzer</p>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card mt-6 border-red-500/20"
        >
          <h3 className="text-xl font-bold text-red-400 mb-4">Gefahrenzone</h3>
          <p className="text-white/40 mb-4">Wenn du deinen Account löschst, gibt es kein Zurück. Bitte sei dir sicher.</p>
          <button onClick={handleDeleteAccount} className="btn bg-red-600 text-white hover:bg-red-700">
            Account löschen
          </button>
        </motion.div>
      </div>
    </div>
    </>
  );
};
