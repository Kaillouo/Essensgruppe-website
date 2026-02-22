import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { motion } from 'framer-motion';

type Tab = 'analytics' | 'pending' | 'users' | 'abiZeitung';

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

  useEffect(() => {
    loadAnalytics();
    loadPending();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'pending') loadPending();
    if (activeTab === 'abiZeitung') loadAbiSubmissions();
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
    if (window.confirm(`Deny and remove request from "${username}"?`)) {
      try {
        await ApiService.denyUser(userId);
        loadPending();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleBan = async (userId: string) => {
    if (window.confirm('Ban this user? They will not be able to log in.')) {
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
    if (window.confirm('Permanently delete this user and all their data?')) {
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
      const result: any = await ApiService.resetPassword(passwordModal.userId, newPasswordInput);
      setShownPassword(result.password);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'pending', label: 'Join Requests', badge: pendingUsers.length },
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'abiZeitung', label: 'Abi Zeitung' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-8"
        >
          Admin Panel
        </motion.h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
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

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Join Requests</h3>
            {pendingUsers.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{user.username}</p>
                      <p className="text-sm text-gray-500">Requested {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(user.id, user.username)}
                        className="px-4 py-2 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Deny
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
              <h3 className="text-sm font-medium text-gray-600 mb-2">Active Members</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Requests</h3>
              <p className="text-3xl font-bold text-yellow-600">{analytics.pendingUsers}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Posts</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalPosts}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Events</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalEvents}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card md:col-span-2 lg:col-span-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Members</h3>
              <div className="space-y-2">
                {analytics.recentUsers?.map((user: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <span className="font-medium text-gray-900">{user.username}</span>
                    <span className="text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">All Members</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Username</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Balance</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Posts</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                            user.status === 'BANNED' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => openBalanceModal(user)}
                            className="font-medium text-yellow-600 hover:text-yellow-800 underline"
                            title="Click to edit balance"
                          >
                            {user.balance} coins
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user._count?.posts || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => openPasswordModal(user)} className="text-blue-600 hover:text-blue-800 font-medium">
                              Password
                            </button>
                            {user.status === 'BANNED' ? (
                              <button onClick={() => handleUnban(user.id)} className="text-green-600 hover:text-green-800 font-medium">
                                Unban
                              </button>
                            ) : (
                              <button onClick={() => handleBan(user.id)} className="text-orange-500 hover:text-orange-700 font-medium">
                                Ban
                              </button>
                            )}
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 font-medium">
                              Delete
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">📰 Abi Zeitung – Anonyme Beiträge</h3>
            {abiLoading ? (
              <div className="text-center py-8 text-gray-400">Lade Beiträge...</div>
            ) : abiSubmissions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Noch keine Beiträge.</p>
            ) : (
              <div className="space-y-4">
                {abiSubmissions.map((s: any) => (
                  <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{s.title}</h4>
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{s.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(s.createdAt).toLocaleString('de-DE')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteAbiSubmission(s.id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex-shrink-0"
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
      </div>

      {/* Balance Modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Balance</h3>
            <p className="text-sm text-gray-500 mb-4">
              {balanceModal.username} — current: <span className="font-semibold text-yellow-600">{balanceModal.currentBalance} coins</span>
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setBalanceMode('set'); setBalanceInput(String(balanceModal.currentBalance)); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceMode === 'set' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
              >
                Set to
              </button>
              <button
                onClick={() => { setBalanceMode('adjust'); setBalanceInput('0'); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceMode === 'adjust' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
              >
                Add / Remove
              </button>
            </div>

            <input
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="input mb-4"
              placeholder={balanceMode === 'set' ? 'New balance' : 'Amount (+/-)'}
            />

            <div className="flex gap-3">
              <button onClick={() => setBalanceModal(null)} className="flex-1 btn btn-outline py-2">Cancel</button>
              <button onClick={handleBalanceSave} className="flex-1 btn btn-primary py-2">Save</button>
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
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              User: <span className="font-semibold">{passwordModal.username}</span>
            </p>

            {shownPassword ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">New password set to:</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-lg font-mono font-bold text-green-700 select-all">{shownPassword}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Copy this and give it to the user.</p>
                <button onClick={() => setPasswordModal(null)} className="w-full btn btn-primary py-2 mt-4">
                  Done
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="input mb-4"
                  placeholder="New password (min 6 chars)"
                />
                <div className="flex gap-3">
                  <button onClick={() => setPasswordModal(null)} className="flex-1 btn btn-outline py-2">Cancel</button>
                  <button onClick={handlePasswordReset} disabled={newPasswordInput.length < 6} className="flex-1 btn btn-primary py-2 disabled:opacity-50">
                    Set Password
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
