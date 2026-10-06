import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, WifiOff } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import LogPage from './pages/LogPage.jsx';
import { getLogs, saveLog } from './utils/api.js';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

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

  return (
    <div className="app-shell">
      <Navbar activePage={page} onNavigate={setPage} />
      <main className="main-area">
        {loading && <div className="loading-strip"><LoaderCircle size={15} className="spin" />Memuat perjalananmu...</div>}
        {error && <div className="connection-alert" role="alert"><WifiOff size={17} /><span>{error}</span><button onClick={refreshLogs}>Coba lagi</button></div>}
        {!loading && (page === 'dashboard' || page === 'history') && (
          page === 'dashboard' ? <DashboardPage logs={logs} onNavigate={setPage} /> : <HistoryPage logs={logs} />
        )}
        {page === 'log' && <LogPage onSave={handleSave} saving={saving} onCancel={() => setPage('dashboard')} />}
      </main>
    </div>
  );
}
