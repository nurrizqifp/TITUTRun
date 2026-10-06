import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function getMonday(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Calendar({ logs }) {
  const monday = getMonday(new Date());
  const days = dayNames.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, date, count: logs.filter((log) => log.date === dateKey(date)).length };
  });

  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">KONSISTENSI</span><h2>Ritme minggu ini</h2></div>
        <div className="calendar-arrows"><button aria-label="Minggu sebelumnya" disabled><ArrowLeft size={16} /></button><button aria-label="Minggu berikutnya" disabled><ArrowRight size={16} /></button></div>
      </div>
      <div className="week-calendar">
        {days.map(({ label, date, count }) => (
          <div className={`week-day ${count ? 'has-run' : ''} ${dateKey(date) === dateKey(new Date()) ? 'today' : ''}`} key={label}>
            <span className="week-label">{label}</span>
            <span className="week-date">{date.getDate()}</span>
            <span className="day-status">{count ? <Check size={13} strokeWidth={3} /> : <i />}</span>
          </div>
        ))}
      </div>
      <div className="calendar-foot"><span><i className="legend-dot done" />Sesi tercatat</span><span>{logs.filter((log) => days.some((day) => dateKey(day.date) === log.date)).length} sesi minggu ini</span></div>
    </section>
  );
}
