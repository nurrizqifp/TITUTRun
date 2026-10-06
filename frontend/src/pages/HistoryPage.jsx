import React, { useMemo } from 'react';
import { Activity, ArrowUpRight, Footprints, Gauge, Timer } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function HistoryChart({ logs }) {
  const data = useMemo(() => [...logs].reverse().map((log) => ({
    date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${log.date}T00:00:00`)),
    distance: log.distanceKm,
  })), [logs]);

  if (!data.length) return <div className="history-chart-empty"><Activity size={25} /><span>Grafik perjalananmu akan muncul setelah sesi pertama.</span></div>;
  return <div className="history-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 16, right: 14, left: -18, bottom: 0 }}><defs><linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7e45b" stopOpacity={0.42} /><stop offset="100%" stopColor="#b7e45b" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0e9" strokeDasharray="3 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#92988c', fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#92988c', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #e9ecdf', borderRadius: 12, fontSize: 12 }} formatter={(value) => [`${numberFormat.format(value)} km`, 'Jarak']} /><Area type="monotone" dataKey="distance" stroke="#537d2c" strokeWidth={2.5} fill="url(#historyFill)" activeDot={{ r: 5, fill: '#537d2c', stroke: '#fff', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>;
}

export default function HistoryPage({ logs }) {
  const totalDistance = logs.reduce((sum, log) => sum + log.distanceKm, 0);
  const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const avgPace = totalDistance ? totalMinutes / totalDistance : 0;

  return (
    <div className="page-content">
      <header className="page-header history-header"><div><div className="date-line"><Activity size={14} />PERJALANANMU</div><h1>Semua langkah <span>terekam.</span></h1><p>Progres yang kamu bangun, satu sesi pada satu waktu.</p></div></header>
      <section className="history-stats">
        <article className="history-stat"><span className="history-stat-icon"><Footprints size={17} /></span><span className="eyebrow">TOTAL JARAK</span><strong>{numberFormat.format(totalDistance)} <small>km</small></strong><span className="history-stat-note">{logs.length} sesi lari</span></article>
        <article className="history-stat"><span className="history-stat-icon mint"><Timer size={17} /></span><span className="eyebrow">TOTAL WAKTU</span><strong>{Math.floor(totalMinutes / 60)} <small>jam</small> {totalMinutes % 60} <small>mnt</small></strong><span className="history-stat-note">waktu bergerak</span></article>
        <article className="history-stat"><span className="history-stat-icon peach"><Gauge size={17} /></span><span className="eyebrow">RATA-RATA PACE</span><strong>{avgPace ? `${Math.floor(avgPace)}:${String(Math.round((avgPace % 1) * 60)).padStart(2, '0')}` : '—'} <small>/km</small></strong><span className="history-stat-note">menit per kilometer</span></article>
      </section>
      <section className="panel history-chart-panel"><div className="panel-heading"><div><span className="eyebrow">PROGRES JARAK</span><h2>Jejak yang makin jauh</h2></div><span className="chart-legend"><i />Jarak per sesi</span></div><HistoryChart logs={logs} /></section>
      <section className="panel history-table-panel"><div className="panel-heading"><div><span className="eyebrow">ARSIP LATIHAN</span><h2>Semua sesi</h2></div><span className="history-count">{logs.length} sesi</span></div>
        {logs.length ? <div className="history-table-wrap"><table className="history-table"><thead><tr><th>TANGGAL</th><th>JARAK</th><th>DURASI</th><th>PACE</th><th>RPE</th><th>CATATAN</th></tr></thead><tbody>{logs.map((log) => { const pace = log.durationMinutes / log.distanceKm; return <tr key={log.id}><td><span className="table-date-icon"><Footprints size={15} /></span>{dateFormat.format(new Date(`${log.date}T00:00:00`))}</td><td><strong>{numberFormat.format(log.distanceKm)} km</strong></td><td>{log.durationMinutes} mnt</td><td>{Math.floor(pace)}:{String(Math.round((pace % 1) * 60)).padStart(2, '0')} /km</td><td><span className="table-rpe">{log.rpe}<small>/10</small></span></td><td className="table-note">{log.notes || '—'}</td></tr>; })}</tbody></table></div> : <div className="empty-inline history-empty"><span className="empty-symbol">↗</span><span>Belum ada sesi. Setiap perjalanan dimulai dari satu langkah.</span></div>}
      </section>
      <div className="history-encouragement"><span>✳</span><p>Sudah terkumpul <strong>{logs.length} sesi</strong> — setiap satunya bukti bahwa kamu terus bergerak.</p><ArrowUpRight size={16} /></div>
      <footer className="app-footer"><span>© 2026 TITUT Run</span><span>Dikembangkan dengan semangat <b>Kelompok 2-A · UMY</b></span></footer>
    </div>
  );
}
