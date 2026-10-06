import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, Footprints, Gauge, Sparkles, Timer, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import Calendar from '../components/Calendar.jsx';
import { generateSchedule } from '../utils/api.js';

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
    return <div className="chart-empty"><span className="chart-empty-icon">↗</span><span>Setiap langkah akan terlihat di sini.</span></div>;
  }
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
          <defs><linearGradient id="distanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7e45b" stopOpacity={0.38} /><stop offset="100%" stopColor="#b7e45b" stopOpacity={0.015} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#edf0e9" strokeDasharray="3 5" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#92988c', fontSize: 11, fontWeight: 600 }} dy={9} />
          <Tooltip cursor={{ stroke: '#d6ddcc', strokeDasharray: '3 3' }} contentStyle={{ border: '1px solid #e9ecdf', borderRadius: 12, boxShadow: '0 8px 24px #25371814', fontSize: 12 }} formatter={(value) => [`${distanceFormat.format(value)} km`, 'Jarak']} />
          <Area type="monotone" dataKey="distance" stroke="#537d2c" strokeWidth={2.5} fill="url(#distanceFill)" activeDot={{ r: 5, fill: '#537d2c', stroke: '#fff', strokeWidth: 3 }} />
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
      <div className="plan-intro">
        <div className="plan-top"><span className="plan-icon"><Sparkles size={19} /></span><span className="plan-tag">TEMUKAN RITMEMU</span><span className="plan-decoration">✳</span></div>
        <h2>Rencana yang pas untukmu.</h2>
        <p>Latihan terarah, tapi tetap dengarkan tubuhmu.</p>
      </div>
      <div className="plan-fields">
        <label>Target<select value={preferences.goal} onChange={(event) => setPreferences({ ...preferences, goal: event.target.value })}><option>5K</option><option>10K</option><option>Half marathon</option><option>General fitness</option></select></label>
        <label>Level<select value={preferences.experience} onChange={(event) => setPreferences({ ...preferences, experience: event.target.value })}><option>Pemula</option><option>Menengah</option><option>Lanjutan</option></select></label>
        <label>Hari lari / minggu<select value={preferences.weeklyRuns} onChange={(event) => setPreferences({ ...preferences, weeklyRuns: event.target.value })}><option value="2">2 hari</option><option value="3">3 hari</option><option value="4">4 hari</option><option value="5">5 hari</option><option value="6">6 hari</option></select></label>
      </div>
      <button className="button plan-button" onClick={createPlan} disabled={loading}>{loading ? 'Menyusun rencana...' : 'Buat rencana latihan'}<ChevronRight size={16} /></button>
      {error && <div className="alert plan-error" role="alert">{error}</div>}
      {schedule && <div className="schedule-result" aria-live="polite"><strong>{schedule.title}</strong><span className={`source-label ${schedule.source}`} title={schedule.modelUsed}>{schedule.source === 'local' ? (schedule.fallbackReason ? 'Mode lokal · fallback AI' : 'Mode lokal') : schedule.adjusted ? `AI · ${schedule.modelUsed} · disesuaikan` : `AI · ${schedule.modelUsed}`}</span><div className="schedule-days">{schedule.days.map((day) => <div key={day.day}><b>{day.day.slice(0, 3)}</b><span>{day.workout}</span></div>)}</div><small>{schedule.disclaimer}{schedule.fallbackReason && ` ${schedule.fallbackReason}`}</small></div>}
      {!schedule && <div className="plan-footnote"><Zap size={14} />Rencana mingguan, dibuat untukmu</div>}
    </section>
  );
}

