import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { motion } from 'framer-motion';

type Tab = 'analytics' | 'pending' | 'users' | 'abiZeitung' | 'settings';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [balanceModal, setBalanceModal] = useState<{ userId: string; username: string; currentBalance: number } | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceMode, setBalanceMode] = useState<'set' | 'adjust'>('set');
  const [passwordModal, setPasswordModal] = useState<{ userId: string; username: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [shownPassword, setShownPassword] = useState<string | null>(null);
  const [abiSubmissions, setAbiSubmissions] = useState<any[]>([]);
  const [abiLoading, setAbiLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [roleModal, setRoleModal] = useState<{ userId: string; username: string; currentRole: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [renameModal, setRenameModal] = useState<{ userId: string; username: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');

  useEffect(() => {
    loadAnalytics();
    loadPending();
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'pending') loadPending();
    if (activeTab === 'abiZeitung') loadAbiSubmissions();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  const loadAbiSubmissions = async () => {
    setAbiLoading(true);
    try {
      const res = await fetch('/api/abi/submissions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setAbiSubmissions(data);
    } catch (error) {
      console.error('Failed to load abi submissions:', error);
    } finally {
      setAbiLoading(false);
    }
  };

  const handleDeleteAbiSubmission = async (id: string) => {
    if (!window.confirm('Diesen Beitrag löschen?')) return;
    try {
      await fetch(`/api/abi/submissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAbiSubmissions(prev => prev.filter((s: any) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete submission:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await ApiService.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getUsers();
      setUsers(data as any);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPending = async () => {
    try {
      const data = await ApiService.getPendingUsers();
      setPendingUsers(data as any);
    } catch (error) {
      console.error('Failed to load pending users:', error);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await ApiService.approveUser(userId);
      loadPending();
      loadAnalytics();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeny = async (userId: string, username: string) => {
    if (window.confirm(`Anfrage von "${username}" ablehnen und entfernen?`)) {
      try {
        await ApiService.denyUser(userId);
        loadPending();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleBan = async (userId: string) => {
    if (window.confirm('Diesen Nutzer sperren? Er kann sich nicht mehr einloggen.')) {
      try {
        await ApiService.banUser(userId);
        loadUsers();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await ApiService.unbanUser(userId);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Diesen Nutzer und alle Daten dauerhaft löschen?')) {
      try {
        await ApiService.deleteUser(userId);
        loadUsers();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const openBalanceModal = (user: any) => {
    setBalanceModal({ userId: user.id, username: user.username, currentBalance: user.balance });
    setBalanceInput(String(user.balance));
    setBalanceMode('set');
  };

  const handleBalanceSave = async () => {
    if (!balanceModal) return;
    const amount = parseInt(balanceInput, 10);
    if (isNaN(amount)) return;

    try {
      if (balanceMode === 'set') {
        await ApiService.setBalance(balanceModal.userId, amount, 'Admin set balance');
      } else {
        await ApiService.adjustBalance(balanceModal.userId, amount, 'Admin adjustment');
      }
      setBalanceModal(null);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openPasswordModal = (user: any) => {
    setPasswordModal({ userId: user.id, username: user.username });
    setNewPasswordInput('');
    setShownPassword(null);
  };

  const handlePasswordReset = async () => {
    if (!passwordModal || newPasswordInput.length < 6) return;
    try {
      const result: any = await ApiService.adminResetPassword(passwordModal.userId, newPasswordInput);
      setShownPassword(result.password);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await ApiService.getAdminSettings();
      setRegistrationOpen(data.registrationOpen);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleToggleRegistration = async () => {
    if (registrationOpen === null) return;
    setSettingsLoading(true);
    try {
      await ApiService.updateAdminSettings(!registrationOpen);
      setRegistrationOpen(!registrationOpen);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const openRenameModal = (user: any) => {
    setRenameModal({ userId: user.id, username: user.username });
    setRenameInput(user.username);
  };

  const handleRename = async () => {
    if (!renameModal || renameInput.trim().length < 3) return;
    try {
      await ApiService.renameUser(renameModal.userId, renameInput.trim());
      setRenameModal(null);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openRoleModal = (user: any) => {
    setRoleModal({ userId: user.id, username: user.username, currentRole: user.role });
    setSelectedRole(user.role);
  };

  const handleRoleUpdate = async () => {
    if (!roleModal) return;
    try {
      await ApiService.updateUserRole(roleModal.userId, selectedRole);
      setRoleModal(null);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'pending', label: 'E-Mail Verifizierung', badge: pendingUsers.length },
    { id: 'users', label: 'Mitglieder' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'abiZeitung', label: 'Abi Zeitung' },
    { id: 'settings', label: 'Einstellungen' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-8"
        >
          Admin Panel
        </motion.h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-white/[0.06]">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-400 text-primary-400'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pending (email verification) Tab */}
        {activeTab === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 className="text-lg font-bold text-white mb-1">Warte auf E-Mail-Bestätigung</h3>
            <p className="text-sm text-white/50 mb-4">Diese Nutzer haben sich registriert, aber ihre E-Mail noch nicht bestätigt. Manuelles Freischalten oder Löschen möglich.</p>
            {pendingUsers.length === 0 ? (
              <p className="text-white/40 py-8 text-center">Keine ausstehenden Accounts.</p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-yellow-400/[0.06] border border-yellow-400/20 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-sm text-white/50">{user.email}</p>
                      <p className="text-xs text-white/30">Registriert {new Date(user.createdAt).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        title="Manuell freischalten (überspringt E-Mail-Bestätigung)"
                      >
                        Freischalten
                      </button>
                      <button
                        onClick={() => handleDeny(user.id, user.username)}
                        className="px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
              <h3 className="text-sm font-medium text-white/50 mb-2">Aktive Mitglieder</h3>
              <p className="text-3xl font-bold text-white">{analytics.totalUsers}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
              <h3 className="text-sm font-medium text-white/50 mb-2">Ausstehende Anfragen</h3>
              <p className="text-3xl font-bold text-yellow-400">{analytics.pendingUsers}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <h3 className="text-sm font-medium text-white/50 mb-2">Posts gesamt</h3>
              <p className="text-3xl font-bold text-white">{analytics.totalPosts}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
              <h3 className="text-sm font-medium text-white/50 mb-2">Events gesamt</h3>
              <p className="text-3xl font-bold text-white">{analytics.totalEvents}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card md:col-span-2 lg:col-span-4">
              <h3 className="text-lg font-bold text-white mb-4">Neue Mitglieder</h3>
              <div className="space-y-2">
                {analytics.recentUsers?.map((user: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-white/[0.06] last:border-0">
                    <span className="font-medium text-white">{user.username}</span>
                    <span className="text-sm text-white/50">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 className="text-lg font-bold text-white mb-4">Alle Mitglieder</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Nutzername</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">E-Mail</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Rolle</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Guthaben</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Posts</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 text-sm font-medium text-white">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-white/70">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => openRoleModal(user)}
                            className={`px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                              user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                              user.role === 'ESSENSGRUPPE_MITGLIED' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-white/10 text-white/60'
                            }`}
                            title="Klicken zum Ändern"
                          >
                            {user.role === 'ESSENSGRUPPE_MITGLIED' ? 'EG Mitglied' : user.role}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                            user.status === 'BANNED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => openBalanceModal(user)}
                            className="font-medium text-yellow-400 hover:text-yellow-300 underline"
                            title="Klicken zum Bearbeiten"
                          >
                            {user.balance} Coins
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/50">{user._count?.posts || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => openRenameModal(user)} className="text-indigo-400 hover:text-indigo-300 font-medium">
                              Umbenennen
                            </button>
                            <button onClick={() => openPasswordModal(user)} className="text-blue-400 hover:text-blue-300 font-medium">
                              Passwort
                            </button>
                            {user.status === 'BANNED' ? (
                              <button onClick={() => handleUnban(user.id)} className="text-green-400 hover:text-green-300 font-medium">
                                Entsperren
                              </button>
                            ) : (
                              <button onClick={() => handleBan(user.id)} className="text-orange-400 hover:text-orange-300 font-medium">
                                Sperren
                              </button>
                            )}
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 font-medium">
                              Löschen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Abi Zeitung Tab */}
        {activeTab === 'abiZeitung' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 className="text-lg font-bold text-white mb-4">📰 Abi Zeitung – Anonyme Beiträge</h3>
            {abiLoading ? (
              <div className="text-center py-8 text-white/40">Lade Beiträge...</div>
            ) : abiSubmissions.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Noch keine Beiträge.</p>
            ) : (
              <div className="space-y-4">
                {abiSubmissions.map((s: any) => (
                  <div key={s.id} className="border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{s.title}</h4>
                        <p className="text-sm text-white/60 mt-2 whitespace-pre-wrap">{s.content}</p>
                        <p className="text-xs text-white/30 mt-2">{new Date(s.createdAt).toLocaleString('de-DE')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteAbiSubmission(s.id)}
                        className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 flex-shrink-0"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card max-w-lg">
            <h3 className="text-lg font-bold text-white mb-6">Einstellungen</h3>

            <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
              <div>
                <p className="font-semibold text-white">Registrierung</p>
                <p className="text-sm text-white/50 mt-0.5">
                  {registrationOpen
                    ? 'Offen — neue Nutzer können sich registrieren'
                    : 'Geschlossen — Registrierung deaktiviert'}
                </p>
              </div>
              <button
                onClick={handleToggleRegistration}
                disabled={settingsLoading || registrationOpen === null}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  registrationOpen ? 'bg-green-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    registrationOpen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Balance Modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-white mb-1">Guthaben bearbeiten</h3>
            <p className="text-sm text-white/50 mb-4">
              {balanceModal.username} — aktuell: <span className="font-semibold text-yellow-400">{balanceModal.currentBalance} Coins</span>
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setBalanceMode('set'); setBalanceInput(String(balanceModal.currentBalance)); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceMode === 'set' ? 'bg-primary-600 text-white border-primary-600' : 'border-white/10 text-white/50'}`}
              >
                Auf Wert setzen
              </button>
              <button
                onClick={() => { setBalanceMode('adjust'); setBalanceInput('0'); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceMode === 'adjust' ? 'bg-primary-600 text-white border-primary-600' : 'border-white/10 text-white/50'}`}
              >
                Hinzufügen / Abziehen
              </button>
            </div>

            <input
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="input mb-4"
              placeholder={balanceMode === 'set' ? 'Neues Guthaben' : 'Betrag (+/-)'}
            />

            <div className="flex gap-3">
              <button onClick={() => setBalanceModal(null)} className="flex-1 btn btn-outline py-2">Abbrechen</button>
              <button onClick={handleBalanceSave} className="flex-1 btn btn-primary py-2">Speichern</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-white mb-1">Passwort zurücksetzen</h3>
            <p className="text-sm text-white/50 mb-4">
              Nutzer: <span className="font-semibold text-white">{passwordModal.username}</span>
            </p>

            {shownPassword ? (
              <div>
                <p className="text-sm text-white/60 mb-2">Neues Passwort gesetzt auf:</p>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-mono font-bold text-green-400 select-all">{shownPassword}</p>
                </div>
                <p className="text-xs text-white/30 mt-2">Dieses Passwort kopieren und dem Nutzer geben.</p>
                <button onClick={() => setPasswordModal(null)} className="w-full btn btn-primary py-2 mt-4">
                  Fertig
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="input mb-4"
                  placeholder="Neues Passwort (min. 6 Zeichen)"
                />
                <div className="flex gap-3">
                  <button onClick={() => setPasswordModal(null)} className="flex-1 btn btn-outline py-2">Abbrechen</button>
                  <button onClick={handlePasswordReset} disabled={newPasswordInput.length < 6} className="flex-1 btn btn-primary py-2 disabled:opacity-50">
                    Passwort setzen
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-white mb-1">Nutzername ändern</h3>
            <p className="text-sm text-white/50 mb-4">
              Aktuell: <span className="font-semibold text-white">{renameModal.username}</span>
            </p>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="input mb-1"
              placeholder="Neuer Nutzername"
              maxLength={20}
            />
            <p className="text-xs text-white/30 mb-4">3–20 Zeichen, nur Buchstaben, Zahlen, Unterstrich</p>
            <div className="flex gap-3">
              <button onClick={() => setRenameModal(null)} className="flex-1 btn btn-outline py-2">Abbrechen</button>
              <button
                onClick={handleRename}
                disabled={renameInput.trim().length < 3 || renameInput.trim() === renameModal.username}
                className="flex-1 btn btn-primary py-2 disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Role Modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-white mb-1">Rolle ändern</h3>
            <p className="text-sm text-white/50 mb-4">
              Nutzer: <span className="font-semibold text-white">{roleModal.username}</span>
            </p>
            <div className="space-y-2 mb-4">
              {(['ABI27', 'ESSENSGRUPPE_MITGLIED', 'ADMIN'] as const).map((role) => (
                <label key={role} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] cursor-pointer hover:bg-white/[0.04]">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                  />
                  <div>
                    <p className="font-medium text-white text-sm">
                      {role === 'ESSENSGRUPPE_MITGLIED' ? 'Essensgruppe Mitglied' : role}
                    </p>
                    <p className="text-xs text-white/40">
                      {role === 'ABI27' ? 'Standard nach E-Mail-Bestätigung' :
                       role === 'ESSENSGRUPPE_MITGLIED' ? 'Innerer Kreis — vom Admin hochgestuft' :
                       'Voller Zugriff auf Admin-Panel'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRoleModal(null)} className="flex-1 btn btn-outline py-2">Abbrechen</button>
              <button onClick={handleRoleUpdate} disabled={selectedRole === roleModal.currentRole} className="flex-1 btn btn-primary py-2 disabled:opacity-50">
                Speichern
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
