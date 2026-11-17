import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, WifiOff } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import LogPage from './pages/LogPage.jsx';
import {
  getLogs,
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  saveLog,
  setUnauthorizedHandler,
} from './utils/api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setLogs([]);
      setPage('dashboard');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setLogs(await getLogs());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setAuthChecking(true);
    setError('');
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (requestError) {
      if (requestError.status === 401) {
        setUser(null);
      } else {
        setError(requestError.message);
      }
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user) {
      refreshLogs();
    } else {
      setLogs([]);
    }
  }, [user, refreshLogs]);

  async function handleLogin(credentials) {
    const data = await loginUser(credentials);
    setUser(data.user);
    setPage('dashboard');
  }

  async function handleRegister(payload) {
    const data = await registerUser(payload);
    setUser(data.user);
    setPage('dashboard');
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Clear local session state even if network request fails.
    }
    setUser(null);
    setLogs([]);
    setPage('dashboard');
  }

  async function handleSave(metrics) {
    setSaving(true);
    try {
      const savedLog = await saveLog(metrics);
      setLogs((current) => [savedLog, ...current].sort((a, b) => b.date.localeCompare(a.date)));
      setPage('dashboard');
    } finally {
      setSaving(false);
    }
  }

  if (authChecking) {
    return (
      <div className="auth-loading">
        <LoaderCircle size={18} className="spin" />
        <span>Memeriksa sesi masuk...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {error && (
          <div className="connection-alert auth-connection-alert" role="alert">
            <WifiOff size={17} />
            <span>{error}</span>
            <button type="button" onClick={checkSession}>Coba lagi</button>
          </div>
        )}
        <AuthPage onLogin={handleLogin} onRegister={handleRegister} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Navbar activePage={page} onNavigate={setPage} user={user} onLogout={handleLogout} />
      <main className="main-area">
        {loading && <div className="loading-strip"><LoaderCircle size={15} className="spin" />Memuat perjalananmu...</div>}
        {error && <div className="connection-alert" role="alert"><WifiOff size={17} /><span>{error}</span><button type="button" onClick={refreshLogs}>Coba lagi</button></div>}
        {!loading && (page === 'dashboard' || page === 'history') && (
          page === 'dashboard'
            ? <DashboardPage logs={logs} onNavigate={setPage} user={user} />
            : <HistoryPage logs={logs} />
        )}
        {page === 'log' && <LogPage onSave={handleSave} saving={saving} onCancel={() => setPage('dashboard')} />}
      </main>
    </div>
  );
}
