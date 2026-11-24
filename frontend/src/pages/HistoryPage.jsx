import React, { useMemo } from 'react';
import { Activity, Footprints, Gauge, Timer } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPace } from '../utils/api.js';

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function HistoryChart({ logs }) {
  const data = useMemo(() => [...logs].reverse().map((log) => ({
    date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${log.date}T00:00:00`)),
    distance: log.distanceKm,
  })), [logs]);

  if (!data.length) {
    return (
      <div className="history-chart-empty">
        <Activity size={24} />
        <span>Grafik perjalananmu akan muncul setelah sesi pertama tercatat.</span>
      </div>
    );
  }
  return (
    <div className="history-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 14, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#83b442" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#83b442" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e6eae0" strokeDasharray="3 5" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#5d6657', fontSize: 12 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5d6657', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ border: '1px solid #e4e8de', borderRadius: 10, fontSize: 13 }}
            formatter={(value) => [`${numberFormat.format(value)} km`, 'Jarak']}
          />
          <Area type="monotone" dataKey="distance" stroke="#426429" strokeWidth={2.5} fill="url(#historyFill)" activeDot={{ r: 5, fill: '#426429', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HistoryPage({ logs }) {
  const totalDistance = logs.reduce((sum, log) => sum + log.distanceKm, 0);
  const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const avgPace = totalDistance ? formatPace(totalMinutes, totalDistance) : '—';

  return (
    <div className="page-content">
      <header className="page-header history-header">
        <div>
          <h1>Riwayat <span>latihan.</span></h1>
          <p>Progres jarak, waktu bergerak, dan arsip seluruh sesi lari Anda.</p>
        </div>
      </header>

      <section className="history-stats" aria-label="Statistik keseluruhan">
        <article className="history-stat">
          <span className="history-stat-icon"><Footprints size={18} /></span>
          <div>
            <span className="history-stat-label">Total jarak</span>
            <strong>{numberFormat.format(totalDistance)} <small>km</small></strong>
            <span className="history-stat-note">{logs.length} sesi lari</span>
          </div>
        </article>
        <article className="history-stat">
          <span className="history-stat-icon mint"><Timer size={18} /></span>
          <div>
            <span className="history-stat-label">Total waktu</span>
            <strong>{Math.floor(totalMinutes / 60)} <small>jam</small> {totalMinutes % 60} <small>mnt</small></strong>
            <span className="history-stat-note">waktu bergerak</span>
          </div>
        </article>
        <article className="history-stat">
          <span className="history-stat-icon peach"><Gauge size={18} /></span>
          <div>
            <span className="history-stat-label">Rata-rata pace</span>
            <strong>{avgPace} <small>{avgPace !== '—' ? '/km' : ''}</small></strong>
            <span className="history-stat-note">menit per kilometer</span>
          </div>
        </article>
      </section>

      <section className="panel history-chart-panel">
        <div className="panel-heading">
          <h2>Progres jarak per sesi</h2>
          <span className="chart-legend"><i />Jarak (km)</span>
        </div>
        <HistoryChart logs={logs} />
      </section>

      <section className="panel history-table-panel">
        <div className="panel-heading">
          <h2>Semua sesi</h2>
          <span className="history-count">{logs.length} sesi</span>
        </div>
        {logs.length ? (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jarak</th>
                  <th>Durasi</th>
                  <th>Pace</th>
                  <th>RPE</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="table-date-icon"><Footprints size={14} /></span>
                      {dateFormat.format(new Date(`${log.date}T00:00:00`))}
                    </td>
                    <td><strong>{numberFormat.format(log.distanceKm)} km</strong></td>
                    <td>{log.durationMinutes} mnt</td>
                    <td>{formatPace(log.durationMinutes, log.distanceKm)} /km</td>
                    <td><span className="table-rpe">{log.rpe}/10</span></td>
                    <td className="table-note" title={log.notes || undefined}>{log.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline history-empty">
            <span>Belum ada sesi tercatat. Catat lari pertamamu untuk melihat riwayat di sini.</span>
          </div>
        )}
      </section>

      <footer className="app-footer">
        <span>© 2026 TITUT Run</span>
        <span>Kelompok 2-A · Manajemen Proyek TI UMY</span>
      </footer>
    </div>
  );
}
