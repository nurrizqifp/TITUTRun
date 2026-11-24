import React, { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Footprints,
  Gauge,
  HeartPulse,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import Calendar from '../components/Calendar.jsx';
import { formatPace, generateSchedule } from '../utils/api.js';

const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
const distanceFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function lastSevenDays(logs) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      day: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date),
      distance: logs.filter((log) => log.date === key).reduce((sum, log) => sum + log.distanceKm, 0),
    };
  });
}

function weekStart(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function WeeklyChart({ data }) {
  if (data.every((item) => item.distance === 0)) {
    return (
      <div className="chart-empty">
        <TrendingUp size={18} />
        <span>Grafik jarak 7 hari terakhir akan tampil setelah ada sesi tercatat.</span>
      </div>
    );
  }
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="distanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#83b442" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#83b442" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e6eae0" strokeDasharray="3 5" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#5d6657', fontSize: 12, fontWeight: 600 }} dy={8} />
          <Tooltip
            cursor={{ stroke: '#c7d1ba', strokeDasharray: '3 3' }}
            contentStyle={{ border: '1px solid #e4e8de', borderRadius: 10, boxShadow: '0 6px 20px rgba(30, 38, 26, 0.08)', fontSize: 13 }}
            formatter={(value) => [`${distanceFormat.format(value)} km`, 'Jarak']}
          />
          <Area type="monotone" dataKey="distance" stroke="#426429" strokeWidth={2.5} fill="url(#distanceFill)" activeDot={{ r: 5, fill: '#426429', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlanCard() {
  const [preferences, setPreferences] = useState({ goal: '5K', experience: 'Pemula', weeklyRuns: 3 });
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createPlan() {
    setLoading(true);
    setError('');
    try {
      setSchedule(await generateSchedule({ ...preferences, weeklyRuns: Number(preferences.weeklyRuns) }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel plan-panel">
      <div className="plan-header">
        <div className="plan-intro">
          <div className="plan-badge">
            <Sparkles size={15} />
            <span>Generator Rencana Mingguan</span>
          </div>
          <h2>Susun jadwal lari sesuai targetmu</h2>
          <p>Pilih target jarak, level saat ini, dan jumlah hari lari per minggu.</p>
        </div>
        <div className="plan-controls">
          <div className="plan-fields">
            <label>
              <span>Target</span>
              <select value={preferences.goal} onChange={(event) => setPreferences({ ...preferences, goal: event.target.value })}>
                <option value="5K">5K</option>
                <option value="10K">10K</option>
                <option value="Half marathon">Half marathon</option>
                <option value="General fitness">General fitness</option>
              </select>
            </label>
            <label>
              <span>Level</span>
              <select value={preferences.experience} onChange={(event) => setPreferences({ ...preferences, experience: event.target.value })}>
                <option value="Pemula">Pemula · Pace 8</option>
                <option value="Menengah">Menengah · Pace 5</option>
                <option value="Lanjutan">Lanjutan · Pace 3</option>
              </select>
            </label>
            <label>
              <span>Hari / minggu</span>
              <select value={preferences.weeklyRuns} onChange={(event) => setPreferences({ ...preferences, weeklyRuns: event.target.value })}>
                <option value="2">2 hari</option>
                <option value="3">3 hari</option>
                <option value="4">4 hari</option>
                <option value="5">5 hari</option>
                <option value="6">6 hari</option>
              </select>
            </label>
          </div>
          <button type="button" className="button plan-button" onClick={createPlan} disabled={loading}>
            <span>{loading ? 'Menyusun...' : 'Buat rencana'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && <div className="alert plan-error" role="alert">{error}</div>}

      {schedule && (
        <div className="schedule-result" aria-live="polite">
          <div className="schedule-meta">
            <strong>{schedule.title}</strong>
            <span className={`source-label ${schedule.source}`} title={schedule.modelUsed}>
              {schedule.source === 'local'
                ? (schedule.fallbackReason ? 'Mode lokal · fallback AI' : 'Mode lokal')
                : schedule.adjusted
                  ? `AI · ${schedule.modelUsed} · disesuaikan`
                  : `AI · ${schedule.modelUsed}`}
            </span>
          </div>
          <div className="schedule-days">
            {schedule.days.map((day) => (
              <div key={day.day} className={`schedule-day ${day.kind}`}>
                <b>{day.day.slice(0, 3)}</b>
                <strong>{day.workout}</strong>
                <span>{day.detail}</span>
              </div>
            ))}
          </div>
          <small>{schedule.disclaimer}{schedule.fallbackReason && ` ${schedule.fallbackReason}`}</small>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage({ logs, onNavigate, user }) {
  const now = new Date();
  const today = fullDate.format(now);
  const currentWeek = weekStart(now);
  const weekLogs = logs.filter((log) => new Date(`${log.date}T00:00:00`) >= currentWeek);
  const totalDistance = weekLogs.reduce((sum, log) => sum + log.distanceKm, 0);
  const totalMinutes = weekLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const chartData = useMemo(() => lastSevenDays(logs), [logs]);
  const recentLogs = logs.slice(0, 4);
  const weekAvgPace = totalDistance > 0 ? formatPace(totalMinutes, totalDistance) : '—';

  const stats = [
    { label: 'Jarak minggu ini', value: distanceFormat.format(totalDistance), unit: 'km', icon: Footprints, note: `${weekLogs.length} sesi tercatat` },
    { label: 'Waktu bergerak', value: String(totalMinutes), unit: 'mnt', icon: Timer, note: 'total minggu ini' },
    { label: 'Rata-rata RPE', value: weekLogs.length ? (weekLogs.reduce((sum, log) => sum + log.rpe, 0) / weekLogs.length).toFixed(1).replace('.', ',') : '—', unit: weekLogs.length ? '/ 10' : '', icon: Gauge, note: 'tingkat usaha' },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <div className="date-line"><CalendarDays size={15} /><span>{today}</span></div>
          <h1>Halo, <span>{user?.name || 'pelari'}</span>.</h1>
          <p>Ringkasan latihan minggu ini dan jadwal lari terarah untukmu.</p>
        </div>
        <button type="button" className="button button-primary header-cta" onClick={() => onNavigate('log')}>
          <Plus size={16} />
          <span>Catat lari</span>
        </button>
      </header>

      <section className="stats-grid" aria-label="Ringkasan minggu ini">
        {stats.map(({ label, value, unit, icon: Icon, note }, index) => (
          <article className={`stat-card stat-${index}`} key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className="stat-icon"><Icon size={17} /></span>
            </div>
            <div className="stat-number">{value}<small>{unit}</small></div>
            <div className="stat-note">{note}</div>
          </article>
        ))}
      </section>

      <PlanCard />

      <section className="dashboard-grid">
        <div className="main-column">
          <Calendar logs={logs} />
          <section className="panel chart-panel">
            <div className="panel-heading chart-heading">
              <div>
                <h2>Jarak 7 hari terakhir</h2>
                <p className="panel-subtitle">Akumulasi jarak harian</p>
              </div>
              <span className="chart-total">{distanceFormat.format(chartData.reduce((sum, item) => sum + item.distance, 0))}<small> km</small></span>
            </div>
            <WeeklyChart data={chartData} />
          </section>
        </div>

        <div className="side-column">
          <section className="panel recent-panel">
            <div className="panel-heading">
              <h2>Catatan terbaru</h2>
              <button type="button" className="text-button" onClick={() => onNavigate('history')}>
                <span>Lihat semua</span>
                <ChevronRight size={15} />
              </button>
            </div>
            {recentLogs.length ? (
              <div className="recent-list">
                {recentLogs.map((log) => (
                  <div className="recent-item" key={log.id}>
                    <span className="recent-icon"><Footprints size={16} /></span>
                    <div className="recent-main">
                      <strong>{distanceFormat.format(log.distanceKm)} km</strong>
                      <span>{shortDate.format(new Date(`${log.date}T00:00:00`))} · {log.durationMinutes} mnt</span>
                    </div>
                    <span className="recent-rpe">RPE {log.rpe}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                <span>Belum ada lari tercatat minggu ini.</span>
                <button type="button" onClick={() => onNavigate('log')}>Catat sesi pertama</button>
              </div>
            )}
          </section>

          <section className="panel summary-side-card">
            <div className="summary-side-head">
              <Activity size={17} />
              <h3>Pace rata-rata minggu ini</h3>
            </div>
            <div className="summary-side-value">{weekAvgPace} <small>{weekAvgPace !== '—' ? '/km' : ''}</small></div>
            <p>Dihitung dari total durasi dan jarak sesi pada minggu berjalan.</p>
          </section>

          <div className="mindful-note">
            <HeartPulse size={18} />
            <p><strong>Pemulihan itu penting.</strong> Beri jeda istirahat di antara sesi intensitas tinggi agar tubuh beradaptasi dengan aman.</p>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <span>© 2026 TITUT Run</span>
        <span>Kelompok 2-A · Manajemen Proyek TI UMY</span>
      </footer>
    </div>
  );
}