export default function DashboardPage({ logs, onNavigate }) {
  const now = new Date();
  const today = fullDate.format(now);
  const currentWeek = weekStart(now);
  const weekLogs = logs.filter((log) => new Date(`${log.date}T00:00:00`) >= currentWeek);
  const totalDistance = weekLogs.reduce((sum, log) => sum + log.distanceKm, 0);
  const totalMinutes = weekLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const chartData = useMemo(() => lastSevenDays(logs), [logs]);
  const recentLogs = logs.slice(0, 3);
  const stats = [
    { label: 'JARAK MINGGU INI', value: distanceFormat.format(totalDistance), unit: 'km', icon: Footprints, direction: <ArrowUpRight size={14} />, note: `${weekLogs.length} sesi tercatat` },
    { label: 'WAKTU BERGERAK', value: String(totalMinutes), unit: 'mnt', icon: Timer, direction: null, note: 'total minggu ini' },
    { label: 'RATA-RATA RPE', value: weekLogs.length ? (weekLogs.reduce((sum, log) => sum + log.rpe, 0) / weekLogs.length).toFixed(1).replace('.', ',') : '—', unit: weekLogs.length ? '/ 10' : '', icon: Gauge, direction: <ArrowDownRight size={14} />, note: 'tingkat usaha' },
  ];

  return (
    <div className="page-content">
      <header className="page-header">
        <div><div className="date-line"><CalendarDays size={14} />{today}</div><h1>Setiap langkah <span>ada artinya.</span></h1><p>Halo, pelari! Yuk lihat perjalananmu minggu ini.</p></div>
        <button className="button button-primary header-cta" onClick={() => onNavigate('log')}><span>+</span> Catat lari</button>
      </header>
      <section className="stats-grid">
        {stats.map(({ label, value, unit, icon: Icon, direction, note }, index) => (
          <article className={`stat-card stat-${index}`} key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><div className="stat-number">{value}<small>{unit}</small></div><div className="stat-note">{direction && <span className="stat-trend">{direction}</span>}{note}</div><i className="stat-orb" /></article>
        ))}
      </section>
      <PlanCard />
      <section className="dashboard-grid">
        <div className="main-column">
          <Calendar logs={logs} />
          <section className="panel chart-panel"><div className="panel-heading chart-heading"><div><span className="eyebrow">GAMBAR BESAR</span><h2>Lari terasa lebih ringan?</h2><p>Jarak harian · 7 hari terakhir</p></div><span className="chart-total">{distanceFormat.format(chartData.reduce((sum, item) => sum + item.distance, 0))}<small> km</small></span></div><WeeklyChart data={chartData} /></section>
          <section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">CATATAN TERBARU</span><h2>Jejak langkahmu</h2></div><button className="text-button" onClick={() => onNavigate('history')}>Lihat semua <ChevronRight size={15} /></button></div>
            {recentLogs.length ? <div className="recent-list">{recentLogs.map((log) => <div className="recent-item" key={log.id}><span className="recent-icon"><Footprints size={17} /></span><span className="recent-date">{shortDate.format(new Date(`${log.date}T00:00:00`))}</span><span className="recent-distance">{distanceFormat.format(log.distanceKm)} <small>km</small></span><span className="recent-duration">{log.durationMinutes} mnt</span><span className="recent-rpe">RPE {log.rpe}</span></div>)}</div> : <div className="empty-inline"><span className="empty-symbol">↗</span><span>Belum ada lari yang tercatat. Mulai dari yang pertama!</span><button onClick={() => onNavigate('log')}>Catat lari</button></div>}
          </section>
        </div>
        <div className="side-column"><div className="quote-card"><span className="quote-mark">“</span><p>Jangan hitung hari. Buatlah setiap hari berarti.</p><span>— Muhammad Ali</span><i>✳</i></div><div className="mindful-note"><span>☀</span><p><strong>Ingat ya,</strong> istirahat juga bagian dari latihan. Tubuhmu tahu kapan waktunya pelan-pelan.</p></div></div>
      </section>
      <footer className="app-footer"><span>© 2026 TITUT Run</span><span>Dikembangkan dengan semangat <b>Kelompok 2-A · UMY</b></span></footer>
    </div>
  );
}
